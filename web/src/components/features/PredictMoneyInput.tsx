"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { moneyEdit } from "@/app/predict/money-input";

/**
 * Intent: format money during editing without putting separators into the API payload.
 * Status: preserves decimal/sign drafts and caret position; external reset updates text.
 * Next: keep all monetary prediction fields on this control. Blockers: none.
 * Confidence: numeric editing cases covered by money-input.test.mjs.
 */
export function PredictMoneyInput({ value, onValueChange, allowNegative = false, id }: {
  value: number;
  onValueChange: (value: number) => void;
  allowNegative?: boolean;
  id?: string;
}) {
  const [text, setText] = React.useState(() => moneyEdit(String(value), allowNegative)?.text ?? "");
  const emitted = React.useRef(value);
  React.useEffect(() => {
    if (!Object.is(value, emitted.current)) {
      setText(Number.isFinite(value) ? moneyEdit(String(value), allowNegative)?.text ?? "" : "");
      emitted.current = value;
    }
  }, [value, allowNegative]);
  return (
    <div className="relative min-w-0">
      <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">NT$</span>
      <Input id={id} type="text" inputMode={allowNegative ? "text" : "decimal"} value={text}
        className="min-w-0 pl-11 tabular-nums"
        onChange={(event) => {
          const input = event.currentTarget;
          const next = moneyEdit(input.value, allowNegative);
          if (!next) return;
          const beforeCaret = input.value.slice(0, input.selectionStart ?? input.value.length).replaceAll(",", "").length;
          emitted.current = next.value;
          setText(next.text);
          onValueChange(next.value);
          let caret = 0;
          let characters = 0;
          while (caret < next.text.length && characters < beforeCaret) {
            if (next.text[caret] !== ",") characters++;
            caret++;
          }
          requestAnimationFrame(() => input.setSelectionRange(caret, caret));
        }} />
    </div>
  );
}
