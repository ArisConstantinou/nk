import type {ExperienceManifestEntry, ExperienceProps, ExperienceRoute, RouteMatcher} from './types';

const routeMatches = (matcher: RouteMatcher, route: ExperienceRoute) => {
  if (typeof matcher === 'function') return matcher(route);
  if (matcher instanceof RegExp) {
    matcher.lastIndex = 0;
    return matcher.test(route.pathname);
  }
  if (matcher.endsWith('*')) return route.pathname.startsWith(matcher.slice(0, -1));
  return route.pathname === matcher;
};

export class ExperienceRegistry {
  readonly #entries: readonly ExperienceManifestEntry[];

  constructor(entries: readonly ExperienceManifestEntry[]) {
    const ids = new Set<string>();
    for (const entry of entries) {
      if (ids.has(entry.id)) throw new Error(`Duplicate interactive experience id: ${entry.id}`);
      ids.add(entry.id);
    }
    this.#entries = [...entries];
  }

  resolve<TProps extends ExperienceProps = ExperienceProps>(slot: string, route: ExperienceRoute) {
    return this.#entries
      .filter(entry => entry.enabled && entry.slot === slot)
      .filter(entry => !entry.routes?.length || entry.routes.some(matcher => routeMatches(matcher, route)))
      .sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0))[0] as ExperienceManifestEntry<TProps> | undefined;
  }

  entriesFor(slot: string) {
    return this.#entries.filter(entry => entry.slot === slot);
  }
}
