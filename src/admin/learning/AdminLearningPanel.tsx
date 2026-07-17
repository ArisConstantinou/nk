import {useEffect, useMemo, useState} from 'react';
import {BookOpenCheck, CheckCircle2, ChevronDown, FlaskConical, HelpCircle, Lightbulb, Play, RotateCcw, ShieldCheck, Workflow, X} from 'lucide-react';
import {useLocation} from 'react-router-dom';
import {useAdminLanguage, type AdminLanguage} from '../i18n/AdminLanguage';

type Copy = {en: string; el: string};
type LearningDefinition = {
  label: Copy;
  purpose: Copy;
  need: Copy;
  steps: Copy[];
  after: Copy;
  example: {title: Copy; steps: Copy[]; result: Copy};
};

const c = (en: string, el: string): Copy => ({en, el});

export const adminLearning: Record<string, LearningDefinition> = {
  '/admin/dashboard': {
    label: c('Dashboard', 'Πίνακας ελέγχου'),
    purpose: c('A control centre that collects drafts, warnings, recent changes and work that needs attention.', 'Ένα κέντρο ελέγχου που συγκεντρώνει πρόχειρα, προειδοποιήσεις, πρόσφατες αλλαγές και εκκρεμότητες.'),
    need: c('Yes. It does not create public content by itself; it helps you find the next task and avoid forgotten drafts.', 'Ναι. Δεν δημιουργεί δημόσιο περιεχόμενο από μόνο του· σας βοηθά να βρίσκετε την επόμενη εργασία και να μην ξεχνάτε πρόχειρα.'),
    steps: [c('Search or filter the work queue.', 'Αναζητήστε ή φιλτράρετε την ουρά εργασιών.'), c('Open the record that needs attention.', 'Ανοίξτε την εγγραφή που χρειάζεται προσοχή.'), c('Publish, archive or continue editing it.', 'Δημοσιεύστε, αρχειοθετήστε ή συνεχίστε την επεξεργασία.')],
    after: c('The underlying record changes; the dashboard simply updates its counts and activity feed.', 'Αλλάζει η αντίστοιχη εγγραφή· ο πίνακας απλώς ενημερώνει τους αριθμούς και τη ροή δραστηριότητας.'),
    example: {title: c('Resolve a forgotten draft', 'Τακτοποίηση ξεχασμένου πρόχειρου'), steps: [c('A draft appears in the work queue.', 'Ένα πρόχειρο εμφανίζεται στην ουρά εργασιών.'), c('You review and publish it.', 'Το ελέγχετε και το δημοσιεύετε.'), c('The draft count decreases and the published count increases.', 'Ο αριθμός προχείρων μειώνεται και των δημοσιευμένων αυξάνεται.')], result: c('The example changes no real data.', 'Το παράδειγμα δεν αλλάζει πραγματικά δεδομένα.')},
  },
  '/admin/pages': {
    label: c('Website Editor', 'Επεξεργαστής ιστοτόπου'),
    purpose: c('A visual editor for changing the live website in place: text, images, sections, spacing and element position.', 'Ένας οπτικός επεξεργαστής για αλλαγές επάνω στον ιστότοπο: κείμενο, εικόνες, ενότητες, αποστάσεις και θέση στοιχείων.'),
    need: c('Use it when layout or visual presentation must change. For structured lists such as Products or Projects, their dedicated sections are faster and safer.', 'Χρησιμοποιήστε τον όταν πρέπει να αλλάξει η διάταξη ή η εμφάνιση. Για δομημένες λίστες όπως Προϊόντα ή Έργα, οι αντίστοιχες ενότητες είναι ταχύτερες και ασφαλέστερες.'),
    steps: [c('Choose a page and enable Edit mode.', 'Επιλέξτε σελίδα και ενεργοποιήστε τη λειτουργία επεξεργασίας.'), c('Select an element, then edit or move it.', 'Επιλέξτε στοιχείο και επεξεργαστείτε ή μετακινήστε το.'), c('Review the draft and publish only when ready.', 'Ελέγξτε το πρόχειρο και δημοσιεύστε μόνο όταν είναι έτοιμο.')],
    after: c('Edits stay in the draft until Publish. The live website remains unchanged before that.', 'Οι αλλαγές μένουν στο πρόχειρο μέχρι τη Δημοσίευση. Ο ζωντανός ιστότοπος δεν αλλάζει πριν από αυτή.'),
    example: {title: c('Add a sample text block', 'Προσθήκη δοκιμαστικού κειμένου'), steps: [c('Select a section.', 'Επιλέγεται μία ενότητα.'), c('Add a heading and adjust its style.', 'Προστίθεται τίτλος και προσαρμόζεται η εμφάνισή του.'), c('Preview it on desktop, tablet and mobile.', 'Γίνεται προεπισκόπηση σε υπολογιστή, tablet και κινητό.')], result: c('Nothing becomes public until you publish.', 'Τίποτα δεν γίνεται δημόσιο μέχρι να το δημοσιεύσετε.')},
  },
  '/admin/site-pages': {
    label: c('Pages & Navigation', 'Σελίδες & Πλοήγηση'),
    purpose: c('Creates website pages and controls where their links appear in the header, mega menus and footer.', 'Δημιουργεί σελίδες ιστοτόπου και ελέγχει πού εμφανίζονται οι σύνδεσμοί τους στην κεφαλίδα, τα μεγάλα μενού και το υποσέλιδο.'),
    need: c('Use a page for a distinct public destination with its own URL. A page does not have to appear in navigation.', 'Χρησιμοποιήστε σελίδα για έναν ξεχωριστό δημόσιο προορισμό με δικό του URL. Δεν είναι υποχρεωτικό να εμφανίζεται στην πλοήγηση.'),
    steps: [c('Create and publish the page.', 'Δημιουργήστε και δημοσιεύστε τη σελίδα.'), c('Drag it to the main navigation or into Services or Shop.', 'Σύρετέ την στην κύρια πλοήγηση ή μέσα στις Υπηρεσίες ή το Κατάστημα.'), c('Edit the link label and order in the same workspace.', 'Επεξεργαστείτε την ετικέτα και τη σειρά του συνδέσμου στον ίδιο χώρο.')],
    after: c('Publishing creates the public route. Adding it to a menu makes that route discoverable through the website navigation.', 'Η δημοσίευση δημιουργεί τη δημόσια διαδρομή. Η προσθήκη σε μενού την κάνει προσβάσιμη από την πλοήγηση του ιστοτόπου.'),
    example: {title: c('Create an “Emergency support” page', 'Δημιουργία σελίδας «Επείγουσα υποστήριξη»'), steps: [c('A draft page is created at /emergency-support.', 'Δημιουργείται πρόχειρη σελίδα στο /emergency-support.'), c('The page is reviewed and published.', 'Η σελίδα ελέγχεται και δημοσιεύεται.'), c('Its link is placed inside the Services menu.', 'Ο σύνδεσμός της τοποθετείται μέσα στο μενού Υπηρεσίες.')], result: c('The route and its menu placement remain separately controllable.', 'Η διαδρομή και η θέση της στο μενού παραμένουν ανεξάρτητα ελεγχόμενες.')},
  },
  '/admin/services': {
    label: c('Services', 'Υπηρεσίες'),
    purpose: c('Structured records for work the company performs, including summary, deliverables and suitable applications.', 'Δομημένες εγγραφές για εργασίες που προσφέρει η εταιρεία, με περίληψη, παραδοτέα και κατάλληλες εφαρμογές.'),
    need: c('Create a service when customers can request that type of professional work. Do not use Services for items sold as products.', 'Δημιουργήστε υπηρεσία όταν οι πελάτες μπορούν να ζητήσουν αυτόν τον τύπο επαγγελματικής εργασίας. Μη χρησιμοποιείτε τις Υπηρεσίες για προϊόντα προς πώληση.'),
    steps: [c('Add its name, code and customer-facing summary.', 'Προσθέστε όνομα, κωδικό και περίληψη για τον πελάτη.'), c('List deliverables and suitable applications.', 'Καταγράψτε παραδοτέα και κατάλληλες εφαρμογές.'), c('Save, preview and publish.', 'Αποθηκεύστε, ελέγξτε και δημοσιεύστε.')],
    after: c('The service becomes available to service listings and service-related website sections.', 'Η υπηρεσία γίνεται διαθέσιμη στις λίστες και στις σχετικές ενότητες του ιστοτόπου.'),
    example: {title: c('Build an EV charger installation service', 'Δημιουργία υπηρεσίας εγκατάστασης φορτιστή EV'), steps: [c('Add a clear headline and description.', 'Προστίθεται σαφής τίτλος και περιγραφή.'), c('List survey, installation and testing as deliverables.', 'Καταγράφονται αυτοψία, εγκατάσταση και δοκιμή ως παραδοτέα.'), c('Publish the verified record.', 'Δημοσιεύεται η επιβεβαιωμένη εγγραφή.')], result: c('Visitors can understand exactly what is included.', 'Οι επισκέπτες καταλαβαίνουν ακριβώς τι περιλαμβάνεται.')},
  },
  '/admin/projects': {
    label: c('Projects', 'Έργα'),
    purpose: c('A verified portfolio of completed work with images, dates, categories and installed systems.', 'Ένα επιβεβαιωμένο χαρτοφυλάκιο ολοκληρωμένων έργων με εικόνες, ημερομηνίες, κατηγορίες και εγκατεστημένα συστήματα.'),
    need: c('Use Projects as proof of completed work. Do not add proposals or unfinished jobs unless clearly marked and intentionally supported.', 'Χρησιμοποιήστε τα Έργα ως απόδειξη ολοκληρωμένης εργασίας. Μην προσθέτετε προσφορές ή ημιτελείς εργασίες χωρίς σαφή σήμανση.'),
    steps: [c('Upload or select the project image.', 'Ανεβάστε ή επιλέξτε την εικόνα του έργου.'), c('Add verified scope, category and completion date.', 'Προσθέστε επιβεβαιωμένο αντικείμενο, κατηγορία και ημερομηνία ολοκλήρωσης.'), c('Preview and publish the portfolio entry.', 'Ελέγξτε και δημοσιεύστε την εγγραφή χαρτοφυλακίου.')],
    after: c('The project appears in public project listings and can be filtered by its structured fields.', 'Το έργο εμφανίζεται στις δημόσιες λίστες και μπορεί να φιλτραριστεί από τα δομημένα πεδία του.'),
    example: {title: c('Add a completed villa lighting project', 'Προσθήκη ολοκληρωμένου έργου φωτισμού βίλας'), steps: [c('Choose a finished-site photograph.', 'Επιλέγεται φωτογραφία του ολοκληρωμένου χώρου.'), c('Record lighting control and protection systems.', 'Καταγράφονται συστήματα ελέγχου φωτισμού και προστασίας.'), c('Publish after project details are verified.', 'Δημοσιεύεται μετά την επιβεβαίωση των στοιχείων.')], result: c('The public archive gains credible, searchable evidence.', 'Το δημόσιο αρχείο αποκτά αξιόπιστη και αναζητήσιμη τεκμηρίωση.')},
  },
  '/admin/company': {
    label: c('Company', 'Εταιρεία'),
    purpose: c('The shared source for the company story, history and partnership information.', 'Η κοινή πηγή για την ιστορία, την πορεία και τις συνεργασίες της εταιρείας.'),
    need: c('Usually one company record is enough. Update it when verified company facts change.', 'Συνήθως αρκεί μία εγγραφή εταιρείας. Ενημερώστε την όταν αλλάζουν επιβεβαιωμένα εταιρικά στοιχεία.'),
    steps: [c('Open the company record.', 'Ανοίξτε την εγγραφή εταιρείας.'), c('Update the introduction, history or partnerships.', 'Ενημερώστε την εισαγωγή, την ιστορία ή τις συνεργασίες.'), c('Review factual accuracy, then publish.', 'Ελέγξτε την ακρίβεια και μετά δημοσιεύστε.')],
    after: c('Public company and About sections use the updated source.', 'Οι δημόσιες εταιρικές ενότητες και η σελίδα Σχετικά χρησιμοποιούν την ενημερωμένη πηγή.'),
    example: {title: c('Add a verified partnership', 'Προσθήκη επιβεβαιωμένης συνεργασίας'), steps: [c('Open the single company record.', 'Ανοίγει η μοναδική εγγραφή εταιρείας.'), c('Add the partner and relationship context.', 'Προστίθενται ο συνεργάτης και το πλαίσιο συνεργασίας.'), c('Publish after approval.', 'Δημοσιεύεται μετά την έγκριση.')], result: c('The company story stays consistent wherever it is reused.', 'Η εταιρική ιστορία παραμένει συνεπής όπου επαναχρησιμοποιείται.')},
  },
  '/admin/products': {
    label: c('Products', 'Προϊόντα'),
    purpose: c('Sellable or browsable product records, kept separate from installation services.', 'Εγγραφές προϊόντων προς πώληση ή περιήγηση, ξεχωριστές από τις υπηρεσίες εγκατάστασης.'),
    need: c('Use Products only for physical items customers can browse. If the website is not operating a product catalogue, keep records unpublished.', 'Χρησιμοποιήστε Προϊόντα μόνο για φυσικά είδη που μπορούν να δουν οι πελάτες. Αν ο ιστότοπος δεν λειτουργεί ως κατάλογος προϊόντων, κρατήστε τα αδημοσίευτα.'),
    steps: [c('Add the product title, category and image.', 'Προσθέστε τίτλο, κατηγορία και εικόνα προϊόντος.'), c('Add a useful customer description.', 'Προσθέστε χρήσιμη περιγραφή για τον πελάτη.'), c('Preview its shop placement and publish.', 'Ελέγξτε τη θέση του στο κατάστημα και δημοσιεύστε.')],
    after: c('The product can appear in shop listings and category filters.', 'Το προϊόν μπορεί να εμφανιστεί στις λίστες καταστήματος και στα φίλτρα κατηγορίας.'),
    example: {title: c('Add an outdoor wall light', 'Προσθήκη εξωτερικού φωτιστικού τοίχου'), steps: [c('Select Lighting and Outdoor.', 'Επιλέγονται Φωτισμός και Εξωτερικός χώρος.'), c('Add the optimized product image.', 'Προστίθεται η βελτιστοποιημένη εικόνα προϊόντος.'), c('Publish the complete record.', 'Δημοσιεύεται η ολοκληρωμένη εγγραφή.')], result: c('The item becomes discoverable through relevant shop filters.', 'Το είδος γίνεται διαθέσιμο μέσω των σχετικών φίλτρων καταστήματος.')},
  },
  '/admin/catalogues': {
    label: c('Catalogues', 'Κατάλογοι'),
    purpose: c('A controlled collection of brand PDF files and external catalogue links.', 'Μία ελεγχόμενη συλλογή αρχείων PDF εταιρειών και εξωτερικών συνδέσμων καταλόγων.'),
    need: c('Use it when visitors need manufacturer literature. Remove or archive expired links so customers do not open outdated catalogues.', 'Χρησιμοποιήστε το όταν οι επισκέπτες χρειάζονται υλικό κατασκευαστών. Αφαιρέστε ή αρχειοθετήστε παλιούς συνδέσμους.'),
    steps: [c('Choose the brand, year and focus.', 'Επιλέξτε εταιρεία, έτος και αντικείμενο.'), c('Add a working HTTPS PDF or catalogue URL.', 'Προσθέστε λειτουργικό HTTPS URL PDF ή καταλόγου.'), c('Test the link before publishing.', 'Δοκιμάστε τον σύνδεσμο πριν από τη δημοσίευση.')],
    after: c('Visitors can open the catalogue from the public catalogue area.', 'Οι επισκέπτες μπορούν να ανοίξουν τον κατάλογο από τη δημόσια περιοχή καταλόγων.'),
    example: {title: c('Add a 2026 lighting catalogue', 'Προσθήκη καταλόγου φωτισμού 2026'), steps: [c('Select its brand and 2026.', 'Επιλέγονται η εταιρεία και το 2026.'), c('Paste and test the official PDF URL.', 'Επικολλάται και δοκιμάζεται το επίσημο URL PDF.'), c('Publish the verified link.', 'Δημοσιεύεται ο επιβεβαιωμένος σύνδεσμος.')], result: c('Customers reach the official document without uploading a duplicate.', 'Οι πελάτες φτάνουν στο επίσημο έγγραφο χωρίς διπλό ανέβασμα.')},
  },
  '/admin/forms': {
    label: c('Forms & Submissions', 'Φόρμες & Υποβολές'),
    purpose: c('A Form defines the questions visitors see. A Submission is the saved answer produced when a visitor sends that form.', 'Η Φόρμα ορίζει τις ερωτήσεις που βλέπει ο επισκέπτης. Η Υποβολή είναι η αποθηκευμένη απάντηση όταν ο επισκέπτης στείλει τη φόρμα.'),
    need: c('You need forms only when the website must collect information such as quote requests or project details. If no information should be collected, leave the form inactive.', 'Χρειάζεστε φόρμες μόνο όταν ο ιστότοπος πρέπει να συλλέγει πληροφορίες, όπως αιτήματα προσφοράς ή στοιχεία έργου. Αν δεν πρέπει να συλλέγονται δεδομένα, αφήστε τη φόρμα ανενεργή.'),
    steps: [c('Open Form definitions and create a form.', 'Ανοίξτε τους Ορισμούς φορμών και δημιουργήστε μία φόρμα.'), c('Add and order fields, a success message and the responsible recipient.', 'Προσθέστε και ταξινομήστε πεδία, μήνυμα επιτυχίας και υπεύθυνο παραλήπτη.'), c('Activate it and place that form on the appropriate public page.', 'Ενεργοποιήστε την και τοποθετήστε τη στην κατάλληλη δημόσια σελίδα.')],
    after: c('When a visitor submits: validation runs, the visitor sees the success message, the answer is stored, the dashboard count updates, and staff can process it in Submissions. This installation does not send email automatically.', 'Όταν ο επισκέπτης υποβάλει: γίνεται έλεγχος, εμφανίζεται μήνυμα επιτυχίας, η απάντηση αποθηκεύεται, ενημερώνεται ο πίνακας και το προσωπικό τη διαχειρίζεται στις Υποβολές. Αυτή η εγκατάσταση δεν στέλνει email αυτόματα.'),
    example: {title: c('Build a “Request a quote” form', 'Δημιουργία φόρμας «Αίτημα προσφοράς»'), steps: [c('Create fields for name, email, phone and project details.', 'Δημιουργούνται πεδία για όνομα, email, τηλέφωνο και στοιχεία έργου.'), c('Activate the form and a visitor sends it.', 'Η φόρμα ενεργοποιείται και ένας επισκέπτης την υποβάλλει.'), c('A new submission appears for staff follow-up.', 'Εμφανίζεται νέα υποβολή για παρακολούθηση από το προσωπικό.')], result: c('This simulation stores nothing and sends nothing.', 'Η προσομοίωση δεν αποθηκεύει και δεν στέλνει τίποτα.')},
  },
  '/admin/enquiries': {
    label: c('Enquiries', 'Αιτήματα'),
    purpose: c('A lightweight customer follow-up inbox for calls, emails and requests recorded by staff.', 'Ένα απλό αρχείο παρακολούθησης πελατών για κλήσεις, email και αιτήματα που καταγράφει το προσωπικό.'),
    need: c('Use it when a request arrives outside a website form or needs accountable follow-up. Website form answers remain under Submissions.', 'Χρησιμοποιήστε το όταν ένα αίτημα φτάνει εκτός φόρμας ιστοτόπου ή χρειάζεται υπεύθυνη παρακολούθηση. Οι απαντήσεις φορμών παραμένουν στις Υποβολές.'),
    steps: [c('Record the customer and request source.', 'Καταγράψτε τον πελάτη και την πηγή αιτήματος.'), c('Assign it and update its status.', 'Αναθέστε το και ενημερώστε την κατάστασή του.'), c('Add internal notes until it is resolved.', 'Προσθέστε εσωτερικές σημειώσεις μέχρι να ολοκληρωθεί.')],
    after: c('The enquiry stays in the operational inbox with its status and history; it does not alter public website content.', 'Το αίτημα παραμένει στο λειτουργικό αρχείο με την κατάσταση και το ιστορικό του· δεν αλλάζει δημόσιο περιεχόμενο.'),
    example: {title: c('Record a phone request', 'Καταγραφή τηλεφωνικού αιτήματος'), steps: [c('Record the caller and requested work.', 'Καταγράφονται ο καλών και η ζητούμενη εργασία.'), c('Assign the enquiry to a responsible user.', 'Το αίτημα ανατίθεται σε υπεύθυνο χρήστη.'), c('Mark it resolved after follow-up.', 'Σημειώνεται ως ολοκληρωμένο μετά την επικοινωνία.')], result: c('The team retains a clear, accountable trail.', 'Η ομάδα διατηρεί σαφές και ελεγχόμενο ιστορικό.')},
  },
  '/admin/media': {
    label: c('Media', 'Πολυμέσα'),
    purpose: c('The reusable library for website images, documents and video, including variants and usage information.', 'Η επαναχρησιμοποιήσιμη βιβλιοθήκη εικόνων, εγγράφων και βίντεο του ιστοτόπου, με παραλλαγές και πληροφορίες χρήσης.'),
    need: c('Use Media for files reused by the website. Avoid uploading duplicates; replacing one managed asset can preserve its references.', 'Χρησιμοποιήστε τα Πολυμέσα για αρχεία που επαναχρησιμοποιεί ο ιστότοπος. Αποφύγετε διπλότυπα· η αντικατάσταση ενός αρχείου μπορεί να διατηρήσει τις αναφορές του.'),
    steps: [c('Upload and categorize the asset.', 'Ανεβάστε και κατηγοριοποιήστε το αρχείο.'), c('Add meaningful alt text and metadata.', 'Προσθέστε ουσιαστικό εναλλακτικό κείμενο και μεταδεδομένα.'), c('Select it from a page, product or project.', 'Επιλέξτε το από σελίδα, προϊόν ή έργο.')],
    after: c('The asset receives a stable URL and can show where it is used before replacement or deletion.', 'Το αρχείο αποκτά σταθερό URL και μπορεί να δείξει πού χρησιμοποιείται πριν από αντικατάσταση ή διαγραφή.'),
    example: {title: c('Prepare a project photograph', 'Προετοιμασία φωτογραφίας έργου'), steps: [c('Upload the original image.', 'Ανεβαίνει η αρχική εικόνα.'), c('Add alt text and a Project category.', 'Προστίθεται εναλλακτικό κείμενο και κατηγορία Έργο.'), c('Use its optimized variant in a project.', 'Χρησιμοποιείται η βελτιστοποιημένη παραλλαγή σε έργο.')], result: c('One managed source supplies the public website.', 'Μία διαχειριζόμενη πηγή τροφοδοτεί τον δημόσιο ιστότοπο.')},
  },
  '/admin/settings': {
    label: c('Site Settings', 'Ρυθμίσεις ιστοτόπου'),
    purpose: c('Global values reused across the whole website: brand, contact details, social links, header, footer and default SEO.', 'Καθολικές τιμές που χρησιμοποιούνται σε όλο τον ιστότοπο: εταιρικά στοιχεία, επικοινωνία, κοινωνικά δίκτυα, κεφαλίδα, υποσέλιδο και προεπιλεγμένο SEO.'),
    need: c('Use Settings for information that should change everywhere at once. Page-specific copy belongs to Pages or the relevant content section.', 'Χρησιμοποιήστε τις Ρυθμίσεις για πληροφορίες που πρέπει να αλλάξουν παντού μαζί. Το περιεχόμενο συγκεκριμένης σελίδας ανήκει στις Σελίδες ή στη σχετική ενότητα.'),
    steps: [c('Choose the relevant settings category.', 'Επιλέξτε τη σχετική κατηγορία ρυθμίσεων.'), c('Edit values while checking the live draft preview.', 'Επεξεργαστείτε τις τιμές ελέγχοντας τη ζωντανή προεπισκόπηση.'), c('Save and publish the global change.', 'Αποθηκεύστε και δημοσιεύστε την καθολική αλλαγή.')],
    after: c('Every website component that reads that global value updates together.', 'Κάθε στοιχείο του ιστοτόπου που χρησιμοποιεί αυτή την καθολική τιμή ενημερώνεται μαζί.'),
    example: {title: c('Change the public phone number', 'Αλλαγή δημόσιου τηλεφώνου'), steps: [c('Update the primary contact number.', 'Ενημερώνεται το κύριο τηλέφωνο επικοινωνίας.'), c('Check the header and footer preview.', 'Ελέγχονται η κεφαλίδα και το υποσέλιδο στην προεπισκόπηση.'), c('Publish once both are correct.', 'Δημοσιεύεται όταν και τα δύο είναι σωστά.')], result: c('The same number remains consistent across the site.', 'Το ίδιο τηλέφωνο παραμένει συνεπές σε όλο τον ιστότοπο.')},
  },
  '/admin/seo': {
    label: c('SEO', 'SEO'),
    purpose: c('Controls how each public route is described to search engines and social sharing systems.', 'Ελέγχει πώς περιγράφεται κάθε δημόσια διαδρομή στις μηχανές αναζήτησης και στις κοινοποιήσεις κοινωνικών δικτύων.'),
    need: c('Use SEO for important public routes. Pages can work without a custom record, but deliberate titles and descriptions improve clarity and control.', 'Χρησιμοποιήστε SEO για σημαντικές δημόσιες διαδρομές. Οι σελίδες λειτουργούν χωρίς ειδική εγγραφή, αλλά οι σωστοί τίτλοι και περιγραφές βελτιώνουν τον έλεγχο.'),
    steps: [c('Select the public route.', 'Επιλέξτε τη δημόσια διαδρομή.'), c('Write an accurate search title and description.', 'Γράψτε ακριβή τίτλο και περιγραφή αναζήτησης.'), c('Confirm canonical URL, indexing and sharing image.', 'Επιβεβαιώστε canonical URL, ευρετηρίαση και εικόνα κοινοποίησης.')],
    after: c('The route emits the updated metadata. Search engines decide when to recrawl and display it; changes are not immediate in search results.', 'Η διαδρομή εκπέμπει τα ενημερωμένα μεταδεδομένα. Οι μηχανές αναζήτησης αποφασίζουν πότε θα τα ανιχνεύσουν· τα αποτελέσματα δεν αλλάζουν αμέσως.'),
    example: {title: c('Prepare SEO for a services page', 'Προετοιμασία SEO για σελίδα υπηρεσιών'), steps: [c('Choose /services.', 'Επιλέγεται το /services.'), c('Write a useful title and concise description.', 'Γράφονται χρήσιμος τίτλος και σύντομη περιγραφή.'), c('Keep indexing on and verify the canonical URL.', 'Παραμένει ενεργή η ευρετηρίαση και ελέγχεται το canonical URL.')], result: c('The page is technically ready for the next search-engine crawl.', 'Η σελίδα είναι τεχνικά έτοιμη για την επόμενη ανίχνευση μηχανής αναζήτησης.')},
  },
  '/admin/users': {
    label: c('Users', 'Χρήστες'),
    purpose: c('Creates accountable admin accounts and limits each person to the areas required by their role.', 'Δημιουργεί ελεγχόμενους λογαριασμούς διαχείρισης και περιορίζει κάθε άτομο στις περιοχές που απαιτεί ο ρόλος του.'),
    need: c('Create a separate account for every real administrator. Never share one owner account among multiple people.', 'Δημιουργήστε ξεχωριστό λογαριασμό για κάθε πραγματικό διαχειριστή. Μην μοιράζεστε έναν λογαριασμό ιδιοκτήτη.'),
    steps: [c('Add the user with the least-powerful suitable role.', 'Προσθέστε τον χρήστη με τον λιγότερο ισχυρό κατάλληλο ρόλο.'), c('Share the initial password through a secure channel.', 'Μοιραστείτε τον αρχικό κωδικό μέσω ασφαλούς καναλιού.'), c('Disable access immediately when it is no longer required.', 'Απενεργοποιήστε άμεσα την πρόσβαση όταν δεν χρειάζεται πλέον.')],
    after: c('Actions are attributed to that account in the audit log; disabling it closes its active access.', 'Οι ενέργειες αποδίδονται σε αυτόν τον λογαριασμό στο αρχείο ενεργειών· η απενεργοποίηση κλείνει την ενεργή πρόσβαση.'),
    example: {title: c('Add a sales user', 'Προσθήκη χρήστη πωλήσεων'), steps: [c('Create a named account with the Sales role.', 'Δημιουργείται επώνυμος λογαριασμός με ρόλο Πωλήσεων.'), c('The user sees enquiries and submissions only.', 'Ο χρήστης βλέπει μόνο αιτήματα και υποβολές.'), c('Their follow-up changes are recorded.', 'Οι αλλαγές παρακολούθησης καταγράφονται.')], result: c('Access matches responsibility without exposing unrelated controls.', 'Η πρόσβαση αντιστοιχεί στην ευθύνη χωρίς έκθεση άσχετων λειτουργιών.')},
  },
  '/admin/audit': {
    label: c('Audit Log', 'Αρχείο ενεργειών'),
    purpose: c('A read-only accountability trail showing who changed what and when.', 'Ένα ιστορικό λογοδοσίας μόνο για ανάγνωση που δείχνει ποιος άλλαξε τι και πότε.'),
    need: c('Yes for security, troubleshooting and accountability. It is evidence, not another place to edit content.', 'Ναι, για ασφάλεια, επίλυση προβλημάτων και λογοδοσία. Είναι τεκμηρίωση, όχι άλλος χώρος επεξεργασίας περιεχομένου.'),
    steps: [c('Filter by user, action or content type.', 'Φιλτράρετε ανά χρήστη, ενέργεια ή τύπο περιεχομένου.'), c('Inspect the event details and time.', 'Ελέγξτε τις λεπτομέρειες και την ώρα του συμβάντος.'), c('Export the loaded history when evidence is needed.', 'Εξαγάγετε το φορτωμένο ιστορικό όταν χρειάζεται τεκμηρίωση.')],
    after: c('Nothing on the website changes. Exporting creates a local CSV copy of the currently loaded results.', 'Δεν αλλάζει τίποτα στον ιστότοπο. Η εξαγωγή δημιουργεί τοπικό CSV των αποτελεσμάτων που έχουν φορτωθεί.'),
    example: {title: c('Find who published a page', 'Εύρεση ποιος δημοσίευσε σελίδα'), steps: [c('Filter the entity type to Page.', 'Φιλτράρεται ο τύπος στοιχείου σε Σελίδα.'), c('Filter the action to Publish.', 'Φιλτράρεται η ενέργεια σε Δημοσίευση.'), c('Read the user and timestamp.', 'Διαβάζονται ο χρήστης και η χρονική σήμανση.')], result: c('You identify the accountable event without modifying it.', 'Εντοπίζετε το υπεύθυνο συμβάν χωρίς να το τροποποιείτε.')},
  },
  '/admin/profile': {
    label: c('Your Profile', 'Το προφίλ σας'),
    purpose: c('Shows your current admin identity, role and account security controls.', 'Δείχνει την τρέχουσα ταυτότητα διαχείρισης, τον ρόλο και τους ελέγχους ασφάλειας λογαριασμού.'),
    need: c('Use it to verify which account is active and to rotate your password. Content is not managed here.', 'Χρησιμοποιήστε το για να επιβεβαιώσετε τον ενεργό λογαριασμό και να αλλάξετε κωδικό. Δεν γίνεται διαχείριση περιεχομένου εδώ.'),
    steps: [c('Confirm your name, email and role.', 'Επιβεβαιώστε όνομα, email και ρόλο.'), c('Enter the current and a strong new password.', 'Εισαγάγετε τον τρέχοντα και έναν ισχυρό νέο κωδικό.'), c('Save and sign in again if requested.', 'Αποθηκεύστε και συνδεθείτε ξανά αν ζητηθεί.')],
    after: c('Only your account credentials change. Website content and other users are unaffected.', 'Αλλάζουν μόνο τα στοιχεία του λογαριασμού σας. Το περιεχόμενο και οι άλλοι χρήστες δεν επηρεάζονται.'),
    example: {title: c('Review account security', 'Έλεγχος ασφάλειας λογαριασμού'), steps: [c('Confirm the active role.', 'Επιβεβαιώνεται ο ενεργός ρόλος.'), c('Choose a unique password.', 'Επιλέγεται μοναδικός κωδικός.'), c('Store it in an approved password manager.', 'Αποθηκεύεται σε εγκεκριμένο διαχειριστή κωδικών.')], result: c('The example does not inspect or expose any password.', 'Το παράδειγμα δεν ελέγχει ούτε αποκαλύπτει κανέναν κωδικό.')},
  },
};

