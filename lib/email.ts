interface EmailParams {
  to: string[];
  subject: string;
  text: string;
  html?: string;
}

function hasEmailEnv() {
  return Boolean(
    process.env.RESEND_API_KEY &&
      process.env.NOTIFICATION_FROM_EMAIL
  );
}

export async function sendEmail(params: EmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_FROM_EMAIL;

  if (!hasEmailEnv() || params.to.length === 0) {
    return { delivered: false };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Email delivery failed: ${detail}`);
  }

  return { delivered: true };
}
