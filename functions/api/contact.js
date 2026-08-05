
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  }
});

const clean = (value, max = 500) => String(value ?? "")
  .replace(/[\u0000-\u001F\u007F]/g, " ")
  .trim()
  .slice(0, max);

const escapeHtml = (value) => clean(value, 2000)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const validPhone = value => /^[0-9+()\-\s]{8,20}$/.test(value);

async function verifyTurnstile(token, request, env) {
  const body = new URLSearchParams({
    secret: env.TURNSTILE_SECRET,
    response: token,
    remoteip: request.headers.get("CF-Connecting-IP") || ""
  });

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: {"Content-Type": "application/x-www-form-urlencoded"},
      body
    }
  );

  if (!response.ok) return {success: false};
  return response.json();
}

async function sendEmailWithCloudflare(env, payload) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/email/sending/send`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.CF_EMAIL_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    console.error("Cloudflare Email Service error:", JSON.stringify(data));
    throw new Error("Email delivery failed");
  }

  return data;
}

export async function onRequestPost(context) {
  const {request, env} = context;

  for (const required of [
    "TURNSTILE_SECRET",
    "CF_ACCOUNT_ID",
    "CF_EMAIL_API_TOKEN"
  ]) {
    if (!env[required]) {
      console.error(`${required} is not configured.`);
      return json({
        success: false,
        message: "The secure enquiry service is not fully configured yet."
      }, 503);
    }
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return json({success: false, message: "Invalid form request."}, 400);
  }

  // Honeypot: silently accept bot submissions without sending.
  if (clean(input.companyWebsite, 200)) {
    return json({success: true, message: "Enquiry received."});
  }

  const name = clean(input.name, 100);
  const phone = clean(input.phone, 20);
  const email = clean(input.email, 160).toLowerCase();
  const service = clean(input.service, 120);
  const preferredContact = clean(input.preferredContact, 40);
  const message = clean(input.message, 1500);
  const token = clean(input.turnstileToken, 2048);
  const consent = input.consent === true;

  if (
    name.length < 2 ||
    !validPhone(phone) ||
    !validEmail(email) ||
    !service ||
    message.length < 10 ||
    !consent ||
    !token
  ) {
    return json({
      success: false,
      message: "Please complete all required fields correctly."
    }, 400);
  }

  let verification;
  try {
    verification = await verifyTurnstile(token, request, env);
  } catch (error) {
    console.error("Turnstile request failed:", error);
    return json({
      success: false,
      message: "Security verification could not be completed. Please try again."
    }, 502);
  }

  if (!verification.success || verification.action !== "contact_form") {
    return json({
      success: false,
      message: "Security verification failed or expired. Please try again."
    }, 403);
  }

  const safe = {
    name: escapeHtml(name),
    phone: escapeHtml(phone),
    email: escapeHtml(email),
    service: escapeHtml(service),
    preferredContact: escapeHtml(preferredContact),
    message: escapeHtml(message).replaceAll("\n", "<br>")
  };

  const submittedAt = new Date().toISOString();
  const subject = `New Website Enquiry | ${service} | ${name}`;

  const html = `<!doctype html>
  <html><body style="margin:0;background:#f3f5f8;font-family:Arial,sans-serif;color:#172033">
    <div style="max-width:680px;margin:24px auto;background:#fff;border:1px solid #dfe5ed;border-radius:14px;overflow:hidden">
      <div style="background:#07111f;padding:22px 26px;color:#fff">
        <div style="font-size:21px;font-weight:700">VANTEDGE CAPITAL</div>
        <div style="margin-top:5px;color:#d7a648;font-size:13px">New website enquiry</div>
      </div>
      <div style="padding:26px">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:10px 0;color:#667085;width:34%">Name</td><td style="padding:10px 0;font-weight:600">${safe.name}</td></tr>
          <tr><td style="padding:10px 0;color:#667085">Phone</td><td style="padding:10px 0">${safe.phone}</td></tr>
          <tr><td style="padding:10px 0;color:#667085">Email</td><td style="padding:10px 0">${safe.email}</td></tr>
          <tr><td style="padding:10px 0;color:#667085">Service</td><td style="padding:10px 0">${safe.service}</td></tr>
          <tr><td style="padding:10px 0;color:#667085">Preferred contact</td><td style="padding:10px 0">${safe.preferredContact}</td></tr>
        </table>
        <div style="margin-top:18px;padding:16px;background:#f7f8fa;border-radius:10px">
          <div style="font-size:12px;color:#667085;margin-bottom:8px">MESSAGE</div>
          <div style="font-size:14px;line-height:1.6">${safe.message}</div>
        </div>
        <div style="margin-top:20px;color:#98a2b3;font-size:11px">Submitted: ${submittedAt}</div>
      </div>
    </div>
  </body></html>`;

  const text = `NEW VANTEDGE WEBSITE ENQUIRY

Name: ${name}
Phone: ${phone}
Email: ${email}
Service: ${service}
Preferred contact: ${preferredContact}

Message:
${message}

Submitted: ${submittedAt}`;

  try {
    const sent = await sendEmailWithCloudflare(env, {
      to: "contact@vantedgecapital.in",
      from: "website@vantedgecapital.in",
      replyTo: email,
      subject,
      html,
      text
    });

    if (env.CRM_WEBHOOK_URL) {
      context.waitUntil(
        fetch(env.CRM_WEBHOOK_URL, {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({
            name, phone, email, service, preferredContact,
            message, submittedAt, source: "vantedge-website"
          })
        }).catch(error => console.error("CRM webhook failed:", error))
      );
    }

    return json({
      success: true,
      message: "Your enquiry has been sent.",
      reference: sent.result?.id || sent.result?.message_id || null
    });
  } catch (error) {
    console.error("Email send failed:", error);
    return json({
      success: false,
      message: "We could not send your enquiry. Please use WhatsApp or call us."
    }, 502);
  }
}

export function onRequest(context) {
  if (context.request.method === "POST") return onRequestPost(context);
  return json({success: false, message: "Method not allowed."}, 405);
}
