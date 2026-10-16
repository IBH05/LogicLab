# Instalación y despliegue de LogicLab

## Entorno local

Se utiliza Node.js 24.x y npm. `.nvmrc` y `package.json` fijan la familia de Node. No se necesitan variables de entorno, claves de API ni base de datos para el prototipo.

```sh
git clone https://github.com/IBH05/LogicLab.git
cd LogicLab
npm ci
npm run dev
```

Desarrollo: `http://127.0.0.1:5173`. Vite puede elegir otro puerto si está ocupado. Para validar producción:

```sh
npm test
npm run build
npm run preview
```

Preview: `http://127.0.0.1:4173`. Es un servidor local de comprobación, no un servidor de producción.

## GitHub

Repositorio existente: https://github.com/IBH05/LogicLab. Es público según la API consultada durante la auditoría. Rama predeterminada remota: `main`. Se conservó el commit inicial `0dff94d1804484efe1d5792c266532b2c090f3a1` al integrar con `git merge --ff-only origin/main`.

Antes de publicar, revisar `git diff --cached`, documentos y metadatos. Los nombres personales en documentos requieren autorización para su exposición pública. Tras aprobación:

```sh
git fetch origin
git status
git log --oneline --graph --all -10
git push -u origin main
```

Si el remoto avanzó, integrar con revisión y resolver conflictos; no forzar el push. Utilizar Git Credential Manager o `gh auth login` mediante navegador. Nunca pegar contraseñas ni tokens en el README, terminal compartida o conversación.

## Vercel

Estado de esta entrega: configuración local preparada; publicación y conexión GitHub pendientes de autorización y acceso. `npx --yes vercel whoami` confirmó **Logged out**. Iniciar sesión mediante `npx vercel login`, sin compartir contraseñas ni tokens por chat. No hay navegador conectado disponible para operar la cuenta desde esta sesión. URL de producción: **pendiente de despliegue verificado**.

| Ajuste | Valor |
|---|---|
| Repositorio | `IBH05/LogicLab`, existente |
| Framework Preset | Vite |
| Root Directory | Raíz del repositorio (`./`) |
| Node.js | 24.x |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Production Branch | `main` |
| Variables de entorno | Ninguna |
| Rewrites | Ninguno: sólo existe `/` |

Con autorización de publicación, iniciar sesión en Vercel, revisar si ya existe un proyecto para este repositorio e importarlo sólo si falta. Autorizar la GitHub App para este repositorio, revisar los ajustes anteriores y desplegar. Confirmar en Settings → Git la conexión y `main` como rama de producción. Los pushes/merges a main deben generar producción y las otras ramas previews según la configuración de la cuenta.

No colocar documentos en `public/`. El sitio sólo necesita `dist/`; `.vercelignore` excluye originales, evidencia y documentación de cargas CLI. La configuración debe permitir incluir `evidencia/` en Git sin servirla desde Vercel.

## Validación externa requerida

Registrar URL real, commit desplegado, estado Ready, HTTP 200, carga de JS/CSS, cálculo de `A+A*B`, error de `A&`, tabla, circuito y vista móvil. Revisar que los PDF/DOCX no se sirvan como recursos estáticos. Para acreditar automatización, comprobar un despliegue provocado por un push autorizado y relacionarlo con el SHA de GitHub. No basta con un deploy manual por CLI.

Para actualizar, abrir PR, revisar CI e integrar en main. Ante una regresión, usar `git revert` sobre el commit problemático y desplegar de nuevo; una reversión de despliegue desde Vercel requiere revisar su efecto y autorización correspondiente.

## Fuentes técnicas

- [Vite en Vercel](https://vercel.com/docs/frameworks/frontend/vite).
- [Configuración del build](https://vercel.com/docs/builds/configure-a-build).
- [Integración con Git](https://vercel.com/docs/git).
- [Despliegue estático con Vite](https://vite.dev/guide/static-deploy).
