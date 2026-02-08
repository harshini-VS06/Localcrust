"""
Baker Reviews Management Blueprint
Handles baker-specific review operations
"""
print("\n" + "*"*70)
print("BAKER_REVIEWS.PY MODULE IS BEING LOADED!")
print("*"*70 + "\n")

from flask import Blueprint, request, jsonify
from database import db, Review, Product, User, Notification
from datetime import datetime
import jwt
import os

baker_reviews_bp = Blueprint('baker_reviews', __name__)

print("\n" + "#"*70)
print("BLUEPRINT CREATED: baker_reviews_bp")
print("#"*70 + "\n")

@baker_reviews_bp.route('/baker/test', methods=['GET'])
def test_route():
    print("TEST ROUTE CALLED!", flush=True)
    return jsonify({'message': 'Test route works!'}), 200

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

print("About to define get_baker_reviews route...", flush=True)

@baker_reviews_bp.route('/baker/reviews', methods=['GET'])
def get_baker_reviews():
    """Get all reviews for the baker's products"""
    print("=" * 70, flush=True)
    print("GET_BAKER_REVIEWS CALLED!", flush=True)
    print("=" * 70, flush=True)
    
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload or payload.get('user_type') != 'baker':
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        user = User.query.get(payload['user_id'])
        if not user or not user.baker_profile:
            return jsonify({'error': 'Baker profile not found'}), 404
        
        baker = user.baker_profile
        
        db.session.expire_all()
        
        product_ids = [p.id for p in baker.products]
        
        reviews = Review.query.filter(Review.product_id.in_(product_ids)).order_by(Review.created_at.desc()).all()
        
        print(f"\n{'='*70}")
        print(f"FETCHING REVIEWS FOR BAKER {baker.id}")
        print(f"{'='*70}")
        print(f"Found {len(reviews)} reviews")
        
        result = []
        for review in reviews:
            has_reply = review.baker_reply is not None
            print(f"\nReview ID {review.id}:")
            print(f"  - Product: {review.product.name}")
            print(f"  - Baker Reply: {review.baker_reply if review.baker_reply else '[NONE]'}")
            print(f"  - Has Reply: {has_reply}")
            
            result.append({
                'id': review.id,
                'product_id': review.product_id,
                'product_name': review.product.name,
                'customer_name': review.user.name,
                'customer_email': review.user.email,
                'rating': review.rating,
                'comment': review.comment,
                'baker_reply': review.baker_reply,
                'reply_at': review.reply_at.isoformat() if review.reply_at else None,
                'created_at': review.created_at.isoformat(),
                'has_reply': has_reply
            })
        
        print(f"\nReturning {len(result)} reviews with has_reply flags")
        print(f"{'='*70}\n")
        
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
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload or payload.get('user_type') != 'baker':
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        user = User.query.get(payload['user_id'])
        if not user or not user.baker_profile:
            return jsonify({'error': 'Baker profile not found'}), 404
        
        baker = user.baker_profile
        
        product_ids = [p.id for p in baker.products]
        
        reviews = Review.query.filter(Review.product_id.in_(product_ids)).all()
        
        if not reviews:
            return jsonify({
                'total_reviews': 0,
                'average_rating': 0,
                'pending_replies': 0,
                'rating_distribution': {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            }), 200
        
        
        total_reviews = len(reviews)
        total_rating = sum(r.rating for r in reviews)
        average_rating = round(total_rating / total_reviews, 1)
        pending_replies = len([r for r in reviews if not r.baker_reply])
        
        rating_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for review in reviews:
            rating_distribution[review.rating] = rating_distribution.get(review.rating, 0) + 1
        
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
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload or payload.get('user_type') != 'baker':
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        user = User.query.get(payload['user_id'])
        if not user or not user.baker_profile:
            return jsonify({'error': 'Baker profile not found'}), 404
        
        baker = user.baker_profile
        
        review = Review.query.get(review_id)
        if not review:
            return jsonify({'error': 'Review not found'}), 404
        
        if review.baker_id != baker.id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        reply_text = data.get('reply', '').strip()
        
        if not reply_text:
            return jsonify({'error': 'Reply text is required'}), 400
        
        review.baker_reply = reply_text
        review.reply_at = datetime.utcnow()
        
        db.session.add(review)
        
        notification = Notification(
            user_id=review.user_id,
            title=f"{baker.shop_name} replied to your review",
            message=f"Reply to your review of {review.product.name}:\n\n\"{reply_text}\"",
            type='info',
            related_review_id=review.id
        )
        
        db.session.add(notification)
        
        db.session.commit()
        
        db.session.refresh(review)
        
        print(f"Baker {baker.id} replied to review {review_id}. Notification sent to user {review.user_id}")
        print(f"Review {review_id} updated - baker_reply: {review.baker_reply}, has_reply: {review.baker_reply is not None}")
        
        return jsonify({
            'message': 'Reply posted successfully',
            'review': {
                'id': review.id,
                'baker_reply': review.baker_reply,
                'reply_at': review.reply_at.isoformat()
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error posting reply: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
