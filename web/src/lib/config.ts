/** Where the API lives. Browser → NEXT_PUBLIC_API_URL; Next.js server → API_URL (falls back to the public one). */
export const PUBLIC_API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
export const SERVER_API_URL = (process.env.API_URL ?? PUBLIC_API_URL).replace(/\/$/, '');
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
