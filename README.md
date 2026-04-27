# Laundry-Project (CYNTROVA Mini Laundry OMS - AI First)

A lightweight (but production-lean) Laundry / Dry Cleaning Order Management System:

- Create orders with multiple garments and auto-billing
- Track order status (`RECEIVED -> PROCESSING -> READY -> DELIVERED`)
- Filter/search orders (status, name/phone/id, garment)
- Admin dashboard (revenue, status breakdown, last 7 days trend)
- Authentication (JWT access + rotating refresh tokens) + RBAC (`admin` / `staff` / `customer`)
- SQLite persistence (no in-memory loss)
- Premium UI (React + Tailwind)

## Setup (Local)

Prereqs: Node.js 18+ and npm.

1) Install dependencies:
```bash
npm install
npm --prefix frontend install
```

2) (Optional) Configure env:
```bash
copy .env.example .env
```

3) Run dev (API + UI):
```bash
npm run dev
```

- API: `http://localhost:3000`
- UI: `http://localhost:5173`

On first start, the backend seeds an admin user and prints the credentials in the server console (unless `ADMIN_PASSWORD` is set).

### Admin (Fixed Credentials)

- Email: `admia@gmail.com`
- Password: `assignment`

### Customer

- First create an account from the Login page (Customer tab), then login using the same email/password.

## Production Build (Single Server)

```bash
npm run build
npm start
```

This serves the compiled UI from `frontend/dist` on the same port as the API.

## Features Implemented

- Orders
  - Create order (catalog-priced items, quantity validation, total billing)
  - Estimated ready time (`estimatedReadyAt`)
  - Status updates with enforced transitions + timeline events
  - List orders with pagination and filters
- Dashboard
  - Total orders, total revenue
  - Orders per status
  - Revenue trend (last 7 days)
- Catalog (Admin)
  - Update garment prices / activate/deactivate items
- Auth
  - Login (rate limited)
  - Customer signup (register)
  - Refresh token rotation (stored hashed in DB)
  - Logout (revokes refresh token)
  - Admin can create staff/admin users

## API Quick Reference

Base URL: `http://localhost:3000`

- `GET /health`
- `POST /api/auth/login`
- `POST /api/auth/register` (customer signup)
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/users` (admin)
- `GET /api/catalog`
- `PUT /api/catalog` (admin)
- `POST /api/orders`
- `GET /api/orders?status=&search=&garment=&page=&pageSize=`
- `GET /api/orders/:id`
- `PATCH /api/orders/:id/status`
- `GET /api/dashboard`

## Postman / Demo

- Postman collection: `postman/CYNTROVA_Laundry_OMS.postman_collection.json`
- UI demo flow:
  - Login -> Dashboard -> Orders -> Create Order -> Advance status

## AI Usage Report (Critical)

Tools used:
- ChatGPT (this session) for scaffolding and iteration

Sample prompts used:
- "Create an Express + SQLite order management API with JWT auth and status workflow."
- "Design a clean schema for orders, order_items, users, refresh_tokens and status history."
- "Generate a premium React + Tailwind admin UI for dashboard + orders + create order."
- "Add token refresh rotation and safe storage pattern for refresh tokens in SQLite."

Where AI helped most:
- Rapid scaffolding for schema and endpoints
- Status workflow + audit timeline design
- UI layout and component scaffolding

What AI got wrong / what I improved:
- Security defaults: added `.env.example`, short-lived access tokens, refresh rotation, and DB-hashed refresh tokens
- API ergonomics: pagination + filters + consistent query params
- Data model: normalized `orders` + `order_items` + `order_status_events` for analytics

## Tradeoffs / What I'd Improve With More Time

- Stronger password policy + optional 2FA for admin
- Phone formatting normalization
- Exports (CSV invoice, daily revenue CSV)
- Test suite (API integration + UI e2e smoke)
- Deployment (Render/Railway + Postgres)
