"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "../../components/header.js";
import PhotoDropzone from "../../components/photoDropzone.js";
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

// The four text fields, each in both languages.
const FIELD_BASES = ["title", "contributor", "places", "description"];

// Fields that render as a <textarea> rather than a single-line <input>.
function isLongField(field) {
  return field.startsWith("description");
}

// The active language's title and description are required; their translations
// are optional. Contributor and place stay optional in both languages.
function isRequiredField(field, language) {
  return field === `title_${language}` || field === `description_${language}`;
}

// The form shows the active language's fields first, then the other language's.
// The active language's title and description are the required ones (see
// isRequiredField), so putting them first means the user fills what is required
// before the optional translation — in English mode English comes first, in
// Khmer mode Khmer comes first. This is what makes Khmer mode usable: without
// it the required Khmer fields sit at the bottom and get skipped.
function buildFieldOrder(language) {
  const first = language === "km" ? "km" : "en";
  const second = first === "en" ? "km" : "en";
  return FIELD_BASES.flatMap((base) => [`${base}_${first}`, `${base}_${second}`]);
}

// Example placeholder text for each field, in both languages.
const PLACEHOLDERS = {
  title: {
    en: "e.g. My First Bamboo Kite",
    km: "ឧ. ខ្លែងឫស្សីដំបូងរបស់ខ្ញុំ",
  },
  contributor: { en: "e.g. My Grandma", km: "ឧ. យាយរបស់ខ្ញុំ" },
  places: { en: "e.g. Siem Reap", km: "ឧ. សៀមរាប" },
  description: {
    en: "Tell the story behind this kite...",
    km: "រៀបរាប់រឿងរ៉ាវរបស់ខ្លែងនេះ...",
  },
};

