import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  listenToOrdersByRestaurant,
  normalizeOrderStatus,
  getOrdersByRestaurant,
  getOrdersByRestaurantApi,
  ORDER_STATUS,
} from '../../firebase/services';
import styles from './History.module.css';

function formatMoney(n) {
  const val = Number(n || 0);
  return `₹${val.toFixed(0)}`;
}

function formatDateTime(value) {
  if (!value) return '-';
  // Firestore timestamp
  if (value.seconds) return new Date(value.seconds * 1000).toLocaleString();
  return new Date(value).toLocaleString();
}

function StatusHistory({ statusHistory }) {
  if (!statusHistory || statusHistory.length === 0) {
    return <div className={styles.empty}>No status history</div>;
  }

  return (
    <div className={styles.historyList}>
      {statusHistory
        .slice()
        .reverse()
        .map((h, idx) => (
          <div key={`${h.status}-${idx}`} className={styles.historyItem}>
            <div className={styles.historyStatus}>{h.status}</div>
            <div className={styles.historyTime}>{formatDateTime(h.time)}</div>
          </div>
        ))}
    </div>
  );
}

export default function RestaurantHistory() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');

  useEffect(() => {
    if (!user?.restaurantId) return;
    let mounted = true;
    let unsub = null;

    const loadOrders = async () => {
      try {
        const apiOrders = await getOrdersByRestaurantApi(user.restaurantId);
        if (mounted) {
          setOrders(apiOrders);
          return;
        }
      } catch (apiError) {
        console.warn('[RestaurantHistory] backend orders API failed, falling back to Firestore listener:', apiError?.message || apiError);
      }

      unsub = listenToOrdersByRestaurant(user.restaurantId, (data) => {
        if (mounted) setOrders(data || []);
      });
    };

    loadOrders();

    const intervalId = setInterval(() => {
      getOrdersByRestaurantApi(user.restaurantId)
        .then(apiOrders => { if (mounted) setOrders(apiOrders); })
        .catch(() => { /* ignore polling errors */ });
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
      if (typeof unsub === 'function') unsub();
    };
  }, [user?.restaurantId]);

  const deliveredOrders = useMemo(() => {
    return (orders || [])
      .filter((o) => normalizeOrderStatus(o.status) === ORDER_STATUS.DELIVERED)
      .sort((a, b) => {
        const at = a.placedAt?.seconds ? a.placedAt.seconds * 1000 : new Date(a.placedAt || 0).getTime();
        const bt = b.placedAt?.seconds ? b.placedAt.seconds * 1000 : new Date(b.placedAt || 0).getTime();
        return bt - at;
      });
  }, [orders]);

  const selectedOrder = useMemo(() => {
    return deliveredOrders.find((o) => o.id === selectedOrderId) || null;
  }, [deliveredOrders, selectedOrderId]);

  useEffect(() => {
    // Auto-select latest delivered order
    if (!selectedOrderId && deliveredOrders.length) {
      setSelectedOrderId(deliveredOrders[0].id);
    }
  }, [deliveredOrders, selectedOrderId]);

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>Restaurant Order History</h2>
        <div className={styles.countChip}>{deliveredOrders.length} Delivered</div>
      </div>

      {deliveredOrders.length === 0 ? (
        <div className={styles.emptyBlock}>
          <div className={styles.empty}>No delivered orders found.</div>
        </div>
      ) : (
        <div className={styles.layout}>
          <div className={styles.left}>
            <div className={styles.listHeader}>Delivered Orders</div>
            <div className={styles.orderList}>
              {deliveredOrders.map((o) => {
                const active = o.id === selectedOrderId;
                return (
                  <button
                    key={o.id}
                    className={`${styles.orderRowBtn} ${active ? styles.orderRowActive : ''}`}
                    onClick={() => setSelectedOrderId(o.id)}
                  >
                    <div className={styles.orderRowTop}>
                      <span className={styles.orderId}>#{o.id?.slice(0, 8)?.toUpperCase()}</span>
                      <span className={styles.orderTotal}>{formatMoney(o.total)}</span>
                    </div>
                    <div className={styles.orderRowBottom}>
                      <span className={styles.orderCustomer}>👤 {o.customerName || '-'}</span>
                      <span className={styles.orderTime}>{formatDateTime(o.placedAt)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.right}>
            {!selectedOrder ? (
              <div className={styles.empty}>Select an order</div>
            ) : (
              <div className={styles.details}>
                <div className={styles.detailsTop}>
                  <div>
                    <div className={styles.detailsTitle}>
                      Order #{selectedOrder.id?.slice(0, 8)?.toUpperCase()}
                    </div>
                    <div className={styles.detailsMeta}>
                      {selectedOrder.customerName ? `👤 ${selectedOrder.customerName}` : ''}
                      {selectedOrder.deliveryAddress ? ` • 📍 ${selectedOrder.deliveryAddress}` : ''}
                    </div>
                  </div>
                  <div className={styles.detailsTotal}>{formatMoney(selectedOrder.total)}</div>
                </div>

                <div className={styles.sectionHeader}>Items</div>
                <div className={styles.items}>
                  {(selectedOrder.items || []).map((it) => (
                    <div key={it.id} className={styles.itemRow}>
                      <span className={styles.itemName}>{it.name}</span>
                      <span className={styles.itemQty}>x{it.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className={styles.sectionHeader}>Status History</div>
                <StatusHistory statusHistory={selectedOrder.statusHistory} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

