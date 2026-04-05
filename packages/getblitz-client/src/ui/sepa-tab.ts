import type { PaymentSessionDetails } from "../types";
import { renderQrCode } from "./qr-code";
import { escapeHtml } from "../utils";

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
          <span class="getblitz-detail-label">Amount</span>
          <div class="getblitz-detail-value-container">
            <code class="getblitz-detail-value">€${amount}</code>
            <button type="button" class="getblitz-copy-btn" data-copy="${amount}" aria-label="Copy Amount">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
          </div>
        </div>
        <div class="getblitz-detail-row">
          <span class="getblitz-detail-label">Account Name</span>
          <div class="getblitz-detail-value-container">
            <code class="getblitz-detail-value">${escapeHtml(session.bankAccount.accountName)}</code>
            <button type="button" class="getblitz-copy-btn" data-copy="${escapeHtml(session.bankAccount.accountName)}" aria-label="Copy Account Name">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
          </div>
        </div>
        <div class="getblitz-detail-row">
          <span class="getblitz-detail-label">Reference</span>
          <div class="getblitz-detail-value-container">
            <code class="getblitz-detail-value">${escapeHtml(session.referenceId)}</code>
            <button type="button" class="getblitz-copy-btn" data-copy="${escapeHtml(session.referenceId)}" aria-label="Copy Reference">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
          </div>
        </div>
        <div class="getblitz-detail-row">
          <span class="getblitz-detail-label">IBAN</span>
          <div class="getblitz-detail-value-container">
            <code class="getblitz-detail-value">${escapeHtml(formatIban(session.bankAccount.iban))}</code>
            <button type="button" class="getblitz-copy-btn" data-copy="${escapeHtml(session.bankAccount.iban)}" aria-label="Copy IBAN">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
          </div>
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

  // Handle copy buttons
  const copyBtns =
    container.querySelectorAll<HTMLButtonElement>(".getblitz-copy-btn");
  copyBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.hasAttribute("data-copying")) return;
      const text = btn.getAttribute("data-copy");
      if (text && navigator.clipboard) {
        btn.setAttribute("data-copying", "true");
        navigator.clipboard
          .writeText(text)
          .then(() => {
            const originalHtml = btn.innerHTML;
            btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            setTimeout(() => {
              btn.innerHTML = originalHtml;
              btn.removeAttribute("data-copying");
            }, 2000);
          })
          .catch(() => {
            btn.removeAttribute("data-copying");
          });
      }
    });
  });
}

/**
 * Formats an IBAN with spaces for readability
 */
function formatIban(iban: string): string {
  return iban.replace(/(.{4})/g, "$1 ").trim();
}
