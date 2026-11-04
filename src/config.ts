// Ajustes generales del blog. Cambia aquí tus enlaces y textos.
export const SITE = {
  title: 'Security Lab',
  author: 'Jon Ander',
  fullName: 'Jon Ander Incera Moreno',
  description:
    'Laboratorios, guías técnicas y análisis prácticos de ciberseguridad, Blue Team, DFIR y Threat Hunting.',
  location: 'Getxo, Bizkaia',
  links: {
    portfolio: 'https://jonandermorenoo88.github.io/portfolio/',
    github: 'https://github.com/Jonandermorenoo88',
    linkedin: 'https://www.linkedin.com/in/jon-ander-incera-moreno-5a8b6520a/',
    cyberdefenders: 'https://cyberdefenders.org/',
  },
};

// Categorías temáticas. La clave es la que se usa en el frontmatter (`category`).
export const CATEGORIES = {
  'blue-team': {
    name: 'Blue Team',
    description: 'Detección, análisis y respuesta a incidentes',
    icon: 'shield-check',
  },
  dfir: {
    name: 'DFIR',
    description: 'Análisis forense digital e investigación de evidencias',
    icon: 'search',
  },
  'threat-hunting': {
    name: 'Threat Hunting',
    description: 'Búsqueda proactiva de amenazas e inteligencia',
    icon: 'crosshair',
  },
  cloud: {
    name: 'Cloud Security',
    description: 'Seguridad en entornos Azure, AWS y GCP',
    icon: 'cloud',
  },
  grc: {
    name: 'GRC & Normativa',
    description: 'ISO 27001, ISO 22301, ENS y NIS2',
    icon: 'layers',
  },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;
