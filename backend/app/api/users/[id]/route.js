import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectDB } from "../../../../lib/mongodb";
import { getSessionUser } from "../../../../lib/auth";

export async function PATCH(request, { params }) {
  const db = await connectDB();
  const me = await getSessionUser(request, db);

  if (!me) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!me.isAdmin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const resolvedParams = await params;
  const { id } = resolvedParams || {};

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Invalid user id" }, { status: 400 });
  }

  const payload = await request.json();

  if (typeof payload.isAdmin !== "boolean") {
    return NextResponse.json({ message: "isAdmin must be boolean" }, { status: 400 });
  }

  if (me.id === id && payload.isAdmin === false) {
    return NextResponse.json(
      { message: "You cannot remove your own admin role" },
      { status: 400 }
    );
  }

  const result = await db.collection("users").findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { isAdmin: payload.isAdmin } },
    { returnDocument: "after", projection: { username: 1, isAdmin: 1, createdAt: 1 } }
  );

  if (!result) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    _id: result._id.toString(),
    username: result.username,
    isAdmin: Boolean(result.isAdmin),
    createdAt: result.createdAt || null
  });
}

export async function DELETE(request, { params }) {
  const db = await connectDB();
  const me = await getSessionUser(request, db);

  if (!me) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!me.isAdmin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const resolvedParams = await params;
  const { id } = resolvedParams || {};

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Invalid user id" }, { status: 400 });
  }

  if (me.id === id) {
    return NextResponse.json({ message: "You cannot delete your own account" }, { status: 400 });
  }

  const targetId = new ObjectId(id);
  const existing = await db.collection("users").findOne({ _id: targetId });
  if (!existing) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  await db.collection("users").deleteOne({ _id: targetId });
  await db.collection("sessions").deleteMany({ userId: targetId });

  return NextResponse.json({ message: "User deleted" });
}
