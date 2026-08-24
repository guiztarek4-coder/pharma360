# Pharma360 — PRD

## Problem Statement
Site e-commerce de parapharmacie "Pharma360" basé en Algérie, inspiré de pharmaly-dz.com. UI en français, devise Dinar Algérien (DA). Palette vert menthe & blanc.

## Architecture
- Backend: FastAPI (`/app/backend/server.py`), MongoDB (motor). Auth JWT via cookie httpOnly. Object storage Emergent pour images admin.
- Frontend: React (CRA + craco, alias `@`→src), TailwindCSS, react-router, sonner. Contexts Auth + Cart (panier en localStorage).
- Routes API sous `/api`. Frontend via `REACT_APP_BACKEND_URL`.

## User Personas
- Client algérien: parcourt, filtre, ajoute au panier, commande (paiement à la livraison ou carte démo), suit ses commandes.
- Administrateur: gère produits, stocks, prix, promos, marques, blog, commandes.

## Core Requirements (static)
- Header fixe (logo, recherche + suggestions, téléphone cliquable, compte, panier compteur + total DA).
- Bandeau réassurance, menu catégories (8), sous-menus (Marques/Blog/Promos/Nouveautés).
- Accueil: hero, Nos offres (prix barré), Nouvel arrivage (badge Nouveau), catégories, coups de cœur, marques, blog.
- Fiche produit, panier quantités, checkout COD + carte, compte (inscription email OU téléphone, connexion, commandes, adresses).
- Filtres/tri, pages marques, blog, contact + carte, footer légal.
- Back-office admin complet.

## Implemented (2026-08-15)
- Auth JWT (inscription prénom/nom + email OU téléphone, connexion par identifiant, /me, logout, admin seedé).
- Catalogue produits + filtres (catégorie, marque, promo, nouveau, featured, recherche, prix, tri) + suggestions.
- Panier (drawer + localStorage), checkout invité/connecté, calcul livraison 500 DA, décrément stock.
- Commandes: création, historique client, gestion admin (statuts).
- Marques + pages dédiées, blog + articles, contact (form + carte OpenStreetMap), pages légales (Confidentialité/CGV).
- Admin back-office: stats, CRUD produits/marques/blog, upload image (object storage), gestion commandes.
- Seed: 12 produits, 10 marques, 3 articles.
- Tests: backend 40/40, flux frontend critiques 100%.

## Implemented (2026-08-16 — iteration 4)
- Fix bug menu z-index (drawer mobile via portail z-[9999]). Tests 21/21 backend, 100% frontend.
- Livraison toutes wilayas + frais par wilaya (admin). 3 modes: retrait pharmacie (gratuit), domicile, point relais.
- Checkout: modes de livraison, code promo (BIENVENUE10 seedé), total détaillé (sous-total+livraison-remise).
- Notifications commandes: notification in-app admin (badge) + email auto (nécessite RESEND_API_KEY, sinon ignoré).
- Sous-catégories dynamiques + catégories dynamiques (DB), CRUD admin complet.
- Admin dashboard restructuré: Commandes, Produits, Clients (+historique), Marques, Catégories, Codes promo, Blog, Bannières, Notifications, Paramètres, Compte.
- Bannières éditables (hero image/titre/sous-titre + messages bandeau).
- Recherche multi-termes (nom/marque/catégorie).
- Admin peut changer nom/email/mot de passe depuis l'onglet Compte.
- Responsive mobile amélioré.

## Implemented (2026-08-17 — iteration 6)
- **Catégories hiérarchiques 3 niveaux** (Catégorie → Sous-catégorie → Sous-sous-catégorie), arbre auto-référencé (`parent_id`, `level`), profondeur STRICTEMENT limitée à 3 (MAX_LEVEL=2, HTTP 400 au 4e niveau).
- Image à chaque niveau. Endpoints: `GET /api/categories` (arbre imbriqué), `GET /api/categories/{id}` (category + ancestors + children), `POST/PUT/DELETE /api/categories` (delete cascade sur descendants + nullifie `category_id` produits). Anciens endpoints `/api/subcategories` SUPPRIMÉS.
- Produits liés au nœud feuille via `category_id`. `GET /api/products?category_id={leaf}`.
- Navigation client (drill-down): clic sur une catégorie → si enfants, cartes des sous-catégories (avec images) + fil d'ariane; si feuille, grille produits + filtres marque/prix/tri.
- Header: menu déroulant multi-niveaux (desktop flyout 3 niveaux, mobile accordéon imbriqué).
- Admin: onglet Catégories en arborescence (add/edit/delete + upload image à chaque niveau, bouton "+" masqué au niveau 3); formulaire produit avec sélecteurs en cascade (pf-cat-level-0/1/2).
- Seed migration `cat_tree_v1`: 13 catégories principales × 2 sous × 2 sous-sous + ~104 produits d'exemple (données de démo à remplacer par les vraies).
- Tests: backend 15/15, flux frontend 100%.

