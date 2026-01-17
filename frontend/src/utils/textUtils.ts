export const fixTurkishHyphens = (text: string | null | undefined) => {
  if (!text) return "";
  // Satır sonu "-" ve alt satırdaki kelimeyi birleştir
  return text.replace(/(\w+)-\s*\n\s*([a-zğüşıöç]+)/g, "$1$2");
};
