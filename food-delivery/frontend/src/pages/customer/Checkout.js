import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useDeliveryLocation } from '../../context/LocationContext';
import LocationPicker from '../../components/LocationPicker';
import { placeOrder, validatePromo, listenToWallet, calculateBill, PLATFORM_FEES } from '../../firebase/services';
import styles from './Checkout.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const RAZORPAY_KEY_ID = process.env.REACT_APP_RAZORPAY_KEY_ID;

export default function Checkout() {
  const { cart, subtotal, clearCart, removeItem, addItem } = useCart();
  const { user } = useAuth();
  const { location, setManualLocation } = useDeliveryLocation();
  const navigate = useNavigate();

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState(null);
  const [promoError, setPromoError] = useState('');
  const [useFeastCoins, setUseFeastCoins] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('razorpay'); // 'razorpay' or 'cod'
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    if (location?.address) setDeliveryAddress(location.address);
  }, [location]);

  useEffect(() => {
    if (!user?.id) return undefined;
    return listenToWallet(user.id, setWallet);
  }, [user?.id]);

  const walletBalance = wallet?.isVirtual ? (user?.feastCoins ?? user?.wallet ?? 0) : (wallet?.currentBalance ?? user?.feastCoins ?? user?.wallet ?? 0);
  const bill = calculateBill({
    items: cart.items,
    subtotal,
    promo,
    feastCoinBalance: walletBalance,
    redeemFeastCoins: useFeastCoins,
  });
  const canRedeemCoins = walletBalance >= PLATFORM_FEES.minimumCoinRedemption;
  const expiryDays = wallet?.expiresAt
    ? Math.max(0, Math.ceil((new Date(wallet.expiresAt) - new Date()) / (24 * 60 * 60 * 1000)))
    : null;

  const applyPromo = async () => {
    setPromoError(''); setPromo(null);
    if (!promoInput.trim()) return;
    try {
      const data = await validatePromo(promoInput, subtotal);
      setPromo(data);
    } catch (e) { setPromoError(e.message); }
  };

  // Create order with Razorpay
  const createRazorpayOrder = async (orderData) => {
    try {
      const response = await fetch(`${API_URL}/api/payments/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(bill.finalPayable * 100), // Convert to paise
          currency: 'INR',
          receipt: `order_${Date.now()}`,
          customerName: user.name,
          customerEmail: user.email,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create Razorpay order');
      }

      return await response.json();
    } catch (error) {
      console.error('Razorpay order creation error:', error);
      throw error;
    }
  };

  // Verify Razorpay payment
  const verifyRazorpayPayment = async (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
    try {
      const response = await fetch(`${API_URL}/api/payments/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          razorpay_signature: razorpaySignature,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Payment verification failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Razorpay payment verification error:', error);
      throw error;
    }
  };

  // Handle Razorpay checkout
  const openRazorpayCheckout = (razorpayOrder, orderData) => {
    return new Promise((resolve, reject) => {
      const options = {
        key: RAZORPAY_KEY_ID,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        order_id: razorpayOrder.order_id,
        name: 'FeastFleet',
        description: `Order from ${cart.restaurantName}`,
        prefill: {
          name: user.name,
          email: user.email,
        },
        handler: async (response) => {
          try {
            setPaymentLoading(true);
            
            // Verify payment
            await verifyRazorpayPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );

            // Add payment info to order data
            const finalOrderData = {
              ...orderData,
              paymentMethod: 'razorpay',
              paymentStatus: 'completed',
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
            };

            // Place order in Firebase
            const order = await placeOrder(finalOrderData);
            clearCart();
            resolve(order);
          } catch (error) {
            console.error('Payment verification failed:', error);
            reject(error);
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

      const rzp = new window.Razorpay(options);
      rzp.open();
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cart.items.length) return setError('Cart is empty.');
    
    setLoading(true); 
    setError('');

    try {
      const orderData = {
        restaurantId: cart.restaurantId,
        restaurantName: cart.restaurantName,
        customerId: user.id,
        customerName: user.name,
        deliveryAgentId: cart.restaurantHasOwnDelivery ? null : 'u5',
        deliveryAgentName: cart.restaurantHasOwnDelivery ? 'Restaurant Delivery' : 'Arjun Patel',
        items: cart.items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, image: i.image || '' })),
        subtotal: +bill.subtotal.toFixed(2),
        platformCommission: bill.platformCommission,
        platformCommissionPercent: bill.commissionPercent,
        packagingFee: bill.packagingFee,
        platformFee: bill.platformFee,
        deliveryFee: bill.deliveryFee,
        discount: +bill.discount.toFixed(2),
        walletUsed: 0,
        feastCoinRedemption: bill.feastCoinRedemption,
        feastCoinsEarned: bill.coinsEarned,
        total: +bill.finalPayable.toFixed(2),
        promoCode: promo?.code || null,
        redeemFeastCoins: useFeastCoins,
        deliveryAddress,
        deliveryLat: location?.lat || null,
        deliveryLng: location?.lng || null,
      };

      if (paymentMethod === 'cod') {
        // Cash on Delivery - place order directly
        const finalOrderData = {
          ...orderData,
          paymentMethod: 'cod',
          paymentStatus: 'pending',
        };
        const order = await placeOrder(finalOrderData);
        clearCart();
        navigate(`/order-confirmation/${order.id}`);
      } else {
        // Razorpay checkout
        const razorpayOrder = await createRazorpayOrder(orderData);
        const order = await openRazorpayCheckout(razorpayOrder, orderData);
        navigate(`/order-confirmation/${order.id}`);
      }
    } catch (err) { 
      setError(err.message || 'An error occurred'); 
    }
    finally { 
      setLoading(false); 
    }
  };

  if (!cart.items.length) return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>🛒</div>
      <p>Your cart is empty</p>
      <button onClick={() => navigate('/')}>Browse Restaurants</button>
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
          {walletBalance > 0 && (
            <div className={styles.walletSection}>
              <label className={styles.walletLabel}>
                <input
                  type="checkbox"
                  checked={useFeastCoins}
                  disabled={!canRedeemCoins}
                  onChange={e => setUseFeastCoins(e.target.checked)}
                />
                <span>Use Feast Coins <strong>({walletBalance.toFixed(0)} coins available)</strong></span>
              </label>
              {canRedeemCoins ? (
                <p className={styles.walletSaving}>
                  Redeeming {bill.feastCoinRedemption.toFixed(0)} coins. You will earn {bill.coinsEarned} coins on this order.
                  {expiryDays !== null && ` Expires in ${expiryDays} day${expiryDays === 1 ? '' : 's'}.`}
                </p>
              ) : (
                <p className={styles.walletMuted}>Minimum {PLATFORM_FEES.minimumCoinRedemption} coins required to redeem.</p>
              )}
            </div>
          )}

          {/* Bill Summary */}
          <div className={styles.billSection}>
            <h4>Bill Summary</h4>
            <div className={styles.billRow}><span>Item subtotal</span><span>₹{bill.subtotal.toFixed(0)}</span></div>
            <div className={styles.billRow}><span>Platform Fee</span><span>₹{bill.platformFee}</span></div>
            <div className={styles.billRow}><span>Packaging Fee</span><span>₹{bill.packagingFee}</span></div>
            <div className={styles.billRow}><span>Delivery Fee</span><span>{bill.deliveryFee === 0 ? <span className={styles.free}>Free</span> : `₹${bill.deliveryFee}`}</span></div>
            {bill.discount > 0 && <div className={`${styles.billRow} ${styles.discount}`}><span>Discount ({promo?.code})</span><span>-₹{bill.discount.toFixed(0)}</span></div>}
            {bill.feastCoinRedemption > 0 && <div className={`${styles.billRow} ${styles.discount}`}><span>Feast Coins</span><span>-₹{bill.feastCoinRedemption.toFixed(0)}</span></div>}
            <div className={styles.billRow}><span>Coins earned</span><span>{bill.coinsEarned} coins</span></div>
            <div className={`${styles.billRow} ${styles.totalRow}`}><span>Final payable</span><span>₹{bill.finalPayable.toFixed(0)}</span></div>
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

          {/* Payment Method Selection */}
          <div className={styles.paymentSection}>
            <h4>💳 Payment Method</h4>
            <div className={styles.paymentOptions}>
              <label className={styles.paymentOption}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="razorpay"
                  checked={paymentMethod === 'razorpay'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <span className={styles.paymentLabel}>
                  <strong>Online Payment</strong>
                  <small>Secure payment via Razorpay</small>
                </span>
              </label>
              <label className={styles.paymentOption}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <span className={styles.paymentLabel}>
                  <strong>Cash on Delivery</strong>
                  <small>Pay when order arrives</small>
                </span>
              </label>
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}
          <button 
            type="submit" 
            className={styles.placeBtn} 
            disabled={loading || paymentLoading}
          >
            {loading || paymentLoading ? 'Processing...' : `Place Order · ₹${bill.finalPayable.toFixed(0)}`}
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
