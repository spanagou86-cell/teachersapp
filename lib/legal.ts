/**
 * Who provides the service. Fill these in before selling: they appear in the
 * Privacy Policy, Terms and the data processing agreement.
 */
export const COMPANY = {
  name: process.env.NEXT_PUBLIC_COMPANY_NAME || "τάξη",
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || "",
  vat: process.env.NEXT_PUBLIC_COMPANY_VAT || "",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
  /** Αριθμός ΓΕΜΗ, if the provider is registered there. */
  registry: process.env.NEXT_PUBLIC_COMPANY_GEMI || "",
};

export const LEGAL_UPDATED = "6 Οκτωβρίου 2026";

/** Services that process data for us (GDPR art. 28 sub-processors). */
export const SUBPROCESSORS = [
  { name: "Supabase Inc.", what: "Βάση δεδομένων, αποθήκευση αρχείων, σύνδεση χρηστών και email σύνδεσης", where: "Φρανκφούρτη, Γερμανία (ΕΕ)" },
  { name: "Vercel Inc.", what: "Φιλοξενία της εφαρμογής", where: "Φρανκφούρτη, Γερμανία (ΕΕ)· δίκτυο διανομής διεθνώς" },
  { name: "Anthropic PBC", what: "Επεξεργασία με AI, μόνο όταν το ζητάς: υλικό, φωτογραφία ωρολογίου ή φωτογραφία λίστας μαθητών", where: "ΗΠΑ (τυποποιημένες συμβατικές ρήτρες)" },
];
