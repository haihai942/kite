"use client";

import { useLanguage } from "../contexts/language-context.js";
import { fallbackLanguageLabel } from "../lib/entry-text.js";

// Field labels for the card, translated for the active language. The Khmer
// wording matches the labels used on the contribute/edit forms so the whole
// site stays consistent when the toggle is switched to ខ្មែរ.
const LABELS = {
  title: { en: "TITLE", km: "ចំណងជើង" },
  contributor: { en: "CONTRIBUTOR", km: "អ្នកចែករំលែក" },
  place: { en: "PLACE", km: "ទីកន្លែង" },
  description: { en: "DESCRIPTION", km: "ការពិពណ៌នា" },
};

// Card styles are static, so they live at module scope.
const styles = {
  card: {
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#93C5FD",
    borderRadius: 10,
    boxSizing: "border-box",
    height: "100%",
  },
  label: {
    fontFamily: "'Courier New', monospace",
    fontSize: 11,
    color: "#1E40AF",
    fontWeight: 600,
    marginBottom: 4,
  },
  value: {
    fontSize: 13,
    lineHeight: 1.5,
    marginBottom: 10,
    color: "#1E3A8A",
    wordBreak: "break-word",
  },
  description: {
    fontSize: 13,
    lineHeight: 1.5,
    color: "#1E3A8A",
    wordBreak: "break-word",
  },
  // Subtle hint shown when a field's text was borrowed from the other language.
  hint: {
    fontSize: 11,
    color: "#94A3B8",
    fontStyle: "italic",
    marginTop: -6,
    marginBottom: 10,
  },
  imageWrap: {
    marginBottom: 12,
    overflow: "hidden",
    borderRadius: 8,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#93C5FD",
    backgroundColor: "#F1F5F9",
  },
  image: {
    display: "block",
    width: "100%",
    height: "auto",
    maxHeight: 150,
    objectFit: "cover",
  },
};

// Component for displaying individual archive entries.
// Receives props: title, contributor, place, description, image, plus optional
// `*Fallback` booleans that flag values borrowed from the other language.
export default function EntryCard({
  title,
  contributor,
  place,
  description,
  image,
  titleFallback,
  contributorFallback,
  placeFallback,
  descriptionFallback,
}) {
  const { language } = useLanguage();

  // Pick the label for the active language, falling back to English.
  const label = (key) => LABELS[key][language] || LABELS[key].en;

  // Subtle hint shown under a field whose text came from the other language,
  // e.g. "shown in English" while browsing in Khmer. "" when not borrowed.
  const hint = (isFallback) => {
    if (!isFallback) return "";
    const from = language === "en" ? "km" : "en";
    const name = fallbackLanguageLabel(from, language);
    return language === "en" ? `shown in ${name}` : `បង្ហាញជា${name}`;
  };

  // The four bilingual fields in display order. `style` keeps the description
  // flush (no bottom margin) as before; `borrowed` drives the fallback hint.
  const fields = [
    { key: "title", text: title, borrowed: titleFallback, style: styles.value },
    { key: "contributor", text: contributor, borrowed: contributorFallback, style: styles.value },
    { key: "place", text: place, borrowed: placeFallback, style: styles.value },
    { key: "description", text: description, borrowed: descriptionFallback, style: styles.description },
  ];

  return (
    <div style={styles.card}>
      {image ? (
        <div style={styles.imageWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={title ? `Image for ${title}` : "Entry image"}
            loading="lazy"
            style={styles.image}
          />
        </div>
      ) : null}

      {fields.map((field) => (
        <div key={field.key}>
          <p style={styles.label}>{label(field.key)}</p>
          <p style={field.style}>{field.text}</p>
          {hint(field.borrowed) && <p style={styles.hint}>{hint(field.borrowed)}</p>}
        </div>
      ))}
    </div>
  );
}
