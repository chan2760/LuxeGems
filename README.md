# LuxeGems Jewelry System

LuxeGems is a full-stack jewelry e-commerce and customization platform with customer shopping, checkout, and admin management features.

## Team Members

- Chan Nyein Thu (6736625)
- Phone Ko Thant (6736569)

## Features

- User authentication (register, login, logout, profile)
- Product catalog with search, category filter, gold quality filter, gem quality filter, and min/max price filter
- Home slider management (admin can create, edit, delete slider items)
- Jewelry customization workflow (material, jewelry type, quality/karat, gem, gem grade)
- Dynamic custom price calculation
- Cart and multi-step checkout flow
- Order creation and PDF receipt download
- Admin panel for products, designs, slider items, and users
- Product/design image upload from admin panel

## Languages and Technologies Used

- JavaScript
- React + Vite + React Router DOM (frontend)
- Next.js API routes + Node.js (backend)
- MongoDB
- HTML + CSS
- Docker + Docker Compose (development option)

## Project Structure

```text
jewelry-system/
├─ frontend/
│  ├─ src/
│  │  ├─ components/
│  │  ├─ context/
│  │  ├─ App.jsx
│  │  └─ main.jsx
│  ├─ public/products/
│  └─ vite.config.js
├─ backend/
│  ├─ app/api/
│  │  ├─ auth/
│  │  ├─ products/
│  │  ├─ custom-options/
│  │  ├─ calculate-price/
│  │  ├─ cart/
│  │  ├─ order/
│  │  ├─ upload/
│  │  └─ users/
│  ├─ lib/
│  │  ├─ mongodb.js
│  │  ├─ auth.js
│  │  ├─ receiptPdf.js
│  │  └─ models/
│  ├─ public/uploads/
│  │  ├─ products/
│  │  └─ designs/
│  └─ .env.local
├─ docs/screenshots/
├─ docker-compose.yml
└─ README.md
```

## Data Models

MongoDB database name: `jewelryDB`

| Collection | Key fields |
| --- | --- |
| `products` | `_id`, `name`, `category`, `price`, `material`, `quality`, `gemQuality`, `image`, `description`, `showInSlider` |
| `customizationOptions` | `qualities[{label,multiplier}]`, `designs[{id,title,category,image,allowed,productId}]`, `allowedDesigns[{id,allowed}]`, `sliderItems[{id,title,image,description,price,productId}]`, `createdAt`, `updatedAt` |
| `materials` | `_id`, `name`, `pricePerGram` |
| `jewelryTypes` | `_id`, `name`, `baseWeight` |
| `stones` | `_id`, `name`, `grades[{grade,price}]` |
| `cart` | `_id`, `productId`, `name`, `image`, `category`, `material`, `quality`, `gemQuality`, `stoneName`, `stoneGrade`, `stonePrice`, `price`, `quantity` |
| `orders` | `_id`, `userId`, `username`, `email`, `name`, `address`, `contactEmail`, `shippingAddress`, `shippingMethod`, `paymentMethod`, `paymentStatus`, `cardLast4`, `billingAddress`, `items`, `total`, `status`, `createdAt` |
| `users` | `_id`, `username`, `usernameLower`, `email`, `emailLower`, `passwordHash`, `isAdmin`, `firstName`, `lastName`, `phone`, `birthday`, `province`, `gender`, `country`, `the1Number`, `marketingOptIn`, `addresses`, `createdAt`, `updatedAt` |
| `sessions` | `_id`, `token`, `userId`, `expiresAt`, `createdAt` |

## API Reference

Base URL from frontend: `/api` (proxied to `http://localhost:3000/api` by Vite)

### Auth

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Register new user (Gmail + username + password). |
| `POST` | `/api/auth/login` | Public | Login and set `session_token` cookie. |
| `POST` | `/api/auth/logout` | Logged-in | Logout and clear session cookie. |
| `GET` | `/api/auth/me` | Optional | Return current auth state and user object. |
| `GET` | `/api/auth/profile` | Logged-in | Get full profile data. |
| `PATCH` | `/api/auth/profile` | Logged-in | Update profile fields. |
| `GET` | `/api/auth/dev-reset` | Dev | Reset demo `admin/user` accounts. |

### Products and Catalog

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/products` | Public | List products. Supports `?category=` query. |
| `POST` | `/api/products` | Admin | Create product. |
| `GET` | `/api/products/:id` | Public | Get one product by MongoDB ObjectId. |
| `PATCH` | `/api/products/:id` | Admin | Update product fields. |
| `DELETE` | `/api/products/:id` | Admin | Delete product. |
| `GET` | `/api/custom-options` | Public | Get qualities, design catalog, slider items. |
| `PATCH` | `/api/custom-options` | Admin | Update designs/allowed flags/slider items. |
| `GET` | `/api/materials` | Public | List material options. |
| `GET` | `/api/jewelry-types` | Public | List jewelry types. |
| `GET` | `/api/stones` | Public | List gem options and grades. |

### Cart, Pricing, Orders

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/cart` | Public | Get cart items. |
| `POST` | `/api/cart` | Public | Add item to cart or increment quantity. |
| `DELETE` | `/api/cart` | Public | Remove cart item by `id`. |
| `POST` | `/api/calculate-price` | Public | Calculate custom jewelry price. |
| `POST` | `/api/order` | Logged-in | Create order from cart and clear cart. |
| `GET` | `/api/order` | Logged-in | List orders (admin sees all; user sees own). |
| `GET` | `/api/order/:id/receipt` | Logged-in | Download PDF receipt for order. |

