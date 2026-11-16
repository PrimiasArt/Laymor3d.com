import React, { useState, useEffect } from 'react';
import {
  ISimulationProfile,
  DefectCategoryType,
} from '@/types/simulator';
import {
  ICustomDefectKnowledgeRule,
  fetchLearnedDefectRulesFromDB,
  setLearnedDefectRules,
  getPersonalSandboxRuleIds,
  setRulePersonalSandbox,
  getKnowledgeStorageInfo,
} from '@/services/preflightAnalyzer';
import {
  IconCheckShield,
  IconClose,
  IconSliders,
  IconTerminal,
} from '@/components/icons/MinimalIcons';

interface DefectKnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: ISimulationProfile;
  onRulesUpdated: (rules: ICustomDefectKnowledgeRule[]) => void;
  onApplyFix?: (patch: Partial<ISimulationProfile>) => void;
}

const DEFECT_TYPES: { id: DefectCategoryType; label: string }[] = [
  { id: 'overhang', label: 'Overhang / Sập gãy cành & Đùn mì Ý (Spaghetti)' },
  { id: 'warping', label: 'Warping / Cong vênh bốc góc khỏi bàn in' },
  { id: 'stringing', label: 'Stringing / Tơ mạng nhện & Rỉ nhựa đầu kim' },
  { id: 'under_extrusion', label: 'Under-Extrusion / Hụt dòng nhựa, rỗ xốp lớp' },
  { id: 'elephant_foot', label: 'Elephant Foot / Phình chân voi lớp đáy' },
  { id: 'first_layer', label: 'First Layer / Bong tróc lớp đầu tiên' },
  { id: 'pillowing', label: 'Pillowing / Phồng rỗ & thủng lỗ mặt đỉnh' },
  { id: 'ringing', label: 'Ringing & Ghosting / Gợn sóng bóng ma trên vách' },
  { id: 'delamination', label: 'Delamination / Nứt toác & tách lớp thân giữa' },
  { id: 'z_seam_scarring', label: 'Z-Seam Scarring / Nổi mụn & sẹo dọc đường nối' },
  { id: 'bridging', label: 'Bridging / Võng sợi bắc cầu ngang' },
  { id: 'clogging', label: 'Nozzle Clogging / Tắc kim phun & Heat Creep' },
  { id: 'support_fusion', label: 'Support Fusion / Dính chết Support vào mẫu' },
  { id: 'knock_over', label: 'Knock-Over / Đầu phun quẹt đổ mẫu cao mảnh' },
  { id: 'moisture_bubbling', label: 'Moisture Bubbling / Nhựa ẩm nổ bọt khí' },
  { id: 'temperature_mismatch', label: 'Temperature Mismatch / Sai lệch nhiệt độ vật liệu' },
  { id: 'custom_defect', label: 'Custom Defect / Lỗi thực tế khác từ xưởng in' },
];

const TRIGGER_PARAM_OPTIONS: { key: string; label: string; defaultOp: '>' | '<' }[] = [
  { key: '', label: 'Tự nhận diện theo nhóm lỗi & mô tả', defaultOp: '>' },
  { key: 'printSpeed', label: 'Tốc độ in (printSpeed mm/s)', defaultOp: '>' },
  { key: 'nozzleTemp', label: 'Nhiệt đầu phun (nozzleTemp °C)', defaultOp: '>' },
  { key: 'bedTemp', label: 'Nhiệt bàn in (bedTemp °C)', defaultOp: '<' },
  { key: 'layerHeight', label: 'Chiều cao lớp (layerHeight mm)', defaultOp: '>' },
  { key: 'retractionDistanceMm', label: 'Rút nhựa (retractionDistanceMm mm)', defaultOp: '<' },
  { key: 'coolingFanSpeed', label: 'Quạt làm mát (coolingFanSpeed %)', defaultOp: '<' },
  { key: 'supportTopZDistance', label: 'Khe Z Support (supportTopZDistance mm)', defaultOp: '<' },
  { key: 'wallLoops', label: 'Số vòng tường (wallLoops)', defaultOp: '<' },
  { key: 'infillDensity', label: 'Mật độ Infill (infillDensity %)', defaultOp: '<' },
];

