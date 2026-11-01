"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "../../components/header.js";
import { createClient } from "../../lib/supabase-client.js";
import {
  MAX_FILE_SIZE,
  validatePhotoFile,
  prepareFileForUpload,
  extractSafeExtension
} from "../../lib/file-validation.js";
import { useLanguage } from "../../contexts/language-context.js";

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
  title_en: { en: "Title (English)", km: "ចំណងជើង (អង់គ្លេស)" },
  title_km: { en: "Title (Khmer)", km: "ចំណងជើង (ខ្មែរ)" },
  contributor_en: { en: "Contributor Name (English)", km: "ឈ្មោះអ្នកចូលរួម (អង់គ្លេស)" },
  contributor_km: { en: "Contributor Name (Khmer)", km: "ឈ្មោះអ្នកចូលរួម (ខ្មែរ)" },
  places_en: { en: "Place (English)", km: "ទីកន្លែង (អង់គ្លេស)" },
  places_km: { en: "Place (Khmer)", km: "ទីកន្លែង (ខ្មែរ)" },
  description_en: { en: "Description (English)", km: "ការពិពណ៌នា (អង់គ្លេស)" },
  description_km: { en: "Description (Khmer)", km: "ការពិពណ៌នា (ខ្មែរ)" },
};

// Returns the field label for the active language.
function fieldLabel(field, language) {
  const labels = FIELD_LABELS[field];
  if (!labels) return field;
  return labels[language] || labels.en;
}

// MAX_FILE_SIZE is imported from file-validation.js (5 MB)
// Photo types are now validated in the file-validation module

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

function validate(values, photo, language = "en") {
  const errors = {};
  const en = language === "en";

  // Title (English): required, max 30 chars, not blank spaces or symbols only.
  if (!values.title_en) {
    errors.title_en = en
      ? "Title (English) is required."
      : "តម្រូវឱ្យបំពេញចំណងជើង (អង់គ្លេស)។";
  } else if (charCount(values.title_en) > MAX_LENGTHS.title_en) {
    errors.title_en = en
      ? `Title (English) must be ${MAX_LENGTHS.title_en} characters or fewer (currently ${charCount(values.title_en)}).`
      : `ចំណងជើង (អង់គ្លេស) ត្រូវតែមាន ${MAX_LENGTHS.title_en} តួអក្សរ ឬតិចជាង (បច្ចុប្បន្ន ${charCount(values.title_en)})។`;
  } else if (!/[\p{L}\p{N}]/u.test(values.title_en)) {
    errors.title_en = en
      ? "Title (English) cannot be only spaces or symbols."
      : "ចំណងជើង (អង់គ្លេស) មិនអាចជាចន្លោះទទេ ឬនិមិត្តសញ្ញាតែប៉ុណ្ណោះបានទេ។";
  }

  // Description (English): required, max 1800 chars, cannot be blank spaces.
  if (!values.description_en) {
    errors.description_en = en
      ? "Description (English) is required."
      : "តម្រូវឱ្យបំពេញការពិពណ៌នា (អង់គ្លេស)។";
  } else if (charCount(values.description_en) > MAX_LENGTHS.description_en) {
    errors.description_en = en
      ? `Description (English) must be ${MAX_LENGTHS.description_en} characters or fewer (currently ${charCount(values.description_en)}).`
      : `ការពិពណ៌នា (អង់គ្លេស) ត្រូវតែមាន ${MAX_LENGTHS.description_en} តួអក្សរ ឬតិចជាង (បច្ចុប្បន្ន ${charCount(values.description_en)})។`;
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
      const label = fieldLabel(field, language);
      errors[field] = en
        ? `${label} must be ${MAX_LENGTHS[field]} characters or fewer (currently ${charCount(values[field])}).`
        : `${label} ត្រូវតែមាន ${MAX_LENGTHS[field]} តួអក្សរ ឬតិចជាង (បច្ចុប្បន្ន ${charCount(values[field])})។`;
    }
  });

  // Photo: required, strict validation using file-validation.js
  if (!photo) {
    errors.photo = en ? "Please choose a photo." : "សូមជ្រើសរើសរូបថតមួយ។";
  } else {
    const validation = validatePhotoFile(photo);
    if (!validation.isValid) {
      errors.photo = validation.error;
    }
  }

  return errors;
}

