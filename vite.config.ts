import { defineConfig } from "npm:vite@5.4.10";
import react from "npm:@vitejs/plugin-react@4.3.3";
//import tailwindcss from "npm:@tailwindcss/vite@4.0.0";

export default defineConfig({
  plugins: [
    react(),
    //tailwindcss(),
  ],
});
