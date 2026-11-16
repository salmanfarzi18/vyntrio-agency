// One-time, repeatable migration of embedded design assets to cacheable files.
const fs = require('node:fs/promises');
const {createHash} = require('node:crypto');
const sharp = require('sharp');
async function main() {
  let html = await fs.readFile('public/landing.html', 'utf8');
  const before = Buffer.byteLength(html), replacements = new Map();
  await fs.mkdir('public/assets', {recursive:true});
  for (const match of html.matchAll(/data:([^;,]+);base64,([A-Za-z0-9+/=]+)/g)) {
    if (replacements.has(match[0])) continue;
    let bytes = Buffer.from(match[2], 'base64');
    let extension = {'image/png':'webp', 'image/svg+xml':'svg', 'font/ttf':'ttf'}[match[1]];
    if (!extension) continue;
    if (match[1] === 'image/png') bytes = await sharp(bytes).resize({width:900,height:900,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();
    const name = createHash('sha256').update(bytes).digest('hex').slice(0,16)+'.'+extension;
    await fs.writeFile('public/assets/'+name, bytes);
    replacements.set(match[0], '/assets/'+name);
  }
  for (const [from,to] of replacements) html = html.split(from).join(to);
  html = html.replace(/<link rel="icon"[^>]*>/, '<link rel="icon" type="image/png" href="/favicon.png"><link rel="apple-touch-icon" href="/apple-touch-icon.png">');
  html = html.replace(/<img\b([^>]+)>/g, (all,attrs) => /loading=/.test(attrs) ? all : '<img'+attrs+' loading="lazy" decoding="async">');
  // The navigation brand is small and should load immediately.
  html = html.replace(/(<img[^>]*width="36"[^>]*) loading="lazy"/, '$1 loading="eager"');
  await fs.writeFile('public/landing.html',html);
  await sharp('public/logo.png').resize(64,64,{fit:'contain',background:'#fff'}).png().toFile('public/favicon.png');
  await sharp('public/logo.png').resize(180,180,{fit:'contain',background:'#fff'}).png().toFile('public/apple-touch-icon.png');
  const logo = (await sharp('public/logo.png').resize(160,160).png().toBuffer()).toString('base64');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#102444"/><circle cx="1120" cy="90" r="280" fill="#16366c"/><image href="data:image/png;base64,${logo}" x="80" y="70" width="130" height="130"/><g fill="white" font-family="Arial,sans-serif"><text x="80" y="300" font-size="72" font-weight="bold">VYNTRIO Agency</text><text x="80" y="375" font-size="36">From Idea to Digital Reality.</text><text x="80" y="490" font-size="27" fill="#b9d0ff">Websites · Apps · Practical AI · Startup MVPs</text><text x="80" y="540" font-size="24" fill="#b9d0ff">For students, startups and growing businesses.</text></g></svg>`;
  await sharp(Buffer.from(svg)).png().toFile('public/social-preview.png');
  console.log(JSON.stringify({before,after:Buffer.byteLength(html),uniqueAssets:replacements.size}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
