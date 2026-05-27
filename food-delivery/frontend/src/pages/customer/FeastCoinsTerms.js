import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listenToWallet } from '../../firebase/services';
import styles from './FeastCoinsTerms.module.css';

const todayText = '28 May 2026';

function CoinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9.5 9.2c.4-1 1.4-1.7 2.5-1.7 1.5 0 2.8 1 2.8 2.4 0 1.5-1.1 2.1-2.9 2.5-1.5.3-2.7.8-2.7 2.1 0 1.2 1 2.1 2.6 2.1 1.2 0 2.1-.5 2.7-1.4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.2 16.2 5.7 12.7l-1.3 1.3 4.8 4.8L19.6 8.3l-1.4-1.4z" fill="currentColor" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.5 18.5 6v5.4c0 4.3-2.8 7.9-6.5 9.1-3.7-1.2-6.5-4.8-6.5-9.1V6z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8.8 12.3 11 14.5l4.3-4.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.8v4.5l3.1 1.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 11.2 11.2 4.5H20v8.8l-6.7 6.7-8.8-8.8z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="16.3" cy="7.7" r="1.2" fill="currentColor" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 9h15v4.2h-15zM6 13.2h12v7.3H6z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 9v11.5M4.5 9h15M12 9c-1.7 0-3-1.2-3-2.7S10 3.8 12 5.4c2-1.6 3 0.4 3 1.9S13.7 9 12 9z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const earnItems = [
  {
    accent: 'green',
    icon: CheckIcon,
    title: 'Beat the Fleet contest only',
    description: 'FeastCoins are earned through the Beat the Fleet contest only. No other action, referral, or checkout behavior creates coins.',
  },
  {
    accent: 'amber',
    icon: ShieldIcon,
    title: 'Verified claims only',
    description: 'Every claim is manually checked. Verification can take up to 48 hours after delivery before coins are credited.',
  },
  {
    accent: 'blue',
    icon: TagIcon,
    title: 'Eligible zones only',
    description: 'Claims are valid only for Green Valley, Lawgate, and student areas near LPU outside campus boundaries.',
  },
  {
    accent: 'gray',
    icon: ClockIcon,
    title: 'One claim per week per account',
    description: 'Each customer account can submit one claim in a seven-day period. Additional submissions are ignored.',
  },
];

const useItems = [
  {
    accent: 'orange',
    icon: TagIcon,
    title: 'Apply at checkout',
    description: 'FeastCoins appear as a payment toggle when you reach checkout on FeastFleet.',
  },
  {
    accent: 'green',
    icon: CoinIcon,
    title: 'One order redemption',
    description: 'You can redeem up to your available balance in a single order, then pay the remaining amount separately.',
  },
  {
    accent: 'amber',
    icon: ClockIcon,
    title: 'Valid for 30 days from credit date',
    description: 'Coins expire after 30 days from the credit date. Expired coins cannot be recovered or reissued.',
  },
  {
    accent: 'blue',
    icon: GiftIcon,
    title: 'FeastFleet platform only',
    description: 'FeastCoins can only be used inside FeastFleet. They do not work on Zomato, Swiggy, or any other service.',
  },
];

const restrictionItems = [
  {
    tone: 'amber',
    title: 'Non-transferable',
    description: 'FeastCoins cannot be gifted, transferred, or shared with another account.',
  },
  {
    tone: 'red',
    title: 'No cash value and no abuse',
    description: 'FeastCoins cannot be converted to money or refunded. Fake screenshots, exploit attempts, or any abuse can lead to permanent account suspension and coin cancellation. FeastFleet’s decision is final.',
  },
  {
    tone: 'blue',
    title: 'Program changes',
    description: 'FeastFleet may modify, pause, or discontinue the FeastCoins program at any time without prior notice.',
  },
];

const supportItems = [
  {
    accent: 'amber',
    title: 'In-app support chat',
    description: 'Responds within 24 hours.',
  },
  {
    accent: 'green',
    title: 'WhatsApp',
    description: 'Send your Order ID and registered email for claim status.',
  },
  {
    accent: 'blue',
    title: 'Email support@feastfleet.tech',
    description: 'Use the subject line "FeastCoins Claim".',
  },
];

