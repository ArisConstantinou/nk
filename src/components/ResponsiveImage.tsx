import type {ImgHTMLAttributes} from 'react';
import {useContent} from '../context/ContentContext';

export function ResponsiveImage({src = '', alt, ...props}: ImgHTMLAttributes<HTMLImageElement>) {
  const {media} = useContent();
  const asset = media.find(item => item.url === src);
  const variants = asset?.variants.filter(item => item.mimeType === 'image/webp').sort((a, b) => a.width - b.width) || [];
  if (!variants.length) return <img src={src} alt={alt} {...props}/>;
  const srcSet = variants.map(item => `${item.url} ${item.width}w`).join(', ');
  return <picture style={{display: 'contents'}}><source type="image/webp" srcSet={srcSet} sizes={props.sizes || '100vw'}/><img src={src} alt={alt ?? asset?.altText ?? ''} width={asset?.width || undefined} height={asset?.height || undefined} {...props}/></picture>;
}
