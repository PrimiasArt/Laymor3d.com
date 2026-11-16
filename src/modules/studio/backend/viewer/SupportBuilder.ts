import * as THREE from 'three';
import { SupportType } from '@/backend/domain/slicing';
import { SampleModelId } from '@/backend/domain/sample-models';
import { ModelBuilder } from './ModelBuilder';

export interface StudioOrcaSupportRequest {
  type: SupportType;
  modelId: SampleModelId;
  clipPlane?: THREE.Plane;
  sourceGroup?: THREE.Group;
  rootSpaceGroup?: THREE.Group;
  orientationDeg?: number;
  dimensionsMm?: { x: number; y: number; z: number };
  overhangThresholdDeg?: number;
  branchDiameterMm?: number;
  interfaceLayers?: number;
  onProgress?: (pct: number, label: string) => void;
}

interface StudioSupportSegment {
  isInterface: boolean;
  points: number[];
}

const cachedSupportGroups = new Map<string, THREE.Group>();
const inFlightRequests = new Map<string, Promise<THREE.Group>>();
let studioOrcaWorker: Worker | null = null;
let studioWorkerManifestPromise: Promise<string | null> | null = null;
let workerMsgChain: Promise<unknown> = Promise.resolve();
let nextReqId = 1;

async function resolveOrcaWorkerUrl(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (!studioWorkerManifestPromise) {
    studioWorkerManifestPromise = fetch('/3dsim/orca-worker-manifest.json', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) return null;
        const json = (await res.json()) as { workerUrl?: string };
        return json?.workerUrl || null;
      })
      .catch(() => null);
  }
  return studioWorkerManifestPromise;
}

async function getOrCreateStudioOrcaWorker(): Promise<Worker | null> {
  if (studioOrcaWorker) return studioOrcaWorker;
  const workerUrl = await resolveOrcaWorkerUrl();
  if (!workerUrl) return null;
  const worker = new Worker(workerUrl, { type: 'module' });
  studioOrcaWorker = worker;
  return worker;
}

function buildCacheKey(req: StudioOrcaSupportRequest): string {
  const dx = Math.round(req.dimensionsMm?.x ?? 80);
  const dy = Math.round(req.dimensionsMm?.y ?? 80);
  const dz = Math.round(req.dimensionsMm?.z ?? 80);
  const ang = Math.round(req.overhangThresholdDeg ?? 35);
  const diam = (req.branchDiameterMm ?? 2.2).toFixed(1);
  const orient = Math.round(req.orientationDeg ?? 0);
  return `${req.type}|${req.modelId}|${dx}x${dy}x${dz}|${ang}|${diam}|${req.interfaceLayers ?? 2}|o${orient}`;
}

function applyClipPlaneToGroup(group: THREE.Group, clipPlane?: THREE.Plane): void {
  if (!clipPlane) return;
  group.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => {
          m.clippingPlanes = [clipPlane];
          m.clipShadows = true;
        });
      } else {
        child.material.clippingPlanes = [clipPlane];
        child.material.clipShadows = true;
      }
    }
  });
}

function cloneSupportGroup(src: THREE.Group, clipPlane?: THREE.Plane): THREE.Group {
  const cloned = new THREE.Group();
  cloned.name = 'studio_orca_cpp_support_group';
  src.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const m = new THREE.Mesh(
        child.geometry.clone(),
        Array.isArray(child.material)
          ? child.material.map((mat) => mat.clone())
          : child.material.clone()
      );
      m.name = child.name;
      m.castShadow = true;
      m.receiveShadow = true;
      cloned.add(m);
    }
  });
  applyClipPlaneToGroup(cloned, clipPlane);
  return cloned;
}

