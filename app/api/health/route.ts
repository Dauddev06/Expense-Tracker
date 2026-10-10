import { getDataSource } from "@/lib/db/data-source";

// GET /api/health -> is the database reachable, and how FAST is it?
//
// Every page asks the database several things one after another, so the time
// of ONE trip to the database ("roundTripMs") decides how fast the whole app
// feels. It should be a few milliseconds. If it is 100+ ms, the server and
// the database are far apart: put them in the same region (see "region").
export async function GET() {
  try {
    const db = await getDataSource();
    const result = await db.query("SELECT NOW() AS now");

    // Time 3 tiny queries one after another and keep the fastest
    const timings: number[] = [];
    for (let i = 0; i < 3; i++) {
      const start = performance.now();
      await db.query("SELECT 1");
      timings.push(performance.now() - start);
    }

    return Response.json(
      {
        status: "ok",
        databaseTime: result[0].now,
        // Where this server code runs on Vercel, e.g. "iad1" (Washington) or "sin1" (Singapore)
        region: process.env.VERCEL_REGION ?? "local",
        roundTripMs: Math.round(Math.min(...timings)),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { status: "error", message: "Could not connect to the database" },
      { status: 500 },
    );
  }
}