export function DefectKnowledgeModal({
  isOpen,
  onClose,
  currentProfile,
  onRulesUpdated,
  onApplyFix,
}: DefectKnowledgeModalProps) {
  const [activeTab, setActiveTab] = useState<'submit' | 'database' | 'login'>('submit');
  const [rules, setRules] = useState<ICustomDefectKnowledgeRule[]>([]);
  const [sandboxIds, setSandboxIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<'info' | 'error'>('info');
  const [storageInfo, setStorageInfo] = useState(getKnowledgeStorageInfo());

  // User / Admin Session State
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    username?: string;
    name?: string;
    displayName?: string;
    role: string;
  } | null>(null);
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Form nhập lỗi mới từ người dùng
  const [title, setTitle] = useState('');
  const [defectType, setDefectType] = useState<DefectCategoryType>('overhang');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [triggerCondition, setTriggerCondition] = useState('');
  const [triggerParamKey, setTriggerParamKey] = useState('');
  const [triggerOperator, setTriggerOperator] = useState<'>' | '<' | '>=' | '<=' | '==' | '!='>('>');
  const [triggerThreshold, setTriggerThreshold] = useState('');
  const [explanation, setExplanation] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [includeCurrentProfileFix, setIncludeCurrentProfileFix] = useState(true);

  // Admin Edit & Reject State
  const [editingRule, setEditingRule] = useState<ICustomDefectKnowledgeRule | null>(null);
  const [rejectingRuleId, setRejectingRuleId] = useState<string | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');

  const showMessage = (msg: string, kind: 'info' | 'error' = 'info') => {
    setStatusMsg(msg);
    setStatusKind(kind);
  };

  const syncRulesToParent = (fetched: ICustomDefectKnowledgeRule[]) => {
    setRules(fetched);
    setLearnedDefectRules(fetched);
    onRulesUpdated(fetched);
    setSandboxIds(getPersonalSandboxRuleIds());
    setStorageInfo(getKnowledgeStorageInfo());
  };

  const loadSessionAndRules = async () => {
    setLoading(true);
    try {
      const savedUid = localStorage.getItem('laymor_session_uid') || '';
      const authRes = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store',
        headers: savedUid ? { 'x-laymor-uid': savedUid } : {},
      });
      if (authRes.ok) {
        const authData = await authRes.json();
        setCurrentUser(authData.user || null);
      }
    } catch {
      // ignore
    }

    const fetched = await fetchLearnedDefectRulesFromDB();
    syncRulesToParent(fetched);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadSessionAndRules();
      if (!triggerCondition) {
        setTriggerCondition(
          `${currentProfile.material} • Nozzle ${currentProfile.nozzleTemp}°C • Bed ${currentProfile.bedTemp}°C • Speed ${currentProfile.printSpeed}mm/s`
        );
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isAdmin =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'mod' ||
    currentUser?.username === 'hlcai_admin';
  const currentUserDisplay =
    currentUser?.name || currentUser?.displayName || currentUser?.username || '';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          identifier: loginId.trim(),
          password: loginPass,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.user) {
        setLoginError(data.error || 'Sai ID hoặc mật khẩu');
        return;
      }
      localStorage.setItem('laymor_session_uid', data.user.id);
      localStorage.setItem('laymor_session_user', JSON.stringify(data.user));
      window.dispatchEvent(new CustomEvent('laymor-auth-change'));
      setCurrentUser(data.user);
      setLoginPass('');
      showMessage(
        `✓ Đã đăng nhập: ${data.user.name || data.user.username} (${data.user.role.toUpperCase()})`
      );
      await loadSessionAndRules();
      setActiveTab('submit');
    } catch (err: any) {
      setLoginError(err.message || 'Lỗi kết nối máy chủ');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/me', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    }).catch(() => {});
    localStorage.removeItem('laymor_session_uid');
    localStorage.removeItem('laymor_session_user');
    window.dispatchEvent(new CustomEvent('laymor-auth-change'));
    setCurrentUser(null);
    showMessage('Đã đăng xuất tài khoản.');
    await loadSessionAndRules();
  };

  const handleSubmitDefect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      showMessage('Vui lòng đăng nhập tài khoản Laymor3D để gửi bài học cho AI.', 'error');
      setActiveTab('login');
      return;
    }
    if (!title.trim() || !explanation.trim()) return;

    setLoading(true);
    setStatusMsg(null);

    const autoFixPatch: Partial<ISimulationProfile> | undefined = includeCurrentProfileFix
      ? {
          layerHeight: currentProfile.layerHeight,
          printSpeed: currentProfile.printSpeed,
          nozzleTemp: currentProfile.nozzleTemp,
          bedTemp: currentProfile.bedTemp,
          supportMode: currentProfile.supportMode,
          brimEnabled: currentProfile.brimEnabled,
          brimWidthMm: currentProfile.brimWidthMm,
          retractionDistanceMm: currentProfile.retractionDistanceMm,
          coolingFanSpeed: currentProfile.coolingFanSpeed,
        }
      : undefined;

    const triggerPayload =
      triggerParamKey && triggerThreshold.trim() !== ''
        ? {
            paramKey: triggerParamKey,
            operator: triggerOperator,
            thresholdValue: Number.isNaN(Number(triggerThreshold))
              ? triggerThreshold.trim()
              : Number(triggerThreshold),
            description:
              triggerCondition.trim() ||
              `${triggerParamKey} ${triggerOperator} ${triggerThreshold.trim()} (${currentProfile.material})`,
          }
        : {
            description:
              triggerCondition.trim() ||
              `${currentProfile.material} @ ${currentProfile.nozzleTemp}°C`,
          };

    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          category: 'simulator_defect_learning',
          defectType,
          severity,
          triggerCondition: triggerPayload,
          content: explanation.trim(),
          tags: [
            currentProfile.material,
            defectType,
            ...tagsInput
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean),
          ],
          autoFixPatch,
        }),
      });
      const data = await res.json();
      if (res.ok && data.entry) {
        if (!data.entry.isVerified && data.entry.id) {
          setRulePersonalSandbox(data.entry.id, true);
        }
        const updated = await fetchLearnedDefectRulesFromDB();
        syncRulesToParent(updated);
        setTitle('');
        setExplanation('');
        setTriggerThreshold('');
        showMessage(
          data.message ||
            (data.entry.isVerified
              ? '✓ Admin đã lưu & phát hành quy tắc lên Database!'
              : '✓ Đã gửi vào hàng chờ duyệt và BẬT Sandbox Cá Nhân để bạn test thử ngay!')
        );
        setActiveTab('database');
      } else {
        showMessage(data.error || 'Không thể lưu dữ liệu lỗi.', 'error');
      }
    } catch (err: any) {
      showMessage('Lỗi kết nối: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAdminEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule || !isAdmin) return;
    setLoading(true);
    try {
      const res = await fetch('/api/knowledge', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingRule.id,
          title: editingRule.title,
          defectType: editingRule.defectType,
          severity: editingRule.severity,
          triggerCondition: editingRule.triggerSpec || {
            description: editingRule.triggerCondition,
          },
          content: editingRule.content,
          tags: editingRule.tags,
          isVerified: editingRule.isVerified,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const updated = await fetchLearnedDefectRulesFromDB();
        syncRulesToParent(updated);
        setEditingRule(null);
        showMessage('✓ Admin đã cập nhật kiến thức lỗi giả lập xuống Database!');
      } else {
        showMessage(data.error || 'Không thể cập nhật rule.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleModerateAction = async (
    rule: ICustomDefectKnowledgeRule,
    action: 'approve' | 'reject' | 'unverify',
    reason?: string
  ) => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res = await fetch('/api/knowledge', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rule.id,
          action,
          rejectionReason: reason,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const updated = await fetchLearnedDefectRulesFromDB();
        syncRulesToParent(updated);
        setRejectingRuleId(null);
        setRejectReasonInput('');
        showMessage(data.message || '✓ Đã cập nhật trạng thái kiểm duyệt!');
      } else {
        showMessage(data.error || 'Lỗi kiểm duyệt quy tắc.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/knowledge?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        setRulePersonalSandbox(id, false);
        const updated = await fetchLearnedDefectRulesFromDB();
        syncRulesToParent(updated);
        showMessage('✓ Đã xóa quy tắc lỗi khỏi Knowledge Database.');
      } else {
        showMessage(data.error || 'Không thể xóa quy tắc.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSandbox = (ruleId: string) => {
    const enabled = !sandboxIds.includes(ruleId);
    const next = setRulePersonalSandbox(ruleId, enabled);
    setSandboxIds(next);
    onRulesUpdated([...rules]);
    showMessage(
      enabled
        ? '🧪 Đã BẬT Sandbox Cá Nhân cho quy tắc này (chỉ áp dụng kiểm lỗi trên máy bạn).'
        : 'Đã tắt Sandbox Cá Nhân cho quy tắc này.'
    );
  };

  const pendingCount = rules.filter(
    (r) => (r.moderationStatus || (r.isVerified ? 'approved' : 'pending')) === 'pending'
  ).length;
  const approvedCount = rules.filter(
    (r) => (r.moderationStatus || (r.isVerified ? 'approved' : 'pending')) === 'approved'
  ).length;
  const rejectedCount = rules.filter((r) => r.moderationStatus === 'rejected').length;

  const filteredRules = rules.filter((r) => {
    if (statusFilter === 'all') return true;
    const st = r.moderationStatus || (r.isVerified ? 'approved' : 'pending');
    return st === statusFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-3xl rounded-2xl glass-panel p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b studio-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl studio-gold-badge flex items-center justify-center">
              <IconCheckShield size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold studio-text-primary uppercase tracking-wider">
                Cơ Sở Tri Thức Lỗi In 3D &amp; Huấn Luyện AI Giả Lập
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs studio-text-secondary">
                <span>Mọi tài khoản đóng góp → Chờ Admin duyệt • Sandbox cá nhân test ngay</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    storageInfo.persisted
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  DB: {storageInfo.storageLabel}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl studio-card hover:bg-[var(--bg-hover)] studio-text-secondary hover:studio-text-primary transition-all cursor-pointer"
          >
            <IconClose size={16} />
          </button>
        </div>

        {/* Top Bar: Tabs & Active Account Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 p-1 rounded-xl studio-card">
            <button
              onClick={() => setActiveTab('submit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'submit' ? 'studio-pill-active' : 'studio-pill-inactive'
              }`}
            >
              + Dạy AI Lỗi Mới
            </button>
            <button
              onClick={() => setActiveTab('database')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'database' ? 'studio-pill-active' : 'studio-pill-inactive'
              }`}
            >
              <span>Kho Kiến Thức ({rules.length})</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/25 text-amber-300 text-[10px] font-bold">
                  {pendingCount} chờ
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('login')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'login' ? 'studio-pill-active' : 'studio-pill-inactive'
              }`}
            >
              {currentUser
                ? `${currentUserDisplay} (${currentUser.role.toUpperCase()})`
                : 'Đăng nhập SSO'}
            </button>
          </div>

          {isAdmin && (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 text-[10px] font-mono font-bold uppercase">
              ★ Master Admin (Kiểm duyệt &amp; Phát hành AI)
            </span>
          )}
        </div>

        {statusMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between border ${
              statusKind === 'error'
                ? 'bg-rose-500/15 border-rose-500/35 text-rose-300'
                : 'studio-gold-badge'
            }`}
          >
            <span>{statusMsg}</span>
            <button onClick={() => setStatusMsg(null)} className="text-[10px] underline ml-2 cursor-pointer">
              Đóng
            </button>
          </div>
        )}

        {/* TAB 1: NHẬP LỖI & GIẢI THÍCH TỪ NGƯỜI DÙNG */}
        {activeTab === 'submit' && (
          <div className="space-y-3.5 text-xs">
            {!currentUser && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="font-bold text-amber-300">
                    Yêu cầu đăng nhập để gửi bài học lỗi cho AI
                  </div>
                  <div className="text-[11px] studio-text-secondary">
                    Mọi tài khoản đã đăng nhập đều có thể gửi bài học (vào hàng chờ Admin duyệt &amp; test ngay ở Sandbox Cá Nhân).
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="px-4 py-2 rounded-xl studio-cta-primary font-bold text-xs cursor-pointer"
                >
                  Đăng Nhập Ngay →
                </button>
              </div>
            )}

            <form onSubmit={handleSubmitDefect} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold studio-text-primary block">
                    Tên hiện tượng lỗi phát sinh *
                  </label>
                  <input
                    type="text"
                    required
                    minLength={4}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="VD: Nhựa PETG bị kéo tơ & vón cục đen ở lớp vỏ nghiêng..."
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold studio-text-primary block">
                    Nhóm lỗi kỹ thuật (Defect Category)
                  </label>
                  <select
                    value={defectType}
                    onChange={(e) => setDefectType(e.target.value as DefectCategoryType)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs cursor-pointer"
                  >
                    {DEFECT_TYPES.map((dt) => (
                      <option key={dt.id} value={dt.id} className="bg-neutral-900 text-neutral-100">
                        {dt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold studio-text-primary block">Mức độ rủi ro</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs cursor-pointer"
                  >
                    <option value="critical" className="bg-neutral-900">Nghiêm trọng (Critical)</option>
                    <option value="high" className="bg-neutral-900">Cao (High)</option>
                    <option value="medium" className="bg-neutral-900">Trung bình (Medium)</option>
                    <option value="low" className="bg-neutral-900">Thấp (Low)</option>
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="font-semibold studio-text-primary flex items-center justify-between">
                    <span>Mô tả điều kiện thông số (Trigger Condition)</span>
                    <button
                      type="button"
                      onClick={() =>
                        setTriggerCondition(
                          `${currentProfile.material} • Nozzle ${currentProfile.nozzleTemp}°C • Bed ${currentProfile.bedTemp}°C • Speed ${currentProfile.printSpeed}mm/s • Layer ${currentProfile.layerHeight}mm`
                        )
                      }
                      className="text-[10px] studio-text-gold hover:underline cursor-pointer"
                    >
                      Lấy từ Profile hiện tại
                    </button>
                  </label>
                  <input
                    type="text"
                    value={triggerCondition}
                    onChange={(e) => setTriggerCondition(e.target.value)}
                    placeholder="VD: Khi in PETG nhiệt độ > 255°C và Retraction < 0.6mm..."
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono"
                  />
                </div>
              </div>

              {/* Structured Trigger Builder */}
              <div className="p-3 rounded-xl studio-card border studio-border space-y-2">
                <div className="font-semibold studio-text-gold text-[11px]">
                  Quy tắc kích hoạt tự động trong Preflight (Tùy chọn)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <select
                    value={triggerParamKey}
                    onChange={(e) => {
                      const nextKey = e.target.value;
                      setTriggerParamKey(nextKey);
                      const found = TRIGGER_PARAM_OPTIONS.find((p) => p.key === nextKey);
                      if (found) setTriggerOperator(found.defaultOp);
                    }}
                    className="sm:col-span-2 px-2.5 py-1.5 rounded-lg glass-input text-xs cursor-pointer"
                  >
                    {TRIGGER_PARAM_OPTIONS.map((opt) => (
                      <option key={opt.key} value={opt.key} className="bg-neutral-900">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={triggerOperator}
                    disabled={!triggerParamKey}
                    onChange={(e) => setTriggerOperator(e.target.value as any)}
                    className="px-2.5 py-1.5 rounded-lg glass-input text-xs font-mono disabled:opacity-40"
                  >
                    <option value=">" className="bg-neutral-900">&gt; (lớn hơn)</option>
                    <option value="<" className="bg-neutral-900">&lt; (nhỏ hơn)</option>
                    <option value=">=" className="bg-neutral-900">&gt;=</option>
                    <option value="<=" className="bg-neutral-900">&lt;=</option>
                    <option value="==" className="bg-neutral-900">== (bằng)</option>
                  </select>
                  <input
                    type="text"
                    disabled={!triggerParamKey}
                    value={triggerThreshold}
                    onChange={(e) => setTriggerThreshold(e.target.value)}
                    placeholder="Ngưỡng (VD: 240)"
                    className="px-2.5 py-1.5 rounded-lg glass-input text-xs font-mono disabled:opacity-40"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold studio-text-primary block">
                  Giải thích chi tiết nguyên nhân &amp; cách khắc phục thực tế *
                </label>
                <textarea
                  rows={4}
                  required
                  minLength={8}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Mô tả rõ hiện tượng gặp phải trên máy in, nguyên nhân vật lý/nhiệt học và thông số cần chỉnh để khắc phục triệt để..."
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div className="space-y-1">
                  <label className="font-semibold studio-text-primary block">
                    Từ khóa nhận diện (cách nhau dấu phẩy)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="VD: PETG, stringing, nozzle_temp, bambu_x1c"
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs"
                  />
                </div>

                <label className="p-3 rounded-xl studio-card flex items-center justify-between cursor-pointer mt-2 sm:mt-4">
                  <div>
                    <div className="font-semibold studio-text-primary text-[11px]">
                      Đính kèm Profile hiện tại làm Bản Vá Tự Động
                    </div>
                    <div className="text-[10px] studio-text-secondary">
                      Lưu thông số ({currentProfile.material} {currentProfile.layerHeight}mm, {currentProfile.nozzleTemp}°C) — Server tự giới hạn an toàn
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeCurrentProfileFix}
                    onChange={(e) => setIncludeCurrentProfileFix(e.target.checked)}
                    className="w-4 h-4 accent-[var(--accent-gold)] rounded cursor-pointer"
                  />
                </label>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                <span className="text-[10px] studio-text-muted">
                  {isAdmin
                    ? 'Tài khoản Admin: Bài học sẽ được duyệt & lưu thẳng lên Neon PostgreSQL.'
                    : 'Tài khoản Thành viên: Bài học vào hàng chờ duyệt + bật Sandbox test riêng trên máy bạn.'}
                </span>
                <button
                  type="submit"
                  disabled={loading || !currentUser}
                  className="px-5 py-2.5 rounded-xl studio-cta-primary font-bold text-xs cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Đang lưu xuống Database...' : 'Gửi Dữ Liệu Huấn Luyện AI →'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: DANH SÁCH TRI THỨC LỖI & QUẢN TRỊ ADMIN */}
        {activeTab === 'database' && (
          <div className="space-y-3 text-xs">
            {/* Status Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all', label: `Tất cả (${rules.length})` },
                  { id: 'approved', label: `Đang áp dụng (${approvedCount})` },
                  { id: 'pending', label: `Chờ duyệt (${pendingCount})` },
                  { id: 'rejected', label: `Từ chối (${rejectedCount})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStatusFilter(f.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                      statusFilter === f.id ? 'studio-pill-active' : 'studio-pill-inactive'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={loadSessionAndRules}
                className="px-2.5 py-1 rounded-lg studio-card text-[10px] studio-text-secondary hover:studio-text-primary cursor-pointer"
              >
                ↻ Làm mới DB
              </button>
            </div>

            {editingRule && isAdmin && (
              <form
                onSubmit={handleSaveAdminEdit}
                className="p-4 rounded-xl border border-[var(--accent-gold)] bg-[var(--bg-subtle)] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold studio-text-gold uppercase text-[11px]">
                    ✎ Chỉnh sửa Tri Thức Giả Lập (Quyền Admin): {editingRule.id}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingRule(null)}
                    className="text-[11px] studio-text-secondary hover:studio-text-primary cursor-pointer"
                  >
                    Hủy
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={editingRule.title}
                    onChange={(e) => setEditingRule({ ...editingRule, title: e.target.value })}
                    className="px-3 py-1.5 rounded-lg glass-input text-xs font-semibold"
                  />
                  <input
                    type="text"
                    value={editingRule.triggerCondition || ''}
                    onChange={(e) =>
                      setEditingRule({ ...editingRule, triggerCondition: e.target.value })
                    }
                    placeholder="Điều kiện kích hoạt"
                    className="px-3 py-1.5 rounded-lg glass-input text-xs font-mono"
                  />
                </div>

                <textarea
                  rows={3}
                  value={editingRule.content}
                  onChange={(e) => setEditingRule({ ...editingRule, content: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg glass-input text-xs"
                />

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingRule.isVerified}
                      onChange={(e) =>
                        setEditingRule({ ...editingRule, isVerified: e.target.checked })
                      }
                      className="w-4 h-4 accent-[var(--accent-gold)]"
                    />
                    <span className="text-[11px] studio-text-primary font-semibold">
                      Duyệt áp dụng toàn hệ thống 3D PrintSim
                    </span>
                  </label>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg studio-cta-primary font-bold text-xs cursor-pointer"
                  >
                    Lưu Thay Đổi Admin
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2 max-h-[52vh] overflow-y-auto pr-1">
              {filteredRules.map((r) => {
                const modStatus = r.moderationStatus || (r.isVerified ? 'approved' : 'pending');
                const isInSandbox = sandboxIds.includes(r.id);
                const isAuthor =
                  Boolean(currentUser) &&
                  ((r.submittedByUserId && r.submittedByUserId === currentUser?.id) ||
                    (!r.submittedByUserId &&
                      (r.submittedBy === currentUser?.username || r.submittedBy === currentUser?.name)));

                return (
                  <div
                    key={r.id}
                    className="p-3.5 rounded-xl studio-card space-y-2 border studio-border"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                            modStatus === 'approved'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : modStatus === 'rejected'
                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {modStatus === 'approved'
                            ? 'Đang Áp Dụng'
                            : modStatus === 'rejected'
                              ? 'Từ Chối'
                              : 'Chờ Duyệt'}
                        </span>
                        {modStatus === 'pending' && isInSandbox && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                            Sandbox Cá Nhân: BẬT
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded studio-gold-badge text-[9px] font-mono uppercase">
                          {r.defectType || r.category}
                        </span>
                        <h4 className="font-bold studio-text-primary text-xs">{r.title}</h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {r.autoFixPatch && onApplyFix && (
                          <button
                            onClick={() => {
                              onApplyFix(r.autoFixPatch!);
                              showMessage(`✓ Đã nạp thông số khắc phục từ mục "${r.title}"!`);
                            }}
                            className="px-2.5 py-1 rounded-lg studio-gold-badge text-[10px] font-semibold cursor-pointer flex items-center gap-1"
                          >
                            <IconSliders size={11} />
                            <span>Nạp Fix</span>
                          </button>
                        )}

                        {modStatus === 'pending' && (
                          <button
                            onClick={() => handleToggleSandbox(r.id)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer border ${
                              isInSandbox
                                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                : 'studio-card studio-text-secondary border-transparent'
                            }`}
                          >
                            {isInSandbox ? 'Tắt Test Riêng' : 'Test Trên Máy Tôi'}
                          </button>
                        )}

                        {isAdmin && (
                          <>
                            {modStatus !== 'approved' && (
                              <button
                                onClick={() => handleModerateAction(r, 'approve')}
                                className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[10px] font-bold cursor-pointer"
                              >
                                Duyệt
                              </button>
                            )}
                            {modStatus === 'approved' && (
                              <button
                                onClick={() => handleModerateAction(r, 'unverify')}
                                className="px-2 py-1 rounded-lg studio-card hover:bg-[var(--bg-hover)] text-[10px] font-semibold cursor-pointer"
                              >
                                Tạm ẩn
                              </button>
                            )}
                            {modStatus !== 'rejected' && (
                              <button
                                onClick={() => {
                                  setRejectingRuleId(rejectingRuleId === r.id ? null : r.id);
                                  setRejectReasonInput('');
                                }}
                                className="px-2 py-1 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 text-[10px] font-semibold cursor-pointer"
                              >
                                Từ chối
                              </button>
                            )}
                            <button
                              onClick={() => setEditingRule(r)}
                              className="px-2 py-1 rounded-lg studio-card hover:bg-[var(--bg-hover)] studio-text-gold text-[10px] font-semibold cursor-pointer"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => handleDeleteRule(r.id)}
                              className="px-2 py-1 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 text-[10px] font-semibold cursor-pointer"
                            >
                              Xóa
                            </button>
                          </>
                        )}

                        {!isAdmin && isAuthor && modStatus !== 'approved' && (
                          <button
                            onClick={() => handleDeleteRule(r.id)}
                            className="px-2 py-1 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 text-[10px] font-semibold cursor-pointer"
                          >
                            Rút bài
                          </button>
                        )}
                      </div>
                    </div>

                    {isAdmin && rejectingRuleId === r.id && (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={rejectReasonInput}
                          onChange={(e) => setRejectReasonInput(e.target.value)}
                          placeholder="Nhập lý do từ chối gửi cho tác giả..."
                          className="flex-1 px-2.5 py-1.5 rounded-lg glass-input text-[11px]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleModerateAction(r, 'reject', rejectReasonInput)
                          }
                          className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-[11px] cursor-pointer"
                        >
                          Xác nhận từ chối
                        </button>
                      </div>
                    )}

                    {r.triggerCondition && (
                      <div className="text-[10px] font-mono studio-text-gold">
                        Điều kiện: {r.triggerCondition}
                      </div>
                    )}

                    <p className="text-[11px] studio-text-secondary leading-relaxed">{r.content}</p>

                    {r.rejectionReason && modStatus === 'rejected' && (
                      <div className="text-[10px] text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-lg px-2.5 py-1.5">
                        Lý do từ chối: {r.rejectionReason}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] studio-text-muted pt-1 border-t studio-border">
                      <span>
                        Đóng góp bởi: {r.submittedBy || 'Kỹ sư Laymor 3D'}
                        {r.reviewedBy ? ` • Duyệt: ${r.reviewedBy}` : ''}
                      </span>
                      <span>Cập nhật: {new Date(r.updatedAt).toLocaleString('vi-VN')}</span>
                    </div>
                  </div>
                );
              })}

              {filteredRules.length === 0 && (
                <div className="p-6 text-center studio-text-muted text-xs">
                  Chưa có quy tắc nào trong bộ lọc này.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ĐĂNG NHẬP TÀI KHOẢN ADMIN / USER TRỰC TIẾP TRONG 3DSIM */}
        {activeTab === 'login' && (
          <div className="p-4 rounded-xl studio-card space-y-4 text-xs">
            {currentUser ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-bold studio-text-primary">
                    Đang đăng nhập: {currentUserDisplay} ({currentUser.username || currentUser.id})
                  </div>
                  <div className="text-xs studio-text-secondary">
                    Vai trò hệ thống:{' '}
                    <strong className="studio-text-gold uppercase">{currentUser.role}</strong>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <a
                      href="/admin"
                      target="_top"
                      className="px-3.5 py-2 rounded-xl studio-gold-badge font-bold text-xs"
                    >
                      Mở Trung Tâm Admin (/admin) →
                    </a>
                  )}
                  <button
                    onClick={handleLogout}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold text-xs cursor-pointer"
                  >
                    Đăng Xuất
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-3 max-w-md mx-auto">
                <div className="flex items-center gap-2 studio-text-gold font-bold">
                  <IconTerminal size={14} />
                  <span>Đăng Nhập Tài Khoản Laymor 3D / Master Admin</span>
                </div>
                <p className="text-[11px] studio-text-secondary">
                  Đăng nhập bằng tài khoản Laymor3D để gửi bài học AI (vào hàng chờ duyệt + test Sandbox cá nhân) hoặc đăng nhập Admin để kiểm duyệt toàn hệ thống.
                </p>

                {loginError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[11px] font-semibold">
                    {loginError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold studio-text-primary block">
                    ID Tài Khoản / Username
                  </label>
                  <input
                    type="text"
                    required
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder="Nhập ID (VD: hlcai_admin hoặc username của bạn)"
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold studio-text-primary block">
                    Mật khẩu
                  </label>
                  <input
                    type="password"
                    required
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder="Nhập mật khẩu..."
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl studio-cta-primary font-bold text-xs cursor-pointer"
                >
                  Đăng Nhập Hệ Thống
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
