import { NextResponse } from "next/server";
import { FieldError } from "@/lib/services/errors";
import type { FieldErrors } from "@/lib/input-helpers";

// Small helpers so every route handler answers in the same shape.

export function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

export function notFoundResponse(what: string) {
  return NextResponse.json({ message: `${what} not found` }, { status: 404 });
}

export function invalidResponse(fieldErrors: FieldErrors) {
  return NextResponse.json(
    { message: "Please fix the highlighted fields", fieldErrors },
    { status: 400 },
  );
}

// Turns a FieldError thrown by a service (e.g. "You only have PKR 2,300 in
// Pocket.") into a 400 response. Anything else is a real bug: rethrow it.
export function fieldErrorResponse(error: unknown) {
  if (error instanceof FieldError) {
    return NextResponse.json(
      {
        message: error.message,
        fieldErrors: error.field ? { [error.field]: [error.message] } : {},
      },
      { status: 400 },
    );
  }
  throw error;
}
