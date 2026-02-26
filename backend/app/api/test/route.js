import { connectDB } from "../../../lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const db = await connectDB();

    await db.command({ ping: 1 });

    return NextResponse.json({ message: "Database Connected Successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Database Connection Failed", error: error.message},
      { status: 500 }
    );
  }
}
