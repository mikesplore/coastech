Here is a phased implementation plan using Resend for email notifications. This approach prioritizes critical stability fixes first, then enhances user experience, and finally adds advanced features.

### Phase 1: Critical Stability & Security (Weeks 1-2)

**Goal:** Ensure orders are reliably created and admin endpoints are secure. No new UI features yet.

**1.1. Fix Paystack Webhook Reliability**
*   **Action:** Verify the webhook URL in the Paystack dashboard points to your backend.
*   **Action:** Implement idempotency in the webhook handler to prevent duplicate order creation.
*   **Action:** Add robust logging for all webhook events (success and failure).
*   **Files:** `apps/backend/src/api/hooks/payment/paystack/route.ts`

**1.2. Secure Custom Admin Endpoints**
*   **Action:** Audit all custom routes under `/admin`.
*   **Action:** Ensure they use Medusa’s `authenticate("admin")` middleware.
*   **Action:** Perform manual penetration testing with unauthenticated and non-admin authenticated requests.
*   **Files:** All custom routes in `apps/backend/src/api/admin/`

**1.3. Fix Minor Bugs**
*   **Action:** Correct the typo `sata-testid` to `data-testid` in the order details component.
*   **Files:** `apps/storefront/src/modules/order/components/order-details/index.tsx`

**Deliverable:** A stable system where payments reliably create orders and admin routes are secure.

---

### Phase 2: Guest Order Accessibility & Basic Notifications (Weeks 3-4)

**Goal:** Allow guests to track orders and receive basic confirmation emails.

**2.1. Integrate Resend for Email Service**
*   **Action:** Install `resend` package in the backend.
*   **Action:** Configure Resend API key in environment variables.
*   **Action:** Create a reusable email service module in Medusa.
*   **Files:** `medusa-config.js`, new service file e.g., `apps/backend/src/services/email.ts`

**2.2. Implement Order Confirmation Email**
*   **Action:** Create an HTML email template for order confirmation.
*   **Action:** Trigger this email when an order is successfully placed (both guest and authenticated).
*   **Content:** Order number, items, total, shipping address, and a link to track the order.
*   **Files:** New template file, update order creation logic to call email service.

**2.3. Implement Guest Order Lookup**
*   **Action:** Create a new API endpoint `/store/orders/lookup` that accepts `email` and `order_id`.
*   **Action:** Add a "Track Your Order" page in the storefront with a form for email and order number.
*   **Action:** Display order details if found, similar to the authenticated view but without account-specific data.
*   **Files:** `apps/backend/src/api/store/orders/lookup/route.ts`, new storefront page `apps/storefront/src/app/[countryCode]/(main)/order-lookup/page.tsx`

**Deliverable:** Guests can track orders via email/order number, and all customers receive a confirmation email.

---

### Phase 3: Shipment Tracking & Status Updates (Weeks 5-6)

**Goal:** Provide real-time tracking information and status updates.

**3.1. Extend Order Data Model**
*   **Action:** Add fields to the order entity or fulfillment entity for:
    *   `tracking_number`
    *   `tracking_url`
    *   `carrier_name`
    *   `estimated_delivery_date`
*   **Note:** Medusa’s Fulfillment entity already supports some of these. Check if you can extend it or if you need a custom entity.

**3.2. Admin UI for Tracking Information**
*   **Action:** Customize the Medusa admin dashboard to allow admins to input tracking details when creating a fulfillment.
*   **Option A:** Use Medusa’s built-in fulfillment provider interface if it supports these fields.
*   **Option B:** Create a custom admin widget or extend the fulfillment creation form.
*   **Files:** Custom admin plugin or widget files.

**3.3. Implement "Order Shipped" Email**
*   **Action:** Create an HTML email template for shipment notification.
*   **Action:** Trigger this email when a fulfillment is created and tracking info is added.
*   **Content:** Tracking number, carrier, tracking URL, and estimated delivery date.
*   **Files:** New template file, update fulfillment logic to call email service.

**3.4. Display Tracking Info in Storefront**
*   **Action:** Update the order details page to display tracking information if available.
*   **Action:** Add a visual timeline showing order status history (e.g., Placed -> Confirmed -> Shipped -> Delivered).
*   **Files:** `apps/storefront/src/app/[countryCode]/(main)/account/@dashboard/orders/details/[id]/page.tsx`

**Deliverable:** Customers receive tracking info via email and can see it in their account. Admins can easily add tracking details.

---

### Phase 4: Advanced Notifications & Account Linking (Weeks 7-8)

**Goal:** Enhance user experience with proactive notifications and seamless account creation.

**4.1. Implement Additional Email Notifications**
*   **Action:** Create templates and triggers for:
    *   Order Delivered
    *   Order Cancelled
    *   Refund Processed
*   **Files:** New template files, update relevant backend logic.

**4.2. Post-Checkout Account Creation Prompt**
*   **Action:** After a guest checkout, redirect to a page suggesting account creation.
*   **Action:** Pre-fill the email field.
*   **Action:** On account creation, link previous guest orders (matched by email) to the new account.
*   **Files:** New storefront page, update user registration logic to link orders.

**4.3. Improve Paystack Callback Experience**
*   **Action:** Increase retry duration in the callback handler to 30-60 seconds with exponential backoff.
*   **Action:** Add client-side polling on the return page to check order status.
*   **Action:** Show a friendly "processing" message if the order isn’t immediately ready, rather than an error.
*   **Files:** `apps/backend/src/api/payment/paystack/callback/route.ts`, corresponding storefront return page.

**Deliverable:** Proactive communication throughout the order lifecycle and a smooth path from guest to registered customer.

---

### Phase 5: Monitoring & Optimization (Week 9+)

**Goal:** Ensure long-term reliability and performance.

**5.1. Set Up Monitoring and Alerts**
*   **Action:** Monitor failed webhooks, stuck orders, and email delivery failures.
*   **Action:** Set up alerts via Slack or email for critical failures.
*   **Tools:** Sentry, Datadog, or custom logging with alerts.

**5.2. Performance Optimization**
*   **Action:** Review database queries for order lookups and email sending.
*   **Action:** Ensure caching strategies are optimal for non-sensitive data.

**5.3. Documentation**
*   **Action:** Document the webhook setup, email templates, and admin processes for future maintainers.

**Deliverable:** A well-monitored, documented, and optimized order management system.

### Summary of Phases

| Phase | Focus | Key Deliverables |
| :--- | :--- | :--- |
| 1 | Stability & Security | Reliable webhooks, secure admin routes, bug fixes |
| 2 | Guest Access & Basics | Resend integration, confirmation emails, guest order lookup |
| 3 | Tracking & Updates | Tracking fields, admin UI, shipped emails, tracking display |
| 4 | Advanced UX | More email types, account linking, improved callback handling |
| 5 | Monitoring | Alerts, performance tuning, documentation |

This phased approach ensures you address the most critical risks first while gradually building out a robust and user-friendly order management system.