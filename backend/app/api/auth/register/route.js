import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/mongodb";
import { hashPassword } from "../../../../lib/auth";

function isValidGmail(email) {
  return /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(String(email || "").trim());
}

function isValidUsername(username) {
  return /^[a-zA-Z0-9_]{3,24}$/.test(String(username || "").trim());
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function POST(request) {
  const db = await connectDB();
  const { username, email, password } = await request.json();

  const normalizedUsername = String(username || "").trim();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedUsernameLower = normalizedUsername.toLowerCase();

  if (
    !isValidUsername(normalizedUsername) ||
    !isValidGmail(normalizedEmail) ||
    String(password || "").length < 6
  ) {
    return NextResponse.json(
      {
        message:
          "Please enter a valid username (3-24 letters, numbers, underscore), Gmail address, and password (at least 6 characters)."
      },
      { status: 400 }
    );
  }

  const emailLower = normalizedEmail;
  const emailRegex = new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i");
  const exists = await db.collection("users").findOne({
    $or: [
      { emailLower },
      { email: emailRegex },
      { usernameLower: normalizedUsernameLower }
    ]
  });
  if (exists) {
    return NextResponse.json(
      { message: "Username or Gmail already exists." },
      { status: 409 }
    );
  }

  await db.collection("users").insertOne({
    username: normalizedUsername,
    usernameLower: normalizedUsernameLower,
    email: normalizedEmail,
    emailLower,
    passwordHash: hashPassword(password),
    isAdmin: false,
    firstName: "",
    lastName: "",
    phone: "",
    birthday: "",
    province: "",
    gender: "",
    country: "Thailand",
    the1Number: "",
    marketingOptIn: false,
    createdAt: new Date()
  });

  return NextResponse.json({ message: "Registered successfully" });
}
