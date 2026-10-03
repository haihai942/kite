"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Header from "../../components/header.js";
import { createClient } from "../../lib/supabase-client.js";

// Max character counts (measured after trimming) for each text field.
const MAX_LENGTHS = {
  title_en: 30,
  title_km: 40,
  contributor_en: 30,
  contributor_km: 40,
  places_en: 30,
  places_km: 40,
  description_en: 1800,
  description_km: 2000,
};

const FIELD_LABELS = {
  title_en: "Title (English)",
  title_km: "Title (Khmer)",
  contributor_en: "Contributor Name (English)",
  contributor_km: "Contributor Name (Khmer)",
  places_en: "Place (English)",
  places_km: "Place (Khmer)",
  description_en: "Description (English)",
  description_km: "Description (Khmer)",
};

const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 MB in bytes
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

const EMPTY_VALUES = {
  title_en: "",
  title_km: "",
  contributor_en: "",
  contributor_km: "",
  places_en: "",
  places_km: "",
  description_en: "",
  description_km: "",
};

// Count Unicode code points, so Khmer characters count correctly.
function charCount(str) {
  return [...(str || "")].length;
}

function trimValues(values) {
  const trimmed = {};
  Object.keys(values).forEach((key) => {
    trimmed[key] = values[key].trim();
  });
  return trimmed;
}

function makePhotoId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function validate(values, photo) {
  const errors = {};

  // Title (English): required, max 30 chars, not blank spaces or symbols only.
  if (!values.title_en) {
    errors.title_en = "Title (English) is required.";
  } else if (charCount(values.title_en) > MAX_LENGTHS.title_en) {
    errors.title_en = `Title (English) must be ${MAX_LENGTHS.title_en} characters or fewer (currently ${charCount(values.title_en)}).`;
  } else if (!/[\p{L}\p{N}]/u.test(values.title_en)) {
    errors.title_en = "Title (English) cannot be only spaces or symbols.";
  }

  // Description (English): required, max 1800 chars, cannot be blank spaces.
  if (!values.description_en) {
    errors.description_en = "Description (English) is required.";
  } else if (charCount(values.description_en) > MAX_LENGTHS.description_en) {
    errors.description_en = `Description (English) must be ${MAX_LENGTHS.description_en} characters or fewer (currently ${charCount(values.description_en)}).`;
  }

  // Optional text fields: length checks only.
  const optionalFields = [
    "title_km",
    "contributor_en",
    "contributor_km",
    "places_en",
    "places_km",
    "description_km",
  ];
  optionalFields.forEach((field) => {
    if (values[field] && charCount(values[field]) > MAX_LENGTHS[field]) {
      errors[field] = `${FIELD_LABELS[field]} must be ${MAX_LENGTHS[field]} characters or fewer (currently ${charCount(values[field])}).`;
    }
  });

  // Photo: required, JPEG/PNG/WebP only, max 5 MB.
  if (!photo) {
    errors.photo = "Please choose a photo.";
  } else {
    const typeOk = PHOTO_TYPES.includes((photo.type || "").toLowerCase());
    const extOk = /\.(jpe?g|png|webp)$/i.test(photo.name || "");
    if (!typeOk && !extOk) {
      errors.photo = "Photo must be a JPG, PNG, or WebP image.";
    } else if (photo.size > MAX_PHOTO_SIZE) {
      errors.photo = "Photo must be 5 MB or smaller.";
    }
  }

  return errors;
}

