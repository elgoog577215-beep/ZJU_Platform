const fs = require('fs/promises');
const path = require('path');
const WordExtractor = require('word-extractor');

const SUPPORTED_DOCUMENT_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.md',
  '.markdown',
]);

const extractor = new WordExtractor();
let pdfModulePromise = null;

const loadPdfModule = async () => {
  if (!pdfModulePromise) {
    pdfModulePromise = import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  return pdfModulePromise;
};

const normalizeText = (value = '') =>
  String(value || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .split('\u0000')
    .join('')
    .replace(/\u00AD/g, '')
    .trim();

const createTextBlock = (text = '', style = 'paragraph', language = '') => ({
  type: 'text',
  style,
  text: String(text || ''),
  language: style === 'code' ? String(language || '').trim() : '',
});

const splitParagraphs = (rawText = '') =>
  normalizeText(rawText)
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter(Boolean);

const buildBlocksFromPlainText = (rawText = '') => {
  const paragraphs = splitParagraphs(rawText);
  if (!paragraphs.length) return [];

  return paragraphs.map((paragraph) => {
    const lines = paragraph
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const isList =
      lines.length > 1 &&
      lines.every((line) => /^([-*+•·]|\d+\.)\s+/.test(line));

    if (isList) {
      return createTextBlock(
        lines.map((line) => line.replace(/^([-*+•·]|\d+\.)\s+/, '')).join('\n'),
        'list',
      );
    }

    return createTextBlock(paragraph, 'paragraph');
  });
};

const buildBlocksFromMarkdown = (rawMarkdown = '') => {
  const lines = normalizeText(rawMarkdown).split('\n');
  const blocks = [];
  let currentParagraph = [];
  let currentList = [];
  let currentQuote = [];
  let currentCode = [];
  let codeLanguage = '';
  let inCodeBlock = false;

  const pushParagraph = () => {
    const text = currentParagraph.join('\n').trim();
    if (text) blocks.push(createTextBlock(text, 'paragraph'));
    currentParagraph = [];
  };

  const pushList = () => {
    if (currentList.length) {
      blocks.push(createTextBlock(currentList.join('\n'), 'list'));
    }
    currentList = [];
  };

  const pushQuote = () => {
    const text = currentQuote.join('\n').trim();
    if (text) blocks.push(createTextBlock(text, 'quote'));
    currentQuote = [];
  };

  const pushCode = () => {
    const text = currentCode.join('\n').replace(/\s+$/, '');
    if (text) blocks.push(createTextBlock(text, 'code', codeLanguage));
    currentCode = [];
    codeLanguage = '';
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (/^```/.test(trimmed)) {
      pushParagraph();
      pushList();
      pushQuote();
      if (inCodeBlock) {
        pushCode();
        inCodeBlock = false;
        return;
      }
      inCodeBlock = true;
      codeLanguage = trimmed.replace(/^```/, '').trim();
      return;
    }

    if (inCodeBlock) {
      currentCode.push(line);
      return;
    }

    if (!trimmed) {
      pushParagraph();
      pushList();
      pushQuote();
      return;
    }

    const headingMatch = trimmed.match(/^#{1,6}\s+(.+)$/);
    if (headingMatch) {
      pushParagraph();
      pushList();
      pushQuote();
      blocks.push(createTextBlock(headingMatch[1].trim(), 'heading'));
      return;
    }

    const quoteMatch = trimmed.match(/^>\s?(.+)$/);
    if (quoteMatch) {
      pushParagraph();
      pushList();
      currentQuote.push(quoteMatch[1].trim());
      return;
    }

    const listMatch = trimmed.match(/^([-*+•·]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      pushParagraph();
      pushQuote();
      currentList.push(listMatch[2].trim());
      return;
    }

    pushList();
    pushQuote();
    currentParagraph.push(trimmed);
  });

  if (inCodeBlock) {
    pushCode();
  }
  pushParagraph();
  pushList();
  pushQuote();

  return blocks;
};

const blocksToPlainText = (blocks = []) =>
  (Array.isArray(blocks) ? blocks : [])
    .map((block) => {
      if (block?.style === 'list') {
        return String(block.text || '')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .join('\n');
      }
      return String(block?.text || '').trim();
    })
    .filter(Boolean)
    .join('\n\n')
    .trim();

const deriveTitleFromFileName = (fileName = '') =>
  String(fileName || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const deriveSuggestedTitle = (blocks = [], fileName = '') => {
  const firstHeading = (Array.isArray(blocks) ? blocks : []).find(
    (block) => block?.type === 'text' && block?.style === 'heading' && String(block?.text || '').trim(),
  );
  if (firstHeading) {
    return String(firstHeading.text || '').trim().slice(0, 100);
  }
  const firstTextBlock = (Array.isArray(blocks) ? blocks : []).find(
    (block) => block?.type === 'text' && String(block?.text || '').trim(),
  );
  const firstLine = String(firstTextBlock?.text || '')
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);
  if (firstLine && firstLine.length <= 100) {
    return firstLine;
  }
  return deriveTitleFromFileName(fileName).slice(0, 100);
};

const normalizePdfWhitespace = (value = '') =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

const buildPdfPageText = (items = []) => {
  const positionedItems = (Array.isArray(items) ? items : [])
    .map((item, index) => ({
      index,
      text: normalizePdfWhitespace(item?.str || ''),
      x: Number(item?.transform?.[4] || 0),
      y: Number(item?.transform?.[5] || 0),
      width: Number(item?.width || 0),
      height: Number(item?.height || 0),
    }))
    .filter((item) => item.text);

  if (!positionedItems.length) return '';

  const rows = [];
  const rowTolerance = 3;

  positionedItems.forEach((item) => {
    const currentRow = rows[rows.length - 1];
    if (!currentRow || Math.abs(currentRow.y - item.y) > rowTolerance) {
      rows.push({ y: item.y, items: [item] });
      return;
    }
    currentRow.items.push(item);
  });

  const lines = rows
    .map((row) => {
      const sortedItems = [...row.items].sort((left, right) => left.x - right.x || left.index - right.index);
      let lastRightEdge = null;
      let line = '';

      sortedItems.forEach((item) => {
        if (!item.text) return;
        const gap = lastRightEdge == null ? 0 : item.x - lastRightEdge;
        if (line && gap > Math.max(8, item.height * 0.45)) {
          line += ' ';
        }
        line += item.text;
        lastRightEdge = item.x + item.width;
      });

      const averageHeight = sortedItems.reduce((sum, item) => sum + item.height, 0) / sortedItems.length || 0;
      return {
        y: row.y,
        text: normalizePdfWhitespace(line),
        averageHeight,
      };
    })
    .filter((line) => line.text)
    .sort((upper, lower) => lower.y - upper.y);

  const paragraphs = [];
  let currentParagraph = [];

  lines.forEach((line, index) => {
    const previousLine = lines[index - 1];
    const verticalGap = previousLine ? previousLine.y - line.y : 0;
    const paragraphBreak = previousLine
      ? verticalGap > Math.max(previousLine.averageHeight, line.averageHeight) * 1.45
      : false;

    if (paragraphBreak && currentParagraph.length) {
      paragraphs.push(currentParagraph.join('\n'));
      currentParagraph = [];
    }

    currentParagraph.push(line.text);
  });

  if (currentParagraph.length) {
    paragraphs.push(currentParagraph.join('\n'));
  }

  return paragraphs.join('\n\n');
};

const promoteLeadingTitleBlock = (blocks = []) => {
  if (!Array.isArray(blocks) || blocks.length < 2) return blocks;

  const [first, ...rest] = blocks;
  const firstText = String(first?.text || '').trim();
  const [firstLine, ...remainingLines] = firstText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const remainingText = remainingLines.join('\n').trim();

  if (
    first?.type === 'text'
    && first?.style === 'paragraph'
    && firstLine
    && remainingText
    && firstLine.length <= 100
  ) {
    return [
      { ...first, style: 'heading', text: firstLine },
      { ...first, style: 'paragraph', text: remainingText, language: '' },
      ...rest,
    ];
  }

  if (
    first?.type === 'text'
    && first?.style === 'paragraph'
    && firstText
    && firstText.length <= 100
  ) {
    return [{ ...first, style: 'heading' }, ...rest];
  }

  return blocks;
};

const extractPdfText = async (filePath) => {
  const pdfBuffer = await fs.readFile(filePath);
  const pdfData = new Uint8Array(pdfBuffer);
  const { getDocument } = await loadPdfModule();
  const loadingTask = getDocument({ data: pdfData });
  const pdf = await loadingTask.promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = buildPdfPageText(content.items);
    if (text) pages.push(text);
  }

  return pages.join('\n\n');
};

const extractWordText = async (filePath) => {
  const doc = await extractor.extract(filePath);
  return normalizeText(doc.getBody());
};

const importCommunityDocument = async (file) => {
  if (!file?.path || !file?.originalname) {
    const error = new Error('Document file is required');
    error.statusCode = 400;
    throw error;
  }

  const extension = path.extname(file.originalname).toLowerCase();
  if (!SUPPORTED_DOCUMENT_EXTENSIONS.has(extension)) {
    const error = new Error('Unsupported document format');
    error.statusCode = 400;
    throw error;
  }

  let sourceText = '';
  let contentBlocks = [];
  let sourceType = 'plain';

  if (extension === '.md' || extension === '.markdown') {
    sourceType = 'markdown';
    sourceText = await fs.readFile(file.path, 'utf8');
    contentBlocks = buildBlocksFromMarkdown(sourceText);
  } else if (extension === '.pdf') {
    sourceType = 'pdf';
    sourceText = await extractPdfText(file.path);
    contentBlocks = promoteLeadingTitleBlock(buildBlocksFromPlainText(sourceText));
  } else {
    sourceType = extension === '.doc' ? 'doc' : 'docx';
    sourceText = await extractWordText(file.path);
    contentBlocks = buildBlocksFromPlainText(sourceText);
  }

  const plainText = blocksToPlainText(contentBlocks);
  if (!plainText) {
    const error = new Error('Document does not contain importable text');
    error.statusCode = 422;
    throw error;
  }

  return {
    title: deriveSuggestedTitle(contentBlocks, file.originalname),
    plainText,
    contentBlocks,
    meta: {
      fileName: file.originalname,
      extension,
      sourceType,
      charCount: plainText.length,
      blockCount: contentBlocks.length,
    },
  };
};

module.exports = {
  importCommunityDocument,
  SUPPORTED_DOCUMENT_EXTENSIONS,
};
