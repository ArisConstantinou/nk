import type {Catalogue, Product, Project, SiteContent, TeamMember} from './types';
import {publicAsset} from './utils/assets';

const product = (id: string, name: string, category: Product['category'], season: Product['season'], space: Product['space'], ext: string, note: string): Product => ({
  id, name, category, season, space, note, image: publicAsset(`assets/products/${id}.${ext}`),
});

export const products: Product[] = [
  product('oia', 'OIA pendant light', 'Lighting', 'All year', 'Living', 'jpg', 'A sculptural focal point for dining and living spaces.'),
  product('fame', 'FAME pendant lights', 'Lighting', 'Christmas', 'Living', 'jpg', 'Layered glass and warm light for atmospheric gatherings.'),
  product('neri', 'NERI LED surface linear', 'Lighting', 'All year', 'Workspace', 'webp', 'Clean architectural light with a precise linear profile.'),
  product('polo', 'POLO wall light', 'Lighting', 'Summer', 'Outdoor', 'jpg', 'Directional wall light for entrances, terraces and paths.'),
  product('el-led', 'EL LED ceiling light', 'Lighting', 'All year', 'Bedroom', 'jpg', 'Quiet, even illumination for restful interiors.'),
  product('ragno', 'RAGNO pendant light', 'Lighting', 'All year', 'Living', 'jpg', 'A graphic silhouette with expressive branching form.'),
  product('filomena-black', 'FILOMENA — black', 'Lighting', 'All year', 'Living', 'jpg', 'A refined dark finish for contemporary rooms.'),
  product('filomena-gold', 'FILOMENA — gold', 'Lighting', 'Christmas', 'Living', 'jpg', 'Warm metallic character for celebratory interiors.'),
  product('nova', 'NOVA LED ceiling light', 'Lighting', 'All year', 'Living', 'jpg', 'Low-profile ambient light for modern ceilings.'),
  product('zoella', 'ZOELLA gold pendant', 'Lighting', 'Christmas', 'Living', 'jpg', 'Decorative warmth with an elegant gold composition.'),
  product('ceiling-fan', '30″ ceiling fan', 'Cooling', 'Summer', 'Bedroom', 'jpg', 'Compact air movement for bedrooms and smaller rooms.'),
  product('izzy-coffee', 'Izzy 3-in-1 coffee machine', 'Coffee', 'Winter', 'Kitchen', 'webp', 'Flexible preparation for everyday coffee rituals.'),
  product('matestar-coffee', 'MateStar Platinum 3-in-1', 'Coffee', 'Winter', 'Kitchen', 'jpg', 'Three brewing formats in one practical countertop system.'),
  product('bosch-tassimo', 'Bosch Tassimo', 'Coffee', 'Winter', 'Kitchen', 'webp', 'Compact capsule brewing with one-touch operation.'),
  product('nespresso', 'Nespresso Lattissima Touch', 'Coffee', 'Christmas', 'Kitchen', 'jpg', 'Milk-based coffee at the touch of a button.'),
  product('delonghi', 'De’Longhi coffee maker', 'Coffee', 'All year', 'Kitchen', 'png', 'A familiar, focused coffee station for the home.'),
  product('blaupunkt', 'Blaupunkt coffee maker', 'Coffee', 'All year', 'Kitchen', 'jpg', 'Straightforward preparation in a compact footprint.'),
  product('ufesa-barista', 'Ufesa Supreme Barista', 'Coffee', 'Winter', 'Kitchen', 'jpg', 'Manual-style espresso for hands-on home baristas.'),
  product('ufesa-espresso', 'Ufesa Cafetera Espresso', 'Coffee', 'Winter', 'Kitchen', 'jpg', 'Classic espresso preparation with a concise interface.'),
  product('kenwood-multipro', 'Kenwood MultiPro Express', 'Kitchen', 'Christmas', 'Kitchen', 'jpg', 'Fast food preparation for full-table cooking.'),
  product('izzy-kitchen', 'Izzy kitchen machine', 'Kitchen', 'Christmas', 'Kitchen', 'webp', 'Mixing and preparation support for seasonal baking.'),
  product('bosch-multitalent', 'Bosch MultiTalent 3', 'Kitchen', 'All year', 'Kitchen', 'jpg', 'Versatile processing with space-conscious storage.'),
  product('kenwood-chef', 'Kenwood Chef kitchen machine', 'Kitchen', 'Christmas', 'Kitchen', 'jpeg', 'A capable countertop companion for ambitious recipes.'),
  product('steba-airfryer', 'Steba air fryer 8L', 'Kitchen', 'Summer', 'Kitchen', 'webp', 'Generous-capacity cooking with less heat in the kitchen.'),
];

