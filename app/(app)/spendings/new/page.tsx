import { SpendingForm } from "@/components/spending-form";

export default function NewSpendingPage() {
  return (
    <div className="card">
      <h1 className="mb-6 text-2xl font-bold">Add a spending</h1>
      <SpendingForm mode="create" />
    </div>
  );
}
