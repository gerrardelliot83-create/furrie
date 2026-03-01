export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-[600px] p-4">
      {/* Greeting skeleton */}
      <div className="mb-6">
        <div className="h-7 w-[60%] animate-pulse rounded-sm bg-muted" />
      </div>

      {/* CTA skeleton */}
      <div className="mb-6 rounded-lg border border-border bg-white p-5">
        <div className="h-5 w-[70%] animate-pulse rounded-sm bg-muted" />
        <div className="mt-2 h-4 w-[50%] animate-pulse rounded-sm bg-muted" />
        <div className="mt-4 h-10 w-[140px] animate-pulse rounded-md bg-muted" />
      </div>

      {/* Pets section skeleton */}
      <div className="mb-6">
        <div className="mb-3">
          <div className="h-5 w-[100px] animate-pulse rounded-sm bg-muted" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex min-w-[80px] flex-col items-center gap-2 p-3">
              <div className="h-14 w-14 animate-pulse rounded-full bg-muted" />
              <div className="h-3.5 w-[80%] animate-pulse rounded-sm bg-muted" />
              <div className="h-3 w-[60%] animate-pulse rounded-sm bg-muted" />
            </div>
          ))}
        </div>
      </div>

      {/* Consultations section skeleton */}
      <div className="mb-6">
        <div className="mb-3">
          <div className="h-5 w-[180px] animate-pulse rounded-sm bg-muted" />
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="mb-3 rounded-md border border-border bg-white p-4">
            <div className="h-4 w-[40%] animate-pulse rounded-sm bg-muted" />
            <div className="mt-2 h-3.5 w-[70%] animate-pulse rounded-sm bg-muted" />
            <div className="mt-1 h-3.5 w-[30%] animate-pulse rounded-sm bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
