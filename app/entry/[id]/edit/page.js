"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "../../../../components/header.js";
import { createClient } from "../../../../lib/supabase-client.js";

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

const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 MB in bytes
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

function makePhotoId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

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

function validate(values, photo) {
  const errors = {};

  // Title (English): required, max 30 chars, not blank spaces or symbols only.
  if (!values.title_en) {
    errors.title_en = "Title (English) is required.";
  } else if (charCount(values.title_en) > MAX_LENGTHS.title_en) {
    errors.title_en = `Title (English) must be ${MAX_LENGTHS.title_en} characters or fewer (currently ${charCount(values.title_en)}).`;
  } else if (!/[\\p{L}\\p{N}]/u.test(values.title_en)) {
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

  // Photo validation (optional for editing, but if provided must be valid)
  if (photo) {
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

function EditContent() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") || "en";
  const router = useRouter();

  const [supabase] = useState(() => createClient());
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [values, setValues] = useState(EMPTY_VALUES);
  const [photo, setPhoto] = useState(null);
  const [photoKey, setPhotoKey] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Fetch current user and check ownership
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (active) setCurrentUser(data.user);
      } catch (err) {
        console.error("Error fetching user:", err);
      } finally {
        if (active) setAuthLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  // Fetch entry data
  useEffect(() => {
    let active = true;
    (async () => {
      if (!id || authLoading) return;
      
      try {
        const { data, error } = await supabase
          .from("entries")
          .select("*")
          .eq("id", id)
          .single();
        
        if (error) throw error;
        
        if (!active) return;
        
        // Check ownership
        if (!currentUser || data.owner !== currentUser.id) {
          setError("You don't have permission to edit this entry.");
          setLoading(false);
          return;
        }
        
        setEntry(data);
        
        // Pre-fill form with entry data
        const entryValues = {
          title_en: data.title_en || "",
          title_km: data.title_km || "",
          contributor_en: data.contributor_en || "",
          contributor_km: data.contributor_km || "",
          places_en: data.places_en || "",
          places_km: data.places_km || "",
          description_en: data.description_en || "",
          description_km: data.description_km || "",
        };
        setValues(entryValues);
        
        // Get existing photo URL for display
        const existingPhotoUrl = data.photo_urls?.[0] || "";
        // Note: we don't set photo state here since it's a URL, not a File object
        // The photo state is only for new uploads
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
  }, [id, supabase, authLoading, currentUser]);

  const handleTextChange = (field) => (e) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
    // Clear the field's error while the user is editing it (re-checked on blur).
    setErrors((prev) => (prev[field] ? { ...prev, [field]: "" } : prev));
  };

  const handleBlur = (field) => () => {
    const trimmed = trimValues({ [field]: values[field] });
    const newValues = { ...values, ...trimmed };
    setValues(newValues);
    const newErrors = validate(newValues, photo);
    if (newErrors[field]) {
      setErrors((prev) => ({ ...prev, [field]: newErrors[field] }));
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files && e.target.files[0];
    setPhoto(file || null);
    if (errors.photo) {
      const nextErrors = validate(values, file || null);
      setErrors((prev) => ({ ...prev, photo: nextErrors.photo || "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trimmed = trimValues(values);
    setValues(trimmed);
    
    const validationErrors = validate(trimmed, photo);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setSubmitting(true);
    setSubmitError("");
    
    try {
      // Get current user to ensure we have the right owner
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error("Your session has expired. Please log in again.");
      }
      
      // Get existing photo URL
      const existingPhotoUrl = entry?.photo_urls?.[0] || "";
      let finalPhotoUrl = existingPhotoUrl;
      
      // Upload new photo if provided
      if (photo) {
        const extMatch = /\.([a-zA-Z0-9]+)$/.exec(photo.name);
        const ext = extMatch ? extMatch[1].toLowerCase() : "jpg";
        const filePath = `${currentUser.id}/${makePhotoId()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("photos")
          .upload(filePath, photo, {
            contentType: photo.type || "application/octet-stream",
            upsert: false,
          });
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from("photos")
          .getPublicUrl(filePath);
        finalPhotoUrl = urlData.publicUrl;
      }
      
      // Update the entry with photo_urls
      const updateData = {
        title_en: trimmed.title_en,
        title_km: trimmed.title_km || null,
        contributor_en: trimmed.contributor_en || null,
        contributor_km: trimmed.contributor_km || null,
        places_en: trimmed.places_en || null,
        places_km: trimmed.places_km || null,
        description_en: trimmed.description_en,
        description_km: trimmed.description_km || null,
        updated_at: new Date().toISOString(),
      };
      
      // Only update photo_urls if we have a new photo or need to preserve existing
      if (photo || existingPhotoUrl) {
        updateData.photo_urls = finalPhotoUrl ? [finalPhotoUrl] : [];
      }
      
      const { error } = await supabase
        .from("entries")
        .update(updateData)
        .eq("id", id)
        .eq("owner", currentUser.id); // Ensure user owns the entry
      
      if (error) throw error;
      
      // Redirect back to the entry page
      router.push(`/entry/${id}${locale && locale !== "en" ? `?lang=${locale}` : ""}`);
    } catch (err) {
      console.error("Error updating entry:", err);
      setSubmitError(err.message || "Failed to update entry. Please try again.");
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/entry/${id}${locale && locale !== "en" ? `?lang=${locale}` : ""}`);
  };

  if (authLoading || loading) {
    return (
      <>
        <Header locale={locale} />
        <main style={styles.wrap}>
          <div style={styles.card}>
            <p style={styles.loadingText}>Loading...</p>
          </div>
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header locale={locale} />
        <main style={styles.wrap}>
          <div style={styles.header}>
            <p style={styles.kicker}>KHMER LIVING ARCHIVE</p>
            <h1 style={styles.title}>Edit Entry</h1>
          </div>
          <div style={styles.card}>
            <p style={styles.errorText}>{error}</p>
            <Link href="/browse" style={styles.buttonLink}>
              Back to the archive
            </Link>
          </div>
        </main>
      </>
    );
  }

  // Get existing photo URL for display
  const existingPhotoUrl = entry?.photo_urls?.[0] || "";

  return (
    <>
      <Header locale={locale} />
      <main style={styles.wrap}>
        <div style={styles.header}>
          <p style={styles.kicker}>KHMER LIVING ARCHIVE</p>
          <h1 style={styles.title}>Edit Entry</h1>
          {entry && (
            <p style={styles.subtitle}>
              Editing "{entry.title_en || "Untitled Entry"}"
            </p>
          )}
        </div>

        <div style={styles.card}>
          {submitError && (
            <div style={styles.errorBanner}>
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} style={styles.form} noValidate>
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
                placeholder="e.g. ជីដូនរបស់ខ្ញុំ"
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
              {existingPhotoUrl && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 14, color: "#64748B", marginBottom: 8 }}>
                    Current photo:{" "}
                    <a href={existingPhotoUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#1E40AF" }}>
                      View existing photo
                    </a>
                  </p>
                  <p style={{ fontSize: 13, color: "#94A3B8" }}>
                    Upload a new photo below to replace it (optional)
                  </p>
                </div>
              )}
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
                    : existingPhotoUrl 
                      ? "Keep current photo or upload a new one (JPG, PNG, or WebP, max 5 MB)"
                      : "JPG, PNG, or WebP, max 5 MB"}
                </span>
              )}
            </div>

            <div style={styles.buttonGroup}>
              <button
                type="button"
                onClick={handleCancel}
                style={styles.cancelButton}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  ...styles.submitButton,
                  ...(submitting ? styles.buttonDisabled : {}),
                }}
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
         </div>

        <footer style={styles.footer}>
            Built in ICT 340 — Vibe Coding, Archived Kites new thing.
          </footer>
      </main>
    </>
  );
}

export default function EditPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 40, textAlign: "center" }}>
          Loading...
        </div>
      }
    >
      <EditContent />
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
  subtitle: {
    fontSize: 16,
    color: "#64748B",
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
    marginBottom: 16,
  },
  buttonGroup: {
    display: "flex",
    gap: 12,
    marginTop: 24,
  },
  submitButton: {
    flex: 1,
    padding: "14px",
    backgroundColor: "#1E40AF",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 6,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
  },
  cancelButton: {
    flex: 1,
    padding: "14px",
    backgroundColor: "#F1F5F9",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#93C5FD",
    color: "#64748B",
    borderRadius: 6,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
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