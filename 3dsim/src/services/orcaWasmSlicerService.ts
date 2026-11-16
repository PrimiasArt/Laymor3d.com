import * as THREE from 'three';
import { makeSlicerWorker } from 'three-slicer/client';
import { deriveKernelParams, type SlicerSettings } from 'three-slicer-viewer/settings';
import {
  buildSegmentData,
  makeToolpath,
  computeColors,
  layerMoveCount,
  moveCursor,
  type SegmentData,
  type ToolpathHandle,
  type ColorContext,
} from 'three-slicer-viewer/toolpath';
import type { ISimulationProfile } from '@/types/simulator';
import type { INativeSupportData, INativeSupportSegment } from './nativeSupportLoader';
import type { FilamentColorScheme, IActiveMoveTelemetry } from './volumetricFilamentRenderer';
import {
  computeOpenEdgeRatio,
  simplifyMeshQemOverhangAware,
  repairBrokenSoupToWatertight,
} from './meshPrepEngine';

export interface IOrcaWasmSliceStats {
  totalLayers: number;
  totalTimeSec: number;
  totalFilamentGrams: number;
  modelGrams: number;
  supportGrams: number;
  filamentMm: number;
  supportSegmentsCount: number;
  modelSegmentsCount: number;
  usedWatertightRepair: boolean;
  repairMethod?: 'hole_fill' | 'morphological_vox' | 'none';
  simplifiedFromTris: number;
  slicedTris: number;
  elapsedMs: number;
  kernelMode?: 'mt' | 'st';
  contourEngine?: string;
  reusedStages?: boolean;
  effectiveLayerHeight?: number;
  treeStyle?: string;
}

export interface IOrcaWasmSliceBundle {
  cacheKey: string;
  gcode: string;
  supportData: INativeSupportData;
  supportExportGeometry: THREE.BufferGeometry | null;
  segData: SegmentData;
  stats: IOrcaWasmSliceStats;
}

interface IRawSliceLayer {
  z: number;
  idx: number;
  gcode?: string;
  paths: Float32Array;
  widths?: Float32Array;
}

interface IRawWorkerSliceResult {
  layers: IRawSliceLayer[];
  gcode: string;
  stats: Record<string, unknown>;
}

interface PreparedMeshCacheEntry {
  geomHash: string;
  stlBuffer: ArrayBuffer;
  yUpPositions: Float32Array;
  minY: number;
  modelHeightMm: number;
  originalTris: number;
  slicedTris: number;
  repaired: boolean;
  repairMethod: 'hole_fill' | 'morphological_vox' | 'none';
}

let sharedWorker: Worker | null = null;
let supProgressView: Uint32Array | null = null;
let cancelFlagView: Uint32Array | null = null;
let loadedKernelMode: 'mt' | 'st' =
  typeof window !== 'undefined' && window.crossOriginIsolated ? 'mt' : 'st';
let isWarmingUp = false;
let nextWorkerReqId = 1;
let activeJobToken = 0;
let inFlightWorkerPromise: Promise<unknown> | null = null;
let paintRpcChain: Promise<unknown> = Promise.resolve();

let lastContourStageSignature: string | null = null;
let cachedPreparedMesh: PreparedMeshCacheEntry | null = null;
let lastPaintedGeomHash: string | null = null;
let lastPreparedMinY = 0;
let paintRevision = 0;
let lastSlicedPaintRevision = 0;
let latestPaintCounts = { enf: 0, blk: 0 };

type WorkerMsgListener = (data: Record<string, any>) => void;
const workerListeners = new Set<WorkerMsgListener>();

const sliceBundleCache = new Map<string, IOrcaWasmSliceBundle>();
const MAX_CACHE_ENTRIES = 8;

let latestExportSupportGeom: THREE.BufferGeometry | null = null;
let latestRealGcode: string | null = null;

export function getLatestOrcaExportSupportGeometry(): THREE.BufferGeometry | null {
  return latestExportSupportGeom;
}

export function getLatestOrcaGcode(): string | null {
  return latestRealGcode;
}

export function getOrcaPaintStatus() {
  return {
    revision: paintRevision,
    counts: { ...latestPaintCounts },
    preparedMinY: lastPreparedMinY,
    preparedGeomHash: lastPaintedGeomHash,
  };
}

export function clearOrcaWasmCaches(): void {
  for (const bundle of sliceBundleCache.values()) {
    if (bundle.supportExportGeometry && bundle.supportExportGeometry !== latestExportSupportGeom) {
      bundle.supportExportGeometry.dispose();
    }
  }
  sliceBundleCache.clear();
  lastContourStageSignature = null;
  cachedPreparedMesh = null;
  latestExportSupportGeom = null;
  latestRealGcode = null;
}

function destroySharedWorker(): void {
  if (sharedWorker) {
    try {
      sharedWorker.terminate();
    } catch {
      // Ignore worker termination errors
    }
  }
  sharedWorker = null;
  supProgressView = null;
  cancelFlagView = null;
  inFlightWorkerPromise = null;
  lastContourStageSignature = null;
  lastPaintedGeomHash = null;
  latestPaintCounts = { enf: 0, blk: 0 };
  workerListeners.clear();
}

function getOrCreateWorker(): Worker {
  if (sharedWorker) return sharedWorker;

  const w = makeSlicerWorker();
  w.addEventListener('message', (ev: MessageEvent) => {
    const data = ev.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'supsab' && data.buf) {
      try {
        if (typeof data.ptr === 'number') {
          supProgressView = new Uint32Array(data.buf, data.ptr, 1);
        }
        if (typeof data.cancelPtr === 'number' && data.cancelPtr > 0) {
          cancelFlagView = new Uint32Array(data.buf, data.cancelPtr, 1);
        }
        loadedKernelMode = 'mt';
      } catch {
        // Non-shared buffer fallback
      }
      return;
    }

    if (data.type === 'warm' && (data.kernel === 'mt' || data.kernel === 'st')) {
      loadedKernelMode = data.kernel;
    }

    for (const fn of Array.from(workerListeners)) {
      fn(data);
    }
  });

  w.addEventListener('error', (ev: ErrorEvent) => {
    const errPayload = {
      type: 'worker_fatal',
      error: ev.message || 'OrcaSlicer WASM Worker crashed',
    };
    for (const fn of Array.from(workerListeners)) {
      fn(errPayload);
    }
  });

  sharedWorker = w;
  return w;
}

/**
 * Khởi động trước nhân C++ OrcaSlicer WASM (+ pthread pool nếu COOP/COEP bật) ở chế độ nền
 */
export function warmupOrcaWasmEngine(): void {
  if (typeof window === 'undefined' || isWarmingUp || sharedWorker) return;
  isWarmingUp = true;
  try {
    const w = getOrCreateWorker();
    const requestId = nextWorkerReqId++;
    const onMsg: WorkerMsgListener = (data) => {
      if (data.requestId === requestId || data.type === 'worker_fatal') {
        workerListeners.delete(onMsg);
        isWarmingUp = false;
      }
    };
    workerListeners.add(onMsg);
    w.postMessage({ cmd: 'warmup', requestId });
  } catch {
    isWarmingUp = false;
  }
}

async function interruptInFlightWorkerIfNeeded(): Promise<void> {
  if (!inFlightWorkerPromise || !sharedWorker) return;

  if (cancelFlagView) {
    try {
      Atomics.store(cancelFlagView, 0, 1);
    } catch {
      cancelFlagView[0] = 1;
    }
    const outcome = await Promise.race([
      inFlightWorkerPromise.then(() => 'settled').catch(() => 'settled'),
      new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 450)),
    ]);
    if (outcome === 'timeout') {
      destroySharedWorker();
    } else if (cancelFlagView) {
      try {
        Atomics.store(cancelFlagView, 0, 0);
      } catch {
        cancelFlagView[0] = 0;
      }
    }
  } else {
    destroySharedWorker();
  }
}

