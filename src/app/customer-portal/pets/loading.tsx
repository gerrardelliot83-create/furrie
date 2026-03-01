export default function PetsLoading() {
  return (
    <div className="mx-auto max-w-[600px] p-4">
      <div className="mb-5 flex items-center justify-between">
        <div className="h-6 w-[120px] animate-pulse rounded-sm bg-muted" />
        <div className="h-9 w-[100px] animate-pulse rounded-md bg-muted" />
      </div>

      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-border bg-white">
            <div className="h-[120px] w-full animate-pulse bg-muted" />
            <div className="p-4">
              <div className="h-[18px] w-[60%] animate-pulse rounded-sm bg-muted" />
              <div className="mt-2 h-3.5 w-[80%] animate-pulse rounded-sm bg-muted" />
              <div className="mt-1 h-3.5 w-[40%] animate-pulse rounded-sm bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
