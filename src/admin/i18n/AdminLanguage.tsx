import {createContext, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode} from 'react';

export type AdminLanguage = 'en' | 'el';

type AdminLanguageContextValue = {
  language: AdminLanguage;
  setLanguage: (language: AdminLanguage) => void;
  text: (english: string, greek: string) => string;
};

const AdminLanguageContext = createContext<AdminLanguageContextValue | null>(null);

const greekUi: Record<string, string> = {
  'Administration': 'Διαχείριση',
  'Dashboard': 'Πίνακας ελέγχου',
  'Website Editor': 'Επεξεργαστής ιστοτόπου',
  'Pages & Navigation': 'Σελίδες & Πλοήγηση',
  'Pages & navigation': 'Σελίδες & πλοήγηση',
  'Services': 'Υπηρεσίες',
  'Projects': 'Έργα',
  'Company': 'Εταιρεία',
  'Products': 'Προϊόντα',
  'Shop products': 'Προϊόντα καταστήματος',
  'Catalogues': 'Κατάλογοι',
  'Form Submissions': 'Φόρμες & Υποβολές',
  'Forms & submissions': 'Φόρμες & υποβολές',
  'FORMS / REAL SUBMISSIONS': 'ΦΟΡΜΕΣ / ΠΡΑΓΜΑΤΙΚΕΣ ΥΠΟΒΟΛΕΣ',
  'Enquiries': 'Αιτήματα',
  'Media': 'Πολυμέσα',
  'Media library': 'Βιβλιοθήκη πολυμέσων',
  'Site Settings': 'Ρυθμίσεις ιστοτόπου',
  'Website settings': 'Ρυθμίσεις ιστοτόπου',
  'SEO': 'SEO',
  'SEO & routes': 'SEO & διαδρομές',
  'Users': 'Χρήστες',
  'Users & roles': 'Χρήστες & ρόλοι',
  'Audit Log': 'Αρχείο ενεργειών',
  'Activity & audit log': 'Δραστηριότητα & αρχείο ενεργειών',
  'My Activity': 'Η δραστηριότητά μου',
  'Your Profile': 'Το προφίλ σας',
  'Your profile': 'Το προφίλ σας',
  'OVERVIEW': 'ΕΠΙΣΚΟΠΗΣΗ',
  'CONTENT': 'ΠΕΡΙΕΧΟΜΕΝΟ',
  'SHOP': 'ΚΑΤΑΣΤΗΜΑ',
  'CUSTOMERS': 'ΠΕΛΑΤΕΣ',
  'SETTINGS': 'ΡΥΘΜΙΣΕΙΣ',
  'ADMINISTRATION': 'ΔΙΑΧΕΙΡΙΣΗ',
  'Overview': 'Επισκόπηση',
  'Content': 'Περιεχόμενο',
  'Shop': 'Κατάστημα',
  'Customers': 'Πελάτες',
  'Settings': 'Ρυθμίσεις',
  'Search admin': 'Αναζήτηση διαχείρισης',
  'Search': 'Αναζήτηση',
  'Visit site': 'Επίσκεψη ιστοτόπου',
  'Sign out': 'Αποσύνδεση',
  'Guide / Οδηγός': 'Οδηγός / Guide',
  'Guide': 'Οδηγός',
  'Secure workspace': 'Ασφαλής χώρος εργασίας',
  'Changes are recorded in the audit log': 'Οι αλλαγές καταγράφονται στο αρχείο ενεργειών',
  'Firebase-authenticated workspace': 'Χώρος εργασίας με πιστοποίηση Firebase',
  'Changes are saved in this browser on this device': 'Οι αλλαγές αποθηκεύονται σε αυτό το πρόγραμμα περιήγησης και τη συσκευή',
  'Website control centre': 'Κέντρο ελέγχου ιστοτόπου',
  'Find, review and act on every website item from one accountable workspace.': 'Βρείτε, ελέγξτε και διαχειριστείτε κάθε στοιχείο του ιστοτόπου από έναν ενιαίο χώρο.',
  'Create and edit pages, then place them across every website menu from the same workspace.': 'Δημιουργήστε και επεξεργαστείτε σελίδες και τοποθετήστε τις στα μενού από τον ίδιο χώρο.',
  'Define service-only content, deliverables and suitable applications.': 'Ορίστε το περιεχόμενο, τα παραδοτέα και τις κατάλληλες εφαρμογές κάθε υπηρεσίας.',
  'Maintain the completed project archive, filters and verified dates.': 'Διατηρήστε το αρχείο ολοκληρωμένων έργων, τα φίλτρα και τις επιβεβαιωμένες ημερομηνίες.',
  'Keep the history and partnership narrative in one accountable source.': 'Διατηρήστε την ιστορία και τις συνεργασίες της εταιρείας σε μία αξιόπιστη πηγή.',
  'Manage products separately from installation and design services.': 'Διαχειριστείτε τα προϊόντα ξεχωριστά από τις υπηρεσίες εγκατάστασης και σχεδιασμού.',
  'Manage official brand PDFs and external catalogue links.': 'Διαχειριστείτε επίσημα PDF εταιρειών και εξωτερικούς συνδέσμους καταλόγων.',
  'Build public forms, control their fields and process every stored submission.': 'Δημιουργήστε δημόσιες φόρμες, ελέγξτε τα πεδία τους και διαχειριστείτε κάθε αποθηκευμένη υποβολή.',
  'Track incoming requests, phone calls and follow-up status without losing context.': 'Παρακολουθήστε εισερχόμενα αιτήματα, τηλεφωνήματα και την πορεία επικοινωνίας χωρίς απώλεια πληροφοριών.',
  'Upload, organize, optimize, replace and trace every file used by the website.': 'Ανεβάστε, οργανώστε, βελτιστοποιήστε, αντικαταστήστε και εντοπίστε κάθε αρχείο του ιστοτόπου.',
  'Manage brand assets, contact details, social links, SEO defaults and global layout without changing code.': 'Διαχειριστείτε εταιρικά στοιχεία, επικοινωνία, κοινωνικά δίκτυα, SEO και γενική διάταξη χωρίς αλλαγή κώδικα.',
  'Control route metadata, canonical URLs and indexing decisions.': 'Ελέγξτε τα μεταδεδομένα διαδρομών, τα canonical URL και την ευρετηρίαση.',
  'Create accountable access and restrict each user to the work they perform.': 'Δημιουργήστε ελεγχόμενη πρόσβαση και περιορίστε κάθε χρήστη στις αρμοδιότητές του.',
  'Filter every accountable change by user, action and entity.': 'Φιλτράρετε κάθε καταγεγραμμένη αλλαγή ανά χρήστη, ενέργεια και στοιχείο.',
  'Review your access context and rotate your password securely.': 'Ελέγξτε την πρόσβασή σας και αλλάξτε τον κωδικό σας με ασφάλεια.',
  'Add page': 'Προσθήκη σελίδας',
  'Add service': 'Προσθήκη υπηρεσίας',
  'Add project': 'Προσθήκη έργου',
  'Add product': 'Προσθήκη προϊόντος',
  'Add catalogue': 'Προσθήκη καταλόγου',
  'Create form': 'Δημιουργία φόρμας',
  'Record enquiry': 'Καταγραφή αιτήματος',
  'Upload assets': 'Ανέβασμα αρχείων',
  'Add user': 'Προσθήκη χρήστη',
  'Save': 'Αποθήκευση',
  'Save draft': 'Αποθήκευση πρόχειρου',
  'Save form': 'Αποθήκευση φόρμας',
  'Save link': 'Αποθήκευση συνδέσμου',
  'Save follow-up': 'Αποθήκευση παρακολούθησης',
  'Publish': 'Δημοσίευση',
  'Delete': 'Διαγραφή',
  'Delete permanently': 'Οριστική διαγραφή',
  'Archive': 'Αρχειοθέτηση',
  'Duplicate': 'Δημιουργία αντιγράφου',
  'Copy': 'Αντιγραφή',
  'Edit': 'Επεξεργασία',
  'Add': 'Προσθήκη',
  'Move': 'Μετακίνηση',
  'Move up': 'Μετακίνηση πάνω',
  'Move down': 'Μετακίνηση κάτω',
  'Open': 'Άνοιγμα',
  'Close': 'Κλείσιμο',
  'Back to pages': 'Επιστροφή στις σελίδες',
  'Manage all menus': 'Διαχείριση όλων των μενού',
  'New navigation link': 'Νέος σύνδεσμος πλοήγησης',
  'Add link': 'Προσθήκη συνδέσμου',
  'Active': 'Ενεργό',
  'Inactive': 'Ανενεργό',
  'Published': 'Δημοσιευμένο',
  'Draft': 'Πρόχειρο',
  'Archived': 'Αρχειοθετημένο',
  'All statuses': 'Όλες οι καταστάσεις',
  'All actions': 'Όλες οι ενέργειες',
  'All users': 'Όλοι οι χρήστες',
  'All entity types': 'Όλοι οι τύποι στοιχείων',
  'Newest first': 'Νεότερα πρώτα',
  'Oldest first': 'Παλαιότερα πρώτα',
  'Refresh': 'Ανανέωση',
  'Clear': 'Καθαρισμός',
  'More': 'Περισσότερα',
  'Status': 'Κατάσταση',
  'Last updated': 'Τελευταία ενημέρωση',
  'Record': 'Εγγραφή',
  'Title': 'Τίτλος',
  'Label': 'Ετικέτα',
  'Description': 'Περιγραφή',
  'Category': 'Κατηγορία',
  'Type': 'Τύπος',
  'Name': 'Όνομα',
  'Email': 'Email',
  'Phone': 'Τηλέφωνο',
  'Subject': 'Θέμα',
  'Details': 'Λεπτομέρειες',
  'Internal notes': 'Εσωτερικές σημειώσεις',
  'Form definitions': 'Ορισμοί φορμών',
  'Submissions': 'Υποβολές',
  'Form name': 'Όνομα φόρμας',
  'Stable slug': 'Σταθερό slug',
  'Recipient email': 'Email παραλήπτη',
  'Submit button label': 'Κείμενο κουμπιού υποβολής',
  'Success message': 'Μήνυμα επιτυχίας',
  'Accept public submissions': 'Αποδοχή δημόσιων υποβολών',
  'Fields': 'Πεδία',
  'Add field': 'Προσθήκη πεδίου',
  'Field name': 'Όνομα πεδίου',
  'Placeholder': 'Κείμενο υπόδειξης',
  'Options': 'Επιλογές',
  'Required': 'Υποχρεωτικό',
  'Search forms': 'Αναζήτηση φορμών',
  'Search submissions': 'Αναζήτηση υποβολών',
  'No forms found': 'Δεν βρέθηκαν φόρμες',
  'No submissions found': 'Δεν βρέθηκαν υποβολές',
  'New public form submissions will appear here.': 'Οι νέες δημόσιες υποβολές φορμών θα εμφανίζονται εδώ.',
  'new': 'νέα',
  'Website visitor': 'Επισκέπτης ιστοτόπου',
  'Open submission details': 'Άνοιγμα λεπτομερειών υποβολής',
  'Public route': 'Δημόσια διαδρομή',
  'CONTENT / PAGE COMPOSITION': 'ΠΕΡΙΕΧΟΜΕΝΟ / ΣΥΝΘΕΣΗ ΣΕΛΙΔΑΣ',
  'SERVICES / EXPERTISE': 'ΥΠΗΡΕΣΙΕΣ / ΕΞΕΙΔΙΚΕΥΣΗ',
  'PROJECTS / INSTALLED EVIDENCE': 'ΕΡΓΑ / ΤΕΚΜΗΡΙΩΜΕΝΕΣ ΕΓΚΑΤΑΣΤΑΣΕΙΣ',
  'COMPANY / STORY': 'ΕΤΑΙΡΕΙΑ / ΙΣΤΟΡΙΑ',
  'SHOP / PRODUCT RECORDS': 'ΚΑΤΑΣΤΗΜΑ / ΕΓΓΡΑΦΕΣ ΠΡΟΪΟΝΤΩΝ',
  'SHOP / DOWNLOADS': 'ΚΑΤΑΣΤΗΜΑ / ΛΗΨΕΙΣ',
  'ASSETS / CONTROLLED LIBRARY': 'ΑΡΧΕΙΑ / ΕΛΕΓΧΟΜΕΝΗ ΒΙΒΛΙΟΘΗΚΗ',
  'GLOBAL WEBSITE CONTROL': 'ΚΑΘΟΛΙΚΟΣ ΕΛΕΓΧΟΣ ΙΣΤΟΤΟΠΟΥ',
  'DISCOVERY / SEARCH': 'ΕΝΤΟΠΙΣΜΟΣ / ΑΝΑΖΗΤΗΣΗ',
  'ACCESS / LEAST PRIVILEGE': 'ΠΡΟΣΒΑΣΗ / ΕΛΑΧΙΣΤΑ ΔΙΚΑΙΩΜΑΤΑ',
  'SECURITY / ACCOUNTABILITY': 'ΑΣΦΑΛΕΙΑ / ΛΟΓΟΔΟΣΙΑ',
  'OPERATIONS / CONVERSION INBOX': 'ΛΕΙΤΟΥΡΓΙΑ / ΕΙΣΕΡΧΟΜΕΝΑ ΑΙΤΗΜΑΤΑ',
  'Navigation title': 'Τίτλος πλοήγησης',
  'Primary headline': 'Κύριος τίτλος',
  'Headline accent': 'Έμφαση τίτλου',
  'Supporting headline': 'Υποστηρικτικός τίτλος',
  'Introduction': 'Εισαγωγή',
  'Hero image path': 'Διαδρομή εικόνας hero',
  'Search title': 'Τίτλος αναζήτησης',
  'Meta description': 'Περιγραφή meta',
  'Allow search indexing': 'Να επιτρέπεται η ευρετηρίαση',
  'Opening hours': 'Ωράριο λειτουργίας',
  'Address': 'Διεύθυνση',
  'Public email': 'Δημόσιο email',
  'Loading': 'Φόρτωση',
  'Try again': 'Δοκιμή ξανά',
  'Unable to continue': 'Δεν είναι δυνατή η συνέχεια',
  'Nothing pinned yet': 'Δεν έχει καρφιτσωθεί κάτι ακόμη',
  'No records match these filters': 'Καμία εγγραφή δεν ταιριάζει στα φίλτρα',
  'Draft saved': 'Το πρόχειρο αποθηκεύτηκε',
  'Version': 'Έκδοση',
  'live preview updates immediately': 'η ζωντανή προεπισκόπηση ενημερώνεται άμεσα',
  '· live preview updates immediately': '· η ζωντανή προεπισκόπηση ενημερώνεται άμεσα',
  'Preview device': 'Συσκευή προεπισκόπησης',
  'desktop': 'υπολογιστής',
  'tablet': 'tablet',
  'mobile': 'κινητό',
  'Brand & assets': 'Επωνυμία & αρχεία',
  'Contact & locations': 'Επικοινωνία & τοποθεσίες',
  'Social media': 'Κοινωνικά δίκτυα',
  'SEO defaults': 'Προεπιλογές SEO',
  'Header & footer': 'Κεφαλίδα & υποσέλιδο',
  'Settings sections': 'Ενότητες ρυθμίσεων',
  'Draft-safe preview': 'Ασφαλής προεπισκόπηση πρόχειρου',
  'Your edits appear on the right now. Visitors see them only after publishing.': 'Οι αλλαγές εμφανίζονται τώρα δεξιά. Οι επισκέπτες τις βλέπουν μόνο μετά τη δημοσίευση.',
  'IDENTITY': 'ΤΑΥΤΟΤΗΤΑ',
  'Brand and website assets': 'Επωνυμία και αρχεία ιστοτόπου',
  'Use managed library assets for the logo, favicon and default sharing image.': 'Χρησιμοποιήστε διαχειριζόμενα αρχεία βιβλιοθήκης για λογότυπο, favicon και προεπιλεγμένη εικόνα κοινοποίησης.',
  'Brand name': 'Επωνυμία',
  'Brand tagline': 'Εταιρικό σύνθημα',
  'Logo alternative text': 'Εναλλακτικό κείμενο λογοτύπου',
  'Site name': 'Όνομα ιστοτόπου',
  'Primary logo': 'Κύριο λογότυπο',
  'No managed asset': 'Χωρίς διαχειριζόμενο αρχείο',
  'Replacing the selected media asset later preserves this placement.': 'Η μελλοντική αντικατάσταση του επιλεγμένου αρχείου διατηρεί αυτή τη θέση.',
  'Favicon': 'Favicon',
  'Use a square PNG or WEBP for best browser support.': 'Χρησιμοποιήστε τετράγωνο PNG ή WEBP για καλύτερη υποστήριξη.',
  'Default social sharing image': 'Προεπιλεγμένη εικόνα κοινοποίησης',
  'Used when a page-specific Open Graph image is not set.': 'Χρησιμοποιείται όταν δεν έχει οριστεί εικόνα Open Graph για τη σελίδα.',
  'LIVE DRAFT': 'ΖΩΝΤΑΝΟ ΠΡΟΧΕΙΡΟ',
  'Open site': 'Άνοιγμα ιστοτόπου',
  'Contact details': 'Στοιχεία επικοινωνίας',
  'Primary contact information': 'Κύρια στοιχεία επικοινωνίας',
  'Social links': 'Σύνδεσμοι κοινωνικών δικτύων',
  'Add social link': 'Προσθήκη κοινωνικού συνδέσμου',
  'GLOBAL LAYOUT': 'ΚΑΘΟΛΙΚΗ ΔΙΑΤΑΞΗ',
  'Header and footer': 'Κεφαλίδα και υποσέλιδο',
  'Control visibility, calls to action and global footer content.': 'Ελέγξτε την ορατότητα, τις παροτρύνσεις και το καθολικό περιεχόμενο του υποσέλιδου.',
  'Sticky header': 'Σταθερή κεφαλίδα',
  'Keep navigation visible while scrolling.': 'Διατηρεί την πλοήγηση ορατή κατά την κύλιση.',
  'Brand wires': 'Καλώδια λογοτύπου',
  'Show the four conductors above the NK logo.': 'Εμφάνιση των τεσσάρων αγωγών πάνω από το λογότυπο NK.',
  'DIN rail': 'Ράγα DIN',
  'Show the metal rail behind “Electrical”.': 'Εμφάνιση της μεταλλικής ράγας πίσω από το «Electrical».',
  'Header tagline': 'Σύνθημα κεφαλίδας',
  'Header social links': 'Κοινωνικοί σύνδεσμοι κεφαλίδας',
  'Footer social links': 'Κοινωνικοί σύνδεσμοι υποσέλιδου',
  'Footer contact column': 'Στήλη επικοινωνίας υποσέλιδου',
  'Footer opening hours': 'Ωράριο στο υποσέλιδο',
  'Header call-to-action label': 'Κείμενο παρότρυνσης κεφαλίδας',
  'Header call-to-action URL': 'URL παρότρυνσης κεφαλίδας',
  'Footer eyebrow': 'Υπερκείμενο υποσέλιδου',
  'Footer call-to-action label': 'Κείμενο παρότρυνσης υποσέλιδου',
  'Footer headline': 'Κύριος τίτλος υποσέλιδου',
  'Copyright': 'Πνευματικά δικαιώματα',
  'Service code': 'Κωδικός υπηρεσίας',
  'Service icon': 'Εικονίδιο υπηρεσίας',
  'Page headline': 'Τίτλος σελίδας',
  'Summary': 'Περίληψη',
  'Full introduction': 'Πλήρης εισαγωγή',
  'Deliverables': 'Παραδοτέα',
  'Suitable applications': 'Κατάλληλες εφαρμογές',
  'Separate items with commas.': 'Χωρίστε τα στοιχεία με κόμματα.',
  'Product image path': 'Διαδρομή εικόνας προϊόντος',
  'Season': 'Εποχή',
  'Space': 'Χώρος',
  'Brand': 'Εταιρεία',
  'Year': 'Έτος',
  'Focus': 'Εστίαση',
  'PDF or catalogue URL': 'URL PDF ή καταλόγου',
  'Project number': 'Αριθμός έργου',
  'Completion date': 'Ημερομηνία ολοκλήρωσης',
  'Project image path': 'Διαδρομή εικόνας έργου',
  'Short project type': 'Σύντομος τύπος έργου',
  'Project description': 'Περιγραφή έργου',
  'Systems delivered': 'Συστήματα που παραδόθηκαν',
  'About heading': 'Τίτλος σχετικά με την εταιρεία',
  'Company introduction': 'Εισαγωγή εταιρείας',
  'History and timeline': 'Ιστορία και χρονολόγιο',
  'Partnerships': 'Συνεργασίες',
  'Canonical override': 'Παράκαμψη canonical URL',
  'Social sharing image': 'Εικόνα κοινοποίησης',
  'Search pages & homepage': 'Αναζήτηση σελίδων & αρχικής',
  'Search navigation links': 'Αναζήτηση συνδέσμων πλοήγησης',
  'Search links': 'Αναζήτηση συνδέσμων',
  'Search enquiries': 'Αναζήτηση αιτημάτων',
  'Search media': 'Αναζήτηση πολυμέσων',
  'Upload': 'Ανέβασμα',
  'Copy URL': 'Αντιγραφή URL',
  'Event': 'Συμβάν',
  'User': 'Χρήστης',
  'Entity': 'Στοιχείο',
  'Time': 'Ώρα',
  'Export loaded CSV': 'Εξαγωγή φορτωμένου CSV',
  'Load more': 'Φόρτωση περισσότερων',
  'What each role can access': 'Σε τι έχει πρόσβαση κάθε ρόλος',
  'Display name': 'Εμφανιζόμενο όνομα',
  'Role': 'Ρόλος',
  'Initial password': 'Αρχικός κωδικός',
  'Create user': 'Δημιουργία χρήστη',
};

