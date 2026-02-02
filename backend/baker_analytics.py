"""
Baker Analytics and Enhanced Features
Adds analytics, reviews, inventory management, and more for baker dashboard
"""

from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, timedelta
from sqlalchemy import func, desc
from database import db, Baker, Product, Order, OrderItem, Review, User
import jwt

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
    
    user = User.query.get(payload['user_id'])
    if not user or not user.baker_profile:
        return None
    
    return user.baker_profile

CURRENCY_SYMBOL = '₹'  
CURRENCY_CODE = 'INR'

@baker_analytics_bp.route('/baker/analytics/revenue-trends', methods=['GET'])
def get_revenue_trends():
    """Get revenue trends over time"""
    try:
        baker = verify_baker_token(request)
        if not baker:
            return jsonify({'error': 'Unauthorized'}), 401
        
        months = int(request.args.get('months', 6))
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=30 * months)
        
        orders = db.session.query(
            func.strftime('%Y-%m', Order.created_at).label('month'),
            func.sum(OrderItem.price * OrderItem.quantity).label('revenue'),
            func.count(func.distinct(Order.id)).label('order_count')
        ).join(OrderItem).join(Product).filter(
            Product.baker_id == baker.id,
            Order.created_at >= start_date,
            Order.payment_status == 'completed'
        ).group_by('month').order_by('month').all()
        
        revenue_data = []
        for order in orders:
            month_date = datetime.strptime(order.month, '%Y-%m')
            revenue_data.append({
                'month': month_date.strftime('%b %Y'),
                'revenue': float(order.revenue or 0),
                'orders': order.order_count
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
        
        top_products = db.session.query(
            Product.id,
            Product.name,
            Product.category,
            Product.price,
            func.sum(OrderItem.quantity).label('total_sales'),
            func.sum(OrderItem.price * OrderItem.quantity).label('total_revenue'),
            func.count(func.distinct(Order.id)).label('order_count')
        ).join(OrderItem).join(Order).filter(
            Product.baker_id == baker.id,
            Order.payment_status == 'completed'
        ).group_by(Product.id).order_by(desc('total_revenue')).limit(limit).all()
        
        products_data = []
        for product in top_products:
            products_data.append({
                'id': product.id,
                'name': product.name,
                'category': product.category,
                'price': product.price,
                'total_sales': product.total_sales,
                'total_revenue': float(product.total_revenue),
                'order_count': product.order_count
            })
        
        return jsonify({
            'top_products': products_data,
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
        
        orders_by_hour = db.session.query(
            func.strftime('%H', Order.created_at).label('hour'),
            func.count(Order.id).label('order_count')
        ).join(OrderItem).join(Product).filter(
            Product.baker_id == baker.id,
            Order.payment_status == 'completed'
        ).group_by('hour').all()
        
        peak_hours_data = []
        for hour_data in orders_by_hour:
            hour = int(hour_data.hour)
            period = 'AM' if hour < 12 else 'PM'
            display_hour = hour if hour <= 12 else hour - 12
            if display_hour == 0:
                display_hour = 12
            
            peak_hours_data.append({
                'hour': f'{display_hour} {period}',
                'order_count': hour_data.order_count
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
        
        category_sales = db.session.query(
            Product.category,
            func.sum(OrderItem.quantity).label('total_sales'),
            func.sum(OrderItem.price * OrderItem.quantity).label('total_revenue')
        ).join(OrderItem).join(Order).filter(
            Product.baker_id == baker.id,
            Order.payment_status == 'completed'
        ).group_by(Product.category).all()
        
        category_data = []
        colors = ['#D35400', '#E67E22', '#F39C12', '#F1C40F', '#52B788', '#8E24AA']
        
        for idx, category in enumerate(category_sales):
            category_data.append({
                'name': category.category,
                'value': float(category.total_revenue),
                'sales': category.total_sales,
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
        
        total_customers = db.session.query(
            func.count(func.distinct(Order.user_id))
        ).join(OrderItem).join(Product).filter(
            Product.baker_id == baker.id,
            Order.payment_status == 'completed'
        ).scalar()
        
        repeat_customers = db.session.query(
            Order.user_id,
            func.count(Order.id).label('order_count')
        ).join(OrderItem).join(Product).filter(
            Product.baker_id == baker.id,
            Order.payment_status == 'completed'
        ).group_by(Order.user_id).having(func.count(Order.id) > 1).count()
        
        avg_order_value = db.session.query(
            func.avg(Order.total_amount)
        ).join(OrderItem).join(Product).filter(
            Product.baker_id == baker.id,
            Order.payment_status == 'completed'
        ).scalar() or 0
        
        top_customers = db.session.query(
            User.name,
            User.email,
            func.count(Order.id).label('order_count'),
            func.sum(Order.total_amount).label('total_spent')
        ).join(Order).join(OrderItem).join(Product).filter(
            Product.baker_id == baker.id,
            Order.payment_status == 'completed'
        ).group_by(User.id).order_by(desc('total_spent')).limit(5).all()
        
        top_customers_data = []
        for customer in top_customers:
            top_customers_data.append({
                'name': customer.name,
                'email': customer.email,
                'order_count': customer.order_count,
                'total_spent': float(customer.total_spent)
            })
        
        return jsonify({
            'customer_insights': {
                'total_customers': total_customers or 0,
                'repeat_customers': repeat_customers or 0,
                'avg_order_value': float(avg_order_value),
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
        
        products = Product.query.filter_by(baker_id=baker.id).all()
        
        inventory_data = []
        for product in products:
            week_ago = datetime.utcnow() - timedelta(days=7)
            weekly_sales = db.session.query(
                func.sum(OrderItem.quantity)
            ).join(Order).filter(
                OrderItem.product_id == product.id,
                Order.created_at >= week_ago,
                Order.payment_status == 'completed'
            ).scalar() or 0
            
            inventory_data.append({
                'id': product.id,
                'name': product.name,
                'category': product.category,
                'price': product.price,
                'in_stock': product.in_stock,
                'weekly_sales': weekly_sales,
                'created_at': product.created_at.isoformat()
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
        
        status = request.args.get('status')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = db.session.query(Order).join(OrderItem).join(Product).filter(
            Product.baker_id == baker.id
        )
        
        if status:
            query = query.filter(Order.status == status)
        
        if start_date:
            query = query.filter(Order.created_at >= datetime.fromisoformat(start_date))
        
        if end_date:
            query = query.filter(Order.created_at <= datetime.fromisoformat(end_date))
        
        orders = query.order_by(desc(Order.created_at)).all()
        
        unique_orders = {order.id: order for order in orders}
        orders = list(unique_orders.values())
        
        orders_data = []
        for order in orders:
            orders_data.append({
                'id': order.id,
                'order_id': order.order_id,
                'customer_name': order.user.name,
                'customer_email': order.user.email,
                'items': [{
                    'product_name': item.product_name,
                    'quantity': item.quantity,
                    'price': item.price
                } for item in order.items if item.product.baker_id == baker.id],
                'total_amount': order.total_amount,
                'status': order.status,
                'payment_status': order.payment_status,
                'created_at': order.created_at.isoformat(),
                'time_ago': get_time_ago(order.created_at)
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
