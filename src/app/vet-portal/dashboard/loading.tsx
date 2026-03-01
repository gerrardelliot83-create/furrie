export default function VetDashboardLoading() {
  return (
    <div className="p-6">
      {/* Stats row skeleton */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border border-border bg-white p-4">
            <div className="h-3.5 w-[60%] animate-pulse rounded-sm bg-muted" />
            <div className="mt-2 h-7 w-[40%] animate-pulse rounded-sm bg-muted" />
          </div>
        ))}
      </div>

      {/* Today's schedule skeleton */}
      <div className="mb-6">
        <div className="mb-4">
          <div className="h-5 w-[160px] animate-pulse rounded-sm bg-muted" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-3 rounded-md border border-border bg-white p-4">
            <div className="flex gap-4">
              <div className="h-4 w-[80px] animate-pulse rounded-sm bg-muted" />
              <div className="h-4 w-[120px] animate-pulse rounded-sm bg-muted" />
            </div>
            <div className="mt-2 h-3.5 w-[70%] animate-pulse rounded-sm bg-muted" />
          </div>
        ))}
      </div>

      {/* Recent consultations skeleton */}
      <div className="mb-6">
        <div className="mb-4">
          <div className="h-5 w-[200px] animate-pulse rounded-sm bg-muted" />
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border py-3">
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-muted" />
            <div className="flex-1">
              <div className="h-4 w-[50%] animate-pulse rounded-sm bg-muted" />
              <div className="mt-1 h-3.5 w-[30%] animate-pulse rounded-sm bg-muted" />
            </div>
            <div className="h-6 w-[70px] animate-pulse rounded-sm bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
