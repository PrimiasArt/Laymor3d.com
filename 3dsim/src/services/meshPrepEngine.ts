/**
 * Mesh Preparation Engine for Laymor3D Web Slicer:
 * 1. Exact half-edge manifold audit (`computeOpenEdgeRatio`)
 * 2. Local ear-clipping boundary hole filling (`fillMinorMeshHoles`) for crisp CAD/sculpture holes
 * 3. Overhang- & curvature-weighted QEM edge collapse (`simplifyMeshQemOverhangAware`, 220k ceiling)
 * 4. Adaptive Surface Nets Morphological Closing (`repairBrokenSoupToWatertight`) for broken soups
 */

function computeBounds(posArr: Float32Array) {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < posArr.length; i += 3) {
    const x = posArr[i];
    const y = posArr[i + 1];
    const z = posArr[i + 2];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  const maxSpan = Math.max(1e-3, maxX - minX, maxY - minY, maxZ - minZ);
  return { minX, minY, minZ, maxX, maxY, maxZ, maxSpan };
}

function hashWeldTriangles(
  posArr: Float32Array,
  gridBins: number = 65536
): {
  triCount: number;
  vIdx: Uint32Array;
  vx: Float64Array;
  vy: Float64Array;
  vz: Float64Array;
  vCount: number;
  minY: number;
  maxSpan: number;
} {
  const triCount = Math.floor(posArr.length / 9);
  if (triCount === 0) {
    return {
      triCount: 0,
      vIdx: new Uint32Array(0),
      vx: new Float64Array(0),
      vy: new Float64Array(0),
      vz: new Float64Array(0),
      vCount: 0,
      minY: 0,
      maxSpan: 1,
    };
  }

  const { minX, minY, minZ, maxSpan } = computeBounds(posArr);
  const gridScale = gridBins / maxSpan;
  const vertMap = new Map<number, number>();
  const vIdx = new Uint32Array(triCount * 3);

  let cap = Math.min(triCount * 3, Math.max(64, Math.ceil(triCount * 0.75)));
  let vx = new Float64Array(cap);
  let vy = new Float64Array(cap);
  let vz = new Float64Array(cap);
  let vCounts = new Uint32Array(cap);
  let nextId = 0;

  for (let i = 0; i < triCount * 3; i++) {
    const x = posArr[i * 3];
    const y = posArr[i * 3 + 1];
    const z = posArr[i * 3 + 2];
    const qx = Math.max(0, Math.round((x - minX) * gridScale));
    const qy = Math.max(0, Math.round((y - minY) * gridScale));
    const qz = Math.max(0, Math.round((z - minZ) * gridScale));
    // Fits within IEEE-754 53-bit integer precision up to 131072^2
    const key = qx + qy * 131072 + qz * 17179869184;
    let id = vertMap.get(key);
    if (id === undefined) {
      id = nextId++;
      if (id >= cap) {
        cap *= 2;
        const nx = new Float64Array(cap); nx.set(vx); vx = nx;
        const ny = new Float64Array(cap); ny.set(vy); vy = ny;
        const nz = new Float64Array(cap); nz.set(vz); vz = nz;
        const nc = new Uint32Array(cap); nc.set(vCounts); vCounts = nc;
      }
      vertMap.set(key, id);
      vx[id] = x;
      vy[id] = y;
      vz[id] = z;
      vCounts[id] = 1;
    } else {
      vx[id] += x;
      vy[id] += y;
      vz[id] += z;
      vCounts[id] += 1;
    }
    vIdx[i] = id;
  }

  for (let i = 0; i < nextId; i++) {
    const inv = 1 / vCounts[i];
    vx[i] *= inv;
    vy[i] *= inv;
    vz[i] *= inv;
  }

  return {
    triCount,
    vIdx,
    vx: vx.subarray(0, nextId),
    vy: vy.subarray(0, nextId),
    vz: vz.subarray(0, nextId),
    vCount: nextId,
    minY,
    maxSpan,
  };
}

/**
 * Computes ratio of unmatched boundary edges over all undirected edges.
 */
export function computeOpenEdgeRatio(posArr: Float32Array): number {
  const { triCount, vIdx, vCount } = hashWeldTriangles(posArr, 65536);
  if (triCount === 0 || vCount === 0) return 1;

  const edgeCounts = new Map<number, number>();
  const stride = vCount + 2;
  for (let t = 0; t < triCount; t++) {
    const a = vIdx[t * 3];
    const b = vIdx[t * 3 + 1];
    const c = vIdx[t * 3 + 2];
    if (a === b || b === c || c === a) continue;
    const e1 = a < b ? a * stride + b : b * stride + a;
    const e2 = b < c ? b * stride + c : c * stride + b;
    const e3 = c < a ? c * stride + a : a * stride + c;
    edgeCounts.set(e1, (edgeCounts.get(e1) || 0) + 1);
    edgeCounts.set(e2, (edgeCounts.get(e2) || 0) + 1);
    edgeCounts.set(e3, (edgeCounts.get(e3) || 0) + 1);
  }

  if (edgeCounts.size === 0) return 1;
  let openEdges = 0;
  for (const count of edgeCounts.values()) {
    if (count === 1) openEdges++;
  }
  return openEdges / edgeCounts.size;
}

/**
 * Fills small-to-medium open boundary loops cleanly using Newell plane projection + ear-clipping
 * (with centroid fan fallback), avoiding voxel blurring on mildly non-watertight CAD exports.
 */
