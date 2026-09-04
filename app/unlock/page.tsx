import type { Metadata } from 'next';
import UnlockForm from './UnlockForm';
import WhatsAppButton, { WHATSAPP_DISPLAY, MOMO_CODE, MOMO_NAME } from '../Contact';

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
            Send <strong>5,000 RWF</strong> to <strong>MoMo Pay {MOMO_CODE}</strong> ({MOMO_NAME}).
          </li>
          <li style={{ marginBottom: '.5rem' }}>
            Send the transaction reference on WhatsApp to{' '}
            <strong>{WHATSAPP_DISPLAY}</strong>.
          </li>
          <li>You receive a 12-character access code. Enter it below.</li>
        </ol>
        <div className="navrow">
          <WhatsAppButton />
        </div>
        <p className="muted" style={{ marginBottom: 0, marginTop: '.8rem' }}>
          Each code works once and stays tied to the device that redeems it. When you finish a
          bank, a new payment gets you the next one.
        </p>
      </div>

      <UnlockForm />
    </>
  );
}