function MetricCard({ label, value }) {
  return (
    <div className={styles.metricCard}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InfoRow({ item }) {
  const Icon = item.icon;
  return (
    <div className={styles.infoRow}>
      <div className={`${styles.iconBox} ${styles[item.accent]}`}>
        <Icon />
      </div>
      <div>
        <h4>{item.title}</h4>
        <p>{item.description}</p>
      </div>
    </div>
  );
}

function Banner({ item }) {
  return (
    <div className={`${styles.banner} ${styles[item.tone]}`}>
      <strong>{item.title}</strong>
      <p>{item.description}</p>
    </div>
  );
}

export default function FeastCoinsTerms() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);

  useEffect(() => {
    if (!user?.id) return () => {};
    const unsubscribe = listenToWallet(user.id, setWallet);
    return () => unsubscribe();
  }, [user?.id]);

  const balance = useMemo(() => {
    const value = wallet?.isVirtual ? (user?.feastCoins ?? user?.wallet ?? 0) : (wallet?.currentBalance ?? user?.feastCoins ?? user?.wallet ?? 0);
    return Math.max(0, Math.floor(Number(value || 0)));
  }, [wallet, user?.feastCoins, user?.wallet]);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroBand}>
          <div className={styles.heroTitleWrap}>
            <div className={styles.heroIcon}>
              <CoinIcon />
            </div>
            <div>
              <p className={styles.heroKicker}>FeastCoins policy</p>
              <h1>Your FeastCoins</h1>
              <p className={styles.heroText}>Coins are earned through the Beat the Fleet contest and can be redeemed on your next order inside FeastFleet.</p>
            </div>
          </div>
          <div className={styles.balancePill}>
            <span>Current balance</span>
            <strong>{balance} coins</strong>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Quick stats</h2>
          <p>At a glance rules for earning and using FeastCoins.</p>
        </div>
        <div className={styles.metricsGrid}>
          <MetricCard label="Coin Value" value="₹1 = 1 coin" />
          <MetricCard label="Validity" value="30 days" />
          <MetricCard label="Max Claims" value="1 per week" />
          <MetricCard label="Credit Time" value="Up to 48 hrs" />
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2>How you earn FeastCoins</h2>
          <p>Only one contest path creates coins, and every claim is checked before credit.</p>
        </div>
        <div className={styles.rowList}>
          {earnItems.map(item => <InfoRow key={item.title} item={item} />)}
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2>How to use FeastCoins</h2>
          <p>FeastCoins work like a checkout credit on FeastFleet only.</p>
        </div>
        <div className={styles.rowList}>
          {useItems.map(item => <InfoRow key={item.title} item={item} />)}
        </div>
      </section>

      <section className={styles.restrictionsCard}>
        <div className={styles.sectionHeader}>
          <h2>Important restrictions</h2>
          <p>These rules protect the contest and keep FeastCoins fair for everyone.</p>
        </div>
        <div className={styles.bannerList}>
          {restrictionItems.map(item => <Banner key={item.title} item={item} />)}
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2>Need help?</h2>
          <p>If your claim or balance looks wrong, reach out through any of these channels.</p>
        </div>
        <div className={styles.helpList}>
          {supportItems.map((item, index) => {
            const supportIcons = [ShieldIcon, TagIcon, MailIcon];
            const Icon = supportIcons[index] || ShieldIcon;
            return (
              <div key={item.title} className={styles.helpItem}>
                <div className={`${styles.iconBox} ${styles[item.accent]}`}><Icon /></div>
                <div>
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <footer className={styles.footer}>
        <p>Last updated {todayText}. FeastFleet may update these terms at any time; continued use means you accept the latest version. Disputes are final and handled at FeastFleet’s discretion.</p>
      </footer>
    </div>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="6" width="16" height="12" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5.5 8l6.5 5 6.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
