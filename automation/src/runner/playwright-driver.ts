import type { Page } from "@playwright/test";
import type { AutomationDriver, FormState, NormalizedField } from "../types/index";

export class PlaywrightDriver implements AutomationDriver {
  constructor(private readonly page: Page, private readonly scanForm: () => Promise<FormState>) {}
  scan() { return this.scanForm(); }
  async fillSafe(fields: NormalizedField[]) { for (const field of fields.filter(item => !item.sensitive && item.confidence >= .8 && item.source)) await this.page.getByLabel(field.label).fill(""); }
  async moveNext() { await this.page.getByRole("button", { name: /^(continue|next)$/i }).click(); }
  async capture(kind: "review"|"confirmation"|"error") { void kind; return this.page.screenshot({ type: "png", fullPage: false }).then(buffer => new Uint8Array(buffer)); }
}
