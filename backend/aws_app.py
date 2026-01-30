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

# Import SNS service for real-time notifications
try:
    from sns_service import (
        send_order_confirmation as sns_send_order_confirmation,
        send_order_status_update as sns_send_status_update,
        send_delivery_notification as sns_send_delivery,
        send_baker_new_order_notification as sns_notify_baker,
        send_payment_confirmation as sns_send_payment,
        subscribe_email_to_notifications
    )
    SNS_ENABLED = os.getenv('SNS_ENABLED', 'True').lower() == 'true'
    print(f"SNS Service loaded. Enabled: {SNS_ENABLED}")
except Exception as e:
    print(f"Warning: SNS service not available: {e}")
    SNS_ENABLED = False

# Import DynamoDB database and models
from dynamodb_database import (
    User, Baker, Product, Order, OrderItem, Review, Wishlist, 
    Notification, Admin, generate_id
)

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

# AWS Production CORS Configuration
allowed_origins = os.getenv('CORS_ORIGINS', 'https://yourdomain.com').split(',')
CORS(app, resources={r"/api/*": {"origins": allowed_origins}})

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'CHANGE-THIS-IN-PRODUCTION')

# Store OTPs temporarily (in production, use Redis or ElastiCache)
otp_storage = {}

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
    return jsonify({'status': 'healthy', 'message': 'Local Crust API is running on AWS with DynamoDB'}), 200

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
        if User.get_by_email(data['email']):
            return jsonify({'error': 'Email already registered'}), 400
        
        # Create new user
        user_id = generate_id()
        user = User.create(
            user_id=user_id,
            name=data['name'],
            email=data['email'],
            password_hash=generate_password_hash(data['password']),
            user_type=data['user_type']
        )
        
        # Generate token
        token = create_token(user['id'], user['user_type'])
        
        # Subscribe user to SNS notifications
        if SNS_ENABLED:
            try:
                subscribe_email_to_notifications(user['email'])
                print(f"📧 User {user['email']} subscribed to SNS notifications")
            except Exception as e:
                print(f"Warning: Failed to subscribe to SNS: {e}")
        
        return jsonify({
            'message': 'User registered successfully',
            'token': token,
            'user': {
                'id': user['id'],
                'name': user['name'],
                'email': user['email'],
                'user_type': user['user_type']
            }
        }), 201
        
    except Exception as e:
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
        user = User.get_by_email(data['email'])
        
        if not user or not check_password_hash(user['password_hash'], data['password']):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Generate token
        token = create_token(user['id'], user['user_type'])
        
        # Prepare response based on user type
        user_data = {
            'id': user['id'],
            'name': user['name'],
            'email': user['email'],
            'user_type': user['user_type']
        }
        
        # If baker, include baker profile
        if user['user_type'] == 'baker':
            baker_profile = Baker.get_by_user_id(user['id'])
            if baker_profile:
                user_data['baker_profile'] = {
                    'shop_name': baker_profile['shop_name'],
                    'verified': baker_profile['verified']
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
        user = User.get_by_email(email)
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
        user = User.get_by_email(email)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Generate token
        token = create_token(user['id'], user['user_type'])
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user['id'],
                'name': user['name'],
                'email': user['email'],
                'user_type': user['user_type']
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
        if User.get_by_email(data['email']):
            return jsonify({'error': 'Email already registered'}), 400
        
        # Create user account
        user_id = generate_id()
        user = User.create(
            user_id=user_id,
            name=data['owner_name'],
            email=data['email'],
            password_hash=generate_password_hash(data['password']),
            user_type='baker'
        )
        
        # Create baker profile
        baker_id = generate_id()
        baker = Baker.create(
            baker_id=baker_id,
            user_id=user['id'],
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
        
        # Add products
        for product_data in data['products']:
            product_id = generate_id()
            Product.create(
                product_id=product_id,
                baker_id=baker['id'],
                name=product_data['name'],
                category=product_data['category'],
                price=float(product_data['price']),
                description=product_data.get('description', ''),
                in_stock=True
            )
        
        # Generate token
        token = create_token(user['id'], user['user_type'])
        
        return jsonify({
            'message': 'Baker registered successfully',
            'token': token,
            'user': {
                'id': user['id'],
                'name': user['name'],
                'email': user['email'],
                'user_type': user['user_type'],
                'baker_profile': {
                    'id': baker['id'],
                    'shop_name': baker['shop_name'],
                    'verified': baker['verified']
                }
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/baker/profile/<int:baker_id>', methods=['GET'])
def get_baker_profile(baker_id):
    """Get baker profile details"""
    try:
        baker = Baker.get_by_id(str(baker_id))
        
        if not baker:
            return jsonify({'error': 'Baker not found'}), 404
        
        # Get products
        products = Product.get_by_baker_id(baker['id'])
        
        return jsonify({
            'id': baker['id'],
            'shop_name': baker['shop_name'],
            'owner_name': baker['owner_name'],
            'phone': baker['phone'],
            'shop_description': baker['shop_description'],
            'city': baker['city'],
            'state': baker['state'],
            'verified': baker['verified'],
            'products': [{
                'id': p['id'],
                'name': p['name'],
                'category': p['category'],
                'price': p['price'],
                'description': p['description'],
                'image_url': p.get('image_url', ''),
                'in_stock': p['in_stock']
            } for p in products]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/bakers', methods=['GET'])
def get_all_bakers():
    """Get all verified bakers"""
    try:
        bakers = Baker.get_all_verified()
        
        result = []
        for baker in bakers:
            products = Product.get_by_baker_id(baker['id'])
            result.append({
                'id': baker['id'],
                'shop_name': baker['shop_name'],
                'shop_description': baker['shop_description'],
                'city': baker['city'],
                'state': baker['state'],
                'product_count': len(products)
            })
        
        return jsonify({'bakers': result}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Product Routes
@app.route('/api/products', methods=['GET'])
def get_all_products():
    """Get all products from verified bakers"""
    try:
        all_products = Product.get_all_in_stock()
        verified_bakers = Baker.get_all_verified()
        verified_baker_ids = [b['id'] for b in verified_bakers]
        
        # Filter products from verified bakers only
        products = [p for p in all_products if p['baker_id'] in verified_baker_ids]
        
        # Enrich with baker info
        result = []
        for p in products:
            baker = Baker.get_by_id(p['baker_id'])
            if baker:
                result.append({
                    'id': p['id'],
                    'name': p['name'],
                    'category': p['category'],
                    'price': p['price'],
                    'description': p['description'],
                    'image_url': p.get('image_url', ''),
                    'in_stock': p['in_stock'],
                    'baker': {
                        'id': baker['id'],
                        'shop_name': baker['shop_name'],
                        'city': baker['city']
                    }
                })
        
        return jsonify({'products': result}), 200
        
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
        user = User.get_by_id(payload['user_id'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        baker_profile = Baker.get_by_user_id(user['id'])
        if not baker_profile:
            return jsonify({'error': 'Baker profile not found'}), 404
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'category', 'price']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Create product
        product_id = generate_id()
        product = Product.create(
            product_id=product_id,
            baker_id=baker_profile['id'],
            name=data['name'],
            category=data['category'],
            price=float(data['price']),
            description=data.get('description', ''),
            in_stock=True
        )
        
        return jsonify({
            'message': 'Product added successfully',
            'product': {
                'id': product['id'],
                'name': product['name'],
                'category': product['category'],
                'price': product['price']
            }
        }), 201
        
    except Exception as e:
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
        order_db_id = generate_id()
        
        # Create order
        order = Order.create(
            order_db_id=order_db_id,
            order_id=order_id,
            user_id=payload['user_id'],
            total_amount=data['total_amount'],
            status='pending',
            payment_status='pending',
            delivery_address=json.dumps(data['delivery_address'])
        )
        
        # Add order items
        items = []
        for item_data in data['items']:
            product = Product.get_by_id(str(item_data['product_id']))
            if not product:
                raise ValueError(f"Product {item_data['product_id']} not found")
            
            baker = Baker.get_by_id(product['baker_id'])
            
            item_id = generate_id()
            order_item = OrderItem.create(
                item_id=item_id,
                order_db_id=order['id'],
                product_id=product['id'],
                product_name=product['name'],
                baker_name=baker['shop_name'],
                quantity=item_data['quantity'],
                price=item_data['price']
            )
            items.append(order_item)
        
        # Create Razorpay order
        razorpay_result = create_razorpay_order(
            amount=data['total_amount'],
            order_id=order['order_id'],
            currency='INR'
        )
        
        if not razorpay_result['success']:
            print(f"Razorpay order creation failed: {razorpay_result.get('error')}")
        
        # Get user info for notifications
        user = User.get_by_id(payload['user_id'])
        
        # Send order confirmation via SNS
        if SNS_ENABLED and user:
            try:
                items_for_notification = [{
                    'product_name': item['product_name'],
                    'quantity': item['quantity'],
                    'price': item['price']
                } for item in items]
                
                sns_send_order_confirmation(
                    order_id=order['order_id'],
                    customer_email=user['email'],
                    customer_name=user['name'],
                    total_amount=data['total_amount'],
                    items=items_for_notification
                )
                print(f"📧 SNS order confirmation sent to {user['email']}")
            except Exception as e:
                print(f"Warning: Failed to send SNS order confirmation: {e}")
        
        # Notify bakers about new orders via SNS
        if SNS_ENABLED:
            try:
                # Group items by baker
                baker_orders = {}
                for item in items:
                    product = Product.get_by_id(item['product_id'])
                    if product:
                        baker_id = product['baker_id']
                        if baker_id not in baker_orders:
                            baker_orders[baker_id] = []
                        baker_orders[baker_id].append({
                            'product_name': item['product_name'],
                            'quantity': item['quantity'],
                            'price': item['price']
                        })
                
                # Send notification to each baker
                for baker_id, baker_items in baker_orders.items():
                    baker = Baker.get_by_id(baker_id)
                    if baker:
                        baker_user = User.get_by_id(baker['user_id'])
                        if baker_user:
                            baker_total = sum(item['price'] * item['quantity'] for item in baker_items)
                            sns_notify_baker(
                                baker_email=baker_user['email'],
                                baker_name=baker['shop_name'],
                                order_id=order['order_id'],
                                customer_name=user['name'] if user else 'Customer',
                                items=baker_items,
                                total_amount=baker_total
                            )
                            print(f"📧 SNS baker notification sent to {baker['shop_name']}")
            except Exception as e:
                print(f"Warning: Failed to send SNS baker notifications: {e}")
        
        # Return order details
        response_data = {
            'id': order['id'],
            'order_id': order['order_id'],
            'user_id': order['user_id'],
            'total_amount': order['total_amount'],
            'status': order['status'],
            'payment_status': order['payment_status'],
            'created_at': order['created_at'],
            'items': [{
                'product_id': item['product_id'],
                'product_name': item['product_name'],
                'baker_name': item['baker_name'],
                'quantity': item['quantity'],
                'price': item['price']
            } for item in items]
        }
        
        # Add Razorpay order ID if available
        if razorpay_result['success']:
            response_data['razorpay_order_id'] = razorpay_result['razorpay_order_id']
        
        return jsonify(response_data), 201
        
    except Exception as e:
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
        
        order = Order.get_by_id(str(order_id))
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        
        if order['user_id'] != payload['user_id']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        
        # Update payment details
        update_data = {
            'payment_id': data.get('payment_id', ''),
            'payment_status': data.get('payment_status', 'completed')
        }
        
        if update_data['payment_status'] == 'completed':
            update_data['status'] = 'confirmed'
        
        Order.update(str(order_id), **update_data)
        
        # Get updated order
        updated_order = Order.get_by_id(str(order_id))
        
        # Send payment confirmation via SNS
        if SNS_ENABLED and update_data.get('payment_status') == 'completed':
            try:
                user = User.get_by_id(payload['user_id'])
                if user:
                    sns_send_payment(
                        order_id=updated_order['order_id'],
                        customer_email=user['email'],
                        customer_name=user['name'],
                        payment_id=update_data.get('payment_id', 'N/A'),
                        amount=float(updated_order['total_amount'])
                    )
                    print(f"📧 SNS payment confirmation sent to {user['email']}")
            except Exception as e:
                print(f"Warning: Failed to send SNS payment confirmation: {e}")
        
        return jsonify({
            'id': updated_order['id'],
            'order_id': updated_order['order_id'],
            'payment_status': updated_order['payment_status'],
            'status': updated_order['status']
        }), 200
        
    except Exception as e:
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
        
        orders = Order.get_by_user_id(payload['user_id'])
        
        # Sort by created_at descending
        orders.sort(key=lambda x: x['created_at'], reverse=True)
        
        result_orders = []
        for order in orders:
            # Get order items
            items = OrderItem.get_by_order_id(order['id'])
            
            result_orders.append({
                'id': order['id'],
                'order_id': order['order_id'],
                'total_amount': order['total_amount'],
                'status': order['status'],
                'payment_status': order['payment_status'],
                'created_at': order['created_at'],
                'items': [{
                    'product_id': item['product_id'],
                    'product_name': item['product_name'],
                    'baker_name': item['baker_name'],
                    'quantity': item['quantity'],
                    'price': item['price']
                } for item in items]
            })
        
        print(f"Returning {len(result_orders)} orders for user {payload['user_id']}")
        
        return jsonify({'orders': result_orders}), 200
        
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
        
        order = Order.get_by_id(str(order_id))
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        
        if order['user_id'] != payload['user_id']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Get order items
        items = OrderItem.get_by_order_id(order['id'])
        
        print(f"Fetching order {order_id} for user {payload['user_id']}")
        
        return jsonify({
            'id': order['id'],
            'order_id': order['order_id'],
            'total_amount': order['total_amount'],
            'status': order['status'],
            'payment_status': order['payment_status'],
            'delivery_address': json.loads(order['delivery_address']),
            'created_at': order['created_at'],
            'items': [{
                'product_id': item['product_id'],
                'product_name': item['product_name'],
                'baker_name': item['baker_name'],
                'quantity': item['quantity'],
                'price': item['price']
            } for item in items]
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
        user = User.get_by_id(payload['user_id'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        baker = Baker.get_by_user_id(user['id'])
        if not baker:
            return jsonify({'error': 'Baker profile not found'}), 404
        
        # Get products
        products = Product.get_by_baker_id(baker['id'])
        product_ids = [p['id'] for p in products]
        
        # Get all order items for baker's products
        # Note: In DynamoDB, we'd need to scan order_items - consider using GSI
        from dynamodb_database import order_items_table
        response = order_items_table.scan()
        all_order_items = response.get('Items', [])
        
        baker_order_items = [item for item in all_order_items if item['product_id'] in product_ids]
        order_ids = list(set([item['order_id'] for item in baker_order_items]))
        
        # Get orders
        orders = []
        for order_id in order_ids:
            order = Order.get_by_id(order_id)
            if order:
                orders.append(order)
        
        # Calculate stats
        total_orders = len(orders)
        total_products = len(products)
        total_revenue = sum(float(order['total_amount']) for order in orders if order['payment_status'] == 'completed')
        pending_orders = len([o for o in orders if o['status'] in ['pending', 'confirmed', 'preparing']])
        
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
        user = User.get_by_id(payload['user_id'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        baker = Baker.get_by_user_id(user['id'])
        if not baker:
            return jsonify({'error': 'Baker profile not found'}), 404
        
        products = Product.get_by_baker_id(baker['id'])
        
        return jsonify({
            'products': [{
                'id': p['id'],
                'name': p['name'],
                'category': p['category'],
                'price': p['price'],
                'description': p['description'],
                'image_url': p.get('image_url', ''),
                'in_stock': p['in_stock'],
                'created_at': p['created_at']
            } for p in products]
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
        user = User.get_by_id(payload['user_id'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        baker = Baker.get_by_user_id(user['id'])
        if not baker:
            return jsonify({'error': 'Baker profile not found'}), 404
        
        # Get product and verify ownership
        product = Product.get_by_id(str(product_id))
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        if product['baker_id'] != baker['id']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        
        # Update product fields
        update_data = {}
        if 'name' in data:
            update_data['name'] = data['name']
        if 'category' in data:
            update_data['category'] = data['category']
        if 'price' in data:
            update_data['price'] = float(data['price'])
        if 'description' in data:
            update_data['description'] = data['description']
        if 'in_stock' in data:
            update_data['in_stock'] = data['in_stock']
        
        Product.update(str(product_id), **update_data)
        
        # Get updated product
        updated_product = Product.get_by_id(str(product_id))
        
        return jsonify({
            'message': 'Product updated successfully',
            'product': {
                'id': updated_product['id'],
                'name': updated_product['name'],
                'category': updated_product['category'],
                'price': updated_product['price'],
                'description': updated_product['description'],
                'image_url': updated_product.get('image_url', ''),
                'in_stock': updated_product['in_stock']
            }
        }), 200
        
    except Exception as e:
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
        user = User.get_by_id(payload['user_id'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        baker = Baker.get_by_user_id(user['id'])
        if not baker:
            return jsonify({'error': 'Baker profile not found'}), 404
        
        # Get product and verify ownership
        product = Product.get_by_id(str(product_id))
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        if product['baker_id'] != baker['id']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        Product.delete(str(product_id))
        
        return jsonify({'message': 'Product deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders/<int:order_id>/status', methods=['PUT'])
def update_order_status(order_id):
    """Update order status (Baker endpoint) - Sends SNS notification"""
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
        user = User.get_by_id(payload['user_id'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        baker = Baker.get_by_user_id(user['id'])
        if not baker:
            return jsonify({'error': 'Baker profile not found'}), 404
        
        order = Order.get_by_id(str(order_id))
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        
        data = request.get_json()
        
        if 'status' not in data:
            return jsonify({'error': 'Status is required'}), 400
        
        new_status = data['status']
        
        # Validate status
        valid_statuses = ['pending', 'confirmed', 'preparing', 'baking', 'ready', 'out_for_delivery', 'delivered', 'cancelled']
        if new_status not in valid_statuses:
            return jsonify({'error': f'Invalid status. Must be one of: {valid_statuses}'}), 400
        
        # Update order status
        Order.update(str(order_id), status=new_status)
        
        # Get updated order and customer info
        updated_order = Order.get_by_id(str(order_id))
        customer = User.get_by_id(order['user_id'])
        
        # Send status update via SNS
        if SNS_ENABLED and customer:
            try:
                sns_send_status_update(
                    order_id=updated_order['order_id'],
                    customer_email=customer['email'],
                    customer_name=customer['name'],
                    new_status=new_status,
                    baker_name=baker['shop_name']
                )
                print(f"📧 SNS status update sent to {customer['email']}: {new_status}")
            except Exception as e:
                print(f"Warning: Failed to send SNS status update: {e}")
        
        # If status is out_for_delivery, send delivery notification
        if SNS_ENABLED and new_status == 'out_for_delivery' and customer:
            try:
                delivery_address = json.loads(order['delivery_address'])
                sns_send_delivery(
                    order_id=updated_order['order_id'],
                    customer_email=customer['email'],
                    customer_name=customer['name'],
                    delivery_address=delivery_address,
                    estimated_time=data.get('estimated_delivery_time')
                )
                print(f"📧 SNS delivery notification sent to {customer['email']}")
            except Exception as e:
                print(f"Warning: Failed to send SNS delivery notification: {e}")
        
        return jsonify({
            'message': 'Order status updated successfully',
            'order': {
                'id': updated_order['id'],
                'order_id': updated_order['order_id'],
                'status': updated_order['status']
            }
        }), 200
        
    except Exception as e:
        print(f"Error updating order status: {str(e)}")
        import traceback
        traceback.print_exc()
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
        user = User.get_by_id(payload['user_id'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        baker = Baker.get_by_user_id(user['id'])
        if not baker:
            return jsonify({'error': 'Baker profile not found'}), 404
        
        # Get products
        products = Product.get_by_baker_id(baker['id'])
        product_ids = [p['id'] for p in products]
        
        # Get all order items for baker's products
        from dynamodb_database import order_items_table
        response = order_items_table.scan()
        all_order_items = response.get('Items', [])
        
        baker_order_items = [item for item in all_order_items if item['product_id'] in product_ids]
        order_ids = list(set([item['order_id'] for item in baker_order_items]))
        
        # Get orders
        orders = []
        for order_id in order_ids:
            order = Order.get_by_id(order_id)
            if order:
                orders.append(order)
        
        # Sort by created_at descending
        orders.sort(key=lambda x: x['created_at'], reverse=True)
        
        # Build response
        result = []
        for order in orders:
            # Get items for this order that belong to this baker
            baker_items = [item for item in OrderItem.get_by_order_id(order['id']) 
                          if item['product_id'] in product_ids]
            
            # Parse delivery address
            try:
                delivery_address = json.loads(order['delivery_address'])
            except:
                delivery_address = {}
            
            # Get customer info
            customer = User.get_by_id(order['user_id'])
            
            result.append({
                'id': order['id'],
                'order_id': order['order_id'],
                'customer_name': customer['name'] if customer else '',
                'customer_email': customer['email'] if customer else '',
                'customer_phone': delivery_address.get('phone', ''),
                'items': [{
                    'product_id': item['product_id'],
                    'product_name': item['product_name'],
                    'quantity': item['quantity'],
                    'price': item['price']
                } for item in baker_items],
                'total_amount': sum(float(item['price']) * item['quantity'] for item in baker_items),
                'status': order['status'],
                'payment_status': order['payment_status'],
                'delivery_address': delivery_address,
                'created_at': order['created_at']
            })
        
        return jsonify({'orders': result}), 200
        
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
        wishlist_items = Wishlist.get_by_user_id(payload['user_id'])
        
        result = []
        for item in wishlist_items:
            product = Product.get_by_id(item['product_id'])
            if product:
                baker = Baker.get_by_id(product['baker_id'])
                result.append({
                    'id': item['id'],
                    'product_id': item['product_id'],
                    'product': {
                        'id': product['id'],
                        'name': product['name'],
                        'category': product['category'],
                        'price': product['price'],
                        'description': product['description'],
                        'image_url': product.get('image_url', ''),
                        'in_stock': product['in_stock'],
                        'baker': {
                            'id': baker['id'],
                            'shop_name': baker['shop_name'],
                            'city': baker['city']
                        } if baker else None
                    },
                    'created_at': item['created_at']
                })
        
        return jsonify({'wishlist': result}), 200
        
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
        product = Product.get_by_id(str(product_id))
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        # Check if already in wishlist
        existing = Wishlist.get_by_user_and_product(payload['user_id'], str(product_id))
        
        if existing:
            return jsonify({'message': 'Product already in wishlist'}), 200
        
        # Add to wishlist
        wishlist_id = generate_id()
        wishlist_item = Wishlist.create(
            wishlist_id=wishlist_id,
            user_id=payload['user_id'],
            product_id=str(product_id)
        )
        
        return jsonify({
            'message': 'Product added to wishlist',
            'wishlist_item': {
                'id': wishlist_item['id'],
                'product_id': wishlist_item['product_id']
            }
        }), 201
        
    except Exception as e:
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
        wishlist_item = Wishlist.get_by_user_and_product(payload['user_id'], str(product_id))
        
        if not wishlist_item:
            return jsonify({'error': 'Product not in wishlist'}), 404
        
        Wishlist.delete(wishlist_item['id'])
        
        return jsonify({'message': 'Product removed from wishlist'}), 200
        
    except Exception as e:
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
        order = Order.get_by_id(str(order_id))
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        
        if order['user_id'] != payload['user_id']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['product_id', 'rating', 'comment']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        product_id = str(data['product_id'])
        rating = data['rating']
        comment = data['comment']
        
        # Validate rating
        if not isinstance(rating, int) or rating < 1 or rating > 5:
            return jsonify({'error': 'Rating must be between 1 and 5'}), 400
        
        # Verify product exists and is in the order
        product = Product.get_by_id(product_id)
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        # Check if product is in this order
        order_items = OrderItem.get_by_order_id(order['id'])
        order_item = next((item for item in order_items if item['product_id'] == product_id), None)
        
        if not order_item:
            return jsonify({'error': 'Product not found in this order'}), 400
        
        # Check if review already exists
        existing_review = Review.get_by_user_and_product(payload['user_id'], product_id)
        
        if existing_review:
            # Update existing review
            Review.update(
                existing_review['id'],
                rating=rating,
                comment=comment,
                created_at=Review.get_timestamp()
            )
            
            updated_review = Review.get_by_user_and_product(payload['user_id'], product_id)
            
            return jsonify({
                'message': 'Review updated successfully',
                'review': {
                    'id': updated_review['id'],
                    'rating': updated_review['rating'],
                    'comment': updated_review['comment']
                }
            }), 200
        else:
            # Create new review
            review_id = generate_id()
            review = Review.create(
                review_id=review_id,
                user_id=payload['user_id'],
                product_id=product_id,
                baker_id=product['baker_id'],
                rating=rating,
                comment=comment
            )
            
            return jsonify({
                'message': 'Review submitted successfully',
                'review': {
                    'id': review['id'],
                    'rating': review['rating'],
                    'comment': review['comment']
                }
            }), 201
        
    except Exception as e:
        print(f"Error submitting review: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/products/<int:product_id>/reviews', methods=['GET'])
def get_product_reviews(product_id):
    """Get all reviews for a product"""
    try:
        product = Product.get_by_id(str(product_id))
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        reviews = Review.get_by_product_id(str(product_id))
        
        # Sort by created_at descending
        reviews.sort(key=lambda x: x['created_at'], reverse=True)
        
        result = []
        for review in reviews:
            user = User.get_by_id(review['user_id'])
            result.append({
                'id': review['id'],
                'user_name': user['name'] if user else 'Unknown',
                'rating': review['rating'],
                'comment': review['comment'],
                'baker_reply': review.get('baker_reply', ''),
                'created_at': review['created_at'],
                'reply_at': review.get('reply_at', '')
            })
        
        return jsonify({'reviews': result}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Register Baker Analytics Blueprint - DynamoDB VERSION
try:
    from baker_analytics_dynamodb import baker_analytics_bp
    app.register_blueprint(baker_analytics_bp, url_prefix='/api')
    print("Baker Analytics Blueprint (DynamoDB) registered successfully")
except Exception as e:
    print(f"Error registering Baker Analytics Blueprint: {e}")

# Register Baker Orders Blueprint - DynamoDB VERSION
try:
    from baker_orders_dynamodb import baker_orders_bp
    app.register_blueprint(baker_orders_bp, url_prefix='/api')
    print("Baker Orders Blueprint (DynamoDB) registered successfully")
except Exception as e:
    print(f"Error registering Baker Orders Blueprint: {e}")

# Register Customer Profile Blueprint - DynamoDB VERSION
try:
    from customer_profile_dynamodb import customer_profile_bp
    app.register_blueprint(customer_profile_bp, url_prefix='/api')
    print("Customer Profile Blueprint (DynamoDB) registered successfully")
except Exception as e:
    print(f"Error registering Customer Profile Blueprint: {e}")

# Register Notifications Blueprint - DynamoDB VERSION
try:
    from notifications_dynamodb import notifications_bp
    app.register_blueprint(notifications_bp, url_prefix='/api')
    print("Notifications Blueprint (DynamoDB) registered successfully")
except Exception as e:
    print(f"Error registering Notifications Blueprint: {e}")

# Register Baker Reviews Blueprint - DynamoDB VERSION
try:
    from baker_reviews_dynamodb import baker_reviews_bp
    app.register_blueprint(baker_reviews_bp, url_prefix='/api')
    print("Baker Reviews Blueprint (DynamoDB) registered successfully")
except Exception as e:
    print(f"Error registering Baker Reviews Blueprint: {e}")

# Register Admin Routes Blueprint - DynamoDB VERSION
try:
    from admin_routes_dynamodb import admin_bp
    app.register_blueprint(admin_bp)
    print("Admin Routes Blueprint (DynamoDB) registered successfully")
except Exception as e:
    print(f"Error registering Admin Routes Blueprint: {e}")

if __name__ == '__main__':
    # For AWS deployment, use a production server like Gunicorn
    # This is just for local testing
    app.run(debug=False, host='0.0.0.0', port=5000)
