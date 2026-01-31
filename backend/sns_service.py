    """
AWS SNS Service for Real-Time Notifications
Handles order notifications, status updates, and delivery notifications

IMPORTANT: This service uses 5 separate SNS topics for different notification types.
You must manually:
1. Create 5 SNS topics in AWS console
2. Subscribe emails to each topic in AWS console
3. Add all 5 SNS_*_TOPIC ARNs to your .env file
"""
import boto3
import json
import os
from dotenv import load_dotenv
from botocore.exceptions import ClientError

load_dotenv()

# Initialize SNS client - NO NEED for access keys when using IAM role!
sns_client = boto3.client(
    'sns',
    region_name=os.getenv('AWS_REGION', 'us-east-1')
)

# SNS Topic ARNs - Must be set in your .env file
SNS_ORDER_CONFIRMATION_TOPIC = os.getenv('SNS_ORDER_CONFIRMATION_TOPIC', '')
SNS_ORDER_STATUS_TOPIC = os.getenv('SNS_ORDER_STATUS_TOPIC', '')
SNS_DELIVERY_TOPIC = os.getenv('SNS_DELIVERY_TOPIC', '')
SNS_BAKER_ORDER_TOPIC = os.getenv('SNS_BAKER_ORDER_TOPIC', '')
SNS_PAYMENT_TOPIC = os.getenv('SNS_PAYMENT_TOPIC', '')

