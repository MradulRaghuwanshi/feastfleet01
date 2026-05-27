const nodemailer = require('nodemailer');

const BRAND_COLOR = '#FF5722';
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'mradulraghuwanshi@gmail.com';
const DEFAULT_RESTAURANT_NAME = process.env.RESTAURANT_NAME || process.env.APP_NAME || 'FeastFleet';
const DEFAULT_RESTAURANT_PHONE = process.env.RESTAURANT_PHONE || process.env.SUPPORT_PHONE || '';
const DEFAULT_WEBSITE = process.env.RESTAURANT_WEBSITE || process.env.APP_WEBSITE || '';
const DEFAULT_LOGO_URL = process.env.RESTAURANT_LOGO_URL || '';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDateTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: process.env.EMAIL_TIMEZONE || 'Asia/Kolkata',
  });
}

function getQuantity(item) {
  return Number(item.qty ?? item.quantity ?? item.count ?? 1);
}

function getGoogleMapsLink(address, lat, lng) {
  if (lat && lng) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
  if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return '';
}

function normalizeOrder(order = {}) {
  const customer = order.customer || {};
  const restaurant = order.restaurant || {};
  const deliveryPartner = order.deliveryPartner || {};

  return {
    id: order.id || order.orderId || order.orderNumber || 'New order',
    createdAt: order.createdAt || order.placedAt || order.created_at || new Date(),
    customer: {
      name: customer.name || order.customerName || 'Customer',
      phone: customer.phone || order.customerPhone || '',
      email: customer.email || order.customerEmail || '',
      address: customer.address || order.deliveryAddress || '',
    },
    restaurant: {
      name: restaurant.name || order.restaurantName || DEFAULT_RESTAURANT_NAME,
      email: restaurant.email || order.restaurantEmail || '',
      address: restaurant.address || order.restaurantAddress || '',
      phone: restaurant.phone || order.restaurantPhone || DEFAULT_RESTAURANT_PHONE,
      website: restaurant.website || order.restaurantWebsite || DEFAULT_WEBSITE,
      logoUrl: restaurant.logoUrl || restaurant.logo || order.restaurantLogoUrl || DEFAULT_LOGO_URL,
      lat: restaurant.lat || order.restaurantLat || '',
      lng: restaurant.lng || order.restaurantLng || '',
    },
    deliveryPartner: {
      name: deliveryPartner.name || order.deliveryAgentName || 'Delivery Partner',
      email: deliveryPartner.email || order.deliveryPartnerEmail || order.deliveryAgentEmail || '',
      phone: deliveryPartner.phone || order.deliveryPartnerPhone || order.deliveryAgentPhone || '',
    },
    items: Array.isArray(order.items) ? order.items : [],
    notes: order.notes || order.specialInstructions || order.instructions || '',
    total: order.total ?? order.amount ?? order.payableAmount ?? 0,
    paymentMethod: order.paymentMethod || (order.paymentStatus === 'paid' ? 'Online paid' : 'Cash on delivery'),
    estimatedTime: order.estimatedTime || order.estimatedDeliveryTime || order.deliveryTime || '30-40 minutes',
    estimatedDistance: order.estimatedDistance || order.deliveryDistance || order.distance || 'Not available',
    deliveryEarnings: order.deliveryEarnings || order.deliveryFee || order.deliveryPartnerEarnings || 0,
    deliveryLat: order.deliveryLat || customer.lat || '',
    deliveryLng: order.deliveryLng || customer.lng || '',
  };
}

