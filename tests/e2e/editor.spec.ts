import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const canvas = (page: Page) => page.getByRole('group', { name: 'Diagrama del circuito' });

const drop = async (page: Page, name: string, x: number, y: number) =>
  page.getByRole('button', { name: new RegExp(`^Agregar ${name}`) }).dragTo(canvas(page), { targetPosition: { x, y } });

const center = async (l: ReturnType<Page['locator']>) => {
  const b = (await l.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

/** Arrastra un cable de la salida n° `out` a la entrada n° `inp` (en orden de aparición en el SVG). */
const wire = async (page: Page, out: number, inp: number) => {
  const a = await center(canvas(page).locator('circle[r="7"]').nth(out));
  const t = await center(canvas(page).locator('circle[data-in-pin]').nth(inp));
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move((a.x + t.x) / 2, (a.y + t.y) / 2, { steps: 4 });
  await page.mouse.move(t.x, t.y, { steps: 4 });
  await page.mouse.up();
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('logiclab.tutorial.v1', 'done'); });
  await page.reload();
});

test('construir un circuito AND arrastrando compuertas y cables', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.getByRole('button', { name: 'Editor de circuitos' }).click();
  await drop(page, 'Entrada', 80, 80);
  await drop(page, 'Entrada', 80, 180);
  await drop(page, 'AND', 330, 130);
  await drop(page, 'Salida', 620, 130);
  await wire(page, 0, 0); // A → AND.1
  await wire(page, 1, 1); // B → AND.2
  await wire(page, 2, 2); // AND → F
  await expect(page.getByRole('status').first()).toContainText('Cable conectado');

  await page.getByRole('tab', { name: 'Tabla de verdad' }).click();
  await expect(page.locator('[role=tabpanel] tbody tr')).toHaveCount(4);
  await page.getByRole('tab', { name: 'Expresión' }).click();
  await expect(page.getByText('F = A*B', { exact: true }).first()).toBeVisible();

  // Encender las dos entradas (clic en cada interruptor) y comprobar la fila activa
  await canvas(page).click({ position: { x: 80, y: 80 } });
  await canvas(page).click({ position: { x: 80, y: 180 } });
  await page.getByRole('tab', { name: 'Tabla de verdad' }).click();
  await expect(page.locator('[role=tabpanel] tbody tr[aria-selected="true"]')).toContainText('1');
  await expect(canvas(page).locator('text', { hasText: /^1$/ }).first()).toBeVisible();

  await page.getByRole('tab', { name: 'Caminos' }).click();
  await expect(page.getByText(/2 caminos/)).toBeVisible();
  await page.getByRole('tab', { name: 'Costo y chips' }).click();
  await expect(page.getByText('7408').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('alarma: expresión → circuito → solo NAND con la misma tabla', async ({ page }) => {
  await page.getByRole('button', { name: 'Editor de circuitos' }).click();
  await page.getByRole('button', { name: 'Alarma del laboratorio' }).click();
  await expect(canvas(page).locator('circle[r="7"]')).toHaveCount(9); // 5 entradas + 3 compuertas… + NOT
  await page.getByRole('tab', { name: 'Tabla de verdad' }).click();
  await expect(page.locator('[role=tabpanel] tbody tr')).toHaveCount(32);
  await page.getByRole('tab', { name: 'Expresión' }).click();
  const sopBefore = await page.getByText(/^Z = /).nth(0).textContent();
  expect(sopBefore).toBeTruthy();
  await page.getByRole('tab', { name: 'Karnaugh' }).click();
  await expect(page.getByRole('table', { name: /Mapa de Karnaugh/ })).toHaveCount(2); // 5 variables = 2 mapas

  await page.getByRole('button', { name: 'Solo NAND', exact: true }).click();
  await expect(page.getByRole('status').first()).toContainText('Convertido a solo NAND');
  await page.getByRole('tab', { name: 'Tabla de verdad' }).click();
  await expect(page.locator('[role=tabpanel] tbody tr')).toHaveCount(32);
  await page.getByRole('tab', { name: 'Costo y chips' }).click();
  await expect(page.getByText('7400').first()).toBeVisible();
  await expect(page.getByText('Simplificado solo NAND')).toBeVisible();

  // deshacer devuelve el circuito original
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await page.getByRole('tab', { name: 'Costo y chips' }).click();
  await expect(page.getByText('7432').first()).toBeVisible();
});

test('la calculadora abre su expresión en el editor', async ({ page }) => {
  await page.goto('/#/calculadora');
  await page.getByLabel('Expresión Booleana').fill('F = A*B + C');
  await page.getByRole('button', { name: 'Calcular', exact: true }).click();
  await page.getByRole('button', { name: 'Mapa de Karnaugh', exact: true }).click();
  await expect(page.getByRole('table', { name: /Mapa de Karnaugh/ })).toBeVisible();
  await page.getByRole('button', { name: 'Abrir en el editor de circuitos' }).click();
  await expect(page.getByRole('heading', { name: 'Editor de circuitos lógicos' })).toBeVisible();
  await page.getByRole('tab', { name: 'Tabla de verdad' }).click();
  await expect(page.locator('[role=tabpanel] tbody tr')).toHaveCount(8);
});

test('ejercicio de expresión: contraejemplo, acierto y progreso', async ({ page }) => {
  await page.getByRole('button', { name: 'Ejercicios', exact: true }).click();
  await page.getByLabel('Tu respuesta').fill('B + S*(P+M)');
  await page.getByRole('button', { name: 'Comprobar', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'No coincide' })).toContainText('debería dar');
  await page.getByLabel('Tu respuesta').fill("Z = B + !T*S*(P+M)");
  await page.getByRole('button', { name: 'Comprobar', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '¡Correcto!' })).toBeVisible();
  await expect(page.getByText(/1 de \d+ resueltos/)).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Ejercicios', exact: true }).click();
  await expect(page.getByText(/1 de \d+ resueltos/)).toBeVisible(); // persiste en el navegador
});

