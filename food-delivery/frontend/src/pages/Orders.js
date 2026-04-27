import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Orders.module.css';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/orders')
      .then(r => r.json())
      .then(data => { setOrders(data); setLoading(false); });
  }, []);

  if (loading) return <p className={styles.loading}>Loading orders...</p>;

  return (
    <div className={styles.page}>
      <h2>My Orders</h2>
      {orders.length === 0 ? (
        <div className={styles.empty}>
          <p>No orders yet</p>
          <button onClick={() => navigate('/')}>Start Ordering</button>
        </div>
      ) : (
        <div className={styles.list}>
          {orders.map(order => (
            <div key={order.id} className={styles.card} onClick={() => navigate(`/order-confirmation/${order.id}`)}>
              <div className={styles.top}>
                <div>
                  <h3>{order.restaurantName}</h3>
                  <p>{order.items.length} item{order.items.length > 1 ? 's' : ''} · ₹{order.total.toFixed(0)}</p>
                </div>
                <span className={styles.status}>{order.status}</span>
              </div>
              <div className={styles.meta}>
                <span>📍 {order.deliveryAddress}</span>
                <span>{new Date(order.placedAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
