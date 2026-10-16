import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    include: ['tests/unit/**/*.test.ts'],
    reporters: ['default', 'json'],
    outputFile: { json: 'evidencia/pruebas/unitarias.json' },
  },
});
