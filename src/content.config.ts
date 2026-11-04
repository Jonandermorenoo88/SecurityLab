import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Cada archivo .md dentro de src/content/recursos/ es una entrada del blog
// (un laboratorio o una guía). El nombre del archivo es la URL.
const recursos = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/recursos' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    type: z.enum(['laboratorio', 'guia']),
    category: z.enum(['blue-team', 'dfir', 'threat-hunting', 'cloud', 'grc']),
    // Plataforma del laboratorio: CyberDefenders, Blue Team Labs Online, Propio…
    platform: z.string().default('Propio'),
    difficulty: z.enum(['Fácil', 'Medio', 'Difícil']).default('Medio'),
    // Tema corto que aparece en la tarjeta (Malware, Redes, Android…)
    topic: z.string().optional(),
    tools: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    labUrl: z.string().url().optional(),
    featured: z.boolean().default(false),
    // true = solo visible con `npm run dev`, no se publica
    draft: z.boolean().default(false),
  }),
});

export const collections = { recursos };