## Implemented (2026-08-17 — iteration 7)
- **Import en masse CSV + Excel** (catégories ET produits) avec modèle téléchargeable :
  - `GET /api/admin/import/template/{categories|products}?format=csv|xlsx`
  - `POST /api/admin/import/categories` (upsert idempotent par label+parent, arbre 3 niveaux) → `{created, errors}`.
  - `POST /api/admin/import/products` (colonne "Chemin catégorie" ex: `A > B > C` résolue vers la feuille ; lignes non résolues renvoyées dans `errors[]` avec n° de ligne).
- **Réordonnancement glisser-déposer** des catégories aux 3 niveaux (`PUT /api/categories/reorder {ids}`, HTML5 DnD natif, réordonne au sein d'un même parent).
- **Bannière par catégorie principale** (image + titre + sous-titre + bouton/lien) : champs `banner_*` sur la catégorie, éditables dans l'admin (niveau 0 uniquement), affichées en haut de la page catégorie côté client.
- **Fil d'ariane produit complet** sur la fiche produit (Accueil > Principale > Sous > Sous-sous > Produit).
- Tests : backend 13/13, flux frontend 100%.

## Implemented (2026-08-18 — iteration 8)
- **Recherche par catégorie** : menu déroulant (catégories principales) dans la barre de recherche → `/catalogue?search=&category_id=`. Le filtre `category_id` couvre désormais tout le sous-arbre (`_descendant_ids` + `$in`), donc filtrer par une catégorie principale retourne tous les produits de la section.
- **Produits similaires** : la fiche produit affiche des produits de la **même sous-catégorie** (parent de la feuille) pour le cross-selling. Correction d'une race condition (l'arbre de catégories doit être chargé avant de calculer le chemin).
- **Fil d'ariane produit** complet vérifié (Accueil › Principale › Sous › Sous-sous › Produit).
- **Suivi des stocks bas** : seuil global réglable dans Paramètres (`low_stock_threshold`, défaut 5) ; carte "Stock bas" sur le tableau de bord (rouge, cliquable) ; badge rouge sur l'onglet Produits ; filtre "Stock bas" ; lignes en rouge ; endpoints `GET /api/admin/stats` (low_stock) et `GET /api/admin/low-stock`.
- Tests : backend 6/6 ; frontend vérifié (race condition corrigée, libellé "Produits similaires").

