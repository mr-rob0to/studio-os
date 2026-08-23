import type { Metadata } from "next";

import { WalkthroughDeck } from "@/components/walkthrough-deck";

import styles from "./walkthrough.module.css";

export const metadata: Metadata = {
  title: "Studio OS walkthrough",
  description: "A keyboard-driven Studio OS walkthrough presentation.",
};

export default function WalkthroughPage() {
  return (
    <main className={styles.page} id="main-content">
      <WalkthroughDeck />
    </main>
  );
}
