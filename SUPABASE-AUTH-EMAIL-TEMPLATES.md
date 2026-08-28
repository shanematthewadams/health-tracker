# With V1 — Supabase Auth Email Templates

These templates are for the hosted Supabase project and must be pasted into **Authentication → Email Templates** in the Supabase dashboard.

They intentionally use `{{ .ConfirmationURL }}` so the existing environment-aware redirect behavior remains unchanged.

## Confirm signup

**Subject**

`Welcome to With — confirm your email`

**Body**

```html
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#1F5E57;font-family:Arial,sans-serif;color:#171816;">
    <div style="padding:28px 14px;">
      <div style="max-width:560px;margin:0 auto;background:#FCFBF8;border-radius:20px;overflow:hidden;box-shadow:0 14px 40px rgba(17,50,46,.18);">
        <div style="padding:28px 30px 18px;background:#1F5E57;color:#fff;">
          <div style="font-family:Georgia,serif;font-size:32px;font-weight:700;line-height:1;">With</div>
          <div style="margin-top:7px;font-size:12px;color:rgba(255,255,255,.76);">We’re in this together.</div>
        </div>
        <div style="padding:30px;">
          <div style="font-family:Georgia,serif;font-size:28px;font-weight:700;line-height:1.12;margin-bottom:16px;">Confirm your email.</div>
          <p style="margin:0 0 14px;line-height:1.6;color:#5D615F;">You’re almost in. Confirm this email address to finish creating your With account.</p>
   <p style="margin:0;line-height:1.6;color:#171816;"><strong>Your health stays yours.</strong> With simply gives you a private place to take care of yourself alongside people you trust.</p>
          <p style="margin:26px 0 0;">
            <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1F5E57;color:#fff;text-decoration:none;padding:13px 18px;border-radius:10px;font-weight:700;">Confirm my email</a>
          </p>
          
          <p style="font-size:12px;line-height:1.5;color:#8A8F94;margin:26px 0 0;">If the button doesn’t work, use this link:<br><a href="{{ .ConfirmationURL }}" style="color:#174E49;word-break:break-all;">{{ .ConfirmationURL }}</a></p>
        </div>
      </div>
    </div>
  </body>
</html>
```

## Reset password

**Subject**

`Reset your With password`

**Body**

```html
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#1F5E57;font-family:Arial,sans-serif;color:#171816;">
    <div style="padding:28px 14px;">
      <div style="max-width:560px;margin:0 auto;background:#FCFBF8;border-radius:20px;overflow:hidden;box-shadow:0 14px 40px rgba(17,50,46,.18);">
        <div style="padding:28px 30px 18px;background:#1F5E57;color:#fff;">
          <div style="font-family:Georgia,serif;font-size:32px;font-weight:700;line-height:1;">With</div>
          <div style="margin-top:7px;font-size:12px;color:rgba(255,255,255,.76);">We’re in this together.</div>
        </div>
        <div style="padding:30px;">
          <div style="font-family:Georgia,serif;font-size:28px;font-weight:700;line-height:1.12;margin-bottom:16px;">Choose a new password.</div>
          <p style="margin:0 0 14px;line-height:1.6;color:#5D615F;">We received a request to reset your With password.</p>
   <p style="margin:0;line-height:1.6;color:#171816;">Use the button below to choose a new one. If you didn’t request this, you can safely ignore this email.</p>
          <p style="margin:26px 0 0;">
            <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1F5E57;color:#fff;text-decoration:none;padding:13px 18px;border-radius:10px;font-weight:700;">Reset my password</a>
          </p>
          
          <p style="font-size:12px;line-height:1.5;color:#8A8F94;margin:26px 0 0;">If the button doesn’t work, use this link:<br><a href="{{ .ConfirmationURL }}" style="color:#174E49;word-break:break-all;">{{ .ConfirmationURL }}</a></p>
        </div>
      </div>
    </div>
  </body>
</html>
```

## Change email address

**Subject**

`Confirm your new With email`

**Body**

```html
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#1F5E57;font-family:Arial,sans-serif;color:#171816;">
    <div style="padding:28px 14px;">
      <div style="max-width:560px;margin:0 auto;background:#FCFBF8;border-radius:20px;overflow:hidden;box-shadow:0 14px 40px rgba(17,50,46,.18);">
        <div style="padding:28px 30px 18px;background:#1F5E57;color:#fff;">
          <div style="font-family:Georgia,serif;font-size:32px;font-weight:700;line-height:1;">With</div>
          <div style="margin-top:7px;font-size:12px;color:rgba(255,255,255,.76);">We’re in this together.</div>
        </div>
        <div style="padding:30px;">
          <div style="font-family:Georgia,serif;font-size:28px;font-weight:700;line-height:1.12;margin-bottom:16px;">Confirm your new email.</div>
          <p style="margin:0 0 14px;line-height:1.6;color:#5D615F;">You asked to change the email address you use to sign in to With.</p>
   <p style="margin:0;line-height:1.6;color:#171816;">Confirm <strong>{{ .NewEmail }}</strong> to finish the change. If you didn’t request this, you can safely ignore this email.</p>
          <p style="margin:26px 0 0;">
            <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1F5E57;color:#fff;text-decoration:none;padding:13px 18px;border-radius:10px;font-weight:700;">Confirm new email</a>
          </p>
          
          <p style="font-size:12px;line-height:1.5;color:#8A8F94;margin:26px 0 0;">If the button doesn’t work, use this link:<br><a href="{{ .ConfirmationURL }}" style="color:#174E49;word-break:break-all;">{{ .ConfirmationURL }}</a></p>
        </div>
      </div>
    </div>
  </body>
</html>
```

## Notes

- Invitation emails are handled separately by the `send-with-invite` function and have already been styled in code.
- Do not replace `{{ .ConfirmationURL }}` with a fixed production URL. With already passes the correct redirect destination for staging vs. production.
- The email HTML deliberately uses web-safe fonts rather than relying on remote font loading, which is unreliable in email clients.
