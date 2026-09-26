"use client";

import { useEffect, useState } from "react";

export function useCountUp(target: number, duration = 600): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (target === 0 || reducedMotion || duration <= 0) {
      setValue(target);
      return;
    }

    let frameId = 0;
    let startedAt: number | null = null;

    const update = (timestamp: number) => {
      startedAt ??= timestamp;
      const progress = Math.min((timestamp - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(progress === 1 ? target : target * eased);

      if (progress < 1) frameId = window.requestAnimationFrame(update);
    };

    frameId = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frameId);
  }, [duration, target]);

  return value;
}
