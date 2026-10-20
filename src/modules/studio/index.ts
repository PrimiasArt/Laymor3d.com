/**
 * Module: 3D Studio & Slicer Engine
 * Layer 1 (UI): ThreeCanvasViewer, ViewerToolbar, SlicingProfileModal, DimensionControls, StudioPage
 * Layer 2 (Hooks): use3DGenerator, useModelViewer, usePrintSlicer
 * Layer 3 (Backend): Slicing services, Three.js loaders & geometry builders, AI generation adapters
 */

export * from './ui/StudioPage';
export * from './ui/ThreeCanvasViewer';
export * from './ui/ViewerToolbar';
export * from './ui/SlicingProfileModal';
export * from './ui/DimensionsControl';
export * from './ui/PrintCostCalculator';
export * from './ui/PrintSimulationSlider';
export * from './ui/SupportConfigPanel';
export * from './ui/PrinterSelector';
export * from './ui/EngineSelector';
export * from './ui/AIPrintTierSelector';
export * from './ui/GenerationProgress';
export * from './ui/ImageUploadZone';
export * from './ui/SampleModelSelector';
export * from './ui/ExpertProfileCard';

export * from './hooks/use3DGenerator';
export * from './hooks/useModelViewer';
export * from './hooks/usePrintSlicer';
