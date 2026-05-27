import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listenToWallet, listenToWalletTransactions, PLATFORM_FEES } from '../../firebase/services';
import styles from './Wallet.module.css';

const formatDate = (value) => {
  if (!value) return '—';
  const d = value?.seconds ? new Date(value.seconds * 1000) : new Date(value);
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

export default function Wallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    if (!user?.id) return () => {};

    const unsubWallet = listenToWallet(user.id, setWallet);
    const unsubTransactions = listenToWalletTransactions(user.id, setTransactions);

    return () => {
      unsubWallet();
      unsubTransactions();
    };
  }, [user?.id]);

  const balance = wallet?.isVirtual ? (user?.feastCoins ?? user?.wallet ?? 0) : (wallet?.currentBalance ?? user?.feastCoins ?? user?.wallet ?? 0);
  const expiryDays = wallet?.expiresAt
    ? Math.max(0, Math.ceil((new Date(wallet.expiresAt) - new Date()) / (24 * 60 * 60 * 1000)))
    : null;
  const canRedeem = balance >= PLATFORM_FEES.minimumCoinRedemption;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Feast Coins</p>
          <h1>{Math.floor(balance)} coins</h1>
          <p className={styles.value}>1 coin = ₹1</p>
        </div>
        <div className={`${styles.redeemBadge} ${canRedeem ? styles.ready : ''}`}>
          {canRedeem ? `₹${Math.floor(balance)} redeemable` : `${PLATFORM_FEES.minimumCoinRedemption - Math.floor(balance)} coins to redeem`}
        </div>
      </section>

      <section className={styles.policyCard}>
        <div>
          <p className={styles.policyKicker}>Policy</p>
          <h2>FeastCoins terms and usage guide</h2>
          <p>See how FeastCoins are earned, when they expire, and how you can redeem them at checkout.</p>
        </div>
        <Link to="/wallet/terms" className={styles.policyButton}>Open Terms & Conditions</Link>
      </section>

      <div className={styles.stats}>
        <div>
          <span>Earned this month</span>
          <strong>{wallet?.earnedThisMonth || 0}</strong>
        </div>
        <div>
          <span>Redeemed this month</span>
          <strong>{wallet?.redeemedThisMonth || 0}</strong>
        </div>
        <div>
          <span>Monthly refresh</span>
          <strong>{expiryDays === null ? 'Month end' : `${expiryDays}d`}</strong>
        </div>
      </div>

      <section className={styles.history}>
        <div className={styles.sectionTop}>
          <h2>Transaction History</h2>
          <span>{transactions.length} records</span>
        </div>
        {transactions.length === 0 ? (
          <div className={styles.empty}>No Feast Coin activity yet.</div>
        ) : (
          <div className={styles.list}>
            {transactions.map(tx => (
              <div key={tx.id} className={styles.tx}>
                <div>
                  <strong>{tx.description || (tx.type === 'earn' ? 'Coins earned' : 'Coins redeemed')}</strong>
                  <span>{formatDate(tx.createdAt)}</span>
                </div>
                <b className={tx.amount >= 0 ? styles.credit : styles.debit}>
                  {tx.amount >= 0 ? '+' : ''}{tx.amount}
                </b>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
