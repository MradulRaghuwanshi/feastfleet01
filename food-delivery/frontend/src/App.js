import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { LocationProvider } from './context/LocationContext';

import Login from './pages/Login';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import PWAInstall from './components/PWAInstall';
import Home from './pages/customer/Home';
import RestaurantMenu from './pages/customer/RestaurantMenu';
import Checkout from './pages/customer/Checkout';
import OrderConfirmation from './pages/customer/OrderConfirmation';
import MyOrders from './pages/customer/MyOrders';
import Favourites from './pages/customer/Favourites';
import Wallet from './pages/customer/Wallet';
import RestaurantDashboard from './pages/restaurant/Dashboard';
import DeliveryDashboard from './pages/delivery/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';
import POS from './pages/restaurant/POS';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{padding:32,fontFamily:'monospace',background:'#1a1a2e',color:'#ff6b35',minHeight:'100vh'}}>
          <h2>Runtime Error — {this.state.error.message}</h2>
          <pre style={{color:'#fff',fontSize:12,whiteSpace:'pre-wrap',marginTop:16}}>
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppRoutes() {
  const { user } = useAuth();

  if (!user) return (
    <Routes>
      <Route path="*" element={<Login />} />
    </Routes>
  );

  if (user.role === 'admin') return (
    <Routes>
      <Route path="/" element={<AdminDashboard />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );

  if (user.role === 'restaurant') return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<RestaurantDashboard />} />
        <Route path="/pos" element={<POS />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );

  if (user.role === 'delivery') return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<DeliveryDashboard />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/"                       element={<Home />} />
        <Route path="/restaurant/:id"         element={<RestaurantMenu />} />
        <Route path="/checkout"               element={<Checkout />} />
        <Route path="/order-confirmation/:id" element={<OrderConfirmation />} />
        <Route path="/orders"                 element={<MyOrders />} />
        <Route path="/favourites"             element={<Favourites />} />
        <Route path="/wallet"                 element={<Wallet />} />
        <Route path="*"                       element={<Navigate to="/" />} />
      </Routes>
      <BottomNav />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LocationProvider>
          <CartProvider>
            <BrowserRouter basename={process.env.PUBLIC_URL || '/'}>
              <AppRoutes />
              <PWAInstall />
            </BrowserRouter>
          </CartProvider>
        </LocationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
