"""
Additional Baker Routes for Orders, Reviews, and Status Updates
"""

from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
import json
from database import db, Baker, Product, Order, OrderItem, Review, User, Notification
import jwt

def verify_token(token):
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

baker_orders_bp = Blueprint('baker_orders', __name__)

# Currency configuration
CURRENCY_SYMBOL = '₹'
CURRENCY_CODE = 'INR'

def verify_baker_token_local(request):
    """Helper function to verify baker authentication"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload or payload.get('user_type') != 'baker':
        return None
    
    user = User.query.get(payload['user_id'])
    if not user or not user.baker_profile:
        return None
    
    return user.baker_profile

@baker_orders_bp.route('/baker/orders', methods=['GET'])
def get_baker_orders():
    """Get all orders for the baker's products"""
    try:
        baker = verify_baker_token_local(request)
        if not baker:
            return jsonify({'error': 'Unauthorized'}), 401
        
        # Get all product IDs for this baker
        product_ids = [p.id for p in baker.products]
        
        # Get all order items for these products
        order_items = db.session.query(OrderItem).filter(
            OrderItem.product_id.in_(product_ids)
        ).all()
        
        # Get unique order IDs
        order_ids = list(set([item.order_id for item in order_items]))
        
        # Get all orders
        orders = db.session.query(Order).filter(
            Order.id.in_(order_ids)
        ).order_by(Order.created_at.desc()).all()
        
        # Format orders with customer details
        formatted_orders = []
        for order in orders:
            customer = User.query.get(order.user_id)
            delivery_addr = json.loads(order.delivery_address)
            
            # Get items for this order from this baker only
            baker_items = [item for item in order.items if item.product_id in product_ids]
            
            # Ensure all items have product_id included
            items_with_product_id = []
            for item in baker_items:
                items_with_product_id.append({
                    'product_id': item.product_id,  # Critical for reviews
                    'product_name': item.product_name,
                    'quantity': item.quantity,
                    'price': item.price
                })
            
            formatted_orders.append({
                'id': order.id,
                'order_id': order.order_id,
                'customer_name': customer.name if customer else 'Unknown',
                'customer_email': customer.email if customer else '',
                'customer_phone': delivery_addr.get('phone', ''),
                'items': items_with_product_id,
                'total_amount': sum(item.price * item.quantity for item in baker_items),
                'status': order.status,
                'payment_status': order.payment_status,
                'delivery_address': delivery_addr,
                'created_at': order.created_at.isoformat()
            })
        
        return jsonify({
            'orders': formatted_orders,
            'currency': CURRENCY_CODE,
            'currency_symbol': CURRENCY_SYMBOL
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@baker_orders_bp.route('/baker/orders/<int:order_id>/status', methods=['PUT'])
def update_baker_order_status(order_id):
    """Update order status"""
    try:
        baker = verify_baker_token_local(request)
        if not baker:
            print(f"Authorization failed for order {order_id}")
            return jsonify({'error': 'Unauthorized'}), 401
        
        data = request.get_json()
        new_status = data.get('status')
        
        print(f"Updating order {order_id} to status: {new_status}")
        
        if not new_status:
            return jsonify({'error': 'Status is required'}), 400
        
        # Valid status transitions
        valid_statuses = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled']
        
        if new_status not in valid_statuses:
            return jsonify({'error': f'Invalid status: {new_status}. Valid statuses are: {", ".join(valid_statuses)}'}), 400
        
        # Get order
        order = Order.query.get(order_id)
        if not order:
            print(f"Order {order_id} not found in database")
            return jsonify({'error': 'Order not found'}), 404
        
        print(f"Order found: {order.order_id}, current status: {order.status}")
        
        # Verify this order contains baker's products
        product_ids = [p.id for p in baker.products]
        has_baker_items = any(item.product_id in product_ids for item in order.items)
        
        if not has_baker_items:
            print(f"Order {order_id} does not contain products from baker {baker.id}")
            return jsonify({'error': 'Unauthorized - order does not contain your products'}), 403
        
        # Update status
        old_status = order.status
        order.status = new_status
        
        print(f"Status updated from {old_status} to {new_status}")
        
        # Create notification for customer
        status_messages = {
            'confirmed': 'Your order has been confirmed!',
            'preparing': 'Your order is being prepared',
            'ready': 'Your order is ready!',
            'out_for_delivery': 'Your order is out for delivery',
            'delivered': 'Your order has been delivered!',
            'cancelled': 'Your order has been cancelled'
        }
        
        if new_status in status_messages:
            notification = Notification(
                user_id=order.user_id,
                title=f"Order {order.order_id} Updated",
                message=status_messages[new_status],
                type='success' if new_status == 'delivered' else 'info'
            )
            db.session.add(notification)
            print(f"Notification created for user {order.user_id}")
        
        db.session.commit()
        print(f"Order status update committed to database")
        
        return jsonify({
            'message': 'Order status updated successfully',
            'order': {
                'id': order.id,
                'order_id': order.order_id,
                'status': order.status,
                'previous_status': old_status
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating order status: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@baker_orders_bp.route('/baker/reviews/<int:review_id>/reply', methods=['POST'])
def reply_to_review(review_id):
    """Baker reply to a customer review"""
    try:
        baker = verify_baker_token_local(request)
        if not baker:
            return jsonify({'error': 'Unauthorized'}), 401
        
        # Get review
        review = Review.query.get(review_id)
        if not review:
            return jsonify({'error': 'Review not found'}), 404
        
        # Verify review belongs to this baker
        if review.baker_id != baker.id:
            return jsonify({'error': 'Unauthorized - this review is not for your products'}), 403
        
        data = request.get_json()
        reply = data.get('reply')
        
        if not reply:
            return jsonify({'error': 'Reply text is required'}), 400
        
        # Update review with baker's reply
        review.baker_reply = reply
        review.reply_at = datetime.utcnow()
        
        # Create notification for the customer
        product = Product.query.get(review.product_id)
        notification = Notification(
            user_id=review.user_id,
            title=f"{baker.shop_name} replied to your review",
            message=f"The baker has responded to your review of {product.name if product else 'their product'}",
            type='info'
        )
        db.session.add(notification)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Reply added successfully',
            'review': {
                'id': review.id,
                'baker_reply': review.baker_reply,
                'reply_at': review.reply_at.isoformat()
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@baker_orders_bp.route('/baker/reviews', methods=['GET'])
def get_baker_reviews():
    """Get all reviews for the baker's products"""
    try:
        baker = verify_baker_token_local(request)
        if not baker:
            return jsonify({'error': 'Unauthorized'}), 401
        
        # Get all reviews for this baker
        reviews = db.session.query(Review).filter(
            Review.baker_id == baker.id
        ).order_by(Review.created_at.desc()).all()
        
        # Format reviews
        formatted_reviews = []
        for review in reviews:
            customer = User.query.get(review.user_id)
            product = Product.query.get(review.product_id)
            
            # Calculate time ago
            time_diff = datetime.utcnow() - review.created_at
            if time_diff.days > 0:
                time_ago = f"{time_diff.days} days ago"
            elif time_diff.seconds // 3600 > 0:
                time_ago = f"{time_diff.seconds // 3600} hours ago"
            else:
                time_ago = f"{time_diff.seconds // 60} minutes ago"
            
            formatted_reviews.append({
                'id': review.id,
                'product_id': review.product_id,
                'product_name': product.name if product else 'Unknown Product',
                'customer_name': customer.name if customer else 'Anonymous',
                'customer_email': customer.email if customer else '',
                'rating': review.rating,
                'comment': review.comment,
                'baker_reply': review.baker_reply,
                'reply_at': review.reply_at.isoformat() if review.reply_at else None,
                'created_at': review.created_at.isoformat(),
                'time_ago': time_ago
            })
        
        # Calculate average rating
        avg_rating = sum(r.rating for r in reviews) / len(reviews) if reviews else 0
        
        return jsonify({
            'reviews': formatted_reviews,
            'average_rating': round(avg_rating, 1),
            'total_reviews': len(reviews)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@baker_orders_bp.route('/baker/profile', methods=['GET'])
def get_my_baker_profile():
    """Get logged-in baker's complete profile"""
    try:
        baker = verify_baker_token_local(request)
        if not baker:
            return jsonify({'error': 'Unauthorized'}), 401
        
        return jsonify({
            'id': baker.id,
            'shop_name': baker.shop_name,
            'owner_name': baker.owner_name,
            'phone': baker.phone,
            'business_license': baker.business_license,
            'tax_id': baker.tax_id,
            'shop_address': baker.shop_address,
            'city': baker.city,
            'state': baker.state,
            'zip_code': baker.zip_code,
            'shop_description': baker.shop_description,
            'verified': baker.verified,
            'created_at': baker.created_at.isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Customer endpoints for reviews
@baker_orders_bp.route('/orders/<int:order_id>/review', methods=['POST'])
def add_order_review():
    """Add a review for a delivered order"""
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Get order
        order = Order.query.get(order_id)
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        
        # Verify order belongs to user
        if order.user_id != payload['user_id']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Verify order is delivered
        if order.status != 'delivered':
            return jsonify({'error': 'Can only review delivered orders'}), 400
        
        data = request.get_json()
        
        # Validate required fields
        if 'product_id' not in data or 'rating' not in data:
            return jsonify({'error': 'Product ID and rating are required'}), 400
        
        product_id = data['product_id']
        rating = data['rating']
        comment = data.get('comment', '')
        
        # Validate rating
        if not (1 <= rating <= 5):
            return jsonify({'error': 'Rating must be between 1 and 5'}), 400
        
        # Get product and verify it's in the order
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        # Verify product is in this order
        order_item = next((item for item in order.items if item.product_id == product_id), None)
        if not order_item:
            return jsonify({'error': 'Product not in this order'}), 400
        
        # Check if review already exists
        existing_review = Review.query.filter_by(
            user_id=payload['user_id'],
            product_id=product_id,
            baker_id=product.baker_id
        ).first()
        
        if existing_review:
            # Update existing review
            existing_review.rating = rating
            existing_review.comment = comment
            db.session.commit()
            
            return jsonify({
                'message': 'Review updated successfully',
                'review': {
                    'id': existing_review.id,
                    'rating': existing_review.rating,
                    'comment': existing_review.comment
                }
            }), 200
        else:
            # Create new review
            review = Review(
                user_id=payload['user_id'],
                product_id=product_id,
                baker_id=product.baker_id,
                rating=rating,
                comment=comment
            )
            
            db.session.add(review)
            db.session.commit()
            
            return jsonify({
                'message': 'Review added successfully',
                'review': {
                    'id': review.id,
                    'rating': review.rating,
                    'comment': review.comment
                }
            }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
