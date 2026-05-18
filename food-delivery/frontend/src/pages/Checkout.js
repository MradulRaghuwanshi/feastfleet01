import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useDeliveryLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { placeOrder } from '../firebase/services';
import { apiUrl } from '../utils/apiConfig';
import styles from './Checkout.module.css';

const LocationPicker = React.lazy(() => import('../components/LocationPicker'));

const RAZORPAY_KEY_ID = process.env.REACT_APP_RAZORPAY_KEY_ID;

const readJson = async (response, fallbackMessage) => {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${fallbackMessage}. Server returned non-JSON response.`);
  }
};

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

  const [paymentMethod, setPaymentMethod] = useState('razorpay'); // 'razorpay' or 'cod'
  const [paymentLoading, setPaymentLoading] = useState(false);

  const loadRazorpayScript = () => {
    return new Promise((resolve, reject) => {
      // If Razorpay is already loaded, resolve immediately
      if (window.Razorpay) return resolve();
      
      const existing = document.querySelector('script[data-razorpay-checkout="true"]');
      if (existing) {
        // Script tag exists, wait for it to load
        if (window.Razorpay) return resolve();
        
        const checkRazorpay = () => {
          if (window.Razorpay) {
            resolve();
          } else {
            setTimeout(checkRazorpay, 50);
          }
        };
        
        existing.addEventListener('load', checkRazorpay, { once: true });
        existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay SDK')), { once: true });
        checkRazorpay(); // Start polling
        return;
      }

      // Create and add new script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.dataset.razorpayCheckout = 'true';
      script.onload = () => {
        // Wait for Razorpay to be available in window
        const waitForRazorpay = () => {
          if (window.Razorpay) {
            resolve();
          } else {
            setTimeout(waitForRazorpay, 50);
          }
        };
        waitForRazorpay();
      };
      script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
      document.body.appendChild(script);
    });
  };

  const createRazorpayOrder = async () => {
    const amountPaise = Math.round(total * 100);
    try {
      const response = await fetch(apiUrl('payments/create-order'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt: `order_${Date.now()}`,
          customerName: user?.name || 'Customer',
          customerEmail: user?.email || 'customer@example.com',
        }),
      });

      if (!response.ok) {
        const err = await readJson(response, 'Failed to create Razorpay order');
        console.error('Create order error response:', response.status, err);
        throw new Error(err.error || `Failed to create order (${response.status}): ${err.message || 'Unknown error'}`);
      }

      const data = await readJson(response, 'Failed to create Razorpay order');
      return data;
    } catch (error) {
      console.error('Razorpay order creation error:', error);
      throw new Error(`Payment setup failed: ${error?.message || 'Unable to reach payment server'}`);
    }
  };

  const verifyRazorpayPayment = async (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
    const response = await fetch(apiUrl('payments/verify-payment'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
      }),
    });

    if (!response.ok) {
      const err = await readJson(response, 'Payment verification failed');
      throw new Error(err.error || 'Payment verification failed');
    }

    return readJson(response, 'Payment verification failed');
  };

  const openRazorpayCheckout = (razorpayOrder, orderData) => {
    return new Promise((resolve, reject) => {
      if (!window.Razorpay) {
        reject(new Error('Razorpay SDK failed to load. Please refresh the page and try again.'));
        return;
      }

      const options = {
        key: razorpayOrder.key_id || RAZORPAY_KEY_ID,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        order_id: razorpayOrder.order_id,
        name: 'FeastFleet',
        description: `Order from ${cart.restaurantName}`,
        prefill: {
          name: user?.name || 'Customer',
          email: user?.email || '',
        },
        handler: async (response) => {
          try {
            setPaymentLoading(true);
            await verifyRazorpayPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );

            const finalOrderData = {
              ...orderData,
              paymentMethod: 'razorpay',
              paymentStatus: 'completed',
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
            };

            const order = await placeOrder(finalOrderData);
            clearCart();
            resolve(order);
          } catch (err) {
            reject(err);
          } finally {
            setPaymentLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            reject(new Error('Payment cancelled by user'));
          },
        },
      };

      try {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (resp) => {
          reject(new Error(`Payment failed: ${resp?.error?.description || 'Unknown error'}`));
        });
        rzp.open();
      } catch (err) {
        reject(new Error(`Failed to open payment gateway: ${err?.message || 'Unknown error'}`));
      }
    });
  };

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

      const data = await placeOrder({
        ...orderData,
        paymentMethod: 'cod',
        paymentStatus: 'pending',
      });
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
              {item.image && <img src={item.image} alt={item.name} />}
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
