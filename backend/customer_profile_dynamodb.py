"""
Customer Profile Management Endpoints - DynamoDB Version
"""

from flask import Blueprint, request, jsonify, current_app
import json
import jwt
from dynamodb_database import User

customer_profile_bp = Blueprint('customer_profile', __name__)

def verify_token(token):
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

@customer_profile_bp.route('/customer/profile', methods=['GET'])
def get_customer_profile():
    """Get customer profile with saved address"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        user = User.get_by_id(payload['user_id'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        saved_address = None
        if user.get('saved_address'):
            try:
                saved_address = json.loads(user['saved_address'])
            except:
                saved_address = None
        
        return jsonify({
            'id': user['id'],
            'name': user['name'],
            'email': user['email'],
            'user_type': user['user_type'],
            'saved_address': saved_address,
            'created_at': user['created_at']
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@customer_profile_bp.route('/customer/profile/address', methods=['POST', 'PUT'])
def save_customer_address():
    """Save or update customer's default delivery address"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        user = User.get_by_id(payload['user_id'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        required_fields = ['fullName', 'phone', 'addressLine1', 'city', 'state', 'pincode']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        User.update(payload['user_id'], saved_address=json.dumps(data))
        
        return jsonify({
            'message': 'Address saved successfully',
            'saved_address': data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@customer_profile_bp.route('/customer/profile', methods=['PUT'])
def update_customer_profile():
    """Update customer profile details"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        user = User.get_by_id(payload['user_id'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        update_data = {}
        if 'name' in data:
            update_data['name'] = data['name']
        
        if update_data:
            User.update(payload['user_id'], **update_data)
        
        updated_user = User.get_by_id(payload['user_id'])
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': {
                'id': updated_user['id'],
                'name': updated_user['name'],
                'email': updated_user['email']
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
