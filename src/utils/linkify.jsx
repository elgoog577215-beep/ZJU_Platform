import React from 'react';

/**
 * Linkify plain text: find http(s) URLs inside a string and wrap them as
 * <a> elements, leaving the rest of the text as-is.
 *
 * Usage:
 *   <LinkifiedText text={block.text} />
 *
 * Scope decisions (see brainstorm 2026-04-20):
 *   - Only http:// and https:// URLs — no bare domains, no mailto,
 *     no site-relative paths. Keeps false-positive rate low.
 *   - Opens in a new tab with rel="noopener noreferrer".
 *   - Trailing punctuation ( . , ; : ! ? ) ] ) is stripped from the URL
 *     and kept as regular text, so "see https://zju.edu.cn/." doesn't
 *     try to navigate to "https://zju.edu.cn/.".
 *   - Styling lives in src/index.css under `.linkified-url` so day/night
 *     theme switching works without prop drilling.
 */

// The capture-group form lets String.prototype.split keep the URL chunks
// alongside the surrounding text, so we can interleave <a> and text nodes.
export const URL_REGEX = /(https?:\/\/[^\s<>"'，。；：！？,]+)/g;

// Characters that commonly trail a URL in prose but aren't part of it.
const TRAILING_PUNCT = /[.,;:!?)\]}>"'，。；：！？）】»]+$/;

function splitTrailingPunct(raw) {
  const match = raw.match(TRAILING_PUNCT);
  if (!match) return { url: raw, trailing: '' };
  return {
    url: raw.slice(0, -match[0].length),
    trailing: match[0],
  };
}

/**
 * React component: render a plain string with embedded URLs as clickable
 * anchors. Non-URL text is rendered as-is (newlines preserved if the
 * surrounding element has white-space: pre-wrap).
 */
export function LinkifiedText({ text }) {
  if (!text || typeof text !== 'string') return text ?? null;
  const parts = text.split(URL_REGEX);
  return (
    <>
      {parts.map((part, idx) => {
        if (idx % 2 === 1) {
          // Capture groups land on odd indices — those are URLs.
          const { url, trailing } = splitTrailingPunct(part);
          if (!url) return part;
          return (
            <React.Fragment key={idx}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="linkified-url"
              >
                {url}
              </a>
              {trailing}
            </React.Fragment>
          );
        }
        return part;
      })}
    </>
  );
}

/**
 * Linkify an HTML string: traverse the DOM, wrap bare URLs in text nodes
 * with <a> tags, but leave text inside <a>, <code>, <pre>, <script>,
 * <style> untouched. Intended to be called BEFORE DOMPurify.sanitize.
 *
 * Returns the transformed HTML string. The wrapper <div> used during
 * parsing is removed — only inner content is returned.
 */
export function linkifyHtml(html) {
  if (!html || typeof html !== 'string') return html || '';
  if (typeof DOMParser === 'undefined') return html; // SSR / non-browser

  const doc = new DOMParser().parseFromString(
    `<body><div id="__linkify_root">${html}</div></body>`,
    'text/html',
  );
  const root = doc.getElementById('__linkify_root');
  if (!root) return html;

  linkifyNode(root);
  return root.innerHTML;
}

const SKIP_TAGS = new Set(['A', 'CODE', 'PRE', 'SCRIPT', 'STYLE', 'TEXTAREA']);

function linkifyNode(node) {
  if (!node || !node.childNodes) return;
  // Snapshot children because we may replace text nodes in-place.
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === 3 /* TEXT_NODE */) {
      linkifyTextNode(child);
    } else if (child.nodeType === 1 /* ELEMENT_NODE */) {
      if (!SKIP_TAGS.has(child.tagName)) {
        linkifyNode(child);
      }
    }
  }
}

function linkifyTextNode(textNode) {
  const value = textNode.nodeValue;
  if (!value || !URL_REGEX.test(value)) return;
  // Reset regex state — URL_REGEX uses /g flag so lastIndex persists.
  URL_REGEX.lastIndex = 0;

  const parts = value.split(URL_REGEX);
  if (parts.length === 1) return;

  const doc = textNode.ownerDocument;
  const fragment = doc.createDocumentFragment();
  parts.forEach((part, idx) => {
    if (idx % 2 === 1) {
      const { url, trailing } = splitTrailingPunct(part);
      if (!url) {
        fragment.appendChild(doc.createTextNode(part));
        return;
      }
      const a = doc.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'linkified-url';
      a.textContent = url;
      fragment.appendChild(a);
      if (trailing) fragment.appendChild(doc.createTextNode(trailing));
    } else if (part) {
      fragment.appendChild(doc.createTextNode(part));
    }
  });

  textNode.parentNode.replaceChild(fragment, textNode);
}

export default LinkifiedText;
