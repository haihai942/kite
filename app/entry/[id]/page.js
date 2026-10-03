"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "../../../components/header.js";
import { createClient } from "../../../lib/supabase-client.js";

function EntryContent() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") || "en";
  const router = useRouter();

  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Read text for the active locale, falling back to English.
  const getText = (fieldPrefix) => {
    if (!entry) return "";
    return entry[`${fieldPrefix}_${locale}`] || entry[`${fieldPrefix}_en`] || "";
  };

  // Build an image src: submitted entries store a public storage URL,
  // legacy entries store a local filename served by /api/images/.
  const firstPhoto = entry?.photo_urls?.[0] || "";
  const photoSrc = firstPhoto
    ? firstPhoto.startsWith("http://") || firstPhoto.startsWith("https://")
      ? firstPhoto
      : `/api/images/${firstPhoto}`
    : null;

  // Check if current user is the owner of this entry
  const isOwner = currentUser?.id && entry?.owner && currentUser.id === entry.owner;

  // Fetch current user
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (active) setCurrentUser(data.user);
      } catch (err) {
        console.error("Error fetching user:", err);
      } finally {
        if (active) setUserLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Fetch this entry from Supabase.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("entries")
          .select("*")
          .eq("id", id)
          .single();
        if (error) throw error;
        if (active) setEntry(data);
      } catch (err) {
        console.error("Error fetching entry:", err);
        if (active) setError("We couldn't load this entry. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const title = getText("title") || "Untitled Entry";
  const contributor = getText("contributor") || "Unknown contributor";
  const place = getText("places");

  // Handle delete entry
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this entry? This action cannot be undone.")) {
      return;
    }

    setDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("entries")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      router.push("/browse");
    } catch (err) {
      console.error("Error deleting entry:", err);
      alert("Failed to delete entry. Please try again.");
      setDeleting(false);
    }
  };

  // Handle edit navigation
  const handleEdit = () => {
    router.push(`/entry/${id}/edit${locale && locale !== "en" ? `?lang=${locale}` : ""}`);
  };

  return (
    <>
      <Header locale={locale} />
      <main style={styles.wrap}>
        <div style={styles.header}>
          <p style={styles.kicker}>KHMER LIVING ARCHIVE</p>
          <h1 style={styles.title}>{loading ? "Entry" : title}</h1>
          {!loading && !error && entry && (
            <p style={styles.meta}>
              {contributor}
              {place ? ` • ${place}` : ""}
            </p>
          )}
        </div>

        {loading ? (
          <div style={styles.card}>
            <p style={styles.loadingText}>Loading entry...</p>
          </div>
        ) : error ? (
          <div style={styles.card}>
            <p style={styles.errorText}>{error}</p>
            <Link href="/browse" style={styles.buttonLink}>
              Back to the archive
            </Link>
          </div>
        ) : !entry ? (
          <div style={styles.card}>
            <p style={styles.errorText}>This entry could not be found.</p>
            <Link href="/browse" style={styles.buttonLink}>
              Back to the archive
            </Link>
          </div>
        ) : (
          <>
            {/* Owner actions */}
            {!userLoading && isOwner && (
              <div style={styles.actionsCard}>
                <div style={styles.actionsHeader}>
                  <p style={styles.actionsTitle}>Entry Management</p>
                  <p style={styles.actionsSubtitle}>You are the owner of this entry</p>
                </div>
                <div style={styles.actionsButtons}>
                  <button 
                    onClick={handleEdit} 
                    style={styles.editButton}
                    disabled={deleting}
                  >
                    Edit Entry
                  </button>
                  <button 
                    onClick={handleDelete} 
                    style={styles.deleteButton}
                    disabled={deleting}
                  >
                    {deleting ? "Deleting..." : "Delete Entry"}
                  </button>
                </div>
              </div>
            )}

            {photoSrc && (
              <div style={styles.imageWrapper}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoSrc} alt={title} style={styles.image} />
              </div>
            )}

            <div style={styles.card}>
              <p style={styles.label}>DESCRIPTION</p>
              <p style={styles.text}>
                {getText("description") || "No description available."}
              </p>
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

export default function EntryPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 40, textAlign: "center" }}>
          Loading...
        </div>
      }
    >
      <EntryContent />
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
  meta: {
    fontSize: 16,
    color: "#3B82F6",
    lineHeight: 1.5,
    margin: 0,
  },
  // Owner actions styles
  actionsCard: {
    marginBottom: 24,
    padding: 24,
    backgroundColor: "#F0F9FF",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#93C5FD",
    borderRadius: 10,
    boxSizing: "border-box",
  },
  actionsHeader: {
    marginBottom: 16,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "#1E40AF",
    margin: "0 0 4px",
  },
  actionsSubtitle: {
    fontSize: 14,
    color: "#64748B",
    margin: 0,
  },
  actionsButtons: {
    display: "flex",
    gap: 12,
  },
  editButton: {
    padding: "10px 20px",
    backgroundColor: "#1E40AF",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    flex: 1,
  },
  deleteButton: {
    padding: "10px 20px",
    backgroundColor: "#FEF2F2",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#FECACA",
    color: "#DC2626",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    flex: 1,
  },
  imageWrapper: {
    width: "100%",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#93C5FD",
    marginBottom: 24,
    boxSizing: "border-box",
  },
  image: {
    display: "block",
    width: "100%",
    height: "auto",
    maxHeight: 480,
    objectFit: "cover",
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
  label: {
    fontFamily: "'Courier New', monospace",
    fontSize: 12,
    color: "#1E40AF",
    fontWeight: 600,
    margin: 0,
  },
  text: {
    fontSize: 16,
    lineHeight: 1.7,
    color: "#1E3A8A",
    margin: "8px 0 0",
  },
  loadingText: {
    fontSize: 16,
    color: "#64748B",
    fontStyle: "italic",
    margin: 0,
  },
  errorText: {
    fontSize: 16,
    color: "#DC2626",
    fontWeight: 500,
    lineHeight: 1.5,
    margin: "0 0 16px",
  },
  buttonLink: {
    display: "inline-block",
    padding: "12px 20px",
    backgroundColor: "#1E40AF",
    color: "#FFFFFF",
    textDecoration: "none",
    borderRadius: 6,
    fontSize: 15,
    fontWeight: 600,
    marginTop: 8,
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

