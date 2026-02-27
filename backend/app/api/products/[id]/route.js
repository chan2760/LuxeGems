import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectDB } from "../../../../lib/mongodb";
import { getSessionUser } from "../../../../lib/auth";

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

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeImage(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    return new URL(raw).pathname.toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

function matchesProductIdentity(entry, product) {
  const entryTitle = normalizeText(entry?.title || entry?.name);
  const productName = normalizeText(product?.name);
  const entryImage = normalizeImage(entry?.image);
  const productImage = normalizeImage(product?.image);

  const sameTitle = entryTitle && productName && entryTitle === productName;
  const sameImage = entryImage && productImage && entryImage === productImage;
  return Boolean(sameTitle || sameImage);
}

async function cleanupCustomizationOptions(db, productId, product) {
  const options = await db.collection("customizationOptions").findOne();
  if (!options) {
    return { removedSliderItems: 0, clearedDesignLinks: 0 };
  }

  const currentDesigns = Array.isArray(options.designs) ? options.designs : [];
  let clearedDesignLinks = 0;
  const nextDesigns = currentDesigns.map((design) => {
    const linkedProductId = String(design?.productId || "").trim();
    if (linkedProductId !== productId) return design;
    clearedDesignLinks += 1;
    return { ...design, productId: "" };
  });

  const currentSliderItems = Array.isArray(options.sliderItems) ? options.sliderItems : [];
  const nextSliderItems = currentSliderItems.filter((slide) => {
    const linkedProductId = String(slide?.productId || "").trim();
    if (linkedProductId === productId) return false;

    // Backward compatibility: old slider rows may have no productId.
    // In that case remove rows that match the deleted product title/image.
    if (!linkedProductId && matchesProductIdentity(slide, product)) return false;
    return true;
  });
  const removedSliderItems = currentSliderItems.length - nextSliderItems.length;

  if (removedSliderItems === 0 && clearedDesignLinks === 0) {
    return { removedSliderItems: 0, clearedDesignLinks: 0 };
  }

  await db.collection("customizationOptions").updateOne(
    {},
    {
      $set: {
        designs: nextDesigns,
        allowedDesigns: nextDesigns.map((design) => ({
          id: design.id,
          allowed: Boolean(design.allowed)
        })),
        sliderItems: nextSliderItems,
        updatedAt: new Date()
      }
    }
  );

  return { removedSliderItems, clearedDesignLinks };
}

export async function GET(_request, { params }) {
  const db = await connectDB();
  const resolvedParams = await params;
  const { id } = resolvedParams || {};

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Invalid product id" }, { status: 400 });
  }

  const product = await db.collection("products").findOne({
    _id: new ObjectId(id)
  });

  if (!product) {
    return NextResponse.json({ message: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...product,
    image: normalizeImageReference(product.image),
    gemQuality: normalizeGemQuality(product.gemQuality),
    _id: product._id.toString()
  });
}

export async function PATCH(request, { params }) {
  const db = await connectDB();
  const user = await getSessionUser(request, db);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!user.isAdmin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const resolvedParams = await params;
  const { id } = resolvedParams || {};

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Invalid product id" }, { status: 400 });
  }

  const payload = await request.json();
  const updateDoc = {
    ...(payload.name !== undefined ? { name: String(payload.name).trim() } : {}),
    ...(payload.category !== undefined
      ? { category: String(payload.category).trim() }
      : {}),
    ...(payload.price !== undefined ? { price: Number(payload.price || 0) } : {}),
    ...(payload.material !== undefined
      ? { material: String(payload.material).trim() }
      : {}),
    ...(payload.quality !== undefined
      ? { quality: String(payload.quality).trim() }
      : {}),
    ...(payload.gemQuality !== undefined
      ? { gemQuality: normalizeGemQuality(payload.gemQuality) }
      : {}),
    ...(payload.image !== undefined ? { image: normalizeImageReference(payload.image) } : {}),
    ...(payload.description !== undefined
      ? { description: String(payload.description).trim() }
      : {}),
    ...(payload.showInSlider !== undefined
      ? { showInSlider: Boolean(payload.showInSlider) }
      : {})
  };

  await db.collection("products").updateOne(
    { _id: new ObjectId(id) },
    { $set: updateDoc }
  );

  const updated = await db.collection("products").findOne({ _id: new ObjectId(id) });
  if (!updated) {
    return NextResponse.json({ message: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...updated,
    image: normalizeImageReference(updated.image),
    gemQuality: normalizeGemQuality(updated.gemQuality),
    _id: updated._id.toString()
  });
}

export async function DELETE(_request, { params }) {
  const db = await connectDB();
  const user = await getSessionUser(_request, db);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!user.isAdmin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const resolvedParams = await params;
  const { id } = resolvedParams || {};

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Invalid product id" }, { status: 400 });
  }

  const product = await db.collection("products").findOne({ _id: new ObjectId(id) });
  if (!product) {
    return NextResponse.json({ message: "Product not found" }, { status: 404 });
  }

  await db.collection("products").deleteOne({ _id: new ObjectId(id) });
  await db.collection("cart").deleteMany({ productId: id });
  const cleanup = await cleanupCustomizationOptions(db, id, product);

  return NextResponse.json({
    message: "Product deleted",
    cleanup
  });
}
