import {BookOpen, BriefcaseBusiness, Building2, ChevronRight, FileText, FolderKanban, Image, ShoppingBag} from 'lucide-react';
import {Link} from 'react-router-dom';
import {useAdminAuth} from '../auth/AdminAuth';
import {PageHeading} from '../components/AdminStates';
import {canReadKind, canReadMedia} from '../permissions';
import type {ContentKind} from '../types';

type ContentArea = {
  kind: ContentKind;
  title: string;
  description: string;
  to: string;
  icon: typeof FileText;
};

const areas: ContentArea[] = [
  {kind: 'page', title: 'Pages', description: 'Add, edit, publish or remove website pages.', to: '/admin/pages', icon: FileText},
  {kind: 'product', title: 'Products', description: 'Manage the complete shop catalogue.', to: '/admin/products', icon: ShoppingBag},
  {kind: 'service', title: 'Services', description: 'Keep service descriptions and deliverables current.', to: '/admin/services', icon: BriefcaseBusiness},
  {kind: 'project', title: 'Projects', description: 'Add completed work, images and project details.', to: '/admin/projects', icon: FolderKanban},
  {kind: 'catalogue', title: 'Catalogues', description: 'Manage official PDF catalogues and links.', to: '/admin/catalogues', icon: BookOpen},
  {kind: 'company', title: 'Company', description: 'Edit the company story and partnerships.', to: '/admin/company', icon: Building2},
];

export function ContentHubPage() {
  const {user} = useAdminAuth();
  if (!user) return null;
  const visible = areas.filter(area => canReadKind(user.role, area.kind));

  return <div className="nk-admin-content-hub">
    <PageHeading eyebrow="CONTENT" title="Choose one content area" description="Every button opens one specific type of website content. Nothing is mixed together."/>
    <section className="nk-admin-content-grid" aria-label="Content types">
      {visible.map(area => {
        const Icon = area.icon;
        return <article key={area.kind}>
          <Link className="nk-admin-content-card-main" to={area.to}>
            <span><Icon/></span><div><h2>{area.title}</h2><p>{area.description}</p><b>Open {area.title.toLowerCase()} <ChevronRight/></b></div>
          </Link>
        </article>;
      })}
      {canReadMedia(user.role) && <article>
        <Link className="nk-admin-content-card-main" to="/admin/media"><span><Image/></span><div><h2>Gallery</h2><p>Upload and reuse photos, videos, PDFs and catalogue files.</p><b>Open Gallery <ChevronRight/></b></div></Link>
      </article>}
    </section>
  </div>;
}
