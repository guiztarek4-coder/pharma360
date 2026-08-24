# PRD — L'olivier (Parapharmacie en ligne)

## Problème initial
Créer un nouveau site e-commerce de parapharmacie « L'olivier », réplique fonctionnelle complète de Pharma360 : même structure (header, menu, accueil, footer 5 colonnes), même programme de fidélité (points, statuts Bronze/Silver/Gold, cadeaux, offres exclusives, prix membre sur catalogue), même chat client↔admin en direct avec messages automatiques de bienvenue, même système de favoris, thèmes/couleurs personnalisables par l'admin, back-office complet (produits, stocks, commandes, statistiques, sélection en masse par catégorie), corrections incluses (mot de passe oublié, scroll en haut de page, mise à jour automatique des statuts). Seuls le nom et les coordonnées changent : tél 0770777685 / 0560285199, adresse Google Maps, Instagram @pharmacie_l.olivier_said_hamdi, horaires 7j/7 — 24h/24.

## Architecture
- Backend : FastAPI + MongoDB (motor), JWT Bearer (12h) + cookies, bcrypt, seed idempotent au démarrage
- Frontend : React 19 + Tailwind + shadcn/ui, framer-motion (révélations cinétiques), lenis (scroll fluide), recharts (stats admin)
- Design : olive botanique (#3E4E30 / #C86D51), Cormorant Garamond + Plus Jakarta Sans + JetBrains Mono

## Personas
- Client/visiteur : catalogue, prix membres, favoris, panier, commande (paiement à la livraison), chat
- Membre : points fidélité, statuts, cadeaux, offres exclusives, suivi commandes
- Admin : back-office complet

## Implémenté (24/08/2026)
- Auth JWT complète : inscription, connexion, mot de passe oublié + réinitialisation (lien démo affiché), protection brute-force
- Catalogue : 12 produits seedés, filtres catégories + recherche, prix standard barré + Prix Membre
- Panier + commande (invité ou membre), décrément stock, points 1pt/100 DA crédités automatiquement au statut « Livrée »
- Fidélité : Bronze/Silver/Gold (0/500/1500 pts), cadeaux + offres par statut, progression, mise à jour auto des statuts
- Favoris (« J'aime ») avec compteur header + ajout groupé au panier
- Chat client↔admin : messages en base, 2 messages de bienvenue auto, réponses admin depuis le back-office, FAQ rapide
- Back-office : dashboard (CA, graphiques 7j + catégories, stock faible, dernières commandes), produits (CRUD + sélection en masse par catégorie : stock, remise membre %, vedette, suppression), commandes (changements de statut), chat, configuration fidélité + points clients, thème (4 presets + couleurs custom) & coordonnées éditables
- Footer 5 colonnes avec vraies coordonnées, scroll-to-top, page d'accueil Awwwards (hero révélation ligne par ligne, marquee éditorial, manifeste numéroté 01/02/03, parallaxe)

## Comptes de test
- Admin : admin@lolivier.dz / admin123
- Client : client@lolivier.dz / client123 (705 pts, Silver)

## Backlog
- P1 : notifications admin (nouvelle commande / nouveau message chat), badge non-lus sur le chat
- P1 : upload d'images produits (object storage) au lieu d'URL
- P2 : emails transactionnels (confirmation commande, reset mot de passe réel) via Resend
- P2 : paiement en ligne (Stripe/CIB), frais de livraison par wilaya
- P2 : historique des points (journal des gains)
- P3 : mode sombre complet, avis clients produits
