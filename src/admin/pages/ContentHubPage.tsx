import {BookOpen, BriefcaseBusiness, Building2, FileText, FolderKanban, Image, PackagePlus, Plus, ShoppingBag} from 'lucide-react';
import {Link} from 'react-router-dom';
import {useAdminAuth} from '../auth/AdminAuth';
import {PageHeading} from '../components/AdminStates';
import {canReadKind, canReadMedia, canWriteKind} from '../permissions';
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
    <PageHeading eyebrow="CONTENT" title="Manage website content" description="Choose what you want to manage. Every section uses the same simple add, edit, publish and remove workflow."/>
    <section className="nk-admin-task-banner" aria-labelledby="content-start-title">
      <div><PackagePlus/><span><b id="content-start-title">What do you want to do?</b><small>Start with the content type. Advanced visual tools remain available inside each section.</small></span></div>
      <div>
        {canWriteKind(user.role, 'page') && <Link to="/admin/pages?new=1"><Plus/>Add page</Link>}
        {canWriteKind(user.role, 'product') && <Link className="nk-admin-primary" to="/admin/products?new=1"><Plus/>Add product</Link>}
      </div>
    </section>
    <section className="nk-admin-content-grid" aria-label="Content types">
      {visible.map(area => {
        const Icon = area.icon;
        const canWrite = canWriteKind(user.role, area.kind);
        return <article key={area.kind}>
          <Link className="nk-admin-content-card-main" to={area.to}>
            <span><Icon/></span><div><h2>{area.title}</h2><p>{area.description}</p></div>
          </Link>
          <footer><Link to={area.to}>View and edit</Link>{canWrite && area.kind !== 'company' && <Link to={`${area.to}?new=1`}><Plus/>Add new</Link>}</footer>
        </article>;
      })}
      {canReadMedia(user.role) && <article>
        <Link className="nk-admin-content-card-main" to="/admin/media"><span><Image/></span><div><h2>Media</h2><p>Upload and reuse images, documents and video.</p></div></Link>
        <footer><Link to="/admin/media">Open media library</Link></footer>
      </article>}
    </section>
  </div>;
}