export function fillMinorMeshHoles(
  posArr: Float32Array,
  maxLoopSize: number = 96
): { posArr: Float32Array; holesFilled: number } {
  const { triCount, vIdx, vx, vy, vz, vCount } = hashWeldTriangles(posArr, 32768);
  if (triCount < 4 || vCount < 4) return { posArr, holesFilled: 0 };

  const stride = vCount + 2;
  const directedSet = new Set<number>();
  for (let t = 0; t < triCount; t++) {
    const a = vIdx[t * 3];
    const b = vIdx[t * 3 + 1];
    const c = vIdx[t * 3 + 2];
    if (a === b || b === c || c === a) continue;
    directedSet.add(a * stride + b);
    directedSet.add(b * stride + c);
    directedSet.add(c * stride + a);
  }

  // Collect boundary half-edges u->v whose opposite v->u is missing
  const outEdges = new Map<number, number[]>();
  const boundaryPairs: [number, number][] = [];
  for (const key of directedSet) {
    const u = Math.floor(key / stride);
    const v = key - u * stride;
    if (!directedSet.has(v * stride + u)) {
      boundaryPairs.push([u, v]);
      let list = outEdges.get(u);
      if (!list) {
        list = [];
        outEdges.set(u, list);
      }
      list.push(v);
    }
  }

  if (boundaryPairs.length === 0) return { posArr, holesFilled: 0 };

  const visitedHalfEdges = new Set<number>();
  const addedTris: number[] = [];
  let holesFilled = 0;

  for (const [startU, startV] of boundaryPairs) {
    const startKey = startU * stride + startV;
    if (visitedHalfEdges.has(startKey)) continue;

    // Trace loop following boundary edges
    const loop: number[] = [startU];
    visitedHalfEdges.add(startKey);
    let cur = startV;
    let guard = 0;
    let closed = false;

    while (guard++ <= maxLoopSize + 2) {
      if (cur === startU) {
        closed = true;
        break;
      }
      loop.push(cur);
      const nextCandidates = outEdges.get(cur);
      if (!nextCandidates || nextCandidates.length === 0) break;
      let picked: number | undefined;
      for (const cand of nextCandidates) {
        const ck = cur * stride + cand;
        if (!visitedHalfEdges.has(ck)) {
          picked = cand;
          visitedHalfEdges.add(ck);
          break;
        }
      }
      if (picked === undefined) break;
      cur = picked;
    }

    if (!closed || loop.length < 3 || loop.length > maxLoopSize) continue;

    // Reverse loop so the patch edges run opposite to existing boundary half-edges -> outward normal
    const holeLoop = [...loop].reverse();
    const k = holeLoop.length;

    if (k === 3) {
      addedTris.push(holeLoop[0], holeLoop[1], holeLoop[2]);
      holesFilled++;
      continue;
    }

    // Newell plane normal & orthonormal frame
    let nx = 0, ny = 0, nz = 0;
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < k; i++) {
      const vi = holeLoop[i];
      const vj = holeLoop[(i + 1) % k];
      nx += (vy[vi] - vy[vj]) * (vz[vi] + vz[vj]);
      ny += (vz[vi] - vz[vj]) * (vx[vi] + vx[vj]);
      nz += (vx[vi] - vx[vj]) * (vy[vi] + vy[vj]);
      cx += vx[vi]; cy += vy[vi]; cz += vz[vi];
    }
    const nLen = Math.hypot(nx, ny, nz);
    if (nLen < 1e-8) continue;
    nx /= nLen; ny /= nLen; nz /= nLen;
    cx /= k; cy /= k; cz /= k;

    // Tangent basis (uAxis, vAxis)
    const refX = Math.abs(nx) < 0.85 ? 1 : 0;
    const refY = Math.abs(nx) < 0.85 ? 0 : 1;
    let ux = ny * 0 - nz * refY;
    let uy = nz * refX - nx * 0;
    let uz = nx * refY - ny * refX;
    const uLen = Math.hypot(ux, uy, uz) || 1;
    ux /= uLen; uy /= uLen; uz /= uLen;
    const vvx = ny * uz - nz * uy;
    const vvy = nz * ux - nx * uz;
    const vvz = nx * uy - ny * ux;

    const proj2d = new Map<number, [number, number]>();
    for (const vid of holeLoop) {
      const dx = vx[vid] - cx;
      const dy = vy[vid] - cy;
      const dz = vz[vid] - cz;
      proj2d.set(vid, [dx * ux + dy * uy + dz * uz, dx * vvx + dy * vvy + dz * vvz]);
    }

    const ptInTri2d = (
      px: number, py: number,
      ax: number, ay: number,
      bx: number, by: number,
      cx2: number, cy2: number
    ) => {
      const c1 = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
      const c2 = (cx2 - bx) * (py - by) - (cy2 - by) * (px - bx);
      const c3 = (ax - cx2) * (py - cy2) - (ay - cy2) * (px - cx2);
      return (c1 >= -1e-9 && c2 >= -1e-9 && c3 >= -1e-9) || (c1 <= 1e-9 && c2 <= 1e-9 && c3 <= 1e-9);
    };

    const remaining = [...holeLoop];
    const loopTris: number[] = [];
    let earGuard = 0;
    while (remaining.length > 3 && earGuard++ < k * k) {
      let clipped = false;
      const m = remaining.length;
      for (let i = 0; i < m; i++) {
        const prev = remaining[(i - 1 + m) % m];
        const curr = remaining[i];
        const next = remaining[(i + 1) % m];
        const [ax, ay] = proj2d.get(prev)!;
        const [bx, by] = proj2d.get(curr)!;
        const [cx2, cy2] = proj2d.get(next)!;
        const cross = (bx - ax) * (cy2 - by) - (by - ay) * (cx2 - bx);
        if (cross <= 1e-10) continue;

        let containsOther = false;
        for (let j = 0; j < m; j++) {
          const testId = remaining[j];
          if (testId === prev || testId === curr || testId === next) continue;
          const [px, py] = proj2d.get(testId)!;
          if (ptInTri2d(px, py, ax, ay, bx, by, cx2, cy2)) {
            containsOther = true;
            break;
          }
        }
        if (!containsOther) {
          loopTris.push(prev, curr, next);
          remaining.splice(i, 1);
          clipped = true;
          break;
        }
      }
      if (!clipped) break;
    }

    if (remaining.length === 3) {
      loopTris.push(remaining[0], remaining[1], remaining[2]);
      addedTris.push(...loopTris);
      holesFilled++;
    } else {
      // Fallback safe triangle strip around vertex 0
      for (let i = 1; i < k - 1; i++) {
        addedTris.push(holeLoop[0], holeLoop[i], holeLoop[i + 1]);
      }
      holesFilled++;
    }
  }

  if (holesFilled === 0 || addedTris.length === 0) {
    return { posArr, holesFilled: 0 };
  }

  const extraFloats = (addedTris.length / 3) * 9;
  const out = new Float32Array(posArr.length + extraFloats);
  out.set(posArr, 0);
  let w = posArr.length;
  for (let i = 0; i < addedTris.length; i++) {
    const vid = addedTris[i];
    out[w++] = vx[vid];
    out[w++] = vy[vid];
    out[w++] = vz[vid];
  }

  return { posArr: out, holesFilled };
}

