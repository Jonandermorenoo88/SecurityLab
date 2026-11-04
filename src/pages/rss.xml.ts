import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE } from '../config';
import { getRecursos } from '../lib/recursos';

export async function GET(context: APIContext) {
  const recursos = await getRecursos();
  return rss({
    title: `${SITE.author} | ${SITE.title}`,
    description: SITE.description,
    site: context.site!,
    items: recursos.map((r) => ({
      title: r.data.title,
      description: r.data.description,
      pubDate: r.data.date,
      link: `/recursos/${r.id}/`,
      categories: [r.data.category, ...r.data.tags],
    })),
    customData: '<language>es-es</language>',
  });
}
