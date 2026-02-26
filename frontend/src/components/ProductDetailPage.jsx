import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const res = await fetch(`/api/products/${id}`);
        if (!res.ok) {
          throw new Error("Single product endpoint failed");
        }
        const data = await res.json();
        setProduct(data);
        setErrorMessage("");
      } catch {
        try {
          const listRes = await fetch("/api/products");
          const listData = await listRes.json();
          const fallback = Array.isArray(listData)
            ? listData.find((item) => item._id === id)
            : null;
          if (fallback) {
            setProduct(fallback);
            setErrorMessage("");
          } else {
            setErrorMessage("Product not found.");
          }
        } catch {
          setErrorMessage("Unable to load product details right now.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  const resolveImage = (item) => {
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

    const uploadedOrProvidedImage = String(item?.image || "").trim();
    if (uploadedOrProvidedImage) {
      return uploadedOrProvidedImage;
    }

    if (String(item?.category || "").toLowerCase() === "bracelet") {
      return localImageMap[item?.name] || "/products/bracelet-new.jpg";
    }
    if (String(item?.category || "").toLowerCase() === "ring") {
      return localImageMap[item?.name] || "/products/ring-alt.jpg";
    }
    if (String(item?.category || "").toLowerCase() === "necklace") {
      return localImageMap[item?.name] || "/products/necklace-alt.jpg";
    }
    if (String(item?.category || "").toLowerCase() === "earring") {
      return localImageMap[item?.name] || "/products/earring-alt.jpg";
    }

    return localImageMap[item?.name] || "https://via.placeholder.com/900x1000?text=Jewelry";
  };

  const addToCart = async () => {
    if (!product?._id) return;
    const image = resolveImage(product);
    await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product._id,
        name: product.name,
        image,
        category: product.category,
        quality: product.quality || "",
        price: Number(product.price || 0),
        quantity: 1
      })
    });
    alert("Added to cart");
  };

  if (loading) {
    return <div className="detail-page">Loading product...</div>;
  }

  if (!product?._id) {
    return <div className="detail-page">{errorMessage || "Product not found."}</div>;
  }

  return (
    <section className="detail-page">
      <div className="detail-media">
        <img
          src={resolveImage(product)}
          alt={product.name}
          onError={(e) => {
            e.currentTarget.src = "https://via.placeholder.com/900x1000?text=Jewelry";
          }}
        />
      </div>

      <div className="detail-info">
        <Link to="/" className="text-link">← Back to products</Link>
        <h1>{product.name}</h1>
        <p className="detail-price">${Number(product.price || 0).toFixed(2)}</p>
        <p className="detail-line">
          <strong>Category:</strong> {product.category || "Jewelry"}
        </p>
        <p className="detail-line">
          <strong>Material:</strong> {product.material || "Not specified"}
        </p>
        <p className="detail-line">
          <strong>Quality/Karat:</strong> {product.quality || "Not specified"}
        </p>
        <p className="detail-desc">{product.description || "No description provided."}</p>

        <div className="card-actions">
          <button type="button" onClick={addToCart}>Add to Cart</button>
          <Link className="secondary-btn" to="/checkout">Checkout</Link>
        </div>
      </div>
    </section>
  );
}

export default ProductDetailPage;
