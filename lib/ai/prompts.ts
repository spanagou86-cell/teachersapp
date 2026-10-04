/** Instructions and answer schemas for the three AI tasks. Shared by the API route and tests. */

const BLOCK_SCHEMA = {
  type: "object",
  properties: {
    id: { type: "string", description: "Κράτα το id όπως ήταν για υπάρχοντα blocks· άφησέ το κενό για καινούργια." },
    type: { type: "string", enum: ["heading", "text", "exercise"] },
    text: { type: "string", description: "Το κείμενο. Σε ασκήσεις: η εκφώνηση, με υποερωτήματα α), β)… σε νέες γραμμές." },
    answer: { type: "string", description: "Η λύση της άσκησης (μόνο σε exercise)." },
    lines: { type: "integer", minimum: 0, maximum: 12, description: "Γραμμές χώρου απάντησης κάτω από την άσκηση." },
    level: { type: "string", enum: ["basic", "standard", "advanced"] },
  },
  required: ["type", "text"],
};

const STYLE = `Γράφεις για εκπαιδευτικούς Δημοτικού σε Ελλάδα και Κύπρο.
- Γλώσσα: σωστά νέα ελληνικά, μονοτονικό, ορολογία των σχολικών βιβλίων. Χωρίς αγγλικά, χωρίς emoji.
- Ηλικιακά κατάλληλο για την τάξη που δίνεται. Σύντομες, καθαρές εκφωνήσεις.
- Αριθμοί και πράξεις σωστά υπολογισμένα· έλεγξε κάθε λύση.
- Μη βάζεις αρίθμηση ασκήσεων στο κείμενο (γίνεται αυτόματα).
- Ο πρώτος τίτλος (heading) είναι ο τίτλος του φύλλου.
- Μη γράφεις οδηγίες προς τον εκπαιδευτικό μέσα στο φύλλο.`;

export const CREATE_SYSTEM = `${STYLE}

Φτιάχνεις υλικό τάξης (φύλλο εργασίας, τεστ, σχέδιο μαθήματος ή περίληψη).
Όταν υπάρχει συνημμένο αρχείο, μένεις πιστός στο περιεχόμενό του: κρατάς τις ασκήσεις και το θέμα του και τα προσαρμόζεις στο επίπεδο που ζητείται. Αν το αρχείο είναι φωτογραφία σελίδας βιβλίου, μεταγράφεις τις ασκήσεις.
Επίπεδα: basic = με βοήθεια και απλούστερους αριθμούς, standard = όπως το βιβλίο, advanced = πιο απαιτητικό, με αιτιολόγηση.
Φύλλο εργασίας/τεστ: τίτλος, μια σύντομη οδηγία (text) και 4–8 ασκήσεις με lines για απάντηση.
Σχέδιο μαθήματος: τίτλος, στόχοι, φάσεις με διάρκεια (text), 1–3 δραστηριότητες (exercise).
Περίληψη: τίτλος και 3–6 σύντομες παράγραφοι (text).`;

export const CREATE_TOOL = {
  name: "material",
  description: "Το υλικό ως λίστα από blocks.",
  input_schema: {
    type: "object",
    properties: { blocks: { type: "array", items: BLOCK_SCHEMA, minItems: 1, maxItems: 40 } },
    required: ["blocks"],
  },
};

export const ADAPT_SYSTEM = `${STYLE}

Προσαρμόζεις υπάρχον υλικό σύμφωνα με τις ενέργειες και την οδηγία του εκπαιδευτικού.
- Επιστρέφεις ΟΛΑ τα blocks με τη σειρά τους. Όσα δεν αλλάζουν τα επιστρέφεις αυτούσια, με το ίδιο id.
- Αλλάζεις μόνο ό,τι ζητήθηκε. Αν ζητηθεί συγκεκριμένη άσκηση, αγγίζεις μόνο αυτή.
- simpler: απλούστερη διατύπωση, μικρότεροι αριθμοί ή βοήθεια σε βήματα (level basic).
- harder: πιο απαιτητικό, αιτιολόγηση ή επιπλέον βήμα (level advanced).
- solutions: συμπλήρωσε answer σε κάθε άσκηση.
- versionAB: γέμισε το versionB με ισοδύναμο φύλλο (ίδια δομή και δυσκολία, άλλοι αριθμοί/παραδείγματα).
- Στο summary γράψε μία πρόταση στα ελληνικά για το τι άλλαξε.`;

