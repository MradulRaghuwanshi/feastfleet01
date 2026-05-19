import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { listenToOrder } from '../../firebase/services';
import styles from './OrderConfirmation.module.css';

const LiveTrackingMap = React.lazy(() => import('../../components/LiveTrackingMap'));

const STATUS_STEPS = ['Order Placed', 'Restaurant Accepted', 'Delivery Partner Assigned', 'On The Way', 'Delivered'];
const LEGACY_STATUS = {
  Placed: 'Order Placed',
  Confirmed: 'Restaurant Accepted',
  Preparing: 'Restaurant Accepted',
  'Out for Delivery': 'On The Way',
  Delivered: 'Delivered',
};

export default function OrderConfirmation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    const unsub = listenToOrder(id, setOrder);
    return unsub;
  }, [id]);

  if (!order) return <p className={styles.loading}>Loading...</p>;

  const status = LEGACY_STATUS[order.status] || order.status;
  const currentStep = Math.max(0, STATUS_STEPS.indexOf(status));
  const isActive = order.status !== 'Delivered';
  const coinsEarned = Number(order.feastCoinsEarned || 0);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>✓</div>
          <div>
            <h2>Your order is placed</h2>
            <p>Order #{order.id}</p>
          </div>
        </div>

        <div className={styles.promiseGrid}>
          <div className={styles.promiseItem}>
            <span className={styles.promiseIcon}>01</span>
            <div>
              <strong>Order confirmed</strong>
              <p>Kitchen has received your order.</p>
            </div>
          </div>
          <div className={styles.promiseItem}>
            <span className={styles.promiseIcon}>₹</span>
            <div>
              <strong>{coinsEarned} FeastCoins added</strong>
              <p>Coins are credited to your account.</p>
            </div>
          </div>
          <div className={styles.promiseItem}>
            <span className={styles.promiseIcon}>30</span>
            <div>
              <strong>Delivery within 30 minutes</strong>
              <p>Track the order live until it arrives.</p>
            </div>
          </div>
        </div>

        <div className={styles.tracker}>
          {STATUS_STEPS.map((step, i) => (
            <div key={step} className={styles.step}>
              <div className={`${styles.dot} ${i <= currentStep ? styles.done : ''} ${i === currentStep ? styles.current : ''}`}>
                {i < currentStep ? '✓' : i + 1}
              </div>
              <span className={`${styles.stepLabel} ${i <= currentStep ? styles.doneLabel : ''}`}>{step}</span>
              {i < STATUS_STEPS.length - 1 && <div className={`${styles.line} ${i < currentStep ? styles.doneLine : ''}`} />}
            </div>
          ))}
        </div>

        <div className={styles.details}>
          <div><span>Restaurant</span><span>{order.restaurantName}</span></div>
          <div><span>Delivery Partner</span><span>{order.deliveryAgentName}</span></div>
          <div><span>Deliver to</span><span>{order.deliveryAddress}</span></div>
          <div className={styles.feeBreakdown}>
            <div><span>Subtotal</span><span>₹{order.subtotal?.toFixed(0)}</span></div>
            {order.platformFee > 0 && <div><span>Platform Fee</span><span>₹{order.platformFee}</span></div>}
            {order.packagingFee > 0 && <div><span>Packaging Fee</span><span>₹{order.packagingFee}</span></div>}
           
            <div><span>Delivery Fee</span><span>₹{order.deliveryFee?.toFixed(0)}</span></div>
            {order.discount > 0 && <div className={styles.discountRow}><span>Discount</span><span>-₹{order.discount?.toFixed(0)}</span></div>}
            {order.feastCoinRedemption > 0 && <div className={styles.discountRow}><span>Feast Coins</span><span>-₹{order.feastCoinRedemption?.toFixed(0)}</span></div>}
            <div className={styles.totalRow}><span>Total</span><span className={styles.totalAmt}>₹{order.total.toFixed(0)}</span></div>
          </div>
        </div>

        <div className={styles.items}>
          {order.items.map(item => (
            <div key={item.id} className={styles.item}>
              <span>{item.name} × {item.quantity}</span>
              <span>₹{(item.price * item.quantity).toFixed(0)}</span>
            </div>
          ))}
        </div>

        <div className={styles.actions}>
          <button onClick={() => navigate('/orders')}>View All Orders</button>
          <button className={styles.homeBtn} onClick={() => navigate('/')}>Back to Home</button>
        </div>
      </div>

      {isActive && (
        <div className={styles.mapSection}>
          <h3>Live Order Tracking</h3>
          <p className={styles.mapSub}>Map updates every 5 seconds</p>
          <Suspense fallback={<div style={{height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888'}}>Loading map...</div>}>
            <LiveTrackingMap orderId={order.id} role="customer" />
          </Suspense>
        </div>
      )}
    </div>
  );
}
