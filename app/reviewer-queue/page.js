"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "../../components/header.js";
import { createClient } from "../../lib/supabase-client.js";

function ReviewerQueuePageContent() {
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [processing, setProcessing] = useState({});

  const locale = searchParams.get("lang") || "en";

  const getText = (entry, field) => {
    if (!entry) return "";
    return entry[`${field}_${locale}`] || entry[`${field}_en`] || "";
  };

  const isAuthorizedReviewer = () => {
    return user && user.id === "7ef3e962-5de4-406d-a630-2ada73486f62";
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
    
    async function fetchPendingEntries() {
      try {
        setLoading(true);
        const supabase = createClient();
        
        const { data: entriesData, error: entriesError } = await supabase
          .from('entries')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        
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

  const handleReview = async (entryId, action) => {
    if (!isAuthorizedReviewer()) {
      setError("You do not have reviewer permissions.");
      return;
    }

    setProcessing(prev => ({ ...prev, [entryId]: true }));
    
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase.rpc('review_entry', {
        entry_id: entryId,
        decision: action === 'approve' ? 'published' : 'returned'
      });
      
      if (error) {
        throw new Error(error.message || `Failed to ${action} entry`);
      }
      
      setEntries(prev => prev.filter(entry => entry.id !== entryId));
      
    } catch (err) {
      setError(`Failed to ${action} entry: ${err.message}`);
    } finally {
      setProcessing(prev => ({ ...prev, [entryId]: false }));
    }
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
          <p style={styles.kicker}>REVIEWER QUEUE</p>
          <h1 style={styles.title}>Reviewer Queue / ជួររង់ចាំការពិនិត្យ</h1>
          <div style={styles.card}>
            <p style={styles.loginMessage}>Please log in to access the reviewer queue</p>
            <Link href={`/login?lang=${locale}`} style={styles.buttonLink}>
              Log In
            </Link>
          </div>
        </main>
      </>
    );
  }

  if (!isAuthorizedReviewer()) {
    return (
      <>
        <Header locale={locale} />
        <main style={styles.wrap}>
          <p style={styles.kicker}>REVIEWER QUEUE</p>
          <h1 style={styles.title}>Reviewer Queue / ជួររង់ចាំការពិនិត្យ</h1>
          <div style={styles.card}>
            <p style={styles.errorText}>You do not have reviewer permissions.</p>
            <Link href={`/?lang=${locale}`} style={styles.buttonLink}>
              Return Home
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header locale={locale} />
      <main style={styles.wrap}>
        <p style={styles.kicker}>REVIEWER QUEUE</p>
        <h1 style={styles.title}>Reviewer Queue / ជួររង់ចាំការពិនិត្យ</h1>
        
        <div style={styles.infoBox}>
          <p style={styles.infoText}>
            Review pending entries. Approve to publish or return for edits.
          </p>
          <p style={styles.count}>
            {loading ? "Loading..." : `${entries.length} pending ${entries.length === 1 ? 'entry' : 'entries'}`}
          </p>
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
            {entries.map((entry) => (
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
                  <Link href={`/entry/${entry.id}?lang=${locale}`} style={styles.viewButton}>
                    View Entry
                  </Link>
                  
                  <button 
                    style={styles.approveButton}
                    onClick={() => handleReview(entry.id, 'approve')}
                    disabled={processing[entry.id]}
                  >
                    {processing[entry.id] ? "Processing..." : "Approve"}
                  </button>
                  
                  <button 
                    style={styles.returnButton}
                    onClick={() => handleReview(entry.id, 'return')}
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
};

function ReviewerQueuePage() {
  return (
    <Suspense fallback={
      <>
        <Header locale="en" />
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