import React from 'react';
import { getInflatedPrice } from '../utils/offerPricing';

const rootStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 2,
  lineHeight: 1.15,
};

const mrpStyle = {
  color: '#98a2b3',
  textDecoration: 'line-through',
  fontSize: 12,
  fontWeight: 700,
};

const saleStyle = {
  color: '#101828',
  fontWeight: 900,
  fontSize: 15,
};

export default function PriceDisplay({ originalPrice, isNewUser = false }) {
  const safeOriginal = Math.round(Number(originalPrice || 0));
  const inflated = getInflatedPrice(safeOriginal, undefined, isNewUser);

  return (
    <div style={rootStyle}>
      <span style={mrpStyle}>₹{inflated}</span>
      <span style={saleStyle}>₹{safeOriginal}</span>
    </div>
  );
}