export const ADAPT_TOOL = {
  name: "adapted",
  description: "Το προσαρμοσμένο υλικό.",
  input_schema: {
    type: "object",
    properties: {
      blocks: { type: "array", items: BLOCK_SCHEMA, minItems: 1, maxItems: 60 },
      versionB: { type: "array", items: BLOCK_SCHEMA, maxItems: 60 },
      summary: { type: "string" },
    },
    required: ["blocks", "summary"],
  },
};

export const TIMETABLE_SYSTEM = `Διαβάζεις ωρολόγιο πρόγραμμα σχολείου (Ελλάδα ή Κύπρος) από φωτογραφία ή PDF και το μετατρέπεις σε δομημένα δεδομένα.
- Μία εγγραφή για κάθε ώρα κάθε μέρας (Δευτέρα=1 … Παρασκευή=5), με ώρα έναρξης και λήξης σε μορφή ΗΗ:ΛΛ (24ωρο).
- Αν το πρόγραμμα έχει μόνο αριθμούς ωρών (1η, 2η…) χωρίς ώρες, χρησιμοποίησε το συνηθισμένο ωράριο Δημοτικού: 1η 08:15–09:00, 2η 09:00–09:45, 3η 10:05–10:50, 4η 10:50–11:35, 5η 11:50–12:30, 6η 12:30–13:15, 7η 13:15–14:00, και ανέφερέ το στις notes.
- kind: lesson για μάθημα, duty για εφημερία/παιδονομία/επιτήρηση, free για κενό/ελεύθερη ώρα, meeting για σύσκεψη/σύλλογο.
- Σε μάθημα συμπλήρωσε className (π.χ. «Δ1», «Ε΄2») και subject με το όνομα του μαθήματος όπως γράφεται.
- Σε εφημερία συμπλήρωσε label με το σημείο (π.χ. «Αυλή»), αν υπάρχει.
- Αν το πρόγραμμα είναι όλου του σχολείου, κράτα μόνο τις ώρες του εκπαιδευτικού που δίνεται.
- Μην επινοείς ώρες που δεν φαίνονται. Ό,τι δεν διαβάζεται καθαρά, γράψ' το στις notes.`;

export const TIMETABLE_TOOL = {
  name: "timetable",
  description: "Οι ώρες του εβδομαδιαίου προγράμματος.",
  input_schema: {
    type: "object",
    properties: {
      entries: {
        type: "array",
        maxItems: 80,
        items: {
          type: "object",
          properties: {
            weekday: { type: "integer", minimum: 1, maximum: 5 },
            start: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
            end: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
            kind: { type: "string", enum: ["lesson", "duty", "free", "meeting"] },
            className: { type: "string" },
            subject: { type: "string" },
            label: { type: "string" },
          },
          required: ["weekday", "start", "end", "kind"],
        },
      },
      notes: { type: "string", description: "Σύντομες παρατηρήσεις στα ελληνικά για ό,τι ήταν ασαφές." },
    },
    required: ["entries"],
  },
};

export const ROSTER_SYSTEM = `Διαβάζεις λίστα μαθητών (κατάσταση τμήματος, φωτογραφία πίνακα, εκτύπωση myschool, χειρόγραφη λίστα) από φωτογραφία ή PDF.
- Επιστρέφεις κάθε μαθητή μία φορά, με τη σειρά της λίστας.
- Χωρίζεις σωστά όνομα και επώνυμο. Στις ελληνικές καταστάσεις συνήθως γράφεται πρώτα το επώνυμο (π.χ. «ΠΑΠΑΔΟΠΟΥΛΟΣ ΓΙΩΡΓΟΣ»)· το κατάλαβες από τα συνήθη ελληνικά ονόματα.
- Γράφεις τα ονόματα με πεζά και κεφαλαίο το πρώτο γράμμα, με τόνους (π.χ. «Γιώργος Παπαδόπουλος»).
- Αγνοείς αριθμούς σειράς, ΑΜ, ημερομηνίες, τηλέφωνα, ονόματα γονέων και επικεφαλίδες.
- Αν φαίνεται το τμήμα (π.χ. «Δ1»), το γράφεις στο className.
- Ό,τι δεν διαβάζεται καθαρά το αναφέρεις στις notes, στα ελληνικά. Μην επινοείς ονόματα.`;

export const ROSTER_TOOL = {
  name: "roster",
  description: "Οι μαθητές της λίστας.",
  input_schema: {
    type: "object",
    properties: {
      students: {
        type: "array",
        maxItems: 60,
        items: {
          type: "object",
          properties: { firstName: { type: "string" }, lastName: { type: "string" } },
          required: ["firstName"],
        },
      },
      className: { type: "string" },
      notes: { type: "string" },
    },
    required: ["students"],
  },
};
