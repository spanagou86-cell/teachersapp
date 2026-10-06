"use client";

import { create } from "zustand";
import { Button, Sheet } from "./ui";

interface Ask {
  title: string;
  text: string;
  /** The button that goes ahead, e.g. «Διαγραφή». */
  action: string;
  danger?: boolean;
}

const useAsk = create<{ ask?: Ask & { answer: (yes: boolean) => void } }>(() => ({}));

/**
 * The app's own «are you sure?» for the few things that can't be undone, instead of the
 * browser's grey dialog. Resolves true when the teacher goes ahead.
 */
export function confirmAction(ask: Ask): Promise<boolean> {
  return new Promise((resolve) => {
    useAsk.getState().ask?.answer(false);
    useAsk.setState({
      ask: {
        ...ask,
        answer: (yes) => {
          useAsk.setState({ ask: undefined });
          resolve(yes);
        },
      },
    });
  });
}

/** Mounted once by the app shell. */
export function ConfirmHost() {
  const ask = useAsk((s) => s.ask);
  if (!ask) return null;
  return (
    <Sheet
      open
      onClose={() => ask.answer(false)}
      title={ask.title}
      footer={
        <div className="grid grid-cols-2 gap-2 pb-3">
          <Button variant="secondary" onClick={() => ask.answer(false)}>
            Άκυρο
          </Button>
          <Button className={ask.danger ? "!bg-danger !text-white hover:!bg-danger/90" : undefined} onClick={() => ask.answer(true)}>
            {ask.action}
          </Button>
        </div>
      }
    >
      <p className="text-[15px] text-ink-2">{ask.text}</p>
    </Sheet>
  );
}
