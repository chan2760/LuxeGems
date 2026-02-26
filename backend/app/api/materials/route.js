import { connectDB } from "../../../lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  const db = await connectDB();
  const materials = await db.collection("materials").find().toArray();

  return NextResponse.json(
    materials.map(m => ({ ...m, _id: m._id.toString() }))
  );
}