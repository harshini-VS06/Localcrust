"""
Baker Analytics and Enhanced Features - DynamoDB Version
Adds analytics, reviews, inventory management, and more for baker dashboard
"""

from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, timedelta
import jwt
from dynamodb_database import (
    User, Baker, Product, Order, OrderItem, Review, 
    order_items_table, orders_table, products_table
)

baker_analytics_bp = Blueprint('baker_analytics', __name__)

def verify_token(token):
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def verify_baker_token(request):
    """Helper function to verify baker authentication"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload or payload.get('user_type') != 'baker':
        return None
    
    # Get baker profile
    user = User.get_by_id(payload['user_id'])
    if not user:
        return None
    
    baker = Baker.get_by_user_id(user['id'])
    if not baker:
        return None
    
    return baker

# Currency configuration
CURRENCY_SYMBOL = '₹'  # Indian Rupee
CURRENCY_CODE = 'INR'

@baker_analytics_bp.route('/baker/analytics/revenue-trends', methods=['GET'])
def get_revenue_trends():
    """Get revenue trends over time"""
    try:
        baker = verify_baker_token(request)
        if not baker:
            return jsonify({'error': 'Unauthorized'}), 401
        
        # Get date range (last 6 months by default)
        months = int(request.args.get('months', 6))
        
        # Calculate start date
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=30 * months)
        
        # Get products for this baker
        products = Product.get_by_baker_id(baker['id'])
        product_ids = [p['id'] for p in products]
        
        # Get all order items for baker's products
        response = order_items_table.scan()
        all_order_items = response.get('Items', [])
        baker_order_items = [item for item in all_order_items if item['product_id'] in product_ids]
        
        # Get unique order IDs
        order_ids = list(set([item['order_id'] for item in baker_order_items]))
        
        # Get completed orders
        orders = []
        for order_id in order_ids:
            order = Order.get_by_id(order_id)
            if order and order['payment_status'] == 'completed':
                order_date = datetime.fromisoformat(order['created_at'])
                if order_date >= start_date:
                    orders.append(order)
        
        # Group by month
        monthly_data = {}
        for order in orders:
            order_date = datetime.fromisoformat(order['created_at'])
            month_key = order_date.strftime('%Y-%m')
            
            if month_key not in monthly_data:
                monthly_data[month_key] = {'revenue': 0, 'orders': 0}
            
            monthly_data[month_key]['revenue'] += float(order['total_amount'])
            monthly_data[month_key]['orders'] += 1
        
        # Format data
        revenue_data = []
        for month_key in sorted(monthly_data.keys()):
            month_date = datetime.strptime(month_key, '%Y-%m')
            revenue_data.append({
                'month': month_date.strftime('%b %Y'),
                'revenue': monthly_data[month_key]['revenue'],
                'orders': monthly_data[month_key]['orders']
            })
        
        return jsonify({
            'revenue_trends': revenue_data,
            'currency': CURRENCY_CODE,
            'currency_symbol': CURRENCY_SYMBOL
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@baker_analytics_bp.route('/baker/analytics/top-products', methods=['GET'])
def get_top_products():
    """Get top selling products"""
    try:
        baker = verify_baker_token(request)
        if not baker:
            return jsonify({'error': 'Unauthorized'}), 401
        
        limit = int(request.args.get('limit', 10))
        
        # Get products for this baker
        products = Product.get_by_baker_id(baker['id'])
        product_ids = [p['id'] for p in products]
        
        # Get all order items
        response = order_items_table.scan()
        all_order_items = response.get('Items', [])
        
        # Calculate sales per product
        product_sales = {}
        for item in all_order_items:
            if item['product_id'] in product_ids:
                # Get order to check if completed
                order = Order.get_by_id(item['order_id'])
                if order and order['payment_status'] == 'completed':
                    product_id = item['product_id']
                    if product_id not in product_sales:
                        product = Product.get_by_id(product_id)
                        product_sales[product_id] = {
                            'id': product_id,
                            'name': product['name'],
                            'category': product['category'],
                            'price': product['price'],
                            'total_sales': 0,
                            'total_revenue': 0,
                            'order_count': 0
                        }
                    
                    quantity = item['quantity']
                    price = float(item['price'])
                    
                    product_sales[product_id]['total_sales'] += quantity
                    product_sales[product_id]['total_revenue'] += price * quantity
                    product_sales[product_id]['order_count'] += 1
        
        # Sort by revenue and limit
        top_products = sorted(
            product_sales.values(),
            key=lambda x: x['total_revenue'],
            reverse=True
        )[:limit]
        
        return jsonify({
            'top_products': top_products,
            'currency': CURRENCY_CODE,
            'currency_symbol': CURRENCY_SYMBOL
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@baker_analytics_bp.route('/baker/analytics/peak-hours', methods=['GET'])
def get_peak_hours():
    """Get peak ordering hours"""
    try:
        baker = verify_baker_token(request)
        if not baker:
            return jsonify({'error': 'Unauthorized'}), 401
        
        # Get products for this baker
        products = Product.get_by_baker_id(baker['id'])
        product_ids = [p['id'] for p in products]
        
        # Get all order items
        response = order_items_table.scan()
        all_order_items = response.get('Items', [])
        baker_order_items = [item for item in all_order_items if item['product_id'] in product_ids]
        
        # Get unique order IDs
        order_ids = list(set([item['order_id'] for item in baker_order_items]))
        
        # Count orders by hour
        hour_counts = {}
        for order_id in order_ids:
            order = Order.get_by_id(order_id)
            if order and order['payment_status'] == 'completed':
                order_date = datetime.fromisoformat(order['created_at'])
                hour = order_date.hour
                hour_counts[hour] = hour_counts.get(hour, 0) + 1
        
        # Format data
        peak_hours_data = []
        for hour in range(24):
            if hour in hour_counts:
                period = 'AM' if hour < 12 else 'PM'
                display_hour = hour if hour <= 12 else hour - 12
                if display_hour == 0:
                    display_hour = 12
                
                peak_hours_data.append({
                    'hour': f'{display_hour} {period}',
                    'order_count': hour_counts[hour]
                })
        
        return jsonify({
            'peak_hours': peak_hours_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@baker_analytics_bp.route('/baker/analytics/category-distribution', methods=['GET'])
def get_category_distribution():
    """Get sales distribution by category"""
    try:
        baker = verify_baker_token(request)
        if not baker:
            return jsonify({'error': 'Unauthorized'}), 401
        
        # Get products for this baker
        products = Product.get_by_baker_id(baker['id'])
        product_ids = [p['id'] for p in products]
        
        # Get all order items
        response = order_items_table.scan()
        all_order_items = response.get('Items', [])
        
        # Calculate sales by category
        category_sales = {}
        for item in all_order_items:
            if item['product_id'] in product_ids:
                # Get order to check if completed
                order = Order.get_by_id(item['order_id'])
                if order and order['payment_status'] == 'completed':
                    product = Product.get_by_id(item['product_id'])
                    category = product['category']
                    
                    if category not in category_sales:
                        category_sales[category] = {
                            'total_sales': 0,
                            'total_revenue': 0
                        }
                    
                    quantity = item['quantity']
                    price = float(item['price'])
                    
                    category_sales[category]['total_sales'] += quantity
                    category_sales[category]['total_revenue'] += price * quantity
        
        # Format data
        category_data = []
        colors = ['#D35400', '#E67E22', '#F39C12', '#F1C40F', '#52B788', '#8E24AA']
        
        for idx, (category, data) in enumerate(category_sales.items()):
            category_data.append({
                'name': category,
                'value': data['total_revenue'],
                'sales': data['total_sales'],
                'color': colors[idx % len(colors)]
            })
        
        return jsonify({
            'category_distribution': category_data,
            'currency': CURRENCY_CODE,
            'currency_symbol': CURRENCY_SYMBOL
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@baker_analytics_bp.route('/baker/analytics/customer-insights', methods=['GET'])
def get_customer_insights():
    """Get customer analytics"""
    try:
        baker = verify_baker_token(request)
        if not baker:
            return jsonify({'error': 'Unauthorized'}), 401
        
        # Get products for this baker
        products = Product.get_by_baker_id(baker['id'])
        product_ids = [p['id'] for p in products]
        
        # Get all order items
        response = order_items_table.scan()
        all_order_items = response.get('Items', [])
        baker_order_items = [item for item in all_order_items if item['product_id'] in product_ids]
        
        # Get unique order IDs
        order_ids = list(set([item['order_id'] for item in baker_order_items]))
        
        # Get completed orders
        user_orders = {}  # user_id -> list of orders
        total_revenue = 0
        
        for order_id in order_ids:
            order = Order.get_by_id(order_id)
            if order and order['payment_status'] == 'completed':
                user_id = order['user_id']
                if user_id not in user_orders:
                    user_orders[user_id] = []
                user_orders[user_id].append(order)
                total_revenue += float(order['total_amount'])
        
        # Calculate stats
        total_customers = len(user_orders)
        repeat_customers = len([uid for uid, orders in user_orders.items() if len(orders) > 1])
        avg_order_value = total_revenue / sum(len(orders) for orders in user_orders.values()) if user_orders else 0
        
        # Get top customers
        top_customers_data = []
        for user_id, orders in sorted(user_orders.items(), key=lambda x: sum(float(o['total_amount']) for o in x[1]), reverse=True)[:5]:
            user = User.get_by_id(user_id)
            if user:
                top_customers_data.append({
                    'name': user['name'],
                    'email': user['email'],
                    'order_count': len(orders),
                    'total_spent': sum(float(o['total_amount']) for o in orders)
                })
        
        return jsonify({
            'customer_insights': {
                'total_customers': total_customers,
                'repeat_customers': repeat_customers,
                'avg_order_value': avg_order_value,
                'repeat_rate': round((repeat_customers / total_customers * 100) if total_customers > 0 else 0, 1),
                'top_customers': top_customers_data
            },
            'currency': CURRENCY_CODE,
            'currency_symbol': CURRENCY_SYMBOL
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@baker_analytics_bp.route('/baker/inventory', methods=['GET'])
def get_inventory():
    """Get inventory status"""
    try:
        baker = verify_baker_token(request)
        if not baker:
            return jsonify({'error': 'Unauthorized'}), 401
        
        products = Product.get_by_baker_id(baker['id'])
        
        inventory_data = []
        for product in products:
            # Get sales in last 7 days
            week_ago = datetime.utcnow() - timedelta(days=7)
            
            # Get order items for this product
            response = order_items_table.scan(
                FilterExpression='product_id = :pid',
                ExpressionAttributeValues={':pid': product['id']}
            )
            items = response.get('Items', [])
            
            # Calculate weekly sales
            weekly_sales = 0
            for item in items:
                order = Order.get_by_id(item['order_id'])
                if order:
                    order_date = datetime.fromisoformat(order['created_at'])
                    if order_date >= week_ago and order['payment_status'] == 'completed':
                        weekly_sales += item['quantity']
            
            inventory_data.append({
                'id': product['id'],
                'name': product['name'],
                'category': product['category'],
                'price': product['price'],
                'in_stock': product['in_stock'],
                'weekly_sales': weekly_sales,
                'created_at': product['created_at']
            })
        
        return jsonify({
            'inventory': inventory_data,
            'total_products': len(inventory_data),
            'in_stock_count': sum(1 for p in inventory_data if p['in_stock']),
            'out_of_stock_count': sum(1 for p in inventory_data if not p['in_stock']),
            'currency': CURRENCY_CODE,
            'currency_symbol': CURRENCY_SYMBOL
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@baker_analytics_bp.route('/baker/order-history', methods=['GET'])
def get_order_history():
    """Get complete order history with filters"""
    try:
        baker = verify_baker_token(request)
        if not baker:
            return jsonify({'error': 'Unauthorized'}), 401
        
        # Get query parameters for filtering
        status = request.args.get('status')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Get products for this baker
        products = Product.get_by_baker_id(baker['id'])
        product_ids = [p['id'] for p in products]
        
        # Get all order items
        response = order_items_table.scan()
        all_order_items = response.get('Items', [])
        baker_order_items = [item for item in all_order_items if item['product_id'] in product_ids]
        
        # Get unique order IDs
        order_ids = list(set([item['order_id'] for item in baker_order_items]))
        
        # Get and filter orders
        orders = []
        for order_id in order_ids:
            order = Order.get_by_id(order_id)
            if not order:
                continue
            
            # Apply filters
            if status and order['status'] != status:
                continue
            
            order_date = datetime.fromisoformat(order['created_at'])
            
            if start_date:
                if order_date < datetime.fromisoformat(start_date):
                    continue
            
            if end_date:
                if order_date > datetime.fromisoformat(end_date):
                    continue
            
            orders.append(order)
        
        # Sort by created_at descending
        orders.sort(key=lambda x: x['created_at'], reverse=True)
        
        # Format orders
        orders_data = []
        for order in orders:
            user = User.get_by_id(order['user_id'])
            items = OrderItem.get_by_order_id(order['id'])
            baker_items = [item for item in items if item['product_id'] in product_ids]
            
            orders_data.append({
                'id': order['id'],
                'order_id': order['order_id'],
                'customer_name': user['name'] if user else 'Unknown',
                'customer_email': user['email'] if user else '',
                'items': [{
                    'product_name': item['product_name'],
                    'quantity': item['quantity'],
                    'price': item['price']
                } for item in baker_items],
                'total_amount': order['total_amount'],
                'status': order['status'],
                'payment_status': order['payment_status'],
                'created_at': order['created_at'],
                'time_ago': get_time_ago(datetime.fromisoformat(order['created_at']))
            })
        
        return jsonify({
            'orders': orders_data,
            'total_orders': len(orders_data),
            'currency': CURRENCY_CODE,
            'currency_symbol': CURRENCY_SYMBOL
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_time_ago(dt):
    """Convert datetime to 'time ago' format"""
    now = datetime.utcnow()
    diff = now - dt
    
    seconds = diff.total_seconds()
    
    if seconds < 60:
        return 'Just now'
    elif seconds < 3600:
        minutes = int(seconds / 60)
        return f'{minutes} minute{"s" if minutes != 1 else ""} ago'
    elif seconds < 86400:
        hours = int(seconds / 3600)
        return f'{hours} hour{"s" if hours != 1 else ""} ago'
    elif seconds < 604800:
        days = int(seconds / 86400)
        return f'{days} day{"s" if days != 1 else ""} ago'
    else:
        return dt.strftime('%b %d, %Y')
