// Antepone la ruta base del sitio (p. ej. /SecurityLab) a una ruta interna.
// Úsalo para cualquier enlace o recurso que empiece por "/".
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export function url(path: string): string {
  return BASE + (path.startsWith('/') ? path : `/${path}`);
}

/** Quita la ruta base de un pathname (útil para saber en qué sección estamos). */
export function stripBase(pathname: string): string {
  return BASE && pathname.startsWith(BASE) ? pathname.slice(BASE.length) || '/' : pathname;
}
