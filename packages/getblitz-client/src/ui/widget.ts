import type { GetBlitzClientConfig, PaymentSessionDetails } from "../types";
import styles from "../styles/widget.css?inline";
import { initSepaTab, renderSepaTab } from "./sepa-tab";
import { escapeHtml } from "../utils";

export class GetBlitzWidget {
  private root: HTMLElement | null = null;
  private styleEl: HTMLStyleElement | null = null;

  constructor(
    private container: HTMLElement,
    private session: PaymentSessionDetails,
    private config: GetBlitzClientConfig,
  ) {}

  render(): void {
    // Inject styles (only once)
    if (!document.querySelector("[data-getblitz-styles]")) {
      this.styleEl = document.createElement("style");
      this.styleEl.setAttribute("data-getblitz-styles", "");
      this.styleEl.textContent = styles;
      document.head.appendChild(this.styleEl);
    }

    // Create widget root
    this.root = document.createElement("div");
    this.root.className = `getblitz-widget getblitz-theme-${this.config.theme ?? "auto"}`;
    this.root.innerHTML = this.getTemplate();
    this.container.appendChild(this.root);

    // Initialize content
    void this.renderContent();
  }

  private getTemplate(): string {
    const amount = (this.session.amountCents / 100).toFixed(2);
    const currency = "€";

    return `
      <div class="getblitz-card">
        <div class="getblitz-header">
          <span class="getblitz-org">${escapeHtml(this.session.organization.name)}</span>
          <span class="getblitz-amount">${currency}${amount}</span>
        </div>
        <div class="getblitz-content" data-content></div>
        <div class="getblitz-footer">
          <span class="getblitz-powered">Powered by getblitz</span>
          <span class="getblitz-status" data-status>${this.getStatusText()}</span>
        </div>
      </div>
    `;
  }

  private async renderContent(): Promise<void> {
    const contentEl = this.root?.querySelector<HTMLElement>("[data-content]");
    if (!contentEl) return;

    contentEl.innerHTML = renderSepaTab(this.session);
    await initSepaTab(contentEl, this.session);
  }

  private getStatusText(): string {
    switch (this.session.status) {
      case "PENDING":
        return "Awaiting payment...";
      case "PARTIAL":
        return "Partial payment received";
      case "PAID":
        return "✓ Payment confirmed";
      case "EXPIRED":
        return "Session expired";
      case "FAILED":
        return "Payment failed";
      default:
        return "";
    }
  }

  updateStatus(status: string): void {
    const statusEl = this.root?.querySelector<HTMLElement>("[data-status]");
    if (statusEl) {
      this.session.status = status as PaymentSessionDetails["status"];
      statusEl.textContent = this.getStatusText();

      if (status === "PAID") {
        this.root?.classList.add("getblitz-success");
        const contentEl =
          this.root?.querySelector<HTMLElement>("[data-content]");
        if (contentEl) {
          contentEl.innerHTML = `
            <div class="getblitz-success-state">
              <svg class="getblitz-checkmark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <h3>Payment Successful</h3>
              <p>Your transaction has been processing successfully.</p>
            </div>
          `;
        }
      } else if (status === "FAILED") {
        this.root?.classList.add("getblitz-failed");
        const contentEl =
          this.root?.querySelector<HTMLElement>("[data-content]");
        if (contentEl) {
          contentEl.innerHTML = `
            <div class="getblitz-failed-state">
              <svg class="getblitz-error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
              <h3>Payment Failed</h3>
              <p>There was an issue processing your payment.</p>
            </div>
          `;
        }
      } else if (status === "PARTIAL") {
        this.root?.classList.add("getblitz-partial");
        const contentEl =
          this.root?.querySelector<HTMLElement>("[data-content]");
        if (contentEl && !contentEl.querySelector(".getblitz-partial-banner")) {
          const bannerHtml = `
            <div class="getblitz-partial-banner">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <div>
                <h4>Partial Payment</h4>
                <p>We received a partial amount for this session.</p>
              </div>
            </div>
          `;
          contentEl.insertAdjacentHTML("afterbegin", bannerHtml);
        }
      }
    }
  }

  destroy(): void {
    this.root?.remove();
    this.root = null;
  }
}
