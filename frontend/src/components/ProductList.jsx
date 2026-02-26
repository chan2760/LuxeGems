import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const DEFAULT_MIN_PRICE = 50;

function ProductList() {
  const [products, setProducts] = useState([]);
  const [sliderItems, setSliderItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [quality, setQuality] = useState("All");
  const [gemQuality, setGemQuality] = useState("All");
  const [minPrice, setMinPrice] = useState(String(DEFAULT_MIN_PRICE));
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("featured");
  const [sliderIndex, setSliderIndex] = useState(0);
  const [previewImage, setPreviewImage] = useState(null);
  const [user, setUser] = useState(() => {
    try {
      const local = localStorage.getItem("jewelry_user");
      return local ? JSON.parse(local) : null;
    } catch {
      return null;
    }
  });
  const navigate = useNavigate();

  const normalizeCategory = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/s$/, "");

  const normalizeQuality = (value) => String(value || "").trim().toLowerCase();
  const normalizeGemQuality = (value) => String(value || "").trim().toLowerCase();

  useEffect(() => {
    let cancelled = false;

    const loadInitialData = async () => {
      const [productsResult, optionsResult, cartResult, meResult] = await Promise.allSettled([
        fetch("/api/products").then((res) => res.json()),
        fetch("/api/custom-options").then((res) => res.json()),
        fetch("/api/cart").then((res) => res.json()),
        fetch("/api/auth/me", { credentials: "include" }).then((res) => res.json())
      ]);

      if (cancelled) return;

      const productsData =
        productsResult.status === "fulfilled" && Array.isArray(productsResult.value)
          ? productsResult.value
          : [];
      setProducts(productsData);

      const optionsData = optionsResult.status === "fulfilled" ? optionsResult.value : null;
      const sliderData = Array.isArray(optionsData?.sliderItems) ? optionsData.sliderItems : [];
      setSliderItems(sliderData);

      const cartData = cartResult.status === "fulfilled" ? cartResult.value : [];
      setCartCount(
        Array.isArray(cartData)
          ? cartData.reduce((sum, item) => sum + Number(item.quantity || 1), 0)
          : 0
      );

      const meData = meResult.status === "fulfilled" ? meResult.value : null;
      if (meData?.authenticated) {
        setUser(meData.user);
        localStorage.setItem("jewelry_user", JSON.stringify(meData.user));
      } else {
        const local = localStorage.getItem("jewelry_user");
        setUser(local ? JSON.parse(local) : null);
      }
    };

    loadInitialData();

    const syncAuth = () => {
      try {
        const local = localStorage.getItem("jewelry_user");
        setUser(local ? JSON.parse(local) : null);
      } catch {
        setUser(null);
      }
    };
    window.addEventListener("auth-changed", syncAuth);
    window.addEventListener("storage", syncAuth);
    return () => {
      cancelled = true;
      window.removeEventListener("auth-changed", syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  useEffect(() => {
    if (!previewImage) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setPreviewImage(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [previewImage]);

  const fallbackSliderProducts = useMemo(() => {
    const withSortMeta = products.map((product, index) => {
      const createdAtMs = Date.parse(String(product.createdAt || ""));
      return {
        product,
        createdAtMs: Number.isFinite(createdAtMs) ? createdAtMs : -1,
        index
      };
    });

    const sortByNewest = (a, b) => {
      if (a.createdAtMs !== b.createdAtMs) {
        return b.createdAtMs - a.createdAtMs;
      }
      return b.index - a.index;
    };

    const adminSelected = withSortMeta
      .filter((item) => Boolean(item.product.showInSlider))
      .sort(sortByNewest)
      .slice(0, 6)
      .map((item) => item.product);

    if (adminSelected.length > 0) {
      return adminSelected;
    }

    return withSortMeta.sort(sortByNewest).slice(0, 5).map((item) => item.product);
  }, [products]);

  const sliderEntries = useMemo(() => {
    const manualSlides = sliderItems
      .map((item, index) => {
        const rawPrice = Number(item?.price ?? 0);
        return {
          id: String(item?.id || `slide-${index + 1}`).trim(),
          title: String(item?.title || "").trim() || `Slide ${index + 1}`,
          image:
            String(item?.image || "").trim() ||
            "https://via.placeholder.com/960x720?text=Jewelry",
          description: String(item?.description || "").trim(),
          price: Number.isFinite(rawPrice) && rawPrice >= 0 ? rawPrice : 0,
          productId: String(item?.productId || "").trim()
        };
      })
      .filter((item) => item.id && item.title && item.image);

    if (manualSlides.length > 0) {
      return manualSlides;
    }

    return fallbackSliderProducts.map((product) => ({
      id: product._id,
      title: product.name || "Jewelry",
      image: String(product.image || "").trim() || "https://via.placeholder.com/960x720?text=Jewelry",
      description: String(product.description || "").trim(),
      price: Number(product.price || 0),
      productId: String(product._id || "")
    }));
  }, [sliderItems, fallbackSliderProducts]);

  useEffect(() => {
    if (sliderEntries.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setSliderIndex((current) => (current + 1) % sliderEntries.length);
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, [sliderEntries.length]);

  const filteredProducts = useMemo(() => {
    const parsedMin = Number(minPrice === "" ? DEFAULT_MIN_PRICE : minPrice);
    const min = Number.isFinite(parsedMin)
      ? Math.max(DEFAULT_MIN_PRICE, parsedMin)
      : DEFAULT_MIN_PRICE;
    const max = maxPrice === "" ? Number.POSITIVE_INFINITY : Number(maxPrice);
    const selectedQuality = normalizeQuality(quality);
    const selectedGemQuality = normalizeGemQuality(gemQuality);

    const list = products.filter((product) => {
      const matchSearch = product.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory =
        category === "All" ||
        normalizeCategory(product.category) === normalizeCategory(category);
      const matchQuality =
        quality === "All" || normalizeQuality(product.quality) === selectedQuality;
      const matchGemQuality =
        gemQuality === "All" || normalizeGemQuality(product.gemQuality) === selectedGemQuality;
      const price = Number(product.price || 0);
      const matchPrice = Number.isFinite(price) && price >= min && price <= max;
      return matchSearch && matchCategory && matchQuality && matchGemQuality && matchPrice;
    });

    if (sortBy === "price-asc") {
      return [...list].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    }
    if (sortBy === "price-desc") {
      return [...list].sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    }
    if (sortBy === "name-asc") {
      return [...list].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    }
    if (sortBy === "name-desc") {
      return [...list].sort((a, b) => String(b.name || "").localeCompare(String(a.name || "")));
    }
    return list;
  }, [products, search, category, quality, gemQuality, minPrice, maxPrice, sortBy]);

  const qualityOptions = useMemo(() => {
    const knownQualities = ["19k", "22k", "24k"];
    const normalizedKnown = new Set(knownQualities.map((item) => normalizeQuality(item)));
    const fromProducts = [];

    for (const product of products) {
      const rawQuality = String(product.quality || "").trim();
      const normalized = normalizeQuality(rawQuality);
      if (!normalized || normalizedKnown.has(normalized)) continue;
      fromProducts.push(rawQuality);
      normalizedKnown.add(normalized);
    }

    return ["All", ...knownQualities, ...fromProducts];
  }, [products]);

  const gemQualityOptions = useMemo(() => {
    const knownQualities = ["Premium", "Standard"];
    const excludedLegacyQualities = new Set(["a", "b"]);
    const normalizedKnown = new Set(knownQualities.map((item) => normalizeGemQuality(item)));
    const fromProducts = [];

    for (const product of products) {
      const rawGemQuality = String(product.gemQuality || "").trim();
      const normalized = normalizeGemQuality(rawGemQuality);
      if (!normalized || excludedLegacyQualities.has(normalized) || normalizedKnown.has(normalized))
        continue;
      fromProducts.push(rawGemQuality);
      normalizedKnown.add(normalized);
    }

    return ["All", ...knownQualities, ...fromProducts];
  }, [products]);

  const productsById = useMemo(
    () => new Map(products.map((product) => [String(product._id || ""), product])),
    [products]
  );
  const activeSliderIndex = sliderEntries.length === 0 ? 0 : sliderIndex % sliderEntries.length;
  const activeSlide = sliderEntries[activeSliderIndex] || null;
  const activeSlideProduct = activeSlide?.productId
    ? productsById.get(activeSlide.productId) || null
    : null;

  const resolveImage = (product) => {
    const localImageMap = {
      "Classic Gold Ring": "/products/classic-gold-ring.jpg",
      "Auric Chain Bracelet": "/products/auric-chain-bracelet.webp",
      "Aurora Tennis Bracelet": "/products/bracelet-alt.jpg",
      "Silver Diamond Bracelet": "/products/silver-diamond-bracelet.jpg",
      "Rose Gold Charm Bracelet": "/products/bracelet-new.jpg",
      "Velvet Pearl Necklace": "/products/velvet-pearl-necklace.jpg",
      "Starlight Pendant Necklace": "/products/necklace-alt.jpg",
      "Nova Stud Earrings": "/products/nova-stud-earrings.jpg",
      "Crystal Bloom Earrings": "/products/earring-alt.jpg",
      "Midnight Sapphire Ring": "/products/midnight-sapphire-ring.jpg",
      "Twilight Opal Ring": "/products/twilight-opal-ring.jpg"
    };

    const uploadedOrProvidedImage = String(product.image || "").trim();
    if (uploadedOrProvidedImage) {
      return uploadedOrProvidedImage;
    }

    if (String(product.category || "").toLowerCase() === "bracelet") {
      return localImageMap[product.name] || "/products/bracelet-new.jpg";
    }
    if (String(product.category || "").toLowerCase() === "ring") {
      return localImageMap[product.name] || "/products/ring-alt.jpg";
    }
    if (String(product.category || "").toLowerCase() === "necklace") {
      return localImageMap[product.name] || "/products/necklace-alt.jpg";
    }
    if (String(product.category || "").toLowerCase() === "earring") {
      return localImageMap[product.name] || "/products/earring-alt.jpg";
    }

    return (
      localImageMap[product.name] || "https://via.placeholder.com/640x800?text=Jewelry"
    );
  };

  const openImagePreview = (product) => {
    setPreviewImage({
      name: product.name || "Jewelry",
      src: resolveImage(product)
    });
  };

  const addToCart = async (product) => {
    if (!user) {
      alert("Please login first.");
      navigate("/login", { state: { from: "/" } });
      return;
    }

    const image = resolveImage(product);
    await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product._id,
        name: product.name,
        image,
        price: Number(product.price || 0),
        quantity: 1,
        category: product.category || "",
        quality: product.quality || "",
        gemQuality: product.gemQuality || ""
      })
    });

    setCartCount((prev) => prev + 1);
    alert("Added to cart");
  };

  const logout = () => {
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).then(() => {
      localStorage.removeItem("jewelry_user");
      window.dispatchEvent(new Event("auth-changed"));
      setUser(null);
    });
  };

  return (
    <section className="catalog-page">
      <header className="topbar">
        <h1>LuxeGems</h1>
        <div className="topbar-links">
          <Link to="/">Shop</Link>
          {user?.isAdmin && <Link to="/admin">Admin</Link>}
          <Link to="/customize">Customize</Link>
          <Link
            to="/cart"
            className="cart-icon-link"
            aria-label={`Cart (${cartCount} item${cartCount === 1 ? "" : "s"})`}
          >
            <span className="cart-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M3 4h2l2.1 10.1a1 1 0 0 0 1 .8h9.6a1 1 0 0 0 1-.8L21 7H7.4" />
                <circle cx="10" cy="19" r="1.5" />
                <circle cx="18" cy="19" r="1.5" />
              </svg>
            </span>
            <span className="cart-count-badge" aria-hidden="true">
              {cartCount}
            </span>
          </Link>
          <Link to="/checkout">Checkout</Link>
          {user && <Link to="/profile">Profile</Link>}
          {user ? (
            <button type="button" className="link-btn" onClick={logout}>
              Logout
            </button>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </div>
      </header>

      {activeSlide && (
        <section className="home-slider-showcase" aria-label="Slider spotlight">
          <div className="home-slider-head">
            {sliderEntries.length > 1 && (
              <div className="home-slider-dots">
                {sliderEntries.map((item, index) => (
                  <button
                    key={item.id || `${item.title}-${index}`}
                    type="button"
                    className={
                      index === activeSliderIndex
                        ? "home-slider-dot active"
                        : "home-slider-dot"
                    }
                    aria-label={`Show ${item.title}`}
                    aria-pressed={index === activeSliderIndex}
                    onClick={() => setSliderIndex(index)}
                  />
                ))}
              </div>
            )}
          </div>

          <div key={activeSlide.id || activeSlide.title} className="home-slider-slide">
            <button
              type="button"
              className="home-slider-image-trigger"
              aria-label={`View larger photo of ${activeSlide.title}`}
              onClick={() =>
                setPreviewImage({
                  name: activeSlide.title || "Slider photo",
                  src:
                    String(activeSlide.image || "").trim() ||
                    "https://via.placeholder.com/960x720?text=Jewelry"
                })
              }
            >
              <img
                className="home-slider-image"
                src={activeSlide.image}
                alt={activeSlide.title}
                onError={(e) => {
                  e.currentTarget.src =
                    "https://via.placeholder.com/960x720?text=Jewelry";
                }}
              />
            </button>

            <div className="home-slider-copy">
              <h3>{activeSlide.title}</h3>
              <p className="home-slider-meta">{activeSlideProduct?.category || "Jewelry"}</p>
              <p className="home-slider-price">
                ${Number(activeSlide.price || activeSlideProduct?.price || 0).toFixed(2)}
              </p>
              <p className="home-slider-description">
                {String(activeSlide.description || "").trim() ||
                  "Freshly added piece from our latest collection."}
              </p>
              {activeSlideProduct && (
                <div className="home-slider-actions">
                  <Link className="secondary-btn" to={`/product/${activeSlideProduct._id}`}>
                    View Details
                  </Link>
                  <button type="button" onClick={() => addToCart(activeSlideProduct)}>
                    Add to Cart
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="toolbar">
        <input
          type="search"
          placeholder="Search jewelry..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="category-tabs">
          {["All", "Ring", "Bracelet", "Necklace", "Earring"].map((item) => (
            <button
              key={item}
              type="button"
              className={category === item ? "tab active" : "tab"}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="price-filters">
          <label className="min-price-field" aria-label="Minimum price">
            <span className="min-price-currency" aria-hidden="true">
              $
            </span>
            <input
              type="number"
              min={DEFAULT_MIN_PRICE}
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              onBlur={() => {
                const parsed = Number(minPrice);
                if (!Number.isFinite(parsed) || parsed < DEFAULT_MIN_PRICE) {
                  setMinPrice(String(DEFAULT_MIN_PRICE));
                }
              }}
            />
          </label>
          <input
            type="number"
            min="0"
            placeholder="Max $"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
          <button
            type="button"
            className="secondary-btn price-clear-btn"
            onClick={() => {
              setMinPrice(String(DEFAULT_MIN_PRICE));
              setMaxPrice("");
            }}
          >
            Clear
          </button>
        </div>

        <label className="quality-filter">
          <span>Quality</span>
          <select value={quality} onChange={(e) => setQuality(e.target.value)}>
            {qualityOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="gem-quality-filter">
          <span>Gem</span>
          <select value={gemQuality} onChange={(e) => setGemQuality(e.target.value)}>
            {gemQualityOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <div className="sort-filter">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="featured">Sort: Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name-asc">Name: A to Z</option>
            <option value="name-desc">Name: Z to A</option>
          </select>
        </div>
      </div>

      <div className="catalog-grid">
        {filteredProducts.map((product) => {
          return (
            <article key={product._id} className="product-card">
              <button
                type="button"
                className="product-image-trigger"
                aria-label={`View larger photo of ${product.name}`}
                onClick={() => openImagePreview(product)}
              >
                <img
                  className="product-image"
                  src={resolveImage(product)}
                  alt={product.name}
                  onError={(e) => {
                    e.currentTarget.src =
                      "https://via.placeholder.com/640x800?text=Jewelry";
                  }}
                />
              </button>

              <h2 className="product-name">{product.name}</h2>
              <p className="product-category">{product.category || "Jewelry"}</p>
              <p className="product-price">${Number(product.price || 0).toFixed(2)}</p>

              <div className="card-actions">
                <Link className="secondary-btn" to={`/product/${product._id}`}>
                  View Details
                </Link>
                <button type="button" onClick={() => addToCart(product)}>
                  Add to Cart
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <p>No products found in this category. Try running `/api/seed` and refresh.</p>
      )}

      {previewImage && (
        <div
          className="product-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${previewImage.name} photo`}
          onClick={() => setPreviewImage(null)}
        >
          <button
            type="button"
            className="product-lightbox-close"
            onClick={() => setPreviewImage(null)}
            aria-label="Close image preview"
          >
            Close
          </button>
          <div className="product-lightbox-frame" onClick={(e) => e.stopPropagation()}>
            <img
              className="product-lightbox-image"
              src={previewImage.src}
              alt={previewImage.name}
              onError={(e) => {
                e.currentTarget.src = "https://via.placeholder.com/1200x900?text=Jewelry";
              }}
            />
            <p className="product-lightbox-caption">{previewImage.name}</p>
          </div>
        </div>
      )}
    </section>
  );
}

export default ProductList;
