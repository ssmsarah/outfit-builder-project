# Repository Audit (T0.1)

Audit performed before Sprint 0 work, per `ALGORITHMS_SPRINT_README.md`. All later
tickets adapt their paths to match what's found here instead of the README's
suggested layout.

## Stack

- **Type:** MERN monorepo using npm workspaces (`client`, `server`), root `package.json` at repo root.
- **Server:** Node.js, ESM (`"type": "module"`), Express 4.22, Mongoose 8.24 + `mongodb` driver 6.21, `jsonwebtoken` + `bcryptjs` for auth, `multer` for uploads, `dotenv` for config. Dev via `nodemon`.
- **Client:** React 18, Redux Toolkit 2, React Router 7, Vite 5, `axios` for HTTP, `lucide-react` for icons.
- **Database/ORM:** MongoDB Atlas cluster, accessed through Mongoose ODM (`server/src/config/db.js`, connects using `process.env.MONGODB_URI`).
- **Test framework: none.** No `jest`, `vitest`, `mocha`, or similar in the root, `client/`, or `server/` `package.json`, and no `*.test.js` / `*.spec.js` files exist anywhere in the repo. This has to be introduced as part of the Sprint 0 foundation work, since every later ticket is required to run tests.

## Current clothing item model

The closest thing to a "clothing item" model is `server/src/models/Product.js`, a generic marketplace product schema (not outfit-attribute-aware):

| Existing field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Mongo default |
| `name` | String | required |
| `description` | String | default `""` |
| `price` | Number | required |
| `category` | `[String]` enum | `dresses, tops, bottoms, formals, shoes, accessories` — **array**, and values don't match the T0.2 enum |
| `store` | String | required |
| `seller` | ObjectId ref `User` | required |
| `image` | String | required |
| `colors` | `[String]` | free-text color names (e.g. `"black"`), not hex |
| `sizes` | `[String]` | |
| `available` | Boolean | default `true` |
| `stock` | Number | default `0` |
| `ratingAvg`, `numReviews` | Number | |
| `discountType`, `discountValue` | enum / Number | drives virtual `finalPrice` |

`server/src/models/Outfit.js` and `server/src/models/Category.js` exist as files but are **empty (0 bytes)** — unimplemented stubs, not currently used anywhere.

### Field mapping: existing → T0.2 required fields

| T0.2 required field | Existing equivalent | Gap |
|---|---|---|
| `id` | `_id` | none — use Mongo ObjectId |
| `category` (`top,bottom,shoes,accessory,outerwear,dress`) | `category: [String]` (`dresses,tops,bottoms,formals,shoes,accessories`) | different enum values and different shape (array vs. scalar); needs its own field to avoid breaking existing marketplace filtering |
| `colorHex` | `colors: [String]` (names, not hex) | new field required |
| `isNeutralOverride` | none | new field |
| `style` | none | new field |
| `pattern` | none | new field |
| `seasons` | none | new field |
| `occasions` | none | new field |

Decision needed in T0.2: add the new fields **alongside** the existing `category`/`colors` fields (additive, non-breaking) rather than renaming/removing them, since `category` and `colors` are already used by storefront filtering, cart, and the client outfit builder.

No migration framework (no `migrate-mongo`, `umzug`, etc.) is present. MongoDB/Mongoose is schema-flexible: adding fields with schema-level `default`s is non-breaking for existing documents (they simply read as `undefined` until saved, then Mongoose applies defaults). "Migration" for T0.2 will mean an idempotent backfill script (`Product.updateMany` for docs missing the new fields), not a formal up/down migration tool.

## Current rule-based recommendation logic

**There is no server-side recommendation or compatibility service.** `docs/outfit-builder/architecture.md` and `docs/outfit-builder/api-contract.md` describe a planned design (`RecommendationService`, `CompatibilityService`, `PricingService`, `/api/outfit-builder/*` endpoints) but none of it is implemented — `server/src/app.js` only mounts `products, auth, admin, cart, wishlist, orders, reviews, stores, upload` routes; there is no outfit-builder route/controller/service anywhere in `server/src`.

The actual compatibility logic lives entirely **client-side**, in `client/src/features/outfitBuilder/pages/OutfitBuilder.jsx`:

- `ruleBasedCompatibility(selectedProduct, candidate)` (~L115-198): naive scoring out of 100 — exact string overlap on `colors[]`, a hardcoded `neutralColors` name list, stock/availability check, and rating tiers. `compatible = score >= 30`.
- `calculateWeightedScore(candidate)` (~L208-238): averages `ruleBasedCompatibility` across all currently selected items, weighting later selections more.
- `recommendations` (`useMemo`, ~L248-294): for every unselected category, scores all candidates fetched from `GET /api/products/category/:category`, filters `score >= 30`, sorts descending, keeps top 6.

This is the "existing rule-based recommender" referenced in the README's global instructions (don't delete until T4.1) — it is a frontend function, not a backend module, so T4.1's "replace the call site" means routing this component to the new `/api/outfits/recommend` endpoint instead of computing scores client-side, once that endpoint exists.

## Existing user/auth model

`server/src/models/User.js`: `name`, `storeName`, `email` (unique), `phone`, `address`, `panVat`, `password` (bcrypt hash), `role` enum `user|seller|admin`, `sellerStatus` enum `pending|approved|rejected`, `isBlocked`, `cart: [{product, quantity}]`, `wishlist: [ObjectId ref Product]`, timestamps.

Auth is stateless JWT:
- `server/src/controllers/authController.js` — `login` signs `{ userId, role }` with `process.env.JWT_SECRET`, 7-day expiry.
- `server/src/middleware/authMiddleware.js` — `protect` verifies the `Authorization: Bearer <token>` header and sets `req.user = decoded` (so `req.user.userId` / `req.user.role` are available in any protected controller). `requireRole(...roles)` does RBAC.
- No session/cookie auth exists. T3.1 (interaction tracking) and T4.2 (API contract, "user taken from auth session") should read the user id from `req.user.userId` behind the existing `protect` middleware.

## Files later tickets will touch

- **New (Sprint 0+):** `server/src/config/scoringConfig.js`, `server/src/recommendation/{color,compatibility,personalization}/**`, `server/src/utils/math.js`, `server/tests/recommendation/**` (test framework + fixtures also new).
- **Extend:** `server/src/models/Product.js` (T0.2 additive fields). `Category.js`/`Outfit.js` stay out of scope — the plan doesn't require them.
- **New route/controller:** `server/src/routes/outfitRecommendationRoutes.js` + controller, mounted in `server/src/app.js` (T4.2), guarded by the existing `protect` middleware.
- **New model:** an `Interaction` model + service for T3.1 (nothing to extend — no prior interaction tracking exists; `wishlist`/`cart` on `User` are unrelated).
- **Touch at T4.1 only, per instructions:** `client/src/features/outfitBuilder/pages/OutfitBuilder.jsx` — swap its client-side `ruleBasedCompatibility`/`calculateWeightedScore`/`recommendations` for a call to the new API. Not touched before T4.1.

## Other notes

- `server/.env` holds real-looking Atlas credentials and a JWT secret; it's correctly listed in `.gitignore` (not tracked), so no exposure — noted here only because later fixtures/tests must not require a live DB connection (T0.4 fixtures must load without a database, per its acceptance criteria).
- Root `package.json` has no `test` script; one will be added once a test runner is chosen in the next ticket (T0.5 / test framework setup).
