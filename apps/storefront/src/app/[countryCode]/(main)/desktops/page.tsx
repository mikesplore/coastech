import { redirect } from "next/navigation"

type Props = {
  params: Promise<{ countryCode: string }>
}

export default async function DesktopsPage({ params }: Props) {
  const { countryCode } = await params

  redirect(`/${countryCode}/categories/desktops-prebuilts`)
}
