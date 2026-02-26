import { connectDB } from "../../../lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

const DEFAULT_QUALITIES = [
  { label: "19k", multiplier: 1.05 },
  { label: "22k", multiplier: 1.15 },
  { label: "24k", multiplier: 1.25 }
];

const toPositiveNumber = (value, fallback = 1) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const escapeRegExp = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function findDesignLinkedProduct(db, payload, jewelryTypeName) {
  const productId = String(payload?.productId || "").trim();
  const designImage = String(payload?.designImage || "").trim();
  const designTitle = String(payload?.designTitle || "").trim();
  const category = String(jewelryTypeName || "").trim();

  if (ObjectId.isValid(productId)) {
    const linkedById = await db.collection("products").findOne({ _id: new ObjectId(productId) });
    if (linkedById) return linkedById;
  }

  if (designImage) {
    const linkedByImage = await db.collection("products").findOne({
      image: designImage,
      ...(category ? { category } : {})
    });
    if (linkedByImage) return linkedByImage;
  }

  if (designTitle) {
    const linkedByTitle = await db.collection("products").findOne({
      name: { $regex: `^${escapeRegExp(designTitle)}$`, $options: "i" },
      ...(category ? { category } : {})
    });
    if (linkedByTitle) return linkedByTitle;
  }

  return null;
}

async function findMaterialByName(db, materialName) {
  const normalized = String(materialName || "").trim();
  if (!normalized) return null;
  return db.collection("materials").findOne({
    name: { $regex: `^${escapeRegExp(normalized)}$`, $options: "i" }
  });
}

export async function POST(request) {
  const db = await connectDB();
  const payload = await request.json();
  const { materialId, jewelryTypeId, stoneName, grade, qualityMultiplier, qualityLabel } = payload;

  if (!ObjectId.isValid(materialId) || !ObjectId.isValid(jewelryTypeId)) {
    return NextResponse.json({ message: "Invalid material or jewelry type." }, { status: 400 });
  }

  const material = await db.collection("materials").findOne({
    _id: new ObjectId(materialId)
  });

  const jewelryType = await db.collection("jewelryTypes").findOne({
    _id: new ObjectId(jewelryTypeId)
  });

  if (!material || !jewelryType) {
    return NextResponse.json({ message: "Material or jewelry type not found." }, { status: 404 });
  }

  const optionsDoc = await db.collection("customizationOptions").findOne(
    {},
    { projection: { qualities: 1 } }
  );
  const qualityList =
    Array.isArray(optionsDoc?.qualities) && optionsDoc.qualities.length > 0
      ? optionsDoc.qualities
      : DEFAULT_QUALITIES;
  const qualityMultiplierMap = new Map(
    qualityList.map((quality) => [String(quality?.label || "").trim(), toPositiveNumber(quality?.multiplier, 1)])
  );
  const requestedQualityLabel = String(qualityLabel || "").trim();
  const requestedMultiplier =
    qualityMultiplierMap.get(requestedQualityLabel) ?? toPositiveNumber(qualityMultiplier, 1);

  let stonePrice = 0;
  const normalizedStoneName = String(stoneName || "").trim();
  const normalizedGrade = String(grade || "").trim();

  if (normalizedStoneName && normalizedGrade) {
    const stone = await db.collection("stones").findOne({ name: normalizedStoneName });

    if (stone) {
      const selected = Array.isArray(stone.grades)
        ? stone.grades.find((item) => String(item?.grade || "").trim() === normalizedGrade)
        : null;
      stonePrice = toPositiveNumber(selected?.price, 0);
    }
  }

  const linkedProduct = await findDesignLinkedProduct(db, payload, jewelryType?.name);
  if (linkedProduct) {
    const basePrice = toPositiveNumber(linkedProduct.price, 0);
    const baseQualityLabel = String(linkedProduct.quality || "").trim();
    const baseMultiplier = qualityMultiplierMap.get(baseQualityLabel) ?? 1;
    const selectedMaterialUnitPrice = toPositiveNumber(material?.pricePerGram, 1);
    const baseMaterial = await findMaterialByName(db, linkedProduct.material);
    const baseMaterialUnitPrice = toPositiveNumber(baseMaterial?.pricePerGram, selectedMaterialUnitPrice);
    const materialRatio =
      baseMaterialUnitPrice > 0 ? selectedMaterialUnitPrice / baseMaterialUnitPrice : 1;
    const qualityAdjustedPrice =
      baseMultiplier > 0 ? (basePrice / baseMultiplier) * requestedMultiplier : basePrice;
    const totalPrice = qualityAdjustedPrice * materialRatio + stonePrice;

    return NextResponse.json({
      totalPrice,
      pricingSource: "product",
      baseProductId: linkedProduct._id.toString(),
      baseProductQuality: baseQualityLabel || null,
      baseProductMaterial: String(linkedProduct.material || "").trim() || null,
      stonePrice
    });
  }

  const multiplier = requestedMultiplier;
  const totalPrice =
    material.pricePerGram * jewelryType.baseWeight * multiplier + stonePrice;

  return NextResponse.json({ totalPrice, pricingSource: "formula", stonePrice });
}
