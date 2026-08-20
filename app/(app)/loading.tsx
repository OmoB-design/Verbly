/** In-app route-transition fallback (keeps header/footer context via layout). */
export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="border-primary size-8 animate-spin rounded-full border-[3px] border-t-transparent" aria-hidden />
    </div>
  );
}
