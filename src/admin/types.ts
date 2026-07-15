export type AdminRole = 'owner' | 'editor' | 'shop' | 'projects' | 'sales' | 'viewer';
export type ContentKind = 'page' | 'service' | 'product' | 'catalogue' | 'project' | 'company' | 'seo' | 'settings';
export type ContentStatus = 'draft' | 'published' | 'archived';

export type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  role: AdminRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ContentRecord = {
  id: string;
  kind: ContentKind;
  slug: string;
  title: string;
  status: ContentStatus;
  draft: Record<string, unknown>;
  published: Record<string, unknown> | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  position: number;
  category: string;
  tags: string[];
  updatedById: string | null;
};

export type AdminSearchResult = {
  id: string;
  type: 'content' | 'media' | 'navigation' | 'forms' | 'enquiries' | 'users';
  kind: string;
  title: string;
  description: string;
  status: string;
  category: string;
  tags: string[];
  updatedAt: string;
  updatedBy: string;
  favorite: boolean;
  to: string;
};

export type Revision = {
  id: string;
  version: number;
  title: string;
  slug: string;
  status: ContentStatus;
  data: Record<string, unknown>;
  action: string;
  createdAt: string;
  createdBy: string;
};

export type Enquiry = {
  id: string;
  type: 'contact' | 'quote' | 'product' | 'catalogue' | 'project' | 'phone';
  status: 'new' | 'in_progress' | 'waiting' | 'won' | 'closed' | 'spam';
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  source: string;
  assignedTo: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type MediaAsset = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  altText: string;
  scope: 'shared' | 'site' | 'shop' | 'projects';
  caption: string;
  title: string;
  folder: string;
  category: string;
  metadata: {credit?: string; copyright?: string; license?: string; tags?: string};
  width: number | null;
  height: number | null;
  variants: Array<{width: number; height: number | null; mimeType: string; size: number; url: string}>;
  replacementCount: number;
  active: boolean;
  position: number;
  updatedAt: string;
  createdAt: string;
  url: string;
};

export type NavigationMenu = 'primary' | 'services' | 'shop' | 'footer-services' | 'footer-shop' | 'footer-company';
export type NavigationItem = {id: string; menu: NavigationMenu; label: string; url: string; description: string; active: boolean; position: number; createdAt: string; updatedAt: string};

export type FormFieldType = 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox';
export type FormField = {id: string; name: string; label: string; type: FormFieldType; required: boolean; active: boolean; placeholder: string; options: string[]};
export type SiteForm = {id: string; slug: string; name: string; recipient: string; submitLabel: string; successMessage: string; fields: FormField[]; active: boolean; position: number; createdAt: string; updatedAt: string};
export type FormSubmission = {id: string; formId: string; formName: string; formSlug: string; status: 'new' | 'in_progress' | 'resolved' | 'spam'; payload: Record<string, string | boolean>; notes: string; createdAt: string; updatedAt: string};

export type ComponentScope = 'local' | 'global';
export type PageComponentType = 'heading' | 'text' | 'button' | 'image' | 'icon' | 'divider';
export type PageComponentStyle = {width: number; align: 'left' | 'center' | 'right' | 'stretch'; tone: 'default' | 'accent' | 'muted' | 'dark'; padding: number; radius: number};
export type PageComponent = {id: string; type: PageComponentType; enabled: boolean; label: string; text: string; url: string; image: string; alt: string; icon: string; scope: ComponentScope; reusableId: string; groupId: string; style: PageComponentStyle};
export type ReusableComponent = {id: string; name: string; scope: ComponentScope; component: PageComponent; updatedAt: string};
export type VisualHistoryAction = 'content' | 'replace' | 'style' | 'resize' | 'move-section' | 'move-component' | 'move-auto' | 'delete-auto' | 'restore-auto' | 'add-section' | 'delete-section' | 'duplicate-section' | 'add-component' | 'delete-component' | 'duplicate-component' | 'group' | 'ungroup' | 'scope' | 'reusable';
export type VisualHistoryEntry = {id: string; objectKey: string; objectLabel: string; action: VisualHistoryAction; path: string; before: unknown; after: unknown; meta: Record<string, unknown>; timestamp: string; active: boolean};
export type PageSection = {id: string; type: 'text' | 'features' | 'cta' | 'media'; enabled: boolean; eyebrow: string; title: string; body: string; buttonLabel: string; buttonUrl: string; image: string; icon: string; items: string[]; layout: 'stack' | 'grid' | 'split'; columns: number; components: PageComponent[]};

export type ApiFailure = {code: string; message: string; fields?: Record<string, string>};
