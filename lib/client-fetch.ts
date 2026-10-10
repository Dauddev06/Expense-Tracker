// Helpers used by our "use client" forms to talk to the route handlers.
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

export type ServerReply = {
  ok: boolean;
  // The JSON the route handler sent back ({} for "204 No Content")
  data: {
    message?: string;
    fieldErrors?: Record<string, string[]>;
    [key: string]: unknown;
  };
};

// fetch() with a JSON body, that always gives back { ok, data }.
export async function sendJson(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<ServerReply> {
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch {
    return {
      ok: false,
      data: { message: "Could not reach the server. Check your internet and try again." },
    };
  }
}

// Puts the server's fieldErrors under the matching inputs (setError).
// Returns a message for the top of the form ONLY when none of the errors
// belong to a field the form shows - so a message is never shown twice.
export function applyServerErrors<T extends FieldValues>(
  data: ServerReply["data"],
  setError: UseFormSetError<T>,
  formFields: string[],
): string | null {
  let shownUnderField = false;
  for (const [field, messages] of Object.entries(data.fieldErrors ?? {})) {
    if (formFields.includes(field)) {
      // shouldFocus scrolls the FIRST wrong field into view, so the message is seen
      setError(field as Path<T>, { message: messages[0] }, { shouldFocus: !shownUnderField });
      shownUnderField = true;
    }
  }
  return shownUnderField ? null : (data.message ?? "Something went wrong. Please try again.");
}
