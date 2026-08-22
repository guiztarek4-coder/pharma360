import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import "@/index.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { CategoriesProvider } from "@/context/CategoriesContext";
import TopBar from "@/components/layout/TopBar";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/layout/CartDrawer";
import ChatWidget from "@/components/ChatWidget";

import Home from "@/pages/Home";
import Catalog from "@/pages/Catalog";
import ProductDetail from "@/pages/ProductDetail";
import Checkout from "@/pages/Checkout";
import OrderSuccess from "@/pages/OrderSuccess";
import Account from "@/pages/Account";
import Brands from "@/pages/Brands";
import BrandPage from "@/pages/BrandPage";
import { Blog, BlogPost } from "@/pages/Blog";
import Contact from "@/pages/Contact";
import { Privacy, Terms } from "@/pages/Legal";
import ResetPassword from "@/pages/ResetPassword";
import VirtualTour from "@/pages/VirtualTour";
import CmsPage from "@/pages/CmsPage";
import Loyalty from "@/pages/Loyalty";
import GiftIdeas from "@/pages/GiftIdeas";
import GiftCard from "@/pages/GiftCard";
import Admin from "@/pages/Admin";

function Shell({ children }) {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");
  if (isAdmin) return <>{children}</>;
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartDrawer />
      <ChatWidget />
    </div>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <FavoritesProvider>
            <SettingsProvider>
            <CategoriesProvider>
              <Shell>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/catalogue" element={<Catalog />} />
                <Route path="/categorie/:categoryId" element={<Catalog />} />
                <Route path="/produit/:id" element={<ProductDetail />} />
                <Route path="/commande" element={<Checkout />} />
                <Route path="/commande/confirmee/:id" element={<OrderSuccess />} />
                <Route path="/compte" element={<Account />} />
                <Route path="/marques" element={<Brands />} />
                <Route path="/marque/:id" element={<BrandPage />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:id" element={<BlogPost />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/confidentialite" element={<Privacy />} />
                <Route path="/cgv" element={<Terms />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/visite-360" element={<VirtualTour />} />
                <Route path="/page/:slug" element={<CmsPage />} />
                <Route path="/fidelite" element={<Loyalty />} />
                <Route path="/idees-cadeaux" element={<GiftIdeas />} />
                <Route path="/carte-cadeau" element={<GiftCard />} />
                <Route path="/admin" element={<Admin />} />
              </Routes>
            </Shell>
            <Toaster position="top-center" richColors />
            </CategoriesProvider>
            </SettingsProvider>
            </FavoritesProvider>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
