"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="el">
      <body style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "80px 16px", background: "#f6f4ee", color: "#1a2238" }}>
        <h1 style={{ fontSize: 22 }}>Κάτι πήγε στραβά</h1>
        <p style={{ color: "#66746c" }}>Τα δεδομένα σου είναι ασφαλή. Ανανέωσε τη σελίδα.</p>
        <button type="button" onClick={reset} style={{ marginTop: 16, height: 44, padding: "0 20px", borderRadius: 8, border: 0, background: "#1e3a8a", color: "#fff", fontWeight: 600 }}>
          Ξαναδοκίμασε
        </button>
      </body>
    </html>
  );
}
