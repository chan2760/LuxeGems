import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/mongodb";
import { createSession, hashPassword, verifyPassword } from "../../../../lib/auth";

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resolveIsAdmin(user) {
  if (typeof user?.isAdmin === "boolean") return user.isAdmin;
  const adminFlag = String(user?.isAdmin ?? "").trim().toLowerCase();
  if (adminFlag === "true" || adminFlag === "1" || adminFlag === "yes") return true;
  if (adminFlag === "false" || adminFlag === "0" || adminFlag === "no") return false;
  return String(user?.role || "").toLowerCase() === "admin";
}

function resolveEmail(user) {
  return String(user?.email || "").trim().toLowerCase();
}

function deriveUsernameFromEmail(emailValue) {
  const local = String(emailValue || "")
    .trim()
    .toLowerCase()
    .split("@")[0];
  return local || "user";
}

function getDefaultDemoUser(normalizedIdentifier, password) {
  const isAdminLogin =
    (normalizedIdentifier === "admin@gmail.com" || normalizedIdentifier === "admin") &&
    password === "admin123";
  if (isAdminLogin) {
    return {
      username: "admin",
      email: "admin@gmail.com",
      isAdmin: true
    };
  }

  const isUserLogin =
    (normalizedIdentifier === "user@gmail.com" || normalizedIdentifier === "user") &&
    password === "user123";
  if (isUserLogin) {
    return {
      username: "user",
      email: "user@gmail.com",
      isAdmin: false
    };
  }

  return null;
}

export async function POST(request) {
  const db = await connectDB();
  const { email, username, password } = await request.json();

  const rawIdentifier = String(email || username || "").trim();
  const normalizedIdentifier = rawIdentifier.toLowerCase();
  const loginWithEmail = normalizedIdentifier.includes("@");
  const normalizedLocalPart = loginWithEmail
    ? normalizedIdentifier.split("@")[0].trim()
    : normalizedIdentifier;

  if (!normalizedIdentifier || !password) {
    return NextResponse.json(
      { message: "email and password are required" },
      { status: 400 }
    );
  }

  const searchRegex = new RegExp(`^${escapeRegex(normalizedIdentifier)}$`, "i");
  const localRegex = new RegExp(`^${escapeRegex(normalizedLocalPart)}$`, "i");
  const [usersByEmailLower, usersByEmail, usersByUsernameLower, usersByUsername] =
    await Promise.all([
      db.collection("users").find({ emailLower: normalizedIdentifier }).toArray(),
      db.collection("users").find({ email: searchRegex }).toArray(),
      db.collection("users").find({ usernameLower: normalizedLocalPart }).toArray(),
      db.collection("users").find({ username: localRegex }).toArray()
    ]);

  const candidatesMap = new Map();
  for (const userDoc of [
    ...usersByEmailLower,
    ...usersByEmail,
    ...usersByUsernameLower,
    ...usersByUsername
  ]) {
    candidatesMap.set(String(userDoc._id), userDoc);
  }
  const candidates = [...candidatesMap.values()];

  let authenticatedUser = null;
  let shouldMigratePassword = false;

  for (const userDoc of candidates) {
    const validHashed = verifyPassword(password, userDoc.passwordHash);
    const validLegacyPassword =
      typeof userDoc.password === "string" &&
      userDoc.password.length > 0 &&
      userDoc.password === password;
    const validPlainInHashField =
      typeof userDoc.passwordHash === "string" &&
      userDoc.passwordHash.length > 0 &&
      userDoc.passwordHash === password;

    if (validHashed || validLegacyPassword || validPlainInHashField) {
      authenticatedUser = userDoc;
      shouldMigratePassword = !validHashed;
      break;
    }
  }

  // Dev recovery path for demo accounts.
  // If demo credentials are used, force the account shape so admin privileges are not stale.
  const demoUser = getDefaultDemoUser(normalizedIdentifier, password);
  if (demoUser) {
    await db.collection("users").updateOne(
      {
        $or: [{ emailLower: demoUser.email }, { usernameLower: demoUser.username }]
      },
      {
        $set: {
          username: demoUser.username,
          usernameLower: demoUser.username,
          email: demoUser.email,
          emailLower: demoUser.email,
          passwordHash: hashPassword(password),
          isAdmin: demoUser.isAdmin
        },
        $unset: { password: "", role: "" },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );

    authenticatedUser = await db.collection("users").findOne({
      $or: [{ emailLower: demoUser.email }, { usernameLower: demoUser.username }]
    });
    shouldMigratePassword = false;
  }

  if (!authenticatedUser) {
    return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
  }

  const existingEmail = resolveEmail(authenticatedUser);
  const fallbackUsername =
    String(authenticatedUser.username || "").trim() ||
    (loginWithEmail
      ? deriveUsernameFromEmail(normalizedIdentifier)
      : deriveUsernameFromEmail(existingEmail));

  if (shouldMigratePassword) {
    const updateDoc = {
      passwordHash: hashPassword(password),
      username: fallbackUsername,
      usernameLower: fallbackUsername.toLowerCase(),
      isAdmin: resolveIsAdmin(authenticatedUser)
    };

    if (loginWithEmail) {
      updateDoc.email = normalizedIdentifier;
      updateDoc.emailLower = normalizedIdentifier;
    }

    await db.collection("users").updateOne(
      { _id: authenticatedUser._id },
      {
        $set: updateDoc,
        $unset: { password: "", role: "" }
      }
    );
    const refreshed = await db.collection("users").findOne({ _id: authenticatedUser._id });
    if (refreshed) authenticatedUser = refreshed;
  } else {
    const patch = {};
    if (loginWithEmail && resolveEmail(authenticatedUser) !== normalizedIdentifier) {
      patch.email = normalizedIdentifier;
      patch.emailLower = normalizedIdentifier;
    }
    if (!authenticatedUser.usernameLower) {
      patch.usernameLower = fallbackUsername.toLowerCase();
    }
    if (!authenticatedUser.username) {
      patch.username = fallbackUsername;
    }
    if (Object.keys(patch).length > 0) {
      await db.collection("users").updateOne({ _id: authenticatedUser._id }, { $set: patch });
      authenticatedUser = { ...authenticatedUser, ...patch };
    }
  }

  const { token, expiresAt } = await createSession(db, authenticatedUser._id);
  const response = NextResponse.json({
    user: {
      id: authenticatedUser._id.toString(),
      username: authenticatedUser.username || fallbackUsername,
      email: resolveEmail(authenticatedUser) || (loginWithEmail ? normalizedIdentifier : ""),
      isAdmin: resolveIsAdmin(authenticatedUser),
      firstName: String(authenticatedUser.firstName || "").trim(),
      lastName: String(authenticatedUser.lastName || "").trim(),
      phone: String(authenticatedUser.phone || "").trim(),
      birthday: String(authenticatedUser.birthday || "").trim(),
      province: String(authenticatedUser.province || "").trim(),
      gender: String(authenticatedUser.gender || "").trim(),
      country: String(authenticatedUser.country || "Thailand").trim(),
      the1Number: String(authenticatedUser.the1Number || "").trim(),
      marketingOptIn: Boolean(authenticatedUser.marketingOptIn)
    }
  });

  response.cookies.set("session_token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt
  });

  return response;
}
