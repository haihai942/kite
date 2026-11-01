"use client";

import { createContext, useContext, useState, useEffect, Suspense } from "react";
import { usePathname, useRouter } from "next/navigation";

const LanguageContext = createContext();

function LanguageProviderContent({ children }) {
  const [language, setLanguage] = useState("en");
  const pathname = usePathname();
  const router = useRouter();

  // Initialize language from localStorage
  useEffect(() => {
    const storedLang = localStorage.getItem("preferredLanguage");
    if (storedLang === "en" || storedLang === "km") {
      setLanguage(storedLang);
    }
  }, []);

  const toggleLanguage = () => {
    const nextLang = language === "en" ? "km" : "en";
    setLanguage(nextLang);
    localStorage.setItem("preferredLanguage", nextLang);
    
    // Update URL with new language parameter
    const params = new URLSearchParams(window.location.search);
    params.set("lang", nextLang);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function LanguageProvider({ children }) {
  return (
    <Suspense fallback={
      <LanguageContext.Provider value={{ language: "en", toggleLanguage: () => {} }}>
        {children}
      </LanguageContext.Provider>
    }>
      <LanguageProviderContent>{children}</LanguageProviderContent>
    </Suspense>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}