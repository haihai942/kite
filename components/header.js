"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { createClient } from "../lib/supabase-client.js";

export default function Header({ locale }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize Supabase client
  const supabase = createClient();

  // Get current user session
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error("Error getting user:", error);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  // Helper to maintain existing query parameters (like language)
  const buildUrl = (targetPath, newParams = {}) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        params.set(key, val);
      } else {
        params.delete(key);
      }
    });
    const queryString = params.toString();
    return queryString ? `${targetPath}?${queryString}` : targetPath;
  };

  const handleSearch = (e) => {
    e.preventDefault();

    // Clean leading/trailing spaces and collapse multiple inner spaces
    const cleanQuery = searchTerm.trim().replace(/\s+/g, " ");
    const lang = searchParams.get("lang");

    const params = new URLSearchParams();
    if (cleanQuery) params.set("q", cleanQuery);
    if (lang) params.set("lang", lang);

    const queryString = params.toString();
    router.push(queryString ? `/browse?${queryString}` : "/browse");
  };

  const toggleLanguage = () => {
    const nextLang = locale === "en" ? "km" : "en";
    router.push(buildUrl(pathname, { lang: nextLang }));
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
    const lang = searchParams.get("lang");
    return lang ? `${targetPath}?lang=${lang}` : targetPath;
  };

  return (
    <header style={styles.headerContainer}>
      <div style={styles.headerInner}>
        {/* Brand Logo */}
        <Link href={getCleanPageUrl("/")} style={styles.brand}>
          KHMER ARCHIVE
        </Link>

        {/* Navigation & Search */}
        <div style={styles.rightGroup}>
          <nav style={styles.navLinks}>
            <Link href={getCleanPageUrl("/")} style={styles.link}>
              Home
            </Link>
            <Link href={getCleanPageUrl("/browse")} style={styles.link}>
              Browse
            </Link>
          </nav>

          <form onSubmit={handleSearch} style={styles.searchForm}>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </form>

          {/* Auth section */}
          <div style={styles.authSection}>
            {loading ? (
              <div style={styles.loading}>Loading...</div>
            ) : user ? (
              <div style={styles.userInfo}>
                <span style={styles.userEmail}>{user.email}</span>
                <button onClick={handleLogout} style={styles.logoutButton}>
                  Logout
                </button>
              </div>
            ) : (
              <div style={styles.authLinks}>
                <Link href="/login" style={styles.authLink}>
                  Login
                </Link>
                <Link href="/signup" style={styles.authLink}>
                  Signup
                </Link>
              </div>
            )}
          </div>

          <button onClick={toggleLanguage} style={styles.langButton}>
            {locale === "en" ? "🇰🇭 ភាសាខ្មែរ" : "🇬🇧 English"}
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
  },
  link: {
    fontSize: 15,
    fontWeight: 600,
    color: "#1E40AF",
    textDecoration: "none",
    lineHeight: "36px",
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