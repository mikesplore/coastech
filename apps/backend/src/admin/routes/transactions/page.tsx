import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Input, Table, Text } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CreditCard } from "@medusajs/icons"
import { useState } from "react"

type Transaction = {
  id: string
  provider_id: string
  amount: number
  currency_code: string
  created_at: string
  captured_at: string | null
  canceled_at: string | null
  reference: string | null
  refunds: Array<{ id: string; amount: number; note: string | null }>
}

async function fetchTransactions() {
  const response = await fetch("/admin/transactions", { credentials: "include" })
  if (!response.ok) throw new Error("Failed to load transactions")
  return (await response.json() as { transactions: Transaction[] }).transactions
}

const TransactionsPage = () => {
  const queryClient = useQueryClient()
  const [refundId, setRefundId] = useState<string | null>(null)
  const [refundAmount, setRefundAmount] = useState("")
  const [refundNote, setRefundNote] = useState("")
  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: fetchTransactions,
  })
  const refund = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/admin/transactions/${refundId}/refund`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount: Number(refundAmount), note: refundNote }),
      })
      if (!response.ok) throw new Error("Refund failed")
    },
    onSuccess: async () => {
      setRefundId(null)
      setRefundAmount("")
      setRefundNote("")
      await queryClient.invalidateQueries({ queryKey: ["admin-transactions"] })
    },
  })

  const exportCsv = () => {
    const rows = transactions.map((transaction) => [
      transaction.id,
      transaction.provider_id,
      transaction.reference ?? "",
      transaction.amount,
      transaction.currency_code,
      transaction.created_at,
      transaction.refunds.reduce((total, refund) => total + refund.amount, 0),
    ])
    const csv = [["id", "provider", "reference", "amount", "currency", "created_at", "refunded"], ...rows]
      .map((row) => row.map((value) => JSON.stringify(value)).join(","))
      .join("\n")
    const link = document.createElement("a")
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    link.download = "coastech-transactions.csv"
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <Container className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading>Transactions</Heading>
          <Text className="text-ui-fg-subtle">Monitor Paystack payments and issue refunds.</Text>
        </div>
        <Button variant="secondary" onClick={exportCsv} disabled={!transactions.length}>Export CSV</Button>
      </div>
      {error && <Text className="text-ui-fg-error">{(error as Error).message}</Text>}
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Reference</Table.HeaderCell>
            <Table.HeaderCell>Provider</Table.HeaderCell>
            <Table.HeaderCell>Amount</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Refunded</Table.HeaderCell>
            <Table.HeaderCell />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {isLoading && <Table.Row><Table.Cell colSpan={6}>Loading transactions…</Table.Cell></Table.Row>}
          {!isLoading && !transactions.length && <Table.Row><Table.Cell colSpan={6}>No transactions found.</Table.Cell></Table.Row>}
          {transactions.map((transaction) => {
            const refunded = transaction.refunds.reduce((total, refund) => total + refund.amount, 0)
            const status = transaction.canceled_at ? "Canceled" : transaction.captured_at ? "Captured" : "Authorized"
            return (
              <Table.Row key={transaction.id}>
                <Table.Cell>{transaction.reference ?? transaction.id}</Table.Cell>
                <Table.Cell>{transaction.provider_id}</Table.Cell>
                <Table.Cell>{transaction.amount.toFixed(2)} {transaction.currency_code.toUpperCase()}</Table.Cell>
                <Table.Cell>{status}</Table.Cell>
                <Table.Cell>{refunded.toFixed(2)} {transaction.currency_code.toUpperCase()}</Table.Cell>
                <Table.Cell>
                  <Button size="small" variant="secondary" disabled={refunded >= transaction.amount} onClick={() => { setRefundId(transaction.id); setRefundAmount(String(transaction.amount - refunded)) }}>Refund</Button>
                </Table.Cell>
              </Table.Row>
            )
          })}
        </Table.Body>
      </Table>
      {refundId && (
        <div className="flex max-w-md flex-col gap-3 rounded-lg border p-4">
          <Heading level="h2">Issue refund</Heading>
          <Input value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} type="number" min="0.01" step="0.01" />
          <Input value={refundNote} onChange={(event) => setRefundNote(event.target.value)} placeholder="Reason or internal note" />
          <div className="flex gap-2"><Button variant="secondary" onClick={() => setRefundId(null)}>Cancel</Button><Button onClick={() => refund.mutate()} isLoading={refund.isPending}>Confirm refund</Button></div>
        </div>
      )}
    </Container>
  )
}

export default TransactionsPage

export const config = defineRouteConfig({ label: "Transactions", icon: CreditCard })
