import {lazy, Suspense, useEffect, useState} from 'react';
import {BrowserRouter, Navigate, Route, Routes, useParams} from 'react-router-dom';
import {Layout} from './components/Layout';
import {ContentProvider} from './context/ContentContext';
import {ThemeProvider, useTheme} from './context/ThemeContext';
import {AboutPage, AppliancesPage, ContactPage, ElectricalInstallationsPage, ExplorePage, LightingPage, NotFound, ProductPage, ProjectsPage} from './pages/PublicPages';

const DesktopHome = lazy(() => import('./pages/desktop/DesktopHome'));
const MobileHome = lazy(() => import('./pages/mobile/MobileHome'));
const ElectricalHome = lazy(() => import('./pages/electrical/ElectricalHome'));
const CurrentHome = lazy(() => import('./pages/current/CurrentHome'));
const Admin = lazy(() => import('./pages/Admin'));

function Home() {
  const {experienceTheme} = useTheme();
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 720px)').matches);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 720px)');
    const update = () => setMobile(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return <Suspense fallback={<div className="route-loader">Connecting the space…</div>}>
    {experienceTheme === 'flow' ? <CurrentHome/> : experienceTheme === 'tech' ? <ElectricalHome/> : mobile ? <MobileHome/> : <DesktopHome/>}
  </Suspense>;
}

const Public = ({children}: {children: React.ReactNode}) => <Layout>{children}</Layout>;
const routerBase = import.meta.env.BASE_URL === '/' ? '/' : import.meta.env.BASE_URL.replace(/\/$/, '');

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
  return <Navigate to={productId ? `/product/${productId}` : '/explore'} replace/>;
}

export default function App() {
  return <ThemeProvider><ContentProvider><BrowserRouter basename={routerBase}><Routes>
    <Route path="/" element={<Public><Home/></Public>}/>
    <Route path="/about" element={<Public><AboutPage/></Public>}/>
    <Route path="/projects" element={<Public><ProjectsPage/></Public>}/>
    <Route path="/electrical-installations" element={<Public><ElectricalInstallationsPage/></Public>}/>
    <Route path="/explore" element={<Public><ExplorePage/></Public>}/>
    <Route path="/lighting" element={<Public><LightingPage/></Public>}/>
    <Route path="/appliances" element={<Public><AppliancesPage/></Public>}/>
    <Route path="/contact" element={<Public><ContactPage/></Public>}/>
    <Route path="/product/:id" element={<Public><ProductPage/></Public>}/>
    <Route path="/admin" element={<Suspense fallback={<div className="route-loader">Opening studio…</div>}><Admin/></Suspense>}/>

    <Route path="/projects-1" element={<Navigate to="/projects" replace/>}/>
    <Route path="/solutions" element={<Navigate to="/electrical-installations" replace/>}/>
    <Route path="/electrical-appliances" element={<Navigate to="/appliances" replace/>}/>
    <Route path="/products" element={<Navigate to="/explore" replace/>}/>
    <Route path="/category/all-products" element={<Navigate to="/explore" replace/>}/>
    <Route path="/services" element={<Navigate to="/electrical-installations" replace/>}/>
    <Route path="/systems" element={<Navigate to="/electrical-installations#smart" replace/>}/>
    <Route path="/smart-home" element={<Navigate to="/electrical-installations#smart" replace/>}/>
    <Route path="/about-1" element={<Navigate to="/electrical-installations#smart" replace/>}/>
    <Route path="/about-1-1" element={<Navigate to="/electrical-installations#smart" replace/>}/>
    <Route path="/electrical-equipment" element={<Navigate to="/electrical-installations" replace/>}/>
    <Route path="/clients-1" element={<Navigate to="/projects" replace/>}/>
    <Route path="/developers" element={<Navigate to="/projects" replace/>}/>
    <Route path="/product-page/:slug" element={<LegacyProductRedirect/>}/>
    <Route path="*" element={<Public><NotFound/></Public>}/>
  </Routes></BrowserRouter></ContentProvider></ThemeProvider>;
}
