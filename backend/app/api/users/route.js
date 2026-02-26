import { NextResponse } from "next/server";
import { connectDB } from "../../../lib/mongodb";
import { getSessionUser } from "../../../lib/auth";

export async function GET(request) {
  const db = await connectDB();
  const me = await getSessionUser(request, db);

  if (!me) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!me.isAdmin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const users = await db
    .collection("users")
    .find({}, { projection: { username: 1, usernameLower: 1, isAdmin: 1, createdAt: 1 } })
    .sort({ createdAt: -1, username: 1 })
    .toArray();

  return NextResponse.json(
    users.map((user) => ({
      _id: user._id.toString(),
      username: user.username,
      usernameLower: user.usernameLower,
      isAdmin: Boolean(user.isAdmin),
      createdAt: user.createdAt || null
    }))
  );
}
