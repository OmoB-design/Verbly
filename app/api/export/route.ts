import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { collectExport } from "@/lib/export/collect";
import { renderExportPdf } from "@/lib/export/pdf";

/**
 * GET /api/export?format=pdf|json — "Download my data" (settings → Data &
 * privacy). PDF is the readable default for caregivers; JSON remains for
 * machine portability. Both come from the same RLS-scoped collector.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const format = new URL(request.url).searchParams.get("format") === "json" ? "json" : "pdf";
  const data = await collectExport(supabase, user);
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="verbly-export-${stamp}.json"`,
      },
    });
  }

  const pdf = await renderExportPdf(data);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="verbly-export-${stamp}.pdf"`,
    },
  });
}
