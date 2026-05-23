import React from 'react';
import { OFFERS } from '../utils/offerPricing';

const railStyle = {
  display: 'flex',
  gap: 10,
  overflowX: 'auto',
  paddingBottom: 4,
  scrollbarWidth: 'thin',
};

const baseCardStyle = {
  flex: '0 0 auto',
  minWidth: 220,
  borderRadius: 14,
  padding: '12px 14px',
  border: '1px solid rgba(16,24,40,0.08)',
};

const labelStyle = {
  fontSize: 14,
  fontWeight: 800,
  color: '#101828',
  marginBottom: 6,
};

const hintStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: '#475467',
};

const getCardTheme = (offer) => {
  if (offer?.newUserOnly) {
    return {
      background: 'linear-gradient(135deg, #e0f2fe, #dbeafe)',
      borderColor: '#93c5fd',
    };
  }

  return {
    background: 'linear-gradient(135deg, #ffedd5, #fed7aa)',
    borderColor: '#fdba74',
  };
};

export default function OfferBanner({ offers = OFFERS }) {
  const visibleOffers = (offers || []).filter((offer) => offer?.active !== false);
  if (!visibleOffers.length) return null;

  return (
    <div style={railStyle} aria-label="Available offers">
      {visibleOffers.map((offer, index) => (
        <article
          key={`${offer.label}-${index}`}
          style={{
            ...baseCardStyle,
            ...getCardTheme(offer),
          }}
        >
          <div style={labelStyle}>{offer.label}</div>
          <div style={hintStyle}>Min order: ₹{Number(offer.min || 0)}</div>
        </article>
      ))}
    </div>
  );
}