const textOriginals = new WeakMap<Text, string>();
const attributeOriginals = new WeakMap<Element, Map<string, string>>();

export function translateAdminUi(value: string): string {
  const leading = value.match(/^\s*/)?.[0] || '';
  const trailing = value.match(/\s*$/)?.[0] || '';
  const core = value.trim();
  if (!core) return value;
  let translated = greekUi[core];
  if (!translated) {
    translated = core
      .replace(/^Version (\d+)$/, 'Έκδοση $1')
      .replace(/^Version (\d+) · live preview updates immediately$/, 'Έκδοση $1 · η ζωντανή προεπισκόπηση ενημερώνεται άμεσα')
      .replace(/^(\d+) new$/, '$1 νέα')
      .replace(/^(\d+) fields$/, '$1 πεδία')
      .replace(/^Showing (\d+) of (\d+)$/, 'Εμφάνιση $1 από $2')
      .replace(/^Loading (.+)…$/, 'Φόρτωση $1…')
      .replace(/^Search (.+)$/, 'Αναζήτηση $1')
      .replace(/^Actions for (.+)$/, 'Ενέργειες για $1')
      .replace(/^Reorder (.+)$/, 'Αναδιάταξη $1')
      .replace(/^Add (.+)$/, 'Προσθήκη $1');
  }
  return `${leading}${translated}${trailing}`;
}

