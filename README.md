# N Mart Grocery Commerce

N Mart is a local-first digital grocery store platform. Phase 1 includes a React storefront, cart, backend API, local JSON database, admin product entry, and order drafts.

## Fast Start

Double-click:

```text
E:\Miraje\Open-Miraje-Full-App.bat
```

Then open:

```text
http://127.0.0.1:5173
```

## Manual Start

Backend:

```powershell
cd E:\Miraje\backend
npm install
npm run dev
```

Frontend:

```powershell
cd E:\Miraje\frontend
npm install
npm run dev
```

## Local Data

The current local database file is:

```text
E:\Miraje\backend\db\miraje-store.json
```

## Current Features

- Customer storefront
- Product search and category filters
- Cart and checkout draft
- Admin product entry
- Backend product/order persistence
- Local API health check
- Upload folders for future product/banner images

## Next Phase

1. Product edit/delete and stock adjustments.
2. Customer details and delivery address in checkout.
3. Order status pipeline: Draft, Accepted, Packed, Out for Delivery, Delivered.
4. Product image upload.
5. Invoice print/PDF.
6. Payment gateway and customer login.
