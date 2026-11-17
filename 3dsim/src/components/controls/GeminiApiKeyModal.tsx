import React, { useState, useEffect } from 'react';
import {
  Key,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  X,
  Eye,
  EyeOff,
  ClipboardPaste,
  ShieldCheck,
  Cpu,
  RefreshCw,
  Trash2,
  ChevronDown,
} from '@/components/icons/MinimalIcons';
import {
  fetchAdminServerGeminiConfig,
  saveAdminServerGeminiConfig,
  testGeminiApiKey,
  getSavedGeminiModel,
  saveGeminiModel,
  GEMINI_AVAILABLE_MODELS,
} from '@/services/geminiSupportService';

interface GeminiApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyUpdated?: (hasKey: boolean) => void;
  isAdmin?: boolean;
}

export function GeminiApiKeyModal({
  isOpen,
  onClose,
  onKeyUpdated,
  isAdmin = false,
}: GeminiApiKeyModalProps) {
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [savedKey, setSavedKey] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>(getSavedGeminiModel());
  const [storageLabel, setStorageLabel] = useState<string>('Neon PostgreSQL');
  const [isLoadingServer, setIsLoadingServer] = useState(false);
  const [isSavingServer, setIsSavingServer] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
    latencyMs?: number;
  } | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && isAdmin) {
      setTestResult(null);
      setSaveSuccessNotice(null);
      setIsLoadingServer(true);
      fetchAdminServerGeminiConfig()
        .then((res) => {
          if (res.ok) {
            const k = res.geminiApiKey || '';
            setSavedKey(k);
            setKeyInput(k);
            if (res.preferredGeminiModel) setSelectedModel(res.preferredGeminiModel);
            if (res.storageLabel) setStorageLabel(res.storageLabel);
          } else if (res.error) {
            setTestResult({ success: false, message: res.error });
          }
        })
        .finally(() => setIsLoadingServer(false));
    }
  }, [isOpen, isAdmin]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setKeyInput(text.trim());
        setTestResult(null);
      }
    } catch {
      // Fallback if clipboard API blocked
    }
  };

  const handleTestConnection = async () => {
    const keyToTest = keyInput.trim();
    if (!keyToTest) {
      setTestResult({
        success: false,
        message: 'Vui lòng nhập hoặc dán API Key trước khi kiểm tra.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    const res = await testGeminiApiKey(keyToTest, selectedModel);
    setIsTesting(false);

    if (res.success) {
      setTestResult({
        success: true,
        message: `Kết nối thành công! Mô hình ${res.modelName || selectedModel} sẵn sàng hoạt động.`,
        latencyMs: res.latencyMs,
      });
    } else {
      setTestResult({
        success: false,
        message:
          res.error ||
          'Kiểm tra kết nối thất bại. Vui lòng kiểm tra lại tính hợp lệ của API Key.',
        latencyMs: res.latencyMs,
      });
    }
  };

  const handleSave = async () => {
    const clean = keyInput.trim();
    if (!clean || !isAdmin) return;
    setIsSavingServer(true);
    setTestResult(null);
    const res = await saveAdminServerGeminiConfig(clean, selectedModel);
    setIsSavingServer(false);
    if (res.ok) {
      saveGeminiModel(selectedModel);
      setSavedKey(clean);
      if (res.storageLabel) setStorageLabel(res.storageLabel);
      setSaveSuccessNotice(
        res.message ||
          `Đã lưu API Key lên Server (${res.storageLabel || storageLabel}) để toàn hệ thống cùng sử dụng!`
      );
      onKeyUpdated?.(true);
      setTimeout(() => setSaveSuccessNotice(null), 3500);
    } else {
      setTestResult({
        success: false,
        message: res.error || 'Không thể lưu API Key lên Server.',
      });
    }
  };

  const handleClear = async () => {
    if (!isAdmin) return;
    setIsSavingServer(true);
    const res = await saveAdminServerGeminiConfig('', selectedModel);
    setIsSavingServer(false);
    if (res.ok) {
      setKeyInput('');
      setSavedKey('');
      setTestResult(null);
      onKeyUpdated?.(false);
    } else {
      setTestResult({
        success: false,
        message: res.error || 'Không thể xóa API Key trên Server.',
      });
    }
  };

  const hasConfiguredKey = savedKey.length > 0;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-theme="dark"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-3xl glass-panel border border-white/20 shadow-2xl bg-slate-950/90 text-white overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-teal-500/15 via-emerald-500/10 to-indigo-500/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-400 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/30 text-black">
              <Key className="w-5 h-5 font-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-white">
                  Cấu Hình Google Gemini AI (Server)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-400/20 text-teal-300 border border-teal-400/30">
                  Admin Only
                </span>
              </div>
              <p className="text-xs text-white/60">
                Lưu thẳng lên Server ({storageLabel}) để toàn bộ người dùng sử dụng an toàn
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isAdmin ? (
          <div className="p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-300 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">
                Quyền Cài Đặt API Dành Riêng Cho Master Admin
              </h3>
              <p className="text-xs text-white/65 leading-relaxed">
                Khóa API của hệ thống được Quản trị viên cài đặt bảo mật trên Server. Bạn có thể sử dụng trực tiếp Tư Vấn AI, Chat Copilot và Chẩn Đoán Ảnh Lỗi mà không cần nhập Key.
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-teal-400 text-black text-xs font-bold cursor-pointer"
            >
              Đóng
            </button>
          </div>
        ) : (
          <>
            {/* Content Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Status Banner */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                  hasConfiguredKey
                    ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200'
                    : 'bg-amber-500/15 border-amber-400/30 text-amber-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      hasConfiguredKey
                        ? 'bg-emerald-400 animate-pulse ring-4 ring-emerald-400/20'
                        : 'bg-amber-400 ring-4 ring-amber-400/20'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold">
                      {isLoadingServer
                        ? 'Đang tải cấu hình từ Server...'
                        : hasConfiguredKey
                          ? `Đã lưu trên ${storageLabel}: ${GEMINI_AVAILABLE_MODELS.find((m) => m.id === selectedModel)?.name || selectedModel}`
                          : 'Chưa cấu hình API Key trên Server'}
                    </div>
                    <div className="text-[11px] opacity-75">
                      {hasConfiguredKey
                        ? 'Mọi người dùng & AI Trainer đều dùng được thông qua Server Proxy'
                        : 'Admin nhập Key để kích hoạt AI cho toàn bộ hệ thống'}
                    </div>
                  </div>
                </div>

                {hasConfiguredKey && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
                    Server Ready
                  </span>
                )}
              </div>

              {/* Model Selection Dropdown */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-teal-400" />
                    <span>Mô Hình Gemini Mặc Định Toàn Hệ Thống:</span>
                  </label>
                </div>

                <div className="relative">
                  <select
                    data-testid="gemini-model-select"
                    value={selectedModel}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedModel(val);
                      saveGeminiModel(val);
                      setTestResult(null);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-medium text-white bg-slate-900/90 focus:outline-none focus:ring-2 focus:ring-teal-400/60 border border-white/15 cursor-pointer appearance-none pr-9"
                  >
                    {GEMINI_AVAILABLE_MODELS.map((model) => (
                      <option key={model.id} value={model.id} className="bg-slate-900 text-white py-1">
                        {model.name} — {model.badge} {model.recommended ? '⭐ (Khuyên dùng)' : ''}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Quick Guidance Box */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                    Cài Đặt Tập Trung Trên Server:
                  </span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] font-bold text-teal-300 hover:text-teal-200 underline cursor-pointer"
                  >
                    <span>Google AI Studio</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-[11px] text-white/70">
                  Khóa API chỉ lưu trên <strong>{storageLabel}</strong> và chỉ tài khoản Admin mới nhìn thấy hoặc chỉnh sửa. Người dùng thường gọi AI qua đường hầm <code>/api/ai/gemini</code> mà không bị lộ khóa.
                </p>
              </div>

              {/* Input Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-teal-400" />
                    <span>Google Gemini API Key (Master Admin):</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePaste}
                      className="flex items-center gap-1 text-[10px] font-bold text-teal-300 hover:text-white px-2 py-0.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 border border-teal-400/20 cursor-pointer transition-all"
                    >
                      <ClipboardPaste className="w-3 h-3" />
                      <span>Dán Key</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white cursor-pointer transition-all"
                      title={showKey ? 'Ẩn ký tự' : 'Hiện ký tự'}
                    >
                      {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <input
                  type={showKey ? 'text' : 'password'}
                  value={keyInput}
                  onChange={(e) => {
                    setKeyInput(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder="AIzaSy..."
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-mono text-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-400/60 placeholder:text-white/20 border border-white/15"
                />
              </div>

              {/* Test Connection Output */}
              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                    testResult.success
                      ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                      : 'bg-rose-500/15 border-rose-400/40 text-rose-200'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <div className="font-bold">{testResult.message}</div>
                    {testResult.latencyMs !== undefined && (
                      <div className="text-[10px] opacity-75 font-mono">
                        Độ trễ phản hồi Server → Google: {testResult.latencyMs}ms
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Success Save Toast */}
              {saveSuccessNotice && (
                <div className="p-3 rounded-xl bg-teal-500/20 border border-teal-400/40 text-teal-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-300 shrink-0" />
                  <span className="font-bold">{saveSuccessNotice}</span>
                </div>
              )}
            </div>

            {/* Action Buttons Footer */}
            <div className="p-4 border-t border-white/10 bg-slate-900/60 flex items-center justify-between gap-2">
              {hasConfiguredKey ? (
                <button
                  onClick={handleClear}
                  disabled={isSavingServer}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-400/30 text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa Key Server</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestConnection}
                  disabled={isTesting || !keyInput.trim()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all disabled:opacity-40 cursor-pointer border border-white/10"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-teal-300' : ''}`} />
                  <span>{isTesting ? 'Đang kiểm tra...' : 'Kiểm Tra'}</span>
                </button>

                <button
                  onClick={handleSave}
                  disabled={isSavingServer || !keyInput.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-black text-xs font-black shadow-lg shadow-teal-500/20 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 font-black" />
                  <span>{isSavingServer ? 'Đang Lưu...' : 'Lưu Lên Server'}</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