test('ejercicio de circuito: medio sumador con compuertas arrastradas', async ({ page }) => {
  // la paleta y el lienzo deben verse a la vez para poder arrastrar entre ellos
  await page.setViewportSize({ width: 1280, height: 1100 });
  await page.getByRole('button', { name: 'Ejercicios', exact: true }).click();
  await page.getByRole('button', { name: /Medio sumador Básico/ }).click();
  await page.getByRole('button', { name: 'Comprobar circuito' }).click();
  await expect(page.getByRole('status').filter({ hasText: /Falta|no está conectada|falla/ })).toBeVisible();
  await drop(page, 'XOR', 300, 100);
  await drop(page, 'AND', 300, 260);
  // entradas: S(0) C(1) XOR.1(2) XOR.2(3) AND.1(4) AND.2(5); salidas: A(0) B(1) XOR(2) AND(3)
  await wire(page, 0, 2); await wire(page, 1, 3); await wire(page, 0, 4); await wire(page, 1, 5);
  await wire(page, 2, 0); await wire(page, 3, 1);
  await page.getByRole('button', { name: 'Comprobar circuito' }).click();
  await expect(page.getByRole('status').filter({ hasText: '¡Correcto!' })).toContainText('2 compuertas');
});

test('ejercicio de tabla de verdad y generador aleatorio', async ({ page }) => {
  await page.getByRole('button', { name: 'Ejercicios', exact: true }).click();
  await page.getByRole('button', { name: /Control de motor/ }).click();
  await page.getByRole('button', { name: 'Comprobar', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Faltan' })).toBeVisible();
  await page.getByRole('button', { name: 'Generar' }).click();
  await expect(page.getByRole('heading', { name: /Aleatorio de 3 variables/ })).toBeVisible();
  await page.getByLabel('Tu respuesta').fill('A');
  await page.getByRole('button', { name: 'Comprobar', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /No coincide|Correcto|simplificar/ })).toBeVisible();
});

test('accesibilidad y diseño adaptable del editor y los ejercicios', async ({ page }, testInfo) => {
  await page.getByRole('button', { name: 'Editor de circuitos' }).click();
  await page.getByRole('button', { name: 'Medio sumador' }).click();
  for (const tab of ['Tabla de verdad', 'Expresión', 'Karnaugh', 'Caminos', 'Costo y chips']) {
    await page.getByRole('tab', { name: tab }).click();
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(r.violations.map(v => `${v.id}: ${v.nodes[0]?.html}`), `editor/${tab}`).toEqual([]);
  }
  await page.getByRole('button', { name: 'Ejercicios', exact: true }).click();
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(r.violations.map(v => `${v.id}: ${v.nodes[0]?.html}`), 'ejercicios').toEqual([]);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `ancho ${width}`).toBe(true);
  }
  void testInfo;
});

test('inicio: demo interactiva, navegación y enlaces directos', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1, name: /Aprende lógica digital/ })).toBeVisible();
  // demo: AND con A=1, B=0 → 0; al encender B → 1
  await expect(page.getByRole('img', { name: 'Compuerta AND con salida 0' })).toBeVisible();
  await page.getByRole('switch', { name: 'Entrada B' }).click();
  await expect(page.getByRole('img', { name: 'Compuerta AND con salida 1' })).toBeVisible();
  await page.getByRole('button', { name: 'XOR', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Compuerta XOR con salida 0' })).toBeVisible();
  // tarjetas y botón atrás
  await page.getByRole('link', { name: /Ejercicios/ }).first().click();
  await expect(page).toHaveURL(/#\/ejercicios$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Ejercicios' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1, name: /Aprende lógica digital/ })).toBeVisible();
  // enlace directo
  await page.goto('/#/editor');
  await expect(page.getByRole('heading', { name: 'Editor de circuitos lógicos' })).toBeVisible();
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(r.violations.map(v => `${v.id}: ${v.nodes[0]?.html}`)).toEqual([]);
});

test('inicio: accesibilidad y diseño adaptable', async ({ page }) => {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(r.violations.map(v => `${v.id}: ${v.nodes[0]?.html}`)).toEqual([]);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `ancho ${width}`).toBe(true);
  }
});

