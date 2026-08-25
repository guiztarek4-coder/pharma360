# Pharma360 — Existing site API (SHARED backend + DB + admin)

Base: `https://pharma360benak.com/api` (env: EXPO_PUBLIC_PHARMA_API_URL). Site origin for media = base minus `/api`.
Media paths returned like `/api/files/pharma360/uploads/xxx.png` (relative → prefix with site origin). Some images are full unsplash URLs.

## Public (no auth)
- GET /settings → brand, logo, phone, address, horaires, hero_*, delivery_fee(500), relais_fee(350), top_bar_messages[], socials, virtual_tour_url (Matterport), whatsapp_number, cgv_content, privacy_content, loyalty_* , THEME: theme_mode('manual'|'auto'), theme_manual(id), theme_presets[{id,name,accent(hex),bg(hex)}]. Active = manual? theme_manual : season(month). Currently 'bleu_creme' accent #A8C3D4 bg #FAF6EF.
- GET /products  filters: search=, category_id=, brand=, featured=1, is_new=1, on_promo=1, limit=, skip=. Returns array. Fields: id,name,brand,category,category_id,subcategory,description,price,old_price,stock,images[],badge,is_featured,is_new,need,complementary_ids[],created_at
- GET /products/{id}
- GET /categories → tree [{id,slug,label,image,icon,order,level,parent_id,banner_*,children[...]}]
- GET /brands , GET /brands/{id}
- GET /blog , GET /blog/{id}  ({title,excerpt,content,image,author,created_at,id})
- GET /delivery/wilayas → [{id,name,code,base_fee,cities:[{name,fee}]}]
- GET /search/suggestions?q= → {products:[...], ...}
- GET /gift-ideas , GET /pages/{slug}
- POST /promo/validate {code}, POST /giftcard/validate {code}, POST /contact

## Auth (JWT via HttpOnly cookie `access_token`; ALSO accepts `Authorization: Bearer <token>`)
- POST /auth/register {first_name,last_name,email,phone,password} → user (NO cookie). Then login.
- POST /auth/login {identifier,password} → Set-Cookie access_token=<JWT>; body = user. (extract token from set-cookie header on native)
- POST /auth/logout
- POST /auth/forgot-password , POST /auth/reset-password
- GET /auth/me → user {first_name,last_name,role,addresses[],loyalty_points,loyalty_lifetime,referral_code,referred_by,email,phone,id}

## Account (auth required)
- GET /orders/mine → customer order history (GET /orders is ADMIN only!)
- POST /orders  body: {items:[{product_id,name,price,quantity,image?}], full_name, phone, wilaya, payment_method('cod'|'baridimob'), delivery_method('domicile'|'relais'), commune?, agency?, street?, email?, notes?, promo_code?, giftcard_code?, gift_code?} → order {id,total,subtotal,delivery,status,...}
- GET /account/addresses , POST /account/addresses , DELETE /account/addresses/{id}
- GET /account/giftcards
- GET /loyalty/me → {enabled,points,lifetime,points_per_100da,tier,tier_override,next_tier}
- GET /loyalty/member-pricing
- POST /loyalty/claim-gift , POST /loyalty/redeem {reward_id}
- GET /favorites , POST /favorites/{id} , DELETE /favorites/{id}
- GET /notifications , POST /notifications/read
- Chat: POST /chat/start , GET /chat/{id} , POST /chat/{id}

## Loyalty tiers (from settings.loyalty_tiers): BRONZE(min 300), Silver(min 500), Gold(min 1500). points_per_100da=1. rewards in settings.loyalty_rewards.

## THEME ALGO (replicate exactly) — apply(accent,bg):
hslToHex(h,s,l): l/=100; a=k=>(k+h/30)%12; k=(s/=100)*min(l,1-l); f=n=>round(255*(l-k*max(-1,min(a(n)-3,min(9-a(n),1))))); hex.
[h,s,_]=rgbToHsl(hexToRgb(accent)); sat=min(95,max(45,s+12));
mint50=bg (page background); mint{100:92,200:84,300:74,400:63,500:52,600:43,700:35,800:27,900:20}=hslToHex(h,sat,L); primary=mint600=hslToHex(h,sat,43).
Named seasonal --primary HSL: spring 142 71 45; summer 192 91 36; autumn 21 90 48; winter 217 91 60; rose 330 81 60; mauve 262 83 58; gold 40 74 40; noir 240 6 15 (bg white).

## Test account (also in test_credentials.md)
email app.test.1787653725@pharma360test.com / pass Test12345
