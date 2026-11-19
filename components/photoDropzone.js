"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../contexts/language-context.js";
import PhotoThumbnail from "./photoThumbnail.js";

// Bilingual copy for the dropzone, read through the site's language toggle.
const TEXT = {
  button: { en: "Choose Image", km: "ជ្រើសរើសរូបភាព" },
  hint: {
    en: "or drag & drop, or press Ctrl+V / Cmd+V to paste",
    km: "ឬអូសទម្លាក់ ឬចុច Ctrl+V / Cmd+V ដើម្បីបិទភ្ជាប់រូបភាព",
  },
  empty: { en: "No image selected", km: "មិនទាន់បានជ្រើសរើសរូបភាព" },
  count: { en: "{count} images selected", km: "បានជ្រើសរើស {count} រូបភាព" },
  remove: { en: "Remove", km: "លុប" },
};

// Only accept real image files coming from a drop or a paste.
function isImageFile(file) {
  return Boolean(file) && file.type.startsWith("image/");
}

// Turn pasted clipboard items into Files with unique names, so several
// pasted screenshots never overwrite each other during upload.
function filesFromDataTransfer(dataTransfer, prefix) {
  const items = Array.from(dataTransfer.items || []).filter(
    (item) => item.kind === "file" && item.type.startsWith("image/")
  );
  return items.map((item, index) => {
    const file = item.getAsFile();
    return new File([file], `${prefix}-${Date.now()}-${index}.png`, {
      type: item.type,
    });
  });
}

// Custom upload field: click, drag & drop, or paste (Ctrl+V / Cmd+V).
// Emits a File[] through onChange so the form keeps owning submission.
export default function PhotoDropzone({ id, inputRef, onChange }) {
  const { language } = useLanguage();
  const fallbackRef = useRef(null);
  const fileInputRef = inputRef || fallbackRef;
  const [dragging, setDragging] = useState(false);
  const [previews, setPreviews] = useState([]);
  const previewsRef = useRef([]);
  const onChangeRef = useRef(onChange);

  // Always call the freshest onChange, even from the one-time paste listener.
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Keep a ref mirroring the live previews so we can revoke object URLs
  // without re-running cleanup on every render, and clean them up on unmount.
  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);
  useEffect(() => {
    return () => previewsRef.current.forEach((p) => URL.revokeObjectURL(p.src));
  }, []);

  // Replace the current selection, revoking the object URLs it was using.
  const setSelection = (images) => {
    previewsRef.current.forEach((p) => URL.revokeObjectURL(p.src));
    setPreviews(images.map((file) => ({ file, src: URL.createObjectURL(file) })));
    onChangeRef.current(images);
  };

  const addFiles = (files) => {
    const images = Array.from(files || []).filter(isImageFile);
    if (images.length > 0) setSelection(images);
  };

  // Global paste so Cmd+V works even when the box (or nothing) is focused.
  // We ignore paste events aimed at a text input, textarea, or rich editor.
  useEffect(() => {
    const onPaste = (e) => {
      const target = e.target;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const files = filesFromDataTransfer(e.clipboardData, "pasted");
      if (files.length > 0) {
        e.preventDefault();
        addFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const t = (key, vars) => {
    let value = TEXT[key][language] || TEXT[key].en;
    if (vars) {
      Object.keys(vars).forEach((name) => {
        value = value.replaceAll(`{${name}}`, vars[name]);
      });
    }
    return value;
  };

  const count = previews.length;

  return (
    <div
      tabIndex={0}
      role="group"
      aria-label={t("button")}
      onPaste={(e) => {
        const files = filesFromDataTransfer(e.clipboardData, "pasted");
        if (files.length > 0) {
          e.preventDefault();
          addFiles(files);
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        addFiles(e.dataTransfer.files);
      }}
      style={dragging ? { ...styles.box, ...styles.boxActive } : styles.box}
    >
      <input
        id={id}
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => addFiles(e.target.files)}
        style={styles.srOnly}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        style={styles.button}
      >
        {t("button")}
      </button>
      <p style={styles.hint}>{t("hint")}</p>

      {count > 0 ? (
        <div style={styles.thumbnails}>
          {previews.map((preview) => (
            <PhotoThumbnail
              key={preview.src}
              src={preview.src}
              name={preview.file.name}
              removeLabel={t("remove")}
              onRemove={() => {
                setSelection(
                  previews.filter((p) => p.src !== preview.src).map((p) => p.file)
                );
              }}
            />
          ))}
        </div>
      ) : null}

      <p style={styles.status}>
        {count === 1
          ? `${previews[0].file.name} (${(previews[0].file.size / (1024 * 1024)).toFixed(2)} MB)`
          : count === 0
            ? t("empty")
            : t("count", { count })}
      </p>
    </div>
  );
}

const styles = {
  srOnly: {
    position: "absolute",
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    borderWidth: 0,
  },
  box: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    padding: 20,
    borderWidth: "2px",
    borderStyle: "dashed",
    borderColor: "#93C5FD",
    borderRadius: 10,
    backgroundColor: "#F8FAFF",
    textAlign: "center",
    outline: "none",
    boxSizing: "border-box",
  },
  boxActive: {
    borderColor: "#1E40AF",
    backgroundColor: "#EFF6FF",
  },
  button: {
    padding: "10px 20px",
    backgroundColor: "#1E40AF",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 6,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  },
  hint: {
    margin: 0,
    fontSize: 13,
    color: "#64748B",
    lineHeight: 1.5,
  },
  thumbnails: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  status: {
    margin: 0,
    fontSize: 13,
    color: "#1E3A8A",
  },
};


