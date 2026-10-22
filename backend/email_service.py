"""
CrediLens — Email Delivery Service
Handles secure SMTP email delivery (Gmail App Password or custom SMTP provider)
for One-Time Password (OTP) verification and password recovery.
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Callable
from dotenv import load_dotenv

load_dotenv()

class EmailDeliveryError(Exception):
    """Raised when email delivery fails."""
    pass

class EmailConfigurationError(EmailDeliveryError):
    """Raised when SMTP service is not configured."""
    pass

class EmailService:
    def __init__(self):
        self.mock_sender: Optional[Callable] = None

    @property
    def smtp_host(self) -> str:
        return os.getenv("SMTP_HOST", "smtp.gmail.com").strip()

    @property
    def smtp_port(self) -> int:
        try:
            return int(os.getenv("SMTP_PORT", "587").strip())
        except ValueError:
            return 587

    @property
    def smtp_username(self) -> str:
        return os.getenv("SMTP_USERNAME", "").strip()

    @property
    def smtp_app_password(self) -> str:
        raw = os.getenv("SMTP_APP_PASSWORD", "").strip()
        return raw.replace(" ", "")

    @property
    def from_email(self) -> str:
        explicit = os.getenv("SMTP_FROM_EMAIL", "").strip()
        if explicit:
            return explicit
        return self.smtp_username or "noreply@credilens.internal"

    @property
    def from_name(self) -> str:
        return os.getenv("SMTP_FROM_NAME", "CrediLens Underwriting Security").strip()

    def is_configured(self) -> bool:
        """Checks if SMTP credentials are provided."""
        return bool(self.smtp_username and self.smtp_app_password)

    def set_mock_sender(self, mock_fn: Optional[Callable]):
        """Sets a mock sender function for automated testing."""
        self.mock_sender = mock_fn

    def send_email(
        self,
        to_email: str,
        subject: str,
        text_body: str,
        html_body: str
    ) -> bool:
        """
        Sends a multi-part HTML & plain text email using configured SMTP settings.
        Raises EmailConfigurationError if SMTP is unconfigured.
        Raises EmailDeliveryError if delivery fails.
        """
        # If running in test mode with mock sender
        if self.mock_sender is not None:
            return self.mock_sender(to_email=to_email, subject=subject, text_body=text_body, html_body=html_body)

        if not self.is_configured():
            raise EmailConfigurationError(
                "SMTP email service is not configured on the server. "
                "Please configure SMTP_USERNAME and SMTP_APP_PASSWORD in the backend .env file "
                "to enable real Gmail OTP delivery."
            )

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{self.from_name} <{self.from_email}>"
        msg["To"] = to_email

        part1 = MIMEText(text_body, "plain", "utf-8")
        part2 = MIMEText(html_body, "html", "utf-8")
        msg.attach(part1)
        msg.attach(part2)

        server = None
        try:
            if self.smtp_port == 465:
                server = smtplib.SMTP_SSL(self.smtp_host, self.smtp_port, timeout=12)
            else:
                server = smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=12)
                server.ehlo()
                server.starttls()
                server.ehlo()

            server.login(self.smtp_username, self.smtp_app_password)
            server.send_message(msg)
            return True
        except smtplib.SMTPAuthenticationError as e:
            raise EmailDeliveryError(
                "SMTP authentication failed. If using Gmail, ensure 2-Step Verification is active "
                "and you are using a 16-character Google App Password (not your personal password)."
            ) from e
        except Exception as e:
            raise EmailDeliveryError(f"SMTP delivery failed: {str(e)}") from e
        finally:
            if server:
                try:
                    server.quit()
                except Exception:
                    pass

    def send_registration_otp(
        self,
        to_email: str,
        otp: str,
        full_name: str,
        expiry_minutes: int = 5
    ) -> bool:
        """Sends Registration Verification OTP email."""
        subject = f"{otp} is your CrediLens account verification code"
        text_body = f"""Hello {full_name},

Thank you for registering with CrediLens — MSME Credit Intelligence Platform.

Your single-use account verification code is:
{otp}

This code is valid for {expiry_minutes} minutes.
Do not share this code with anyone. CrediLens personnel will never request your verification code.

If you did not request this registration, please disregard this email.

