export const createCommunityBlock = (type = 'text') => {
  const normalizedType = ['heading', 'quote', 'list', 'code'].includes(type) ? 'text' : type;
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: normalizedType,
    style: type === 'heading' ? 'heading' : type === 'quote' ? 'quote' : type === 'list' ? 'list' : type === 'code' ? 'code' : 'paragraph',
    text: '',
    url: '',
    caption: '',
    name: '',
    size: 0,
    mime: '',
    language: '',
    file: null,
  };
};

export const parseComposerBlocks = (raw) => {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((block) => ({
      ...createCommunityBlock(block.type || 'text'),
      ...block,
      type: block.type || 'text',
      style: block.style || (block.type === 'text' ? 'paragraph' : undefined),
      file: null,
    }));
  } catch {
    return [];
  }
};

export const extractPlainText = (html = '') => String(html || '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const escapeHtml = (text = '') => String(text || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export const buildContentHtml = (blocks = []) => blocks.map((block) => {
  if (block.type === 'text') {
    const text = String(block.text || '').trim();
    if (!text) return '';
    if (block.style === 'heading') return `<h2>${escapeHtml(text)}</h2>`;
    if (block.style === 'quote') return `<blockquote>${escapeHtml(text)}</blockquote>`;
    if (block.style === 'list') {
      const items = text.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => `<li>${escapeHtml(line.replace(/^[-*]\s*/, ''))}</li>`).join('');
      return items ? `<ul>${items}</ul>` : '';
    }
    if (block.style === 'code') return `<pre><code>${escapeHtml(text)}</code></pre>`;
    return text.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => `<p>${escapeHtml(line)}</p>`).join('');
  }
  if (block.type === 'image' && block.url) {
    return `<figure><img src="${escapeHtml(block.url)}" alt="${escapeHtml(block.caption || '')}" />${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ''}</figure>`;
  }
  if (block.type === 'video' && block.url) {
    return `<figure><video controls src="${escapeHtml(block.url)}"></video>${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ''}</figure>`;
  }
  if (block.type === 'file' && block.url) {
    return `<p><a href="${escapeHtml(block.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(block.name || block.url)}</a></p>`;
  }
  return '';
}).join('');
