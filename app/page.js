"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/header.js";
import collection from "../collection.config.js";
import { entries } from "../data/entry.js";

export default function Home() {
  const [locale, setLocale] = useState("en");
  const router = useRouter();

  // Extract localized entry string or default to English
  const getEntryText = (field) => {
    if (!field) return "";
    if (typeof field === "string") return field;
    return field[locale] || field.en || "";
  };

  const goToDetail = (titleText) => {
    router.push(`/browse?q=${encodeURIComponent(titleText)}`);
  };

  return (
    <>
      {/* Global Header with Language Switcher & Search */}
      <Header locale={locale} setLocale={setLocale} />

      <main style={styles.wrap}>
        {/* Fixed English Header Text */}
        <p style={styles.kicker}>KHMER LIVING ARCHIVE</p>
        <h1 style={styles.title}>{collection.name?.en || collection.name}</h1>
        <p style={styles.description}>
          {collection.description?.en || collection.description}
        </p>

        {/* Fixed English Metadata Cards */}
        <div style={styles.card}>
          <p style={styles.cardLabel}>CURATED BY</p>
          <p style={styles.cardValue}>
            {collection.curator?.en || collection.curator}
          </p>
        </div>
        <div style={styles.card}>
          <p style={styles.cardLabel}>SOURCE</p>
          <p style={styles.cardValue}>
            {collection.source?.en || collection.source}
          </p>
        </div>

        <p style={styles.count}>entries in the archive: {entries.length}</p>

        {/* Entry Preview Cards (Only title toggles language) */}
        {entries.map((entry, index) => {
          const itemTitle = getEntryText(entry.title) || "Untitled";

          return (
            <div
              key={entry.id || index}
              style={styles.previewCard}
              onClick={() => goToDetail(itemTitle)}
            >
              {entry.image && (
                <div style={styles.imageWrapper}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/images/${entry.image}`}
                    alt={itemTitle}
                    style={styles.previewImage}
                  />
                </div>
              )}
              <h2 style={styles.previewTitle}>{itemTitle}</h2>
              <span style={styles.detailBtn}>Click for more details →</span>
            </div>
          );
        })}

        <footer style={styles.footer}>
          Built in ICT 340 — Vibe Coding, Archived Kites new thing.
        </footer>
      </main>
    </>
  );
}

const styles = {
  wrap: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "40px 24px 80px",
  },
  kicker: {
    fontFamily: "'Courier New', monospace",
    color: "#1E40AF",
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: 1,
  },
  title: {
    fontSize: 30,
    fontWeight: 700,
    margin: "16px 0 12px",
    lineHeight: 1.2,
    color: "#1E3A8A",
  },
  description: {
    fontSize: 18,
    color: "#1E3A8A",
    lineHeight: 1.6,
    margin: 0,
  },
  card: {
    marginTop: 24,
    padding: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#93C5FD",
    borderRadius: 10,
    boxSizing: "border-box",
  },
  cardLabel: {
    fontFamily: "'Courier New', monospace",
    fontSize: 12,
    color: "#1E40AF",
    fontWeight: 600,
    margin: 0,
  },
  cardValue: {
    fontSize: 16,
    margin: "6px 0 0",
    color: "#1E3A8A",
  },
  count: {
    fontFamily: "'Courier New', monospace",
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: 600,
    marginTop: 32,
    marginBottom: 20,
  },
  previewCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#93C5FD",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    cursor: "pointer",
    boxSizing: "border-box",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  },
  imageWrapper: {
    width: "100%",
    height: 220,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#1E3A8A",
    margin: 0,
    minHeight: 28,
    display: "flex",
    alignItems: "center",
  },
  detailBtn: {
    alignSelf: "flex-start",
    padding: "8px 14px",
    backgroundColor: "#EFF6FF",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#93C5FD",
    borderRadius: 6,
    color: "#1E40AF",
    fontSize: 14,
    fontWeight: 600,
    display: "inline-block",
  },
  footer: {
    marginTop: 64,
    paddingTop: 24,
    borderTop: "1px solid #93C5FD",
    fontSize: 13,
    color: "#64748B",
  },
};