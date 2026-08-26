import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import type { ChildExport, ExportData } from "./collect";
import { phaseName } from "@/lib/compass/contract";

/**
 * Readable "Download my data" PDF. Plain, calm, caregiver-facing: headings,
 * short labelled lines, simple tables — no clinical jargon beyond the record's
 * own values. Pure function of the collected data (no server imports) so it's
 * unit-testable.
 */

const PAGE = { w: 595.28, h: 841.89 }; // A4 points
const MARGIN = 48;
const LINE = 14;

const INK = rgb(0.16, 0.14, 0.11);
const MUTED = rgb(0.45, 0.42, 0.36);
const TEAL = rgb(0.06, 0.46, 0.43);

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const OUTCOME: Record<string, string> = {
  advance: "Passed",
  retake: "Try again",
  simplify_triggered: "Gentler version next",
};
const TRIGGER: Record<string, string> = {
  assessment_placement: "Placed by the Compass",
  rl_advance: "Moved up after passing",
  caregiver_regression: "Moved back by you",
  caregiver_override: "Chosen by you",
  age_bracket_transition: "Activities re-matched to age",
};
const DOMAIN: Record<string, string> = {
  receptive_language: "Understanding",
  expressive_language: "Talking",
  speech_sound: "Speech sounds",
  social_communication: "Connecting",
  functional_communication: "Getting needs met",
  play_shared_activity: "Play",
  learning_readiness: "Staying with it",
};

class Writer {
  private page!: PDFPage;
  private y = 0;
  constructor(
    private doc: PDFDocument,
    private font: PDFFont,
    private bold: PDFFont,
  ) {
    this.newPage();
  }
  private newPage() {
    this.page = this.doc.addPage([PAGE.w, PAGE.h]);
    this.y = PAGE.h - MARGIN;
  }
  private ensure(height: number) {
    if (this.y - height < MARGIN) this.newPage();
  }
  private wrap(text: string, font: PDFFont, size: number, width: number): string[] {
    const words = text.replace(/\s+/g, " ").trim().split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const probe = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(probe, size) <= width) cur = probe;
      else {
        if (cur) lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [""];
  }
  text(text: string, opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; indent?: number } = {}) {
    const size = opts.size ?? 10.5;
    const font = opts.bold ? this.bold : this.font;
    const indent = opts.indent ?? 0;
    const lines = this.wrap(text, font, size, PAGE.w - MARGIN * 2 - indent);
    for (const l of lines) {
      this.ensure(LINE);
      this.page.drawText(l, { x: MARGIN + indent, y: this.y - size, size, font, color: opts.color ?? INK });
      this.y -= LINE * (size > 12 ? 1.4 : 1);
    }
  }
  h1(text: string) {
    this.gap(6);
    this.text(text, { size: 20, bold: true, color: TEAL });
    this.gap(4);
  }
  h2(text: string) {
    this.gap(10);
    this.ensure(LINE * 2);
    this.text(text, { size: 13.5, bold: true });
    this.page.drawLine({ start: { x: MARGIN, y: this.y + 2 }, end: { x: PAGE.w - MARGIN, y: this.y + 2 }, thickness: 0.6, color: rgb(0.85, 0.82, 0.75) });
    this.gap(6);
  }
  label(label: string, value: string) {
    this.ensure(LINE);
    const size = 10.5;
    this.page.drawText(`${label}: `, { x: MARGIN, y: this.y - size, size, font: this.bold, color: MUTED });
    const lw = this.bold.widthOfTextAtSize(`${label}: `, size) + 2; // + pad: the trailing space renders tight
    const lines = this.wrap(value, this.font, size, PAGE.w - MARGIN * 2 - lw);
    lines.forEach((l, i) => {
      if (i > 0) this.ensure(LINE);
      this.page.drawText(l, { x: MARGIN + (i === 0 ? lw : 0), y: this.y - size, size, font: this.font, color: INK });
      this.y -= LINE;
    });
  }
  bullet(text: string) {
    this.text(`• ${text}`, { indent: 6 });
  }
  gap(px = LINE) {
    this.y -= px;
  }
}

