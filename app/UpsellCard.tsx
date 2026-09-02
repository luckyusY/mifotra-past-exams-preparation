import Link from 'next/link';

/**
 * The standing offer, in three densities. Everything stated here is a real
 * number from the corpus - no invented scarcity, no fabricated testimonials.
 * The audience is small and talks to each other; a claim that does not hold up
 * costs more than it earns.
 */
export default function UpsellCard({
  variant = 'full',
}: {
  variant?: 'full' | 'inline' | 'compact';
}) {
  if (variant === 'compact') {
    return (
      <Link href="/unlock" className="card upsell upsell-compact">
        <strong>Unlock 1,000 more questions</strong>
        <span className="muted">5,000 RWF &middot; MoMo Pay 232255</span>
      </Link>
    );
  }

  if (variant === 'inline') {
    return (
      <aside className="card upsell upsell-inline">
        <div>
          <strong>Practising for the real thing?</strong>
          <div className="muted">
            1,000 more questions with worked explanations &mdash; 5,000 RWF.
          </div>
        </div>
        <Link className="btn" href="/unlock">
          Unlock
        </Link>
      </aside>
    );
  }

  return (
    <aside className="card upsell">
      <span className="pill">Full question bank</span>
      <h2 style={{ margin: '.6rem 0 .4rem' }}>2,446 questions. You have seen 200.</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        One payment adds a bank of 1,000 questions across networking, cybersecurity,
        operating systems, hardware, fibre and electrical systems &mdash; each with the
        answer explained, not just marked.
      </p>

      <div className="price-row">
        <div>
          <div className="price">5,000 RWF</div>
          <div className="muted" style={{ fontSize: '.86rem' }}>
            per bank of 1,000 &middot; no subscription
          </div>
        </div>
        <Link className="btn" href="/unlock">
          Get an access code
        </Link>
      </div>

      <ol className="steps">
        <li>
          Send <strong>5,000 RWF</strong> to <strong>MoMo Pay 232255</strong> (Rugira Yahaya)
        </li>
        <li>Send the transaction reference to that number</li>
        <li>You get a code &mdash; enter it and start</li>
      </ol>
    </aside>
  );
}