function shouldSkipText(node: Text) {
  const parent = node.parentElement;
  return !parent || Boolean(parent.closest('script,style,noscript,code,pre,[data-no-admin-translate],.nk-visual-stage'));
}

function translateTextNode(node: Text, language: AdminLanguage) {
  if (shouldSkipText(node)) return;
  const current = node.nodeValue || '';
  const known = textOriginals.get(node);
  if (language === 'el') {
    const expected = known ? translateAdminUi(known) : '';
    if (known && current === expected) return;
    textOriginals.set(node, current);
    const next = translateAdminUi(current);
    if (next !== current) node.nodeValue = next;
    return;
  }
  if (known && current === translateAdminUi(known)) node.nodeValue = known;
  else textOriginals.set(node, current);
}

function translateAttributes(element: Element, language: AdminLanguage) {
  if (element.closest('[data-no-admin-translate],.nk-visual-stage')) return;
  const names = ['aria-label', 'placeholder', 'title'];
  let originals = attributeOriginals.get(element);
  if (!originals) { originals = new Map(); attributeOriginals.set(element, originals); }
  for (const name of names) {
    const current = element.getAttribute(name);
    if (!current) continue;
    const known = originals.get(name);
    if (language === 'el') {
      if (known && current === translateAdminUi(known)) continue;
      originals.set(name, current);
      element.setAttribute(name, translateAdminUi(current));
    } else if (known && current === translateAdminUi(known)) element.setAttribute(name, known);
    else originals.set(name, current);
  }
}

