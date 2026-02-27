import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/mongodb";
import { getSessionUser } from "../../../../lib/auth";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif"
]);

const MIME_TO_EXTENSION = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif"
};

function resolveExtension(fileName, mimeType) {
  if (mimeType && MIME_TO_EXTENSION[mimeType]) return MIME_TO_EXTENSION[mimeType];

  const name = String(fileName || "").trim().toLowerCase();
  const ext = name.includes(".") ? name.split(".").pop() : "";
  if (!ext) return "";
  return ext.replace(/[^a-z0-9]/g, "");
}

export async function POST(request) {
  const db = await connectDB();
  const user = await getSessionUser(request, db);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!user.isAdmin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
    return NextResponse.json({ message: "Please upload a valid image file." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { message: "Image is too large. Maximum size is 5MB." },
      { status: 400 }
    );
  }

  const mimeType = String(file.type || "").trim().toLowerCase();
  if (mimeType && !ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      { message: "Unsupported image type. Use JPG, PNG, WEBP, GIF, or AVIF." },
      { status: 400 }
    );
  }

  const extension = resolveExtension(file.name, mimeType);
  if (!extension) {
    return NextResponse.json(
      { message: "Could not determine file extension." },
      { status: 400 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const result = await db.collection("mediaFiles").insertOne({
    kind: "product",
    originalName: String(file.name || "").trim(),
    mimeType: mimeType || "application/octet-stream",
    extension,
    size: bytes.length,
    data: bytes,
    uploadedBy: String(user.id || ""),
    createdAt: new Date()
  });

  const imagePath = `/api/media/${result.insertedId.toString()}`;
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host") || "";
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const protocol = forwardedProto || "http";
  const absoluteImageUrl = host ? `${protocol}://${host}${imagePath}` : imagePath;

  return NextResponse.json({
    message: "Product image uploaded.",
    mediaId: result.insertedId.toString(),
    imagePath,
    // Keep primary URL relative so frontend works behind reverse proxy and closed backend ports.
    imageUrl: imagePath,
    absoluteImageUrl
  });
}
