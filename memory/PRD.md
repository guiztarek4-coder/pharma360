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

## Known Limitations / MOCKED
- Paiement en ligne par carte (CIB/Edahabia) = **SIMULÉ (démo)**. Stripe ne supporte pas l'Algérie (DZ), donc pas de passerelle réelle. La commande carte est marquée "payée" sans transaction réelle.
- Email de notification de commande / reset password = **limité au tier gratuit Resend** (`onboarding@resend.dev` n'envoie qu'à l'adresse du propriétaire du compte). Le reset password propose le lien à l'écran en secours. Notification de nouveau message chat = in-app uniquement (pas d'email).

## Backlog
- P1: SMS (Twilio) pour le lien de réinitialisation / notifications (nécessite clé API payante).
- P1: Validation de stock avant commande (rejeter si insuffisant).
- P2: Restreindre CORS à l'origine du preview; avis produits/notes.
- P2: Intégration passerelle de paiement algérienne réelle (SATIM/CIB) quand disponible.
- P2: Vérification de domaine Resend pour de vrais emails clients.
