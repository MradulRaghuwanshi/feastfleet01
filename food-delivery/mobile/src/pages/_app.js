import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { LocationProvider } from '../context/LocationContext';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import { initCapacitorPlugins, addBackButtonListener, hideSplashScreen } from '../lib/capacitor';
import '../styles/globals.css';

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

function LoadingScreen() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>&#127828;</div>
        <p style={{ color:'#888' }}>Loading FeastFleet...</p>
      </div>
    </div>
  );
}

const ROLE_DEFAULT_PATHS = {
  admin: '/admin/dashboard/',
  restaurant: '/restaurant/dashboard/',
  delivery: '/delivery/dashboard/',
  customer: '/',
};

const ROLE_ALLOWED_PATHS = {
  admin: ['/login/', '/admin/dashboard/'],
  restaurant: ['/login/', '/restaurant/dashboard/', '/restaurant/pos/'],
  delivery: ['/login/', '/delivery/dashboard/'],
  customer: ['/login/', '/', '/restaurant/', '/checkout/', '/order-confirmation/', '/orders/', '/favourites/'],
};

function AppContent({ Component, pageProps }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [navReady, setNavReady] = useState(false);

  // Initialize Capacitor plugins
  useEffect(() => {
    initCapacitorPlugins().then(() => {
      hideSplashScreen();
      setNavReady(true);
    });
  }, []);

  // Handle Android hardware back button
  useEffect(() => {
    if (!navReady) return;
    const remove = addBackButtonListener(({ canGoBack }) => {
      if (!canGoBack) {
        // At root, confirm exit
        if (window.confirm('Exit FeastFleet?')) {
          if (window.Capacitor && window.Capacitor.isNativePlatform) {
            // Use Capacitor App exit
            import('@capacitor/app').then(({ App }) => App.exitApp());
          }
        }
      } else {
        router.back();
      }
    });
    return () => remove();
  }, [navReady, router]);

  // Auth loading
  if (loading) return <LoadingScreen />;

  // Not authenticated
  if (!user) {
    if (router.pathname === '/login/') {
      return <Component {...pageProps} />;
    }
    // Redirect to login, but only on client
    if (typeof window !== 'undefined') {
      router.replace('/login/');
    }
    return <LoadingScreen />;
  }

  // Authenticated - check role-based access
  const role = user.role;
  const allowed = ROLE_ALLOWED_PATHS[role] || [];
  const isAllowed = allowed.some(p => router.pathname === p || router.pathname.startsWith(p));

  if (!isAllowed) {
    const defaultPath = ROLE_DEFAULT_PATHS[role] || '/';
    if (typeof window !== 'undefined') {
      router.replace(defaultPath);
    }
    return <LoadingScreen />;
  }

  const isCustomer = role === 'customer';
  const showNavbar = isCustomer && router.pathname !== '/login/';
  const showBottomNav = isCustomer && router.pathname !== '/login/';

  return (
    <>
      {showNavbar && <Navbar />}
      <main style={{ minHeight: '100vh' }}>
        <Component {...pageProps} />
      </main>
      {showBottomNav && <BottomNav />}
    </>
  );
}

export default function App({ Component, pageProps }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LocationProvider>
          <CartProvider>
            <AppContent Component={Component} pageProps={pageProps} />
          </CartProvider>
        </LocationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