function executeRawWorkerSlice(
  stlBuffer: ArrayBuffer,
  kernelParams: Record<string, unknown>,
  enableTreeSupport: boolean,
  onProgress?: (percent: number, stageLabel: string) => void
): Promise<IRawWorkerSliceResult> {
  const w = getOrCreateWorker();
  const requestId = nextWorkerReqId++;

  if (cancelFlagView) {
    try {
      Atomics.store(cancelFlagView, 0, 0);
    } catch {
      cancelFlagView[0] = 0;
    }
  }
  if (supProgressView) {
    try {
      Atomics.store(supProgressView, 0, 0);
    } catch {
      supProgressView[0] = 0;
    }
  }

  const runPromise = new Promise<IRawWorkerSliceResult>((resolve, reject) => {
    const streamedLayers: IRawSliceLayer[] = [];
    const gcodeChunks: string[] = [];
    let highestPct = 18;

    const emitPct = (pct: number, label: string) => {
      if (pct >= highestPct) {
        highestPct = pct;
        onProgress?.(pct, label);
      }
    };

    const sabPollTimer = setInterval(() => {
      if (!supProgressView || !enableTreeSupport) return;
      let rawSup = 0;
      try {
        rawSup = Atomics.load(supProgressView, 0);
      } catch {
        rawSup = supProgressView[0] || 0;
      }
      if (rawSup > 0 && rawSup <= 100) {
        const mapped = Math.round(20 + (rawSup / 100) * 44);
        emitPct(mapped, `OrcaSlicer C++ TreeSupport3D: ${rawSup}%`);
      }
    }, 110);

    const cleanup = () => {
      clearInterval(sabPollTimer);
      workerListeners.delete(onMsg);
    };

    const onMsg: WorkerMsgListener = (data) => {
      if (data.type === 'worker_fatal') {
        cleanup();
        reject(new Error(String(data.error || 'Worker fatal error')));
        return;
      }
      if (data.requestId !== requestId) return;

      if (data.type === 'progress') {
        const done = Number(data.done || 0);
        const total = Math.max(1, Number(data.total || 1));
        const ratio = Math.min(1, done / total);
        const base = enableTreeSupport ? 64 : 22;
        const span = enableTreeSupport ? 26 : 68;
        emitPct(Math.round(base + ratio * span), `OrcaSlicer C++: Lớp ${done}/${total}`);
        return;
      }

      if (data.type === 'layer') {
        if (typeof data.gcode === 'string' && data.gcode.length > 0) {
          gcodeChunks.push(data.gcode);
        }
        streamedLayers.push({
          z: Number(data.z || 0),
          idx: Number(data.idx || 0),
          gcode: typeof data.gcode === 'string' ? data.gcode : '',
          paths: data.paths instanceof Float32Array ? data.paths : new Float32Array(0),
          widths: data.widths instanceof Float32Array ? data.widths : undefined,
        });
        return;
      }

      if (data.type === 'error') {
        cleanup();
        reject(new Error(String(data.error || 'OrcaSlicer C++ slice failed')));
        return;
      }

      if (data.type === 'done') {
        cleanup();
        const result = (data.result || {}) as Record<string, any>;
        const finalLayers =
          streamedLayers.length > 0
            ? streamedLayers
            : ((result.layers || []) as IRawSliceLayer[]);
        const finalGcode =
          gcodeChunks.length > 0
            ? gcodeChunks.join('')
            : typeof result.gcode === 'string'
            ? result.gcode
            : '';
        resolve({
          layers: finalLayers,
          gcode: finalGcode,
          stats: (result.stats || {}) as Record<string, unknown>,
        });
      }
    };

    workerListeners.add(onMsg);
    const stlCopy = stlBuffer.slice(0);
    const useGpuContour =
      loadedKernelMode === 'st' && !(Number(kernelParams.reuse_stages || 0) >= 2);
    w.postMessage(
      {
        stl: stlCopy,
        params: JSON.stringify(kernelParams),
        gpu: useGpuContour,
        requestId,
      },
      [stlCopy]
    );
  });

  inFlightWorkerPromise = runPromise;
  runPromise.finally(() => {
    if (inFlightWorkerPromise === runPromise) {
      inFlightWorkerPromise = null;
    }
  });

  return runPromise;
}

/**
 * Deterministic fast geometry signature so re-cloned transformed meshes keep hitting stage/bundle caches.
 */
export function computeGeometryHash(geometry: THREE.BufferGeometry): string {
  geometry.computeBoundingBox();
  const pos = geometry.getAttribute('position');
  const vCount = pos ? pos.count : 0;
  const idx = geometry.getIndex();
  const idxCount = idx ? idx.count : vCount;
  const bb = geometry.boundingBox;

  let hash = 2166136261 >>> 0;
  const mix = (n: number) => {
    const q = Math.round(n * 1000);
    hash ^= q & 0xff;
    hash = Math.imul(hash, 16777619) >>> 0;
    hash ^= (q >> 8) & 0xff;
    hash = Math.imul(hash, 16777619) >>> 0;
  };

  mix(vCount);
  mix(idxCount);
  if (bb) {
    mix(bb.min.x); mix(bb.min.y); mix(bb.min.z);
    mix(bb.max.x); mix(bb.max.y); mix(bb.max.z);
  }
  if (pos && vCount > 0) {
    const samples = 16;
    const step = Math.max(1, Math.floor(vCount / samples));
    for (let i = 0; i < vCount; i += step) {
      mix(pos.getX(i));
      mix(pos.getY(i));
      mix(pos.getZ(i));
    }
  }
  return `${vCount}_${idxCount}_${hash.toString(36)}`;
}

function buildContourStageSignature(
  geomHash: string,
  profile: ISimulationProfile,
  scale: number = 1,
  rotation: [number, number, number] = [0, 0, 0]
): string {
  return [
    geomHash,
    scale.toFixed(3),
    rotation.map((r) => r.toFixed(3)).join(','),
    profile.nozzleDiameter ?? 0.4,
    profile.layerHeight,
    profile.firstLayerHeight ?? 0.2,
    profile.lineWidth ?? 0.42,
    profile.outerWallLineWidth ?? profile.lineWidth ?? 0.42,
    profile.wallLoops,
    profile.topShellLayers ?? 4,
    profile.bottomShellLayers ?? 3,
    profile.infillDensity,
    profile.infillType,
    profile.infillOverlapPercent ?? 15,
    profile.seamPosition ?? 'aligned',
    profile.ironingEnabled ? 1 : 0,
    profile.flowRatio ?? 0.98,
    profile.brimEnabled ? profile.brimWidthMm : 0,
    profile.raftLayers ?? 0,
    profile.fastPreviewMode ? 1 : 0,
  ].join('|');
}

/**
 * Tạo khóa định danh duy nhất cho hình học + thông số cắt lớp + trạng thái tô Support
 */