## Implemented (2026-08-18 — iteration 9)
- **Footer & pages légales éditables** : textes « Politique de confidentialité » et « CGV » modifiables dans l'admin (Paramètres) ; le footer utilise les vraies catégories.
- **Adresse cliquable → Google Maps** : dans le footer et la page Contact (lien `maps_link` éditable, sinon généré depuis l'adresse) ; carte Google Maps intégrée sur Contact.
- **Produits complémentaires** : sélection par produit dans l'admin (recherche + chips) ; affichés dans le panier (drawer) sous « Produits complémentaires recommandés » avec bouton Ajouter. Endpoint `GET /api/products/{id}/complementary`.
- **Filtres pages catégories (feuilles)** : « En promo » + Marque.
- **Menu « Marques »** dans la barre de navigation ; page marque avec filtres « En promo » + Catégorie/Sous-catégorie.
- **Modes de paiement** : « Espèces à la livraison » + « BaridiMob » (carte masquée). BaridiMob crée la commande (statut « En attente de paiement BaridiMob ») puis ouvre WhatsApp (n° `whatsapp_number` éditable) avec un message pré-rempli.
- **2 cases obligatoires au paiement** : acceptation confidentialité/CGV + « Je ne suis pas un robot » (case simple) ; bouton de validation désactivé tant que les deux ne sont pas cochées.
- Tests : backend 5/5 ; frontend ~95% (le petit souci UX de la case CGV a été corrigé et re-vérifié).

## Implemented (2026-08-18 — iteration 10)
- **Livraison par wilaya → commune / agence** : 58 wilayas pré-chargées (avec communes principales + 2 agences chacune). Domicile = prix wilaya (base_fee) + prix commune ; Point relais = prix de l'agence uniquement. Entièrement gérable dans l'admin (onglet **Livraison** : CRUD wilayas + éditeurs de communes et d'agences avec prix). Endpoints `GET /api/delivery/wilayas`, `POST/PUT/DELETE /api/admin/wilayas`. `compute_delivery` mis à jour.
- **Connexion rapide au checkout** : « Déjà client ? Connectez-vous » pré-remplit les coordonnées + lien « Mot de passe oublié ? ».
- **Mot de passe oublié / réinitialisation** : `POST /api/auth/forgot-password` (email via Resend, ne révèle pas si le compte existe) + `POST /api/auth/reset-password` (token single-use, expire 1h, TTL index). Page `/reset-password`. Disponible sur `/compte` et au checkout.
- **Visite virtuelle 360°** : page `/visite-360` (lien `virtual_tour_url` éditable dans l'admin, placeholder si vide) + bouton « Explorez à 360° notre boutique » sur la page Contact.
- Tests : backend 5/5 ; frontend ~95% (petit quirk de synchro du select wilaya corrigé).

## Implemented (2026-06-22 — iteration 11-14)
- **Correctif Mot de passe client (Resend free tier)** : `onboarding@resend.dev` ne peut envoyer qu'à l'adresse propriétaire du compte Resend. Solution de secours : `POST /api/auth/forgot-password` renvoie désormais `reset_link` + `found` quand le compte existe ; le lien s'affiche directement à l'écran (sur `/compte` et au checkout) via un bouton « Créer un nouveau mot de passe ». (Pour de vrais emails clients : vérifier un domaine dans Resend.)
- **Système de favoris** : cœur sur `ProductCard` + fiche produit. `GET/POST/DELETE /api/favorites` (auth, tableau `favorites` sur user). Onglet « Mes favoris » dans `/compte`. `FavoritesContext`. Non connecté → toast d'invite à se connecter.
- **Refonte Footer (5 colonnes)** : À propos (texte éditable), Actualités (liens éditables), Aide (liens éditables), Nous suivre (Facebook/Instagram/TikTok/WhatsApp), Contactez-nous (adresse Maps, tel, email, horaires, visite 360). Liens des colonnes Actualités/Aide gérables (ajout/édition/activation) dans l'admin onglet **Footer & Pages**. Réseaux : FB/IG/TikTok dans Paramètres, WhatsApp = `whatsapp_url` ou dérivé du numéro.
- **Pages CMS** : collection `cms_pages`, route publique `/page/:slug`, endpoints `GET /api/pages/{slug}`, `GET/POST/PUT/DELETE /api/admin/pages`. 9 pages seedées (FAQ, modes-paiement, retour-produit, conditions-livraison, conditions-promos, rappel-produit, idées-cadeaux, carte-cadeau, programme-fidélité). Contenu éditable depuis l'admin (activer/désactiver, slug auto).
- **Programme de fidélité** : 1 pt / 100 DA (config `loyalty_points_per_100da`). Points crédités quand la commande passe au statut **« Livrée »** (`update_order_status`) ; message « Bravo, vous avez gagné X points » sur OrderSuccess (crédités à la livraison). Statuts Bronze/Argent/Or (`loyalty_tiers`). Récompenses (`loyalty_rewards`, type fixed/percent) échangeables → crée un code promo `FID-XXXX` single-use (réutilise le système de promo, désactivé après usage). Page `/fidelite` + onglet `/compte`. Admin onglet **Fidélité** (activer, taux, paliers, récompenses). Endpoints `GET /api/loyalty/config|me`, `POST /api/loyalty/redeem`.
- **Thèmes saisonniers** : palette `mint` convertie en variables CSS ; classes `.theme-{spring|summer|autumn|winter}` (Printemps=vert, Été=turquoise, Automne=orange, Hiver=bleu). `theme_mode` (auto = selon le mois / manual) + `theme_manual` réglés dans Paramètres. Appliqué sur `<html>` via `SettingsContext`.
- **Chat client en direct (interne)** : widget flottant `ChatWidget` (bas-droite), démarrage conversation (nom/email ou auto si connecté), messages stockés (`chat_conversations` + `chat_messages`), polling 4s. Admin onglet **Chat** (liste conversations + réponse, badge non-lus). Notification in-app admin à chaque message client. Endpoints `/api/chat/start|{id}/messages|{id}/message` + `/api/admin/chat/*`.
- Tests : iterations 11-14 → backend 100%, frontend 100% des flux.

## Implemented (2026-06-22 — iteration 15)
- **Email admin sur nouveau chat** : `send_chat_email` envoyé au **premier message** d'une conversation, vers l'email du compte admin (pharma360benak@gmail.com). Limité au tier gratuit Resend (owner uniquement).
- **Parrainage fidélité** : chaque compte a un `referral_code` (`P360-XXXXXX`, généré à l'inscription, lazy pour anciens comptes). Champ « Code de parrainage » optionnel à l'inscription. Crédit **immédiat à l'inscription** du filleul : parrain +`referral_referrer_points` (200), filleul +`referral_referee_points` (100). Section « Parrainez vos amis » sur `/fidelite` (code + copier + nb filleuls). Config admin (onglet Fidélité : activer, points parrain/filleul). Code invalide → inscription OK sans crédit. Endpoint `loyalty_me` renvoie l'objet `referral`.
- Tests : backend E2E (curl) 100%, frontend iteration 15 → 5/5 flux parrainage.

## Implemented (2026-06-22 — iteration 16)
- **Idées cadeaux (admin)** : page `/idees-cadeaux`. Settings `gift_intro` + `gift_featured_ids` (produits mis en avant). Collection `gift_packs` (coffrets : nom, description, image, produits inclus, prix unique, enabled) avec CRUD admin. Ajout d'un pack au panier = **1 seule ligne** au prix du pack (objet synthétique via addItem, id = ObjectId du pack). Endpoints `GET /api/gift-ideas`, `GET/POST/PUT/DELETE /api/admin/gift-packs`. Onglet admin **Cadeaux**.
- **Carte cadeau physique** : page `/carte-cadeau`. Settings `giftcard_enabled`, `giftcard_amounts`, `giftcard_design` (image), `giftcard_terms`. Bouton « Commander » → ajoute la carte au panier (`giftcard-<montant>`, prix = montant) puis checkout normal (COD/BaridiMob). Config dans l'onglet admin **Cadeaux**.
- Liens footer migrés : Idées cadeaux → `/idees-cadeaux`, Carte cadeau → `/carte-cadeau`.
- Tests : backend 5/5, frontend iteration 16 → 100% des flux.

## Resend — envoi d'emails vers n'importe quelle adresse (à faire par le client)
- Limitation actuelle : `onboarding@resend.dev` n'envoie qu'à l'adresse propriétaire du compte Resend.
- Solution : vérifier un domaine (ex. `pharma360benak.com`) dans Resend (Domains → Add Domain), ajouter les enregistrements DNS fournis (SPF `TXT`, DKIM `CNAME`/`TXT`, optionnel DMARC) chez le registrar, attendre la vérification, puis dans l'admin **Paramètres → Email expéditeur (Resend)** mettre `noreply@pharma360benak.com` (champ `sender_email`, utilisé par reset password, notif commande et notif chat).

## Known Limitations / MOCKED
- Paiement en ligne par carte (CIB/Edahabia) = **SIMULÉ (démo)**. Stripe ne supporte pas l'Algérie (DZ), donc pas de passerelle réelle. La commande carte est marquée "payée" sans transaction réelle.
- Email de notification de commande / reset password = **limité au tier gratuit Resend** (`onboarding@resend.dev` n'envoie qu'à l'adresse du propriétaire du compte). Le reset password propose le lien à l'écran en secours. Notification de nouveau message chat = in-app uniquement (pas d'email).

## Implemented (2026-06 — iteration 20)
- **CA = commandes livrées uniquement** : `GET /api/admin/stats` `revenue` ne somme que les commandes `status="Livrée"` (choix client). Libellé dashboard « Chiffre d'affaires (livré) ».
- **Suppression de commande** : `DELETE /api/orders/{id}` (admin) supprime la commande + les gift_cards liées. Bouton rouge « Supprimer » (confirm) dans l'onglet Commandes → retire la commande du CA et des stats.
- **Statistiques de vente** : `GET /api/admin/analytics?period=day|week|month|all` → revenue, orders, aov, total_customers, new_customers, top_products (nom/qté/CA), top_customers (nom/tél/cmd/dépensé), basé sur les commandes livrées. Nouvel onglet admin **Statistiques** avec sélecteur de période + 2 tableaux.
- **Réponses rapides du chat** : `settings.chat_quick_replies` (éditable dans Paramètres). Boutons cliquables au-dessus de l'input du chat admin → envoi en un clic.
- **Application mobile (footer)** : `settings.app_download_enabled` + `app_store_url` + `play_store_url`. Section « Téléchargez notre application Pharma360 » avec boutons App Store / Google Play (masquée par défaut, à activer + renseigner les liens dans l'admin).
- **Badge de statut client** : badge Bronze/Silver/Gold sur l'en-tête du compte client (via `/api/loyalty/me`).
- **Nouveaux thèmes** : rose (Rose poudré), mauve (Mauve pâle), gold (Doré), noir (Noir) ajoutés au sélecteur Apparence en plus des 4 saisons. Classes CSS `theme-rose/mauve/gold/noir`.
- Tests : backend 10/10, frontend 100% sur les 6 flux (iteration_20).

## Implemented (2026-06 — iteration 22 : Sélection de produits en masse)
- **BulkProductSelector** (`/app/frontend/src/components/admin/BulkProductSelector.jsx`) : arbre catégories/sous-catégories (aplati, sans récursion pour éviter un stack-overflow babel/webpack), liste des produits d'une catégorie avec cases à cocher, « Tout sélectionner » (liste courante), décochage individuel, recherche. Chips des produits sélectionnés.
- Appliqué dans **5 zones admin** : Idées cadeaux (`gift-featured`), Coffrets cadeaux (`pack-products`), Cadeaux par statut Bronze/Silver/Gold (`tier-{i}-giftpick`), Offres exclusives (`offer-products-{i}`), et produits complémentaires de la fiche produit (`pf-comp`). Remplace l'ancien `ComplementarySelector` (recherche un-par-un).
- Cadeaux produits stockés en `type:"product"` + `product_id` (nom/image résolus côté backend) ; cadeaux hors-catalogue en `type:"custom"` + nom + image.
- Tests : frontend 100% (6/6 flux — iteration_22). Aucune régression.

## Implemented (2026-06 — iteration 21 : Fidélité avancée + Thèmes 2 couleurs)
- **Bug statut corrigé** : `_loyalty_tier` renvoie `null` si les points sont sous le seuil du plus petit palier. Le statut est calculé en direct → modifier un seuil dans l'admin réévalue TOUS les clients instantanément. Badge « Nouveau membre » (neutre) sous le seuil.
- **Cadeaux par statut** : chaque palier (BRONZE/Silver/Gold) a sa propre liste de cadeaux — produits du catalogue OU cadeaux exclusifs (nom+photo). CRUD dans Admin > Fidélité (`gifts` dans `loyalty_tiers`).
- **Félicitations + choix cadeau** : page Fidélité affiche « Félicitations ! Vous êtes {statut} » avec les cadeaux à choisir. `POST /api/loyalty/claim-gift`.
- **1 cadeau par statut (définitif)** : `user.gift_claims` empêche toute nouvelle réclamation pour un palier déjà réclamé. Génère un code unique `CADEAU-XXXX` (single-use, lié au client).
- **Code cadeau au checkout** : champ « Code cadeau fidélité » (`/commande`) → ajoute le cadeau en ligne gratuite (prix 0) et consomme le code.
- **Offres exclusives par statut** : `settings.loyalty_offers` = [{title, discount_type, discount_value, product_ids, tiers}]. CRUD admin. Le client ne voit que les offres de son statut ; la réduction est appliquée automatiquement au checkout pour les membres éligibles.
- **8 combinaisons de thèmes (2 couleurs)** éditables (nom + accent + fond) dans Admin > Paramètres > Apparence. Palette dérivée de l'accent appliquée partout via variables CSS calculées (`applyPresetVars`). + 4 thèmes saisonniers conservés.
- Tests : backend 100% (curl iteration 21), frontend 100% (7/7 flux — iteration_21).

## Capacité (réponse client)
- Produits : aucune limite pratique (dizaines/centaines de milliers). Clients : illimité en pratique. MongoDB évolue avec le trafic.

## Backlog
- P1: SMS (Twilio) pour le lien de réinitialisation / notifications (nécessite clé API payante).
- P1: Validation de stock avant commande (rejeter si insuffisant).
- P2: Restreindre CORS à l'origine du preview; avis produits/notes.
- P2: Intégration passerelle de paiement algérienne réelle (SATIM/CIB) quand disponible.
- P2: Vérification de domaine Resend pour de vrais emails clients.
