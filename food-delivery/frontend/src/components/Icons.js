import React from 'react';

export const HomeIcon = ({className}) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M3 10.5L12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const BoxIcon = ({className}) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73L13 2.27a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4.46a2 2 0 0 0 2 0l7-4.46A2 2 0 0 0 21 16z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const CartIcon = ({className}) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M6 6h15l-1.5 9h-11L6 6z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="10" cy="20" r="1" fill="currentColor"/>
    <circle cx="18" cy="20" r="1" fill="currentColor"/>
  </svg>
);

export const CoinIcon = ({className}) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M12 8v8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

export const HeartIcon = ({className}) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M20.8 8.6a4.6 4.6 0 0 0-6.5-.5L12 10.5l-2.3-2.4a4.6 4.6 0 0 0-6.5.5A5 5 0 0 0 5.5 18L12 22l6.5-4A5 5 0 0 0 20.8 8.6z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const PhoneIcon = ({className}) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M22 16.9v3a1 1 0 0 1-1.1 1 19 19 0 0 1-8.6-3.3 19 19 0 0 1-6-6A19 19 0 0 1 3.1 3.1 1 1 0 0 1 4 2h3a1 1 0 0 1 1 .75c.1.4.3 1 .5 1.4a1 1 0 0 1-.2 1L7.6 7.6a12 12 0 0 0 6 6l1.5-1.5a1 1 0 0 1 1-.2c.4.2 1 .4 1.4.5a1 1 0 0 1 .75 1V16.9z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default null;