export function buildOrcaSliceCacheKey(
  geometry: THREE.BufferGeometry,
  profile: ISimulationProfile,
  scale: number = 1,
  rotation: [number, number, number] = [0, 0, 0]
): string {
  const geomHash = computeGeometryHash(geometry);
  return [
    buildContourStageSignature(geomHash, profile, scale, rotation),
    profile.supportMode,
    profile.treeStyle ?? 'organic',
    profile.supportAngleThreshold ?? 30,
    profile.supportTopZDistance ?? 0.2,
    profile.supportBottomZDistance ?? 0.2,
    profile.supportBranchDiameter ?? 2.2,
    profile.supportBranchAngle ?? 42,
    profile.supportInterfaceLayers ?? 2,
    profile.supportOnBuildPlateOnly !== false ? 1 : 0,
    profile.supportOverhangMinArea ?? 0,
    profile.supportExpansionMm ?? 0,
    profile.supportXyDistanceMm ?? 0.35,
    profile.supportInterfaceSpacingMm ?? 0.4,
    profile.treeTopRatePercent ?? 30,
    profile.treeBranchDiameterAngleDeg ?? 5,
    profile.supportPaintMode ?? 'auto_with_paint',
    `pv:${paintRevision}`,
    profile.printSpeed,
    profile.outerWallSpeed ?? 0,
    profile.nozzleTemp,
    profile.bedTemp,
  ].join('|');
}

/**
 * Converts Three.js Y-up BufferGeometry -> Z-up Binary STL (det=+1: x, -z, y - minY),
 * using hole filling, QEM overhang-preserving decimation (>220k tris), or morphological repair,
 * and caches the prepared STL + exact Y-up facet positions for 1:1 C++ support painting.
 */
