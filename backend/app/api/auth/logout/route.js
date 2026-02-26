import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/mongodb";

export async function POST(request) {
  const db = await connectDB();
  const token = request.cookies.get("session_token")?.value;
  if (token) {
    await db.collection("sessions").deleteOne({ token });
  }

  const response = NextResponse.json({ message: "Logged out" });
  response.cookies.set("session_token", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
  return response;
}
