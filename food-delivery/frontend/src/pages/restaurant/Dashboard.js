import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  acceptRestaurantOrder,
  getVisiblePickupOtp,
  listenToOrdersByRestaurant,
  getRestaurant,
  normalizeOrderStatus,
  ORDER_STATUS,
  toggleRestaurantStatus,
  toggleMenuItemAvailability,
  updateRestaurant,
} from '../../firebase/services';
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { fileToDataUrl } from '../../utils/imageFile';
import styles from './Dashboard.module.css';

const ReviewSection = React.lazy(() => import('../../components/ReviewSection'));
const LiveTrackingMap = React.lazy(() => import('../../components/LiveTrackingMap'));

const NEXT_ACTION = {
  [ORDER_STATUS.PLACED]: { label: 'Accept Order', next: ORDER_STATUS.RESTAURANT_ACCEPTED },
};
const STATUS_COLOR = {
  [ORDER_STATUS.PLACED]:              '#dbeafe',
  [ORDER_STATUS.RESTAURANT_ACCEPTED]: '#fef3c7',
  [ORDER_STATUS.DELIVERY_ASSIGNED]:   '#ede9fe',
  [ORDER_STATUS.ON_THE_WAY]:          '#ffedd5',
  [ORDER_STATUS.DELIVERED]:           '#d1fae5',
};

const DAY_OPTIONS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

const getProfileForm = (restaurantData) => ({
  name: restaurantData?.name || '',
  description: restaurantData?.description || '',
  contactPhone: restaurantData?.contactPhone || restaurantData?.phone || '',
  contactEmail: restaurantData?.contactEmail || '',
  address: restaurantData?.address || '',
  activeDays: restaurantData?.activeDays?.length ? restaurantData.activeDays : DAY_OPTIONS.map(d => d.key),
  openingTime: restaurantData?.openingTime || '10:00',
  closingTime: restaurantData?.closingTime || '22:00',
  closedMessage: restaurantData?.closedMessage || '',
  isOpen: restaurantData?.isOpen !== false,
});

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
    <div className={styles.pickupOtp}>
      <span>Pickup OTP</span>
      <strong>{otp}</strong>
    </div>
  );
}

