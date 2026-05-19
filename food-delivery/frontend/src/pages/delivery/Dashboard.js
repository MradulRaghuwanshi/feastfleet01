import React, { useEffect, useState, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  acceptBroadcastOrder,
  acceptBroadcastOrderApi,
  getDeliveryWorkQueueApi,
  getVisiblePickupOtp,
  listenToDeliveryWorkQueue,
  normalizeOrderStatus,
  ORDER_STATUS,
  PLATFORM_FEES,
  updateOrderStatus,
  updateOrderStatusApi,
  verifyPickupOtp,
  verifyPickupOtpApi,
} from '../../firebase/services';
import styles from './Dashboard.module.css';

const LiveTrackingMap = React.lazy(() => import('../../components/LiveTrackingMap'));

const STATUS_FLOW  = [ORDER_STATUS.PLACED, ORDER_STATUS.RESTAURANT_ACCEPTED, ORDER_STATUS.DELIVERY_ASSIGNED, ORDER_STATUS.ON_THE_WAY, ORDER_STATUS.DELIVERED];
const STATUS_COLOR = {
  [ORDER_STATUS.PLACED]:              { bg: '#dbeafe', color: '#1d4ed8' },
  [ORDER_STATUS.RESTAURANT_ACCEPTED]: { bg: '#fef3c7', color: '#92400e' },
  [ORDER_STATUS.DELIVERY_ASSIGNED]:   { bg: '#ede9fe', color: '#5b21b6' },
  [ORDER_STATUS.ON_THE_WAY]:          { bg: '#ffedd5', color: '#c2410c' },
  [ORDER_STATUS.DELIVERED]:           { bg: '#d1fae5', color: '#065f46' },
};

const dateOf = (value) => value?.seconds ? new Date(value.seconds * 1000) : new Date(value);
const isSameDay = (a, b) => a.toDateString() === b.toDateString();
const isThisWeek = (date) => Date.now() - date.getTime() <= 7 * 24 * 60 * 60 * 1000;
const isThisMonth = (date) => {
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
};

function PickupOtp({ order, user }) {
  const [otp, setOtp] = useState('');

  useEffect(() => {
    let alive = true;
    getVisiblePickupOtp(order, user)
      .then(value => { if (alive) setOtp(value); })
      .catch(() => { if (alive) setOtp(''); });
    return () => { alive = false; };
  }, [order, user]);

  if (!otp) return null;
  return (
    <div className={styles.pickupOtpBox}>
      <span>Pickup OTP</span>
      <strong>{otp}</strong>
    </div>
  );
}

