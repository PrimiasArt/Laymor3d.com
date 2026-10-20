'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Cpu,
  Layers,
  Sparkles,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sliders,
  Tag,
  Award,
} from 'lucide-react';
import { IKnowledgeEntry, KnowledgeCategory, ISlicerParameterOverride } from '@/backend/domain/knowledge';

export function AdminKnowledgeManager() {
  const [entries, setEntries] = useState<IKnowledgeEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Modal thêm tri thức mới
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<KnowledgeCategory>('slicer_tuning');
  const [newProblem, setNewProblem] = useState('');
  const [newRootCause, setNewRootCause] = useState('');
  const [newSolution, setNewSolution] = useState('');
  const [newFilaments, setNewFilaments] = useState('PLA, PETG');
  const [newPrinters, setNewPrinters] = useState('all');
  const [newOverridesJson, setNewOverridesJson] = useState('{\n  "seam_slope_type": "scarf",\n  "seam_slope_angle": 45\n}');
  const [isSaving, setIsSaving] = useState(false);

  const fetchKnowledge = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('query', searchQuery.trim());
      if (selectedCategory !== 'all') params.set('category', selectedCategory);

      const res = await fetch(`/api/knowledge?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.entries)) {
        setEntries(data.entries);
      }
    } catch (err) {
      console.error('Error fetching knowledge:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledge();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchKnowledge();
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa quy tắc tri thức "${title}"?`)) return;
    try {
      const res = await fetch(`/api/knowledge?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
      } else {
        alert(data.error || 'Không thể xóa');
      }
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSolution.trim()) {
      alert('Vui lòng nhập tiêu đề và giải pháp.');
      return;
    }

    let parsedOverrides: ISlicerParameterOverride | undefined = undefined;
    if (newOverridesJson.trim()) {
      try {
        parsedOverrides = JSON.parse(newOverridesJson.trim());
      } catch (err) {
        alert('Thông số OrcaSlicer Override JSON không hợp lệ! Vui lòng kiểm tra lại cú pháp.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload: Partial<IKnowledgeEntry> = {
        title: newTitle.trim(),
        category: newCategory,
        problemSymptom: newProblem.trim() || undefined,
        rootCause: newRootCause.trim() || undefined,
        solutionText: newSolution.trim(),
        applicableFilaments: newFilaments.split(',').map((s) => s.trim()).filter(Boolean),
        applicablePrinters: newPrinters.split(',').map((s) => s.trim()).filter(Boolean),
        slicerOverrides: parsedOverrides,
        confidenceScore: 95,
        sourcePlatform: 'expert_curated',
        verificationCount: 1,
      };

      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAddModalOpen(false);
        setNewTitle('');
        setNewProblem('');
        setNewRootCause('');
        setNewSolution('');
        fetchKnowledge();
      } else {
        alert(data.error || 'Lỗi lưu tri thức');
      }
    } catch (err: any) {
      alert(`Lỗi kết nối: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const categories: { id: string; label: string }[] = [
    { id: 'all', label: 'Tất Cả Tri Thức' },
    { id: 'vietnam_environment', label: '🇻🇳 Khí Hậu Việt Nam' },
    { id: 'slicer_tuning', label: '⚡ Tinh Chỉnh OrcaSlicer' },
    { id: 'troubleshooting', label: '🛠️ Khắc Phục Lỗi In' },
    { id: 'material_benchmark', label: '🧪 Định Mức Nhựa' },
    { id: 'printer_hardware', label: '⚙️ Phần Cứng Máy In' },
    { id: 'commercial_practice', label: '🏭 Vận Hành Xưởng In' },
  ];

  const totalVerifications = entries.reduce((sum, e) => sum + (e.verificationCount || 0), 0);
  const avgConfidence = entries.length > 0 ? Math.round(entries.reduce((sum, e) => sum + e.confidenceScore, 0) / entries.length) : 0;
  const vnCount = entries.filter((e) => e.category === 'vietnam_environment').length;

  return (
    <div className="space-y-6 text-slate-800">
      {/* Top Banner */}
      <div className="vision-glass-panel rounded-[32px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-200/80 bg-white/90 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700 shrink-0 shadow-sm">
            <BookOpen className="w-6 h-6 text-cyan-700" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Kho Tri Thức Đối Chiếu &amp; Chuẩn Hóa In 3D (Knowledge Base)</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300">
                Ground Truth
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Hệ thống lưu trữ, đối chiếu và tái sử dụng tri thức in 3D bóc tách từ MakerWorld, Reddit, Klipper, và cộng đồng thực tế Việt Nam
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 rounded-full bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Tri Thức Mới</span>
          </button>

          <button
            type="button"
            onClick={fetchKnowledge}
            disabled={isLoading}
            className="w-10 h-10 rounded-full bg-white hover:bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 transition-all shadow-sm active:scale-95"
            title="Làm mới kho tri thức"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="vision-glass rounded-[28px] p-5 space-y-1.5 border border-slate-200/80 bg-white/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Tổng Quy Tắc Đối Chiếu</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{entries.length} quy tắc</div>
          <div className="text-[11px] text-emerald-700 font-medium">Tự động áp dụng khi cắt lớp</div>
        </div>

        <div className="vision-glass rounded-[28px] p-5 space-y-1.5 border border-slate-200/80 bg-white/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Độ Tin Cậy Trung Bình</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">{avgConfidence}%</div>
          <div className="text-[11px] text-slate-400">Đã qua kiểm nghiệm thực tế</div>
        </div>

        <div className="vision-glass rounded-[28px] p-5 space-y-1.5 border border-slate-200/80 bg-white/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Lượt Kiểm Chứng (Makes)</span>
            <CheckCircle2 className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalVerifications.toLocaleString()} lượt</div>
          <div className="text-[11px] text-cyan-700 font-medium">Từ Reddit &amp; Bambu Forum</div>
        </div>

        <div className="vision-glass rounded-[28px] p-5 space-y-1.5 border border-slate-200/80 bg-white/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Mẹo Khí Hậu Việt Nam</span>
            <Flame className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-700">{vnCount} giải pháp</div>
          <div className="text-[11px] text-slate-400">Xử lý nồm ẩm &amp; bàn in PEI</div>
        </div>
      </div>

      {/* Filter Toolbar & Search */}
      <div className="vision-glass p-4 rounded-[28px] space-y-3.5 border border-slate-200/80 bg-white/90 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Tìm theo lỗi, giải pháp, dòng máy, loại nhựa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white shadow-sm"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          </form>

          <div className="text-xs text-slate-500">
            Hiển thị <strong className="text-slate-800">{entries.length}</strong> quy tắc tri thức chuẩn
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-slate-100">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                selectedCategory === c.id
                  ? 'bg-cyan-600 text-white border-cyan-600 font-bold shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="py-16 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-semibold">Đang truy vấn Kho Tri Thức Đối Chiếu...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && entries.length === 0 && (
        <div className="vision-glass rounded-[32px] p-12 text-center space-y-3 border border-slate-200/80 bg-white/90 shadow-sm">
          <p className="font-bold text-sm text-slate-900">Không tìm thấy quy tắc tri thức nào phù hợp.</p>
          <p className="text-xs text-slate-500">Hãy thử xóa bộ lọc tìm kiếm hoặc thêm quy tắc tri thức mới.</p>
        </div>
      )}

      {/* Knowledge Cards Grid */}
      {!isLoading && entries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entries.map((entry) => {
            const isExpanded = expandedCardId === entry.id;

            return (
              <div
                key={entry.id}
                className="vision-glass rounded-[28px] p-5 sm:p-6 border border-slate-200/80 bg-white/90 space-y-3.5 hover:border-cyan-300 transition-all flex flex-col justify-between shadow-sm"
              >
                <div className="space-y-2.5">
                  {/* Card Header Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                      {entry.category.replace('_', ' ')}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{entry.confidenceScore}% Tin cậy</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id, entry.title)}
                        className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                        title="Xóa quy tắc tri thức này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-snug">
                    {entry.title}
                  </h3>

                  {/* Applicable Tags */}
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    <span className="px-2 py-0.5 rounded-lg bg-cyan-50 text-cyan-800 border border-cyan-200 font-mono">
                      Nhựa: {entry.applicableFilaments.join(', ')}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                      Máy: {entry.applicablePrinters.join(', ')}
                    </span>
                  </div>

                  {/* Problem & Symptom */}
                  {entry.problemSymptom && (
                    <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-xs text-rose-900 space-y-0.5">
                      <span className="font-bold text-[11px] block text-rose-700">⚠️ Hiện tượng lỗi:</span>
                      <p className="text-[11px] leading-relaxed opacity-90">{entry.problemSymptom}</p>
                    </div>
                  )}

                  {/* Solution */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <span className="font-bold text-[11px] block text-emerald-700">💡 Giải pháp chuẩn:</span>
                    <p className="text-[11px] text-slate-700 leading-relaxed">{entry.solutionText}</p>
                  </div>

                  {/* Slicer Overrides Collapsible */}
                  {entry.slicerOverrides && Object.keys(entry.slicerOverrides).length > 0 && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setExpandedCardId(isExpanded ? null : entry.id)}
                        className="text-[11px] font-bold text-cyan-700 hover:underline flex items-center gap-1"
                      >
                        <Sliders className="w-3 h-3 text-cyan-600" />
                        <span>{isExpanded ? 'Ẩn thông số OrcaSlicer Override' : 'Xem thông số OrcaSlicer Override'}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {isExpanded && (
                        <pre className="mt-2 p-3 rounded-xl bg-slate-900 border border-slate-700 text-[10px] font-mono text-emerald-400 overflow-x-auto">
                          {JSON.stringify(entry.slicerOverrides, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Metadata */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Nguồn: <strong className="text-slate-700">{entry.sourcePlatform}</strong></span>
                  <span>Đã kiểm chứng: <strong className="text-emerald-700 font-bold">{entry.verificationCount}</strong> ca</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Thêm Tri Thức Mới */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[36px] w-full max-w-xl max-h-[90vh] overflow-y-auto border border-slate-200 p-6 sm:p-8 space-y-5 text-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700">
                  <Plus className="w-5 h-5 text-cyan-700" />
                </div>
                <h3 className="text-base font-black text-slate-900">Thêm Quy Tắc Tri Thức Đối Chiếu Mới</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEntry} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">Tiêu đề quy tắc tri thức *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Giảm tốc độ lớp đầu và nâng nhiệt bàn in khi in PETG trong phòng máy lạnh..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 focus:bg-white shadow-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-800 block">Danh mục</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-semibold focus:outline-none focus:border-cyan-500 focus:bg-white shadow-sm cursor-pointer"
                  >
                    <option value="vietnam_environment">🇻🇳 Khí hậu Việt Nam</option>
                    <option value="slicer_tuning">⚡ Tinh chỉnh OrcaSlicer</option>
                    <option value="troubleshooting">🛠️ Khắc phục lỗi in</option>
                    <option value="material_benchmark">🧪 Định mức nhựa</option>
                    <option value="printer_hardware">⚙️ Phần cứng máy in</option>
                    <option value="commercial_practice">🏭 Vận hành xưởng in</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-800 block">Loại nhựa áp dụng (phân cách bằng dấu phẩy)</label>
                  <input
                    type="text"
                    placeholder="PLA, PETG, TPU, ABS hoặc all"
                    value={newFilaments}
                    onChange={(e) => setNewFilaments(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 focus:bg-white shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">Dấu hiệu nhận biết lỗi / Vấn đề</label>
                <textarea
                  rows={2}
                  placeholder="Mô tả hiện tượng lỗi bề mặt, bavia, cong mép bàn..."
                  value={newProblem}
                  onChange={(e) => setNewProblem(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 focus:bg-white shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">Giải pháp chuẩn &amp; Hướng dẫn thực thi *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Hướng dẫn cụ thể các bước xử lý và tinh chỉnh..."
                  value={newSolution}
                  onChange={(e) => setNewSolution(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 focus:bg-white shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">Thông số OrcaSlicer Override (Định dạng JSON)</label>
                <textarea
                  rows={4}
                  value={newOverridesJson}
                  onChange={(e) => setNewOverridesJson(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-emerald-400 font-mono focus:outline-none focus:border-cyan-500 shadow-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 rounded-full bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? 'Đang Lưu...' : 'Lưu Vào Kho Tri Thức'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
