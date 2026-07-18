import {useId, type ReactNode, type SVGProps} from 'react';

type SharedProps = Omit<SVGProps<SVGSVGElement>, 'children' | 'role' | 'title'> & {
  children: ReactNode;
};

type AccessibleSvgProps = SharedProps & (
  | {decorative: true; title?: never; description?: never}
  | {decorative?: false; title: string; description?: string}
);

export function AccessibleSvg({decorative = false, title, description, children, ...props}: AccessibleSvgProps) {
  const id = useId().replace(/:/g, '');
  const titleId = `experience-svg-title-${id}`;
  const descriptionId = `experience-svg-description-${id}`;
  const labelledBy = [title ? titleId : '', description ? descriptionId : ''].filter(Boolean).join(' ') || undefined;
  return <svg
    {...props}
    className={`interactive-svg ${props.className ?? ''}`.trim()}
    role={decorative ? undefined : 'img'}
    aria-hidden={decorative || undefined}
    aria-labelledby={decorative ? undefined : labelledBy}
    focusable="false"
    preserveAspectRatio={props.preserveAspectRatio ?? 'xMidYMid meet'}
  >
    {!decorative && title && <title id={titleId}>{title}</title>}
    {!decorative && description && <desc id={descriptionId}>{description}</desc>}
    {children}
  </svg>;
}
