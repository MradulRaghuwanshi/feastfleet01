import React, { useState } from 'react';
import { updateUser, addUser } from '../../firebase/services';
import styles from './Dashboard.module.css';

export default function DeliveryPartners({ users, orders, onUpdate }) {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editPartner, setEditPartner] = useState(null);
  const [viewPartner, setViewPartner] = useState(null);
  const [paymentPartner, setPaymentPartner] = useState(null);

  const partners = users.filter(u => u.role === 'delivery');

  const filtered = partners.filter(p =>
    !search ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.phone?.includes(search) ||
    p.vehicle?.toLowerCase().includes(search.toLowerCase())
  );

  const today = new Date().toDateString();
  const todayDeliveries = orders.filter(o =>
    o.status === 'Delivered' &&
    new Date(o.placedAt?.seconds ? o.placedAt.seconds*1000 : o.placedAt).toDateString() === today
  );

  const totalPending = partners.reduce((sum, p) => {
    const partnerOrders = orders.filter(o => o.deliveryAgentId === p.id && o.status === 'Delivered');
    const earnings = partnerOrders.length * (p.perDeliveryRate || 40);
    const paid = p.totalPaid || 0;
    return sum + Math.max(0, earnings - paid);
  }, 0);

  const totalPaid = partners.reduce((sum, p) => sum + (p.totalPaid || 0), 0);

  return (
    <div>
      <div className={styles.statsGrid}>
        <StatCard icon="🚴" label="Total Partners" value={partners.length} color="#3b82f6" />
        <StatCard icon="📦" label="Today's Deliveries" value={todayDeliveries.length} color="#10b981" />
        <StatCard icon="💰" label="Pending Payouts" value={`₹${totalPending.toFixed(0)}`} color="#f59e0b" />
        <StatCard icon="✅" label="Total Paid" value={`₹${totalPaid.toFixed(0)}`} color="#7c3aed" />
      </div>

      <div className={styles.filterBar} style={{ marginTop: 20 }}>
        <input className={styles.searchInput} placeholder="Search by name, phone, or vehicle..." value={search} onChange={e => setSearch(e.target.value)} />
        <button className={styles.addBtn} onClick={() => setShowAddModal(true)}>+ Add Partner</button>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Photo</th><th>Name</th><th>Phone</th><th>Vehicle</th>
            <th>License</th><th>Aadhaar</th><th>Today</th><th>Total</th>
            <th>Earnings</th><th>Paid</th><th>Balance</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(p => {
            const pOrders = orders.filter(o => o.deliveryAgentId === p.id && o.status === 'Delivered');
            const todayCount = pOrders.filter(o => new Date(o.placedAt?.seconds ? o.placedAt.seconds*1000 : o.placedAt).toDateString() === today).length;
            const totalCount = pOrders.length;
            const rate = p.perDeliveryRate || 40;
            const earnings = totalCount * rate;
            const paid = p.totalPaid || 0;
            const balance = Math.max(0, earnings - paid);
            return (
              <tr key={p.id}>
                <td>{p.photoUrl ? <img src={p.photoUrl} alt={p.name} className={styles.partnerThumb} /> : <span style={{fontSize:24}}>{p.avatar || '🚴'}</span>}</td>
                <td><strong>{p.name}</strong></td>
                <td>{p.phone || '—'}</td>
                <td>{p.vehicle || '—'}</td>
                <td>{p.licenseNumber || '—'}</td>
                <td>{p.aadhaarNumber ? `XXXX-${p.aadhaarNumber.slice(-4)}` : '—'}</td>
                <td><span className={styles.badgeGreen}>{todayCount}</span></td>
                <td>{totalCount}</td>
                <td>₹{earnings.toFixed(0)}</td>
                <td>₹{paid.toFixed(0)}</td>
                <td><span className={`${styles.balanceBadge} ${balance > 0 ? styles.balanceDue : styles.balanceClear}`}>₹{balance.toFixed(0)}</span></td>
                <td>
                  <div className={styles.actionBtns}>
                    <button className={styles.viewBtn} onClick={() => setViewPartner(p)} title="View">👁️</button>
                    <button className={styles.editBtn} onClick={() => setEditPartner(p)} title="Edit">✏️</button>
                    <button className={styles.payBtn} onClick={() => setPaymentPartner(p)} title="Pay">💰</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {filtered.length === 0 && <p className={styles.empty}>No delivery partners found</p>}

      {(showAddModal || editPartner) && (
        <PartnerModal initial={editPartner} onClose={() => { setShowAddModal(false); setEditPartner(null); }}
          onSave={async (data) => {
            if (editPartner) { await updateUser(editPartner.id, data); }
            else {
              const id = 'dp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
              await addUser(id, { ...data, role: 'delivery', wallet: 0, favourites: [], createdAt: new Date().toISOString() });
            }
            setShowAddModal(false); setEditPartner(null); onUpdate();
          }} />
      )}

      {viewPartner && <PartnerDetailsModal partner={viewPartner} orders={orders} onClose={() => setViewPartner(null)} />}

      {paymentPartner && (
        <PaymentModal partner={paymentPartner} orders={orders} onClose={() => setPaymentPartner(null)}
          onSave={async (paymentData) => {
            const currentPaid = paymentPartner.totalPaid || 0;
            const history = paymentPartner.paymentHistory || [];
            await updateUser(paymentPartner.id, { totalPaid: currentPaid + paymentData.amount, paymentHistory: [...history, paymentData] });
            setPaymentPartner(null); onUpdate();
          }} />
      )}
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

function PartnerModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial || { name:'', email:'', phone:'', vehicle:'', licenseNumber:'', aadhaarNumber:'', photoUrl:'', address:'', emergencyContact:'', perDeliveryRate:40 });
  const [saving, setSaving] = useState(false);
  const handleSave = async () => { if (!form.name || !form.phone) return alert('Name and phone are required'); setSaving(true); await onSave(form); setSaving(false); };
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal} style={{maxWidth:560}}>
        <div className={styles.modalHeader}><h3>{initial ? 'Edit Delivery Partner' : 'Add New Delivery Partner'}</h3><button onClick={onClose}>✕</button></div>
        <div className={styles.modalBody}>
          <div className={styles.formGrid}>
            <label>Full Name *<input value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="e.g. Arjun Patel" /></label>
            <label>Email<input value={form.email || ''} onChange={e => setForm({...form, email:e.target.value})} placeholder="partner@demo.com" /></label>
            <label>Phone *<input value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} placeholder="+91 98765 43210" /></label>
            <label>Emergency Contact<input value={form.emergencyContact || ''} onChange={e => setForm({...form, emergencyContact:e.target.value})} placeholder="+91 98765 43211" /></label>
            <label>Vehicle Details<input value={form.vehicle || ''} onChange={e => setForm({...form, vehicle:e.target.value})} placeholder="Bike MH-12 AB 1234" /></label>
            <label>License Number<input value={form.licenseNumber || ''} onChange={e => setForm({...form, licenseNumber:e.target.value})} placeholder="DL-1234567890" /></label>
            <label>Aadhaar Number<input value={form.aadhaarNumber || ''} onChange={e => setForm({...form, aadhaarNumber:e.target.value})} placeholder="1234 5678 9012" maxLength={14} /></label>
            <label>Per Delivery Rate (₹)<input type="number" value={form.perDeliveryRate || 40} onChange={e => setForm({...form, perDeliveryRate:+e.target.value})} /></label>
            <label className={styles.fullWidth}>Photo URL<input value={form.photoUrl || ''} onChange={e => setForm({...form, photoUrl:e.target.value})} placeholder="https://..." /></label>
            <label className={styles.fullWidth}>Address<textarea value={form.address || ''} onChange={e => setForm({...form, address:e.target.value})} placeholder="Full address" rows={2} style={{resize:'vertical', fontFamily:'inherit', fontSize:13, padding:8, border:'1.5px solid #e0e0e0', borderRadius:7}} /></label>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : (initial ? 'Update Partner' : 'Add Partner')}</button>
        </div>
      </div>
    </div>
  );
}