function buildZUpStlForOrca(
  geometry: THREE.BufferGeometry,
  forceWatertightRepair: boolean = false
): PreparedMeshCacheEntry {
  const geomHash = computeGeometryHash(geometry);
  if (
    !forceWatertightRepair &&
    cachedPreparedMesh &&
    cachedPreparedMesh.geomHash === geomHash
  ) {
    return cachedPreparedMesh;
  }

  geometry.computeBoundingBox();
  const minY = geometry.boundingBox?.min.y ?? 0;
  const maxY = geometry.boundingBox?.max.y ?? 20;
  const modelHeightMm = Math.max(1, maxY - minY);

  let rawArr: Float32Array;
  let needsYOffset = Math.abs(minY) > 1e-5;
  const directPos = !geometry.index ? geometry.getAttribute('position') : null;

  if (
    directPos instanceof THREE.BufferAttribute &&
    directPos.array instanceof Float32Array &&
    directPos.itemSize === 3
  ) {
    rawArr = directPos.array.subarray(0, directPos.count * 3);
  } else {
    const working = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    const posAttr = working.getAttribute('position');
    rawArr = new Float32Array(posAttr.count * 3);
    for (let i = 0; i < posAttr.count; i++) {
      rawArr[i * 3] = posAttr.getX(i);
      rawArr[i * 3 + 1] = posAttr.getY(i) - minY;
      rawArr[i * 3 + 2] = posAttr.getZ(i);
    }
    needsYOffset = false;
    working.dispose();
  }

  const originalTris = Math.floor(rawArr.length / 9);
  const openRatio = originalTris <= 260000 ? computeOpenEdgeRatio(rawArr) : 0;
  let activeArr: Float32Array = rawArr;
  let repaired = false;
  let repairMethod: PreparedMeshCacheEntry['repairMethod'] = 'none';

  const shiftToBedZero = (arr: Float32Array): Float32Array => {
    if (!needsYOffset) return arr;
    const shifted = new Float32Array(arr.length);
    for (let i = 0; i < arr.length; i += 3) {
      shifted[i] = arr[i];
      shifted[i + 1] = arr[i + 1] - minY;
      shifted[i + 2] = arr[i + 2];
    }
    needsYOffset = false;
    return shifted;
  };

  if (forceWatertightRepair || openRatio > 0.08) {
    activeArr = shiftToBedZero(activeArr);
    const repairedRes = repairBrokenSoupToWatertight(activeArr, forceWatertightRepair ? 0.5 : openRatio);
    if (repairedRes.method !== 'none') {
      activeArr = repairedRes.posArr;
      repaired = true;
      repairMethod = repairedRes.method;
    }
  }

  if (Math.floor(activeArr.length / 9) > 220000) {
    activeArr = shiftToBedZero(activeArr);
    activeArr = simplifyMeshQemOverhangAware(activeArr, 220000);
  }

  const yShift = needsYOffset ? minY : 0;
  const triCount = Math.floor(activeArr.length / 9);
  const yUpPositions = new Float32Array(triCount * 9);
  const buffer = new ArrayBuffer(84 + triCount * 50);
  const view = new DataView(buffer);
  view.setUint32(80, triCount, true);

  let offset = 84;
  for (let t = 0; t < triCount; t++) {
    const b = t * 9;
    const ax3 = activeArr[b], ay3 = activeArr[b + 1] - yShift, az3 = activeArr[b + 2];
    const bx3 = activeArr[b + 3], by3 = activeArr[b + 4] - yShift, bz3 = activeArr[b + 5];
    const cx3 = activeArr[b + 6], cy3 = activeArr[b + 7] - yShift, cz3 = activeArr[b + 8];

    yUpPositions[b] = ax3;     yUpPositions[b + 1] = ay3 + minY; yUpPositions[b + 2] = az3;
    yUpPositions[b + 3] = bx3; yUpPositions[b + 4] = by3 + minY; yUpPositions[b + 5] = bz3;
    yUpPositions[b + 6] = cx3; yUpPositions[b + 7] = cy3 + minY; yUpPositions[b + 8] = cz3;

    // Three.js Y-up (x, y-minY, z) -> Orca Z-up (x, -z, y-minY)
    const ax = ax3, ay = -az3, az = ay3;
    const bx = bx3, by = -bz3, bz = by3;
    const cx = cx3, cy = -cz3, cz = cy3;

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

  const entry: PreparedMeshCacheEntry = {
    geomHash,
    stlBuffer: buffer,
    yUpPositions,
    minY,
    modelHeightMm,
    originalTris,
    slicedTris: triCount,
    repaired,
    repairMethod,
  };
  if (!forceWatertightRepair) {
    cachedPreparedMesh = entry;
  }
  return entry;
}

// ============================================================================
// C++ SUPPORT PAINTING WORKER BRIDGE (Stage 20: Enforcer=1, Blocker=2, Erase)
// ============================================================================

export type SupportPaintRole = 'enforcer' | 'blocker' | 'erase';
export type SupportPaintTool = 'sphere' | 'circle' | 'smart' | 'bucket' | 'triangle';

function enqueueWorkerRpc<T>(
  msgBuilder: (reqId: number) => { payload: Record<string, any>; transfer?: Transferable[] },
  expectedType: string
): Promise<T> {
  const job = paintRpcChain.then(async () => {
    if (inFlightWorkerPromise) {
      await interruptInFlightWorkerIfNeeded();
    }
    const w = getOrCreateWorker();
    const requestId = nextWorkerReqId++;
    const { payload, transfer } = msgBuilder(requestId);
    return new Promise<T>((resolve, reject) => {
      const cleanup = () => workerListeners.delete(onMsg);
      const onMsg: WorkerMsgListener = (data) => {
        if (data.type === 'worker_fatal') {
          cleanup();
          reject(new Error(String(data.error || 'Worker fatal error')));
          return;
        }
        if (data.requestId !== requestId) return;
        if (data.type === 'error') {
          cleanup();
          reject(new Error(String(data.error || 'Worker paint RPC failed')));
          return;
        }
        if (data.type === expectedType) {
          cleanup();
          resolve(data as unknown as T);
        }
      };
      workerListeners.add(onMsg);
      w.postMessage({ ...payload, requestId }, transfer || []);
    });
  });
  paintRpcChain = job.catch(() => {});
  return job;
}

function threeCoordToOrca(p: [number, number, number], minY: number): [number, number, number] {
  return [p[0], -p[2], p[1] - minY];
}

function convertFlatOrcaTrisToThree(flatZUp: Float32Array, minY: number): Float32Array {
  if (!flatZUp || flatZUp.length === 0) return new Float32Array(0);
  const out = new Float32Array(flatZUp.length);
  for (let i = 0; i < flatZUp.length; i += 3) {
    out[i] = flatZUp[i];
    out[i + 1] = flatZUp[i + 2] + minY;
    out[i + 2] = -flatZUp[i + 1];
  }
  return out;
}

export async function prepareModelForSupportPaint(
  geometry: THREE.BufferGeometry
): Promise<{
  facets: number;
  kept: boolean;
  minY: number;
  raycastPositions: Float32Array;
  geomHash: string;
}> {
  const prep = buildZUpStlForOrca(geometry, false);
  const keepPaint = lastPaintedGeomHash === prep.geomHash;
  const reply = await enqueueWorkerRpc<{ type: 'prepared'; facets: number; kept: boolean }>(
    () => {
      const stlCopy = prep.stlBuffer.slice(0);
      return {
        payload: { cmd: 'prepare', stl: stlCopy, keepPaint },
        transfer: [stlCopy],
      };
    },
    'prepared'
  );
  lastPaintedGeomHash = prep.geomHash;
  lastPreparedMinY = prep.minY;
  return {
    facets: reply.facets,
    kept: reply.kept,
    minY: prep.minY,
    raycastPositions: prep.yUpPositions,
    geomHash: prep.geomHash,
  };
}

export async function getSupportPaintOverlay(): Promise<{
  enf: Float32Array;
  blk: Float32Array;
}> {
  const raw = await enqueueWorkerRpc<{
    type: 'overlay';
    enf: Float32Array;
    blk: Float32Array;
  }>(() => ({ payload: { cmd: 'overlay' } }), 'overlay');

  return {
    enf: convertFlatOrcaTrisToThree(raw.enf, lastPreparedMinY),
    blk: convertFlatOrcaTrisToThree(raw.blk, lastPreparedMinY),
  };
}

export async function applySupportPaintStroke(args: {
  role: SupportPaintRole;
  tool: SupportPaintTool;
  facet: number;
  hitPointThree: [number, number, number];
  prevPointThree?: [number, number, number];
  cameraPosThree: [number, number, number];
  radiusMm: number;
  smartAngleDeg?: number;
}): Promise<{
  enf: number;
  blk: number;
  overlayEnf: Float32Array;
  overlayBlk: Float32Array;
}> {
  const [hx, hy, hz] = threeCoordToOrca(args.hitPointThree, lastPreparedMinY);
  const [cx, cy, cz] = threeCoordToOrca(args.cameraPosThree, lastPreparedMinY);
  const prevOrca = args.prevPointThree
    ? threeCoordToOrca(args.prevPointThree, lastPreparedMinY)
    : null;

  const isFill = args.tool === 'smart' || args.tool === 'bucket' || args.tool === 'triangle';
  const painted = await enqueueWorkerRpc<{ type: 'painted'; enf: number; blk: number }>(
    () => ({
      payload: {
        cmd: args.role === 'erase' ? 'erase' : 'paint',
        ...(args.role !== 'erase' ? { state: args.role === 'enforcer' ? 1 : 2 } : {}),
        ...(isFill ? { tool: args.tool, angle: args.smartAngleDeg ?? 30 } : { cursor: args.tool }),
        facet: Math.max(0, Math.floor(args.facet)),
        hx,
        hy,
        hz,
        ...(prevOrca ? { px: prevOrca[0], py: prevOrca[1], pz: prevOrca[2] } : {}),
        cx,
        cy,
        cz,
        radius: Math.max(0.4, args.radiusMm),
      },
    }),
    'painted'
  );

  latestPaintCounts = { enf: painted.enf, blk: painted.blk };
  paintRevision++;
  const overlay = await getSupportPaintOverlay();
  return {
    enf: painted.enf,
    blk: painted.blk,
    overlayEnf: overlay.enf,
    overlayBlk: overlay.blk,
  };
}

export async function previewSupportFillUnderCursor(args: {
  tool: 'smart' | 'bucket' | 'triangle';
  facet?: number;
  hitPointThree?: [number, number, number];
  smartAngleDeg?: number;
  clear?: boolean;
}): Promise<Float32Array> {
  if (args.clear) {
    await enqueueWorkerRpc<{ type: 'fillPreview'; tris: Float32Array }>(
      () => ({ payload: { cmd: 'fillPreview', clear: true } }),
      'fillPreview'
    );
    return new Float32Array(0);
  }
  const [hx, hy, hz] = args.hitPointThree
    ? threeCoordToOrca(args.hitPointThree, lastPreparedMinY)
    : [0, 0, 0];
  const raw = await enqueueWorkerRpc<{ type: 'fillPreview'; supported: boolean; tris: Float32Array }>(
    () => ({
      payload: {
        cmd: 'fillPreview',
        tool: args.tool,
        facet: args.facet ?? 0,
        hx,
        hy,
        hz,
        angle: args.smartAngleDeg ?? 30,
      },
    }),
    'fillPreview'
  );
  return convertFlatOrcaTrisToThree(raw.tris, lastPreparedMinY);
}

export async function clearAllSupportPaint(): Promise<{ enf: number; blk: number }> {
  const reply = await enqueueWorkerRpc<{ type: 'painted'; enf: number; blk: number }>(
    () => ({ payload: { cmd: 'clear' } }),
    'painted'
  );
  latestPaintCounts = { enf: reply.enf, blk: reply.blk };
  paintRevision++;
  return latestPaintCounts;
}

export async function setSupportPaintOverhangFilter(overhangDeg: number): Promise<boolean> {
  const reply = await enqueueWorkerRpc<{ type: 'paintMode'; ok: boolean }>(
    () => ({ payload: { cmd: 'paintMode', overhangDeg: Math.max(0, Math.min(89, overhangDeg)) } }),
    'paintMode'
  );
  return reply.ok;
}

/**
 * Ánh xạ chuẩn xác thông số ISimulationProfile qua bộ chuẩn hóa chính thức deriveKernelParams của OrcaSlicer C++
 * Tất cả 4 kiểu Tree (organic, slim, strong, hybrid) đều chạy qua nhân TreeSupport3D tốc độ cao và phân hóa bằng kích thước vật lý thực!
 */
function mapProfileToOrcaKernelParams(
  profile: ISimulationProfile,
  modelHeightMm: number,
  options?: { reuseStages?: number }
): {
  kernelParams: Record<string, unknown>;
  effectiveLayerHeight: number;
  effectiveLineWidth: number;
} {
  const nozzleDiam = Math.max(0.15, profile.nozzleDiameter || 0.4);
  const maxSafeLayer = Number((nozzleDiam * 0.78).toFixed(3));
  const requestedLayerHeight = Math.min(maxSafeLayer, Math.max(0.05, profile.layerHeight || 0.2));

  // Respect exact user layerHeight unless explicit Fast Preview Mode is turned on
  let effectiveLayerHeight = requestedLayerHeight;
  if (profile.fastPreviewMode && modelHeightMm / requestedLayerHeight > 420) {
    effectiveLayerHeight = Math.min(
      maxSafeLayer,
      Math.max(requestedLayerHeight, Number((modelHeightMm / 400).toFixed(2)))
    );
  }

  const effectiveNozzle = nozzleDiam;
  const effectiveLineWidth = Math.max(
    profile.lineWidth || Number((nozzleDiam * 1.05).toFixed(2)),
    Number((nozzleDiam * 0.95).toFixed(2))
  );
  const firstLayerHeight = Math.max(
    effectiveLayerHeight,
    Math.min(maxSafeLayer, profile.firstLayerHeight || Math.max(0.2, effectiveLayerHeight))
  );

  const patternMap: Record<string, string> = {
    gyroid: 'gyroid',
    grid: 'grid',
    honeycomb: 'honeycomb',
    triangles: 'triangles',
    concentric: 'concentric',
    cubic: '3dhoneycomb',
    lightning: 'zigzag',
    solid: 'rectilinear',
  };
  const infillPattern = patternMap[profile.infillType] || 'gyroid';
  const sparseInfillPercent =
    profile.infillType === 'solid' ? 100 : Math.max(0, Math.min(100, profile.infillDensity ?? 15));

  const treeStyle = profile.treeStyle || 'organic';
  const userBranchDiam = profile.supportBranchDiameter ?? 2.2;
  const userBranchAngle = profile.supportBranchAngle ?? 42;
  const baseBranchDist = modelHeightMm > 115 ? 3.8 : modelHeightMm > 75 ? 2.8 : 2.0;

  let organicBranchDiam = userBranchDiam;
  let organicTipDiam = 0.8;
  let organicBranchAngle = userBranchAngle;
  let organicBranchDist = baseBranchDist;
  let treeWallCount = 1;
  let interfaceTopLayers = profile.supportInterfaceLayers ?? 2;

  if (treeStyle === 'slim') {
    organicBranchDiam = Number(Math.max(1.4, userBranchDiam * 0.72).toFixed(2));
    organicTipDiam = 0.65;
    organicBranchAngle = Math.min(52, userBranchAngle + 3);
    organicBranchDist = Number((baseBranchDist * 1.25).toFixed(2));
    treeWallCount = 1;
  } else if (treeStyle === 'strong') {
    organicBranchDiam = Number(Math.max(2.8, userBranchDiam * 1.35).toFixed(2));
    organicTipDiam = 1.0;
    organicBranchAngle = Math.max(32, userBranchAngle - 5);
    organicBranchDist = Number((baseBranchDist * 0.85).toFixed(2));
    treeWallCount = 2;
  } else if (treeStyle === 'hybrid') {
    organicBranchDiam = Number(Math.max(2.4, userBranchDiam * 1.1).toFixed(2));
    organicTipDiam = 0.9;
    organicBranchAngle = 40;
    organicBranchDist = Number((baseBranchDist * 0.9).toFixed(2));
    treeWallCount = 2;
    interfaceTopLayers = Math.max(3, interfaceTopLayers);
  }

  const thresholdDeg = Math.max(10, Math.min(60, profile.supportAngleThreshold ?? 30));
  const xyDist = profile.supportXyDistanceMm ?? 0.35;
  const interfaceSpacing = profile.supportInterfaceSpacingMm ?? (treeStyle === 'hybrid' ? 0.25 : 0.4);
  const topRatePct = profile.treeTopRatePercent ?? 30;
  const diameterAngleDeg = profile.treeBranchDiameterAngleDeg ?? 5;
  const minOverhangArea = profile.supportOverhangMinArea ?? 0;
  const expansionMm = profile.supportExpansionMm ?? 0;

  const upstreamTreeStyleMap: Record<string, string> = {
    organic: 'organic',
    slim: 'tree_slim',
    strong: 'tree_strong',
    hybrid: 'tree_hybrid',
  };

  const upstreamSettings = {
    printable_area: [
      [0, 0],
      [256, 0],
      [256, 256],
      [0, 256],
    ],
    printable_height: 256,
    nozzle_diameter: [effectiveNozzle],
    filament_diameter: [1.75],
    filament_flow_ratio: [profile.flowRatio ?? 0.98],
    nozzle_temperature: [profile.nozzleTemp || 220],
    nozzle_temperature_initial_layer: [(profile.nozzleTemp || 220) + 5],
    hot_plate_temp: [profile.bedTemp || 55],
    hot_plate_temp_initial_layer: [profile.bedTemp || 55],
    fan_max_speed: [profile.coolingFanSpeed ?? 100],

    layer_height: effectiveLayerHeight,
    initial_layer_print_height: firstLayerHeight,
    line_width: effectiveLineWidth,
    outer_wall_line_width: profile.outerWallLineWidth || effectiveLineWidth,
    wall_loops: Math.max(1, profile.wallLoops || 2),
    wall_generator: 'classic',
    top_shell_layers: profile.topShellLayers ?? 4,
    bottom_shell_layers: profile.bottomShellLayers ?? 3,
    sparse_infill_density: `${sparseInfillPercent}%`,
    sparse_infill_pattern: infillPattern,
    infill_wall_overlap: `${profile.infillOverlapPercent ?? 15}%`,
    seam_position: profile.seamPosition || 'aligned',
    ironing_type: profile.ironingEnabled ? 'top' : 'no ironing',
    brim_type: profile.brimEnabled ? 'outer_only' : 'no_brim',
    brim_width: profile.brimEnabled ? profile.brimWidthMm || 5 : 0,
    skirt_loops: 0,
    raft_layers: profile.raftLayers ?? 0,

    outer_wall_speed: profile.outerWallSpeed || Math.round((profile.printSpeed || 200) * 0.65),
    inner_wall_speed: profile.innerWallSpeed || profile.printSpeed || 200,
    sparse_infill_speed: profile.infillSpeed || Math.round((profile.printSpeed || 200) * 1.15),
    top_surface_speed: profile.topSurfaceSpeed || Math.round((profile.printSpeed || 200) * 0.55),
    travel_speed: profile.travelSpeed || 500,
    initial_layer_speed: 50,
    default_acceleration: profile.defaultAcceleration || 10000,
    retraction_length: [profile.retractionDistanceMm ?? 0.8],
    retraction_speed: [profile.retractionSpeedMmS ?? 35],
    z_hop: [profile.zHopMm ?? 0.4],

    enable_support: profile.supportMode !== 'none',
    support_type:
      profile.supportMode === 'tree'
        ? profile.supportPaintMode === 'paint_only'
          ? 'tree(manual)'
          : 'tree(auto)'
        : profile.supportPaintMode === 'paint_only'
          ? 'normal(manual)'
          : 'normal(auto)',
    support_style:
      profile.supportMode === 'tree'
        ? upstreamTreeStyleMap[treeStyle] || 'organic'
        : 'grid',
    support_threshold_angle: thresholdDeg,
    support_on_build_plate_only: profile.supportOnBuildPlateOnly !== false,
    support_top_z_distance: profile.supportTopZDistance ?? 0.2,
    support_bottom_z_distance: profile.supportBottomZDistance ?? 0.2,
    support_object_xy_distance: xyDist,
    support_interface_top_layers: interfaceTopLayers,
    support_interface_spacing: interfaceSpacing,
    support_expansion: expansionMm,
    support_remove_small_overhang: true,
    bridge_no_support: false,
    independent_support_layer_height: false,
    tree_support_branch_diameter: organicBranchDiam,
    tree_support_branch_diameter_organic: organicBranchDiam,
    tree_support_tip_diameter: organicTipDiam,
    tree_support_branch_angle: organicBranchAngle,
    tree_support_branch_angle_organic: organicBranchAngle,
    tree_support_branch_distance: organicBranchDist,
    tree_support_branch_distance_organic: organicBranchDist,
    tree_support_branch_diameter_angle: diameterAngleDeg,
    tree_support_top_rate: topRatePct,
    tree_support_wall_count: treeWallCount,
    resolution: modelHeightMm > 110 ? 0.06 : 0.04,
  } as unknown as SlicerSettings;

  const derived = deriveKernelParams(upstreamSettings);

  const kernelParams: Record<string, unknown> = {
    ...derived,
    auto_center: false,
    wall_generator: 'classic',
    independent_support_layer_height: false,
    support_remove_small_overhang: true,
    bridge_no_support: false,
    enable_support: profile.supportMode !== 'none',
    support_auto: profile.supportPaintMode !== 'paint_only',
    support_style: profile.supportMode === 'tree' ? 'tree' : 'grid',
    tree_style: treeStyle,
    bed_width: 256,
    bed_depth: 256,
    support_threshold_angle: thresholdDeg,
    support_xy_distance: xyDist,
    support_interface_spacing: interfaceSpacing,
    support_overhang_min_area: minOverhangArea,
    support_expansion: expansionMm,
    tree_support_branch_diameter: organicBranchDiam,
    tree_support_branch_diameter_organic: organicBranchDiam,
    tree_support_tip_diameter: organicTipDiam,
    tree_support_branch_angle: organicBranchAngle,
    tree_support_branch_angle_organic: organicBranchAngle,
    tree_support_branch_distance: organicBranchDist,
    tree_support_branch_distance_organic: organicBranchDist,
    tree_support_branch_diameter_angle: diameterAngleDeg,
    tree_support_top_rate: topRatePct,
    tree_support_wall_count: treeWallCount,
    resolution: modelHeightMm > 110 ? 0.06 : 0.04,
    keep_stages: true,
    reuse_stages: options?.reuseStages ?? 0,
    gcode_role_tags: true,
    gcode_stats_block: true,
  };

  return { kernelParams, effectiveLayerHeight, effectiveLineWidth };
}

/**
 * Trích xuất cấu trúc INativeSupportData chuẩn xác 100% từ các đường bao Support (role === 5, 6) của OrcaSlicer C++
 * Tách riêng từng vòng contour cành độc lập trên cùng một lớp để không bao giờ nối nhầm 2 nhánh xa nhau!
 */
function extractNativeSupportFromOrcaLayers(
  layers: IRawSliceLayer[],
  modelName: string,
  effectiveLayerHeight: number,
  effectiveLineWidth: number
): { supportData: INativeSupportData; supportSegCount: number; modelSegCount: number } {
  const layerCount = layers.length;
  const supportGridPerLayer: Array<Set<number>> = new Array(layerCount);

  let supportSegCount = 0;
  let modelSegCount = 0;

  const packCell = (xs: number, ys: number) => {
    const gx = Math.round((xs + 512) * 0.5);
    const gy = Math.round((ys + 512) * 0.5);
    return gx * 2048 + gy;
  };

  for (let li = 0; li < layerCount; li++) {
    const cellSet = new Set<number>();
    const p = layers[li].paths;
    if (p && p.length >= 8) {
      for (let k = 0; k < p.length; k += 8) {
        const role = (p[k + 3] | 0) & 15;
        if (role === 5 || role === 6) {
          supportSegCount++;
          const mx = (p[k] + p[k + 4]) * 0.5;
          const my = (p[k + 1] + p[k + 5]) * 0.5;
          cellSet.add(packCell(mx, my));
        } else if (role !== 0 && role !== 4) {
          modelSegCount++;
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
        if (aboveSet.has((gxBase + dx) * 2048 + (gyBase + dy))) {
          return true;
        }
      }
    }
    return false;
  };

  const segments: INativeSupportSegment[] = [];
  let totalMoves = 0;

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

      const x0 = p[k];
      const y0 = p[k + 1];
      const z0 = p[k + 2];
      const x1 = p[k + 4];
      const y1 = p[k + 5];
      const z1 = p[k + 6];

      const mx = (x0 + x1) * 0.5;
      const my = (y0 + y1) * 0.5;
      const isRoofInterface = li >= 2 && !hasSupportAbove(li, mx, my);

      // Inverse transform (xs, ys, zs) -> Three.js (xs, zs, -ys)
      const tx0 = x0, ty0 = z0, tz0 = -y0;
      const tx1 = x1, ty1 = z1, tz1 = -y1;

      const isDisjoint =
        activeLoop.length > 0 &&
        (isRoofInterface !== activeIsInterface ||
          Math.hypot(tx0 - prevEndX, tz0 - prevEndZ) > 0.08);

      if (isDisjoint) {
        flushLoop();
      }

      if (activeLoop.length === 0) {
        activeIsInterface = isRoofInterface;
      }
      activeLoop.push(tx0, ty0, tz0, tx1, ty1, tz1);

      prevEndX = tx1;
      prevEndZ = tz1;
      totalMoves++;
    }

    flushLoop();
  }

  return {
    supportData: {
      model: modelName,
      engine: `orcaslicer-cpp-wasm-0.4.3-${loadedKernelMode}`,
      totalMoves,
      totalSegments: segments.length,
      layerHeightMm: effectiveLayerHeight,
      lineWidthMm: effectiveLineWidth,
      segments,
    },
    supportSegCount,
    modelSegCount,
  };
}

