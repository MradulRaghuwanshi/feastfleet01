import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { deleteReview, updateReview } from '../../firebase/services';
import styles from './Dashboard.module.css';

const clampRating = (value) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 5;
  return Math.min(5, Math.max(1, parsed));
};

export default function Reviews({ reviews, restaurants, onRefresh }) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [editingReview, setEditingReview] = useState(null);
  const [saving, setSaving] = useState(false);
  const restaurantNameById = useMemo(() => {
    const map = new Map();
    restaurants.forEach(restaurant => {
      map.set(restaurant.id, restaurant.name || restaurant.cuisine || restaurant.id);
    });
    return map;
  }, [restaurants]);

  const filteredReviews = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return reviews;
    return reviews.filter(review => {
      const haystack = [
        review.userName,
        review.comment,
        review.ownerReply,
        review.restaurantId,
        restaurantNameById.get(review.restaurantId),
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [restaurantNameById, reviews, search]);

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Delete this review? This cannot be undone.')) return;
    await deleteReview(reviewId);
    await onRefresh();
  };

  const handleSave = async () => {
    if (!editingReview) return;
    setSaving(true);
    try {
      await updateReview(editingReview.id, {
        rating: clampRating(editingReview.rating),
        comment: String(editingReview.comment || '').trim(),
        ownerReply: String(editingReview.ownerReply || '').trim() || null,
        updatedBy: user?.id || null,
      });
      setEditingReview(null);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className={styles.filterBar}>
        <input
          className={styles.searchInput}
          placeholder="Search by customer, restaurant, comment, or reply..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Restaurant</th>
            <th>Customer</th>
            <th>Rating</th>
            <th>Review</th>
            <th>Reply</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredReviews.map(review => (
            <tr key={review.id}>
              <td>{restaurantNameById.get(review.restaurantId) || review.restaurantId || '—'}</td>
              <td>
                <strong>{review.userName || 'Guest'}</strong>
                <div className={styles.dateCell}>{review.userId || '—'}</div>
              </td>
              <td>{Number(review.rating || 0).toFixed(1)} / 5</td>
              <td className={styles.reviewCell}>{review.comment}</td>
              <td className={styles.reviewCell}>{review.ownerReply || '—'}</td>
              <td className={styles.dateCell}>
                {review.createdAt?.seconds
                  ? new Date(review.createdAt.seconds * 1000).toLocaleString('en-IN')
                  : review.createdAt
                    ? new Date(review.createdAt).toLocaleString('en-IN')
                    : '—'}
              </td>
              <td>
                <div className={styles.reviewActions}>
                  <button className={styles.editBtn} onClick={() => setEditingReview({
                    id: review.id,
                    rating: review.rating,
                    comment: review.comment || '',
                    ownerReply: review.ownerReply || '',
                    restaurantId: review.restaurantId,
                    userName: review.userName || '',
                  })}>Edit</button>
                  <button className={styles.deleteBtn} onClick={() => handleDelete(review.id)}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {filteredReviews.length === 0 && <p className={styles.empty}>No reviews found</p>}

      {editingReview && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: 560 }}>
            <div className={styles.modalHeader}>
              <h3>Edit Review</h3>
              <button onClick={() => setEditingReview(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <label className={styles.fullWidth}>
                  Rating
                  <input
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    value={editingReview.rating}
                    onChange={e => setEditingReview(prev => ({ ...prev, rating: e.target.value }))}
                  />
                </label>
                <label className={styles.fullWidth}>
                  Review
                  <textarea
                    rows={4}
                    value={editingReview.comment}
                    onChange={e => setEditingReview(prev => ({ ...prev, comment: e.target.value }))}
                  />
                </label>
                <label className={styles.fullWidth}>
                  Owner Reply
                  <textarea
                    rows={3}
                    value={editingReview.ownerReply}
                    onChange={e => setEditingReview(prev => ({ ...prev, ownerReply: e.target.value }))}
                  />
                </label>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setEditingReview(null)}>Cancel</button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Review'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
