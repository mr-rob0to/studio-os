"use client";

import { useEffect, useState } from "react";

import styles from "@/app/walkthrough/walkthrough.module.css";

const slides = [
  { title: "THE PROBLEM", kind: "problem" },
  { title: "TECH STACK + FLOW", kind: "stack" },
  { title: "CURRENT FEATURES", kind: "features" },
  { title: "HOW WE USE AI", kind: "ai" },
  { title: "BIGGEST TRADE-OFFS", kind: "tradeoffs" },
  { title: "WHAT I WOULD ADD NEXT", kind: "improvements" },
  { title: "DEMO", kind: "demo" },
] as const;

type Slide = (typeof slides)[number];

const handledKeys = new Set([
  "ArrowRight",
  " ",
  "PageDown",
  "ArrowLeft",
  "PageUp",
  "Home",
  "End",
]);

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.matches("a, button, input, select, textarea, [contenteditable]")
  );
}

function renderSlideContent(slide: Slide) {
  switch (slide.kind) {
    case "problem":
      return (
        <div className={styles.problemRows}>
          <div className={styles.contentRow}>
            <p>Problem</p>
            <p>Creative briefs can be incomplete, unclear, and hard to act on.</p>
          </div>
          <div className={styles.contentRow}>
            <p>For</p>
            <p>Animation studio teams.</p>
          </div>
          <div className={`${styles.contentRow} ${styles.accentRow}`}>
            <p>Goal</p>
            <p>Turn each brief into a clear analysis and practical next steps.</p>
          </div>
        </div>
      );
    case "stack":
      return (
        <div className={styles.stackContent}>
          <div className={styles.stackRows}>
            <div className={styles.contentRow}>
              <p>Next.js + TypeScript</p>
              <p>Frontend and backend in one app</p>
            </div>
            <div className={styles.contentRow}>
              <p>PostgreSQL + Drizzle</p>
              <p>Brief and analysis storage</p>
            </div>
            <div className={styles.contentRow}>
              <p>OpenAI Responses API</p>
              <p>AI analysis</p>
            </div>
          </div>
          <p className={styles.flow}>CREATE BRIEF → SAVE → ANALYZE → VALIDATE → SHOW RESULTS</p>
        </div>
      );
    case "features":
      return (
        <ol className={styles.numberedList}>
          <li>Create a brief</li>
          <li>View all briefs</li>
          <li>View brief details and analysis</li>
          <li>Retry a failed analysis</li>
        </ol>
      );
    case "ai":
      return (
        <div className={styles.aiRows}>
          <div className={styles.contentRow}><p>Provider</p><p>OpenAI</p></div>
          <div className={styles.contentRow}><p>Current default model</p><p className={styles.monospace}>gpt-4o-mini</p></div>
          <div className={styles.contentRow}><p>Structured output</p><p>The model returns the fields the product expects.</p></div>
          <div className={styles.contentRow}><p><span className={styles.monospace}>Zod</span> validation</p><p>The app checks the output before saving or showing it.</p></div>
          <div className={`${styles.contentRow} ${styles.successRow}`}><p>Why it matters</p><p>Users get actionable, consistent recommendations, risks, and next steps.</p></div>
          <div className={`${styles.contentRow} ${styles.failureRow}`}><p>Invalid output</p><p>Becomes a retryable error.</p></div>
        </div>
      );
    case "tradeoffs":
      return (
        <div className={styles.tradeoffs}>
          <section><h2>Synchronous AI analysis</h2><p>Simple to build, but the user waits for the model to finish.</p></section>
          <section><h2>One Next.js application</h2><p>Fast to build and deploy, but the frontend and backend are coupled.</p></section>
        </div>
      );
    case "improvements":
      return (
        <ol className={`${styles.numberedList} ${styles.improvementList}`}>
          <li>AuthN / AuthZ, ideally SSO, and user roles</li>
          <li>Edit, version, and delete briefs</li>
          <li>File uploads</li>
          <li>Slack, Jira, and Google Workspace integrations</li>
          <li>AI output and cost evals</li>
          <li>Background analysis with queues, progress, and notifications</li>
        </ol>
      );
    case "demo":
      return null;
  }
}

export function WalkthroughDeck() {
  const [activeSlide, setActiveSlide] = useState(0);
  const active = slides[activeSlide];
  const isDemo = active.kind === "demo";

  function moveTo(nextSlide: number) {
    setActiveSlide(Math.min(Math.max(nextSlide, 0), slides.length - 1));
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      isInteractiveTarget(event.target) ||
      !handledKeys.has(event.key)
    ) {
      return;
    }

    event.preventDefault();

    if (event.key === "ArrowRight" || event.key === " " || event.key === "PageDown") {
      moveTo(activeSlide + 1);
      return;
    }

    if (event.key === "ArrowLeft" || event.key === "PageUp") {
      moveTo(activeSlide - 1);
      return;
    }

    moveTo(event.key === "Home" ? 0 : slides.length - 1);
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  return (
    <div className={styles.deck}>
      <p aria-atomic="true" aria-live="polite" className={styles.liveRegion}>
        Slide {activeSlide + 1} of {slides.length}: {active.title}
      </p>
      {!isDemo ? (
        <div className={styles.presentationChrome}>
          <p className={styles.slideCount}>{activeSlide + 1} / {slides.length}</p>
          <div aria-hidden="true" className={styles.progress} data-testid="slide-progress">
            <span style={{ width: `${((activeSlide + 1) / slides.length) * 100}%` }} />
          </div>
        </div>
      ) : null}
      <div className={`${styles.stage} ${isDemo ? styles.demoStage : ""}`}>
        <section aria-labelledby="walkthrough-slide-title" aria-roledescription="slide" className={styles.slide} key={active.title} role="group">
          <h1 id="walkthrough-slide-title" className={isDemo ? styles.demoTitle : styles.title}>{active.title}</h1>
          {renderSlideContent(active)}
        </section>
      </div>
      {!isDemo ? (
        <div className={styles.controls}>
          <button aria-label="Previous slide" disabled={activeSlide === 0} onClick={() => moveTo(activeSlide - 1)} type="button">Previous</button>
          <button aria-label="Next slide" disabled={activeSlide === slides.length - 1} onClick={() => moveTo(activeSlide + 1)} type="button">Next</button>
        </div>
      ) : null}
    </div>
  );
}
