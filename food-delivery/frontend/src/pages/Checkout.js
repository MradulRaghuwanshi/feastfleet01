import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useDeliveryLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import styles from './Checkout.module.css';

const LocationPicker = React.lazy(() => import('../components/LocationPicker'));

export default function Checkout() {
  const { cart, subtotal, clearCart, removeItem, addItem } = useCart();
  const { location, setManualLocation } = useDeliveryLocation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ customerName: '', deliveryAddress: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  // Pre-fill user data
  useEffect(() => {
    if (user) {
      setForm(f => ({ ...f, customerName: user.name || '' }));
    }
  }, [user]);

  // Pre-fill address from location context
  useEffect(() => {
    if (location?.address) {
      setForm(f => ({ ...f, deliveryAddress: location.address }));
    }
  }, [location]);

  const deliveryFee = cart.items.length ? (cart.restaurantHasOwnDelivery ? 0 : 2.99) : 0;
  const total = subtotal + deliveryFee;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cart.items.length) return setError('Your cart is empty.');
    setLoading(true);
    setError('');
    try {
      const orderData = {
        restaurantId: cart.restaurantId,
        items: cart.items.map(i => ({ id: i.id, quantity: i.quantity })),
        deliveryAddress: form.deliveryAddress,
        customerName: form.customerName,
        customerId: user?.id || null,
        deliveryLat: location?.lat || null,
        deliveryLng: location?.lng || null,
        useWallet: false // Could add wallet toggle in future
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      clearCart();
      navigate(`/order-confirmation/${data.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!cart.items.length) return (
    <div className={styles.empty}>
      <p>🛒 Your cart is empty</p>
      <button onClick={() => navigate('/')}>Browse Restaurants</button>
    </div>
  );

  return (
    <div className={styles.page}>
      <h2>Checkout</h2>
      <div className={styles.layout}>
        <div className={styles.cartSection}>
          <h3>Order from {cart.restaurantName}</h3>
          {cart.items.map(item => (
            <div key={item.id} className={styles.cartItem}>
              <img src={item.image} alt={item.name} />
              <div className={styles.itemInfo}>
                <span>{item.name}</span>
                <span className={styles.itemPrice}>₹{(item.price * item.quantity).toFixed(0)}</span>
              </div>
              <div className={styles.qtyControls}>
                <button onClick={() => removeItem(item.id)}>−</button>
                <span>{item.quantity}</span>
                <button onClick={() => addItem(item, cart.restaurantId, cart.restaurantName)}>+</button>
              </div>
            </div>
          ))}
          <div className={styles.summary}>
            <div><span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span></div>
            <div><span>Delivery Fee</span><span>₹{deliveryFee.toFixed(0)}</span></div>
            <div className={styles.total}><span>Total</span><span>₹{total.toFixed(0)}</span></div>
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <h3>Delivery Details</h3>
          <label>Your Name
            <input
              type="text" required placeholder="John Doe"
              value={form.customerName}
              onChange={e => setForm({ ...form, customerName: e.target.value })}
            />
          </label>
          <label>Delivery Address
            <div className={styles.addressRow}>
              <textarea
                required placeholder="123 Main St, City, State"
                rows={3}
                value={form.deliveryAddress}
                onChange={e => setForm({ ...form, deliveryAddress: e.target.value })}
              />
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

        {showPicker && (
          <LocationPicker
            initialLocation={location}
            onConfirm={(loc) => {
              setManualLocation(loc);
              setForm(f => ({ ...f, deliveryAddress: loc.address }));
              setShowPicker(false);
            }}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>
    </div>
  );
}
