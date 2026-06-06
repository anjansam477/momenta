// Example app config. Copy to `environment-config.ts` and fill in real values.
// The real `environment-config.ts` is gitignored so environment-specific URLs /
// emails stay out of version control. CI copies this example before building.

const PRODUCTION_BASE_URL = 'https://your-production-domain.example';
const LOCAL_SERVICE_BASE_URL = 'http://localhost:8071';
const isBrowser = typeof window !== 'undefined';
const isLocalhost = isBrowser && ['localhost', '127.0.0.1'].includes(window.location.hostname);

// Service base URL for backend requests
export const SERVICE_BASE_URL = isLocalhost ? LOCAL_SERVICE_BASE_URL : PRODUCTION_BASE_URL;

// Base URL for frontend-origin links
export const UI_BASE_URL = isBrowser ? window.location.origin : PRODUCTION_BASE_URL;

export const enableGiphy = true;

export const postPageSize = 12;

export const APP_EMAIL = 'app@example.com';
