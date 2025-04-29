import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const backendUrl = env.VITE_BACKEND_URL;

  return {
    plugins: [
      react(),
      tailwindcss()
    ],
    server: {
      host: true,
      allowedHosts: ['.ngrok-free.app', '.vercel.app'],
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false
        }
      }
    },
    preview: {
      allowedHosts: [
        backendUrl,
        'runmemories-v1-production.up.railway.app'
      ]
    },
    build: {
      sourcemap: true
    },
    base: '/'
  }
});