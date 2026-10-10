"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

// The shape of our form's data
type RegisterFormValues = {
  name: string;
  email: string;
  password: string;
};

export function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register, // connects an <input> to RHF
    handleSubmit, // validates first, then calls our onSubmit
    setError, // lets us put a server error on a specific field
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: RegisterFormValues) {
    setServerError(null);

    // ---- Frontend -> Backend: an HTTP POST with a JSON body ----
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();

    if (!res.ok) {
      // Show server-side field errors under the right inputs
      if (data.fieldErrors) {
        for (const [field, messages] of Object.entries(data.fieldErrors)) {
          setError(field as keyof RegisterFormValues, {
            message: (messages as string[])[0],
          });
        }
      }
      setServerError(data.message ?? "Registration failed");
      return;
    }

    router.push("/login?registered=1");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div>
        <label htmlFor="name" className="label">
          Name
        </label>
        <input
          id="name"
          className={`input ${errors.name ? "input-error" : ""}`}
          placeholder="Ali Khan"
          {...register("name", {
            required: "Name is required",
            minLength: {
              value: 2,
              message: "Name must be at least 2 characters",
            },
          })}
        />
        {errors.name && <p className="error-text">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input
          id="email"
          type="email"
          className={`input ${errors.email ? "input-error" : ""}`}
          placeholder="you@example.com"
          {...register("email", {
            required: "Email is required",
            pattern: {
              value: /^\S+@\S+\.\S+$/,
              message: "Enter a valid email",
            },
          })}
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
          className={`input ${errors.password ? "input-error" : ""}`}
          placeholder="At least 8 characters"
          {...register("password", {
            required: "Password is required",
            minLength: {
              value: 8,
              message: "Password must be at least 8 characters",
            },
          })}
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
        {isSubmitting ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