function buildMillimeterZUpStlFromGroup(
  sourceGroup: THREE.Group,
  targetDimsMm: { x: number; y: number; z: number },
  rootSpaceGroup?: THREE.Group,
  orientationDeg: number = 0
): {
  stlBuffer: ArrayBuffer;
  invScaleX: number;
  invScaleY: number;
  invScaleZ: number;
  minLocalY: number;
  centerLocalX: number;
  centerLocalZ: number;
  mmHeight: number;
} | null {
  const refRoot = rootSpaceGroup || sourceGroup;
  refRoot.updateMatrixWorld(true);
  sourceGroup.updateMatrixWorld(true);
  const invRefWorld = refRoot.matrixWorld.clone().invert();

  const chunks: Float32Array[] = [];
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const relMat = new THREE.Matrix4();

  sourceGroup.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.geometry) return;
    if (
      child.name.includes('support') ||
      child.name.includes('brim') ||
      child.name.includes('raft')
    ) {
      return;
    }
    const pos = child.geometry.getAttribute('position');
    if (!pos || pos.count < 3) return;
    const idx = child.geometry.getIndex();
    const triCount = idx ? Math.floor(idx.count / 3) : Math.floor(pos.count / 3);
    const arr = new Float32Array(triCount * 9);
    relMat.multiplyMatrices(invRefWorld, child.matrixWorld);

    let w = 0;
    for (let t = 0; t < triCount; t++) {
      const i0 = idx ? idx.getX(t * 3) : t * 3;
      const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
      vA.fromBufferAttribute(pos, i0).applyMatrix4(relMat);
      vB.fromBufferAttribute(pos, i1).applyMatrix4(relMat);
      vC.fromBufferAttribute(pos, i2).applyMatrix4(relMat);

      for (const v of [vA, vB, vC]) {
        if (v.x < minX) minX = v.x;
        if (v.x > maxX) maxX = v.x;
        if (v.y < minY) minY = v.y;
        if (v.y > maxY) maxY = v.y;
        if (v.z < minZ) minZ = v.z;
        if (v.z > maxZ) maxZ = v.z;
      }

      arr[w++] = vA.x; arr[w++] = vA.y; arr[w++] = vA.z;
      arr[w++] = vB.x; arr[w++] = vB.y; arr[w++] = vB.z;
      arr[w++] = vC.x; arr[w++] = vC.y; arr[w++] = vC.z;
    }
    chunks.push(arr);
  });

  if (chunks.length === 0) return null;

  const spanX = Math.max(1e-4, maxX - minX);
  const spanY = Math.max(1e-4, maxY - minY);
  const spanZ = Math.max(1e-4, maxZ - minZ);

  // Use isotropic millimeter mapping because relMat already embeds modelScaleGroup non-uniform scaling.
  // This prevents axis-skewing overhang slopes while guaranteeing pixel-exact alignment back to scene space.
  const rad = ((orientationDeg || 0) * Math.PI) / 180;
  const cRot = Math.abs(Math.cos(rad));
  const sRot = Math.abs(Math.sin(rad));
  const mmX = Math.max(1, targetDimsMm.x || 80);
  const baseMmY = Math.max(1, targetDimsMm.z || 80);
  const baseMmZ = Math.max(1, targetDimsMm.y || 80);
  const rotMmY = baseMmY * cRot + baseMmZ * sRot;
  const rotMmZ = baseMmY * sRot + baseMmZ * cRot;
  const maxSpanScene = Math.max(spanX, spanY, spanZ);
  const maxSpanMm = Math.max(mmX, rotMmY, rotMmZ);
  const uniformMmPerScene = maxSpanMm / maxSpanScene;
  const mmHeight = spanY * uniformMmPerScene;

  const scaleToMmX = uniformMmPerScene;
  const scaleToMmY = uniformMmPerScene;
  const scaleToMmZ = uniformMmPerScene;

  let totalTris = 0;
  for (const c of chunks) totalTris += Math.floor(c.length / 9);

  const buffer = new ArrayBuffer(84 + totalTris * 50);
  const view = new DataView(buffer);
  view.setUint32(80, totalTris, true);

  let offset = 84;
  for (const c of chunks) {
    for (let i = 0; i < c.length; i += 9) {
      // Three.js Y-up scaled to mm -> Orca Z-up (x, -z, y - minY)
      const ax = (c[i] - (minX + maxX) * 0.5) * scaleToMmX;
      const ay = -((c[i + 2] - (minZ + maxZ) * 0.5) * scaleToMmZ);
      const az = (c[i + 1] - minY) * scaleToMmY;

      const bx = (c[i + 3] - (minX + maxX) * 0.5) * scaleToMmX;
      const by = -((c[i + 5] - (minZ + maxZ) * 0.5) * scaleToMmZ);
      const bz = (c[i + 4] - minY) * scaleToMmY;

      const cx = (c[i + 6] - (minX + maxX) * 0.5) * scaleToMmX;
      const cy = -((c[i + 8] - (minZ + maxZ) * 0.5) * scaleToMmZ);
      const cz = (c[i + 7] - minY) * scaleToMmY;

      const abx = bx - ax, aby = by - ay, abz = bz - az;
      const acx = cx - ax, acy = cy - ay, acz = cz - az;
      let nx = aby * acz - abz * acy;
      let ny = abz * acx - abx * acz;
      let nz = abx * acy - aby * acx;
      const nLen = Math.hypot(nx, ny, nz) || 1;
      nx /= nLen; ny /= nLen; nz /= nLen;

      view.setFloat32(offset, nx, true);
      view.setFloat32(offset + 4, ny, true);
      view.setFloat32(offset + 8, nz, true);

      view.setFloat32(offset + 12, ax, true);
      view.setFloat32(offset + 16, ay, true);
      view.setFloat32(offset + 20, az, true);

      view.setFloat32(offset + 24, bx, true);
      view.setFloat32(offset + 28, by, true);
      view.setFloat32(offset + 32, bz, true);

      view.setFloat32(offset + 36, cx, true);
      view.setFloat32(offset + 40, cy, true);
      view.setFloat32(offset + 44, cz, true);

      view.setUint16(offset + 48, 0, true);
      offset += 50;
    }
  }

  return {
    stlBuffer: buffer,
    invScaleX: 1 / scaleToMmX,
    invScaleY: 1 / scaleToMmY,
    invScaleZ: 1 / scaleToMmZ,
    minLocalY: minY,
    centerLocalX: (minX + maxX) * 0.5,
    centerLocalZ: (minZ + maxZ) * 0.5,
    mmHeight,
  };
}

