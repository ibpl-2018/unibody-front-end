/**
 * Runtime configuration. EXPO_PUBLIC_* variables are inlined at bundle time.
 * On a physical device "localhost" is the phone itself — set EXPO_PUBLIC_API_URL to your LAN IP.
 */
const strip = (u: string) => u.replace(/\/+$/, '');

export const API_URL = strip(process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000');
export const WEB_URL = strip(process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:3000');

/** Transparent product renders served by the API (used for device tiles & hero). */
export const renderUrl = (name: string) => `${API_URL}/static/renders/${name}.webp`;

export const APP_SCHEME = 'unibody';
