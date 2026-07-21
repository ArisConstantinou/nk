import {useEffect, useMemo, useRef, useState, type FormEvent} from 'react';
import L, {type Layer, type Map as LeafletMap, type Marker, type TileLayer} from 'leaflet';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Car,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Crosshair,
  ExternalLink,
  Footprints,
  Gauge,
  Lightbulb,
  LoaderCircle,
  Mail,
  Map as MapIcon,
  MapPin,
  Minus,
  Navigation,
  Phone,
  Plus,
  Route,
  Satellite,
  ShieldAlert,
  Sparkles,
  Store,
  type LucideIcon,
} from 'lucide-react';
import {useContent, type PublicFormField, type SiteOpeningHours, type SiteSocialLink} from '../context/ContentContext';
import {publicAsset} from '../utils/assets';
import {ContactSignalPlayer} from './ContactSignalPlayer';

const DESTINATION = {lat: 35.146624, lng: 33.331543};
const NICOSIA_CENTRE = {lat: 35.17, lng: 33.365};
const CONTACT_ASSET = publicAsset('assets/generated/contact-routing-workbench-v1.webp');

type IntentId = 'project' | 'fault' | 'visit' | 'product';
type TravelMode = 'driving' | 'walking';
type ContactIntent = {
  id: IntentId;
  code: string;
  label: string;
  title: string;
  description: string;
  subjectMatch: RegExp;
  Icon: LucideIcon;
};

const intents: ContactIntent[] = [
  {
    id: 'project',
    code: '01 / PLAN',
    label: 'Start a project',
    title: 'Route a new requirement.',
    description: 'Share the property, scope and timing. We will direct it to the right technical person.',
    subjectMatch: /new electrical project|project/i,
    Icon: Building2,
  },
  {
    id: 'fault',
    code: '02 / RESTORE',
    label: 'Electrical fault',
    title: 'Get the symptoms to support.',
    description: 'For a dangerous or urgent electrical condition, call first. You can still send the detail here.',
    subjectMatch: /support|fault|maintenance/i,
    Icon: ShieldAlert,
  },
  {
    id: 'visit',
    code: '03 / ARRIVE',
    label: 'Visit the showroom',
    title: 'Plan the route before leaving.',
    description: 'See live opening status, preview the journey and open turn-by-turn directions.',
    subjectMatch: /lighting selection|appliance enquiry|showroom/i,
    Icon: Store,
  },
  {
    id: 'product',
    code: '04 / SELECT',
    label: 'Product question',
    title: 'Send the useful product context.',
    description: 'Mention the product, catalogue code, quantity or room so the enquiry reaches the right desk.',
    subjectMatch: /appliance enquiry|lighting selection|product/i,
    Icon: Lightbulb,
  },
];

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type DayWindow = {open: number; close: number};

const parseHours = (schedules: SiteOpeningHours[]) => {
  const windows = new Map<number, DayWindow>();
  const source = schedules.map(item => item.hours).join('\n');
  source.split('\n').map(line => line.trim()).filter(Boolean).forEach(line => {
    const divider = line.indexOf(':');
    if (divider < 0) return;
    const days = line.slice(0, divider).split(',').map(day => day.trim().toLowerCase());
    const range = line.slice(divider + 1).trim();
    const match = range.match(/(\d{1,2}):(\d{2})\s*[–—-]\s*(\d{1,2}):(\d{2})/);
    if (!match) return;
    const window = {
      open: Number(match[1]) * 60 + Number(match[2]),
      close: Number(match[3]) * 60 + Number(match[4]),
    };
    days.forEach(day => {
      const index = dayNames.findIndex(name => name.toLowerCase().startsWith(day.slice(0, 3)));
      if (index >= 0) windows.set(index, window);
    });
  });
  return windows;
};

const timeLabel = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

