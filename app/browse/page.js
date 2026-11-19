"use client";

import { useMemo, Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "../../components/header.js";
import { createClient } from "../../lib/supabase-client.js";
import collection from "../../collection.config.js";
import EntryCard from "../../components/entryCard.js";
import { useLanguage } from "../../contexts/language-context.js";

function BrowseContent() {
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const query = searchParams.get("q") || "";
  const { language } = useLanguage();

  // Helper function to get text for the active language for flat structure
  const getText = (entry, fieldPrefix) => {
    if (!entry) return "";
    const field = entry[`${fieldPrefix}_${language}`] || entry[`${fieldPrefix}_en`];
    return field || "";
  };

  // Build an image src: new entries store a public storage URL,
  // older entries store a local filename served by /api/images/.
  const getEntryImage = (entry) => {
    const first = entry?.photo_urls?.[0];
    if (!first) return null;
    return /^https?:\/\//i.test(first) ? first : `/api/images/${first}`;
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
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        setEntries(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching entries:', err);
        // Store a language-neutral flag; the message is translated at render.
        setError('failed');
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
      <Header />

      <main style={styles.wrap}>
        <div style={styles.header}>
          <p style={styles.kicker}>
            {language === "en" ? "KHMER LIVING ARCHIVE" : "ប័ណ្ណសាររស់រវើកខ្មែរ"}
          </p>
          <h1 style={styles.title}>{language === "en" ? "Browse" : "ការរុករក"}</h1>

          <p style={styles.description}>
            {!query ? (
              language === "en" ? "Showing all entries in the archive" : "បង្ហាញធាតុទាំងអស់នៅក្នុងប័ណ្ណសារ"
            ) : hasMatches ? (
              language === "en" ? `Showing results for "${query}"` : `បង្ហាញលទ្ធផលសម្រាប់ "${query}"`
            ) : (
              <span>
                {language === "en" ? `No exact results found for "${query}". ${entries.length > 0 ? "Here are some entries from our collection:" : "The archive is currently empty."}` : `គ្មានលទ្ធផលពិតប្រាកដសម្រាប់ "${query}" ។ ${entries.length > 0 ? "នេះគឺជាធាតុមួយចំនួនពីការប្រមូលផ្តុំរបស់យើង៖" : "ប័ណ្ណសារបច្ចុប្បន្នទទេ។"}`}
              </span>
            )}
          </p>
        </div>

        {loading ? (
          <div style={styles.loadingContainer}>
            <p style={styles.loadingText}>{language === "en" ? "Loading archive..." : "កំពុងផ្ទុកប័ណ្ណសារ..."}</p>
          </div>
        ) : error ? (
          <div style={styles.errorContainer}>
            <p style={styles.errorText}>
              {language === "en"
                ? "Failed to load entries. Please try again later."
                : "មិនអាចផ្ទុកធាតុបានទេ។ សូមព្យាយាមម្តងទៀតនៅពេលក្រោយ។"}
            </p>
          </div>
        ) : entries.length === 0 ? (
          <div style={styles.emptyContainer}>
            <p style={styles.emptyText}>
              {language === "en"
                ? "No entries found in the archive."
                : "គ្មានធាតុណាមួយត្រូវបានរកឃើញនៅក្នុងប័ណ្ណសារ។"}
            </p>
          </div>
        ) : (
          <>
            <p style={styles.count}>
              {language === "en" ? "entries in view: " : "ធាតុដែលកំពុងបង្ហាញ៖ "}
              {displayEntries.length}
            </p>

            <div style={styles.entriesGrid}>
              {displayEntries.map((entry, index) => {
                const imageUrl = getEntryImage(entry);

                return (
                  <Link
                    key={entry.id || index}
                    href={`/entry/${entry.id}?lang=${language}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <EntryCard
                      title={
                        getText(entry, 'title') ||
                        (language === "en" ? "Untitled" : "គ្មានចំណងជើង")
                      }
                      contributor={
                        getText(entry, 'contributor') ||
                        (language === "en" ? "Unknown" : "មិនស្គាល់")
                      }
                      place={
                        getText(entry, 'places') ||
                        (language === "en" ? "Unknown" : "មិនស្គាល់")
                      }
                      description={
                        getText(entry, 'description') ||
                        (language === "en"
                          ? "No description available"
                          : "គ្មានការពិពណ៌នាទេ")
                      }
                      image={imageUrl}
                    />
                  </Link>
                );
              })}
            </div>
          </>
        )}

        <footer style={styles.footer}>
          {language === "en"
            ? "Archived Kites — Preserving stories and memories, one kite at a time."
            : "បណ្ណសារខ្លែង — រក្សាទុករឿងរ៉ាវ និងការចងចាំរបស់យើង។"}
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
    width: "100%",
    margin: 0,
    padding: "40px 32px 80px",
    boxSizing: "border-box",
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
  entriesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
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