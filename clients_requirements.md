Core Business Requirements
	•	Private app for existing medical store customers only and future customers
	•	Admin approval required for access
	•	Minimum order value: ₹2500
	•	Catalog size: 3000–4000 SKUs
	•	Users: 50–100 initially → scalable to ~1000

⸻

👤 User Requirements
	•	Sign up / login
	•	Wait for admin approval
	•	Browse, search, and filter products
	•	Add to cart with quantity
	•	Place order (only if ≥ ₹2000)
	•	View order history
	•	View/download invoice inside app (optional)
	•	Receive order updates (accepted, processing, etc.)

⸻

🏪 Admin Requirements
	•	Approve/reject users
	•	Add/edit/delete products (bulk upload supported)
	•	View incoming orders
	•	Get real-time notification when order is placed
	•	Accept/reject orders
	•	Update order status (accepted → processing → shipped)

⸻

📦 Product Requirements
	•	Product fields:
	•	Name
	•	Category
-            Company
	•	Price
	•	Stock status
	•	Organized categories
	•	Strong search + filtering

⸻

🛒 Order Requirements
	•	Cart system with quantity control
	•	Enforce minimum ₹2000 order
	•	Order placement system
	•	Order status lifecycle:
	•	Placed → Accepted → Processing/Shipment → Completed

⸻

🧾 Invoice Requirements (NEW)
	•	On order placement:
	•	Auto-generate PDF invoice
	•	Invoice delivery options:
	•	Send PDF via WhatsApp (optional, based on client confirmation)
	•	Show invoice inside app
	•	Allow user to download invoice
	•	Invoice should include:
	•	Order details
	•	Product list + quantity
	•	Total amount
	•	Store details

⸻

🔔 Notification Requirements (UPDATED)
	•	Admin:
	•	Instant notification when new order is placed
	•	Customer:
	•	Notification when:
	•	Order is accepted
	•	Order is in processing/shipping stage
	•	Optional:
	•	WhatsApp notification integration (using something like Twilio API)

⸻

💳 Payment Requirements
	•	Initial:
	•	No online payment (manual / credit-based)
Credit shown and QR for payment given then admin can adjust the credit from his dashboard and the customer should recirve a reminder for payment , 60 days credit deadline , notify them at 55 days 
⸻

⚙️ Technical Requirements
	•	Mobile app (Android, IOS)
	•	Backend API system
	•	Database (users, products, orders, invoices)
	•	Admin dashboard (web)
	•	PDF generation system
	•	Notification system (in-app + optional WhatsApp)

⸻

📈 Scalability Requirements
	•	Support growth up to ~1000 users
	•	Handle large SKU catalog efficiently
	•	Efficient search performance