function useOpeningSignal(schedules: SiteOpeningHours[]) {
  const [now, setNow] = useState(() => new Date());
  const windows = useMemo(() => parseHours(schedules), [schedules]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return useMemo(() => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Nicosia',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const weekday = parts.find(part => part.type === 'weekday')?.value || 'Monday';
    const hour = Number(parts.find(part => part.type === 'hour')?.value || 0);
    const minute = Number(parts.find(part => part.type === 'minute')?.value || 0);
    const dayIndex = dayNames.indexOf(weekday);
    const currentMinutes = hour * 60 + minute;
    const today = windows.get(dayIndex);
    const cyprusTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    if (today && currentMinutes >= today.open && currentMinutes < today.close) {
      return {
        open: true,
        headline: `Open now · until ${timeLabel(today.close)}`,
        detail: `Cyprus time ${cyprusTime}`,
        suggestion: currentMinutes + 45 < today.close ? `A practical visit window is after ${timeLabel(Math.max(currentMinutes + 30, today.open + 30))}.` : 'Call before travelling close to closing time.',
      };
    }

    if (today && currentMinutes < today.open) {
      return {
        open: false,
        headline: `Closed · opens today at ${timeLabel(today.open)}`,
        detail: `Cyprus time ${cyprusTime}`,
        suggestion: `A practical visit window is around ${timeLabel(today.open + 30)}.`,
      };
    }

    for (let offset = 1; offset <= 7; offset += 1) {
      const nextIndex = (dayIndex + offset) % 7;
      const next = windows.get(nextIndex);
      if (next) {
        return {
          open: false,
          headline: `Closed · opens ${dayNames[nextIndex]} at ${timeLabel(next.open)}`,
          detail: `Cyprus time ${cyprusTime}`,
          suggestion: `A practical visit window is ${dayNames[nextIndex]} around ${timeLabel(next.open + 30)}.`,
        };
      }
    }

    return {
      open: false,
      headline: 'Check opening hours before travelling',
      detail: `Cyprus time ${cyprusTime}`,
      suggestion: 'Call the showroom before starting your journey.',
    };
  }, [now, windows]);
}

const valueIsEmpty = (value: string | boolean | undefined) => typeof value === 'boolean' ? !value : !String(value || '').trim();

