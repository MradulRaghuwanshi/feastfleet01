import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { LocationProvider } from './context/LocationContext';

import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import NotificationBanner from './components/NotificationBanner';
import NotificationToast from './components/NotificationToast';
import { useNotifications } from './hooks/useNotifications';

const Login = React.lazy(() => import('./pages/Login'));
const About = React.lazy(() => import('./pages/About'));
const Home = React.lazy(() => import('./pages/customer/Home'));
const RestaurantMenu = React.lazy(() => import('./pages/customer/RestaurantMenu'));
const Checkout = React.lazy(() => import('./pages/customer/Checkout'));
const OrderConfirmation = React.lazy(() => import('./pages/customer/OrderConfirmation'));
const MyOrders = React.lazy(() => import('./pages/customer/MyOrders'));
const Favourites = React.lazy(() => import('./pages/customer/Favourites'));
const Wallet = React.lazy(() => import('./pages/customer/Wallet'));
const FeastCoinsTerms = React.lazy(() => import('./pages/customer/FeastCoinsTerms'));
const RestaurantDashboard = React.lazy(() => import('./pages/restaurant/Dashboard'));
const DeliveryDashboard = React.lazy(() => import('./pages/delivery/Dashboard'));
const AdminDashboard = React.lazy(() => import('./pages/admin/Dashboard'));
const POS = React.lazy(() => import('./pages/restaurant/POS'));
const RestaurantHistory = React.lazy(() => import('./pages/restaurant/History'));
const Contest = React.lazy(() => import('./pages/customer/Contest'));
const PWAInstall = React.lazy(() => import('./components/PWAInstall'));

function PageLoader() {
  return (
    <div style={{ minHeight: '50vh', display: 'grid', placeItems: 'center', color: '#666' }}>
      Loading...
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  componentDidCatch(error) {
    const isChunkLoadError = /Loading chunk \d+ failed|ChunkLoadError/i.test(error?.message || error?.name || '');
    const retryKey = 'ff_chunk_reload_attempted';

    if (isChunkLoadError && sessionStorage.getItem(retryKey) !== '1') {
      sessionStorage.setItem(retryKey, '1');
      window.location.reload();
    }
  }
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
  const { permission, requestPermission, inAppNotif, dismissNotif } = useNotifications(user);
  const [hideNotificationBanner, setHideNotificationBanner] = React.useState(false);
  const canReceiveOrderAlerts = Boolean(user && ['customer', 'restaurant', 'delivery'].includes(user.role));
  const showNotificationBanner = canReceiveOrderAlerts && permission === 'default' && !hideNotificationBanner;
  const notificationLayer = (
    <>
      {showNotificationBanner && (
        <NotificationBanner
          onAllow={requestPermission}
          onDismiss={() => setHideNotificationBanner(true)}
        />
      )}
      <NotificationToast notif={inAppNotif} onDismiss={dismissNotif} />
    </>
  );

  if (!user) return (
    <>
      <Navbar />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/"                       element={<Home />} />
          <Route path="/contest"               element={<Contest />} />
          <Route path="/login"                  element={<Login />} />
          <Route path="/about"                  element={<About />} />
          <Route path="/restaurant/:id"         element={<RestaurantMenu />} />
          <Route path="/checkout"               element={<Checkout />} />
          <Route path="/order-confirmation/:id" element={<OrderConfirmation />} />
          <Route path="/orders"                 element={<Navigate to="/login" />} />
          <Route path="/favourites"             element={<Navigate to="/login" />} />
          <Route path="/wallet"                 element={<Navigate to="/login" />} />
          <Route path="/wallet/terms"           element={<Navigate to="/login" />} />
          <Route path="/admin"                  element={<Navigate to="/login" />} />
          <Route path="*"                       element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
      <BottomNav />
      {notificationLayer}
    </>
  );

  if (user.role === 'admin') return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
      {notificationLayer}
    </>
  );

  if (user.role === 'restaurant') return (
    <>
      <Navbar />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<RestaurantDashboard />} />
          <Route path="/history" element={<RestaurantHistory />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
      {notificationLayer}
    </>
  );

  if (user.role === 'delivery') return (
    <>
      <Navbar />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<DeliveryDashboard />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
      {notificationLayer}
    </>
  );

  return (
    <>
      <Navbar />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/"                       element={<Home />} />
          <Route path="/contest"               element={<Contest />} />
          <Route path="/about"                  element={<About />} />
          <Route path="/restaurant/:id"         element={<RestaurantMenu />} />
          <Route path="/checkout"               element={<Checkout />} />
          <Route path="/order-confirmation/:id" element={<OrderConfirmation />} />
          <Route path="/orders"                 element={<MyOrders />} />
          <Route path="/favourites"             element={<Favourites />} />
          <Route path="/wallet"                 element={<Wallet />} />
          <Route path="/wallet/terms"           element={<FeastCoinsTerms />} />
          <Route path="/admin"                  element={<Navigate to="/" />} />
          <Route path="*"                       element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
      <BottomNav />
      {notificationLayer}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LocationProvider>
          <CartProvider>
            <BrowserRouter basename="/">
              <AppRoutes />
              <Suspense fallback={null}>
                <PWAInstall />
              </Suspense>
            </BrowserRouter>
          </CartProvider>
        </LocationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
