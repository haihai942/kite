"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function Header({ locale }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [searchTerm, setSearchTerm] = useState("");

  // Sync search input if query parameter changes in URL
  useEffect(() => {
    setSearchTerm(searchParams.get("q") || "");
  }, [searchParams]);

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