/** Root route-transition fallback (the free-tier database can wake slowly). */
export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="border-primary size-8 animate-spin rounded-full border-[3px] border-t-transparent" aria-hidden />
        <p className="text-muted-foreground text-sm">Just a moment…</p>
      </div>
    </main>
  );
}
