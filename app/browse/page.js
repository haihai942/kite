"use client";

import { useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "../../components/header.js";
import { entries } from "../../data/entry.js";
import collection from "../../collection.config.js";
import EntryCard from "../../components/entryCard.js";

function BrowseContent() {
  const searchParams = useSearchParams();

  // Read query & locale directly from URL params
  const query = searchParams.get("q") || "";
  const locale = searchParams.get("lang") || "en";

  const getText = (field) => {
    if (!field) return "";
    if (typeof field === "string") return field;
    return field[locale] || field.en || "";
  };

  const getCombinedEntryText = (entry) => {
    const title = `${entry.title?.en || ""} ${entry.title?.km || ""}`;
    const contributor = `${entry.contributor?.en || ""} ${entry.contributor?.km || ""}`;
    const place = `${entry.place?.en || ""} ${entry.place?.km || ""}`;
    const description = `${entry.description?.en || ""} ${entry.description?.km || ""}`;
    return `${title} ${contributor} ${place} ${description}`.toLowerCase();
  };

  const matches = entries.filter((entry) => {
    if (!query.trim()) return true;
    return getCombinedEntryText(entry).includes(query.toLowerCase());
  });

  const hasMatches = matches.length > 0;

  const randomSuggestions = useMemo(() => {
    if (hasMatches) return [];
    return [...entries].sort(() => 0.5 - Math.random()).slice(0, 2);
  }, [hasMatches, query]);

  const displayEntries = hasMatches ? matches : randomSuggestions;

  return (
    <>
      <Header locale={locale} />

      <main style={styles.wrap}>
        <div style={styles.header}>
          <p style={styles.kicker}>KHMER LIVING ARCHIVE</p>
          <h1 style={styles.title}>{collection.name?.en || collection.name}</h1>

          <p style={styles.description}>
            {!query ? (
              "Showing all entries in the archive"
            ) : hasMatches ? (
              `Showing results for "${query}"`
            ) : (
              <span>
                No exact results found for <strong>"{query}"</strong>. Here are
                some entries from our collection:
              </span>
            )}
          </p>
        </div>

        <p style={styles.count}>entries in view: {displayEntries.length}</p>

        {displayEntries.map((entry) => (
          <EntryCard
            key={entry.id || entry.title?.en}
            title={getText(entry.title) || "Untitled"}
            contributor={getText(entry.contributor) || "Unknown"}
            place={getText(entry.place) || "Unknown"}
            description={
              getText(entry.description) || "No description available"
            }
            image={entry.image ? `/api/images/${entry.image}` : null}
          />
        ))}

        <footer style={styles.footer}>
          Built in ICT 340 — Vibe Coding, Archived Kites new thing.
        </footer>
      </main>
    </>
  );
}

export default function BrowsePage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 40, textAlign: "center" }}>
          Loading archive...
        </div>
      }
    >
      <BrowseContent />
    </Suspense>
  );
}

const styles = {
  wrap: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "40px 24px 80px",
  },
  header: {
    marginBottom: 32,
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
    minHeight: 28,
  },
  count: {
    fontFamily: "'Courier New', monospace",
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: 600,
    marginBottom: 24,
  },
  footer: {
    marginTop: 64,
    paddingTop: 24,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#93C5FD",
    borderTopStyle: "solid",
    borderLeftStyle: "none",
    borderRightStyle: "none",
    borderBottomStyle: "none",
    fontSize: 13,
    color: "#64748B",
  },
};