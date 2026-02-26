import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/" className="brand-link">
          aura
        </Link>
        <div className="nav-links">
          <Link to="/category/ring">RINGS</Link>
          <Link to="/category/bracelet">BRACELETS</Link>
          <Link to="/category/necklace">NECKLACES</Link>
          <Link to="/category/earring">EARRINGS</Link>
          <Link to="/customize">CUSTOMIZE</Link>
        </div>
      </div>

      <div className="navbar-actions">
        <Link to="/" className="action-pill">
          NEW DROP
        </Link>
        <Link to="/cart" className="icon-link" aria-label="Cart">
          CART
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;