/**
 * Overhang- & curvature-preserving topological + Quadric Error Metric simplification.
 * Raises detail retention threshold to 220,000 triangles and assigns 4x preservation priority
 * to downward-facing overhang zones so thin fingers, chins, and support anchors survive.
 */
export function simplifyMeshQemOverhangAware(
  posArr: Float32Array,
  targetMaxTris: number = 220000
): Float32Array {
  const initialTris = Math.floor(posArr.length / 9);
  if (initialTris <= targetMaxTris) return posArr;

  let working = posArr;

  // Stage 1: For massive >440k sculpts, perform fine overhang-weighted vertex clustering (~320k tris)
  if (initialTris > 440000) {
    working = fineOverhangWeightedCluster(working, Math.min(340000, Math.round(targetMaxTris * 1.55)));
  }

  const stage2Tris = Math.floor(working.length / 9);
  if (stage2Tris <= targetMaxTris) return working;

  // Stage 2: Exact Typed-Array Garland-Heckbert QEM Batch Edge Collapse
  const { triCount, vIdx, vx, vy, vz, vCount, minY, maxSpan } = hashWeldTriangles(working, 65536);
  if (triCount <= targetMaxTris || vCount < 16) return working;

  const Q = new Float64Array(vCount * 10);
  const overhangScore = new Float32Array(vCount);
  const isBedVert = new Uint8Array(vCount);
  const bedEps = Math.max(0.08, maxSpan * 0.0012);
  for (let v = 0; v < vCount; v++) {
    if (vy[v] <= minY + bedEps) isBedVert[v] = 1;
  }

  const tris = new Int32Array(triCount * 3);
  for (let i = 0; i < tris.length; i++) tris[i] = vIdx[i];

  // Accumulate weighted fundamental error quadrics Kp per vertex
  for (let t = 0; t < triCount; t++) {
    const a = tris[t * 3];
    const b = tris[t * 3 + 1];
    const c = tris[t * 3 + 2];
    if (a === b || b === c || c === a) continue;

    const abx = vx[b] - vx[a], aby = vy[b] - vy[a], abz = vz[b] - vz[a];
    const acx = vx[c] - vx[a], acy = vy[c] - vy[a], acz = vz[c] - vz[a];
    let nx = aby * acz - abz * acy;
    let ny = abz * acx - abx * acz;
    let nz = abx * acy - aby * acx;
    const area2 = Math.hypot(nx, ny, nz);
    if (area2 < 1e-11) continue;
    nx /= area2; ny /= area2; nz /= area2;
    const d = -(nx * vx[a] + ny * vy[a] + nz * vz[a]);

    // Boost quadric weight for downward overhang faces (ny < 0 in Three.js Y-up)
    const downBias = Math.max(0, -ny);
    const weight = (1.0 + 3.8 * downBias * downBias) * Math.sqrt(Math.max(1e-6, area2));

    const q0 = nx * nx * weight;
    const q1 = nx * ny * weight;
    const q2 = nx * nz * weight;
    const q3 = nx * d * weight;
    const q4 = ny * ny * weight;
    const q5 = ny * nz * weight;
    const q6 = ny * d * weight;
    const q7 = nz * nz * weight;
    const q8 = nz * d * weight;
    const q9 = d * d * weight;

    const addQ = (vi: number) => {
      const o = vi * 10;
      Q[o] += q0; Q[o + 1] += q1; Q[o + 2] += q2; Q[o + 3] += q3;
      Q[o + 4] += q4; Q[o + 5] += q5; Q[o + 6] += q6;
      Q[o + 7] += q7; Q[o + 8] += q8;
      Q[o + 9] += q9;
      if (downBias > overhangScore[vi]) overhangScore[vi] = downBias;
    };
    addQ(a); addQ(b); addQ(c);
  }

  const evalQuadric = (
    u: number,
    v: number,
    px: number,
    py: number,
    pz: number
  ): number => {
    const ou = u * 10;
    const ov = v * 10;
    const q0 = Q[ou] + Q[ov], q1 = Q[ou + 1] + Q[ov + 1], q2 = Q[ou + 2] + Q[ov + 2], q3 = Q[ou + 3] + Q[ov + 3];
    const q4 = Q[ou + 4] + Q[ov + 4], q5 = Q[ou + 5] + Q[ov + 5], q6 = Q[ou + 6] + Q[ov + 6];
    const q7 = Q[ou + 7] + Q[ov + 7], q8 = Q[ou + 8] + Q[ov + 8], q9 = Q[ou + 9] + Q[ov + 9];
    const err =
      q0 * px * px + 2 * q1 * px * py + 2 * q2 * px * pz + 2 * q3 * px +
      q4 * py * py + 2 * q5 * py * pz + 2 * q6 * py +
      q7 * pz * pz + 2 * q8 * pz + q9;
    return Math.max(0, err);
  };

  // Iterative independent-set batch edge collapses until <= targetMaxTris
  const active = new Uint8Array(triCount);
  active.fill(1);
  let liveTris = triCount;

  const rep = new Int32Array(vCount);
  for (let i = 0; i < vCount; i++) rep[i] = i;
  const findRep = (x: number): number => {
    while (rep[x] !== x) {
      rep[x] = rep[rep[x]];
      x = rep[x];
    }
    return x;
  };

  const stride = vCount + 2;
  const locked = new Uint32Array(vCount);
  const curVx = Float64Array.from(vx);
  const curVy = Float64Array.from(vy);
  const curVz = Float64Array.from(vz);

  for (let pass = 1; pass <= 10 && liveTris > targetMaxTris; pass++) {
    const edgeSeen = new Set<number>();
    const edgeErr: number[] = [];
    const edgeU: number[] = [];
    const edgeV: number[] = [];
    const edgeBestX: number[] = [];
    const edgeBestY: number[] = [];
    const edgeBestZ: number[] = [];

    for (let t = 0; t < triCount; t++) {
      if (!active[t]) continue;
      const a = findRep(tris[t * 3]);
      const b = findRep(tris[t * 3 + 1]);
      const c = findRep(tris[t * 3 + 2]);
      if (a === b || b === c || c === a) {
        active[t] = 0;
        liveTris--;
        continue;
      }
      tris[t * 3] = a; tris[t * 3 + 1] = b; tris[t * 3 + 2] = c;

      const pairs: [number, number][] = [
        a < b ? [a, b] : [b, a],
        b < c ? [b, c] : [c, b],
        c < a ? [c, a] : [a, c],
      ];

      for (const [u, v] of pairs) {
        const key = u * stride + v;
        if (edgeSeen.has(key)) continue;
        edgeSeen.add(key);

        // Preserve bed rim separation
        if (isBedVert[u] !== isBedVert[v]) continue;

        const mx = 0.5 * (curVx[u] + curVx[v]);
        const my = isBedVert[u] ? minY : 0.5 * (curVy[u] + curVy[v]);
        const mz = 0.5 * (curVz[u] + curVz[v]);

        const eU = evalQuadric(u, v, curVx[u], curVy[u], curVz[u]);
        const eV = evalQuadric(u, v, curVx[v], curVy[v], curVz[v]);
        const eM = evalQuadric(u, v, mx, my, mz);

        let bx = mx, by = my, bz = mz, minE = eM;
        if (eU < minE) { minE = eU; bx = curVx[u]; by = curVy[u]; bz = curVz[u]; }
        if (eV < minE) { minE = eV; bx = curVx[v]; by = curVy[v]; bz = curVz[v]; }

        const ohFactor = 1 + 2.5 * Math.max(overhangScore[u], overhangScore[v]);
        const lenSq =
          (curVx[u] - curVx[v]) ** 2 +
          (curVy[u] - curVy[v]) ** 2 +
          (curVz[u] - curVz[v]) ** 2;
        const score = (minE + 1e-8 * lenSq) * ohFactor;

        edgeErr.push(score);
        edgeU.push(u);
        edgeV.push(v);
        edgeBestX.push(bx);
        edgeBestY.push(by);
        edgeBestZ.push(bz);
      }
    }

    const numEdges = edgeErr.length;
    if (numEdges === 0 || liveTris <= targetMaxTris) break;

    const order = new Int32Array(numEdges);
    for (let i = 0; i < numEdges; i++) order[i] = i;
    order.sort((a, b) => edgeErr[a] - edgeErr[b]);

    const neededRemoves = Math.ceil((liveTris - targetMaxTris) * 0.55);
    let collapsed = 0;
    const maxBatch = Math.min(numEdges, Math.max(250, neededRemoves));

    for (let k = 0; k < numEdges && collapsed < maxBatch; k++) {
      const ei = order[k];
      const u = findRep(edgeU[ei]);
      const v = findRep(edgeV[ei]);
      if (u === v) continue;
      if (locked[u] === pass || locked[v] === pass) continue;

      locked[u] = pass;
      locked[v] = pass;
      rep[v] = u;
      curVx[u] = edgeBestX[ei];
      curVy[u] = edgeBestY[ei];
      curVz[u] = edgeBestZ[ei];

      const ou = u * 10;
      const ov = v * 10;
      for (let m = 0; m < 10; m++) Q[ou + m] += Q[ov + m];
      if (overhangScore[v] > overhangScore[u]) overhangScore[u] = overhangScore[v];
      collapsed++;
    }

    if (collapsed === 0) break;

    for (let t = 0; t < triCount; t++) {
      if (!active[t]) continue;
      const a = findRep(tris[t * 3]);
      const b = findRep(tris[t * 3 + 1]);
      const c = findRep(tris[t * 3 + 2]);
      if (a === b || b === c || c === a) {
        active[t] = 0;
        liveTris--;
      } else {
        tris[t * 3] = a; tris[t * 3 + 1] = b; tris[t * 3 + 2] = c;
      }
    }
  }

  // Final simplicial 2-chain duplicate cancellation to eliminate folded degenerate faces
  const triChain = new Map<bigint, number>();
  for (let t = 0; t < triCount; t++) {
    if (!active[t]) continue;
    let u = findRep(tris[t * 3]);
    let v = findRep(tris[t * 3 + 1]);
    let wIdx = findRep(tris[t * 3 + 2]);
    if (u === v || v === wIdx || wIdx === u) continue;

    let sign = 1;
    if (u > v) { const tmp = u; u = v; v = tmp; sign = -sign; }
    if (v > wIdx) { const tmp = v; v = wIdx; wIdx = tmp; sign = -sign; }
    if (u > v) { const tmp = u; u = v; v = tmp; sign = -sign; }

    const key = (BigInt(u) << 40n) | (BigInt(v) << 20n) | BigInt(wIdx);
    const nextNet = (triChain.get(key) || 0) + sign;
    if (nextNet === 0) triChain.delete(key);
    else triChain.set(key, nextNet);
  }

  let keptTris = 0;
  for (const net of triChain.values()) keptTris += Math.abs(net);
  if (keptTris < 12) return posArr;

  const out = new Float32Array(keptTris * 9);
  let w = 0;
  for (const [key, net] of triChain.entries()) {
    const u = Number(key >> 40n);
    const v = Number((key >> 20n) & 0xfffffn);
    const k = Number(key & 0xfffffn);
    const copies = Math.abs(net);
    const bIdx = net > 0 ? v : k;
    const cIdx = net > 0 ? k : v;
    for (let r = 0; r < copies; r++) {
      out[w++] = curVx[u]; out[w++] = curVy[u]; out[w++] = curVz[u];
      out[w++] = curVx[bIdx]; out[w++] = curVy[bIdx]; out[w++] = curVz[bIdx];
      out[w++] = curVx[cIdx]; out[w++] = curVy[cIdx]; out[w++] = curVz[cIdx];
    }
  }
  return out;
}

