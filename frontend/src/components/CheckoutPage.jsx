import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const toNumber = (value, fallback = 0) => {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const digitsOnly = (value) => String(value ?? "").replace(/\D/g, "");

const readCheckoutDraft = () => {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    return JSON.parse(localStorage.getItem("checkout_shipping_draft") || "{}");
  } catch {
    return {};
  }
};

function CheckoutPage() {
  const [step, setStep] = useState("information");
  const [contactEmail, setContactEmail] = useState(() => {
    const draft = readCheckoutDraft();
    return draft?.contactEmail || "";
  });
  const [shippingAddress, setShippingAddress] = useState(() => {
    const draft = readCheckoutDraft();
    return {
      country: "Thailand",
      firstName: "",
      lastName: "",
      company: "",
      address1: "",
      address2: "",
      city: "",
      province: "",
      postalCode: "",
      phone: "",
      saveForNextTime: true,
      ...(draft?.shippingAddress || {})
    };
  });
  const [shippingMethod, setShippingMethod] = useState("FREE");
  const [paymentMethod, setPaymentMethod] = useState("VISA");
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolderName, setCardHolderName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/cart")
      .then((res) => res.json())
      .then((data) => setCart(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => {
    let mounted = true;

    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        if (data?.authenticated) {
          setUser(data.user);
          setContactEmail(data.user?.email || "");
          localStorage.setItem("jewelry_user", JSON.stringify(data.user));
        } else {
          const local = localStorage.getItem("jewelry_user");
          const parsed = local ? JSON.parse(local) : null;
          setUser(parsed);
          setContactEmail(parsed?.email || "");
        }
      })
      .catch(() => {
        if (!mounted) return;
        const local = localStorage.getItem("jewelry_user");
        const parsed = local ? JSON.parse(local) : null;
        setUser(parsed);
        setContactEmail(parsed?.email || "");
      })
      .finally(() => {
        if (mounted) setAuthChecked(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (sum, item) => sum + toNumber(item.price, 0) * toNumber(item.quantity, 1),
        0
      ),
    [cart]
  );
  const shippingFee = shippingMethod === "FREE" ? 0 : 0;
  const total = subtotal + shippingFee;

  const paymentOptions = [
    {
      value: "VISA",
      title: "Visa Card",
      detail: "Pay securely with your Visa credit or debit card (demo mode).",
      badges: ["VISA"]
    },
    {
      value: "COD",
      title: "Cash on Delivery (COD)",
      detail: "Pay when your order arrives.",
      badges: ["COD"]
    }
  ];

  const formatFullName = () =>
    [shippingAddress.firstName, shippingAddress.lastName]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" ");

  const formatShippingAddressLine = () => {
    const parts = [
      shippingAddress.address1,
      shippingAddress.address2,
      shippingAddress.city,
      shippingAddress.province,
      shippingAddress.postalCode,
      shippingAddress.country
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    return parts.join(", ");
  };

  const updateShippingAddress = (key, value) => {
    setShippingAddress((prev) => ({ ...prev, [key]: value }));
  };

  const validateInformationStep = () => {
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim());
    if (!validEmail) {
      alert("Please enter a valid email address.");
      return false;
    }

    const required = [
      shippingAddress.firstName,
      shippingAddress.lastName,
      shippingAddress.address1,
      shippingAddress.city,
      shippingAddress.province,
      shippingAddress.postalCode,
      shippingAddress.phone
    ];
    if (required.some((value) => !String(value || "").trim())) {
      alert("Please complete all required shipping address fields.");
      return false;
    }
    return true;
  };

  const hasInformationStepData = () => {
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim());
    if (!validEmail) return false;

    const required = [
      shippingAddress.firstName,
      shippingAddress.lastName,
      shippingAddress.address1,
      shippingAddress.city,
      shippingAddress.province,
      shippingAddress.postalCode,
      shippingAddress.phone
    ];

    return !required.some((value) => !String(value || "").trim());
  };

  const goToShipping = () => {
    if (!validateInformationStep()) return;

    if (shippingAddress.saveForNextTime) {
      localStorage.setItem(
        "checkout_shipping_draft",
        JSON.stringify({
          contactEmail: contactEmail.trim(),
          shippingAddress
        })
      );
    } else {
      localStorage.removeItem("checkout_shipping_draft");
    }

    setStep("shipping");
  };

  const downloadReceiptPdf = async (orderId) => {
    if (!orderId) return false;
    try {
      const res = await fetch(`/api/order/${orderId}/receipt`, {
        credentials: "include"
      });
      if (!res.ok) return false;

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `receipt-${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      alert("Please register or login before placing an order.");
      navigate("/login", { state: { from: "/checkout", mode: "register" } });
      return;
    }
    if (!validateInformationStep()) {
      setStep("information");
      return;
    }
    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }
    const normalizedCardNumber = digitsOnly(cardNumber);
    if (paymentMethod === "VISA") {
      if (cardHolderName.trim().length < 2) {
        alert("Enter cardholder name.");
        return;
      }
      if (normalizedCardNumber.length < 12) {
        alert("Enter a valid Visa card number.");
        return;
      }
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry.trim())) {
        alert("Enter expiry date in MM/YY format.");
        return;
      }
      if (!/^\d{3,4}$/.test(digitsOnly(cardCvv))) {
        alert("Enter a valid CVV.");
        return;
      }
    }

    const fullName = formatFullName();
    const shippingAddressLine = formatShippingAddressLine();

    const response = await fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: fullName,
        address: shippingAddressLine,
        contactEmail: contactEmail.trim(),
        shippingAddress: {
          ...shippingAddress,
          fullName
        },
        shippingMethod: "Free shipping",
        paymentMethod: paymentMethod === "VISA" ? "Visa Card" : "Cash on Delivery (COD)",
        paymentStatus:
          paymentMethod === "COD"
            ? "Pay on delivery"
            : "Paid by Visa (simulated)",
        cardLast4: paymentMethod === "VISA" ? normalizedCardNumber.slice(-4) : "",
        billingAddress: {
          sameAsShipping: true,
          address: shippingAddressLine
        },
        items: cart,
        total
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      alert(result.message || "Checkout failed.");
      if (response.status === 401) {
        navigate("/login", { state: { from: "/checkout", mode: "register" } });
      }
      return;
    }

    const downloaded = await downloadReceiptPdf(result.orderId);
    alert(
      `Order placed! ${result.orderId ? `Order ID: ${result.orderId}` : ""}${
        downloaded ? " Receipt PDF downloaded." : " Receipt PDF could not be downloaded."
      }`
    );
    navigate("/");
  };

  const shippingPreviewRows = [
    {
      label: "Contact",
      value: contactEmail || "Not provided",
      canChange: true
    },
    {
      label: "Ship to",
      value: formatShippingAddressLine() || "Not provided",
      canChange: true
    }
  ];

  if (step === "payment") {
    shippingPreviewRows.push({
      label: "Shipping method",
      value: "Free shipping - FREE",
      canChange: false
    });
  }

  return (
    <div className="checkout-page checkout-layout">
      <div className="checkout-main">
        <nav className="checkout-steps" aria-label="Checkout steps">
          <Link to="/cart" className="checkout-step-link">
            Cart
          </Link>
          <span className="checkout-step-separator">›</span>
          <button
            type="button"
            className={step === "information" ? "checkout-step active" : "checkout-step"}
            onClick={() => setStep("information")}
          >
            Information
          </button>
          <span className="checkout-step-separator">›</span>
          <button
            type="button"
            className={step === "shipping" ? "checkout-step active" : "checkout-step"}
            onClick={() => setStep("shipping")}
            disabled={!hasInformationStepData()}
          >
            Shipping
          </button>
          <span className="checkout-step-separator">›</span>
          <button
            type="button"
            className={step === "payment" ? "checkout-step active" : "checkout-step"}
            onClick={() => {
              if (validateInformationStep()) {
                setStep("payment");
              }
            }}
          >
            Payment
          </button>
        </nav>

        {authChecked && !user && (
          <div className="checkout-alert">
            <span>Please login or register before placing an order.</span>
            <button
              type="button"
              className="checkout-inline-link"
              onClick={() => navigate("/login", { state: { from: "/checkout", mode: "register" } })}
            >
              Sign in
            </button>
          </div>
        )}

        {(step === "shipping" || step === "payment") && (
          <div className="checkout-contact-card">
            {shippingPreviewRows.map((row) => (
              <div key={row.label} className="checkout-contact-row">
                <div className="checkout-contact-label">{row.label}</div>
                <div className="checkout-contact-value">{row.value}</div>
                <div>
                  {row.canChange ? (
                    <button
                      type="button"
                      className="checkout-inline-link"
                      onClick={() => setStep("information")}
                    >
                      Change
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === "information" && (
          <>
            <section className="checkout-section">
              <div className="checkout-section-head">
                <h2>Contact</h2>
                {!user && (
                  <button
                    type="button"
                    className="checkout-inline-link"
                    onClick={() => navigate("/login", { state: { from: "/checkout", mode: "login" } })}
                  >
                    Sign in
                  </button>
                )}
              </div>
              <label className="field-label">
                Email
                <input
                  placeholder="yourname@gmail.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </label>
            </section>

            <section className="checkout-section">
              <h2>Shipping address</h2>
              <div className="checkout-form-grid">
                <label className="field-label full">
                  Country/Region
                  <select
                    value={shippingAddress.country}
                    onChange={(e) => updateShippingAddress("country", e.target.value)}
                  >
                    <option value="Thailand">Thailand</option>
                    <option value="Myanmar">Myanmar</option>
                    <option value="Singapore">Singapore</option>
                    <option value="United States">United States</option>
                  </select>
                </label>

                <label className="field-label">
                  First name
                  <input
                    value={shippingAddress.firstName}
                    onChange={(e) => updateShippingAddress("firstName", e.target.value)}
                  />
                </label>

                <label className="field-label">
                  Last name
                  <input
                    value={shippingAddress.lastName}
                    onChange={(e) => updateShippingAddress("lastName", e.target.value)}
                  />
                </label>

                <label className="field-label full">
                  Company (optional)
                  <input
                    value={shippingAddress.company}
                    onChange={(e) => updateShippingAddress("company", e.target.value)}
                  />
                </label>

                <label className="field-label full">
                  Address
                  <input
                    value={shippingAddress.address1}
                    onChange={(e) => updateShippingAddress("address1", e.target.value)}
                  />
                </label>

                <label className="field-label full">
                  Address 2
                  <input
                    value={shippingAddress.address2}
                    onChange={(e) => updateShippingAddress("address2", e.target.value)}
                  />
                </label>

                <label className="field-label">
                  City
                  <input
                    value={shippingAddress.city}
                    onChange={(e) => updateShippingAddress("city", e.target.value)}
                  />
                </label>

                <label className="field-label">
                  Province
                  <input
                    value={shippingAddress.province}
                    onChange={(e) => updateShippingAddress("province", e.target.value)}
                  />
                </label>

                <label className="field-label">
                  Postal/Zip code
                  <input
                    value={shippingAddress.postalCode}
                    onChange={(e) => updateShippingAddress("postalCode", e.target.value)}
                  />
                </label>

                <label className="field-label full">
                  Phone
                  <input
                    value={shippingAddress.phone}
                    onChange={(e) => updateShippingAddress("phone", e.target.value)}
                  />
                </label>
              </div>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={shippingAddress.saveForNextTime}
                  onChange={(e) => updateShippingAddress("saveForNextTime", e.target.checked)}
                />
                Save this information for next time
              </label>
            </section>

            <div className="checkout-footer-actions">
              <Link to="/cart" className="text-link">
                Return to cart
              </Link>
              <button type="button" className="primary-link" onClick={goToShipping}>
                Continue to shipping
              </button>
            </div>
          </>
        )}

        {step === "shipping" && (
          <>
            <section className="checkout-section">
              <h2>Shipping method</h2>
              <label className="checkout-radio-card checkout-radio-single active">
                <div className="checkout-radio-main">
                  <input
                    type="radio"
                    name="shippingMethod"
                    value="FREE"
                    checked={shippingMethod === "FREE"}
                    onChange={(e) => setShippingMethod(e.target.value)}
                  />
                  <span>Free shipping</span>
                </div>
                <strong className="checkout-radio-price">FREE</strong>
              </label>
            </section>

            <div className="checkout-footer-actions">
              <button
                type="button"
                className="checkout-inline-link"
                onClick={() => setStep("information")}
              >
                Return to information
              </button>
              <button type="button" className="primary-link" onClick={() => setStep("payment")}>
                Continue to payment
              </button>
            </div>
          </>
        )}

        {step === "payment" && (
          <>
            <section className="checkout-section">
              <h2>Payment</h2>
              <p className="muted-note">Choose your payment method.</p>
              <div className="checkout-radio-list">
                {paymentOptions.map((option) => {
                  const selected = paymentMethod === option.value;
                  return (
                    <label
                      key={option.value}
                      className={selected ? "checkout-radio-card active" : "checkout-radio-card"}
                    >
                      <div className="checkout-option-head">
                        <div className="checkout-radio-main">
                          <input
                            type="radio"
                            name="payment"
                            value={option.value}
                            checked={selected}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                          />
                          <span>{option.title}</span>
                        </div>
                        <div className="payment-badges">
                          {option.badges.map((badge) => (
                            <span key={badge} className="payment-badge">
                              {badge}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="payment-detail">{option.detail}</p>
                    </label>
                  );
                })}
              </div>

              {paymentMethod === "VISA" && (
                <div className="checkout-form-grid checkout-card-grid">
                  <label className="field-label full">
                    Cardholder name
                    <input
                      placeholder="Name on card"
                      value={cardHolderName}
                      onChange={(e) => setCardHolderName(e.target.value)}
                    />
                  </label>
                  <label className="field-label full">
                    Card number
                    <input
                      placeholder="e.g. 4111 1111 1111 1111"
                      inputMode="numeric"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                    />
                  </label>
                  <label className="field-label">
                    Expiry (MM/YY)
                    <input
                      placeholder="08/29"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                    />
                  </label>
                  <label className="field-label">
                    CVV
                    <input
                      placeholder="123"
                      inputMode="numeric"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                    />
                  </label>
                </div>
              )}
            </section>

            <section className="checkout-section">
              <h2>Billing address</h2>
              <p className="muted-note">Billing address will be the same as shipping address.</p>
              <div className="checkout-radio-card active">
                <div className="checkout-radio-main">
                  <span>Same as shipping address</span>
                </div>
              </div>
            </section>

            <div className="checkout-footer-actions">
              <button
                type="button"
                className="checkout-inline-link"
                onClick={() => setStep("shipping")}
              >
                Return to shipping
              </button>
              <button type="button" className="primary-link" onClick={handleCheckout}>
                Place order
              </button>
            </div>
          </>
        )}
      </div>

      <aside className="checkout-summary-panel">
        <h3>Order summary</h3>
        {cart.length === 0 ? (
          <p className="muted-note">Your cart is empty.</p>
        ) : (
          <>
            <div className="checkout-summary-items">
              {cart.map((item) => (
                <div key={item._id} className="checkout-summary-row">
                  <div className="summary-left">
                    <img src={item.image} alt={item.name} className="summary-thumb" />
                    <div className="summary-item-text">
                      <span className="summary-item-title">{item.name}</span>
                      {item.quality && (
                        <small className="summary-item-meta">Quality: {String(item.quality)}</small>
                      )}
                      {item.stoneName && (
                        <small className="summary-item-meta">
                          Gem: {String(item.stoneName)}
                          {item.stoneGrade ? ` (${String(item.stoneGrade)})` : ""}
                        </small>
                      )}
                    </div>
                  </div>
                  <div className="summary-right">
                    {toNumber(item.quantity, 1)} x ${toNumber(item.price, 0).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className="checkout-totals">
              <div className="checkout-summary-row">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="checkout-summary-row">
                <span>Shipping</span>
                <span>{shippingFee === 0 ? "FREE" : `$${shippingFee.toFixed(2)}`}</span>
              </div>
              <div className="checkout-summary-row total-row">
                <strong>Total</strong>
                <strong>${total.toFixed(2)}</strong>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

export default CheckoutPage;
