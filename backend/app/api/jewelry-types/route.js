import { connectDB } from "../../../lib/mongodb";

import { NextResponse } from "next/server";

export async function GET() {
  const db = await connectDB();
  const types = await db.collection("jewelryTypes").find().toArray();

  return NextResponse.json(
    types.map(t => ({ ...t, _id: t._id.toString() }))
  );
}