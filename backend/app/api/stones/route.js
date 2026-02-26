import { connectDB } from "../../../lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  const db = await connectDB();
  const stones = await db.collection("stones").find().toArray();

  return NextResponse.json(
    stones.map(s => ({ ...s, _id: s._id.toString() }))
  );
}