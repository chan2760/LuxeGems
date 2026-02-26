import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

const DEFAULT_DESIGNS = [
  {
    id: "bracelet-chain",
    category: "Bracelet",
    image: "/products/auric-chain-bracelet.webp",
    title: "Chain Bracelet",
    allowed: true,
    productId: ""
  },
  {
    id: "bracelet-alt",
    category: "Bracelet",
    image: "/products/bracelet-new.jpg",
    title: "Bracelet Alt",
    allowed: true,
    productId: ""
  },
  {
    id: "ring-sapphire",
    category: "Ring",
    image: "/products/midnight-sapphire-ring.jpg",
    title: "Sapphire Ring",
    allowed: true,
    productId: ""
  },
  {
    id: "necklace-pearl",
    category: "Necklace",
    image: "/products/velvet-pearl-necklace.jpg",
    title: "Pearl Necklace",
    allowed: true,
    productId: ""
  },
  {
    id: "earring-stud",
    category: "Earring",
    image: "/products/nova-stud-earrings.jpg",
    title: "Stud Earrings",
    allowed: true,
    productId: ""
  }
];

function CustomizePage() {
  const [materials, setMaterials] = useState([]);
  const [jewelryTypes, setJewelryTypes] = useState([]);
  const [qualities, setQualities] = useState([]);
  const [stones, setStones] = useState([]);
  const [designs, setDesigns] = useState(DEFAULT_DESIGNS);
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [selectedJewelryType, setSelectedJewelryType] = useState("");
  const [selectedQuality, setSelectedQuality] = useState("");
  const [selectedStoneName, setSelectedStoneName] = useState("");
  const [selectedStoneGrade, setSelectedStoneGrade] = useState("");
  const [selectedDesignImage, setSelectedDesignImage] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceContext, setPriceContext] = useState(null);
  const priceRequestRef = useRef(0);

  useEffect(() => {
    Promise.all([
      fetch("/api/materials").then((res) => res.json()),
      fetch("/api/jewelry-types").then((res) => res.json()),
      fetch("/api/custom-options").then((res) => res.json()),
      fetch("/api/stones").then((res) => res.json())
    ]).then(([materialsData, jewelryTypesData, optionsData, stonesData]) => {
      setMaterials(Array.isArray(materialsData) ? materialsData : []);
      setJewelryTypes(Array.isArray(jewelryTypesData) ? jewelryTypesData : []);
      setQualities(Array.isArray(optionsData?.qualities) ? optionsData.qualities : []);
      setStones(Array.isArray(stonesData) ? stonesData : []);
      const designList =
        Array.isArray(optionsData?.designs) && optionsData.designs.length > 0
          ? optionsData.designs
          : DEFAULT_DESIGNS;
      setDesigns(designList);
    });
  }, []);

  const selectedMaterialObject = useMemo(
    () => materials.find((m) => m._id === selectedMaterial),
    [materials, selectedMaterial]
  );
  const selectedTypeObject = useMemo(
    () => jewelryTypes.find((t) => t._id === selectedJewelryType),
    [jewelryTypes, selectedJewelryType]
  );
  const selectedQualityObject = useMemo(
    () => qualities.find((q) => q.label === selectedQuality),
    [qualities, selectedQuality]
  );
  const selectedStoneObject = useMemo(
    () => stones.find((stone) => stone.name === selectedStoneName),
    [stones, selectedStoneName]
  );
  const stoneGrades = useMemo(
    () => (Array.isArray(selectedStoneObject?.grades) ? selectedStoneObject.grades : []),
    [selectedStoneObject]
  );
  const selectedStoneGradeObject = useMemo(
    () => stoneGrades.find((stoneGrade) => stoneGrade.grade === selectedStoneGrade),
    [stoneGrades, selectedStoneGrade]
  );
  const selectedQualityMultiplier = Number(selectedQualityObject?.multiplier || 1);

  const selectedTypeName = selectedTypeObject?.name || "";

  const allowedDesigns = useMemo(
    () => designs.filter((item) => Boolean(item.allowed)),
    [designs]
  );

  const filteredDesignPhotos = useMemo(() => {
    if (!selectedTypeName) return allowedDesigns;
    return allowedDesigns.filter((item) => item.category === selectedTypeName);
  }, [selectedTypeName, allowedDesigns]);

  useEffect(() => {
    if (!selectedStoneName) {
      setSelectedStoneGrade("");
      return;
    }

    const hasCurrentGrade = stoneGrades.some((stoneGrade) => stoneGrade.grade === selectedStoneGrade);
    if (!hasCurrentGrade) {
      setSelectedStoneGrade(stoneGrades[0]?.grade || "");
    }
  }, [selectedStoneGrade, selectedStoneName, stoneGrades]);

  const activeDesignImage =
    selectedDesignImage && filteredDesignPhotos.some((p) => p.image === selectedDesignImage)
      ? selectedDesignImage
      : filteredDesignPhotos[0]?.image || "";
  const activeDesign = useMemo(
    () => filteredDesignPhotos.find((item) => item.image === activeDesignImage) || null,
    [filteredDesignPhotos, activeDesignImage]
  );

  const calculatePrice = useCallback(async ({ silent = false } = {}) => {
    if (!selectedMaterial || !selectedJewelryType || !selectedQuality) {
      setEstimatedPrice(0);
      setPriceContext(null);
      if (!silent) {
        alert("Please select material, jewellery type, and quality.");
      }
      return null;
    }

    const requestId = priceRequestRef.current + 1;
    priceRequestRef.current = requestId;
    setPriceLoading(true);
    try {
      const response = await fetch("/api/calculate-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: selectedMaterial,
          jewelryTypeId: selectedJewelryType,
          qualityMultiplier: selectedQualityMultiplier,
          qualityLabel: selectedQuality,
          stoneName: selectedStoneName || undefined,
          grade: selectedStoneGrade || undefined,
          productId: String(activeDesign?.productId || ""),
          designImage: String(activeDesign?.image || activeDesignImage || ""),
          designTitle: String(activeDesign?.title || "")
        })
      });

      if (!response.ok) {
        throw new Error("Price calculation failed.");
      }

      const data = await response.json();
      const totalPrice = Number(data.totalPrice || 0);
      if (requestId !== priceRequestRef.current) {
        return null;
      }
      setEstimatedPrice(totalPrice);
      setPriceContext({
        materialId: selectedMaterial,
        jewelryTypeId: selectedJewelryType,
        quality: selectedQuality,
        stoneName: selectedStoneName,
        stoneGrade: selectedStoneGrade
      });
      return totalPrice;
    } catch (err) {
      if (requestId !== priceRequestRef.current) {
        return null;
      }
      setEstimatedPrice(0);
      setPriceContext(null);
      if (!silent) {
        alert(err.message || "Unable to calculate price right now.");
      }
      return null;
    } finally {
      if (requestId === priceRequestRef.current) {
        setPriceLoading(false);
      }
    }
  }, [
    selectedJewelryType,
    selectedMaterial,
    selectedQuality,
    selectedQualityMultiplier,
    selectedStoneGrade,
    selectedStoneName,
    activeDesign?.image,
    activeDesign?.productId,
    activeDesign?.title,
    activeDesignImage
  ]);

  useEffect(() => {
    if (!selectedMaterial || !selectedJewelryType || !selectedQuality) {
      setEstimatedPrice(0);
      setPriceContext(null);
      return;
    }
    calculatePrice({ silent: true });
  }, [
    selectedMaterial,
    selectedJewelryType,
    selectedQuality,
    selectedStoneName,
    selectedStoneGrade,
    calculatePrice
  ]);

  const isPriceCurrent =
    Boolean(priceContext) &&
    priceContext.materialId === selectedMaterial &&
    priceContext.jewelryTypeId === selectedJewelryType &&
    priceContext.quality === selectedQuality &&
    String(priceContext.stoneName || "") === String(selectedStoneName || "") &&
    String(priceContext.stoneGrade || "") === String(selectedStoneGrade || "");

  const addCustomizedToCart = async () => {
    if (!selectedMaterial || !selectedJewelryType || !selectedQuality) {
      alert("Please select material, jewellery type, and quality.");
      return;
    }
    let finalPrice = estimatedPrice;
    if (priceLoading || !estimatedPrice || !isPriceCurrent) {
      const recalculatedPrice = await calculatePrice({ silent: false });
      if (!recalculatedPrice) return;
      finalPrice = recalculatedPrice;
    }
    if (!finalPrice) {
      alert("Unable to calculate price for the selected quality.");
      return;
    }

    await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Custom ${selectedTypeObject?.name || "Jewelry"} (${selectedQuality}${
          selectedStoneName ? `, ${selectedStoneName} ${selectedStoneGrade || ""}` : ""
        })`,
        image: activeDesignImage || "https://via.placeholder.com/600x700?text=Custom+Jewelry",
        category: selectedTypeObject?.name || "Jewelry",
        material: selectedMaterialObject?.name || "",
        quality: selectedQuality,
        stoneName: selectedStoneName || "",
        stoneGrade: selectedStoneGrade || "",
        stonePrice: Number(selectedStoneGradeObject?.price || 0),
        price: finalPrice,
        quantity: 1
      })
    });

    alert("Customized item added to cart.");
  };

  return (
    <section className="customize-page">
      <div className="customize-header">
        <h2>Customize Jewelry</h2>
        <Link to="/" className="text-link">
          ← Back to shop
        </Link>
      </div>

      <div className="customize-grid">
        <label>
          Material Type
          <select value={selectedMaterial} onChange={(e) => setSelectedMaterial(e.target.value)}>
            <option value="">Select material</option>
            {materials.map((material) => (
              <option key={material._id} value={material._id}>
                {material.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Jewellery Type
          <select
            value={selectedJewelryType}
            onChange={(e) => setSelectedJewelryType(e.target.value)}
          >
            <option value="">Select type</option>
            {jewelryTypes.map((type) => (
              <option key={type._id} value={type._id}>
                {type.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Quality / Karat
          <select value={selectedQuality} onChange={(e) => setSelectedQuality(e.target.value)}>
            <option value="">Select quality</option>
            {qualities.map((quality) => (
              <option key={quality.label} value={quality.label}>
                {quality.label} ({Number(quality.multiplier || 1).toFixed(2)}x)
              </option>
            ))}
          </select>
        </label>

        <label>
          Gem (Optional)
          <select
            value={selectedStoneName}
            onChange={(e) => {
              setSelectedStoneName(e.target.value);
            }}
          >
            <option value="">No gem</option>
            {stones.map((stone) => (
              <option key={stone._id || stone.name} value={stone.name}>
                {stone.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Gem Grade
          <select
            value={selectedStoneGrade}
            disabled={!selectedStoneName}
            onChange={(e) => setSelectedStoneGrade(e.target.value)}
          >
            {!selectedStoneName && <option value="">Select gem first</option>}
            {selectedStoneName && stoneGrades.length === 0 && <option value="">No grades found</option>}
            {selectedStoneName &&
              stoneGrades.map((stoneGrade) => (
                <option key={stoneGrade.grade} value={stoneGrade.grade}>
                  {stoneGrade.grade} (+${Number(stoneGrade.price || 0).toFixed(2)})
                </option>
              ))}
          </select>
        </label>
      </div>

      <h3>Choose Your Design Photo</h3>
      <div className="design-grid">
        {filteredDesignPhotos.map((item) => (
          <button
            key={item.id || item.image}
            type="button"
            className={activeDesignImage === item.image ? "design-card selected" : "design-card"}
            onClick={() => setSelectedDesignImage(item.image)}
          >
            <img src={item.image} alt={item.title} />
            <span>{item.title}</span>
          </button>
        ))}
      </div>
      {filteredDesignPhotos.length === 0 && (
        <p className="muted-note">
          No designs are currently approved by admin for this jewelry type.
        </p>
      )}

      <div className="card-actions">
        <button type="button" onClick={() => calculatePrice({ silent: false })}>
          {priceLoading ? "Calculating..." : "Recalculate Price"}
        </button>
        <button type="button" onClick={addCustomizedToCart} disabled={priceLoading}>
          Add Customized Item
        </button>
      </div>

      <p className="detail-price">
        Estimated Price {selectedQuality ? `(${selectedQuality})` : ""}: $
        {estimatedPrice.toFixed(2)}
      </p>
      {selectedStoneName && selectedStoneGradeObject && (
        <p className="muted-note">
          Includes gem surcharge: +${Number(selectedStoneGradeObject.price || 0).toFixed(2)}
        </p>
      )}
    </section>
  );
}

export default CustomizePage;
