/**
 * WhatsApp is how the payment loop actually closes: the buyer pays by MoMo,
 * sends the reference, and gets a code back. A pre-filled message means they do
 * not have to explain themselves, which is the step most people drop at.
 */

export const WHATSAPP_NUMBER = '250789448107';
export const WHATSAPP_DISPLAY = '+250 789 448 107';
export const MOMO_CODE = '232255';
export const MOMO_NAME = 'Rugira Yahaya';
export const PRICE_RWF = '5,000 RWF';

export function whatsappLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const PAYMENT_MESSAGE =
  `Hello, I have paid ${PRICE_RWF} to MoMo Pay ${MOMO_CODE} for the question bank. ` +
  `My transaction reference is: `;

export default function WhatsAppButton({
  message = PAYMENT_MESSAGE,
  label = 'Message on WhatsApp',
  variant = 'btn',
}: {
  message?: string;
  label?: string;
  variant?: 'btn' | 'btn ghost';
}) {
  return (
    <a
      className={variant}
      href={whatsappLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '.45rem' }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.48-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.470 0 1.45 1.06 2.86 1.21 3.06.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35z" />
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.86 9.86 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23z" />
      </svg>
      {label}
    </a>
  );
}
