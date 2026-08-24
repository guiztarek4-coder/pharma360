import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Lenis from "lenis";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { SiteProvider } from "@/context/SiteContext";
import ScrollToTop from "@/components/ScrollToTop";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ChatWidget from "@/components/ChatWidget";
import Home from "@/pages/Home";
import Catalog from "@/pages/Catalog";
import ProductDetail from "@/pages/ProductDetail";
import Cart from "@/pages/Cart";
import Favorites from "@/pages/Favorites";
import Account from "@/pages/Account";
import Loyalty from "@/pages/Loyalty";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import Admin from "@/pages/admin/Admin";

export default function App() {
  useEffect(() => {
    const lenis = new Lenis({ autoRaf: true, lerp: 0.09 });
    return () => lenis.destroy();
  }, []);

  return (
    <div className="App">
      <SiteProvider>
        <AuthProvider>
          <CartProvider>
            <BrowserRouter>
              <ScrollToTop />
              <Header />
              <main>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/catalogue" element={<Catalog />} />
                  <Route path="/produit/:id" element={<ProductDetail />} />
                  <Route path="/panier" element={<Cart />} />
                  <Route path="/favoris" element={<Favorites />} />
                  <Route path="/fidelite" element={<Loyalty />} />
                  <Route path="/compte" element={<Account />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reinitialiser" element={<ResetPassword />} />
                  <Route path="/admin" element={<Admin />} />
                </Routes>
              </main>
              <Footer />
              <ChatWidget />
              <Toaster position="top-center" richColors />
            </BrowserRouter>
          </CartProvider>
        </AuthProvider>
      </SiteProvider>
    </div>
  );
}
