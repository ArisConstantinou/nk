import {useEffect, useMemo, useState} from 'react';
import {ArrowRight, ArrowUpRight, BadgePercent, FileText, Package, Search, SlidersHorizontal, Sparkles} from 'lucide-react';
import {Link, useLocation, useParams} from 'react-router-dom';
import {useContent} from '../context/ContentContext';
import {ExpandableProductGrid} from '../components/ExpandableProductGrid';
import {
  CompactProductFilters,
  type ProductFilterKey,
  type ProductFilterSegment,
  type ProductFilterSelections,
} from '../components/CompactProductFilters';
import {pageVisualForPath} from '../pageVisuals';
import {publicAsset} from '../utils/assets';

function CatalogueHeroWords({text}: {text: string}) {
  const words = text.trim().split(/\s+/);
  return <>{words.map((word, index) => <span className="catalogue-hero__word" data-word-index={index} key={`${word}-${index}`}>{word}{index < words.length - 1 ? ' ' : null}</span>)}</>;
}

export function ModernShopCategoryPage() {
  const {category = ''} = useParams();
  const location = useLocation();
  const {content} = useContent();
  const isLighting = category === 'lighting';
  const isAppliances = category === 'appliances';
  const isOffers = category === 'offers';
  const [query, setQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<ProductFilterSelections>({category: [], space: [], season: []});
  const [openFilter, setOpenFilter] = useState<ProductFilterKey | null>(null);
  const [visibleCount, setVisibleCount] = useState(36);
  const mode = isOffers ? 'offers' : isLighting ? 'lighting' : 'appliances';
  const pageVisual = pageVisualForPath(location.pathname);

  const collection = useMemo(() => content.products.filter(product => {
    const department = product.department || (product.category === 'Lighting' ? 'lighting' : 'appliances');
    return isOffers ? product.offer === true : department === mode;
  }), [content.products, isOffers, mode]);
  const categories = useMemo(() => [...new Set(collection.map(product => product.legacyCategory || product.category))], [collection]);
  const filterSegments = useMemo<ProductFilterSegment[]>(() => [
    {key: 'category', label: 'Collection', index: '01', options: categories},
    {key: 'space', label: 'Space', index: '02', options: [...new Set(collection.map(product => product.space).filter(Boolean))]},
    {key: 'season', label: 'Season', index: '03', options: [...new Set(collection.map(product => product.season).filter(Boolean))]},
  ], [categories, collection]);
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return collection.filter(product => {
      const productCategory = product.legacyCategory || product.category;
      return (selectedFilters.category.length === 0 || selectedFilters.category.includes(productCategory))
        && (selectedFilters.space.length === 0 || selectedFilters.space.includes(product.space))
        && (selectedFilters.season.length === 0 || selectedFilters.season.includes(product.season))
        && (!term || `${product.name} ${productCategory} ${product.note}`.toLocaleLowerCase().includes(term));
    });
  }, [collection, query, selectedFilters]);
  const shown = filtered.slice(0, visibleCount);
  const filterSignature = filterSegments.map(({key}) => selectedFilters[key].join('|')).join('::');

  useEffect(() => setVisibleCount(36), [category, query, filterSignature]);
  useEffect(() => {
    setQuery('');
    setSelectedFilters({category: [], space: [], season: []});
    setOpenFilter(null);
  }, [category]);

  if (!isLighting && !isAppliances && !isOffers) return <section className="not-found"><span>Category not found</span><h1>This shop category has moved.</h1><Link to="/shop">View all products</Link></section>;

  const title = isOffers ? 'Current offers,' : isLighting ? 'Lighting, considered' : 'Appliances for';
  const accent = isOffers ? 'made easier to explore.' : isLighting ? 'room by room.' : 'everyday living.';
  const intro = isOffers
    ? 'A complete, visual edit of every current NK Electrical offer. Browse the full collection and ask our showroom about availability.'
    : isLighting
      ? 'Decorative, architectural and practical lighting brought into one searchable collection.'
      : 'Cooling, kitchen, cleaning, coffee, heating, beauty and home products grouped where you expect to find them.';

  return <>
    <section className={`catalogue-hero catalogue-hero--${mode} section`} data-hero-composition={pageVisual?.composition}>
      <div className="catalogue-hero__copy">
        <span><Sparkles/> {pageVisual?.serial || `SHOP / ${isOffers ? 'LIVE OFFERS' : mode.toUpperCase()}`}</span>
        <h1 aria-label={`${title} ${accent}`}><span className="catalogue-hero__title-line"><CatalogueHeroWords text={title}/></span><em><CatalogueHeroWords text={accent}/></em></h1>
        <p>{intro}</p>
        <div className="catalogue-hero__facts"><strong>{collection.length}<small>{isOffers ? 'active offers' : 'products'}</small></strong><strong>{categories.length}<small>collections</small></strong><strong>01<small>local showroom</small></strong></div>
      </div>
      <div className="catalogue-hero__visual">
        {pageVisual && <figure className="catalogue-hero__campaign"><img src={publicAsset(pageVisual.image)} alt={pageVisual.alt} fetchPriority="high" style={{objectPosition: pageVisual.position}}/><figcaption><small>{pageVisual.label}</small><strong>{pageVisual.signal}</strong></figcaption></figure>}
        <div className="catalogue-hero__seal">{isOffers ? <BadgePercent/> : <Package/>}<b>NK</b><small>CURATED<br/>COLLECTION</small></div>
      </div>
      {pageVisual && <div className="catalogue-hero__ornament" aria-hidden="true"><span>{pageVisual.serial}</span><i/><i/><b/></div>}
    </section>

    <section className="filter-shell compact-product-filters category-product-filters section" aria-label="Product filters">
      <label className="catalogue-search"><Search/><span className="sr-only">Search products</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${isOffers ? 'offers' : mode}…`}/>{query && <button type="button" onClick={() => setQuery('')}>Clear</button>}</label>
      <div className="catalogue-filter-heading">
        <span><SlidersHorizontal/> Refine the collection</span>
        <b>{filtered.length} {filtered.length === 1 ? 'result' : 'results'}</b>
        <Link className="shop-find-all" to="/shop?view=all">Find all products <ArrowRight/></Link>
      </div>
      <CompactProductFilters
        segments={filterSegments}
        selections={selectedFilters}
        openFilter={openFilter}
        onOpenFilterChange={setOpenFilter}
        onToggle={(key, value) => setSelectedFilters(current => {
          const selected = current[key];
          const values = value === 'All'
            ? []
            : selected.includes(value)
              ? selected.filter(currentValue => currentValue !== value)
              : [...selected, value];
          return {...current, [key]: values};
        })}
        onClear={() => setSelectedFilters({category: [], space: [], season: []})}
        idPrefix={`${mode}-product-filter`}
      />
    </section>

    <ExpandableProductGrid products={shown} navigationProducts={filtered} allProducts={content.products} variant="catalogue" eagerCount={8}/>

    {filtered.length === 0 && <section className="catalogue-empty section"><Search/><h2>No products match that search.</h2><p>Try a shorter name or return to all collections.</p><button type="button" onClick={() => {setQuery(''); setSelectedFilters({category: [], space: [], season: []});}}>Clear filters</button></section>}
    {shown.length < filtered.length && <section className="catalogue-load-more section"><span>Showing {shown.length} of {filtered.length}</span><button type="button" onClick={() => setVisibleCount(count => count + 36)}>Load more products <ArrowRight/></button></section>}

    <section className="catalogue-help-strip section"><div><FileText/><span><small>NEED A SPECIFICATION?</small><b>Ask the showroom about any product.</b></span></div><a href="mailto:info@nk-electrical.com?subject=Product%20availability%20enquiry">Send a product enquiry <ArrowUpRight/></a><Link to="/shop/catalogues">Open catalogues <ArrowRight/></Link></section>
  </>;
}