export default function DeliveryDashboard() {
  const { user } = useAuth();
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('active');
  const [updating, setUpdating] = useState(null);
  const [trackingOrderId, setTrackingOrderId] = useState(null);

  useEffect(() => {
    let mounted = true;
    let unsub = null;

    const loadQueue = async () => {
      try {
        const queue = await getDeliveryWorkQueueApi(user.id);
        if (mounted) {
          setOrders(queue);
          setLoading(false);
          return;
        }
      } catch (apiError) {
        console.warn('[DeliveryDashboard] backend queue API failed, falling back to Firestore listener:', apiError?.message || apiError);
      }

      unsub = listenToDeliveryWorkQueue(user.id, data => {
        if (!mounted) return;
        setOrders(data || []);
        setLoading(false);
      });
    };

    loadQueue();

    const intervalId = setInterval(() => {
      getDeliveryWorkQueueApi(user.id)
        .then(queue => { if (mounted) setOrders(queue); })
        .catch(() => { /* ignore polling errors */ });
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
      if (typeof unsub === 'function') unsub();
    };
  }, [user.id]);

  const acceptOrder = async (orderId) => {
    setUpdating(orderId);
    try {
      try {
        await acceptBroadcastOrderApi(orderId, user);
      } catch {
        await acceptBroadcastOrder(orderId, user);
      }
      setOrders(await getDeliveryWorkQueueApi(user.id));
    } catch (error) {
      alert(error.message || 'Order was already accepted');
    } finally {
      setUpdating(null);
    }
  };

  const markDelivered = async (orderId) => {
    setUpdating(orderId);
    try {
      try {
        await updateOrderStatusApi(orderId, ORDER_STATUS.DELIVERED);
      } catch {
        await updateOrderStatus(orderId, ORDER_STATUS.DELIVERED, user.id);
      }
      setOrders(await getDeliveryWorkQueueApi(user.id));
    } catch (error) {
      alert(error.message || 'Could not mark delivered');
    } finally {
      setUpdating(null);
    }
  };

  const verifyOtp = async (orderId, otp) => {
    setUpdating(orderId);
    try {
      try {
        await verifyPickupOtpApi(orderId, otp, user.id);
      } catch {
        await verifyPickupOtp(orderId, otp, user.id);
      }
      setOrders(await getDeliveryWorkQueueApi(user.id));
    } catch (error) {
      alert(error.message || 'Pickup verification failed');
    } finally {
      setUpdating(null);
    }
  };

  const requestOrders = orders.filter(o => !o.deliveryAgentId && normalizeOrderStatus(o.status) !== ORDER_STATUS.DELIVERED);
  const activeOrders = orders.filter(o => o.deliveryAgentId === user.id && normalizeOrderStatus(o.status) !== ORDER_STATUS.DELIVERED);
  const deliveredOrders = orders.filter(o => o.deliveryAgentId === user.id && normalizeOrderStatus(o.status) === ORDER_STATUS.DELIVERED);
  const displayOrders = tab === 'requests' ? requestOrders : tab === 'active' ? activeOrders : deliveredOrders;
  const earnings = deliveredOrders.length * PLATFORM_FEES.deliveryEarning;
  const today = new Date();
  const dailyEarnings = deliveredOrders.filter(o => isSameDay(dateOf(o.deliveredAt || o.placedAt), today)).length * PLATFORM_FEES.deliveryEarning;
  const weeklyEarnings = deliveredOrders.filter(o => isThisWeek(dateOf(o.deliveredAt || o.placedAt))).length * PLATFORM_FEES.deliveryEarning;
  const monthlyEarnings = deliveredOrders.filter(o => isThisMonth(dateOf(o.deliveredAt || o.placedAt))).length * PLATFORM_FEES.deliveryEarning;

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
          {activeOrders.length > 0 ? `On Delivery (${activeOrders.length})` : 'Available'}
        </div>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}><span className={styles.statVal}>{requestOrders.length}</span><span className={styles.statLabel}>Requests</span></div>
        <div className={styles.stat}><span className={styles.statVal}>{activeOrders.length}</span><span className={styles.statLabel}>Active</span></div>
        <div className={styles.stat}><span className={styles.statVal}>{deliveredOrders.length}</span><span className={styles.statLabel}>Completed</span></div>
        <div className={styles.stat}><span className={styles.statVal}>₹{earnings}</span><span className={styles.statLabel}>Total Earnings</span></div>
      </div>

      <div className={styles.earningsStrip}>
        <span>Today ₹{dailyEarnings}</span>
        <span>Week ₹{weeklyEarnings}</span>
        <span>Month ₹{monthlyEarnings}</span>
        <span>Pending settlement ₹{earnings}</span>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'requests' ? styles.activeTab : ''}`} onClick={() => setTab('requests')}>
          Requests {requestOrders.length > 0 && <span className={styles.tabBadge}>{requestOrders.length}</span>}
        </button>
        <button className={`${styles.tab} ${tab === 'active' ? styles.activeTab : ''}`} onClick={() => setTab('active')}>
          Active {activeOrders.length > 0 && <span className={styles.tabBadge}>{activeOrders.length}</span>}
        </button>
        <button className={`${styles.tab} ${tab === 'history' ? styles.activeTab : ''}`} onClick={() => setTab('history')}>
          History ({deliveredOrders.length})
        </button>
      </div>

      {displayOrders.length === 0 ? (
        <div className={styles.empty}>
          <p>{tab === 'requests' ? 'No broadcast requests right now' : tab === 'active' ? 'No active deliveries right now' : 'No completed deliveries yet'}</p>
        </div>
      ) : (
        <div className={styles.orderList}>
          {displayOrders.map(order => {
            const status = normalizeOrderStatus(order.status);
            const sc = STATUS_COLOR[status] || {};
            const currentIdx = Math.max(0, STATUS_FLOW.indexOf(status));
            const isRequest = !order.deliveryAgentId;
            const canVerifyPickup = order.deliveryAgentId === user.id && !order.pickupOtpVerified && status !== ORDER_STATUS.ON_THE_WAY && status !== ORDER_STATUS.DELIVERED;
            const canDeliver = order.deliveryAgentId === user.id && status === ORDER_STATUS.ON_THE_WAY;
            const placedAt = dateOf(order.placedAt);

            return (
              <div key={order.id} className={styles.orderCard}>
                <div className={styles.orderTop}>
                  <div>
                    <span className={styles.orderId}>#{order.id}</span>
                    <span className={styles.statusBadge} style={{ background: sc.bg, color: sc.color }}>
                      {status}
                    </span>
                  </div>
                  <span className={styles.orderTime}>{placedAt.toLocaleTimeString()}</span>
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
                  <div className={styles.customerChip}>
                    👤 {order.customerName}
                    {order.customerPhone ? ` · 📞 ${String(order.customerPhone).trim()}` : ''}
                  </div>
                  <span className={styles.orderTotal}>₹{order.total.toFixed(0)}</span>
                </div>

                <div className={styles.progressBar}>
                  {STATUS_FLOW.map((s, i) => (
                    <div key={s} className={`${styles.progressStep} ${i <= currentIdx ? styles.progressDone : ''}`} />
                  ))}
                </div>

                {isRequest && (
                  <button
                    className={styles.acceptBtn}
                    onClick={() => acceptOrder(order.id)}
                    disabled={updating === order.id}
                  >
                    {updating === order.id ? 'Accepting...' : 'Accept Order'}
                  </button>
                )}

                {/* Map button — always visible for active orders */}
                {!isRequest && status !== ORDER_STATUS.DELIVERED && (
                  <button className={styles.mapBtn} onClick={() => setTrackingOrderId(order.id)}>
                    View Route Map
                  </button>
                )}

                {canVerifyPickup && (
                  <div className={styles.otpSection}>
                    <PickupOtp order={order} user={user} />
                    <label>Enter Pickup OTP</label>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      placeholder="6-digit OTP"
                      maxLength={6}
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
                      {updating === order.id ? 'Verifying...' : 'Verify Pickup'}
                    </button>
                  </div>
                )}
                {canDeliver && (
                  <button
                    className={styles.deliverBtn}
                    onClick={() => markDelivered(order.id)}
                    disabled={updating === order.id}
                  >
                    {updating === order.id ? 'Updating...' : `Mark Delivered · Earn ₹${PLATFORM_FEES.deliveryEarning}`}
                  </button>
                )}
                {!isRequest && status === ORDER_STATUS.DELIVERY_ASSIGNED && !canVerifyPickup && (
                  <div className={styles.waitingChip}>Waiting for pickup handoff.</div>
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
