"use client"

import { useState } from "react"

import Register from "@modules/account/components/register"
import Login from "@modules/account/components/login"

export enum LOGIN_VIEW {
  SIGN_IN = "sign-in",
  REGISTER = "register",
}

const LoginTemplate = ({
  initialView,
  initialEmail,
}: {
  initialView?: string
  initialEmail?: string
}) => {
  const [currentView, setCurrentView] = useState(
    initialView === LOGIN_VIEW.REGISTER ? LOGIN_VIEW.REGISTER : LOGIN_VIEW.SIGN_IN
  )

  return (
    <div className="w-full flex justify-start px-8 py-8">
      {currentView === "sign-in" ? (
        <Login setCurrentView={setCurrentView} />
      ) : (
        <Register setCurrentView={setCurrentView} initialEmail={initialEmail} />
      )}
    </div>
  )
}

export default LoginTemplate
