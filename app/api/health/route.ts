import { getDataSource } from "@/lib/db/data-source";

export async function GET() {
  try {
    const db = await getDataSource();
    const result = await db.query("SELECT NOW() AS now");
    return Response.json({ status: "ok", databaseTime: result[0].now });
  } catch (error) {
    console.error(error);
    return Response.json(
      { status: "error", message: "Could not connect to the database" },
      { status: 500 },
    );
  }
}
