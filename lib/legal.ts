/**
 * Who provides the service. Fill these in before selling: they appear in the
 * Privacy Policy, Terms and the data processing agreement.
 */
export const COMPANY = {
  name: process.env.NEXT_PUBLIC_COMPANY_NAME || "τάξη",
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || "",
  vat: process.env.NEXT_PUBLIC_COMPANY_VAT || "",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
};

export const LEGAL_UPDATED = "4 Οκτωβρίου 2026";

/** Services that process data for us (GDPR art. 28 sub-processors). */
export const SUBPROCESSORS = [
  { name: "Supabase Inc.", what: "Βάση δεδομένων, αποθήκευση αρχείων, σύνδεση χρηστών", where: "Φρανκφούρτη, Γερμανία (ΕΕ)" },
  { name: "Vercel Inc.", what: "Φιλοξενία της εφαρμογής", where: "Φρανκφούρτη, Γερμανία (ΕΕ)· δίκτυο διανομής διεθνώς" },
  { name: "Anthropic PBC", what: "Επεξεργασία με AI του υλικού που ανεβάζεις, μόνο όταν το ζητάς (χωρίς τα στοιχεία μαθητών της εφαρμογής)", where: "ΗΠΑ (τυποποιημένες συμβατικές ρήτρες)" },
];
