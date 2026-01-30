"""
Notification Routes and Management
"""

from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
import jwt
from database import db, User, Notification, Review

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
        notifications = Notification.query.filter_by(
            user_id=payload['user_id']
        ).order_by(Notification.created_at.desc()).all()
        
        result = []
        for n in notifications:
            notification_data = {
                'id': n.id,
                'title': n.title,
                'message': n.message,
                'type': n.type,
                'read': n.read,
                'created_at': n.created_at.isoformat(),
                'related_review_id': n.related_review_id
            }
            
            # If this is a review reply notification, include the baker's reply
            if n.related_review_id and n.review:
                notification_data['review'] = {
                    'id': n.review.id,
                    'product_name': n.review.product.name,
                    'baker_reply': n.review.baker_reply,
                    'reply_at': n.review.reply_at.isoformat() if n.review.reply_at else None
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
        
        # Count unread notifications
        count = Notification.query.filter_by(
            user_id=payload['user_id'],
            read=False
        ).count()
        
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
        notification = Notification.query.get(notification_id)
        
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404
        
        # Verify ownership
        if notification.user_id != payload['user_id']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Mark as read
        notification.read = True
        db.session.commit()
        
        return jsonify({
            'message': 'Notification marked as read'
        }), 200
        
    except Exception as e:
        db.session.rollback()
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
        
        # Mark all notifications as read
        Notification.query.filter_by(
            user_id=payload['user_id'],
            read=False
        ).update({'read': True})
        
        db.session.commit()
        
        return jsonify({
            'message': 'All notifications marked as read'
        }), 200
        
    except Exception as e:
        db.session.rollback()
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
        notification = Notification.query.get(notification_id)
        
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404
        
        # Verify ownership
        if notification.user_id != payload['user_id']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Delete notification
        db.session.delete(notification)
        db.session.commit()
        
        return jsonify({
            'message': 'Notification deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
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
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=notification_type
        )
        db.session.add(notification)
        db.session.commit()
        return True
    except Exception as e:
        db.session.rollback()
        print(f"Error creating notification: {e}")
        return False
