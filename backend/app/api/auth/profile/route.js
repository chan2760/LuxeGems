import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectDB } from "../../../../lib/mongodb";
import { getSessionUser } from "../../../../lib/auth";

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidGmail(value) {
  return /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(String(value || "").trim());
}

function sanitizeUserDocument(userDoc) {
  if (!userDoc) return null;
  const fullName = [userDoc.firstName, userDoc.lastName]
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .join(" ");

  return {
    id: String(userDoc._id),
    username: normalizeText(userDoc.username),
    email: normalizeEmail(userDoc.email),
    isAdmin: Boolean(userDoc.isAdmin),
    firstName: normalizeText(userDoc.firstName),
    lastName: normalizeText(userDoc.lastName),
    fullName,
    phone: normalizeText(userDoc.phone),
    birthday: normalizeText(userDoc.birthday),
    province: normalizeText(userDoc.province),
    gender: normalizeText(userDoc.gender),
    country: normalizeText(userDoc.country || "Thailand"),
    the1Number: normalizeText(userDoc.the1Number),
    marketingOptIn: Boolean(userDoc.marketingOptIn),
    addresses: Array.isArray(userDoc.addresses) ? userDoc.addresses : [],
    createdAt: userDoc.createdAt || null
  };
}

export async function GET(request) {
  const db = await connectDB();
  const me = await getSessionUser(request, db);
  if (!me) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const userDoc = await db.collection("users").findOne({ _id: new ObjectId(me.id) });
  if (!userDoc) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user: sanitizeUserDocument(userDoc) });
}

export async function PATCH(request) {
  const db = await connectDB();
  const me = await getSessionUser(request, db);
  if (!me) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const currentUser = await db.collection("users").findOne({ _id: new ObjectId(me.id) });
  if (!currentUser) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const update = { updatedAt: new Date() };

  if ("firstName" in payload) update.firstName = normalizeText(payload.firstName);
  if ("lastName" in payload) update.lastName = normalizeText(payload.lastName);
  if ("phone" in payload) update.phone = normalizeText(payload.phone);
  if ("birthday" in payload) update.birthday = normalizeText(payload.birthday);
  if ("province" in payload) update.province = normalizeText(payload.province);
  if ("gender" in payload) update.gender = normalizeText(payload.gender);
  if ("country" in payload) update.country = normalizeText(payload.country || "Thailand");
  if ("the1Number" in payload) update.the1Number = normalizeText(payload.the1Number);
  if ("marketingOptIn" in payload) update.marketingOptIn = Boolean(payload.marketingOptIn);

  const shouldUpdateEmail = "email" in payload || !normalizeEmail(currentUser.email);
  if (shouldUpdateEmail) {
    const email = normalizeEmail(payload.email || currentUser.email);
    if (!isValidGmail(email)) {
      return NextResponse.json(
        { message: "Please provide a valid Gmail address." },
        { status: 400 }
      );
    }

    const existing = await db.collection("users").findOne({
      _id: { $ne: new ObjectId(me.id) },
      $or: [{ emailLower: email }, { email }]
    });
    if (existing) {
      return NextResponse.json({ message: "This Gmail already exists." }, { status: 409 });
    }

    update.email = email;
    update.emailLower = email;
  }

  const birthday = String(update.birthday ?? currentUser.birthday ?? "").trim();
  if (birthday && !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
    return NextResponse.json(
      { message: "Birthday format must be YYYY-MM-DD." },
      { status: 400 }
    );
  }

  const gender = String(update.gender ?? currentUser.gender ?? "").trim();
  const allowedGenders = new Set(["", "Female", "Male", "Other", "Prefer not to say"]);
  if (!allowedGenders.has(gender)) {
    return NextResponse.json({ message: "Invalid gender value." }, { status: 400 });
  }

  const result = await db.collection("users").findOneAndUpdate(
    { _id: new ObjectId(me.id) },
    { $set: update },
    { returnDocument: "after" }
  );

  if (!result) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    message: "Profile updated",
    user: sanitizeUserDocument(result)
  });
}
