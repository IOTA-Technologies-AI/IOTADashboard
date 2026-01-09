import { NextResponse } from 'next/server';

const RESEND_API_URL = 'https://api.resend.com/emails';

const fromEmail = process.env.RESEND_FROM_EMAIL || 'iota@emails.iotatechnologies.io';
const apiKey = process.env.RESEND_API_KEY;

export async function POST(request) {
  if (!apiKey) {
    return NextResponse.json({ message: 'RESEND_API_KEY not set' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { to, subject, html, text, replyTo } = body || {};

    if (!to || !subject || (!html && !text)) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const payload = {
      from: fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: html || undefined,
      text: text || undefined,
      reply_to: replyTo || undefined,
    };

    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    const status = res.status;

    if (!res.ok) {
      return NextResponse.json({ message: data?.message || 'Failed to send email' }, { status });
    }

    return NextResponse.json({ id: data?.id, status: 'queued' }, { status });
  } catch (error) {
    console.error('Resend send email failed', error);
    return NextResponse.json({ message: 'Failed to send email' }, { status: 500 });
  }
}
