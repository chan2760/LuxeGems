import crypto from "crypto";
import { ObjectId } from "mongodb";

const ITERATIONS = 120000;
const KEY_LENGTH = 64;
const DIGEST = "sha512";

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST)
    .toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedValue) {
  const [salt, expectedHash] = String(storedValue || "").split(":");
  if (!salt || !expectedHash) return false;
  if (expectedHash.length !== KEY_LENGTH * 2) return false;
  const actualHash = crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST)
    .toString("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedHash, "hex"),
      Buffer.from(actualHash, "hex")
    );
  } catch {
    return false;
  }
}

function resolveIsAdmin(user) {
  if (typeof user?.isAdmin === "boolean") return user.isAdmin;
  const adminFlag = String(user?.isAdmin ?? "").trim().toLowerCase();
  if (adminFlag === "true" || adminFlag === "1" || adminFlag === "yes") return true;
  if (adminFlag === "false" || adminFlag === "0" || adminFlag === "no") return false;
  return String(user?.role || "").toLowerCase() === "admin";
}

export async function createSession(db, userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.collection("sessions").insertOne({
    token,
    userId: new ObjectId(userId),
    expiresAt,
    createdAt: new Date()
  });
  return { token, expiresAt };
}

export async function getSessionUser(request, db) {
  const token = request.cookies.get("session_token")?.value;
  if (!token) return null;

  const session = await db.collection("sessions").findOne({ token });
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    await db.collection("sessions").deleteOne({ _id: session._id });
    return null;
  }

  const user = await db.collection("users").findOne({ _id: new ObjectId(session.userId) });
  if (!user) return null;

  const fallbackEmail = String(user.email || "").trim().toLowerCase();
  const fallbackUsername =
    String(user.username || "").trim() ||
    (fallbackEmail.includes("@") ? fallbackEmail.split("@")[0] : "user");
  const resolvedIsAdmin = resolveIsAdmin(user);

  return {
    id: user._id.toString(),
    username: fallbackUsername,
    email: fallbackEmail,
    isAdmin: resolvedIsAdmin,
    firstName: String(user.firstName || "").trim(),
    lastName: String(user.lastName || "").trim(),
    phone: String(user.phone || "").trim(),
    birthday: String(user.birthday || "").trim(),
    province: String(user.province || "").trim(),
    gender: String(user.gender || "").trim(),
    country: String(user.country || "Thailand").trim(),
    the1Number: String(user.the1Number || "").trim(),
    marketingOptIn: Boolean(user.marketingOptIn)
  };
}
