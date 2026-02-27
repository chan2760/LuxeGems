import { connectDB } from "../../../lib/mongodb";
import { NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/auth";

function normalizeImageReference(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("/")) return raw;

  try {
    const parsed = new URL(raw);
    const path = String(parsed.pathname || "").trim();
    if (
      path.startsWith("/uploads/") ||
      path.startsWith("/products/") ||
      path.startsWith("/api/media/")
    ) {
      return path;
    }
    return raw;
  } catch {
    return raw;
  }
}

function normalizeGemQuality(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (["premium", "premiun", "premimum"].includes(normalized)) return "Premium";
  if (["standard", "standdard", "stardard", "standart"].includes(normalized)) {
    return "Standard";
  }
  return "";
}

export async function GET(request) {
  const db = await connectDB();

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  let query = {};
  if (category && category !== "all") {
    query.category = category;
  }

  const products = await db.collection("products").find(query).toArray();

  const formatted = products.map(p => ({
    ...p,
    image: normalizeImageReference(p.image),
    gemQuality: normalizeGemQuality(p.gemQuality),
    _id: p._id.toString()
  }));

  return NextResponse.json(formatted);
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

  const payload = await request.json();

  const product = {
    name: String(payload.name || "").trim(),
    category: String(payload.category || "").trim(),
    price: Number(payload.price || 0),
    material: String(payload.material || "").trim(),
    quality: String(payload.quality || "").trim(),
    gemQuality: normalizeGemQuality(payload.gemQuality),
    image: normalizeImageReference(payload.image),
    description: String(payload.description || "").trim(),
    showInSlider: Boolean(payload.showInSlider)
  };

  if (!product.name || !product.category) {
    return NextResponse.json(
      { message: "name and category are required" },
      { status: 400 }
    );
  }

  const result = await db.collection("products").insertOne(product);

  return NextResponse.json({
    ...product,
    _id: result.insertedId.toString()
  });
}
