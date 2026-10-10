import Link from "next/link";

export default function SpendingNotFound() {
  return (
    <div className="card text-center">
      <h1 className="text-xl font-bold">Spending not found</h1>
      <p className="mt-1 text-sm text-slate-500">
        It may have been deleted, or it isn&apos;t yours.
      </p>
      <Link href="/spendings" className="btn-primary mt-4">
        Back to spendings
      </Link>
    </div>
  );
}