/**
 * Fine Stage-1 overhang-weighted clustering for multi-million-triangle sculpts (>440k tris).
 */
function fineOverhangWeightedCluster(posArr: Float32Array, targetTris: number): Float32Array {
  const triCount = Math.floor(posArr.length / 9);
  if (triCount <= targetTris) return posArr;

  const { minX, minY, minZ, maxX, maxY, maxZ, maxSpan } = computeBounds(posArr);
  const reductionRatio = Math.sqrt(triCount / targetTris);
  const gridRes = Math.max(180, Math.min(440, Math.round(360 / Math.max(1, reductionRatio * 0.65))));
  const invCell = gridRes / maxSpan;
  const strideY = gridRes + 4;
  const strideZ = strideY * strideY;

  const clusterMap = new Map<number, number>();
  let cap = Math.min(triCount, targetTris * 2);
  let sumX = new Float64Array(cap);
  let sumY = new Float64Array(cap);
  let sumZ = new Float64Array(cap);
  let sumW = new Float64Array(cap);
  let cCount = 0;
  const vCluster = new Int32Array(triCount * 3);

  for (let t = 0; t < triCount; t++) {
    const b = t * 9;
    const ax = posArr[b], ay = posArr[b + 1], az = posArr[b + 2];
    const bx = posArr[b + 3], by = posArr[b + 4], bz = posArr[b + 5];
    const cx2 = posArr[b + 6], cy2 = posArr[b + 7], cz2 = posArr[b + 8];
    const abx = bx - ax, aby = by - ay, abz = bz - az;
    const acx = cx2 - ax, acy = cy2 - ay, acz = cz2 - az;
    const nyRaw = abz * acx - abx * acz;
    const nxRaw = aby * acz - abz * acy;
    const nzRaw = abx * acy - aby * acx;
    const nLen = Math.hypot(nxRaw, nyRaw, nzRaw) || 1;
    const downBias = Math.max(0, -nyRaw / nLen);
    const weight = 1.0 + 3.5 * downBias * downBias;

    for (let k = 0; k < 3; k++) {
      const vx = posArr[b + k * 3];
      const vy = posArr[b + k * 3 + 1];
      const vz = posArr[b + k * 3 + 2];
      const gx = Math.max(0, Math.round((vx - minX) * invCell));
      const gy = Math.max(0, Math.round((vy - minY) * invCell));
      const gz = Math.max(0, Math.round((vz - minZ) * invCell));
      const cellKey = gx + gy * strideY + gz * strideZ;

      let cid = clusterMap.get(cellKey);
      if (cid === undefined) {
        cid = cCount++;
        if (cid >= cap) {
          cap *= 2;
          const nxp = new Float64Array(cap); nxp.set(sumX); sumX = nxp;
          const nyp = new Float64Array(cap); nyp.set(sumY); sumY = nyp;
          const nzp = new Float64Array(cap); nzp.set(sumZ); sumZ = nzp;
          const nwp = new Float64Array(cap); nwp.set(sumW); sumW = nwp;
        }
        clusterMap.set(cellKey, cid);
      }
      sumX[cid] += vx * weight;
      sumY[cid] += vy * weight;
      sumZ[cid] += vz * weight;
      sumW[cid] += weight;
      vCluster[t * 3 + k] = cid;
    }
  }

  const cx = new Float32Array(cCount);
  const cy = new Float32Array(cCount);
  const cz = new Float32Array(cCount);
  const bedSnapThreshold = minY + Math.max(0.08, (maxY - minY) * 0.0012);
  for (let c = 0; c < cCount; c++) {
    const inv = 1 / Math.max(1e-6, sumW[c]);
    cx[c] = sumX[c] * inv;
    const avgY = sumY[c] * inv;
    cy[c] = avgY <= bedSnapThreshold ? minY : avgY;
    cz[c] = sumZ[c] * inv;
  }

  const triChain = new Map<bigint, number>();
  for (let t = 0; t < triCount; t++) {
    let u = vCluster[t * 3];
    let v = vCluster[t * 3 + 1];
    let wIdx = vCluster[t * 3 + 2];
    if (u === v || v === wIdx || wIdx === u) continue;

    let sign = 1;
    if (u > v) { const tmp = u; u = v; v = tmp; sign = -sign; }
    if (v > wIdx) { const tmp = v; v = wIdx; wIdx = tmp; sign = -sign; }
    if (u > v) { const tmp = u; u = v; v = tmp; sign = -sign; }

    const key = (BigInt(u) << 40n) | (BigInt(v) << 20n) | BigInt(wIdx);
    const nextNet = (triChain.get(key) || 0) + sign;
    if (nextNet === 0) triChain.delete(key);
    else triChain.set(key, nextNet);
  }

  let keptTris = 0;
  for (const net of triChain.values()) keptTris += Math.abs(net);
  if (keptTris < 12) return posArr;

  const out = new Float32Array(keptTris * 9);
  let w = 0;
  for (const [key, net] of triChain.entries()) {
    const u = Number(key >> 40n);
    const v = Number((key >> 20n) & 0xfffffn);
    const k = Number(key & 0xfffffn);
    const copies = Math.abs(net);
    const bIdx = net > 0 ? v : k;
    const cIdx = net > 0 ? k : v;
    for (let rep = 0; rep < copies; rep++) {
      out[w++] = cx[u]; out[w++] = cy[u]; out[w++] = cz[u];
      out[w++] = cx[bIdx]; out[w++] = cy[bIdx]; out[w++] = cz[bIdx];
      out[w++] = cx[cIdx]; out[w++] = cy[cIdx]; out[w++] = cz[cIdx];
    }
  }
  return out;
}