### Admin and System

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/users` | Admin | List users with role info. |
| `PATCH` | `/api/users/:id` | Admin | Change user role (`isAdmin`). |
| `DELETE` | `/api/users/:id` | Admin | Delete user and sessions. |
| `POST` | `/api/upload/product` | Admin | Upload product image (max 5MB). |
| `POST` | `/api/upload/design` | Admin | Upload design/slider image (max 5MB). |
| `GET` | `/api/seed` | Dev | Reset and seed sample DB data. |
| `GET` | `/api/test` | Public | Test DB connection (`ping`). |

## Getting Started

### Local Development

1. Install prerequisites: Node.js 20+, npm, MongoDB Atlas or local MongoDB.
2. Install backend dependencies.

```bash
cd backend
npm install
```

3. Install frontend dependencies.

```bash
cd ../frontend
npm install
```

4. Configure backend env file.

```bash
# backend/.env.local
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority
```

5. Start backend.

```bash
cd backend
npm run dev
```

6. Start frontend.

```bash
cd frontend
npm run dev
```

7. Open `http://localhost:5173`.
8. Optional seed data: `http://localhost:3000/api/seed`

### Docker Development

```bash
docker compose up --build
```

Backend runs at `http://localhost:3000` and MongoDB runs at `mongodb://localhost:27017`.

## Backend (docker-compose.yml)

Backend service in [docker-compose.yml](docker-compose.yml):

```yaml
backend:
  image: node:20-alpine
  working_dir: /app/backend
  command: sh -c "npm install && npm run dev -- --hostname 0.0.0.0 --port 3000"
  ports:
    - "3000:3000"
  environment:
    MONGODB_URI: mongodb://mongo:27017/jewelryDB
    NODE_ENV: development
    CHOKIDAR_USEPOLLING: "true"
```

### Variables

| Variable | Purpose | Example |
| --- | --- | --- |
| `MONGODB_URI` | Backend MongoDB connection string used by `backend/lib/mongodb.js` | `mongodb://mongo:27017/jewelryDB` |
| `NODE_ENV` | Runtime mode | `development` |
| `CHOKIDAR_USEPOLLING` | Improves hot-reload in Docker bind mounts | `true` |

## MongoDB (docker-compose.yml)

MongoDB service in [docker-compose.yml](docker-compose.yml):

```yaml
mongo:
  image: mongo:7
  restart: unless-stopped
  ports:
    - "27017:27017"
  environment:
    MONGO_INITDB_DATABASE: jewelryDB
```

### Variables

| Variable | Purpose | Example |
| --- | --- | --- |
| `MONGO_INITDB_DATABASE` | Initial default database name in container | `jewelryDB` |

## Docker Volumes

| Volume / Mount | Type | Purpose |
| --- | --- | --- |
| `./backend:/app/backend` | Bind mount | Live backend code sync from your local machine. |
| `backend_node_modules:/app/backend/node_modules` | Named volume | Keep container dependencies isolated from host OS. |
| `./backend/public/uploads:/app/backend/public/uploads` | Bind mount | Persist uploaded photos on local device. |
| `mongodb_data:/data/db` | Named volume | Persist MongoDB data across container restarts. |

## Notes

- Admin-uploaded photos are stored on the local device in `backend/public/uploads/products` and `backend/public/uploads/designs`.
- These upload folders are ignored in Git (`backend/.gitignore` contains `/public/uploads/`), so images are not pushed to GitHub by default.
- If you deploy to another server, copy `backend/public/uploads` or move to cloud storage (S3/Cloudinary) for shared persistent media.
- Use `fetch(..., { credentials: "include" })` for endpoints that require session cookie authentication.

## Screenshots

Put screenshot files in `docs/screenshots/` with the names below.

### Shop

![Shop home banner and nav](docs/screenshots/shop-home-banner-nav.png)
![Shop product listing and filters](docs/screenshots/shop-product-listing-filters.png)

### Admin

![Admin add product and add design](docs/screenshots/admin-add-product-and-design.png)
![Admin add slider and manage slider items](docs/screenshots/admin-slider-management.png)
![Admin manage products and designs](docs/screenshots/admin-manage-products-designs.png)
![Admin manage designs and users](docs/screenshots/admin-manage-designs-users.png)

### Customize

![Customize jewelry page](docs/screenshots/customize-page.png)

### Checkout

![Checkout information form top](docs/screenshots/checkout-information-top.png)
![Checkout information form bottom](docs/screenshots/checkout-information-bottom.png)
![Checkout shipping step](docs/screenshots/checkout-shipping-step.png)
![Checkout payment step top](docs/screenshots/checkout-payment-top.png)
![Checkout payment step bottom](docs/screenshots/checkout-payment-bottom.png)
