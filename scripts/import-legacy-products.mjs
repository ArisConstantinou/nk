import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const SOURCE_ORIGIN = 'https://www.nk-electrical.com';
const PAGE_SIZE = 24;
const OUTPUT_FILE = path.resolve(process.cwd(), 'src/data/legacy-products.json');
const curatedProductAliases = {
  'oia-pendant-light': 'oia',
  'fame-pendant-lights': 'fame',
  'neri-led-surface-liners': 'neri',
  'polo-wall-light': 'polo',
  'el-led-ceiling-light': 'el-led',
  'ragno-pendant-light': 'ragno',
  'ragno-light': 'ragno',
  'filomena-black': 'filomena-black',
  'filomena-light-black': 'filomena-black',
  'filomena-gold': 'filomena-gold',
  'filomena-light-gold': 'filomena-gold',
  'nova-led-ceiling-light': 'nova',
  'nova-led-lights': 'nova',
  'zoella-gold': 'zoella',
  'zoella-light-gold': 'zoella',
  '30-ceiling-fan': 'ceiling-fan',
  'izzy-3-in-1-coffee-machine': 'izzy-coffee',
  'izzy-3in1-coffee-machine': 'izzy-coffee',
  'matestar-platinum-3-in-1-coffee-machine': 'matestar-coffee',
  'matestar-platinum-3in1-coffee-machine': 'matestar-coffee',
  'bosch-tassimo': 'bosch-tassimo',
  'bosch-tassimo-coffee-machine': 'bosch-tassimo',
  'nespresso-lattissima-touch': 'nespresso',
  'nespresso-lattissima-touch-coffee-machine': 'nespresso',
  'delonghi-coffee-maker': 'delonghi',
  'blaupunkt-coffee-maker': 'blaupunkt',
  'ufesa-supreme-barista': 'ufesa-barista',
  'ufesa-cafetera-espresso': 'ufesa-espresso',
  'kenwood-multipro-express': 'kenwood-multipro',
  'kenwood-multipro-express-food-processor': 'kenwood-multipro',
  'izzy-kitchen-machine': 'izzy-kitchen',
  'bosch-multitalent-3': 'bosch-multitalent',
  'bosch-multitalent-3-food-processor': 'bosch-multitalent',
  'kenwood-chef-kitchen-machine': 'kenwood-chef',
  'steba-air-fryer-8l': 'steba-airfryer',
};

const sourceCategories = [
  {slug: 'air-conditions', label: 'Air Conditions', department: 'appliances', category: 'Cooling'},
  {slug: 'air-cooler', label: 'Air Coolers', department: 'appliances', category: 'Cooling'},
  {slug: 'air-fryer', label: 'Air Fryers', department: 'appliances', category: 'Kitchen'},
  {slug: 'aluminum-profiles', label: 'Aluminium Profiles', department: 'lighting', category: 'Lighting'},
  {slug: 'bathroom-lights', label: 'Bathroom Lights', department: 'lighting', category: 'Lighting'},
  {slug: 'beauty-care', label: 'Beauty & Care', department: 'appliances', category: 'Beauty'},
  {slug: 'coffee-milk-frother', label: 'Coffee & Milk Frothers', department: 'appliances', category: 'Coffee'},
  {slug: 'exetrior-lights', label: 'Exterior Lights', department: 'lighting', category: 'Lighting'},
  {slug: 'fans', label: 'Fans', department: 'appliances', category: 'Cooling'},
  {slug: 'heaters', label: 'Heaters', department: 'appliances', category: 'Heating'},
  {slug: 'home-fittings', label: 'Home Fittings', department: 'appliances', category: 'Home'},
  {slug: 'hoover', label: 'Vacuum Cleaners', department: 'appliances', category: 'Cleaning'},
  {slug: 'interior-lights', label: 'Interior Lights', department: 'lighting', category: 'Lighting'},
  {slug: 'kids-lights', label: 'Kids Lights', department: 'lighting', category: 'Lighting'},
  {slug: 'blenders', label: 'Kitchen Machines', department: 'appliances', category: 'Kitchen'},
  {slug: 'led', label: 'LED Lighting', department: 'lighting', category: 'Lighting'},
  {slug: 'led-lamps', label: 'LED Bulbs', department: 'lighting', category: 'Lighting'},
  {slug: 'recessed-lights', label: 'Recessed Lights', department: 'lighting', category: 'Lighting'},
  {slug: 'rechargeable', label: 'Rechargeable Lights', department: 'lighting', category: 'Lighting'},
  {slug: 'sound-vision', label: 'Sound & Vision', department: 'appliances', category: 'Sound & Vision'},
  {slug: 'table-floor-lights', label: 'Table & Floor Lights', department: 'lighting', category: 'Lighting'},
  {slug: 'water-dispenser', label: 'Water Dispensers', department: 'appliances', category: 'Kitchen'},
];

