import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectDB } from "../../../../lib/mongodb";
import { getSessionUser } from "../../../../lib/auth";

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
      ? { gemQuality: String(payload.gemQuality).trim() }
      : {}),
    ...(payload.image !== undefined ? { image: String(payload.image).trim() } : {}),
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

  await db.collection("products").deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ message: "Product deleted" });
}
