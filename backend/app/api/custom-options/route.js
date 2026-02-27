import { NextResponse } from "next/server";
import { connectDB } from "../../../lib/mongodb";
import { getSessionUser } from "../../../lib/auth";

const DEFAULT_QUALITIES = [
  { label: "19k", multiplier: 1.05 },
  { label: "22k", multiplier: 1.15 },
  { label: "24k", multiplier: 1.25 }
];

const PLACEHOLDER_IMAGE = "https://via.placeholder.com/600x700?text=Custom+Design";
const DESIGN_CATEGORIES = new Set(["Ring", "Bracelet", "Necklace", "Earring"]);

const DEFAULT_DESIGNS = [
  {
    id: "bracelet-chain",
    title: "Chain Bracelet",
    category: "Bracelet",
    image: "/products/auric-chain-bracelet.webp",
    allowed: true,
    productId: ""
  },
  {
    id: "bracelet-alt",
    title: "Bracelet Alt",
    category: "Bracelet",
    image: "/products/bracelet-new.jpg",
    allowed: true,
    productId: ""
  },
  {
    id: "ring-sapphire",
    title: "Sapphire Ring",
    category: "Ring",
    image: "/products/midnight-sapphire-ring.jpg",
    allowed: true,
    productId: ""
  },
  {
    id: "necklace-pearl",
    title: "Pearl Necklace",
    category: "Necklace",
    image: "/products/velvet-pearl-necklace.jpg",
    allowed: true,
    productId: ""
  },
  {
    id: "earring-stud",
    title: "Stud Earrings",
    category: "Earring",
    image: "/products/nova-stud-earrings.jpg",
    allowed: true,
    productId: ""
  }
];

