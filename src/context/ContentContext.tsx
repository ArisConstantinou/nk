import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {defaultContent} from '../content';
import legacyProductData from '../data/legacy-products.json';
import {isPagesAdminMode, PAGES_ADMIN_CHANGED_EVENT, PAGES_ADMIN_STORAGE_KEY, readPagesPublicPayload, savePagesSubmission} from '../admin/pagesMode';
import type {Catalogue, Product, Project, SiteContent} from '../types';
import {LIVE_EDITOR_COMMAND_EVENT, LIVE_EDITOR_NONCE} from '../components/liveEditorEvents';
import {isProductCutoutAsset, resolvePublicUrl} from '../utils/assets';

const STORAGE_KEY = 'nk-electrical-content-v3';
const importedProducts = (legacyProductData as unknown as Product[]).map(product => ({
  ...product,
  image: resolvePublicUrl(product.image),
}));
function mergeCatalogueProducts(overrides: Product[] = []) {
  const products = new Map(importedProducts.map(product => [product.id, product]));
  defaultContent.products.forEach(product => products.set(product.id, {...products.get(product.id), ...product}));
  overrides.forEach(product => {
    const current = products.get(product.id);
    const merged = {...current, ...product};
    if (current && isProductCutoutAsset(current.image)) merged.image = current.image;
    products.set(product.id, merged);
  });
  return [...products.values()];
}

const defaultSiteContent: SiteContent = {...defaultContent, products: mergeCatalogueProducts()};

