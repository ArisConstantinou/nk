import type {ComponentType, ReactNode} from 'react';

export type MotionPreference = 'full' | 'reduced';
export type ExperienceCleanup = () => void;
export type ExperienceProps = Readonly<Record<string, unknown>>;
export type RouteMatcher = string | RegExp | ((route: ExperienceRoute) => boolean);

export type ExperienceRoute = Readonly<{
  pathname: string;
  search: string;
}>;

export type ViewportSnapshot = Readonly<{
  width: number;
  height: number;
  devicePixelRatio: number;
  orientation: 'portrait' | 'landscape';
}>;

export type InputCapabilities = Readonly<{
  coarsePointer: boolean;
  hover: boolean;
}>;

export interface FrameScheduler {
  read(callback: () => void): ExperienceCleanup;
  write(callback: () => void): ExperienceCleanup;
  cancelAll(): void;
}

export interface ExperienceModuleContext<TProps extends ExperienceProps = ExperienceProps> {
  root: HTMLElement;
  props: TProps;
  route: ExperienceRoute;
  motion: MotionPreference;
  viewport: ViewportSnapshot;
  input: InputCapabilities;
  signal: AbortSignal;
  frames: FrameScheduler;
  select<TElement extends Element = HTMLElement>(selector: string): TElement | null;
  selectAll<TElement extends Element = HTMLElement>(selector: string): TElement[];
  announce(message: string): void;
}

export interface ExperienceViewProps<TProps extends ExperienceProps = ExperienceProps> {
  props: TProps;
  motion: MotionPreference;
  route: ExperienceRoute;
}

export interface ExperienceModule<TProps extends ExperienceProps = ExperienceProps> {
  id: string;
  version: string;
  View?: ComponentType<ExperienceViewProps<TProps>>;
  mount?(context: ExperienceModuleContext<TProps>): void | ExperienceCleanup | Promise<void | ExperienceCleanup>;
}

export type ExperienceModuleExports<TProps extends ExperienceProps = ExperienceProps> = Readonly<{
  default: ExperienceModule<TProps>;
}>;

export interface ExperienceManifestEntry<TProps extends ExperienceProps = ExperienceProps> {
  id: string;
  slot: string;
  version: string;
  enabled: boolean;
  priority?: number;
  routes?: readonly RouteMatcher[];
  reducedMotion?: 'adapt' | 'disable';
  props?: TProps;
  load: () => Promise<ExperienceModuleExports<TProps>>;
}

export type ExperienceFallback = ReactNode | ((error: Error | null) => ReactNode);
