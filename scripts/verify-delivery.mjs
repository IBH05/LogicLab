import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const originals = JSON.parse(readFileSync('evidencia/reportes/inventario-originales.json', 'utf8'));
for (const original of originals) {
  const category = original.archivo.endsWith('.tsx') ? 'codigo-original' : 'documentos';
  if (hash(original.archivo) !== original.sha256 || hash(join('evidencia', category, original.archivo)) !== original.sha256) {
    throw new Error(`Original o copia alterado: ${original.archivo}`);
  }
}
function files(directory) {
  return readdirSync(directory).flatMap(name => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}
const production = files('dist').map(path => ({ archivo: path.replaceAll('\\', '/'), bytes: statSync(path).size }));
if (production.some(file => /evidencia|\.pdf$|\.docx$|\.tsx$/i.test(file.archivo))) throw new Error('Evidencia encontrada en dist');
const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
const dependencies = Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }).map(name => {
  const dependency = JSON.parse(readFileSync(join('node_modules', name, 'package.json'), 'utf8'));
  return { name, version: dependency.version, license: dependency.license ?? 'No indicada', runtime: name in manifest.dependencies };
});
const candidates = ['README.md', 'package.json', 'package-lock.json', 'vercel.json', ...files('src'), ...files('docs'), ...files('.github'), ...files('tests')];
const findings = [];
for (const path of candidates) {
  const text = readFileSync(path, 'utf8');
  if (/gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[A-Z0-9]{16}|-----BEGIN (?:RSA )?PRIVATE KEY-----/.test(text)) findings.push(path);
}
if (findings.length) throw new Error(`Posibles secretos en: ${findings.join(', ')}`);
for (const path of ['README.md', ...files('docs')]) {
  for (const match of readFileSync(path, 'utf8').matchAll(/\]\(([^)]+)\)/g)) {
    if (/^https?:|^#/.test(match[1])) continue;
    const parent = path.includes('docs') ? 'docs' : '.';
    if (!existsSync(join(parent, match[1].split('#')[0]))) throw new Error(`Enlace local roto: ${path} -> ${match[1]}`);
  }
}
const report = { timestamp: new Date().toISOString(), originalesVerificados: originals.length, production, dependencies, secretScan: { findings, scope: 'Código fuente, configuración, lockfile, docs y pruebas. Patrones de credenciales comunes; no es garantía exhaustiva.' }, root: relative(root, root) || '.', localLinks: 'OK' };
writeFileSync('evidencia/reportes/verificacion-entrega.json', JSON.stringify(report, null, 2) + '\n');
console.log('Integridad de 5 originales, salida de producción, dependencias, enlaces locales y escaneo básico: OK');
