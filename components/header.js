"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { createClient } from "../lib/supabase-client.js";
import { isUserReviewer } from "../lib/reviewer-auth.js";
import { useLanguage } from "../contexts/language-context.js";

function HeaderContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { language, toggleLanguage } = useLanguage();

  // Inline EN/KM dictionary for the header chrome. Reading `language` on every
  // render keeps these labels in sync the moment the toggle flips.
  const t = {
    brand: language === "en" ? "KHMER ARCHIVE" : "ប័ណ្ណសារខ្មែរ",
    home: language === "en" ? "Home" : "ទំព័រដើម",
    browse: language === "en" ? "Browse" : "មើលស្នាដៃ",
    contribute: language === "en" ? "Contribute" : "ចូលរួមចំណែក",
    myEntries: language === "en" ? "My Entries" : "ស្នាដៃខ្ញុំ",
    reviewQueue: language === "en" ? "Review Queue" : "ជួររង់ចាំ",
    searchPlaceholder: language === "en" ? "Search..." : "ស្វែងរក...",
    loading: language === "en" ? "Loading..." : "កំពុងផ្ទុក...",
    logout: language === "en" ? "Logout" : "ចាកចេញ",
    login: language === "en" ? "Login" : "ចូល",
    signup: language === "en" ? "Signup" : "ចុះឈ្មោះ",
  };
  
  // Sync URL language parameter with context on initial load
  useEffect(() => {
    const urlLang = searchParams.get("lang");
    if (urlLang && (urlLang === "en" || urlLang === "km")) {
      // If URL has a language param, ensure localStorage is synced
      localStorage.setItem("preferredLanguage", urlLang);
    }
  }, [searchParams]);

  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isReviewer, setIsReviewer] = useState(false);

  // Initialize Supabase client
  const supabase = createClient();

  // Get current user session
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        // Check if user is a reviewer
        if (user) {
          const reviewerStatus = await isUserReviewer(supabase, user);
          setIsReviewer(reviewerStatus);
        } else {
          setIsReviewer(false);
        }
      } catch (error) {
        console.error("Error getting user:", error);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user || null;
        setUser(currentUser);
        // Update reviewer status when auth state changes
        if (currentUser) {
          const reviewerStatus = await isUserReviewer(supabase, currentUser);
          setIsReviewer(reviewerStatus);
        } else {
          setIsReviewer(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const handleSearch = (e) => {
    e.preventDefault();

    // Clean leading/trailing spaces and collapse multiple inner spaces
    const cleanQuery = searchTerm.trim().replace(/\s+/g, " ");
    const lang = language; // Use the active language from the context

    const params = new URLSearchParams();
    if (cleanQuery) params.set("q", cleanQuery);
    if (lang) params.set("lang", lang);

    const queryString = params.toString();
    router.push(queryString ? `/browse?${queryString}` : "/browse");
  };

  

  // Handle logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Preserves language parameter while clearing search query
  const getCleanPageUrl = (targetPath) => {
    const lang = language; // Use the active language from the context
    return lang ? `${targetPath}?lang=${lang}` : targetPath;
  };

  return (
    <header style={styles.headerContainer}>
      <div style={styles.headerInner}>
        {/* Brand Logo */}
        <Link href={getCleanPageUrl("/")} style={styles.brand}>
          {t.brand}
        </Link>

        {/* Navigation & Search */}
        <div style={styles.rightGroup}>
          <nav style={styles.navLinks}>
            <Link href={getCleanPageUrl("/")} style={styles.link}>
              {t.home}
            </Link>
            <Link href={getCleanPageUrl("/browse")} style={styles.link}>
              {t.browse}
            </Link>
            <Link href={getCleanPageUrl("/contribute")} style={styles.link}>
              {t.contribute}
            </Link>
            {!loading && user && (
              <Link href={getCleanPageUrl("/my-entries")} style={styles.link}>
                {t.myEntries}
              </Link>
            )}
            {!loading && user && isReviewer && (
              <Link href={getCleanPageUrl("/reviewer-queue")} style={styles.link}>
                {t.reviewQueue}
              </Link>
            )}
          </nav>

          <form onSubmit={handleSearch} style={styles.searchForm}>
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </form>

          {/* Auth section */}
          <div style={styles.authSection}>
            {loading ? (
              <div style={styles.loading}>{t.loading}</div>
            ) : user ? (
              <div style={styles.userInfo}>
                <span style={styles.userEmail}>{user.email}</span>
                <button type="button" onClick={handleLogout} style={styles.logoutButton}>
                  {t.logout}
                </button>
              </div>
            ) : (
              <div style={styles.authLinks}>
                <Link href="/login" style={styles.authLink}>
                  {t.login}
                </Link>
                <Link href="/signup" style={styles.authLink}>
                  {t.signup}
                </Link>
              </div>
            )}
          </div>

          <button type="button" onClick={toggleLanguage} style={styles.langButton}>
            {language === "en" ? "🇰🇭 ភាសាខ្មែរ" : "🇬🇧 English"}
          </button>
        </div>
      </div>
    </header>
  );
}

const styles = {
  headerContainer: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#93C5FD",
    borderTopStyle: "none",
    borderLeftStyle: "none",
    borderRightStyle: "none",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  headerInner: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "16px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    minHeight: 64,
    boxSizing: "border-box",
  },
  brand: {
    fontSize: 18,
    fontWeight: 800,
    color: "#1E3A8A",
    textDecoration: "none",
    fontFamily: "'Courier New', monospace",
    letterSpacing: 1,
    lineHeight: "36px",
  },
  rightGroup: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
  },
  navLinks: {
    display: "flex",
    gap: 16,
    alignItems: "center",
    flexWrap: "wrap",
    // Keeps the nav compact on phones: when the links no longer fit on one
    // row, the whole row wraps between links instead of squeezing each one.
    rowGap: 8,
  },
  link: {
    fontSize: 15,
    fontWeight: 600,
    color: "#1E40AF",
    textDecoration: "none",
    lineHeight: "36px",
    // Never break a label mid-phrase (e.g. "My Entries" must stay on one line).
    whiteSpace: "nowrap",
  },
  searchForm: {
    display: "flex",
    alignItems: "center",
  },
  searchInput: {
    padding: "6px 12px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#93C5FD",
    borderRadius: 6,
    fontSize: 14,
    color: "#1E3A8A",
    outline: "none",
    width: 140,
    height: 36,
    boxSizing: "border-box",
  },
  authSection: {
    display: "flex",
    alignItems: "center",
  },
  loading: {
    fontSize: 14,
    color: "#64748B",
    padding: "0 8px",
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  userEmail: {
    fontSize: 14,
    color: "#1E3A8A",
    fontWeight: 500,
    maxWidth: 150,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  logoutButton: {
    padding: "6px 12px",
    backgroundColor: "#FEF2F2",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#FECACA",
    borderRadius: 6,
    color: "#DC2626",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 36,
    boxSizing: "border-box",
  },
  authLinks: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  authLink: {
    fontSize: 15,
    fontWeight: 600,
    color: "#1E40AF",
    textDecoration: "none",
    lineHeight: "36px",
    // Same rule as the nav links: keep each label on a single line.
    whiteSpace: "nowrap",
  },
  langButton: {
    padding: "0 12px",
    backgroundColor: "#EFF6FF",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#93C5FD",
    borderRadius: 6,
    color: "#1E40AF",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 36,
    minWidth: 115,
    boxSizing: "border-box",
  },
};

import { Suspense } from "react";

export default function Header() {
  return (
    <Suspense fallback={
      <header style={styles.headerContainer}>
        <div style={styles.headerInner}>
          <div style={styles.brand}>KHMER ARCHIVE</div>
          <div style={styles.rightGroup}>
            <button type="button" style={styles.langButton}>
              🇰🇭 ភាសាខ្មែរ
            </button>
          </div>
        </div>
      </header>
    }>
      <HeaderContent />
    </Suspense>
  );
}