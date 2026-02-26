import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  birthday: "",
  province: "",
  gender: "",
  country: "Thailand",
  marketingOptIn: false
};

const toCurrency = (value) => {
  const amount = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(amount)) return "0.00";
  return amount.toFixed(2);
};

function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const profileRes = await fetch("/api/auth/profile", { credentials: "include" });
        if (!mounted) return;

        if (profileRes.status === 401) {
          setUser(null);
          setLoading(false);
          setOrdersLoading(false);
          return;
        }

        const profileData = await profileRes.json().catch(() => ({}));
        if (!profileRes.ok || !profileData?.user) {
          setUser(null);
          setLoading(false);
          setOrdersLoading(false);
          return;
        }

        const profileUser = profileData.user;
        setUser(profileUser);
        localStorage.setItem("jewelry_user", JSON.stringify(profileUser));
        setForm({
          ...emptyForm,
          ...profileUser
        });
        setLoading(false);

        const ordersRes = await fetch("/api/order", { credentials: "include" });
        const ordersData = await ordersRes.json().catch(() => []);
        if (!mounted) return;
        setOrders(Array.isArray(ordersData) ? ordersData : []);
      } catch {
        if (!mounted) return;
        setUser(null);
      } finally {
        if (mounted) {
          setLoading(false);
          setOrdersLoading(false);
        }
      }
    };

    loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include"
    });
    localStorage.removeItem("jewelry_user");
    window.dispatchEvent(new Event("auth-changed"));
    navigate("/");
  };

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveProfile = async (patchPayload) => {
    const email = String(patchPayload.email ?? form.email).trim().toLowerCase();
    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email)) {
      setError("Please enter a valid Gmail address.");
      return false;
    }

    setSaving(true);
    setNote("");
    setError("");
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...patchPayload,
          email
        })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.message || "Profile update failed.");
        return false;
      }

      if (result?.user) {
        setUser(result.user);
        setForm({
          ...emptyForm,
          ...result.user
        });
        localStorage.setItem("jewelry_user", JSON.stringify(result.user));
        window.dispatchEvent(new Event("auth-changed"));
      }
      setNote(result.message || "Profile updated.");
      return true;
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    await saveProfile({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      birthday: form.birthday,
      province: form.province,
      gender: form.gender,
      country: form.country || "Thailand",
      marketingOptIn: Boolean(form.marketingOptIn)
    });
  };

  if (loading) {
    return <section className="profile-page profile-centered">Loading profile...</section>;
  }

  if (!user) {
    return (
      <section className="profile-page profile-centered">
        <div className="profile-card">
          <h2>Profile</h2>
          <p>You are not logged in.</p>
          <Link className="text-link" to="/login">
            Go to Login
          </Link>
        </div>
      </section>
    );
  }

  const fullName = [form.firstName, form.lastName]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" ");
  const accountName = fullName || form.username || user.username || "Customer";
  const addressCount = Array.isArray(user.addresses)
    ? user.addresses.length
    : form.province || form.country
      ? 1
      : 0;

  return (
    <section className="profile-page profile-layout">
      <div className="profile-main">
        <div className="profile-header-row">
          <h1>My account</h1>
          <button type="button" className="profile-logout-btn" onClick={logout}>
            Log out
          </button>
        </div>

        <section className="profile-section">
          <h2>Order History</h2>
          {ordersLoading ? (
            <p>Loading order history...</p>
          ) : orders.length === 0 ? (
            <p>You haven't placed any orders yet.</p>
          ) : (
            <div className="profile-order-list">
              {orders.map((order) => (
                <article key={order._id} className="profile-order-card">
                  <div>
                    <strong>Order #{String(order._id).slice(-6).toUpperCase()}</strong>
                    <p>
                      {order.createdAt ? new Date(order.createdAt).toLocaleString() : "Date unavailable"}
                    </p>
                  </div>
                  <div>
                    <p>
                      {order.items?.length || 0} item(s) • ${toCurrency(order.total)}
                    </p>
                    <p>
                      {order.paymentMethod} - {order.paymentStatus}
                    </p>
                  </div>
                  <div className="profile-order-status">{order.status || "Placed"}</div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="profile-section">
          <h2>Update your account</h2>
          {note ? <p className="success-note">{note}</p> : null}
          {error ? <p className="error-note">{error}</p> : null}
          <form className="profile-form-grid" onSubmit={handleUpdateAccount}>
            <label>
              <span>FIRST NAME</span>
              <input
                value={form.firstName}
                onChange={(e) => updateForm("firstName", e.target.value)}
                placeholder="First name"
              />
            </label>
            <label>
              <span>LAST NAME</span>
              <input
                value={form.lastName}
                onChange={(e) => updateForm("lastName", e.target.value)}
                placeholder="Last name"
              />
            </label>
            <label className="full">
              <span>EMAIL</span>
              <input
                value={form.email}
                onChange={(e) => updateForm("email", e.target.value)}
                placeholder="you@gmail.com"
              />
            </label>
            <label>
              <span>MOBILE PHONE</span>
              <input
                value={form.phone}
                onChange={(e) => updateForm("phone", e.target.value)}
                placeholder="Phone number"
              />
            </label>
            <label>
              <span>BIRTHDAY</span>
              <input
                type="date"
                value={form.birthday}
                onChange={(e) => updateForm("birthday", e.target.value)}
              />
            </label>
            <label>
              <span>PROVINCE</span>
              <input
                value={form.province}
                onChange={(e) => updateForm("province", e.target.value)}
                placeholder="Province"
              />
            </label>
            <label>
              <span>GENDER</span>
              <select value={form.gender} onChange={(e) => updateForm("gender", e.target.value)}>
                <option value="">Please select</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </label>

            <label className="full profile-checkbox-line">
              <input
                type="checkbox"
                checked={Boolean(form.marketingOptIn)}
                onChange={(e) => updateForm("marketingOptIn", e.target.checked)}
              />
              <span>
                I would like to receive my privileges, offers and updates according to the privacy
                policy.
              </span>
            </label>

            <button type="submit" className="profile-update-btn" disabled={saving}>
              {saving ? "Updating..." : "Update"}
            </button>
          </form>
        </section>
      </div>

      <aside className="profile-aside">
        <h3>Account details</h3>
        <p className="profile-account-name">{accountName.toUpperCase()}</p>
        <p>{form.country || "Thailand"}</p>
        <p>View addresses ({addressCount})</p>
        <Link to="/" className="text-link">
          Back to shop
        </Link>
      </aside>
    </section>
  );
}

export default ProfilePage;
