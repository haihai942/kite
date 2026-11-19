"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "../../components/header.js";
import { createClient } from "../../lib/supabase-client.js";
import { isUserReviewer } from "../../lib/reviewer-auth.js";
import { formatSubmissionDate } from "../../lib/format-date.js";
import { useLanguage } from "../../contexts/language-context.js";

// Default note saved to the entry when a reviewer approves it. Bilingual so the
// note is written in the active language at the moment the reviewer approves.
const APPROVAL_NOTE = {
  en: "Thank you for sharing your story with us!",
  km: "សូមអរគុណសម្រាប់ការចែករំលែករឿងរ៉ាវរបស់អ្នកជាមួយយើង!",
};

// UI chrome for the reviewer queue in both languages. Kept as a function so the
// strings always reflect the language active at render time. User-entered entry
// content is never translated here — only labels, buttons and messages.
function reviewerQueueText(language) {
  const en = language === "en";
  return {
    kicker: en ? "REVIEWER QUEUE" : "ជួររង់ចាំការពិនិត្យ",
    title: en ? "Reviewer Queue" : "ជួររង់ចាំការពិនិត្យ",
    loading: en ? "Loading..." : "កំពុងផ្ទុក...",
    loginRequired: en
      ? "Please log in to access the reviewer queue"
      : "សូមចូលដើម្បីចូលប្រើជួររង់ចាំការពិនិត្យ",
    logIn: en ? "Log In" : "ចូល",
    noPermission: en
      ? "You do not have reviewer permissions."
      : "អ្នកមិនមានសិទ្ធិពិនិត្យទេ។",
    returnHome: en ? "Return Home" : "ត្រឡប់ទៅទំព័រដើម",
    info: en
      ? "Review pending entries. Approve to publish or return for edits."
      : "ពិនិត្យធាតុកំពុងរង់ចាំ។ អនុម័តដើម្បីផ្សព្វផ្សាយ ឬត្រឡប់វិញសម្រាប់ការកែសម្រួល។",
    countLoading: en ? "Loading..." : "កំពុងផ្ទុក...",
    pendingCount: (n) =>
      en ? `${n} pending ${n === 1 ? "entry" : "entries"}` : `ធាតុកំពុងរង់ចាំ ${n}`,
    sortBy: en ? "Sort by date:" : "តម្រៀបតាមកាលបរិច្ឆេទ៖",
    newestFirst: en ? "Newest First" : "ថ្មីបំផុតមុន",
    oldestFirst: en ? "Oldest First" : "ចាស់បំផុតមុន",
    loadingEntries: en ? "Loading pending entries..." : "កំពុងផ្ទុកធាតុកំពុងរង់ចាំ...",
    noEntries: en ? "No pending entries to review" : "គ្មានធាតុកំពុងរង់ចាំសម្រាប់ពិនិត្យទេ",
    // Fallback labels for missing entry content (these are UI, not user data).
    untitled: en ? "Untitled" : "គ្មានចំណងជើង",
    pendingBadge: en ? "Pending Review" : "កំពុងរង់ចាំការពិនិត្យ",
    noDescription: en ? "No description" : "គ្មានការពិពណ៌នា",
    contributorLabel: en ? "Contributor:" : "អ្នកចែករំលែក៖",
    unknown: en ? "Unknown" : "មិនស្គាល់",
    submittedLabel: en ? "Submitted:" : "បានដាក់ស្នើ៖",
    idLabel: en ? "ID:" : "លេខសម្គាល់៖",
    viewEntry: en ? "View Entry" : "មើលធាតុ",
    processing: en ? "Processing..." : "កំពុងដំណើរការ...",
    approve: en ? "Approve" : "អនុម័ត",
    return: en ? "Return" : "ត្រឡប់វិញ",
    returnModalTitle: en ? "Return for Edits" : "ត្រឡប់វិញដើម្បីកែសម្រួល",
    returnModalText: en
      ? "Tell the contributor what needs to change. This note is saved with the entry."
      : "ប្រាប់អ្នកចូលរួមថាតើត្រូវកែអ្វីខ្លះ។ កំណត់សម្គាល់នេះត្រូវបានរក្សាទុកជាមួយធាតុ។",
    returnPlaceholder: en
      ? "e.g. Please add the Khmer title and a clearer photo."
      : "ឧ. សូមបន្ថែមចំណងជើងជាភាសាខ្មែរ និងរូបថតច្បាស់ជាងនេះ។",
    cancel: en ? "Cancel" : "បោះបង់",
    returning: en ? "Returning..." : "កំពុងត្រឡប់វិញ...",
    returnEntry: en ? "Return Entry" : "ត្រឡប់ធាតុវិញ",
    reasonRequired: en
      ? "Please enter a reason so the contributor knows what to fix."
      : "សូមបញ្ចូលហេតុផល ដើម្បីឱ្យអ្នកចូលរួមដឹងថាត្រូវកែអ្វី។",
    loadFailed: en
      ? "Failed to load pending entries."
      : "មិនអាចផ្ទុកធាតុកំពុងរង់ចាំបានទេ។",
    loadError: en
      ? "An error occurred while loading entries."
      : "មានបញ្ហាកើតឡើងពេលផ្ទុកធាតុ។",
    reviewFailed: (action) =>
      en
        ? `Failed to ${action} entry. Please try again.`
        : `មិនអាច${action === "approve" ? "អនុម័ត" : "ត្រឡប់"}ធាតុបានទេ។ សូមព្យាយាមម្តងទៀត។`,
    footer: en
      ? "Archived Kites — Preserving stories and memories, one kite at a time."
      : "បណ្ណសារខ្លែង — រក្សាទុករឿងរ៉ាវ និងការចងចាំរបស់យើង។",
  };
}

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

  // UI chrome for the active language, read on every render so the page
  // re-translates the instant the header toggle flips.
  const t = reviewerQueueText(language);

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
          setError("loadFailed");
          return;
        }
        
        setEntries(entriesData || []);
      } catch (err) {
        setError("loadError");
      } finally {
        setLoading(false);
      }
    }
    
    fetchPendingEntries();
  }, [user]);

  const handleReview = async (entryId, action, noteText = null) => {
    if (!(await isAuthorizedReviewer())) {
      setError("noPermission");
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
      console.error("Error reviewing entry:", err);
      // Store a language-neutral flag; the message is translated at render.
      setError(`reviewFailed:${action}`);
    } finally {
      setProcessing(prev => ({ ...prev, [entryId]: false }));
    }
  };

  // Approve: publish the entry and attach a default thank-you note, written in
  // the active language at the moment of approval.
  const handleApprove = (entryId) =>
    handleReview(entryId, 'approve', APPROVAL_NOTE[language] || APPROVAL_NOTE.en);

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
      setReturnError(t.reasonRequired);
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
            <p style={styles.loadingText}>{t.loading}</p>
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
          <p style={styles.kicker}>
            {t.kicker}
          </p>
          <h1 style={styles.title}>{t.title}</h1>
          <div style={styles.card}>
            <p style={styles.loginMessage}>{t.loginRequired}</p>
            <Link href={`/login?lang=${language}`} style={styles.buttonLink}>
              {t.logIn}
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
          <p style={styles.kicker}>
            {t.kicker}
          </p>
          <h1 style={styles.title}>{t.title}</h1>
          <div style={styles.card}>
            <p style={styles.errorText}>{t.noPermission}</p>
            <Link href={`/?lang=${language}`} style={styles.buttonLink}>
              {t.returnHome}
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
        <p style={styles.kicker}>{t.kicker}</p>
        <h1 style={styles.title}>{t.title}</h1>
        
        <div style={styles.infoBox}>
          <p style={styles.infoText}>{t.info}</p>
          <p style={styles.count}>
            {loading ? t.countLoading : t.pendingCount(entries.length)}
          </p>
          {!loading && entries.length > 1 && (
            <div style={styles.sortRow}>
              <span style={styles.sortLabel}>{t.sortBy}</span>
              <button
                type="button"
                onClick={() => setSortOrder("newest")}
                style={sortOrder === "newest" ? styles.sortButtonActive : styles.sortButton}
              >
                {t.newestFirst}
              </button>
              <button
                type="button"
                onClick={() => setSortOrder("oldest")}
                style={sortOrder === "oldest" ? styles.sortButtonActive : styles.sortButton}
              >
                {t.oldestFirst}
              </button>
            </div>
          )}
        </div>
        
        {error && (
          <div style={styles.errorContainer}>
            <p style={styles.errorText}>
              {error === "loadFailed"
                ? t.loadFailed
                : error === "loadError"
                  ? t.loadError
                  : error === "noPermission"
                    ? t.noPermission
                    : error.startsWith("reviewFailed:")
                      ? t.reviewFailed(error.split(":")[1])
                      : error}
            </p>
          </div>
        )}
        
        {loading && (
          <div style={styles.loadingContainer}>
            <p style={styles.loadingText}>{t.loadingEntries}</p>
          </div>
        )}
        
        {!loading && entries.length === 0 && (
          <div style={styles.emptyContainer}>
            <p style={styles.emptyText}>{t.noEntries}</p>
          </div>
        )}
        
        {!loading && entries.length > 0 && (
          <div style={styles.entriesList}>
            {sortedEntries.map((entry) => (
              <div key={entry.id} style={styles.entryCard}>
                <div style={styles.entryHeader}>
                  <h3 style={styles.entryTitle}>{getText(entry, 'title') || t.untitled}</h3>
                  <span style={styles.pendingBadge}>{t.pendingBadge}</span>
                </div>
                
                <p style={styles.entryDescription}>
                  {getText(entry, 'description') || t.noDescription}
                </p>
                
                <div style={styles.entryMeta}>
                  <span style={styles.metaItem}>
                    {t.contributorLabel} {getText(entry, 'contributor') || t.unknown}
                  </span>
                  <span style={styles.metaItem}>
                    {t.submittedLabel} {formatSubmissionDate(entry.created_at, language)}
                  </span>
                  <span style={styles.metaItem}>
                    {t.idLabel} {entry.id.slice(0, 8)}...
                  </span>
                </div>
                
                <div style={styles.entryActions}>
                  <Link href={`/entry/${entry.id}?lang=${language}`} style={styles.viewButton}>
                    {t.viewEntry}
                  </Link>
                  
                  <button 
                    style={styles.approveButton}
                    onClick={() => handleApprove(entry.id)}
                    disabled={processing[entry.id]}
                  >
                    {processing[entry.id] ? t.processing : t.approve}
                  </button>
                  
                  <button 
                    style={styles.returnButton}
                    onClick={() => handleReturnClick(entry.id)}
                    disabled={processing[entry.id]}
                  >
                    {processing[entry.id] ? t.processing : t.return}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <footer style={styles.footer}>
          {t.footer}
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
              <h3 style={styles.modalTitle}>{t.returnModalTitle}</h3>
              <p style={styles.modalText}>
                {t.returnModalText}
              </p>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder={t.returnPlaceholder}
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
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleReturnConfirm}
                  style={styles.modalReturnButton}
                  disabled={processing[returnEntryId]}
                >
                  {processing[returnEntryId] ? t.returning : t.returnEntry}
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
  wrap: {
    width: "100%",
    margin: 0,
    padding: "40px 32px 80px",
    boxSizing: "border-box",
  },
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
      // Fallback renders before the language context is available, so it shows
      // no text rather than an English-only string.
      <Header />
    }>
      <ReviewerQueuePageContent />
    </Suspense>
  );
}

export default ReviewerQueuePage;