// Placeholder text for a field, in the active language.
function fieldPlaceholder(field, language) {
  const base = field.replace(/_(en|km)$/, "");
  const options = PLACEHOLDERS[base];
  if (!options) return "";
  return options[language] || options.en;
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

function validate(values, photos, language = "en") {
  const errors = {};
  const en = language === "en";

  // The active language's title and description are required; the other
  // language's fields are optional (length-checked only, below).
  const titleField = `title_${language}`;
  const descriptionField = `description_${language}`;
  const titleLabel = fieldLabel(titleField, language);
  const descriptionLabel = fieldLabel(descriptionField, language);

  // Title (active language): required, max chars, not blank spaces or symbols only.
  if (!values[titleField]) {
    errors[titleField] = en
      ? `${titleLabel} is required.`
      : `តម្រូវឱ្យបំពេញ${titleLabel}។`;
  } else if (charCount(values[titleField]) > MAX_LENGTHS[titleField]) {
    errors[titleField] = en
      ? `${titleLabel} must be ${MAX_LENGTHS[titleField]} characters or fewer (currently ${charCount(values[titleField])}).`
      : `${titleLabel} ត្រូវតែមាន ${MAX_LENGTHS[titleField]} តួអក្សរ ឬតិចជាង (បច្ចុប្បន្ន ${charCount(values[titleField])})។`;
  } else if (!/[\p{L}\p{N}]/u.test(values[titleField])) {
    errors[titleField] = en
      ? `${titleLabel} cannot be only spaces or symbols.`
      : `${titleLabel} មិនអាចជាចន្លោះទទេ ឬនិមិត្តសញ្ញាតែប៉ុណ្ណោះបានទេ។`;
  }

  // Description (active language): required, max chars, cannot be blank spaces.
  if (!values[descriptionField]) {
    errors[descriptionField] = en
      ? `${descriptionLabel} is required.`
      : `តម្រូវឱ្យបំពេញ${descriptionLabel}។`;
  } else if (charCount(values[descriptionField]) > MAX_LENGTHS[descriptionField]) {
    errors[descriptionField] = en
      ? `${descriptionLabel} must be ${MAX_LENGTHS[descriptionField]} characters or fewer (currently ${charCount(values[descriptionField])}).`
      : `${descriptionLabel} ត្រូវតែមាន ${MAX_LENGTHS[descriptionField]} តួអក្សរ ឬតិចជាង (បច្ចុប្បន្ន ${charCount(values[descriptionField])})។`;
  }

  // All remaining fields are optional: length checks only. This includes the
  // other language's title and description, plus both contributor/place fields.
  const optionalFields = Object.keys(EMPTY_VALUES).filter(
    (field) => field !== titleField && field !== descriptionField
  );
  optionalFields.forEach((field) => {
    if (values[field] && charCount(values[field]) > MAX_LENGTHS[field]) {
      const label = fieldLabel(field, language);
      errors[field] = en
        ? `${label} must be ${MAX_LENGTHS[field]} characters or fewer (currently ${charCount(values[field])}).`
        : `${label} ត្រូវតែមាន ${MAX_LENGTHS[field]} តួអក្សរ ឬតិចជាង (បច្ចុប្បន្ន ${charCount(values[field])})។`;
    }
  });

  // Photos: at least one required, each strictly validated via file-validation.js
  if (!photos || photos.length === 0) {
    errors.photo = en ? "Please choose a photo." : "សូមជ្រើសរើសរូបថតមួយ។";
  } else {
    const invalid = photos
      .map((file) => validatePhotoFile(file))
      .find((validation) => !validation.isValid);
    if (invalid) {
      errors.photo = photoErrorMessage(invalid, en);
    }
  }

  return errors;
}

// Translate a file-validation result into the active language. The validator
// returns an English message plus a stable `code`; we re-state the problem in
// Khmer when needed and fall back to the validator's text otherwise.
function photoErrorMessage(invalid, en) {
  if (!invalid) return "";
  if (invalid.code === "size") {
    const sizeMb = ((invalid.size || 0) / (1024 * 1024)).toFixed(2);
    return en
      ? `Photo must be 5 MB or smaller. Current size: ${sizeMb} MB.`
      : `រូបថតត្រូវតែមានទំហំ 5 MB ឬតូចជាង។ ទំហំបច្ចុប្បន្ន៖ ${sizeMb} MB។`;
  }
  if (invalid.code === "type") {
    return en
      ? "Photo must be a JPG, PNG, or WebP image. Valid extensions: .jpg, .jpeg, .png, .webp"
      : "រូបថតត្រូវតែជាទម្រង់ JPG, PNG, ឬ WebP។ ផ្នែកបន្ថែមត្រឹមត្រូវ៖ .jpg, .jpeg, .png, .webp";
  }
  if (invalid.code === "choose") {
    return en ? "Please choose a photo." : "សូមជ្រើសរើសរូបថតមួយ។";
  }
  return invalid.error || "";
}

function ContributeContent() {
  const router = useRouter();
  const { language } = useLanguage();
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Active language's fields first (so the required ones are at the top), then
  // the other language's. The `*` badge follows isRequiredField.
  const orderedFields = buildFieldOrder(language);

  const [values, setValues] = useState(EMPTY_VALUES);
  const [photos, setPhotos] = useState([]);
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
    const nextErrors = validate(trimValues(values), photos, language);
    setErrors((prev) => ({ ...prev, [field]: nextErrors[field] || "" }));
  };

  const handlePhotoChange = (files) => {
    const nextPhotos = files || [];
    setPhotos(nextPhotos);
    if (errors.photo) {
      const nextErrors = validate(trimValues(values), nextPhotos, language);
      setErrors((prev) => ({ ...prev, photo: nextErrors.photo || "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    const trimmed = trimValues(values);
    const nextErrors = validate(trimmed, photos, language);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      // Show a visible summary so the user knows the form did not save, and
      // scrolls to the fields that need attention (the per-field errors are
      // rendered under each input).
      setSubmitError(
        language === "en"
          ? "Please fix the highlighted fields before submitting."
          : "សូមកែតម្រូវវាលដែលបានសម្គាល់ មុនពេលដាក់ស្នើ។"
      );
      return;
    }

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

      // Upload each photo to the 'photos' bucket: <user_id>/<random_uuid>.<ext>
      const photoUrls = [];
      for (const file of photos) {
        // Strict file validation and preparation
        const filePreparation = prepareFileForUpload(file);
        if (!filePreparation.isValid) {
          throw new Error(filePreparation.error);
        }

        const safeExtension = filePreparation.safeExtension;
        const filePath = `${currentUser.id}/${makePhotoId()}.${safeExtension}`;
        const { error: uploadError } = await supabase.storage
          .from("photos")
          .upload(filePath, file, {
            contentType: filePreparation.contentType,
            upsert: false,
          });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("photos")
          .getPublicUrl(filePath);
        photoUrls.push(urlData.publicUrl);
      }

      // Insert the new entry, listing every column explicitly.
      // The database default will set status to 'pending'.
      // `.select()` asks PostgREST to return the inserted row; that both
      // confirms the write actually happened (RLS can silently affect 0 rows)
      // and gives us the created id for diagnostics.
      const { data: insertedRows, error: insertError } = await supabase
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
          photo_urls: photoUrls,
        })
        .select();
      if (insertError) throw insertError;
      if (!insertedRows || insertedRows.length === 0) {
        // No error but nothing came back: RLS blocked the insert. Surface it
        // instead of showing a false success.
        throw new Error("Insert returned no rows (blocked by RLS or missing policy).");
      }

      // Show success message instead of redirecting
      setSubmitted(true);
    } catch (err) {
      // Log the full error details (message, code, hint) so a failure is
      // diagnosable in the console instead of showing an empty `{}`.
      console.error("Error submitting entry:", {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        error: err,
      });
      // Build a readable reason from the Supabase error so the on-screen
      // banner says what actually went wrong (not just "please try again").
      const reason =
        err?.message ||
        err?.details ||
        err?.hint ||
        (typeof err === "string" ? err : JSON.stringify(err));
      setSubmitError(
        language === "en"
          ? `We couldn't save your entry. ${reason || "Please try again."}`
          : `យើងមិនអាចរក្សាទុកធាតុរបស់អ្នកបានទេ។ ${reason || "សូមព្យាយាមម្តងទៀត។"}`
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
          <p style={styles.kicker}>
            {language === "en" ? "KHMER LIVING ARCHIVE" : "ប័ណ្ណសាររស់រវើកខ្មែរ"}
          </p>
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

              {orderedFields.map((field) => {
                // The active language's title/description are required; every
                // other field is optional. This drives both the order below and
                // the * badge on the label.
                const required = isRequiredField(field, language);
                return (
                  <div key={field} style={styles.field}>
                    <label htmlFor={field} style={styles.label}>
                      {fieldLabel(field, language)}
                      {required && (
                        <>
                          {" "}
                          <span style={styles.required}>*</span>
                        </>
                      )}
                    </label>
                    {isLongField(field) ? (
                      <textarea
                        id={field}
                        rows={7}
                        value={values[field]}
                        onChange={handleTextChange(field)}
                        onBlur={handleBlur(field)}
                        placeholder={fieldPlaceholder(field, language)}
                        style={styles.textarea}
                      />
                    ) : (
                      <input
                        id={field}
                        type="text"
                        value={values[field]}
                        onChange={handleTextChange(field)}
                        onBlur={handleBlur(field)}
                        placeholder={fieldPlaceholder(field, language)}
                        style={styles.input}
                      />
                    )}
                    {errors[field] ? (
                      <p style={styles.fieldError}>{errors[field]}</p>
                    ) : (
                      <span style={styles.counter}>
                        {charCount(values[field])}/{MAX_LENGTHS[field]}{" "}
                        {language === "en" ? "characters" : "តួអក្សរ"}
                      </span>
                    )}
                  </div>
                );
              })}

              <div style={styles.field}>
                <label htmlFor="photo" style={styles.label}>
                  {language === "en" ? "Photo" : "រូបថត"}{" "}
                  <span style={styles.required}>*</span>
                </label>
                <PhotoDropzone
                  key={photoKey}
                  id="photo"
                  onChange={handlePhotoChange}
                />
                {errors.photo ? (
                  <p style={{ ...styles.fieldError, marginTop: 8 }}>
                    {errors.photo}
                  </p>
                ) : null}
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
          {language === "en"
            ? "Archived Kites — Preserving stories and memories, one kite at a time."
            : "បណ្ណសារខ្លែង — រក្សាទុករឿងរ៉ាវ និងការចងចាំរបស់យើង។"}
        </footer>
      </main>
    </>
  );
}

export default function ContributePage() {
  return (
    <Suspense
      fallback={
        // Fallback renders before the language context is available, so it
        // shows no text rather than an English-only string.
        <div style={{ padding: 40, textAlign: "center" }} aria-busy="true" />
      }
    >
      <ContributeContent />
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