# Pharma360 Mobile — PRD

## Original problem statement
Create a mobile app (iOS + Android) for Pharma360, connected directly to the existing website
(pharma360benak.com). Requirement: the app must use the SAME database and SAME admin back-office as
the website. Any change made in the site admin must reflect automatically in the app without a new
publication. One single admin manages both site and app. Parapharmacy (no prescriptions).

## Architecture (key decision)
- The mobile app is a **thin native client of the existing production API** `https://pharma360benak.com/api`
  (env `EXPO_PUBLIC_PHARMA_API_URL`). It has **no own backend/DB** — it reads/writes the same MongoDB
  through the same API the website uses. => same data, same admin, automatic live sync, no republish.
- Frontend: Expo (SDK 54) + expo-router, TypeScript. Fonts: Outfit (display) + Plus Jakarta Sans (text).
- Dynamic theme replicates the website's exact algorithm: `GET /settings` → `theme_mode/theme_manual/theme_presets`
  → palette derived from active preset `accent`+`bg` (see `src/theme/palette.ts`). Follows admin theme changes automatically.
- Auth: JWT. Login sets `access_token` cookie; app also captures it (set-cookie on native) and sends
  `Authorization: Bearer`, plus `credentials:include`. Token in secure storage.
- Local state: cart (`pharma_cart`) & favorites (`pharma_favorites`) via `@/src/utils/storage`.

## Implemented (2026-06 / build 1)
- Bottom tabs: Accueil, Catalogue, Panier, Compte (custom glass tab bar + cart badge).
- Home: logo/search header, hero (from /settings), trust badges, loyalty teaser, "Nos Offres"
  (/products?on_promo), Catégories grid (/categories), "Nouvel Arrivage" (is_new), "Coups de Cœur"
  (featured), Marques strip (/brands), Blog teasers (/blog). Pull-to-refresh.
- Catalogue: debounced search (/products?search), top-level category chips (single horizontal scroller),
  2-col grid, product count, loading/empty/error states. Deep params: on_promo/is_new/featured.
- Product detail (/produit/[id]): image pager, brand, price/old_price/discount %, stock + loyalty pts,
  description, related carousel, sticky add-to-cart.
- Category (/categorie/[id]) and Brand (/marque/[id]) product listings.
- Cart (/panier): qty stepper, remove, subtotal + estimated delivery, sticky checkout bar, empty state.
- Checkout (/checkout): contact, delivery method (domicile/relais per settings), wilaya bottom-sheet
  (/delivery/wilayas, dynamic fee), address, payment (COD/BaridiMob per settings), summary,
  POST /orders → /order-success (clears cart). Keyboard handled via react-native-keyboard-controller.
- Auth: /auth/login (identifier+password), /auth/register (auto-login after).
- Account (/compte): guest CTAs vs logged-in profile + loyalty points + menu + logout.
- Loyalty (/fidelite): Bronze/Silver/Gold tiers + perks (settings.loyalty_tiers), points progress
  (/loyalty/me), rewards (settings.loyalty_rewards).
- Orders (/commandes): GET /orders/mine (auth) with status chips.
- Store locator (/pharmacie): address/horaires/phone, Matterport virtual tour (WebView), maps/call/WhatsApp.
- Blog list + detail.

## Testing
- Frontend testing agent: 11/11 core screens verified against live API. Fixed: safe back-navigation
  fallback (GO_BACK) on deep-linked screens. Order submission validated up to the confirm step
  (not submitted repeatedly to protect prod DB).

## Personas
- Algerian parapharmacy shopper browsing skincare/wellness, ordering with cash-on-delivery/BaridiMob,
  earning loyalty points.
- Store owner/admin who manages everything from the SAME existing website back-office.

## Backlog (next)
- P1: Server-side favorites sync (/favorites) + notifications (/notifications) once desired.
- P1: Promo code & gift card fields at checkout (/promo/validate, /giftcard/validate).
- P2: Address book (/account/addresses), product reviews, in-app chat (/chat), share product.
- P2: react-native-maps pin for the store (currently deep-links to Maps).

## Credentials
See `/app/memory/test_credentials.md`. API map in `/app/memory/API_MAP.md`.
