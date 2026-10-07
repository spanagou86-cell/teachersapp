"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { openPrepare } from "@/components/prepare";

/** «Νέο υλικό» (the home-screen shortcut, old links): one way to make material, the «Ετοίμασε» sheet. */
export default function NewMaterialPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/materials");
    openPrepare();
  }, [router]);
  return null;
}
