
document.documentElement.classList.remove("no-js");

const cfg = window.VANTEDGE_CONFIG || {};
const all = selector => [...document.querySelectorAll(selector)];

all("[data-email]").forEach(el => {
  const value = cfg.publicEmail || "contact@vantedgecapital.in";
  el.textContent = value;
  if (el.tagName === "A") el.href = `mailto:${value}`;
});

all("[data-phone]").forEach(el => {
  const value = cfg.phoneDisplay || "95525 24673";
  el.textContent = value;
  if (el.tagName === "A") el.href = `tel:${cfg.phoneLink || "+919552524673"}`;
});

all("[data-city]").forEach(el => {
  el.textContent = cfg.city || "Pune, Maharashtra";
});

all("[data-year]").forEach(el => {
  el.textContent = new Date().getFullYear();
});

all("[data-whatsapp]").forEach(el => {
  const number = cfg.whatsappNumber || "919552524673";
  const text = "Hello VANTEDGE CAPITAL, I would like to know more about your services.";
  el.href = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
});

const arn = document.querySelector("[data-arn-bar]");
if (arn && cfg.arn) {
  arn.hidden = false;
  arn.textContent =
    `AMFI Registered Mutual Fund Distributor | ARN: ${cfg.arn}` +
    (cfg.euin ? ` | EUIN: ${cfg.euin}` : "");
}

const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector(".main-nav");

if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(open));
  });
}

document.querySelectorAll(".faq-item button").forEach(button => {
  button.addEventListener("click", () => {
    const item = button.closest(".faq-item");
    const open = item.classList.toggle("open");
    button.setAttribute("aria-expanded", String(open));
  });
});

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach(el => observer.observe(el));

let turnstileWidgetId = null;
let verifiedTurnstileToken = "";

function setFormStatus(form, type, message) {
  const status = form.querySelector("[data-form-status]");
  if (!status) return;

  status.className = `form-status ${type}`;
  status.textContent = message;
  status.hidden = false;
  status.setAttribute("role", type === "error" ? "alert" : "status");
}

function updateSubmitButton(form) {
  const button = form?.querySelector('button[type="submit"]');
  if (!button) return;

  button.disabled = !verifiedTurnstileToken;
  button.setAttribute(
    "aria-disabled",
    String(!verifiedTurnstileToken)
  );
}

window.vantedgeTurnstileVerified = token => {
  verifiedTurnstileToken = String(token || "");

  const form = document.querySelector("#contact-form");
  const hidden = form?.querySelector('[name="turnstile_token"]');

  if (hidden) hidden.value = verifiedTurnstileToken;

  updateSubmitButton(form);

  if (verifiedTurnstileToken) {
    setFormStatus(
      form,
      "success",
      "Security verification completed. You can now send your enquiry."
    );
  }
};

window.vantedgeTurnstileExpired = () => {
  verifiedTurnstileToken = "";

  const form = document.querySelector("#contact-form");
  const hidden = form?.querySelector('[name="turnstile_token"]');

  if (hidden) hidden.value = "";

  updateSubmitButton(form);

  setFormStatus(
    form,
    "error",
    "Security verification expired. Please verify again."
  );
};

window.vantedgeTurnstileError = errorCode => {
  verifiedTurnstileToken = "";

  const form = document.querySelector("#contact-form");
  updateSubmitButton(form);

  setFormStatus(
    form,
    "error",
    `Security verification could not load. Please refresh the page and try again.${errorCode ? ` Code: ${errorCode}` : ""}`
  );
};

window.onVantedgeTurnstileReady = () => {
  const container = document.querySelector("#turnstile-container");
  const form = document.querySelector("#contact-form");

  if (!container || !form || !window.turnstile) return;

  const sitekey = String(cfg.turnstileSiteKey || "").trim();

  if (!sitekey || sitekey.includes("PASTE_")) {
    container.innerHTML =
      '<p class="form-setup-warning">Turnstile setup is pending. Add the public site key in <code>public/assets/js/settings.js</code>.</p>';
    updateSubmitButton(form);
    return;
  }

  turnstileWidgetId = window.turnstile.render(container, {
    sitekey,
    theme: "light",
    size: "normal",
    appearance: "always",
    action: "contact_form",
    callback: window.vantedgeTurnstileVerified,
    "expired-callback": window.vantedgeTurnstileExpired,
    "error-callback": window.vantedgeTurnstileError,
    "timeout-callback": window.vantedgeTurnstileExpired,
    "response-field": false
  });

  updateSubmitButton(form);
};

const form = document.querySelector("#contact-form");

if (form) {
  updateSubmitButton(form);

  form.addEventListener("submit", async event => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const button = form.querySelector('button[type="submit"]');
    const honeypot = form.querySelector('[name="company_website"]');
    const hiddenToken = form.querySelector('[name="turnstile_token"]');

    if (honeypot?.value) return;

    const token =
      verifiedTurnstileToken ||
      hiddenToken?.value ||
      "";

    if (!token) {
      setFormStatus(
        form,
        "error",
        "Please complete the Cloudflare security verification before sending."
      );
      return;
    }

    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.textContent = "Sending securely…";

    setFormStatus(
      form,
      "pending",
      "Your enquiry is being sent securely."
    );

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          name: form.elements.name.value.trim(),
          phone: form.elements.phone.value.trim(),
          email: form.elements.email.value.trim(),
          service: form.elements.service.value,
          preferredContact: form.elements.preferredContact.value,
          message: form.elements.message.value.trim(),
          consent: form.elements.consent.checked,
          turnstileToken: token,
          companyWebsite: honeypot?.value || ""
        })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message || "We could not send your enquiry."
        );
      }

      form.reset();
      verifiedTurnstileToken = "";
      if (hiddenToken) hiddenToken.value = "";

      setFormStatus(
        form,
        "success",
        "Thank you. Your enquiry has been sent successfully. We will contact you within one business day."
      );
    } catch (error) {
      setFormStatus(
        form,
        "error",
        error.message ||
          "Something went wrong. Please use WhatsApp or call us."
      );
    } finally {
      button.textContent =
        button.dataset.originalText || "Send Enquiry";

      if (window.turnstile && turnstileWidgetId !== null) {
        window.turnstile.reset(turnstileWidgetId);
      }

      verifiedTurnstileToken = "";
      updateSubmitButton(form);
    }
  });
}
