import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import {
  deleteSpending,
  getSpending,
  updateSpending,
} from "@/lib/services/spending.service";
import { isUuid, parseSpendingInput } from "@/lib/spending-input";

const notFound = () =>
  NextResponse.json({ message: "Spending not found" }, { status: 404 });

// GET /api/spendings/:id
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/spendings/[id]">,
) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params; // params is a Promise in Next.js 15+
  if (!isUuid(id)) return notFound();

  const spending = await getSpending(user.id, id);
  return spending ? NextResponse.json({ spending }) : notFound();
}

// PATCH /api/spendings/:id
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/spendings/[id]">,
) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();

  const body = await request.json().catch(() => null);
  const parsed = parseSpendingInput(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Please fix the highlighted fields",
        fieldErrors: parsed.fieldErrors,
      },
      { status: 400 },
    );
  }

  const spending = await updateSpending(user.id, id, parsed.data);
  return spending ? NextResponse.json({ spending }) : notFound();
}

// DELETE /api/spendings/:id
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/spendings/[id]">,
) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();

  const deleted = await deleteSpending(user.id, id);
  return deleted ? new NextResponse(null, { status: 204 }) : notFound();
}
