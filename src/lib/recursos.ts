import { getCollection, type CollectionEntry } from 'astro:content';

export type Recurso = CollectionEntry<'recursos'>;

/** Todas las entradas publicadas, de más reciente a más antigua.
 *  Los borradores (`draft: true`) solo aparecen en modo desarrollo. */
export async function getRecursos(): Promise<Recurso[]> {
  const all = await getCollection('recursos', ({ data }) =>
    import.meta.env.PROD ? !data.draft : true,
  );
  return all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function formatDate(date: Date): string {
  return date
    .toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    .replace('.', '');
}

export function readingTime(body: string | undefined): number {
  const words = (body ?? '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export const TYPE_LABEL = { laboratorio: 'Laboratorio', guia: 'Guía' } as const;
export const TYPE_ICON = { laboratorio: 'flask', guia: 'book' } as const;
