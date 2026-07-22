import type {ImgHTMLAttributes} from 'react';
import {useContent} from '../context/ContentContext';
import {resolvePublicUrl} from '../utils/assets';

export function ResponsiveImage({src = '', alt, ...props}: ImgHTMLAttributes<HTMLImageElement>) {
  const {media} = useContent();
  const resolvedSrc = resolvePublicUrl(src);
  const deliverySrc = /\/assets\/nk-logo-transparent-v2\.png(?:\?.*)?$/.test(resolvedSrc)
    ? resolvePublicUrl('/assets/nk-logo-transparent-v2-compact.webp')
    : resolvedSrc;
  const asset = media.find(item => item.url === src || resolvePublicUrl(item.url) === resolvedSrc);
  const variants = asset?.variants.filter(item => item.mimeType === 'image/webp').sort((a, b) => a.width - b.width) || [];
  if (!variants.length) return <img src={deliverySrc} alt={alt} {...props}/>;
  const srcSet = variants.map(item => `${resolvePublicUrl(item.url)} ${item.width}w`).join(', ');
  return <picture style={{display: 'contents'}}><source type="image/webp" srcSet={srcSet} sizes={props.sizes || '100vw'}/><img src={deliverySrc} alt={alt ?? asset?.altText ?? ''} width={asset?.width || undefined} height={asset?.height || undefined} {...props}/></picture>;
}
