"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "../components/header.js";
import collection from "../collection.config.js";
import { createClient } from "../lib/supabase-client.js";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Always read active language directly from URL search params
  const locale = searchParams.get("lang") || "en";

  // Helper function to get text based on locale for flat structure
  const getEntryText = (entry, fieldPrefix) => {
    if (!entry) return "";
    const field = entry[`${fieldPrefix}_${locale}`] || entry[`${fieldPrefix}_en`];
    return field || "";
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

  // Navigates to Browse page with BOTH search term 'q' and language 'lang'
  const goToDetail = (titleText) => {
    const params = new URLSearchParams();
    params.set("q", titleText);
    params.set("lang", locale);
    router.push(`/browse?${params.toString()}`);
  };

  return (
    <>
      <Header locale={locale} />

      <main style={styles.wrap}>
        <p style={styles.kicker}>KHMER LIVING ARCHIVE</p>
        <h1 style={styles.title}>{collection.name?.en || collection.name}</h1>
        <p style={styles.description}>
          {collection.description?.en || collection.description}
        </p>

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

        {loading ? (
          <div style={styles.loadingContainer}>
            <p style={styles.loadingText}>Loading archive entries...</p>
          </div>
        ) : error ? (
          <div style={styles.errorContainer}>
            <p style={styles.errorText}>{error}</p>
          </div>
        ) : (
          <>
            <p style={styles.count}>entries in the archive: {entries.length}</p>

            {entries.length === 0 ? (
              <div style={styles.emptyContainer}>
                <p style={styles.emptyText}>No entries found in the archive.</p>
              </div>
            ) : (
              entries.map((entry, index) => {
                const itemTitle = getEntryText(entry, 'title') || "Untitled";
                const imageUrl = entry.photo_urls && entry.photo_urls.length > 0 
                  ? `/api/images/${entry.photo_urls[0]}` 
                  : null;

                return (
                  <div
                    key={entry.id || index}
                    style={styles.previewCard}
                    onClick={() => goToDetail(itemTitle)}
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
                    <span style={styles.detailBtn}>Click for more details →</span>
                  </div>
                );
              })
            )}
          </>
        )}

        <footer style={styles.footer}>
          Built in ICT 340 — Vibe Coding, Archived Kites new thing.
        </footer>
      </main>
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Loading...</div>}>
      <HomeContent />
    </Suspense>
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
    transition: "transform 0.15s ease, boxShadow 0.15s ease",
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