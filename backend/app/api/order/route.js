import { NextResponse } from "next/server";
import { connectDB } from "../../../lib/mongodb";
import { getSessionUser } from "../../../lib/auth";

const toNumber = (value, fallback = 0) => {
  const parsed = Number(
    String(value ?? "")
      .replace(/[^0-9.-]/g, "")
      .trim()
  );
  return Number.isFinite(parsed) ? parsed : fallback;
};

export async function POST(request) {
  const db = await connectDB();
  const user = await getSessionUser(request, db);
  if (!user) {
    return NextResponse.json(
      { message: "Please login or register before checkout." },
      { status: 401 }
    );
  }

  const order = await request.json();
  const items = Array.isArray(order.items) ? order.items : [];
  const calculatedTotal = items.reduce(
    (sum, item) => sum + toNumber(item.price, 0) * toNumber(item.quantity, 1),
    0
  );

  order.createdAt = new Date();
  order.status = "Placed";
  order.total = calculatedTotal;
  order.userId = user.id;
  order.username = user.username;
  order.email = user.email || "";

  const result = await db.collection("orders").insertOne(order);
  await db.collection("cart").deleteMany({});

  return NextResponse.json({
    message: "Order placed",
    orderId: result.insertedId.toString()
  });
}

export async function GET(request) {
  const db = await connectDB();
  const user = await getSessionUser(request, db);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const filter = user.isAdmin
    ? {}
    : {
        $or: [{ userId: user.id }, { email: String(user.email || "").trim().toLowerCase() }]
      };

  const orders = await db
    .collection("orders")
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  return NextResponse.json(
    orders.map((order) => ({
      _id: order._id.toString(),
      status: order.status || "Placed",
      total: toNumber(order.total, 0),
      paymentMethod: order.paymentMethod || "",
      paymentStatus: order.paymentStatus || "",
      createdAt: order.createdAt || null,
      items: Array.isArray(order.items) ? order.items : []
    }))
  );
}
