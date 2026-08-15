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

## Known Limitations / MOCKED
- Paiement en ligne par carte (CIB/Edahabia) = **SIMULÉ (démo)**. Stripe ne supporte pas l'Algérie (DZ), donc pas de passerelle réelle. La commande carte est marquée "payée" sans transaction réelle.

## Backlog
- P1: Validation de stock avant commande (rejeter si insuffisant); frais de livraison par wilaya.
- P2: Restreindre CORS à l'origine du preview; avis produits/notes; codes promo.
- P2: Intégration passerelle de paiement algérienne réelle (SATIM/CIB) quand disponible.
