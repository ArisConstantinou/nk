import {useEffect, useId, useRef, useState, type KeyboardEvent} from 'react';
import {Check, CornerDownLeft, LoaderCircle, MapPin, Search} from 'lucide-react';

const NICOSIA_BOUNDS = '32.84,34.93,33.76,35.26';
const NICOSIA_CENTRE = {lat: '35.174', lon: '33.361'};
const MINIMUM_QUERY_LENGTH = 2;
const PHOTON_ENDPOINT = import.meta.env.VITE_PHOTON_ENDPOINT || 'https://photon.komoot.io/api/';
const isCompletedNicosiaAddress = (value: string) => /,\s*Nicosia,\s*Cyprus\s*$/i.test(value);

type PhotonProperties = {
  osm_id?: number;
  osm_type?: string;
  name?: string;
  housenumber?: string;
  street?: string;
  locality?: string;
  district?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
};

type PhotonFeature = {
  properties?: PhotonProperties;
  geometry?: {coordinates?: [number, number]};
};

type AddressSuggestion = {
  id: string;
  primary: string;
  secondary: string;
  fullAddress: string;
  postcode: string;
};

const tidy = (value: string | undefined) => String(value || '').replace(/\s+/g, ' ').trim();
const searchable = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase();

const uniqueParts = (parts: Array<string | undefined>) => {
  const seen = new Set<string>();
  return parts.map(tidy).filter(part => {
    if (!part) return false;
    const key = part.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const belongsToNicosiaDistrict = (feature: PhotonFeature) => {
  const postcode = tidy(feature.properties?.postcode);
  if (!postcode) return true;
  if (!/^\d{4}$/.test(postcode)) return false;
  const numericPostcode = Number(postcode);
  return numericPostcode >= 1000 && numericPostcode <= 2999;
};

const typedHouseNumber = (query: string) => {
  const leading = query.match(/^\s*(\d{1,3}[A-Za-zΑ-Ωα-ω]?)\b/);
  const trailing = query.match(/\b(\d{1,3}[A-Za-zΑ-Ωα-ω]?)\s*$/);
  return tidy(leading?.[1] || trailing?.[1]);
};

const withoutTypedHouseNumber = (query: string, houseNumber: string) => {
  if (!houseNumber) return query;
  const escaped = houseNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return tidy(query
    .replace(new RegExp(`^\\s*${escaped}\\b[\\s,.-]*`, 'i'), '')
    .replace(new RegExp(`[\\s,.-]*\\b${escaped}\\s*$`, 'i'), ''));
};

const toSuggestion = (feature: PhotonFeature, index: number, requestedHouseNumber: string): AddressSuggestion | null => {
  const properties = feature.properties || {};
  const street = tidy(properties.street);
  const name = tidy(properties.name);
  const houseNumber = tidy(properties.housenumber) || requestedHouseNumber;
  const routeName = street || name;
  if (!routeName) return null;

  const primary = houseNumber && !routeName.includes(houseNumber)
    ? `${houseNumber} ${routeName}`
    : routeName;
  const locationParts = uniqueParts([
    properties.locality,
    properties.district,
    properties.city,
    properties.county,
  ]).filter(part => !/^(nicosia municipality|nicosia muncipality)$/i.test(part));
  const postcode = tidy(properties.postcode);
  const secondary = uniqueParts([...locationParts, postcode, 'Nicosia']).join(' · ');
  const fullAddress = uniqueParts([primary, ...locationParts, postcode, 'Nicosia', 'Cyprus']).join(', ');

  return {
    id: `${properties.osm_type || 'P'}-${properties.osm_id || index}`,
    primary,
    secondary,
    fullAddress,
    postcode,
  };
};

const fetchNicosiaAddresses = async (query: string, signal: AbortSignal) => {
  const request = async (term: string) => {
    const params = new URLSearchParams({
      q: term,
      bbox: NICOSIA_BOUNDS,
      countrycode: 'CY',
      lat: NICOSIA_CENTRE.lat,
      lon: NICOSIA_CENTRE.lon,
      zoom: '11',
      location_bias_scale: '0.08',
      limit: '10',
      lang: 'en',
    });
    ['house', 'street', 'locality', 'district', 'city'].forEach(layer => params.append('layer', layer));
    const response = await fetch(`${PHOTON_ENDPOINT}?${params}`, {
      signal,
      headers: {Accept: 'application/geo+json, application/json'},
    });
    if (!response.ok) throw new Error('Address search is temporarily unavailable.');
    return response.json() as Promise<{features?: PhotonFeature[]}>;
  };

  const seen = new Set<string>();
  const requestedHouseNumber = typedHouseNumber(query);
  let payload = await request(query);
  if (requestedHouseNumber) {
    const streetOnly = withoutTypedHouseNumber(query, requestedHouseNumber);
    if (streetOnly.length >= MINIMUM_QUERY_LENGTH && streetOnly !== query) {
      const streetPayload = await request(streetOnly);
      payload = {features: [...(payload.features || []), ...(streetPayload.features || [])]};
    }
  }
  const suggestions = (payload.features || [])
    .filter(belongsToNicosiaDistrict)
    .map((feature, index) => toSuggestion(feature, index, requestedHouseNumber))
    .filter((item): item is AddressSuggestion => Boolean(item))
    .filter(item => {
      const key = item.fullAddress.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  const searchTerms = searchable(withoutTypedHouseNumber(query, requestedHouseNumber))
    .split(/[^\p{Letter}\p{Number}]+/u)
    .filter(term => term.length >= 3);
  const closeMatches = suggestions.filter(item => {
    const route = searchable(item.primary.replace(/^\d+\s+/, ''));
    return searchTerms.some(term => route.includes(term));
  });
  return (closeMatches.length >= 3 ? closeMatches : suggestions).slice(0, 8);
};

export function NicosiaAddressAutocomplete({
  label,
  required,
  value,
  disabled,
  onChange,
}: {
  label: string;
  required: boolean;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const inputId = useId();
  const listId = `${inputId}-suggestions`;
  const statusId = `${inputId}-status`;
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedValue, setSelectedValue] = useState(() => isCompletedNicosiaAddress(value) ? value : '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const query = value.trim();
    if (query.length < MINIMUM_QUERY_LENGTH || query === selectedValue) {
      setSuggestions([]);
      setLoading(false);
      setSearched(false);
      setSearchError('');
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setSearchError('');
      try {
        const next = await fetchNicosiaAddresses(query, controller.signal);
        setSuggestions(next);
        setActiveIndex(next.length ? 0 : -1);
        setSearched(true);
        setOpen(true);
      } catch (error) {
        if (controller.signal.aborted) return;
        setSuggestions([]);
        setSearched(true);
        setOpen(true);
        setSearchError(error instanceof Error ? error.message : 'Address search is temporarily unavailable.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 340);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [selectedValue, value]);

  const selectAddress = (suggestion: AddressSuggestion) => {
    setSelectedValue(suggestion.fullAddress);
    onChange(suggestion.fullAddress);
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open || !suggestions.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(index => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(index => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      selectAddress(suggestions[activeIndex]);
    }
  };

  const status = loading
    ? 'Searching Nicosia addresses.'
    : searchError
      ? `${searchError} You can still enter the address manually.`
      : selectedValue === value && value
        ? 'Nicosia address selected.'
        : searched && value.trim().length >= MINIMUM_QUERY_LENGTH
          ? suggestions.length
            ? `${suggestions.length} Nicosia address suggestions available.`
            : 'No indexed match yet. You can continue with the address as typed.'
          : `Type at least ${MINIMUM_QUERY_LENGTH} characters to search Nicosia.`;

  return <div className={`quote-field quote-address${open ? ' quote-address--open' : ''}`}>
    <span>
      <label htmlFor={inputId}>{label}</label>
      <b>{required ? 'Required · ' : ''}Live Nicosia search</b>
    </span>
    <div className="quote-address-input">
      <MapPin aria-hidden="true"/>
      <input
        ref={inputRef}
        id={inputId}
        name="project-location"
        type="text"
        required={required}
        maxLength={500}
        disabled={disabled}
        placeholder="Street, number, area or postcode"
        value={value}
        autoComplete="off"
        autoCapitalize="words"
        spellCheck={false}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && (loading || searched)}
        aria-controls={listId}
        aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        aria-describedby={statusId}
        data-lpignore="true"
        data-1p-ignore="true"
        onFocus={() => {
          if (loading || searched) setOpen(true);
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 140)}
        onKeyDown={onKeyDown}
        onChange={event => {
          setSelectedValue('');
          onChange(event.target.value);
        }}
      />
      <span className="quote-address-signal" aria-hidden="true">
        {loading ? <LoaderCircle/> : selectedValue === value && value ? <Check/> : <Search/>}
      </span>
    </div>
    <small className="quote-address-status" id={statusId} aria-live="polite">{status}</small>

    {open && (loading || searched) && <div className="quote-address-results">
      {loading ? <div className="quote-address-loading"><LoaderCircle/><span>Searching the Nicosia address index…</span></div>
        : suggestions.length ? <ul id={listId} role="listbox" aria-label="Nicosia address suggestions">
          {suggestions.map((suggestion, index) => <li
            id={`${listId}-${index}`}
            role="option"
            aria-selected={activeIndex === index}
            className={activeIndex === index ? 'active' : ''}
            key={suggestion.id}
          >
            <button
              type="button"
              tabIndex={-1}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={event => {
                event.preventDefault();
                selectAddress(suggestion);
              }}
            >
              <MapPin/>
              <span><strong>{suggestion.primary}</strong><small>{suggestion.secondary}</small></span>
              <CornerDownLeft/>
            </button>
          </li>)}
        </ul> : <div className="quote-address-empty">
          <Search/><span><strong>No indexed match yet.</strong><small>Keep the complete address as typed, or try the street before the building number.</small></span>
        </div>}
      <footer>Address data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a></footer>
    </div>}
  </div>;
}