export const catalogues: Catalogue[] = [
  {name: 'ACA Lighting 2026', brand: 'ACA', year: '2026', focus: 'Decorative', url: 'https://www.nk-electrical.com/_files/ugd/734e95_b6b81da622fc49398114c44a869a2e17.pdf'},
  {name: 'Nova Luce 2026 · Book 1', brand: 'Nova Luce', year: '2026', focus: 'Architectural', url: 'https://www.nk-electrical.com/_files/ugd/734e95_b0a7a7aa7224456c9c4e2e3b5001ac0f.pdf'},
  {name: 'ACA Collection', brand: 'ACA', year: 'Collection', focus: 'Decorative', url: 'https://www.nk-electrical.com/_files/ugd/734e95_1bbd9515f4e241e08579380ebcc2d579.pdf'},
  {name: 'Nova Luce 2026 · Book 2', brand: 'Nova Luce', year: '2026', focus: 'Architectural', url: 'https://www.nk-electrical.com/_files/ugd/734e95_543f500129a3482493d1a4d760b062e9.pdf'},
  {name: 'ACA Netto', brand: 'ACA', year: 'Collection', focus: 'Architectural', url: 'https://www.nk-electrical.com/_files/ugd/734e95_2d76b946d4a3427b9469874682e50464.pdf'},
  {name: 'Nova Luce 2025', brand: 'Nova Luce', year: '2025', focus: 'Decorative', url: 'https://www.nk-electrical.com/_files/ugd/734e95_619230a8951443d1b1a6a4d1390d1ea4.pdf'},
  {name: 'ACA Kids', brand: 'ACA', year: 'Collection', focus: 'Kids', url: 'https://www.nk-electrical.com/_files/ugd/734e95_5435f6d2b7df44ce9ba70f6c948c4959.pdf'},
  {name: 'Nova Luce Natural', brand: 'Nova Luce', year: 'Collection', focus: 'Natural', url: 'https://www.nk-electrical.com/_files/ugd/734e95_d270e04f1ac849689dd477e228c46c0e.pdf'},
  {name: 'Nova Luce 2024', brand: 'Nova Luce', year: '2024', focus: 'Decorative', url: 'https://www.nk-electrical.com/_files/ugd/734e95_9f4b83213c0e404b895c6987092e7541.pdf'},
  {name: 'VIOKEF 2026', brand: 'VIOKEF', year: '2026', focus: 'Decorative', url: 'https://www.nk-electrical.com/_files/ugd/734e95_0ecb97542bde426fa7e79144c7a5bc89.pdf'},
  {name: 'VIOKEF 2025', brand: 'VIOKEF', year: '2025', focus: 'Decorative', url: 'https://www.nk-electrical.com/_files/ugd/734e95_f3e2a843c78544a99cb45ad1c9628fec.pdf'},
  {name: 'VK 2025', brand: 'VIOKEF', year: '2025', focus: 'Architectural', url: 'https://www.nk-electrical.com/_files/ugd/734e95_64b88301ce5e4ac38d30bea8d84fbdec.pdf'},
  {name: 'ACA Ceiling Fans', brand: 'ACA', year: 'Collection', focus: 'Fans', url: 'https://www.nk-electrical.com/_files/ugd/734e95_58feccc7d7794a09a77f2eaa4cc20f56.pdf'},
  {name: 'Nova Luce Fans', brand: 'Nova Luce', year: 'Collection', focus: 'Fans', url: 'https://www.nk-electrical.com/_files/ugd/734e95_3eaf8544def4422eb30a03fd2211a836.pdf'},
];

