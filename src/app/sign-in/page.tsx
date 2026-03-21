import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-14">
      <main className="mx-auto max-w-md space-y-5">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
            IIT Ropar
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Log in / Sign up</h1>
        </div>

        <SignInForm />
      </main>
    </div>
  );
}
