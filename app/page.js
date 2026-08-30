import collection from "../collection.config.js";
import EntryCard from "../components/entryCard.js";
import { readFileSync } from "fs";
import { join } from "path";

const styles = {
  wrap: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "80px 24px",
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
    lineHeight: 1.1,
    color: "#1E3A8A",
  },
  description: {
    fontSize: 18,
    color: "#1E3A8A",
    lineHeight: 1.6,
    margin: 0,
  },
  card: {
    marginTop: 48,
    padding: 24,
    backgroundColor: "#FFFFFF",
    border: "1px solid #93C5FD",
    borderRadius: 10,
  },
  cardLabel: {
    fontFamily: "'Courier New', monospace",
    fontSize: 12,
    color: "#1E40AF",
    fontWeight: 600,
    margin: 0,
  },
  cardValue: {
    fontSize: 16,
    margin: "6px 0 0",
    color: "#1E3A8A",
  },
  count: {
    fontFamily: "'Courier New', monospace",
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: 600,
    marginTop: 48,
  },
  footer: {
    marginTop: 64,
    paddingTop: 24,
    borderTop: "1px solid #93C5FD",
    fontSize: 13,
    color: "#64748B",
  },
};

export default function Home() {
  // Read and parse entries from data/entry.md
  const entries = [];
  try {
    const filePath = join(process.cwd(), "data", "entry.md");
    const fileContent = readFileSync(filePath, "utf8");
    
    // Split by --- and parse each entry
    const entryBlocks = fileContent.trim().split("---");
    
    entryBlocks.forEach(block => {
      if (block.trim()) {
        const lines = block.trim().split("\n");
        const entry = {};
        
        lines.forEach(line => {
          const [key, ...valueParts] = line.split(": ");
          if (key && valueParts.length > 0) {
            const value = valueParts.join(": ");
            entry[key.trim().toLowerCase()] = value.trim();
          }
        });
        
        if (entry.title) {
          entries.push(entry);
        }
      }
    });
  } catch (error) {
    console.error("Error reading entries:", error);
  }

  return (
    <main style={styles.wrap}>
      <p style={styles.kicker}>KHMER LIVING ARCHIVE</p>
      <h1 style={styles.title}>{collection.name}</h1>
      <p style={styles.description}>{collection.description}</p>

      <div style={styles.card}>
        <p style={styles.cardLabel}>CURATED BY</p>
        <p style={styles.cardValue}>{collection.curator}</p>
      </div>
      <div style={styles.card}>
        <p style={styles.cardLabel}>SOURCE</p>
        <p style={styles.cardValue}>{collection.source}</p>
      </div>

      <p style={styles.count}>entries in the archive: {entries.length}</p>

      {entries.map((entry, index) => (
        <EntryCard
          key={index}
          title={entry.title || "Untitled"}
          contributor={entry.contributor || "Unknown"}
          place={entry.place || "Unknown"}
          description={entry.description || "No description available"}
          image={entry.image ? `/api/images/${entry.image}` : null}
        />
      ))}

      <footer style={styles.footer}>
        Built in ICT 340 — Vibe Coding, Archived Kites new thing.
      </footer>
    </main>
  );
}