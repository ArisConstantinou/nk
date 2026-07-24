import {useEffect, useMemo, useRef, useState} from 'react';
import {ArrowLeft, ArrowRight, ArrowUpRight, ExternalLink, X} from 'lucide-react';
import {Link} from 'react-router-dom';
import type {Product} from '../types';
import {isProductCutoutAsset} from '../utils/assets';
import {ProductShareActions} from './ProductShareActions';
import {ResponsiveImage} from './ResponsiveImage';

type ProductGridVariant = 'standard' | 'catalogue';

type ExpandableProductGridProps = {
  products: Product[];
  allProducts?: Product[];
  navigationProducts?: Product[];
  variant?: ProductGridVariant;
  eagerCount?: number;
};

type ExpandedProductModuleProps = {
  product: Product;
  collection: Product[];
  allProducts: Product[];
  onSelect: (product: Product) => void;
  onClose?: () => void;
  standalone?: boolean;
};

const productCategory = (product: Product) => product.legacyCategory || product.category;

function relatedProducts(product: Product, products: Product[]) {
  const seenNames = new Set<string>();
  return products
    .filter(candidate => candidate.id !== product.id)
    .map(candidate => ({
      candidate,
      score:
        (productCategory(candidate) === productCategory(product) ? 4 : 0)
        + (candidate.category === product.category ? 2 : 0)
        + (candidate.space === product.space ? 1 : 0)
        + (candidate.season === product.season ? 0.5 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .map(entry => entry.candidate)
    .filter(candidate => {
      const name = candidate.name.trim().toLocaleLowerCase();
      if (seenNames.has(name)) return false;
      seenNames.add(name);
      return true;
    })
    .slice(0, 4);
}

export function ExpandedProductModule({
  product,
  collection,
  allProducts,
  onSelect,
  onClose,
  standalone = false,
}: ExpandedProductModuleProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const sequence = collection.some(candidate => candidate.id === product.id) ? collection : allProducts;
  const index = sequence.findIndex(candidate => candidate.id === product.id);
  const previous = index > 0 ? sequence[index - 1] : undefined;
  const next = index >= 0 && index < sequence.length - 1 ? sequence[index + 1] : undefined;
  const similar = useMemo(() => relatedProducts(product, allProducts), [allProducts, product]);
  const isCutout = isProductCutoutAsset(product.image);

  useEffect(() => {
    if (!onClose) return;
    closeRef.current?.focus({preventScroll: true});
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return <article className={`product-expanded-module${standalone ? ' is-standalone' : ''}`} aria-label={`${product.name} product details`}>
    <div className="product-expanded-module__media">
      <div className={`product-expanded-module__visual ${isCutout ? 'is-cutout' : 'is-lifestyle'}`}>
        <ResponsiveImage
          src={product.image}
          alt={product.name}
          data-visual-kind="product"
          data-visual-slug={product.id}
          data-visual-path="image"
          data-visual-edit="image"
          data-visual-label="Product image"
        />
        <span>EXPANDED / PRODUCT VIEW</span>
      </div>

      <nav className="product-expanded-module__sequence" aria-label="Previous and next products">
        <button type="button" disabled={!previous} aria-label={previous ? `Previous product: ${previous.name}` : 'Start of collection'} onClick={() => previous && onSelect(previous)}>
          {previous ? <ResponsiveImage src={previous.image} alt=""/> : <span className="product-expanded-module__empty-thumb"/>}
          <span><small>Previous</small><b>{previous?.name || 'Start of collection'}</b></span>
          <ArrowLeft/>
        </button>
        <button type="button" disabled={!next} aria-label={next ? `Next product: ${next.name}` : 'End of collection'} onClick={() => next && onSelect(next)}>
          {next ? <ResponsiveImage src={next.image} alt=""/> : <span className="product-expanded-module__empty-thumb"/>}
          <span><small>Next</small><b>{next?.name || 'End of collection'}</b></span>
          <ArrowRight/>
        </button>
      </nav>
    </div>

    <div className="product-expanded-module__content">
      <div className="product-expanded-module__toolbar">
        {onClose && <button ref={closeRef} className="product-expanded-module__close" type="button" onClick={onClose} aria-label={`Close ${product.name}`}><X/><span>Close</span></button>}
        <ProductShareActions product={product}/>
      </div>

      <header>
        <div>
          <small>{productCategory(product)} · {product.season}</small>
          <h2 data-visual-kind="product" data-visual-slug={product.id} data-visual-path="$title" data-visual-edit="text" data-visual-label="Product name">{product.name}</h2>
        </div>
      </header>

      <p data-visual-kind="product" data-visual-slug={product.id} data-visual-path="note" data-visual-edit="text" data-visual-label="Product description" data-visual-multiline="true">{product.note}</p>

      <dl>
        <div><dt>Best considered for</dt><dd>{product.space}</dd></div>
        <div><dt>Season</dt><dd>{product.season}</dd></div>
        <div><dt>Available through</dt><dd>NK Electrical, Strovolos</dd></div>
      </dl>

      <div className="product-expanded-module__actions">
        <a href={`mailto:info@nk-electrical.com?subject=${encodeURIComponent(`Product enquiry: ${product.name}`)}`}>Ask about this product <ArrowUpRight/></a>
        <Link to={`/shop/product/${product.id}`}>Shareable product page <ExternalLink/></Link>
      </div>

      {similar.length > 0 && <div className="product-expanded-module__similar">
        <div><small>SIMILAR ITEMS</small><b>Continue in this collection</b></div>
        <div>{similar.map(item => <button type="button" onClick={() => onSelect(item)} key={item.id} aria-label={`Show ${item.name}`}>
          <ResponsiveImage src={item.image} alt=""/>
          <span>{item.name}</span>
        </button>)}</div>
      </div>}
    </div>

  </article>;
}

export function ExpandableProductGrid({
  products,
  allProducts = products,
  navigationProducts = products,
  variant = 'standard',
  eagerCount = 0,
}: ExpandableProductGridProps) {
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedProduct = products.find(product => product.id === selectedId)
    || allProducts.find(product => product.id === selectedId);

  useEffect(() => {
    if (anchorId && !products.some(product => product.id === anchorId)) {
      setAnchorId(null);
      setSelectedId(null);
    }
  }, [anchorId, products]);

  const openProduct = (product: Product) => {
    if (anchorId === product.id && selectedId === product.id) {
      setAnchorId(null);
      setSelectedId(null);
      return;
    }
    setAnchorId(product.id);
    setSelectedId(product.id);
  };

  const closeProduct = () => {
    const focusId = anchorId;
    setAnchorId(null);
    setSelectedId(null);
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(`[data-product-expand="${CSS.escape(focusId || '')}"]`)?.focus({preventScroll: true});
    });
  };

  const gridClass = variant === 'catalogue' ? 'catalogue-product-grid' : 'product-grid';

  return <section className={`${gridClass} product-browser-grid section`} aria-live="polite">
    {products.map((product, index) => {
      const expanded = anchorId === product.id && selectedProduct;
      if (expanded) return <div className="product-browser-card-shell is-expanded" key={product.id}>
        <ExpandedProductModule
          product={selectedProduct}
          collection={navigationProducts}
          allProducts={allProducts}
          onSelect={item => setSelectedId(item.id)}
          onClose={closeProduct}
        />
      </div>;

      if (variant === 'catalogue') return <article className="catalogue-product-card-shell product-browser-card-shell" key={product.id}>
        <div className="catalogue-product-card">
          <button
            className={`catalogue-product-card__image product-expand-trigger${isProductCutoutAsset(product.image) ? ' catalogue-product-card__image--cutout' : ' catalogue-product-card__image--photo'}`}
            type="button"
            data-product-expand={product.id}
            aria-expanded="false"
            aria-label={`Expand ${product.name}`}
            onClick={() => openProduct(product)}
          >
            <ResponsiveImage
              loading={index < eagerCount ? 'eager' : 'lazy'}
              src={product.image}
              alt={product.name}
              data-visual-kind="product"
              data-visual-slug={product.id}
              data-visual-path="image"
              data-visual-edit="image"
              data-visual-label="Product image"
            />
            {product.offer && <span className="catalogue-offer-badge">Offer</span>}
            <i>Expand details <ArrowUpRight/></i>
          </button>
          <div className="catalogue-product-card__copy">
            <small>{productCategory(product)}</small>
            <h2 data-visual-kind="product" data-visual-slug={product.id} data-visual-path="$title" data-visual-edit="text" data-visual-label="Product name">{product.name}</h2>
            <p>{product.note}</p>
            <button type="button" onClick={() => openProduct(product)}>Open product <ArrowRight/></button>
          </div>
        </div>
        <ProductShareActions product={product}/>
      </article>;

      return <article className="product-card-share-shell product-browser-card-shell" key={product.id}>
        <div className="product-card">
          <button
            className={`product-image product-expand-trigger${isProductCutoutAsset(product.image) ? ' product-image--cutout' : ' product-image--photo'}`}
            type="button"
            data-product-expand={product.id}
            aria-expanded="false"
            aria-label={`Expand ${product.name}`}
            onClick={() => openProduct(product)}
          >
            <ResponsiveImage
              src={product.image}
              alt={product.name}
              loading={index < eagerCount ? 'eager' : 'lazy'}
              decoding="async"
              data-visual-kind="product"
              data-visual-slug={product.id}
              data-visual-path="image"
              data-visual-edit="image"
              data-visual-label="Product image"
            />
            <span>Expand details <ArrowUpRight/></span>
          </button>
          <div className="product-info">
            <small>{product.category} · {product.season}</small>
            <h3 data-visual-kind="product" data-visual-slug={product.id} data-visual-path="$title" data-visual-edit="text" data-visual-label="Product name">{product.name}</h3>
            <p data-visual-kind="product" data-visual-slug={product.id} data-visual-path="note" data-visual-edit="text" data-visual-label="Product description" data-visual-multiline="true">{product.note}</p>
            <button type="button" onClick={() => openProduct(product)}>Open product <ArrowRight/></button>
          </div>
        </div>
        <ProductShareActions product={product}/>
      </article>;
    })}
  </section>;
}