/**
 * Repairs non-watertight triangle soups using crisp boundary ear-clipping first (when openRatio <= 0.16),
 * falling back to high-resolution 3D morphological closing + Taubin shrink-free smoothing for heavy damage.
 */
export function repairBrokenSoupToWatertight(
  posArr: Float32Array,
  precomputedOpenRatio?: number
): { posArr: Float32Array; method: 'hole_fill' | 'morphological_vox' | 'none' } {
  const triCount = Math.floor(posArr.length / 9);
  if (triCount === 0) return { posArr, method: 'none' };

  const openRatio = precomputedOpenRatio ?? computeOpenEdgeRatio(posArr);
  if (openRatio <= 0.02) {
    return { posArr, method: 'none' };
  }

  // 1. Crisp local ear-clipping hole fill (preserves fine edges/overhangs with zero voxel blur)
  if (openRatio <= 0.16) {
    const { posArr: filled, holesFilled } = fillMinorMeshHoles(posArr, 96);
    if (holesFilled > 0 && computeOpenEdgeRatio(filled) <= 0.04) {
      return { posArr: filled, method: 'hole_fill' };
    }
  }

  // 2. High-res Morphological Closing (adaptive grid up to 96 cells + Taubin smoothing)
  const { minX, minY, minZ, maxX, maxY, maxZ, maxSpan } = computeBounds(posArr);
  const voxSize = Math.max(0.55, maxSpan / 92);
  const pad = 5;
  const nx = Math.max(8, Math.ceil((maxX - minX) / voxSize) + pad * 2);
  const ny = Math.max(8, Math.ceil((maxY - minY) / voxSize) + pad * 2);
  const nz = Math.max(8, Math.ceil((maxZ - minZ) / voxSize) + pad * 2);
  const ox = minX - voxSize * pad;
  const oy = minY - voxSize * pad;
  const oz = minZ - voxSize * pad;

  const totalVox = nx * ny * nz;
  const seed = new Uint8Array(totalVox);
  const nxy = nx * ny;
  const idx = (ix: number, iy: number, iz: number) => ix + nx * iy + nxy * iz;

  for (let t = 0; t < triCount; t++) {
    const b = t * 9;
    const ax = posArr[b], ay = posArr[b + 1], az = posArr[b + 2];
    const bx = posArr[b + 3], by = posArr[b + 4], bz = posArr[b + 5];
    const cx = posArr[b + 6], cy = posArr[b + 7], cz = posArr[b + 8];

    const edgeLen = Math.max(
      Math.hypot(bx - ax, by - ay, bz - az),
      Math.hypot(cx - bx, cy - by, cz - bz),
      Math.hypot(ax - cx, ay - cy, az - cz)
    );
    const steps = Math.max(1, Math.min(18, Math.ceil(edgeLen / (voxSize * 0.65))));
    for (let u = 0; u <= steps; u++) {
      for (let v = 0; v <= steps - u; v++) {
        const wu = u / steps;
        const wv = v / steps;
        const ww = 1 - wu - wv;
        const px = ax * ww + bx * wu + cx * wv;
        const py = ay * ww + by * wu + cy * wv;
        const pz = az * ww + bz * wu + cz * wv;
        const ix = Math.floor((px - ox) / voxSize);
        const iy = Math.floor((py - oy) / voxSize);
        const iz = Math.floor((pz - oz) / voxSize);
        if (ix >= 1 && ix < nx - 1 && iy >= 1 && iy < ny - 1 && iz >= 1 && iz < nz - 1) {
          seed[idx(ix, iy, iz)] = 1;
        }
      }
    }
  }

  const dilateSteps = openRatio > 0.35 ? 3 : 2;
  const erodeSteps = dilateSteps - 1;

  let curMask: Uint8Array = seed;
  for (let step = 0; step < dilateSteps; step++) {
    const nextMask = new Uint8Array(curMask);
    for (let iz = 1; iz < nz - 1; iz++) {
      for (let iy = 1; iy < ny - 1; iy++) {
        let k = idx(1, iy, iz);
        for (let ix = 1; ix < nx - 1; ix++, k++) {
          if (curMask[k] === 1) {
            nextMask[k - 1] = 1;
            nextMask[k + 1] = 1;
            nextMask[k - nx] = 1;
            nextMask[k + nx] = 1;
            nextMask[k - nxy] = 1;
            nextMask[k + nxy] = 1;
          }
        }
      }
    }
    curMask = nextMask;
  }

  const work = new Uint8Array(curMask);
  const queue = new Int32Array(totalVox);
  let qHead = 0, qTail = 0;
  const pushAir = (k: number) => {
    if (work[k] === 0) {
      work[k] = 2;
      queue[qTail++] = k;
    }
  };

  for (let iz = 0; iz < nz; iz++) {
    for (let iy = 0; iy < ny; iy++) {
      pushAir(idx(0, iy, iz));
      pushAir(idx(nx - 1, iy, iz));
    }
  }
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      pushAir(idx(ix, 0, iz));
      pushAir(idx(ix, ny - 1, iz));
    }
  }
  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      pushAir(idx(ix, iy, 0));
      pushAir(idx(ix, iy, nz - 1));
    }
  }

  while (qHead < qTail) {
    const cur = queue[qHead++];
    const iz = Math.floor(cur / nxy);
    const rem = cur - iz * nxy;
    const iy = Math.floor(rem / nx);
    const ix = rem - iy * nx;
    if (ix > 0) pushAir(cur - 1);
    if (ix + 1 < nx) pushAir(cur + 1);
    if (iy > 0) pushAir(cur - nx);
    if (iy + 1 < ny) pushAir(cur + nx);
    if (iz > 0) pushAir(cur - nxy);
    if (iz + 1 < nz) pushAir(cur + nxy);
  }

  let solid = new Uint8Array(totalVox);
  for (let i = 0; i < totalVox; i++) {
    if (work[i] !== 2) solid[i] = 1;
  }

  for (let step = 0; step < erodeSteps; step++) {
    const eroded = new Uint8Array(solid);
    for (let iz = 1; iz < nz - 1; iz++) {
      for (let iy = 1; iy < ny - 1; iy++) {
        let k = idx(1, iy, iz);
        for (let ix = 1; ix < nx - 1; ix++, k++) {
          if (solid[k] === 1 && seed[k] === 0) {
            if (
              solid[k - 1] === 0 ||
              solid[k + 1] === 0 ||
              solid[k - nx] === 0 ||
              solid[k + nx] === 0 ||
              solid[k - nxy] === 0 ||
              solid[k + nxy] === 0
            ) {
              eroded[k] = 0;
            }
          }
        }
      }
    }
    solid = eroded;
  }

  const vMap = new Map<number, number>();
  const vx: number[] = [];
  const vy: number[] = [];
  const vz: number[] = [];
  const quadIndices: number[] = [];
  const vStrideY = nx + 2;
  const vStrideZ = vStrideY * (ny + 2);

  const getCornerVert = (gx: number, gy: number, gz: number): number => {
    const key = gx + gy * vStrideY + gz * vStrideZ;
    let vid = vMap.get(key);
    if (vid === undefined) {
      vid = vx.length;
      vMap.set(key, vid);
      vx.push(ox + gx * voxSize);
      vy.push(Math.max(minY, oy + gy * voxSize));
      vz.push(oz + gz * voxSize);
    }
    return vid;
  };

  const isSolid = (ix: number, iy: number, iz: number) => {
    if (ix < 0 || ix >= nx || iy < 0 || iy >= ny || iz < 0 || iz >= nz) return false;
    return solid[idx(ix, iy, iz)] === 1;
  };

  for (let iz = 0; iz < nz; iz++) {
    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        if (!isSolid(ix, iy, iz)) continue;
        if (!isSolid(ix + 1, iy, iz)) {
          quadIndices.push(
            getCornerVert(ix + 1, iy, iz),
            getCornerVert(ix + 1, iy + 1, iz),
            getCornerVert(ix + 1, iy + 1, iz + 1),
            getCornerVert(ix + 1, iy, iz + 1)
          );
        }
        if (!isSolid(ix - 1, iy, iz)) {
          quadIndices.push(
            getCornerVert(ix, iy, iz + 1),
            getCornerVert(ix, iy + 1, iz + 1),
            getCornerVert(ix, iy + 1, iz),
            getCornerVert(ix, iy, iz)
          );
        }
        if (!isSolid(ix, iy + 1, iz)) {
          quadIndices.push(
            getCornerVert(ix, iy + 1, iz + 1),
            getCornerVert(ix + 1, iy + 1, iz + 1),
            getCornerVert(ix + 1, iy + 1, iz),
            getCornerVert(ix, iy + 1, iz)
          );
        }
        if (!isSolid(ix, iy - 1, iz)) {
          quadIndices.push(
            getCornerVert(ix, iy, iz),
            getCornerVert(ix + 1, iy, iz),
            getCornerVert(ix + 1, iy, iz + 1),
            getCornerVert(ix, iy, iz + 1)
          );
        }
        if (!isSolid(ix, iy, iz + 1)) {
          quadIndices.push(
            getCornerVert(ix, iy, iz + 1),
            getCornerVert(ix + 1, iy, iz + 1),
            getCornerVert(ix + 1, iy + 1, iz + 1),
            getCornerVert(ix, iy + 1, iz + 1)
          );
        }
        if (!isSolid(ix, iy, iz - 1)) {
          quadIndices.push(
            getCornerVert(ix + 1, iy, iz),
            getCornerVert(ix, iy, iz),
            getCornerVert(ix, iy + 1, iz),
            getCornerVert(ix + 1, iy + 1, iz)
          );
        }
      }
    }
  }

  if (quadIndices.length < 12) return { posArr, method: 'none' };

  // Shrinkless Taubin smoothing (lambda=+0.42, mu=-0.38) eliminates staircase without deflating overhangs
  const vCount = vx.length;
  const sx = Float32Array.from(vx);
  const sy = Float32Array.from(vy);
  const sz = Float32Array.from(vz);
  const sumNx = new Float64Array(vCount);
  const sumNy = new Float64Array(vCount);
  const sumNz = new Float64Array(vCount);
  const deg = new Uint16Array(vCount);

  const smoothWeights = [0.42, -0.38, 0.35];
  for (const wAlpha of smoothWeights) {
    sumNx.fill(0); sumNy.fill(0); sumNz.fill(0); deg.fill(0);
    const addEdge = (a: number, b: number) => {
      sumNx[a] += sx[b]; sumNy[a] += sy[b]; sumNz[a] += sz[b]; deg[a]++;
      sumNx[b] += sx[a]; sumNy[b] += sy[a]; sumNz[b] += sz[a]; deg[b]++;
    };
    for (let q = 0; q < quadIndices.length; q += 4) {
      const v0 = quadIndices[q], v1 = quadIndices[q + 1], v2 = quadIndices[q + 2], v3 = quadIndices[q + 3];
      addEdge(v0, v1); addEdge(v1, v2); addEdge(v2, v3); addEdge(v3, v0);
    }
    for (let i = 0; i < vCount; i++) {
      if (deg[i] > 0) {
        const inv = 1 / deg[i];
        const avgX = sumNx[i] * inv;
        const avgY = sumNy[i] * inv;
        const avgZ = sumNz[i] * inv;
        sx[i] = sx[i] + wAlpha * (avgX - sx[i]);
        const nextY = sy[i] + wAlpha * (avgY - sy[i]);
        sy[i] = vy[i] <= minY + voxSize * 0.35 ? minY : Math.max(minY, nextY);
        sz[i] = sz[i] + wAlpha * (avgZ - sz[i]);
      }
    }
  }

  const numQuads = quadIndices.length / 4;
  const out = new Float32Array(numQuads * 18);
  let w = 0;
  for (let q = 0; q < quadIndices.length; q += 4) {
    const v0 = quadIndices[q], v1 = quadIndices[q + 1], v2 = quadIndices[q + 2], v3 = quadIndices[q + 3];
    out[w++] = sx[v0]; out[w++] = sy[v0]; out[w++] = sz[v0];
    out[w++] = sx[v1]; out[w++] = sy[v1]; out[w++] = sz[v1];
    out[w++] = sx[v2]; out[w++] = sy[v2]; out[w++] = sz[v2];

    out[w++] = sx[v0]; out[w++] = sy[v0]; out[w++] = sz[v0];
    out[w++] = sx[v2]; out[w++] = sy[v2]; out[w++] = sz[v2];
    out[w++] = sx[v3]; out[w++] = sy[v3]; out[w++] = sz[v3];
  }
  return { posArr: out, method: 'morphological_vox' };
}
