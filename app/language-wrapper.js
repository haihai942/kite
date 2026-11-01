"use client";

import { useEffect } from "react";
import { useLanguage } from "../contexts/language-context.js";

export default function LanguageWrapper({ children }) {
  const { language } = useLanguage();
  
  // Update html lang attribute
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);
  
  return <>{children}</>;
}