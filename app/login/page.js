"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-client.js";
import Header from "../../components/header.js";

function LoginContent() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Show generic error message for security
        setError("Invalid email or password");
      } else {
        // Redirect to home page after successful login
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header locale="en" />
      <main style={styles.wrap}>
        <div style={styles.header}>
          <p style={styles.kicker}>KHMER LIVING ARCHIVE</p>
          <h1 style={styles.title}>Login</h1>
          <p style={styles.description}>
            Sign in to access your account
          </p>
        </div>

        <div style={styles.card}>
          <form onSubmit={handleLogin} style={styles.form}>
            {error && (
              <div style={styles.error}>{error}</div>
            )}

            <div style={styles.field}>
              <label htmlFor="email" style={styles.label}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                placeholder="you@example.com"
                required
                disabled={loading}
              />
            </div>

            <div style={styles.field}>
              <label htmlFor="password" style={styles.label}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              style={styles.button}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <div style={styles.footer}>
              <p style={styles.footerText}>
                Don't have an account?{" "}
                <a href="/signup" style={styles.link}>
                  Sign up
                </a>
              </p>
              <p style={styles.footerText}>
                <a href="/" style={styles.link}>
                  ← Back to home
                </a>
              </p>
            </div>
          </form>
        </div>

        <footer style={styles.pageFooter}>
          Built in ICT 340 — Vibe Coding, Archived Kites new thing.
        </footer>
      </main>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: 40, textAlign: "center" }}>
        Loading...
      </div>
    }>
      <LoginContent />
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
  description: {
    fontSize: 18,
    color: "#1E3A8A",
    lineHeight: 1.6,
    margin: 0,
  },
  card: {
    marginTop: 24,
    padding: 32,
    backgroundColor: "#FFFFFF",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#93C5FD",
    borderRadius: 10,
    boxSizing: "border-box",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  error: {
    backgroundColor: "#FEF2F2",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#FECACA",
    color: "#DC2626",
    padding: "12px 16px",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 500,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    display: "block",
    fontSize: 14,
    fontWeight: 600,
    color: "#1E40AF",
    marginBottom: 8,
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#93C5FD",
    borderRadius: 6,
    fontSize: 16,
    color: "#1E3A8A",
    outline: "none",
    boxSizing: "border-box",
    backgroundColor: "#FFFFFF",
  },
  button: {
    width: "100%",
    padding: "14px",
    backgroundColor: "#1E40AF",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 6,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 8,
    marginBottom: 24,
  },
  footer: {
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
    color: "#64748B",
    margin: "8px 0",
  },
  link: {
    color: "#1E40AF",
    fontWeight: 600,
    textDecoration: "none",
  },
  pageFooter: {
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