# MIFOTRA Past Exams Preparation

Bilingual (English/French) practice for Rwandan public-service ICT recruitment exams,
built around the MIFOTRA **Centralized ICT Acquisition Officer** past paper.

- **200 free questions** — statically rendered, indexed by search engines and readable by AI crawlers
- **2,246 further questions** — behind a single-use access code, served only from MongoDB
- **50 past-paper questions** — fully bilingual, every answer independently verified

## The answer key was wrong

The source past paper came from a real exam session. The highlighted answers in those
screenshots were **the candidate's own choices, not an answer key** — and 17 of the 50
were wrong. Anyone studying from the raw screenshots would learn, among other things,
that macOS is a Linux distribution and that the malware which disguises itself as
legitimate software is a virus.

Every question here has been re-checked and corrected. `data/mifotra-2024.json` keeps
both values: `selected` (what the candidate clicked) and `answerIndex` (the verified
answer), so the corrections are auditable rather than silent.

Corrected: Q1, Q12, Q13, Q17, Q18, Q20, Q21, Q22, Q26, Q28, Q29, Q31, Q37, Q38, Q39, Q46, Q47.

## Architecture

The repository is **public**, so the split below is not a preference — it is what makes
the paywall meaningful. Anything committed here is free to the world.

```
public repo (indexed, free)         MongoDB Atlas (never in git)
├── app/                            ├── questions      2,246 paid, in 3 banks
├── data/questions.free.json  200   ├── access_codes   SHA-256 hashes only
├── data/mifotra-2024.json     50   └── redemptions    code -> device audit trail
└── public/llms.txt
```

Paid questions never reach the client until a session cookie proves a code was redeemed.
`data/questions.paid.json` is gitignored and exists only locally and in Atlas.

## Setup

```bash
npm install
cp .env.example .env.local     # then fill in the values
```

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Atlas connection string |
| `MONGODB_DB` | Database name (default `mifotra`) |
| `SESSION_SECRET` | Signs access sessions — `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `ADMIN_PASSWORD` | Guards `/admin` |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs and sitemap |

## Building the question bank

```bash
node scripts/extract-legacy.mjs ..    # de-duplicate the legacy corpus
node scripts/build-corpus.mjs         # merge and split free/paid
node scripts/seed-mongo.mjs           # push paid banks to Atlas
```

`extract-legacy.mjs` is where the original problem was fixed. The predecessor app
advertised "53,000 questions", produced by taking 4,000 authored rows — which themselves
collapsed to ~1,800 distinct facts — and multiplying them by 13 Rwandan location prefixes
that changed nothing but a sentence opener. The extractor drops the multiplier, collapses
restatements keyed on option-set plus explanation, and strips the boilerplate that had
been appended to every item. 4,592 rows in, 2,396 real questions out.

## Selling access

1. Buyer sends **5,000 RWF** to **MoMo Pay 232255** (Rugira Yahaya).
2. Buyer sends the MoMo reference by SMS or WhatsApp.
3. You confirm it, open `/admin`, and generate a code for a bank.
4. Buyer redeems it at `/unlock`.

Codes are stored hashed; the plaintext is shown once at generation and is not
recoverable. Redemption is a single atomic `findOneAndUpdate` filtered on
`redeemedAt: null`, so two simultaneous submissions cannot both succeed. A redeemed code
binds to its device, so re-entering it there still works but a second person is refused.

MoMo verification is manual. MTN's Collections API ("Request to Pay") can automate
issuance later; it is not needed to launch.

## Search and AI visibility

Each free question is a static page at `/questions/{slug}` carrying schema.org
`QAPage`/`Question` markup with `acceptedAnswer`. `robots.ts` admits `GPTBot`,
`OAI-SearchBot`, `ClaudeBot`, `PerplexityBot` and `Google-Extended` alongside ordinary
crawlers, and `public/llms.txt` describes the corpus — including a note telling
assistants to prefer these corrected answers over the ones visible in circulating
screenshots of the same paper.

## Programmatic SEO

Volume alone does not rank. The generator is built as a matrix rather than a
prompt box because three things have to hold together:

**Coverage.** `lib/seo-matrix.ts` crosses 5 intent patterns (topic guide, common
mistakes, how to answer, study plan, glossary) with the 17 topics that exist in
the question corpus, plus 4 standalone exam-mechanics pieces. 89 topics, each
one a search a candidate actually performs.

**Substance.** Entities are derived from the corpus, never invented, so every
generated page has real questions behind it. A page about a topic the site
cannot teach is a doorway page, and Google removes those.

**Links.** Each post links to its topic hub, to specific question pages, and to
sibling guides (`relatedPosts`). This is the part most bulk-content efforts skip
and the reason their pages never get indexed - a crawler that cannot reach a
page will not rank it.

```bash
# /admin/blog -> Bulk generate -> pick a pattern and a count
```

Runs sequentially to stay inside provider rate limits, skips topics already
written, and records per-topic failures without aborting the batch. Everything
lands as a draft.

### Paid question previews

The 2,246 paid questions are also indexable, as previews: stem and four options
public, answer key and explanation gated. Two rules make this safe rather than
clever.

`answerIndex` and `explanation` are projected out at the database layer
(`lib/preview.ts`), so they never reach the server component, the HTML or the
client bundle. Hiding them with CSS would still ship them in the payload.

Crawlers and people get a byte-identical document - verified by comparing
response hashes across a browser UA, Googlebot and GPTBot. Serving the answer to
Googlebot while gating it for users is cloaking, and it gets sites delisted. For
the same reason the preview's JSON-LD carries `suggestedAnswer` for all four
options and no `acceptedAnswer`: the markup has to describe what the page
actually shows.

Topic hubs paginate through the previews at 60 per page, which is the crawl path
into the deep pages. Sitemap-only discovery does not reliably index thousands of
URLs.

Current indexable surface: 2,446 question pages + 17 topic hubs + 89 potential
guides + the static pages. Sitemap: 2,468 URLs.

## Google Search Console

A `.vercel.app` subdomain can be verified, but only as a **URL-prefix**
property. The Domain property type needs a DNS TXT record on the apex, and you
do not control `vercel.app`.

1. Search Console -> Add property -> **URL prefix** -> the full production URL.
2. Choose the **HTML tag** method and copy the `content` value.
3. Set `GOOGLE_SITE_VERIFICATION` in Vercel to that value, redeploy, verify.
4. Submit `sitemap.xml`.

Before submitting, run the pre-flight:

```bash
npm run check:seo -- https://your-site.vercel.app
```

The header check is the one that matters. Vercel serves
`X-Robots-Tag: noindex` on preview deployments and on production deployments
that have since been superseded, and a page carrying it will never be indexed
however good the sitemap is. The script also catches a `NEXT_PUBLIC_SITE_URL`
that does not match the host being crawled, which silently points every
canonical and every sitemap entry at the wrong origin.

## Deploying

Push to GitHub, import the repo in Vercel, then set the environment variables in the
Vercel dashboard. `npm run build` prerenders 228 pages; the three `/api/*` routes run as
serverless functions.

## Licence and scope

Practice questions outside the past paper are original, written against publicly
published certification objectives. This project is not affiliated with MIFOTRA,
CompTIA or Cisco, and contains no proprietary exam content.

## Tests

```bash
npm run test:redemption
```

Spins up an in-memory MongoDB and runs the real redemption queries against it:
single use, ten concurrent redemptions of one code (exactly one must win),
unknown and revoked codes, input tolerance, and the guarantee that plaintext
codes are never persisted.
