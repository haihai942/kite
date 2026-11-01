import collection from "../collection.config.js";
import { LanguageProvider } from "../contexts/language-context.js";
import LanguageWrapper from "./language-wrapper.js";

export const metadata = {
  title: `${collection.name} — Khmer Living Archive`,
  description: collection.description,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          backgroundColor: "#F0F8FF",
          color: "#6387eb",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          minHeight: "100vh",
        }}
      >
        <LanguageProvider>
          <LanguageWrapper>
            {children}
          </LanguageWrapper>
        </LanguageProvider>
      </body>
    </html>
  );
}