/**
 * Chuyển đổi nhóm Mesh từ buildNativeSupportMesh thành một BufferGeometry độc lập phục vụ Xuất .3MF / .STL
 */
export function convertSupportGroupToExportGeometry(
  supportGroup: THREE.Group
): THREE.BufferGeometry | null {
  const chunks: Float32Array[] = [];
  let totalFloats = 0;

  supportGroup.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      const nonIdx = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry;
      const pos = nonIdx.getAttribute('position');
      if (pos && pos.count >= 3) {
        const arr = new Float32Array(pos.count * 3);
        for (let i = 0; i < pos.count; i++) {
          arr[i * 3] = pos.getX(i);
          arr[i * 3 + 1] = pos.getY(i);
          arr[i * 3 + 2] = pos.getZ(i);
        }
        chunks.push(arr);
        totalFloats += arr.length;
      }
      if (nonIdx !== child.geometry) nonIdx.dispose();
    }
  });

  if (totalFloats === 0) return null;
  const merged = new Float32Array(totalFloats);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(merged, 3));
  out.computeVertexNormals();
  return out;
}

/**
 * Thực thi cắt lớp thực tế 100% bằng nhân C++ OrcaSlicer WASM trong Web Worker (tự động kích hoạt đa luồng mt + WebGPU)
 */
