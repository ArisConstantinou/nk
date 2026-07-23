import {useEffect, useMemo, useState} from 'react';
import {ArrowRight, ArrowUpRight, BadgePercent, ChevronDown, FileText, Package, Search, SlidersHorizontal, Sparkles} from 'lucide-react';
import {Link, useLocation, useParams} from 'react-router-dom';
import {useContent} from '../context/ContentContext';
import {ProductShareActions} from '../components/ProductShareActions';
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
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [visibleCount, setVisibleCount] = useState(36);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const mode = isOffers ? 'offers' : isLighting ? 'lighting' : 'appliances';
  const pageVisual = pageVisualForPath(location.pathname);

  const collection = useMemo(() => content.products.filter(product => {
    const department = product.department || (product.category === 'Lighting' ? 'lighting' : 'appliances');
    return isOffers ? product.offer === true : department === mode;
  }), [content.products, isOffers, mode]);
  const categories = useMemo(() => ['All', ...new Set(collection.map(product => product.legacyCategory || product.category))], [collection]);
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return collection.filter(product => {
      const productCategory = product.legacyCategory || product.category;
      return (selectedCategory === 'All' || productCategory === selectedCategory)
        && (!term || `${product.name} ${productCategory} ${product.note}`.toLocaleLowerCase().includes(term));
    });
  }, [collection, query, selectedCategory]);
  const shown = filtered.slice(0, visibleCount);

  useEffect(() => setVisibleCount(36), [category, query, selectedCategory]);

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
        <div className="catalogue-hero__facts"><strong>{collection.length}<small>{isOffers ? 'active offers' : 'products'}</small></strong><strong>{Math.max(0, categories.length - 1)}<small>collections</small></strong><strong>01<small>local showroom</small></strong></div>
      </div>
      <div className="catalogue-hero__visual">
        {pageVisual && <figure className="catalogue-hero__campaign"><img src={publicAsset(pageVisual.image)} alt={pageVisual.alt} fetchPriority="high" style={{objectPosition: pageVisual.position}}/><figcaption><small>{pageVisual.label}</small><strong>{pageVisual.signal}</strong></figcaption></figure>}
        <div className="catalogue-hero__seal">{isOffers ? <BadgePercent/> : <Package/>}<b>NK</b><small>CURATED<br/>COLLECTION</small></div>
      </div>
      {pageVisual && <div className="catalogue-hero__ornament" aria-hidden="true"><span>{pageVisual.serial}</span><i/><i/><b/></div>}
    </section>

    <section className="catalogue-controls section" aria-label="Product filters">
      <label className="catalogue-search"><Search/><span className="sr-only">Search products</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${isOffers ? 'offers' : mode}…`}/>{query && <button type="button" onClick={() => setQuery('')}>Clear</button>}</label>
      <button
        type="button"
        className={`catalogue-mobile-filter-toggle${filtersOpen ? ' is-open' : ''}`}
        aria-expanded={filtersOpen}
        aria-controls="catalogue-mobile-filter-panel"
        onClick={() => setFiltersOpen(open => !open)}
      >
        <span><SlidersHorizontal/><span><small>Filter by collection</small><strong>{selectedCategory}</strong></span></span>
        <b>{filtered.length} {filtered.length === 1 ? 'result' : 'results'}</b>
        <ChevronDown/>
      </button>
      <div id="catalogue-mobile-filter-panel" className={`catalogue-mobile-filter-panel${filtersOpen ? ' is-mobile-open' : ''}`}>
        <div className="catalogue-filter-heading"><span><SlidersHorizontal/> Browse by collection</span><b>{filtered.length} {filtered.length === 1 ? 'result' : 'results'}</b></div>
        <div className="catalogue-filter-chips">{categories.map(value => <button type="button" aria-pressed={selectedCategory === value} className={selectedCategory === value ? 'active' : ''} onClick={() => setSelectedCategory(value)} key={value}>{value}</button>)}</div>
        <div className="catalogue-mobile-filter-actions">
          <button type="button" disabled={selectedCategory === 'All'} onClick={() => setSelectedCategory('All')}>Clear</button>
          <button type="button" onClick={() => setFiltersOpen(false)}>Show {filtered.length} products <ArrowRight/></button>
        </div>
      </div>
    </section>

    <section className="catalogue-product-grid section" aria-live="polite">
      {shown.map((product, index) => <article className="catalogue-product-card-shell" key={product.id}>
        <Link to={`/shop/product/${product.id}`} className="catalogue-product-card">
          <div className="catalogue-product-card__image"><img loading={index < 8 ? 'eager' : 'lazy'} src={product.image} alt={product.name} data-visual-kind="product" data-visual-slug={product.id} data-visual-path="image" data-visual-edit="image" data-visual-label="Product image"/>{product.offer && <span className="catalogue-offer-badge"><BadgePercent/> Offer</span>}<i>View details <ArrowUpRight/></i></div>
          <div className="catalogue-product-card__copy"><small>{product.legacyCategory || product.category}</small><h2 data-visual-kind="product" data-visual-slug={product.id} data-visual-path="$title" data-visual-edit="text" data-visual-label="Product name">{product.name}</h2><p>{product.note}</p><span>Product {String(index + 1).padStart(2, '0')} <ArrowRight/></span></div>
        </Link>
        <ProductShareActions product={product}/>
      </article>)}
    </section>

    {filtered.length === 0 && <section className="catalogue-empty section"><Search/><h2>No products match that search.</h2><p>Try a shorter name or return to all collections.</p><button type="button" onClick={() => {setQuery(''); setSelectedCategory('All');}}>Clear filters</button></section>}
    {shown.length < filtered.length && <section className="catalogue-load-more section"><span>Showing {shown.length} of {filtered.length}</span><button type="button" onClick={() => setVisibleCount(count => count + 36)}>Load more products <ArrowRight/></button></section>}

    <section className="catalogue-help-strip section"><div><FileText/><span><small>NEED A SPECIFICATION?</small><b>Ask the showroom about any product.</b></span></div><a href="mailto:info@nk-electrical.com?subject=Product%20availability%20enquiry">Send a product enquiry <ArrowUpRight/></a><Link to="/shop/catalogues">Open catalogues <ArrowRight/></Link></section>
  </>;
}
