import {Sparkles} from 'lucide-react';
import {useLocation} from 'react-router-dom';
import {CmsSections} from '../components/CmsSections';
import {ElectricalLayout} from '../components/ElectricalLayout';
import {useContent} from '../context/ContentContext';

export function GuidedDemoPage() {
  const location = useLocation();
  const {pageForRoute} = useContent();
  const page = pageForRoute(location.pathname);
  const visualPreview = new URLSearchParams(location.search).has('visualEditor');
  return <ElectricalLayout><div className="cms-guide-page">
    <section className="cms-guide-canvas" aria-label="AI guided CMS page">
      {page?.sections.length ? <CmsSections sections={page.sections} pageSlug={page.slug}/> : visualPreview ? <div className="cms-guide-empty" aria-live="polite"><Sparkles/><span>Η draft σελίδα είναι έτοιμη</span><small>Ο AI οδηγός αναλύει τις επιλογές σου και θα προσθέσει το πρώτο ασφαλές section.</small></div> : null}
    </section>
  </div></ElectricalLayout>;
}
