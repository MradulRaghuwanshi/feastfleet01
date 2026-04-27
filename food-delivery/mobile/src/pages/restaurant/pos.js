import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getRestaurant, createOrder } from '../../firebase/services';
import styles from './POS.module.css';

export default function POS() {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState(null);
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('Dine-in'); // Dine-in, Takeaway, Delivery
  const [posTable, setPosTable] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRestaurant = async () => {
      const data = await getRestaurant(user.restaurantId);
      setRestaurant(data);
      setLoading(false);
    };
    fetchRestaurant();
  }, [user.restaurantId]);

  if (loading) return <p>Loading POS...</p>;
  if (!restaurant) return <p>Restaurant data not available.</p>;

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(c => c.id !== itemId));
  };

  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(prev => prev.map(c => c.id === itemId ? { ...c, quantity } : c));
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * 0.18; // 18% GST
    return { subtotal, tax, total: subtotal + tax };
  };

  const groupedMenu = restaurant?.menu?.reduce((groups, item) => {
    const category = item.category || 'Other';
    if (!groups[category]) groups[category] = [];
    groups[category].push(item);
    return groups;
  }, {});

  const placeOrder = async () => {
    if (!cart.length) return alert('Cart is empty');
    if (!customerName.trim()) return alert('Customer name is required');
    if (!customerPhone.trim()) return alert('Customer phone is required');

    const { total, subtotal } = calculateTotal();
    const orderData = {
      restaurantId: user.restaurantId,
      restaurantName: restaurant.name,
      items: cart,
      subtotal,
      deliveryFee: 0,
      discount: 0,
      walletUsed: 0,
      tax: +(subtotal * 0.18).toFixed(2),
      total,
      status: 'Confirmed',
      orderType,
      customerName,
      customerPhone,
      deliveryAddress: orderType === 'Dine-in' ? `Table ${posTable}` : orderType === 'Delivery' ? 'Delivery' : 'Takeaway',
      tableNo: orderType === 'Dine-in' ? posTable : null,
    };

    await createOrder(orderData);
    alert('Order placed successfully!');
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setPosTable('');
  };

  if (loading) return <p>Loading POS...</p>;

  const { subtotal, tax, total } = calculateTotal();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>POS System - {restaurant.name}</h1>
        <div className={styles.orderType}>
          <button className={orderType === 'Dine-in' ? styles.active : ''} onClick={() => setOrderType('Dine-in')}>Dine-in</button>
          <button className={orderType === 'Takeaway' ? styles.active : ''} onClick={() => setOrderType('Takeaway')}>Takeaway</button>
          <button className={orderType === 'Delivery' ? styles.active : ''} onClick={() => setOrderType('Delivery')}>Delivery</button>
        </div>
      </div>

      <div className={styles.container}>
        <div className={styles.menu}>
          {Object.entries(groupedMenu || {}).map(([category, items]) => (
            <div key={category} className={styles.category}>
              <h3>{category}</h3>
              <div className={styles.items}>
                {items.map(item => (
                  <button key={item.id} className={styles.itemBtn} onClick={() => addToCart(item)}>
                    <div>{item.name}</div>
                    <div>₹{item.price}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {!restaurant.menu?.length && (
            <div className={styles.empty}>
              <p>No menu items available for this restaurant.</p>
            </div>
          )}
        </div>

        <div className={styles.cart}>
          <h3>Order Summary</h3>
          <div className={styles.customerInfo}>
            <input placeholder="Customer Name" value={customerName} onChange={e => setCustomerName(e.target.value)} />
            <input placeholder="Phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
          </div>
          <div className={styles.cartItems}>
            {cart.map(item => (
              <div key={item.id} className={styles.cartItem}>
                <span>{item.name}</span>
                <div>
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                </div>
                <span>₹{item.price * item.quantity}</span>
                <button onClick={() => removeFromCart(item.id)}>×</button>
              </div>
            ))}
          </div>
          <div className={styles.totals}>
            <div>Subtotal: ₹{subtotal.toFixed(2)}</div>
            <div>Tax (18%): ₹{tax.toFixed(2)}</div>
            <div>Total: ₹{total.toFixed(2)}</div>
          </div>
          <button className={styles.placeOrder} onClick={placeOrder}>Place Order</button>
        </div>
      </div>
    </div>
  );
}