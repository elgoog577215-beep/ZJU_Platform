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
