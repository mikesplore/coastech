import { Metadata } from "next"

import LoginTemplate from "@modules/account/templates/login-template"

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Medusa Store account.",
}

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; email?: string }>
}) {
  const params = await searchParams
  return <LoginTemplate initialView={params.view} initialEmail={params.email} />
}
