"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "../../components/header.js";
import { createClient } from "../../lib/supabase-client.js";

const STATUS_LABELS = {
  pending: { en: "Pending", km: "កំពុងរង់ចាំការពិនិត្យ" },
  published: { en: "Published", km: "ត្រូវបានចែករំលែក" },
  returned: { en: "Returned", km: "ត្រូវតម្រូវឱ្យកែសម្រួលវិញ" }
};

function MyEntriesContent() {
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const locale = searchParams.get("lang") || "en";

  const getText = (entry, field) => {
    if (!entry) return "";
    return entry[`${field}_${locale}`] || entry[`${field}_en`] || "";
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (active) {
          setUser(data.user);
          setAuthLoading(false);
        }
      } catch (err) {
        if (active) setAuthLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!user) return;
    async function fetchEntries() {
      try {
        setLoading(true);
        const supabase = createClient();
        const { data, error } = await supabase
          .from('entries')
          .select('*')
          .eq('owner', user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setEntries(data || []);
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load entries.');
      } finally {
        setLoading(false);
      }
    }
    fetchEntries();
  }, [user]);

  const getStatusText = (status) => {
    const label = STATUS_LABELS[status] || STATUS_LABELS.pending;
    return label[locale] || label.en;
  };

  const getStatusBadgeStyle = (status) => {
    const baseStyle = { ...styles.statusBadge };
    if (status === 'published') {
      baseStyle.backgroundColor = '#DCFCE7';
      baseStyle.color = '#15803D';
      baseStyle.border = '1px solid #86EFAC';
    } else if (status === 'returned') {
      baseStyle.backgroundColor = '#FEE2E2';
      baseStyle.color = '#DC2626';
      baseStyle.border = '1px solid #FCA5A5';
    }
    // pending keeps the default yellow style defined in styles.statusBadge
    return baseStyle;
  };

  if (authLoading) {
    return (
      <>
        <Header locale={locale} />
        <main style={styles.wrap}>
          <div style={styles.loadingContainer}>
            <p style={styles.loadingText}>Loading...</p>
          </div>
        </main>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Header locale={locale} />
        <main style={styles.wrap}>
          <p style={styles.kicker}>MY ENTRIES</p>
          <h1 style={styles.title}>My Entries / ការដាក់ស្នើរបស់ខ្ញុំ</h1>
          <div style={styles.card}>
            <p style={styles.loginMessage}>Please log in to view your entries</p>
            <Link href="/login" style={styles.buttonLink}>Log in</Link>
            <p style={styles.helperText}>
              New here? <Link href="/signup" style={styles.link}>Create an account</Link>
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header locale={locale} />
      <main style={styles.wrap}>
        <p style={styles.kicker}>MY ENTRIES</p>
        <h1 style={styles.title}>My Entries / ការដាក់ស្នើរបស់ខ្ញុំ</h1>

        {loading ? (
          <div style={styles.loadingContainer}><p style={styles.loadingText}>Loading your entries...</p></div>
        ) : error ? (
          <div style={styles.errorContainer}><p style={styles.errorText}>{error}</p></div>
        ) : entries.length === 0 ? (
          <div style={styles.emptyContainer}>
            <p style={styles.emptyText}>You haven't submitted any entries yet.</p>
            <Link href="/contribute" style={styles.buttonLink}>Submit Your First Entry</Link>
          </div>
        ) : (
          <>
            <p style={styles.count}>entries: {entries.length}</p>
            <div style={styles.entriesList}>
              {entries.map((entry) => (
                <div key={entry.id} style={styles.entryCard}>
                  <div style={styles.entryHeader}>
                    <h3 style={styles.entryTitle}>{getText(entry, 'title') || "Untitled"}</h3>
                    <span style={getStatusBadgeStyle(entry.status || 'pending')}>{getStatusText(entry.status || 'pending')}</span>
                  </div>
                  <p style={styles.entryDescription}>
                    {getText(entry, 'description')?.substring(0, 150) || "No description available"}...
                  </p>
                  <div style={styles.entryMeta}>
                    <span style={styles.metaItem}>Contributor: {getText(entry, 'contributor') || "Unknown"}</span>
                    <span style={styles.metaItem}>Submitted: {new Date(entry.created_at).toLocaleDateString()}</span>
                  </div>
                  {entry.review_note && entry.review_note.trim() && (
                    <div style={styles.reviewNoteBox}>
                      <div style={styles.reviewNoteLabel}>Reviewer Note</div>
                      <div style={styles.reviewNoteText}>{entry.review_note}</div>
                    </div>
                  )}
                  <div style={styles.entryActions}>
                    <Link href={`/entry/${entry.id}?lang=${locale}`} style={styles.viewButton}>
                      View Entry
                    </Link>
                    <Link href={`/entry/${entry.id}/edit?lang=${locale}`} style={styles.editButton}>
                      Edit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        
        <footer style={styles.footer}>
          Built in ICT 340 — Vibe Coding, Archived Kites new thing.
        </footer>
      </main>
    </>
  );
}

const styles = {
  wrap: { maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" },
  kicker: { fontFamily: "'Courier New', monospace", color: "#1E40AF", fontSize: 14, fontWeight: 600, letterSpacing: 1 },
  title: { fontSize: 30, fontWeight: 700, margin: "16px 0 12px", lineHeight: 1.2, color: "#1E3A8A" },
  card: { marginTop: 24, padding: 32, backgroundColor: "#FFFFFF", border: "1px solid #93C5FD", borderRadius: 10, textAlign: "center" },
  count: { fontFamily: "'Courier New', monospace", fontSize: 14, color: "#3B82F6", fontWeight: 600, marginTop: 32, marginBottom: 20 },
  entriesList: { display: "flex", flexDirection: "column", gap: 20 },
  entryCard: { backgroundColor: "#FFFFFF", border: "1px solid #93C5FD", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 16 },
  entryHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  entryTitle: { fontSize: 18, fontWeight: 700, color: "#1E3A8A", margin: 0, flex: 1 },
  statusBadge: { padding: "6px 12px", backgroundColor: "#FEF3C7", color: "#D97706", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "1px solid #FBBF24", whiteSpace: "nowrap" },
  entryDescription: { fontSize: 14, color: "#475569", lineHeight: 1.5, margin: 0 },
  entryMeta: { display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12, color: "#64748B" },
  metaItem: { backgroundColor: "#F8FAFC", padding: "4px 8px", borderRadius: 4, border: "1px solid #E2E8F0" },
  entryActions: { display: "flex", gap: 12 },
  viewButton: { padding: "8px 16px", backgroundColor: "#1E40AF", color: "#FFFFFF", textDecoration: "none", borderRadius: 6, fontSize: 14, fontWeight: 600 },
  editButton: { padding: "8px 16px", backgroundColor: "#F1F5F9", color: "#475569", textDecoration: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, border: "1px solid #CBD5E1" },
  loadingContainer: { textAlign: "center", padding: "40px 0", marginTop: 32 },
  loadingText: { fontSize: 16, color: "#64748B", fontStyle: "italic" },
  errorContainer: { textAlign: "center", padding: "40px 0", marginTop: 32, backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8 },
  errorText: { fontSize: 16, color: "#DC2626", fontWeight: 500 },
  emptyContainer: { textAlign: "center", padding: "40px 0", marginTop: 32, backgroundColor: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 },
  emptyText: { fontSize: 16, color: "#0369A1", fontStyle: "italic" },
  loginMessage: { fontSize: 16, color: "#1E3A8A", lineHeight: 1.6, margin: "0 0 16px" },
  buttonLink: { display: "inline-block", padding: "12px 20px", backgroundColor: "#1E40AF", color: "#FFFFFF", textDecoration: "none", borderRadius: 6, fontSize: 15, fontWeight: 600 },
  helperText: { fontSize: 14, color: "#64748B", margin: "16px 0 0" },
  link: { color: "#1E40AF", fontWeight: 600, textDecoration: "none" },
  footer: { marginTop: 64, paddingTop: 24, borderTop: "1px solid #93C5FD", fontSize: 13, color: "#64748B" },
  reviewNoteBox: {
    marginTop: 8,
    padding: "12px 16px",
    backgroundColor: "#FFFBEB",
    border: "1px solid #F59E0B",
    borderRadius: 8,
    fontSize: 14,
    lineHeight: 1.5,
  },
  reviewNoteLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: "#92400E",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  reviewNoteText: {
    fontSize: 14,
    color: "#78350F",
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
  },
};
export default function MyEntriesPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 40, textAlign: "center" }}>
          Loading...
        </div>
      }
    >
      <MyEntriesContent />
    </Suspense>
  );
}