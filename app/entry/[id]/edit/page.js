"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "../../../../components/header.js";
import PhotoDropzone from "../../../../components/photoDropzone.js";
import { createClient } from "../../../../lib/supabase-client.js";
import { 
  validatePhotoFile,
  prepareFileForUpload
} from "../../../../lib/file-validation.js";
import { isUserReviewer } from "../../../../lib/reviewer-auth.js";
import { useLanguage } from "../../../../contexts/language-context.js";

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

// UI chrome for the edit page in both languages. Kept as a function so the
// strings always reflect the language active at render time. User-entered
// entry content is never translated here — only labels, buttons and messages.
function editText(language) {
  const en = language === "en";
  return {
    kicker: en ? "KHMER LIVING ARCHIVE" : "ប័ណ្ណសាររស់រវើកខ្មែរ",
    title: en ? "Edit Entry" : "កែសម្រួលធាតុ",
    subtitle: (title) => (en ? `Editing "${title}"` : `កំពុងកែសម្រួល "${title}"`),
    backToArchive: en ? "Back to the archive" : "ត្រឡប់ទៅប័ណ្ណសារ",
    characters: en ? "characters" : "តួអក្សរ",
    photoLabel: en ? "Photo" : "រូបថត",
    currentPhoto: en ? "Current photo:" : "រូបថតបច្ចុប្បន្ន៖",
    viewExistingPhoto: en ? "View existing photo" : "មើលរូបថតបច្ចុប្បន្ន",
    removePhoto: en ? "Remove photo" : "លុបរូបថត",
    undoRemove: en ? "Undo" : "មិនលុបវិញ",
    removeWillRemove: en
      ? "Photo will be removed. Please upload a new photo below."
      : "រូបថតនឹងត្រូវលុប។ សូមផ្ទុករូបថតថ្មីខាងក្រោម។",
    keepOrReplace: en
      ? "Keep current photo or upload a new one."
      : "រក្សារូបថតបច្ចុប្បន្ន ឬផ្ទុករូបថ្មី។",
    cancel: en ? "Cancel" : "បោះបង់",
    saveChanges: en ? "Save Changes" : "រក្សាទុកការផ្លាស់ប្តូរ",
    saving: en ? "Saving..." : "កំពុងរក្សាទុក...",
    loading: en ? "Loading..." : "កំពុងផ្ទុក...",
    removePhotoTitle: en ? "Remove Photo" : "លុបរូបថត",
    removePhotoConfirm: en
      ? "Are you sure you want to remove the current photo from this entry? You must upload a new photo to replace it."
      : "តើអ្នកប្រាកដជាចង់លុបរូបថតបច្ចុប្បន្នចេញពីធាតុនេះទេ? អ្នកត្រូវផ្ទុករូបថតថ្មីដើម្បីជំនួសវា។",
    noPermission: en
      ? "You don't have permission to edit this entry."
      : "អ្នកមិនមានការអនុញ្ញាតកែសម្រួលធាតុនេះទេ។",
    loadFailed: en
      ? "We couldn't load this entry. Please try again."
      : "យើងមិនអាចផ្ទុកធាតុនេះបានទេ។ សូមព្យាយាមម្តងទៀត។",
    submitFailed: en
      ? "Failed to update entry. Please try again."
      : "មិនអាចធ្វើបច្ចុប្បន្នភាពធាតុបានទេ។ សូមព្យាយាមម្តងទៀត។",
    sessionExpired: en
      ? "Your session has expired. Please log in again."
      : "វគ្គរបស់អ្នកបានផុតកំណត់។ សូមចូលម្តងទៀត។",
    // Validation messages. `label` is the already-translated field label.
    titleRequired: (label) => (en ? `${label} is required.` : `${label} ត្រូវតែបំពេញ។`),
    titleTooLong: (label, max, current) =>
      en
        ? `${label} must be ${max} characters or fewer (currently ${current}).`
        : `${label} ត្រូវតែមាន ${max} តួអក្សរ ឬតិចជាង (បច្ចុប្បន្ន ${current})។`,
    titleOnlySymbols: (label) =>
      en
        ? `${label} cannot be only spaces or symbols.`
        : `${label} មិនអាចមានតែចន្លោះ ឬសញ្ញាបានទេ។`,
    descriptionRequired: (label) =>
      en ? `${label} is required.` : `${label} ត្រូវតែបំពេញ។`,
    descriptionTooLong: (label, max, current) =>
      en
        ? `${label} must be ${max} characters or fewer (currently ${current}).`
        : `${label} ត្រូវតែមាន ${max} តួអក្សរ ឬតិចជាង (បច្ចុប្បន្ន ${current})។`,
    optionalTooLong: (label, max, current) =>
      en
        ? `${label} must be ${max} characters or fewer (currently ${current}).`
        : `${label} ត្រូវតែមាន ${max} តួអក្សរ ឬតិចជាង (បច្ចុប្បន្ន ${current})។`,
    uploadNewPhotoRequired: en
      ? "Please upload a new photo. Every entry must have at least one photo."
      : "សូមផ្ទុករូបថតថ្មី។ ធាតុនីមួយៗត្រូវតែមានរូបថតយ៉ាងតិចមួយ។",
    uploadPhotoRequired: en
      ? "Please upload a photo. Every entry must have at least one photo."
      : "សូមផ្ទុករូបថត។ ធាតុនីមួយៗត្រូវតែមានរូបថតយ៉ាងតិចមួយ។",
    // Photo-type/size messages mirror file-validation.js but in the active
    // language; the validator's own English text is only a fallback.
    photoSize: (sizeMb) =>
      en
        ? `Photo must be 5 MB or smaller. Current size: ${sizeMb} MB.`
        : `រូបថតត្រូវតែមានទំហំ 5 MB ឬតូចជាង។ ទំហំបច្ចុប្បន្ន៖ ${sizeMb} MB។`,
    photoType: en
      ? "Photo must be a JPG, PNG, or WebP image. Valid extensions: .jpg, .jpeg, .png, .webp"
      : "រូបថតត្រូវតែជាទម្រង់ JPG, PNG, ឬ WebP។ ផ្នែកបន្ថែមត្រឹមត្រូវ៖ .jpg, .jpeg, .png, .webp",
    photoChoose: en ? "Please choose a photo." : "សូមជ្រើសរើសរូបថតមួយ។",
  };
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
// Khmer mode Khmer comes first. This keeps the required fields visible on top.
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
  contributor: { en: "e.g. My Grandma", km: "ឧ. ជីដូនរបស់ខ្ញុំ" },
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

// Photo size and type validation is now handled by file-validation.js
// MAX_PHOTO_SIZE and PHOTO_TYPES are defined there

function makePhotoId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// Extract file path from Supabase Storage URL
function extractFilePathFromUrl(url) {
  if (!url) return null;
  
  // Supabase Storage URLs typically have pattern:
  // https://[project-ref].supabase.co/storage/v1/object/public/photos/[user-id]/[filename]
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    // Find the index of 'photos' in the path
    const photosIndex = pathParts.indexOf('photos');
    if (photosIndex === -1 || photosIndex >= pathParts.length - 1) {
      return null;
    }
    
    // Return everything after 'photos'
    return pathParts.slice(photosIndex + 1).join('/');
  } catch (e) {
    console.error('Error parsing photo URL:', e);
    return null;
  }
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

// Build a translated photo error from a file-validation result. The validator
// returns an English message plus a stable `code`; we re-state the same problem
// in the active language and only fall back to the validator's text if the code
// is one we do not recognise.
function photoErrorMessage(invalid, t) {
  if (!invalid) return "";
  if (invalid.code === "size") {
    return t.photoSize(((invalid.size || 0) / (1024 * 1024)).toFixed(2));
  }
  if (invalid.code === "type") return t.photoType;
  if (invalid.code === "choose") return t.photoChoose;
  return invalid.error || "";
}

function validate(values, photos, language = "en", removeCurrentPhoto = false, existingPhotoUrl = "") {
  const errors = {};
  const t = editText(language);

  // The active language's title and description are required; the other
  // language's fields are optional (length-checked only, below).
  const titleField = `title_${language}`;
  const descriptionField = `description_${language}`;
  const titleLabel = fieldLabel(titleField, language);
  const descriptionLabel = fieldLabel(descriptionField, language);

  // Title (active language): required, max chars, not blank spaces or symbols only.
  if (!values[titleField]) {
    errors[titleField] = t.titleRequired(titleLabel);
  } else if (charCount(values[titleField]) > MAX_LENGTHS[titleField]) {
    errors[titleField] = t.titleTooLong(
      titleLabel,
      MAX_LENGTHS[titleField],
      charCount(values[titleField])
    );
  } else if (!/[\p{L}\p{N}]/u.test(values[titleField])) {
    errors[titleField] = t.titleOnlySymbols(titleLabel);
  }

  // Description (active language): required, max chars, cannot be blank spaces.
  if (!values[descriptionField]) {
    errors[descriptionField] = t.descriptionRequired(descriptionLabel);
  } else if (charCount(values[descriptionField]) > MAX_LENGTHS[descriptionField]) {
    errors[descriptionField] = t.descriptionTooLong(
      descriptionLabel,
      MAX_LENGTHS[descriptionField],
      charCount(values[descriptionField])
    );
  }

  // All remaining fields are optional: length checks only. This includes the
  // other language's title and description, plus both contributor/place fields.
  const optionalFields = Object.keys(EMPTY_VALUES).filter(
    (field) => field !== titleField && field !== descriptionField
  );
  optionalFields.forEach((field) => {
    if (values[field] && charCount(values[field]) > MAX_LENGTHS[field]) {
      errors[field] = t.optionalTooLong(
        fieldLabel(field, language),
        MAX_LENGTHS[field],
        charCount(values[field])
      );
    }
  });

  // Photo validation for editing
  // Photo is required for entries - either keep existing or upload new
  // User can intentionally remove photo with "Remove photo" checkbox

  const hasNewPhotos = photos && photos.length > 0;

  if (removeCurrentPhoto) {
    // User is removing the current photo
    // If removing current photo, a new photo MUST be uploaded
    if (!hasNewPhotos) {
      errors.photo = t.uploadNewPhotoRequired;
    } else {
      // Validate the new photos being uploaded
      const invalid = photos
        .map((file) => validatePhotoFile(file))
        .find((validation) => !validation.isValid);
      if (invalid) {
        errors.photo = photoErrorMessage(invalid, t);
      }
    }
  } else if (hasNewPhotos) {
    // User is uploading new photos (optional replacement) - validate them
    const invalid = photos
      .map((file) => validatePhotoFile(file))
      .find((validation) => !validation.isValid);
    if (invalid) {
      errors.photo = photoErrorMessage(invalid, t);
    }
  } else if (!existingPhotoUrl) {
    // No existing photo, no new photo uploaded, not removing (nothing to remove)
    // Entry would have no photo - require a photo
    errors.photo = t.uploadPhotoRequired;
  }
  // else: keeping existing photo (existingPhotoUrl exists) - no validation needed

  return errors;
}

function EditContent() {
  const { id } = useParams();
  const { language } = useLanguage();
  const router = useRouter();

  // Active language's fields first (so the required ones are at the top), then
  // the other language's. The `*` badge follows isRequiredField.
  const orderedFields = buildFieldOrder(language);

  // UI chrome for the active language, read on every render so the page
  // re-translates the instant the header toggle flips.
  const t = editText(language);

  const [supabase] = useState(() => createClient());
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [values, setValues] = useState(EMPTY_VALUES);
  const [photos, setPhotos] = useState([]);
  const [photoKey, setPhotoKey] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [removeCurrentPhoto, setRemoveCurrentPhoto] = useState(false);
  const [showPhotoRemoveConfirm, setShowPhotoRemoveConfirm] = useState(false);

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
          setError(editText(language).noPermission);
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
        if (active) setError(editText(language).loadFailed);
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
    const newErrors = validate(newValues, photos, language, removeCurrentPhoto, existingPhotoUrl);
    if (newErrors[field]) {
      setErrors((prev) => ({ ...prev, [field]: newErrors[field] }));
    }
  };

  const handlePhotoChange = (files) => {
    const nextPhotos = files || [];
    setPhotos(nextPhotos);

    // When user selects a new photo, reset the remove photo state
    if (nextPhotos.length > 0 && removeCurrentPhoto) {
      setRemoveCurrentPhoto(false);
    }

    // Always validate when photos change
    const nextErrors = validate(values, nextPhotos, language, removeCurrentPhoto, existingPhotoUrl);
    setErrors((prev) => ({ ...prev, photo: nextErrors.photo || "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trimmed = trimValues(values);
    setValues(trimmed);
    
    const validationErrors = validate(trimmed, photos, language, removeCurrentPhoto, existingPhotoUrl);
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
        throw new Error(editText(language).sessionExpired);
      }
      
      // Get existing photo URL and prepare for possible deletion
      const existingPhotoUrl = entry?.photo_urls?.[0] || "";
      const existingFilePath = extractFilePathFromUrl(existingPhotoUrl);
      let photoToDeletePath = null;

      // Handle photo removal or replacement. New uploads replace the existing
      // photo(s); each file is uploaded to <user_id>/<random_uuid>.<ext>.
      let finalPhotoUrls = existingPhotoUrl ? [existingPhotoUrl] : [];

      if (photos.length > 0) {
        finalPhotoUrls = [];
        for (const file of photos) {
          const filePreparation = prepareFileForUpload(file);
          if (!filePreparation.isValid) {
            throw new Error(filePreparation.error);
          }

          const safeExtension = filePreparation.safeExtension;
          const newFilePath = `${currentUser.id}/${makePhotoId()}.${safeExtension}`;
          const { error: uploadError } = await supabase.storage
            .from("photos")
            .upload(newFilePath, file, {
              contentType: filePreparation.contentType,
              upsert: false,
            });
          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from("photos")
            .getPublicUrl(newFilePath);
          finalPhotoUrls.push(urlData.publicUrl);
        }

        // Mark the old photo for deletion if it exists and is being replaced
        if (existingFilePath) {
          photoToDeletePath = existingFilePath;
        }
      } else if (removeCurrentPhoto) {
        // User wants to remove current photo without uploading a new one
        // This should not pass validation, but handle defensively
        photoToDeletePath = existingFilePath;
        finalPhotoUrls = [];
      }
      
      // Check if user is a reviewer
      const isReviewer = await isUserReviewer(supabase, currentUser);
      
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
      };
      
      // Update photo_urls based on final state
      updateData.photo_urls = finalPhotoUrls;
      
      // Set status to 'pending' unless user is a reviewer
      if (!isReviewer) {
        updateData.status = 'pending';
      }
      
      const { data: updatedRows, error } = await supabase
        .from("entries")
        .update(updateData)
        .eq("id", id)
        .eq("owner", currentUser.id) // Ensure user owns the entry
        .select(); // Check that a row came back
      
      if (error) throw error;
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error("Entry not found or you don't have permission to edit it.");
      }
      
      // Delete old photo from storage if marked for deletion
      if (photoToDeletePath) {
        try {
          const { error: deleteError } = await supabase.storage
            .from("photos")
            .remove([photoToDeletePath]);
          
          if (deleteError) {
            console.warn("Failed to delete old photo from storage:", deleteError);
            // Don't throw - we've already updated the entry successfully
          }
        } catch (deleteErr) {
          console.warn("Error deleting old photo:", deleteErr);
          // Continue - the entry update was successful
        }
      }
      
      // Redirect back to the entry page
      router.push(`/entry/${id}${language && language !== "en" ? `?lang=${language}` : ""}`);
    } catch (err) {
      // Log the real error, but only show a translated, friendly message so a
      // raw Supabase/English string never leaks into the Khmer UI.
      console.error("Error updating entry:", err);
      setSubmitError(editText(language).submitFailed);
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/entry/${id}${language && language !== "en" ? `?lang=${language}` : ""}`);
  };

  const handlePhotoRemoveConfirm = () => {
    setRemoveCurrentPhoto(true);
    // Clear the current photo upload if any
    setPhotos([]);
    // Reset the file input
    setPhotoKey(prev => prev + 1);
    // Close the confirmation modal
    setShowPhotoRemoveConfirm(false);
  };

  if (authLoading || loading) {
    return (
      <>
        <Header />
        <main style={styles.wrap}>
          <div style={styles.card}>
            <p style={styles.loadingText}>{t.loading}</p>
          </div>
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <main style={styles.wrap}>
          <div style={styles.header}>
            <p style={styles.kicker}>{t.kicker}</p>
            <h1 style={styles.title}>{t.title}</h1>
          </div>
          <div style={styles.card}>
            <p style={styles.errorText}>{error}</p>
            <Link href="/browse" style={styles.buttonLink}>
              {t.backToArchive}
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
      <Header />
      <main style={styles.wrap}>
        <div style={styles.header}>
          <p style={styles.kicker}>{t.kicker}</p>
          <h1 style={styles.title}>{t.title}</h1>
          {entry && (
            <p style={styles.subtitle}>
              {t.subtitle(entry.title_en || entry.title_km || "—")}
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
                      {t.characters}
                    </span>
                  )}
                </div>
              );
            })}

            <div style={styles.field}>
              <label htmlFor="photo" style={styles.label}>
                {t.photoLabel} <span style={styles.required}>*</span>
              </label>
              {existingPhotoUrl && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 14, color: "#64748B", marginBottom: 8 }}>
                    {t.currentPhoto}{" "}
                    <a href={existingPhotoUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#1E40AF" }}>
                      {t.viewExistingPhoto}
                    </a>
                  </p>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (removeCurrentPhoto) {
                          // If already in removal mode, clicking should keep the photo
                          setRemoveCurrentPhoto(false);
                          // Clear any photo validation error since we're keeping the photo
                          if (errors.photo && errors.photo === t.uploadNewPhotoRequired) {
                            setErrors(prev => ({ ...prev, photo: "" }));
                          }
                        } else {
                          // Show confirmation modal before removing photo
                          setShowPhotoRemoveConfirm(true);
                        }
                      }}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: removeCurrentPhoto ? "#FEF2F2" : "#F1F5F9",
                        border: "1px solid #FECACA",
                        color: "#DC2626",
                        borderRadius: 4,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer"
                      }}
                    >
                      {removeCurrentPhoto ? t.undoRemove : t.removePhoto}
                    </button>
                  </div>
                  <p style={{ fontSize: 13, color: "#94A3B8" }}>
                    {removeCurrentPhoto 
                      ? t.removeWillRemove 
                      : t.keepOrReplace}
                  </p>
                </div>
              )}
              <PhotoDropzone
                key={photoKey}
                id="photo"
                onChange={handlePhotoChange}
              />
              {errors.photo ? (
                <p style={{ ...styles.fieldError, marginTop: 8 }}>{errors.photo}</p>
              ) : removeCurrentPhoto ? (
                <span style={{ ...styles.counter, marginTop: 8 }}>
                  {t.removeWillRemove}
                </span>
              ) : existingPhotoUrl && photos.length === 0 ? (
                <span style={{ ...styles.counter, marginTop: 8 }}>
                  {t.keepOrReplace}
                </span>
              ) : null}
            </div>

            <div style={styles.buttonGroup}>
              <button
                type="button"
                onClick={handleCancel}
                style={styles.cancelButton}
                disabled={submitting}
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                style={{
                  ...styles.submitButton,
                  ...(submitting ? styles.buttonDisabled : {}),
                }}
                disabled={submitting}
              >
                {submitting ? t.saving : t.saveChanges}
              </button>
            </div>
          </form>
         </div>

        <footer style={styles.footer}>
            {language === "en"
              ? "Archived Kites — Preserving stories and memories, one kite at a time."
              : "បណ្ណសារខ្លែង — រក្សាទុករឿងរ៉ាវ និងការចងចាំរបស់យើង។"}
          </footer>

          {/* Photo Removal Confirmation Modal */}
          {showPhotoRemoveConfirm && (
            <div 
              style={styles.modalBackdrop}
              onClick={(e) => {
                // Close modal when clicking on backdrop (outside modal content)
                if (e.target === e.currentTarget) {
                  setShowPhotoRemoveConfirm(false);
                }
              }}
            >
              <div style={styles.modalContent}>
                <h3 style={styles.modalTitle}>{t.removePhotoTitle}</h3>
                <p style={styles.modalText}>
                  {t.removePhotoConfirm} 
                </p>
                <div style={styles.modalButtons}>
                  <button
                    type="button"
                    onClick={() => setShowPhotoRemoveConfirm(false)}
                    style={styles.modalCancelButton}
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={handlePhotoRemoveConfirm}
                    style={styles.modalConfirmButton}
                  >
                    {t.removePhotoTitle}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </>
    );
}

export default function EditPage() {
  return (
    <Suspense
      fallback={
        // Fallback renders before the language context is available, so it
        // shows no text rather than an English-only string.
        <div style={{ padding: 40, textAlign: "center" }} aria-busy="true" />
      }
    >
      <EditContent />
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
  // Modal styles for photo removal confirmation
  modalBackdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    maxWidth: 400,
    width: "90%",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#93C5FD",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: "#1E3A8A",
    margin: "0 0 16px",
  },
  modalText: {
    fontSize: 16,
    color: "#64748B",
    lineHeight: 1.6,
    margin: "0 0 24px",
  },
  modalButtons: {
    display: "flex",
    gap: 12,
    justifyContent: "flex-end",
  },
  modalCancelButton: {
    padding: "10px 20px",
    backgroundColor: "#F8FAFC",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#CBD5E1",
    color: "#475569",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    flex: 1,
  },
  modalConfirmButton: {
    padding: "10px 20px",
    backgroundColor: "#DC2626",
    border: "none",
    color: "#FFFFFF",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    flex: 1,
  },
};