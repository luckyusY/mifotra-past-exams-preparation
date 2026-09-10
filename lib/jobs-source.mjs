/**
 * Daily job finder.
 *
 * Plain ESM with no imports beyond `mongodb` at the call site, so the same code
 * runs in a Vercel cron route and in `node scripts/fetch-jobs.mjs` without the
 * parsing logic existing twice.
 *
 * What this does and does not take
 * --------------------------------
 * It reads the public index of jobinrwanda.com and keeps the *facts* about each
 * advert: title, employer, location, dates, sector, level. It does not copy the
 * advert body, and every card links back to the source page to apply. That is
 * the line between an index and a reprint, and it is the reason this is worth
 * doing at all - a candidate still applies where the employer asked them to.
 *
 * robots.txt (checked 2026-09-10) disallows /core/, /profiles/, /admin/,
 * /search/, /user/*, /node/add/ and /media/oembed. It does not disallow / or
 * /job/, which is all this touches. There is no Crawl-delay directive; the
 * pacing below is a courtesy, not a requirement.
 *
 * The MIFOTRA recruitment portal (recruitment.mifotra.gov.rw) is a JavaScript
 * application with no server-rendered listings and no public API - every
 * endpoint I probed returns 404 and the HTML is 95 characters of "enable
 * JavaScript". It cannot be read without driving a headless browser, so it is
 * surfaced as a link on the jobs page rather than pretended to be indexed.
 */

export const SOURCE = {
  id: 'jobinrwanda',
  name: 'Job in Rwanda',
  base: 'https://www.jobinrwanda.com',
};

/** Identifies the crawler honestly, with a contact route, as a courtesy to the source. */
export const USER_AGENT =
  'MifotraPrepBot/1.0 (+https://mifotra-past-exams-preparation-wheat.vercel.app/jobs; daily job index; contact +250789448107)';

/** Procurement notices are noise for an exam candidate, so they are dropped outright. */
const SKIP_CATEGORIES = new Set(['Tender']);

/* ------------------------------------------------------------------ *
 * HTML helpers
 * ------------------------------------------------------------------ */

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”',
  ndash: '–', mdash: '—', hellip: '…', eacute: 'é',
};

