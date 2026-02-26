import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/mongodb";
import { hashPassword } from "../../../../lib/auth";

export async function GET() {
  const db = await connectDB();

  await db.collection("users").deleteMany({
    $or: [
      { usernameLower: { $in: ["admin", "user"] } },
      { emailLower: { $in: ["admin@gmail.com", "user@gmail.com"] } }
    ]
  });

  const now = new Date();
  await db.collection("users").insertMany([
    {
      username: "admin",
      usernameLower: "admin",
      email: "admin@gmail.com",
      emailLower: "admin@gmail.com",
      passwordHash: hashPassword("admin123"),
      isAdmin: true,
      firstName: "Admin",
      lastName: "User",
      phone: "",
      birthday: "",
      province: "",
      gender: "",
      country: "Thailand",
      the1Number: "",
      marketingOptIn: false,
      createdAt: now
    },
    {
      username: "user",
      usernameLower: "user",
      email: "user@gmail.com",
      emailLower: "user@gmail.com",
      passwordHash: hashPassword("user123"),
      isAdmin: false,
      firstName: "Customer",
      lastName: "User",
      phone: "",
      birthday: "",
      province: "",
      gender: "",
      country: "Thailand",
      the1Number: "",
      marketingOptIn: false,
      createdAt: now
    }
  ]);

  const usersCount = await db.collection("users").countDocuments({});

  return NextResponse.json({
    message: "Auth users reset",
    login: {
      admin: { email: "admin@gmail.com", password: "admin123" },
      user: { email: "user@gmail.com", password: "user123" }
    },
    usersCount
  });
}