export function learningForPath(pathname: string) {
  return adminLearning[pathname] || adminLearning['/admin/dashboard'];
}

export function learningText(copy: Copy, language: AdminLanguage) {
  return copy[language];
}

type LearningTab = 'purpose' | 'example' | 'steps' | 'after';

export function AdminLearningPanel() {
  const location = useLocation();
  const {language, text} = useAdminLanguage();
  const content = useMemo(() => learningForPath(location.pathname), [location.pathname]);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<LearningTab>('purpose');
  const [demoStep, setDemoStep] = useState(0);
  useEffect(() => {setOpen(false); setTab('purpose'); setDemoStep(0);}, [location.pathname]);
  const label = learningText(content.label, language);
  const tabs: Array<{id: LearningTab; label: string; icon: typeof HelpCircle}> = [
    {id: 'purpose', label: text('Purpose', 'Σκοπός'), icon: HelpCircle},
    {id: 'example', label: text('Try an example', 'Δοκιμή παραδείγματος'), icon: FlaskConical},
    {id: 'steps', label: text('How to use it', 'Πώς χρησιμοποιείται'), icon: Workflow},
    {id: 'after', label: text('What happens next', 'Τι γίνεται μετά'), icon: Lightbulb},
  ];
  return <section className={`nk-admin-learning${open ? ' is-open' : ''}`} aria-label={text(`Learn about ${label}`, `Μάθετε για: ${label}`)}>
    <button className="nk-admin-learning-summary" type="button" onClick={() => setOpen(value => !value)} aria-expanded={open}>
      <BookOpenCheck/><span><small>{text('UNDERSTAND THIS AREA', 'ΚΑΤΑΝΟΗΣΗ ΕΝΟΤΗΤΑΣ')}</small><b>{text(`What is ${label}, and what happens when I use it?`, `Τι είναι «${label}» και τι συμβαίνει όταν το χρησιμοποιώ;`)}</b><em>{learningText(content.purpose, language)}</em></span><strong>{open ? text('Close explanation', 'Κλείσιμο εξήγησης') : text('Open interactive guide', 'Άνοιγμα διαδραστικού οδηγού')}</strong><ChevronDown/>
    </button>
    {open && <div className="nk-admin-learning-body">
      <div className="nk-admin-learning-tabs" role="tablist" aria-label={text('Learning topics', 'Θέματα εκμάθησης')}>{tabs.map(item => <button type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)} key={item.id}><item.icon/>{item.label}</button>)}</div>
      <div className="nk-admin-learning-content">
        {tab === 'purpose' && <div className="nk-admin-learning-purpose"><article><HelpCircle/><div><small>{text('WHAT IT IS', 'ΤΙ ΕΙΝΑΙ')}</small><p>{learningText(content.purpose, language)}</p></div></article><article><ShieldCheck/><div><small>{text('DO I NEED IT?', 'ΤΟ ΧΡΕΙΑΖΟΜΑΙ;')}</small><p>{learningText(content.need, language)}</p></div></article></div>}
        {tab === 'steps' && <ol className="nk-admin-learning-steps">{content.steps.map((step, index) => <li key={step.en}><span>{String(index + 1).padStart(2, '0')}</span><p>{learningText(step, language)}</p></li>)}</ol>}
        {tab === 'after' && <div className="nk-admin-learning-after"><CheckCircle2/><div><small>{text('RESULT / CONSEQUENCE', 'ΑΠΟΤΕΛΕΣΜΑ / ΣΥΝΕΠΕΙΑ')}</small><p>{learningText(content.after, language)}</p></div></div>}
        {tab === 'example' && <div className="nk-admin-learning-example"><header><div><FlaskConical/><span><small>{text('SAFE SIMULATION', 'ΑΣΦΑΛΗΣ ΠΡΟΣΟΜΟΙΩΣΗ')}</small><b>{learningText(content.example.title, language)}</b></span></div><i>{text('No website data changes', 'Δεν αλλάζουν δεδομένα ιστοτόπου')}</i></header><div className="nk-admin-learning-demo-track">{content.example.steps.map((step, index) => <article className={index < demoStep ? 'done' : index === demoStep ? 'current' : ''} key={step.en}><span>{index < demoStep ? <CheckCircle2/> : index + 1}</span><p>{learningText(step, language)}</p></article>)}</div><footer><p>{demoStep >= content.example.steps.length ? learningText(content.example.result, language) : text('Run each step to see the complete workflow.', 'Εκτελέστε κάθε βήμα για να δείτε ολόκληρη τη ροή.')}</p>{demoStep ? <button type="button" onClick={() => setDemoStep(0)}><RotateCcw/>{text('Reset', 'Επαναφορά')}</button> : null}{demoStep < content.example.steps.length && <button className="nk-admin-primary" type="button" onClick={() => setDemoStep(value => value + 1)}><Play/>{text(demoStep ? 'Run next step' : 'Start example', demoStep ? 'Επόμενο βήμα' : 'Έναρξη παραδείγματος')}</button>}</footer></div>}
      </div>
      <button className="nk-admin-learning-close" type="button" onClick={() => setOpen(false)}><X/>{text('Close guide', 'Κλείσιμο οδηγού')}</button>
    </div>}
  </section>;
}
