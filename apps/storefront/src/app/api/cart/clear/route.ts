import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next") ?? "/"
  const destination = next.startsWith("/") && !next.startsWith("//") ? next : "/"
  const response = NextResponse.redirect(new URL(destination, request.url))

  response.cookies.set("_medusa_cart_id", "", {
    maxAge: -1,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })

  return response
}
