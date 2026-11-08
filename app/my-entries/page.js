"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "../../components/header.js";
import { createClient } from "../../lib/supabase-client.js";
import { formatSubmissionDate } from "../../lib/format-date.js";
import { useLanguage } from "../../contexts/language-context.js";

const STATUS_LABELS = {
  pending: { en: "Pending", km: "កំពុងរង់ចាំការពិនិត្យ" },
  published: { en: "Published", km: "ត្រូវបានចែករំលែក" },
  returned: { en: "Returned", km: "ត្រូវតម្រូវឱ្យកែសម្រួលវិញ" }
};

// Filter bar options. "all" shows everything; the other three match the
// status values stored on each entry. Khmer labels reuse the wording already
// defined in STATUS_LABELS so the two stay consistent.
const FILTER_OPTIONS = [
  { id: "all", en: "All", km: "ទាំងអស់" },
  { id: "published", ...STATUS_LABELS.published },
  { id: "pending", ...STATUS_LABELS.pending },
  { id: "returned", ...STATUS_LABELS.returned }
];

const styles = {
  wrap: { maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" },
  kicker: { fontFamily: "'Courier New', monospace", color: "#1E40AF", fontSize: 14, fontWeight: 600, letterSpacing: 1 },
  title: { fontSize: 30, fontWeight: 700, margin: "16px 0 12px", lineHeight: 1.2, color: "#1E3A8A" },
  titleRow: { display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 },
  addButton: { display: "inline-block", padding: "10px 18px", backgroundColor: "#1E40AF", color: "#FFFFFF", textDecoration: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" },
  card: { marginTop: 24, padding: 32, backgroundColor: "#FFFFFF", border: "1px solid #93C5FD", borderRadius: 10, textAlign: "center" },
  count: { fontFamily: "'Courier New', monospace", fontSize: 14, color: "#3B82F6", fontWeight: 600, marginTop: 32, marginBottom: 20 },
  filterBar: { display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  filterButton: { padding: "8px 16px", backgroundColor: "#FFFFFF", color: "#1E40AF", border: "1px solid #93C5FD", borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: "pointer", lineHeight: 1.5 },
  filterButtonActive: { padding: "8px 16px", backgroundColor: "#1E40AF", color: "#FFFFFF", border: "1px solid #1E40AF", borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: "pointer", lineHeight: 1.5 },
  filterEmptyText: { fontSize: 15, color: "#64748B", fontStyle: "italic", textAlign: "center", padding: "32px 0" },
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
  deleteButton: { padding: "8px 16px", backgroundColor: "#FEF2F2", color: "#DC2626", borderRadius: 6, fontSize: 14, fontWeight: 600, border: "1px solid #FECACA", cursor: "pointer" },
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
  // Delete confirmation modal
  modalBackdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    maxWidth: 400,
    width: "90%",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    border: "1px solid #93C5FD",
  },
  modalTitle: { fontSize: 20, fontWeight: 600, color: "#1E3A8A", margin: "0 0 16px" },
  modalText: { fontSize: 16, color: "#64748B", lineHeight: 1.6, margin: "0 0 24px" },
  modalErrorText: { fontSize: 14, color: "#DC2626", fontWeight: 500, margin: "0 0 16px" },
  modalButtons: { display: "flex", gap: 12, justifyContent: "flex-end" },
  modalCancelButton: {
    padding: "10px 20px",
    backgroundColor: "#F8FAFC",
    border: "1px solid #CBD5E1",
    color: "#475569",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    flex: 1,
  },
  modalDeleteButton: {
    padding: "10px 20px",
    backgroundColor: "#DC2626",
    border: "none",
    color: "#FFFFFF",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    flex: 1,
  },
};

function MyEntriesContent() {
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  // Delete state
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  // Active entry-status filter ("all" | "published" | "pending" | "returned").
  const [statusFilter, setStatusFilter] = useState("all");

  const { language } = useLanguage();
  // `language` is read reactively from the language context via useLanguage().
  // Re-reading it on every render means the filter buttons (and every other
  // language-dependent label below) re-render the instant the toggle changes
  // the language, so button text can never go stale. It is normalized to a
  // known value so an unexpected context value cannot leave blank labels.
  const activeLanguage = language === "km" ? "km" : "en";

  const getText = (entry, field) => {
    if (!entry) return "";
    return entry[`${field}_${activeLanguage}`] || entry[`${field}_en`] || "";
  };

  // Entries shown after the status filter bar is applied. "all" keeps every
  // entry; the other filters match the entry’s status (defaulting to pending).
  const filteredEntries =
    statusFilter === "all"
      ? entries
      : entries.filter((entry) => (entry.status || "pending") === statusFilter);

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
    return label[activeLanguage] || label.en;
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

  // Open the confirmation modal for a specific entry.
  const handleDeleteClick = (entryId) => {
    setPendingDeleteId(entryId);
    setDeleteError(null);
  };

  // Extract the storage file path from a Supabase public URL so we can
  // remove the photo alongside the entry. Legacy local filenames are ignored.
  const getStoragePathFromUrl = (url) => {
    if (!url || typeof url !== "string") return null;
    const marker = "/photos/";
    const index = url.indexOf(marker);
    if (index === -1) return null;
    return url.substring(index + marker.length);
  };

  // Perform the delete after the reviewer confirms.
  const handleDeleteConfirm = async () => {
    const entryId = pendingDeleteId;
    if (!entryId) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      const supabase = createClient();
      const target = entries.find((e) => e.id === entryId);

      // Delete the entry row (RLS ensures only the owner can delete it).
      const { error: deleteRowError } = await supabase
        .from("entries")
        .delete()
        .eq("id", entryId);
      if (deleteRowError) throw deleteRowError;

      // Best-effort: remove the entry's photo from storage. A failure here
      // must not block the delete, since the row is already gone.
      const storagePath = getStoragePathFromUrl(target?.photo_urls?.[0]);
      if (storagePath) {
        try {
          const { error: storageError } = await supabase.storage
            .from("photos")
            .remove([storagePath]);
          if (storageError) {
            console.warn("Failed to delete photo from storage:", storageError);
          }
        } catch (storageErr) {
          console.warn("Error deleting photo from storage:", storageErr);
        }
      }

      // Refresh the list by removing the deleted entry from local state.
      setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
      setPendingDeleteId(null);
    } catch (err) {
      console.error("Error deleting entry:", err);
      setDeleteError("Failed to delete entry. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  // Close the confirmation modal.
  const handleDeleteCancel = () => {
    setPendingDeleteId(null);
    setDeleteError(null);
  };

  if (authLoading) {
    return (
      <>
        <Header />
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
        <Header />
        <main style={styles.wrap}>
          <p style={styles.kicker}>MY ENTRIES</p>
          <h1 style={styles.title}>{activeLanguage === "en" ? "My Entries" : "ការដាក់ស្នើរបស់ខ្ញុំ"}</h1>
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
      <Header />
      <main style={styles.wrap}>
        <p style={styles.kicker}>MY ENTRIES</p>
        <div style={styles.titleRow}>
          <h1 style={styles.title}>{activeLanguage === "en" ? "My Entries" : "ការដាក់ស្នើរបស់ខ្ញុំ"}</h1>
          <Link href={`/contribute?lang=${activeLanguage}`} style={styles.addButton}>
            {activeLanguage === "en" ? "Add New Entry" : "បន្ថែមធាតុថ្មី"}
          </Link>
        </div>

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
            <div style={styles.filterBar}>
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setStatusFilter(option.id)}
                  style={statusFilter === option.id ? styles.filterButtonActive : styles.filterButton}
                >
                  {option[activeLanguage] || option.en}
                </button>
              ))}
            </div>
            <div style={styles.entriesList}>
              {filteredEntries.length === 0 ? (
                <p style={styles.filterEmptyText}>No entries match this filter.</p>
              ) : (
                filteredEntries.map((entry) => (
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
                      <span style={styles.metaItem}>Submitted: {formatSubmissionDate(entry.created_at)}</span>
                    </div>
                    {entry.review_note && entry.review_note.trim() && (
                      <div style={styles.reviewNoteBox}>
                        <div style={styles.reviewNoteLabel}>Reviewer Note</div>
                        <div style={styles.reviewNoteText}>{entry.review_note}</div>
                      </div>
                    )}
                    <div style={styles.entryActions}>
                      <Link href={`/entry/${entry.id}?lang=${activeLanguage}`} style={styles.viewButton}>
                        View Entry
                      </Link>
                      <Link href={`/entry/${entry.id}/edit?lang=${activeLanguage}`} style={styles.editButton}>
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(entry.id)}
                        style={styles.deleteButton}
                        disabled={deleting}
                      >
                        Delete
                      </button>
                    </div>
                </div>
                )))}
            </div>
          </>
        )}
        
        <footer style={styles.footer}>
          Built in ICT 340 — Vibe Coding, Archived Kites new thing.
        </footer>

        {/* Delete confirmation modal */}
        {pendingDeleteId && (
          <div
            style={styles.modalBackdrop}
            onClick={(e) => {
              // Close modal when clicking on the backdrop (outside content)
              if (e.target === e.currentTarget && !deleting) {
                handleDeleteCancel();
              }
            }}
          >
            <div style={styles.modalContent}>
              <h3 style={styles.modalTitle}>Delete Entry</h3>
              <p style={styles.modalText}>
                Are you sure you want to delete this entry? This cannot be undone.
              </p>
              {deleteError && (
                <p style={styles.modalErrorText}>{deleteError}</p>
              )}
              <div style={styles.modalButtons}>
                <button
                  type="button"
                  onClick={handleDeleteCancel}
                  style={styles.modalCancelButton}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  style={styles.modalDeleteButton}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
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