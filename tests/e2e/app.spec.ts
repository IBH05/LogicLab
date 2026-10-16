import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus, platform, release } from 'node:os';

test('RF-01/04/05/06 flujo completo y errores', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle(/LogicLab/);
  await page.getByRole('button', { name: 'Calcular', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('ingresa');
  await page.getByLabel('Expresión Booleana').fill('A&');
  await page.getByLabel('Expresión Booleana').press('Enter');
  await expect(page.getByRole('alert')).toContainText('Símbolo no válido');
  await page.getByLabel('Expresión Booleana').fill('A+A*B');
  await page.getByRole('button', { name: 'Calcular', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(4);
  await page.getByRole('button', { name: 'Simplificación', exact: true }).click();
  await expect(page.getByText('Suma de Productos Simplificada (SOP)')).toBeVisible();
  await expect(page.getByText('Validación Interna:', { exact: true })).toBeVisible();
  await expect(page.getByText(/procedimiento paso a paso/)).toBeVisible();
  await page.getByRole('button', { name: 'Formas Canónicas', exact: true }).click();
  await expect(page.getByText('Σ m(2, 3)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'NAND / NOR', exact: true }).click();
  await expect(page.getByText('Solo NOR', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tabla de Verdad', exact: true }).click();
  await page.getByRole('button', { name: 'Evaluar en Circuito', exact: true }).nth(3).click();
  await expect(page.getByText('Fila 3 (Salida: 1)', { exact: true })).toBeVisible();
  await expect(page.locator('pre').first()).toContainText('OR [=1]');
  await expect(page.locator('svg').filter({ has: page.locator('text', { hasText: 'Salida' }) })).toBeVisible();
  await page.screenshot({ path: `evidencia/capturas/circuito-${testInfo.project.name}.png`, fullPage: true });
  expect(errors).toEqual([]);
});

test('RNF-04 diseño adaptable y teclado', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'A', exact: true }).click();
  await page.getByRole('button', { name: '+ OR', exact: true }).click();
  await page.getByRole('button', { name: 'B', exact: true }).click();
  await expect(page.getByLabel('Expresión Booleana')).toHaveValue('A+B');
  await page.getByRole('button', { name: 'Calcular', exact: true }).click();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole('button', { name: 'Leyes y Reglas', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Leyes y Reglas', exact: true }).click();
  }
  await page.setViewportSize({ width: testInfo.project.name === 'mobile' ? 390 : 1440, height: 900 });
  await page.screenshot({ path: `evidencia/capturas/tabla-${testInfo.project.name}.png`, fullPage: true });
});

test('RNF-05 accesibilidad automatizada', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByLabel('Expresión Booleana').fill('!(A*B)^C');
  await page.getByRole('button', { name: 'Calcular', exact: true }).click();
  for (const tab of ['Tabla de Verdad', 'Simplificación', 'Diagrama Lógico']) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    writeFileSync(`evidencia/pruebas/accesibilidad-${testInfo.project.name}-${tab.split(' ')[0]}.json`, JSON.stringify(result.violations, null, 2));
    expect(result.violations.map(violation => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.map(node => node.target) }))).toEqual([]);
  }
});

test('RNF-02 respuesta menor a tres segundos en casos definidos', async ({ page, browser }, testInfo) => {
  const cases = ['A+B', '(A+B)*(A\'+C)+B*C', 'A^B^C^D^E^F', '(A+B+C)*(D+E+F)'];
  const samples: { expression: string; elapsedMs: number }[] = [];
  await page.goto('/');
  for (const expression of cases) {
    for (let repetition = 0; repetition < 5; repetition++) {
      await page.getByLabel('Expresión Booleana').fill(expression);
      const started = performance.now();
      await page.getByRole('button', { name: 'Calcular', exact: true }).click();
      await expect(page.locator('tbody tr')).toHaveCount(2 ** (expression.includes('F') ? 6 : expression.includes('C') ? 3 : 2));
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const elapsedMs = performance.now() - started;
      samples.push({ expression, elapsedMs });
      expect(elapsedMs).toBeLessThan(3000);
    }
  }
  mkdirSync('evidencia/pruebas', { recursive: true });
  writeFileSync(`evidencia/pruebas/rendimiento-${testInfo.project.name}.json`, JSON.stringify({ timestamp: new Date().toISOString(), browser: browser.version(), project: testInfo.project.name, cpu: cpus()[0].model, platform: platform(), release: release(), node: process.version, conditions: 'Build de producción local; sin throttling; página cargada; clic a tabla visible y dos frames; 2 a 6 variables; 5 repeticiones por expresión. Incluye latencia del controlador.', samples, maxMs: Math.max(...samples.map(sample => sample.elapsedMs)) }, null, 2));
});
