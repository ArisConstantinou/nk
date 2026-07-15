import {useEffect, useMemo, useRef, useState} from 'react';
import {ArrowLeft, ArrowRight, CheckCircle2, Languages, Map, X} from 'lucide-react';

type Language = 'en' | 'el';
type Copy = {en: string; el: string};
type GuideItem = {target: string; to?: string; title: Copy; description: Copy; actions: Copy};
type SpotlightRect = {top: number; left: number; width: number; height: number};

const copy = (en: string, el: string): Copy => ({en, el});

export const adminGuideItems: GuideItem[] = [
  {target: 'search', title: copy('Global search', 'Καθολική αναζήτηση'), description: copy('Find pages, services, products, projects, media, users and settings from one search field.', 'Βρες σελίδες, υπηρεσίες, προϊόντα, έργα, media, χρήστες και ρυθμίσεις από ένα πεδίο αναζήτησης.'), actions: copy('Press Ctrl/⌘ K anywhere. Results respect your role and open the exact record.', 'Πάτησε Ctrl/⌘ K οπουδήποτε. Τα αποτελέσματα σέβονται τον ρόλο σου και ανοίγουν την ακριβή εγγραφή.')},
  {target: 'group-content', title: copy('Content workspace', 'Χώρος περιεχομένου'), description: copy('This sidebar group contains the website material visitors read, browse and use.', 'Αυτή η ομάδα του sidebar περιέχει το υλικό του site που διαβάζουν, περιηγούνται και χρησιμοποιούν οι επισκέπτες.'), actions: copy('Open the visual editor or a focused content collection such as Services, Shop, Projects or Company.', 'Άνοιξε τον οπτικό επεξεργαστή ή μια συγκεκριμένη συλλογή περιεχομένου όπως Υπηρεσίες, Shop, Έργα ή Εταιρεία.')},
  {target: '/admin/dashboard', to: '/admin/dashboard', title: copy('Dashboard', 'Πίνακας ελέγχου'), description: copy('The operational overview of the website: drafts, published records, submissions, warnings, integrations and recent activity.', 'Η συνολική επιχειρησιακή εικόνα του site: drafts, δημοσιευμένες εγγραφές, submissions, προειδοποιήσεις, integrations και πρόσφατη δραστηριότητα.'), actions: copy('Search, filter, sort, pin records, run bulk actions and jump into frequent work.', 'Αναζήτησε, φιλτράρισε, ταξινόμησε, καρφίτσωσε εγγραφές, εκτέλεσε μαζικές ενέργειες και άνοιξε συχνές εργασίες.')},
  {target: '/admin/pages', to: '/admin/pages', title: copy('Visual page editor', 'Οπτικός επεξεργαστής σελίδων'), description: copy('Edit the real page directly. Every visible text, image, background, icon, button, link, control and structural region can be selected, moved or deleted.', 'Επεξεργάσου απευθείας την πραγματική σελίδα. Κάθε ορατό κείμενο, εικόνα, background, icon, κουμπί, link, control και δομική περιοχή μπορεί να επιλεγεί, να μετακινηθεί ή να διαγραφεί.'), actions: copy('Type inline, change relevant properties, drag and drop, delete or restore, undo/redo, preview desktop/tablet/mobile, then publish safely.', 'Γράψε inline, άλλαξε τις σχετικές ιδιότητες, κάνε drag-and-drop, διαγραφή ή επαναφορά, undo/redo, preview σε desktop/tablet/mobile και μετά ασφαλή δημοσίευση.')},
  {target: '/admin/services', to: '/admin/services', title: copy('Services', 'Υπηρεσίες'), description: copy('Controls service-only content such as electrical installations, lighting design, automation, security and maintenance.', 'Ελέγχει αποκλειστικά το περιεχόμενο υπηρεσιών όπως ηλεκτρολογικές εγκαταστάσεις, σχεδιασμό φωτισμού, αυτοματισμούς, ασφάλεια και συντήρηση.'), actions: copy('Create, edit, duplicate, archive, search, reorder and publish service records and their detail-page content.', 'Δημιούργησε, επεξεργάσου, αντέγραψε, αρχειοθέτησε, αναζήτησε, ταξινόμησε και δημοσίευσε υπηρεσίες και το περιεχόμενο των σελίδων τους.')},
  {target: '/admin/products', to: '/admin/products', title: copy('Shop products', 'Προϊόντα καταστήματος'), description: copy('Manages products sold or presented in the Shop, kept separate from installation services.', 'Διαχειρίζεται τα προϊόντα που πωλούνται ή παρουσιάζονται στο Shop, ξεχωριστά από τις υπηρεσίες εγκατάστασης.'), actions: copy('Maintain product name, category, season, room, image, description, status, order and publication.', 'Διατήρησε όνομα, κατηγορία, εποχή, χώρο, εικόνα, περιγραφή, κατάσταση, σειρά και δημοσίευση προϊόντος.')},
  {target: '/admin/catalogues', to: '/admin/catalogues', title: copy('Catalogues', 'Κατάλογοι'), description: copy('Controls official PDF catalogues and downloads shown under the Shop.', 'Ελέγχει τους επίσημους PDF καταλόγους και τα downloads που εμφανίζονται κάτω από το Shop.'), actions: copy('Add brand/year/focus metadata, attach a download URL, reorder, disable or publish each catalogue.', 'Πρόσθεσε brand/έτος/κατηγορία, σύνδεσε URL λήψης, άλλαξε σειρά, απενεργοποίησε ή δημοσίευσε κάθε κατάλογο.')},
  {target: '/admin/projects', to: '/admin/projects', title: copy('Projects', 'Έργα'), description: copy('The completed-project and portfolio archive used by the public Projects page and homepage evidence sections.', 'Το αρχείο ολοκληρωμένων έργων και portfolio που χρησιμοποιείται στη δημόσια σελίδα Projects και στις ενότητες τεκμηρίωσης της αρχικής.'), actions: copy('Edit project image, category, completion date, systems, description, order and publishing status.', 'Επεξεργάσου εικόνα έργου, κατηγορία, ημερομηνία ολοκλήρωσης, συστήματα, περιγραφή, σειρά και κατάσταση δημοσίευσης.')},
  {target: '/admin/company', to: '/admin/company', title: copy('Company', 'Εταιρεία'), description: copy('Company story, introduction, history, partnerships and other About-page content.', 'Η ιστορία της εταιρείας, η εισαγωγή, το ιστορικό, οι συνεργασίες και άλλο περιεχόμενο της σελίδας About.'), actions: copy('Edit the company record and publish the approved About content without changing code.', 'Επεξεργάσου την εταιρική εγγραφή και δημοσίευσε το εγκεκριμένο περιεχόμενο About χωρίς αλλαγή κώδικα.')},
  {target: 'group-operations', title: copy('Operations workspace', 'Χώρος λειτουργιών'), description: copy('This group collects incoming customer work and the forms that create it.', 'Αυτή η ομάδα συγκεντρώνει τα εισερχόμενα αιτήματα πελατών και τις φόρμες που τα δημιουργούν.'), actions: copy('Review enquiries, configure public forms and follow each real submission through its workflow.', 'Έλεγξε αιτήματα, ρύθμισε δημόσιες φόρμες και παρακολούθησε κάθε πραγματική υποβολή στη ροή της.')},
  {target: '/admin/enquiries', to: '/admin/enquiries', title: copy('Enquiries — customer follow-up', 'Αιτήματα — παρακολούθηση πελατών'), description: copy('This is the working sales inbox for customer interest received by phone, email, in person or another channel. It keeps the customer, request and follow-up together. Forms & submissions is different: it stores the original raw entries sent through website forms.', 'Αυτό είναι το ενεργό inbox πωλήσεων για ενδιαφέρον πελατών που λαμβάνεται τηλεφωνικά, με email, αυτοπροσώπως ή από άλλο κανάλι. Κρατά μαζί τον πελάτη, το αίτημα και την παρακολούθηση. Οι Φόρμες και υποβολές είναι διαφορετικές: αποθηκεύουν τις αρχικές καταχωρήσεις που στάλθηκαν από τις φόρμες του website.'), actions: copy('Record the request, assign the responsible person, add private notes and move it through New → In progress → Waiting → Won or Closed. Use Spam only for irrelevant messages.', 'Κατάγραψε το αίτημα, ανάθεσέ το στον υπεύθυνο, πρόσθεσε εσωτερικές σημειώσεις και προχώρησέ το από Νέο → Σε εξέλιξη → Αναμονή → Κερδισμένο ή Κλειστό. Χρησιμοποίησε το Spam μόνο για άσχετα μηνύματα.')},
  {target: '/admin/forms', to: '/admin/forms', title: copy('Forms & submissions', 'Φόρμες και υποβολές'), description: copy('Builds public forms and stores real submissions from Contact and Request a Quote.', 'Δημιουργεί δημόσιες φόρμες και αποθηκεύει πραγματικές υποβολές από Contact και Request a Quote.'), actions: copy('Manage fields, validation, order, submit/success copy, form status and submission workflow.', 'Διαχειρίσου πεδία, validation, σειρά, κείμενα υποβολής/επιτυχίας, κατάσταση φόρμας και ροή submissions.')},
  {target: 'group-system', title: copy('System workspace', 'Χώρος συστήματος'), description: copy('This group contains shared assets, global site behaviour, access control and accountable administration.', 'Αυτή η ομάδα περιέχει κοινόχρηστα αρχεία, καθολική συμπεριφορά του site, έλεγχο πρόσβασης και υπεύθυνη διαχείριση.') , actions: copy('Manage media, SEO, global settings, navigation, users and the audit trail from here.', 'Διαχειρίσου media, SEO, καθολικές ρυθμίσεις, πλοήγηση, χρήστες και το αρχείο ελέγχου από εδώ.')},
  {target: '/admin/media', to: '/admin/media', title: copy('Media library', 'Βιβλιοθήκη media'), description: copy('Central storage for website images and files with responsive variants and usage tracking.', 'Κεντρική αποθήκευση εικόνων και αρχείων του site με responsive παραλλαγές και έλεγχο χρήσης.'), actions: copy('Upload by drag and drop, preview, search, categorise, edit metadata, replace safely and inspect every usage.', 'Κάνε upload με drag-and-drop, preview, αναζήτηση, κατηγοριοποίηση, επεξεργασία metadata, ασφαλή αντικατάσταση και έλεγχο κάθε χρήσης.')},
  {target: '/admin/seo', to: '/admin/seo', title: copy('SEO & routes', 'SEO και διαδρομές'), description: copy('Controls page routes and search/social metadata without editing source code.', 'Ελέγχει routes σελίδων και metadata αναζήτησης/social χωρίς επεξεργασία πηγαίου κώδικα.'), actions: copy('Edit route, meta title, description, canonical URL, indexability and social sharing image.', 'Επεξεργάσου route, meta title, description, canonical URL, indexability και εικόνα social sharing.')},
  {target: '/admin/settings', to: '/admin/settings', title: copy('Header, footer & settings', 'Header, footer και ρυθμίσεις'), description: copy('Global website identity and operational settings shared by every page.', 'Η παγκόσμια ταυτότητα και οι λειτουργικές ρυθμίσεις του site που μοιράζονται όλες οι σελίδες.'), actions: copy('Manage logo, favicon, contact data, locations, hours, maps, social links, header/footer behaviour and default SEO.', 'Διαχειρίσου logo, favicon, στοιχεία επικοινωνίας, τοποθεσίες, ώρες, χάρτες, social links, συμπεριφορά header/footer και προεπιλεγμένο SEO.')},
  {target: '/admin/navigation', to: '/admin/navigation', title: copy('Navigation menus', 'Μενού πλοήγησης'), description: copy('Defines the real primary, mega-menu and footer navigation structure.', 'Ορίζει την πραγματική δομή του κύριου menu, των mega menus και του footer.'), actions: copy('Add links, edit labels and destinations, drag to reorder, activate/deactivate and keep Services separate from Shop.', 'Πρόσθεσε links, επεξεργάσου labels και προορισμούς, άλλαξε σειρά με drag, ενεργοποίησε/απενεργοποίησε και κράτησε Services ξεχωριστά από Shop.')},
  {target: '/admin/users', to: '/admin/users', title: copy('Users & roles', 'Χρήστες και ρόλοι'), description: copy('Controls who can enter the admin and exactly which areas each role may read or change.', 'Ελέγχει ποιος μπορεί να μπει στο admin και ακριβώς ποιες περιοχές μπορεί κάθε ρόλος να δει ή να αλλάξει.'), actions: copy('Create users, assign roles, activate/deactivate access and review permissions before granting control.', 'Δημιούργησε χρήστες, όρισε ρόλους, ενεργοποίησε/απενεργοποίησε πρόσβαση και έλεγξε δικαιώματα πριν δώσεις έλεγχο.')},
  {target: '/admin/audit', to: '/admin/audit', title: copy('Audit log / My activity', 'Αρχείο ελέγχου / Η δραστηριότητά μου'), description: copy('The accountable record of who changed what, when and from which session.', 'Η υπεύθυνη καταγραφή του ποιος άλλαξε τι, πότε και από ποια συνεδρία.'), actions: copy('Filter and review activity, inspect entity details and export the audit trail when needed.', 'Φιλτράρισε και έλεγξε δραστηριότητα, δες λεπτομέρειες εγγραφών και εξήγαγε το audit trail όταν χρειάζεται.')},
  {target: 'guide', title: copy('Guide / Οδηγός', 'Οδηγός / Guide'), description: copy('Reopens this complete sidebar tour whenever you need a reminder, in English or Greek.', 'Ανοίγει ξανά αυτή την πλήρη ξενάγηση του sidebar όποτε χρειάζεσαι υπενθύμιση, στα Ελληνικά ή στα Αγγλικά.'), actions: copy('Switch language at the top, use Previous/Next or the arrow keys, and open the highlighted area directly.', 'Άλλαξε γλώσσα επάνω, χρησιμοποίησε Προηγούμενο/Επόμενο ή τα βελάκια και άνοιξε απευθείας την επιλεγμένη περιοχή.')},
  {target: 'profile', to: '/admin/profile', title: copy('Profile & session', 'Προφίλ και συνεδρία'), description: copy('Your own identity, password and active authenticated admin session.', 'Η δική σου ταυτότητα, το password και η ενεργή πιστοποιημένη συνεδρία admin.'), actions: copy('Update your display information or password and sign out securely when work is finished.', 'Ενημέρωσε τα στοιχεία εμφάνισης ή το password και κάνε ασφαλές sign out όταν τελειώσεις.')},
  {target: 'signout', title: copy('Sign out', 'Αποσύνδεση'), description: copy('Securely ends the current authenticated admin session on this device.', 'Τερματίζει με ασφάλεια την τρέχουσα πιστοποιημένη συνεδρία admin σε αυτή τη συσκευή.'), actions: copy('Use it when work is finished, especially on a shared device. Draft edits save automatically before publication.', 'Χρησιμοποίησέ το όταν τελειώσεις, ιδιαίτερα σε κοινόχρηστη συσκευή. Οι αλλαγές draft αποθηκεύονται αυτόματα πριν τη δημοσίευση.')},
];

