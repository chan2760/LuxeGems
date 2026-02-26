import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const isValidGmail = (value) =>
  /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(String(value || "").trim());

function LoginPage() {
  const [username, setUsername] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState(() =>
    location.state?.mode === "register" ? "register" : "login"
  );

  const from = location.state?.from || "/";

  const loginRequest = async (identifierValue, passwordValue) => {
    const normalizedIdentifier = String(identifierValue || "").trim();
    const isEmail = normalizedIdentifier.includes("@");
    return fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...(isEmail ? { email: normalizedIdentifier } : { username: normalizedIdentifier }),
        password: passwordValue
      })
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const normalizedUsername = username.trim();
    const normalizedIdentifier = identifier.trim().toLowerCase();

    if (mode === "register") {
      if (!normalizedUsername || !normalizedIdentifier || !password.trim()) {
        alert("Please enter username, Gmail, and password.");
        return;
      }
      if (!isValidGmail(normalizedIdentifier)) {
        alert("Please enter a valid Gmail address.");
        return;
      }
      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: normalizedUsername,
          email: normalizedIdentifier,
          password
        })
      });
      if (!registerRes.ok) {
        const data = await registerRes.json().catch(() => ({}));
        alert(data.message || "Registration failed");
        return;
      }
    } else {
      if (!normalizedIdentifier || !password.trim()) {
        alert("Please enter Gmail/username and password.");
        return;
      }
      const looksLikeEmail = normalizedIdentifier.includes("@");
      if (looksLikeEmail && !isValidGmail(normalizedIdentifier)) {
        alert("Please enter a valid Gmail address.");
        return;
      }
    }

    let loginRes = await loginRequest(normalizedIdentifier, password);
    if (!loginRes.ok) {
      const isDefaultDemoUser =
        (normalizedIdentifier === "admin@gmail.com" && password === "admin123") ||
        (normalizedIdentifier === "user@gmail.com" && password === "user123");
      if (isDefaultDemoUser) {
        await fetch("/api/auth/dev-reset", { credentials: "include" }).catch(() => {});
        loginRes = await loginRequest(normalizedIdentifier, password);
      }
    }

    if (!loginRes.ok) {
      const data = await loginRes.json().catch(() => ({}));
      alert(data.message || "Login failed. If needed, run /api/auth/dev-reset and try again.");
      return;
    }

    const loginData = await loginRes.json();
    if (loginData?.user) {
      localStorage.setItem("jewelry_user", JSON.stringify(loginData.user));
      window.dispatchEvent(new Event("auth-changed"));
    }

    navigate(from);
  };

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h2>{mode === "login" ? "Login" : "Create Account"}</h2>

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          )}
          <input
            placeholder={mode === "register" ? "Gmail address" : "Gmail or Username"}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">{mode === "login" ? "Login" : "Register"}</button>
        </form>

        <button
          type="button"
          className="secondary-btn"
          onClick={() => setMode((prev) => (prev === "login" ? "register" : "login"))}
        >
          {mode === "login" ? "Need account? Register + Login" : "Have account? Login"}
        </button>

        <Link to="/" className="text-link">
          ← Back to shop
        </Link>
      </div>
    </section>
  );
}

export default LoginPage;
