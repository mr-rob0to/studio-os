"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  apiErrorSchema,
  briefInputSchema,
  briefSubmissionResponseSchema,
} from "@/contracts";

type FieldName =
  | "title"
  | "description"
  | "contentType"
  | "targetAudience"
  | "notes";

type FormValues = Record<FieldName, string>;
type FieldErrors = Partial<Record<FieldName, string>>;

const initialValues: FormValues = {
  title: "",
  description: "",
  contentType: "",
  targetAudience: "",
  notes: "",
};

const validationMessages: Record<FieldName, string> = {
  title: "Enter at least 3 characters.",
  description: "Enter at least 20 characters.",
  contentType: "Choose a content type.",
  targetAudience: "Enter at least 3 characters.",
  notes: "Keep notes to 2,000 characters or fewer.",
};

const submissionFailureMessage =
  "We couldn't submit your brief. Your work is still here. Try again.";

export function BriefForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const submissionInFlight = useRef(false);
  const [values, setValues] = useState<FormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [savedFailureId, setSavedFailureId] = useState<string | null>(null);

  function updateValue(field: FieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function focusField(field: FieldName) {
    const control = formRef.current?.elements.namedItem(field);

    if (control instanceof HTMLElement) {
      control.focus();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submissionInFlight.current) {
      return;
    }

    setSubmissionError(null);
    const parsed = briefInputSchema.safeParse(values);

    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      const errors = Object.fromEntries(
        (Object.keys(flattened) as FieldName[]).map((field) => [
          field,
          validationMessages[field],
        ]),
      ) as FieldErrors;
      const firstInvalidField = (Object.keys(errors) as FieldName[])[0];

      setFieldErrors(errors);

      if (firstInvalidField) {
        focusField(firstInvalidField);
      }

      return;
    }

    setFieldErrors({});
    submissionInFlight.current = true;
    setIsSubmitting(true);

    let keepSubmissionLocked = false;

    try {
      const response = await fetch("/api/briefs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const apiError = apiErrorSchema.safeParse(body);

        if (
          apiError.success &&
          apiError.data.error.code === "VALIDATION_ERROR" &&
          apiError.data.error.fieldErrors
        ) {
          const errors = toFieldErrors(apiError.data.error.fieldErrors);
          const firstInvalidField = (Object.keys(errors) as FieldName[])[0];

          setFieldErrors(errors);

          if (firstInvalidField) {
            focusField(firstInvalidField);
          }
        } else {
          setSubmissionError(submissionFailureMessage);
        }
      } else {
        const submission = briefSubmissionResponseSchema.safeParse(body);

        if (!submission.success) {
          setSubmissionError(submissionFailureMessage);
          return;
        }

        keepSubmissionLocked = true;
        setIsSubmitted(true);

        if (submission.data.analysis.status === "failed") {
          setSavedFailureId(submission.data.id);
        } else {
          router.push(`/briefs/${submission.data.id}`);
        }
      }
    } catch {
      setSubmissionError(submissionFailureMessage);
    } finally {
      submissionInFlight.current = keepSubmissionLocked;
      setIsSubmitting(false);
    }
  }

  return (
    <form
      aria-busy={isSubmitting}
      aria-label="New creative brief"
      className="brief-form"
      noValidate
      onSubmit={handleSubmit}
      ref={formRef}
    >
      {submissionError ? (
        <p className="form-message form-message-error" role="alert">
          {submissionError}
        </p>
      ) : null}
      {savedFailureId ? (
        <div className="form-message form-message-saved" role="status">
          <p>Your brief was saved, but analysis could not finish.</p>
          <Link href={`/briefs/${savedFailureId}`}>Open saved brief</Link>
        </div>
      ) : null}

      <div className="form-field">
        <label htmlFor="brief-title">Title</label>
        <input
          aria-describedby={fieldErrors.title ? "brief-title-error" : undefined}
          aria-invalid={fieldErrors.title ? "true" : undefined}
          id="brief-title"
          maxLength={120}
          name="title"
          onChange={(event) => updateValue("title", event.target.value)}
          required
          type="text"
          value={values.title}
        />
        {fieldErrors.title ? (
          <p className="field-error" id="brief-title-error">
            {fieldErrors.title}
          </p>
        ) : null}
      </div>

      <div className="form-field form-field-wide">
        <label htmlFor="brief-description">Brief description</label>
        <textarea
          aria-describedby={
            fieldErrors.description ? "brief-description-error" : undefined
          }
          aria-invalid={fieldErrors.description ? "true" : undefined}
          id="brief-description"
          maxLength={2_000}
          name="description"
          onChange={(event) => updateValue("description", event.target.value)}
          required
          rows={7}
          value={values.description}
        />
        {fieldErrors.description ? (
          <p className="field-error" id="brief-description-error">
            {fieldErrors.description}
          </p>
        ) : null}
      </div>

      <div className="form-field">
        <label htmlFor="brief-content-type">Content type</label>
        <select
          aria-describedby={
            fieldErrors.contentType ? "brief-content-type-error" : undefined
          }
          aria-invalid={fieldErrors.contentType ? "true" : undefined}
          id="brief-content-type"
          name="contentType"
          onChange={(event) => updateValue("contentType", event.target.value)}
          required
          value={values.contentType}
        >
          <option value="">Select a format</option>
          <option value="short_film">Short film</option>
          <option value="series">Series</option>
          <option value="feature">Feature</option>
          <option value="commercial">Commercial</option>
          <option value="music_video">Music video</option>
          <option value="other">Other</option>
        </select>
        {fieldErrors.contentType ? (
          <p className="field-error" id="brief-content-type-error">
            {fieldErrors.contentType}
          </p>
        ) : null}
      </div>

      <div className="form-field">
        <label htmlFor="brief-target-audience">Target audience</label>
        <input
          aria-describedby={
            fieldErrors.targetAudience ? "brief-target-audience-error" : undefined
          }
          aria-invalid={fieldErrors.targetAudience ? "true" : undefined}
          id="brief-target-audience"
          maxLength={500}
          name="targetAudience"
          onChange={(event) => updateValue("targetAudience", event.target.value)}
          required
          type="text"
          value={values.targetAudience}
        />
        {fieldErrors.targetAudience ? (
          <p className="field-error" id="brief-target-audience-error">
            {fieldErrors.targetAudience}
          </p>
        ) : null}
      </div>

      <div className="form-field form-field-wide">
        <label htmlFor="brief-notes">
          Notes <span>Optional</span>
        </label>
        <textarea
          aria-describedby={fieldErrors.notes ? "brief-notes-error" : undefined}
          aria-invalid={fieldErrors.notes ? "true" : undefined}
          id="brief-notes"
          maxLength={2_000}
          name="notes"
          onChange={(event) => updateValue("notes", event.target.value)}
          rows={4}
          value={values.notes}
        />
        {fieldErrors.notes ? (
          <p className="field-error" id="brief-notes-error">
            {fieldErrors.notes}
          </p>
        ) : null}
      </div>

      <div className="form-actions form-field-wide">
        <button
          className="submit-button"
          disabled={isSubmitting || isSubmitted}
          type="submit"
        >
          {isSubmitted
            ? savedFailureId
              ? "Brief saved"
              : "Brief created"
            : isSubmitting
              ? "Submitting and analyzing…"
              : "Submit and analyze"}
        </button>
      </div>
    </form>
  );
}

function toFieldErrors(
  serverErrors: Record<string, string[]>,
): FieldErrors {
  const errors: FieldErrors = {};

  for (const field of Object.keys(validationMessages) as FieldName[]) {
    const message = serverErrors[field]?.[0];

    if (message) {
      errors[field] = message;
    }
  }

  return errors;
}
