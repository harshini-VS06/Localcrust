"""
Baker Reviews Management Blueprint - DynamoDB Version
Handles baker-specific review operations
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
import jwt
import os
from dynamodb_database import (
    Review, Product, User, Notification, Baker,
    generate_id, reviews_table
)

baker_reviews_bp = Blueprint('baker_reviews', __name__)

def verify_token(token):
    """Verify JWT token"""
    try:
        secret_key = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')
        payload = jwt.decode(token, secret_key, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

@baker_reviews_bp.route('/baker/test', methods=['GET'])
def test_route():
    return jsonify({'message': 'Test route works!'}), 200

@baker_reviews_bp.route('/baker/reviews', methods=['GET'])
def get_baker_reviews():
    """Get all reviews for the baker's products"""
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload or payload.get('user_type') != 'baker':
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Get baker profile
        user = User.get_by_id(payload['user_id'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        baker = Baker.get_by_user_id(user['id'])
        if not baker:
            return jsonify({'error': 'Baker profile not found'}), 404
        
        # Get all reviews for baker's products using GSI
        response = reviews_table.query(
            IndexName='baker_id-index',
            KeyConditionExpression='baker_id = :bid',
            ExpressionAttributeValues={':bid': baker['id']}
        )
        reviews = response.get('Items', [])
        
        # Sort by created_at descending
        reviews.sort(key=lambda x: x['created_at'], reverse=True)
        
        # Build response
        result = []
        for review in reviews:
            user_info = User.get_by_id(review['user_id'])
            product = Product.get_by_id(review['product_id'])
            
            has_reply = review.get('baker_reply') is not None and review.get('baker_reply') != ''
            
            result.append({
                'id': review['id'],
                'product_id': review['product_id'],
                'product_name': product['name'] if product else 'Unknown',
                'customer_name': user_info['name'] if user_info else 'Anonymous',
                'customer_email': user_info['email'] if user_info else '',
                'rating': review['rating'],
                'comment': review['comment'],
                'baker_reply': review.get('baker_reply', ''),
                'reply_at': review.get('reply_at', ''),
                'created_at': review['created_at'],
                'has_reply': has_reply
            })
        
        return jsonify({'reviews': result}), 200
        
    except Exception as e:
        print(f"Error fetching baker reviews: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@baker_reviews_bp.route('/baker/reviews/stats', methods=['GET'])
def get_review_stats():
    """Get review statistics for the baker"""
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload or payload.get('user_type') != 'baker':
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Get baker profile
        user = User.get_by_id(payload['user_id'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        baker = Baker.get_by_user_id(user['id'])
        if not baker:
            return jsonify({'error': 'Baker profile not found'}), 404
        
        # Get all reviews for baker using GSI
        response = reviews_table.query(
            IndexName='baker_id-index',
            KeyConditionExpression='baker_id = :bid',
            ExpressionAttributeValues={':bid': baker['id']}
        )
        reviews = response.get('Items', [])
        
        if not reviews:
            return jsonify({
                'total_reviews': 0,
                'average_rating': 0,
                'pending_replies': 0,
                'rating_distribution': {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            }), 200
        
        # Calculate stats
        total_reviews = len(reviews)
        total_rating = sum(r['rating'] for r in reviews)
        average_rating = round(total_rating / total_reviews, 1)
        pending_replies = len([r for r in reviews if not r.get('baker_reply')])
        
        # Rating distribution
        rating_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for review in reviews:
            rating_distribution[review['rating']] = rating_distribution.get(review['rating'], 0) + 1
        
        return jsonify({
            'total_reviews': total_reviews,
            'average_rating': average_rating,
            'pending_replies': pending_replies,
            'rating_distribution': rating_distribution
        }), 200
        
    except Exception as e:
        print(f"Error fetching review stats: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@baker_reviews_bp.route('/baker/reviews/<int:review_id>/reply', methods=['POST'])
def reply_to_review(review_id):
    """Baker replies to a review"""
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload or payload.get('user_type') != 'baker':
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Get baker profile
        user = User.get_by_id(payload['user_id'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        baker = Baker.get_by_user_id(user['id'])
        if not baker:
            return jsonify({'error': 'Baker profile not found'}), 404
        
        # Get review
        response = reviews_table.get_item(Key={'id': str(review_id)})
        review = response.get('Item')
        
        if not review:
            return jsonify({'error': 'Review not found'}), 404
        
        # Verify review belongs to baker's product
        if review['baker_id'] != baker['id']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Get reply from request
        data = request.get_json()
        reply_text = data.get('reply', '').strip()
        
        if not reply_text:
            return jsonify({'error': 'Reply text is required'}), 400
        
        # Update review with reply
        Review.update(
            str(review_id),
            baker_reply=reply_text,
            reply_at=datetime.utcnow().isoformat()
        )
        
        # Create notification for customer
        product = Product.get_by_id(review['product_id'])
        notification_id = generate_id()
        Notification.create(
            notification_id=notification_id,
            user_id=review['user_id'],
            title=f"{baker['shop_name']} replied to your review",
            message=f"Reply to your review of {product['name'] if product else 'product'}:\n\n\"{reply_text}\"",
            notification_type='info',
            related_review_id=str(review_id)
        )
        
        # Get updated review
        response = reviews_table.get_item(Key={'id': str(review_id)})
        updated_review = response.get('Item')
        
        return jsonify({
            'message': 'Reply posted successfully',
            'review': {
                'id': updated_review['id'],
                'baker_reply': updated_review.get('baker_reply', ''),
                'reply_at': updated_review.get('reply_at', '')
            }
        }), 200
        
    except Exception as e:
        print(f"Error posting reply: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
