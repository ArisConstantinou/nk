import {Component, lazy, Suspense, type ErrorInfo, type ReactNode} from 'react';
import {BrowserRouter, Navigate, Route, Routes, useParams} from 'react-router-dom';
import {ElectricalLayout} from './components/ElectricalLayout';
import {ContentProvider} from './context/ContentContext';
import {AboutPage, ContactPage, ExplorePage, LightingPage, NotFound, ProductPage, ProjectsPage} from './pages/PublicPages';
import {QuotePage, ServiceDetailPage, ServicesPage, ShopCategoryPage} from './pages/ArchitecturePages';
import {GuidedDemoPage} from './pages/GuidedDemoPage';

const Admin = lazy(() => import('./pages/Admin'));
const ElectricalHome = lazy(() => import('./pages/electrical/ElectricalHome'));
const Public = ({children}: {children: React.ReactNode}) => <ElectricalLayout>{children}</ElectricalLayout>;
const routerBase = import.meta.env.BASE_URL === '/' ? '/' : import.meta.env.BASE_URL.replace(/\/$/, '');

class PublicRenderBoundary extends Component<{children: ReactNode}, {error: Error | null}> {
  state: {error: Error | null} = {error: null};
  static getDerivedStateFromError(error: Error) {return {error};}
  componentDidCatch(error: Error, info: ErrorInfo) {
    if (new URLSearchParams(window.location.search).has('visualEditor')) console.error('Visual preview render failed', error, info);
  }
  render() {
    if (!this.state.error) return this.props.children;
    const preview = new URLSearchParams(window.location.search).has('visualEditor');
    return <main className="route-loader" role="alert">{preview ? `Preview error: ${this.state.error.message}` : 'The page could not be displayed. Please refresh and try again.'}</main>;
  }
}

const legacyProducts: Record<string, string> = {
  'oia-pendant-light': 'oia', 'fame-pendant-lights': 'fame', 'neri-led-surface-liners': 'neri', 'polo-wall-light': 'polo', 'el-led-ceiling-light': 'el-led', 'ragno-pendant-light': 'ragno',
  'filomena-black': 'filomena-black', 'filomena-gold': 'filomena-gold', 'nova-led-ceiling-light': 'nova', 'zoella-gold': 'zoella', '30-ceiling-fan': 'ceiling-fan',
  'izzy-3-in-1-coffee-machine': 'izzy-coffee', 'izzy-3in1-coffee-machine': 'izzy-coffee', 'matestar-platinum-3-in-1-coffee-machine': 'matestar-coffee',
  'bosch-tassimo': 'bosch-tassimo', 'nespresso-lattissima-touch': 'nespresso', 'delonghi-coffee-maker': 'delonghi', 'blaupunkt-coffee-maker': 'blaupunkt',
  'ufesa-supreme-barista': 'ufesa-barista', 'ufesa-cafetera-espresso': 'ufesa-espresso', 'kenwood-multipro-express': 'kenwood-multipro',
  'izzy-kitchen-machine': 'izzy-kitchen', 'bosch-multitalent-3': 'bosch-multitalent', 'kenwood-chef-kitchen-machine': 'kenwood-chef', 'steba-air-fryer-8l': 'steba-airfryer',
};

function LegacyProductRedirect() {
  const {slug = ''} = useParams();
  const productId = legacyProducts[slug.toLowerCase()];
  return <Navigate to={productId ? `/shop/product/${productId}` : '/shop'} replace/>;
}

function LegacyProductIdRedirect() {
  const {id = ''} = useParams();
  return <Navigate to={`/shop/product/${id}`} replace/>;
}

export default function App() {
  return <PublicRenderBoundary><ContentProvider><BrowserRouter basename={routerBase}><Routes>
    <Route path="/" element={<Public><Suspense fallback={<div className="route-loader">Connecting systems…</div>}><ElectricalHome/></Suspense></Public>}/>
    <Route path="/services" element={<Public><ServicesPage/></Public>}/>
    <Route path="/services/:service" element={<Public><ServiceDetailPage/></Public>}/>
    <Route path="/shop" element={<Public><ExplorePage/></Public>}/>
    <Route path="/shop/catalogues" element={<Public><LightingPage/></Public>}/>
    <Route path="/shop/:category" element={<Public><ShopCategoryPage/></Public>}/>
    <Route path="/shop/product/:id" element={<Public><ProductPage/></Public>}/>
    <Route path="/projects" element={<Public><ProjectsPage/></Public>}/>
    <Route path="/about" element={<Public><AboutPage/></Public>}/>
    <Route path="/contact" element={<Public><ContactPage/></Public>}/>
    <Route path="/request-a-quote" element={<Public><QuotePage/></Public>}/>
    <Route path="/pages/:slug" element={<GuidedDemoPage/>}/>
    <Route path="/_cms-guide/:slug" element={<GuidedDemoPage/>}/>
    <Route path="/admin/*" element={<Suspense fallback={<div className="route-loader">Opening admin…</div>}><Admin/></Suspense>}/>

    <Route path="/electrical-installations" element={<Navigate to="/services/electrical-installations" replace/>}/>
    <Route path="/lighting" element={<Navigate to="/services/lighting-design" replace/>}/>
    <Route path="/appliances" element={<Navigate to="/shop/appliances" replace/>}/>
    <Route path="/explore" element={<Navigate to="/shop" replace/>}/>
    <Route path="/products" element={<Navigate to="/shop" replace/>}/>
    <Route path="/category/all-products" element={<Navigate to="/shop" replace/>}/>
    <Route path="/systems" element={<Navigate to="/services/smart-home-automation" replace/>}/>
    <Route path="/smart-home" element={<Navigate to="/services/smart-home-automation" replace/>}/>
    <Route path="/solutions" element={<Navigate to="/services" replace/>}/>
    <Route path="/electrical-equipment" element={<Navigate to="/shop" replace/>}/>
    <Route path="/projects-1" element={<Navigate to="/projects" replace/>}/>
    <Route path="/clients-1" element={<Navigate to="/projects" replace/>}/>
    <Route path="/developers" element={<Navigate to="/projects" replace/>}/>
    <Route path="/about-1" element={<Navigate to="/about" replace/>}/>
    <Route path="/about-1-1" element={<Navigate to="/about" replace/>}/>
    <Route path="/product/:id" element={<LegacyProductIdRedirect/>}/>
    <Route path="/product-page/:slug" element={<LegacyProductRedirect/>}/>
    <Route path="*" element={<Public><NotFound/></Public>}/>
  </Routes></BrowserRouter></ContentProvider></PublicRenderBoundary>;
}
