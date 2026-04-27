import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/router';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useDeliveryLocation } from '../context/LocationContext';
import LocationPicker from '../components/LocationPicker';
import { placeOrder, validatePromo, deductWallet, getRestaurant, getAppConfig } from '../firebase/services';
import styles from './customer/Checkout.module.css';

export default function Checkout() {
  const { cart, subtotal, clearCart, removeItem, addItem } = useCart();
  const { user } = useAuth();
  const { location, setManualLocation } = useDeliveryLocation();
  const router = useRouter();

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState(null);
  const [promoError, setPromoError] = useState('');
  const [useWallet, setUseWallet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [appConfig, setAppConfig] = useState(null);

  useEffect(() => {
    if (location?.address) setDeliveryAddress(location.address);
  }, [location]);

  useEffect(() => {
    getAppConfig().then(setAppConfig).catch(() => setAppConfig(null));
  }, []);

  const platformCommissionPercent = cart.restaurantHasOwnDelivery ? 5 : 15;
  const platformCommission = +(subtotal * platformCommissionPercent / 100).toFixed(0);
  const packagingFee = appConfig?.packagingFee ?? 15;
  const gstPercent = appConfig?.gstPercent ?? 5;
  const gstAmount = +(subtotal * gstPercent / 100).toFixed(0);
  const deliveryFee = promo?.type === 'delivery' ? 0 : (cart.restaurantHasOwnDelivery ? 0 : (appConfig?.defaultDeliveryFee ?? 29));
  const discount = promo
    ? promo.type === 'percent' ? Math.min(+(subtotal * promo.value / 100).toFixed(0), 100)
    : promo.type === 'flat'   ? promo.value : 0
    : 0;
  const afterDiscount = subtotal + platformCommission + packagingFee + gstAmount + deliveryFee - discount;
  const walletDeduction = useWallet ? Math.min(user?.wallet || 0, afterDiscount) : 0;
  const total = Math.max(0, afterDiscount - walletDeduction);

  const applyPromo = async () => {
    setPromoError(''); setPromo(null);
    if (!promoInput.trim()) return;
    try {
      const data = await validatePromo(promoInput, subtotal);
      setPromo(data);
    } catch (e) { setPromoError(e.message); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cart.items.length) return setError('Cart is empty.');
    setLoading(true); setError('');
    try {
      const orderData = {
        restaurantId: cart.restaurantId,
        restaurantName: cart.restaurantName,
        customerId: user.id,
        customerName: user.name,
        deliveryAgentId: cart.restaurantHasOwnDelivery ? null : 'u5',
        deliveryAgentName: cart.restaurantHasOwnDelivery ? 'Restaurant Delivery' : 'Arjun Patel',
        items: cart.items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, image: i.image || '' })),
        subtotal: +subtotal.toFixed(0),
        platformCommission,
        platformCommissionPercent,
        packagingFee,
        gstPercent,
        gstAmount,
        deliveryFee: promo?.type === 'delivery' ? 0 : (cart.restaurantHasOwnDelivery ? 0 : (appConfig?.defaultDeliveryFee ?? 29)),
        discount: +discount.toFixed(0),
        walletUsed: +walletDeduction.toFixed(0),
        total: +total.toFixed(0),
        promoCode: promo?.code || null,
        deliveryAddress,
        deliveryLat: location?.lat || null,
        deliveryLng: location?.lng || null,
      };
      if (useWallet && walletDeduction > 0) await deductWallet(user.id, walletDeduction);
      const order = await placeOrder(orderData);
      clearCart();
      router.push(`/order-confirmation/?id=${order.id}`);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  if (!cart.items.length) return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>🛒</div>
      <p>Your cart is empty</p>
      <button onClick={() => router.push('/')}>Browse Restaurants</button>
    </div>
  );

  return (
    <div className={styles.page}>
      <h2>Checkout</h2>
      <div className={styles.layout}>

        {/* Left: Cart summary */}
        <div className={styles.left}>
          <div className={styles.cartSection}>
            <h3>Order from <span>{cart.restaurantName}</span></h3>
            {cart.items.map(item => (
              <div key={item.id} className={styles.cartItem}>
                <img src={item.image} alt={item.name} />
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={styles.itemPrice}>₹{(item.price * item.quantity).toFixed(0)}</span>
                </div>
                <div className={styles.qtyControls}>
                  <button onClick={() => removeItem(item.id)}>−</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => addItem(item, cart.restaurantId, cart.restaurantName)}>+</button>
                </div>
              </div>
            ))}
          </div>

          {/* Promo Code */}
          <div className={styles.promoSection}>
            <h4>🏷️ Promo Code</h4>
            <div className={styles.promoRow}>
              <input placeholder="Enter promo code" value={promoInput}
                onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromo(null); setPromoError(''); }} />
              <button onClick={applyPromo}>Apply</button>
            </div>
            {promoError && <p className={styles.promoError}>{promoError}</p>}
            {promo && <p className={styles.promoSuccess}>✓ {promo.description}</p>}
            <div className={styles.promoHints}>
              Try: <span onClick={() => setPromoInput('WELCOME50')}>WELCOME50</span>
              <span onClick={() => setPromoInput('FLAT100')}>FLAT100</span>
              <span onClick={() => setPromoInput('FREEDEL')}>FREEDEL</span>
            </div>
          </div>

          {/* Wallet */}
          {user?.wallet > 0 && (
            <div className={styles.walletSection}>
              <label className={styles.walletLabel}>
                <input type="checkbox" checked={useWallet} onChange={e => setUseWallet(e.target.checked)} />
                <span>💰 Use wallet balance <strong>(₹{user.wallet.toFixed(0)} available)</strong></span>
              </label>
              {useWallet && <p className={styles.walletSaving}>Saving ₹{walletDeduction.toFixed(0)} from wallet</p>}
            </div>
          )}

          {/* Bill Summary */}
          <div className={styles.billSection}>
            <h4>Bill Summary</h4>
            <div className={styles.billRow}><span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span></div>
            <div className={styles.billRow}><span>Platform Commission ({platformCommissionPercent}%)</span><span>₹{platformCommission}</span></div>
            <div className={styles.billRow}><span>Packaging Fee</span><span>₹{packagingFee}</span></div>
            <div className={styles.billRow}><span>GST ({gstPercent}%)</span><span>₹{gstAmount}</span></div>
            <div className={styles.billRow}><span>Delivery Fee</span><span>{deliveryFee === 0 ? <s className={styles.free}>₹{appConfig?.defaultDeliveryFee ?? 29}</s> : `₹${deliveryFee}`}</span></div>
            {discount > 0 && <div className={`${styles.billRow} ${styles.discount}`}><span>Discount ({promo?.code})</span><span>-₹{discount.toFixed(0)}</span></div>}
            {walletDeduction > 0 && <div className={`${styles.billRow} ${styles.discount}`}><span>Wallet</span><span>-₹{walletDeduction.toFixed(0)}</span></div>}
            <div className={`${styles.billRow} ${styles.totalRow}`}><span>Total</span><span>₹{total.toFixed(0)}</span></div>
          </div>
        </div>

        {/* Right: Delivery form */}
        <form className={styles.form} onSubmit={handleSubmit}>
          <h3>Delivery Details</h3>
          <div className={styles.customerInfo}>
            <span>{user.avatar}</span>
            <div><strong>{user.name}</strong><p>{user.email}</p></div>
          </div>
          <label>Delivery Address
            <div className={styles.addressRow}>
              <textarea required placeholder="Enter your delivery address" rows={3}
                value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} />
              <button type="button" className={styles.mapBtn} onClick={() => setShowPicker(true)}>
                📍 Pick on Map
              </button>
            </div>
          </label>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.placeBtn} disabled={loading}>
            {loading ? 'Placing Order...' : `Place Order · ₹${total.toFixed(0)}`}
          </button>
        </form>
      </div>

      {showPicker && (
        <LocationPicker initialLocation={location}
          onConfirm={(loc) => { setManualLocation(loc); setDeliveryAddress(loc.address); setShowPicker(false); }}
          onClose={() => setShowPicker(false)} />
      )}
    </div>
  );
}

