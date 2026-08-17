import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Input, Text, Textarea } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

type PromotionalAd = {
  id: string
  title: string
  eyebrow: string | null
  description: string | null
  image_url: string | null
  href: string
  placement: string
  cta_label: string | null
  discount_label: string | null
  countdown_ends_at: string | null
  starts_at: string | null
  ends_at: string | null
  priority: number
  is_active: boolean
}

const emptyDraft = {
  eyebrow: "",
  title: "",
  description: "",
  image_url: "",
  href: "/store",
  placement: "homepage_carousel",
  cta_label: "Shop now",
  discount_label: "",
  countdown_ends_at: "",
  priority: "0",
  is_active: true,
}

async function fetchAds() {
  const response = await fetch("/admin/promotional-ads", { credentials: "include" })
  if (!response.ok) throw new Error("Failed to load homepage promotions")
  return (await response.json() as { ads: PromotionalAd[] }).ads
}

async function createAd(draft: typeof emptyDraft) {
  const response = await fetch("/admin/promotional-ads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ...draft, priority: Number(draft.priority), countdown_ends_at: draft.countdown_ends_at || null }),
  })
  if (!response.ok) throw new Error("Failed to create homepage promotion")
}

async function updateAd(id: string, ad: PromotionalAd) {
  const response = await fetch(`/admin/promotional-ads/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(ad),
  })
  if (!response.ok) throw new Error("Failed to update homepage promotion")
}

async function deleteAd(id: string) {
  const response = await fetch(`/admin/promotional-ads/${id}`, { method: "DELETE", credentials: "include" })
  if (!response.ok) throw new Error("Failed to delete homepage promotion")
}

function PromotionCard({ ad, onRefresh }: { ad: PromotionalAd; onRefresh: () => Promise<void> }) {
  const [draft, setDraft] = useState(ad)
  const save = useMutation({ mutationFn: () => updateAd(ad.id, draft), onSuccess: onRefresh })
  const remove = useMutation({ mutationFn: () => deleteAd(ad.id), onSuccess: onRefresh })

  return (
    <Container>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Heading level="h2">{ad.placement === "homepage_flash_deals" ? "Flash deal" : "Carousel slide"}</Heading>
          <Text size="small" className="text-ui-fg-subtle">{ad.id}</Text>
        </div>
        <div className="flex gap-2">
          <Button size="small" isLoading={save.isPending} onClick={() => save.mutate()}>Save</Button>
          <Button size="small" variant="danger" isLoading={remove.isPending} onClick={() => remove.mutate()}>Delete</Button>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Input placeholder="Eyebrow" value={draft.eyebrow ?? ""} onChange={(e) => setDraft({ ...draft, eyebrow: e.target.value })} />
        <Input placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <Input placeholder="CTA label" value={draft.cta_label ?? ""} onChange={(e) => setDraft({ ...draft, cta_label: e.target.value })} />
        <Input placeholder="Destination, e.g. /store" value={draft.href} onChange={(e) => setDraft({ ...draft, href: e.target.value })} />
        <Input placeholder="Image URL (optional)" value={draft.image_url ?? ""} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} />
        <Input placeholder="Discount label, e.g. -15% OFF" value={draft.discount_label ?? ""} onChange={(e) => setDraft({ ...draft, discount_label: e.target.value })} />
        <Input placeholder="Countdown end, ISO date" value={draft.countdown_ends_at ?? ""} onChange={(e) => setDraft({ ...draft, countdown_ends_at: e.target.value })} />
        <Input placeholder="Priority" type="number" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })} />
        <select className="h-10 rounded-md border border-ui-border-base bg-ui-bg-field px-3 text-sm" value={draft.placement} onChange={(e) => setDraft({ ...draft, placement: e.target.value })}>
          <option value="homepage_carousel">Homepage carousel</option>
          <option value="homepage_flash_deals">Homepage flash deals</option>
          <option value="homepage_banner">Homepage banner</option>
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} /> Active</label>
      </div>
      <Textarea className="mt-3" rows={3} placeholder="Description" value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
    </Container>
  )
}

const PromotionalAdsPage = () => {
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery({ queryKey: ["custom-promotional-ads"], queryFn: fetchAds })
  const [draft, setDraft] = useState(emptyDraft)
  const create = useMutation({ mutationFn: () => createAd(draft), onSuccess: async () => { setDraft(emptyDraft); await queryClient.invalidateQueries({ queryKey: ["custom-promotional-ads"] }) } })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["custom-promotional-ads"] })

  return (
    <div className="flex flex-col gap-6">
      <Container>
        <Heading level="h1">Homepage Promotions</Heading>
        <Text size="small" className="mt-1 text-ui-fg-subtle">Manage carousel slides, homepage banners, and flash-deal merchandising without changing storefront code.</Text>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Input placeholder="Eyebrow" value={draft.eyebrow} onChange={(e) => setDraft({ ...draft, eyebrow: e.target.value })} />
          <Input placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <Input placeholder="CTA label" value={draft.cta_label} onChange={(e) => setDraft({ ...draft, cta_label: e.target.value })} />
          <Input placeholder="Destination, e.g. /builder" value={draft.href} onChange={(e) => setDraft({ ...draft, href: e.target.value })} />
          <Input placeholder="Image URL (optional)" value={draft.image_url} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} />
          <Input placeholder="Discount label" value={draft.discount_label} onChange={(e) => setDraft({ ...draft, discount_label: e.target.value })} />
          <Input placeholder="Countdown end, ISO date" value={draft.countdown_ends_at} onChange={(e) => setDraft({ ...draft, countdown_ends_at: e.target.value })} />
          <Input placeholder="Priority" type="number" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })} />
          <select className="h-10 rounded-md border border-ui-border-base bg-ui-bg-field px-3 text-sm" value={draft.placement} onChange={(e) => setDraft({ ...draft, placement: e.target.value })}>
            <option value="homepage_carousel">Homepage carousel</option>
            <option value="homepage_flash_deals">Homepage flash deals</option>
            <option value="homepage_banner">Homepage banner</option>
          </select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} /> Active</label>
        </div>
        <Textarea className="mt-3" rows={3} placeholder="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        <Button className="mt-3" isLoading={create.isPending} disabled={!draft.title} onClick={() => create.mutate()}>Create promotion</Button>
      </Container>
      <div className="flex flex-col gap-4">
        <Heading level="h2">Published homepage content</Heading>
        {isLoading ? <Text size="small">Loading…</Text> : null}
        {error instanceof Error ? <Text className="text-ui-fg-error">{error.message}</Text> : null}
        {(data ?? []).map((ad) => <PromotionCard key={ad.id} ad={ad} onRefresh={refresh} />)}
      </div>
    </div>
  )
}

export const config = defineRouteConfig({ label: "Homepage Promotions" })

export default PromotionalAdsPage
