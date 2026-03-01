export default function VetConsultationsLoading() {
  return (
    <div className="p-6">
      <div className="mb-5">
        <div className="h-6 w-[180px] animate-pulse rounded-sm bg-muted" />
      </div>

      {/* Filter tabs skeleton */}
      <div className="mb-5 flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-9 w-[100px] animate-pulse rounded-md bg-muted" />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="overflow-hidden rounded-lg border border-border bg-white">
        <div className="flex gap-4 border-b border-border bg-muted/50 px-4 py-3">
          {['20%', '15%', '15%', '12%', '12%', '10%'].map((width, i) => (
            <div
              key={i}
              className="h-3.5 animate-pulse rounded-sm bg-muted"
              style={{ width }}
            />
          ))}
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="border-b border-border p-4 last:border-b-0">
            <div className="h-3.5 w-[80%] animate-pulse rounded-sm bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
