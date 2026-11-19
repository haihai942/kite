"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-client.js";
import Header from "../../components/header.js";
import { useLanguage } from "../../contexts/language-context.js";

function LoginContent() {
  const router = useRouter();
  const { language } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Inline EN/KM dictionary for the login page. Reading `language` on every
  // render keeps these labels in sync the moment the toggle flips.
  const t = {
    kicker: language === "en" ? "KHMER LIVING ARCHIVE" : "ប័ណ្ណសាររស់រវើកខ្មែរ",
    title: language === "en" ? "Login" : "ចូល",
    description: language === "en" ? "Sign in to access your account" : "ចូលដើម្បីប្រើគណនីរបស់អ្នក",
    email: language === "en" ? "Email" : "អ៊ីមែល",
    password: language === "en" ? "Password" : "ពាក្យសម្ងាត់",
    signingIn: language === "en" ? "Signing in..." : "កំពុងចូល...",
    signIn: language === "en" ? "Sign In" : "ចូល",
    noAccount: language === "en" ? "Don't have an account?" : "មិនទាន់មានគណនី?",
    signup: language === "en" ? "Sign up" : "ចុះឈ្មោះ",
    backHome: language === "en" ? "← Back to home" : "← ត្រឡប់ទៅទំព័រដើម",
    invalid: language === "en" ? "Invalid email or password" : "អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ",
  };

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
        setError(t.invalid);
      } else {
        // Redirect to home page after successful login
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError(t.invalid);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main style={styles.wrap}>
        <div style={styles.header}>
          <p style={styles.kicker}>{t.kicker}</p>
          <h1 style={styles.title}>{t.title}</h1>
          <p style={styles.description}>
            {t.description}
          </p>
        </div>

        <div style={styles.card}>
          <form onSubmit={handleLogin} style={styles.form}>
            {error && (
              <div style={styles.error}>{error}</div>
            )}

            <div style={styles.field}>
              <label htmlFor="email" style={styles.label}>
                {t.email}
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
                {t.password}
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
              {loading ? t.signingIn : t.signIn}
            </button>

            <div style={styles.authFooter}>
              <p style={styles.footerText}>
                {t.noAccount}{" "}
                <a href="/signup" style={styles.link}>
                  {t.signup}
                </a>
              </p>
              <p style={styles.footerText}>
                <a href="/" style={styles.link}>
                  {t.backHome}
                </a>
              </p>
            </div>
          </form>
        </div>

        <footer style={styles.footer}>
          {language === "en"
            ? "Archived Kites — Preserving stories and memories, one kite at a time."
            : "បណ្ណសារខ្លែង — រក្សាទុករឿងរ៉ាវ និងការចងចាំរបស់យើង។"}
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
    width: "100%",
    margin: 0,
    padding: "40px 32px 80px",
    boxSizing: "border-box",
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
  authFooter: {
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