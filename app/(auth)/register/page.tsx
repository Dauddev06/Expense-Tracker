import Link from "next/link";
import { RegisterForm } from "./register-form";


export const metadata = { title: "Create your account" };
export default function RegisterPage() {
  return (
    <>
      <div className="card">
        <h1 className="page-title">Create your account</h1>
        <p className="mt-1 mb-6 text-muted">
          Keep track of your money in a few simple taps.
        </p>
        <RegisterForm />
        <p className="mt-6 text-center text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-ink underline">
            Log in
          </Link>
        </p>
      </div>
    </>
  );
}
