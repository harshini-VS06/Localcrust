"""
Notification Routes and Management - DynamoDB Version
"""

from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
import jwt
from dynamodb_database import User, Notification, Review, notifications_table, generate_id

def verify_token(token):
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('/notifications', methods=['GET'])
def get_notifications():
    """Get all notifications for the logged-in user"""
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Get notifications
        notifications = Notification.get_by_user_id(payload['user_id'])
        
        result = []
        for n in notifications:
            notification_data = {
                'id': n['id'],
                'title': n['title'],
                'message': n['message'],
                'type': n['type'],
                'read': n['read'],
                'created_at': n['created_at'],
                'related_review_id': n.get('related_review_id', '')
            }
            
            # If this is a review reply notification, include the baker's reply
            if n.get('related_review_id'):
                from dynamodb_database import reviews_table
                response = reviews_table.get_item(Key={'id': n['related_review_id']})
                review = response.get('Item')
                
                if review:
                    from dynamodb_database import Product
                    product = Product.get_by_id(review['product_id'])
                    notification_data['review'] = {
                        'id': review['id'],
                        'product_name': product['name'] if product else 'Unknown',
                        'baker_reply': review.get('baker_reply', ''),
                        'reply_at': review.get('reply_at', '')
                    }
            
            result.append(notification_data)
        
        return jsonify({'notifications': result}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@notifications_bp.route('/notifications/unread-count', methods=['GET'])
def get_unread_count():
    """Get count of unread notifications"""
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Get all notifications and count unread
        notifications = Notification.get_by_user_id(payload['user_id'])
        count = len([n for n in notifications if not n['read']])
        
        return jsonify({'count': count}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@notifications_bp.route('/notifications/<int:notification_id>/read', methods=['PUT'])
def mark_notification_as_read(notification_id):
    """Mark a notification as read"""
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Get notification
        response = notifications_table.get_item(Key={'id': str(notification_id)})
        notification = response.get('Item')
        
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404
        
        # Verify ownership
        if notification['user_id'] != payload['user_id']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Mark as read
        Notification.update(str(notification_id), read=True)
        
        return jsonify({
            'message': 'Notification marked as read'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@notifications_bp.route('/notifications/mark-all-read', methods=['PUT'])
def mark_all_notifications_as_read():
    """Mark all notifications as read"""
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Get all notifications for this user
        notifications = Notification.get_by_user_id(payload['user_id'])
        
        # Mark all unread as read
        for notification in notifications:
            if not notification['read']:
                Notification.update(notification['id'], read=True)
        
        return jsonify({
            'message': 'All notifications marked as read'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@notifications_bp.route('/notifications/<int:notification_id>', methods=['DELETE'])
def delete_notification(notification_id):
    """Delete a notification"""
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Get notification
        response = notifications_table.get_item(Key={'id': str(notification_id)})
        notification = response.get('Item')
        
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404
        
        # Verify ownership
        if notification['user_id'] != payload['user_id']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Delete notification
        notifications_table.delete_item(Key={'id': str(notification_id)})
        
        return jsonify({
            'message': 'Notification deleted successfully'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Helper function to create notifications
def create_notification(user_id, title, message, notification_type='info'):
    """
    Helper function to create a notification
    
    Args:
        user_id: ID of the user to receive the notification
        title: Notification title
        message: Notification message
        notification_type: Type of notification (info, success, warning, error)
    """
    try:
        notification_id = generate_id()
        Notification.create(
            notification_id=notification_id,
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type
        )
        return True
    except Exception as e:
        print(f"Error creating notification: {e}")
        return False
