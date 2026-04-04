import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import dyadComponentTagger from '@dyad-sh/react-vite-component-tagger';
import fs from "fs";

// Copia automaticamente a última imagem enviada para a logo pública
try {
  const mediaDir = '.dyad/media';
  if (fs.existsSync(mediaDir)) {
    const files = fs.readdirSync(mediaDir).filter(f => f.endsWith('.png'));
    let latestFile = null;
    let latestTime = 0;
    for (const file of files) {
      const stat = fs.statSync(path.join(mediaDir, file));
      if (stat.mtimeMs > latestTime) {
        latestTime = stat.mtimeMs;
        latestFile = file;
      }
    }
    if (latestFile) {
      fs.copyFileSync(path.join(mediaDir, latestFile), 'public/logo.png');
      console.log('Logo atualizada com sucesso para:', latestFile);
    }
  }
} catch (e) {
  console.error("Falha ao copiar a logo:", e);
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  envPrefix: ["VITE_", "APP_"],
  plugins: [dyadComponentTagger(), react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-popover', '@radix-ui/react-tabs', '@radix-ui/react-toast', '@radix-ui/react-tooltip', '@radix-ui/react-select'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-charts': ['recharts'],
        },
      },
    },
  },
}));