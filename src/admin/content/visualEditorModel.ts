import type {PageComponent, PageComponentType, PageSection, ReusableComponent, VisualHistoryEntry} from '../types';

const alignments = ['left', 'center', 'right', 'stretch'] as const;
const tones = ['default', 'accent', 'muted', 'dark'] as const;

export const componentLabels: Record<PageComponentType, string> = {
  heading: 'Heading', text: 'Text', button: 'Button', image: 'Image', icon: 'Icon', divider: 'Divider',
};

export function newComponent(type: PageComponentType, values: Partial<PageComponent> = {}): PageComponent {
  const defaults: Record<PageComponentType, Partial<PageComponent>> = {
    heading: {text: 'Click to edit this heading', label: 'Heading'},
    text: {text: 'Click to edit this text.', label: 'Text'},
    button: {text: 'Call to action', label: 'Button', url: '/contact'},
    image: {label: 'Image', alt: 'Describe this image'},
    icon: {label: 'Icon', icon: 'zap'},
    divider: {label: 'Divider'},
  };
  return {
    id: crypto.randomUUID(), type, enabled: true, label: componentLabels[type], text: '', url: '', image: '', alt: '', icon: 'check',
    scope: 'local', reusableId: '', groupId: '',
    ...defaults[type], ...values,
    style: {...{width: 100, align: 'stretch', tone: 'default', padding: 0, radius: 0}, ...values.style},
  };
}

export function normalizeComponent(value: Partial<PageComponent>, fallbackType: PageComponentType = 'text'): PageComponent {
  const type = ['heading', 'text', 'button', 'image', 'icon', 'divider'].includes(String(value.type)) ? value.type as PageComponentType : fallbackType;
  const width = Number(value.style?.width);
  const padding = Number(value.style?.padding);
  const radius = Number(value.style?.radius);
  return newComponent(type, {
    ...value,
    id: typeof value.id === 'string' && value.id ? value.id : crypto.randomUUID(),
    type,
    enabled: value.enabled !== false,
    label: typeof value.label === 'string' && value.label ? value.label : componentLabels[type],
    text: typeof value.text === 'string' ? value.text : '',
    url: typeof value.url === 'string' ? value.url : '',
    image: typeof value.image === 'string' ? value.image : '',
    alt: typeof value.alt === 'string' ? value.alt : '',
    icon: typeof value.icon === 'string' ? value.icon : 'check',
    scope: value.scope === 'global' ? 'global' : 'local',
    reusableId: typeof value.reusableId === 'string' ? value.reusableId : '',
    groupId: typeof value.groupId === 'string' ? value.groupId : '',
    style: {
      width: Number.isFinite(width) ? Math.min(100, Math.max(20, width)) : 100,
      align: alignments.includes(value.style?.align as typeof alignments[number]) ? value.style!.align : 'stretch',
      tone: tones.includes(value.style?.tone as typeof tones[number]) ? value.style!.tone : 'default',
      padding: Number.isFinite(padding) ? Math.min(64, Math.max(0, padding)) : 0,
      radius: Number.isFinite(radius) ? Math.min(48, Math.max(0, radius)) : 0,
    },
  });
}

export function materializeSection(value: Partial<PageSection>): PageSection {
  const components = Array.isArray(value.components) && value.components.length
    ? value.components.map(component => normalizeComponent(component))
    : [
        value.eyebrow ? newComponent('text', {label: 'Eyebrow', text: value.eyebrow, style: {width: 100, align: 'left', tone: 'accent', padding: 0, radius: 0}}) : null,
        newComponent('heading', {text: value.title || 'Click to write the section heading'}),
        value.body ? newComponent('text', {text: value.body}) : null,
        value.image ? newComponent('image', {image: value.image, alt: value.title || 'Section image'}) : null,
        value.buttonLabel ? newComponent('button', {text: value.buttonLabel, url: value.buttonUrl || '/contact'}) : null,
      ].filter((component): component is PageComponent => Boolean(component));
  return {
    id: typeof value.id === 'string' && value.id ? value.id : crypto.randomUUID(),
    type: ['text', 'features', 'cta', 'media'].includes(String(value.type)) ? value.type as PageSection['type'] : 'text',
    enabled: value.enabled !== false,
    eyebrow: typeof value.eyebrow === 'string' ? value.eyebrow : '',
    title: typeof value.title === 'string' ? value.title : 'Untitled section',
    body: typeof value.body === 'string' ? value.body : '',
    buttonLabel: typeof value.buttonLabel === 'string' ? value.buttonLabel : '',
    buttonUrl: typeof value.buttonUrl === 'string' ? value.buttonUrl : '',
    image: typeof value.image === 'string' ? value.image : '',
    icon: typeof value.icon === 'string' ? value.icon : 'check',
    items: Array.isArray(value.items) ? value.items.filter((item): item is string => typeof item === 'string') : [],
    layout: ['stack', 'grid', 'split'].includes(String(value.layout)) ? value.layout as PageSection['layout'] : 'stack',
    columns: Math.min(4, Math.max(1, Number(value.columns) || 1)),
    components,
  };
}

export function newSection(): PageSection {
  return materializeSection({id: crypto.randomUUID(), type: 'text', enabled: true, eyebrow: '', title: 'New section', body: '', buttonLabel: '', buttonUrl: '', image: '', icon: 'check', items: [], layout: 'stack', columns: 1, components: [newComponent('heading'), newComponent('text')]});
}

export function sectionsFrom(value: unknown): PageSection[] {
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object').map(item => materializeSection(item as Partial<PageSection>)) : [];
}

export function reusableFrom(value: unknown): ReusableComponent[] {
  if (!Array.isArray(value)) return [];
  return value.filter(item => item && typeof item === 'object').map(item => item as Partial<ReusableComponent>).filter(item => typeof item.id === 'string').map(item => ({
    id: item.id!, name: typeof item.name === 'string' ? item.name : 'Reusable component', scope: item.scope === 'global' ? 'global' : 'local', component: normalizeComponent(item.component || {}), updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
  }));
}

export function historyFrom(value: unknown): VisualHistoryEntry[] {
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object' && typeof (item as VisualHistoryEntry).id === 'string').slice(-160) as VisualHistoryEntry[] : [];
}