function buildWatertightGroupFromOrcaLayers(
  layers: Array<{ z: number; idx: number; paths: Float32Array }>,
  type: SupportType,
  transformInfo: {
    invScaleX: number;
    invScaleY: number;
    invScaleZ: number;
    minLocalY: number;
    centerLocalX: number;
    centerLocalZ: number;
  },
  layerHeightMm: number,
  clipPlane?: THREE.Plane
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'studio_orca_cpp_support_group';

  const layerCount = layers.length;
  const supportGridPerLayer: Array<Set<number>> = new Array(layerCount);
  const packCell = (xs: number, ys: number) =>
    Math.round((xs + 512) * 0.5) * 2048 + Math.round((ys + 512) * 0.5);

  for (let li = 0; li < layerCount; li++) {
    const cellSet = new Set<number>();
    const p = layers[li].paths;
    if (p && p.length >= 8) {
      for (let k = 0; k < p.length; k += 8) {
        const role = (p[k + 3] | 0) & 15;
        if (role === 5 || role === 6) {
          cellSet.add(packCell((p[k] + p[k + 4]) * 0.5, (p[k + 1] + p[k + 5]) * 0.5));
        }
      }
    }
    supportGridPerLayer[li] = cellSet;
  }

  const hasSupportAbove = (li: number, xs: number, ys: number): boolean => {
    const checkLayer = li + 2;
    if (checkLayer >= layerCount) return false;
    const aboveSet = supportGridPerLayer[checkLayer];
    if (!aboveSet || aboveSet.size === 0) return false;
    const gxBase = Math.round((xs + 512) * 0.5);
    const gyBase = Math.round((ys + 512) * 0.5);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (aboveSet.has((gxBase + dx) * 2048 + (gyBase + dy))) return true;
      }
    }
    return false;
  };

  const segments: StudioSupportSegment[] = [];
  for (let li = 0; li < layerCount; li++) {
    const p = layers[li].paths;
    if (!p || p.length < 8) continue;

    let activeLoop: number[] = [];
    let activeIsInterface = false;
    let prevEndX = NaN;
    let prevEndZ = NaN;

    const flushLoop = () => {
      if (activeLoop.length >= 6) {
        segments.push({ isInterface: activeIsInterface, points: activeLoop });
      }
      activeLoop = [];
      prevEndX = NaN;
      prevEndZ = NaN;
    };

    for (let k = 0; k < p.length; k += 8) {
      const role = (p[k + 3] | 0) & 15;
      if (role !== 5 && role !== 6) {
        if (activeLoop.length > 0) flushLoop();
        continue;
      }

      const x0 = p[k], y0 = p[k + 1], z0 = p[k + 2];
      const x1 = p[k + 4], y1 = p[k + 5], z1 = p[k + 6];
      const isRoof = li >= 2 && !hasSupportAbove(li, (x0 + x1) * 0.5, (y0 + y1) * 0.5);

      const tx0 = x0, ty0 = z0, tz0 = -y0;
      const tx1 = x1, ty1 = z1, tz1 = -y1;

      const continuesPrev =
        activeLoop.length >= 6 &&
        activeIsInterface === isRoof &&
        Math.hypot(tx0 - prevEndX, tz0 - prevEndZ) < 0.08;

      if (!continuesPrev && activeLoop.length > 0) flushLoop();

      activeIsInterface = isRoof;
      activeLoop.push(tx0, ty0, tz0, tx1, ty1, tz1);
      prevEndX = tx1;
      prevEndZ = tz1;
    }
    flushLoop();
  }

  const trunkPos: number[] = [];
  const trunkIdx: number[] = [];
  const ifPos: number[] = [];
  const ifIdx: number[] = [];

  const pushQuad = (idxArr: number[], a: number, b: number, c: number, d: number) => {
    idxArr.push(a, b, c, a, c, d);
  };

  const extrudeRibbon = (
    poly: number[],
    posArr: number[],
    idxArr: number[],
    w: number,
    h: number
  ) => {
    let m = Math.floor(poly.length / 3);
    if (m < 2) return;
    const endDist = Math.hypot(
      poly[(m - 1) * 3] - poly[0],
      poly[(m - 1) * 3 + 2] - poly[2]
    );
    const isClosed = m >= 4 && endDist < 0.35;
    if (isClosed && endDist < 0.05) m -= 1;
    if (m < 2 || (isClosed && m < 3)) return;

    const segCount = isClosed ? m : m - 1;
    const segNx = new Float32Array(segCount);
    const segNz = new Float32Array(segCount);
    for (let s = 0; s < segCount; s++) {
      const next = (s + 1) % m;
      const dx = poly[next * 3] - poly[s * 3];
      const dz = poly[next * 3 + 2] - poly[s * 3 + 2];
      const len = Math.hypot(dx, dz) || 1;
      segNx[s] = -dz / len;
      segNz[s] = dx / len;
    }

    const startVert = posArr.length / 3;
    const {
      invScaleX,
      invScaleY,
      invScaleZ,
      minLocalY,
      centerLocalX,
      centerLocalZ,
    } = transformInfo;

    for (let k = 0; k < m; k++) {
      let nx = 0, nz = 0;
      if (isClosed) {
        const prevSeg = (k - 1 + segCount) % segCount;
        nx = segNx[prevSeg] + segNx[k];
        nz = segNz[prevSeg] + segNz[k];
      } else if (k > 0 && k < m - 1) {
        nx = segNx[k - 1] + segNx[k];
        nz = segNz[k - 1] + segNz[k];
      } else if (k === 0) {
        nx = segNx[0]; nz = segNz[0];
      } else {
        nx = segNx[m - 2]; nz = segNz[m - 2];
      }
      const nLen = Math.hypot(nx, nz) || 1;
      nx /= nLen; nz /= nLen;

      const x = poly[k * 3];
      const y = poly[k * 3 + 1];
      const z = poly[k * 3 + 2];
      const yTop = minLocalY + (y + h) * invScaleY;
      const yBot = minLocalY + Math.max(0, y - h) * invScaleY;

      posArr.push(
        centerLocalX + (x + nx * w) * invScaleX, yTop, centerLocalZ + (z + nz * w) * invScaleZ,
        centerLocalX + (x + nx * w) * invScaleX, yBot, centerLocalZ + (z + nz * w) * invScaleZ,
        centerLocalX + (x - nx * w) * invScaleX, yBot, centerLocalZ + (z - nz * w) * invScaleZ,
        centerLocalX + (x - nx * w) * invScaleX, yTop, centerLocalZ + (z - nz * w) * invScaleZ
      );
    }

    for (let s = 0; s < segCount; s++) {
      const next = (s + 1) % m;
      const b0 = startVert + s * 4;
      const b1 = startVert + next * 4;
      pushQuad(idxArr, b0, b0 + 1, b1 + 1, b1);
      pushQuad(idxArr, b0 + 3, b0, b1, b1 + 3);
      pushQuad(idxArr, b0 + 2, b0 + 3, b1 + 3, b1 + 2);
      pushQuad(idxArr, b0 + 1, b1 + 1, b1 + 2, b0 + 2);
    }

    if (!isClosed) {
      const s0 = startVert;
      const sN = startVert + (m - 1) * 4;
      pushQuad(idxArr, s0, s0 + 3, s0 + 2, s0 + 1);
      pushQuad(idxArr, sN, sN + 1, sN + 2, sN + 3);
    }
  };

  const halfW = 0.21;
  const halfH = Math.max(0.08, layerHeightMm * 0.56);

  for (const seg of segments) {
    const pts = seg.points;
    let curPoly: number[] = [];
    const flushPoly = () => {
      if (curPoly.length >= 6) {
        if (seg.isInterface) extrudeRibbon(curPoly, ifPos, ifIdx, halfW * 0.96, halfH * 0.94);
        else extrudeRibbon(curPoly, trunkPos, trunkIdx, halfW, halfH);
      }
      curPoly = [];
    };

    for (let i = 0; i < pts.length - 5; i += 6) {
      const x1 = pts[i], y1 = pts[i + 1], z1 = pts[i + 2];
      const x2 = pts[i + 3], y2 = pts[i + 4], z2 = pts[i + 5];
      if (curPoly.length === 0) {
        curPoly.push(x1, y1, z1, x2, y2, z2);
      } else {
        const lx = curPoly[curPoly.length - 3];
        const ly = curPoly[curPoly.length - 2];
        const lz = curPoly[curPoly.length - 1];
        if (Math.hypot(x1 - lx, y1 - ly, z1 - lz) < 0.15) {
          curPoly.push(x2, y2, z2);
        } else {
          flushPoly();
          curPoly.push(x1, y1, z1, x2, y2, z2);
        }
      }
    }
    flushPoly();
  }

  if (trunkPos.length > 0) {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(trunkPos, 3));
    geom.setIndex(trunkIdx);
    geom.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      color: type === 'tree' ? 0x00e050 : 0x06b6d4,
      roughness: 0.32,
      metalness: 0.06,
      side: THREE.FrontSide,
    });
    const m = new THREE.Mesh(geom, mat);
    m.name = 'studio_orca_tree_trunk';
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }

  if (ifPos.length > 0) {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(ifPos, 3));
    geom.setIndex(ifIdx);
    geom.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      color: type === 'tree' ? 0xd946ef : 0xa5f3fc,
      emissive: new THREE.Color(type === 'tree' ? 0xa21caf : 0x0891b2),
      emissiveIntensity: 0.25,
      roughness: 0.28,
      side: THREE.FrontSide,
    });
    const m = new THREE.Mesh(geom, mat);
    m.name = 'studio_orca_tree_interface';
    group.add(m);
  }

  applyClipPlaneToGroup(group, clipPlane);
  return group;
}

