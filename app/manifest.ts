import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "τάξη",
    short_name: "τάξη",
    description: "Πρόγραμμα, μαθητές, παρουσίες και υλικό για εκπαιδευτικούς.",
    lang: "el",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f6f6f1",
    theme_color: "#1d4a37",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Σήμερα", url: "/", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Ημερολόγιο", url: "/schedule", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Νέο υλικό", url: "/materials/new", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
