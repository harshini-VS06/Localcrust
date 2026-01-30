"""
Admin routes for Local Crust Bakery
Handles admin authentication and administrative functions
"""
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import jwt
from functools import wraps
from database import db, Admin, User, Baker, Product, Order, Review
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
@admin_bp.route('/dashboard/stats', methods=['GET'])
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
        unverified_bakers = Baker.query.filter_by(verified=False).count()
        
        # Revenue calculation
        completed_orders = Order.query.filter_by(payment_status='completed').all()
        total_revenue = sum(order.total_amount for order in completed_orders)
        
        # Recent orders
        recent_orders = Order.query.order_by(desc(Order.created_at)).limit(5).all()
        
        # Order status breakdown
        order_statuses = db.session.query(
            Order.status, 
            func.count(Order.id)
        ).group_by(Order.status).all()
        
        # Recent reviews
        recent_reviews = Review.query.order_by(desc(Review.created_at)).limit(5).all()
        
        return jsonify({
            'total_users': total_users,
            'total_bakers': total_bakers,
            'verified_bakers': verified_bakers,
            'unverified_bakers': unverified_bakers,
            'total_products': total_products,
            'total_orders': total_orders,
            'total_revenue': total_revenue,
            'order_statuses': [{'status': status, 'count': count} for status, count in order_statuses],
            'recent_orders': [{
                'id': order.id,
                'order_id': order.order_id,
                'user_id': order.user_id,
                'total_amount': order.total_amount,
                'status': order.status,
                'created_at': order.created_at.isoformat()
            } for order in recent_orders],
            'recent_reviews': [{
                'id': review.id,
                'user_id': review.user_id,
                'product_id': review.product_id,
                'rating': review.rating,
                'comment': review.comment,
                'created_at': review.created_at.isoformat()
            } for review in recent_reviews]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# User Management
@admin_bp.route('/users', methods=['GET'])
@admin_required
def get_all_users():
    """Get all users with pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        user_type = request.args.get('user_type', 'customer')
        
        users = User.query.filter_by(user_type=user_type).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'users': [{
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'user_type': user.user_type,
                'created_at': user.created_at.isoformat()
            } for user in users.items],
            'total': users.total,
            'pages': users.pages,
            'current_page': page
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
            'created_at': user.created_at.isoformat(),
            'total_orders': len(user.orders),
            'total_reviews': len(user.reviews)
        }
        
        # Add baker profile if user is a baker
        if user.user_type == 'baker' and user.baker_profile:
            baker = user.baker_profile
            user_data['baker_profile'] = {
                'id': baker.id,
                'shop_name': baker.shop_name,
                'owner_name': baker.owner_name,
                'phone': baker.phone,
                'city': baker.city,
                'state': baker.state,
                'verified': baker.verified,
                'total_products': len(baker.products)
            }
        
        return jsonify(user_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Baker Management
@admin_bp.route('/bakers', methods=['GET'])
@admin_required
def get_all_bakers():
    """Get all bakers with filtering"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        verified = request.args.get('verified')
        
        query = Baker.query
        
        if verified is not None:
            verified_bool = verified.lower() == 'true'
            query = query.filter_by(verified=verified_bool)
        
        bakers = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'bakers': [{
                'id': baker.id,
                'shop_name': baker.shop_name,
                'owner_name': baker.owner_name,
                'phone': baker.phone,
                'city': baker.city,
                'state': baker.state,
                'verified': baker.verified,
                'total_products': len(baker.products),
                'created_at': baker.created_at.isoformat()
            } for baker in bakers.items],
            'total': bakers.total,
            'pages': bakers.pages,
            'current_page': page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/bakers/<int:baker_id>', methods=['GET'])
@admin_required
def get_baker_details(baker_id):
    """Get detailed baker information"""
    try:
        baker = Baker.query.get(baker_id)
        
        if not baker:
            return jsonify({'error': 'Baker not found'}), 404
        
        return jsonify({
            'id': baker.id,
            'user_id': baker.user_id,
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
            'created_at': baker.created_at.isoformat(),
            'total_products': len(baker.products),
            'total_reviews': len(baker.reviews)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/bakers/<int:baker_id>/verify', methods=['PUT'])
@admin_required
def verify_baker(baker_id):
    """Verify or unverify a baker"""
    try:
        data = request.get_json()
        baker = Baker.query.get(baker_id)
        
        if not baker:
            return jsonify({'error': 'Baker not found'}), 404
        
        baker.verified = data.get('verified', True)
        db.session.commit()
        
        return jsonify({
            'message': f'Baker {"verified" if baker.verified else "unverified"} successfully',
            'baker': {
                'id': baker.id,
                'shop_name': baker.shop_name,
                'verified': baker.verified
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Product Management
@admin_bp.route('/products', methods=['GET'])
@admin_required
def get_all_products():
    """Get all products"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        products = Product.query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'products': [{
                'id': product.id,
                'name': product.name,
                'category': product.category,
                'price': product.price,
                'baker_id': product.baker_id,
                'baker_name': product.baker.shop_name,
                'in_stock': product.in_stock,
                'created_at': product.created_at.isoformat()
            } for product in products.items],
            'total': products.total,
            'pages': products.pages,
            'current_page': page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/products/<int:product_id>', methods=['DELETE'])
@admin_required
def delete_product(product_id):
    """Delete a product"""
    try:
        product = Product.query.get(product_id)
        
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        db.session.delete(product)
        db.session.commit()
        
        return jsonify({'message': 'Product deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Order Management
@admin_bp.route('/orders', methods=['GET'])
@admin_required
def get_all_orders():
    """Get all orders with filtering"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        
        query = Order.query
        
        if status:
            query = query.filter_by(status=status)
        
        orders = query.order_by(desc(Order.created_at)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'orders': [{
                'id': order.id,
                'order_id': order.order_id,
                'user_id': order.user_id,
                'user_name': order.user.name,
                'total_amount': order.total_amount,
                'status': order.status,
                'payment_status': order.payment_status,
                'created_at': order.created_at.isoformat()
            } for order in orders.items],
            'total': orders.total,
            'pages': orders.pages,
            'current_page': page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/orders/<int:order_id>', methods=['GET'])
@admin_required
def get_order_details(order_id):
    """Get detailed order information"""
    try:
        order = Order.query.get(order_id)
        
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        
        return jsonify({
            'id': order.id,
            'order_id': order.order_id,
            'user': {
                'id': order.user.id,
                'name': order.user.name,
                'email': order.user.email
            },
            'total_amount': order.total_amount,
            'status': order.status,
            'payment_status': order.payment_status,
            'payment_id': order.payment_id,
            'delivery_address': order.delivery_address,
            'created_at': order.created_at.isoformat(),
            'updated_at': order.updated_at.isoformat(),
            'items': [{
                'id': item.id,
                'product_name': item.product_name,
                'baker_name': item.baker_name,
                'quantity': item.quantity,
                'price': item.price
            } for item in order.items]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Review Management
@admin_bp.route('/reviews', methods=['GET'])
@admin_required
def get_all_reviews():
    """Get all reviews"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        reviews = Review.query.order_by(desc(Review.created_at)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'reviews': [{
                'id': review.id,
                'user_name': review.user.name,
                'product_name': review.product.name,
                'baker_name': review.baker.shop_name,
                'rating': review.rating,
                'comment': review.comment,
                'baker_reply': review.baker_reply,
                'created_at': review.created_at.isoformat()
            } for review in reviews.items],
            'total': reviews.total,
            'pages': reviews.pages,
            'current_page': page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/reviews/<int:review_id>', methods=['DELETE'])
@admin_required
def delete_review(review_id):
    """Delete a review (for inappropriate content)"""
    try:
        review = Review.query.get(review_id)
        
        if not review:
            return jsonify({'error': 'Review not found'}), 404
        
        db.session.delete(review)
        db.session.commit()
        
        return jsonify({'message': 'Review deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# User Management - Delete User
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

# User Management - Create User
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
            user_type='customer'
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

# Baker Management - Delete Baker
@admin_bp.route('/bakers/<int:baker_id>', methods=['DELETE'])
@admin_required
def delete_baker(baker_id):
    """Delete a baker account"""
    try:
        baker = Baker.query.get(baker_id)
        
        if not baker:
            return jsonify({'error': 'Baker not found'}), 404
        
        # Get the user account
        user = User.query.get(baker.user_id)
        
        # Delete baker profile first (cascade will handle products)
        db.session.delete(baker)
        
        # Delete associated user account
        if user:
            db.session.delete(user)
        
        db.session.commit()
        
        return jsonify({'message': 'Baker and associated account deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Baker Management - Create Baker
@admin_bp.route('/bakers', methods=['POST'])
@admin_required
def create_baker():
    """Create a new baker account"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['email', 'password', 'shop_name', 'owner_name', 'phone', 
                          'business_license', 'tax_id', 'shop_address', 'city', 'state', 
                          'zip_code', 'shop_description']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Check if email already exists
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already registered'}), 400
        
        # Create user account
        user = User(
            name=data['owner_name'],
            email=data['email'],
            password_hash=generate_password_hash(data['password']),
            user_type='baker'
        )
        
        db.session.add(user)
        db.session.flush()  # Get user.id
        
        # Create baker profile
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
