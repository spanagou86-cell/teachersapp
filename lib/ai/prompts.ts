/** Instructions and answer schemas for the AI tasks. Shared by the API route and tests. */

export type Country = "gr" | "cy";

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

/** Whose curriculum, words and everyday examples to use. */
const COUNTRY: Record<Country, string> = {
  cy: `Ο εκπαιδευτικός διδάσκει σε δημόσιο δημοτικό σχολείο της Κύπρου.
- Ακολούθησε τα Αναλυτικά Προγράμματα του Υπουργείου Παιδείας της Κύπρου και την ορολογία τους: «Ελληνικά» (όχι «Γλώσσα»), «Τέχνη» (όχι «Εικαστικά»), «Φυσικές Επιστήμες».
- Στα παραδείγματα βάλε ονόματα, τόπους και καθημερινότητα της Κύπρου (π.χ. Λευκωσία, Λεμεσός, Λάρνακα, Πάφος, Αμμόχωστος, Τρόοδος) και τιμές σε ευρώ.`,
  gr: `Ο εκπαιδευτικός διδάσκει σε δημοτικό σχολείο της Ελλάδας.
- Ακολούθησε το Πρόγραμμα Σπουδών και την ύλη του ΙΕΠ, με την ορολογία των σχολικών βιβλίων.
- Στα παραδείγματα βάλε ονόματα, τόπους και καθημερινότητα της Ελλάδας και τιμές σε ευρώ.`,
};

export const isCountry = (c: unknown): c is Country => c === "gr" || c === "cy";

export const CREATE_SYSTEM = `${STYLE}

Φτιάχνεις υλικό τάξης (φύλλο εργασίας, τεστ, σχέδιο μαθήματος ή περίληψη).
Όταν υπάρχει συνημμένο αρχείο, μένεις πιστός στο περιεχόμενό του: κρατάς τις ασκήσεις και το θέμα του και τα προσαρμόζεις στο επίπεδο που ζητείται. Αν το αρχείο είναι φωτογραφία σελίδας βιβλίου, μεταγράφεις τις ασκήσεις.
Επίπεδα: basic = με βοήθεια και απλούστερους αριθμούς, standard = όπως το βιβλίο, advanced = πιο απαιτητικό, με αιτιολόγηση.
Φύλλο εργασίας/τεστ: τίτλος, μια σύντομη οδηγία (text) και 4–8 ασκήσεις με lines για απάντηση.
Σχέδιο μαθήματος: πρώτα ο τίτλος· μετά κάθε φάση με δικό της heading (π.χ. «Αφόρμηση · 5′») και σύντομο text από κάτω· χωρίς exercise.
Περίληψη: τίτλος και 3–6 σύντομες παράγραφοι (text).
Όταν ζητηθούν 3 επίπεδα: κάθε άσκηση έχει το κανονικό της κείμενο (standard) και επιπλέον basic (απλούστερη, με βοήθεια) και advanced (πιο απαιτητική), όλες με λύσεις.`;

/** The creation instructions with the teacher's country. */
export const createSystem = (country: Country) => `${CREATE_SYSTEM}

${COUNTRY[country]}`;

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

const VARIANT = {
  type: "object",
  properties: { text: { type: "string" }, answer: { type: "string" } },
  required: ["text"],
};

/** Same as CREATE_TOOL, with an easier and a harder version of every exercise. */
export const LEVELS_TOOL = {
  name: "material",
  description: "Το υλικό ως λίστα από blocks, με τρία επίπεδα σε κάθε άσκηση.",
  input_schema: {
    type: "object",
    properties: {
      blocks: {
        type: "array",
        minItems: 1,
        maxItems: 40,
        items: {
          ...BLOCK_SCHEMA,
          properties: {
            ...BLOCK_SCHEMA.properties,
            basic: { ...VARIANT, description: "Απλούστερη εκδοχή της άσκησης (μόνο σε exercise)." },
            advanced: { ...VARIANT, description: "Πιο απαιτητική εκδοχή της άσκησης (μόνο σε exercise)." },
          },
        },
      },
    },
    required: ["blocks"],
  },
};

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

