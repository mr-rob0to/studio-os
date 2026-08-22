import { z } from "zod";

const trimmedRequiredString = (minimum: number, maximum: number) =>
  z.string().trim().min(minimum).max(maximum);

export const contentTypeSchema = z.enum([
  "short_film",
  "series",
  "feature",
  "commercial",
  "music_video",
  "other",
]);

export const briefInputSchema = z.object({
  title: trimmedRequiredString(3, 120),
  description: trimmedRequiredString(20, 2_000),
  contentType: contentTypeSchema,
  targetAudience: trimmedRequiredString(3, 500),
  notes: z
    .string()
    .trim()
    .max(2_000)
    .nullable()
    .optional()
    .transform((value) => value || null),
});

export type BriefInput = z.infer<typeof briefInputSchema>;

export const analysisStatusSchema = z.enum(["pending", "completed", "failed"]);

export const briefSubmissionResponseSchema = z.object({
  id: z.uuid(),
  analysis: z.object({
    status: analysisStatusSchema,
    failureMessage: z.string().max(240).nullable(),
  }),
});

const analysisText = (minimum: number, maximum: number) =>
  trimmedRequiredString(minimum, maximum);

export const briefAnalysisSchema = z.object({
  recommendation: z.object({
    decision: z.enum(["ready_for_development", "needs_revision", "needs_discussion"]),
    rationale: analysisText(20, 500),
  }),
  themes: z.array(analysisText(2, 80)).min(1).max(5),
  classification: z.object({
    format: analysisText(2, 80),
    tone: z.array(analysisText(2, 80)).min(1).max(4),
    genreSignals: z.array(analysisText(2, 80)).max(4),
  }),
  audience: z.object({
    interpretation: analysisText(20, 500),
    audienceNeeds: z.array(analysisText(5, 200)).min(1).max(5),
    accessibilityConsiderations: z.array(analysisText(5, 200)).max(4),
  }),
  strengths: z.array(analysisText(5, 200)).min(1).max(5),
  opportunities: z.array(analysisText(5, 200)).min(1).max(5),
  risksAndAmbiguities: z.array(analysisText(5, 200)).max(5),
  missingInformation: z.array(analysisText(5, 200)).max(5),
  nextActions: z
    .array(
      z.object({
        action: analysisText(5, 200),
        owner: z.enum(["producer", "creative_lead", "animation_lead", "team"]),
        priority: z.enum(["high", "medium", "low"]),
      }),
    )
    .min(1)
    .max(5),
});

export type BriefAnalysis = z.infer<typeof briefAnalysisSchema>;

export const analysisRecordSchema = z.object({
  id: z.uuid(),
  briefId: z.uuid(),
  status: analysisStatusSchema,
  result: briefAnalysisSchema.nullable(),
  failureCode: z.string().max(32).nullable(),
  failureMessage: z.string().max(240).nullable(),
  provider: z.enum(["mock", "openai"]),
  model: z.string().min(1).max(80),
  promptVersion: z.string().min(1).max(24),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type AnalysisRecord = z.infer<typeof analysisRecordSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
    requestId: z.string().optional(),
  }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export const persistedBriefSchema = briefInputSchema.extend({
  id: z.uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PersistedBrief = z.infer<typeof persistedBriefSchema>;

export const briefDetailSchema = persistedBriefSchema.extend({
  analysis: analysisRecordSchema.nullable(),
});

export type BriefDetail = z.infer<typeof briefDetailSchema>;
