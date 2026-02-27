import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectDB } from "../../../../lib/mongodb";

export const runtime = "nodejs";

function toBuffer(rawData) {
  if (!rawData) return null;
  if (Buffer.isBuffer(rawData)) return rawData;

  // BSON Binary from MongoDB driver.
  if (Buffer.isBuffer(rawData.buffer)) {
    const end = typeof rawData.position === "number" ? rawData.position : rawData.buffer.length;
    return rawData.buffer.subarray(0, end);
  }

  if (rawData?.$binary?.base64) {
    return Buffer.from(rawData.$binary.base64, "base64");
  }

  return null;
}

export async function GET(_request, { params }) {
  const db = await connectDB();
  const resolvedParams = await params;
  const { id } = resolvedParams || {};

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Invalid media id" }, { status: 400 });
  }

  const media = await db.collection("mediaFiles").findOne({ _id: new ObjectId(id) });
  if (!media) {
    return NextResponse.json({ message: "Media not found" }, { status: 404 });
  }

  const bytes = toBuffer(media.data);
  if (!bytes) {
    return NextResponse.json({ message: "Media data is invalid" }, { status: 500 });
  }

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": String(media.mimeType || "application/octet-stream"),
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
}
