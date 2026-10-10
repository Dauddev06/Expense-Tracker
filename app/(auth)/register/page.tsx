import Link from "next/link";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <div className="card">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        Start tracking where your money goes.
      </p>
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-indigo-600 hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