function renderItemsTable(items) {
  const rows = items.map((item) => {
    const quantity = getQuantity(item);
    const price = Number(item.price || 0);
    const lineTotal = price * quantity;

    return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;color:#222;">${escapeHtml(item.name || 'Item')}</td>
        <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;text-align:center;color:#555;">${quantity}</td>
        <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;text-align:right;color:#222;">${formatCurrency(lineTotal || price)}</td>
      </tr>
    `;
  }).join('');

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <thead>
        <tr>
          <th align="left" style="padding:0 0 8px;color:#777;font-size:12px;text-transform:uppercase;">Item</th>
          <th align="center" style="padding:0 0 8px;color:#777;font-size:12px;text-transform:uppercase;">Qty</th>
          <th align="right" style="padding:0 0 8px;color:#777;font-size:12px;text-transform:uppercase;">Price</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="3" style="padding:12px 0;color:#777;">No items listed</td></tr>'}</tbody>
    </table>
  `;
}

function baseTemplate({ title, alert, preheader, content, footerRestaurant }) {
  const logoMarkup = footerRestaurant.logoUrl
    ? `<img src="${escapeHtml(footerRestaurant.logoUrl)}" alt="${escapeHtml(footerRestaurant.name)} logo" width="72" style="display:block;margin:0 auto 10px;border-radius:8px;">`
    : `<div style="width:72px;height:72px;margin:0 auto 10px;border-radius:8px;background:#fff3ee;color:${BRAND_COLOR};font-weight:800;line-height:72px;text-align:center;font-size:18px;">LOGO</div>`;

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f7f4f2;font-family:Arial,Helvetica,sans-serif;color:#222;">
    <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f4f2;padding:20px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #eee;">
            <tr>
              <td style="background:${BRAND_COLOR};padding:24px 20px;text-align:center;color:#ffffff;">
                ${logoMarkup}
                <div style="font-size:24px;font-weight:800;line-height:1.25;">${escapeHtml(title)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 20px;background:#fff5f1;border-bottom:1px solid #ffd9ca;">
                <div style="font-size:18px;font-weight:900;color:${BRAND_COLOR};text-align:center;letter-spacing:.3px;">${escapeHtml(alert)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 20px;">${content}</td>
            </tr>
            <tr>
              <td style="padding:18px 20px;background:#2b211d;color:#fff;text-align:center;font-size:13px;line-height:1.6;">
                <strong>${escapeHtml(footerRestaurant.name)}</strong><br>
                ${footerRestaurant.phone ? `Phone: ${escapeHtml(footerRestaurant.phone)}<br>` : ''}
                ${footerRestaurant.website ? `<a href="${escapeHtml(footerRestaurant.website)}" style="color:#ffd3c4;text-decoration:none;">${escapeHtml(footerRestaurant.website)}</a>` : ''}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function detailRow(label, value) {
  return `
    <tr>
      <td style="padding:8px 0;color:#777;width:38%;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:8px 0;color:#222;font-weight:700;vertical-align:top;">${value}</td>
    </tr>
  `;
}

function buildRestaurantEmail(order) {
  const o = normalizeOrder(order);
  const content = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-bottom:20px;">
      ${detailRow('Order ID', escapeHtml(o.id))}
      ${detailRow('Order time', escapeHtml(formatDateTime(o.createdAt)))}
      ${detailRow('Customer', `${escapeHtml(o.customer.name)}${o.customer.phone ? `<br><span style="font-weight:400;color:#555;">${escapeHtml(o.customer.phone)}</span>` : ''}`)}
      ${detailRow('Payment', escapeHtml(o.paymentMethod))}
      ${detailRow('Delivery address', `<span style="font-weight:800;">${escapeHtml(o.customer.address || 'Not provided')}</span>`)}
    </table>
    <div style="border-top:1px solid #eeeeee;margin:0 0 18px;"></div>
    <h2 style="font-size:18px;margin:0 0 12px;color:#222;">Ordered items</h2>
    ${renderItemsTable(o.items)}
    <div style="border-top:1px solid #eeeeee;margin:20px 0;"></div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      ${detailRow('Special notes', escapeHtml(o.notes || 'None'))}
      ${detailRow('Total amount', `<span style="font-size:20px;color:${BRAND_COLOR};">${formatCurrency(o.total)}</span>`)}
    </table>
  `;

  return {
    to: o.restaurant.email,
    subject: `New order received: ${o.id}`,
    html: baseTemplate({
      title: o.restaurant.name,
      alert: 'NEW ORDER RECEIVED - PLEASE PREPARE',
      preheader: `New order ${o.id} from ${o.customer.name}`,
      content,
      footerRestaurant: o.restaurant,
    }),
  };
}

function buildDeliveryPartnerEmail(order) {
  const o = normalizeOrder(order);
  const deliveryMapLink = getGoogleMapsLink(o.customer.address, o.deliveryLat, o.deliveryLng);
  const content = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-bottom:20px;">
      ${detailRow('Order ID', escapeHtml(o.id))}
      ${detailRow('Pickup location', `<strong>${escapeHtml(o.restaurant.name)}</strong><br><span style="font-weight:400;color:#555;">${escapeHtml(o.restaurant.address || 'Address not available')}</span>`)}
      ${detailRow('Customer', `${escapeHtml(o.customer.name)}${o.customer.phone ? `<br><span style="font-weight:400;color:#555;">${escapeHtml(o.customer.phone)}</span>` : ''}`)}
      ${detailRow('Delivery address', `<span style="font-weight:800;">${escapeHtml(o.customer.address || 'Not provided')}</span>${deliveryMapLink ? `<br><a href="${escapeHtml(deliveryMapLink)}" style="color:${BRAND_COLOR};font-weight:700;text-decoration:none;">Open in Google Maps</a>` : ''}`)}
      ${detailRow('Estimated distance', escapeHtml(o.estimatedDistance))}
      ${detailRow('Delivery earnings', `<span style="font-size:20px;color:${BRAND_COLOR};">${formatCurrency(o.deliveryEarnings)}</span>`)}
    </table>
  `;

  return {
    to: o.deliveryPartner.email,
    subject: `New delivery assigned: ${o.id}`,
    html: baseTemplate({
      title: o.restaurant.name,
      alert: 'NEW DELIVERY ASSIGNED - CHECK DETAILS',
      preheader: `Delivery assigned for order ${o.id}`,
      content,
      footerRestaurant: o.restaurant,
    }),
  };
}

function buildCustomerEmail(order) {
  const o = normalizeOrder(order);
  const content = `
    <p style="font-size:16px;line-height:1.6;margin:0 0 18px;">Thank you, <strong>${escapeHtml(o.customer.name)}</strong>. We have received your order and the restaurant will start preparing it soon.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-bottom:20px;">
      ${detailRow('Order ID', escapeHtml(o.id))}
      ${detailRow('Estimated delivery', escapeHtml(o.estimatedTime))}
      ${detailRow('Total paid', `<span style="font-size:20px;color:${BRAND_COLOR};">${formatCurrency(o.total)}</span>`)}
    </table>
    <div style="border-top:1px solid #eeeeee;margin:0 0 18px;"></div>
    <h2 style="font-size:18px;margin:0 0 12px;color:#222;">Order summary</h2>
    ${renderItemsTable(o.items)}
    <div style="margin-top:20px;padding:14px 16px;background:#fff5f1;border-left:4px solid ${BRAND_COLOR};border-radius:6px;color:#4b332b;font-weight:700;">
      We will notify you when your order is out for delivery.
    </div>
  `;

  return {
    to: o.customer.email,
    subject: `Order confirmation: ${o.id}`,
    html: baseTemplate({
      title: o.restaurant.name,
      alert: 'ORDER CONFIRMED',
      preheader: `Your order ${o.id} is confirmed`,
      content,
      footerRestaurant: o.restaurant,
    }),
  };
}

function buildCustomerCancelledEmail(order, reason) {
  const o = normalizeOrder(order);
  const content = `
    <p style="font-size:16px;line-height:1.6;margin:0 0 18px;">Hi <strong>${escapeHtml(o.customer.name)}</strong>, your order has been cancelled.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-bottom:20px;">
      ${detailRow('Order ID', escapeHtml(o.id))}
      ${detailRow('Restaurant', escapeHtml(o.restaurant.name))}
      ${detailRow('Reason', escapeHtml(reason || 'The restaurant could not prepare this order.'))}
      ${detailRow('Total amount', `<span style="font-size:20px;color:${BRAND_COLOR};">${formatCurrency(o.total)}</span>`)}
    </table>
    <div style="margin-top:20px;padding:14px 16px;background:#fff5f1;border-left:4px solid ${BRAND_COLOR};border-radius:6px;color:#4b332b;font-weight:700;">
      We are sorry for the inconvenience. Please place a new order from another available restaurant.
    </div>
  `;

  return {
    to: o.customer.email,
    subject: `Order cancelled: ${o.id}`,
    html: baseTemplate({
      title: o.restaurant.name,
      alert: 'ORDER CANCELLED',
      preheader: `Your order ${o.id} was cancelled`,
      content,
      footerRestaurant: o.restaurant,
    }),
  };
}

function buildCustomerDeliveredEmail(order) {
  const o = normalizeOrder(order);
  const content = `
    <p style="font-size:16px;line-height:1.6;margin:0 0 18px;">Hi <strong>${escapeHtml(o.customer.name)}</strong>, thank you for ordering from FeastFleet.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-bottom:20px;">
      ${detailRow('Order ID', escapeHtml(o.id))}
      ${detailRow('Restaurant', escapeHtml(o.restaurant.name))}
      ${detailRow('Delivered amount', `<span style="font-size:20px;color:${BRAND_COLOR};">${formatCurrency(o.total)}</span>`)}
      ${detailRow('Order time', escapeHtml(formatDateTime(o.createdAt)))}
    </table>
    <div style="border-top:1px solid #eeeeee;margin:0 0 18px;"></div>
    <h2 style="font-size:18px;margin:0 0 12px;color:#222;">Order summary</h2>
    ${renderItemsTable(o.items)}
    <div style="margin-top:20px;padding:14px 16px;background:#effaf4;border-left:4px solid #10b981;border-radius:6px;color:#28523c;font-weight:700;">
      We hope you enjoyed the meal. Please order again soon.
    </div>
  `;

  return {
    to: o.customer.email,
    subject: `Thanks for ordering: ${o.id}`,
    html: baseTemplate({
      title: o.restaurant.name,
      alert: 'ORDER DELIVERED',
      preheader: `Your order ${o.id} has been delivered`,
      content,
      footerRestaurant: o.restaurant,
    }),
  };
}

function buildAdminOrderEventEmail(order, eventTitle, alert, reason) {
  const o = normalizeOrder(order);
  const content = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-bottom:20px;">
      ${detailRow('Order ID', escapeHtml(o.id))}
      ${detailRow('Order time', escapeHtml(formatDateTime(o.createdAt)))}
      ${detailRow('Restaurant', `${escapeHtml(o.restaurant.name)}<br><span style="font-weight:400;color:#555;">${escapeHtml(o.restaurant.address || 'Address not available')}</span>`)}
      ${detailRow('Customer', `${escapeHtml(o.customer.name)}${o.customer.phone ? `<br><span style="font-weight:400;color:#555;">${escapeHtml(o.customer.phone)}</span>` : ''}${o.customer.email ? `<br><span style="font-weight:400;color:#555;">${escapeHtml(o.customer.email)}</span>` : ''}`)}
      ${detailRow('Delivery address', `<span style="font-weight:800;">${escapeHtml(o.customer.address || 'Not provided')}</span>`)}
      ${detailRow('Delivery partner', `${escapeHtml(o.deliveryPartner.name)}${o.deliveryPartner.phone ? `<br><span style="font-weight:400;color:#555;">${escapeHtml(o.deliveryPartner.phone)}</span>` : ''}${o.deliveryPartner.email ? `<br><span style="font-weight:400;color:#555;">${escapeHtml(o.deliveryPartner.email)}</span>` : ''}`)}
      ${detailRow('Payment', escapeHtml(o.paymentMethod))}
      ${reason ? detailRow('Note', escapeHtml(reason)) : ''}
    </table>
    <div style="border-top:1px solid #eeeeee;margin:0 0 18px;"></div>
    <h2 style="font-size:18px;margin:0 0 12px;color:#222;">Items</h2>
    ${renderItemsTable(o.items)}
    <div style="border-top:1px solid #eeeeee;margin:20px 0;"></div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      ${detailRow('Total amount', `<span style="font-size:20px;color:${BRAND_COLOR};">${formatCurrency(o.total)}</span>`)}
    </table>
  `;

  return {
    to: ADMIN_EMAIL,
    subject: `${eventTitle}: ${o.id}`,
    html: baseTemplate({
      title: DEFAULT_RESTAURANT_NAME,
      alert,
      preheader: `${eventTitle} for ${o.id}`,
      content,
      footerRestaurant: {
        name: DEFAULT_RESTAURANT_NAME,
        phone: DEFAULT_RESTAURANT_PHONE,
        website: DEFAULT_WEBSITE,
        logoUrl: DEFAULT_LOGO_URL,
      },
    }),
  };
}

async function sendEmailSafely(label, mailOptions) {
  try {
    if (!mailOptions.to) {
      console.warn(`[emailService] ${label} email skipped: recipient missing`);
      return { label, skipped: true, reason: 'recipient missing' };
    }

    const info = await transporter.sendMail({
      from: `"${DEFAULT_RESTAURANT_NAME}" <${process.env.EMAIL_USER}>`,
      ...mailOptions,
    });

    console.log(`[emailService] ${label} email sent`, { to: mailOptions.to, messageId: info.messageId });
    return { label, sent: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[emailService] ${label} email failed`, error.message);
    return { label, sent: false, error: error.message };
  }
}

async function sendOrderNotifications(order) {
  return Promise.all([
    sendEmailSafely('restaurant', buildRestaurantEmail(order)),
    sendEmailSafely('deliveryPartner', buildDeliveryPartnerEmail(order)),
    sendEmailSafely('customer', buildCustomerEmail(order)),
    sendEmailSafely('admin', buildAdminOrderEventEmail(order, 'Order placed', 'NEW ORDER PLACED - ADMIN COPY')),
  ]);
}

async function sendCustomerOrderCancelledEmail(order, reason) {
  return sendEmailSafely('customerCancellation', buildCustomerCancelledEmail(order, reason));
}

async function sendCustomerOrderDeliveredEmail(order) {
  return sendEmailSafely('customerDeliveryThanks', buildCustomerDeliveredEmail(order));
}

async function sendAdminOrderEvent(order, eventTitle, alert, reason) {
  return sendEmailSafely('admin', buildAdminOrderEventEmail(order, eventTitle, alert, reason));
}

module.exports = {
  transporter,
  sendOrderNotifications,
  sendCustomerOrderCancelledEmail,
  sendCustomerOrderDeliveredEmail,
  sendAdminOrderEvent,
  buildRestaurantEmail,
  buildDeliveryPartnerEmail,
  buildCustomerEmail,
  buildCustomerCancelledEmail,
  buildCustomerDeliveredEmail,
  buildAdminOrderEventEmail,
};
