import { EmptyState } from "@/components/empty-state";

export default function SpendingNotFound() {
  return (
    <EmptyState
      icon="inbox"
      message="We couldn't find this spending. It may have been deleted."
      actionHref="/spendings"
      actionLabel="Back to spendings"
    />
  );
}
