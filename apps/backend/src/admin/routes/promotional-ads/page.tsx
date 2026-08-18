import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Alert,
  Button,
  Container,
  FocusModal,
  Heading,
  Input,
  Label,
  Select,
  StatusBadge,
  Switch,
  Table,
  Text,
  Textarea,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { useMemo, useState } from "react"

type Placement = "homepage_carousel" | "homepage_flash_deals" | "homepage_banner" | "homepage_trust" | "homepage_side_banner"
type TargetType = "url" | "product" | "category"

type PromotionalAd = {
  id: string
  title: string
  eyebrow: string | null
  description: string | null
  image_url: string | null
  href: string
  target_type: TargetType
  target_id: string | null
  placement: Placement
  cta_label: string | null
  discount_label: string | null
  countdown_ends_at: string | null
  starts_at: string | null
  ends_at: string | null
  priority: number
  is_active: boolean
}

type PromotionDraft = {
  eyebrow: string
  title: string
  description: string
  image_url: string
  href: string
  target_type: TargetType
  target_id: string
  placement: Placement
  cta_label: string
  discount_label: string
  countdown_ends_at: string
  priority: string
  is_active: boolean
}

type PromotionTargets = {
  products: Array<{ id: string; title: string; handle: string }>
  categories: Array<{ id: string; name: string; handle: string }>
}

const placementLabels: Record<Placement, string> = {
  homepage_carousel: "Hero carousel",
  homepage_flash_deals: "Flash deals",
  homepage_banner: "Homepage banner",
  homepage_trust: "Trust strip",
  homepage_side_banner: "Side banner",
}

const emptyDraft: PromotionDraft = {
  eyebrow: "",
  title: "",
  description: "",
  image_url: "",
  href: "/store",
  target_type: "url",
  target_id: "",
  placement: "homepage_carousel",
  cta_label: "Shop now",
  discount_label: "",
  countdown_ends_at: "",
  priority: "0",
  is_active: true,
}

async function readError(response: Response, fallback: string) {
  if (response.ok) return
  const body = (await response.json().catch(() => ({}))) as { message?: string }
  throw new Error(body.message || fallback)
}

async function fetchAds(): Promise<PromotionalAd[]> {
  const response = await fetch("/admin/promotional-ads", { credentials: "include" })
  await readError(response, "Failed to load homepage promotions")
  return (await response.json() as { ads: PromotionalAd[] }).ads
}

async function fetchTargets(): Promise<PromotionTargets> {
  const response = await fetch("/admin/promotional-ads/targets", { credentials: "include" })
  await readError(response, "Failed to load promotion targets")
  return (await response.json()) as PromotionTargets
}

async function createAd(draft: PromotionDraft) {
  const response = await fetch("/admin/promotional-ads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      ...draft,
      priority: Number(draft.priority),
      countdown_ends_at: draft.countdown_ends_at || null,
    }),
  })
  await readError(response, "Failed to create homepage promotion")
}