/** The usual bell of each system, for timetables that only number the periods. */
const BELL: Record<Country, string> = {
  gr: "1η 08:15–09:00, 2η 09:00–09:45, 3η 10:05–10:50, 4η 10:50–11:35, 5η 11:50–12:30, 6η 12:30–13:15, 7η 13:15–14:00",
  cy: "1η 07:45–08:25, 2η 08:25–09:05, 3η 09:25–10:05, 4η 10:05–10:45, 5η 10:55–11:35, 6η 11:35–12:15, 7η 12:25–13:05",
};

export const timetableSystem = (country: Country) => `Διαβάζεις ωρολόγιο πρόγραμμα δημοτικού σχολείου της ${country === "cy" ? "Κύπρου" : "Ελλάδας"} από φωτογραφία ή PDF και το μετατρέπεις σε δομημένα δεδομένα.
- Μία εγγραφή για κάθε ώρα κάθε μέρας (Δευτέρα=1 … Παρασκευή=5), με ώρα έναρξης και λήξης σε μορφή ΗΗ:ΛΛ (24ωρο).
- Αν το πρόγραμμα έχει μόνο αριθμούς ωρών (1η, 2η…) χωρίς ώρες, χρησιμοποίησε το ωράριο: ${BELL[country]}, και ανέφερέ το στις notes.
- kind: lesson για μάθημα, duty για εφημερία/παιδονομία/επιτήρηση, free για κενό/ελεύθερη ώρα, meeting για σύσκεψη/σύλλογο.
- Σε μάθημα συμπλήρωσε className (π.χ. «Δ1», «Ε΄2») και subject με το όνομα του μαθήματος όπως γράφεται.
- Σε εφημερία συμπλήρωσε label με το σημείο (π.χ. «Αυλή»), αν υπάρχει.
- Αν το πρόγραμμα είναι όλου του σχολείου, κράτα μόνο τις ώρες του εκπαιδευτικού που δίνεται.
- Μην επινοείς ώρες που δεν φαίνονται. Ό,τι δεν διαβάζεται καθαρά, γράψ' το στις notes.`;

export const TIMETABLE_SYSTEM = timetableSystem("gr");

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

export const SYLLABUS_SYSTEM = `Διαβάζεις την ύλη ενός μαθήματος Δημοτικού από φωτογραφία ή PDF (περιεχόμενα σχολικού βιβλίου, επίσημο προγραμματισμό του Υπουργείου, λίστα του εκπαιδευτικού) και τη δίνεις ως σειρά θεμάτων.
- Κράτα τη σειρά του εγγράφου. Κάθε θέμα (κεφάλαιο, μάθημα) είναι μία εγγραφή, με την ενότητα στην οποία ανήκει (π.χ. «Ενότητα 3: Κλάσματα»).
- periods: οι διδακτικές περίοδοι του θέματος, αν φαίνονται· αλλιώς μια εύλογη εκτίμηση (συνήθως 1–3).
- Όταν το έγγραφο δίνει περιόδους μόνο ανά ενότητα, μοίρασέ τες στα θέματά της ώστε το άθροισμα να ταιριάζει.
- Αγνόησε επαναλήψεις στήλης, αριθμούς σελίδων, προλόγους, παραρτήματα.
- Γράψε τους τίτλους σύντομα και σωστά, σε μονοτονικό. Μην επινοείς θέματα που δεν υπάρχουν· ό,τι δεν διαβάζεται γράψ' το στις notes.`;

export const SYLLABUS_TOOL = {
  name: "syllabus",
  description: "Η ύλη ως σειρά θεμάτων.",
  input_schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        maxItems: 200,
        items: {
          type: "object",
          properties: {
            unit: { type: "string" },
            title: { type: "string" },
            periods: { type: "integer", minimum: 1, maximum: 40 },
          },
          required: ["title"],
        },
      },
      notes: { type: "string" },
    },
    required: ["items"],
  },
};

