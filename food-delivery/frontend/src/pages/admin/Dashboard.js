import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  listenToAllOrders, getAllUsers, getRestaurants, getAllPromos,
  addRestaurant, updateRestaurant, deleteRestaurant,
  addPromo, updatePromo, deletePromo,
  getAppConfig, updateAppConfig
} from '../../firebase/services';
import DeliveryPartners from './DeliveryPartners';
import styles from './Dashboard.module.css';

const TABS = ['Overview', 'Orders', 'Restaurants', 'Promos', 'Users', 'Delivery Partners', 'Settings'];

function tabIcon(t) {
  return { Overview:'📊', Orders:'📦', Restaurants:'🍽️', Promos:'🏷️', Users:'👥', 'Delivery Partners':'🚴', Settings:'⚙️' }[t];
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab]           = useState('Overview');
  const [orders, setOrders]     = useState([]);
  const [users, setUsers]       = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [promos, setPromos]     = useState([]);
  const [loading, setLoading]   = useState(true);

  const [showAddRestaurant, setShowAddRestaurant] = useState(false);
  const [showAddPromo, setShowAddPromo]           = useState(false);
  const [editRestaurant, setEditRestaurant]       = useState(null);
  const [appConfig, setAppConfig]                 = useState(null);

  const loadData = useCallback(async () => {
    const [u, r, p, cfg] = await Promise.all([getAllUsers(), getRestaurants(), getAllPromos(), getAppConfig()]);
    setUsers(u); setRestaurants(r); setPromos(p); setAppConfig(cfg);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const unsub = listenToAllOrders(setOrders);
    return unsub;
  }, [loadData]);

  const totalRevenue   = orders.reduce((s, o) => s + (o.total || 0), 0);
  const activeOrders   = orders.filter(o => o.status !== 'Delivered').length;
  const totalCustomers = users.filter(u => u.role === 'customer').length;
  const deliveredCount = orders.filter(o => o.status === 'Delivered').length;

  if (loading) return (
    <div className={styles.loadingPage}>
      <div className={styles.spinner} />
      <p>Loading Admin Panel...</p>
    </div>
  );

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>👑 FoodDash<span>Admin</span></div>
        <nav className={styles.nav}>
          {TABS.map(t => (
            <button key={t} className={`${styles.navBtn} ${tab === t ? styles.active : ''}`}
              onClick={() => setTab(t)}>
              {tabIcon(t)} {t}
            </button>
          ))}
        </nav>
        <div className={styles.adminInfo}>
          <span className={styles.adminAvatar}>{user.avatar}</span>
          <div>
            <p className={styles.adminName}>{user.name}</p>
            <p className={styles.adminEmail}>{user.email}</p>
          </div>
          <button className={styles.logoutBtn} onClick={logout} title="Logout">🚪</button>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.topBar}>
          <h1>{tab}</h1>
          <div className={styles.topActions}>
            {tab === 'Restaurants' && (
              <button className={styles.addBtn} onClick={() => setShowAddRestaurant(true)}>+ Add Restaurant</button>
            )}
            {tab === 'Promos' && (
              <button className={styles.addBtn} onClick={() => setShowAddPromo(true)}>+ Add Promo</button>
            )}
          </div>
        </div>

        {tab === 'Overview'     && <Overview orders={orders} totalRevenue={totalRevenue} activeOrders={activeOrders} totalCustomers={totalCustomers} deliveredCount={deliveredCount} restaurants={restaurants} users={users} />}
        {tab === 'Orders'       && <Orders orders={orders} />}
        {tab === 'Restaurants'  && <Restaurants restaurants={restaurants} onEdit={setEditRestaurant} onDelete={async (id) => { await deleteRestaurant(id); loadData(); }} />}
        {tab === 'Promos' && <Promos promos={promos}
          onToggle={async (code, active) => {
            await updatePromo(code, { active });
            if (active) {
              const promo = promos.find(p => (p.code || p.id) === code);
              await fetch('/api/notifications/promo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  promoCode: code,
                  description: promo?.description || `Use code ${code} to save on your next order!`,
                  title: `🔥 Offer Back: ${code}`
                })
              });
            }
            loadData();
          }}
          onDelete={async (code) => { await deletePromo(code); loadData(); }}
        />}
        {tab === 'Users'        && <Users users={users} />}
        {tab === 'Delivery Partners' && <DeliveryPartners users={users} orders={orders} onUpdate={loadData} />}
        {tab === 'Settings'     && <Settings config={appConfig} onSave={async (data) => { await updateAppConfig(data); setAppConfig({ ...appConfig, ...data }); }} />}
      </main>

      {showAddRestaurant && (
        <AddRestaurantModal
          onClose={() => setShowAddRestaurant(false)}
          onSave={async (data) => { await addRestaurant(data); setShowAddRestaurant(false); loadData(); }}
        />
      )}
      {editRestaurant && (
        <AddRestaurantModal
          initial={editRestaurant}
          onClose={() => setEditRestaurant(null)}
          onSave={async (data) => { await updateRestaurant(editRestaurant.id, data); setEditRestaurant(null); loadData(); }}
        />
      )}
      {showAddPromo && (
        <AddPromoModal
          onClose={() => setShowAddPromo(false)}
          onSave={async (data) => {
            await addPromo(data);
            await fetch('/api/notifications/promo', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                promoCode: data.code,
                description: data.description,
                title: `🏷️ New Offer: ${data.code}`
              })
            });
            setShowAddPromo(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

/* ── Overview ────────────────────────────────────────────────────────────── */

function Overview({ orders, totalRevenue, activeOrders, totalCustomers, deliveredCount, restaurants, users }) {
  const recentOrders = orders.slice(0, 5);
  const STATUS_COLOR = { Placed:'#dbeafe', Confirmed:'#fef3c7', Preparing:'#ede9fe', 'Out for Delivery':'#ffedd5', Delivered:'#d1fae5' };

  return (
    <div>
      <div className={styles.statsGrid}>
        <StatCard icon="📦" label="Total Orders"    value={orders.length}              color="#ff6b35" />
        <StatCard icon="✅" label="Delivered"        value={deliveredCount}             color="#10b981" />
        <StatCard icon="🔄" label="Active Orders"   value={activeOrders}               color="#3b82f6" />
        <StatCard icon="💰" label="Total Revenue"   value={`₹${totalRevenue.toFixed(0)}`} color="#7c3aed" />
        <StatCard icon="🍽️" label="Restaurants"    value={restaurants.length}         color="#f59e0b" />
        <StatCard icon="👥" label="Customers"       value={totalCustomers}             color="#ec4899" />
      </div>

      <div className={styles.recentSection}>
        <h3>Recent Orders</h3>
        <table className={styles.table}>
          <thead><tr><th>Order ID</th><th>Customer</th><th>Restaurant</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            {recentOrders.map(o => (
              <tr key={o.id}>
                <td className={styles.mono}>#{o.id?.slice(0,8)}</td>
                <td>{o.customerName}</td>
                <td>{o.restaurantName}</td>
                <td>₹{o.total}</td>
                <td><span className={styles.statusPill} style={{ background: STATUS_COLOR[o.status] || '#f0f0f0' }}>{o.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className={styles.statCard} style={{ borderTop: `4px solid ${color}` }}>
      <span className={styles.statIcon}>{icon}</span>
      <div>
        <p className={styles.statVal}>{value}</p>
        <p className={styles.statLabel}>{label}</p>
      </div>
    </div>
  );
}

/* ── Orders ──────────────────────────────────────────────────────────────── */

function Orders({ orders }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const STATUS_COLOR = { Placed:'#dbeafe', Confirmed:'#fef3c7', Preparing:'#ede9fe', 'Out for Delivery':'#ffedd5', Delivered:'#d1fae5' };
  const STATUSES = ['All', 'Placed', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'];

  const filtered = orders.filter(o => {
    const matchSearch = !search || o.customerName?.toLowerCase().includes(search.toLowerCase()) || o.restaurantName?.toLowerCase().includes(search.toLowerCase()) || o.id?.includes(search);
    const matchFilter = filter === 'All' || o.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div>
      <div className={styles.filterBar}>
        <input className={styles.searchInput} placeholder="Search by customer, restaurant, order ID..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className={styles.chips}>
          {STATUSES.map(s => <button key={s} className={`${styles.chip} ${filter === s ? styles.chipActive : ''}`} onClick={() => setFilter(s)}>{s}</button>)}
        </div>
      </div>
      <table className={styles.table}>
        <thead><tr><th>Order ID</th><th>Customer</th><th>Restaurant</th><th>Items</th><th>Total</th><th>Promo</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>
          {filtered.map(o => (
            <tr key={o.id}>
              <td className={styles.mono}>#{o.id?.slice(0,8)?.toUpperCase()}</td>
              <td>{o.customerName}</td>
              <td>{o.restaurantName}</td>
              <td>{o.items?.length} items</td>
              <td>₹{o.total}</td>
              <td>{o.promoCode ? <span className={styles.promoTag}>{o.promoCode}</span> : '—'}</td>
              <td><span className={styles.statusPill} style={{ background: STATUS_COLOR[o.status] || '#f0f0f0' }}>{o.status}</span></td>
              <td className={styles.dateCell}>{o.placedAt ? new Date(o.placedAt?.seconds ? o.placedAt.seconds*1000 : o.placedAt).toLocaleDateString('en-IN') : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && <p className={styles.empty}>No orders found</p>}
    </div>
  );
}

/* ── Restaurants ─────────────────────────────────────────────────────────── */

function Restaurants({ restaurants, onEdit, onDelete }) {
  return (
    <div className={styles.cardGrid}>
      {restaurants.map(r => (
        <div key={r.id} className={styles.restCard}>
          <img src={r.image} alt={r.name} className={styles.restImg} />
          <div className={styles.restInfo}>
            <div className={styles.restHeader}>
              <h3>{r.name}</h3>
              <span className={`${styles.openBadge} ${r.isOpen ? styles.open : styles.closed}`}>{r.isOpen ? 'Open' : 'Closed'}</span>
            </div>
            <p className={styles.restCuisine}>{r.cuisine} · ⭐ {r.rating}</p>
            <p className={styles.restAddr}>📍 {r.address}</p>
            <p className={styles.restMeta}>🚚 ₹{r.deliveryFee} · Min ₹{r.minOrder} · {r.deliveryTime}</p>
            {r.offer && <p className={styles.restOffer}>🏷️ {r.offer}</p>}
          </div>
          <div className={styles.restActions}>
            <button className={styles.editBtn} onClick={() => onEdit(r)}>✏️ Edit</button>
            <button className={styles.deleteBtn} onClick={() => { if(window.confirm(`Delete ${r.name}?`)) onDelete(r.id); }}>🗑️ Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Promos ──────────────────────────────────────────────────────────────── */

function Promos({ promos, onToggle, onDelete }) {
  return (
    <div className={styles.promoGrid}>
      {promos.map(p => (
        <div key={p.code || p.id} className={`${styles.promoCard} ${!p.active ? styles.promoInactive : ''}`}>
          <div className={styles.promoTop}>
            <span className={styles.promoCode}>{p.code || p.id}</span>
            <span className={`${styles.promoBadge} ${p.active ? styles.promoOn : styles.promoOff}`}>{p.active ? 'Active' : 'Inactive'}</span>
          </div>
          <p className={styles.promoDesc}>{p.description}</p>
          <p className={styles.promoMeta}>
            {p.type === 'percent' && `${p.value}% off`}
            {p.type === 'flat'    && `₹${p.value} off`}
            {p.type === 'delivery'&& 'Free delivery'}
            {p.minOrder > 0 && ` · Min ₹${p.minOrder}`}
          </p>
          <div className={styles.promoActions}>
            <button className={p.active ? styles.deactivateBtn : styles.activateBtn}
              onClick={() => onToggle(p.code || p.id, !p.active)}>
              {p.active ? 'Deactivate' : 'Activate'}
            </button>
            <button className={styles.deleteBtn} onClick={() => { if(window.confirm('Delete promo?')) onDelete(p.code || p.id); }}>🗑️</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Users ───────────────────────────────────────────────────────────────── */

function Users({ users }) {
  const ROLE_COLOR = { customer:'#dbeafe', restaurant:'#fef3c7', delivery:'#d1fae5', admin:'#fce7f3' };
  return (
    <table className={styles.table}>
      <thead><tr><th>Avatar</th><th>Name</th><th>Email</th><th>Role</th><th>Phone</th><th>Wallet</th></tr></thead>
      <tbody>
        {users.map(u => (
          <tr key={u.id}>
            <td style={{fontSize:24}}>{u.avatar}</td>
            <td>{u.name}</td>
            <td className={styles.mono}>{u.email}</td>
            <td><span className={styles.statusPill} style={{ background: ROLE_COLOR[u.role] || '#f0f0f0' }}>{u.role}</span></td>
            <td>{u.phone || '—'}</td>
            <td>{u.wallet > 0 ? `₹${u.wallet}` : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ── Settings ────────────────────────────────────────────────────────────── */

function Settings({ config, onSave }) {
  const [form, setForm] = useState({
    platformFee: 10,
    gstPercent: 5,
    packagingFee: 15,
    defaultDeliveryFee: 29,
    defaultMinOrder: 149,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (config) {
      setForm({
        platformFee: config.platformFee ?? 10,
        gstPercent: config.gstPercent ?? 5,
        packagingFee: config.packagingFee ?? 15,
        defaultDeliveryFee: config.defaultDeliveryFee ?? 29,
        defaultMinOrder: config.defaultMinOrder ?? 149,
      });
    }
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className={styles.settingsCard}>
      <h3>Fee & Platform Configuration</h3>
      <p className={styles.settingsSub}>These values are applied to all orders across the platform.</p>
      <div className={styles.formGrid}>
        <label>Platform Fee (₹)
          <input type="number" min="0" value={form.platformFee} onChange={e => setForm({...form, platformFee:+e.target.value})} />
          <small>Flat fee added to every order</small>
        </label>
        <label>GST (%)
          <input type="number" min="0" max="100" step="0.1" value={form.gstPercent} onChange={e => setForm({...form, gstPercent:+e.target.value})} />
          <small>Percentage of subtotal</small>
        </label>
        <label>Packaging Fee (₹)
          <input type="number" min="0" value={form.packagingFee} onChange={e => setForm({...form, packagingFee:+e.target.value})} />
          <small>Per order packaging charge</small>
        </label>
        <label>Default Delivery Fee (₹)
          <input type="number" min="0" value={form.defaultDeliveryFee} onChange={e => setForm({...form, defaultDeliveryFee:+e.target.value})} />
          <small>Used when restaurant has no own delivery</small>
        </label>
        <label className={styles.fullWidth}>Default Min Order (₹)
          <input type="number" min="0" value={form.defaultMinOrder} onChange={e => setForm({...form, defaultMinOrder:+e.target.value})} />
          <small>Default minimum order value for new restaurants</small>
        </label>
      </div>
      <div className={styles.settingsActions}>
        {saved && <span className={styles.savedBadge}>✅ Saved successfully</span>}
        <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

/* ── Add Restaurant Modal ────────────────────────────────────────────────── */

function AddRestaurantModal({ onClose, onSave, initial }) {
  const [form, setForm] = useState(initial || {
    name:'', cuisine:'', address:'', deliveryFee:29, minOrder:149,
    deliveryTime:'30-45 min', rating:4.0, image:'', offer:'', isOpen:true, isFeatured:false, tags:[]
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name || !form.cuisine || !form.address) return alert('Name, cuisine and address are required');
    setSaving(true);
    await onSave({ ...form, reviewCount: form.reviewCount || 0, menu: form.menu || [] });
    setSaving(false);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>{initial ? 'Edit Restaurant' : 'Add New Restaurant'}</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formGrid}>
            <label>Restaurant Name *<input value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="e.g. Spice Garden" /></label>
            <label>Cuisine *<input value={form.cuisine} onChange={e => setForm({...form, cuisine:e.target.value})} placeholder="e.g. North Indian" /></label>
            <label>Address *<input value={form.address} onChange={e => setForm({...form, address:e.target.value})} placeholder="Full address" /></label>
            <label>Delivery Fee (₹)<input type="number" value={form.deliveryFee} onChange={e => setForm({...form, deliveryFee:+e.target.value})} /></label>
            <label>Min Order (₹)<input type="number" value={form.minOrder} onChange={e => setForm({...form, minOrder:+e.target.value})} /></label>
            <label>Delivery Time<input value={form.deliveryTime} onChange={e => setForm({...form, deliveryTime:e.target.value})} placeholder="e.g. 30-45 min" /></label>
            <label>Rating<input type="number" step="0.1" min="1" max="5" value={form.rating} onChange={e => setForm({...form, rating:+e.target.value})} /></label>
            <label>Image URL<input value={form.image} onChange={e => setForm({...form, image:e.target.value})} placeholder="https://..." /></label>
            <label className={styles.fullWidth}>Offer Text<input value={form.offer || ''} onChange={e => setForm({...form, offer:e.target.value})} placeholder="e.g. 50% off on first order" /></label>
            <label className={styles.checkLabel}>
              <input type="checkbox" checked={form.isOpen} onChange={e => setForm({...form, isOpen:e.target.checked})} />
              Currently Open
            </label>
            <label className={styles.checkLabel}>
              <input type="checkbox" checked={form.isFeatured} onChange={e => setForm({...form, isFeatured:e.target.checked})} />
              Featured Restaurant
            </label>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Restaurant'}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Add Promo Modal ─────────────────────────────────────────────────────── */

function AddPromoModal({ onClose, onSave }) {
  const [form, setForm] = useState({ code:'', type:'percent', value:10, minOrder:0, description:'', active:true });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.code || !form.description) return alert('Code and description are required');
    setSaving(true);
    await onSave({ ...form, code: form.code.toUpperCase() });
    setSaving(false);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal} style={{maxWidth:480}}>
        <div className={styles.modalHeader}>
          <h3>Add Promo Code</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formGrid}>
            <label>Promo Code *<input value={form.code} onChange={e => setForm({...form, code:e.target.value.toUpperCase()})} placeholder="e.g. SAVE30" /></label>
            <label>Type
              <select value={form.type} onChange={e => setForm({...form, type:e.target.value})}>
                <option value="percent">Percentage off</option>
                <option value="flat">Flat amount off</option>
                <option value="delivery">Free delivery</option>
              </select>
            </label>
            {form.type !== 'delivery' && (
              <label>Value ({form.type === 'percent' ? '%' : '₹'})<input type="number" value={form.value} onChange={e => setForm({...form, value:+e.target.value})} /></label>
            )}
            <label>Min Order (₹)<input type="number" value={form.minOrder} onChange={e => setForm({...form, minOrder:+e.target.value})} /></label>
            <label className={styles.fullWidth}>Description *<input value={form.description} onChange={e => setForm({...form, description:e.target.value})} placeholder="e.g. 30% off on orders above ₹199" /></label>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Add Promo'}</button>
        </div>
      </div>
    </div>
  );
}