export type PublicPageComponent = {id: string; type: 'heading' | 'text' | 'button' | 'image' | 'gallery' | 'icon' | 'divider'; enabled: boolean; label: string; text: string; url: string; image: string; images: string[]; alt: string; icon: string; scope: 'local' | 'global'; reusableId: string; groupId: string; style: {width: number; align: 'left' | 'center' | 'right' | 'stretch'; tone: 'default' | 'accent' | 'muted' | 'dark'; padding: number; radius: number}};
export type PublicPageSection = {id: string; type: 'text' | 'features' | 'cta' | 'media'; enabled: boolean; eyebrow: string; title: string; body: string; buttonLabel: string; buttonUrl: string; image: string; icon: string; items: string[]; layout: 'stack' | 'grid' | 'split'; columns: number; components: PublicPageComponent[]};
export type PublicPage = {slug: string; title: string; route: string; navigationTitle: string; eyebrow: string; heroTitle: string; heroAccent: string; heroTail: string; heroBody: string; introTitle: string; introAccent: string; introBody: string; heroImage: string; sections: PublicPageSection[]};
export type PublicNavigationItem = {id: string; menu: 'primary' | 'services' | 'shop' | 'footer-services' | 'footer-shop' | 'footer-company'; label: string; url: string; description: string; active: boolean; position: number};
export type PublicFormField = {id: string; name: string; label: string; type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox'; required: boolean; active: boolean; placeholder: string; options: string[]};
export type PublicForm = {id: string; slug: string; name: string; submitLabel: string; successMessage: string; fields: PublicFormField[]; active: boolean; position: number};
export type PublicService = {slug: string; title: string; code: string; shortTitle: string; description: string; intro: string; icon: string; deliverables: string[]; applications: string[]};
export type PublicSeo = {route: string; title: string; description: string; canonical: string; indexable: boolean; ogImage: string};
export type PublicMediaAsset = {id: string; filename: string; mimeType: string; altText: string; caption: string; title: string; width: number | null; height: number | null; variants: Array<{width: number; height: number | null; mimeType: string; size: number; url: string}>; url: string};
export type SitePhone = {id: string; label: string; number: string; active: boolean; primary: boolean};
export type SiteEmail = {id: string; label: string; address: string; active: boolean; primary: boolean};
export type SiteLocation = {id: string; label: string; address: string; mapsUrl: string; active: boolean; primary: boolean};
export type SiteOpeningHours = {id: string; label: string; hours: string; active: boolean};
export type SiteSocialLink = {id: string; platform: string; icon: string; iconUrl: string; url: string; active: boolean; newTab: boolean; placements: Array<'header' | 'footer' | 'mobile' | 'contact'>};
export type SiteSettings = {address: string; phone: string; email: string; hours: string; mapsUrl: string; mapEmbedUrl: string; brandName: string; brandTagline: string; logoUrl: string; logoAlt: string; faviconUrl: string; defaultSocialImage: string; siteName: string; defaultMetaTitle: string; defaultMetaDescription: string; language: string; locale: string; quoteLabel: string; quoteUrl: string; footerEyebrow: string; footerTitle: string; footerCtaLabel: string; footerCopyright: string; phones: SitePhone[]; emails: SiteEmail[]; locations: SiteLocation[]; openingHours: SiteOpeningHours[]; socialLinks: SiteSocialLink[]; header: {sticky: boolean; showTagline: boolean; showSocials: boolean; showBrandWires: boolean; showDinRail: boolean}; footer: {showSocials: boolean; showContact: boolean; showHours: boolean}};
export type PublicCompany = {slug: string; title: string; heading: string; introduction: string; history: string[]; partnerships: string[]};
export type VisualFontFamily = 'display' | 'body' | 'mono' | 'serif';
export type VisualTextAlign = 'left' | 'center' | 'right' | 'justify';
export type VisualOverrideEntry = {text?: string; src?: string; href?: string; icon?: string; hidden?: boolean; label?: string; x?: number; y?: number; fontFamily?: VisualFontFamily; fontSize?: number; textAlign?: VisualTextAlign};
export type VisualOverrideMap = Record<string, VisualOverrideEntry>;
export type VisualPlacementMap = Record<string, {target: string; position: 'before' | 'after'}>;
export type VisualRecord = {kind: string; slug: string; overrides: VisualOverrideMap; placements: VisualPlacementMap};

type PublicRecord = {id: string; kind: string; slug: string; title: string; data: Record<string, unknown>; position: number; publishedAt: string};
type PublicPayload = {records: PublicRecord[]; navigation: PublicNavigationItem[]; forms: PublicForm[]; media: PublicMediaAsset[]};
type MappedPayload = {content: SiteContent; pages: PublicPage[]; navigation: PublicNavigationItem[]; forms: PublicForm[]; media: PublicMediaAsset[]; services: PublicService[]; seo: PublicSeo[]; settings: SiteSettings; company: PublicCompany; visualRecords: Record<string, VisualRecord>};

const defaultSettings: SiteSettings = {
  address: '72 Makedonitissis Str., Strovolos 2057, Cyprus',
  phone: '+357 22 494145',
  email: 'info@nk-electrical.com',
  hours: 'Mon, Tue, Thu, Fri: 09:00–18:00\nWednesday, Saturday: 09:00–14:00\nSunday: Closed',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=72+Makedonitissis+Strovolos+2057+Cyprus',
  brandName: 'NK Electrical',
  brandTagline: 'Power · Light · Control',
  logoUrl: '/assets/nk-logo-transparent-v2.png',
  logoAlt: 'NK Electrical',
  faviconUrl: '/assets/nk-favicon.png',
  defaultSocialImage: '',
  siteName: 'NK Electrical',
  defaultMetaTitle: '',
  defaultMetaDescription: '',
  language: 'en',
  locale: 'en_CY',
  mapEmbedUrl: '',
  quoteLabel: 'Request a Quote',
  quoteUrl: '/request-a-quote',
  footerEyebrow: 'PROJECT LINE / CYPRUS',
  footerTitle: 'Tell us what you need. We will confirm the next step.',
  footerCtaLabel: 'Request a Quote',
  footerCopyright: 'NK Electrical Ltd. · Since 1985',
  phones: [{id: 'primary-phone', label: 'Main', number: '+357 22 494145', active: true, primary: true}],
  emails: [{id: 'primary-email', label: 'General', address: 'info@nk-electrical.com', active: true, primary: true}],
  locations: [{id: 'primary-location', label: 'Main store', address: '72 Makedonitissis Str., Strovolos 2057, Cyprus', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=72+Makedonitissis+Strovolos+2057+Cyprus', active: true, primary: true}],
  openingHours: [{id: 'store-hours', label: 'Store', hours: 'Mon, Tue, Thu, Fri: 09:00–18:00\nWednesday, Saturday: 09:00–14:00\nSunday: Closed', active: true}],
  socialLinks: [
    {id: 'linkedin', platform: 'LinkedIn', icon: 'linkedin', iconUrl: '', url: 'https://www.linkedin.com/company/12901535/', active: true, newTab: true, placements: ['header', 'footer', 'mobile', 'contact']},
    {id: 'facebook', platform: 'Facebook', icon: 'facebook', iconUrl: '', url: 'https://www.facebook.com/nkelectricalltd', active: true, newTab: true, placements: ['header', 'footer', 'mobile', 'contact']},
    {id: 'instagram-lighting', platform: 'Instagram Lighting', icon: 'instagram', iconUrl: '', url: 'https://www.instagram.com/nk_electrical/', active: true, newTab: true, placements: ['header', 'footer', 'mobile', 'contact']},
    {id: 'instagram-appliances', platform: 'Instagram Appliances', icon: 'instagram', iconUrl: '', url: 'https://www.instagram.com/nk.electrical.ltd/', active: true, newTab: true, placements: ['header', 'footer', 'mobile', 'contact']},
  ],
  header: {sticky: true, showTagline: true, showSocials: true, showBrandWires: true, showDinRail: true},
  footer: {showSocials: true, showContact: true, showHours: false},
};

type ContentApi = {
  content: SiteContent;
  pages: PublicPage[];
  navigation: PublicNavigationItem[];
  forms: PublicForm[];
  media: PublicMediaAsset[];
  services: PublicService[];
  seo: PublicSeo[];
  settings: SiteSettings;
  company: PublicCompany;
  visualRecords: Record<string, VisualRecord>;
  pageForRoute: (route: string) => PublicPage | undefined;
  visualRecordForRoute: (route: string) => VisualRecord | undefined;
  visualOverridesFor: (kind: string, slug: string) => VisualOverrideMap;
  seoForRoute: (route: string) => PublicSeo | undefined;
  formBySlug: (slug: string) => PublicForm | undefined;
  submitForm: (slug: string, values: Record<string, string | boolean>) => Promise<string>;
  refresh: () => Promise<void>;
};

const ContentContext = createContext<ContentApi | null>(null);
const mergeContent = (value: Partial<SiteContent>): SiteContent => ({...defaultSiteContent, ...value, products: mergeCatalogueProducts(value.products), heroObject: {...defaultContent.heroObject, ...value.heroObject}, themeContent: {tech: {...defaultContent.themeContent.tech, ...value.themeContent?.tech}}});
const readStored = (): SiteContent => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? mergeContent(JSON.parse(value) as Partial<SiteContent>) : defaultSiteContent;
  } catch {
    return defaultSiteContent;
  }
};
const stringValue = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const stringArray = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const objectArray = (value: unknown) => Array.isArray(value) ? value.filter(isObject) : [];
const visualOverrides = (value: unknown): VisualOverrideMap => {
  if (!isObject(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([key, entry]) => {
    if (!/^[a-f0-9]{8,16}$/i.test(key) || !isObject(entry)) return [];
    const mapped: VisualOverrideEntry = {};
    if (typeof entry.text === 'string') mapped.text = entry.text;
    if (typeof entry.src === 'string') mapped.src = entry.src;
    if (typeof entry.href === 'string') mapped.href = entry.href;
    if (typeof entry.icon === 'string') mapped.icon = entry.icon;
    if (typeof entry.hidden === 'boolean') mapped.hidden = entry.hidden;
    if (typeof entry.label === 'string') mapped.label = entry.label;
    if (typeof entry.x === 'number' && Number.isFinite(entry.x)) mapped.x = Math.max(-4000, Math.min(4000, Math.round(entry.x)));
    if (typeof entry.y === 'number' && Number.isFinite(entry.y)) mapped.y = Math.max(-4000, Math.min(4000, Math.round(entry.y)));
    if (['display', 'body', 'mono', 'serif'].includes(String(entry.fontFamily))) mapped.fontFamily = entry.fontFamily as VisualFontFamily;
    if (typeof entry.fontSize === 'number' && Number.isFinite(entry.fontSize)) mapped.fontSize = Math.max(12, Math.min(200, Math.round(entry.fontSize)));
    if (['left', 'center', 'right', 'justify'].includes(String(entry.textAlign))) mapped.textAlign = entry.textAlign as VisualTextAlign;
    return Object.keys(mapped).length ? [[key, mapped]] : [];
  }));
};
const visualPlacements = (value: unknown): VisualPlacementMap => {
  if (!isObject(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([key, entry]) => {
    if (!/^[a-f0-9]{8,16}$/i.test(key) || !isObject(entry) || typeof entry.target !== 'string' || !/^[a-f0-9]{8,16}$/i.test(entry.target) || !['before', 'after'].includes(String(entry.position))) return [];
    return [[key, {target: entry.target, position: entry.position === 'after' ? 'after' as const : 'before' as const}]];
  }));
};

function mapSettings(value: Record<string, unknown>): SiteSettings {
  const merged = {...defaultSettings, ...value};
  const phones = objectArray(value.phones).map((item, index) => ({id: stringValue(item.id, `phone-${index + 1}`), label: stringValue(item.label, 'Phone'), number: stringValue(item.number), active: item.active !== false, primary: item.primary === true})).filter(item => item.number);
  const emails = objectArray(value.emails).map((item, index) => ({id: stringValue(item.id, `email-${index + 1}`), label: stringValue(item.label, 'Email'), address: stringValue(item.address), active: item.active !== false, primary: item.primary === true})).filter(item => item.address);
  const locations = objectArray(value.locations).map((item, index) => ({id: stringValue(item.id, `location-${index + 1}`), label: stringValue(item.label, 'Location'), address: stringValue(item.address), mapsUrl: stringValue(item.mapsUrl), active: item.active !== false, primary: item.primary === true})).filter(item => item.address);
  const openingHours = objectArray(value.openingHours).map((item, index) => ({id: stringValue(item.id, `hours-${index + 1}`), label: stringValue(item.label, 'Opening hours'), hours: stringValue(item.hours), active: item.active !== false})).filter(item => item.hours);
  const socialLinks = objectArray(value.socialLinks).map((item, index) => ({id: stringValue(item.id, `social-${index + 1}`), platform: stringValue(item.platform, 'Website'), icon: stringValue(item.icon, 'globe'), iconUrl: stringValue(item.iconUrl), url: stringValue(item.url), active: item.active !== false, newTab: item.newTab !== false, placements: stringArray(item.placements).filter((placement): placement is SiteSocialLink['placements'][number] => ['header', 'footer', 'mobile', 'contact'].includes(placement))})).filter(item => item.url);
  const headerValue = isObject(value.header) ? value.header : {};
  const footerValue = isObject(value.footer) ? value.footer : {};
  return {
    ...merged,
    phones: phones.length ? phones : defaultSettings.phones.map(item => ({...item, number: stringValue(value.phone, item.number)})),
    emails: emails.length ? emails : defaultSettings.emails.map(item => ({...item, address: stringValue(value.email, item.address)})),
    locations: locations.length ? locations : defaultSettings.locations.map(item => ({...item, address: stringValue(value.address, item.address), mapsUrl: stringValue(value.mapsUrl, item.mapsUrl)})),
    openingHours: openingHours.length ? openingHours : defaultSettings.openingHours.map(item => ({...item, hours: stringValue(value.hours, item.hours)})),
    socialLinks: socialLinks.length ? socialLinks : defaultSettings.socialLinks,
    header: {sticky: headerValue.sticky !== false, showTagline: headerValue.showTagline !== false, showSocials: headerValue.showSocials !== false, showBrandWires: headerValue.showBrandWires !== false, showDinRail: headerValue.showDinRail !== false},
    footer: {showSocials: footerValue.showSocials !== false, showContact: footerValue.showContact !== false, showHours: footerValue.showHours === true},
  } as SiteSettings;
}

function normalizePayload(value: unknown): PublicPayload {
  const payload = isObject(value) ? value : {};
  const records = Array.isArray(payload.records) ? payload.records.filter((record): record is PublicRecord => isObject(record) && typeof record.id === 'string' && typeof record.kind === 'string' && typeof record.slug === 'string' && typeof record.title === 'string' && isObject(record.data)) : [];
  const navigation = Array.isArray(payload.navigation) ? payload.navigation.filter((item): item is PublicNavigationItem => isObject(item) && typeof item.id === 'string' && typeof item.menu === 'string' && typeof item.label === 'string' && typeof item.url === 'string') : [];
  const forms = Array.isArray(payload.forms) ? payload.forms.filter((form): form is PublicForm => isObject(form) && typeof form.id === 'string' && typeof form.slug === 'string' && typeof form.name === 'string' && Array.isArray(form.fields)) : [];
  const media = Array.isArray(payload.media) ? payload.media.filter((item): item is PublicMediaAsset => isObject(item) && typeof item.id === 'string' && typeof item.url === 'string' && typeof item.mimeType === 'string' && Array.isArray(item.variants)) : [];
  return {records, navigation, forms, media};
}

function mapPayload(payload: PublicPayload): MappedPayload {
  const byKind = (kind: string) => payload.records.filter(record => record.kind === kind).sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
  const productRecords = byKind('product');
  const catalogueRecords = byKind('catalogue');
  const projectRecords = byKind('project');
  const pageRecords = byKind('page');
  const serviceRecords = byKind('service');
  const seoRecords = byKind('seo');
  const homepage = pageRecords.find(record => record.slug === 'homepage');
  const company = byKind('company')[0];
  const settingsRecord = byKind('settings')[0];
  const globalComponents = new Map(objectArray(settingsRecord?.data.globalComponents).flatMap(item => typeof item.id === 'string' && isObject(item.component) ? [[item.id, item.component] as const] : []));
  const visualRecords = Object.fromEntries(payload.records.map(record => [`${record.kind}:${record.slug}`, {kind: record.kind, slug: record.slug, overrides: visualOverrides(record.data.visualOverrides), placements: visualPlacements(record.data.visualPlacements)}]));

  const managedProducts: Product[] = productRecords.map(record => ({id: record.slug, name: record.title, category: stringValue(record.data.category, 'Lighting') as Product['category'], season: stringValue(record.data.season, 'All year') as Product['season'], space: stringValue(record.data.space, 'Living') as Product['space'], image: stringValue(record.data.image), note: stringValue(record.data.note)}));
  const products = mergeCatalogueProducts(managedProducts);
  const catalogues: Catalogue[] = catalogueRecords.length ? catalogueRecords.map(record => ({id: record.slug, name: record.title, brand: stringValue(record.data.brand, 'ACA') as Catalogue['brand'], year: stringValue(record.data.year), focus: stringValue(record.data.focus, 'Decorative') as Catalogue['focus'], url: stringValue(record.data.url)})) : defaultContent.catalogues;
  const projects: Project[] = projectRecords.length ? projectRecords.map(record => ({id: record.slug, number: stringValue(record.data.number), name: record.title, image: stringValue(record.data.image), type: stringValue(record.data.type), category: stringValue(record.data.category, 'Residential') as Project['category'], completionDate: stringValue(record.data.completionDate), text: stringValue(record.data.text), systems: stringArray(record.data.systems)})) : defaultContent.projects;
  const pages: PublicPage[] = pageRecords.map(record => ({
    slug: record.slug,
    title: record.title,
    route: stringValue(record.data.route, record.slug === 'homepage' ? '/' : `/${record.slug}`),
    navigationTitle: stringValue(record.data.navigationTitle, record.title),
    eyebrow: stringValue(record.data.eyebrow),
    heroTitle: stringValue(record.data.heroTitle),
    heroAccent: stringValue(record.data.heroAccent),
    heroTail: stringValue(record.data.heroTail),
    heroBody: stringValue(record.data.heroBody),
    introTitle: stringValue(record.data.introTitle, stringValue(record.data.heroTitle)),
    introAccent: stringValue(record.data.introAccent, stringValue(record.data.heroAccent)),
    introBody: stringValue(record.data.introBody, stringValue(record.data.heroBody)),
    heroImage: stringValue(record.data.heroImage),
    sections: Array.isArray(record.data.sections) ? record.data.sections.filter(isObject).map((section, index) => ({
      id: stringValue(section.id, `section-${index + 1}`),
      type: ['text', 'features', 'cta', 'media'].includes(stringValue(section.type)) ? stringValue(section.type) as PublicPageSection['type'] : 'text',
      enabled: section.enabled !== false,
      eyebrow: stringValue(section.eyebrow),
      title: stringValue(section.title),
      body: stringValue(section.body),
      buttonLabel: stringValue(section.buttonLabel),
      buttonUrl: stringValue(section.buttonUrl),
      image: stringValue(section.image),
      icon: stringValue(section.icon, 'check'),
      items: stringArray(section.items),
      layout: ['stack', 'grid', 'split'].includes(stringValue(section.layout)) ? stringValue(section.layout) as PublicPageSection['layout'] : 'stack',
      columns: Math.min(4, Math.max(1, Number(section.columns) || 1)),
      components: Array.isArray(section.components) ? section.components.filter(isObject).map((component, componentIndex) => {
        const definition = component.scope === 'global' ? globalComponents.get(stringValue(component.reusableId)) : undefined;
        const effective = definition ? {...definition, id: component.id, enabled: component.enabled, scope: 'global', reusableId: component.reusableId, groupId: component.groupId} : component;
        return {
          id: stringValue(effective.id, `component-${componentIndex + 1}`),
          type: ['heading', 'text', 'button', 'image', 'gallery', 'icon', 'divider'].includes(stringValue(effective.type)) ? stringValue(effective.type) as PublicPageComponent['type'] : 'text',
          enabled: effective.enabled !== false,
          label: stringValue(effective.label, 'Component'),
          text: stringValue(effective.text), url: stringValue(effective.url), image: stringValue(effective.image), images: stringArray(effective.images).slice(0, 8), alt: stringValue(effective.alt), icon: stringValue(effective.icon, 'check'),
          scope: effective.scope === 'global' ? 'global' : 'local', reusableId: stringValue(effective.reusableId), groupId: stringValue(effective.groupId),
          style: isObject(effective.style) ? {width: Math.min(100, Math.max(20, Number(effective.style.width) || 100)), align: ['left', 'center', 'right', 'stretch'].includes(stringValue(effective.style.align)) ? stringValue(effective.style.align) as PublicPageComponent['style']['align'] : 'stretch', tone: ['default', 'accent', 'muted', 'dark'].includes(stringValue(effective.style.tone)) ? stringValue(effective.style.tone) as PublicPageComponent['style']['tone'] : 'default', padding: Math.min(64, Math.max(0, Number(effective.style.padding) || 0)), radius: Math.min(48, Math.max(0, Number(effective.style.radius) || 0))} : {width: 100, align: 'stretch', tone: 'default', padding: 0, radius: 0},
        };
      }) : [],
    })) : [],
  }));
  const services: PublicService[] = serviceRecords.map(record => ({slug: record.slug, title: record.title, code: stringValue(record.data.code), shortTitle: stringValue(record.data.shortTitle), description: stringValue(record.data.description), intro: stringValue(record.data.intro), icon: stringValue(record.data.icon, 'zap'), deliverables: stringArray(record.data.deliverables), applications: stringArray(record.data.applications)}));
  const seo: PublicSeo[] = seoRecords.map(record => ({route: stringValue(record.data.route, '/'), title: stringValue(record.data.metaTitle, record.title), description: stringValue(record.data.metaDescription), canonical: stringValue(record.data.canonical), indexable: record.data.indexable !== false, ogImage: stringValue(record.data.ogImage)}));
  const settings = mapSettings(settingsRecord?.data || {});
  const companyData = company?.data || {};
  const companyContent: PublicCompany = {
    slug: company?.slug || 'company',
    title: company?.title || 'NK Electrical',
    heading: stringValue(companyData.heading, defaultContent.aboutTitle),
    introduction: stringValue(companyData.introduction, defaultContent.aboutBody),
    history: stringValue(companyData.history).split('\n').map(item => item.trim()).filter(Boolean),
    partnerships: stringValue(companyData.partnerships).split('\n').map(item => item.trim()).filter(Boolean),
  };
  const homeData = homepage?.data || {};
  const content = mergeContent({
    products,
    catalogues,
    projects,
    aboutTitle: stringValue(companyData.heading, defaultContent.aboutTitle),
    aboutBody: stringValue(companyData.introduction, defaultContent.aboutBody),
    contactNote: pages.find(page => page.slug === 'contact')?.introBody || defaultContent.contactNote,
    heroImage: stringValue(homeData.heroImage, defaultContent.heroImage),
    themeContent: {tech: {...defaultContent.themeContent.tech, eyebrow: stringValue(homeData.eyebrow, defaultContent.themeContent.tech.eyebrow), heroTitle: stringValue(homeData.heroTitle, defaultContent.themeContent.tech.heroTitle), heroAccent: stringValue(homeData.heroAccent, defaultContent.themeContent.tech.heroAccent), heroTail: stringValue(homeData.heroTail, defaultContent.themeContent.tech.heroTail), heroBody: stringValue(homeData.heroBody, defaultContent.themeContent.tech.heroBody), sectionTitle: stringValue(homeData.sectionTitle, defaultContent.themeContent.tech.sectionTitle), sectionBody: stringValue(homeData.sectionBody, defaultContent.themeContent.tech.sectionBody)}},
  });
  return {content, pages, services, seo, settings, company: companyContent, navigation: payload.navigation, forms: payload.forms, media: payload.media, visualRecords};
}

function mergePreviewRecords(base: PublicPayload, previewRecords: PublicRecord[]): PublicPayload {
  const previewById = new Map(previewRecords.map(record => [record.id, record]));
  const records = base.records.map(record => previewById.get(record.id) || record);
  const baseIds = new Set(base.records.map(record => record.id));
  previewRecords.forEach(record => { if (!baseIds.has(record.id)) records.push(record); });
  return {...base, records};
}

export function ContentProvider({children}: {children: ReactNode}) {
  const [content, setContent] = useState<SiteContent>(readStored);
  const [pages, setPages] = useState<PublicPage[]>([]);
  const [navigation, setNavigation] = useState<PublicNavigationItem[]>([]);
  const [forms, setForms] = useState<PublicForm[]>([]);
  const [media, setMedia] = useState<PublicMediaAsset[]>([]);
  const [services, setServices] = useState<PublicService[]>([]);
  const [seo, setSeo] = useState<PublicSeo[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [company, setCompany] = useState<PublicCompany>({slug: 'company', title: 'NK Electrical', heading: defaultContent.aboutTitle, introduction: defaultContent.aboutBody, history: [], partnerships: []});
  const [visualRecords, setVisualRecords] = useState<Record<string, VisualRecord>>({});
  const basePayloadRef = useRef<PublicPayload | null>(null);
  const previewRecordsRef = useRef<PublicRecord[] | null>(null);
  const visualEditorNonce = useMemo(() => new URLSearchParams(window.location.search).get('visualEditor'), []);

  useEffect(() => {
    if (visualEditorNonce) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(content)); }
    catch { /* The in-memory fallback remains usable when storage is unavailable. */ }
  }, [content, visualEditorNonce]);

  const applyMapped = useCallback((mapped: MappedPayload) => {
    setContent(mapped.content);
    setPages(mapped.pages);
    setServices(mapped.services);
    setSeo(mapped.seo);
    setSettings(mapped.settings);
    setCompany(mapped.company);
    setNavigation(mapped.navigation);
    setForms(mapped.forms);
    setMedia(mapped.media);
    setVisualRecords(mapped.visualRecords);
  }, []);

  const refresh = useCallback(async () => {
    try {
      if (isPagesAdminMode) {
        const stored = readPagesPublicPayload();
        if (!stored) return;
        const basePayload = normalizePayload(stored);
        basePayloadRef.current = basePayload;
        const payload = previewRecordsRef.current ? mergePreviewRecords(basePayload, previewRecordsRef.current) : basePayload;
        applyMapped(mapPayload(payload));
        return;
      }
      const response = await fetch('/api/admin/public/site', {cache: 'no-store', credentials: 'same-origin', headers: {Accept: 'application/json'}});
      if (!response.ok) throw new Error('CMS unavailable');
      const basePayload = normalizePayload(await response.json());
      basePayloadRef.current = basePayload;
      const payload = previewRecordsRef.current ? mergePreviewRecords(basePayload, previewRecordsRef.current) : basePayload;
      applyMapped(mapPayload(payload));
    } catch {
      // Keep the last known/default public content. Admin downtime must not break the site.
    }
  }, [applyMapped]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!isPagesAdminMode) return;
    const onChanged = () => { void refresh(); };
    const onStorage = (event: StorageEvent) => { if (event.key === PAGES_ADMIN_STORAGE_KEY) void refresh(); };
    window.addEventListener(PAGES_ADMIN_CHANGED_EVENT, onChanged);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(PAGES_ADMIN_CHANGED_EVENT, onChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, [refresh]);

  useEffect(() => {
    if (!visualEditorNonce || window.parent === window) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent || !isObject(event.data)) return;
      if (event.data.type !== 'nk-visual-editor:records' || event.data.nonce !== visualEditorNonce || !Array.isArray(event.data.records)) return;
      const records = event.data.records.filter(isObject).flatMap(record => {
        if (typeof record.id !== 'string' || typeof record.kind !== 'string' || typeof record.slug !== 'string' || typeof record.title !== 'string' || !isObject(record.data)) return [];
        return [{id: record.id, kind: record.kind, slug: record.slug, title: record.title, data: record.data, position: typeof record.position === 'number' ? record.position : 0, publishedAt: typeof record.publishedAt === 'string' ? record.publishedAt : ''}];
      });
      const current = event.data.mode === 'patch' ? previewRecordsRef.current || [] : [];
      const merged = event.data.mode === 'patch' ? [...current.filter(item => !records.some(record => record.id === item.id)), ...records] : records;
      previewRecordsRef.current = merged;
      if (basePayloadRef.current) applyMapped(mapPayload(mergePreviewRecords(basePayloadRef.current, merged)));
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [applyMapped, visualEditorNonce]);

  useEffect(() => {
    const onLiveEditorCommand = (event: Event) => {
      if (!(event instanceof CustomEvent) || !isObject(event.detail)) return;
      const data = event.detail;
      if (data.type !== 'nk-visual-editor:records' || data.nonce !== LIVE_EDITOR_NONCE || !Array.isArray(data.records)) return;
      if (data.editingEnabled === false) {
        previewRecordsRef.current = null;
        if (basePayloadRef.current) applyMapped(mapPayload(basePayloadRef.current));
        return;
      }
      const records = data.records.filter(isObject).flatMap(record => {
        if (typeof record.id !== 'string' || typeof record.kind !== 'string' || typeof record.slug !== 'string' || typeof record.title !== 'string' || !isObject(record.data)) return [];
        return [{id: record.id, kind: record.kind, slug: record.slug, title: record.title, data: record.data, position: typeof record.position === 'number' ? record.position : 0, publishedAt: typeof record.publishedAt === 'string' ? record.publishedAt : ''}];
      });
      const current = data.mode === 'patch' ? previewRecordsRef.current || [] : [];
      const merged = data.mode === 'patch' ? [...current.filter(item => !records.some(record => record.id === item.id)), ...records] : records;
      previewRecordsRef.current = merged;
      if (basePayloadRef.current) applyMapped(mapPayload(mergePreviewRecords(basePayloadRef.current, merged)));
    };
    window.addEventListener(LIVE_EDITOR_COMMAND_EVENT, onLiveEditorCommand);
    return () => window.removeEventListener(LIVE_EDITOR_COMMAND_EVENT, onLiveEditorCommand);
  }, [applyMapped]);

  const api = useMemo<ContentApi>(() => ({
    content,
    pages,
    navigation,
    forms,
    media,
    services,
    seo,
    settings,
    company,
    visualRecords,
    pageForRoute: route => pages.find(page => page.route === route),
    visualRecordForRoute: route => {
      const page = pages.find(item => item.route === route);
      if (page) return visualRecords[`page:${page.slug}`];
      const service = route.match(/^\/services\/([^/?#]+)/)?.[1];
      if (service) return visualRecords[`service:${service}`];
      const product = route.match(/^\/shop\/product\/([^/?#]+)/)?.[1];
      if (product) return visualRecords[`product:${product}`];
      return undefined;
    },
    visualOverridesFor: (kind, slug) => visualRecords[`${kind}:${slug}`]?.overrides || {},
    seoForRoute: route => seo.find(record => record.route === route),
    formBySlug: slug => forms.find(form => form.slug === slug && form.active),
    submitForm: async (slug, values) => {
      const website = String(values.website || '');
      const cleanValues = {...values};
      delete cleanValues.website;
      if (isPagesAdminMode) {
        if (website) return 'Thank you. Your submission has been received.';
        return savePagesSubmission(slug, cleanValues);
      }
      const response = await fetch('/api/admin/public/submissions', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json', Accept: 'application/json'}, body: JSON.stringify({formSlug: slug, values: cleanValues, website})});
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || 'The form could not be submitted.');
      return payload.message || 'Thank you. Your submission has been received.';
    },
    refresh,
  }), [company, content, forms, media, navigation, pages, refresh, seo, services, settings, visualRecords]);

  return <ContentContext.Provider value={api}>{children}</ContentContext.Provider>;
}

export const useContent = () => {
  const value = useContext(ContentContext);
  if (!value) throw new Error('useContent must be used inside ContentProvider');
  return value;
};
