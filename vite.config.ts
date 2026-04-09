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
    
    // Ignora os arquivos de favicon para não sobrescrever a logo com eles
    const isFavicon = (dim) => {
      return (dim.width === 192 && dim.height === 192) ||
             (dim.width === 512 && dim.height === 512) ||
             (dim.width === 180 && dim.height === 180) ||
             (dim.width === 16 && dim.height === 16) ||
             (dim.width === 32 && dim.height === 32);
    };

    function getPngDimensions(filePath) {
      const buffer = fs.readFileSync(filePath);
      if (buffer.toString('ascii', 1, 4) === 'PNG') {
        return {
          width: buffer.readUInt32BE(16),
          height: buffer.readUInt32BE(20)
        };
      }
      return {width: 0, height: 0};
    }

    let latestLogoFile = null;
    let latestTime = 0;

    for (const file of files) {
      const fullPath = path.join(mediaDir, file);
      const stat = fs.statSync(fullPath);
      const dim = getPngDimensions(fullPath);

      // Specific override for the user's latest uploaded file
      if (file === 'a5d088272e57908568998ab7e049a992.png') {
        latestLogoFile = file;
        break;
      }

      if (!isFavicon(dim)) {
        if (stat.mtimeMs > latestTime) {
          latestTime = stat.mtimeMs;
          latestLogoFile = file;
        }
      }
    }
    
    if (latestLogoFile) {
      fs.copyFileSync(path.join(mediaDir, latestLogoFile), 'public/logo.png');
      console.log('Logo atualizada com sucesso para:', latestLogoFile);
    }
  }
} catch (e) {
  console.error("Falha ao processar imagens:", e);
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