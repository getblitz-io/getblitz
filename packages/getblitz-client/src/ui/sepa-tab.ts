import type { PaymentSessionDetails } from "../types";
import { renderQrCode } from "./qr-code";

/**
 * Renders the SEPA bank transfer tab content
 */
export function renderSepaTab(session: PaymentSessionDetails): string {
  if (!session.bankAccount.iban) {
    return `<p class="getblitz-error">No IBAN configured</p>`;
  }

  const amount = (session.amountCents / 100).toFixed(2);

  return `
    <div class="getblitz-sepa-content">
      <div class="getblitz-qr-container"></div>
      <p class="getblitz-sepa-instruction">
        Scan with your banking app to pay <strong>€${amount}</strong>
      </p>
      <div class="getblitz-sepa-details">
        <div class="getblitz-detail-row">
          <span class="getblitz-detail-label">Reference</span>
          <code class="getblitz-detail-value">${session.referenceId}</code>
        </div>
        <div class="getblitz-detail-row">
          <span class="getblitz-detail-label">IBAN</span>
          <code class="getblitz-detail-value">${formatIban(session.bankAccount.iban)}</code>
        </div>
      </div>
      <p class="getblitz-sepa-note">
        SEPA Instant - Your payment confirms within seconds
      </p>
    </div>
  `;
}

/**
 * Initializes the SEPA tab (renders QR code)
 */
export async function initSepaTab(
  container: HTMLElement,
  session: PaymentSessionDetails,
): Promise<void> {
  const qrContainer = container.querySelector<HTMLElement>(
    ".getblitz-qr-container",
  );
  if (qrContainer && session.bankAccount.iban) {
    await renderQrCode(qrContainer, session);
  }
}

/**
 * Formats an IBAN with spaces for readability
 */
function formatIban(iban: string): string {
  return iban.replace(/(.{4})/g, "$1 ").trim();
}
