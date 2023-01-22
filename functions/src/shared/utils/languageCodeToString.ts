export function languageCodeToString(code: string): string {
  const languageNames: Record<string, string> = {
    en: "English",
    fr: "French",
    de: "German",
    es: "Spanish",
    it: "Italian",
    pt: "Portuguese",
    zh: "Chinese",
    ja: "Japanese",
    nl: "Dutch",
    ko: "Korean",
    ru: "Russian",
    ar: "Arabic",
    sv: "Swedish",
    pl: "Polish",
    da: "Danish",
    fi: "Finnish",
    no: "Norwegian",
    tr: "Turkish",
    cs: "Czech",
    el: "Greek",
    hu: "Hungarian",
    ro: "Romanian",
    sk: "Slovak",
  };
  if ( code in languageNames) {
    return languageNames[code];
  }
  return "English";
}
