import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

const DESIGN_CATEGORIES = ["Ring", "Bracelet", "Necklace", "Earring"];
const GEM_QUALITY_OPTIONS = ["Premium", "Standard"];
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

const EMPTY_DRAFT = {
  name: "",
  category: "Ring",
  price: "",
  material: "",
  quality: "22k",
  gemQuality: "",
  image: "",
  description: ""
};

const EMPTY_DESIGN_DRAFT = {
  id: "",
  title: "",
  category: "Ring",
  image: "",
  allowed: true,
  productId: ""
};

const EMPTY_SLIDER_DRAFT = {
  id: "",
  title: "",
  image: "",
  description: "",
  price: "",
  productId: ""
};

const normalizeDesignId = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeGemQuality = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (["premium", "premiun", "premimum"].includes(normalized)) return "Premium";
  if (["standard", "standdard", "stardard", "standart"].includes(normalized)) {
    return "Standard";
  }
  return "";
};

function AdminPage() {
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [sliderItems, setSliderItems] = useState([]);
  const [editableProducts, setEditableProducts] = useState({});
  const [editableDesigns, setEditableDesigns] = useState({});
  const [editableSliderItems, setEditableSliderItems] = useState({});
  const [me, setMe] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [designDraft, setDesignDraft] = useState(EMPTY_DESIGN_DRAFT);
  const [sliderDraft, setSliderDraft] = useState(EMPTY_SLIDER_DRAFT);
  const [uploadingProductImage, setUploadingProductImage] = useState(false);
  const [uploadingDesignImage, setUploadingDesignImage] = useState(false);
  const [uploadingSliderImage, setUploadingSliderImage] = useState(false);
  const [uploadingProductRowImages, setUploadingProductRowImages] = useState({});
  const [uploadingDesignRowImages, setUploadingDesignRowImages] = useState({});
  const [uploadingSliderRowImages, setUploadingSliderRowImages] = useState({});

  const syncEditableProducts = useCallback((items) => {
    const next = {};
    for (const product of items) {
      next[product._id] = {
        name: product.name || "",
        category: product.category || "",
        price: product.price ?? 0,
        material: product.material || "",
        quality: product.quality || "",
        gemQuality: normalizeGemQuality(product.gemQuality),
        image: product.image || "",
        description: product.description || ""
      };
    }
    setEditableProducts(next);
  }, []);

  const syncEditableDesigns = useCallback((items) => {
    const next = {};
    for (const design of items) {
      next[design.id] = {
        id: design.id || "",
        title: design.title || "",
        category: design.category || "Ring",
        image: design.image || "",
        allowed: Boolean(design.allowed),
        productId: design.productId || ""
      };
    }
    setEditableDesigns(next);
  }, []);

  const syncEditableSliderItems = useCallback((items) => {
    const next = {};
    for (const slide of items) {
      next[slide.id] = {
        id: slide.id || "",
        title: slide.title || "",
        image: slide.image || "",
        description: slide.description || "",
        price: slide.price ?? 0,
        productId: slide.productId || ""
      };
    }
    setEditableSliderItems(next);
  }, []);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    setError("");

    try {
      const [productsRes, optionsRes, usersRes] = await Promise.all([
        fetch("/api/products", { credentials: "include" }),
        fetch("/api/custom-options", { credentials: "include" }),
        fetch("/api/users", { credentials: "include" })
      ]);

      if (!productsRes.ok) {
        throw new Error("Failed to load products");
      }
      if (!optionsRes.ok) {
        throw new Error("Failed to load customization options");
      }
      if (!usersRes.ok) {
        throw new Error("Failed to load users");
      }

      const [productsData, optionsData, usersData] = await Promise.all([
        productsRes.json(),
        optionsRes.json(),
        usersRes.json()
      ]);

      const items = Array.isArray(productsData) ? productsData : [];
      const designItems =
        Array.isArray(optionsData?.designs) && optionsData.designs.length > 0
          ? optionsData.designs
          : DEFAULT_DESIGNS;
      const sliderData = Array.isArray(optionsData?.sliderItems)
        ? optionsData.sliderItems
        : [];

      setProducts(items);
      syncEditableProducts(items);
      setDesigns(designItems);
      syncEditableDesigns(designItems);
      setSliderItems(sliderData);
      syncEditableSliderItems(sliderData);
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (err) {
      setError(err.message || "Failed to load admin data.");
    } finally {
      setLoadingData(false);
    }
  }, [syncEditableDesigns, syncEditableProducts, syncEditableSliderItems]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const meRes = await fetch("/api/auth/me", { credentials: "include" });
        const meData = await meRes.json();
        if (cancelled) return;

        const currentUser = meData?.authenticated ? meData.user : null;
        setMe(currentUser);
        setAuthChecked(true);

        if (currentUser?.isAdmin) {
          await loadData();
        }
      } catch {
        if (!cancelled) {
          setAuthChecked(true);
          setError("Unable to verify login status.");
        }
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [loadData]);

  const onRowChange = (id, field, value) => {
    const nextValue = field === "gemQuality" ? normalizeGemQuality(value) : value;
    setEditableProducts((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: nextValue
      }
    }));
  };

  const onDesignRowChange = (id, field, value) => {
    setEditableDesigns((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const onSliderRowChange = (id, field, value) => {
    setEditableSliderItems((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const uploadImage = async (file, type) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/upload/${type}`, {
      method: "POST",
      credentials: "include",
      body: formData
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || "Image upload failed.");
    }

    const nextImage = String(data.imageUrl || data.imagePath || "").trim();
    if (!nextImage) {
      throw new Error("Upload succeeded but returned image URL is empty.");
    }

    return nextImage;
  };

  const onProductImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");
    setUploadingProductImage(true);

    try {
      const imageUrl = await uploadImage(file, "product");
      setDraft((prev) => ({ ...prev, image: imageUrl }));
      setSuccess("Product image uploaded.");
    } catch (err) {
      setError(err.message || "Product image upload failed.");
    } finally {
      setUploadingProductImage(false);
      event.target.value = "";
    }
  };

  const onDesignImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");
    setUploadingDesignImage(true);

    try {
      const imageUrl = await uploadImage(file, "design");
      setDesignDraft((prev) => ({ ...prev, image: imageUrl }));
      setSuccess("Design image uploaded.");
    } catch (err) {
      setError(err.message || "Design image upload failed.");
    } finally {
      setUploadingDesignImage(false);
      event.target.value = "";
    }
  };

  const onSliderImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");
    setUploadingSliderImage(true);

    try {
      const imageUrl = await uploadImage(file, "design");
      setSliderDraft((prev) => ({ ...prev, image: imageUrl }));
      setSuccess("Slider image uploaded.");
    } catch (err) {
      setError(err.message || "Slider image upload failed.");
    } finally {
      setUploadingSliderImage(false);
      event.target.value = "";
    }
  };

  const onProductRowImageUpload = async (productId, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");
    setUploadingProductRowImages((prev) => ({ ...prev, [productId]: true }));

    try {
      const imageUrl = await uploadImage(file, "product");
      onRowChange(productId, "image", imageUrl);

      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ image: imageUrl })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to save product image.");
      }

      setSuccess("Product photo updated.");
      await loadData();
    } catch (err) {
      setError(err.message || "Product image upload failed.");
    } finally {
      setUploadingProductRowImages((prev) => ({ ...prev, [productId]: false }));
      event.target.value = "";
    }
  };

  const onDesignRowImageUpload = async (designId, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");
    setUploadingDesignRowImages((prev) => ({ ...prev, [designId]: true }));

    try {
      const imageUrl = await uploadImage(file, "design");
      onDesignRowChange(designId, "image", imageUrl);

      const nextDesigns = designs.map((item) =>
        item.id === designId
          ? {
              ...item,
              image: imageUrl
            }
          : item
      );

      const saved = await saveDesignCatalog(nextDesigns, "Design photo updated.");
      if (!saved) {
        return;
      }
    } catch (err) {
      setError(err.message || "Design image upload failed.");
    } finally {
      setUploadingDesignRowImages((prev) => ({ ...prev, [designId]: false }));
      event.target.value = "";
    }
  };

  const onSliderRowImageUpload = async (sliderId, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");
    setUploadingSliderRowImages((prev) => ({ ...prev, [sliderId]: true }));

    try {
      const imageUrl = await uploadImage(file, "design");
      onSliderRowChange(sliderId, "image", imageUrl);

      const nextSliderItems = sliderItems.map((item) =>
        item.id === sliderId
          ? {
              ...item,
              image: imageUrl
            }
          : item
      );

      const saved = await saveSliderCatalog(nextSliderItems, "Slider image updated.");
      if (!saved) {
        return;
      }
    } catch (err) {
      setError(err.message || "Slider image upload failed.");
    } finally {
      setUploadingSliderRowImages((prev) => ({ ...prev, [sliderId]: false }));
      event.target.value = "";
    }
  };

  const createProduct = async () => {
    setError("");
    setSuccess("");

    if (!draft.name.trim()) {
      setError("Product name is required.");
      return;
    }

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...draft,
        price: Number(draft.price || 0),
        gemQuality: normalizeGemQuality(draft.gemQuality)
      })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Create product failed.");
      return;
    }

    setDraft(EMPTY_DRAFT);
    setSuccess("Product created.");
    await loadData();
  };

  const saveProduct = async (id) => {
    setError("");
    setSuccess("");

    const payload = editableProducts[id];
    if (!payload) return;

    const res = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...payload,
        price: Number(payload.price || 0),
        gemQuality: normalizeGemQuality(payload.gemQuality)
      })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Update failed.");
      return;
    }

    setSuccess("Product updated.");
    await loadData();
  };

  const deleteProduct = async (id) => {
    setError("");
    setSuccess("");

    const res = await fetch(`/api/products/${id}`, {
      method: "DELETE",
      credentials: "include"
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Delete failed.");
      return;
    }

    setSuccess("Product deleted.");
    await loadData();
  };

  const saveDesignCatalog = async (nextDesigns, successMessage) => {
    setError("");
    setSuccess("");

    const res = await fetch("/api/custom-options", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ designs: nextDesigns })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Update designs failed.");
      return false;
    }

    setSuccess(successMessage);
    await loadData();
    return true;
  };

  const saveSliderCatalog = async (nextSliderItems, successMessage) => {
    setError("");
    setSuccess("");

    const res = await fetch("/api/custom-options", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ sliderItems: nextSliderItems })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Update slider failed.");
      return false;
    }

    setSuccess(successMessage);
    await loadData();
    return true;
  };

  const createDesign = async () => {
    const designId = normalizeDesignId(designDraft.id || designDraft.title);
    const title = String(designDraft.title || "").trim();
    const category = DESIGN_CATEGORIES.includes(designDraft.category)
      ? designDraft.category
      : "Ring";
    const image = String(designDraft.image || "").trim();
    const productId = String(designDraft.productId || "").trim();

    if (!designId || !title || !image) {
      setError("Design title and image are required. ID is auto-generated if empty.");
      setSuccess("");
      return;
    }

    const exists = designs.some((item) => item.id === designId);
    if (exists) {
      setError("Design ID already exists. Please use a different ID/title.");
      setSuccess("");
      return;
    }

    const nextDesigns = [
      ...designs,
      {
        id: designId,
        title,
        category,
        image,
        allowed: Boolean(designDraft.allowed),
        productId
      }
    ];

    const saved = await saveDesignCatalog(nextDesigns, "Design created.");
    if (saved) {
      setDesignDraft(EMPTY_DESIGN_DRAFT);
    }
  };

  const createSliderItem = async () => {
    const sliderId = normalizeDesignId(sliderDraft.id || sliderDraft.title);
    const title = String(sliderDraft.title || "").trim();
    const image = String(sliderDraft.image || "").trim();
    const description = String(sliderDraft.description || "").trim();
    const productId = String(sliderDraft.productId || "").trim();
    const numericPrice = Number(sliderDraft.price || 0);
    const price = Number.isFinite(numericPrice) && numericPrice >= 0 ? numericPrice : 0;

    if (!sliderId || !title || !image) {
      setError("Slider title and image are required. ID is auto-generated if empty.");
      setSuccess("");
      return;
    }

    const exists = sliderItems.some((item) => item.id === sliderId);
    if (exists) {
      setError("Slider ID already exists. Please use a different ID/title.");
      setSuccess("");
      return;
    }

    const nextSliderItems = [
      ...sliderItems,
      {
        id: sliderId,
        title,
        image,
        description,
        price,
        productId
      }
    ];

    const saved = await saveSliderCatalog(nextSliderItems, "Slider item created.");
    if (saved) {
      setSliderDraft(EMPTY_SLIDER_DRAFT);
    }
  };

  const saveSliderItem = async (id) => {
    const row = editableSliderItems[id];
    if (!row) return;

    const nextId = normalizeDesignId(row.id || row.title || id);
    const title = String(row.title || "").trim();
    const image = String(row.image || "").trim();
    const description = String(row.description || "").trim();
    const productId = String(row.productId || "").trim();
    const numericPrice = Number(row.price || 0);
    const price = Number.isFinite(numericPrice) && numericPrice >= 0 ? numericPrice : 0;

    if (!nextId || !title || !image) {
      setError("Slider title and image are required.");
      setSuccess("");
      return;
    }

    const duplicate = sliderItems.some((item) => item.id !== id && item.id === nextId);
    if (duplicate) {
      setError("Another slider item already uses this ID.");
      setSuccess("");
      return;
    }

    const nextSliderItems = sliderItems.map((item) =>
      item.id === id
        ? {
            id: nextId,
            title,
            image,
            description,
            price,
            productId
          }
        : item
    );

    await saveSliderCatalog(nextSliderItems, "Slider item updated.");
  };

  const deleteSliderItem = async (id) => {
    const nextSliderItems = sliderItems.filter((item) => item.id !== id);
    await saveSliderCatalog(nextSliderItems, "Slider item deleted.");
  };

  const saveDesign = async (id) => {
    const row = editableDesigns[id];
    if (!row) return;

    const nextId = normalizeDesignId(row.id || row.title || id);
    const title = String(row.title || "").trim();
    const category = DESIGN_CATEGORIES.includes(row.category) ? row.category : "Ring";
    const image = String(row.image || "").trim();
    const productId = String(row.productId || "").trim();

    if (!nextId || !title || !image) {
      setError("Design title and image are required.");
      setSuccess("");
      return;
    }

    const duplicate = designs.some((item) => item.id !== id && item.id === nextId);
    if (duplicate) {
      setError("Another design already uses this ID.");
      setSuccess("");
      return;
    }

    const nextDesigns = designs.map((item) =>
      item.id === id
        ? {
            id: nextId,
            title,
            category,
            image,
            allowed: Boolean(row.allowed),
            productId
          }
        : item
    );

    await saveDesignCatalog(nextDesigns, "Design updated.");
  };

  const deleteDesign = async (id) => {
    if (designs.length <= 1) {
      setError("At least one design must remain.");
      setSuccess("");
      return;
    }
    const nextDesigns = designs.filter((item) => item.id !== id);
    await saveDesignCatalog(nextDesigns, "Design deleted.");
  };

  const updateUserRole = async (userId, isAdmin) => {
    setError("");
    setSuccess("");

    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isAdmin })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Role update failed.");
      return;
    }

    setSuccess("User role updated.");
    await loadData();
  };

  const removeUser = async (userId) => {
    setError("");
    setSuccess("");

    const res = await fetch(`/api/users/${userId}`, {
      method: "DELETE",
      credentials: "include"
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Delete user failed.");
      return;
    }

    setSuccess("User deleted.");
    await loadData();
  };

  if (!authChecked) {
    return <section className="admin-page">Checking permissions...</section>;
  }

  if (!me) {
    return (
      <section className="admin-page">
        <div className="admin-card">
          <h3>Login required</h3>
          <p>Please login as admin to access this page.</p>
          <Link to="/login" className="text-link">
            Go to Login
          </Link>
        </div>
      </section>
    );
  }

  if (!me.isAdmin) {
    return (
      <section className="admin-page">
        <div className="admin-card">
          <h3>Forbidden</h3>
          <p>You are logged in but not an admin.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-page">
      <header className="topbar">
        <h1>Admin Site</h1>
        <div className="topbar-links">
          <Link to="/">Shop</Link>
          <Link to="/customize">Customize</Link>
        </div>
      </header>

      {error && <p className="error-note">{error}</p>}
      {success && <p className="success-note">{success}</p>}

      <div className="admin-grid">
        <div className="admin-card">
          <h3>Add Product</h3>

          <input
            placeholder="Name"
            value={draft.name}
            onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
          />
          <select
            value={draft.category}
            onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))}
          >
            <option>Ring</option>
            <option>Bracelet</option>
            <option>Necklace</option>
            <option>Earring</option>
          </select>
          <input
            placeholder="Price"
            value={draft.price}
            onChange={(e) => setDraft((p) => ({ ...p, price: e.target.value }))}
          />
          <input
            placeholder="Material"
            value={draft.material}
            onChange={(e) => setDraft((p) => ({ ...p, material: e.target.value }))}
          />
          <input
            placeholder="Quality (e.g. 22k)"
            value={draft.quality}
            onChange={(e) => setDraft((p) => ({ ...p, quality: e.target.value }))}
          />
          <select
            value={draft.gemQuality}
            onChange={(e) =>
              setDraft((p) => ({
                ...p,
                gemQuality: normalizeGemQuality(e.target.value)
              }))
            }
          >
            <option value="">Gem Quality (optional)</option>
            {GEM_QUALITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <input
            placeholder="Image URL (or upload below)"
            value={draft.image}
            onChange={(e) => setDraft((p) => ({ ...p, image: e.target.value }))}
          />
          <label className="admin-file-upload">
            <span>Upload product photo</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              onChange={onProductImageUpload}
              disabled={uploadingProductImage}
            />
          </label>
          {uploadingProductImage && <p className="admin-upload-note">Uploading product image...</p>}
          {draft.image && (
            <img
              className="admin-preview-thumb"
              src={draft.image}
              alt="Product preview"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
          <textarea
            placeholder="Description"
            value={draft.description}
            onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
          />
          <button type="button" onClick={createProduct} disabled={uploadingProductImage}>
            Create Product
          </button>
        </div>

        <div className="admin-card">
          <h3>Add Design</h3>

          <input
            placeholder="Design ID (optional, unique key)"
            value={designDraft.id}
            onChange={(e) => setDesignDraft((prev) => ({ ...prev, id: e.target.value }))}
          />
          <input
            placeholder="Design title"
            value={designDraft.title}
            onChange={(e) => setDesignDraft((prev) => ({ ...prev, title: e.target.value }))}
          />
          <select
            value={designDraft.category}
            onChange={(e) => setDesignDraft((prev) => ({ ...prev, category: e.target.value }))}
          >
            {DESIGN_CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
          <input
            placeholder="Linked product ID (optional)"
            value={designDraft.productId}
            onChange={(e) => setDesignDraft((prev) => ({ ...prev, productId: e.target.value }))}
          />
          {products.length > 0 && (
            <div className="admin-id-reference">
              <p className="admin-id-reference-title">Product IDs (for design linking)</p>
              <div className="admin-id-reference-list">
                {products.map((product) => (
                  <div key={product._id} className="admin-id-reference-item">
                    <span>{product.name || "Untitled Product"}</span>
                    <code>{product._id}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
          <input
            placeholder="Image URL (or upload below)"
            value={designDraft.image}
            onChange={(e) => setDesignDraft((prev) => ({ ...prev, image: e.target.value }))}
          />
          <label className="admin-file-upload">
            <span>Upload design photo</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              onChange={onDesignImageUpload}
              disabled={uploadingDesignImage}
            />
          </label>
          {uploadingDesignImage && <p className="admin-upload-note">Uploading design image...</p>}
          {designDraft.image && (
            <img
              className="admin-preview-thumb"
              src={designDraft.image}
              alt="Design preview"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
          <label className="admin-checkbox-row">
            <input
              type="checkbox"
              checked={Boolean(designDraft.allowed)}
              onChange={(e) =>
                setDesignDraft((prev) => ({
                  ...prev,
                  allowed: e.target.checked
                }))
              }
            />
            <span>Allowed in customize page</span>
          </label>
          <button type="button" onClick={createDesign} disabled={uploadingDesignImage}>
            Create Design
          </button>
        </div>

        <div className="admin-card">
          <h3>Add Slider Item</h3>

          <input
            placeholder="Slider ID (optional)"
            value={sliderDraft.id}
            onChange={(e) => setSliderDraft((prev) => ({ ...prev, id: e.target.value }))}
          />
          <input
            placeholder="Slider title"
            value={sliderDraft.title}
            onChange={(e) => setSliderDraft((prev) => ({ ...prev, title: e.target.value }))}
          />
          <input
            placeholder="Linked product ID (optional)"
            value={sliderDraft.productId}
            onChange={(e) => setSliderDraft((prev) => ({ ...prev, productId: e.target.value }))}
          />
          <input
            placeholder="Price"
            value={sliderDraft.price}
            onChange={(e) => setSliderDraft((prev) => ({ ...prev, price: e.target.value }))}
          />
          <input
            placeholder="Image URL (or upload below)"
            value={sliderDraft.image}
            onChange={(e) => setSliderDraft((prev) => ({ ...prev, image: e.target.value }))}
          />
          <label className="admin-file-upload">
            <span>Upload slider photo</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              onChange={onSliderImageUpload}
              disabled={uploadingSliderImage}
            />
          </label>
          {uploadingSliderImage && <p className="admin-upload-note">Uploading slider image...</p>}
          {sliderDraft.image && (
            <img
              className="admin-preview-thumb"
              src={sliderDraft.image}
              alt="Slider preview"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
          <textarea
            placeholder="Description"
            value={sliderDraft.description}
            onChange={(e) => setSliderDraft((prev) => ({ ...prev, description: e.target.value }))}
          />
          <button type="button" onClick={createSliderItem} disabled={uploadingSliderImage}>
            Create Slider Item
          </button>
        </div>
      </div>

      <div className="admin-card">
        <h3>Manage Slider Items</h3>
        <p className="admin-helper-note">
          Manage slider items (create, edit, delete). Linked product ID is optional.
        </p>
        {sliderItems.length === 0 && <p>No slider items yet.</p>}

        {sliderItems.map((item) => {
          const row = editableSliderItems[item.id] || {};
          const uploadingRowImage = Boolean(uploadingSliderRowImages[item.id]);

          return (
            <div key={item.id} className="admin-slider-row">
              <div className="admin-slider-main">
                <input
                  value={row.id || ""}
                  onChange={(e) => onSliderRowChange(item.id, "id", e.target.value)}
                  placeholder="Slider ID"
                />
                <input
                  value={row.title || ""}
                  onChange={(e) => onSliderRowChange(item.id, "title", e.target.value)}
                  placeholder="Title"
                />
                <input
                  value={row.productId || ""}
                  onChange={(e) => onSliderRowChange(item.id, "productId", e.target.value)}
                  placeholder="Linked Product ID"
                />
                <input
                  value={row.price ?? 0}
                  onChange={(e) => onSliderRowChange(item.id, "price", e.target.value)}
                  placeholder="Price"
                />
                <textarea
                  value={row.description || ""}
                  onChange={(e) => onSliderRowChange(item.id, "description", e.target.value)}
                  placeholder="Description"
                />
              </div>
              <div className="admin-image-editor">
                <input
                  value={row.image || ""}
                  onChange={(e) => onSliderRowChange(item.id, "image", e.target.value)}
                  placeholder="Image URL"
                />
                <label className="admin-inline-upload">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                    onChange={(e) => onSliderRowImageUpload(item.id, e)}
                    disabled={uploadingRowImage}
                  />
                </label>
                {uploadingRowImage && <span className="admin-inline-note">Uploading image...</span>}
                {row.image && (
                  <img
                    className="admin-thumb"
                    src={row.image}
                    alt="Slider"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </div>
              <div className="admin-row-actions">
                <button
                  type="button"
                  onClick={() => saveSliderItem(item.id)}
                  disabled={uploadingRowImage}
                >
                  Save
                </button>
                <button type="button" onClick={() => deleteSliderItem(item.id)}>
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="admin-card">
        <h3>Manage Products</h3>
        {loadingData && <p>Loading products...</p>}
        {!loadingData && products.length === 0 && <p>No products found.</p>}

        {products.map((product) => {
          const row = editableProducts[product._id] || {};
          const uploadingRowImage = Boolean(uploadingProductRowImages[product._id]);

          return (
            <div key={product._id} className="admin-product">
              <div className="admin-product-main">
                <input
                  className="admin-product-id-box"
                  value={`ID: ${product._id}`}
                  readOnly
                  aria-label="Product ID"
                />
                <input
                  value={row.name || ""}
                  onChange={(e) => onRowChange(product._id, "name", e.target.value)}
                  placeholder="Name"
                />
                <input
                  value={row.category || ""}
                  onChange={(e) => onRowChange(product._id, "category", e.target.value)}
                  placeholder="Category"
                />
                <input
                  value={row.price ?? 0}
                  onChange={(e) => onRowChange(product._id, "price", e.target.value)}
                  placeholder="Price"
                />
                <input
                  value={row.material || ""}
                  onChange={(e) => onRowChange(product._id, "material", e.target.value)}
                  placeholder="Material"
                />
                <input
                  value={row.quality || ""}
                  onChange={(e) => onRowChange(product._id, "quality", e.target.value)}
                  placeholder="Quality"
                />
                <select
                  value={row.gemQuality || ""}
                  onChange={(e) => onRowChange(product._id, "gemQuality", e.target.value)}
                >
                  <option value="">Gem Quality (optional)</option>
                  {GEM_QUALITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-image-editor">
                <input
                  value={row.image || ""}
                  onChange={(e) => onRowChange(product._id, "image", e.target.value)}
                  placeholder="Image URL"
                />
                <label className="admin-inline-upload">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                    onChange={(e) => onProductRowImageUpload(product._id, e)}
                    disabled={uploadingRowImage}
                  />
                </label>
                {uploadingRowImage && <span className="admin-inline-note">Uploading image...</span>}
                {row.image && (
                  <img
                    className="admin-thumb"
                    src={row.image}
                    alt="Product"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </div>
              <div className="admin-row-actions">
                <button
                  type="button"
                  onClick={() => saveProduct(product._id)}
                  disabled={uploadingRowImage}
                >
                  Save
                </button>
                <button type="button" onClick={() => deleteProduct(product._id)}>
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="admin-card">
        <h3>Manage Designs</h3>
        {designs.length === 0 && <p>No designs found.</p>}

        {designs.map((design) => {
          const row = editableDesigns[design.id] || {};
          const uploadingRowImage = Boolean(uploadingDesignRowImages[design.id]);

          return (
            <div key={design.id} className="admin-design">
              <div className="admin-design-main">
                <input
                  value={row.id || ""}
                  onChange={(e) => onDesignRowChange(design.id, "id", e.target.value)}
                  placeholder="Design ID"
                />
                <input
                  value={row.title || ""}
                  onChange={(e) => onDesignRowChange(design.id, "title", e.target.value)}
                  placeholder="Title"
                />
                <input
                  value={row.productId || ""}
                  onChange={(e) => onDesignRowChange(design.id, "productId", e.target.value)}
                  placeholder="Linked Product ID"
                />
                <select
                  value={row.category || "Ring"}
                  onChange={(e) => onDesignRowChange(design.id, "category", e.target.value)}
                >
                  {DESIGN_CATEGORIES.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
                <label className="admin-inline-check">
                  <input
                    type="checkbox"
                    checked={Boolean(row.allowed)}
                    onChange={(e) => onDesignRowChange(design.id, "allowed", e.target.checked)}
                  />
                  Allowed
                </label>
              </div>
              <div className="admin-image-editor">
                <input
                  value={row.image || ""}
                  onChange={(e) => onDesignRowChange(design.id, "image", e.target.value)}
                  placeholder="Image URL"
                />
                <label className="admin-inline-upload">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                    onChange={(e) => onDesignRowImageUpload(design.id, e)}
                    disabled={uploadingRowImage}
                  />
                </label>
                {uploadingRowImage && <span className="admin-inline-note">Uploading image...</span>}
                {row.image && (
                  <img
                    className="admin-thumb"
                    src={row.image}
                    alt="Design"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </div>
              <div className="admin-row-actions">
                <button
                  type="button"
                  onClick={() => saveDesign(design.id)}
                  disabled={uploadingRowImage}
                >
                  Save
                </button>
                <button type="button" onClick={() => deleteDesign(design.id)}>
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="admin-card">
        <h3>Manage Users</h3>
        {users.length === 0 && <p>No users found.</p>}
        {users.map((user) => {
          const isSelf = me?.id === user._id;
          return (
            <div key={user._id} className="admin-user-row">
              <span>
                {user.username} {user.isAdmin ? "(Admin)" : "(Customer)"}
              </span>
              <div className="admin-user-actions">
                {user.isAdmin ? (
                  <button
                    type="button"
                    onClick={() => updateUserRole(user._id, false)}
                    disabled={isSelf}
                    title={isSelf ? "You cannot remove your own admin role" : ""}
                  >
                    Make Customer
                  </button>
                ) : (
                  <button type="button" onClick={() => updateUserRole(user._id, true)}>
                    Make Admin
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeUser(user._id)}
                  disabled={isSelf}
                  title={isSelf ? "You cannot delete your own account" : ""}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default AdminPage;
