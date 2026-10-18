"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { signIn } from "next-auth/react";

type LoginFormValues = {
  email: string;
  password: string;
};

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);

    // NextAuth posts to /api/auth/callback/credentials, which runs our
    // authorize() in auth.ts. redirect: false -> stay here and tell us how
    // it went, so we can show our own message inside the form.
    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (result?.error) {
      // Same message for "no such email" and "wrong password" on purpose:
      // we don't want to tell attackers which emails are registered.
      setServerError("Invalid email or password");
      return;
    }

    // NextAuth has set the login cookie. Go to the app.
    router.push("/home");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && (
        <div role="alert" className="rounded-xl bg-negative-soft px-3 py-2 text-sm text-negative">
          {serverError}
        </div>
      )}

      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input
          id="email"
          type="email"
          className={`input ${errors.email ? "input-error" : ""}`}
          placeholder="you@example.com"
          autoComplete="email"
          {...register("email", { required: "Email is required" })}
        />
        {errors.email && <p className="error-text">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className={`input ${errors.password ? "input-error" : ""}`}
          {...register("password", { required: "Password is required" })}
        />
        {errors.password && (
          <p className="error-text">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full"
      >
        {isSubmitting ? "Logging in..." : "Log in"}
      </button>
    </form>
  );
}
