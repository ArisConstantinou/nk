export const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;

export const resolvePublicUrl = (url = '') => {
  if (!url || !/^\/?assets\//.test(url)) return url;
  return publicAsset(url);
};

export const isProductCutoutAsset = (url = '') => (
  /\/assets\/product-cutouts\/[^/?#]+\.webp(?:[?#].*)?$/i.test(url)
  || /\/assets\/products\/(?:blaupunkt|bosch-multitalent|el-led|nespresso)\.webp(?:[?#].*)?$/i.test(url)
);