class SNSNotificationService:
    """Service class for sending SNS notifications"""
    
    @staticmethod
    def send_notification(subject, message, topic_arn, message_attributes=None):
        """
        Send a notification through SNS
        
        Args:
            subject: Email subject line
            message: Message body
            topic_arn: SNS topic ARN
            message_attributes: Optional message attributes for filtering
        
        Returns:
            bool: True if successful, False otherwise
        """
        if not topic_arn:
            print(f"❌ SNS Topic ARN not configured")
            print(f"   Subject: {subject}")
            print(f"   Message: {message[:100]}...")
            return False
        
        try:
            params = {
                'TopicArn': topic_arn,
                'Subject': subject,
                'Message': message
            }
            
            # Add message attributes if provided
            if message_attributes:
                params['MessageAttributes'] = message_attributes
            
            response = sns_client.publish(**params)
            
            message_id = response.get('MessageId', '')
            print(f"✅ SNS notification sent - MessageId: {message_id}")
            print(f"   Topic: {topic_arn.split(':')[-1]}")
            print(f"   Subject: {subject}")
            return True
            
        except ClientError as e:
            print(f"❌ Error sending SNS notification: {e}")
            print(f"   Topic ARN: {topic_arn}")
            return False
    
    @staticmethod
    def send_order_confirmation(order_id, customer_email, customer_name, total_amount, items):
        """
        Send order confirmation notification
        """
        subject = f"🎉 Order Confirmed - {order_id}"
        
        # Create formatted message
        items_list = "\n".join([
            f"  • {item['product_name']} x{item['quantity']} - ₹{item['price'] * item['quantity']:.2f}"
            for item in items
        ])
        
        message = f"""
Dear {customer_name},

Thank you for your order at Local Crust Bakery! 🥖

Order Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Order ID: {order_id}
Customer: {customer_name}
Email: {customer_email}

Items Ordered:
{items_list}

Total Amount: ₹{total_amount:.2f}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your delicious artisan baked goods are being prepared by our expert bakers!

Order Status: Confirmed ✅
Payment Status: Completed 💳

Next Steps:
• Your order is now being prepared
• You'll receive updates as your order progresses
• Estimated delivery time will be notified soon

You can track your order status in your account dashboard.

Thank you for choosing Local Crust Bakery!

Best regards,
The Local Crust Team 🥐

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated message from Local Crust Bakery.
For support, please contact us at support@localcrust.com
        """
        
        # Message attributes for filtering (optional)
        message_attributes = {
            'notification_type': {
                'DataType': 'String',
                'StringValue': 'order_confirmation'
            },
            'order_id': {
                'DataType': 'String',
                'StringValue': order_id
            }
        }
        
        return SNSNotificationService.send_notification(
            subject=subject,
            message=message,
            topic_arn=SNS_ORDER_CONFIRMATION_TOPIC,  # ← Uses ORDER_CONFIRMATION topic
            message_attributes=message_attributes
        )
    
    @staticmethod
    def send_order_status_update(order_id, customer_email, customer_name, new_status, baker_name=None):
        """
        Send order status update notification
        """
        status_messages = {
            'confirmed': {
                'emoji': '✅',
                'title': 'Order Confirmed',
                'description': 'Your order has been confirmed and is being prepared.'
            },
            'preparing': {
                'emoji': '👨‍🍳',
                'title': 'Being Prepared',
                'description': 'Our bakers are preparing your delicious items!'
            },
            'baking': {
                'emoji': '🔥',
                'title': 'In the Oven',
                'description': 'Your items are being baked to perfection!'
            },
            'ready': {
                'emoji': '📦',
                'title': 'Ready for Pickup/Delivery',
                'description': 'Your order is ready!'
            },
            'out_for_delivery': {
                'emoji': '🚚',
                'title': 'Out for Delivery',
                'description': 'Your order is on its way to you!'
            },
            'delivered': {
                'emoji': '🎉',
                'title': 'Delivered',
                'description': 'Your order has been delivered. Enjoy!'
            },
            'cancelled': {
                'emoji': '❌',
                'title': 'Order Cancelled',
                'description': 'Your order has been cancelled.'
            }
        }
        
        status_info = status_messages.get(new_status, {
            'emoji': '📋',
            'title': 'Status Update',
            'description': f'Your order status has been updated to: {new_status}'
        })
        
        subject = f"{status_info['emoji']} Order {status_info['title']} - {order_id}"
        
        baker_info = f"\nBaker: {baker_name}" if baker_name else ""
        
        message = f"""
Dear {customer_name},

Your order status has been updated! {status_info['emoji']}

Order Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Order ID: {order_id}
Customer: {customer_name}
Email: {customer_email}{baker_info}

Status Update:
{status_info['title']} - {status_info['description']}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{SNSNotificationService._get_status_action_text(new_status)}

Track your order in real-time from your dashboard!

Best regards,
The Local Crust Team 🥐

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated message from Local Crust Bakery.
For support, please contact us at support@localcrust.com
        """
        
        message_attributes = {
            'notification_type': {
                'DataType': 'String',
                'StringValue': 'status_update'
            },
            'order_id': {
                'DataType': 'String',
                'StringValue': order_id
            },
            'status': {
                'DataType': 'String',
                'StringValue': new_status
            }
        }
        
        return SNSNotificationService.send_notification(
            subject=subject,
            message=message,
            topic_arn=SNS_ORDER_STATUS_TOPIC,  # ← Uses STATUS topic
            message_attributes=message_attributes
        )
    
    @staticmethod
    def send_delivery_notification(order_id, customer_email, customer_name, delivery_address, estimated_time=None):
        """
        Send delivery notification
        """
        subject = f"🚚 Your Order is On The Way - {order_id}"
        
        time_info = f"\nEstimated Delivery: {estimated_time}" if estimated_time else ""
        
        # Format address
        address_str = delivery_address
        if isinstance(delivery_address, dict):
            address_parts = [
                delivery_address.get('street', ''),
                delivery_address.get('city', ''),
                delivery_address.get('state', ''),
                delivery_address.get('zip_code', '')
            ]
            address_str = ', '.join([part for part in address_parts if part])
        
        message = f"""
Dear {customer_name},

Great news! Your order is out for delivery! 🚚

Order Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Order ID: {order_id}
Customer: {customer_name}
Email: {customer_email}

Delivery Address:
{address_str}{time_info}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your freshly baked items are on their way to you!

Delivery Instructions:
• Please ensure someone is available to receive the order
• Keep your phone handy for delivery updates
• Check items upon delivery

Thank you for choosing Local Crust Bakery!

Best regards,
The Local Crust Team 🥐

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated message from Local Crust Bakery.
For support, please contact us at support@localcrust.com
        """
        
        message_attributes = {
            'notification_type': {
                'DataType': 'String',
                'StringValue': 'delivery_notification'
            },
            'order_id': {
                'DataType': 'String',
                'StringValue': order_id
            }
        }
        
        return SNSNotificationService.send_notification(
            subject=subject,
            message=message,
            topic_arn=SNS_DELIVERY_TOPIC,  # ← Uses DELIVERY topic
            message_attributes=message_attributes
        )
    
    @staticmethod
    def send_baker_new_order_notification(baker_email, baker_name, order_id, customer_name, items, total_amount):
        """
        Notify baker about new order
        """
        subject = f"🔔 New Order Received - {order_id}"
        
        items_list = "\n".join([
            f"  • {item['product_name']} x{item['quantity']} - ₹{item['price'] * item['quantity']:.2f}"
            for item in items
        ])
        
        message = f"""
Hello {baker_name},

You have received a new order! 🎉

Order Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Order ID: {order_id}
Customer: {customer_name}

Items to Prepare:
{items_list}

Total Amount: ₹{total_amount:.2f}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Action Required:
• Log in to your baker dashboard
• Review the order details
• Update order status as you prepare items
• Mark items as ready when complete

Login to your dashboard to manage this order:
https://localcrust.com/baker/dashboard

Thank you for being part of Local Crust!

Best regards,
The Local Crust Team 🥐

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated message from Local Crust Bakery.
        """
        
        message_attributes = {
            'notification_type': {
                'DataType': 'String',
                'StringValue': 'baker_new_order'
            },
            'order_id': {
                'DataType': 'String',
                'StringValue': order_id
            }
        }
        
        return SNSNotificationService.send_notification(
            subject=subject,
            message=message,
            topic_arn=SNS_BAKER_ORDER_TOPIC,  # ← Uses BAKER topic
            message_attributes=message_attributes
        )
    
    @staticmethod
    def send_payment_confirmation(order_id, customer_email, customer_name, payment_id, amount):
        """
        Send payment confirmation notification
        """
        subject = f"💳 Payment Successful - {order_id}"
        
        message = f"""
Dear {customer_name},

Your payment has been processed successfully! ✅

Payment Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Order ID: {order_id}
Payment ID: {payment_id}
Amount Paid: ₹{amount:.2f}
Customer: {customer_name}
Email: {customer_email}

Payment Status: Completed ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your order is now confirmed and will be prepared soon!

You will receive updates as your order progresses through:
• Preparation
• Baking
• Ready for delivery
• Out for delivery
• Delivered

Thank you for your payment!

Best regards,
The Local Crust Team 🥐

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated message from Local Crust Bakery.
For support, please contact us at support@localcrust.com
        """
        
        message_attributes = {
            'notification_type': {
                'DataType': 'String',
                'StringValue': 'payment_confirmation'
            },
            'order_id': {
                'DataType': 'String',
                'StringValue': order_id
            },
            'payment_id': {
                'DataType': 'String',
                'StringValue': payment_id
            }
        }
        
        return SNSNotificationService.send_notification(
            subject=subject,
            message=message,
            topic_arn=SNS_PAYMENT_TOPIC,  # ← Uses PAYMENT topic
            message_attributes=message_attributes
        )
    
    @staticmethod
    def _get_status_action_text(status):
        """
        Get action text based on order status
        """
        action_texts = {
            'confirmed': 'Your order is confirmed! Our bakers will start preparing your items soon.',
            'preparing': 'Our expert bakers are currently preparing your order with care.',
            'baking': 'Your items are in the oven! Fresh bread and pastries coming soon.',
            'ready': 'Your order is ready! It will be out for delivery shortly.',
            'out_for_delivery': 'Your order is on its way! Please be available to receive it.',
            'delivered': 'We hope you enjoy your fresh baked goods! Please rate your experience.',
            'cancelled': 'If you have any questions, please contact our support team.'
        }
        return action_texts.get(status, 'Thank you for your order!')


