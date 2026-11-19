"use client";

import { useLanguage } from "../contexts/language-context.js";

// Field labels for the card, translated for the active language. The Khmer
// wording matches the labels used on the contribute/edit forms so the whole
// site stays consistent when the toggle is switched to ខ្មែរ.
const LABELS = {
  title: { en: "TITLE", km: "ចំណងជើង" },
  contributor: { en: "CONTRIBUTOR", km: "អ្នកចែករំលែក" },
  place: { en: "PLACE", km: "ទីកន្លែង" },
  description: { en: "DESCRIPTION", km: "ការពិពណ៌នា" },
};

// Component for displaying individual archive entries
// Receives props: title, contributor, place, description, and image
export default function EntryCard({ title, contributor, place, description, image }) {
  const { language } = useLanguage();

  // Pick the label for the active language, falling back to English.
  const label = (key) => LABELS[key][language] || LABELS[key].en;

  // Styles for different parts of the card
  const cardStyle = {
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#93C5FD",
    borderRadius: 10,
    boxSizing: "border-box",
    height: "100%",
  };

  const labelStyle = {
    fontFamily: "'Courier New', monospace",
    fontSize: 11,
    color: "#1E40AF",
    fontWeight: 600,
    marginBottom: 4,
  };

  const valueStyle = {
    fontSize: 13,
    lineHeight: 1.5,
    marginBottom: 10,
    color: "#1E3A8A",
    wordBreak: "break-word",
  };

  const descriptionStyle = {
    fontSize: 13,
    lineHeight: 1.5,
    color: "#1E3A8A",
    wordBreak: "break-word",
  };

  const imageWrapStyle = {
    marginBottom: 12,
    overflow: "hidden",
    borderRadius: 8,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#93C5FD",
    backgroundColor: "#F1F5F9",
  };

  const imageStyle = {
    display: "block",
    width: "100%",
    height: "auto",
    maxHeight: 150,
    objectFit: "cover",
  };

  return (
    <div style={cardStyle}>
      {image ? (
        <div style={imageWrapStyle}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={title ? `Image for ${title}` : "Entry image"}
            loading="lazy"
            style={imageStyle}
          />
        </div>
      ) : null}

      <p style={labelStyle}>{label("title")}</p>
      <p style={valueStyle}>{title}</p>

      <p style={labelStyle}>{label("contributor")}</p>
      <p style={valueStyle}>{contributor}</p>

      <p style={labelStyle}>{label("place")}</p>
      <p style={valueStyle}>{place}</p>

      <p style={labelStyle}>{label("description")}</p>
      <p style={descriptionStyle}>{description}</p>
    </div>
  );
}