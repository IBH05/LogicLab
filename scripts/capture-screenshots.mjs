// Genera las capturas de la página de inicio desde la aplicación real.
// Uso: npm run build && npx vite preview --port 4173 &   y luego   node scripts/capture-screenshots.mjs
// Variables: BASE_URL (por defecto http://127.0.0.1:4173), CHROMIUM_PATH (opcional, ruta de un Chromium ya instalado).
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const out = 'public/capturas';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const shot = (name, target, opts = {}) => target.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 82, ...opts });

// El tutorial se marca como visto para que no tape el lienzo en las capturas.
await page.goto(`${base}/#/`);
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('logiclab.tutorial.v1', 'done'); });

// Calculadora con la alarma resuelta
await page.goto(`${base}/#/calculadora`);
await page.reload();
await page.getByLabel('Expresión Booleana').fill("Z = B + T'*S*(P+M)");
await page.getByRole('button', { name: 'Calcular', exact: true }).click();
await page.getByRole('button', { name: 'Mapa de Karnaugh', exact: true }).click();
await shot('calculadora', page, { clip: { x: 0, y: 48, width: 1280, height: 720 } });

// Editor con la alarma, antes y después de convertirla a solo NAND
await page.goto(`${base}/#/editor`);
await page.getByRole('button', { name: 'Alarma del laboratorio' }).click();
await page.getByRole('tab', { name: 'Tabla de verdad' }).click();
await page.locator('[role=tabpanel] tbody tr').nth(21).click();
await page.evaluate(() => window.scrollTo(0, 0));
await shot('editor', page, { clip: { x: 0, y: 48, width: 1280, height: 720 } });
// Solo el lienzo, alejado para que el circuito completo (con su salida) quepa en el contenedor.
const canvas = page.getByLabel(/^Lienzo del circuito/);
await page.getByRole('button', { name: 'Alejar' }).click();
await page.getByRole('button', { name: 'Alejar' }).click();
await shot('alarma-circuito', canvas);
await page.getByRole('button', { name: 'Solo NAND', exact: true }).click();
await shot('alarma-nand', canvas);

// Ejercicio de circuito
await page.goto(`${base}/#/ejercicios`);
await page.getByRole('button', { name: /^NAND y NOR \d+\// }).click();
await page.getByRole('button', { name: /Medio sumador solo con NAND/ }).click();
await page.evaluate(() => window.scrollTo(0, 0));
await shot('ejercicios', page, { clip: { x: 0, y: 48, width: 1280, height: 720 } });

await browser.close();
console.log('Capturas generadas en', out);
