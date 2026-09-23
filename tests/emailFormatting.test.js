import test from "node:test";
import assert from "node:assert/strict";
import { formatEmailInlineHtml, validateEmailDraft } from "../src/emailTemplates.js";

const baseDraft = {
  template_key: "password_recovery",
  subject: "Reset your password",
  preheader: "Reset your With password.",
  headline: "Reset your password",
  body_copy: "Use the button below.",
  cta_label: "Reset password",
  supporting_text: "",
};

test("safe inline formatting renders only the approved email tags", () => {
  assert.equal(
    formatEmailInlineHtml('Take <b>care</b> <i>together</i><br><img src="x" onerror="nope">'),
    'Take <b>care</b> <i>together</i><br>&lt;img src=&quot;x&quot; onerror=&quot;nope&quot;&gt;'
  );
});

test("body copy and supporting text allow limited inline formatting", () => {
  const problems = validateEmailDraft({
    ...baseDraft,
    body_copy: "Use <strong>this</strong> link.<br>It expires soon.",
    supporting_text: "<em>Keep this email private.</em>",
  });
  assert.deepEqual(problems, []);
});

test("arbitrary HTML and formatting outside body fields stay blocked", () => {
  const attributeProblems = validateEmailDraft({
    ...baseDraft,
    body_copy: '<b style="color:red">Nope</b>',
  });
  assert.match(attributeProblems.join(" "), /support only <b>/);

  const headlineProblems = validateEmailDraft({
    ...baseDraft,
    headline: "<b>Reset your password</b>",
  });
  assert.match(headlineProblems.join(" "), /only available in body copy and supporting text/);
});
