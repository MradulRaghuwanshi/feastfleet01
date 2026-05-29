import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { getOrdersByCustomer } from '../../firebase/services';
import styles from './MyOrders.module.css';

const STATUS_COLOR = {
  'Placed':           { bg: '#dbeafe', color: '#1d4ed8' },
  'Confirmed':        { bg: '#fef3c7', color: '#92400e' },
  'Preparing':        { bg: '#fde68a', color: '#78350f' },
  'Out for Delivery': { bg: '#d1fae5', color: '#065f46' },
  'Delivered':        { bg: '#dcfce7', color: '#166534' },
};

export default function MyOrders() {
  const { user } = useAuth();
  const { addItem, cart } = useCart();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  const fetchOrders = () => {
    getOrdersByCustomer(user.id)
      .then(data => { setOrders(data); setLoading(false); });
  };

  useEffect(() => { fetchOrders(); }, [user.id]);

  const handleReorder = (order) => {
    order.items.forEach(item => addItem(item, order.restaurantId, order.restaurantName));
    navigate('/checkout');
  };

  const FILTERS = ['All', 'Active', 'Delivered'];
  const filtered = orders.filter(o => {
    if (filter === 'Active') return o.status !== 'Delivered';
    if (filter === 'Delivered') return o.status === 'Delivered';
    return true;
  });

  return (
    <div className={styles.page}>
      <h2>My Orders</h2>

      <div className={styles.filters}>
        {FILTERS.map(f => (
          <button key={f} className={`${styles.chip} ${filter === f ? styles.active : ''}`}
            onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      {loading ? <p className={styles.loading}>Loading orders...</p> : filtered.length === 0 ? (
        <div className={styles.empty}>
          <p>No orders here</p>
          <button onClick={() => navigate('/')}>Start Ordering</button>
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map(order => {
            const sc = STATUS_COLOR[order.status] || {};
            return (
              <div key={order.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div>
                    <h3>{order.restaurantName}</h3>
                    <p className={styles.orderId}>#{order.id}</p>
                    <p className={styles.date}>{new Date(order.placedAt).toLocaleString()}</p>
                  </div>
                  <span className={styles.statusBadge} style={{ background: sc.bg, color: sc.color }}>
                    {order.status}
                  </span>
                </div>

                <div className={styles.items}>
                  {order.items.map(i => (
                    <span key={i.id} className={styles.itemChip}>{i.name} ×{i.quantity}</span>
                  ))}
                </div>

                <div className={styles.cardBottom}>
                  <div className={styles.priceInfo}>
                    <span className={styles.total}>₹{order.total.toFixed(0)}</span>
                    {order.promoCode && <span className={styles.promoTag}>🏷️ {order.promoCode}</span>}
                    {order.discount > 0 && <span className={styles.savedTag}>Saved ₹{order.discount.toFixed(0)}</span>}
                    {(order.platformFee > 0 || order.packagingFee > 0) && (
                      <span className={styles.feesTag}>
                        +Fees ₹{(Number(order.platformFee || 0) + Number(order.packagingFee || 0)).toFixed(0)}
                      </span>
                    )}
                  </div>
                  <div className={styles.actions}>
                    <button className={styles.trackBtn}
                      onClick={() => navigate(`/order-confirmation/${order.id}`)}>
                      {order.status === 'Delivered' ? 'View Details' : '📍 Track'}
                    </button>
                    <button className={styles.reorderBtn} onClick={() => handleReorder(order)}>
                      🔄 Reorder
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
