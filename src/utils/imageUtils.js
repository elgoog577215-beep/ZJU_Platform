export const normalizeExternalImageUrl = (url, width) => {
  if (!url) return url;
  if (typeof url !== 'string') return url;

  if (width && url.startsWith('/uploads/')) {
    return `/api/uploads/image-variant?src=${encodeURIComponent(url)}&w=${encodeURIComponent(String(width))}`;
  }

  if (shouldUseLocalPlaceholder(url)) {
    return '';
  }

  if (url.includes('images.unsplash.com')) {
    const normalizedUrl = new URL(url);

    if (width) {
      normalizedUrl.searchParams.set('w', String(width));
    }

    if (!normalizedUrl.searchParams.has('auto')) {
      normalizedUrl.searchParams.set('auto', 'format');
    }

    if (!normalizedUrl.searchParams.has('fit')) {
      normalizedUrl.searchParams.set('fit', 'crop');
    }

    normalizedUrl.searchParams.set('fm', 'jpg');

    return normalizedUrl.toString();
  }

  return url;
};

const shouldUseLocalPlaceholder = (url) => {
  const allowRemoteSampleImages = import.meta.env?.VITE_ALLOW_REMOTE_SAMPLE_IMAGES === 'true';
  if (allowRemoteSampleImages || !url.startsWith('http')) return false;

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname === 'images.unsplash.com';
  } catch {
    return false;
  }
};

export const getOriginalUploadUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('/uploads/')) return url;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';

  try {
    const parsedUrl = new URL(url, baseUrl);
    if (!parsedUrl.pathname.endsWith('/api/uploads/image-variant')) return url;

    const sourceUrl = parsedUrl.searchParams.get('src');
    return sourceUrl && sourceUrl.startsWith('/uploads/') ? sourceUrl : url;
  } catch {
    return url;
  }
};

export const fallbackToOriginalUpload = (event, fallbackUrl) => {
  const image = event?.currentTarget;
  if (!image) return false;

  const originalUrl = fallbackUrl || getOriginalUploadUrl(image.getAttribute('src') || image.src);
  if (!originalUrl || originalUrl === image.getAttribute('src')) return false;

  image.dataset.originalUploadFallback = 'true';
  image.src = originalUrl;
  return true;
};

export const getHighResUrl = (url) => {
  if (!url) return url;
  return normalizeExternalImageUrl(url, 1600);
};

export const getThumbnailUrl = (url) => {
  if (!url) return url;
  return normalizeExternalImageUrl(url, 200);
};
