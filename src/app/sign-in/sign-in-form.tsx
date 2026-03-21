"use client";

import { useState } from "react";
import { useActionState } from "react";
import { signInWithEmail } from "@/app/actions/auth";

const initialState: { error?: string } = {};

export function SignInForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) =>
      signInWithEmail(formData),
    initialState
  );

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
            mode === "login"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
            mode === "signup"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Sign up
        </button>
      </div>

      <input type="hidden" name="mode" value={mode} />

      <div>
        <label className="label">Email</label>
        <input
          name="email"
          type="email"
          required
          placeholder="name@example.com"
          className="input"
        />
      </div>

      <div>
        <label className="label">Password</label>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          placeholder="Enter password"
          className="input"
        />
      </div>

      {mode === "signup" && (
        <div>
          <label className="label">Confirm Password</label>
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={6}
            placeholder="Re-enter password"
            className="input"
          />
        </div>
      )}

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
      >
        {pending ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
      </button>
    </form>
  );
}
