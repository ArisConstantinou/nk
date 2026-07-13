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
  workArea: string;
  characteristics: string[];
  credential?: string;
  email?: string;
  image: string;
  linkedin?: string;
  branch: 'Leadership' | 'Engineering' | 'Design & retail' | 'Delivery';
};

export type Catalogue = {
  name: string;
  brand: 'ACA' | 'Nova Luce' | 'VIOKEF';
  year: string;
  focus: 'Decorative' | 'Architectural' | 'Kids' | 'Natural' | 'Fans';
  url: string;
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
  products: Product[];
  catalogues: Catalogue[];
};