function translateTree(root: Element, language: AdminLanguage) {
  translateAttributes(root, language);
  root.querySelectorAll('*').forEach(element => translateAttributes(element, language));
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) { translateTextNode(node as Text, language); node = walker.nextNode(); }
}

export function AdminLanguageProvider({children}: {children: ReactNode}) {
  const [language, setLanguage] = useState<AdminLanguage>(() => localStorage.getItem('nk-admin-language') === 'el' ? 'el' : 'en');
  useEffect(() => {
    localStorage.setItem('nk-admin-language', language);
    localStorage.setItem('nk-admin-guide-language', language);
    document.documentElement.lang = language;
  }, [language]);
  const value = useMemo<AdminLanguageContextValue>(() => ({language, setLanguage, text: (english, greek) => language === 'el' ? greek : english}), [language]);
  return <AdminLanguageContext.Provider value={value}>{children}</AdminLanguageContext.Provider>;
}

export function useAdminLanguage() {
  const value = useContext(AdminLanguageContext);
  if (!value) throw new Error('useAdminLanguage must be used inside AdminLanguageProvider');
  return value;
}

export function AdminTranslationLayer() {
  const {language} = useAdminLanguage();
  useLayoutEffect(() => {
    const shell = document.querySelector<HTMLElement>('.nk-admin-shell');
    if (!shell) return;
    let scheduled = 0;
    let translating = false;
    const run = () => {
      scheduled = 0;
      translating = true;
      translateTree(shell, language);
      translating = false;
    };
    run();
    const observer = new MutationObserver(() => {
      if (translating || scheduled) return;
      scheduled = window.requestAnimationFrame(run);
    });
    observer.observe(shell, {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'placeholder', 'title']});
    return () => {observer.disconnect(); if (scheduled) window.cancelAnimationFrame(scheduled);};
  }, [language]);
  return null;
}
