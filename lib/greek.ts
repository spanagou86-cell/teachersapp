/** Vocative of a Greek first name, for greetings: Σπύρος → Σπύρο, Αλέξανδρος → Αλέξανδρε, Δημήτρης → Δημήτρη. */
export function vocative(name: string): string {
  const n = name.trim();
  const vowels = (n.normalize("NFD").replace(/[̀-ͯ]/g, "").match(/[αεηιουω]+/gi) ?? []).length;
  if (/ος$/.test(n)) return n.slice(0, -2) + (vowels <= 2 ? "ο" : "ε");
  if (/(ης|ας|ές|ούς)$/.test(n)) return n.slice(0, -1);
  return n;
}
