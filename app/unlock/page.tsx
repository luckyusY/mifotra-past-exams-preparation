import type { Metadata } from 'next';
import UnlockForm from './UnlockForm';

export const metadata: Metadata = {
  title: 'Unlock the full question bank',
  description:
    'Unlock 1,000 additional MIFOTRA ICT practice questions with a single-use access code.',
};

export default function UnlockPage() {
  return (
    <>
      <h1>Unlock the full question bank</h1>
      <p className="lead">
        The 200 free questions stay free. An access code adds a bank of 1,000 more, covering
        networking, cybersecurity, hardware, operating systems, fibre and electrical topics.
      </p>

      <div className="card" style={{ margin: '1.5rem 0' }}>
        <h2 style={{ marginTop: 0 }}>How to get a code</h2>
        <ol style={{ paddingLeft: '1.1rem', margin: 0 }}>
          <li style={{ marginBottom: '.5rem' }}>
            Send <strong>5,000 RWF</strong> to <strong>MoMo Pay 232255</strong> (Rugira Yahaya).
          </li>
          <li style={{ marginBottom: '.5rem' }}>
            Send your MoMo transaction reference to the same number by SMS or WhatsApp.
          </li>
          <li>You receive a 12-character access code. Enter it below.</li>
        </ol>
        <p className="muted" style={{ marginBottom: 0, marginTop: '.8rem' }}>
          Each code works once and stays tied to the device that redeems it. When you finish a
          bank, a new payment gets you the next one.
        </p>
      </div>

      <UnlockForm />
    </>
  );
}
