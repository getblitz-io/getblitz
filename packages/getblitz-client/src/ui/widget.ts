import type { GetBlitzClientConfig, PaymentSessionDetails } from "../types";
import styles from "../styles/widget.css?inline";
import { initSepaTab, renderSepaTab } from "./sepa-tab";

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
          <span class="getblitz-org">${this.escapeHtml(this.session.organization.name)}</span>
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

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  updateStatus(status: string): void {
    const statusEl = this.root?.querySelector<HTMLElement>("[data-status]");
    if (statusEl) {
      this.session.status = status as PaymentSessionDetails["status"];
      statusEl.textContent = this.getStatusText();

      if (status === "PAID") {
        this.root?.classList.add("getblitz-success");
      }
    }
  }

  destroy(): void {
    this.root?.remove();
    this.root = null;
  }
}
