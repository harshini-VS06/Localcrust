"""
Notification Routes for Customer and Baker
Handles notification retrieval, marking as read, and notification creation
"""

from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
import jwt
from database import db, Notification, User, Review

def verify_token(token):
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

notification_bp = Blueprint('notifications', __name__)

def get_authenticated_user():
    """Helper function to get authenticated user from request"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return None
    
    user = User.query.get(payload['user_id'])
    return user

@notification_bp.route('/notifications', methods=['GET'])
def get_notifications():
    """Get all notifications for the authenticated user"""
    try:
        user = get_authenticated_user()
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401
        
        notifications = Notification.query.filter_by(
            user_id=user.id
        ).order_by(Notification.created_at.desc()).all()
        
        return jsonify({
            'notifications': [{
                'id': n.id,
                'title': n.title,
                'message': n.message,
                'type': n.type,
                'read': n.read,
                'created_at': n.created_at.isoformat()
            } for n in notifications]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@notification_bp.route('/notifications/unread-count', methods=['GET'])
def get_unread_count():
    """Get count of unread notifications"""
    try:
        user = get_authenticated_user()
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401
        
        count = Notification.query.filter_by(
            user_id=user.id,
            read=False
        ).count()
        
        return jsonify({'count': count}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@notification_bp.route('/notifications/<int:notification_id>/read', methods=['PUT'])
def mark_notification_as_read(notification_id):
    """Mark a specific notification as read"""
    try:
        user = get_authenticated_user()
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401
        
        notification = Notification.query.get(notification_id)
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404
        
        if notification.user_id != user.id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        notification.read = True
        db.session.commit()
        
        return jsonify({
            'message': 'Notification marked as read',
            'notification': {
                'id': notification.id,
                'read': notification.read
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@notification_bp.route('/notifications/mark-all-read', methods=['PUT'])
def mark_all_notifications_as_read():
    """Mark all notifications as read for the authenticated user"""
    try:
        user = get_authenticated_user()
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401
        
        Notification.query.filter_by(
            user_id=user.id,
            read=False
        ).update({'read': True})
        
        db.session.commit()
        
        return jsonify({
            'message': 'All notifications marked as read'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@notification_bp.route('/notifications', methods=['DELETE'])
def delete_all_notifications():
    """Delete all notifications for the authenticated user"""
    try:
        user = get_authenticated_user()
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401
        
        Notification.query.filter_by(user_id=user.id).delete()
        db.session.commit()
        
        return jsonify({
            'message': 'All notifications deleted'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@notification_bp.route('/notifications/<int:notification_id>', methods=['DELETE'])
def delete_notification(notification_id):
    """Delete a specific notification"""
    try:
        user = get_authenticated_user()
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401
        
        notification = Notification.query.get(notification_id)
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404
        
        if notification.user_id != user.id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        db.session.delete(notification)
        db.session.commit()
        
        return jsonify({
            'message': 'Notification deleted'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

def create_notification(user_id, title, message, notification_type='info'):
    """
    Create a new notification
    
    Args:
        user_id: ID of the user to notify
        title: Notification title
        message: Notification message
        notification_type: Type of notification (info, success, warning, error)
    
    Returns:
        The created notification object
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
        return notification
    except Exception as e:
        db.session.rollback()
        print(f"Error creating notification: {e}")
        return None
