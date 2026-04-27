import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listenToOrdersByAgent, updateOrderStatus } from '../../firebase/services';
import styles from './Dashboard.module.css';

const LiveTrackingMap = React.lazy(() => import('../../components/LiveTrackingMap'));

const STATUS_FLOW  = ['Placed', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'];
const STATUS_COLOR = {
  'Placed':           { bg: '#dbeafe', color: '#1d4ed8' },
  'Confirmed':        { bg: '#fef3c7', color: '#92400e' },
  'Preparing':        { bg: '#ede9fe', color: '#5b21b6' },
  'Out for Delivery': { bg: '#ffedd5', color: '#c2410c' },
  'Delivered':        { bg: '#d1fae5', color: '#065f46' },
};

export default function DeliveryDashboard() {
  const { user } = useAuth();
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('active');
  const [updating, setUpdating] = useState(null);
  const [trackingOrderId, setTrackingOrderId] = useState(null);

  const fetchOrders = useCallback(() => {}, []);

  useEffect(() => {
    const unsub = listenToOrdersByAgent(user.id, data => {
      setOrders(data); setLoading(false);
    });
    return unsub;
  }, [user.id]);

  const updateStatus = async (orderId, nextStatus) => {
    setUpdating(orderId);
    await updateOrderStatus(orderId, nextStatus);
    setUpdating(null);
  };

  const verifyOtp = async (orderId, otp) => {
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/verify-otp`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp })
      });
      if (res.ok) {
        // Status will update via realtime listener
        console.log('OTP verified, order delivered');
      } else {
        alert('Invalid OTP');
      }
    } catch (error) {
      alert('Verification failed');
    }
    setUpdating(null);
  };

  const activeOrders    = orders.filter(o => o.status !== 'Delivered');
  const deliveredOrders = orders.filter(o => o.status === 'Delivered');
  const displayOrders   = tab === 'active' ? activeOrders : deliveredOrders;
  const earnings        = deliveredOrders.length * 40; // ₹40 per delivery

  if (loading) return <p className={styles.loading}>Loading your deliveries...</p>;

  return (
    <div className={styles.page}>
      {/* Agent header */}
      <div className={styles.header}>
        <div className={styles.agentInfo}>
          <span className={styles.agentAvatar}>{user.avatar}</span>
          <div>
            <h1>{user.name}</h1>
            <p>{user.vehicle} · {user.phone}</p>
          </div>
        </div>
        <div className={`${styles.statusPill} ${activeOrders.length > 0 ? styles.busy : styles.free}`}>
          {activeOrders.length > 0 ? `🔴 On Delivery (${activeOrders.length})` : '🟢 Available'}
        </div>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}><span className={styles.statVal}>{activeOrders.length}</span><span className={styles.statLabel}>Active</span></div>
        <div className={styles.stat}><span className={styles.statVal}>{deliveredOrders.length}</span><span className={styles.statLabel}>Delivered</span></div>
        <div className={styles.stat}><span className={styles.statVal}>₹{earnings}</span><span className={styles.statLabel}>Earnings</span></div>
        <div className={styles.stat}><span className={styles.statVal}>{orders.length > 0 ? '4.8 ⭐' : '—'}</span><span className={styles.statLabel}>Rating</span></div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'active' ? styles.activeTab : ''}`} onClick={() => setTab('active')}>
          Active {activeOrders.length > 0 && <span className={styles.tabBadge}>{activeOrders.length}</span>}
        </button>
        <button className={`${styles.tab} ${tab === 'history' ? styles.activeTab : ''}`} onClick={() => setTab('history')}>
          History ({deliveredOrders.length})
        </button>
      </div>

      {displayOrders.length === 0 ? (
        <div className={styles.empty}>
          <p>{tab === 'active' ? '✅ No active deliveries right now' : '📦 No deliveries yet'}</p>
        </div>
      ) : (
        <div className={styles.orderList}>
          {displayOrders.map(order => {
            const sc = STATUS_COLOR[order.status] || {};
            const currentIdx = STATUS_FLOW.indexOf(order.status);
            const nextStatus = STATUS_FLOW[currentIdx + 1];
            const canAdvance = order.status === 'Out for Delivery';

            return (
              <div key={order.id} className={styles.orderCard}>
                <div className={styles.orderTop}>
                  <div>
                    <span className={styles.orderId}>#{order.id}</span>
                    <span className={styles.statusBadge} style={{ background: sc.bg, color: sc.color }}>
                      {order.status}
                    </span>
                  </div>
                  <span className={styles.orderTime}>{new Date(order.placedAt).toLocaleTimeString()}</span>
                </div>

                <div className={styles.route}>
                  <div className={styles.routePoint}>
                    <span className={styles.routeDot} style={{ background: '#ff6b35' }} />
                    <div>
                      <p className={styles.routeLabel}>Pickup</p>
                      <p className={styles.routeAddr}>{order.restaurantName}</p>
                    </div>
                  </div>
                  <div className={styles.routeLine} />
                  <div className={styles.routePoint}>
                    <span className={styles.routeDot} style={{ background: '#10b981' }} />
                    <div>
                      <p className={styles.routeLabel}>Deliver to</p>
                      <p className={styles.routeAddr}>{order.deliveryAddress}</p>
                    </div>
                  </div>
                </div>

                <div className={styles.itemsSummary}>
                  {order.items.map(i => (
                    <span key={i.id} className={styles.itemChip}>{i.name} ×{i.quantity}</span>
                  ))}
                </div>

                <div className={styles.orderFooter}>
                  <div className={styles.customerChip}>👤 {order.customerName}</div>
                  <span className={styles.orderTotal}>₹{order.total.toFixed(0)}</span>
                </div>

                <div className={styles.progressBar}>
                  {STATUS_FLOW.map((s, i) => (
                    <div key={s} className={`${styles.progressStep} ${i <= currentIdx ? styles.progressDone : ''}`} />
                  ))}
                </div>

                {/* Map button — always visible for active orders */}
                {order.status !== 'Delivered' && (
                  <button className={styles.mapBtn} onClick={() => setTrackingOrderId(order.id)}>
                    �️ View Route Map
                  </button>
                )}

                {order.status === 'Out for Delivery' && (
                  <div className={styles.otpSection}>
                    <label>Customer OTP 🔐</label>
                    <input 
                      type="number" 
                      placeholder="1234"
                      maxLength={4}
                      className={styles.otpInput}
                      onKeyPress={(e) => e.key === 'Enter' && verifyOtp(order.id, e.target.value)}
                    />
                    <button 
                      className={styles.verifyBtn}
                      onClick={(e) => {
                        const input = e.currentTarget.parentElement.querySelector('input');
                        verifyOtp(order.id, input.value);
                      }}
                      disabled={updating === order.id}
                    >
                      {updating === order.id ? 'Verifying...' : '✅ Verify & Deliver'}
                    </button>
                  </div>
                )}
                {order.status === 'Preparing' && (
                  <div className={styles.waitingChip}>⏳ Waiting for restaurant to prepare...</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Live Tracking Modal for delivery agent */}
      {trackingOrderId && (
        <div className={styles.trackingOverlay}>
          <div className={styles.trackingModal}>
            <div className={styles.trackingHeader}>
              <h3>🗺️ Route Map — #{trackingOrderId}</h3>
              <button onClick={() => setTrackingOrderId(null)}>✕</button>
            </div>
            <div className={styles.trackingNote}>
              📡 Your live GPS location is being shared with the customer and restaurant
            </div>
            <Suspense fallback={<div style={{height:300,display:'flex',alignItems:'center',justifyContent:'center',color:'#888'}}>Loading map...</div>}>
              <LiveTrackingMap
                orderId={trackingOrderId}
                role="delivery"
                agentId={user.id}
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}
