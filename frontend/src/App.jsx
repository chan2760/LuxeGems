import { Routes, Route } from "react-router-dom";
import ProductList from "./components/ProductList";
import CartPage from "./components/CartPage";
import CheckoutPage from "./components/CheckoutPage";
import CustomizePage from "./components/CustomizePage";
import ProductDetailPage from "./components/ProductDetailPage";
import AdminPage from "./components/AdminPage";
import LoginPage from "./components/LoginPage";
import ProfilePage from "./components/ProfilePage";
import "./App.css";

function App() {
  return (
    <div className="app-shell">
      <main className="app-main">
        <Routes>
          <Route path="/" element={<ProductList />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/customize" element={<CustomizePage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
