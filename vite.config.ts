import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  plugins: [
    // TanStack Start plugin for SSR and routing
    tanstackStart({
      server: { entry: "server" },
    }),
    // React plugin for JSX support
    react(),
    // Tailwind CSS support
    tailwindcss(),
    // TypeScript path aliases support
    tsconfigPaths(),
  ],
  // Cloudflare Workers target
  build: {
    target: "esnext",
    minify: true,
  },
  // Server configuration for dev
  server: {
    port: 3000,
    strictPort: true,
    host: true,
  },
  // Preview configuration
  preview: {
    port: 4173,
    strictPort: true,
    host: true,
  },
});
