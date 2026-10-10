// Thrown by services when a business rule fails, e.g. "not enough money".
// `field` is the form field the message belongs under (or null when it is
// about the whole action, like a delete). Route handlers turn it into
// a 400 response with { message, fieldErrors }.
export class FieldError extends Error {
  constructor(
    public field: string | null,
    message: string,
  ) {
    super(message);
  }
}
