import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { isAdmin } from '@/lib/admin-auth';
import { readSession, SESSION_COOKIE } from '@/lib/session';
import {
  AI_COOKIE, claim, hasAiTier, newDeviceId, quotaFor, TIER_LABEL, type Tier,
} from '@/lib/ai-quota';
import { freeQuestions } from '@/lib/questions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 45;

/**
 * The AI teacher: explain one question further, on request.
 *
 * Two things are deliberate. It only ever answers about a question that exists
 * in the corpus - the client sends an id, never text - so it cannot be turned
 * into a free general-purpose chatbot on the owner's API key. And the quota is
 * claimed BEFORE the model is called, because a failure after the spend still
 * costs money.
 */

async function tierOf(req: Request, device: string): Promise<Tier> {
  if (await isAdmin(req)) return 'admin';
  if (await hasAiTier(device)) return 'ai';
  const session = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  return session ? 'buyer' : 'anon';
}

async function findQuestion(id: string) {
  const free = freeQuestions.find((q) => q.id === id);
  if (free) return free;
  const db = await getDb();
  return db.collection('questions').findOne({ id }, { projection: { _id: 0 } });
}

/** Report the allowance without spending any of it. */
export async function GET(req: Request) {
  const jar = await cookies();
  const device = jar.get(AI_COOKIE)?.value ?? '';
  const tier = await tierOf(req, device);
  const q = device ? await quotaFor(device, tier) : { tier, used: 0, limit: 0, remaining: 0, resetsAt: '' };
  return NextResponse.json({
    ...q,
    limit: Number.isFinite(q.limit) ? q.limit : null,
    remaining: Number.isFinite(q.remaining) ? q.remaining : null,
    label: TIER_LABEL[tier],
  });
}

export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'The AI teacher is not configured yet.' }, { status: 503 });
  }

  const jar = await cookies();
  let device = jar.get(AI_COOKIE)?.value ?? '';
  let issued = false;
  if (!device) {
    device = newDeviceId();
    issued = true;
  }

  const tier = await tierOf(req, device);
  const { questionId, ask } = await req.json().catch(() => ({}));
  if (typeof questionId !== 'string') {
    return NextResponse.json({ error: 'Missing question.' }, { status: 400 });
  }

  const question = await findQuestion(questionId);
  if (!question) {
    return NextResponse.json({ error: 'Unknown question.' }, { status: 404 });
  }

  // Spend first: a model call that fails after the claim has still cost money.
  const allowed = await claim(device, tier);
  if (!allowed) {
    const q = await quotaFor(device, tier);
    return NextResponse.json(
      {
        error: `You have used all ${q.limit} explanations for today.`,
        tier,
        limit: q.limit,
        upgrade: tier === 'anon' || tier === 'buyer',
      },
      { status: 429 }
    );
  }

  const opts = question.en.options
    .map((o: string, i: number) => `${'ABCD'[i]}. ${o}`)
    .join('\n');
  const keyLine =
    question.answerIndex === null
      ? 'This question has no published answer; say so and explain how to reason about it.'
      : `The correct answer is ${'ABCD'[question.answerIndex]}.`;

  const prompt = [
    `Question: ${question.en.stem}`,
    opts,
    keyLine,
    `Existing explanation: ${question.en.explanation}`,
    ask ? `The learner asks specifically: ${String(ask).slice(0, 300)}` : '',
    '',
    'Teach this further. Explain why the right answer is right AND why each wrong option is tempting.',
    'If there is a formula or rule, state it and show the substitution.',
    'Finish with one sentence on how to recognise this type of question next time.',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        max_tokens: 550,
        messages: [
          {
            role: 'system',
            content: [
              'You tutor Rwandan candidates preparing for public-service and IT certification exams.',
              'Many read English as a second language and study on a phone, so write plainly and keep paragraphs short.',
              'Never contradict the stated correct answer. If you believe it is wrong, say so plainly and explain why rather than quietly answering differently.',
              'Do not invent statistics, standards or Rwandan policy figures.',
            ].join(' '),
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'The AI teacher is unavailable right now.' }, { status: 502 });
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return NextResponse.json({ error: 'No explanation came back.' }, { status: 502 });
    }

    const q = await quotaFor(device, tier);
    const out = NextResponse.json({
      explanation: text,
      tier,
      remaining: Number.isFinite(q.remaining) ? q.remaining : null,
      limit: Number.isFinite(q.limit) ? q.limit : null,
    });
    if (issued) {
      out.cookies.set(AI_COOKIE, device, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return out;
  } catch {
    return NextResponse.json({ error: 'The AI teacher could not be reached.' }, { status: 502 });
  }
}