# Convenience functions for easy import
def send_order_confirmation(order_id, customer_email, customer_name, total_amount, items):
    """Send order confirmation via SNS"""
    return SNSNotificationService.send_order_confirmation(
        order_id, customer_email, customer_name, total_amount, items
    )

def send_order_status_update(order_id, customer_email, customer_name, new_status, baker_name=None):
    """Send order status update via SNS"""
    return SNSNotificationService.send_order_status_update(
        order_id, customer_email, customer_name, new_status, baker_name
    )

def send_delivery_notification(order_id, customer_email, customer_name, delivery_address, estimated_time=None):
    """Send delivery notification via SNS"""
    return SNSNotificationService.send_delivery_notification(
        order_id, customer_email, customer_name, delivery_address, estimated_time
    )

def send_baker_new_order_notification(baker_email, baker_name, order_id, customer_name, items, total_amount):
    """Notify baker about new order via SNS"""
    return SNSNotificationService.send_baker_new_order_notification(
        baker_email, baker_name, order_id, customer_name, items, total_amount
    )

def send_payment_confirmation(order_id, customer_email, customer_name, payment_id, amount):
    """Send payment confirmation via SNS"""
    return SNSNotificationService.send_payment_confirmation(
        order_id, customer_email, customer_name, payment_id, amount
    )

def subscribe_email_to_notifications(email):
    """
    Subscribe an email to all notification topics
    NOTE: In production, you'd typically subscribe to specific topics based on user preferences
    """
    topics = [
        SNS_ORDER_CONFIRMATION_TOPIC,
        SNS_ORDER_STATUS_TOPIC,
        SNS_DELIVERY_TOPIC,
        SNS_PAYMENT_TOPIC
    ]
    
    subscribed_count = 0
    for topic_arn in topics:
        if topic_arn:
            try:
                sns_client.subscribe(
                    TopicArn=topic_arn,
                    Protocol='email',
                    Endpoint=email
                )
                subscribed_count += 1
            except Exception as e:
                print(f"Failed to subscribe {email} to topic: {e}")
    
    return subscribed_count > 0
