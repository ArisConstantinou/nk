import {ArrowRight, FileText, MapPin, PhoneCall, Siren} from 'lucide-react';
import {Link} from 'react-router-dom';
import {useContent} from '../context/ContentContext';
import {publicAsset} from '../utils/assets';
import {ResponsiveImage} from './ResponsiveImage';

export function ContactHeaderPreview({open}: {open: boolean}) {
  const {settings} = useContent();
  const tel = settings.phone.replace(/[^+\d]/g, '');

  return <section
    id="nk-desktop-contact-story"
    className={`nk-contact-header-preview ${open ? 'is-desktop-open' : 'is-desktop-collapsed'}`}
    aria-label="Contact NK Electrical options"
    aria-hidden={!open || undefined}
  >
    <div className="nk-contact-header-story">
      <div className="nk-contact-header-story__copy">
        <p>CONTACT / DIRECT TO SPECIALIST</p>
        <h2>Your next step,<br/><span>made clear.</span></h2>
        <strong>Choose the fastest route for your enquiry.</strong>
      </div>

      <nav className="nk-contact-header-story__routes" aria-label="Contact choices">
        <Link to="/request-a-quote">
          <small>01 / PROJECT</small>
          <FileText aria-hidden="true"/>
          <strong>Request a quote</strong>
          <span>Start a clear installation or project brief.</span>
          <ArrowRight aria-hidden="true"/>
        </Link>
        <a href={`tel:${tel}`}>
          <small>02 / URGENT</small>
          <Siren aria-hidden="true"/>
          <strong>Emergency fault</strong>
          <span>Call the team for urgent electrical support.</span>
          <PhoneCall aria-hidden="true"/>
        </a>
        <Link to="/contact#contact-briefing">
          <small>03 / DIRECT</small>
          <MapPin aria-hidden="true"/>
          <strong>Contact &amp; visit</strong>
          <span>Send an enquiry or plan a showroom visit.</span>
          <ArrowRight aria-hidden="true"/>
        </Link>
      </nav>

      <figure className="nk-contact-header-story__media">
        <ResponsiveImage
          src={publicAsset('assets/heroes/contact-v2.webp')}
          alt="NK Electrical specialist welcoming a customer"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        <figcaption><MapPin aria-hidden="true"/><span>NICOSIA / CYPRUS<small>{settings.phone}</small></span></figcaption>
      </figure>
    </div>
  </section>;
}
