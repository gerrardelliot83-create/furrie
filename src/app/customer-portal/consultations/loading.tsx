export default function ConsultationsLoading() {
  return (
    <div className="mx-auto max-w-[600px] p-4">
      <div className="mb-5">
        <div className="h-6 w-[180px] animate-pulse rounded-sm bg-muted" />
      </div>

      {[1, 2, 3].map((i) => (
        <div key={i} className="mb-3 rounded-lg border border-border bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="h-4 w-[50%] animate-pulse rounded-sm bg-muted" />
            <div className="h-6 w-[80px] animate-pulse rounded-sm bg-muted" />
          </div>
          <div className="mt-3 h-3.5 w-[70%] animate-pulse rounded-sm bg-muted" />
          <div className="mt-2 h-3.5 w-[40%] animate-pulse rounded-sm bg-muted" />
        </div>
      ))}
    </div>
  );
}
