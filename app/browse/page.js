"use client";

import { useMemo, Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Header from "../../components/header.js";
import { createClient } from "../../lib/supabase-client.js";
import collection from "../../collection.config.js";
import EntryCard from "../../components/entryCard.js";

function BrowseContent() {
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const query = searchParams.get("q") || "";
  const locale = searchParams.get("lang") || "en";

  // Helper function to get text based on locale for flat structure
  const getText = (entry, fieldPrefix) => {
    if (!entry) return "";
    const field = entry[`${fieldPrefix}_${locale}`] || entry[`${fieldPrefix}_en`];
    return field || "";
  };

  // Helper to get combined text for searching across all fields
  const getCombinedEntryText = (entry) => {
    if (!entry) return "";
    const title = `${entry.title_en || ""} ${entry.title_km || ""}`;
    const contributor = `${entry.contributor_en || ""} ${entry.contributor_km || ""}`;
    const places = `${entry.places_en || ""} ${entry.places_km || ""}`;
    const description = `${entry.description_en || ""} ${entry.description_km || ""}`;
    return `${title} ${contributor} ${places} ${description}`.toLowerCase();
  };

  // Fetch entries from Supabase
  useEffect(() => {
    async function fetchEntries() {
      try {
        setLoading(true);
        const supabase = createClient();
        const { data, error } = await supabase
          .from('entries')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        setEntries(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching entries:', err);
        setError('Failed to load entries. Please try again later.');
        setEntries([]);
      } finally {
        setLoading(false);
      }
    }

    fetchEntries();
  }, []);

  // Process search query
  const cleanQuery = query.trim().toLowerCase();
  
  // Extract separated keywords
  const keywords = cleanQuery.split(/\s+/).filter(Boolean);
  
  // Create space-removed version of query (e.g., "archived kites" -> "archivedkites")
  const queryWithoutSpaces = cleanQuery.replace(/\s+/g, "");

  const matches = entries.filter((entry) => {
    if (!cleanQuery) return true;

    const rawText = getCombinedEntryText(entry);
    const textWithoutSpaces = rawText.replace(/\s+/g, "");

    // 1. Direct match with spaces or space-removed match
    if (rawText.includes(cleanQuery) || textWithoutSpaces.includes(queryWithoutSpaces)) {
      return true;
    }

    // 2. Strict Whole-Word Keyword Matching (\b ensures "pin" won't match "pink")
    if (keywords.length > 0) {
      return keywords.every((word) => {
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`\\b${escapedWord}\\b`, "i");
        return regex.test(rawText);
      });
    }

    return false;
  });

  const hasMatches = matches.length > 0;

  const randomSuggestions = useMemo(() => {
    if (hasMatches || entries.length === 0) return [];
    return [...entries].sort(() => 0.5 - Math.random()).slice(0, 4);
  }, [hasMatches, query, entries]);

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
                No exact results found for <strong>"{query}"</strong>. 
                {entries.length > 0 ? " Here are some entries from our collection:" : " The archive is currently empty."}
              </span>
            )}
          </p>
        </div>

        {loading ? (
          <div style={styles.loadingContainer}>
            <p style={styles.loadingText}>Loading archive...</p>
          </div>
        ) : error ? (
          <div style={styles.errorContainer}>
            <p style={styles.errorText}>{error}</p>
          </div>
        ) : entries.length === 0 ? (
          <div style={styles.emptyContainer}>
            <p style={styles.emptyText}>No entries found in the archive.</p>
          </div>
        ) : (
          <>
            <p style={styles.count}>entries in view: {displayEntries.length}</p>

            {displayEntries.map((entry, index) => {
              const imageUrl = entry.photo_urls && entry.photo_urls.length > 0 
                ? `/api/images/${entry.photo_urls[0]}` 
                : null;

              return (
                <EntryCard
                  key={entry.id || index}
                  title={getText(entry, 'title') || "Untitled"}
                  contributor={getText(entry, 'contributor') || "Unknown"}
                  place={getText(entry, 'places') || "Unknown"}
                  description={
                    getText(entry, 'description') || "No description available"
                  }
                  image={imageUrl}
                />
              );
            })}
          </>
        )}

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
  loadingContainer: {
    textAlign: "center",
    padding: "40px 0",
    marginTop: 32,
  },
  loadingText: {
    fontSize: 16,
    color: "#64748B",
    fontStyle: "italic",
  },
  errorContainer: {
    textAlign: "center",
    padding: "40px 0",
    marginTop: 32,
    backgroundColor: "#FEF2F2",
    border: "1px solid #FECACA",
    borderRadius: 8,
  },
  errorText: {
    fontSize: 16,
    color: "#DC2626",
    fontWeight: 500,
  },
  emptyContainer: {
    textAlign: "center",
    padding: "40px 0",
    marginTop: 32,
    backgroundColor: "#F0F9FF",
    border: "1px solid #BAE6FD",
    borderRadius: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#0369A1",
    fontStyle: "italic",
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