export default function RestaurantDashboard() {
  const { user } = useAuth();
  const [tab, setTab]                         = useState('orders');

  const [orders, setOrders]                   = useState([]);
  const [restaurant, setRestaurant]           = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [trackingOrderId, setTrackingOrderId] = useState(null);

  // Prizes state
  const [visitPrize, setVisitPrize] = useState('');
  const [orderPrize, setOrderPrize] = useState('');
  const [savingPrizes, setSavingPrizes] = useState(false);

  // Profile state
  const [profileForm, setProfileForm] = useState(getProfileForm());
  const [savingProfile, setSavingProfile] = useState(false);

  // POS state
  const [posCart, setPosCart]       = useState([]);
  const [posType, setPosType]       = useState('Dine-in');
  const [posTable, setPosTable]     = useState('');
  const [posCustomer, setPosCustomer] = useState('');
  const [posPhone, setPosPhone]     = useState('');
  const [posCategory, setPosCategory] = useState('All');
  const [billOrder, setBillOrder]   = useState(null);

  // Menu management state
  const [editItem, setEditItem]     = useState(null);
  const [newItem, setNewItem]       = useState({ name: '', description: '', price: '', category: '', image: '' });
  const [showAddItem, setShowAddItem] = useState(false);
  const [savingItem, setSavingItem] = useState(false);

  const fetchRestaurant = useCallback(async () => {
    const r = await getRestaurant(user.restaurantId);
    setRestaurant(r);
    setProfileForm(getProfileForm(r));
    setVisitPrize(r.visitPrize || '');
    setOrderPrize(r.orderPrize || '');
    setLoading(false);
  }, [user.restaurantId]);

  useEffect(() => {
    fetchRestaurant();
    const unsub = listenToOrdersByRestaurant(user.restaurantId, data => setOrders(data));
    return unsub;
  }, [fetchRestaurant, user.restaurantId]);

  // Keep hooks above early returns so the hook order never changes between renders.
  const activeOrders = useMemo(() => orders, [orders]);
  const completedOrders = useMemo(
    () => orders.filter(o => normalizeOrderStatus(o.status) === ORDER_STATUS.DELIVERED),
    [orders]
  );
  const todayRevenue = useMemo(
    () => completedOrders.reduce((s, o) => s + (o.total || 0), 0),
    [completedOrders]
  );
  const categories = restaurant?.menu ? ['All', ...new Set(restaurant.menu.map(i => i.category))] : ['All'];
  const filteredMenu = restaurant?.menu?.filter(i => posCategory === 'All' || i.category === posCategory) || [];

  if (loading) return <div className={styles.loading}>Loading POS...</div>;
  if (!restaurant) return <div className={styles.loading}>Restaurant data unavailable.</div>;

  const advanceStatus = async (orderId, nextStatus) => {
    if (nextStatus === ORDER_STATUS.RESTAURANT_ACCEPTED) {
      await acceptRestaurantOrder(orderId, user.id);
    }
  };

  const toggleRestStatus = async () => {
    await toggleRestaurantStatus(user.restaurantId);
    fetchRestaurant();
  };

  const savePrizes = async () => {
    setSavingPrizes(true);
    try {
      await updateRestaurant(user.restaurantId, {
        visitPrize: visitPrize || '',
        orderPrize: orderPrize || ''
      });
      await fetchRestaurant();
    } finally {
      setSavingPrizes(false);
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateRestaurant(user.restaurantId, {
        name: profileForm.name.trim(),
        description: profileForm.description.trim(),
        contactPhone: profileForm.contactPhone.trim(),
        contactEmail: profileForm.contactEmail.trim(),
        address: profileForm.address.trim(),
        activeDays: profileForm.activeDays,
        openingTime: profileForm.openingTime,
        closingTime: profileForm.closingTime,
        closedMessage: profileForm.closedMessage.trim(),
        isOpen: profileForm.isOpen,
      });
      await fetchRestaurant();
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleMenuItem = async (itemId) => {
    await toggleMenuItemAvailability(user.restaurantId, itemId);
    fetchRestaurant();
  };

  // POS helpers
  const posAddItem = (item) => {
    setPosCart(prev => {
      const ex = prev.find(i => i.id === item.id);
      if (ex) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const posRemoveItem = (itemId) => {
    setPosCart(prev => {
      const ex = prev.find(i => i.id === itemId);
      if (!ex) return prev;
      if (ex.qty === 1) return prev.filter(i => i.id !== itemId);
      return prev.map(i => i.id === itemId ? { ...i, qty: i.qty - 1 } : i);
    });
  };

  const posSubtotal = posCart.reduce((s, i) => s + i.price * i.qty, 0);
  const posTotal    = posSubtotal;

  const placePosOrder = async () => {
    if (!posCart.length) return;
    if (!posCustomer.trim()) { alert('Customer name is required'); return; }
    if (!posPhone.trim()) { alert('Phone number is required'); return; }
    const orderData = {
      restaurantId:      user.restaurantId,
      restaurantName:    restaurant.name,
      customerId:        'pos',
      customerName:      posCustomer,
      customerPhone:     posPhone,
      deliveryAgentId:   null,
      deliveryAgentName: 'N/A',
      items: posCart.map(i => ({
        id: i.id, name: i.name, price: i.price,
        quantity: i.qty, image: i.image || '',
      })),
      subtotal:        posSubtotal,
      deliveryFee:     0,
      discount:        0,
      walletUsed:      0,
      total:           posTotal,
      promoCode:       null,
      deliveryAddress: posType === 'Dine-in' ? `Table ${posTable}` : 'Takeaway',
      orderType:       posType,
      tableNo:         posTable,
      status:          'Confirmed',
      reviewed:        false,
      placedAt:        serverTimestamp(),
      statusHistory:   [{ status: 'Confirmed', time: new Date().toISOString() }],
    };
    const ref = await addDoc(collection(db, 'orders'), orderData);
    setBillOrder({ id: ref.id, ...orderData, placedAt: new Date().toISOString() });
    setPosCart([]);
    setPosCustomer('');
    setPosPhone('');
    setPosTable('');
    setTab('bill');
  };

  // Menu item save
  const saveMenuItem = async (item, isEdit) => {
    setSavingItem(true);
    try {
      if (isEdit) {
        await updateDoc(doc(db, 'restaurants', user.restaurantId, 'menu', item.id), {
          name: item.name, description: item.description,
          price: +item.price, category: item.category, image: item.image,
        });
      } else {
        const id = `${user.restaurantId}-${Date.now()}`;
        await setDoc(doc(db, 'restaurants', user.restaurantId, 'menu', id), {
          id, name: item.name, description: item.description,
          price: +item.price, category: item.category,
          image: item.image || '', available: true, isPopular: false,
        });
      }
      await fetchRestaurant();
      setEditItem(null);
      setShowAddItem(false);
      setNewItem({ name: '', description: '', price: '', category: '', image: '' });
    } finally {
      setSavingItem(false);
    }
  };

  const deleteMenuItem = async (itemId) => {
    if (!window.confirm('Delete this item?')) return;
    await deleteDoc(doc(db, 'restaurants', user.restaurantId, 'menu', itemId));
    fetchRestaurant();
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1>{restaurant.name} <span className={styles.posTag}>POS</span></h1>
          <p className={styles.address}>{restaurant.address}</p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.statsRow}>
            <div className={styles.statChip}><span>{activeOrders.length}</span> Active</div>
            <div className={styles.statChip}><span>&#8377;{todayRevenue.toFixed(0)}</span> Revenue</div>
            <div className={styles.statChip}><span>&#9733; {restaurant.rating}</span> Rating</div>
          </div>
          <button
            className={`${styles.toggleBtn} ${restaurant.isOpen ? styles.open : styles.closed}`}
            onClick={toggleRestStatus}>
            {restaurant.isOpen ? '● Open' : '● Closed'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {[
          { key: 'orders',    label: `Live Orders${activeOrders.length > 0 ? ` (${activeOrders.length})` : ''}` },
          { key: 'pos',       label: 'POS / New Order' },
          { key: 'bill',      label: 'Bill / KOT' },
          { key: 'menu',      label: 'Menu Management' },
          { key: 'profile',   label: 'Profile' },
          { key: 'history',   label: 'Order History' },
          // { key: 'prizes',    label: 'Prizes & Rewards' },
          { key: 'analytics', label: 'Analytics' },
          { key: 'reviews',   label: 'Reviews' },
        ].map(t => (
          <button key={t.key}
            className={`${styles.tab} ${tab === t.key ? styles.activeTab : ''}`}
            onClick={() => {
              if (t.key === 'history') {
                window.location.href = '/history';
                return;
              }
              setTab(t.key);
            }}>
            {t.label}
          </button>
        ))}
      </div>


      {/* Live Orders */}
      {tab === 'orders' && (
        <LiveOrdersTab
          orders={orders}
          advanceStatus={advanceStatus}
          setTrackingOrderId={setTrackingOrderId}
          STATUS_COLOR={STATUS_COLOR}
          NEXT_ACTION={NEXT_ACTION}
          user={user}
        />
      )}

      {/* POS */}
      {tab === 'pos' && (
        <POSTab
          menu={filteredMenu}
          categories={categories}
          posCategory={posCategory}
          setPosCategory={setPosCategory}
          posCart={posCart}
          posAddItem={posAddItem}
          posRemoveItem={posRemoveItem}
          posSubtotal={posSubtotal}
          posTotal={posTotal}
          posType={posType}
          setPosType={setPosType}
          posTable={posTable}
          setPosTable={setPosTable}
          posCustomer={posCustomer}
          setPosCustomer={setPosCustomer}
          posPhone={posPhone}
          setPosPhone={setPosPhone}
          placePosOrder={placePosOrder}
        />
      )}

      {/* Bill / KOT */}
      {tab === 'bill' && (
        <BillTab
          billOrder={billOrder}
          orders={orders}
          setBillOrder={setBillOrder}
        />
      )}

      {/* Menu Management */}
      {tab === 'menu' && (
        <MenuTab
          restaurant={restaurant}
          toggleMenuItem={toggleMenuItem}
          editItem={editItem}
          setEditItem={setEditItem}
          saveMenuItem={saveMenuItem}
          deleteMenuItem={deleteMenuItem}
          savingItem={savingItem}
          showAddItem={showAddItem}
          setShowAddItem={setShowAddItem}
          newItem={newItem}
          setNewItem={setNewItem}
        />
      )}

      {/* Restaurant Profile */}
      {tab === 'profile' && (
        <ProfileTab
          restaurant={restaurant}
          form={profileForm}
          setForm={setProfileForm}
          onSave={saveProfile}
          saving={savingProfile}
        />
      )}

      {/* Prizes & Rewards */}
      {tab === 'prizes' && <PrizesTab visitPrize={visitPrize} setVisitPrize={setVisitPrize} orderPrize={orderPrize} setOrderPrize={setOrderPrize} savePrizes={savePrizes} savingPrizes={savingPrizes} />}

      {/* Analytics */}
      {tab === 'analytics' && <AnalyticsTab orders={orders} restaurant={restaurant} />}

      {/* Reviews */}
      {tab === 'reviews' && (
        <div className={styles.reviewsTab}>
          <ReviewSection restaurantId={user.restaurantId} />
        </div>
      )}

      {/* Tracking modal */}
      {trackingOrderId && (
        <div className={styles.trackingOverlay}>
          <div className={styles.trackingModal}>
            <div className={styles.trackingHeader}>
              <h3>Live Tracking — #{trackingOrderId}</h3>
              <button onClick={() => setTrackingOrderId(null)}>✕</button>
            </div>
            <LiveTrackingMap orderId={trackingOrderId} role="restaurant" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Live Orders Tab ──────────────────────────────────────────────────────────
function LiveOrdersTab({ orders, advanceStatus, setTrackingOrderId, STATUS_COLOR, NEXT_ACTION, user }) {
  const [filter, setFilter] = useState('active');
  const active    = orders;
  const completed = orders.filter(o => normalizeOrderStatus(o.status) === ORDER_STATUS.DELIVERED);
  const display   = filter === 'active' ? active : completed;

  return (
    <div>
      <div className={styles.filterRow}>
        <button
          className={`${styles.filterBtn} ${filter === 'active' ? styles.activeFilter : ''}`}
          onClick={() => setFilter('active')}>
          Active ({active.length})
        </button>
        <button
          className={`${styles.filterBtn} ${filter === 'completed' ? styles.activeFilter : ''}`}
          onClick={() => setFilter('completed')}>
          Completed ({completed.length})
        </button>
      </div>

      {display.length === 0 ? (
        <div className={styles.empty}>
          {filter === 'active' ? 'No orders yet' : 'No completed orders'}
        </div>
      ) : (
        <div className={styles.orderGrid}>
          {display.map(order => {
            const status = normalizeOrderStatus(order.status);
            const action = NEXT_ACTION[status];
            const placedTime = order.placedAt?.seconds
              ? new Date(order.placedAt.seconds * 1000).toLocaleTimeString()
              : new Date(order.placedAt).toLocaleTimeString();
            return (
              <div key={order.id} className={styles.orderCard}
                style={{ borderTop: `4px solid ${STATUS_COLOR[status] || '#eee'}` }}>
                <div className={styles.orderHeader}>
                  <div>
                    <span className={styles.orderId}>#{order.id?.slice(0, 8)?.toUpperCase()}</span>
                    {order.orderType && (
                      <span className={styles.orderTypeBadge}>{order.orderType}</span>
                    )}
                    <span className={styles.orderStatus}
                      style={{ background: STATUS_COLOR[status] }}>
                      {status}
                    </span>
                  </div>
                  <span className={styles.orderTime}>{placedTime}</span>
                </div>
                <div className={styles.customerRow}>
                  <span>👤 {order.customerName}</span>
                  <span className={styles.orderTotal}>&#8377;{order.total}</span>
                </div>
                {order.tableNo && <p className={styles.tableInfo}>Table: {order.tableNo}</p>}
                <div className={styles.orderItems}>
                  {order.items?.map(item => (
                    <div key={item.id} className={styles.orderItem}>
                      <span>{item.name}</span>
                      <span>x{item.quantity}</span>
                    </div>
                  ))}
                </div>
                <p className={styles.deliveryAddr}>📍 {order.deliveryAddress}</p>
                <PickupOtp order={order} user={user} />
                <div className={styles.settlementMini}>
                  <span>Gross food: &#8377;{(order.subtotal || 0).toFixed(0)}</span>
                  <span>Commission: &#8377;{(order.platformCommission || ((order.subtotal || 0) * 0.15)).toFixed(0)}</span>
                  <strong>Net: &#8377;{(order.netSettlementAmount || ((order.subtotal || 0) * 0.85)).toFixed(0)}</strong>
                </div>
                <div className={styles.orderActions}>
                  {action && (
                    <button className={styles.actionBtn}
                      onClick={() => advanceStatus(order.id, action.next)}>
                      {action.label} →
                    </button>
                  )}
                  {status === ORDER_STATUS.ON_THE_WAY && (
                    <button className={styles.trackBtn}
                      onClick={() => setTrackingOrderId(order.id)}>
                      Track Live
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── POS Tab ──────────────────────────────────────────────────────────────────
function POSTab({
  menu, categories, posCategory, setPosCategory,
  posCart, posAddItem, posRemoveItem,
  posSubtotal, posTotal,
  posType, setPosType, posTable, setPosTable,
  posCustomer, setPosCustomer, posPhone, setPosPhone,
  placePosOrder,
}) {
  const [menuSearch, setMenuSearch] = useState('');

  const visibleItems = menu.filter(i =>
    i.available && (
      menuSearch === '' ||
      i.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
      i.category.toLowerCase().includes(menuSearch.toLowerCase())
    )
  );

  return (
    <div className={styles.posLayout}>
      {/* Left: Menu panel */}
      <div className={styles.posMenu}>
        {/* Search bar */}
        <div className={styles.posSearchRow}>
          <input
            type="text"
            placeholder="Search menu items..."
            value={menuSearch}
            onChange={e => setMenuSearch(e.target.value)}
            className={styles.posSearchInput}
          />
          {menuSearch && (
            <button className={styles.posSearchClear} onClick={() => setMenuSearch('')}>✕</button>
          )}
        </div>

        {/* Category filters */}
        <div className={styles.posCatRow}>
          {categories.map(c => (
            <button key={c}
              className={`${styles.posCat} ${posCategory === c ? styles.posCatActive : ''}`}
              onClick={() => { setPosCategory(c); setMenuSearch(''); }}>
              {c}
            </button>
          ))}
        </div>

        {/* Item grid */}
        <div className={styles.posItemGrid}>
          {visibleItems.length === 0 ? (
            <p className={styles.posNoItems}>No items found</p>
          ) : visibleItems.map(item => (
            <button key={item.id} className={styles.posItem} onClick={() => posAddItem(item)}>
              {item.image && (
                <img src={item.image} alt={item.name} className={styles.posItemImg} />
              )}
              <p className={styles.posItemName}>{item.name}</p>
              <p className={styles.posItemPrice}>&#8377;{item.price}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Cart panel */}
      <div className={styles.posCart}>
        <h3 className={styles.posCartTitle}>Current Order</h3>

        {/* Order type */}
        <div className={styles.orderTypeRow}>
          {['Dine-in', 'Takeaway', 'Delivery'].map(t => (
            <button key={t}
              className={`${styles.orderTypeBtn} ${posType === t ? styles.orderTypeActive : ''}`}
              onClick={() => setPosType(t)}>
              {t}
            </button>
          ))}
        </div>

        {/* Customer details */}
        <div className={styles.posInputRow}>
          <input
            placeholder="Customer name *"
            value={posCustomer}
            onChange={e => setPosCustomer(e.target.value)}
            className={styles.posInput}
          />
          <input
            placeholder="Phone no. *"
            value={posPhone}
            onChange={e => setPosPhone(e.target.value)}
            className={styles.posInput}
            type="tel"
          />
          {posType === 'Dine-in' && (
            <input
              placeholder="Table no."
              value={posTable}
              onChange={e => setPosTable(e.target.value)}
              className={styles.posInput}
            />
          )}
        </div>

        {/* Cart items */}
        <div className={styles.posCartItems}>
          {posCart.length === 0 ? (
            <p className={styles.posEmpty}>Add items from the menu</p>
          ) : posCart.map(item => (
            <div key={item.id} className={styles.posCartItem}>
              <span className={styles.posCartName}>{item.name}</span>
              <div className={styles.posQty}>
                <button onClick={() => posRemoveItem(item.id)}>−</button>
                <span>{item.qty}</span>
                <button onClick={() => posAddItem(item)}>+</button>
              </div>
              <span className={styles.posCartPrice}>&#8377;{item.price * item.qty}</span>
            </div>
          ))}
        </div>

        {/* Bill summary */}
        {posCart.length > 0 && (
          <div className={styles.posBill}>
            <div className={styles.posBillRow}>
              <span>Subtotal</span><span>&#8377;{posSubtotal}</span>
            </div>
            <div className={`${styles.posBillRow} ${styles.posBillTotal}`}>
              <span>Total</span><span>&#8377;{posTotal}</span>
            </div>
            <button className={styles.posPlaceBtn} onClick={placePosOrder}>
              Place Order &amp; Generate Bill
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Bill / KOT Tab ───────────────────────────────────────────────────────────
function BillTab({ billOrder, orders, setBillOrder }) {
  const [selectedOrderId, setSelectedOrderId] = useState(billOrder?.id || '');
  const displayOrder = billOrder || orders.find(o => o.id === selectedOrderId);

  const formatTime = (placedAt) => {
    const d = placedAt?.seconds
      ? new Date(placedAt.seconds * 1000)
      : new Date(placedAt);
    return d.toLocaleTimeString();
  };

  const formatDateTime = (placedAt) => {
    const d = placedAt?.seconds
      ? new Date(placedAt.seconds * 1000)
      : new Date(placedAt);
    return d.toLocaleString();
  };

  const printKOT = () => {
    const el = document.getElementById('kot-print');
    if (!el) return;
    const w = window.open('', '_blank', 'width=400,height=600');
    w.document.write(`<html><head><title>KOT</title><style>
      body { font-family: monospace; padding: 16px; font-size: 13px; }
      h2 { text-align: center; font-size: 16px; margin: 0 0 8px; }
      p { margin: 2px 0; font-size: 12px; }
      .line { border-top: 1px dashed #000; margin: 8px 0; }
      .item { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; font-weight: bold; }
      .label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 6px 0 4px; }
      .footer { text-align: center; font-size: 10px; color: #888; margin-top: 10px; }
    </style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  };

  const printBill = () => {
    const el = document.getElementById('bill-print');
    if (!el) return;
    const w = window.open('', '_blank', 'width=420,height=700');
    w.document.write(`<html><head><title>Bill</title><style>
      body { font-family: monospace; padding: 16px; font-size: 12px; }
      h2 { text-align: center; font-size: 15px; margin: 0 0 4px; }
      p { margin: 2px 0; text-align: center; font-size: 11px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; margin: 8px 0; }
      th { text-align: left; border-bottom: 1px solid #000; padding: 3px 0; font-size: 10px; text-transform: uppercase; }
      td { padding: 4px 0; border-bottom: 1px dotted #ccc; }
      .line { border: none; border-top: 1px dashed #000; margin: 6px 0; }
      .row { display: flex; justify-content: space-between; font-size: 12px; margin: 2px 0; }
      .total-row { font-weight: bold; font-size: 14px; display: flex; justify-content: space-between; border-top: 2px solid #000; padding-top: 6px; margin-top: 4px; }
      .footer { text-align: center; font-size: 10px; color: #666; margin-top: 8px; }
    </style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div className={styles.billTab}>
      {/* Order selector */}
      <div className={styles.billSelector}>
        <label>Select Order:</label>
        <select
          value={selectedOrderId}
          onChange={e => {
            setSelectedOrderId(e.target.value);
            setBillOrder(null);
          }}>
          <option value="">-- Select Order --</option>
          {orders.map(o => (
            <option key={o.id} value={o.id}>
              #{o.id?.slice(0, 8)?.toUpperCase()} — {o.customerName} — &#8377;{o.total}
            </option>
          ))}
        </select>

        {displayOrder && (
          <div className={styles.printBtns}>
            <button className={styles.kotPrintBtn} onClick={printKOT}>Print KOT</button>
            <button className={styles.printBtn} onClick={printBill}>Print Bill</button>
          </div>
        )}
      </div>

      {displayOrder && (
        <div className={styles.billLayout}>
          {/* KOT section */}
          <div className={styles.kotPaper} id="kot-print">
            <h2>KOT</h2>
            <p>Order #{displayOrder.id?.slice(0, 8)?.toUpperCase()}</p>
            <p>{formatTime(displayOrder.placedAt)}</p>
            {displayOrder.orderType && (
              <p>
                {displayOrder.orderType}
                {displayOrder.tableNo ? ` — Table ${displayOrder.tableNo}` : ''}
              </p>
            )}
            <p>Customer: {displayOrder.customerName}</p>
            {displayOrder.customerPhone && <p>Phone: {displayOrder.customerPhone}</p>}
            <div className={styles.billDivider} />
            <p className={styles.kotTitle}>ITEMS</p>
            {displayOrder.items?.map((item, i) => (
              <div key={i} className={styles.kotItem}>
                <span>{item.name}</span>
                <span>x{item.quantity}</span>
              </div>
            ))}
            <div className={styles.billDivider} />
            <p style={{ textAlign: 'center', fontSize: 11, color: '#888' }}>Kitchen Copy</p>
          </div>

          {/* Bill section */}
          <div className={styles.billPaper} id="bill-print">
            <div className={styles.billHeader}>
              <h2>BILL</h2>
              <p className={styles.billRestName}>{displayOrder.restaurantName}</p>
              <p className={styles.billMeta}>Order #{displayOrder.id?.slice(0, 8)?.toUpperCase()}</p>
              <p className={styles.billMeta}>{formatDateTime(displayOrder.placedAt)}</p>
              {displayOrder.orderType && (
                <p className={styles.billMeta}>
                  {displayOrder.orderType}
                  {displayOrder.tableNo ? ` — Table ${displayOrder.tableNo}` : ''}
                </p>
              )}
              <p className={styles.billMeta}>Customer: {displayOrder.customerName}</p>
              {displayOrder.customerPhone && (
                <p className={styles.billMeta}>Phone: {displayOrder.customerPhone}</p>
              )}
            </div>
            <div className={styles.billDivider} />
            <table className={styles.billTable}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Amt</th>
                </tr>
              </thead>
              <tbody>
                {displayOrder.items?.map((item, i) => (
                  <tr key={i}>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>&#8377;{item.price}</td>
                    <td>&#8377;{item.price * item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={styles.billDivider} />
            <div className={styles.billTotals}>
              <div><span>Subtotal</span><span>&#8377;{displayOrder.subtotal}</span></div>
              {displayOrder.deliveryFee > 0 && (
                <div><span>Delivery</span><span>&#8377;{displayOrder.deliveryFee}</span></div>
              )}
              {displayOrder.discount > 0 && (
                <div className={styles.billDiscount}>
                  <span>Discount</span><span>-&#8377;{displayOrder.discount}</span>
                </div>
              )}
              <div className={styles.billGrandTotal}>
                <span>TOTAL</span><span>&#8377;{displayOrder.total}</span>
              </div>
            </div>
            <div className={styles.billDivider} />
            <p className={styles.billFooter}>Thank you! Visit again.</p>
            <p className={styles.billFooter}>Powered by FoodDash</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Menu Management Tab ──────────────────────────────────────────────────────
function MenuTab({
  restaurant, toggleMenuItem, editItem, setEditItem,
  saveMenuItem, deleteMenuItem, savingItem,
  showAddItem, setShowAddItem, newItem, setNewItem,
}) {
  const [menuSearch, setMenuSearch] = useState('');
  const allCategories = restaurant?.menu
    ? [...new Set(restaurant.menu.map(i => i.category))]
    : [];

  const filteredItems = restaurant?.menu?.filter(i =>
    menuSearch === '' ||
    i.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
    i.category.toLowerCase().includes(menuSearch.toLowerCase()) ||
    i.description?.toLowerCase().includes(menuSearch.toLowerCase())
  ) || [];

  // Group filtered items by category
  const groupedCategories = allCategories.filter(cat =>
    filteredItems.some(i => i.category === cat)
  );

  return (
    <div className={styles.menuSection}>
      <div className={styles.menuTopBar}>
        <h3>Menu Items ({restaurant?.menu?.length || 0})</h3>
        <button className={styles.addItemBtn} onClick={() => setShowAddItem(true)}>
          + Add Item
        </button>
      </div>

      {/* Search bar */}
      <div className={styles.menuSearchRow}>
        <input
          type="text"
          placeholder="Search menu items by name, category or description..."
          value={menuSearch}
          onChange={e => setMenuSearch(e.target.value)}
          className={styles.menuSearchInput}
        />
        {menuSearch && (
          <button className={styles.menuSearchClear} onClick={() => setMenuSearch('')}>✕</button>
        )}
      </div>

      {showAddItem && (
        <ItemForm
          item={newItem}
          setItem={setNewItem}
          categories={allCategories}
          onSave={() => saveMenuItem(newItem, false)}
          onCancel={() => {
            setShowAddItem(false);
            setNewItem({ name: '', description: '', price: '', category: '', image: '' });
          }}
          saving={savingItem}
          title="Add New Item"
        />
      )}

      {groupedCategories.length === 0 && menuSearch ? (
        <div className={styles.empty}>No items match "{menuSearch}"</div>
      ) : (
        groupedCategories.map(cat => {
          const items = filteredItems.filter(i => i.category === cat);
          return (
            <div key={cat} className={styles.menuCategory}>
              <h4 className={styles.catTitle}>{cat} ({items.length})</h4>
              {items.map(item => (
                <div key={item.id}>
                  {editItem?.id === item.id ? (
                    <ItemForm
                      item={editItem}
                      setItem={setEditItem}
                      categories={allCategories}
                      onSave={() => saveMenuItem(editItem, true)}
                      onCancel={() => setEditItem(null)}
                      saving={savingItem}
                      title="Edit Item"
                    />
                  ) : (
                    <div className={`${styles.menuItem} ${!item.available ? styles.unavailable : ''}`}>
                      {item.image && (
                        <img src={item.image} alt={item.name} className={styles.menuItemImg} />
                      )}
                      <div className={styles.menuItemInfo}>
                        <span className={styles.menuItemName}>{item.name}</span>
                        <span className={styles.menuItemDesc}>{item.description}</span>
                        <span className={styles.menuItemPrice}>&#8377;{item.price}</span>
                      </div>
                      <div className={styles.menuItemActions}>
                        <button
                          className={`${styles.toggleAvail} ${item.available ? styles.availOn : styles.availOff}`}
                          onClick={() => toggleMenuItem(item.id)}>
                          {item.available ? 'Available' : 'Unavailable'}
                        </button>
                        <button className={styles.editItemBtn} onClick={() => setEditItem({ ...item })}>
                          Edit
                        </button>
                        <button className={styles.deleteItemBtn} onClick={() => deleteMenuItem(item.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}

function ProfileTab({ restaurant, form, setForm, onSave, saving }) {
  const toggleDay = (day) => {
    setForm(prev => ({
      ...prev,
      activeDays: prev.activeDays.includes(day)
        ? prev.activeDays.filter(value => value !== day)
        : [...prev.activeDays, day],
    }));
  };

  return (
    <div className={styles.profileTab}>
      <div className={styles.profileIntro}>
        <h3>Restaurant Profile</h3>
        <p>Edit the public details customers see and the hours they can order from you.</p>
        <div className={styles.currentStatus}>
          <span className={form.isOpen ? styles.statusOpen : styles.statusClosed}>
            {form.isOpen ? 'Open' : 'Closed'}
          </span>
          <small>
            {restaurant?.orderStatusReason || 'Schedule controls ordering availability.'}
          </small>
        </div>
      </div>

      <div className={styles.profileGrid}>
        <label className={styles.profileField}>
          Restaurant Name
          <input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} />
        </label>
        <label className={styles.profileField}>
          Contact Phone
          <input value={form.contactPhone} onChange={e => setForm(prev => ({ ...prev, contactPhone: e.target.value }))} />
        </label>
        <label className={styles.profileField}>
          Contact Email
          <input type="email" value={form.contactEmail} onChange={e => setForm(prev => ({ ...prev, contactEmail: e.target.value }))} />
        </label>
        <label className={styles.profileField}>
          Address
          <input value={form.address} onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))} />
        </label>
        <label className={`${styles.profileField} ${styles.profileFull}`}> 
          Description
          <textarea rows={4} value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} />
        </label>
        <label className={`${styles.profileField} ${styles.profileFull}`}>
          Closed Message
          <input
            value={form.closedMessage}
            onChange={e => setForm(prev => ({ ...prev, closedMessage: e.target.value }))}
            placeholder="e.g. We are closed right now. Please order between 10 AM and 10 PM."
          />
        </label>
        <label className={styles.profileField}>
          Opening Time
          <input type="time" value={form.openingTime} onChange={e => setForm(prev => ({ ...prev, openingTime: e.target.value }))} />
        </label>
        <label className={styles.profileField}>
          Closing Time
          <input type="time" value={form.closingTime} onChange={e => setForm(prev => ({ ...prev, closingTime: e.target.value }))} />
        </label>
      </div>

      <div className={styles.profileDays}>
        <span className={styles.profileLabel}>Active Days</span>
        <div className={styles.dayChips}>
          {DAY_OPTIONS.map(day => (
            <button
              key={day.key}
              type="button"
              className={`${styles.dayChip} ${form.activeDays.includes(day.key) ? styles.dayChipActive : ''}`}
              onClick={() => toggleDay(day.key)}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      <label className={styles.profileSwitch}>
        <input
          type="checkbox"
          checked={form.isOpen}
          onChange={e => setForm(prev => ({ ...prev, isOpen: e.target.checked }))}
        />
        <span>Accept orders from customers</span>
      </label>

      <div className={styles.profileActions}>
        <button className={styles.saveProfileBtn} onClick={onSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}

function ItemForm({ item, setItem, categories, onSave, onCancel, saving, title }) {
  const handleImageFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setItem({ ...item, image: dataUrl });
    } catch (error) {
      alert(error.message || 'Unable to load image');
    }
  };

  return (
    <div className={styles.itemForm}>
      <h4>{title}</h4>
      <div className={styles.itemFormGrid}>
        <label>
          Name *
          <input
            value={item.name}
            onChange={e => setItem({ ...item, name: e.target.value })}
            placeholder="Item name"
          />
        </label>
        <label>
          Category *
          <input
            value={item.category}
            onChange={e => setItem({ ...item, category: e.target.value })}
            placeholder="e.g. Starters"
            list="cats"
          />
          <datalist id="cats">
            {categories.map(c => <option key={c} value={c} />)}
          </datalist>
        </label>
        <label>
          Price (&#8377;) *
          <input
            type="number"
            value={item.price}
            onChange={e => setItem({ ...item, price: e.target.value })}
            placeholder="0"
          />
        </label>
        <label>
          Item Image
          <input type="file" accept="image/*" onChange={handleImageFileChange} />
          {item.image && <img src={item.image} alt="Item preview" style={{ marginTop: 8, width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 10 }} />}
        </label>
        <label className={styles.fullWidth}>
          Description
          <input
            value={item.description}
            onChange={e => setItem({ ...item, description: e.target.value })}
            placeholder="Short description"
          />
        </label>
      </div>
      <div className={styles.itemFormActions}>
        <button onClick={onCancel} className={styles.cancelBtn}>Cancel</button>
        <button onClick={onSave} className={styles.saveBtn} disabled={saving}>
          {saving ? 'Saving...' : 'Save Item'}
        </button>
      </div>
    </div>
  );
}

// ── Analytics Tab ────────────────────────────────────────────────────────────
function AnalyticsTab({ orders, restaurant }) {
  const delivered = orders.filter(o => normalizeOrderStatus(o.status) === ORDER_STATUS.DELIVERED);
  const totalRev  = delivered.reduce((s, o) => s + (o.total || 0), 0);
  const avgOrder  = delivered.length ? (totalRev / delivered.length).toFixed(0) : 0;
  const grossFood = delivered.reduce((s, o) => s + (o.subtotal || 0), 0);
  const platformCommission = delivered.reduce((s, o) => s + (o.platformCommission || ((o.subtotal || 0) * 0.15)), 0);
  const netSettlement = delivered.reduce((s, o) => s + (o.netSettlementAmount || ((o.subtotal || 0) * 0.85)), 0);
  const pendingPayouts = delivered.filter(o => (o.settlementStatus || 'pending') === 'pending').reduce((s, o) => s + (o.netSettlementAmount || ((o.subtotal || 0) * 0.85)), 0);

  // Top items
  const itemCount = {};
  delivered.forEach(o => o.items?.forEach(i => {
    itemCount[i.name] = (itemCount[i.name] || 0) + i.quantity;
  }));
  const topItems = Object.entries(itemCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Orders by type
  const dineIn   = orders.filter(o => o.orderType === 'Dine-in').length;
  const takeaway = orders.filter(o => o.orderType === 'Takeaway').length;
  const delivery = orders.filter(o => !o.orderType || o.orderType === 'Delivery').length;

  return (
    <div className={styles.analyticsTab}>
      <div className={styles.analyticsGrid}>
        <div className={styles.analyticsCard}>
          <p className={styles.analyticsVal}>&#8377;{grossFood.toFixed(0)}</p>
          <p className={styles.analyticsLabel}>Gross Food Amount</p>
        </div>
        <div className={styles.analyticsCard}>
          <p className={styles.analyticsVal}>&#8377;{platformCommission.toFixed(0)}</p>
          <p className={styles.analyticsLabel}>Platform Commission</p>
        </div>
        <div className={styles.analyticsCard}>
          <p className={styles.analyticsVal}>&#8377;{netSettlement.toFixed(0)}</p>
          <p className={styles.analyticsLabel}>Net Settlement</p>
        </div>
        <div className={styles.analyticsCard}>
          <p className={styles.analyticsVal}>&#8377;{pendingPayouts.toFixed(0)}</p>
          <p className={styles.analyticsLabel}>Pending Payouts</p>
        </div>
        <div className={styles.analyticsCard}>
          <p className={styles.analyticsVal}>{delivered.length}</p>
          <p className={styles.analyticsLabel}>Delivered Orders</p>
        </div>
        <div className={styles.analyticsCard}>
          <p className={styles.analyticsVal}>&#8377;{avgOrder}</p>
          <p className={styles.analyticsLabel}>Avg Order Value</p>
        </div>
      </div>

      <div className={styles.analyticsRow}>
        <div className={styles.analyticsSection}>
          <h3>Top Selling Items</h3>
          {topItems.length === 0 ? (
            <p className={styles.empty}>No data yet</p>
          ) : (
            <table className={styles.analyticsTable}>
              <thead>
                <tr><th>Item</th><th>Qty Sold</th></tr>
              </thead>
              <tbody>
                {topItems.map(([name, qty]) => (
                  <tr key={name}><td>{name}</td><td>{qty}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className={styles.analyticsSection}>
          <h3>Orders by Type</h3>
          <div className={styles.orderTypeStats}>
            {[
              { label: 'Dine-in',  count: dineIn,   color: '#ff6b35' },
              { label: 'Takeaway', count: takeaway,  color: '#7c3aed' },
              { label: 'Delivery', count: delivery,  color: '#059669' },
            ].map(({ label, count, color }) => (
              <div key={label} className={styles.typeStatRow}>
                <span>{label}</span>
                <div className={styles.typeBar}>
                  <div style={{
                    width: orders.length ? `${(count / orders.length) * 100}%` : '0%',
                    background: color,
                  }} />
                </div>
                <span>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
