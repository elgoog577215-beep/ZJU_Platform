export const parseContentBlocks = (raw) => {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const calculateReadingTime = (text, t) => {
  const wordsPerMinute = 200;
  const words = text ? text.split(/\s+/).length : 0;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} ${t('common.min_read')}`;
};

export const formatBytes = (bytes = 0) => {
  if (!bytes || Number.isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const getFileTypeLabel = (name = '', mime = '') => {
  const ext = name.split('.').pop()?.toUpperCase();
  if (ext && ext.length <= 5) return ext;
  if (mime.includes('pdf')) return 'PDF';
  if (mime.includes('word')) return 'DOC';
  if (mime.includes('excel') || mime.includes('sheet')) return 'XLS';
  if (mime.includes('powerpoint') || mime.includes('presentation')) return 'PPT';
  if (mime.includes('zip') || mime.includes('rar')) return 'ZIP';
  return 'FILE';
};

export const getFileTypeBadgeClass = (name = '', mime = '', isDayMode = false) => {
  const n = getFileTypeLabel(name, mime);
  const map = { PDF: 'red', DOC: 'blue', DOCX: 'blue', XLS: 'emerald', XLSX: 'emerald', CSV: 'emerald', PPT: 'orange', PPTX: 'orange', ZIP: 'violet', RAR: 'violet' };
  const c = map[n];
  if (c) return isDayMode ? `bg-${c}-50 text-${c}-600 border-${c}-200` : `bg-${c}-500/15 text-${c}-200 border-${c}-400/30`;
  return isDayMode ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-white/10 text-gray-300 border-white/10';
};

/** Shared theme class-name maps to reduce isDayMode ternary repetition */
export const communityTheme = (isDayMode) => ({
  // Modal
  modalBackdrop: isDayMode ? 'bg-white/70' : 'bg-black/90',
  modalSurface: isDayMode ? 'bg-white' : 'bg-[#0a0a0a]',
  closeBtn: isDayMode
    ? 'bg-white/82 hover:bg-white text-slate-700 border-slate-200/80'
    : 'bg-black/40 hover:bg-black/60 text-white border-white/10',
  titleOverlay: isDayMode
    ? 'bg-gradient-to-t from-white via-white/92 to-transparent'
    : 'bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent',
  gradientTo: isDayMode ? 'to-slate-100' : 'to-gray-900',

  // Text
  textPrimary: isDayMode ? 'text-slate-900' : 'text-white',
  textSecondary: isDayMode ? 'text-slate-500' : 'text-gray-400',
  textTertiary: isDayMode ? 'text-slate-400' : 'text-gray-500',
  textContent: isDayMode ? 'text-slate-700' : 'text-gray-300',

  // Surfaces & borders
  borderSubtle: isDayMode ? 'border-slate-200/80' : 'border-white/5',
  avatarBg: isDayMode ? 'bg-slate-100' : 'bg-gray-700',
  contentBlock: isDayMode ? 'bg-slate-50/80 border-slate-200/80' : 'bg-white/[0.03] border-white/10',
  prose: isDayMode ? 'prose-slate text-slate-700' : 'prose-invert text-gray-300',

  // Cards & skeleton
  card: isDayMode
    ? 'bg-white/82 border-slate-200/80 shadow-[0_18px_42px_rgba(148,163,184,0.12)]'
    : 'bg-[#1a1a1a]/60 border-white/10',
  cardHover: isDayMode
    ? 'bg-white/82 hover:bg-white border-slate-200/80 shadow-[0_18px_42px_rgba(148,163,184,0.12)]'
    : 'bg-[#1a1a1a]/60 hover:bg-[#1a1a1a]/80 border-white/10',
  skeleton: isDayMode ? 'bg-slate-100' : 'bg-white/5',
  skeletonStrong: isDayMode ? 'bg-slate-100' : 'bg-white/10',

  // Buttons
  btnSecondary: isDayMode
    ? 'bg-white/85 hover:bg-white text-slate-700 border-slate-200/80 shadow-[0_12px_28px_rgba(148,163,184,0.14)]'
    : 'bg-white/10 hover:bg-white/20 text-white border-white/10',
  btnLoadMore: isDayMode
    ? 'bg-white/88 hover:bg-white text-slate-700 border-slate-200/80'
    : 'bg-white/10 hover:bg-white/15 text-white border-white/10',

  // Comment area
  commentBg: isDayMode ? 'bg-slate-50/80 border-slate-200/80' : 'bg-white/[0.03] border-white/10',
  commentItem: isDayMode ? 'bg-slate-50/60 border-slate-200/60' : 'bg-white/[0.02] border-white/5',
  inputBg: isDayMode ? 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400' : 'bg-white/5 border-white/10 text-white placeholder:text-gray-500',
});
