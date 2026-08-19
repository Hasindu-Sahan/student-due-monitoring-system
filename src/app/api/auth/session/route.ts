import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("portalUser")?.value;

  if (!raw) {
    return NextResponse.json({ session: null });
  }

  try {
    return NextResponse.json({ session: JSON.parse(raw) });
  } catch {
    return NextResponse.json({ session: null });
  }
}