function ContactRouterForm({intent, prefillMessage}: {intent: ContactIntent; prefillMessage: string}) {
  const {formBySlug, submitForm} = useContent();
  const form = formBySlug('contact');
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const statusRef = useRef<HTMLParagraphElement>(null);
  const activeFields = useMemo(() => form?.fields.filter(field => field.active) || [], [form]);
  const contactFields = activeFields.filter(field => !['select', 'textarea', 'checkbox'].includes(field.type));
  const briefFields = activeFields.filter(field => ['select', 'textarea', 'checkbox'].includes(field.type));

  useEffect(() => {
    if (!form) return;
    setValues(current => {
      const next = {...current};
      activeFields.forEach(field => {
        if (next[field.name] === undefined) next[field.name] = field.type === 'checkbox' ? false : '';
      });
      const subject = activeFields.find(field => field.type === 'select' || field.name === 'subject');
      if (subject) {
        next[subject.name] = subject.options.find(option => intent.subjectMatch.test(option))
          || subject.options[0]
          || '';
      }
      const message = activeFields.find(field => field.type === 'textarea' || field.name === 'message');
      if (message && prefillMessage && !String(next[message.name] || '').trim()) next[message.name] = prefillMessage;
      return next;
    });
    setStep(1);
    setError('');
    setSuccess('');
  }, [activeFields, form, intent, prefillMessage]);

  const update = (field: PublicFormField, value: string | boolean) => {
    setValues(current => ({...current, [field.name]: value}));
    setError('');
  };

  const validate = (fields: PublicFormField[]) => {
    const missing = fields.find(field => field.required && valueIsEmpty(values[field.name]));
    if (!missing) return true;
    setError(`Please complete “${missing.label}” before continuing.`);
    return false;
  };

  const advance = () => {
    const fields = step === 1 ? contactFields : briefFields;
    if (!validate(fields)) return;
    setStep(current => Math.min(3, current + 1));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form || !validate(activeFields)) return;
    setBusy(true);
    setError('');
    try {
      const payload: Record<string, string | boolean> = {website: ''};
      activeFields.forEach(field => { payload[field.name] = values[field.name] ?? (field.type === 'checkbox' ? false : ''); });
      setSuccess(await submitForm('contact', payload));
      setStep(3);
      window.requestAnimationFrame(() => statusRef.current?.focus());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'The enquiry could not be submitted.');
    } finally {
      setBusy(false);
    }
  };

  const renderField = (field: PublicFormField) => {
    const value = values[field.name] ?? (field.type === 'checkbox' ? false : '');
    if (field.type === 'textarea') return <label className="contact-router-field contact-router-field--wide" key={field.id}>
      <span>{field.label}{field.required && <b>Required</b>}</span>
      <textarea name={field.name} rows={7} required={field.required} maxLength={5000} disabled={busy} placeholder={field.placeholder || 'Property, requirement, useful product details or fault symptoms…'} value={String(value)} onChange={event => update(field, event.target.value)}/>
    </label>;
    if (field.type === 'select') return <label className="contact-router-field contact-router-field--wide" key={field.id}>
      <span>{field.label}{field.required && <b>Required</b>}</span>
      <select name={field.name} required={field.required} disabled={busy} value={String(value)} onChange={event => update(field, event.target.value)}>
        {field.options.map(option => <option key={option}>{option}</option>)}
      </select>
    </label>;
    if (field.type === 'checkbox') return <label className="contact-router-check contact-router-field--wide" key={field.id}>
      <input name={field.name} type="checkbox" required={field.required} disabled={busy} checked={Boolean(value)} onChange={event => update(field, event.target.checked)}/>
      <span><Check/>{field.placeholder || field.label}</span>
    </label>;
    return <label className="contact-router-field" key={field.id}>
      <span>{field.label}{field.required && <b>Required</b>}</span>
      <input
        name={field.name}
        type={field.type}
        required={field.required}
        maxLength={500}
        disabled={busy}
        placeholder={field.placeholder}
        value={String(value)}
        autoComplete={field.name === 'name' ? 'name' : field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : undefined}
        onChange={event => update(field, event.target.value)}
      />
    </label>;
  };

  if (!form) return <div className="contact-router-form contact-router-form--unavailable" role="status">
    <Sparkles/><h3>The digital enquiry route is loading.</h3><p>You can call or email immediately using the direct channels below.</p>
  </div>;

  return <form className={`contact-router-form contact-router-form--${intent.id}`} onSubmit={submit} aria-busy={busy}>
    <header>
      <div><small>GUIDED ENQUIRY / {intent.code}</small><h3>{intent.title}</h3><p>{intent.description}</p></div>
      <ol aria-label="Enquiry progress">
        {['Contact', 'Brief', 'Review'].map((label, index) => <li className={step === index + 1 ? 'active' : step > index + 1 ? 'complete' : ''} key={label}>
          <button type="button" disabled={index + 1 > step || busy} onClick={() => setStep(index + 1)}><span>{step > index + 1 ? <Check/> : `0${index + 1}`}</span>{label}</button>
        </li>)}
      </ol>
    </header>

    {success ? <div className="contact-router-success">
      <CheckCircle2/><small>SIGNAL RECEIVED</small><h4>Your enquiry is now in the routing inbox.</h4><p ref={statusRef} tabIndex={-1}>{success}</p>
      <button type="button" onClick={() => {setSuccess(''); setStep(1); setValues({});}}>Send another enquiry <ArrowRight/></button>
    </div> : <>
      {step === 1 && <div className="contact-router-fields">
        <div className="contact-router-step-copy"><span>01</span><p>Tell us who to come back to. A phone number is usually the fastest route for practical questions.</p></div>
        {contactFields.map(renderField)}
        <div className="contact-router-assurance" aria-label="What happens to your enquiry">
          <div><small>ONE THREAD</small><strong>Your details and context stay together.</strong></div>
          <div><small>RIGHT DESK</small><strong>The enquiry reaches the relevant specialist.</strong></div>
          <div><small>CLEAR NEXT STEP</small><strong>We come back with what is needed next.</strong></div>
        </div>
      </div>}

      {step === 2 && <div className="contact-router-fields">
        <div className="contact-router-step-copy"><span>02</span><p>Useful context beats a long message. Include the property, product code, symptoms, location or preferred timing.</p></div>
        {briefFields.map(renderField)}
      </div>}

      {step === 3 && <div className="contact-router-review">
        <div><small>ROUTE</small><strong>{intent.label}</strong><span>{intent.code}</span></div>
        {activeFields.filter(field => field.type !== 'checkbox').map(field => <div key={field.id}><small>{field.label}</small><strong>{String(values[field.name] || '—')}</strong></div>)}
        <p>By sending this enquiry, the details are stored in the operational inbox so the appropriate NK Electrical person can respond.</p>
      </div>}

      {error && <p className="contact-router-error" role="alert">{error}</p>}
      <footer>
        {step > 1 ? <button className="contact-router-back" type="button" disabled={busy} onClick={() => setStep(current => current - 1)}><ArrowLeft/> Back</button> : <span/>}
        {step < 3
          ? <button key="continue" className="contact-router-next" type="button" onClick={event => {event.preventDefault(); advance();}}>Continue <ArrowRight/></button>
          : <button key="submit" className="contact-router-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle className="nk-admin-spin"/> : <Navigation/>}<span>{busy ? 'Routing enquiry…' : form.submitLabel}</span><ArrowUpRight/></button>}
      </footer>
    </>}
  </form>;
}

