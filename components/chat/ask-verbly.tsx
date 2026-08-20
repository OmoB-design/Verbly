"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ASK_QUESTIONS,
  buildAnswer,
  isClinicalIntent,
  REFERRAL_ANSWER,
  type AskFacts,
  type AskQuestionId,
} from "@/lib/ask-verbly";

/**
 * Surface 1 of Chat: templated progress lookup. @ picks a child, chips ask the
 * fixed questions; free text is allowed but clinically-flagged questions get
 * only the referral answer. Ephemeral by design: the thread clears after 24
 * hours (deliberate opposite of the permanent SLP-notes surface).
 */

interface ChildOption {
  id: string;
  name: string;
}

interface Entry {
  t: number;
  child: string;
  q: string;
  a: string;
}

const STORE_KEY = "verbly_ask_history_v1";
const DAY_MS = 24 * 60 * 60 * 1000;

function loadHistory(): Entry[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const list = raw ? (JSON.parse(raw) as Entry[]) : [];
    return list.filter((e) => Date.now() - e.t < DAY_MS);
  } catch {
    return [];
  }
}

export function AskVerbly({ childOptions }: { childOptions: ChildOption[] }) {
  const [selected, setSelected] = React.useState<ChildOption | null>(childOptions.length === 1 ? childOptions[0] : null);
  const [text, setText] = React.useState("");
  const [history, setHistory] = React.useState<Entry[]>([]);
  const [busy, setBusy] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setHistory(loadHistory());
  }, []);

  function saveHistory(entries: Entry[]) {
    setHistory(entries);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(entries));
    } catch {
      /* storage unavailable — the surface is ephemeral anyway */
    }
  }

  // @ mention: typing @ surfaces the account's children.
  const mentionQuery = text.includes("@") ? text.slice(text.lastIndexOf("@") + 1).toLowerCase() : null;
  const mentionMatches =
    mentionQuery !== null ? childOptions.filter((c) => c.name.toLowerCase().startsWith(mentionQuery)) : [];

  function pickChild(c: ChildOption) {
    setSelected(c);
    setText("");
  }

  async function fetchFacts(childId: string): Promise<AskFacts | null> {
    try {
      const res = await fetch(`/api/ask-verbly/${childId}`);
      if (!res.ok) return null;
      return (await res.json()) as AskFacts;
    } catch {
      return null;
    }
  }

  async function askChip(q: AskQuestionId, label: string) {
    if (!selected || busy) return;
    setBusy(true);
    const facts = await fetchFacts(selected.id);
    const answer = facts ? buildAnswer(q, facts) : "Something went wrong looking that up — please try again.";
    saveHistory([...history, { t: Date.now(), child: selected.name, q: label, a: answer }]);
    setBusy(false);
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function askFree() {
    const q = text.trim();
    if (!q || busy) return;
    if (isClinicalIntent(q)) {
      saveHistory([...history, { t: Date.now(), child: selected?.name ?? "", q, a: REFERRAL_ANSWER }]);
      setText("");
      return;
    }
    saveHistory([
      ...history,
      {
        t: Date.now(),
        child: selected?.name ?? "",
        q,
        a: "I can answer the questions below about progress and activities — tap one after picking a child.",
      },
    ]);
    setText("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Ask Verbly</CardTitle>
        <CardDescription>
          Quick answers about progress and activities, straight from {selected ? `${selected.name}'s` : "your child's"}{" "}
          records. Conversations clear after 24 hours.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {history.length > 0 ? (
          <div className="flex max-h-80 flex-col gap-3 overflow-y-auto rounded-lg border p-3">
            {history.map((e, i) => (
              <div key={i} className="flex flex-col gap-1">
                <p className="self-end rounded-lg rounded-br-sm bg-primary/10 px-3 py-1.5 text-sm">
                  {e.child ? <span className="text-primary font-medium">@{e.child} </span> : null}
                  {e.q}
                </p>
                <p className="text-sm whitespace-pre-line self-start rounded-lg rounded-bl-sm bg-muted px-3 py-1.5">{e.a}</p>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        ) : null}

        {/* Child picker: chips + @ mention in the text box. */}
        <div className="flex flex-wrap items-center gap-2">
          {childOptions.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => pickChild(c)}
              aria-pressed={selected?.id === c.id}
              className={
                "rounded-full border px-3 py-1 text-sm transition-colors " +
                (selected?.id === c.id
                  ? "border-primary bg-primary/5 ring-primary/30 ring-1"
                  : "border-input hover:bg-muted/50")
              }
            >
              @{c.name}
            </button>
          ))}
        </div>

        {selected ? (
          <div className="flex flex-wrap gap-2">
            {ASK_QUESTIONS.map((q) => (
              <Button key={q.id} variant="outline" size="sm" disabled={busy} onClick={() => askChip(q.id, q.label)}>
                {q.label}
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Pick a child (or type @) to see what you can ask.</p>
        )}

        <div className="relative">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              askFree();
            }}
            className="flex gap-2"
          >
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={selected ? "Or type a question…" : "Type @ to pick a child…"}
              className="h-10"
            />
            <Button type="submit" size="sm" className="h-10" disabled={!text.trim() || busy}>
              Ask
            </Button>
          </form>
          {mentionMatches.length > 0 ? (
            <div className="bg-popover absolute bottom-full left-0 z-10 mb-1 w-56 rounded-lg border p-1 shadow-md">
              {mentionMatches.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pickChild(c)}
                  className="hover:bg-muted/60 block w-full rounded-md px-3 py-1.5 text-left text-sm"
                >
                  @{c.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
