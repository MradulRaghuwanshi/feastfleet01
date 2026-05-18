import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  listenToAllOrders, getAllUsers, getRestaurants, getAllPromos,
  addRestaurant, updateRestaurant, deleteRestaurant,
  addPromo, updatePromo, deletePromo,
  getAppConfig, updateAppConfig,
  addUser,
  updateUserCredentials,
  normalizeOrderStatus,
  ORDER_STATUS,
  reassignDeliveryPartner
} from '../../firebase/services';
import DeliveryPartners from './DeliveryPartners';
import styles from './Dashboard.module.css';
import { fileToDataUrl } from '../../utils/imageFile';
import * as XLSX from 'xlsx';

// Generate a simple email and password for new accounts when admin doesn't provide them.
function generateCredentials(name = 'user') {
  const slug = String(name || 'user').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'user';
  const short = Date.now().toString().slice(-4) + Math.random().toString(36).slice(2,6);
  const email = `${slug}-${short}@feastfleet.local`;
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*()';
  let pw = '';
  for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return { email, password: pw };
}

const TABS = ['Overview', 'Orders', 'Restaurants', 'Promos', 'Users', 'Delivery Partners', 'Wallets', 'Settlements', 'Settings'];

function tabIcon(t) {
  return { Overview:'📊', Orders:'📦', Restaurants:'🍽️', Promos:'🏷️', Users:'👥', 'Delivery Partners':'🚴', Wallets:'🪙', Settlements:'₹', Settings:'⚙️' }[t];
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
  const activeOrders   = orders.filter(o => normalizeOrderStatus(o.status) !== ORDER_STATUS.DELIVERED).length;
  const totalCustomers = users.filter(u => u.role === 'customer').length;
  const deliveredCount = orders.filter(o => normalizeOrderStatus(o.status) === ORDER_STATUS.DELIVERED).length;

  if (loading) return (
    <div className={styles.loadingPage}>
      <div className={styles.spinner} />
      <p>Loading Admin Panel...</p>
    </div>
  );

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <img src="/logo.svg" alt="FeastFleet" className={styles.brandLogo} />
          <div>FeastFleet<span>Admin</span></div>
        </div>
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
        {tab === 'Orders'       && <Orders orders={orders} users={users} adminId={user.id} />}
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
        {tab === 'Users'        && <Users users={users} adminId={user.id} onCredentialsSaved={loadData} />}
        {tab === 'Delivery Partners' && <DeliveryPartners users={users} orders={orders} adminId={user.id} onUpdate={loadData} />}
        {tab === 'Wallets'      && <Wallets users={users} orders={orders} />}
        {tab === 'Settlements'  && <Settlements orders={orders} />}
        {tab === 'Settings'     && <Settings config={appConfig} onSave={async (data) => {
          await updateAppConfig(data, user.id);
          setAppConfig({ ...(appConfig || {}), ...data });
        }} />}
      </main>

      {showAddRestaurant && (
        <AddRestaurantModal
          onClose={() => setShowAddRestaurant(false)}
          onSave={async (data) => {
            const loginEmail = String(data.loginEmail || '').trim().toLowerCase();
            const loginPassword = String(data.loginPassword || '').trim();
            const restaurantId = await addRestaurant(data);

            if (loginEmail) {
              const existing = users.find(u => u.role === 'restaurant' && (u.restaurantId === restaurantId || String(u.email || '').toLowerCase() === loginEmail));
              const restaurantUserId = existing?.id || `rst_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

              if (!existing) {
                await addUser(restaurantUserId, {
                  name: `${data.name} Owner`,
                  email: loginEmail,
                  role: 'restaurant',
                  restaurantId,
                  wallet: 0,
                  favourites: [],
                  avatar: '🍽️',
                  createdAt: new Date().toISOString(),
                });
              }

              await updateUserCredentials(restaurantUserId, {
                adminId: user.id,
                email: loginEmail,
                username: loginEmail,
                ...(loginPassword ? { password: loginPassword } : {}),
              });
            }

            setShowAddRestaurant(false);
            loadData();
          }}
        />
      )}
      {editRestaurant && (
        <AddRestaurantModal
          initial={editRestaurant}
          onClose={() => setEditRestaurant(null)}
          onSave={async (data) => {
            const loginEmail = String(data.loginEmail || '').trim().toLowerCase();
            const loginPassword = String(data.loginPassword || '').trim();
            await updateRestaurant(editRestaurant.id, data);

            if (loginEmail) {
              const existing = users.find(u => u.role === 'restaurant' && (u.restaurantId === editRestaurant.id || String(u.email || '').toLowerCase() === loginEmail));
              const restaurantUserId = existing?.id || `rst_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

              if (!existing) {
                await addUser(restaurantUserId, {
                  name: `${data.name || editRestaurant.name} Owner`,
                  email: loginEmail,
                  role: 'restaurant',
                  restaurantId: editRestaurant.id,
                  wallet: 0,
                  favourites: [],
                  avatar: '🍽️',
                  createdAt: new Date().toISOString(),
                });
              }

              await updateUserCredentials(restaurantUserId, {
                adminId: user.id,
                email: loginEmail,
                username: loginEmail,
                ...(loginPassword ? { password: loginPassword } : {}),
              });
            }

            setEditRestaurant(null);
            loadData();
          }}
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
  const STATUS_COLOR = {
    [ORDER_STATUS.PLACED]:'#dbeafe',
    [ORDER_STATUS.RESTAURANT_ACCEPTED]:'#fef3c7',
    [ORDER_STATUS.DELIVERY_ASSIGNED]:'#ede9fe',
    [ORDER_STATUS.ON_THE_WAY]:'#ffedd5',
    [ORDER_STATUS.DELIVERED]:'#d1fae5',
  };

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
                <td><span className={styles.statusPill} style={{ background: STATUS_COLOR[normalizeOrderStatus(o.status)] || '#f0f0f0' }}>{normalizeOrderStatus(o.status)}</span></td>
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

function Orders({ orders, users, adminId }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [updating, setUpdating] = useState('');
  const deliveryPartners = users.filter(u => u.role === 'delivery');
  const STATUS_COLOR = {
    [ORDER_STATUS.PLACED]:'#dbeafe',
    [ORDER_STATUS.RESTAURANT_ACCEPTED]:'#fef3c7',
    [ORDER_STATUS.DELIVERY_ASSIGNED]:'#ede9fe',
    [ORDER_STATUS.ON_THE_WAY]:'#ffedd5',
    [ORDER_STATUS.DELIVERED]:'#d1fae5',
  };
  const STATUSES = ['All', ORDER_STATUS.PLACED, ORDER_STATUS.RESTAURANT_ACCEPTED, ORDER_STATUS.DELIVERY_ASSIGNED, ORDER_STATUS.ON_THE_WAY, ORDER_STATUS.DELIVERED];

  const filtered = orders.filter(o => {
    const matchSearch = !search || o.customerName?.toLowerCase().includes(search.toLowerCase()) || o.restaurantName?.toLowerCase().includes(search.toLowerCase()) || o.id?.includes(search);
    const matchFilter = filter === 'All' || normalizeOrderStatus(o.status) === filter;
    return matchSearch && matchFilter;
  });

  const handleReassign = async (order, agentId) => {
    setUpdating(order.id);
    try {
      const agent = deliveryPartners.find(p => p.id === agentId) || null;
      await reassignDeliveryPartner(order.id, agent, adminId);
    } catch (error) {
      alert(error.message || 'Unable to reassign order');
    } finally {
      setUpdating('');
    }
  };

  return (
    <div>
      <div className={styles.filterBar}>
        <input className={styles.searchInput} placeholder="Search by customer, restaurant, order ID..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className={styles.chips}>
          {STATUSES.map(s => <button key={s} className={`${styles.chip} ${filter === s ? styles.chipActive : ''}`} onClick={() => setFilter(s)}>{s}</button>)}
        </div>
      </div>
      <table className={styles.table}>
        <thead><tr><th>Order ID</th><th>Customer</th><th>Restaurant</th><th>Items</th><th>Total</th><th>Promo</th><th>Status</th><th>Delivery Partner</th><th>Date</th></tr></thead>
        <tbody>
          {filtered.map(o => {
            const status = normalizeOrderStatus(o.status);
            return (
              <tr key={o.id}>
                <td className={styles.mono}>#{o.id?.slice(0,8)?.toUpperCase()}</td>
                <td>{o.customerName}</td>
                <td>{o.restaurantName}</td>
                <td>{o.items?.length} items</td>
                <td>₹{o.total}</td>
                <td>{o.promoCode ? <span className={styles.promoTag}>{o.promoCode}</span> : '—'}</td>
                <td><span className={styles.statusPill} style={{ background: STATUS_COLOR[status] || '#f0f0f0' }}>{status}</span></td>
                <td>
                  <select
                    className={styles.assignSelect}
                    value={o.deliveryAgentId || ''}
                    disabled={updating === o.id || status === ORDER_STATUS.DELIVERED}
                    onChange={e => handleReassign(o, e.target.value)}
                  >
                    <option value="">Broadcast / Unassigned</option>
                    {deliveryPartners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </td>
                <td className={styles.dateCell}>{o.placedAt ? new Date(o.placedAt?.seconds ? o.placedAt.seconds*1000 : o.placedAt).toLocaleDateString('en-IN') : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {filtered.length === 0 && <p className={styles.empty}>No orders found</p>}
    </div>
  );
}

/* ── Restaurants ─────────────────────────────────────────────────────────── */

function Restaurants({ restaurants, onEdit, onDelete }) {
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState(null);
  const csvFileInputRef = React.useRef(null);

  const exportRestaurantsExcel = async () => {
    if (!restaurants || restaurants.length === 0) return alert('No restaurants to export');
    const rows = restaurants.map(r => ({
      id: r.id,
      name: r.name,
      cuisine: r.cuisine,
      address: r.address,
      deliveryFee: r.deliveryFee,
      minOrder: r.minOrder,
      deliveryTime: r.deliveryTime,
      rating: r.rating,
      image: r.image || r.imageUrl || '',
      offer: r.offer || '',
      isOpen: !!r.isOpen,
      isFeatured: !!r.isFeatured,
      tags: Array.isArray(r.tags) ? r.tags.join('|') : (r.tags || ''),
      loginEmail: r.loginEmail || ''
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Restaurants');
    XLSX.writeFile(wb, 'restaurants.xlsx');
  };

  const handleRestaurantsFileSelect = async (file) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) return alert('Please upload an Excel file (.xlsx or .xls)');
    setCsvUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const workbook = XLSX.read(e.target.result, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        // rows should contain restaurant objects; create or update accordingly
        for (const row of rows) {
          const payload = {
            name: row.name || row.Name || '',
            cuisine: row.cuisine || row.Cuisine || '',
            address: row.address || row.Address || '',
            deliveryFee: Number(row.deliveryFee || row.DeliveryFee || 0) || 0,
            minOrder: Number(row.minOrder || row.MinOrder || 0) || 0,
            deliveryTime: row.deliveryTime || row.DeliveryTime || '',
            rating: Number(row.rating || row.Rating || 4) || 4,
            image: row.image || row.Image || '',
            offer: row.offer || row.Offer || '',
            isOpen: String(row.isOpen || row.IsOpen || '').toLowerCase() === 'true' || row.isOpen === true,
            isFeatured: String(row.isFeatured || row.IsFeatured || '').toLowerCase() === 'true' || row.isFeatured === true,
            tags: String(row.tags || row.Tags || '').split('|').map(s => s.trim()).filter(Boolean),
          };
          // if id provided, update, else create
          if (row.id || row.ID) {
            const id = row.id || row.ID;
            await updateRestaurant(id, payload);
          } else {
            const newId = await addRestaurant(payload);
            // if excel includes loginEmail and optional password, create user/credentials
            const loginEmail = String(row.loginEmail || row.LoginEmail || '').trim();
            const loginPassword = String(row.loginPassword || row.LoginPassword || '').trim();
            if (loginEmail) {
              const restaurantUserId = `rst_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
              await addUser(restaurantUserId, {
                name: `${payload.name} Owner`,
                email: loginEmail,
                role: 'restaurant',
                restaurantId: newId,
                wallet: 0,
                favourites: [],
                avatar: '🍽️',
                createdAt: new Date().toISOString(),
              });
              await updateUserCredentials(restaurantUserId, { adminId: user.id, email: loginEmail, username: loginEmail, ...(loginPassword ? { password: loginPassword } : {}) });
            }
          }
        }
        alert('Restaurants import complete');
        loadData();
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      alert('Error importing restaurants: ' + (err.message || err));
    } finally {
      setCsvUploading(false);
      if (csvFileInputRef.current) csvFileInputRef.current.value = '';
    }
  };

  const handleCSVFileSelect = async (file) => {
    if (!selectedRestaurant) {
      alert('Please select a restaurant first');
      return;
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      alert('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    setCsvUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error('The Excel file does not contain any sheets');
        }

        const sheet = workbook.Sheets[firstSheetName];
        const excelRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        const response = await fetch('/api/menu-bulk/import-csv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ restaurantId: selectedRestaurant.id, csvData: excelRows })
        });

        const result = await response.json();
        setCsvResult(result);
      } catch (error) {
        alert('Error processing Excel file: ' + error.message);
      } finally {
        setCsvUploading(false);
        if (csvFileInputRef.current) csvFileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = async () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['name', 'description', 'price', 'category', 'available', 'veg', 'bestseller', 'spicy', 'imageUrl', 'prepTime'],
      ['Chicken Biryani', 'Fragrant rice with spices and tender chicken', 299, 'Biryani', 'yes', 'no', 'yes', 'yes', '', 30],
      ['Paneer Butter Masala', 'Cottage cheese in rich creamy tomato sauce', 249, 'Curries', 'yes', 'yes', 'yes', 'no', '', 25],
      ['Garlic Naan', 'Soft naan bread with garlic', 40, 'Breads', 'yes', 'yes', 'no', 'no', '', 5]
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Menu Template');
    XLSX.writeFile(workbook, 'menu-template.xlsx');
  };

  return (
    <div>
      {selectedRestaurant && (
        <div className={styles.csvSection}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <h3>Bulk Menu Upload for {selectedRestaurant.name}</h3>
            <button className={styles.addBtn} onClick={() => setSelectedRestaurant(null)} style={{ marginLeft: 'auto' }}>✕ Done</button>
          </div>
          <div className={styles.csvActions}>
            <button className={styles.csvDownloadBtn} onClick={downloadTemplate}>📥 Download Excel Template</button>
            <button className={styles.csvDownloadBtn} onClick={exportRestaurantsExcel} style={{ marginLeft: 8 }}>📥 Export Restaurants</button>
            <label className={styles.csvUploadBtn} style={{ marginLeft: 8 }}>
              📤 Upload Restaurants Excel
              <input ref={csvFileInputRef} type="file" accept=".xlsx,.xls" className={styles.csvInput} onChange={e => e.target.files?.[0] && handleRestaurantsFileSelect(e.target.files[0])} disabled={csvUploading} />
            </label>
          </div>
          {csvUploading && (
            <div className={styles.csvProgress}>
              <div className={styles.csvProgressBar}><div className={styles.csvProgressFill} style={{ width: '100%' }}></div></div>
              <p style={{ textAlign: 'center', color: '#888', fontSize: '12px' }}>Uploading Excel file...</p>
            </div>
          )}
          {csvResult && (
            <div className={styles.csvResults}>
              <p className={styles.csvSuccess}>✅ Success: {csvResult.success} items imported</p>
              {csvResult.failed > 0 && <p className={styles.csvFailed}>❌ Failed: {csvResult.failed} items</p>}
              {csvResult.errors?.length > 0 && (
                <ul className={styles.csvErrors}>
                  {csvResult.errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                  {csvResult.errors.length > 5 && <li>... and {csvResult.errors.length - 5} more</li>}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
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
              <button className={styles.editBtn} onClick={() => setSelectedRestaurant(r)}>📊 Excel Menu</button>
              <button className={styles.deleteBtn} onClick={() => { if (window.confirm(`Delete ${r.name}?`)) onDelete(r.id); }}>🗑️ Delete</button>
            </div>
          </div>
        ))}
      </div>
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

function Users({ users, adminId, onCredentialsSaved }) {
  const ROLE_COLOR = { customer:'#dbeafe', restaurant:'#fef3c7', delivery:'#d1fae5', admin:'#fce7f3' };
  const [credentialUser, setCredentialUser] = useState(null);
  return (
    <>
      <table className={styles.table}>
        <thead><tr><th>Avatar</th><th>Name</th><th>Username / Email</th><th>Role</th><th>Phone</th><th>Wallet</th><th>Actions</th></tr></thead>
        <tbody>
          {users.map(u => {
            const canEditCredentials = ['restaurant', 'delivery'].includes(u.role);
            return (
              <tr key={u.id}>
                <td style={{fontSize:24}}>{u.avatar}</td>
                <td>{u.name}</td>
                <td className={styles.mono}>{u.email}</td>
                <td><span className={styles.statusPill} style={{ background: ROLE_COLOR[u.role] || '#f0f0f0' }}>{u.role}</span></td>
                <td>{u.phone || '—'}</td>
                <td>{u.wallet > 0 ? `₹${u.wallet}` : '—'}</td>
                <td>
                  {canEditCredentials ? (
                    <button className={styles.editBtn} onClick={() => setCredentialUser(u)}>Set Login</button>
                  ) : (
                    <span className={styles.dateCell}>Managed by user</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {credentialUser && (
        <CredentialsModal
          user={credentialUser}
          adminId={adminId}
          onClose={() => setCredentialUser(null)}
          onSave={async (data) => {
            await updateUserCredentials(credentialUser.id, data);
            setCredentialUser(null);
            await onCredentialsSaved();
          }}
        />
      )}
    </>
  );
}

function CredentialsModal({ user, adminId, onClose, onSave }) {
  const [form, setForm] = useState({
    email: user.email || '',
    password: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    const email = form.email.trim().toLowerCase();
    if (!email) return setError('Username/email is required.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Use a valid email address as the username.');
    if (form.password && form.password.length < 6) return setError('Password must be at least 6 characters.');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');

    setSaving(true);
    try {
      await onSave({
        adminId,
        email,
        username: email,
        ...(form.password ? { password: form.password } : {}),
      });
    } catch (err) {
      setError(err.message || 'Unable to update login credentials.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal} style={{ maxWidth: 460 }}>
        <div className={styles.modalHeader}>
          <h3>Set Login - {user.name}</h3>
          <button onClick={onClose}>x</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formGrid}>
            <label className={styles.fullWidth}>Username / Email *
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="owner@example.com"
              />
            </label>
            <label>New Password
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Leave blank to keep current"
              />
            </label>
            <label>Confirm Password
              <input
                type="password"
                value={form.confirmPassword}
                onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="Repeat password"
              />
            </label>
          </div>
          <p className={styles.settingsSub}>Applies only to this {user.role === 'restaurant' ? 'restaurant' : 'delivery partner'} account.</p>
          {error && <p className={styles.formError}>{error}</p>}
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Login'}</button>
        </div>
      </div>
    </div>
  );
}

function Wallets({ users, orders }) {
  const customers = users.filter(u => u.role === 'customer');
  const totalCoins = customers.reduce((sum, u) => sum + Number(u.feastCoins ?? u.wallet ?? 0), 0);
  const earned = orders.reduce((sum, o) => sum + Number(o.feastCoinsEarned || 0), 0);
  const redeemed = orders.reduce((sum, o) => sum + Number(o.feastCoinRedemption || 0), 0);

  return (
    <div>
      <div className={styles.statsGrid}>
        <StatCard icon="🪙" label="Coins in Circulation" value={totalCoins.toFixed(0)} color="#f59e0b" />
        <StatCard icon="+" label="Coins Earned" value={earned.toFixed(0)} color="#10b981" />
        <StatCard icon="₹" label="Coins Redeemed" value={`₹${redeemed.toFixed(0)}`} color="#ef4444" />
        <StatCard icon="👥" label="Wallet Customers" value={customers.length} color="#3b82f6" />
      </div>
      <table className={styles.table}>
        <thead><tr><th>Customer</th><th>Email</th><th>Current Balance</th><th>Earned From Orders</th><th>Redeemed</th></tr></thead>
        <tbody>
          {customers.map(customer => {
            const customerOrders = orders.filter(o => o.customerId === customer.id);
            return (
              <tr key={customer.id}>
                <td>{customer.name}</td>
                <td className={styles.mono}>{customer.email}</td>
                <td>{Number(customer.feastCoins ?? customer.wallet ?? 0).toFixed(0)} coins</td>
                <td>{customerOrders.reduce((s, o) => s + Number(o.feastCoinsEarned || 0), 0)} coins</td>
                <td>₹{customerOrders.reduce((s, o) => s + Number(o.feastCoinRedemption || 0), 0).toFixed(0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Settlements({ orders }) {
  const delivered = orders.filter(o => normalizeOrderStatus(o.status) === ORDER_STATUS.DELIVERED);
  const gross = delivered.reduce((sum, o) => sum + Number(o.subtotal || 0), 0);
  const commission = delivered.reduce((sum, o) => sum + Number(o.platformCommission || ((o.subtotal || 0) * 0.15)), 0);
  const net = delivered.reduce((sum, o) => sum + Number(o.netSettlementAmount || ((o.subtotal || 0) * 0.85)), 0);
  const deliveryEarnings = delivered.reduce((sum, o) => sum + Number(o.deliveryEarningAmount || (o.deliveryAgentId ? 40 : 0)), 0);

  return (
    <div>
      <div className={styles.statsGrid}>
        <StatCard icon="₹" label="Gross Food" value={`₹${gross.toFixed(0)}`} color="#3b82f6" />
        <StatCard icon="%" label="Platform Commission" value={`₹${commission.toFixed(0)}`} color="#ef4444" />
        <StatCard icon="🏦" label="Restaurant Payouts" value={`₹${net.toFixed(0)}`} color="#10b981" />
        <StatCard icon="🚴" label="Delivery Earnings" value={`₹${deliveryEarnings.toFixed(0)}`} color="#f59e0b" />
      </div>
      <table className={styles.table}>
        <thead><tr><th>Order</th><th>Restaurant</th><th>Gross</th><th>Commission</th><th>Net Settlement</th><th>Status</th></tr></thead>
        <tbody>
          {delivered.map(o => {
            const grossAmount = Number(o.subtotal || 0);
            const platformCommission = Number(o.platformCommission || (grossAmount * 0.15));
            const netSettlement = Number(o.netSettlementAmount || (grossAmount - platformCommission));
            return (
              <tr key={o.id}>
                <td className={styles.mono}>#{o.id?.slice(0,8)?.toUpperCase()}</td>
                <td>{o.restaurantName}</td>
                <td>₹{grossAmount.toFixed(0)}</td>
                <td>₹{platformCommission.toFixed(0)}</td>
                <td>₹{netSettlement.toFixed(0)}</td>
                <td><span className={styles.statusPill}>{o.settlementStatus || 'pending'}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Settings ────────────────────────────────────────────────────────────── */

function Settings({ config, onSave }) {
  const [form, setForm] = useState({
    platformFee: 8,
    packagingFee: 10,
    defaultDeliveryFee: 30,
    defaultMinOrder: 149,
  });
  const [categoryInput, setCategoryInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (config) {
      setForm({
        platformFee: config.platformFee ?? 8,
        packagingFee: config.packagingFee ?? 10,
        defaultDeliveryFee: config.defaultDeliveryFee ?? 30,
        defaultMinOrder: config.defaultMinOrder ?? 149,
        cuisines: Array.isArray(config.cuisines)
          ? config.cuisines
          : ['Italian', 'American', 'Japanese', 'Mexican', 'Healthy'],
      });
    }
  }, [config]);

  const cuisines = form.cuisines || [];

  const addCuisine = () => {
    const next = categoryInput.trim();
    if (!next) return;
    if (cuisines.some(item => item.toLowerCase() === next.toLowerCase())) {
      setCategoryInput('');
      return;
    }
    setForm({ ...form, cuisines: [...cuisines, next] });
    setCategoryInput('');
  };

  const removeCuisine = (itemToRemove) => {
    setForm({ ...form, cuisines: cuisines.filter(item => item !== itemToRemove) });
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({ ...form, cuisines, gstPercent: 0 });
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
        <div className={styles.fullWidth}>
          <label>Cuisine Categories</label>
          <div className={styles.categoryEditor}>
            <input
              type="text"
              value={categoryInput}
              onChange={e => setCategoryInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCuisine(); } }}
              placeholder="Add a cuisine category"
            />
            <button type="button" className={styles.addBtn} onClick={addCuisine}>Add</button>
          </div>
          <div className={styles.categoryChips}>
            {cuisines.map(item => (
              <span key={item} className={styles.categoryChip}>
                {item}
                <button type="button" onClick={() => removeCuisine(item)} aria-label={`Delete ${item}`}>×</button>
              </span>
            ))}
          </div>
          <small>These categories appear on the customer home page search filters.</small>
        </div>
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
    deliveryTime:'30-45 min', rating:4.0, image:'', offer:'', isOpen:true, isFeatured:false, tags:[], loginEmail:'', loginPassword:'', confirmLoginPassword:''
  });
  const [saving, setSaving] = useState(false);

  const handleImageFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setForm(prev => ({ ...prev, image: dataUrl }));
    } catch (error) {
      alert(error.message || 'Unable to load image');
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.cuisine || !form.address) return alert('Name, cuisine and address are required');
    const loginEmail = String(form.loginEmail || '').trim();
    if (form.loginPassword && form.loginPassword.length < 6) return alert('Restaurant login password must be at least 6 characters');
    if (form.loginPassword !== form.confirmLoginPassword) return alert('Restaurant login passwords do not match');
    if (form.loginPassword && !loginEmail) return alert('Please enter restaurant login username/email');

    // If admin didn't provide credentials, auto-generate and show them once.
    let emailToUse = loginEmail;
    let passwordToUse = String(form.loginPassword || '').trim();
    if (!emailToUse) {
      const creds = generateCredentials(form.name);
      emailToUse = creds.email;
      passwordToUse = creds.password;
      // show generated credentials so admin can copy/save them
      // eslint-disable-next-line no-alert
      alert(`Generated login for ${form.name}\nEmail: ${emailToUse}\nPassword: ${passwordToUse}`);
    }

    setSaving(true);
    await onSave({
      ...form,
      loginEmail: emailToUse,
      loginPassword: passwordToUse,
      reviewCount: form.reviewCount || 0,
      menu: form.menu || [],
    });
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
            <label className={styles.fullWidth}>Restaurant Image
              <input type="file" accept="image/*" onChange={handleImageFileChange} />
              {form.image && <img src={form.image} alt="Restaurant preview" style={{ marginTop: 8, width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 10 }} />}
            </label>
            <label className={styles.fullWidth}>Offer Text<input value={form.offer || ''} onChange={e => setForm({...form, offer:e.target.value})} placeholder="e.g. 50% off on first order" /></label>
            <label>Restaurant Login (Email/User ID)
              <input type="email" value={form.loginEmail || ''} onChange={e => setForm({...form, loginEmail:e.target.value})} placeholder="owner@example.com" />
            </label>
            <label>Restaurant Login Password
              <input type="password" value={form.loginPassword || ''} onChange={e => setForm({...form, loginPassword:e.target.value})} placeholder="Set or update password" />
            </label>
            <label>Confirm Login Password
              <input type="password" value={form.confirmLoginPassword || ''} onChange={e => setForm({...form, confirmLoginPassword:e.target.value})} placeholder="Repeat password" />
            </label>
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
