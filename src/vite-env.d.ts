/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAPBOX_ACCESS_TOKEN: string;
  readonly VITE_STRAVA_CLIENT_ID: string;
  readonly VITE_STRAVA_CLIENT_SECRET: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string;
  readonly VITE_STRAVA_REDIRECT_URI: string;
  readonly VITE_BACKEND_URL: string;
  // Ajoutez ici d'autres variables d'environnement exposées
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