test('tutorial guiado: avanza solo al completar cada paso', async ({ page }) => {
  await page.evaluate(() => localStorage.removeItem('logiclab.tutorial.v1'));
  await page.reload();
  await page.getByRole('button', { name: 'Editor de circuitos' }).click();
  const tour = page.getByRole('region', { name: 'Tutorial guiado' });
  await expect(tour).toContainText('Paso 1 de 10');
  await expect(page.getByRole('button', { name: /^Agregar Entrada/ })).toHaveClass(/ring-amber/);

  await drop(page, 'Entrada', 80, 80);
  await expect(tour).toContainText('Paso 2 de 10');
  await drop(page, 'Entrada', 80, 180);
  await expect(tour).toContainText('Paso 3 de 10');
  await drop(page, 'AND', 330, 130);
  await expect(tour).toContainText('Paso 4 de 10');
  await drop(page, 'Salida', 620, 130);
  await expect(tour).toContainText('Paso 5 de 10');
  await wire(page, 0, 0);
  await expect(tour).toContainText('Paso 6 de 10');
  await wire(page, 1, 1);
  await expect(tour).toContainText('Paso 7 de 10');
  await wire(page, 2, 2);
  await expect(tour).toContainText('Paso 8 de 10');
  await canvas(page).click({ position: { x: 80, y: 80 } });
  await canvas(page).click({ position: { x: 80, y: 180 } });
  await expect(tour).toContainText('Paso 9 de 10');
  await tour.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(tour).toContainText('Paso 10 de 10');
  await tour.getByRole('button', { name: 'Finalizar' }).click();
  await expect(tour).toHaveCount(0);

  // no vuelve a iniciarse solo, pero se puede repetir (con aviso si hay un circuito)
  await page.reload();
  await page.getByRole('button', { name: 'Editor de circuitos' }).click();
  await expect(page.getByRole('region', { name: 'Tutorial guiado' })).toHaveCount(0);
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Tutorial', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Tutorial guiado' })).toContainText('Paso 1 de 10');
  await page.getByRole('button', { name: 'Omitir tutorial' }).click();
  await page.getByRole('button', { name: 'Deshacer' }).click(); // recupera el circuito
  await expect(canvas(page).locator('circle[r="7"]')).toHaveCount(3);
});

test('tutorial: accesibilidad', async ({ page }) => {
  await page.evaluate(() => localStorage.removeItem('logiclab.tutorial.v1'));
  await page.reload();
  await page.getByRole('button', { name: 'Editor de circuitos' }).click();
  await expect(page.getByRole('region', { name: 'Tutorial guiado' })).toBeVisible();
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(r.violations.map(v => `${v.id}: ${v.nodes[0]?.html}`)).toEqual([]);
});

test('fase 1: una sola cabecera global y un h1 por vista', async ({ page }) => {
  const views: [string, RegExp][] = [
    ['/#/', /Aprende lógica digital/], ['/#/calculadora', /Calculadora booleana/],
    ['/#/editor', /Editor de circuitos lógicos/], ['/#/ejercicios', /^Ejercicios$/],
  ];
  for (const [url, title] of views) {
    await page.goto(url);
    await expect(page.getByRole('banner'), url).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: 'Secciones de LogicLab' }), url).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 }), url).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 }), url).toHaveText(title);
    await expect(page.getByRole('contentinfo'), url).toHaveCount(1);
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(r.violations.map(v => `${v.id}: ${v.nodes[0]?.html}`), url).toEqual([]);
  }
});

test('fase 1: tokens de diseño, marca y pie navegables', async ({ page }) => {
  await page.goto('/#/calculadora');
  const tokens = await page.evaluate(() => ['--color-brand-600', '--color-signal-on', '--radius-card'].map(t => getComputedStyle(document.documentElement).getPropertyValue(t).trim()));
  expect(tokens.every(Boolean)).toBe(true);
  // el botón de reglas ahora vive en el encabezado de la calculadora
  await page.getByRole('button', { name: 'Leyes y Reglas', exact: true }).click();
  await expect(page.getByText('Chuleta de Álgebra')).toBeVisible();
  // la marca lleva al inicio y el pie enlaza a las secciones
  await page.getByRole('link', { name: 'LogicLab, ir al inicio' }).click();
  await expect(page).toHaveURL(/#\/$/);
  await page.getByRole('contentinfo').getByRole('link', { name: 'Editor de circuitos' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Editor de circuitos lógicos');
});
