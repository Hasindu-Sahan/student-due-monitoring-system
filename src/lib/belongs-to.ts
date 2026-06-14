const BELONGS_TO_ALIASES: Record<string, string[]> = {
  Welfare: ["Welfare", "WELFARE"],
  FAS_Office: ["FAS_Office", "FAS", "FAS_Faculty", "FAS_OFFICE", "FAC001"],
  FOT_Office: ["FOT_Office", "FOT", "FOT_Faculty", "FOT_OFFICE", "FAC002"],
  FBSF_Office: ["FBSF_Office", "FBSF", "FBSF_Faculty", "FBSF_OFFICE", "FAC003"],
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
