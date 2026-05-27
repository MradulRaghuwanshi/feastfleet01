import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './OrderConfirmation.module.css';

export default function OrderConfirmation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const billDownloadedRef = useRef(false);

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then(r => r.json())
      .then(setOrder);
  }, [id]);

  useEffect(() => {
    if (!order || billDownloadedRef.current) return;

    const downloadBillImage = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1520;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#fff8f3';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const drawRoundedRect = (x, y, w, h, r, fillStyle) => {
        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        ctx.fill();
      };

      drawRoundedRect(60, 60, 960, 1400, 36, '#ffffff');

      ctx.fillStyle = '#ff6b35';
      ctx.font = 'bold 54px Arial';
      ctx.fillText('FeastFleet Bill', 110, 150);
      ctx.fillStyle = '#3b2f2a';
      ctx.font = 'bold 34px Arial';
      ctx.fillText('Thanks for ordering!', 110, 210);

      ctx.fillStyle = '#6b5b52';
      ctx.font = '28px Arial';
      ctx.fillText(`Order #${String(order.id || '').slice(0, 8).toUpperCase()}`, 110, 280);
      ctx.fillText(`Restaurant: ${order.restaurantName || ''}`, 110, 330);
      ctx.fillText(`Customer: ${order.customerName || ''}`, 110, 380);
      ctx.fillText(`Address: ${order.deliveryAddress || ''}`, 110, 430);

      ctx.strokeStyle = '#f2dfd5';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(110, 485);
      ctx.lineTo(970, 485);
      ctx.stroke();

      ctx.fillStyle = '#2f241f';
      ctx.font = 'bold 30px Arial';
      ctx.fillText('Items', 110, 545);

      ctx.font = '26px Arial';
      let y = 600;
      (order.items || []).forEach(item => {
        const line = `${item.name} x${item.quantity}`;
        const price = `₹${Number(item.price || 0) * Number(item.quantity || 0)}`;
        ctx.fillStyle = '#4a403a';
        ctx.fillText(line.slice(0, 38), 110, y);
        ctx.fillText(price, 820, y);
        y += 52;
      });

      ctx.strokeStyle = '#f2dfd5';
      ctx.beginPath();
      ctx.moveTo(110, y + 8);
      ctx.lineTo(970, y + 8);
      ctx.stroke();

      ctx.fillStyle = '#1f130e';
      ctx.font = 'bold 34px Arial';
      ctx.fillText(`Total Paid: ₹${Number(order.total || 0).toFixed(0)}`, 110, y + 70);

      ctx.fillStyle = '#6b5b52';
      ctx.font = '24px Arial';
      ctx.fillText('We will notify you with updates until delivery is complete.', 110, y + 140);
      ctx.fillText('If you need help, WhatsApp us from the Contact page.', 110, y + 190);

      const link = document.createElement('a');
      link.download = `feastfleet-bill-${String(order.id || 'order').slice(0, 8)}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      link.remove();
      billDownloadedRef.current = true;
    };

    const timer = setTimeout(() => {
      downloadBillImage().catch(() => {});
    }, 400);

    return () => clearTimeout(timer);
  }, [order]);

  if (!order) return <p className={styles.loading}>Loading...</p>;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>✅</div>
        <h2>Order Confirmed!</h2>
        <p className={styles.sub}>Your order has been placed successfully.</p>

        <div className={styles.details}>
          <div><span>Order ID</span><span>#{order.id.slice(0, 8).toUpperCase()}</span></div>
          <div><span>Restaurant</span><span>{order.restaurantName}</span></div>
          <div><span>Customer</span><span>{order.customerName}</span></div>
          <div><span>Deliver to</span><span>{order.deliveryAddress}</span></div>
          <div><span>Status</span><span className={styles.status}>{order.status}</span></div>
          {order.deliveryOtp && order.status === 'Out for Delivery' && (
            <div className={styles.otpBox}><span>🔐 Delivery OTP: <strong>{order.deliveryOtp}</strong></span><small>Share with delivery partner</small></div>
          )}
          <div><span>Total</span><span className={styles.total}>₹{order.total.toFixed(0)}</span></div>
        </div>

        <div className={styles.items}>
          <h4>Items Ordered</h4>
          {order.items.map(item => (
            <div key={item.id} className={styles.item}>
              <span>{item.name} × {item.quantity}</span>
              <span>₹{(item.price * item.quantity).toFixed(0)}</span>
            </div>
          ))}
        </div>

        <div className={styles.actions}>
          <button onClick={() => navigate('/orders')}>View All Orders</button>
          <button className={styles.homeBtn} onClick={() => navigate('/')}>Back to Home</button>
        </div>
      </div>
    </div>
  );
}
