"""
Email service for sending OTP and notifications
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

load_dotenv()

SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
SMTP_EMAIL = os.getenv('SMTP_EMAIL', '')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')

def send_otp_email(to_email: str, otp: str) -> bool:
    """
    Send OTP via email
    """
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        print("⚠️  SMTP not configured. OTP:", otp)
        return False
    
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Your Local Crust OTP Code'
        msg['From'] = f"Local Crust Bakery <{SMTP_EMAIL}>"
        msg['To'] = to_email
        
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; background-color: #FFF9F5; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 20px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #D35400; font-size: 32px; margin: 0;">🥖 Local Crust</h1>
                        <p style="color: #4E342E; font-size: 16px; margin-top: 10px;">Fresh Artisan Bakery</p>
                    </div>
                    
                    <div style="background: linear-gradient(135deg, #FFE5D9, #FFD4C1); border-radius: 15px; padding: 30px; text-align: center; margin-bottom: 30px;">
                        <p style="color: #4E342E; font-size: 18px; margin: 0 0 20px 0;">Your One-Time Password</p>
                        <div style="background-color: white; border-radius: 10px; padding: 20px; display: inline-block;">
                            <h2 style="color: #D35400; font-size: 48px; letter-spacing: 8px; margin: 0; font-weight: bold;">{otp}</h2>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-bottom: 20px;">
                        <p style="color: #4E342E; font-size: 14px; line-height: 1.6;">
                            This OTP will expire in <strong>5 minutes</strong>.<br>
                            Do not share this code with anyone.
                        </p>
                    </div>
                    
                    <div style="background-color: #F1F8E9; border-left: 4px solid #2E7D32; padding: 15px; border-radius: 8px;">
                        <p style="color: #4E342E; font-size: 13px; margin: 0;">
                            <strong>Didn't request this?</strong><br>
                            If you didn't request this OTP, please ignore this email or contact our support team.
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E0E0E0;">
                        <p style="color: #4E342E; opacity: 0.7; font-size: 12px; margin: 0;">
                            © 2026 Local Crust Bakery. Made with ❤️ for artisan bakers.
                        </p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        msg.attach(MIMEText(html, 'html'))
        
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        print(f"✅ OTP email sent to {to_email}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        print(f"   OTP (for development): {otp}")
        return False

def send_order_confirmation(to_email: str, order_id: str, total_amount: float) -> bool:
    """
    Send order confirmation email
    """
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        print("⚠️  SMTP not configured. Order confirmed:", order_id)
        return False
    
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f'Order Confirmed - {order_id}'
        msg['From'] = f"Local Crust Bakery <{SMTP_EMAIL}>"
        msg['To'] = to_email
        
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; background-color: #FFF9F5; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 20px; padding: 40px;">
                    <h1 style="color: #2E7D32; text-align: center;">✅ Order Confirmed!</h1>
                    <p style="color: #4E342E; text-align: center; font-size: 16px;">Thank you for your order!</p>
                    
                    <div style="background: linear-gradient(135deg, #C8E6C9, #A5D6A7); border-radius: 15px; padding: 20px; margin: 20px 0; text-align: center;">
                        <p style="color: #4E342E; margin: 0;">Order ID</p>
                        <h2 style="color: #2E7D32; margin: 10px 0;">{order_id}</h2>
                        <p style="color: #4E342E; margin: 0;">Total: <strong>${total_amount:.2f}</strong></p>
                    </div>
                    
                    <p style="color: #4E342E; text-align: center;">
                        Your delicious treats are being prepared by our artisan bakers!
                    </p>
                </div>
            </body>
        </html>
        """
        
        msg.attach(MIMEText(html, 'html'))
        
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        print(f"✅ Order confirmation sent to {to_email}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send order confirmation: {e}")
        return False
