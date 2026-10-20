import { ISlicerProfilePreset } from './slicing';

export type PlatformType =
  | 'makerworld'
  | 'printables'
  | 'thingiverse'
  | 'github'
  | 'thangs'
  | 'cults3d'
  | 'reddit'
  | 'community-forum'
  | 'youtube'
  | 'manual'
  | 'custom-url'
  | 'ai-generated';

export type AIProviderType = 'fal-trellis' | 'meshy' | 'tripo' | 'simulation';

export interface IModel3D {
  id: string;
  title: string;
  author: string;
  authorAvatar?: string;
  platform: PlatformType;
  sourceUrl: string;
  thumbnailUrl: string;
  glbUrl?: string;
  stlUrl?: string;
  downloads: number;
  prints: number;
  likes: number;
  tags: string[];
  category: string;
  filamentType?: string; // PLA, PETG, TPU, ABS
  filamentWeightGrams?: number;
  printTimeMinutes?: number;
  slicerProfile?: ISlicerProfilePreset;
  createdAt: string;
  updatedAt: string;
}

export interface ITrendHistoryPoint {
  date: string;
  downloads: number;
  prints: number;
}

export interface ITrendMetric {
  modelId: string;
  title: string;
  author: string;
  platform: PlatformType;
  sourceUrl?: string;
  thumbnailUrl: string;
  category: string;
  currentDownloads: number;
  currentPrints: number;
  growth24h: number; // Tỷ lệ tăng trưởng %
  downloads24h: number; // Lượt tải tăng trong kỳ
  momentumScore: number; // Điểm số xu hướng (0-100)
  printConversionRate?: number; // Tỷ lệ in thực tế (prints / downloads * 100)
  filamentType?: string;
  filamentWeightGrams?: number;
  printTimeMinutes?: number;
  rank: number;
  history: ITrendHistoryPoint[];
  tags: string[];
}

export interface IAI3DJob {
  id: string;
  engine: AIProviderType;
  status: 'idle' | 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  prompt?: string;
  inputImageUrl: string;
  resultGlbUrl?: string;
  resultStlUrl?: string;
  modelType: 'organic' | 'mechanical' | 'decor';
  estimatedPrintTime?: number; // minutes
  createdAt: string;
  error?: string;
}

export interface ICrawlTaskResult {
  jobId: string;
  platform: PlatformType;
  status: 'success' | 'running' | 'failed';
  totalCrawled: number;
  newModelsFound: number;
  logs: string[];
  timestamp: string;
}
