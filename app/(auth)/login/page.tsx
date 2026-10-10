import Link from "next/link";
import { InstallAppButton } from "@/components/install-app-button";
import { LoginForm } from "./login-form";


export const metadata = { title: "Log in" };
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { registered } = await searchParams;

  return (
    <>
      <div className="card">
        <h1 className="page-title">Welcome back</h1>
        <p className="mt-1 mb-6 text-muted">Log in to see your money.</p>
        {registered && (
          <div className="mb-4 rounded-xl bg-positive-soft px-3 py-2 text-sm text-positive">
            Account created! You can log in now.
          </div>
        )}
        <LoginForm />
        <p className="mt-6 text-center text-muted">
          New here?{" "}
          <Link
            href="/register"
            className="font-medium text-brand-ink underline"
          >
            Create an account
          </Link>
        </p>
      </div>
      <InstallAppButton />
    </>
  );
}
