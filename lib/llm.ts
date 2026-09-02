/**
 * Blog drafting via a hosted model. Whichever API key is present wins, so you can
 * switch providers without touching code. The key stays server-side - these
 * functions are only ever called from a route handler behind the admin password.
 */

type Provider = 'openai' | 'anthropic';

function pickProvider(): { provider: Provider; key: string } {
  if (process.env.OPENAI_API_KEY) return { provider: 'openai', key: process.env.OPENAI_API_KEY };
  if (process.env.ANTHROPIC_API_KEY)
    return { provider: 'anthropic', key: process.env.ANTHROPIC_API_KEY };
  throw new Error('No model API key set. Add OPENAI_API_KEY or ANTHROPIC_API_KEY.');
}

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5';

/** The shape the model must return. Rendered as React elements, never as raw HTML. */
export type BlogDraft = {
  title: string;
  slug: string;
  metaDescription: string;
  keywords: string[];
  intro: string;
  sections: { heading: string; paragraphs: string[]; bullets?: string[] }[];
  faq: { question: string; answer: string }[];
};

const SCHEMA_HINT = `Return ONLY valid JSON, no markdown fence, matching exactly:
{
  "title": string,
  "slug": string,
  "metaDescription": string,
  "keywords": string[],
  "intro": string,
  "sections": [{ "heading": string, "paragraphs": string[], "bullets": string[] }],
  "faq": [{ "question": string, "answer": string }]
}`;

function systemPrompt(): string {
  return [
    'You write practical study guidance for Rwandans preparing for MIFOTRA public-service',
    'ICT recruitment exams. Audience: Rwandan job candidates, many reading English as a',
    'second language, most on mobile phones.',
    '',
    'Rules:',
    '- Write plainly. Short sentences. No filler, no hype, no "in this article we will".',
    '- Be concrete and technically correct. If you state a fact, it must be right.',
    '- Rwandan context where it genuinely helps, not as decoration.',
    '- 6 to 9 sections. Each heading should read like something a person would search for.',
    '- 4 to 6 FAQ entries answering real questions candidates ask.',
    '- slug: lowercase, hyphenated, no more than 8 words.',
    '- metaDescription: 150 to 158 characters, states what the reader gets.',
    '- Never claim affiliation with MIFOTRA, CompTIA or Cisco.',
    '- Never invent statistics, pass rates, dates, or testimonials.',
    '',
    SCHEMA_HINT,
  ].join('\n');
}

async function callOpenAI(key: string, topic: string, extra: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt() },
        { role: 'user', content: `Topic: ${topic}\n${extra}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callAnthropic(key: string, topic: string, extra: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: systemPrompt(),
      messages: [{ role: 'user', content: `Topic: ${topic}\n${extra}\n\n${SCHEMA_HINT}` }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.content[0].text;
}

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);

/** Trust nothing the model returns: coerce every field to the expected shape. */
function coerce(raw: string, topic: string): BlogDraft {
  const cleaned = raw.trim().replace(/^```(?:json)?/, '').replace(/```$/, '').trim();
  const j = JSON.parse(cleaned);

  const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v.trim() : fallback);
  const strArr = (v: unknown) =>
    Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim()) : [];

  const title = str(j.title, topic);

  return {
    title,
    slug: slugify(str(j.slug) || title),
    metaDescription: str(j.metaDescription).slice(0, 300),
    keywords: strArr(j.keywords).slice(0, 12),
    intro: str(j.intro),
    sections: (Array.isArray(j.sections) ? j.sections : [])
      .map((s: Record<string, unknown>) => ({
        heading: str(s?.heading),
        paragraphs: strArr(s?.paragraphs),
        bullets: strArr(s?.bullets),
      }))
      .filter((s: BlogDraft['sections'][number]) => s.heading && s.paragraphs.length),
    faq: (Array.isArray(j.faq) ? j.faq : [])
      .map((f: Record<string, unknown>) => ({
        question: str(f?.question),
        answer: str(f?.answer),
      }))
      .filter((f: BlogDraft['faq'][number]) => f.question && f.answer),
  };
}

export async function draftPost(topic: string, extra = ''): Promise<BlogDraft & { model: string }> {
  const { provider, key } = pickProvider();
  const raw =
    provider === 'openai'
      ? await callOpenAI(key, topic, extra)
      : await callAnthropic(key, topic, extra);

  const draft = coerce(raw, topic);
  if (!draft.sections.length) throw new Error('Model returned no usable sections.');

  return { ...draft, model: provider === 'openai' ? OPENAI_MODEL : ANTHROPIC_MODEL };
}

export function providerConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
}
