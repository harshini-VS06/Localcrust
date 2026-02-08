"""
Admin routes for Local Crust Bakery
Handles admin authentication and administrative functions
"""
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import jwt
from functools import wraps
from database import db, Admin, User, Baker, Product, Order, Review, Payment, OrderItem
from sqlalchemy import func, desc

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

SECRET_KEY = 'your-secret-key-change-in-production'

# Decorator to require admin authentication
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'error': 'No token provided'}), 401
        
        try:
            # Remove 'Bearer ' prefix if present
            if token.startswith('Bearer '):
                token = token[7:]
            
            payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            
            if payload.get('user_type') != 'admin':
                return jsonify({'error': 'Admin access required'}), 403
            
            # Get admin and check if active
            admin = Admin.query.get(payload['admin_id'])
            if not admin or not admin.is_active:
                return jsonify({'error': 'Admin account inactive'}), 403
            
            request.admin = admin
            
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        
        return f(*args, **kwargs)
    
    return decorated_function

# Admin Authentication Routes
@admin_bp.route('/login', methods=['POST'])
def admin_login():
    """Admin login endpoint"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('username') or not data.get('password'):
            return jsonify({'error': 'Username and password required'}), 400
        
        # Find admin
        admin = Admin.query.filter_by(username=data['username']).first()
        
        if not admin:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Check if admin is active
        if not admin.is_active:
            return jsonify({'error': 'Admin account is inactive'}), 403
        
        # Verify password
        if not check_password_hash(admin.password_hash, data['password']):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Update last login
        admin.last_login = datetime.utcnow()
        db.session.commit()
        
        # Create token
        payload = {
            'admin_id': admin.id,
            'user_type': 'admin',
            'role': admin.role,
            'exp': datetime.utcnow() + timedelta(days=1)
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'admin': {
                'id': admin.id,
                'username': admin.username,
                'email': admin.email,
                'full_name': admin.full_name,
                'role': admin.role
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/profile', methods=['GET'])
@admin_required
def get_admin_profile():
    """Get current admin profile"""
    admin = request.admin
    return jsonify({
        'id': admin.id,
        'username': admin.username,
        'email': admin.email,
        'full_name': admin.full_name,
        'role': admin.role,
        'created_at': admin.created_at.isoformat(),
        'last_login': admin.last_login.isoformat() if admin.last_login else None
    }), 200

# Dashboard Statistics
@admin_bp.route('/stats', methods=['GET'])
@admin_required
def get_dashboard_stats():
    """Get dashboard statistics"""
    try:
        # Total counts
        total_users = User.query.filter_by(user_type='customer').count()
        total_bakers = Baker.query.count()
        total_products = Product.query.count()
        total_orders = Order.query.count()
        
        # Verified vs unverified bakers
        verified_bakers = Baker.query.filter_by(verified=True).count()
        pending_bakers = Baker.query.filter_by(verified=False).count()
        
        # Revenue calculation
        completed_orders = Order.query.filter_by(payment_status='completed').all()
        total_revenue = sum(order.total_amount for order in completed_orders)
        
        # Pending orders count
        pending_orders = Order.query.filter_by(status='pending').count()
        
        return jsonify({
            'total_users': total_users,
            'total_bakers': total_bakers,
            'verified_bakers': verified_bakers,
            'pending_bakers': pending_bakers,
            'total_products': total_products,
            'total_orders': total_orders,
            'pending_orders': pending_orders,
            'total_revenue': total_revenue
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# User Management
@admin_bp.route('/users', methods=['GET'])
@admin_required
def get_all_users():
    """Get all customer users"""
    try:
        users = User.query.filter_by(user_type='customer').all()
        
        return jsonify({
            'users': [{
                'id': str(user.id),
                'name': user.name,
                'email': user.email,
                'user_type': user.user_type,
                'is_blocked': user.is_blocked if hasattr(user, 'is_blocked') else False,
                'total_orders': len(user.orders),
                'created_at': user.created_at.isoformat()
            } for user in users]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@admin_required
def get_user_details(user_id):
    """Get detailed user information"""
    try:
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'user_type': user.user_type,
            'is_blocked': user.is_blocked if hasattr(user, 'is_blocked') else False,
            'created_at': user.created_at.isoformat(),
            'total_orders': len(user.orders),
            'total_reviews': len(user.reviews)
        }
        
        return jsonify(user_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users', methods=['POST'])
@admin_required
def create_user():
    """Create a new customer user"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'email', 'password']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Check if user already exists
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already registered'}), 400
        
        # Create new user
        user = User(
            name=data['name'],
            email=data['email'],
            password_hash=generate_password_hash(data['password']),
            user_type='customer',
            is_blocked=False
        )
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            'message': 'User created successfully',
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'user_type': user.user_type
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """Delete a user account"""
    try:
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Prevent deleting baker accounts from user endpoint
        if user.user_type == 'baker':
            return jsonify({'error': 'Use baker deletion endpoint for baker accounts'}), 400
        
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({'message': 'User deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users/<int:user_id>/block', methods=['PUT'])
@admin_required
def block_user(user_id):
    """Block a user account"""
    try:
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user.is_blocked = True
        db.session.commit()
        
        return jsonify({
            'message': 'User blocked successfully',
            'user': {
                'id': user.id,
                'name': user.name,
                'is_blocked': user.is_blocked
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users/<int:user_id>/unblock', methods=['PUT'])
@admin_required
def unblock_user(user_id):
    """Unblock a user account"""
    try:
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user.is_blocked = False
        db.session.commit()
        
        return jsonify({
            'message': 'User unblocked successfully',
            'user': {
                'id': user.id,
                'name': user.name,
                'is_blocked': user.is_blocked
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Baker Management
@admin_bp.route('/bakers/pending', methods=['GET'])
@admin_required
def get_pending_bakers():
    """Get pending bakers awaiting verification"""
    try:
        bakers = Baker.query.filter_by(verified=False).all()
        
        return jsonify({
            'bakers': [{
                'id': str(baker.id),
                'shop_name': baker.shop_name,
                'owner_name': baker.owner_name,
                'phone': baker.phone,
                'city': baker.city,
                'state': baker.state,
                'business_license': baker.business_license,
                'tax_id': baker.tax_id,
                'shop_description': baker.shop_description,
                'verified': baker.verified,
                'user_email': baker.user.email if baker.user else None,
                'product_count': len(baker.products)
            } for baker in bakers]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/bakers', methods=['GET'])
@admin_required
def get_all_bakers():
    """Get all bakers"""
    try:
        bakers = Baker.query.all()
        
        return jsonify({
            'bakers': [{
                'id': str(baker.id),
                'shop_name': baker.shop_name,
                'owner_name': baker.owner_name,
                'phone': baker.phone,
                'city': baker.city,
                'state': baker.state,
                'business_license': baker.business_license,
                'tax_id': baker.tax_id,
                'shop_description': baker.shop_description,
                'verified': baker.verified,
                'user_email': baker.user.email if baker.user else None,
                'product_count': len(baker.products)
            } for baker in bakers]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/bakers/<string:baker_id>/verify', methods=['PUT'])
@admin_required
def verify_baker(baker_id):
    """Verify a baker"""
    try:
        baker = Baker.query.get(int(baker_id))
        
        if not baker:
            return jsonify({'error': 'Baker not found'}), 404
        
        baker.verified = True
        db.session.commit()
        
        return jsonify({
            'message': 'Baker verified successfully',
            'baker': {
                'id': baker.id,
                'shop_name': baker.shop_name,
                'verified': baker.verified
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/bakers/<string:baker_id>/reject', methods=['PUT'])
@admin_required
def reject_baker(baker_id):
    """Reject a baker application"""
    try:
        data = request.get_json()
        baker = Baker.query.get(int(baker_id))
        
        if not baker:
            return jsonify({'error': 'Baker not found'}), 404
        
        user = baker.user
        db.session.delete(baker)
        if user:
            db.session.delete(user)
        db.session.commit()
        
        return jsonify({
            'message': 'Baker application rejected'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/bakers/<int:baker_id>', methods=['DELETE'])
@admin_required
def delete_baker(baker_id):
    """Delete a baker account"""
    try:
        baker = Baker.query.get(baker_id)
        
        if not baker:
            return jsonify({'error': 'Baker not found'}), 404
        
        user = User.query.get(baker.user_id)
        
        db.session.delete(baker)
        if user:
            db.session.delete(user)
        
        db.session.commit()
        
        return jsonify({'message': 'Baker and associated account deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/bakers', methods=['POST'])
@admin_required
def create_baker():
    """Create a new baker account"""
    try:
        data = request.get_json()
        
        required_fields = ['email', 'password', 'shop_name', 'owner_name', 'phone', 
                          'business_license', 'tax_id', 'shop_address', 'city', 'state', 
                          'zip_code', 'shop_description']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already registered'}), 400
        
        user = User(
            name=data['owner_name'],
            email=data['email'],
            password_hash=generate_password_hash(data['password']),
            user_type='baker',
            is_blocked=False
        )
        
        db.session.add(user)
        db.session.flush()
        
        baker = Baker(
            user_id=user.id,
            shop_name=data['shop_name'],
            owner_name=data['owner_name'],
            phone=data['phone'],
            business_license=data['business_license'],
            tax_id=data['tax_id'],
            shop_address=data['shop_address'],
            city=data['city'],
            state=data['state'],
            zip_code=data['zip_code'],
            shop_description=data['shop_description'],
            verified=data.get('verified', False)
        )
        
        db.session.add(baker)
        db.session.commit()
        
        return jsonify({
            'message': 'Baker created successfully',
            'baker': {
                'id': baker.id,
                'user_id': user.id,
                'shop_name': baker.shop_name,
                'owner_name': baker.owner_name,
                'email': user.email,
                'verified': baker.verified
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Order Management
@admin_bp.route('/orders', methods=['GET'])
@admin_required
def get_all_orders():
    """Get all orders"""
    try:
        orders = Order.query.order_by(desc(Order.created_at)).all()
        
        return jsonify({
            'orders': [{
                'id': str(order.id),
                'order_id': order.order_id,
                'customer_name': order.user.name if order.user else 'Unknown User',
                'customer_email': order.user.email if order.user else 'N/A',
                'total_amount': order.total_amount,
                'status': order.status,
                'payment_status': order.payment_status,
                'created_at': order.created_at.isoformat(),
                'items': [{
                    'product_id': item.product_id,
                    'product_name': item.product_name,
                    'baker_name': item.baker_name,
                    'quantity': item.quantity,
                    'price': item.price
                } for item in order.items]
            } for order in orders]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Review Management
@admin_bp.route('/reviews', methods=['GET'])
@admin_required
def get_all_reviews():
    """Get all reviews"""
    try:
        reviews = Review.query.order_by(desc(Review.created_at)).all()
        
        return jsonify({
            'reviews': [{
                'id': str(review.id),
                'user_name': review.user.name if review.user else 'Unknown',
                'product_name': review.product.name if review.product else 'Unknown',
                'rating': review.rating,
                'comment': review.comment,
                'baker_reply': review.baker_reply,
                'created_at': review.created_at.isoformat()
            } for review in reviews]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Sales Reports
@admin_bp.route('/reports/sales', methods=['GET'])
@admin_required
def get_sales_report():
    """Get sales report with revenue breakdown"""
    try:
        # Get completed orders only
        completed_orders = Order.query.filter_by(payment_status='completed').all()
        total_revenue = sum(order.total_amount for order in completed_orders)
        total_orders = len(completed_orders)
        
        # Revenue by baker
        baker_revenue = {}
        for order in completed_orders:
            for item in order.items:
                if item.product and item.product.baker:
                    baker = item.product.baker
                    baker_id = str(baker.id)
                    
                    if baker_id not in baker_revenue:
                        baker_revenue[baker_id] = {
                            'baker_id': baker_id,
                            'baker_name': baker.shop_name,
                            'revenue': 0,
                            'orders': set()
                        }
                    
                    baker_revenue[baker_id]['revenue'] += item.price * item.quantity
                    baker_revenue[baker_id]['orders'].add(order.id)
        
        # Convert to list
        revenue_by_baker = []
        for baker_data in baker_revenue.values():
            revenue_by_baker.append({
                'baker_id': baker_data['baker_id'],
                'baker_name': baker_data['baker_name'],
                'revenue': baker_data['revenue'],
                'orders': len(baker_data['orders'])
            })
        
        revenue_by_baker.sort(key=lambda x: x['revenue'], reverse=True)
        
        # Top products
        product_stats = {}
        for order in completed_orders:
            for item in order.items:
                product_id = str(item.product_id) if item.product_id else 'unknown'
                product_name = item.product_name
                
                if product_id not in product_stats:
                    product_stats[product_id] = {
                        'product_id': product_id,
                        'product_name': product_name,
                        'quantity_sold': 0,
                        'revenue': 0
                    }
                
                product_stats[product_id]['quantity_sold'] += item.quantity
                product_stats[product_id]['revenue'] += item.price * item.quantity
        
        top_products = sorted(
            product_stats.values(),
            key=lambda x: x['revenue'],
            reverse=True
        )[:10]
        
        return jsonify({
            'total_revenue': total_revenue,
            'total_orders': total_orders,
            'revenue_by_baker': revenue_by_baker,
            'top_products': top_products
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Payment Monitoring
@admin_bp.route('/payments', methods=['GET'])
@admin_required
def get_all_payments():
    """Get all Razorpay payment transactions"""
    try:
        payments = Payment.query.order_by(desc(Payment.created_at)).all()
        
        return jsonify({
            'payments': [{
                'id': str(payment.id),
                'order_id': payment.order_id,
                'order_number': payment.order.order_id if payment.order else 'N/A',
                'razorpay_order_id': payment.razorpay_order_id,
                'razorpay_payment_id': payment.razorpay_payment_id or 'N/A',
                'amount': payment.amount,
                'currency': payment.currency,
                'status': payment.status,
                'method': payment.method or 'N/A',
                'email': payment.email or 'N/A',
                'contact': payment.contact or 'N/A',
                'error_code': payment.error_code,
                'error_description': payment.error_description,
                'created_at': payment.created_at.isoformat(),
                'updated_at': payment.updated_at.isoformat()
            } for payment in payments]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/payments/<int:payment_id>', methods=['GET'])
@admin_required
def get_payment_details(payment_id):
    """Get detailed payment information"""
    try:
        payment = Payment.query.get(payment_id)
        
        if not payment:
            return jsonify({'error': 'Payment not found'}), 404
        
        return jsonify({
            'id': payment.id,
            'order_id': payment.order_id,
            'order_number': payment.order.order_id if payment.order else 'N/A',
            'razorpay_order_id': payment.razorpay_order_id,
            'razorpay_payment_id': payment.razorpay_payment_id,
            'razorpay_signature': payment.razorpay_signature,
            'amount': payment.amount,
            'currency': payment.currency,
            'status': payment.status,
            'method': payment.method,
            'email': payment.email,
            'contact': payment.contact,
            'error_code': payment.error_code,
            'error_description': payment.error_description,
            'created_at': payment.created_at.isoformat(),
            'updated_at': payment.updated_at.isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