export const team: TeamMember[] = [
  {name: 'Ntinos Constantinou', role: 'Founder · Director', responsibility: 'Technical direction', workArea: 'Company direction & technical oversight', characteristics: ['Project judgement', 'Client accountability', 'Four decades of experience'], email: 'ntinos@nk-electrical.com', image: publicAsset('assets/team/illustrated/ntinos-faceless.webp'), linkedin: 'https://www.linkedin.com/in/ntinos-constantinou-21b939b4/', branch: 'Leadership'},
  {name: 'Eliana Constantinou', role: 'Founder · Accountant', responsibility: 'Finance & operations', workArea: 'Finance, administration & supplier coordination', characteristics: ['Budget control', 'Accounts', 'Operational continuity'], email: 'eliana@nk-electrical.com', image: publicAsset('assets/team/illustrated/eliana-faceless.webp'), branch: 'Leadership'},
  {name: 'Aris Constantinou', role: 'Electrical Installations Manager', responsibility: 'Installation leadership', workArea: 'Electricians, site installations & quality control', characteristics: ['Crew planning', 'Installation quality', 'Electrical safety'], image: publicAsset('assets/team/illustrated/aris-faceless.webp'), linkedin: 'https://www.linkedin.com/in/aris-constantinou-94624986/', branch: 'Electrical installations'},
  {name: 'Thelma Constantinou', role: 'Lighting Department', responsibility: 'Lighting design', workArea: 'Interior & architectural lighting', characteristics: ['Lighting plans', 'Luminaire specification', 'Atmosphere & glare control'], credential: 'MA Interior Design · BA Interior Architecture', email: 'thelma@nk-electrical.com', image: publicAsset('assets/team/illustrated/thelma-faceless.webp'), linkedin: 'https://www.linkedin.com/in/thelma-constantinou-164aa097/', branch: 'Design & retail'},
  {name: 'Stephanos Constantinou', role: 'Electrical Engineer', responsibility: 'Power engineering', workArea: 'Power distribution & electrical engineering', characteristics: ['Load studies', 'Protection design', 'Testing'], credential: 'MSc Electrical Power Engineering', email: 'stephanos@nk-electrical.com', image: publicAsset('assets/team/illustrated/stephanos-faceless.webp'), linkedin: 'https://www.linkedin.com/in/stephanos-constantinou-39343514b/', branch: 'Engineering'},
  {name: 'Installation team', role: 'Team of Electricians', responsibility: 'Company backbone', workArea: 'Residential & commercial electrical installations', characteristics: ['Containment & wiring', 'Fitting installation', 'Maintenance'], credential: 'Qualified electrical installation team', image: publicAsset('assets/team/illustrated/electricians-faceless.webp'), branch: 'Electrical installations'},
  {name: 'Andreas Constantinou', role: 'Electrical Engineer', responsibility: 'Automation & controls', workArea: 'Automation & control engineering', characteristics: ['System logic', 'Control panels', 'Control system testing'], credential: 'MSc Advanced Control & Systems Engineering', email: 'andreas@nk-electrical.com', image: publicAsset('assets/team/illustrated/andreas-faceless.webp'), linkedin: 'https://www.linkedin.com/in/andreas-constantinou-66707278/', branch: 'Engineering'},
  {name: 'Andreas M.', role: 'CCTV & Security Systems Installer', responsibility: 'Cameras & security', workArea: 'CCTV, alarms, access control & system fitting', characteristics: ['CCTV installation', 'Alarm systems', 'Access control'], credential: 'Security systems installation', image: publicAsset('assets/team/illustrated/andreas-m-faceless.webp'), branch: 'Cameras & security'},
  {name: 'Lenia Kouri', role: 'Receptionist & Sales', responsibility: 'Reception & sales', workArea: 'Reception, customer enquiries & showroom sales', characteristics: ['Front desk', 'Customer enquiries', 'Product sales'], email: 'info@nk-electrical.com', image: publicAsset('assets/team/illustrated/lenia-faceless.webp'), branch: 'Reception & sales'},
];

