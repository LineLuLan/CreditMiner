/** Intent: make API quartile boundaries readable without hard-coded statistics.
 * Status: handles captured currency and payment-ratio labels. Next: retain API
 * boundaries as they change. Blockers: none. Confidence: boundary tests.
 */
export function insightCategoryLabel(label: string): string {
  if (!/^Q\d+:\s*/i.test(label)) return label;
  let value = label.replace(/^Q\d+:\s*/i, "").trim();
  const ratio = /%$/.test(value);
  value = value.replace(/^pays\s+/i, "");
  if (value.includes("NT$")) {
    value = value.replace(/\d[\d,]*(?:\.\d+)?/g, (amount) => {
      const numeric = Number(amount.replaceAll(",", ""));
      return numeric >= 10000 ? `${numeric / 1000}k` : amount;
    });
  }
  value = value.replace(/^<=\s*/, "up to ").replace(/^>\s*/, "over ");
  if (ratio) return `Pays ${value}`;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
