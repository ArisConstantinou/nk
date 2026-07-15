export type Product = {
  id: string;
  name: string;
  category: 'Lighting' | 'Coffee' | 'Kitchen' | 'Cooling' | 'Cleaning';
  season: 'All year' | 'Summer' | 'Winter' | 'Christmas';
  space: 'Living' | 'Kitchen' | 'Outdoor' | 'Bedroom' | 'Workspace';
  image: string;
  note: string;
};

export type TeamMember = {
  name: string;
  role: string;
  responsibility: string;
  workArea: string;
  characteristics: string[];
  credential?: string;
  email?: string;
  image: string;
  linkedin?: string;
  branch: 'Leadership' | 'Engineering' | 'Design & retail' | 'Electrical installations' | 'Cameras & security' | 'Reception & sales';
};

export type Catalogue = {
  id?: string;
  name: string;
  brand: 'ACA' | 'Nova Luce' | 'VIOKEF';
  year: string;
  focus: 'Decorative' | 'Architectural' | 'Kids' | 'Natural' | 'Fans';
  url: string;
};

export type Project = {
  id: string;
  number: string;
  name: string;
  image: string;
  type: string;
  category: 'Residential' | 'Commercial' | 'Retail' | 'Mixed use';
  completionDate: string;
  text: string;
  systems: string[];
};

export type ThemeContent = {
  eyebrow: string;
  heroTitle: string;
  heroAccent: string;
  heroTail: string;
  heroBody: string;
  sectionTitle: string;
  sectionBody: string;
};

export type SiteContent = {
  eyebrow: string;
  heroTitle: string;
  heroAccent: string;
  heroBody: string;
  aboutTitle: string;
  aboutBody: string;
  contactNote: string;
  heroImage: string;
  heroObject: {x: number; y: number};
  themeContent: {
    tech: ThemeContent;
  };
  products: Product[];
  catalogues: Catalogue[];
  projects: Project[];
};
