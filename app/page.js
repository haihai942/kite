"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "../components/header.js";
import collection, { pick } from "../collection.config.js";
import { createClient } from "../lib/supabase-client.js";
import { useLanguage } from "../contexts/language-context.js";
import { pickEntryText, fallbackLanguageLabel } from "../lib/entry-text.js";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Always read active language directly from URL search params
  const { language } = useLanguage();

  // Helper function to get text for the active language for flat structure,
  // falling back to the other language when this one is empty.
  const getEntryText = (entry, fieldPrefix) => {
    if (!entry) return "";
    return pickEntryText(entry, fieldPrefix, language).text;
  };

  // Subtle "shown in <language>" hint when a value was borrowed from the other
  // language. Returns "" when the active language had its own value.
  const fallbackHint = (entry, fieldPrefix) => {
    const { text, isFallback } = pickEntryText(entry, fieldPrefix, language);
    if (!text || !isFallback) return "";
    const from = language === "en" ? "km" : "en";
    const name = fallbackLanguageLabel(from, language);
    return language === "en" ? `shown in ${name}` : `បង្ហាញជា${name}`;
  };

  // Build an image src: new entries store a public storage URL,
  // older entries store a local filename served by /api/images/.
  const getEntryImage = (entry) => {
    const first = entry?.photo_urls?.[0];
    if (!first) return null;
    return /^https?:\/\//i.test(first) ? first : `/api/images/${first}`;
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
        console.error('Error fetching entries:', err?.message || JSON.stringify(err));
        // Store a language-neutral flag; the message is translated at render.
        setError('failed');
        setEntries([]);
      } finally {
        setLoading(false);
      }
    }

    fetchEntries();
  }, []);

  // Navigates to Entry detail page with language 'lang' parameter
  const goToDetail = (entryId) => {
    const params = new URLSearchParams();
    params.set("lang", language);
    router.push(`/entry/${entryId}?${params.toString()}`);
  };

  return (
    <>
      <Header />

      <main style={styles.wrap}>
        <p style={styles.kicker}>
          {language === "en" ? "KHMER LIVING ARCHIVE" : "ប័ណ្ណសាររស់រវើកខ្មែរ"}
        </p>
        <h1 style={styles.title}>{pick(collection.name, language)}</h1>
        <p style={styles.description}>
          {pick(collection.description, language)}
        </p>

        {loading ? (
          <div style={styles.loadingContainer}>
            <p style={styles.loadingText}>{language === "en" ? "Loading archive entries..." : "កំពុងផ្ទុកធាតុប័ណ្ណសារ..."}</p>
          </div>
        ) : error ? (
          <div style={styles.errorContainer}>
            <p style={styles.errorText}>
              {language === "en"
                ? "Failed to load entries. Please try again later."
                : "មិនអាចផ្ទុកធាតុបានទេ។ សូមព្យាយាមម្តងទៀតនៅពេលក្រោយ។"}
            </p>
          </div>
        ) : (
          <>
            <p style={styles.count}>{language === "en" ? "entries in the archive: " : "ធាតុនៅក្នុងប័ណ្ណសារ៖ "}{entries.length}</p>

            {entries.length === 0 ? (
              <div style={styles.emptyContainer}>
                <p style={styles.emptyText}>{language === "en" ? "No entries found in the archive." : "គ្មានធាតុណាមួយត្រូវបានរកឃើញនៅក្នុងប័ណ្ណសារ។"}</p>
              </div>
            ) : (
              <div style={styles.entriesGrid}>
                {entries.map((entry, index) => {
                  const itemTitle =
                    getEntryText(entry, 'title') ||
                    (language === "en" ? "Untitled" : "គ្មានចំណងជើង");
                  const imageUrl = getEntryImage(entry);

                  return (
                    <div
                      key={entry.id || index}
                      style={styles.previewCard}
                      onClick={() => goToDetail(entry.id)}
                    >
                      {imageUrl && (
                        <div style={styles.imageWrapper}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imageUrl}
                            alt={itemTitle}
                            style={styles.previewImage}
                          />
                        </div>
                      )}
                      <h2 style={styles.previewTitle}>{itemTitle}</h2>
                      {fallbackHint(entry, 'title') && (
                        <p style={styles.fallbackHint}>
                          {fallbackHint(entry, 'title')}
                        </p>
                      )}
                      <span style={styles.detailBtn}>
                        {language === "en" ? "Click for more details →" : "ចុចដើម្បីមើលព័ត៌មានបន្ថែម →"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        <div style={styles.card}>
          <p style={styles.cardLabel}>
            {language === "en" ? "CURATED BY" : "រៀបចំដោយ"}
          </p>
          <p style={styles.cardValue}>
            {pick(collection.curator, language)}
          </p>
        </div>
        <div style={styles.card}>
          <p style={styles.cardLabel}>
            {language === "en" ? "SOURCE" : "ប្រភព"}
          </p>
          <p style={styles.cardValue}>
            {pick(collection.source, language)}
          </p>
        </div>

        <footer style={styles.footer}>
          {language === "en"
            ? "Archived Kites — Preserving stories and memories, one kite at a time."
            : "បណ្ណសារខ្លែង — រក្សាទុករឿងរ៉ាវ និងការចងចាំរបស់យើង។"}
        </footer>
      </main>
    </>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        // Fallback renders before the language context is available, so it
        // shows no text rather than an English-only string.
        <div style={{ padding: 40, textAlign: "center" }} aria-busy="true" />
      }
    >
      <HomeContent />
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
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    cursor: "pointer",
    boxSizing: "border-box",
    transition: "transform 0.15s ease, boxShadow 0.15s ease",
  },
  entriesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
  },
  imageWrapper: {
    width: "100%",
    height: 120,
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
    fontSize: 14,
    fontWeight: 700,
    color: "#1E3A8A",
    margin: 0,
    lineHeight: 1.3,
    wordBreak: "break-word",
  },
  // Subtle hint shown when a card's title was borrowed from the other language.
  fallbackHint: {
    fontSize: 11,
    color: "#94A3B8",
    fontStyle: "italic",
    margin: "4px 0 0",
  },
  detailBtn: {
    alignSelf: "flex-start",
    padding: "6px 10px",
    backgroundColor: "#EFF6FF",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#93C5FD",
    borderRadius: 6,
    color: "#1E40AF",
    fontSize: 11,
    fontWeight: 600,
    display: "inline-block",
    marginTop: "auto",
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