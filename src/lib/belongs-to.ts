const BELONGS_TO_ALIASES: Record<string, string[]> = {
  Welfare: ["Welfare", "WELFARE"],
  FAS_Office: ["FAS_Office", "FAS", "FAS_Faculty", "FAS_OFFICE", "FAC001"],
  FOT_Office: ["FOT_Office", "FOT", "FOT_Faculty", "FOT_OFFICE", "FAC002"],
  FBSF_Office: ["FBSF_Office", "FBSF", "FBSF_Faculty", "FBSF_OFFICE", "FAC003"],
};

const PAYMENT_OWNER_OPTIONS = ["Welfare", "FAS_Office", "FOT_Office", "FBSF_Office"] as const;
const ADMIN_PAYMENT_OWNER: Record<string, string> = {
  A001: "Welfare",
  A002: "FAS_Office",
  A003: "FOT_Office",
  A004: "FBSF_Office",
  A005: "Welfare",
  A006: "Welfare",
  A007: "Welfare",
  A008: "Welfare",
};

export function normalizeBelongsTo(value?: string | null) {
  const input = value?.trim();
  if (!input) return "";

  const upper = input.toUpperCase();
  for (const [canonical, aliases] of Object.entries(BELONGS_TO_ALIASES)) {
    if (aliases.some((alias) => upper === alias.toUpperCase())) return canonical;
  }

  return input;
}

export function belongsToVariants(value?: string | null) {
  const normalized = normalizeBelongsTo(value);
  if (!normalized) return [];
  return BELONGS_TO_ALIASES[normalized] ?? [normalized];
}

export function resolvePaymentOwner(value?: string | null) {
  const input = value?.trim();
  if (!input) return "";
  if (PAYMENT_OWNER_OPTIONS.includes(input as (typeof PAYMENT_OWNER_OPTIONS)[number])) return input;
  return "";
}

export function paymentOwnerOptions() {
  return [...PAYMENT_OWNER_OPTIONS];
}

export function allowedPaymentOwnerForAdmin(username?: string | null) {
  if (!username) return "";
  return ADMIN_PAYMENT_OWNER[username.trim().toUpperCase()] ?? "";
}
