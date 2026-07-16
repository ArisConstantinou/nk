export const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;

export const resolvePublicUrl = (url = '') => {
  if (!url || import.meta.env.BASE_URL === '/' || !url.startsWith('/assets/')) return url;
  return publicAsset(url);
};