const normalizeUrl = value => {
  try {
    const url = new URL(value, SOURCE_ORIGIN);
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
};

const productSlug = url => {
  const pathname = new URL(url).pathname;
  return decodeURIComponent(pathname.split('/').filter(Boolean).at(-1) || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

function collectProductLists(value, lists = []) {
  if (!value || typeof value !== 'object') return lists;
  if (Array.isArray(value)) {
    value.forEach(item => collectProductLists(item, lists));
    return lists;
  }
  if (value['@type'] === 'ItemList' && Array.isArray(value.itemListElement)) {
    const products = value.itemListElement.map(entry => entry?.item || entry).filter(item => item?.['@type'] === 'Product' && item?.url);
    if (products.length) lists.push(products);
  }
  Object.values(value).forEach(child => collectProductLists(child, lists));
  return lists;
}

function readProducts(html) {
  const decodeHtml = value => value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)));
  const repairEncoding = value => /[ÃÎÏ]/.test(value) ? Buffer.from(value, 'latin1').toString('utf8') : value;
  const cards = [...html.matchAll(/<li\b[^>]*data-hook=["']product-list-grid-item["'][^>]*>([\s\S]*?)<\/li>/gi)].map(match => match[1]);
  const renderedProducts = cards.flatMap(card => {
    const href = card.match(/href=["']([^"']+)["']/i)?.[1];
    const nameMarkup = card.match(/data-hook=["']product-item-name["'][^>]*>([\s\S]*?)<\/p>/i)?.[1] || '';
    const mediaUri = card.match(/&quot;uri&quot;:&quot;([^&]+)&quot;/i)?.[1] || '';
    const extension = mediaUri.split('.').at(-1)?.toLowerCase() || 'jpg';
    const outputExtension = extension === 'avif' ? 'webp' : extension;
    const image = mediaUri ? `https://static.wixstatic.com/media/${mediaUri}/v1/fit/w_800,h_800,q_90/file.${outputExtension}` : '';
    const name = repairEncoding(decodeHtml(nameMarkup.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()));
    return href && name ? [{name, url: decodeHtml(href), image, offers: {price: 0, priceCurrency: 'EUR'}}] : [];
  });
  if (renderedProducts.length) return renderedProducts;

  const scripts = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const lists = [];
  for (const match of scripts) {
    try {
      collectProductLists(JSON.parse(match[1]), lists);
    } catch {
      // Some schema blocks on the legacy Wix site are unrelated or malformed.
    }
  }
  return lists.sort((left, right) => right.length - left.length)[0] || [];
}

async function fetchCategory(slug) {
  const collected = [];
  const seen = new Set();
  for (let page = 1; page <= 80; page += 1) {
    const url = `${SOURCE_ORIGIN}/category/${slug}?page=${page}`;
    const response = await fetch(url, {headers: {'user-agent': 'NK Electrical catalogue migration/1.0'}});
    if (!response.ok) throw new Error(`${response.status} while loading ${url}`);
    const items = readProducts(await response.text());
    const fresh = items.filter(item => {
      const urlKey = normalizeUrl(item.url);
      if (!urlKey || seen.has(urlKey)) return false;
      seen.add(urlKey);
      return true;
    });
    collected.push(...fresh);
    process.stdout.write(`${slug}: page ${page}, ${collected.length} products\n`);
    if (items.length < PAGE_SIZE || fresh.length === 0) break;
  }
  return collected;
}

function inferCategory(name) {
  const value = name.toLowerCase();
  if (/light|lamp|pendant|spot|ceiling|wall|chandelier|bulb|led|recessed|profile|lantern|sconce|projector|track|garden/.test(value)) return {department: 'lighting', category: 'Lighting', label: 'Lighting'};
  if (/coffee|espresso|cafet|frother|barista|tassimo|nespresso/.test(value)) return {department: 'appliances', category: 'Coffee', label: 'Coffee'};
  if (/vacuum|hoover|steam mop|floor cleaner|robot cleaner/.test(value)) return {department: 'appliances', category: 'Cleaning', label: 'Cleaning'};
  if (/air condition|air cool|fan|cooler|humidifier|dehumidifier/.test(value)) return {department: 'appliances', category: 'Cooling', label: 'Cooling'};
  if (/heater|radiator|fireplace|heated|heating/.test(value)) return {department: 'appliances', category: 'Heating', label: 'Heating'};
  if (/hair|shaver|trimmer|straightener|dryer|toothbrush|beauty|care/.test(value)) return {department: 'appliances', category: 'Beauty', label: 'Beauty & Care'};
  if (/speaker|radio|headphone|television| tv |sound|audio|bluetooth/.test(` ${value} `)) return {department: 'appliances', category: 'Sound & Vision', label: 'Sound & Vision'};
  if (/mixer|blender|toaster|kettle|oven|fryer|juicer|chopper|processor|sandwich|grill|cooker|microwave|dispenser|kitchen/.test(value)) return {department: 'appliances', category: 'Kitchen', label: 'Kitchen Appliances'};
  return {department: 'lighting', category: 'Lighting', label: 'Lighting'};
}

function inferContext(classification) {
  if (classification.label === 'Exterior Lights') return {season: 'All year', space: 'Outdoor'};
  if (classification.label === 'Kids Lights') return {season: 'All year', space: 'Bedroom'};
  if (classification.category === 'Cooling') return {season: 'Summer', space: 'Living'};
  if (classification.category === 'Heating') return {season: 'Winter', space: 'Living'};
  if (['Kitchen', 'Coffee'].includes(classification.category)) return {season: 'All year', space: 'Kitchen'};
  if (classification.category === 'Lighting') return {season: 'All year', space: 'Living'};
  return {season: 'All year', space: 'Living'};
}

async function main() {
  const [allProducts, offerProducts, ...categoryLists] = await Promise.all([
    fetchCategory('all-products'),
    fetchCategory('offer'),
    ...sourceCategories.map(category => fetchCategory(category.slug)),
  ]);

  const membership = new Map();
  sourceCategories.forEach((category, index) => {
    categoryLists[index].forEach(item => {
      const key = normalizeUrl(item.url);
      if (!membership.has(key)) membership.set(key, category);
    });
  });
  const offers = new Set(offerProducts.map(item => normalizeUrl(item.url)));

  const generatedIds = new Set();
  const reservedIds = new Set(Object.values(curatedProductAliases));
  const products = allProducts.map((item, index) => {
    const sourceUrl = normalizeUrl(item.url);
    const classification = membership.get(sourceUrl) || inferCategory(String(item.name || 'Product'));
    const context = inferContext(classification);
    const priceValue = Number(item.offers?.price);
    const price = Number.isFinite(priceValue) && priceValue > 0 ? priceValue : null;
    const sourceSlug = productSlug(sourceUrl) || `legacy-product-${index + 1}`;
    const curatedId = curatedProductAliases[sourceSlug];
    const baseId = curatedId || (reservedIds.has(sourceSlug) ? `${sourceSlug}-legacy-source` : sourceSlug);
    let id = baseId;
    let duplicate = 2;
    while (generatedIds.has(id)) id = `${baseId}-legacy-${duplicate++}`;
    generatedIds.add(id);
    return {
      id,
      name: String(item.name || `Product ${index + 1}`).trim(),
      category: classification.category,
      season: context.season,
      space: context.space,
      image: normalizeUrl(item.image || ''),
      note: `${classification.label} available through NK Electrical. Contact our showroom for specifications and availability.`,
      department: classification.department,
      legacyCategory: classification.label,
      offer: offers.has(sourceUrl),
      sourceUrl,
      price,
      currency: price ? String(item.offers?.priceCurrency || 'EUR') : null,
    };
  });

  const offerCount = products.filter(product => product.offer).length;
  if (products.length !== 652) throw new Error(`Expected 652 products, received ${products.length}`);
  if (offerCount !== 23) throw new Error(`Expected 23 offers, received ${offerCount}`);

  await mkdir(path.dirname(OUTPUT_FILE), {recursive: true});
  await writeFile(OUTPUT_FILE, `${JSON.stringify(products, null, 2)}\n`, 'utf8');
  process.stdout.write(`Saved ${products.length} products (${offerCount} offers) to ${OUTPUT_FILE}\n`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
