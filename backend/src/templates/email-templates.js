const { UI_BASE_URL, SERVICE_BASE_URL } = require("../../environment-config");
const contactEmail = process.env.EMAIL_CONTACT_US;

// ─── Shared layout wrapper ────────────────────────────────────────────────────
const wrap = (innerHtml) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=League+Spartan:wght@300;400;600;700;900&display=swap" rel="stylesheet">
  <style>
    body { margin: 0; padding: 0; background: #f0f4f8; font-family: 'League Spartan', sans-serif; }
    @media (max-width: 600px) { .main { width: 100% !important; } }
  </style>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'League Spartan',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;">
    <tr><td align="center">
      <table class="main" width="600" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(13,31,54,0.10);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0a9499 0%,#10a7a4 60%,#ff5f54 100%);padding:32px 40px;text-align:center;">
            <p style="margin:0;font-size:26px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">Momenta</p>
            <p style="margin:6px 0 0;font-size:13px;font-weight:300;color:rgba(255,255,255,0.82);letter-spacing:0.04em;">
              Connect · Share · Celebrate
            </p>
          </td>
        </tr>

        <!-- Body -->
        ${innerHtml}

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e8eef4;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ab2c8;line-height:1.6;">
              You received this email because an action was taken on your Momenta account.<br>
              Questions? <a href="mailto:${contactEmail}" style="color:#0a9499;text-decoration:none;">Contact our team</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ─── CTA button helper ────────────────────────────────────────────────────────
const ctaBtn = (href, label) =>
  `<a href="${href}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#0a9499,#10a7a4);color:#ffffff;text-decoration:none;border-radius:100px;font-size:15px;font-weight:700;letter-spacing:0.02em;box-shadow:0 4px 16px rgba(10,148,153,0.30);">${label}</a>`;

// ─── Templates ───────────────────────────────────────────────────────────────

const verifyEmailTemplate = ({ name, verifyUrl }) => wrap(`
  <tr>
    <td style="padding:48px 40px 16px;text-align:center;">
      <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:rgba(10,148,153,0.10);line-height:64px;font-size:28px;margin-bottom:24px;">✉️</div>
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#0d1f35;letter-spacing:-0.5px;">Verify your email</h1>
      <p style="margin:0;font-size:14px;font-weight:300;color:#5a7490;">You're one step away from your first moment</p>
    </td>
  </tr>
  <tr>
    <td style="padding:16px 40px 32px;text-align:center;">
      <p style="margin:0 0 28px;font-size:16px;font-weight:300;color:#405670;line-height:1.7;">
        Hi <strong style="font-weight:700;color:#0d1f35;">${name}</strong> 👋 — welcome to Momenta!<br>
        To start creating and sharing beautiful moments, please verify your email address.
      </p>
      ${ctaBtn(verifyUrl, 'Verify My Email')}
      <p style="margin:24px 0 0;font-size:13px;color:#9ab2c8;">
        Button not working? <a href="${verifyUrl}" style="color:#0a9499;word-break:break-all;">${verifyUrl}</a>
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:0 40px 40px;text-align:center;">
      <div style="background:#f8fafc;border-radius:12px;padding:20px 24px;border:1px solid #e8eef4;">
        <p style="margin:0;font-size:14px;color:#5a7490;line-height:1.6;">
          Once verified, you'll be able to create moments for birthdays, weddings, farewells,
          and every celebration that deserves to be remembered. 🎉
        </p>
      </div>
    </td>
  </tr>`);

const resetPasswordTemplate = ({ name, resetUrl }) => wrap(`
  <tr>
    <td style="padding:48px 40px 16px;text-align:center;">
      <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:rgba(255,95,84,0.10);line-height:64px;font-size:28px;margin-bottom:24px;">🔐</div>
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#0d1f35;letter-spacing:-0.5px;">Reset your password</h1>
      <p style="margin:0;font-size:14px;font-weight:300;color:#5a7490;">We got your reset request — no worries, we've got you covered</p>
    </td>
  </tr>
  <tr>
    <td style="padding:16px 40px 32px;text-align:center;">
      <p style="margin:0 0 28px;font-size:16px;font-weight:300;color:#405670;line-height:1.7;">
        Hi <strong style="font-weight:700;color:#0d1f35;">${name}</strong>,<br>
        Click the button below to set a new password for your Momenta account.
        This link expires in <strong>3 hours</strong>.
      </p>
      ${ctaBtn(resetUrl, 'Reset My Password')}
      <p style="margin:24px 0 0;font-size:13px;color:#9ab2c8;">
        Didn't request this? You can safely ignore this email — your account is secure.
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:0 40px 40px;">
      <div style="background:#fff5f5;border-radius:12px;padding:16px 20px;border:1px solid #ffd5d2;">
        <p style="margin:0;font-size:13px;color:#c0392b;line-height:1.6;">
          ⚠️ If you didn't request a password reset, please
          <a href="mailto:${contactEmail}" style="color:#c0392b;font-weight:700;">contact us immediately</a>.
        </p>
      </div>
    </td>
  </tr>`);

const inviteLinkTemplate = ({ inviterName, wallTitle, inviteUrl }) => wrap(`
  <tr>
    <td style="padding:48px 40px 16px;text-align:center;">
      <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:rgba(10,148,153,0.10);line-height:64px;font-size:28px;margin-bottom:24px;">🎉</div>
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#0d1f35;letter-spacing:-0.5px;">You're invited!</h1>
      <p style="margin:0;font-size:14px;font-weight:300;color:#5a7490;">Someone special wants you to be part of a moment</p>
    </td>
  </tr>
  <tr>
    <td style="padding:16px 40px 32px;text-align:center;">
      <p style="margin:0 0 20px;font-size:16px;font-weight:300;color:#405670;line-height:1.7;">
        <strong style="font-weight:700;color:#0d1f35;">${inviterName}</strong> has personally invited you
        to join <strong style="font-weight:700;color:#0a9499;">"${wallTitle}"</strong> on Momenta.<br><br>
        This is a shared space for heartfelt messages, memories, and celebrations.
        Your words will make it unforgettable. 💛
      </p>
      ${ctaBtn(inviteUrl, 'Join the Moment')}
      <p style="margin:24px 0 0;font-size:13px;color:#9ab2c8;">
        Link not working? <a href="${inviteUrl}" style="color:#0a9499;word-break:break-all;">${inviteUrl}</a>
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:0 40px 40px;text-align:center;">
      <div style="background:#f0fffe;border-radius:12px;padding:20px 24px;border:1px solid #c8f0ef;">
        <p style="margin:0;font-size:14px;color:#0a9499;line-height:1.6;">
          ✨ Momenta lets you collect messages, photos, and reactions from people who care —
          all in one beautiful, shareable moment.
        </p>
      </div>
    </td>
  </tr>`);

const scheduledDeliveryTemplate = ({ creatorName, wallName, token }) => wrap(`
  <tr>
    <td style="padding:48px 40px 16px;text-align:center;">
      <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:rgba(10,148,153,0.10);line-height:64px;font-size:28px;margin-bottom:24px;">🎁</div>
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#0d1f35;letter-spacing:-0.5px;">A moment arrived for you</h1>
      <p style="margin:0;font-size:14px;font-weight:300;color:#5a7490;">Someone made something special just for you</p>
    </td>
  </tr>
  <tr>
    <td style="padding:16px 40px 32px;text-align:center;">
      <p style="margin:0 0 28px;font-size:16px;font-weight:300;color:#405670;line-height:1.7;">
        <strong style="font-weight:700;color:#0d1f35;">${creatorName}</strong> has sent you
        <strong style="font-weight:700;color:#0a9499;">"${wallName}"</strong> — a collection of
        heartfelt messages, stories, and memories from people who care about you.<br><br>
        Open it whenever you're ready. Take your time. 💛
      </p>
      ${ctaBtn(`${SERVICE_BASE_URL}/api/walls/view-receiver-wall/${token}`, 'Open My Moment')}
    </td>
  </tr>
  <tr>
    <td style="padding:0 40px 40px;text-align:center;">
      <div style="background:#f0fffe;border-radius:12px;padding:20px 24px;border:1px solid #c8f0ef;">
        <p style="margin:0;font-size:14px;color:#5a7490;line-height:1.6;">
          Inside you'll find words, images, and reactions carefully chosen by the people who wanted to make you smile. 🌟
        </p>
      </div>
    </td>
  </tr>`);

const accessControlTemplate = ({ wallId, creatorName, wallName }) => wrap(`
  <tr>
    <td style="padding:48px 40px 16px;text-align:center;">
      <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:rgba(10,148,153,0.10);line-height:64px;font-size:28px;margin-bottom:24px;">🔓</div>
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#0d1f35;letter-spacing:-0.5px;">You've been granted access</h1>
      <p style="margin:0;font-size:14px;font-weight:300;color:#5a7490;">You're now part of something meaningful</p>
    </td>
  </tr>
  <tr>
    <td style="padding:16px 40px 32px;text-align:center;">
      <p style="margin:0 0 28px;font-size:16px;font-weight:300;color:#405670;line-height:1.7;">
        <strong style="font-weight:700;color:#0d1f35;">${creatorName}</strong> has given you access to
        <strong style="font-weight:700;color:#0a9499;">"${wallName}"</strong> on Momenta.<br><br>
        Jump in, explore the messages shared by others, and add your own — your voice makes this moment complete.
      </p>
      ${ctaBtn(`${UI_BASE_URL}/moment/${wallId}`, 'View the Moment')}
    </td>
  </tr>
  <tr>
    <td style="padding:0 40px 40px;text-align:center;">
      <div style="background:#f0fffe;border-radius:12px;padding:20px 24px;border:1px solid #c8f0ef;">
        <p style="margin:0;font-size:14px;color:#5a7490;line-height:1.6;">
          If you have any questions, feel free to reach out to ${creatorName} or
          <a href="mailto:${contactEmail}" style="color:#0a9499;text-decoration:none;">our support team</a>. 💬
        </p>
      </div>
    </td>
  </tr>`);

// ─── Unified export object (used by mail-service) ─────────────────────────────
const emailTemplates = {
  verifyEmail:         (params) => verifyEmailTemplate(params),
  resetPassword:       (params) => resetPasswordTemplate(params),
  inviteLink:          (params) => inviteLinkTemplate(params),
  scheduledDelivery:   (params) => scheduledDeliveryTemplate(params),
  accessControl:       (params) => accessControlTemplate(params),
};

exports.emailTemplates = emailTemplates;

// Legacy exports kept for backward compatibility
exports.scheduledDeliveryTemplate   = (p) => scheduledDeliveryTemplate(p);
exports.emailVerificationTemplate   = (p) => verifyEmailTemplate(p);
exports.resetPasswordEmail          = (p) => resetPasswordTemplate(p);
exports.accessControlEmail          = (p) => accessControlTemplate(p);