export class SupportBuilder {
  /**
   * Synchronous accessor: returns cached C++ OrcaSlicer Tree Support mesh when already sliced
   * (zero fake hardcoded tubes or spears).
   */
  static buildSupports(
    type: SupportType,
    modelId: SampleModelId,
    clipPlane?: THREE.Plane,
    _customGroup?: THREE.Group,
    dimensionsMm?: { x: number; y: number; z: number }
  ): THREE.Group {
    if (type === 'none') return new THREE.Group();
    const exactKey = buildCacheKey({ type, modelId, dimensionsMm });
    const cachedExact = cachedSupportGroups.get(exactKey);
    if (cachedExact) {
      return cloneSupportGroup(cachedExact, clipPlane);
    }

    // Also search any recent cached C++ slice matching type + modelId when called synchronously
    for (const [key, grp] of cachedSupportGroups.entries()) {
      if (key.startsWith(`${type}|${modelId}|`)) {
        return cloneSupportGroup(grp, clipPlane);
      }
    }
    return new THREE.Group();
  }

  /**
   * Executes the authentic C++ OrcaSlicer WASM Tree Support engine (shared worker from /3dsim)
   * directly on any `/studio` model or custom STL mesh.
   */
  static async buildSupportsAsync(req: StudioOrcaSupportRequest): Promise<THREE.Group> {
    if (req.type === 'none' || typeof window === 'undefined') {
      return new THREE.Group();
    }

    const cacheKey = buildCacheKey(req);
    const cached = cachedSupportGroups.get(cacheKey);
    if (cached) {
      return cloneSupportGroup(cached, req.clipPlane);
    }

    const existingPromise = inFlightRequests.get(cacheKey);
    if (existingPromise) {
      const grp = await existingPromise;
      return cloneSupportGroup(grp, req.clipPlane);
    }

    const runPromise: Promise<THREE.Group> = workerMsgChain
      .then(async (): Promise<THREE.Group> => {
        const worker = await getOrCreateStudioOrcaWorker();
        if (!worker) return new THREE.Group();

        let sourceGroup = req.sourceGroup;
        if (!sourceGroup) {
          sourceGroup = ModelBuilder.buildModel(
            req.modelId,
            new THREE.MeshBasicMaterial()
          ).group;
        }

        const targetDims = req.dimensionsMm || { x: 80, y: 80, z: 80 };
        const stlData = buildMillimeterZUpStlFromGroup(
          sourceGroup,
          targetDims,
          req.rootSpaceGroup,
          req.orientationDeg ?? 0
        );
        if (!stlData) return new THREE.Group();

      const layerHeightMm = 0.2;
      const kernelParams = {
        auto_center: false,
        layer_height: layerHeightMm,
        first_layer_height: 0.2,
        line_width: 0.42,
        nozzle_diameter: 0.4,
        wall_loops: 2,
        infill_density: 0.15,
        enable_support: true,
        support_auto: true,
        support_style: req.type === 'tree' ? 'tree' : 'grid',
        tree_style: 'organic',
        independent_support_layer_height: false,
        support_threshold_angle: Math.max(15, Math.min(60, req.overhangThresholdDeg ?? 32)),
        support_top_z_distance: 0.2,
        support_bottom_z_distance: 0.2,
        support_xy_distance: 0.35,
        support_interface_top_layers: req.interfaceLayers ?? 2,
        support_on_build_plate_only: true,
        tree_support_branch_diameter: req.branchDiameterMm ?? 2.2,
        tree_support_branch_diameter_organic: req.branchDiameterMm ?? 2.2,
        tree_support_tip_diameter: 0.8,
        tree_support_branch_angle: 40,
        tree_support_branch_angle_organic: 40,
        tree_support_branch_distance_organic: stlData.mmHeight > 90 ? 3.2 : 2.2,
        tree_support_wall_count: 1,
        keep_stages: false,
        gcode_role_tags: false,
        gcode_stats_block: false,
      };

      const requestId = nextReqId++;
      const layers: Array<{ z: number; idx: number; paths: Float32Array }> = [];

      await new Promise<void>((resolve, reject) => {
        const onMsg = (ev: MessageEvent) => {
          const data = ev.data;
          if (!data || data.requestId !== requestId) return;
          if (data.type === 'progress') {
            req.onProgress?.(
              Math.round((Number(data.done || 0) / Math.max(1, Number(data.total || 1))) * 100),
              'OrcaSlicer C++ Tree Support...'
            );
            return;
          }
          if (data.type === 'layer') {
            layers.push({
              z: Number(data.z || 0),
              idx: Number(data.idx || 0),
              paths: data.paths instanceof Float32Array ? data.paths : new Float32Array(0),
            });
            return;
          }
          if (data.type === 'error') {
            worker.removeEventListener('message', onMsg);
            reject(new Error(String(data.error || 'Orca C++ Studio slice failed')));
            return;
          }
          if (data.type === 'done') {
            worker.removeEventListener('message', onMsg);
            if (layers.length === 0 && Array.isArray(data.result?.layers)) {
              for (const L of data.result.layers) {
                layers.push({
                  z: Number(L.z || 0),
                  idx: Number(L.idx || 0),
                  paths: L.paths instanceof Float32Array ? L.paths : new Float32Array(0),
                });
              }
            }
            resolve();
          }
        };
        worker.addEventListener('message', onMsg);
        const stlCopy = stlData.stlBuffer.slice(0);
        worker.postMessage(
          {
            stl: stlCopy,
            params: JSON.stringify(kernelParams),
            gpu: false,
            requestId,
          },
          [stlCopy]
        );
      });

      const built = buildWatertightGroupFromOrcaLayers(
        layers,
        req.type,
        stlData,
        layerHeightMm
      );
      cachedSupportGroups.set(cacheKey, built);
      return built;
    })
      .catch((err) => {
        console.warn('[Studio SupportBuilder] C++ Tree Support unavailable:', err);
        return new THREE.Group();
      });

    workerMsgChain = runPromise;
    inFlightRequests.set(cacheKey, runPromise);
    try {
      const built = await runPromise;
      return cloneSupportGroup(built, req.clipPlane);
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  }
}
