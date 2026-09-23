export const EMAIL_TEMPLATE_ORDER = [
  "confirm_signup",
  "password_recovery",
  "email_change",
  "with_invitation",
];

export const EMAIL_TEMPLATE_META = {
  confirm_signup: {
    label: "Confirm email",
    category: "Account",
    delivery: "Supabase Auth",
    variables: [],
    systemNote: "",
    sample: {
      action_url: "https://staging.imwith.me",
    },
  },
  password_recovery: {
    label: "Password recovery",
    category: "Security",
    delivery: "Supabase Auth",
    variables: [],
    systemNote: "If you didn’t request this, you can safely ignore this email.",
    sample: {
      action_url: "https://staging.imwith.me/?recovery=1",
    },
  },
  email_change: {
    label: "Confirm email change",
    category: "Security",
    delivery: "Supabase Auth",
    variables: ["new_email"],
    systemNote: "If you didn’t request this change, you can safely ignore this email.",
    sample: {
      new_email: "shane@example.com",
      action_url: "https://staging.imwith.me",
    },
  },
  with_invitation: {
    label: "Join a With invitation",
    category: "Invitation",
    delivery: "Resend",
    variables: ["inviter_name", "with_name", "recipient_email", "expires_days"],
    systemNote: "This invitation was sent to {{recipient_email}} and expires in {{expires_days}} days.",
    sample: {
      inviter_name: "Shane",
      with_name: "Shane & Alli",
      recipient_email: "friend@example.com",
      expires_days: "30",
      action_url: "https://staging.imwith.me/?invite=SAMPLE",
    },
  },
};

export const EDITABLE_EMAIL_FIELDS = [
  ["subject", "Subject"],
  ["preheader", "Preheader"],
  ["headline", "Headline"],
  ["body_copy", "Body copy"],
  ["cta_label", "CTA label"],
  ["supporting_text", "Supporting text"],
];

const INLINE_FORMATTING_FIELDS = new Set(["body_copy", "supporting_text"]);
const INLINE_TAG_PATTERN = /<\/?(?:b|strong|i|em)>|<br\s*\/?>/gi;
const HTML_LIKE_TAG_PATTERN = /<\s*\/?\s*[a-z][^>]*>/i;

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function restoreAllowedInlineTags(value) {
  return String(value || "")
    .replace(/&lt;(\/?)(b|strong|i|em)&gt;/gi, (_full, slash, tag) => `<${slash}${tag.toLowerCase()}>`)
    .replace(/&lt;br\s*\/?&gt;/gi, "<br>");
}

export function formatEmailInlineHtml(value) {
  return restoreAllowedInlineTags(escapeHtml(value)).replaceAll("\n", "<br>");
}

export function unsupportedEmailMarkup(value) {
  const remainder = String(value || "").replace(INLINE_TAG_PATTERN, "");
  return HTML_LIKE_TAG_PATTERN.test(remainder);
}

const VARIABLE_PATTERN = /{{\s*([a-z0-9_]+)\s*}}/gi;

export function extractVariables(value) {
  const variables = [];
  for (const match of String(value || "").matchAll(VARIABLE_PATTERN)) variables.push(match[1]);
  return [...new Set(variables)];
}

export function interpolateEmailText(value, data = {}) {
  return String(value || "").replace(VARIABLE_PATTERN, (_full, key) => {
    const replacement = data[key];
    return replacement == null ? `{{${key}}}` : String(replacement);
  });
}

export function validateEmailDraft(draft) {
  const problems = [];
  if (!draft) return ["Choose an email first."];

  const limits = {
    subject: 180,
    preheader: 240,
    headline: 180,
    body_copy: 1600,
    cta_label: 80,
    supporting_text: 800,
  };
  const required = ["subject", "headline", "body_copy", "cta_label"];
  for (const field of required) {
    if (!String(draft[field] || "").trim()) problems.push(`${field.replaceAll("_", " ")} is required.`);
  }
  for (const [field, limit] of Object.entries(limits)) {
    const value = String(draft[field] || "");
    if (value.length > limit) problems.push(`${field.replaceAll("_", " ")} must be ${limit} characters or fewer.`);
    if (HTML_LIKE_TAG_PATTERN.test(value)) {
      if (!INLINE_FORMATTING_FIELDS.has(field)) {
        problems.push("Inline formatting is only available in body copy and supporting text.");
      } else if (unsupportedEmailMarkup(value)) {
        problems.push("Body copy and supporting text support only <b>, <strong>, <i>, <em>, and <br> tags without attributes.");
      }
    }
  }

  const meta = EMAIL_TEMPLATE_META[draft.template_key];
  if (!meta) return ["Unsupported email template."];
  const allowed = new Set(meta.variables);
  for (const field of Object.keys(limits)) {
    for (const variable of extractVariables(draft[field])) {
      if (!allowed.has(variable)) problems.push(`{{${variable}}} is not available for this email.`);
    }
  }
  return problems;
}

export function emailPreviewModel(template) {
  const meta = EMAIL_TEMPLATE_META[template.template_key];
  const sample = meta?.sample || {};
  return {
    subject: interpolateEmailText(template.subject, sample),
    preheader: interpolateEmailText(template.preheader, sample),
    headline: interpolateEmailText(template.headline, sample),
    body: interpolateEmailText(template.body_copy, sample),
    bodyHtml: formatEmailInlineHtml(interpolateEmailText(template.body_copy, sample)),
    cta: interpolateEmailText(template.cta_label, sample),
    supporting: interpolateEmailText(template.supporting_text, sample),
    supportingHtml: formatEmailInlineHtml(interpolateEmailText(template.supporting_text, sample)),
    systemNote: interpolateEmailText(meta?.systemNote || "", sample),
    actionUrl: sample.action_url || "https://staging.imwith.me",
  };
}
