export const PRIORITY_LABELS = ["P0", "P1", "P2", "P3"] as const;
export const CARD_COLOR_OPTIONS = [
  "slate",
  "rose",
  "amber",
  "emerald",
  "sky",
  "violet",
] as const;

export type CardColor = (typeof CARD_COLOR_OPTIONS)[number];

export function priorityLabel(p: number) {
  return PRIORITY_LABELS[Math.min(3, Math.max(0, p))] ?? "P2";
}

export function parsePriorityValue(raw: FormDataEntryValue | null) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 2;
  return Math.min(3, Math.max(0, Math.round(n)));
}

export function parseCardColor(raw: FormDataEntryValue | null): CardColor {
  const value = String(raw ?? "slate");
  return CARD_COLOR_OPTIONS.includes(value as CardColor)
    ? (value as CardColor)
    : "slate";
}

export function priorityTagClass(priority: number) {
  switch (priorityLabel(priority)) {
    case "P0":
      return "bg-rose-100 text-rose-900 ring-rose-200";
    case "P1":
      return "bg-amber-100 text-amber-900 ring-amber-200";
    case "P2":
      return "bg-sky-100 text-sky-900 ring-sky-200";
    default:
      return "bg-zinc-100 text-zinc-800 ring-zinc-200";
  }
}

export function cardTintClass(color: string) {
  switch (color) {
    case "rose":
      return "border-rose-200 bg-rose-50/80";
    case "amber":
      return "border-amber-200 bg-amber-50/80";
    case "emerald":
      return "border-emerald-200 bg-emerald-50/80";
    case "sky":
      return "border-sky-200 bg-sky-50/80";
    case "violet":
      return "border-violet-200 bg-violet-50/80";
    default:
      return "border-zinc-200 bg-white";
  }
}

export function colorDotClass(color: string) {
  switch (color) {
    case "rose":
      return "bg-rose-400";
    case "amber":
      return "bg-amber-400";
    case "emerald":
      return "bg-emerald-400";
    case "sky":
      return "bg-sky-400";
    case "violet":
      return "bg-violet-400";
    default:
      return "bg-zinc-400";
  }
}
