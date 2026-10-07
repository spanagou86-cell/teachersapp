"use client";

import { BellRing, Share } from "@/components/icons";
import { useEffect, useState } from "react";
import { disablePush, enablePush, pushState, testPush, type PushState } from "@/lib/pushClient";
import { dutyLabel } from "@/lib/schoolYear";
import { useApp } from "@/lib/store";
import { toast } from "./toast";
import { Button, Toggle } from "./ui";

/** Settings row: «Υπενθύμιση παιδονομίας 5′ πριν», with the iPhone steps when they are needed. */
export function PushRow() {
  const mode = useApp((s) => s.mode);
  const country = useApp((s) => s.profile.country);
  const [state, setState] = useState<PushState>();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void pushState().then(setState);
  }, []);
  const duty = dutyLabel(country).toLowerCase();

  const hint =
    mode !== "cloud"
      ? "Διαθέσιμο με λογαριασμό."
      : state === "ios-install"
        ? undefined
        : state === "denied"
          ? "Οι ειδοποιήσεις είναι μπλοκαρισμένες για την «τάξη». Άνοιξέ τες από τις ρυθμίσεις του κινητού ή του browser."
          : state === "unsupported"
            ? "Αυτός ο browser δεν υποστηρίζει ειδοποιήσεις."
            : `Ειδοποίηση στο κινητό 5 λεπτά πριν από κάθε ${duty}, ακόμη κι όταν η εφαρμογή είναι κλειστή.`;

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3.5">
      <div className="min-w-[12rem] flex-1">
        <p className="flex items-center gap-1.5 font-semibold">
          <BellRing className="size-4 text-brand-500" /> Υπενθύμιση {duty} 5′ πριν
        </p>
        {hint && <p className="text-[13px] text-muted">{hint}</p>}
        {mode === "cloud" && state === "ios-install" && (
          <p className="text-[13px] text-muted">
            Στο iPhone οι ειδοποιήσεις έρχονται όταν η «τάξη» είναι στην αρχική οθόνη: στο Safari πάτα <Share className="inline size-3.5 align-[-2px]" />{" "}
            «Κοινοποίηση» → «Προσθήκη στην οθόνη Αφετηρίας», άνοιξέ την από εκεί και ενεργοποίησε αυτό τον διακόπτη.
          </p>
        )}
      </div>
      {mode === "cloud" && (state === "on" || state === "off") && (
        <div className="flex items-center gap-2">
          {state === "on" && (
            <Button variant="ghost" size="sm" disabled={busy} onClick={async () => toast(await testPush())}>
              Δοκιμή
            </Button>
          )}
          <Toggle
            label={`Υπενθύμιση ${duty}`}
            checked={state === "on"}
            onChange={async (v) => {
              setBusy(true);
              if (v) {
                const r = await enablePush();
                if (!r.ok) toast(r.error);
                else toast(`Έτοιμο · θα σε ειδοποιώ 5′ πριν από κάθε ${duty}`);
              } else await disablePush();
              setState(await pushState());
              setBusy(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
