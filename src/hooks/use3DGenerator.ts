'use client';

import { useState, useCallback } from 'react';
import { IAI3DJob, AIProviderType } from '@/backend/domain/models';

export interface Use3DGeneratorState {
  isGenerating: boolean;
  progress: number;
  currentStep: string;
  activeJob: IAI3DJob | null;
  error: string | null;
  selectedEngine: AIProviderType;
  modelType: 'organic' | 'mechanical' | 'decor';
  jobHistory: IAI3DJob[];
}

export function use3DGenerator() {
  const [state, setState] = useState<Use3DGeneratorState>({
    isGenerating: false,
    progress: 0,
    currentStep: 'Sẵn sàng',
    activeJob: null,
    error: null,
    selectedEngine: 'simulation',
    modelType: 'organic',
    jobHistory: [],
  });

  const setEngine = useCallback((engine: AIProviderType) => {
    setState(prev => ({ ...prev, selectedEngine: engine }));
  }, []);

  const setModelType = useCallback((type: 'organic' | 'mechanical' | 'decor') => {
    setState(prev => ({ ...prev, modelType: type }));
  }, []);

  const generate3D = useCallback(async (
    imageInput: string,
    promptText?: string,
    customEngine?: AIProviderType
  ) => {
    const engineToUse = customEngine || state.selectedEngine;
    
    setState(prev => ({
      ...prev,
      isGenerating: true,
      progress: 10,
      currentStep: '1/4: Đang phân tích ảnh 2D & tách nền...',
      error: null,
    }));

    try {
      // Giả lập tiến trình các bước để người dùng thấy rõ quy trình AI
      const stepTimer1 = setTimeout(() => {
        setState(prev => ({ ...prev, progress: 35, currentStep: '2/4: Ước lượng chiều sâu & cấu trúc hình học...' }));
      }, 700);

      const stepTimer2 = setTimeout(() => {
        setState(prev => ({ ...prev, progress: 65, currentStep: '3/4: Dựng lưới 3D đa giác (Mesh Synthesis)...' }));
      }, 1500);

      const stepTimer3 = setTimeout(() => {
        setState(prev => ({ ...prev, progress: 85, currentStep: '4/4: Bake vật liệu PBR & tối ưu hóa in 3D...' }));
      }, 2300);

      const res = await fetch('/api/generate-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: imageInput.startsWith('data:') ? undefined : imageInput,
          imageBase64: imageInput.startsWith('data:') ? imageInput : undefined,
          engine: engineToUse,
          prompt: promptText,
          modelType: state.modelType,
        }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Tạo mô hình 3D thất bại');
      }

      setState(prev => ({
        ...prev,
        isGenerating: false,
        progress: 100,
        currentStep: 'Hoàn thành!',
        activeJob: data.job,
        jobHistory: [data.job, ...prev.jobHistory],
      }));

      return data.job as IAI3DJob;
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        isGenerating: false,
        progress: 0,
        currentStep: 'Có lỗi xảy ra',
        error: err.message || 'Lỗi không xác định',
      }));
      return null;
    }
  }, [state.selectedEngine, state.modelType]);

  const reset = useCallback(() => {
    setState(prev => ({
      ...prev,
      isGenerating: false,
      progress: 0,
      currentStep: 'Sẵn sàng',
      error: null,
    }));
  }, []);

  return {
    ...state,
    setEngine,
    setModelType,
    generate3D,
    reset,
  };
}
