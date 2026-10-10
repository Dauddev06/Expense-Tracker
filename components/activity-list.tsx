import Link from "next/link";
import type { ActivityItem } from "@/lib/services/activity.service";
import { friendlyDate } from "@/lib/dates";
import { IconTile } from "@/components/icons";
import { SignedMoney } from "@/components/signed-money";
import { ConfirmAction } from "@/components/confirm-action";

// The icon tile repeats what the sentence and the amount already say
const FLOW_TILE = {
  in: { icon: "arrow-in", tone: "bg-positive-soft text-positive" },
  out: { icon: "arrow-out", tone: "bg-negative-soft text-negative" },
  move: { icon: "move", tone: "bg-tile text-muted" },
} as const;

// A list of activity sentences: "Moved PKR 10,000 from Savings to Current"
export function ActivityList({ items, today }: { items: ActivityItem[]; today: string }) {
  return (
    <ul className="-my-3 divide-y divide-line-soft">
      {items.map((item) => {
        const tile = FLOW_TILE[item.flow];
        const body = (
          <>
            <IconTile name={tile.icon} tone={tile.tone} />
            <span className="min-w-0 flex-1">
              <span className="row-title block">{item.sentence}</span>
              <span className="row-meta block">{friendlyDate(item.date, today)}</span>
            </span>
            <SignedMoney amount={item.amount} flow={item.flow} />
          </>
        );
        return (
          <li key={item.key}>
            {item.href ? (
              <Link href={item.href} className="list-row -mx-2 rounded-xl px-2 hover:bg-surface-2">
                {body}
              </Link>
            ) : (
              <div className="list-row">{body}</div>
            )}
            {item.removable && (
              <div className="-mt-2 pb-2 pl-11">
                <ConfirmAction
                  variant="link"
                  label="Remove"
                  title="Remove this?"
                  message={`${item.sentence}. ${item.removable.effect}`}
                  confirmLabel="Yes, remove it"
                  url={`/api/money/${item.removable.id}`}
                  successMessage="Removed"
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
