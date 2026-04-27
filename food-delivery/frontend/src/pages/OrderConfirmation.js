import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './OrderConfirmation.module.css';

export default function OrderConfirmation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then(r => r.json())
      .then(setOrder);
  }, [id]);

  if (!order) return <p className={styles.loading}>Loading...</p>;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>✅</div>
        <h2>Order Confirmed!</h2>
        <p className={styles.sub}>Your order has been placed successfully.</p>

        <div className={styles.details}>
          <div><span>Order ID</span><span>#{order.id.slice(0, 8).toUpperCase()}</span></div>
          <div><span>Restaurant</span><span>{order.restaurantName}</span></div>
          <div><span>Customer</span><span>{order.customerName}</span></div>
          <div><span>Deliver to</span><span>{order.deliveryAddress}</span></div>
          <div><span>Status</span><span className={styles.status}>{order.status}</span></div>
          {order.deliveryOtp && order.status === 'Out for Delivery' && (
            <div className={styles.otpBox}><span>🔐 Delivery OTP: <strong>{order.deliveryOtp}</strong></span><small>Share with delivery partner</small></div>
          )}
          <div><span>Total</span><span className={styles.total}>₹{order.total.toFixed(0)}</span></div>
        </div>

        <div className={styles.items}>
          <h4>Items Ordered</h4>
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
    </div>
  );
}
