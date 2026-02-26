import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/mongodb";
import { getSessionUser } from "../../../../lib/auth";

export async function GET(request) {
  const db = await connectDB();
  const user = await getSessionUser(request, db);
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null });
  }
  return NextResponse.json({ authenticated: true, user });
}
