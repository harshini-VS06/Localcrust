from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import jwt
import random
import os
import json
from dotenv import load_dotenv
from email_service import send_otp_email, send_order_confirmation

# Import database and models
from database import db, User, Baker, Product, Order, OrderItem, Review, Wishlist, Notification, Admin

# Try to import AI service, but continue if it fails
try:
    from ai_service import get_recipe_suggestions, get_product_recommendations
    AI_SERVICE_AVAILABLE = True
except Exception as e:
    print(f"Warning: AI service not available: {e}")
    AI_SERVICE_AVAILABLE = False
    
from razorpay_service import create_razorpay_order

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///local_crust.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'

# Initialize database with app
db.init_app(app)

# Store OTPs temporarily (in production, use Redis or similar)
otp_storage = {}

# Initialize database
with app.app_context():
    db.create_all()

# Helper Functions
def generate_otp():
    """Generate a 6-digit OTP"""
    return str(random.randint(100000, 999999))

def generate_order_id():
    """Generate unique order ID"""
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    random_part = random.randint(1000, 9999)
    return f"LC{timestamp}{random_part}"

def create_token(user_id, user_type):
    """Create JWT token"""
    payload = {
        'user_id': user_id,
        'user_type': user_type,
        'exp': datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def verify_token(token):
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

# Routes
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'Local Crust API is running'}), 200

