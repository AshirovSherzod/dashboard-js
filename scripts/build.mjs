import { mkdir, cp, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
await mkdir(out, { recursive: true });
for (const entry of ['index.html', 'css', 'js', 'pages', 'assets']) await cp(path.join(root, entry), path.join(out, entry), { recursive: true });
const preview = await stat(path.join(out, 'assets/images/social-preview.png'));
if (!preview.size) throw new Error('Generate the social preview with npm run test:browser before building.');
const siteURL = process.env.SITE_URL || (process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : '');
if (siteURL) {
  const url = new URL(siteURL.endsWith('/') ? siteURL : siteURL + '/');
  if (url.protocol !== 'https:') throw new Error('SITE_URL must be an HTTPS URL.');
  let html = await readFile(path.join(out, 'index.html'), 'utf8');
  html = html.replace(/(<meta property="og:image" content=")[^"]+/, '$1' + new URL('assets/images/social-preview.png', url).href);
  html = html.replace(/(<meta property="og:url" content=")[^"]+/, '$1' + url.href);
  html = html.replace(/(<link rel="canonical" href=")[^"]+/, '$1' + url.href);
  await writeFile(path.join(out, 'index.html'), html);
}
await writeFile(path.join(out, '.nojekyll'), '');
console.log('Built Dashly into dist/. Only public application assets are included.');