/** The Cyprus Ministry's indicative Maths programmes, one PDF per grade (2026–27). */
export const CY_MATHS_PROGRAMME = (grade: number) => `https://sch.cy/sd/98/programmatismos_${["a", "b", "c", "d", "e", "st"][grade]}_dim.pdf`;

const OBJECTIVES_SYSTEM = `${STYLE}

Συμπληρώνεις τον εβδομαδιαίο προγραμματισμό ενός εκπαιδευτικού Δημοτικού.
Για κάθε μάθημα (id, μάθημα, τάξη, θέμα) γράφεις στη στήλη «Στόχοι / Δραστηριότητες»:
- 1–2 σύντομους στόχους που ξεκινούν με ρήμα («Να αναγνωρίζουν…», «Να λύνουν…»)
- και μία βασική δραστηριότητα, όλα μαζί σε έως 220 χαρακτήρες, χωρίς κουκκίδες, χωρισμένα με « · ».
Μένεις πιστός στο θέμα που δίνεται· δεν αλλάζεις τη σειρά της ύλης. Όταν το θέμα δεν είναι σαφές, γράφεις κάτι γενικό και σύντομο για το μάθημα.`;

export const objectivesSystem = (country: Country) => `${OBJECTIVES_SYSTEM}

${COUNTRY[country]}`;

export const OBJECTIVES_TOOL = {
  name: "objectives",
  description: "Στόχοι και δραστηριότητα ανά μάθημα.",
  input_schema: {
    type: "object",
    properties: {
      lessons: {
        type: "array",
        maxItems: 80,
        items: {
          type: "object",
          properties: { id: { type: "string" }, plan: { type: "string" } },
          required: ["id", "plan"],
        },
      },
    },
    required: ["lessons"],
  },
};

export const SEP_SYSTEM = `${STYLE}

Γράφεις προσχέδια για τη Σχολική Έκθεση Προόδου (ΣΕΠ) δημοτικού σχολείου της Κύπρου, που διαβάζουν οι γονείς.
Παίρνεις μόνο: τάξη, τετράμηνο, γένος (για τη γραμματική) και τις βαθμίδες του εκπαιδευτικού στις δεξιότητες/συμπεριφορές και στις περιοχές μάθησης. Δεν ξέρεις το όνομα· γράφεις «το παιδί» ή «ο μαθητής»/«η μαθήτρια».
- Στηρίζεσαι μόνο στις βαθμίδες που δόθηκαν. Δεν επινοείς περιστατικά, βαθμούς ή πληροφορίες.
- «Δυνατά σημεία»: 1–2 σύντομες προτάσεις από τις υψηλότερες βαθμίδες, συγκεκριμένα με την ορολογία του Αναλυτικού Προγράμματος.
- «Περιοχές ανάπτυξης»: 1–2 προτάσεις με θετική, ενθαρρυντική διατύπωση και μια πρακτική κατεύθυνση («Θα ωφεληθεί από…», «Χρειάζεται να συνεχίσει να εξασκείται σε…»). Ποτέ αρνητικές ετικέτες.
- Όπου δεν υπάρχουν βαθμίδες για ένα μάθημα, άφησε το πεδίο κενό.
- remarks: μία πρόταση για τις δεξιότητες/συμπεριφορές, θετική και ειλικρινής.
- Έως 300 χαρακτήρες ανά πεδίο. Επαγγελματικό, ζεστό ύφος.`;

export const SEP_TOOL = {
  name: "report",
  description: "Προσχέδια κειμένων ΣΕΠ.",
  input_schema: {
    type: "object",
    properties: {
      greek_strengths: { type: "string" },
      greek_growth: { type: "string" },
      maths_strengths: { type: "string" },
      maths_growth: { type: "string" },
      other_strengths: { type: "string" },
      other_growth: { type: "string" },
      remarks: { type: "string" },
    },
    required: ["greek_strengths", "greek_growth", "maths_strengths", "maths_growth", "remarks"],
  },
};