const archivedProjectNames = [
  'Bank of Cyprus Head Offices', 'Private Residence', 'Building Residence + Offices + Stores', 'Private Residence', 'Private Residence', 'Private Residence', 'Private Residence', 'Private Residence', 'Private Residence', 'Private Residence', 'Private Residence', 'Building Residence', 'Private Residence', 'Athienitis Supermarket, Pallouriotissa', 'Building Residence', 'Building Residence', 'Private Residence', 'Building Residence', 'Private Residence', 'Private Residence', 'Private Residence', 'Private Residence', 'Private Residence', 'Private Residence', 'Building Residence',
];

const projectType = (name: string) => {
  if (name.includes('Bank of Cyprus')) return 'Commercial offices · electrical & LED lighting';
  if (name.includes('Supermarket')) return 'Retail · electrical & LED lighting';
  if (name.includes('Offices + Stores')) return 'Mixed use · residential, offices & retail';
  if (name === 'Building Residence') return 'Residential building · electrical & LED lighting';
  return 'Private residence · electrical & LED lighting';
};

const projectCategory = (name: string): Project['category'] => {
  if (name.includes('Bank of Cyprus')) return 'Commercial';
  if (name.includes('Supermarket')) return 'Retail';
  if (name.includes('Offices + Stores')) return 'Mixed use';
  return 'Residential';
};

export const projects: Project[] = archivedProjectNames.map((name, index) => ({
  id: `archive-${String(index + 1).padStart(2, '0')}`,
  number: String(index + 1).padStart(2, '0'),
  name,
  image: publicAsset(`assets/projects/archive/project-${String(index + 1).padStart(2, '0')}.jpg`),
  type: projectType(name),
  category: projectCategory(name),
  completionDate: '',
  text: 'Electrical and LED lighting installation, with lighting selected through the NK Electrical store.',
  systems: ['Electrical installation', 'LED lighting installation', 'Lighting selection and supply'],
}));

export const defaultContent: SiteContent = {
  eyebrow: 'Electrical installations · Lighting · Appliances · Smart systems · Since 1985',
  heroTitle: 'Electrical systems,',
  heroAccent: 'installed right.',
  heroBody: 'Planning, installation, lighting, appliances and smart control from one experienced electrical team in Cyprus.',
  aboutTitle: 'Electrical expertise. Family accountability.',
  aboutBody: 'Since 1985, NK Electrical has planned, installed and supported electrical systems for homes, stores, showrooms, restaurants and public spaces across Cyprus.',
  contactNote: 'Tell us what needs powering, lighting, controlling or installing. Our team will direct the enquiry to the right specialist.',
  heroImage: publicAsset('assets/generated/cyprus-lighting-hero.webp'),
  heroObject: {x: 72, y: 35},
  themeContent: {
    tech: {
      eyebrow: 'NK / ELECTRICAL SERVICES / CYPRUS / SINCE 1985',
      heroTitle: 'Electrical systems planned.',
      heroAccent: 'Installed and tested.',
      heroTail: 'Supported by one team.',
      heroBody: 'For homeowners, project teams and businesses across Cyprus, we plan, install, integrate, test and support electrical, lighting, automation and security systems from first brief to handover.',
      sectionTitle: 'Choose the electrical work you need.',
      sectionBody: 'Each service page explains the practical scope, who it is for, the problem it solves and the details to send first.',
    },
  },
  products,
  catalogues,
  projects,
};
