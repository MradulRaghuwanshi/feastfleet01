import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useDeliveryLocation } from '../../context/LocationContext';
const LocationPicker = React.lazy(() => import('../../components/LocationPicker'));
import { placeOrder, validatePromo, listenToWallet, calculateBill, PLATFORM_FEES, getRestaurant, updateOrderFields } from '../../firebase/services';
import { apiUrl } from '../../utils/apiConfig';
import OfferBanner from '../../components/OfferBanner';
import PriceDisplay from '../../components/PriceDisplay';
import { OFFERS, applyOffer, getBestOffer, getEligibleOffers, getInflatedPrice } from '../../utils/offerPricing';
import styles from './Checkout.module.css';

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
  const { user } = useAuth();
  const { location, setManualLocation } = useDeliveryLocation();
  const navigate = useNavigate();
  const isGuest = !user?.id;

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
  const [restaurantStatus, setRestaurantStatus] = useState(null);
  const [guestInfo, setGuestInfo] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
  });

  useEffect(() => {
    if (!user) return;
    setGuestInfo({
      name: user.name || '',
      phone: user.phone || '',
      email: user.email || '',
    });
  }, [user]);

  useEffect(() => {
    if (location?.address) setDeliveryAddress(location.address);
  }, [location]);

  useEffect(() => {
    if (!user?.id) return undefined;
    return listenToWallet(user.id, setWallet);
  }, [user?.id]);

  useEffect(() => {
    if (!cart.restaurantId) {
      setRestaurantStatus(null);
      return;
    }
    getRestaurant(cart.restaurantId)
      .then(setRestaurantStatus)
      .catch(() => setRestaurantStatus(null));
  }, [cart.restaurantId]);

  const walletBalance = wallet?.isVirtual ? (user?.feastCoins ?? user?.wallet ?? 0) : (wallet?.currentBalance ?? user?.feastCoins ?? user?.wallet ?? 0);
  const isNewUser = Boolean(isGuest || user?.isNewUser);

  const eligibleOffers = getEligibleOffers(OFFERS, isNewUser);
  const inflatedSubtotal = Math.round(
    cart.items.reduce((sum, item) => {
      const inflatedUnitPrice = getInflatedPrice(item.price, OFFERS, isNewUser);
      return sum + inflatedUnitPrice * Number(item.quantity || 0);
    }, 0)
  );

  const bestOffer = getBestOffer(inflatedSubtotal, OFFERS, isNewUser);
  const offerDiscount = Math.round(applyOffer(bestOffer, inflatedSubtotal));

  const bestLockedOffer = eligibleOffers
    .filter((offer) => inflatedSubtotal < Number(offer.min || 0))
    .sort((a, b) => Number(b.disc || 0) - Number(a.disc || 0))[0] || null;
  const amountToUnlock = bestLockedOffer
    ? Math.max(0, Math.round(Number(bestLockedOffer.min || 0) - inflatedSubtotal))
    : 0;

  const bill = calculateBill({
    items: cart.items,
    subtotal,
    promo,
    feastCoinBalance: walletBalance,
    redeemFeastCoins: useFeastCoins,
  });
  const canRedeemCoins = walletBalance >= PLATFORM_FEES.minimumCoinRedemption;
  const promoDiscount = Math.round(bill.discount || 0);
  const feastCoinDiscount = Math.round(bill.feastCoinRedemption || 0);
  const chargesTotal = Math.round((bill.platformFee || 0) + (bill.packagingFee || 0) + (bill.deliveryFee || 0));
  const finalPayable = Math.max(0, inflatedSubtotal + chargesTotal - offerDiscount - promoDiscount - feastCoinDiscount);
  const subtotalForOrder = inflatedSubtotal;
  const platformCommissionPercent = Math.round(bill.commissionPercent || 15);
  const platformCommission = Math.round((subtotalForOrder * platformCommissionPercent) / 100);
  const netSettlementAmount = Math.max(0, subtotalForOrder - platformCommission);
  const feastCoinsEarned = Math.floor(subtotalForOrder / 100) * 5;

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
  const createRazorpayOrder = async (orderData, customer) => {
    try {
      const response = await fetch(apiUrl('payments/create-order'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(finalPayable * 100), // Convert to paise
          currency: 'INR',
          receipt: `order_${Date.now()}`,
          customerName: customer.name,
          customerEmail: customer.email || 'guest@feastfleet.local',
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

  // Verify Razorpay payment
  const verifyRazorpayPayment = async (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
    try {
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

      return await readJson(response, 'Payment verification failed');
    } catch (error) {
      console.error('Razorpay payment verification error:', error);
      throw error;
    }
  };

  // Handle Razorpay checkout
  const openRazorpayCheckout = (razorpayOrder, orderData, customer, pendingOrder) => {
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
          name: customer.name,
          email: customer.email || '',
          contact: customer.phone || '',
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

            await updateOrderFields(pendingOrder.id, {
              paymentMethod: 'razorpay',
              paymentStatus: 'completed',
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
            });

            clearCart();
            resolve({
              ...pendingOrder,
              paymentMethod: 'razorpay',
              paymentStatus: 'completed',
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
            });
          } catch (error) {
            console.error('Payment processing error:', error);
            const errorMsg = error?.message || 'Payment failed. Please try again or use Cash on Delivery.';
            reject(new Error(errorMsg));
          } finally {
            setPaymentLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            reject(new Error('Payment cancelled. Please try again or use Cash on Delivery.'));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cart.items.length) return setError('Cart is empty.');

    const customer = {
      name: (isGuest ? guestInfo.name : user?.name) || '',
      phone: (isGuest ? guestInfo.phone : user?.phone) || '',
      email: (isGuest ? guestInfo.email : user?.email) || '',
    };

    if (!customer.name.trim()) return setError('Name is required.');
    if (!customer.phone.trim()) return setError('Phone number is required.');
    if (!deliveryAddress.trim()) return setError('Delivery address is required.');

    setLoading(true);
    setError('');
    try {
      if (restaurantStatus && !(restaurantStatus.isAcceptingOrdersNow ?? restaurantStatus.isOpen)) {
        throw new Error(restaurantStatus.orderStatusReason || 'This restaurant is currently closed');
      }

      const guestId = isGuest ? `guest_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` : user.id;
      const orderData = {
        restaurantId: cart.restaurantId,
        restaurantName: cart.restaurantName,
        customerId: guestId,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email || null,
        isGuest,
        deliveryAgentId: cart.restaurantHasOwnDelivery ? null : 'u5',
        deliveryAgentName: cart.restaurantHasOwnDelivery ? 'Restaurant Delivery' : 'Arjun Patel',
        items: cart.items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, image: i.image || '' })),
        subtotal: subtotalForOrder,
        platformCommission,
        platformCommissionPercent,
        netSettlementAmount,
        packagingFee: bill.packagingFee,
        platformFee: bill.platformFee,
        deliveryFee: bill.deliveryFee,
        discount: offerDiscount + promoDiscount,
        walletUsed: 0,
        feastCoinRedemption: feastCoinDiscount,
        feastCoinsEarned,
        total: finalPayable,
        promoCode: promo?.code || null,
        redeemFeastCoins: !isGuest && useFeastCoins,
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
        await loadRazorpayScript();

        const pendingOrder = await placeOrder({
          ...orderData,
          paymentMethod: 'razorpay',
          paymentStatus: 'pending',
        });

        // Razorpay checkout
        const razorpayOrder = await createRazorpayOrder(orderData, customer);
        if (!razorpayOrder?.order_id) {
          throw new Error('Failed to create payment order. Please try again.');
        }
        if (!razorpayOrder.key_id && !RAZORPAY_KEY_ID) {
          throw new Error('Razorpay is not configured. Please contact support or use Cash on Delivery.');
        }

        const order = await openRazorpayCheckout(razorpayOrder, orderData, customer, pendingOrder);
        navigate(`/order-confirmation/${order.id}`);
      }
    } catch (err) {
      setError(err?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };


  if (!cart.items.length) return (
    <div className={styles.empty}>
      <div className={styles.emptyArt}>
        <span />
        <strong>0</strong>
      </div>
      <h2>Your cart is waiting for its first craving.</h2>
      <p>Explore nearby restaurants, unlock fresh offers, and come back to a faster checkout.</p>
      <div className={styles.emptyActions}>
        <button onClick={() => navigate('/')}>Browse Restaurants</button>
        <button className={styles.secondaryBtn} onClick={() => navigate('/')}>View Offers</button>
      </div>
      <div className={styles.emptyHints}>
        <span>Fast delivery lanes</span>
        <span>Reward coins</span>
        <span>Secure checkout</span>
      </div>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.checkoutHero}>
        <span>Almost there</span>
        <h2>Review, save, and send your order.</h2>
        <p>Delivery estimate updates after address confirmation.</p>
      </div>
      <div className={styles.layout}>

        {restaurantStatus && !(restaurantStatus.isAcceptingOrdersNow ?? restaurantStatus.isOpen) && (
          <div className={styles.closedBanner}>
            {restaurantStatus.orderStatusReason || 'This restaurant is not accepting orders right now.'}
          </div>
        )}

        {/* Left: Cart summary */}
        <div className={styles.left}>
          <div className={styles.cartSection}>
            <h3>Order from <span>{cart.restaurantName}</span></h3>
            {cart.items.map(item => (
              <div key={item.id} className={styles.cartItem}>
                {item.image && (
                  <img src={item.image} alt={item.name} loading="lazy" decoding="async" />
                )}
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={styles.itemPrice}>
                    <PriceDisplay originalPrice={item.price} isNewUser={isNewUser} />
                    <small className={styles.qtyMeta}>x {item.quantity}</small>
                  </span>
                </div>
                <div className={styles.qtyControls}>
                  <button onClick={() => removeItem(item.id)}>−</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => addItem(item, cart.restaurantId, cart.restaurantName)}>+</button>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.offerSection}>
            <h4>Offers & savings</h4>
            <OfferBanner offers={eligibleOffers} />
            {bestOffer ? (
              <p className={styles.offerApplied}>{bestOffer.label} applied. You save ₹{offerDiscount}.</p>
            ) : bestLockedOffer ? (
              <p className={styles.offerHint}>Add ₹{amountToUnlock} more to unlock ₹{bestLockedOffer.disc} off.</p>
            ) : null}
          </div>

          {/* Promo Code */}
          <div className={styles.promoSection}>
            <h4>Promo Code</h4>
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
            <div className={styles.billRow}><span>Subtotal</span><span>₹{inflatedSubtotal}</span></div>
            {offerDiscount > 0 && <div className={`${styles.billRow} ${styles.discount}`}><span>Offer discount</span><span>-₹{offerDiscount}</span></div>}
            <div className={styles.billRow}><span>Platform Fee</span><span>₹{bill.platformFee}</span></div>
            <div className={styles.billRow}><span>Packaging Fee</span><span>₹{bill.packagingFee}</span></div>
            <div className={styles.billRow}><span>Delivery Fee</span><span>{bill.deliveryFee === 0 ? <span className={styles.free}>Free</span> : `₹${bill.deliveryFee}`}</span></div>
            {promoDiscount > 0 && <div className={`${styles.billRow} ${styles.discount}`}><span>Discount ({promo?.code})</span><span>-₹{promoDiscount}</span></div>}
            {feastCoinDiscount > 0 && <div className={`${styles.billRow} ${styles.discount}`}><span>Feast Coins</span><span>-₹{feastCoinDiscount}</span></div>}
            <div className={styles.billRow}><span>Coins earned</span><span>{feastCoinsEarned} coins</span></div>
            <div className={`${styles.billRow} ${styles.totalRow}`}><span>Grand total</span><span>₹{finalPayable}</span></div>
          </div>
        </div>

        {/* Right: Delivery form */}
        <form className={styles.form} onSubmit={handleSubmit}>
          <h3>Delivery Details</h3>
          {isGuest ? (
            <>
              <label>Full Name
                <input
                  required
                  type="text"
                  placeholder="Enter your name"
                  value={guestInfo.name}
                  onChange={e => setGuestInfo(prev => ({ ...prev, name: e.target.value }))}
                />
              </label>
              <label>Phone Number
                <input
                  required
                  type="tel"
                  placeholder="Enter mobile number"
                  value={guestInfo.phone}
                  onChange={e => setGuestInfo(prev => ({ ...prev, phone: e.target.value }))}
                />
              </label>
              <label>Email (Optional)
                <input
                  type="email"
                  placeholder="Enter email for payment receipts"
                  value={guestInfo.email}
                  onChange={e => setGuestInfo(prev => ({ ...prev, email: e.target.value }))}
                />
              </label>
            </>
          ) : (
            <div className={styles.customerInfo}>
              <span>{user.avatar}</span>
              <div><strong>{user.name}</strong><p>{user.email}</p></div>
            </div>
          )}
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
            <h4>Payment Method</h4>
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
            {loading || paymentLoading ? 'Processing...' : `Place Order · ₹${finalPayable}`}
          </button>
        </form>
      </div>

      {showPicker && (
        <Suspense fallback={<div className={styles.pickerLoading}>Loading location...</div>}>
          <LocationPicker initialLocation={location}
            onConfirm={(loc) => { setManualLocation(loc); setDeliveryAddress(loc.address); setShowPicker(false); }}
            onClose={() => setShowPicker(false)} />
        </Suspense>
      )}
    </div>
  );
}
