import type {ContentKind} from '../types';

export type RecordField = {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'select' | 'tags' | 'date' | 'email' | 'url' | 'checkbox';
  options?: string[];
  required?: boolean;
  help?: string;
};

export type RecordConfig = {
  kind: ContentKind;
  eyebrow: string;
  title: string;
  description: string;
  singular: string;
  singleton?: boolean;
  fields: RecordField[];
  defaults: Record<string, unknown>;
};

export const recordConfigs: Record<ContentKind, RecordConfig> = {
  page: {kind: 'page', eyebrow: 'CONTENT / PAGE COMPOSITION', title: 'Pages & homepage', description: 'Control page status, route, hero copy and reusable structured sections.', singular: 'page', defaults: {route: '/', navigationTitle: '', eyebrow: '', heroTitle: '', heroAccent: '', heroTail: '', heroBody: '', introTitle: '', introAccent: '', introBody: '', sectionTitle: '', sectionBody: '', heroImage: '', sections: []}, fields: [
    {key: 'route', label: 'Public route', required: true, help: 'Use an internal path such as /services.'}, {key: 'navigationTitle', label: 'Navigation title'}, {key: 'eyebrow', label: 'Eyebrow', required: true}, {key: 'heroTitle', label: 'Primary headline', required: true}, {key: 'heroAccent', label: 'Headline accent'}, {key: 'heroTail', label: 'Supporting headline'}, {key: 'heroBody', label: 'Introduction', type: 'textarea', required: true}, {key: 'introTitle', label: 'Page intro title'}, {key: 'introAccent', label: 'Page intro accent'}, {key: 'introBody', label: 'Page intro text', type: 'textarea'}, {key: 'sectionTitle', label: 'Homepage services title', type: 'textarea'}, {key: 'sectionBody', label: 'Homepage services explanation', type: 'textarea'}, {key: 'heroImage', label: 'Hero image path', help: 'Use a public asset path or an HTTPS URL.'},
  ]},
  service: {kind: 'service', eyebrow: 'SERVICES / EXPERTISE', title: 'Services', description: 'Define service-only content, deliverables and suitable applications.', singular: 'service', defaults: {code: '', icon: 'zap', shortTitle: '', description: '', intro: '', deliverables: [], applications: []}, fields: [
    {key: 'code', label: 'Service code', required: true}, {key: 'icon', label: 'Service icon', type: 'select', options: ['zap', 'lightbulb', 'sliders', 'shield', 'wrench'], required: true}, {key: 'shortTitle', label: 'Page headline', required: true}, {key: 'description', label: 'Summary', type: 'textarea', required: true}, {key: 'intro', label: 'Full introduction', type: 'textarea', required: true}, {key: 'deliverables', label: 'Deliverables', type: 'tags', required: true, help: 'Separate items with commas.'}, {key: 'applications', label: 'Suitable applications', type: 'tags', required: true, help: 'Separate items with commas.'},
  ]},
  product: {kind: 'product', eyebrow: 'SHOP / PRODUCT RECORDS', title: 'Shop products', description: 'Manage products separately from installation and design services.', singular: 'product', defaults: {category: 'Lighting', season: 'All year', space: 'Living', image: '/assets/products/oia.jpg', note: ''}, fields: [
    {key: 'category', label: 'Category', type: 'select', options: ['Lighting', 'Coffee', 'Kitchen', 'Cooling', 'Cleaning', 'Heating', 'Home', 'Beauty', 'Sound & Vision'], required: true}, {key: 'season', label: 'Season', type: 'select', options: ['All year', 'Summer', 'Winter', 'Christmas'], required: true}, {key: 'space', label: 'Space', type: 'select', options: ['Living', 'Kitchen', 'Outdoor', 'Bedroom', 'Workspace'], required: true}, {key: 'image', label: 'Product image path', required: true}, {key: 'note', label: 'Description', type: 'textarea', required: true},
  ]},
  catalogue: {kind: 'catalogue', eyebrow: 'SHOP / DOWNLOADS', title: 'Catalogues', description: 'Manage official brand PDFs and external catalogue links.', singular: 'catalogue', defaults: {brand: 'ACA', year: String(new Date().getFullYear()), focus: 'Decorative', url: ''}, fields: [
    {key: 'brand', label: 'Brand', type: 'select', options: ['ACA', 'Nova Luce', 'VIOKEF'], required: true}, {key: 'year', label: 'Year', required: true}, {key: 'focus', label: 'Focus', type: 'select', options: ['Decorative', 'Architectural', 'Kids', 'Natural', 'Fans'], required: true}, {key: 'url', label: 'PDF or catalogue URL', type: 'url', required: true},
  ]},
  project: {kind: 'project', eyebrow: 'PROJECTS / INSTALLED EVIDENCE', title: 'Projects', description: 'Maintain the completed project archive, filters and verified dates.', singular: 'project', defaults: {number: '', image: '/assets/projects/archive/project-01.jpg', type: '', category: 'Residential', completionDate: '', text: '', systems: []}, fields: [
    {key: 'number', label: 'Project number', required: true}, {key: 'category', label: 'Category', type: 'select', options: ['Residential', 'Commercial', 'Retail', 'Mixed use'], required: true}, {key: 'completionDate', label: 'Completion date', type: 'date'}, {key: 'image', label: 'Project image path', required: true}, {key: 'type', label: 'Short project type', required: true}, {key: 'text', label: 'Project description', type: 'textarea', required: true}, {key: 'systems', label: 'Systems delivered', type: 'tags', required: true},
  ]},
  company: {kind: 'company', eyebrow: 'COMPANY / STORY', title: 'Company', description: 'Keep the history and partnership narrative in one accountable source.', singular: 'company record', singleton: true, defaults: {heading: '', introduction: '', history: '', partnerships: ''}, fields: [
    {key: 'heading', label: 'About heading', required: true}, {key: 'introduction', label: 'Company introduction', type: 'textarea', required: true}, {key: 'history', label: 'History and timeline', type: 'textarea'}, {key: 'partnerships', label: 'Partnerships', type: 'textarea'},
  ]},
  seo: {kind: 'seo', eyebrow: 'DISCOVERY / SEARCH', title: 'SEO & routes', description: 'Control route metadata, canonical URLs and indexing decisions.', singular: 'SEO record', defaults: {route: '', metaTitle: '', metaDescription: '', canonical: '', indexable: true, ogImage: ''}, fields: [
    {key: 'route', label: 'Public route', required: true}, {key: 'metaTitle', label: 'Search title', required: true, help: 'Aim for 50–60 characters; the server enforces a 70-character maximum.'}, {key: 'metaDescription', label: 'Meta description', type: 'textarea', required: true}, {key: 'canonical', label: 'Canonical override'}, {key: 'ogImage', label: 'Social sharing image'}, {key: 'indexable', label: 'Allow search indexing', type: 'checkbox'},
  ]},
  settings: {kind: 'settings', eyebrow: 'SITE / GLOBAL LAYOUT', title: 'Header, footer & settings', description: 'Maintain the global brand, calls to action, contact details and footer copy.', singular: 'settings record', singleton: true, defaults: {address: '', phone: '', email: '', hours: '', mapsUrl: '', enquiryRecipient: '', brandName: 'NK Electrical', brandTagline: 'Power · Light · Control', quoteLabel: 'Request a Quote', quoteUrl: '/request-a-quote', footerEyebrow: 'PROJECT LINE / CYPRUS', footerTitle: 'Tell us what you need. We will confirm the next step.', footerCtaLabel: 'Request a Quote', footerCopyright: 'NK Electrical Ltd. · Since 1985'}, fields: [
    {key: 'brandName', label: 'Header brand name', required: true}, {key: 'brandTagline', label: 'Header tagline', required: true}, {key: 'quoteLabel', label: 'Header CTA label', required: true}, {key: 'quoteUrl', label: 'Header CTA link', required: true}, {key: 'footerEyebrow', label: 'Footer eyebrow', required: true}, {key: 'footerTitle', label: 'Footer headline', type: 'textarea', required: true}, {key: 'footerCtaLabel', label: 'Footer CTA label', required: true}, {key: 'footerCopyright', label: 'Footer copyright text', required: true}, {key: 'address', label: 'Address', type: 'textarea', required: true}, {key: 'phone', label: 'Phone', required: true}, {key: 'email', label: 'Public email', type: 'email', required: true}, {key: 'hours', label: 'Opening hours', type: 'textarea', required: true}, {key: 'mapsUrl', label: 'Maps URL', type: 'url', required: true}, {key: 'enquiryRecipient', label: 'Enquiry recipient', type: 'email', required: true},
  ]},
};
