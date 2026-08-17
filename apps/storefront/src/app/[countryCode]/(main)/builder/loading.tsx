const slots = ["CPU", "Motherboard", "Memory", "Storage", "Graphics", "Power supply", "Case", "Cooling"]

function ProductSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-surface-variant p-2">
      <div className="h-16 w-16 shrink-0 animate-pulse rounded bg-surface-container" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-4/5 animate-pulse rounded bg-surface-container" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-surface-container" />
      </div>
      <div className="h-9 w-16 animate-pulse rounded-full bg-surface-container" />
    </div>
  )
}

export default function BuilderLoading() {
  return (
    <main className="min-h-screen bg-surface px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-6 rounded-xl bg-surface-container-lowest p-6 shadow-sm md:p-8">
          <div className="space-y-3">
            <div className="h-4 w-28 animate-pulse rounded bg-surface-container" />
            <div className="h-10 w-64 animate-pulse rounded bg-surface-container" />
            <div className="h-5 w-96 max-w-full animate-pulse rounded bg-surface-container" />
          </div>
          <div className="h-20 w-44 animate-pulse rounded-lg bg-surface-container" />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {slots.map((slot) => (
            <section key={slot} className="rounded-xl border border-surface-variant bg-surface-container-lowest p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="h-7 w-32 animate-pulse rounded bg-surface-container" />
                <div className="h-6 w-20 animate-pulse rounded-full bg-surface-container" />
              </div>
              <div className="grid gap-3">
                {Array.from({ length: 5 }, (_, index) => <ProductSkeleton key={`${slot}-${index}`} />)}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-6 h-24 animate-pulse rounded-xl border border-surface-variant bg-surface-container-lowest shadow-sm" />
      </div>
    </main>
  )
}
