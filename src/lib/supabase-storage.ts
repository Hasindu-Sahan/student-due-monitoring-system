const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BANK_SLIPS_BUCKET = "bank-slips";

function requireSupabaseConfig() {
  if (!SUPABASE_URL) throw new Error("SUPABASE_URL environment variable is not set");
  if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is not set");
  return { supabaseUrl: SUPABASE_URL.replace(/\/$/, ""), serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY };
}

function joinPath(...parts: string[]) {
  return parts.map((part) => part.replace(/^\/+|\/+$/g, "")).filter(Boolean).join("/");
}

function encodeObjectPath(objectPath: string) {
  return objectPath.split("/").map(encodeURIComponent).join("/");
}

export function buildBankSlipObjectPath(paymentId: number, fileName: string) {
  return joinPath(String(paymentId), `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}`);
}

export async function uploadBankSlip(objectPath: string, body: ArrayBuffer, contentType: string) {
  const { supabaseUrl, serviceRoleKey } = requireSupabaseConfig();
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${BANK_SLIPS_BUCKET}/${encodeObjectPath(objectPath)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload bank slip: ${response.status} ${await response.text()}`);
  }
}

export async function createSignedBankSlipUrl(objectPath: string, expiresIn = 60 * 60 * 24 * 7) {
  const { supabaseUrl, serviceRoleKey } = requireSupabaseConfig();
  const response = await fetch(`${supabaseUrl}/storage/v1/object/sign/${BANK_SLIPS_BUCKET}/${encodeObjectPath(objectPath)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create signed bank slip url: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as { signedURL?: string };
  if (!data.signedURL) throw new Error("Supabase did not return a signed URL");
  return `${supabaseUrl}${data.signedURL}`;
}