async function updateAd(id: string, draft: PromotionDraft) {
  const response = await fetch(`/admin/promotional-ads/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      ...draft,
      priority: Number(draft.priority),
      countdown_ends_at: draft.countdown_ends_at || null,
    }),
  })
  await readError(response, "Failed to update homepage promotion")
}

async function deleteAd(id: string) {
  const response = await fetch(`/admin/promotional-ads/${id}`, {
    method: "DELETE",
    credentials: "include",
  })
  await readError(response, "Failed to delete homepage promotion")
}

function toDraft(ad: PromotionalAd): PromotionDraft {
  return {
    eyebrow: ad.eyebrow ?? "",
    title: ad.title,
    description: ad.description ?? "",
    image_url: ad.image_url ?? "",
    href: ad.href,
    target_type: ad.target_type ?? "url",
    target_id: ad.target_id ?? "",
    placement: ad.placement,
    cta_label: ad.cta_label ?? "",
    discount_label: ad.discount_label ?? "",
    countdown_ends_at: ad.countdown_ends_at ?? "",
    priority: String(ad.priority),
    is_active: ad.is_active,
  }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label size="small" weight="plus">{label}</Label>
      {children}
    </div>
  )
}

function PromotionEditor({
  draft,
  title,
  description,
  isSaving,
  error,
  targets,
  onChange,
  onSave,
}: {
  draft: PromotionDraft
  title: string
  description: string
  isSaving: boolean
  error: Error | null
  targets: PromotionTargets
  onChange: (draft: PromotionDraft) => void
  onSave: () => void
}) {
  const set = <K extends keyof PromotionDraft>(key: K, value: PromotionDraft[K]) => {
    onChange({ ...draft, [key]: value })
  }

  return (
    <FocusModal.Content>
        <FocusModal.Header>
          <div>
            <FocusModal.Title className="text-base font-medium leading-6">{title}</FocusModal.Title>
            <FocusModal.Description className="text-sm text-ui-fg-subtle">{description}</FocusModal.Description>
          </div>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col gap-6 overflow-y-auto p-6">
          {error ? <Alert variant="error">{error.message}</Alert> : null}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Placement">
              <Select value={draft.placement} onValueChange={(value) => set("placement", value as Placement)}>
                <Select.Trigger><Select.Value /></Select.Trigger>
                <Select.Content>
                  {Object.entries(placementLabels).map(([value, label]) => (
                    <Select.Item key={value} value={value}>{label}</Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </Field>
            <Field label="Link destination">
              <Select value={draft.target_type} onValueChange={(value) => set("target_type", value as TargetType)}>
                <Select.Trigger><Select.Value /></Select.Trigger>
                <Select.Content>
                  <Select.Item value="url">Direct URL</Select.Item>
                  <Select.Item value="product">Product</Select.Item>
                  <Select.Item value="category">Product category</Select.Item>
                </Select.Content>
              </Select>
            </Field>
            {draft.target_type === "url" ? <Field label="Destination URL"><Input value={draft.href} onChange={(event) => set("href", event.target.value)} /></Field> : <Field label={draft.target_type === "product" ? "Product" : "Product category"}>
              <Select value={draft.target_id} onValueChange={(value) => set("target_id", value)}>
                <Select.Trigger><Select.Value placeholder={`Choose a ${draft.target_type}`} /></Select.Trigger>
                <Select.Content>{(draft.target_type === "product" ? targets.products : targets.categories).map((target) => <Select.Item key={target.id} value={target.id}>{"title" in target ? target.title : target.name}</Select.Item>)}</Select.Content>
              </Select>
            </Field>}
            <Field label="Priority">
              <Input type="number" value={draft.priority} onChange={(event) => set("priority", event.target.value)} />
            </Field>
            <Field label="Title">
              <Input value={draft.title} onChange={(event) => set("title", event.target.value)} />
            </Field>
            <Field label="Eyebrow">
              <Input value={draft.eyebrow} onChange={(event) => set("eyebrow", event.target.value)} />
            </Field>
            <Field label="CTA label">
              <Input value={draft.cta_label} onChange={(event) => set("cta_label", event.target.value)} />
            </Field>
            <Field label="Discount label">
              <Input placeholder="-15% OFF" value={draft.discount_label} onChange={(event) => set("discount_label", event.target.value)} />
            </Field>
            <Field label="Countdown end">
              <Input type="datetime-local" value={draft.countdown_ends_at} onChange={(event) => set("countdown_ends_at", event.target.value)} />
            </Field>
          </div>
          <Field label="Description">
            <Textarea rows={4} value={draft.description} onChange={(event) => set("description", event.target.value)} />
          </Field>
          <Field label="Image URL">
            <Input placeholder="https://... (optional)" value={draft.image_url} onChange={(event) => set("image_url", event.target.value)} />
          </Field>
          <div className="flex items-center justify-between rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3">
            <div>
              <Label size="small" weight="plus">Published</Label>
              <Text size="small" className="text-ui-fg-subtle">Inactive promotions stay saved but do not appear in the storefront.</Text>
            </div>
            <Switch checked={draft.is_active} onCheckedChange={(checked) => set("is_active", checked)} />
          </div>
        </FocusModal.Body>
        <FocusModal.Footer>
          <FocusModal.Close asChild><Button variant="secondary">Cancel</Button></FocusModal.Close>
          <Button isLoading={isSaving} disabled={!draft.title.trim()} onClick={onSave}>Save promotion</Button>
        </FocusModal.Footer>
    </FocusModal.Content>
  )
}

function PromotionRow({ ad, onRefresh, targets }: { ad: PromotionalAd; onRefresh: () => Promise<void>; targets: PromotionTargets }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(() => toDraft(ad))
  const mutation = useMutation({
    mutationFn: () => updateAd(ad.id, draft),
    onSuccess: async () => {
      setOpen(false)
      await onRefresh()
    },
  })
  const remove = useMutation({
    mutationFn: () => deleteAd(ad.id),
    onSuccess: onRefresh,
  })

  const handleDelete = () => {
    if (window.confirm(`Delete “${ad.title}”?`)) remove.mutate()
  }

  return (
    <>
      <Table.Row>
        <Table.Cell>
          <div className="flex flex-col gap-0.5">
            <Text weight="plus">{ad.title}</Text>
            <Text size="xsmall" className="text-ui-fg-subtle">{ad.eyebrow || ad.href}</Text>
          </div>
        </Table.Cell>
        <Table.Cell><StatusBadge color="blue">{placementLabels[ad.placement]}</StatusBadge></Table.Cell>
        <Table.Cell><StatusBadge color={ad.is_active ? "green" : "grey"}>{ad.is_active ? "Published" : "Draft"}</StatusBadge></Table.Cell>
        <Table.Cell className="text-right">{ad.priority}</Table.Cell>
        <Table.Cell className="text-right">
          <div className="flex justify-end gap-2">
            <Button size="small" variant="secondary" onClick={() => setOpen(true)}>Edit</Button>
            <Button size="small" variant="danger" isLoading={remove.isPending} onClick={handleDelete}>Delete</Button>
          </div>
        </Table.Cell>
      </Table.Row>
      <FocusModal open={open} onOpenChange={setOpen}>
        <PromotionEditor
          draft={draft}
          title="Edit promotion"
          description="Update the content and publishing settings for this homepage placement."
          isSaving={mutation.isPending}
          error={mutation.error instanceof Error ? mutation.error : null}
          onChange={setDraft}
          onSave={() => mutation.mutate()}
          targets={targets}
        />
      </FocusModal>
    </>
  )
}

const PromotionalAdsPage = () => {
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery({ queryKey: ["custom-promotional-ads"], queryFn: fetchAds })
  const { data: targets = { products: [], categories: [] } } = useQuery({ queryKey: ["custom-promotion-targets"], queryFn: fetchTargets })
  const [createOpen, setCreateOpen] = useState(false)
  const [draft, setDraft] = useState<PromotionDraft>(emptyDraft)
  const [filter, setFilter] = useState<"all" | Placement>("all")
  const create = useMutation({
    mutationFn: () => createAd(draft),
    onSuccess: async () => {
      setDraft(emptyDraft)
      setCreateOpen(false)
      await queryClient.invalidateQueries({ queryKey: ["custom-promotional-ads"] })
    },
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["custom-promotional-ads"] })
  const promotions = useMemo(
    () => (data ?? []).filter((ad) => filter === "all" || ad.placement === filter),
    [data, filter]
  )
  const activeCount = (data ?? []).filter((ad) => ad.is_active).length
  const trustCount = (data ?? []).filter((ad) => ad.placement === "homepage_trust").length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Heading level="h1">Homepage promotions</Heading>
          <Text size="small" className="mt-1 text-ui-fg-subtle">Control the storefront hero, merchandising banners, flash deals, and trust strip from one place.</Text>
        </div>
        <FocusModal open={createOpen} onOpenChange={setCreateOpen}>
          <FocusModal.Trigger asChild><Button>Create promotion</Button></FocusModal.Trigger>
          <PromotionEditor
            draft={draft}
            title="Create promotion"
            description="Choose where this content appears, then publish it when it is ready."
            isSaving={create.isPending}
            error={create.error instanceof Error ? create.error : null}
            onChange={setDraft}
            onSave={() => create.mutate()}
            targets={targets}
          />
        </FocusModal>
      </div>

      <Alert variant="info">Higher priority items appear first. Use the Trust strip placement to manage the message bar above the storefront navigation.</Alert>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[["Total promotions", data?.length ?? 0], ["Published", activeCount], ["Trust strip messages", trustCount]].map(([label, value]) => (
          <Container key={label} className="flex items-center justify-between">
            <Text size="small" className="text-ui-fg-subtle">{label}</Text>
            <Text size="xlarge" weight="plus">{value}</Text>
          </Container>
        ))}
      </div>

      <Container className="p-0">
        <div className="flex flex-col gap-3 border-b border-ui-border-base p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Heading level="h2">Published content</Heading>
            <Text size="small" className="text-ui-fg-subtle">Edit a promotion to change its copy, placement, priority, or visibility.</Text>
          </div>
          <Select value={filter} onValueChange={(value) => setFilter(value as "all" | Placement)}>
            <Select.Trigger className="w-full md:w-52"><Select.Value placeholder="Filter placement" /></Select.Trigger>
            <Select.Content>
              <Select.Item value="all">All placements</Select.Item>
              {Object.entries(placementLabels).map(([value, label]) => <Select.Item key={value} value={value}>{label}</Select.Item>)}
            </Select.Content>
          </Select>
        </div>
        {error instanceof Error ? <Alert variant="error" className="m-4">{error.message}</Alert> : null}
        {isLoading ? <Text size="small" className="p-4 text-ui-fg-subtle">Loading promotions…</Text> : null}
        {!isLoading && !promotions.length ? <Text size="small" className="p-6 text-ui-fg-subtle">No promotions match this filter. Create one to start merchandising the homepage.</Text> : null}
        {promotions.length ? (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Promotion</Table.HeaderCell>
                <Table.HeaderCell>Placement</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Priority</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>{promotions.map((ad) => <PromotionRow key={ad.id} ad={ad} onRefresh={refresh} targets={targets} />)}</Table.Body>
          </Table>
        ) : null}
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({ label: "Homepage Promotions" })

export default PromotionalAdsPage