export async function sliceGeometryWithOrcaWasm(
  geometry: THREE.BufferGeometry,
  modelName: string,
  profile: ISimulationProfile,
  options?: {
    onProgress?: (percent: number, stageLabel: string) => void;
    buildSupportExportMesh?: (data: INativeSupportData) => THREE.Group;
  }
): Promise<IOrcaWasmSliceBundle | null> {
  const cacheKey = buildOrcaSliceCacheKey(geometry, profile);
  if (sliceBundleCache.has(cacheKey)) {
    const hit = sliceBundleCache.get(cacheKey)!;
    latestExportSupportGeom = hit.supportExportGeometry;
    latestRealGcode = hit.gcode;
    options?.onProgress?.(100, 'Đã nạp từ bộ nhớ đệm Orca C++');
    return hit;
  }

  const jobToken = ++activeJobToken;
  await interruptInFlightWorkerIfNeeded();
  if (jobToken !== activeJobToken) return null;

  const t0 = performance.now();
  options?.onProgress?.(8, 'Chuẩn hóa lưới 3D Z-up...');

  const executeAttempt = async (forceRepair: boolean) => {
    const prep = buildZUpStlForOrca(geometry, forceRepair);
    if (jobToken !== activeJobToken) return null;

    const contourSig = buildContourStageSignature(prep.geomHash, profile);
    const activePaintRev = paintRevision;
    const canReuseStages =
      !forceRepair &&
      lastContourStageSignature === contourSig &&
      lastSlicedPaintRevision === activePaintRev &&
      sharedWorker !== null;

    const runSliceWithReuse = async (reuseStages: number) => {
      const mapped = mapProfileToOrcaKernelParams(profile, prep.modelHeightMm, {
        reuseStages,
      });

      options?.onProgress?.(
        18,
        reuseStages >= 2
          ? 'Tái sử dụng Contour C++ — đang cập nhật Tree Support...'
          : profile.supportMode === 'tree'
            ? `Nhân OrcaSlicer C++ TreeSupport (${profile.treeStyle || 'organic'}) đang giải nhánh...`
            : 'Nhân OrcaSlicer C++ đang cắt lát đường chạy dao...'
      );

      const res = await executeRawWorkerSlice(
        prep.stlBuffer,
        mapped.kernelParams,
        profile.supportMode === 'tree',
        (pct, label) => {
          if (jobToken !== activeJobToken) return;
          options?.onProgress?.(pct, label);
        }
      );
      return { res, prep, mapped, reusedStages: reuseStages >= 2, contourSig };
    };

    try {
      const attempt = await runSliceWithReuse(canReuseStages ? 2 : 0);
      if (jobToken !== activeJobToken) return null;
      lastContourStageSignature = contourSig;
      lastSlicedPaintRevision = activePaintRev;
      return attempt;
    } catch (err) {
      if (jobToken !== activeJobToken) return null;
      const msg = String((err as Error)?.message || err || '').toLowerCase();
      if (msg.includes('cancel')) return null;

      // Self-heal once with clean full slice if stage cache invalidated mid-flight
      if (canReuseStages) {
        lastContourStageSignature = null;
        try {
          const fallback = await runSliceWithReuse(0);
          if (jobToken !== activeJobToken) return null;
          lastContourStageSignature = contourSig;
          lastSlicedPaintRevision = activePaintRev;
          return fallback;
        } catch (err2) {
          if (jobToken !== activeJobToken) return null;
          throw err2;
        }
      }
      lastContourStageSignature = null;
      throw err;
    }
  };

  let run = await executeAttempt(false);
  if (!run || jobToken !== activeJobToken) return null;

  let layers = run.res.layers || [];
  let extracted = extractNativeSupportFromOrcaLayers(
    layers,
    modelName,
    run.mapped.effectiveLayerHeight,
    run.mapped.effectiveLineWidth
  );

  // Auto-heal broken STL manifolds with Watertight repair + clean full slice
  if (extracted.modelSegCount < 25 && !run.prep.repaired) {
    options?.onProgress?.(24, 'Tự động hàn kín mặt hở STL & cắt lại...');
    lastContourStageSignature = null;
    run = await executeAttempt(true);
    if (!run || jobToken !== activeJobToken) return null;
    layers = run.res.layers || [];
    extracted = extractNativeSupportFromOrcaLayers(
      layers,
      modelName,
      run.mapped.effectiveLayerHeight,
      run.mapped.effectiveLineWidth
    );
  }

  if (extracted.modelSegCount === 0 || layers.length === 0) {
    return null;
  }

  // Offset support coordinates back if model geometry minY !== 0
  if (Math.abs(run.prep.minY) > 1e-4 && extracted.supportData.segments.length > 0) {
    const dy = run.prep.minY;
    for (const seg of extracted.supportData.segments) {
      for (let i = 1; i < seg.points.length; i += 3) {
        seg.points[i] += dy;
      }
    }
  }

  options?.onProgress?.(92, 'Đang dựng sợi đùn 3D GPU & vỏ Tree Support...');

  const segData = buildSegmentData(layers, run.mapped.effectiveLineWidth);

  const densityGcm3 =
    profile.material === 'PETG'
      ? 1.27
      : profile.material === 'ABS' || profile.material === 'ASA'
      ? 1.05
      : profile.material === 'TPU'
      ? 1.21
      : 1.24;

  const rawStats = run.res.stats || {};
  const totalFilamentMm = Number(rawStats.filament_mm || 0);
  const filamentAreaMm2 = Math.PI * Math.pow(1.75 / 2, 2);
  const totalGramsFromMm = (totalFilamentMm * filamentAreaMm2 * densityGcm3) / 1000;
  const totalFilamentGrams =
    Number(rawStats.filament_g) > 0
      ? Number(Number(rawStats.filament_g).toFixed(1))
      : Number(Math.max(0.2, totalGramsFromMm).toFixed(1));

  let sumExtrudedLen = 0;
  let supportExtrudedLen = 0;
  for (let r = 1; r < segData.typeLengths.length; r++) {
    sumExtrudedLen += segData.typeLengths[r];
    if (r === 5 || r === 6) {
      supportExtrudedLen += segData.typeLengths[r];
    }
  }
  const supportShare = sumExtrudedLen > 0 ? supportExtrudedLen / sumExtrudedLen : 0;
  const supportGrams = Number((totalFilamentGrams * supportShare).toFixed(1));
  const modelGrams = Number(Math.max(0.1, totalFilamentGrams - supportGrams).toFixed(1));

  let supportExportGeometry: THREE.BufferGeometry | null = null;
  if (options?.buildSupportExportMesh && extracted.supportData.segments.length > 0) {
    const tempGroup = options.buildSupportExportMesh(extracted.supportData);
    supportExportGeometry = convertSupportGroupToExportGeometry(tempGroup);
    tempGroup.traverse((c) => {
      if (c instanceof THREE.Mesh) {
        c.geometry?.dispose();
        if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
        else c.material?.dispose();
      }
    });
  }

  const gcodeText = typeof run.res.gcode === 'string' ? run.res.gcode : '';
  latestExportSupportGeom = supportExportGeometry;
  latestRealGcode = gcodeText || null;

  const rawTimeEstimateSec = Number(
    rawStats.time_estimate || rawStats.time_s || rawStats.estimated_time_s || 0
  );
  const layerScaleFactor =
    run.mapped.effectiveLayerHeight > (profile.layerHeight || 0.2) * 1.05
      ? run.mapped.effectiveLayerHeight / (profile.layerHeight || 0.2)
      : 1;
  const totalTimeSec = Math.max(
    10,
    Math.round(
      rawTimeEstimateSec > 0
        ? rawTimeEstimateSec * layerScaleFactor
        : layers.length * 12 * layerScaleFactor
    )
  );

  const bundle: IOrcaWasmSliceBundle = {
    cacheKey,
    gcode: gcodeText,
    supportData: extracted.supportData,
    supportExportGeometry,
    segData,
    stats: {
      totalLayers: layers.length,
      totalTimeSec,
      totalFilamentGrams,
      modelGrams,
      supportGrams,
      filamentMm: Math.round(totalFilamentMm),
      supportSegmentsCount: extracted.supportSegCount,
      modelSegmentsCount: extracted.modelSegCount,
      usedWatertightRepair: run.prep.repaired,
      repairMethod: run.prep.repairMethod,
      simplifiedFromTris: run.prep.originalTris,
      slicedTris: run.prep.slicedTris,
      elapsedMs: Math.round(performance.now() - t0),
      kernelMode: loadedKernelMode,
      contourEngine: typeof rawStats.contour_engine === 'string' ? rawStats.contour_engine : undefined,
      reusedStages: run.reusedStages,
      effectiveLayerHeight: run.mapped.effectiveLayerHeight,
      treeStyle: profile.supportMode === 'tree' ? profile.treeStyle || 'organic' : 'grid',
    },
  };

  if (sliceBundleCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = sliceBundleCache.keys().next().value;
    if (oldestKey) {
      const evicted = sliceBundleCache.get(oldestKey);
      if (
        evicted?.supportExportGeometry &&
        evicted.supportExportGeometry !== latestExportSupportGeom
      ) {
        evicted.supportExportGeometry.dispose();
      }
      sliceBundleCache.delete(oldestKey);
    }
  }
  sliceBundleCache.set(cacheKey, bundle);

  options?.onProgress?.(100, 'Hoàn tất OrcaSlicer C++');
  return bundle;
}

