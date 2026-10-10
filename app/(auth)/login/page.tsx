import Link from "next/link";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { registered } = await searchParams;

  return (
    <div className="card">
      <h1 className="text-2xl font-bold">Welcome back</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        Log in to see your spendings.
      </p>
      {registered && (
        <div className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Account created! You can log in now.
        </div>
      )}
      <LoginForm />
      <p className="mt-6 text-center text-sm text-slate-500">
        New here?{" "}
        <Link
          href="/register"
          className="font-medium text-indigo-600 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
