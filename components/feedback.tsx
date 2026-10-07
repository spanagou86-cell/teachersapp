"use client";

import { Loader2, MessageSquareText, Send } from "@/components/icons";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { create } from "zustand";
import { supabase } from "@/lib/supabase/client";
import { useApp } from "@/lib/store";
import { toast } from "./toast";
import { Button, cx, inputClass, Sheet } from "./ui";

export const useFeedback = create<{ open: boolean; set: (open: boolean) => void }>((set) => ({ open: false, set: (open) => set({ open }) }));
export const openFeedback = () => useFeedback.getState().set(true);

/** «Στείλε μας σχόλιο»: a line or two from the teacher, straight to us, with the page it came from. */
export function FeedbackSheet() {
  const open = useFeedback((s) => s.open);
  const set = useFeedback((s) => s.set);
  const mode = useApp((s) => s.mode);
  const email = useApp((s) => s.email);
  const pathname = usePathname();
  const [text, setText] = useState("");
  const [reply, setReply] = useState(true);
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  const send = async () => {
    const message = text.trim();
    if (!message) return;
    if (mode !== "cloud") {
      set(false);
      return toast("Στην επίδειξη δεν στέλνεται· με λογαριασμό το παίρνουμε κατευθείαν.");
    }
    setBusy(true);
    const { error } = await supabase().from("feedback").insert({ message: message.slice(0, 2000), page: pathname.slice(0, 200), reply });
    setBusy(false);
    if (error) return toast("Δεν στάλθηκε. Δοκίμασε ξανά σε λίγο.");
    setText("");
    set(false);
    toast("Ευχαριστούμε! Το διαβάζουμε σίγουρα.");
  };

  return (
    <Sheet
      open
      onClose={() => set(false)}
      title="Στείλε μας σχόλιο"
      footer={
        <div className="pb-3">
          <Button className="h-11 w-full" onClick={send} disabled={busy || !text.trim()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Αποστολή
          </Button>
        </div>
      }
    >
      <div className="grid gap-3">
        <p className="flex items-start gap-2 text-sm text-muted">
          <MessageSquareText className="mt-0.5 size-4 shrink-0" />
          Τι σε δυσκόλεψε, τι λείπει, τι θα σου γλίτωνε χρόνο; Κάθε μήνυμα το διαβάζει άνθρωπος.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 2000))}
          rows={5}
          autoFocus
          aria-label="Το σχόλιό σου"
          placeholder="π.χ. Θα ήθελα να τυπώνω δύο φύλλα σε μία σελίδα…"
          className={cx(inputClass, "resize-none py-2.5")}
        />
        {mode === "cloud" && email && (
          <label className="flex items-center gap-2.5 text-[14px]">
            <input type="checkbox" checked={reply} onChange={(e) => setReply(e.target.checked)} className="size-5 accent-brand-500" />
            Μπορείτε να μου απαντήσετε στο {email}
          </label>
        )}
      </div>
    </Sheet>
  );
}
