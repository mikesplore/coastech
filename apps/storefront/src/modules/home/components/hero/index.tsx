import LocalizedClientLink from "@modules/common/components/localized-client-link"

const Hero = () => {
  return (
    <section className="border-b border-raised bg-pcb">
      <div className="content-container grid min-h-[560px] items-center gap-12 py-20 medium:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="mb-5 font-mono text-xs uppercase tracking-[0.3em] text-copper">Coast Tech / Nairobi</p>
          <h1 className="max-w-3xl font-display text-6xl uppercase leading-[0.9] tracking-tight text-ink small:text-8xl">
            Build without the guesswork.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-muted">
            Components, peripherals, and compatibility checks for builders who care about every connection.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <LocalizedClientLink href="/builder" className="bg-copper px-6 py-3 font-semibold text-pcb transition hover:bg-ink">
              Start a build
            </LocalizedClientLink>
            <LocalizedClientLink href="/store" className="border border-muted px-6 py-3 font-semibold text-ink transition hover:border-copper hover:text-copper">
              Browse the catalog
            </LocalizedClientLink>
          </div>
        </div>
        <div className="rounded-base border border-raised bg-surface p-6 shadow-2xl">
          <div className="mb-8 flex items-center justify-between font-mono text-xs uppercase tracking-widest text-muted">
            <span>Build trace</span><span className="text-traceOk">● live</span>
          </div>
          <div className="space-y-8">
            {["CPU", "Motherboard", "Memory", "Ready"].map((part, index) => (
              <div key={part} className="relative flex items-center gap-4">
                <span className="z-10 grid h-10 w-10 place-items-center border border-copper bg-pcb font-mono text-xs text-copper">{String(index + 1).padStart(2, "0")}</span>
                <span className="font-display text-2xl uppercase tracking-wide">{part}</span>
                {index < 3 && <span className="absolute left-5 top-10 h-8 border-l border-dashed border-traceOk" />}
              </div>
            ))}
          </div>
          <div className="mt-8 trace-line" />
          <p className="mt-4 font-mono text-xs text-muted">Every part earns its place.</p>
        </div>
      </div>
    </section>
  )
}

export default Hero
