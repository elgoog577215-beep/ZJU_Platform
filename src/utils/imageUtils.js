export const normalizeExternalImageUrl = (url, width) => {
  if (!url) return url;

  if (width && typeof url === 'string' && url.startsWith('/uploads/')) {
    return `/api/uploads/image-variant?src=${encodeURIComponent(url)}&w=${encodeURIComponent(String(width))}`;
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

export const getHighResUrl = (url) => {
  if (!url) return url;
  return normalizeExternalImageUrl(url, 1600);
};

export const getThumbnailUrl = (url) => {
  if (!url) return url;
  return normalizeExternalImageUrl(url, 200);
};
