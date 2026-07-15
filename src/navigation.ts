export const serviceLinks = [
  {label: 'Electrical Installations', description: 'Planning, distribution, wiring, protection and testing.', to: '/services/electrical-installations'},
  {label: 'Lighting Design', description: 'Interior, exterior and architectural lighting specification.', to: '/services/lighting-design'},
  {label: 'Smart Home & Automation', description: 'KNX, controls, scenes and connected building systems.', to: '/services/smart-home-automation'},
  {label: 'Security & Low Voltage', description: 'CCTV, alarms, access control, sound and vision.', to: '/services/security-systems'},
  {label: 'Maintenance & Faults', description: 'Diagnosis, repair and planned electrical maintenance.', to: '/services/maintenance'},
] as const;

export const shopLinks = [
  {label: 'All Products', description: 'Browse the complete lighting and appliance collection.', to: '/shop'},
  {label: 'Lighting Products', description: 'Decorative, architectural and practical lighting.', to: '/shop/lighting'},
  {label: 'Appliances', description: 'Kitchen, coffee, cooling and household products.', to: '/shop/appliances'},
  {label: 'Catalogues & Downloads', description: 'Official brand catalogues and product PDFs.', to: '/shop/catalogues'},
] as const;
