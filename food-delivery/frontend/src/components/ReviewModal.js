import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { addReview, markOrderReviewed } from '../firebase/services';
import styles from './ReviewModal.module.css';

export default function ReviewModal({ order, onClose, onSubmitted }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      await addReview({
        restaurantId: order.restaurantId, userId: user.id,
        userName: user.name, avatar: user.avatar,
        rating, comment, orderId: order.id
      });
      await markOrderReviewed(order.id);
      onSubmitted();
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>⭐ Rate your order</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <p className={styles.sub}>How was your experience with <strong>{order.restaurantName}</strong>?</p>

        <div className={styles.orderPreview}>
          {order.items.slice(0,3).map(i => (
            <span key={i.id} className={styles.itemTag}>{i.name}</span>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.stars}>
            {[1,2,3,4,5].map(s => (
              <button key={s} type="button"
                className={`${styles.star} ${s <= rating ? styles.filled : ''}`}
                onClick={() => setRating(s)}>★</button>
            ))}
          </div>
          <p className={styles.ratingLabel}>
            {['','😞 Poor','😐 Fair','🙂 Good','😊 Great','🤩 Excellent!'][rating]}
          </p>
          <textarea required placeholder="Tell us about your experience..." rows={4}
            value={comment} onChange={e => setComment(e.target.value)} />
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      </div>
    </div>
  );
}
