"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "../../components/header.js";
import { createClient } from "../../lib/supabase-client.js";
import { isUserReviewer } from "../../lib/reviewer-auth.js";
import { useLanguage } from "../../contexts/language-context.js";

// Default note saved to the entry when a reviewer approves it.
const APPROVAL_NOTE = "Thank you for sharing your story with us!";

function ReviewerQueuePageContent() {
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [isReviewer, setIsReviewer] = useState(false);
  // Return-reason modal state
  const [returnEntryId, setReturnEntryId] = useState(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnError, setReturnError] = useState(null);
  // Chronological sort for the review backlog ("newest" | "oldest").
  // Defaults to oldest first so the longest-waiting submissions get reviewed.
  const [sortOrder, setSortOrder] = useState("oldest");

  const { language } = useLanguage();

  const getText = (entry, field) => {
    if (!entry) return "";
    return entry[`${field}_${language}`] || entry[`${field}_en`] || "";
  };

  // Entries reordered by submission date. The array is copied before sorting so
  // the fetched `entries` order is never mutated in place. Entries missing a
  // created_at fall back to 0 so they sort to the end for "newest".
  const sortedEntries = useMemo(() => {
    const toTime = (entry) => new Date(entry.created_at).getTime() || 0;
    return [...entries].sort((a, b) =>
      sortOrder === "oldest" ? toTime(a) - toTime(b) : toTime(b) - toTime(a)
    );
  }, [entries, sortOrder]);

  const isAuthorizedReviewer = async () => {
    if (!user) return false;
    const supabase = createClient();
    return await isUserReviewer(supabase, user);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (active) {
          setUser(data.user);
          // Check if user is a reviewer
          if (data.user) {
            const reviewerStatus = await isUserReviewer(supabase, data.user);
            setIsReviewer(reviewerStatus);
          }
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
    
    async function fetchPendingEntries() {
      try {
        setLoading(true);
        const supabase = createClient();
        
        const { data: entriesData, error: entriesError } = await supabase
          .from('entries')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: true });
        
        if (entriesError) {
          setError("Failed to load pending entries.");
          return;
        }
        
        setEntries(entriesData || []);
      } catch (err) {
        setError("An error occurred while loading entries.");
      } finally {
        setLoading(false);
      }
    }
    
    fetchPendingEntries();
  }, [user]);

  const handleReview = async (entryId, action, noteText = null) => {
    if (!(await isAuthorizedReviewer())) {
      setError("You do not have reviewer permissions.");
      return;
    }

    setProcessing(prev => ({ ...prev, [entryId]: true }));
    
    try {
      const supabase = createClient();
      
      // review_entry(entry_id, decision, note_text) — note_text is stored
      // on the entry as review_note so the contributor can read it.
      const { data, error } = await supabase.rpc('review_entry', {
        entry_id: entryId,
        decision: action === 'approve' ? 'published' : 'returned',
        note_text: noteText || null
      });
      
      if (error) {
        throw new Error(error.message || `Failed to ${action} entry`);
      }

      // Strict success check: the RPC returns boolean true only when the
      // review was actually saved. If it is not exactly true, treat it as a
      // failure and leave the entry in the queue.
      if (data !== true) {
        throw new Error(`Failed to ${action} entry`);
      }

      setEntries(prev => prev.filter(entry => entry.id !== entryId));
      
    } catch (err) {
      setError(`Failed to ${action} entry: ${err.message}`);
    } finally {
      setProcessing(prev => ({ ...prev, [entryId]: false }));
    }
  };

  // Approve: publish the entry and attach a default thank-you note.
  const handleApprove = (entryId) => handleReview(entryId, 'approve', APPROVAL_NOTE);

  // Open the return-reason modal for a specific entry.
  const handleReturnClick = (entryId) => {
    setReturnEntryId(entryId);
    setReturnReason("");
    setReturnError(null);
  };

  // Confirm the return with the reviewer's feedback note.
  const handleReturnConfirm = async () => {
    const trimmedReason = returnReason.trim();
    if (!trimmedReason) {
      setReturnError("Please enter a reason so the contributor knows what to fix.");
      return;
    }
    const entryId = returnEntryId;
    setReturnEntryId(null);
    await handleReview(entryId, 'return', trimmedReason);
    setReturnReason("");
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
          <p style={styles.kicker}>REVIEWER QUEUE</p>
          <h1 style={styles.title}>{language === "en" ? "Reviewer Queue" : "ជួររង់ចាំការពិនិត្យ"}</h1>
          <div style={styles.card}>
            <p style={styles.loginMessage}>Please log in to access the reviewer queue</p>
            <Link href={`/login?lang=${language}`} style={styles.buttonLink}>
              Log In
            </Link>
          </div>
        </main>
      </>
    );
  }

  if (!isReviewer) {
    return (
      <>
        <Header />
        <main style={styles.wrap}>
          <p style={styles.kicker}>REVIEWER QUEUE</p>
          <h1 style={styles.title}>{language === "en" ? "Reviewer Queue" : "ជួររង់ចាំការពិនិត្យ"}</h1>
          <div style={styles.card}>
            <p style={styles.errorText}>You do not have reviewer permissions.</p>
            <Link href={`/?lang=${language}`} style={styles.buttonLink}>
              Return Home
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main style={styles.wrap}>
        <p style={styles.kicker}>REVIEWER QUEUE</p>
        <h1 style={styles.title}>{language === "en" ? "Reviewer Queue" : "ជួររង់ចាំការពិនិត្យ"}</h1>
        
        <div style={styles.infoBox}>
          <p style={styles.infoText}>
            Review pending entries. Approve to publish or return for edits.
          </p>
          <p style={styles.count}>
            {loading ? "Loading..." : `${entries.length} pending ${entries.length === 1 ? 'entry' : 'entries'}`}
          </p>
          {!loading && entries.length > 1 && (
            <div style={styles.sortRow}>
              <span style={styles.sortLabel}>
                {language === "en" ? "Sort by date:" : "តម្រៀបតាមកាលបរិច្ឆេទ៖"}
              </span>
              <button
                type="button"
                onClick={() => setSortOrder("newest")}
                style={sortOrder === "newest" ? styles.sortButtonActive : styles.sortButton}
              >
                {language === "en" ? "Newest First" : "ថ្មីបំផុតមុន"}
              </button>
              <button
                type="button"
                onClick={() => setSortOrder("oldest")}
                style={sortOrder === "oldest" ? styles.sortButtonActive : styles.sortButton}
              >
                {language === "en" ? "Oldest First" : "ចាស់បំផុតមុន"}
              </button>
            </div>
          )}
        </div>
        
        {error && (
          <div style={styles.errorContainer}>
            <p style={styles.errorText}>{error}</p>
          </div>
        )}
        
        {loading && (
          <div style={styles.loadingContainer}>
            <p style={styles.loadingText}>Loading pending entries...</p>
          </div>
        )}
        
        {!loading && entries.length === 0 && (
          <div style={styles.emptyContainer}>
            <p style={styles.emptyText}>No pending entries to review</p>
          </div>
        )}
        
        {!loading && entries.length > 0 && (
          <div style={styles.entriesList}>
            {sortedEntries.map((entry) => (
              <div key={entry.id} style={styles.entryCard}>
                <div style={styles.entryHeader}>
                  <h3 style={styles.entryTitle}>{getText(entry, 'title') || "Untitled"}</h3>
                  <span style={styles.pendingBadge}>Pending Review</span>
                </div>
                
                <p style={styles.entryDescription}>
                  {getText(entry, 'description') || "No description"}
                </p>
                
                <div style={styles.entryMeta}>
                  <span style={styles.metaItem}>
                    Contributor: {getText(entry, 'contributor') || "Unknown"}
                  </span>
                  <span style={styles.metaItem}>
                    Submitted: {new Date(entry.created_at).toLocaleDateString()}
                  </span>
                  <span style={styles.metaItem}>
                    ID: {entry.id.slice(0, 8)}...
                  </span>
                </div>
                
                <div style={styles.entryActions}>
                  <Link href={`/entry/${entry.id}?lang=${language}`} style={styles.viewButton}>
                    View Entry
                  </Link>
                  
                  <button 
                    style={styles.approveButton}
                    onClick={() => handleApprove(entry.id)}
                    disabled={processing[entry.id]}
                  >
                    {processing[entry.id] ? "Processing..." : "Approve"}
                  </button>
                  
                  <button 
                    style={styles.returnButton}
                    onClick={() => handleReturnClick(entry.id)}
                    disabled={processing[entry.id]}
                  >
                    {processing[entry.id] ? "Processing..." : "Return"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <footer style={styles.footer}>
          Built in ICT 340 — Vibe Coding, Archived Kites new thing.
        </footer>

        {/* Return Reason Modal */}
        {returnEntryId && (
          <div
            style={styles.modalBackdrop}
            onClick={(e) => {
              // Close modal when clicking on backdrop (outside modal content)
              if (e.target === e.currentTarget && !processing[returnEntryId]) {
                setReturnEntryId(null);
              }
            }}
          >
            <div style={styles.modalContent}>
              <h3 style={styles.modalTitle}>Return for Edits</h3>
              <p style={styles.modalText}>
                Tell the contributor what needs to change. This note is saved with the entry.
              </p>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="e.g. Please add the Khmer title and a clearer photo."
                style={styles.modalTextarea}
                rows={4}
                disabled={processing[returnEntryId]}
              />
              {returnError && (
                <p style={styles.modalErrorText}>{returnError}</p>
              )}
              <div style={styles.modalButtons}>
                <button
                  type="button"
                  onClick={() => setReturnEntryId(null)}
                  style={styles.modalCancelButton}
                  disabled={processing[returnEntryId]}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReturnConfirm}
                  style={styles.modalReturnButton}
                  disabled={processing[returnEntryId]}
                >
                  {processing[returnEntryId] ? "Returning..." : "Return Entry"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

const styles = {
  wrap: { maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" },
  kicker: { fontFamily: "'Courier New', monospace", color: "#1E40AF", fontSize: 14, fontWeight: 600, letterSpacing: 1 },
  title: { fontSize: 30, fontWeight: 700, margin: "16px 0 12px", lineHeight: 1.2, color: "#1E3A8A" },
  card: { marginTop: 24, padding: 32, backgroundColor: "#FFFFFF", border: "1px solid #93C5FD", borderRadius: 10, textAlign: "center" },
  infoBox: { marginTop: 24, padding: 20, backgroundColor: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 8 },
  infoText: { fontSize: 14, color: "#0369A1", lineHeight: 1.5, margin: "0 0 12px" },
  count: { fontFamily: "'Courier New', monospace", fontSize: 14, color: "#3B82F6", fontWeight: 600, marginTop: 8 },
  sortRow: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 12, paddingTop: 12, borderTop: "1px solid #BAE6FD" },
  sortLabel: { fontSize: 14, color: "#0369A1", fontWeight: 600 },
  sortButton: { padding: "8px 16px", backgroundColor: "#FFFFFF", color: "#1E40AF", border: "1px solid #93C5FD", borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: "pointer", lineHeight: 1.5 },
  sortButtonActive: { padding: "8px 16px", backgroundColor: "#1E40AF", color: "#FFFFFF", border: "1px solid #1E40AF", borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: "pointer", lineHeight: 1.5 },
  entriesList: { display: "flex", flexDirection: "column", gap: 20, marginTop: 24 },
  entryCard: { backgroundColor: "#FFFFFF", border: "1px solid #93C5FD", borderRadius: 12, padding: 20 },
  entryHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  entryTitle: { fontSize: 18, fontWeight: 700, color: "#1E3A8A", margin: 0, flex: 1 },
  pendingBadge: { padding: "6px 12px", backgroundColor: "#FEF3C7", color: "#D97706", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "1px solid #FBBF24" },
  entryDescription: { fontSize: 14, color: "#475569", lineHeight: 1.5, margin: "0 0 16px 0" },
  entryMeta: { display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12, color: "#64748B", marginBottom: 16 },
  metaItem: { backgroundColor: "#F8FAFC", padding: "4px 8px", borderRadius: 4, border: "1px solid #E2E8F0" },
  entryActions: { display: "flex", gap: 12 },
  viewButton: { padding: "8px 16px", backgroundColor: "#1E40AF", color: "#FFFFFF", textDecoration: "none", borderRadius: 6, fontSize: 14, fontWeight: 600 },
  approveButton: { 
    padding: "8px 16px", 
    backgroundColor: "#10B981", 
    color: "#FFFFFF", 
    border: "none", 
    borderRadius: 6, 
    fontSize: 14, 
    fontWeight: 600, 
    cursor: "pointer"
  },
  returnButton: { 
    padding: "8px 16px", 
    backgroundColor: "#F59E0B", 
    color: "#FFFFFF", 
    border: "none", 
    borderRadius: 6, 
    fontSize: 14, 
    fontWeight: 600, 
    cursor: "pointer"
  },
  loadingContainer: { textAlign: "center", padding: "40px 0", marginTop: 32 },
  loadingText: { fontSize: 16, color: "#64748B", fontStyle: "italic" },
  errorContainer: { textAlign: "center", padding: "40px 0", marginTop: 32, backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8 },
  errorText: { fontSize: 16, color: "#DC2626", fontWeight: 500 },
  emptyContainer: { textAlign: "center", padding: "40px 0", marginTop: 32, backgroundColor: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 8 },
  emptyText: { fontSize: 16, color: "#0369A1", fontStyle: "italic" },
  loginMessage: { fontSize: 16, color: "#1E3A8A", lineHeight: 1.6, margin: "0 0 16px" },
  buttonLink: { display: "inline-block", padding: "12px 20px", backgroundColor: "#1E40AF", color: "#FFFFFF", textDecoration: "none", borderRadius: 6, fontSize: 15, fontWeight: 600 },
  footer: { marginTop: 64, paddingTop: 24, borderTop: "1px solid #93C5FD", fontSize: 13, color: "#64748B" },
  // Return reason modal
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
  modalText: { fontSize: 16, color: "#64748B", lineHeight: 1.6, margin: "0 0 16px" },
  modalTextarea: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #93C5FD",
    borderRadius: 6,
    fontSize: 14,
    color: "#1E3A8A",
    fontFamily: "inherit",
    lineHeight: 1.5,
    resize: "vertical",
    boxSizing: "border-box",
    marginBottom: 16,
  },
  modalErrorText: { fontSize: 14, color: "#DC2626", fontWeight: 500, margin: "0 0 12px" },
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
  modalReturnButton: {
    padding: "10px 20px",
    backgroundColor: "#F59E0B",
    border: "none",
    color: "#FFFFFF",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    flex: 1,
  },
};

function ReviewerQueuePage() {
  return (
    <Suspense fallback={
      <>
        <Header />
        <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" }}>
          <div style={{ textAlign: "center", padding: "40px 0", marginTop: 32 }}>
            <p style={{ fontSize: 16, color: "#64748B", fontStyle: "italic" }}>Loading reviewer queue...</p>
          </div>
        </main>
      </>
    }>
      <ReviewerQueuePageContent />
    </Suspense>
  );
}

export default ReviewerQueuePage;