function assessmentSection(w: Writer, a: Record<string, unknown>, childName: string) {
  const scores = (a.compass_domain_scores ?? {}) as Record<string, number>;
  const flags = (a.red_flags ?? { hard: [], soft: [] }) as { hard?: string[]; soft?: string[] };
  w.label("Completed", fmtDate(a.completed_at as string));
  if (a.starting_phase) {
    w.label(
      "Starting point",
      `Phase ${a.starting_phase} — ${phaseName(Number(a.starting_phase))}` +
        (a.placement_source === "caregiver_override" ? ` (chosen by you; the assessment suggested Phase ${a.recommended_phase})` : ""),
    );
  }
  if (Object.keys(scores).length) {
    w.text("Areas (0–100):", { bold: true, color: MUTED });
    for (const [k, v] of Object.entries(scores)) w.bullet(`${DOMAIN[k] ?? k}: ${v}`);
  }
  if ((flags.hard ?? []).length) w.label("Things worth discussing with a professional", (flags.hard ?? []).map((f) => f.replaceAll("_", " ")).join(", "));
  if (a.concern_text) w.label("Your concern, in your words", String(a.concern_text));
  if (a.referral_recommended) w.text(`A conversation with an SLP or paediatrician was suggested for ${childName}.`, { color: MUTED });
}

export async function renderExportPdf(data: ExportData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle("Verbly — your data");
  doc.setProducer("Verbly");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new Writer(doc, font, bold);

  w.h1("Your Verbly data");
  w.text(`Exported ${fmtDate(data.exported_at)} for ${data.account.email ?? "your account"}.`, { color: MUTED });
  w.text(data.note, { color: MUTED });

  w.h2("Your account");
  w.label("Name", data.account.full_name ?? "—");
  w.label("Email", data.account.email ?? "—");
  w.label("Member since", fmtDate(data.account.created_at));
  w.label("Email reminders", data.account.notification_frequency ?? "—");

  if (data.children.length === 0) {
    w.h2("Children");
    w.text("No child profiles yet.", { color: MUTED });
  }

  for (const child of data.children) childSection(w, child);

  return doc.save();
}

function childSection(w: Writer, c: ChildExport) {
  const p = c.profile;
  w.h1(p.name);
  w.label("Date of birth", fmtDate(p.dob));
  if (p.primary_language) w.label("Main language at home", p.primary_language + (p.additional_languages ? ` (also ${p.additional_languages})` : ""));
  if (p.second_adult_available) w.label("Second adult available to help", p.second_adult_available);

  w.h2("Communication Compass");
  const scored = c.assessments.filter((a) => a.status === "scored");
  if (scored.length === 0) w.text("Not completed yet.", { color: MUTED });
  scored.forEach((a, i) => {
    if (i > 0) w.gap(6);
    assessmentSection(w, a, p.name);
  });
  for (const r of c.readiness_checks) {
    w.gap(4);
    w.label(
      `Readiness check (Phase ${r.phase_number})`,
      `${r.yes_count}/5 — ${r.passed ? "ready to start" : "started with gentler activities"}` +
        (r.hard_item_flagged && r.flag_phrase ? `; keep an eye on ${r.flag_phrase}` : ""),
    );
  }

  w.h2("Phase history");
  if (c.phase_history.length === 0) w.text("No phase changes yet.", { color: MUTED });
  for (const h of c.phase_history) {
    w.bullet(`${fmtDate(h.entered_at as string)} — ${TRIGGER[String(h.trigger_reason)] ?? String(h.trigger_reason)}`);
  }

  w.h2(`Practice sessions (${c.sessions.filter((s) => s.completed_at).length} completed)`);
  const done = c.sessions.filter((s) => s.completed_at);
  if (done.length === 0) w.text("No completed sessions yet.", { color: MUTED });
  for (const s of done) {
    w.bullet(
      `${fmtDate(s.completed_at as string)} — ${s.score_percent ?? "—"}% · ${OUTCOME[String(s.outcome)] ?? String(s.outcome ?? "—")}` +
        (s.ran_simplified ? " (gentler version)" : ""),
    );
  }

  if (c.vocalizations.length) {
    w.h2("Sounds you captured");
    for (const v of c.vocalizations) {
      w.bullet(
        `${fmtDate(v.recorded_at as string)} — "${v.sound_produced ?? "—"}"` +
          (v.spontaneity ? ` (${v.spontaneity === "spontaneous" ? "on their own" : "copying you"})` : "") +
          (v.target_sound ? `, target: ${v.target_sound}` : ""),
      );
    }
    w.text("Audio clips aren't included in this file; they stay private in your account.", { color: MUTED });
  }

  if (c.slp_notes.length) {
    w.h2("Notes from your SLP");
    for (const n of c.slp_notes) {
      w.text(`${fmtDate(n.created_at as string)}:`, { bold: true, color: MUTED });
      w.text(String(n.body), { indent: 6 });
      w.gap(4);
    }
  }

  if (c.saved_participants.length) {
    w.h2("Session helpers");
    for (const sp of c.saved_participants) w.bullet(`${sp.display_name} — ${String(sp.role).replaceAll("_", " ")}`);
  }
}
