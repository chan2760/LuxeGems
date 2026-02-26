import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const toNumber = (value, fallback = 0) => {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

function Cart() {
  const [cart, setCart] = useState([]);

  const fetchCart = async () => {
    const res = await fetch("/api/cart");
    const data = await res.json();
    setCart(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    let mounted = true;

    const loadCart = async () => {
      const res = await fetch("/api/cart");
      const data = await res.json();
      if (mounted) {
        setCart(Array.isArray(data) ? data : []);
      }
    };

    loadCart();

    return () => {
      mounted = false;
    };
  }, []);

  const updateQuantity = async (id, quantity) => {
    if (quantity < 1) return;

    const currentItem = cart.find((item) => item._id === id);
    if (!currentItem) return;

    await fetch("/api/cart", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });

    const { _id, ...rest } = currentItem;

    await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...rest,
        quantity
      })
    });

    fetchCart();
  };

  const removeItem = async (id) => {
    await fetch("/api/cart", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });

    fetchCart();
  };

  const total = cart.reduce(
    (sum, item) => sum + toNumber(item.price, 0) * toNumber(item.quantity, 1),
    0
  );

  return (
    <div className="cart-page">
      <div className="cart-header">
        <h2>Your Cart</h2>
        <Link to="/" className="text-link">
          Continue Shopping
        </Link>
      </div>

      {cart.map((item) => (
        <div key={item._id} className="cart-item">
          <img src={item.image} alt="" width="80" />

          <div>
            <h4>{item.name}</h4>
            {item.quality && <p className="cart-item-meta">Quality: {item.quality}</p>}
            {item.stoneName && (
              <p className="cart-item-meta">
                Gem: {item.stoneName}
                {item.stoneGrade ? ` (${item.stoneGrade})` : ""}
                {Number(item.stonePrice || 0) > 0
                  ? ` +$${toNumber(item.stonePrice, 0).toFixed(2)}`
                  : ""}
              </p>
            )}
            <p>${toNumber(item.price, 0).toFixed(2)}</p>
          </div>

          <div>
            <button onClick={() =>
              updateQuantity(item._id, toNumber(item.quantity, 1) - 1)
            }>-</button>

            {toNumber(item.quantity, 1)}

            <button onClick={() =>
              updateQuantity(item._id, toNumber(item.quantity, 1) + 1)
            }>+</button>
          </div>

          <button onClick={() => removeItem(item._id)}>
            Remove
          </button>
        </div>
      ))}

      {cart.length === 0 && <p>Your cart is empty.</p>}

      {cart.length > 0 && (
        <div className="cart-footer">
          <h3>Total: ${total.toFixed(2)}</h3>
          <Link to="/checkout" className="primary-link">
            Proceed to Checkout
          </Link>
        </div>
      )}
    </div>
  );
}

export default Cart;