const DEFAULT_SLIDER_ITEMS = [
  {
    id: "auric-chain-bracelet",
    title: "Auric Chain Bracelet",
    image: "/products/auric-chain-bracelet.webp",
    description: "Chunky gold chain bracelet with polished links.",
    price: 730,
    productId: ""
  },
  {
    id: "midnight-sapphire-ring",
    title: "Midnight Sapphire Ring",
    image: "/products/midnight-sapphire-ring.jpg",
    description: "Platinum ring with deep sapphire centerpiece.",
    price: 1250,
    productId: ""
  },
  {
    id: "nova-stud-earrings",
    title: "Nova Stud Earrings",
    image: "/products/nova-stud-earrings.jpg",
    description: "Minimal stud earrings with a bright crystal cut.",
    price: 420,
    productId: ""
  }
];

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleFromId(id) {
  return String(id || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

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

function normalizeDesign(rawDesign, index) {
  const id = slugify(rawDesign?.id || rawDesign?.title || `design-${index + 1}`);
  if (!id) return null;

  const categoryCandidate = String(rawDesign?.category || "").trim();
  const category = DESIGN_CATEGORIES.has(categoryCandidate) ? categoryCandidate : "Ring";
  const title = String(rawDesign?.title || "").trim() || titleFromId(id) || `Design ${index + 1}`;
  const image = normalizeImageReference(rawDesign?.image) || PLACEHOLDER_IMAGE;
  const productId = String(rawDesign?.productId || "").trim();

  return {
    id,
    title,
    category,
    image,
    allowed: Boolean(rawDesign?.allowed),
    productId
  };
}

function normalizeDesignList(designs) {
  if (!Array.isArray(designs)) return [];
  const seenIds = new Set();
  const normalized = [];

  for (let i = 0; i < designs.length; i += 1) {
    const parsed = normalizeDesign(designs[i], i);
    if (!parsed || seenIds.has(parsed.id)) continue;
    seenIds.add(parsed.id);
    normalized.push(parsed);
  }

  return normalized;
}

function normalizeSliderItem(rawSlide, index) {
  const id = slugify(rawSlide?.id || rawSlide?.title || `slide-${index + 1}`);
  if (!id) return null;

  const title = String(rawSlide?.title || "").trim() || titleFromId(id) || `Slide ${index + 1}`;
  const image = normalizeImageReference(rawSlide?.image) || PLACEHOLDER_IMAGE;
  const description = String(rawSlide?.description || "").trim();
  const productId = String(rawSlide?.productId || "").trim();
  const numericPrice = Number(rawSlide?.price ?? 0);
  const price = Number.isFinite(numericPrice) && numericPrice >= 0 ? numericPrice : 0;

  return {
    id,
    title,
    image,
    description,
    price,
    productId
  };
}

function normalizeSliderList(sliderItems) {
  if (!Array.isArray(sliderItems)) return [];
  const seenIds = new Set();
  const normalized = [];

  for (let i = 0; i < sliderItems.length; i += 1) {
    const parsed = normalizeSliderItem(sliderItems[i], i);
    if (!parsed || seenIds.has(parsed.id)) continue;
    seenIds.add(parsed.id);
    normalized.push(parsed);
  }

  return normalized;
}

function mergeAllowedFlags(allowedDesigns, baseDesigns) {
  const nextMap = new Map(baseDesigns.map((item) => [item.id, { ...item }]));
  const payload = Array.isArray(allowedDesigns) ? allowedDesigns : [];

  for (const entry of payload) {
    const id = slugify(entry?.id);
    if (!id) continue;

    if (!nextMap.has(id)) {
      nextMap.set(id, {
        id,
        title: titleFromId(id) || "Custom Design",
        category: "Ring",
        image: PLACEHOLDER_IMAGE,
        allowed: Boolean(entry?.allowed),
        productId: ""
      });
      continue;
    }

    const existing = nextMap.get(id);
    existing.allowed = Boolean(entry?.allowed);
    nextMap.set(id, existing);
  }

  return [...nextMap.values()];
}

function sanitizeOptionsDocument(options) {
  const qualities =
    Array.isArray(options?.qualities) && options.qualities.length > 0
      ? options.qualities
      : DEFAULT_QUALITIES;

  let designs = normalizeDesignList(options?.designs);
  if (designs.length === 0 && Array.isArray(options?.allowedDesigns)) {
    designs = mergeAllowedFlags(options.allowedDesigns, DEFAULT_DESIGNS);
  }
  if (designs.length === 0) {
    designs = [...DEFAULT_DESIGNS];
  }

  const hasSliderItemsField =
    Boolean(options) && Object.prototype.hasOwnProperty.call(options, "sliderItems");
  let sliderItems = normalizeSliderList(options?.sliderItems);
  if (sliderItems.length === 0 && !hasSliderItemsField) {
    sliderItems = [...DEFAULT_SLIDER_ITEMS];
  }

  return {
    qualities,
    designs,
    allowedDesigns: designs.map(({ id, allowed }) => ({ id, allowed })),
    sliderItems
  };
}

export async function GET() {
  const db = await connectDB();
  const options = await db.collection("customizationOptions").findOne();
  return NextResponse.json(sanitizeOptionsDocument(options));
}

export async function PATCH(request) {
  const db = await connectDB();
  const user = await getSessionUser(request, db);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!user.isAdmin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json();
  const existing = await db.collection("customizationOptions").findOne();
  const normalizedExisting = sanitizeOptionsDocument(existing);

  let nextDesigns = normalizedExisting.designs;
  if (Array.isArray(payload.designs)) {
    nextDesigns = normalizeDesignList(payload.designs);
    if (nextDesigns.length === 0) {
      return NextResponse.json(
        { message: "At least one design is required." },
        { status: 400 }
      );
    }
  } else if (Array.isArray(payload.allowedDesigns)) {
    nextDesigns = mergeAllowedFlags(payload.allowedDesigns, nextDesigns);
  }

  let nextSliderItems = normalizedExisting.sliderItems;
  if (Array.isArray(payload.sliderItems)) {
    nextSliderItems = normalizeSliderList(payload.sliderItems);
  }

  const updateDoc = {
    qualities: normalizedExisting.qualities,
    designs: nextDesigns,
    allowedDesigns: nextDesigns.map(({ id, allowed }) => ({ id, allowed })),
    sliderItems: nextSliderItems,
    updatedAt: new Date()
  };

  await db.collection("customizationOptions").updateOne(
    {},
    {
      $set: updateDoc,
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true }
  );

  const updated = await db.collection("customizationOptions").findOne();
  return NextResponse.json(sanitizeOptionsDocument(updated));
}
