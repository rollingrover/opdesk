// Vercel Serverless Function: /api/notify-ticket.js
// Sends email notification to relborg@outlook.com when a new support ticket is submitted.
// Requires RESEND_API_KEY environment variable set in Vercel project settings.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { category, subject, description, company_name, submitter_email, ticket_id } = req.body || {};

  if (!subject || !category) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Silently succeed if key not configured — don't break the ticket submit flow
    return res.status(200).json({ ok: true, skipped: true });
  }

  const htmlBody = `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:24px;border-radius:12px">
      <div style="background:#0F2540;padding:20px 24px;border-radius:8px;margin-bottom:20px">
        <h2 style="color:#D4A853;margin:0;font-size:18px">&#x1F6A8; New Support Ticket</h2>
        <p style="color:rgba(255,255,255,0.6);margin:4px 0 0;font-size:13px">OpDesk Support System</p>
      </div>
      <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <tr style="background:#f3f4f6"><td style="padding:10px 16px;font-weight:700;font-size:12px;color:#6b7280;text-transform:uppercase;width:130px">Category</td>
          <td style="padding:10px 16px;font-size:14px;color:#111">${category}</td></tr>
        <tr><td style="padding:10px 16px;font-weight:700;font-size:12px;color:#6b7280;text-transform:uppercase">Subject</td>
          <td style="padding:10px 16px;font-size:14px;color:#111;font-weight:600">${subject}</td></tr>
        <tr style="background:#f3f4f6"><td style="padding:10px 16px;font-weight:700;font-size:12px;color:#6b7280;text-transform:uppercase">Company</td>
          <td style="padding:10px 16px;font-size:14px;color:#111">${company_name || 'Unknown'}</td></tr>
        <tr><td style="padding:10px 16px;font-weight:700;font-size:12px;color:#6b7280;text-transform:uppercase">From</td>
          <td style="padding:10px 16px;font-size:14px;color:#111">${submitter_email || 'Unknown'}</td></tr>
        <tr style="background:#f3f4f6"><td style="padding:10px 16px;font-weight:700;font-size:12px;color:#6b7280;text-transform:uppercase;vertical-align:top">Details</td>
          <td style="padding:10px 16px;font-size:14px;color:#374151;white-space:pre-wrap;line-height:1.6">${description}</td></tr>
      </table>
      <div style="margin-top:20px;text-align:center">
        <a href="https://opdesk.app/bookings.html?admin" style="background:#dc2626;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
          View in Admin Panel
        </a>
      </div>
      <p style="margin-top:20px;font-size:11px;color:#9ca3af;text-align:center">OpDesk by RollingRover Productions · Ticket ID: ${ticket_id || 'N/A'}</p>
    </div>
  `;

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // TODO: Once opdesk.app is verified in Resend, change to: support@opdesk.app
        from: 'OpDesk Support <onboarding@resend.dev>',
        to: ['relborg@outlook.com'],
        subject: `[OpDesk Support] ${category}: ${subject}`,
        html: htmlBody,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error('Resend error:', err);
      return res.status(200).json({ ok: false, error: err }); // Don't fail the user flow
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Notify ticket error:', err);
    return res.status(200).json({ ok: false, error: err.message }); // Graceful degradation
  }
}