function ContributeContent() {
  const router = useRouter();
  const { language } = useLanguage();
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [values, setValues] = useState(EMPTY_VALUES);
  const [photo, setPhoto] = useState(null);
  const [photoKey, setPhotoKey] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
    const nextErrors = validate(trimValues(values), photo, language);
    setErrors((prev) => ({ ...prev, [field]: nextErrors[field] || "" }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files && e.target.files[0];
    setPhoto(file || null);
    if (errors.photo) {
      const nextErrors = validate(trimValues(values), file || null, language);
      setErrors((prev) => ({ ...prev, photo: nextErrors.photo || "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    const trimmed = trimValues(values);
    const nextErrors = validate(trimmed, photo, language);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSubmitting(true);
    try {
      // Get the logged-in user at submit time. Ownership always comes from
      // the authenticated user's id — never from a form input.
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!currentUser) {
        setSubmitError(
          language === "en"
            ? "Your session has expired. Please log in again and try again."
            : "វគ្គសម្រាប់អ្នកបានផុតកំណត់។ សូមចូលម្តងទៀត ហើយព្យាយាមម្តងទៀត។"
        );
        return;
      }

      // Upload the photo to the 'photos' bucket: <user_id>/<random_uuid>.<ext>
      let photoUrl = "";
      if (photo) {
        // Strict file validation and preparation
        const filePreparation = prepareFileForUpload(photo);
        if (!filePreparation.isValid) {
          throw new Error(filePreparation.error);
        }
        
        const safeExtension = filePreparation.safeExtension;
        const filePath = `${currentUser.id}/${makePhotoId()}.${safeExtension}`;
        const { error: uploadError } = await supabase.storage
          .from("photos")
          .upload(filePath, photo, {
            contentType: filePreparation.contentType,
            upsert: false,
          });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("photos")
          .getPublicUrl(filePath);
        photoUrl = urlData.publicUrl;
      }

      // Insert the new entry, listing every column explicitly.
      // The database default will set status to 'pending'
      const { error: insertError } = await supabase
        .from("entries")
        .insert({
          owner: currentUser.id,
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
      if (insertError) throw insertError;

      // Show success message instead of redirecting
      setSubmitted(true);
    } catch (err) {
      // Log the real error, but only ever show a friendly generic message.
      console.error("Error submitting entry:", err);
      setSubmitError(
        language === "en"
          ? "We couldn't save your entry right now. Please try again."
          : "យើងមិនអាចរក្សាទុកធាតុរបស់អ្នកបានទេនៅពេលនេះ។ សូមព្យាយាមម្តងទៀត។"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <main style={styles.wrap}>
        <div style={styles.header}>
          <p style={styles.kicker}>KHMER LIVING ARCHIVE</p>
          <h1 style={styles.title}>
            {language === "en" ? "Contribute an Entry" : "ចូលរួមចំណែកធាតុមួយ"}
          </h1>
          <p style={styles.description}>
            {language === "en"
              ? "Share a kite memory, tradition, or photo with the archive."
              : "ចែករំលែកអនុស្សាវរីយ៍ ប្រពៃណី ឬរូបថតខ្លែងជាមួយប័ណ្ណសារ។"}
          </p>
        </div>

        {authLoading ? (
          <div style={styles.card}>
            <p style={styles.loadingText}>
              {language === "en" ? "Checking your account..." : "កំពុងពិនិត្យគណនីរបស់អ្នក..."}
            </p>
          </div>
        ) : !user ? (
          <div style={styles.card}>
            <p style={styles.loginMessage}>
              {language === "en"
                ? "Please log in to submit an entry"
                : "សូមចូលដើម្បីដាក់ស្នើធាតុមួយ"}
            </p>
            <Link href="/login" style={styles.buttonLink}>
              {language === "en" ? "Log in" : "ចូល"}
            </Link>
            <p style={styles.helperText}>
              {language === "en" ? "New here?" : "ថ្មីនៅទីនេះ?"}{" "}
              <Link href="/signup" style={styles.link}>
                {language === "en" ? "Create an account" : "បង្កើតគណនី"}
              </Link>
            </p>
          </div>
        ) : submitted ? (
          <div style={styles.card}>
            <div style={styles.successContainer}>
              <p style={styles.successText}>
                {language === "en"
                  ? "Your entry has been submitted and is waiting for review."
                  : "ការដាក់ស្នើរបស់អ្នកត្រូវបានទទួល និងកំពុងរង់ចាំការពិនិត្យ។"}
              </p>
              <Link href="/my-entries" style={styles.buttonLink}>
                {language === "en" ? "View My Entries" : "មើលធាតុរបស់ខ្ញុំ"}
              </Link>
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
                  {fieldLabel("title_en", language)}{" "}
                  <span style={styles.required}>*</span>
                </label>
                <input
                  id="title_en"
                  type="text"
                  value={values.title_en}
                  onChange={handleTextChange("title_en")}
                  onBlur={handleBlur("title_en")}
                  placeholder={language === "en" ? "e.g. My First Bamboo Kite" : "ឧ. ខ្លែងឫស្សីដំបូងរបស់ខ្ញុំ"}
                  style={styles.input}
                />
                {errors.title_en ? (
                  <p style={styles.fieldError}>{errors.title_en}</p>
                ) : (
                  <span style={styles.counter}>
                    {charCount(values.title_en)}/{MAX_LENGTHS.title_en}{" "}
                    {language === "en" ? "characters" : "តួអក្សរ"}
                  </span>
                )}
              </div>

              <div style={styles.field}>
                <label htmlFor="title_km" style={styles.label}>
                  {fieldLabel("title_km", language)}
                </label>
                <input
                  id="title_km"
                  type="text"
                  value={values.title_km}
                  onChange={handleTextChange("title_km")}
                  onBlur={handleBlur("title_km")}
                  placeholder={language === "en" ? "e.g. My First Bamboo Kite" : "ឧ. ខ្លែងឫស្សីដំបូងរបស់ខ្ញុំ"}
                  style={styles.input}
                />
                {errors.title_km ? (
                  <p style={styles.fieldError}>{errors.title_km}</p>
                ) : (
                  <span style={styles.counter}>
                    {charCount(values.title_km)}/{MAX_LENGTHS.title_km}{" "}
                    {language === "en" ? "characters" : "តួអក្សរ"}
                  </span>
                )}
              </div>

              <div style={styles.field}>
                <label htmlFor="contributor_en" style={styles.label}>
                  {fieldLabel("contributor_en", language)}
                </label>
                <input
                  id="contributor_en"
                  type="text"
                  value={values.contributor_en}
                  onChange={handleTextChange("contributor_en")}
                  onBlur={handleBlur("contributor_en")}
                  placeholder={language === "en" ? "e.g. My Grandma" : "ឧ. យាយរបស់ខ្ញុំ"}
                  style={styles.input}
                />
                {errors.contributor_en ? (
                  <p style={styles.fieldError}>{errors.contributor_en}</p>
                ) : (
                  <span style={styles.counter}>
                    {charCount(values.contributor_en)}/
                    {MAX_LENGTHS.contributor_en} {language === "en" ? "characters" : "តួអក្សរ"}
                  </span>
                )}
              </div>

              <div style={styles.field}>
                <label htmlFor="contributor_km" style={styles.label}>
                  {fieldLabel("contributor_km", language)}
                </label>
                <input
                  id="contributor_km"
                  type="text"
                  value={values.contributor_km}
                  onChange={handleTextChange("contributor_km")}
                  onBlur={handleBlur("contributor_km")}
                  placeholder={language === "en" ? "e.g. My Grandma" : "ឧ. យាយរបស់ខ្ញុំ"}
                  style={styles.input}
                />
                {errors.contributor_km ? (
                  <p style={styles.fieldError}>{errors.contributor_km}</p>
                ) : (
                  <span style={styles.counter}>
                    {charCount(values.contributor_km)}/
                    {MAX_LENGTHS.contributor_km} {language === "en" ? "characters" : "តួអក្សរ"}
                  </span>
                )}
              </div>

              <div style={styles.field}>
                <label htmlFor="places_en" style={styles.label}>
                  {fieldLabel("places_en", language)}
                </label>
                <input
                  id="places_en"
                  type="text"
                  value={values.places_en}
                  onChange={handleTextChange("places_en")}
                  onBlur={handleBlur("places_en")}
                  placeholder={language === "en" ? "e.g. Siem Reap" : "ឧ. សៀមរាប"}
                  style={styles.input}
                />
                {errors.places_en ? (
                  <p style={styles.fieldError}>{errors.places_en}</p>
                ) : (
                  <span style={styles.counter}>
                    {charCount(values.places_en)}/{MAX_LENGTHS.places_en}{" "}
                    {language === "en" ? "characters" : "តួអក្សរ"}
                  </span>
                )}
              </div>

              <div style={styles.field}>
                <label htmlFor="places_km" style={styles.label}>
                  {fieldLabel("places_km", language)}
                </label>
                <input
                  id="places_km"
                  type="text"
                  value={values.places_km}
                  onChange={handleTextChange("places_km")}
                  onBlur={handleBlur("places_km")}
                  placeholder={language === "en" ? "e.g. Siem Reap" : "ឧ. សៀមរាប"}
                  style={styles.input}
                />
                {errors.places_km ? (
                  <p style={styles.fieldError}>{errors.places_km}</p>
                ) : (
                  <span style={styles.counter}>
                    {charCount(values.places_km)}/{MAX_LENGTHS.places_km}{" "}
                    {language === "en" ? "characters" : "តួអក្សរ"}
                  </span>
                )}
              </div>

              <div style={styles.field}>
                <label htmlFor="description_en" style={styles.label}>
                  {fieldLabel("description_en", language)}{" "}
                  <span style={styles.required}>*</span>
                </label>
                <textarea
                  id="description_en"
                  rows={7}
                  value={values.description_en}
                  onChange={handleTextChange("description_en")}
                  onBlur={handleBlur("description_en")}
                  placeholder={language === "en" ? "Tell the story behind this kite..." : "រៀបរាប់រឿងរ៉ាវរបស់ខ្លែងនេះ..."}
                  style={styles.textarea}
                />
                {errors.description_en ? (
                  <p style={styles.fieldError}>{errors.description_en}</p>
                ) : (
                  <span style={styles.counter}>
                    {charCount(values.description_en)}/
                    {MAX_LENGTHS.description_en} {language === "en" ? "characters" : "តួអក្សរ"}
                  </span>
                )}
              </div>

              <div style={styles.field}>
                <label htmlFor="description_km" style={styles.label}>
                  {fieldLabel("description_km", language)}
                </label>
                <textarea
                  id="description_km"
                  rows={7}
                  value={values.description_km}
                  onChange={handleTextChange("description_km")}
                  onBlur={handleBlur("description_km")}
                  placeholder={language === "en" ? "Tell the story behind this kite..." : "រៀបរាប់រឿងរ៉ាវរបស់ខ្លែងនេះ..."}
                  style={styles.textarea}
                />
                {errors.description_km ? (
                  <p style={styles.fieldError}>{errors.description_km}</p>
                ) : (
                  <span style={styles.counter}>
                    {charCount(values.description_km)}/
                    {MAX_LENGTHS.description_km} {language === "en" ? "characters" : "តួអក្សរ"}
                  </span>
                )}
              </div>

              <div style={styles.field}>
                <label htmlFor="photo" style={styles.label}>
                  {language === "en" ? "Photo" : "រូបថត"}{" "}
                  <span style={styles.required}>*</span>
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
                      : language === "en"
                        ? "JPG, PNG, or WebP, max 5 MB"
                        : "JPG, PNG ឬ WebP អតិបរមា 5 MB"}
                  </span>
                )}
              </div>

              <button
                type="submit"
                style={
                  submitting
                    ? { ...styles.button, ...styles.buttonDisabled }
                    : styles.button
                }
                disabled={submitting}
              >
                {submitting
                  ? language === "en"
                    ? "Submitting..."
                    : "កំពុងដាក់ស្នើ..."
                  : language === "en"
                    ? "Submit Entry"
                    : "ដាក់ស្នើធាតុ"}
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
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
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
  successContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: 16,
  },
  successText: {
    fontSize: 18,
    color: "#16A34A",
    fontWeight: 500,
    lineHeight: 1.6,
    margin: 0,
  },
};