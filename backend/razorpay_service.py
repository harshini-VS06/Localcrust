"""
Razorpay Payment Integration Service
"""
import razorpay
import os
from dotenv import load_dotenv

load_dotenv()

razorpay_client = razorpay.Client(
    auth=(
        os.getenv('RAZORPAY_KEY_ID'),
        os.getenv('RAZORPAY_KEY_SECRET')
    )
)

def create_razorpay_order(amount, order_id, currency='INR'):
    """
    Create a Razorpay order
    
    Args:
        amount: Amount in rupees (will be converted to paise)
        order_id: Unique order ID from your system
        currency: Currency code (default: INR)
    
    Returns:
        dict: Razorpay order response
    """
    try:
        amount_in_paise = int(amount * 100)
        
        razorpay_order = razorpay_client.order.create({
            'amount': amount_in_paise,
            'currency': currency,
            'receipt': order_id,
            'payment_capture': 1  
        })
        
        return {
            'success': True,
            'razorpay_order_id': razorpay_order['id'],
            'amount': razorpay_order['amount'],
            'currency': razorpay_order['currency']
        }
    
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def verify_payment_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature):
    """
    Verify Razorpay payment signature
    
    Args:
        razorpay_order_id: Razorpay order ID
        razorpay_payment_id: Razorpay payment ID
        razorpay_signature: Razorpay signature
    
    Returns:
        bool: True if signature is valid, False otherwise
    """
    try:
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        })
        return True
    except:
        return False

def fetch_payment_details(payment_id):
    """
    Fetch payment details from Razorpay
    
    Args:
        payment_id: Razorpay payment ID
    
    Returns:
        dict: Payment details
    """
    try:
        payment = razorpay_client.payment.fetch(payment_id)
        return {
            'success': True,
            'payment': payment
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }
