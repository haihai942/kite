"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Header({ locale, setLocale }) {
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/browse?q=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm("");
    }
  };

  return (
    <header style={styles.headerContainer}>
      <div style={styles.headerInner}>
        {/* Brand Logo / Title */}
        <Link href="/" style={styles.brand}>
          KHMER ARCHIVE
        </Link>

        {/* Right Group: Nav Links, Search Input & Language Toggle */}
        <div style={styles.rightGroup}>
          <nav style={styles.navLinks}>
            <Link href="/" style={styles.link}>
              Home
            </Link>
            <Link href="/browse" style={styles.link}>
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

          <button
            onClick={() => setLocale(locale === "en" ? "km" : "en")}
            style={styles.langButton}
          >
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
    minHeight: 64, // Prevents vertical collapse
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
    height: 36, // Explicit height matching button
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
    height: 36, // Locked height
    minWidth: 115, // Locks width so changing flag/text doesn't jump
    boxSizing: "border-box",
  },
};