import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Contest.module.css';

const FORM_URL = 'https://forms.gle/QrPFo1WhiDB91ak89';

const contestPhases = [
  {
    title: '1. Find a lower price',
    text: 'Compare the same outlet, same items, same delivery address, and same delivery window on another app.',
  },
  {
    title: '2. Order on FeastFleet',
    text: 'Place the matching order here so we can verify the final comparison against the delivered bill.',
  },
  {
    title: '3. Submit proof',
    text: 'Attach a screenshot and order details. Our team reviews the claim and issues FeastCoins after validation.',
  },
];

const rules = [
  'The comparison must be for the same restaurant, items, and delivery location.',
  'The external screenshot must show the total and be from the same day.',
  'Only completed deliveries are eligible for review.',
  'Fraudulent, edited, or partial screenshots are rejected.',
  'FeastFleet decisions on eligibility and reward value are final.',
];

const eligibility = [
  'Customers ordering in the eligible service area.',
  'Orders placed from public FeastFleet customer accounts.',
  'Delivered orders with matching proof from another app.',
  'One verified claim per customer per day.',
];

const rewards = [
  { label: 'Up to', value: '100%' },
  { label: 'Reward type', value: 'FeastCoins' },
  { label: 'Review time', value: 'Manual' },
  { label: 'Where to claim', value: 'Official form' },
];

const faqs = [
  {
    question: 'How do I register for the contest?',
    answer: 'Open the registration form, fill in your details, and keep your order proof ready for when you submit a claim.',
  },
  {
    question: 'What proof do I need?',
    answer: 'A screenshot showing the outlet name, item list, subtotal or total, and the same-day timestamp is the minimum requirement.',
  },
  {
    question: 'How are rewards issued?',
    answer: 'Approved claims are converted to FeastCoins and added after review. The exact reward depends on the verified order value.',
  },
];

export default function ContestPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.kicker}>Live Contest</span>
          <h1>Beat the Fleet</h1>
          <p>
            A systematic price-match contest for FeastFleet customers. Compare the same delivered order across apps, submit proof, and earn FeastCoins after verification.
          </p>
          <div className={styles.heroActions}>
            <a href={FORM_URL} target="_blank" rel="noreferrer" className={styles.primaryBtn}>Register Now</a>
            <button type="button" className={styles.secondaryBtn} onClick={() => navigate('/')}>Back to Home</button>
          </div>
        </div>
        <aside className={styles.heroPanel}>
          <span className={styles.panelLabel}>Reward</span>
          <strong>100% of the order value</strong>
          <p>Issued as FeastCoins after a manual check.</p>
          <Link to="/contest#how-it-works" className={styles.panelLink}>See how it works</Link>
        </aside>
      </section>

      <section className={styles.summaryGrid} aria-label="Contest summary">
        {rewards.map(item => (
          <article key={item.label} className={styles.summaryCard}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className={styles.section} id="how-it-works">
        <div className={styles.sectionHeader}>
          <span>How it works</span>
          <h2>Simple submission flow</h2>
        </div>
        <div className={styles.phaseGrid}>
          {contestPhases.map(phase => (
            <article key={phase.title} className={styles.phaseCard}>
              <h3>{phase.title}</h3>
              <p>{phase.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.dualGrid}>
        <article className={styles.section}>
          <div className={styles.sectionHeader}>
            <span>Eligibility</span>
            <h2>Who can claim</h2>
          </div>
          <ul className={styles.list}>
            {eligibility.map(item => <li key={item}>{item}</li>)}
          </ul>
        </article>

        <article className={styles.section}>
          <div className={styles.sectionHeader}>
            <span>Rules</span>
            <h2>What we verify</h2>
          </div>
          <ul className={styles.list}>
            {rules.map(item => <li key={item}>{item}</li>)}
          </ul>
        </article>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span>Registration</span>
          <h2>Submit your details or claim</h2>
        </div>
        <div className={styles.registerCard}>
          <div>
            <h3>Ready to participate?</h3>
            <p>Use the form to register your interest and submit contest proof after ordering.</p>
          </div>
          <a href={FORM_URL} target="_blank" rel="noreferrer" className={styles.primaryBtn}>Open Registration Form</a>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span>FAQ</span>
          <h2>Quick answers</h2>
        </div>
        <div className={styles.faqGrid}>
          {faqs.map(faq => (
            <details key={faq.question} className={styles.faqCard}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}