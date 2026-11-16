import crypto from 'node:crypto';
import {
  IKnowledgeEntry,
  ISimulatorDefectTriggerCondition,
  ISlicerParameterOverride,
  KnowledgeCategory,
  KnowledgeModerationStatus,
} from '@/backend/domain/knowledge';

const ALLOWED_CATEGORIES: ReadonlySet<KnowledgeCategory> = new Set([
  'simulator_defect_learning',
  'troubleshooting',
  'material_benchmark',
  'slicer_tuning',
  'printer_hardware',
  'vietnam_environment',
  'commercial_practice',
]);

const ALLOWED_SEVERITIES = new Set(['low', 'medium', 'high', 'critical'] as const);
const ALLOWED_OPERATORS = new Set(['>', '<', '>=', '<=', '==', '!='] as const);

const NUMERIC_AUTO_FIX_BOUNDS: Record<string, { min: number; max: number; round?: number }> = {
  printSpeed: { min: 10, max: 600, round: 0 },
  layerHeight: { min: 0.04, max: 0.36, round: 3 },
  nozzleTemp: { min: 150, max: 340, round: 0 },
  bedTemp: { min: 0, max: 125, round: 0 },
  coolingFanSpeed: { min: 0, max: 100, round: 0 },
  infillDensity: { min: 0, max: 100, round: 0 },
  wallLoops: { min: 1, max: 16, round: 0 },
  flowRatio: { min: 0.75, max: 1.25, round: 3 },
  retractionDistanceMm: { min: 0, max: 12, round: 2 },
  retractionSpeedMmS: { min: 5, max: 120, round: 0 },
  pressureAdvance: { min: 0, max: 0.25, round: 4 },
  zHopMm: { min: 0, max: 2.0, round: 2 },
  supportTopZDistance: { min: 0.05, max: 0.45, round: 3 },
  supportAngle: { min: 15, max: 75, round: 0 },
  brimWidth: { min: 0, max: 25, round: 1 },
  initialLayerSpeed: { min: 10, max: 120, round: 0 },
  outerWallSpeed: { min: 15, max: 450, round: 0 },
  bridgeSpeed: { min: 10, max: 150, round: 0 },
  overhangSpeed: { min: 10, max: 200, round: 0 },
};

const ENUM_AUTO_FIX_VALUES: Record<string, ReadonlySet<string>> = {
  supportType: new Set(['none', 'normal', 'tree']),
  treeStyle: new Set(['organic', 'slim', 'strong', 'hybrid']),
  adhesionType: new Set(['none', 'skirt', 'brim', 'raft']),
  infillPattern: new Set(['grid', 'gyroid', 'honeycomb', 'triangles', 'rectilinear']),
  seamPosition: new Set(['aligned', 'back', 'random', 'nearest']),
};

export function sanitizeText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLen);
}

function sanitizeStringArray(value: unknown, fallback: string[], maxItems = 12, itemMaxLen = 48): string[] {
  const rawList = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];
  const cleaned = Array.from(
    new Set(
      rawList
        .map((v) => sanitizeText(String(v ?? ''), itemMaxLen))
        .filter(Boolean)
    )
  ).slice(0, maxItems);
  return cleaned.length > 0 ? cleaned : fallback;
}

/**
 * Clamps and filters AI auto-fix parameter patches against safe FDM physical limits.
 */
