import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";
import mkcert from "vite-plugin-mkcert";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), mkcert(), svgr(), tailwindcss()],
  base: "",
  // Qlik precisa liberar CORS para https://localhost:5174: falha em vez de trocar de porta
  server: { port: 5174, strictPort: true },
  resolve: {
    alias: {
      "@": "/src"
    }
  }
});