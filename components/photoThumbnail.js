"use client";

// A single image preview with a remove button. Kept in its own file so the
// dropzone stays small (AGENTS.md: one component per file).
export default function PhotoThumbnail({ src, name, removeLabel, onRemove }) {
  return (
    <div style={styles.item}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={name || ""} style={styles.image} />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${removeLabel} ${name || ""}`.trim()}
        style={styles.remove}
      >
        {removeLabel}
      </button>
    </div>
  );
}

const styles = {
  item: {
    position: "relative",
    width: 96,
    height: 96,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#93C5FD",
    backgroundColor: "#F1F5F9",
    boxSizing: "border-box",
  },
  image: {
    display: "block",
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  remove: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: "4px 0",
    border: "none",
    backgroundColor: "rgba(220, 38, 38, 0.9)",
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
};
