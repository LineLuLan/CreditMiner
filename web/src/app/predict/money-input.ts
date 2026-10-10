/** Preserve editing drafts while keeping the request value numeric. */
export function moneyEdit(raw: string, allowNegative = false): { text: string; value: number } | null {
  const plain = raw.replaceAll(",", "");
  if (!(allowNegative ? /^-?\d*(?:\.\d*)?$/ : /^\d*(?:\.\d*)?$/).test(plain)) return null;
  const [whole, fraction] = plain.split(".");
  const text = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (fraction === undefined ? "" : `.${fraction}`);
  return { text, value: plain === "" || plain === "-" || plain === "." || plain === "-." ? NaN : Number(plain) };
}
