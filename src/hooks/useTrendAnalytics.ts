'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ITrendMetric, PlatformType } from '@/backend/domain/models';
import {
  ITagFrequency,
  ICategoryDistribution,
  IFilamentDistribution,
  IPlatformDistribution,
} from '@/backend/services/analytics/TagAnalytics';

export interface ITrendSummary {
  totalTrackedModels: number;
  totalDownloads: number;
  totalPrints: number;
  avgConversionRate: number;
  surgeVolume: number;
}

export function useTrendAnalytics() {
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('24h');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | 'all'>('all');
  const [trends, setTrends] = useState<ITrendMetric[]>([]);
  const [hotTags, setHotTags] = useState<ITagFrequency[]>([]);
  const [categories, setCategories] = useState<ICategoryDistribution[]>([]);
  const [filamentStats, setFilamentStats] = useState<IFilamentDistribution[]>([]);
  const [platformStats, setPlatformStats] = useState<IPlatformDistribution[]>([]);
  const [summary, setSummary] = useState<ITrendSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const fetchTrends = useCallback(
    async (tf = timeframe, pf = selectedPlatform) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/trends?timeframe=${tf}&platform=${pf}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load trend analytics');
        setTrends(data.trends || []);
        setHotTags(data.hotTags || []);
        setCategories(data.categories || []);
        setFilamentStats(data.filamentStats || []);
        setPlatformStats(data.platformStats || []);
        setSummary(data.summary || null);
      } catch (err: any) {
        setError(err.message || 'Lỗi khi tải dữ liệu phân tích');
      } finally {
        setIsLoading(false);
      }
    },
    [timeframe, selectedPlatform]
  );

  useEffect(() => {
    fetchTrends(timeframe, selectedPlatform);
  }, [fetchTrends, timeframe, selectedPlatform]);

  // Tự động đồng bộ ngay lập tức khi Crawler vừa hoàn thành một mẻ cào mới
  useEffect(() => {
    const handleModelsUpdate = () => {
      fetchTrends(timeframe, selectedPlatform);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('3dhub-crawled-models-updated', handleModelsUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('3dhub-crawled-models-updated', handleModelsUpdate);
      }
    };
  }, [fetchTrends, timeframe, selectedPlatform]);

  // Bộ lọc dữ liệu theo từ khóa tìm kiếm và danh mục
  const filteredTrends = useMemo(() => {
    return trends.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        item.title.toLowerCase().includes(q) ||
        item.author.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q));

      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [trends, searchQuery, selectedCategory]);

  const topMovers = useMemo(() => {
    return [...trends].sort((a, b) => b.growth24h - a.growth24h).slice(0, 5);
  }, [trends]);

  return {
    timeframe,
    setTimeframe,
    selectedPlatform,
    setSelectedPlatform,
    trends: filteredTrends,
    rawTrends: trends,
    topMovers,
    hotTags,
    categories,
    filamentStats,
    platformStats,
    summary,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    refetch: () => fetchTrends(timeframe, selectedPlatform),
  };
}
