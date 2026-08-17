"use client"

import { useBuild } from "@lib/context/build-context"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default function SavedBuilds() {
  const { savedBuilds, loadBuild } = useBuild()

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-copper">Local workspace</p>
      <h1 className="mt-3 font-display text-5xl uppercase">Saved builds</h1>
      <p className="mt-4 text-muted">Builds are stored in this browser. Sign-in sync can be added when a dedicated build module is enabled.</p>
      {!savedBuilds.length ? (
        <div className="mt-8 border border-dashed border-raised p-8 text-muted">No saved builds yet. <LocalizedClientLink href="/builder" className="text-copper">Start one in the builder.</LocalizedClientLink></div>
      ) : (
        <div className="mt-8 grid gap-3">
          {savedBuilds.map((build) => (
            <div key={build.id} className="flex flex-wrap items-center justify-between gap-4 border border-raised bg-surface p-5">
              <div><h2 className="font-display text-2xl uppercase">{build.name}</h2><p className="mt-1 font-mono text-xs text-muted">{build.parts.length} parts · {new Date(build.createdAt).toLocaleDateString()}</p></div>
              <button type="button" onClick={() => loadBuild(build)} className="border border-copper px-4 py-2 font-mono text-xs uppercase text-copper hover:bg-copper hover:text-pcb">Load build</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
