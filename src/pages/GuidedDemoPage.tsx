import {Sparkles} from 'lucide-react';
import {useLocation} from 'react-router-dom';
import {CmsSections} from '../components/CmsSections';
import {VisualEditingBridge} from '../components/VisualEditingBridge';
import {useContent} from '../context/ContentContext';

export function GuidedDemoPage() {
  const location = useLocation();
  const {pageForRoute} = useContent();
  const page = pageForRoute(location.pathname);
  const visualPreview = new URLSearchParams(location.search).has('visualEditor');
  return <div className="cms-guide-page">
    <VisualEditingBridge/>
    <main className="cms-guide-canvas" aria-label="Interactive guide demo page">
      {page?.sections.length ? <CmsSections sections={page.sections} pageSlug={page.slug}/> : visualPreview ? <div className="cms-guide-empty" aria-live="polite"><Sparkles/><span>Κενός demo καμβάς</span><small>Ο AI βοηθός θα προτείνει το πρώτο πραγματικό component.</small></div> : null}
    </main>
  </div>;
}
