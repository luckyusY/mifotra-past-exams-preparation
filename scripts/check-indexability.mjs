// Pre-flight for Search Console. Run against the deployed URL:
//
//   node scripts/check-indexability.mjs https://your-site.vercel.app
//
// The header check is the one that matters: Vercel serves X-Robots-Tag: noindex
// on preview deployments and on superseded production deployments, and a page
// carrying it will never be indexed no matter what the sitemap says.

const base = (process.argv[2] ?? '').replace(/\/$/, '');
if (!base) {
  console.error('usage: node scripts/check-indexability.mjs https://your-site.vercel.app');
  process.exit(1);
}

let pass = 0;
let fail = 0;
const t = (name, ok, detail = '') => {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
};

async function head(path) {
  const res = await fetch(base + path, { redirect: 'follow' });
  return { status: res.status, headers: res.headers, text: await res.text() };
}

console.log(`checking ${base}\n`);

console.log('indexability');
try {
  const home = await head('/');
  const robotsTag = home.headers.get('x-robots-tag');
  t('home returns 200', home.status === 200, `HTTP ${home.status}`);
  t(
    'no X-Robots-Tag: noindex',
    !robotsTag || !/noindex/i.test(robotsTag),
    robotsTag ? `header is "${robotsTag}"` : 'header absent'
  );
  t('no noindex meta tag', !/<meta[^>]+name=["']robots["'][^>]*noindex/i.test(home.text));
  t(
    'Search Console verification tag present',
    /name=["']google-site-verification["']/i.test(home.text),
    'set GOOGLE_SITE_VERIFICATION if missing'
  );
} catch (err) {
  t('home reachable', false, String(err).slice(0, 80));
}

console.log('\ncrawl files');
for (const path of ['/robots.txt', '/sitemap.xml', '/llms.txt']) {
  try {
    const r = await head(path);
    t(`${path} serves 200`, r.status === 200, `HTTP ${r.status}`);
  } catch {
    t(`${path} serves 200`, false, 'unreachable');
  }
}

try {
  const sm = await head('/sitemap.xml');
  const urls = (sm.text.match(/<loc>/g) ?? []).length;
  t('sitemap has URLs', urls > 0, `${urls} URLs`);
  const wrongHost = (sm.text.match(/<loc>(https?:\/\/[^<\/]+)/g) ?? [])
    .map((m) => m.replace('<loc>', ''))
    .filter((u) => !u.startsWith(base));
  t(
    'sitemap URLs match this host',
    wrongHost.length === 0,
    wrongHost.length ? `first mismatch ${wrongHost[0]} - fix NEXT_PUBLIC_SITE_URL` : ''
  );
} catch {
  t('sitemap parseable', false);
}

console.log('\nsample pages');
for (const path of ['/exam', '/topics', '/blog', '/unlock']) {
  try {
    const r = await head(path);
    t(`${path}`, r.status === 200, `HTTP ${r.status}`);
  } catch {
    t(`${path}`, false, 'unreachable');
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