const ROLE_NAME_MAP: Record<number, string> = {
  0: 'Travel (Di chuyển không đùn)',
  1: 'Wall (Tường bao chu vi)',
  2: 'Sparse Infill (Ruột chịu lực)',
  3: 'Solid Surface (Đỉnh / Đáy đặc)',
  4: 'Brim / Skirt (Vành bám bàn)',
  5: 'Tree Support (Cây đỡ Organic C++)',
  6: 'Support Interface / Raft (Đệm đỡ)',
  7: 'Gap Fill (Lấp khe hẹp)',
  8: 'Thin Wall (Tường mỏng)',
  9: 'Bridge (Bắc cầu không trung)',
  10: 'Ironing (Là phẳng mặt đỉnh)',
  11: 'Prime Tower (Tháp xả nhựa)',
};

/**
 * Dựng Three.js Group hiển thị sợi đùn 3D GPU-Instanced (Chuẩn Bambu Studio / OrcaSlicer) từ SegmentData
 */
export function buildOrcaGpuToolpathGroup(
  segData: SegmentData,
  profile: ISimulationProfile
): THREE.Group {
  const wrapper = new THREE.Group();
  wrapper.name = 'full_filament_preview_group';

  const tp: ToolpathHandle = makeToolpath(THREE, segData);

  // Xoay ngược từ hệ tọa độ Slicer Z-up (xs, ys, zs) về Three.js Y-up (xs, zs, -ys)
  const zUpPivot = new THREE.Group();
  zUpPivot.rotation.x = -Math.PI / 2;
  zUpPivot.add(tp.mesh);
  zUpPivot.add(tp.travLines);
  tp.setTravelVisible(false);
  wrapper.add(zUpPivot);

  const colorCtx: ColorContext = {
    speedByType: {
      1: profile.outerWallSpeed || Math.round((profile.printSpeed || 200) * 0.65),
      2: profile.infillSpeed || Math.round((profile.printSpeed || 200) * 1.15),
      3: profile.topSurfaceSpeed || Math.round((profile.printSpeed || 200) * 0.55),
      4: 50,
      5: Math.round((profile.printSpeed || 200) * 0.75),
      6: 60,
      7: Math.round((profile.printSpeed || 200) * 0.5),
      8: Math.round((profile.printSpeed || 200) * 0.55),
      9: 30,
      10: 30,
    },
    firstLayerSpeed: 50,
    fanNormal: profile.coolingFanSpeed ?? 100,
    closeFanLayers: 1,
    tempNormal: profile.nozzleTemp || 220,
    tempFirst: (profile.nozzleTemp || 220) + 5,
    toolColors: [profile.materialColor || '#f97316'],
  };

  let currentTopLayerIdx = Math.max(0, tp.layerCount - 1);
  let currentIntraProgress = 1.0;
  let showTravels = false;

  const applyColorScheme = (scheme: FilamentColorScheme) => {
    const viewKey =
      scheme === 'speed'
        ? 'speed'
        : scheme === 'flow'
        ? 'width'
        : scheme === 'layer_time'
        ? 'fan'
        : 'feature';
    const res = computeColors(segData, viewKey, colorCtx);
    tp.setColors(res.color);
  };

  applyColorScheme('line_type');

  const syncMoveScrub = () => {
    if (currentIntraProgress >= 0.998) {
      tp.setMoveRange(null);
    } else {
      const totalMoves = layerMoveCount(segData, currentTopLayerIdx);
      const targetMove = Math.max(1, Math.round(currentIntraProgress * totalMoves));
      tp.setMoveRange(targetMove);
    }
  };

  wrapper.userData = {
    isOrcaGpuToolpath: true,
    totalLayers: tp.layerCount,
    updateLayer: (currentLayer: number, _progress: number) => {
      if (tp.layerCount <= 0) return;
      currentTopLayerIdx = Math.max(0, Math.min(tp.layerCount - 1, currentLayer - 1));
      tp.setLayerRange(0, currentTopLayerIdx);
      syncMoveScrub();
    },
    setColorScheme: (scheme: FilamentColorScheme) => {
      applyColorScheme(scheme);
    },
    setIntraLayerProgress: (p01: number) => {
      currentIntraProgress = Math.max(0, Math.min(1, p01));
      syncMoveScrub();
    },
    setTravelVisible: (visible: boolean) => {
      showTravels = visible;
      tp.setTravelVisible(visible);
    },
    getTravelVisible: () => showTravels,
    updateVisibility: (opts?: { showTravels?: boolean }) => {
      if (typeof opts?.showTravels === 'boolean') {
        showTravels = opts.showTravels;
        tp.setTravelVisible(showTravels);
      }
    },
    getActiveMoveTelemetry: (
      currentLayer: number,
      p01: number
    ): IActiveMoveTelemetry | null => {
      if (tp.layerCount <= 0) return null;
      const lIdx = Math.max(0, Math.min(tp.layerCount - 1, currentLayer - 1));
      const totalMoves = layerMoveCount(segData, lIdx);
      if (totalMoves <= 0) return null;
      const at = Math.max(1, Math.min(totalMoves, Math.round(p01 * totalMoves)));
      const cur = moveCursor(segData, lIdx, at);
      if (!cur || !cur.point) return null;

      const [xs, ys, zs] = cur.point;
      const segIdx = Math.max(0, Math.min(segData.nSeg - 1, cur.segCount - 1));
      const vIdx = segData.segIndex[segIdx * 2] || 0;
      const roleId = cur.onTravel ? 0 : segData.meta.vType[vIdx] || 1;
      const widthMm = segData.meta.vWidth[vIdx] || profile.lineWidth || 0.42;
      const heightMm = segData.meta.vHeight[vIdx] || profile.layerHeight || 0.2;
      const speedMmS = cur.onTravel
        ? profile.travelSpeed || 500
        : colorCtx.speedByType?.[roleId] || profile.printSpeed || 180;
      const flowMm3S = cur.onTravel
        ? 0
        : Number((widthMm * heightMm * speedMmS * 0.92).toFixed(1));

      return {
        position: [xs, zs, -ys],
        featureId: roleId,
        featureLabel: ROLE_NAME_MAP[roleId] || 'Extrusion',
        speedMmS,
        flowMm3S,
        layerTimeSec: Number(Math.max(1.5, totalMoves * 0.035).toFixed(1)),
        moveIndex: at,
        totalLayerMoves: totalMoves,
      };
    },
    dispose: () => {
      tp.dispose();
    },
  };

  return wrapper;
}