type RouteStats = {distance: string; duration: string; origin: string};

function ContactMapExperience({address, mapsUrl, schedules}: {address: string; mapsUrl: string; schedules: SiteOpeningHours[]}) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const streetLayerRef = useRef<TileLayer | null>(null);
  const satelliteLayerRef = useRef<TileLayer | null>(null);
  const routeLayerRef = useRef<Layer | null>(null);
  const originMarkerRef = useRef<Marker | null>(null);
  const originRef = useRef<{lat: number; lng: number} | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [layerMode, setLayerMode] = useState<'street' | 'satellite'>('street');
  const [travelMode, setTravelMode] = useState<TravelMode>('driving');
  const [routing, setRouting] = useState(false);
  const [routeMessage, setRouteMessage] = useState('Use your location or preview the route from central Nicosia.');
  const [stats, setStats] = useState<RouteStats | null>(null);
  const [copied, setCopied] = useState(false);
  const opening = useOpeningSignal(schedules);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;
    const map = L.map(mapElementRef.current, {
      center: [DESTINATION.lat, DESTINATION.lng],
      zoom: 16,
      minZoom: 3,
      maxZoom: 20,
      zoomControl: false,
      attributionControl: true,
    });
    const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 20,
      attribution: 'Imagery &copy; Esri',
    });
    const destinationIcon = L.divIcon({
      className: 'contact-map-destination',
      html: '<span><i></i></span><b>NK</b>',
      iconSize: [54, 64],
      iconAnchor: [27, 58],
    });
    const popup = document.createElement('div');
    const popupTitle = document.createElement('strong');
    const popupAddress = document.createElement('div');
    popupTitle.textContent = 'NK Electrical';
    popupAddress.textContent = address;
    popup.append(popupTitle, popupAddress);
    L.marker([DESTINATION.lat, DESTINATION.lng], {icon: destinationIcon, title: 'NK Electrical'}).addTo(map).bindPopup(popup);
    mapRef.current = map;
    streetLayerRef.current = street;
    satelliteLayerRef.current = satellite;
    setMapReady(true);
    window.requestAnimationFrame(() => map.invalidateSize());
    return () => {
      map.remove();
      mapRef.current = null;
      streetLayerRef.current = null;
      satelliteLayerRef.current = null;
      routeLayerRef.current = null;
      originMarkerRef.current = null;
    };
  }, [address]);

  const selectLayer = (next: 'street' | 'satellite') => {
    const map = mapRef.current;
    if (!map) return;
    if (streetLayerRef.current) map.removeLayer(streetLayerRef.current);
    if (satelliteLayerRef.current) map.removeLayer(satelliteLayerRef.current);
    (next === 'street' ? streetLayerRef.current : satelliteLayerRef.current)?.addTo(map);
    setLayerMode(next);
  };

  const drawRoute = async (origin: {lat: number; lng: number}, mode: TravelMode, originLabel: string) => {
    const map = mapRef.current;
    if (!map) return;
    setRouting(true);
    setRouteMessage(`Calculating the ${mode === 'driving' ? 'driving' : 'walking'} route…`);
    setStats(null);
    originRef.current = origin;
    try {
      const service = mode === 'driving' ? 'routed-car' : 'routed-foot';
      const url = `https://routing.openstreetmap.de/${service}/route/v1/driving/${origin.lng},${origin.lat};${DESTINATION.lng},${DESTINATION.lat}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Routing service unavailable');
      const payload = await response.json() as {code: string; routes: Array<{distance: number; duration: number; geometry: {coordinates: [number, number][]}}>} ;
      if (payload.code !== 'Ok' || !payload.routes[0]) throw new Error('No route found');
      const route = payload.routes[0];
      routeLayerRef.current?.remove();
      originMarkerRef.current?.remove();
      const coordinates = route.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
      routeLayerRef.current = L.polyline(coordinates, {
        color: mode === 'driving' ? '#ff704f' : '#42d8ca',
        weight: 6,
        opacity: .9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
      originMarkerRef.current = L.marker([origin.lat, origin.lng], {
        icon: L.divIcon({className: 'contact-map-origin', html: '<span></span>', iconSize: [22, 22], iconAnchor: [11, 11]}),
        title: originLabel,
      }).addTo(map);
      map.fitBounds(L.latLngBounds(coordinates), {padding: [48, 48], maxZoom: 16});
      setStats({
        distance: route.distance >= 1000 ? `${(route.distance / 1000).toFixed(1)} km` : `${Math.round(route.distance)} m`,
        duration: route.duration >= 3600 ? `${Math.floor(route.duration / 3600)} hr ${Math.round((route.duration % 3600) / 60)} min` : `${Math.max(1, Math.round(route.duration / 60))} min`,
        origin: originLabel,
      });
      setRouteMessage(`${mode === 'driving' ? 'Driving' : 'Walking'} preview ready. Live traffic and turn-by-turn instructions open in Google Maps.`);
    } catch {
      setRouteMessage('The inline route could not be calculated. Full turn-by-turn directions are still available.');
    } finally {
      setRouting(false);
    }
  };

  const chooseTravelMode = (next: TravelMode) => {
    setTravelMode(next);
    if (originRef.current) void drawRoute(originRef.current, next, stats?.origin || 'Selected origin');
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setRouteMessage('This browser does not provide geolocation. Open full directions and choose a starting point.');
      return;
    }
    setRouting(true);
    setRouteMessage('Waiting for location permission…');
    navigator.geolocation.getCurrentPosition(
      position => void drawRoute({lat: position.coords.latitude, lng: position.coords.longitude}, travelMode, 'Your location'),
      () => {
        setRouting(false);
        setRouteMessage('Location was not shared. Preview from central Nicosia or open full directions.');
      },
      {enableHighAccuracy: true, timeout: 12_000, maximumAge: 120_000},
    );
  };

  const directionsUrl = useMemo(() => {
    const params = new URLSearchParams({
      api: '1',
      destination: `${DESTINATION.lat},${DESTINATION.lng}`,
      travelmode: travelMode,
    });
    if (originRef.current) params.set('origin', `${originRef.current.lat},${originRef.current.lng}`);
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }, [travelMode, stats]);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = mapsUrl;
    }
  };

  return <section className="contact-visit-planner section" id="visit-planner">
    <header className="contact-section-heading">
      <div><small>VISIT PLANNER / LIVE MAP</small><h2>Know the route <em>before you leave.</em></h2></div>
      <p>Switch between street and satellite views, zoom into the entrance area and preview a route from your location by car or on foot.</p>
    </header>

    <div className="contact-visit-grid">
      <aside className="contact-visit-panel">
        <div className={`contact-open-signal${opening.open ? ' open' : ''}`}>
          <span><i/><b>{opening.headline}</b></span>
          <small>{opening.detail}</small>
          <p>{opening.suggestion}</p>
        </div>

        <div className="contact-travel-mode" role="group" aria-label="Travel mode">
          <button type="button" className={travelMode === 'driving' ? 'active' : ''} aria-pressed={travelMode === 'driving'} onClick={() => chooseTravelMode('driving')}><Car/><span><b>Vehicle</b><small>Driving route</small></span></button>
          <button type="button" className={travelMode === 'walking' ? 'active' : ''} aria-pressed={travelMode === 'walking'} onClick={() => chooseTravelMode('walking')}><Footprints/><span><b>On foot</b><small>Walking route</small></span></button>
        </div>

        <div className="contact-route-actions">
          <button type="button" onClick={useMyLocation} disabled={routing}><Crosshair/>{routing ? 'Locating or routing…' : 'Use my location'}</button>
          <button type="button" onClick={() => void drawRoute(NICOSIA_CENTRE, travelMode, 'Central Nicosia')} disabled={routing}><Route/>Preview from Nicosia centre</button>
        </div>

        {stats && <div className="contact-route-stats" aria-live="polite">
          <div><Gauge/><span><small>Distance</small><b>{stats.distance}</b></span></div>
          <div><Clock3/><span><small>Estimated time</small><b>{stats.duration}</b></span></div>
          <p>From {stats.origin}. This estimate does not include live traffic.</p>
        </div>}

        <p className="contact-route-message" role="status">{routeMessage}</p>
        <a className="contact-full-directions" href={directionsUrl} target="_blank" rel="noreferrer"><Navigation/><span><b>Open turn-by-turn directions</b><small>Continue in Google Maps</small></span><ExternalLink/></a>
      </aside>

      <div className="contact-map-shell">
        <div className="contact-map-toolbar">
          <div role="group" aria-label="Map view">
            <button type="button" className={layerMode === 'street' ? 'active' : ''} aria-pressed={layerMode === 'street'} onClick={() => selectLayer('street')}><MapIcon/>Street</button>
            <button type="button" className={layerMode === 'satellite' ? 'active' : ''} aria-pressed={layerMode === 'satellite'} onClick={() => selectLayer('satellite')}><Satellite/>Satellite</button>
          </div>
          <div role="group" aria-label="Map zoom">
            <button type="button" aria-label="Zoom out" disabled={!mapReady} onClick={() => mapRef.current?.zoomOut()}><Minus/></button>
            <button type="button" aria-label="Zoom in" disabled={!mapReady} onClick={() => mapRef.current?.zoomIn()}><Plus/></button>
          </div>
        </div>
        <div ref={mapElementRef} className="contact-live-map" role="application" aria-label="Interactive map showing NK Electrical in Strovolos"/>
        <div className="contact-map-address">
          <MapPin/><span><small>DESTINATION / VERIFIED</small><b>NK Electrical</b><p>{address}</p></span>
          <button type="button" onClick={copyAddress}>{copied ? <Check/> : <Copy/>}<span>{copied ? 'Copied' : 'Copy address'}</span></button>
        </div>
      </div>
    </div>
  </section>;
}

function DirectChannel({Icon, eyebrow, title, body, href, action, tone}: {Icon: LucideIcon; eyebrow: string; title: string; body: string; href: string; action: string; tone: string}) {
  return <a className={`contact-direct-card contact-direct-card--${tone}`} href={href}>
    <span><Icon/></span><small>{eyebrow}</small><h3>{title}</h3><p>{body}</p><b>{action}<ArrowUpRight/></b>
  </a>;
}

function ContactDirectChannels({phone, email, schedules, socials}: {phone: string; email: string; schedules: SiteOpeningHours[]; socials: SiteSocialLink[]}) {
  const hours = schedules[0]?.hours || 'Call before visiting.';
  return <section className="contact-direct section">
    <header><small>DIRECT CHANNELS / NO FORM REQUIRED</small><h2>Sometimes the shortest route is direct.</h2></header>
    <div>
      <DirectChannel Icon={Phone} eyebrow="CALL / IMMEDIATE" title={phone} body="Best for urgent faults, quick availability checks and practical clarification." href={`tel:${phone.replace(/[^+\d]/g, '')}`} action="Call NK Electrical" tone="call"/>
      <DirectChannel Icon={Mail} eyebrow="EMAIL / DOCUMENTED" title={email} body="Useful when you already have drawings, product codes, photographs or a written brief." href={`mailto:${email}`} action="Open email" tone="email"/>
      <article className="contact-direct-card contact-direct-card--hours"><span><Clock3/></span><small>SHOWROOM / HOURS</small><h3>Plan a calm visit.</h3>{hours.split('\n').map(line => <p key={line}>{line}</p>)}</article>
    </div>
    {socials.length > 0 && <nav className="contact-social-route" aria-label="NK Electrical social channels"><span>FOLLOW THE WORK</span>{socials.map(item => <a href={item.url} target={item.newTab ? '_blank' : undefined} rel={item.newTab ? 'noreferrer' : undefined} key={item.id}>{item.platform}<ArrowUpRight/></a>)}</nav>}
  </section>;
}

export function ContactCommandCenter({project}: {project: string | null}) {
  const {settings} = useContent();
  const [intentId, setIntentId] = useState<IntentId>(project ? 'project' : 'project');
  const selectedIntent = intents.find(intent => intent.id === intentId) || intents[0];
  const phone = settings.phones.find(item => item.active && item.primary)?.number || settings.phone;
  const email = settings.emails.find(item => item.active && item.primary)?.address || settings.email;
  const location = settings.locations.find(item => item.active && item.primary) || settings.locations.find(item => item.active);
  const schedules = settings.openingHours.filter(item => item.active);
  const socials = settings.socialLinks.filter(item => item.active && item.placements.includes('contact'));
  const opening = useOpeningSignal(schedules);
  const prefillMessage = project ? `I would like to discuss the ${project} project and a related electrical requirement.\n\nProject or property details:` : '';

  const chooseIntent = (intent: ContactIntent) => {
    setIntentId(intent.id);
    const target = intent.id === 'visit' ? 'visit-planner' : 'contact-briefing';
    window.setTimeout(() => document.getElementById(target)?.scrollIntoView({behavior: 'smooth', block: 'start'}), 80);
  };

  return <>
    <section className="contact-switchboard section">
      <header className="contact-section-heading">
        <div><small>CONTACT SWITCHBOARD / 04 ROUTES</small><h2>Choose the fastest <em>way in.</em></h2></div>
        <div className={`contact-switchboard-status${opening.open ? ' open' : ''}`}><i/><span><b>{opening.headline}</b><small>{opening.detail}</small></span></div>
      </header>
      <div className="contact-intent-grid">
        {intents.map(intent => {
          const Icon = intent.Icon;
          return <button type="button" className={`contact-intent-card contact-intent-card--${intent.id}${intent.id === intentId ? ' active' : ''}`} aria-pressed={intent.id === intentId} onClick={() => chooseIntent(intent)} key={intent.id}>
            <span className="contact-intent-icon"><Icon/></span><small>{intent.code}</small><h3>{intent.label}</h3><p>{intent.description}</p><b>{intent.id === 'visit' ? 'Open visit planner' : 'Build this enquiry'}<ArrowRight/></b>
          </button>;
        })}
      </div>
    </section>

    <section className={`contact-briefing section contact-briefing--${selectedIntent.id}`} id="contact-briefing">
      <div className="contact-briefing-visual">
        <img src={CONTACT_ASSET} alt="Electrical project plans, Type G socket sample and a phone showing a destination route"/>
        <ContactSignalPlayer compact/>
        <div><small>YOUR SELECTED ROUTE</small><strong>{selectedIntent.label}</strong><span>{selectedIntent.code}</span></div>
      </div>
      <ContactRouterForm intent={selectedIntent} prefillMessage={prefillMessage}/>
    </section>

    <ContactMapExperience
      address={location?.address || settings.address}
      mapsUrl={location?.mapsUrl || settings.mapsUrl}
      schedules={schedules}
    />

    <ContactDirectChannels phone={phone} email={email} schedules={schedules} socials={socials}/>
  </>;
}
