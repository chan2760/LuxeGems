import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectDB } from "../../../../../lib/mongodb";
import { getSessionUser } from "../../../../../lib/auth";
import { buildReceiptPdf } from "../../../../../lib/receiptPdf";

export async function GET(request, { params }) {
  const db = await connectDB();
  const user = await getSessionUser(request, db);

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const { id } = resolvedParams || {};

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Invalid order id" }, { status: 400 });
  }

  const order = await db.collection("orders").findOne({ _id: new ObjectId(id) });
  if (!order) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }

  if (!user.isAdmin && String(order.userId || "") !== user.id) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const pdfBuffer = buildReceiptPdf(order);

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"receipt-${id}.pdf\"`,
      "Cache-Control": "no-store"
    }
  });
}