— CrediLens Underwriting Security
"""
        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CrediLens Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0D0D0F; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F5F5F5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0D0D0F; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 540px; background-color: #171719; border: 1px solid #303035; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px; background-color: #09090B; border-bottom: 1px solid #303035;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size: 20px; font-weight: 800; color: #F5F5F5; letter-spacing: -0.5px;">CrediLens</span>
                    <span style="font-size: 10px; font-weight: 700; color: #FF7A1A; background-color: #332015; border: 1px solid #75401F; padding: 2px 6px; border-radius: 4px; margin-left: 8px; text-transform: uppercase;">Institutional</span>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; color: #A1A1AA; font-family: monospace;">SECURE VERIFICATION</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h2 style="font-size: 18px; font-weight: 700; color: #F5F5F5; margin: 0 0 12px 0;">Verify your email address</h2>
              <p style="font-size: 13px; line-height: 1.6; color: #A1A1AA; margin: 0 0 24px 0;">
                Hello <strong style="color: #F5F5F5;">{full_name}</strong>,<br>
                Use the following 6-digit verification code to complete your underwriter account registration on the CrediLens platform:
              </p>
              
              <!-- OTP Box -->
              <div style="background-color: #141416; border: 1px solid #75401F; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px 0;">
                <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #FF7A1A; font-family: monospace;">
                  {otp}
                </span>
                <div style="font-size: 11px; color: #A1A1AA; margin-top: 8px;">
                  Valid for <strong>{expiry_minutes} minutes</strong> &bull; Single-use only
                </div>
              </div>

              <div style="background-color: #1E1E21; border-left: 3px solid #FF7A1A; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <p style="font-size: 11px; line-height: 1.5; color: #A1A1AA; margin: 0;">
                  <strong style="color: #F5F5F5;">Security Tip:</strong> Never share this code with anyone. CrediLens risk officers and support engineers will never ask for your verification code.
                </p>
              </div>

              <p style="font-size: 12px; color: #71717A; line-height: 1.5; margin: 0;">
                If you did not initiate this account creation, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #141416; border-top: 1px solid #303035; text-align: center;">
              <p style="font-size: 11px; color: #71717A; margin: 0;">
                CrediLens &bull; MSME Credit Intelligence & Decision Support Platform<br>
                Automated security dispatch &bull; Please do not reply directly to this email
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
        return self.send_email(to_email, subject, text_body, html_body)

    def send_password_reset_otp(
        self,
        to_email: str,
        otp: str,
        full_name: str,
        expiry_minutes: int = 5
    ) -> bool:
        """Sends Password Recovery OTP email."""
        subject = f"{otp} is your CrediLens password recovery code"
        text_body = f"""Hello {full_name},

A password reset request was submitted for your CrediLens underwriter account ({to_email}).

Your single-use password recovery code is:
{otp}

This code is valid for {expiry_minutes} minutes.
Do not share this code with anyone. If you did not request a password reset, please contact security immediately.

— CrediLens Underwriting Security
"""
        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CrediLens Password Recovery</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0D0D0F; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F5F5F5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0D0D0F; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 540px; background-color: #171719; border: 1px solid #303035; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px; background-color: #09090B; border-bottom: 1px solid #303035;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size: 20px; font-weight: 800; color: #F5F5F5; letter-spacing: -0.5px;">CrediLens</span>
                    <span style="font-size: 10px; font-weight: 700; color: #FF7A1A; background-color: #332015; border: 1px solid #75401F; padding: 2px 6px; border-radius: 4px; margin-left: 8px; text-transform: uppercase;">Recovery</span>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; color: #EF5350; font-family: monospace;">PASSWORD RESET</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h2 style="font-size: 18px; font-weight: 700; color: #F5F5F5; margin: 0 0 12px 0;">Reset your underwriter password</h2>
              <p style="font-size: 13px; line-height: 1.6; color: #A1A1AA; margin: 0 0 24px 0;">
                Hello <strong style="color: #F5F5F5;">{full_name}</strong>,<br>
                We received a request to reset your password for <span style="font-family: monospace; color: #F5F5F5;">{to_email}</span>. Use the single-use recovery code below to proceed:
              </p>
              
              <!-- OTP Box -->
              <div style="background-color: #141416; border: 1px solid #75401F; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px 0;">
                <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #FF7A1A; font-family: monospace;">
                  {otp}
                </span>
                <div style="font-size: 11px; color: #A1A1AA; margin-top: 8px;">
                  Expires in <strong>{expiry_minutes} minutes</strong> &bull; Single-use authorization
                </div>
              </div>

              <div style="background-color: #1E1E21; border-left: 3px solid #EF5350; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <p style="font-size: 11px; line-height: 1.5; color: #A1A1AA; margin: 0;">
                  <strong style="color: #EF5350;">Notice:</strong> If you did NOT request this reset, your account credentials may have been compromised. Change your password immediately or alert your institution administrator.
                </p>
              </div>

              <p style="font-size: 12px; color: #71717A; line-height: 1.5; margin: 0;">
                This recovery code can only be used once. Once verified, you will be authorized to establish a new password.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #141416; border-top: 1px solid #303035; text-align: center;">
              <p style="font-size: 11px; color: #71717A; margin: 0;">
                CrediLens &bull; MSME Credit Intelligence & Decision Support Platform<br>
                Automated security dispatch &bull; Please do not reply directly to this email
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
        return self.send_email(to_email, subject, text_body, html_body)

# Singleton Instance
email_service = EmailService()
