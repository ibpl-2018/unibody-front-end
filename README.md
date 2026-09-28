# Unibody — web + mobile (front-end)

Clients for **unibody.in**, the Apple-parts marketplace. The API lives in **unibody-back-end**.

| Folder | What it is | Tech |
| --- | --- | --- |
| `web/` | Customer storefront (`/`) **and** admin panel (`/admin`) | Next.js 16 (App Router), React 19, Tailwind 4 |
| `mobile/` | iOS + Android app — bundle id / package **`in.unibody.app`** | Expo SDK 57, expo-router, React Native 0.86 |
| `shared/` | Copy of `unibody-back-end/shared` (types, schemas, pricing, API client). **Don't edit here** — see below | TypeScript |

`web` + `shared` are a pnpm workspace. `mobile` is a standalone npm project (EAS builds stay self-contained) that vendors `shared/src` into `mobile/src/shared`.

## Quick start (local)

Requirements: Node 22.13+ (`nvm use`), pnpm 10, and the API running from unibody-back-end on `http://localhost:4000`.

```bash
pnpm install
cp web/.env.example web/.env.local
pnpm dev                                   # web on http://localhost:3000 (admin: /admin)
```

Mobile:

```bash
cd mobile && npm ci && cp .env.example .env.local
npx expo start                             # dev server (needs a development build — see mobile/README.md)
npx expo run:ios                           # iOS simulator — needs Xcode 26.4+
npx expo run:android                       # Android emulator — needs JDK 17 + Android SDK 36
```

On the Android emulator either run `adb reverse tcp:4000 tcp:4000 && adb reverse tcp:3000 tcp:3000` or set `EXPO_PUBLIC_API_URL=http://10.0.2.2:4000`.

## Scripts (root)

| Command | Does |
| --- | --- |
| `pnpm dev` / `pnpm build` / `pnpm start` | web dev / production build / run build |
| `pnpm typecheck` / `pnpm test` | typecheck shared + web / shared unit tests |
| `pnpm sync-shared` | pull `../unibody-back-end/shared/src` into `shared/` and `mobile/src/shared` |
| `pnpm mobile:install` / `pnpm mobile:typecheck` | mobile helpers |

Full-stack regression (API + web, live): `pnpm regression` in unibody-back-end.

### Browser E2E (Playwright)

`pnpm e2e` drives the installed Google Chrome against a running API + web (API needs `OTP_DEV_MODE=true`, `PAYMENTS_MOCK=true`,
and `RATE_LIMIT_ALLOWLIST=127.0.0.1,::1,::ffff:127.0.0.1` so repeated runs aren't rate-limited). ~4 minutes. It covers:

- **Journeys**: product → bag → OTP checkout → COD order; admin confirm → pack → shipment → ship (GST invoice) while the
  customer's tracking page updates live over SSE; online payment on `/pay/:orderNo` (mock Razorpay); "My orders" OTP sign-in;
  packer role locked out of reports/purchases/invoices.
- **Sweep**: every storefront and admin screen at desktop (1440) and phone (390) widths, light and dark — fails on browser
  errors, 5xx responses, error screens, horizontal overflow, being bounced to the admin login, or leftover "PartsBay" text.

Screenshots land in `e2e-results/screens/`, the HTML report in `e2e-results/report/` (`pnpm exec playwright show-report e2e-results/report`).

## Features

**Storefront** — part finder (device → model → part, remembers "My device"), search by A-number, family/model listings with filters,
product pages with grade explainer, fit check and pincode delivery/COD check, bag with live quote, single-page checkout
(name + OTP-verified mobile + address, no account needed), UPI/Card/Netbanking via Razorpay (prepaid discount) or COD (+fee, limits),
coupons & festive banner, confirmation, **live order tracking (Server-Sent Events)**, cancel before packing, my orders, help/legal pages,
Apple non-affiliation disclaimer, light/dark/auto theme.

**Admin** — real-time dashboard (revenue, orders, AOV, margin, needs-attention, city & payment split), orders (tabs, bulk status,
detail with timeline, serial-unit assignment, courier/AWB, COD collected, GST invoice & shipping label print), products (live toggle,
editor with compatibility, pricing/margin, GST/HSN, images), devices & categories, inventory (stock/reserved, serial units,
movement ledger, adjustments), purchases & suppliers (incl. donor-device harvesting), invoices, customers & abandoned-cart leads,
offers & coupons, reports + CSV (sales, GSTR-1 style GST, inventory valuation, purchases, COD, P&L), settings (store/GSTIN,
COD & shipping rules, service areas, staff & roles OWNER/MANAGER/PACKER), light/dark.

## Deploying

**Web** — Vercel (root directory `web/`, install `pnpm install`, build `pnpm --filter @unibody/shared build && pnpm --filter @unibody/web build`)
or Docker:

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.unibody.in --build-arg NEXT_PUBLIC_SITE_URL=https://unibody.in -t unibody-web .
docker run -d -p 3000:3000 unibody-web
```

Env: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL` (build-time), optional `API_URL` (server-side URL of the API).

**Mobile** — EAS (`mobile/eas.json`, profiles `preview` = internal APK/ad-hoc, `production` = store builds pointing at `https://api.unibody.in`):

```bash
cd mobile
npx eas-cli@latest login && npx eas-cli@latest init        # links the Expo project (adds extra.eas.projectId)
npx eas-cli@latest build --profile preview --platform all
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --profile production --platform ios|android
```

---
Unibody is an independent retailer and is not affiliated with Apple Inc. Product renders are original 3D artwork.
