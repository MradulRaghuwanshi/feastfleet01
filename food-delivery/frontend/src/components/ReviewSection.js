import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getReviews, addReview, replyToReview } from '../firebase/services';
import styles from './ReviewSection.module.css';

function StarPicker({ value, onChange }) {
  return (
    <div className={styles.stars}>
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button" className={`${styles.star} ${s <= value ? styles.filled : ''}`}
          onClick={() => onChange(s)}>★</button>
      ))}
    </div>
  );
}

function StarDisplay({ value }) {
  return (
    <span className={styles.starDisplay}>
      {[1,2,3,4,5].map(s => (
        <span key={s} className={s <= value ? styles.filledStar : styles.emptyStar}>★</span>
      ))}
    </span>
  );
}

export default function ReviewSection({ restaurantId, eligibleOrderId }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyInputs, setReplyInputs] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);

  const fetchReviews = () => {
    getReviews(restaurantId).then(setReviews);
  };

  useEffect(() => { fetchReviews(); }, [restaurantId]);

  const submitReview = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await addReview({
      restaurantId, userId: user.id, userName: user.name,
      avatar: user.avatar, rating, comment,
      orderId: eligibleOrderId || null
    });
    setShowForm(false); setComment(''); setRating(5);
    fetchReviews();
    setSubmitting(false);
  };

  const submitReply = async (reviewId) => {
    const reply = replyInputs[reviewId];
    if (!reply?.trim()) return;
    await replyToReview(reviewId, reply);
    setReplyingTo(null);
    fetchReviews();
  };

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <div>
          <h3>Reviews {avgRating && <span className={styles.avg}>⭐ {avgRating}</span>}</h3>
          <p className={styles.count}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
        </div>
        {user?.role === 'customer' && !showForm && (
          <button className={styles.writeBtn} onClick={() => setShowForm(true)}>✏️ Write a Review</button>
        )}
      </div>

      {showForm && (
        <form className={styles.form} onSubmit={submitReview}>
          <p className={styles.formLabel}>Your Rating</p>
          <StarPicker value={rating} onChange={setRating} />
          <textarea required placeholder="Share your experience..." rows={3}
            value={comment} onChange={e => setComment(e.target.value)} />
          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      )}

      <div className={styles.list}>
        {reviews.length === 0 && <p className={styles.empty}>No reviews yet. Be the first!</p>}
        {reviews.map(rev => (
          <div key={rev.id} className={styles.reviewCard}>
            <div className={styles.reviewHeader}>
              <span className={styles.revAvatar}>{rev.avatar}</span>
              <div>
                <strong>{rev.userName}</strong>
                <p className={styles.revDate}>{new Date(rev.createdAt).toLocaleDateString()}</p>
              </div>
              <StarDisplay value={rev.rating} />
            </div>
            <p className={styles.reviewComment}>{rev.comment}</p>

            {rev.ownerReply && (
              <div className={styles.ownerReply}>
                <strong>🍽️ Owner replied:</strong>
                <p>{rev.ownerReply}</p>
              </div>
            )}

            {/* Restaurant owner can reply */}
            {user?.role === 'restaurant' && !rev.ownerReply && (
              replyingTo === rev.id ? (
                <div className={styles.replyBox}>
                  <textarea placeholder="Write a reply..." rows={2}
                    value={replyInputs[rev.id] || ''}
                    onChange={e => setReplyInputs(p => ({ ...p, [rev.id]: e.target.value }))} />
                  <div className={styles.replyActions}>
                    <button onClick={() => setReplyingTo(null)}>Cancel</button>
                    <button className={styles.replySubmit} onClick={() => submitReply(rev.id)}>Reply</button>
                  </div>
                </div>
              ) : (
                <button className={styles.replyBtn} onClick={() => setReplyingTo(rev.id)}>💬 Reply</button>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