# Authentication Routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user (customer)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'email', 'password', 'user_type']
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
            user_type=data['user_type']
        )
        
        db.session.add(user)
        db.session.commit()
        
        # Generate token
        token = create_token(user.id, user.user_type)
        
        return jsonify({
            'message': 'User registered successfully',
            'token': token,
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

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login with email and password"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Find user
        user = User.query.filter_by(email=data['email']).first()
        
        if not user or not check_password_hash(user.password_hash, data['password']):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Generate token
        token = create_token(user.id, user.user_type)
        
        # Prepare response based on user type
        user_data = {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'user_type': user.user_type
        }
        
        # If baker, include baker profile
        if user.user_type == 'baker' and user.baker_profile:
            user_data['baker_profile'] = {
                'shop_name': user.baker_profile.shop_name,
                'verified': user.baker_profile.verified
            }
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': user_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/send-otp', methods=['POST'])
def send_otp():
    """Send OTP to email"""
    try:
        data = request.get_json()
        
        if 'email' not in data:
            return jsonify({'error': 'Email is required'}), 400
        
        email = data['email']
        
        # Check if user exists
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Generate OTP
        otp = generate_otp()
        
        # Store OTP with expiration (5 minutes)
        otp_storage[email] = {
            'otp': otp,
            'expires_at': datetime.utcnow() + timedelta(minutes=5)
        }
        
        # Send OTP via email
        email_sent = send_otp_email(email, otp)
        
        # For development: also print to console
        print(f"OTP for {email}: {otp}")
        
        return jsonify({
            'message': 'OTP sent successfully' if email_sent else 'OTP generated (email not configured)',
            'email': email,
            'otp': otp if not email_sent else None  # Only return OTP if email failed
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/verify-otp', methods=['POST'])
def verify_otp():
    """Verify OTP and login"""
    try:
        data = request.get_json()
        
        if 'email' not in data or 'otp' not in data:
            return jsonify({'error': 'Email and OTP are required'}), 400
        
        email = data['email']
        otp = data['otp']
        
        # Check if OTP exists
        if email not in otp_storage:
            return jsonify({'error': 'OTP not found or expired'}), 400
        
        stored_otp_data = otp_storage[email]
        
        # Check if OTP is expired
        if datetime.utcnow() > stored_otp_data['expires_at']:
            del otp_storage[email]
            return jsonify({'error': 'OTP expired'}), 400
        
        # Verify OTP
        if stored_otp_data['otp'] != otp:
            return jsonify({'error': 'Invalid OTP'}), 401
        
        # Remove used OTP
        del otp_storage[email]
        
        # Find user
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Generate token
        token = create_token(user.id, user.user_type)
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'user_type': user.user_type
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Baker Registration Routes
@app.route('/api/baker/register', methods=['POST'])
def register_baker():
    """Complete baker registration with all details"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = [
            'shop_name', 'owner_name', 'email', 'phone', 'password',
            'business_license', 'tax_id', 'shop_address', 'city', 'state', 'zip_code',
            'shop_description', 'products'
        ]
        
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Check if user already exists
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
        db.session.flush()  # Get user.id without committing
        
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
            license_document=data.get('license_document', ''),
            shop_description=data['shop_description'],
            verified=False  # Requires admin verification
        )
        
        db.session.add(baker)
        db.session.flush()  # Get baker.id without committing
        
        # Add products
        for product_data in data['products']:
            product = Product(
                baker_id=baker.id,
                name=product_data['name'],
                category=product_data['category'],
                price=float(product_data['price']),
                description=product_data.get('description', ''),
                in_stock=True
            )
            db.session.add(product)
        
        db.session.commit()
        
        # Generate token
        token = create_token(user.id, user.user_type)
        
        return jsonify({
            'message': 'Baker registered successfully',
            'token': token,
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'user_type': user.user_type,
                'baker_profile': {
                    'id': baker.id,
                    'shop_name': baker.shop_name,
                    'verified': baker.verified
                }
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/baker/profile/<int:baker_id>', methods=['GET'])
def get_baker_profile(baker_id):
    """Get baker profile details"""
    try:
        baker = Baker.query.get(baker_id)
        
        if not baker:
            return jsonify({'error': 'Baker not found'}), 404
        
        return jsonify({
            'id': baker.id,
            'shop_name': baker.shop_name,
            'owner_name': baker.owner_name,
            'phone': baker.phone,
            'shop_description': baker.shop_description,
            'city': baker.city,
            'state': baker.state,
            'verified': baker.verified,
            'products': [{
                'id': p.id,
                'name': p.name,
                'category': p.category,
                'price': p.price,
                'description': p.description,
                'image_url': p.image_url,
                'in_stock': p.in_stock
            } for p in baker.products]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/bakers', methods=['GET'])
def get_all_bakers():
    """Get all verified bakers"""
    try:
        bakers = Baker.query.filter_by(verified=True).all()
        
        return jsonify({
            'bakers': [{
                'id': baker.id,
                'shop_name': baker.shop_name,
                'shop_description': baker.shop_description,
                'city': baker.city,
                'state': baker.state,
                'product_count': len(baker.products)
            } for baker in bakers]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Product Routes
@app.route('/api/products', methods=['GET'])
def get_all_products():
    """Get all products from verified bakers"""
    try:
        products = db.session.query(Product).join(Baker).filter(
            Baker.verified == True,
            Product.in_stock == True
        ).all()
        
        return jsonify({
            'products': [{
                'id': p.id,
                'name': p.name,
                'category': p.category,
                'price': p.price,
                'description': p.description,
                'image_url': p.image_url,
                'in_stock': p.in_stock,
                'baker': {
                    'id': p.baker.id,
                    'shop_name': p.baker.shop_name,
                    'city': p.baker.city
                }
            } for p in products]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/baker/products', methods=['POST'])
def add_product():
    """Add a new product (requires authentication)"""
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload or payload['user_type'] != 'baker':
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Get baker profile
        user = User.query.get(payload['user_id'])
        if not user or not user.baker_profile:
            return jsonify({'error': 'Baker profile not found'}), 404
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'category', 'price']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Create product
        product = Product(
            baker_id=user.baker_profile.id,
            name=data['name'],
            category=data['category'],
            price=float(data['price']),
            description=data.get('description', ''),
            in_stock=True
        )
        
        db.session.add(product)
        db.session.commit()
        
        return jsonify({
            'message': 'Product added successfully',
            'product': {
                'id': product.id,
                'name': product.name,
                'category': product.category,
                'price': product.price
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Order Routes
@app.route('/api/orders', methods=['POST'])
def create_order():
    """Create a new order"""
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['items', 'delivery_address', 'total_amount']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Generate unique order ID
        order_id = generate_order_id()
        
        # Create order
        order = Order(
            order_id=order_id,
            user_id=payload['user_id'],
            total_amount=data['total_amount'],
            status='pending',
            payment_status='pending',
            delivery_address=json.dumps(data['delivery_address'])
        )
        
        db.session.add(order)
        db.session.flush()
        
        # Add order items
        for item_data in data['items']:
            product = Product.query.get(item_data['product_id'])
            if not product:
                raise ValueError(f"Product {item_data['product_id']} not found")
            
            order_item = OrderItem(
                order_id=order.id,
                product_id=product.id,
                product_name=product.name,
                baker_name=product.baker.shop_name,
                quantity=item_data['quantity'],
                price=item_data['price']
            )
            db.session.add(order_item)
        
        db.session.commit()
        
        # Create Razorpay order
        razorpay_result = create_razorpay_order(
            amount=data['total_amount'],
            order_id=order.order_id,
            currency='INR'
        )
        
        if not razorpay_result['success']:
            # Log error but don't fail the order creation
            print(f"Razorpay order creation failed: {razorpay_result.get('error')}")
        
        # Return order details
        response_data = {
            'id': order.id,
            'order_id': order.order_id,
            'user_id': order.user_id,
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
        }
        
        # Add Razorpay order ID if available
        if razorpay_result['success']:
            response_data['razorpay_order_id'] = razorpay_result['razorpay_order_id']
        
        return jsonify(response_data), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders/<int:order_id>/payment', methods=['PUT'])
def update_payment_status(order_id):
    """Update payment status for an order"""
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        order = Order.query.get(order_id)
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        
        if order.user_id != payload['user_id']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        
        # Update payment details
        order.payment_id = data.get('payment_id')
        order.payment_status = data.get('payment_status', 'completed')
        
        if order.payment_status == 'completed':
            order.status = 'confirmed'
        
        db.session.commit()
        
        return jsonify({
            'id': order.id,
            'order_id': order.order_id,
            'payment_status': order.payment_status,
            'status': order.status
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders/my-orders', methods=['GET'])
def get_user_orders():
    """Get all orders for the logged-in user"""
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        orders = Order.query.filter_by(user_id=payload['user_id']).order_by(Order.created_at.desc()).all()
        
        result_orders = []
        for order in orders:
            result_orders.append({
                'id': order.id,
                'order_id': order.order_id,
                'total_amount': order.total_amount,
                'status': order.status,
                'payment_status': order.payment_status,
                'created_at': order.created_at.isoformat(),
                'items': [{
                    'product_id': item.product_id,  # This is critical for reviews
                    'product_name': item.product_name,
                    'baker_name': item.baker_name,
                    'quantity': item.quantity,
                    'price': item.price
                } for item in order.items]
            })
        
        print(f"Returning {len(result_orders)} orders for user {payload['user_id']}")
        
        return jsonify({
            'orders': result_orders
        }), 200
        
    except Exception as e:
        print(f"Error fetching user orders: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders/<int:order_id>', methods=['GET'])
def get_order_by_id(order_id):
    """Get order details by ID"""
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        order = Order.query.get(order_id)
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        
        if order.user_id != payload['user_id']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        print(f"Fetching order {order_id} for user {payload['user_id']}")
        
        return jsonify({
            'id': order.id,
            'order_id': order.order_id,
            'total_amount': order.total_amount,
            'status': order.status,
            'payment_status': order.payment_status,
            'delivery_address': json.loads(order.delivery_address),
            'created_at': order.created_at.isoformat(),
            'items': [{
                'product_id': item.product_id,  # Critical for reviews
                'product_name': item.product_name,
                'baker_name': item.baker_name,
                'quantity': item.quantity,
                'price': item.price
            } for item in order.items]
        }), 200
        
    except Exception as e:
        print(f"Error fetching order {order_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# Baker Dashboard Routes
@app.route('/api/baker/dashboard/stats', methods=['GET'])
def get_baker_dashboard_stats():
    """Get dashboard statistics for baker"""
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload or payload['user_type'] != 'baker':
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Get baker profile
        user = User.query.get(payload['user_id'])
        if not user or not user.baker_profile:
            return jsonify({'error': 'Baker profile not found'}), 404
        
        baker = user.baker_profile
        
        # Get orders for this baker's products
        baker_product_ids = [p.id for p in baker.products]
        
        # Get all order items for baker's products
        order_items = OrderItem.query.filter(OrderItem.product_id.in_(baker_product_ids)).all()
        order_ids = list(set([item.order_id for item in order_items]))
        
        # Get orders
        orders = Order.query.filter(Order.id.in_(order_ids)).all() if order_ids else []
        
        # Calculate stats
        total_orders = len(orders)
        total_products = len(baker.products)
        total_revenue = sum(order.total_amount for order in orders if order.payment_status == 'completed')
        pending_orders = len([o for o in orders if o.status in ['pending', 'confirmed', 'preparing']])
        
        return jsonify({
            'totalOrders': total_orders,
            'totalProducts': total_products,
            'totalRevenue': total_revenue,
            'pendingOrders': pending_orders
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/baker/products', methods=['GET'])
def get_baker_products():
    """Get all products for the logged-in baker"""
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload or payload['user_type'] != 'baker':
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Get baker profile
        user = User.query.get(payload['user_id'])
        if not user or not user.baker_profile:
            return jsonify({'error': 'Baker profile not found'}), 404
        
        baker = user.baker_profile
        
        return jsonify({
            'products': [{
                'id': p.id,
                'name': p.name,
                'category': p.category,
                'price': p.price,
                'description': p.description,
                'image_url': p.image_url,
                'in_stock': p.in_stock,
                'created_at': p.created_at.isoformat()
            } for p in baker.products]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/baker/products/<int:product_id>', methods=['PUT'])
def update_baker_product(product_id):
    """Update a product"""
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload or payload['user_type'] != 'baker':
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Get baker profile
        user = User.query.get(payload['user_id'])
        if not user or not user.baker_profile:
            return jsonify({'error': 'Baker profile not found'}), 404
        
        # Get product and verify ownership
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        if product.baker_id != user.baker_profile.id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        
        # Update product fields
        if 'name' in data:
            product.name = data['name']
        if 'category' in data:
            product.category = data['category']
        if 'price' in data:
            product.price = float(data['price'])
        if 'description' in data:
            product.description = data['description']
        if 'in_stock' in data:
            product.in_stock = data['in_stock']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Product updated successfully',
            'product': {
                'id': product.id,
                'name': product.name,
                'category': product.category,
                'price': product.price,
                'description': product.description,
                'image_url': product.image_url,
                'in_stock': product.in_stock
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/baker/products/<int:product_id>', methods=['DELETE'])
def delete_baker_product(product_id):
    """Delete a product"""
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload or payload['user_type'] != 'baker':
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Get baker profile
        user = User.query.get(payload['user_id'])
        if not user or not user.baker_profile:
            return jsonify({'error': 'Baker profile not found'}), 404
        
        # Get product and verify ownership
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        if product.baker_id != user.baker_profile.id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        db.session.delete(product)
        db.session.commit()
        
        return jsonify({
            'message': 'Product deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/baker/orders', methods=['GET'])
def get_baker_orders():
    """Get all orders for the logged-in baker"""
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload or payload['user_type'] != 'baker':
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Get baker profile
        user = User.query.get(payload['user_id'])
        if not user or not user.baker_profile:
            return jsonify({'error': 'Baker profile not found'}), 404
        
        baker = user.baker_profile
        
        # Get orders for this baker's products
        baker_product_ids = [p.id for p in baker.products]
        
        # Get all order items for baker's products
        order_items = OrderItem.query.filter(OrderItem.product_id.in_(baker_product_ids)).all()
        order_ids = list(set([item.order_id for item in order_items]))
        
        # Get orders
        orders = Order.query.filter(Order.id.in_(order_ids)).order_by(Order.created_at.desc()).all() if order_ids else []
        
        # Build response
        result = []
        for order in orders:
            # Get items for this order that belong to this baker
            baker_items = [item for item in order.items if item.product_id in baker_product_ids]
            
            # Parse delivery address
            try:
                delivery_address = json.loads(order.delivery_address)
            except:
                delivery_address = {}
            
            result.append({
                'id': order.id,
                'order_id': order.order_id,
                'customer_name': order.user.name,
                'customer_email': order.user.email,
                'customer_phone': delivery_address.get('phone', ''),
                'items': [{
                    'product_id': item.product_id,
                    'product_name': item.product_name,
                    'quantity': item.quantity,
                    'price': item.price
                } for item in baker_items],
                'total_amount': sum(item.price * item.quantity for item in baker_items),
                'status': order.status,
                'payment_status': order.payment_status,
                'delivery_address': delivery_address,
                'created_at': order.created_at.isoformat()
            })
        
        return jsonify({
            'orders': result
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Wishlist Routes
@app.route('/api/wishlist', methods=['GET'])
def get_wishlist():
    """Get user's wishlist"""
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Get wishlist items
        wishlist_items = Wishlist.query.filter_by(user_id=payload['user_id']).all()
        
        return jsonify({
            'wishlist': [{
                'id': item.id,
                'product_id': item.product_id,
                'product': {
                    'id': item.product.id,
                    'name': item.product.name,
                    'category': item.product.category,
                    'price': item.product.price,
                    'description': item.product.description,
                    'image_url': item.product.image_url,
                    'in_stock': item.product.in_stock,
                    'baker': {
                        'id': item.product.baker.id,
                        'shop_name': item.product.baker.shop_name,
                        'city': item.product.baker.city
                    }
                },
                'created_at': item.created_at.isoformat()
            } for item in wishlist_items]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/wishlist/<int:product_id>', methods=['POST'])
def add_to_wishlist(product_id):
    """Add product to wishlist"""
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Check if product exists
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        # Check if already in wishlist
        existing = Wishlist.query.filter_by(
            user_id=payload['user_id'],
            product_id=product_id
        ).first()
        
        if existing:
            return jsonify({'message': 'Product already in wishlist'}), 200
        
        # Add to wishlist
        wishlist_item = Wishlist(
            user_id=payload['user_id'],
            product_id=product_id
        )
        
        db.session.add(wishlist_item)
        db.session.commit()
        
        return jsonify({
            'message': 'Product added to wishlist',
            'wishlist_item': {
                'id': wishlist_item.id,
                'product_id': wishlist_item.product_id
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/wishlist/<int:product_id>', methods=['DELETE'])
def remove_from_wishlist(product_id):
    """Remove product from wishlist"""
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Find wishlist item
        wishlist_item = Wishlist.query.filter_by(
            user_id=payload['user_id'],
            product_id=product_id
        ).first()
        
        if not wishlist_item:
            return jsonify({'error': 'Product not in wishlist'}), 404
        
        db.session.delete(wishlist_item)
        db.session.commit()
        
        return jsonify({
            'message': 'Product removed from wishlist'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# AI and Recipe Routes
@app.route('/api/ai/recipe-suggestions', methods=['POST'])
def get_ai_recipe_suggestions():
    """Get AI-powered recipe suggestions based on cart items"""
    try:
        if not AI_SERVICE_AVAILABLE:
            return jsonify({
                'recipes': [],
                'message': 'AI service temporarily unavailable'
            }), 200
        
        data = request.get_json()
        
        if 'cart_items' not in data:
            return jsonify({'error': 'Cart items required'}), 400
        
        cart_items = data['cart_items']
        
        if not cart_items:
            return jsonify({
                'recipes': [],
                'message': 'Add items to your cart to get recipe suggestions!'
            }), 200
        
        # Get AI suggestions
        result = get_recipe_suggestions(cart_items)
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/product-recommendations', methods=['POST'])
def get_ai_product_recommendations():
    """Get AI-powered product recommendations"""
    try:
        if not AI_SERVICE_AVAILABLE:
            return jsonify({
                'recommendations': [],
                'message': 'AI recommendations temporarily unavailable'
            }), 200
        
        data = request.get_json()
        
        user_preferences = data.get('user_preferences', [])
        available_products = data.get('available_products', [])
        
        if not available_products:
            return jsonify({
                'recommendations': [],
                'message': 'No products available'
            }), 200
        
        # Get AI recommendations
        recommendations = get_product_recommendations(user_preferences, available_products)
        
        return jsonify({
            'recommendations': recommendations,
            'message': 'Based on your preferences'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Review Routes
@app.route('/api/orders/<int:order_id>/review', methods=['POST'])
def submit_review(order_id):
    """Submit a review for a product in an order"""
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Get order and verify ownership
        order = Order.query.get(order_id)
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        
        if order.user_id != payload['user_id']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['product_id', 'rating', 'comment']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        product_id = data['product_id']
        rating = data['rating']
        comment = data['comment']
        
        # Validate rating
        if not isinstance(rating, int) or rating < 1 or rating > 5:
            return jsonify({'error': 'Rating must be between 1 and 5'}), 400
        
        # Verify product exists and is in the order
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        order_item = OrderItem.query.filter_by(
            order_id=order_id,
            product_id=product_id
        ).first()
        
        if not order_item:
            return jsonify({'error': 'Product not found in this order'}), 400
        
        # Check if review already exists
        existing_review = Review.query.filter_by(
            user_id=payload['user_id'],
            product_id=product_id
        ).first()
        
        if existing_review:
            # Update existing review
            existing_review.rating = rating
            existing_review.comment = comment
            existing_review.created_at = datetime.utcnow()
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
                'message': 'Review submitted successfully',
                'review': {
                    'id': review.id,
                    'rating': review.rating,
                    'comment': review.comment
                }
            }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error submitting review: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/products/<int:product_id>/reviews', methods=['GET'])
def get_product_reviews(product_id):
    """Get all reviews for a product"""
    try:
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        reviews = Review.query.filter_by(product_id=product_id).order_by(Review.created_at.desc()).all()
        
        return jsonify({
            'reviews': [{
                'id': review.id,
                'user_name': review.user.name,
                'rating': review.rating,
                'comment': review.comment,
                'baker_reply': review.baker_reply,
                'created_at': review.created_at.isoformat(),
                'reply_at': review.reply_at.isoformat() if review.reply_at else None
            } for review in reviews]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Register Baker Analytics Blueprint
try:
    from baker_analytics import baker_analytics_bp
    app.register_blueprint(baker_analytics_bp, url_prefix='/api')
    print("Baker Analytics Blueprint registered successfully")
except Exception as e:
    print(f"Error registering Baker Analytics Blueprint: {e}")

# Register Baker Orders Blueprint
try:
    from baker_orders import baker_orders_bp
    app.register_blueprint(baker_orders_bp, url_prefix='/api')
    print("Baker Orders Blueprint registered successfully")
except Exception as e:
    print(f"Error registering Baker Orders Blueprint: {e}")

# Register Customer Profile Blueprint
try:
    from customer_profile import customer_profile_bp
    app.register_blueprint(customer_profile_bp, url_prefix='/api')
    print("Customer Profile Blueprint registered successfully")
except Exception as e:
    print(f"Error registering Customer Profile Blueprint: {e}")

# Register Notifications Blueprint
try:
    from notifications import notifications_bp
    app.register_blueprint(notifications_bp, url_prefix='/api')
    print("Notifications Blueprint registered successfully")
except Exception as e:
    print(f"Error registering Notifications Blueprint: {e}")

# Register Baker Reviews Blueprint
try:
    from baker_reviews import baker_reviews_bp
    app.register_blueprint(baker_reviews_bp, url_prefix='/api')
    print("Baker Reviews Blueprint registered successfully")
except Exception as e:
    print(f"Error registering Baker Reviews Blueprint: {e}")

# Register Admin Routes Blueprint
try:
    from admin_routes import admin_bp
    app.register_blueprint(admin_bp)
    print("Admin Routes Blueprint registered successfully")
except Exception as e:
    print(f"Error registering Admin Routes Blueprint: {e}")

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