function PartnerDetailsModal({ partner, orders, onClose }) {
  const partnerOrders = orders.filter(o => o.deliveryAgentId === partner.id && o.status === 'Delivered')
    .sort((a, b) => new Date(b.placedAt?.seconds ? b.placedAt.seconds*1000 : b.placedAt) - new Date(a.placedAt?.seconds ? a.placedAt.seconds*1000 : a.placedAt));

  const rate = partner.perDeliveryRate || 40;
  const totalEarnings = partnerOrders.length * rate;
  const totalPaid = partner.totalPaid || 0;
  const balance = Math.max(0, totalEarnings - totalPaid);
  const paymentHistory = partner.paymentHistory || [];

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal} style={{maxWidth:640}}>
        <div className={styles.modalHeader}><h3>🚴 {partner.name} — Partner Details</h3><button onClick={onClose}>✕</button></div>
        <div className={styles.modalBody}>
          <div className={styles.partnerProfile}>
            {partner.photoUrl ? (
              <img src={partner.photoUrl} alt={partner.name} className={styles.partnerPhoto} />
            ) : (
              <div className={styles.partnerPhotoPlaceholder}>{partner.avatar || '🚴'}</div>
            )}
            <div className={styles.partnerInfo}>
              <h4>{partner.name}</h4>
              <p>📱 {partner.phone || '—'}</p>
              <p>📧 {partner.email || '—'}</p>
              <p>🛵 {partner.vehicle || '—'}</p>
              <p>📍 {partner.address || '—'}</p>
              <p>🆘 Emergency: {partner.emergencyContact || '—'}</p>
            </div>
            <div className={styles.partnerDocs}>
              <div className={styles.docCard}>
                <span className={styles.docIcon}>🪪</span>
                <span className={styles.docLabel}>License</span>
                <span className={styles.docValue}>{partner.licenseNumber || 'Not added'}</span>
              </div>
              <div className={styles.docCard}>
                <span className={styles.docIcon}>🆔</span>
                <span className={styles.docLabel}>Aadhaar</span>
                <span className={styles.docValue}>{partner.aadhaarNumber ? `XXXX-${partner.aadhaarNumber.slice(-4)}` : 'Not added'}</span>
              </div>
            </div>
          </div>

          <div className={styles.earningsGrid}>
            <div className={styles.earningsCard}>
              <span className={styles.earningsLabel}>Total Deliveries</span>
              <span className={styles.earningsVal}>{partnerOrders.length}</span>
            </div>
            <div className={styles.earningsCard}>
              <span className={styles.earningsLabel}>Total Earnings</span>
              <span className={styles.earningsVal}>₹{totalEarnings.toFixed(0)}</span>
            </div>
            <div className={styles.earningsCard}>
              <span className={styles.earningsLabel}>Paid So Far</span>
              <span className={styles.earningsVal} style={{color:'#10b981'}}>₹{totalPaid.toFixed(0)}</span>
            </div>
            <div className={styles.earningsCard}>
              <span className={styles.earningsLabel}>Remaining</span>
              <span className={styles.earningsVal} style={{color: balance > 0 ? '#ef4444' : '#10b981'}}>₹{balance.toFixed(0)}</span>
            </div>
          </div>

          {paymentHistory.length > 0 && (
            <div className={styles.paymentHistory}>
              <h4>💳 Payment History</h4>
              {paymentHistory.map((p, i) => (
                <div key={i} className={styles.paymentRow}>
                  <span className={styles.paymentDate}>{new Date(p.date).toLocaleDateString('en-IN')}</span>
                  <span className={styles.paymentAmount}>₹{p.amount.toFixed(0)}</span>
                  <span className={styles.paymentMethod}>{p.method}</span>
                  {p.notes && <span className={styles.paymentNotes}>{p.notes}</span>}
                </div>
              ))}
            </div>
          )}

          <div className={styles.recentDeliveries}>
            <h4>📦 Recent Deliveries</h4>
            {partnerOrders.length === 0 ? (
              <p className={styles.empty}>No deliveries yet</p>
            ) : (
              <table className={styles.table} style={{fontSize:12}}>
                <thead><tr><th>Order ID</th><th>Restaurant</th><th>Total</th><th>Date</th></tr></thead>
                <tbody>
                  {partnerOrders.slice(0, 10).map(o => (
                    <tr key={o.id}>
                      <td className={styles.mono}>#{o.id?.slice(0,8)?.toUpperCase()}</td>
                      <td>{o.restaurantName}</td>
                      <td>₹{o.total}</td>
                      <td className={styles.dateCell}>{o.placedAt ? new Date(o.placedAt?.seconds ? o.placedAt.seconds*1000 : o.placedAt).toLocaleDateString('en-IN') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function PaymentModal({ partner, orders, onClose, onSave }) {
  const partnerOrders = orders.filter(o => o.deliveryAgentId === partner.id && o.status === 'Delivered');
  const rate = partner.perDeliveryRate || 40;
  const totalEarnings = partnerOrders.length * rate;
  const totalPaid = partner.totalPaid || 0;
  const balance = Math.max(0, totalEarnings - totalPaid);

  const [form, setForm] = useState({ amount:'', method:'Cash', date:new Date().toISOString().slice(0,10), notes:'' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return alert('Enter a valid amount');
    if (amount > balance) return alert(`Amount cannot exceed remaining balance ₹${balance.toFixed(0)}`);
    setSaving(true);
    await onSave({ ...form, amount, date: form.date || new Date().toISOString() });
    setSaving(false);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal} style={{maxWidth:420}}>
        <div className={styles.modalHeader}><h3>💰 Record Payment — {partner.name}</h3><button onClick={onClose}>✕</button></div>
        <div className={styles.modalBody}>
          <div className={styles.paymentSummary}>
            <div><span>Total Earnings:</span><strong>₹{totalEarnings.toFixed(0)}</strong></div>
            <div><span>Already Paid:</span><strong style={{color:'#10b981'}}>₹{totalPaid.toFixed(0)}</strong></div>
            <div><span>Remaining:</span><strong style={{color:'#ef4444'}}>₹{balance.toFixed(0)}</strong></div>
          </div>
          <div className={styles.formGrid}>
            <label>Amount (₹) *<input type="number" value={form.amount} onChange={e => setForm({...form, amount:e.target.value})} placeholder="Enter amount" /></label>
            <label>Payment Method
              <select value={form.method} onChange={e => setForm({...form, method:e.target.value})}>
                <option>Cash</option>
                <option>UPI</option>
                <option>Bank Transfer</option>
                <option>Paytm</option>
                <option>Other</option>
              </select>
            </label>
            <label>Date<input type="date" value={form.date} onChange={e => setForm({...form, date:e.target.value})} /></label>
            <label className={styles.fullWidth}>Notes<textarea value={form.notes} onChange={e => setForm({...form, notes:e.target.value})} placeholder="Optional notes..." rows={2} style={{resize:'vertical', fontFamily:'inherit', fontSize:13, padding:8, border:'1.5px solid #e0e0e0', borderRadius:7}} /></label>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Record Payment'}</button>
        </div>
      </div>
    </div>
  );
}

