import { z } from "zod";

const SupportIntervalSchema = z.object({ low: z.number(), high: z.number() });

/**
 * Intent: share enriched sequence evidence between dashboard and both reports.
 * Status: v2 stories and uncertainty are optional for legacy artifacts.
 * Next: retain payload metadata; blockers: none. Confidence: parser regression tests.
 */
export const SequencePatternSchema = z.object({
  pattern: z.string(),
  length: z.number().int(),
  supportDefault: z.number(),
  supportNonDefault: z.number(),
  supportDiff: z.number(),
  ratio: z.number(),
  displayText: z.string().optional(),
  steps: z.array(z.object({
    items: z.array(z.string()),
    sameMonth: z.boolean().optional(),
    repeat: z.number().int().positive().optional(),
  })).optional(),
  familyId: z.string().optional(),
  groupPrevalenceRatio: z.number().optional(),
  groupPrevalenceRatioStatus: z.string().optional(),
  difference: z.number().optional(),
  ci95: z.object({
    supportDefault: SupportIntervalSchema.optional(),
    supportNonDefault: SupportIntervalSchema.optional(),
  }).optional(),
});

export const SequenceStoriesSchema = z.object({
  defaultStories: z.array(SequencePatternSchema).optional(),
  nonDefaultStories: z.array(SequencePatternSchema).optional(),
});

const ExperimentMetricsSchema = z.object({
  accuracy: z.number(),
  precision: z.number(),
  recall: z.number(),
  f1: z.number(),
  rocAuc: z.number(),
  prAuc: z.number(),
});

export const SequenceArtifactViewSchema = z.object({
  generatedAt: z.string().optional(),
  semanticsVersion: z.number().int().optional(),
  changes: z.string().optional(),
  stories: SequenceStoriesSchema.optional(),
  minSupport: z.number(),
  itemMapping: z.object({
    order: z.string(),
    status: z.record(z.string()),
    payment: z.record(z.string()),
    oldestMonthReference: z.string().optional(),
    paymentRulePrecedence: z.string().optional(),
  }),
  groups: z.object({
    default: z.object({
      sequences: z.number().int(),
      frequentPatterns: z.number().int(),
      minSupportUsed: z.number(),
    }),
    nonDefault: z.object({
      sequences: z.number().int(),
      frequentPatterns: z.number().int(),
      minSupportUsed: z.number(),
    }),
  }),
  patterns: z.array(SequencePatternSchema).optional(),
  topDefaultPatterns: z.array(SequencePatternSchema),
  topNonDefaultPatterns: z.array(SequencePatternSchema),
  featureExperiment: z.object({
    k: z.number().int(),
    patterns: z.array(z.string()),
    patternSelection: z
      .object({
        method: z.string().optional(),
        requestedMinSupport: z.number().optional(),
        holdoutDefaultMinSupportUsed: z.number().optional(),
        holdoutNonDefaultMinSupportUsed: z.number().optional(),
        selectionTimeMs: z.number().optional(),
      })
      .optional(),
    results: z.array(
      z.object({
        algo: z.string(),
        features: z.enum(["base", "base+seq"]),
        cv: ExperimentMetricsSchema,
        test: ExperimentMetricsSchema,
        buildTimeMs: z.number(),
        cvTimeMs: z.number(),
      }),
    ),
  }),
  runtime: z.object({
    buildSequencesMs: z.number(),
    gspDefaultMs: z.number(),
    gspNonDefaultMs: z.number(),
  }),
});

export type SequenceArtifactView = z.infer<typeof SequenceArtifactViewSchema>;
export type SequencePattern = z.infer<typeof SequencePatternSchema>;

export function parseSequenceArtifact(value: unknown): SequenceArtifactView | null {
  const result = SequenceArtifactViewSchema.safeParse(value);
  return result.success ? result.data : null;
}
