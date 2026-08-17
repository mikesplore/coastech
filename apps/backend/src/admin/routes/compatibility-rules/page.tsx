import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Input, Text, Textarea } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"

type CompatibilityRule = {
  id: string
  name: string
  description: string | null
  source_category_id: string
  source_field_name: string
  target_category_id: string
  target_field_name: string
  operator: string
  error_message: string
  priority: number
  is_active: boolean
  config: Record<string, unknown> | null
}

async function fetchRules(): Promise<CompatibilityRule[]> {
  const res = await fetch("/admin/compatibility-rules", { credentials: "include" })
  if (!res.ok) {
    throw new Error("Failed to load rules")
  }
  const json = (await res.json()) as { rules: CompatibilityRule[] }
  return json.rules
}

async function createRule(payload: any) {
  const res = await fetch("/admin/compatibility-rules", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify([payload]),
  })
  if (!res.ok) {
    throw new Error("Failed to create rule")
  }
}

async function updateRule(id: string, payload: any) {
  const res = await fetch(`/admin/compatibility-rules/${id}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error("Failed to update rule")
  }
}

async function deleteRule(id: string) {
  const res = await fetch(`/admin/compatibility-rules/${id}`, {
    method: "DELETE",
    credentials: "include",
  })
  if (!res.ok) {
    throw new Error("Failed to delete rule")
  }
}

const CompatibilityRulesPage = () => {
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery({
    queryKey: ["custom-compatibility-rules"],
    queryFn: fetchRules,
  })

  const [newName, setNewName] = useState("")
  const [newJson, setNewJson] = useState("")

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = JSON.parse(newJson)
      await createRule(payload)
    },
    onSuccess: async () => {
      setNewName("")
      setNewJson("")
      await queryClient.invalidateQueries({ queryKey: ["custom-compatibility-rules"] })
    },
  })

  const defaultTemplate = useMemo(
    () =>
      JSON.stringify(
        {
          name: newName || "New Rule",
          description: "",
          source_category_id: "",
          source_field_name: "",
          target_category_id: "",
          target_field_name: "",
          operator: "equals",
          error_message: "Compatibility rule failed",
          priority: 0,
          is_active: true,
          config: null,
        },
        null,
        2
      ),
    [newName]
  )

  return (
    <Container>
      <div className="flex items-center justify-between">
        <Heading level="h1">Compatibility Rules</Heading>
      </div>

      {error instanceof Error ? (
        <Text size="small" className="mt-2 text-ui-fg-error">
          {error.message}
        </Text>
      ) : null}

      <div className="mt-6">
        <Heading level="h2">Create</Heading>
        <div className="mt-2 grid grid-cols-1 gap-2">
          <Input
            placeholder="Rule name"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value)
              if (!newJson) setNewJson(defaultTemplate)
            }}
          />
          <Textarea
            placeholder={defaultTemplate}
            value={newJson}
            onChange={(e) => setNewJson(e.target.value)}
            rows={10}
          />
          <div>
            <Button
              size="small"
              isLoading={createMutation.isPending}
              onClick={() => createMutation.mutate()}
              disabled={!newJson}
            >
              Create rule
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <Heading level="h2">Existing</Heading>
        {isLoading ? (
          <Text size="small" className="mt-2 text-ui-fg-subtle">
            Loading…
          </Text>
        ) : null}

        <div className="mt-3 grid grid-cols-1 gap-3">
          {(data ?? []).map((r) => (
            <RuleCard
              key={r.id}
              rule={r}
              onSave={async (payload) => {
                await updateRule(r.id, payload)
                await queryClient.invalidateQueries({ queryKey: ["custom-compatibility-rules"] })
              }}
              onDelete={async () => {
                await deleteRule(r.id)
                await queryClient.invalidateQueries({ queryKey: ["custom-compatibility-rules"] })
              }}
            />
          ))}
        </div>
      </div>
    </Container>
  )
}

const RuleCard = ({
  rule,
  onSave,
  onDelete,
}: {
  rule: CompatibilityRule
  onSave: (payload: any) => Promise<void>
  onDelete: () => Promise<void>
}) => {
  const [json, setJson] = useState(() => JSON.stringify(rule, null, 2))
  const saveMutation = useMutation({ mutationFn: async () => onSave(JSON.parse(json)) })
  const deleteMutation = useMutation({ mutationFn: onDelete })

  return (
    <Container>
      <div className="flex items-center justify-between">
        <Heading level="h3">{rule.name}</Heading>
        <div className="flex gap-2">
          <Button size="small" variant="secondary" isLoading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            Save
          </Button>
          <Button size="small" variant="danger" isLoading={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
            Delete
          </Button>
        </div>
      </div>
      <Textarea className="mt-3" value={json} onChange={(e) => setJson(e.target.value)} rows={12} />
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Compatibility Rules",
})

export default CompatibilityRulesPage

