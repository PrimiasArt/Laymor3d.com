'use client';

import { useState, useCallback } from 'react';

export type ViewMode = 'material' | 'toolpath';
export type OrientationDeg = number;

export interface ViewerOptions {
  wireframe: boolean;
  autoRotate: boolean;
  lightingIntensity: number;
  materialColor: string;
  showGrid: boolean;
  showDimensions: boolean; // Bật/Tắt hiển thị thước đo kích thước 3D (X, Y, Z mm)
  roughness: number;
  metalness: number;
  viewMode: ViewMode; // 'material': màu vật liệu chuẩn, 'toolpath': màu đường in slicer (Outer, Inner, Infill, Support)
  orientationDeg: OrientationDeg; // 0°: Nằm phẳng, 45°: Nghiêng tối ưu, 90°: Đứng thẳng, hoặc góc tùy chỉnh
}

export function useModelViewer(initialColor: string = '#6366f1') {
  const [options, setOptions] = useState<ViewerOptions>({
    wireframe: false,
    autoRotate: true,
    lightingIntensity: 1.2,
    materialColor: initialColor,
    showGrid: true,
    showDimensions: true,
    roughness: 0.4,
    metalness: 0.1,
    viewMode: 'material',
    orientationDeg: 0,
  });

  const [screenshotTrigger, setScreenshotTrigger] = useState(0);

  const toggleWireframe = useCallback(() => {
    setOptions(prev => ({ ...prev, wireframe: !prev.wireframe }));
  }, []);

  const toggleAutoRotate = useCallback(() => {
    setOptions(prev => ({ ...prev, autoRotate: !prev.autoRotate }));
  }, []);

  const toggleGrid = useCallback(() => {
    setOptions(prev => ({ ...prev, showGrid: !prev.showGrid }));
  }, []);

  const toggleDimensions = useCallback(() => {
    setOptions(prev => ({ ...prev, showDimensions: !prev.showDimensions }));
  }, []);

  const toggleViewMode = useCallback(() => {
    setOptions(prev => ({
      ...prev,
      viewMode: prev.viewMode === 'material' ? 'toolpath' : 'material',
    }));
  }, []);

  const setOrientationDeg = useCallback((deg: OrientationDeg) => {
    setOptions(prev => ({ ...prev, orientationDeg: deg }));
  }, []);

  const rotateStep = useCallback(() => {
    setOptions(prev => ({
      ...prev,
      orientationDeg: (prev.orientationDeg + 90) % 360,
    }));
  }, []);

  const setMaterialColor = useCallback((color: string) => {
    setOptions(prev => ({ ...prev, materialColor: color }));
  }, []);

  const setLightingIntensity = useCallback((val: number) => {
    setOptions(prev => ({ ...prev, lightingIntensity: val }));
  }, []);

  const triggerScreenshot = useCallback(() => {
    setScreenshotTrigger(prev => prev + 1);
  }, []);

  return {
    options,
    screenshotTrigger,
    toggleWireframe,
    toggleAutoRotate,
    toggleGrid,
    toggleDimensions,
    toggleViewMode,
    setOrientationDeg,
    rotateStep,
    setMaterialColor,
    setLightingIntensity,
    triggerScreenshot,
  };
}