function ContributeContent() {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [values, setValues] = useState(EMPTY_VALUES);
  const [photo, setPhoto] = useState(null);
  const [photoKey, setPhotoKey] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Check the current session; only logged-in users can submit.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (active) setUser(data.user);
      } catch (err) {
        console.error("Error checking session:", err);
      } finally {
        if (active) setAuthLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  const handleTextChange = (field) => (e) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
    // Clear the field's error while the user is editing it (re-checked on blur).
    setErrors((prev) => (prev[field] ? { ...prev, [field]: "" } : prev));
  };

  const handleBlur = (field) => () => {
    const nextErrors = validate(trimValues(values), photo);
    setErrors((prev) => ({ ...prev, [field]: nextErrors[field] || "" }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files && e.target.files[0];
    setPhoto(file || null);
    if (errors.photo) {
      const nextErrors = validate(trimValues(values), file || null);
      setErrors((prev) => ({ ...prev, photo: nextErrors.photo || "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    const trimmed = trimValues(values);
    const nextErrors = validate(trimmed, photo);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSubmitting(true);
    try {
      // Upload the photo to the 'photos' bucket: <user_id>/<random_uuid>.<ext>
      let photoUrl = "";
      if (photo) {
        const extMatch = /\.([a-zA-Z0-9]+)$/.exec(photo.name);
        const ext = extMatch ? extMatch[1].toLowerCase() : "jpg";
        const filePath = `${user.id}/${makePhotoId()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("photos")
          .upload(filePath, photo, {
            contentType: photo.type || "application/octet-stream",
            upsert: false,
          });
        if (uploadError) throw new Error(uploadError.message);

        const { data: urlData } = supabase.storage
          .from("photos")
          .getPublicUrl(filePath);
        photoUrl = urlData.publicUrl;
      }

      // Add the trimmed entry to the entries table.
      const { error: insertError } = await supabase.from("entries").insert({
        owner: user.id,
        title_en: trimmed.title_en,
        title_km: trimmed.title_km,
        contributor_en: trimmed.contributor_en,
        contributor_km: trimmed.contributor_km,
        places_en: trimmed.places_en,
        places_km: trimmed.places_km,
        description_en: trimmed.description_en,
        description_km: trimmed.description_km,
        photo_urls: photoUrl ? [photoUrl] : [],
      });
      if (insertError) throw new Error(insertError.message);

      setSuccess(true);
    } catch (err) {
      console.error("Error submitting entry:", err);
      setSubmitError(
        "Failed to submit your entry. Please check the 'photos' bucket exists and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setValues(EMPTY_VALUES);
    setPhoto(null);
    setPhotoKey((k) => k + 1);
    setErrors({});
    setSubmitError("");
    setSuccess(false);
  };

  return (
    <>
      <Header locale="en" />
      <main style={styles.wrap}>
        <div style={styles.header}>
          <p style={styles.kicker}>KHMER LIVING ARCHIVE</p>
          <h1 style={styles.title}>Contribute an Entry</h1>
          <p style={styles.description}>
            Share a kite memory, tradition, or photo with the archive.
          </p>
        </div>

        {authLoading ? (
          <div style={styles.card}>
            <p style={styles.loadingText}>Checking your account...</p>
          </div>
        ) : !user ? (
          <div style={styles.card}>
            <p style={styles.loginMessage}>
              You must be logged in to add an entry to the archive.
            </p>
            <Link href="/login" style={styles.buttonLink}>
              Log in
            </Link>
            <p style={styles.helperText}>
              New here?{" "}
              <Link href="/signup" style={styles.link}>
                Create an account
              </Link>
            </p>
          </div>
        ) : success ? (
          <div style={styles.card}>
            <p style={styles.successTitle}>Your entry was submitted!</p>
            <p style={styles.successText}>
              Thank you for sharing your memory with the archive.
            </p>
            <div style={styles.successActions}>
              <Link href="/browse" style={styles.buttonLink}>
                Browse the archive
              </Link>
              <button onClick={resetForm} style={styles.secondaryButton}>
                Submit another entry
              </button>
            </div>
          </div>
        ) : (
          <div style={styles.card}>
            <form onSubmit={handleSubmit} style={styles.form} noValidate>
              {submitError && (
                <div style={styles.errorBanner}>{submitError}</div>
              )}

              <div style={styles.field}>
                <label htmlFor="title_en" style={styles.label}>
                  {FIELD_LABELS.title_en}{" "}
                  <span style={styles.required}>*</span>
                </label>
                <input
                  id="title_en"
                  type="text"
                  value={values.title_en}
                  onChange={handleTextChange("title_en")}
                  onBlur={handleBlur("title_en")}
                  placeholder="e.g. My First Bamboo Kite"
                  style={styles.input}
                />
                {errors.title_en ? (
                  <p style={styles.fieldError}>{errors.title_en}</p>
                ) : (
                  <span style={styles.counter}>
                    {charCount(values.title_en)}/{MAX_LENGTHS.title_en}{" "}
                    characters
                  </span>
                )}
              </div>

              <div style={styles.field}>
                <label htmlFor="title_km" style={styles.label}>
                  {FIELD_LABELS.title_km}
                </label>
                <input
                  id="title_km"
                  type="text"
                  value={values.title_km}
                  onChange={handleTextChange("title_km")}
                  onBlur={handleBlur("title_km")}
                  placeholder="e.g. ខ្លែងឫស្សីដំបូងរបស់ខ្ញុំ"
                  style={styles.input}
                />
                {errors.title_km ? (
                  <p style={styles.fieldError}>{errors.title_km}</p>
                ) : (
                  <span style={styles.counter}>
                    {charCount(values.title_km)}/{MAX_LENGTHS.title_km}{" "}
                    characters
                  </span>
                )}
              </div>

              <div style={styles.field}>
                <label htmlFor="contributor_en" style={styles.label}>
                  {FIELD_LABELS.contributor_en}
                </label>
                <input
                  id="contributor_en"
                  type="text"
                  value={values.contributor_en}
                  onChange={handleTextChange("contributor_en")}
                  onBlur={handleBlur("contributor_en")}
                  placeholder="e.g. My Grandma"
                  style={styles.input}
                />
                {errors.contributor_en ? (
                  <p style={styles.fieldError}>{errors.contributor_en}</p>
                ) : (
                  <span style={styles.counter}>
                    {charCount(values.contributor_en)}/
                    {MAX_LENGTHS.contributor_en} characters
                  </span>
                )}
              </div>

              <div style={styles.field}>
                <label htmlFor="contributor_km" style={styles.label}>
                  {FIELD_LABELS.contributor_km}
                </label>
                <input
                  id="contributor_km"
                  type="text"
                  value={values.contributor_km}
                  onChange={handleTextChange("contributor_km")}
                  onBlur={handleBlur("contributor_km")}
                  placeholder="e.g. យាយរបស់ខ្ញុំ"
                  style={styles.input}
                />
                {errors.contributor_km ? (
                  <p style={styles.fieldError}>{errors.contributor_km}</p>
                ) : (
                  <span style={styles.counter}>
                    {charCount(values.contributor_km)}/
                    {MAX_LENGTHS.contributor_km} characters
                  </span>
                )}
              </div>

              <div style={styles.field}>
                <label htmlFor="places_en" style={styles.label}>
                  {FIELD_LABELS.places_en}
                </label>
                <input
                  id="places_en"
                  type="text"
                  value={values.places_en}
                  onChange={handleTextChange("places_en")}
                  onBlur={handleBlur("places_en")}
                  placeholder="e.g. Siem Reap"
                  style={styles.input}
                />
                {errors.places_en ? (
                  <p style={styles.fieldError}>{errors.places_en}</p>
                ) : (
                  <span style={styles.counter}>
                    {charCount(values.places_en)}/{MAX_LENGTHS.places_en}{" "}
                    characters
                  </span>
                )}
              </div>

              <div style={styles.field}>
                <label htmlFor="places_km" style={styles.label}>
                  {FIELD_LABELS.places_km}
                </label>
                <input
                  id="places_km"
                  type="text"
                  value={values.places_km}
                  onChange={handleTextChange("places_km")}
                  onBlur={handleBlur("places_km")}
                  placeholder="e.g. សៀមរាប"
                  style={styles.input}
                />
                {errors.places_km ? (
                  <p style={styles.fieldError}>{errors.places_km}</p>
                ) : (
                  <span style={styles.counter}>
                    {charCount(values.places_km)}/{MAX_LENGTHS.places_km}{" "}
                    characters
                  </span>
                )}
              </div>

              <div style={styles.field}>
                <label htmlFor="description_en" style={styles.label}>
                  {FIELD_LABELS.description_en}{" "}
                  <span style={styles.required}>*</span>
                </label>
                <textarea
                  id="description_en"
                  rows={7}
                  value={values.description_en}
                  onChange={handleTextChange("description_en")}
                  onBlur={handleBlur("description_en")}
                  placeholder="Tell the story behind this kite..."
                  style={styles.textarea}
                />
                {errors.description_en ? (
                  <p style={styles.fieldError}>{errors.description_en}</p>
                ) : (
                  <span style={styles.counter}>
                    {charCount(values.description_en)}/
                    {MAX_LENGTHS.description_en} characters
                  </span>
                )}
              </div>

              <div style={styles.field}>
                <label htmlFor="description_km" style={styles.label}>
                  {FIELD_LABELS.description_km}
                </label>
                <textarea
                  id="description_km"
                  rows={7}
                  value={values.description_km}
                  onChange={handleTextChange("description_km")}
                  onBlur={handleBlur("description_km")}
                  placeholder="រៀបរាប់រឿងរ៉ាវរបស់ខ្លែងនេះ..."
                  style={styles.textarea}
                />
                {errors.description_km ? (
                  <p style={styles.fieldError}>{errors.description_km}</p>
                ) : (
                  <span style={styles.counter}>
                    {charCount(values.description_km)}/
                    {MAX_LENGTHS.description_km} characters
                  </span>
                )}
              </div>

              <div style={styles.field}>
                <label htmlFor="photo" style={styles.label}>
                  Photo <span style={styles.required}>*</span>
                </label>
                <input
                  id="photo"
                  key={photoKey}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  style={styles.fileInput}
                />
                {errors.photo ? (
                  <p style={styles.fieldError}>{errors.photo}</p>
                ) : (
                  <span style={styles.counter}>
                    {photo
                      ? `${photo.name} (${(photo.size / (1024 * 1024)).toFixed(2)} MB)`
                      : "JPG, PNG, or WebP, max 5 MB"}
                  </span>
                )}
              </div>

              <button type="submit" style={styles.button} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Entry"}
              </button>
            </form>
          </div>
        )}

        <footer style={styles.footer}>
          Built in ICT 340 — Vibe Coding, Archived Kites new thing.
        </footer>
      </main>
    </>
  );
}

export default function ContributePage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 40, textAlign: "center" }}>
          Loading...
        </div>
      }
    >
      <ContributeContent />
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
    gap: 18,
  },
  field: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    display: "block",
    fontSize: 14,
    fontWeight: 600,
    color: "#1E40AF",
    marginBottom: 8,
  },
  required: {
    color: "#DC2626",
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
  textarea: {
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
    minHeight: 120,
    resize: "vertical",
    fontFamily: "inherit",
    lineHeight: 1.5,
  },
  fileInput: {
    width: "100%",
    padding: "10px 0",
    fontSize: 14,
    color: "#1E3A8A",
    boxSizing: "border-box",
  },
  fieldError: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: 500,
    margin: "6px 0 0",
  },
  counter: {
    fontSize: 12,
    color: "#64748B",
    margin: "6px 0 0",
  },
  errorBanner: {
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
    marginTop: 16,
  },
  secondaryButton: {
    padding: "12px 20px",
    backgroundColor: "transparent",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#93C5FD",
    color: "#1E40AF",
    borderRadius: 6,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 16,
  },
  loginMessage: {
    fontSize: 16,
    color: "#1E3A8A",
    lineHeight: 1.6,
    margin: 0,
  },
  helperText: {
    fontSize: 14,
    color: "#64748B",
    margin: "16px 0 0",
  },
  link: {
    color: "#1E40AF",
    fontWeight: 600,
    textDecoration: "none",
  },
  loadingText: {
    fontSize: 16,
    color: "#64748B",
    fontStyle: "italic",
    margin: 0,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#1E3A8A",
    margin: 0,
  },
  successText: {
    fontSize: 16,
    color: "#1E3A8A",
    lineHeight: 1.6,
    margin: "8px 0 0",
  },
  successActions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
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