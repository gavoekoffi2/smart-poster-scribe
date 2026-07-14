import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

const stored = typeof window !== "undefined" ? localStorage.getItem("i18nextLng") : null;
const initialLng = stored === "fr" || stored === "en" ? stored : "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  lng: initialLng,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => {
  try {
    localStorage.setItem("i18nextLng", lng);
    document.documentElement.lang = lng;
  } catch {}
});

if (typeof document !== "undefined") {
  document.documentElement.lang = initialLng;
}

export default i18n;
