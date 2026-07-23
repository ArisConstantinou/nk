export const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;

export const resolvePublicUrl = (url = '') => {
  if (!url || !/^\/?assets\//.test(url)) return url;
  return publicAsset(url);
};