export function sanitizeAutoFixPatch(rawPatch: unknown): Record<string, any> | undefined {
  if (!rawPatch || typeof rawPatch !== 'object' || Array.isArray(rawPatch)) {
    return undefined;
  }

  const sanitized: Record<string, any> = {};
  for (const [key, rawVal] of Object.entries(rawPatch as Record<string, unknown>)) {
    if (key in NUMERIC_AUTO_FIX_BOUNDS) {
      const num = Number(rawVal);
      if (!Number.isFinite(num)) continue;
      const { min, max, round } = NUMERIC_AUTO_FIX_BOUNDS[key];
      const clamped = Math.min(max, Math.max(min, num));
      sanitized[key] =
        typeof round === 'number'
          ? Number(clamped.toFixed(round))
          : clamped;
      continue;
    }

    if (key === 'supportEnabled' && typeof rawVal === 'boolean') {
      sanitized.supportEnabled = rawVal;
      continue;
    }

    if (key in ENUM_AUTO_FIX_VALUES && typeof rawVal === 'string') {
      const normalized = rawVal.trim().toLowerCase();
      if (ENUM_AUTO_FIX_VALUES[key].has(normalized)) {
        sanitized[key] = normalized;
      }
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

export function sanitizeSlicerOverrides(raw: unknown): ISlicerParameterOverride | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const cleaned: ISlicerParameterOverride = {};
  const entries = Object.entries(raw as Record<string, unknown>).slice(0, 24);
  for (const [key, val] of entries) {
    if (!/^[a-zA-Z0-9_]{1,48}$/.test(key)) continue;
    if (typeof val === 'number' && Number.isFinite(val)) {
      cleaned[key] = Math.min(10000, Math.max(-1000, val));
    } else if (typeof val === 'boolean') {
      cleaned[key] = val;
    } else if (typeof val === 'string') {
      const s = sanitizeText(val, 64);
      if (s) cleaned[key] = s;
    }
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

export function sanitizeTriggerCondition(raw: unknown): ISimulatorDefectTriggerCondition | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  const paramKey = sanitizeText(obj.paramKey, 64);
  if (!paramKey || !/^[a-zA-Z0-9_]+$/.test(paramKey)) return undefined;

  const opRaw = typeof obj.operator === 'string' ? obj.operator.trim() : '>';
  const operator = ALLOWED_OPERATORS.has(opRaw as any) ? (opRaw as ISimulatorDefectTriggerCondition['operator']) : '>';

  let thresholdValue: number | string | boolean | undefined;
  if (typeof obj.thresholdValue === 'number' && Number.isFinite(obj.thresholdValue)) {
    thresholdValue = Math.min(10000, Math.max(-1000, obj.thresholdValue));
  } else if (typeof obj.thresholdValue === 'boolean') {
    thresholdValue = obj.thresholdValue;
  } else if (typeof obj.thresholdValue === 'string') {
    const trimmed = obj.thresholdValue.trim();
    const asNum = Number(trimmed);
    if (trimmed !== '' && Number.isFinite(asNum)) {
      thresholdValue = Math.min(10000, Math.max(-1000, asNum));
    } else {
      thresholdValue = sanitizeText(trimmed, 64);
    }
  }

  if (thresholdValue === undefined || thresholdValue === '') return undefined;

  const description = sanitizeText(obj.description, 240);
  return {
    paramKey,
    operator,
    thresholdValue,
    description: description || `${paramKey} ${operator} ${thresholdValue}`,
  };
}

export function computeKnowledgeContentHash(parts: {
  title: string;
  defectType?: string;
  triggerCondition?: ISimulatorDefectTriggerCondition;
  problemSymptom?: string;
}): string {
  const norm = (s?: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const payload = [
    norm(parts.title),
    norm(parts.defectType),
    parts.triggerCondition
      ? `${parts.triggerCondition.paramKey}|${parts.triggerCondition.operator}|${String(parts.triggerCondition.thresholdValue)}`
      : '',
    norm(parts.problemSymptom).slice(0, 120),
  ].join('::');
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 24);
}

export interface SanitizedKnowledgeCreatePayload {
  title: string;
  category: KnowledgeCategory;
  defectType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  problemSymptom: string;
  rootCause: string;
  solutionText: string;
  slicerOverrides?: ISlicerParameterOverride;
  triggerCondition?: ISimulatorDefectTriggerCondition;
  autoFixPatch?: Record<string, any>;
  applicablePrinters: string[];
  applicableFilaments: string[];
  applicableCategories: string[];
  tags: string[];
  sourceReference?: string;
  contentHash: string;
}

export function sanitizeKnowledgeCreatePayload(
  rawBody: Record<string, any>
): { ok: true; data: SanitizedKnowledgeCreatePayload } | { ok: false; error: string } {
  const title = sanitizeText(rawBody.title, 180);
  const solutionText = sanitizeText(rawBody.effectiveSolution ?? rawBody.solutionText, 4000);
  if (title.length < 4) {
    return { ok: false, error: 'Tiêu đề bài học lỗi phải có ít nhất 4 ký tự.' };
  }
  if (solutionText.length < 8) {
    return { ok: false, error: 'Giải pháp khắc phục phải có ít nhất 8 ký tự.' };
  }

  const rawCategory = sanitizeText(rawBody.category, 48) as KnowledgeCategory;
  const category: KnowledgeCategory = ALLOWED_CATEGORIES.has(rawCategory)
    ? rawCategory
    : 'simulator_defect_learning';

  const rawSeverity = sanitizeText(rawBody.severity, 16) as any;
  const severity: 'low' | 'medium' | 'high' | 'critical' = ALLOWED_SEVERITIES.has(rawSeverity)
    ? rawSeverity
    : 'medium';

  const defectType = sanitizeText(rawBody.defectType, 64) || 'custom_defect';
  const problemSymptom = sanitizeText(rawBody.problemSymptom ?? rawBody.symptom, 1500);
  const rootCause = sanitizeText(rawBody.rootCause, 2500);
  const triggerCondition = sanitizeTriggerCondition(rawBody.triggerCondition);
  const autoFixPatch = sanitizeAutoFixPatch(rawBody.autoFixPatch);
  const slicerOverrides = sanitizeSlicerOverrides(rawBody.slicerOverrides);

  const applicablePrinters = sanitizeStringArray(rawBody.applicablePrinters, ['all']);
  const applicableFilaments = sanitizeStringArray(rawBody.applicableFilaments, ['PLA']);
  const applicableCategories = sanitizeStringArray(rawBody.applicableCategories, ['all']);
  const tags = sanitizeStringArray(rawBody.tags, [defectType, ...applicableFilaments], 12, 32);
  const sourceReference = sanitizeText(rawBody.sourceReference, 240) || undefined;

  const contentHash = computeKnowledgeContentHash({
    title,
    defectType,
    triggerCondition,
    problemSymptom,
  });

  return {
    ok: true,
    data: {
      title,
      category,
      defectType,
      severity,
      problemSymptom,
      rootCause,
      solutionText,
      slicerOverrides,
      triggerCondition,
      autoFixPatch,
      applicablePrinters,
      applicableFilaments,
      applicableCategories,
      tags,
      sourceReference,
      contentHash,
    },
  };
}

export function normalizeModerationStatus(entry: Partial<IKnowledgeEntry>): KnowledgeModerationStatus {
  if (
    entry.moderationStatus === 'pending' ||
    entry.moderationStatus === 'approved' ||
    entry.moderationStatus === 'rejected' ||
    entry.moderationStatus === 'archived'
  ) {
    return entry.moderationStatus;
  }
  return entry.isVerified ? 'approved' : 'pending';
}