export function decode(s) {
  return String(s ?? '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

const text = (html) => decode(String(html ?? '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

/** Both /job/x and /index.php/job/x appear in the markup; they are the same page. */
function normaliseHref(href) {
  const m = /\/job\/([^"#?]+)/.exec(href ?? '');
  return m ? m[1] : null;
}

/* ------------------------------------------------------------------ *
 * Index parsing
 * ------------------------------------------------------------------ */

/**
 * Pull one row per advert out of the listing page.
 *
 * The teaser card already carries everything needed to decide whether a job is
 * worth a second request: title, employer, location, published date, an ISO
 * deadline in a `datetime` attribute, the experience band and a category badge.
 * So a full run is one request plus a detail fetch only for new, relevant rows.
 */
export function parseIndex(html) {
  const clean = String(html).replace(/<!--[\s\S]*?-->/g, '');
  const cards = clean.split('<article data-history-node-id').slice(1);
  const out = [];
  const seen = new Set();

  for (const card of cards) {
    const slug = normaliseHref((/href="([^"]*\/job\/[^"]+)"/.exec(card) ?? [])[1]);
    if (!slug || seen.has(slug)) continue;

    const title = text((/<span class="field field--name-title[^"]*">([\s\S]*?)<\/span>/.exec(card) ?? [])[1]);
    if (!title) continue;
    seen.add(slug);

    const meta = (/<p class="card-text">([\s\S]*?)<\/p>/.exec(card) ?? [])[1] ?? '';
    const employerHref = (/href="([^"]*\/employer\/[^"]+)"/.exec(meta) ?? [])[1] ?? '';
    const employerSlug = (/\/employer\/([^"#?]+)/.exec(employerHref) ?? [])[1] ?? null;
    const employer = employerSlug
      ? text((new RegExp(`href="[^"]*${employerSlug}"[^>]*>([\\s\\S]*?)</a>`).exec(meta) ?? [])[1])
      : null;

    // The meta line is pipe-separated: employer | location | Published on d | Deadline <time>
    const flat = text(meta.replace(/<time[^>]*>[\s\S]*?<\/time>/g, ''));
    const location = (/\|\s*([^|]+?)\s*\|\s*Published on/i.exec(flat) ?? [])[1] ?? null;

    out.push({
      slug,
      nodeId: (/^="?(\d+)"?/.exec(card) ?? [])[1] ?? null,
      title,
      employer: employer || null,
      employerSlug,
      location: location ? location.trim() : null,
      url: `${SOURCE.base}/job/${slug}`,
      publishedAt: parseDayFirst((/Published on\s*([\d-]{8,10})/i.exec(flat) ?? [])[1]),
      deadline: parseIso((/<time[^>]*datetime="([^"]+)"/.exec(meta) ?? [])[1]),
      level: text((/<br\s*\/?>([\s\S]*?)<br/.exec(meta) ?? [])[1]) || null,
      category: text((/<span class="badge[^"]*">([\s\S]*?)<\/span>/.exec(card) ?? [])[1]) || 'Job',
    });
  }
  return out;
}

/** The site writes dates as DD-MM-YYYY, which `new Date()` would read as US order. */
function parseDayFirst(s) {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(String(s ?? '').trim());
  if (!m) return null;
  const d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], 12));
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseIso(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* ------------------------------------------------------------------ *
 * Detail parsing
 * ------------------------------------------------------------------ */

/**
 * The sidebar summary block is a list of `<b>Label:</b> value` pairs. Only those
 * labelled facts are taken - the advert text itself is deliberately left behind.
 */
export function parseDetail(html) {
  const clean = String(html).replace(/<!--[\s\S]*?-->/g, '');
  const block = (/id="block-jobsummaryblock"([\s\S]*?)<\/ul>/.exec(clean) ?? [])[1] ?? '';
  const fields = {};
  for (const m of block.matchAll(/<b>\s*([^<:]+?)\s*:?\s*<\/b>([^<]*)/g)) {
    fields[m[1].trim().toLowerCase()] = text(m[2]);
  }

  const applyPath = (/href="([^"]*(?:job_application_job|\/form\/)[^"]*)"/.exec(block) ?? [])[1];

  return {
    sector: fields['sector'] || null,
    education: fields['education level'] || null,
    experience: fields['desired experience'] || null,
    contract: fields['contract type'] || null,
    positions: numberOr(fields['number of positions']),
    views: numberOr((/viewed\s*<em[^>]*>([\d,]+)<\/em>/.exec(clean) ?? [])[1]),
    applyUrl: applyPath ? new URL(decode(applyPath), SOURCE.base).toString() : null,
  };
}

function numberOr(s) {
  const n = Number(String(s ?? '').replace(/[^\d]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/* ------------------------------------------------------------------ *
 * Relevance
 * ------------------------------------------------------------------ */

/**
 * Tags mirror what the question bank actually teaches. A job is "relevant" when
 * someone studying here would be a plausible applicant - not merely when it is
 * a job in Rwanda.
 *
 * `core: false` marks a family this site only partly prepares anyone for, so it
 * needs a second signal before it counts as a match. Without that split the
 * board fills up with receptionist and golf-club vacancies that happen to share
 * a word with an administration syllabus.
 */
export const TAGS = [
  {
    id: 'ict',
    label: 'IT & networking',
    core: true,
    words: [
      'ict', 'it', 'information technology', 'network', 'system administrator', 'systems administrator',
      'sysadmin', 'software', 'developer', 'programmer', 'database', 'data analyst', 'data engineer',
      'data scientist', 'cyber', 'information security', 'helpdesk', 'help desk',
      'web developer', 'website', 'devops', 'cloud', 'infrastructure',
      'computer', 'erp', 'oracle', 'linux', 'server', 'digital', 'informatics',
      'business analyst', 'technical support', 'gis', 'mis', 'tech support', 'systems engineer',
    ],
  },
  {
    id: 'electrical',
    label: 'Electrical & electronics',
    core: true,
    words: [
      'electric', 'electronic', 'electro', 'power system', 'energy', 'solar', 'substation',
      'instrumentation', 'automation', 'plc', 'scada', 'transmission line', 'biomedical',
      'maintenance technician', 'mechatronic',
    ],
  },
  {
    id: 'telecom',
    label: 'Telecom',
    core: true,
    words: ['telecom', 'fibre', 'fiber', 'rf engineer', 'vsat', 'bts', 'radio engineer'],
  },
  {
    id: 'education',
    label: 'Education',
    core: true,
    words: [
      'teacher', 'headteacher', 'head teacher', 'deputy head', 'dean of studies', 'school',
      'lecturer', 'trainer', 'tvet', 'education officer', 'curriculum', 'instructor',
    ],
  },
  {
    id: 'admin',
    label: 'Administration & finance',
    core: false,
    words: [
      'administrative assistant', 'human resource', 'hr officer', 'procurement', 'logistics officer',
      'accountant', 'finance officer', 'audit', 'secretary', 'records officer', 'documentation officer',
      'monitoring and evaluation', 'planning officer', 'receptionist', 'data clerk',
    ],
  },
];

/**
 * Word-boundary matching, because plain `includes` finds "gis" inside
 * "loGIStics" and "ict" inside "distrICT" - which is how a logistics vacancy and
 * a geologist both arrived tagged as IT jobs on the first run.
 *
 * Short tokens are anchored at both ends (ICT, IT, GIS, ERP); longer ones are
 * anchored at the start only, so "electric" still reaches "electrical" and
 * "network" still reaches "networking".
 */
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function tagPattern(words) {
  const parts = words.map((w) => escape(w) + (w.length <= 4 ? '\\b' : ''));
  return new RegExp('\\b(?:' + parts.join('|') + ')', 'i');
}

for (const tag of TAGS) tag.pattern = tagPattern(tag.words);

/**
 * Procurement dressed as a vacancy. The category badge catches most tenders,
 * but grant calls and EOIs are posted under Other and Consultancy, and none of
 * them are something a candidate applies to with a CV.
 */
const PROCUREMENT =
  /\b(?:tender|expression of interest|eoi|request for (?:proposals?|quotations?|expressions?)|rfps?|rfqs?|call for (?:proposals?|consultan)|invitation to bid|bid document|procurement notice|prequalification|supply and delivery|provision of)\b/i;

/**
 * Employer-name markers for state bodies. This is a heuristic on a name, not a
 * lookup against a register, so it drives a soft "Government / agency" hint and
 * a small score nudge - never a claim the UI states as fact.
 */
const PUBLIC_MARKERS = [
  'ministry', 'minist', 'national ', 'authority', 'agency', ' board', 'district',
  'city of kigali', 'government', 'public service', 'university of rwanda', 'rwanda revenue',
  'rssb', 'rura', ' rdb', 'wasac', 'rwanda energy group', 'police', 'commission', 'council',
  'rwanda medical supply', 'rwanda biomedical',
];

const ENTRY_LEVEL = /(intern|entry|junior|graduate|0 to 1|1 to 3|beginner)/i;

/** Score at which a row is worth putting in front of someone. */
export const RELEVANT_AT = 6;

export function classify(job) {
  const title = job.title ?? '';
  const sector = job.sector ?? '';
  const employer = (job.employer ?? '').toLowerCase();

  const tags = [];
  let score = 0;
  let core = false;
  for (const tag of TAGS) {
    const inTitle = tag.pattern.test(title);
    const inSector = tag.pattern.test(sector);
    if (!inTitle && !inSector) continue;
    tags.push(tag.id);
    if (tag.core) core = true;
    score += inTitle ? (tag.core ? 4 : 2) : 0;
    score += inSector ? (tag.core ? 3 : 2) : 0;
  }

  const publicSector = PUBLIC_MARKERS.some((w) => employer.includes(w));
  if (publicSector) score += 2;
  if (job.category === 'Job') score += 2;
  else if (job.category === 'Internship') score += 1;
  // Fresh graduates are who sits a recruitment exam, so junior postings rank up.
  if (ENTRY_LEVEL.test(`${job.level ?? ''} ${job.experience ?? ''} ${title}`)) score += 1;

  const procurement = PROCUREMENT.test(title);
  if (procurement) score = 0;

  return {
    tags,
    score,
    publicSector,
    procurement,
    relevant: !procurement && core && score >= RELEVANT_AT,
  };
}

/* ------------------------------------------------------------------ *
 * Fetching
 * ------------------------------------------------------------------ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, { timeoutMs = 20000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/html' },
      signal: ctrl.signal,
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

export async function fetchIndex() {
  return parseIndex(await get(`${SOURCE.base}/`));
}

export async function fetchDetail(url) {
  return parseDetail(await get(url));
}

/* ------------------------------------------------------------------ *
 * Storage
 * ------------------------------------------------------------------ */

export async function ensureJobIndexes(db) {
  const col = db.collection('jobs');
  await col.createIndex({ key: 1 }, { unique: true });
  await col.createIndex({ deadline: 1 });
  await col.createIndex({ score: -1, publishedAt: -1 });
  await col.createIndex({ tags: 1 });
}

/**
 * One run.
 *
 * Detail pages are fetched only for rows that are new *and* relevant, one at a
 * time with a pause between, so a daily run is roughly one request plus a
 * handful - well below what a person browsing the site would generate.
 */
/**
 * @param {import('mongodb').Db} db
 * @param {{ enrich?: boolean, maxDetail?: number, delayMs?: number, log?: (m: string) => void, now?: Date }} [options]
 */
export async function syncJobs(db, options = {}) {
  const {
    enrich = true,
    maxDetail = 40,
    delayMs = 1200,
    log = () => {},
    now = new Date(),
  } = options;

  await ensureJobIndexes(db);
  const col = db.collection('jobs');

  const rows = await fetchIndex();
  log(`index: ${rows.length} adverts`);

  /** @type {{ seen: number, skipped: number, added: number, updated: number, enriched: number, relevant: number, errors: string[] }} */
  const stats = { seen: rows.length, skipped: 0, added: 0, updated: 0, enriched: 0, relevant: 0, errors: [] };
  const known = new Set(
    (await col.find({}, { projection: { key: 1 } }).toArray()).map((d) => d.key),
  );

  const fresh = [];
  for (const row of rows) {
    if (SKIP_CATEGORIES.has(row.category)) {
      stats.skipped++;
      continue;
    }
    const key = `${SOURCE.id}:${row.slug}`;
    const verdict = classify(row);
    if (verdict.relevant) stats.relevant++;

    const doc = { ...row, key, source: SOURCE.id, sourceName: SOURCE.name, ...verdict, lastSeen: now };
    if (known.has(key)) stats.updated++;
    else {
      stats.added++;
      if (verdict.relevant) fresh.push(doc);
    }

    await col.updateOne(
      { key },
      { $set: doc, $setOnInsert: { firstSeen: now } },
      { upsert: true },
    );
  }

  // Enrich the new and relevant ones with the sidebar facts, then re-score:
  // the sector field often confirms a match the title only hinted at.
  if (enrich) {
    for (const doc of fresh.slice(0, maxDetail)) {
      try {
        const detail = await fetchDetail(doc.url);
        const merged = { ...doc, ...detail };
        await col.updateOne(
          { key: doc.key },
          { $set: { ...detail, ...classify(merged), enrichedAt: now } },
        );
        stats.enriched++;
      } catch (err) {
        stats.errors.push(`${doc.slug}: ${err.message}`);
      }
      await sleep(delayMs);
    }
  }

  log(
    `added ${stats.added}, updated ${stats.updated}, enriched ${stats.enriched}, ` +
      `relevant ${stats.relevant}, skipped ${stats.skipped} tenders`,
  );
  return stats;
}

/**
 * Open adverts, most relevant first. A passed deadline is the only closing
 * signal that is not a guess - a row vanishing from the index could equally
 * mean it was pushed off the front page.
 *
 * @param {import('mongodb').Db} db
 * @param {{ tag?: string | null, limit?: number, now?: Date }} [options]
 */
export async function currentJobs(db, { tag = null, limit = 120, now = new Date() } = {}) {
  /** @type {Record<string, unknown>} */
  const query = { $or: [{ deadline: { $gte: now } }, { deadline: null }] };
  if (tag) query.tags = tag;
  const docs = await db
    .collection('jobs')
    .find(query, { projection: { _id: 0 } })
    .sort({ score: -1, publishedAt: -1 })
    .limit(limit)
    .toArray();
  return docs;
}