export function AdminGuide({open, onClose, onNavigate, onTargetChange}: {open: boolean; onClose: () => void; onNavigate: (to: string) => void; onTargetChange?: (target: string) => void}) {
  const [language, setLanguage] = useState<Language>(() => localStorage.getItem('nk-admin-guide-language') === 'el' ? 'el' : 'en');
  const [index, setIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const available = useMemo(() => adminGuideItems.filter(item => document.querySelector(`[data-admin-tour="${item.target}"]`)), [open]);
  const item = available[Math.min(index, Math.max(0, available.length - 1))];

  useEffect(() => {localStorage.setItem('nk-admin-guide-language', language);}, [language]);
  useEffect(() => {if (open && item) onTargetChange?.(item.target);}, [item, onTargetChange, open]);
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setIndex(0);
    window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => previousFocusRef.current?.focus();
  }, [open]);
  useEffect(() => {
    document.querySelectorAll('.nk-admin-tour-target').forEach(element => element.classList.remove('nk-admin-tour-target'));
    setSpotlight(null);
    if (!open || !item) return;
    const target = document.querySelector<HTMLElement>(`[data-admin-tour="${item.target}"]`);
    if (!target) return;
    target.classList.add('nk-admin-tour-target');
    target.scrollIntoView({block: 'nearest', inline: 'nearest'});
    let frame = 0;
    let delayed = 0;
    const updateSpotlight = () => {
      const rect = target.getBoundingClientRect();
      if (!rect.width || !rect.height) {setSpotlight(null); return;}
      const padding = 8;
      const viewportMargin = 6;
      const top = Math.max(viewportMargin, rect.top - padding);
      const left = Math.max(viewportMargin, rect.left - padding);
      const right = Math.min(window.innerWidth - viewportMargin, rect.right + padding);
      const bottom = Math.min(window.innerHeight - viewportMargin, rect.bottom + padding);
      setSpotlight({top, left, width: Math.max(1, right - left), height: Math.max(1, bottom - top)});
    };
    frame = window.requestAnimationFrame(updateSpotlight);
    delayed = window.setTimeout(updateSpotlight, 120);
    const resizeObserver = new ResizeObserver(updateSpotlight);
    resizeObserver.observe(target);
    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight, true);
    return () => {
      target.classList.remove('nk-admin-tour-target');
      window.cancelAnimationFrame(frame);
      window.clearTimeout(delayed);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight, true);
    };
  }, [item, open]);
  useEffect(() => {
    if (!open) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') setIndex(current => Math.min(available.length - 1, current + 1));
      if (event.key === 'ArrowLeft') setIndex(current => Math.max(0, current - 1));
      if (event.key === 'Tab') {
        const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])') || [])]
          .filter(control => control.getClientRects().length > 0);
        if (!controls.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last.focus();}
        else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
      }
    };
    window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown);
  }, [available.length, onClose, open]);
  if (!open || !item) return null;

  return <div className="nk-admin-guide-overlay" role="presentation">
    {spotlight && <>
      <div className="nk-admin-guide-scrim" aria-hidden="true" style={{top: 0, right: 0, left: 0, height: spotlight.top}}/>
      <div className="nk-admin-guide-scrim" aria-hidden="true" style={{top: spotlight.top + spotlight.height, right: 0, bottom: 0, left: 0}}/>
      <div className="nk-admin-guide-scrim" aria-hidden="true" style={{top: spotlight.top, left: 0, width: spotlight.left, height: spotlight.height}}/>
      <div className="nk-admin-guide-scrim" aria-hidden="true" style={{top: spotlight.top, right: 0, left: spotlight.left + spotlight.width, height: spotlight.height}}/>
      <div className="nk-admin-guide-spotlight" aria-hidden="true" style={spotlight}/>
    </>}
    <section ref={dialogRef} className="nk-admin-guide" role="dialog" aria-modal="true" aria-labelledby="admin-guide-title">
      <header><div><Map/><span>{language === 'en' ? 'ADMIN GUIDED TOUR' : 'ΞΕΝΑΓΗΣΗ ADMIN'}</span></div><button ref={closeRef} type="button" onClick={onClose} aria-label={language === 'en' ? 'Close guided tour' : 'Κλείσιμο ξενάγησης'}><X/></button></header>
      <div className="nk-admin-guide-language" aria-label="Guide language"><Languages/><button type="button" className={language === 'en' ? 'active' : ''} aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>English</button><button type="button" className={language === 'el' ? 'active' : ''} aria-pressed={language === 'el'} onClick={() => setLanguage('el')}>Ελληνικά</button></div>
      <div className="nk-admin-guide-progress"><span>{index + 1} / {available.length}</span><i><b style={{width: `${((index + 1) / available.length) * 100}%`}}/></i></div>
      <main><small>{language === 'en' ? 'SIDEBAR AREA' : 'ΠΕΡΙΟΧΗ SIDEBAR'}</small><h2 id="admin-guide-title">{item.title[language]}</h2><p>{item.description[language]}</p><div><CheckCircle2/><span><b>{language === 'en' ? 'What you can do' : 'Τι μπορείς να κάνεις'}</b>{item.actions[language]}</span></div>{item.to && <button type="button" className="nk-admin-guide-open-area" onClick={() => onNavigate(item.to!)}>{language === 'en' ? 'Open this area' : 'Άνοιγμα περιοχής'}<ArrowRight/></button>}</main>
      <footer><div className="nk-admin-guide-step-actions"><button type="button" onClick={() => setIndex(current => Math.max(0, current - 1))} disabled={index === 0}><ArrowLeft/>{language === 'en' ? 'Previous' : 'Προηγούμενο'}</button><button type="button" onClick={index === available.length - 1 ? onClose : () => setIndex(current => current + 1)}>{index === available.length - 1 ? (language === 'en' ? 'Finish' : 'Τέλος') : (language === 'en' ? 'Next' : 'Επόμενο')}<ArrowRight/></button></div></footer>
    </section>
  </div>;
}
