import { connectDB } from "../../../lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

const toNumber = (value, fallback = 0) => {
  const parsed = Number(
    String(value ?? "")
      .replace(/[^0-9.-]/g, "")
      .trim()
  );
  return Number.isFinite(parsed) ? parsed : fallback;
};

export async function GET() {
  const db = await connectDB();
  const items = await db.collection("cart").find().toArray();
  const productIds = [
    ...new Set(
      items
        .map((item) => String(item?.productId || "").trim())
        .filter((id) => ObjectId.isValid(id))
    )
  ];

  const qualityByProductId = new Map();
  if (productIds.length > 0) {
    const products = await db
      .collection("products")
      .find({ _id: { $in: productIds.map((id) => new ObjectId(id)) } })
      .project({ quality: 1 })
      .toArray();

    for (const product of products) {
      qualityByProductId.set(
        String(product?._id || ""),
        String(product?.quality || "").trim()
      );
    }
  }

  return NextResponse.json(
    items.map((i) => ({
      ...i,
      price: toNumber(i.price, 0),
      quantity: toNumber(i.quantity, 1),
      quality: String(i.quality || qualityByProductId.get(String(i.productId || "")) || "").trim(),
      _id: i._id.toString()
    }))
  );
}

export async function POST(request) {
  const db = await connectDB();
  const data = await request.json();
  const normalizedPrice = toNumber(data.price, 0);
  const normalizedQuantity = toNumber(data.quantity, 1);

  if (data.productId) {
    const existing = await db.collection("cart").findOne({
      productId: data.productId
    });

    if (existing) {
      await db.collection("cart").updateOne(
        { _id: existing._id },
        { $inc: { quantity: normalizedQuantity } }
      );
      return NextResponse.json({ message: "Quantity updated" });
    }
  }

  await db.collection("cart").insertOne({
    ...data,
    price: normalizedPrice,
    quantity: normalizedQuantity
  });

  return NextResponse.json({ message: "Added to cart" });
}

export async function DELETE(request) {
  const db = await connectDB();
  const { id } = await request.json();

  await db.collection("cart").deleteOne({
    _id: new ObjectId(id)
  });

  return NextResponse.json({ message: "Removed" });
}
