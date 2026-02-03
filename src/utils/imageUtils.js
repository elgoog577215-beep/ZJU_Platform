export const getHighResUrl = (url) => {
  if (!url) return url;
  if (url.includes('images.unsplash.com')) {
    return url.replace('&w=800', '&w=1600').replace('?w=800', '?w=1600');
  }
  return url;
};

export const getThumbnailUrl = (url) => {
  if (!url) return url;
  if (url.includes('images.unsplash.com')) {
    // Replace existing width param or append if missing (simplified logic)
    if (url.includes('w=')) {
      return url.replace(/w=\d+/, 'w=200');
    }
    return `${url}&w=200`;
  }
  return url;
};
