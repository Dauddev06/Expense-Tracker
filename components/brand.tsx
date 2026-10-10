import { Icon } from "@/components/icons";

// The Pocket Manager logo: a wallet on a brand-coloured square
export function BrandMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const box =
    size === "sm"
      ? "size-8 rounded-[10px]"
      : size === "lg"
        ? "size-14 rounded-2xl"
        : "size-10 rounded-xl";
  const icon = size === "sm" ? "size-4" : size === "lg" ? "size-7" : "size-5";
  return (
    <span
      className={`flex shrink-0 items-center justify-center bg-brand text-on-brand shadow-sm shadow-brand/30 ${box}`}
    >
      <Icon name="wallet" className={icon} />
    </span>
  );
}

// Logo + name, for the top bar and the login pages
export function Brand({ size = "sm" }: { size?: "sm" | "md" }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <BrandMark size={size} />
      <span
        className={`font-semibold tracking-tight text-ink ${size === "md" ? "text-2xl" : "text-lg"}`}
      >
        Pocket Manager
      </span>
    </span>
  );
}
