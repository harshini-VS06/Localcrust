"""
Advanced features service including loyalty points, reviews, and analytics
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import random

class LoyaltyService:
    """Manage customer loyalty points and rewards"""
    
    POINTS_PER_DOLLAR = 10
    LEVELS = {
        'Bronze': 0,
        'Silver': 500,
        'Gold': 1500,
        'Platinum': 3000,
        'Diamond': 5000
    }
    
    @staticmethod
    def calculate_points(amount: float) -> int:
        """Calculate points earned from purchase"""
        return int(amount * LoyaltyService.POINTS_PER_DOLLAR)
    
    @staticmethod
    def get_level(total_points: int) -> str:
        """Get loyalty level based on points"""
        for level in reversed(list(LoyaltyService.LEVELS.keys())):
            if total_points >= LoyaltyService.LEVELS[level]:
                return level
        return 'Bronze'
    
    @staticmethod
    def get_next_level_info(total_points: int) -> Dict:
        """Get info about next loyalty level"""
        current_level = LoyaltyService.get_level(total_points)
        levels_list = list(LoyaltyService.LEVELS.keys())
        
        if current_level == 'Diamond':
            return {
                'current_level': current_level,
                'next_level': None,
                'points_needed': 0,
                'progress': 100
            }
        
        current_idx = levels_list.index(current_level)
        next_level = levels_list[current_idx + 1]
        next_level_points = LoyaltyService.LEVELS[next_level]
        
        points_needed = next_level_points - total_points
        current_level_points = LoyaltyService.LEVELS[current_level]
        progress = ((total_points - current_level_points) / 
                   (next_level_points - current_level_points) * 100)
        
        return {
            'current_level': current_level,
            'next_level': next_level,
            'points_needed': points_needed,
            'progress': int(progress)
        }

class BadgeService:
    """Manage achievement badges"""
    
    BADGES = {
        'first_order': {
            'name': 'First Order',
            'description': 'Completed your first order',
            'icon': '🎉',
            'points': 50
        },
        'early_bird': {
            'name': 'Early Bird',
            'description': 'Ordered before 8 AM',
            'icon': '🌅',
            'points': 25
        },
        'night_owl': {
            'name': 'Night Owl',
            'description': 'Ordered after 10 PM',
            'icon': '🦉',
            'points': 25
        },
        'sweet_tooth': {
            'name': 'Sweet Tooth',
            'description': 'Ordered 10+ pastries or cakes',
            'icon': '🍰',
            'points': 100
        },
        'bread_lover': {
            'name': 'Bread Lover',
            'description': 'Ordered 20+ bread items',
            'icon': '🍞',
            'points': 100
        },
        'loyal_customer': {
            'name': 'Loyal Customer',
            'description': 'Placed 10+ orders',
            'icon': '⭐',
            'points': 200
        },
        'big_spender': {
            'name': 'Big Spender',
            'description': 'Spent over $100 in total',
            'icon': '💎',
            'points': 150
        },
        'recipe_chef': {
            'name': 'Recipe Chef',
            'description': 'Tried 5 AI recipe suggestions',
            'icon': '👨‍🍳',
            'points': 75
        },
        'review_master': {
            'name': 'Review Master',
            'description': 'Left 10+ reviews',
            'icon': '📝',
            'points': 100
        },
        'community_supporter': {
            'name': 'Community Supporter',
            'description': 'Ordered from 5+ different bakers',
            'icon': '🤝',
            'points': 150
        }
    }
    
    @staticmethod
    def check_badge_eligibility(user_stats: Dict) -> List[str]:
        """Check which badges user has earned"""
        earned_badges = []
        
        # First order
        if user_stats.get('total_orders', 0) >= 1:
            earned_badges.append('first_order')
        
        # Loyal customer
        if user_stats.get('total_orders', 0) >= 10:
            earned_badges.append('loyal_customer')
        
        # Big spender
        if user_stats.get('total_spent', 0) >= 100:
            earned_badges.append('big_spender')
        
        # Category specific
        if user_stats.get('pastries_ordered', 0) >= 10:
            earned_badges.append('sweet_tooth')
        
        if user_stats.get('bread_ordered', 0) >= 20:
            earned_badges.append('bread_lover')
        
        # Reviews
        if user_stats.get('reviews_count', 0) >= 10:
            earned_badges.append('review_master')
        
        # Recipes
        if user_stats.get('recipes_tried', 0) >= 5:
            earned_badges.append('recipe_chef')
        
        # Bakers
        if user_stats.get('unique_bakers', 0) >= 5:
            earned_badges.append('community_supporter')
        
        return earned_badges

class AnalyticsService:
    """Generate analytics and insights"""
    
    @staticmethod
    def get_baker_insights(orders: List, products: List) -> Dict:
        """Generate insights for baker dashboard"""
        if not orders:
            return {
                'total_revenue': 0,
                'average_order_value': 0,
                'top_selling_products': [],
                'revenue_trend': [],
                'order_trend': [],
                'peak_hours': [],
                'customer_retention': 0
            }
        
        # Calculate metrics
        total_revenue = sum(o.total_amount for o in orders if o.payment_status == 'completed')
        avg_order = total_revenue / len(orders) if orders else 0
        
        # Top products
        product_sales = {}
        for order in orders:
            for item in order.items:
                if item.product_id not in product_sales:
                    product_sales[item.product_id] = {
                        'name': item.product_name,
                        'quantity': 0,
                        'revenue': 0
                    }
                product_sales[item.product_id]['quantity'] += item.quantity
                product_sales[item.product_id]['revenue'] += item.price * item.quantity
        
        top_products = sorted(
            product_sales.values(),
            key=lambda x: x['revenue'],
            reverse=True
        )[:5]
        
        # Revenue trend (last 7 days)
        revenue_by_day = {}
        for i in range(7):
            date = (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
            revenue_by_day[date] = 0
        
        for order in orders:
            if order.payment_status == 'completed':
                date = order.created_at.strftime('%Y-%m-%d')
                if date in revenue_by_day:
                    revenue_by_day[date] += order.total_amount
        
        revenue_trend = [
            {'date': date, 'revenue': revenue}
            for date, revenue in sorted(revenue_by_day.items())
        ]
    
        hour_counts = {}
        for order in orders:
            hour = order.created_at.hour
            hour_counts[hour] = hour_counts.get(hour, 0) + 1
        
        peak_hours = sorted(
            [{'hour': h, 'orders': c} for h, c in hour_counts.items()],
            key=lambda x: x['orders'],
            reverse=True
        )[:3]
        
        return {
            'total_revenue': round(total_revenue, 2),
            'average_order_value': round(avg_order, 2),
            'top_selling_products': top_products,
            'revenue_trend': revenue_trend,
            'peak_hours': peak_hours,
            'total_orders': len(orders),
            'completed_orders': len([o for o in orders if o.status == 'delivered'])
        }
    
    @staticmethod
    def get_customer_insights(orders: List) -> Dict:
        """Generate insights for customer"""
        if not orders:
            return {
                'total_spent': 0,
                'total_orders': 0,
                'favorite_category': 'None',
                'average_order': 0,
                'savings': 0
            }
        
        total_spent = sum(o.total_amount for o in orders if o.payment_status == 'completed')
        
        category_count = {}
        for order in orders:
            for item in order.items:
                # This would need category from product
                category = 'Bakery'  # Placeholder
                category_count[category] = category_count.get(category, 0) + item.quantity
        
        favorite = max(category_count.items(), key=lambda x: x[1])[0] if category_count else 'None'
        
        return {
            'total_spent': round(total_spent, 2),
            'total_orders': len(orders),
            'favorite_category': favorite,
            'average_order': round(total_spent / len(orders), 2) if orders else 0,
            'completed_orders': len([o for o in orders if o.status == 'delivered'])
        }

class NotificationService:
    """Manage notifications for users"""
    
    @staticmethod
    def create_notification(user_id: int, title: str, message: str, type: str = 'info') -> Dict:
        """Create a notification"""
        return {
            'id': random.randint(1000, 9999),
            'user_id': user_id,
            'title': title,
            'message': message,
            'type': type,  # info, success, warning, error
            'read': False,
            'created_at': datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def get_order_status_notification(order_id: str, status: str) -> Dict:
        """Generate notification for order status change"""
        messages = {
            'confirmed': {
                'title': 'Order Confirmed! 🎉',
                'message': f'Your order {order_id} has been confirmed and is being prepared.',
                'type': 'success'
            },
            'preparing': {
                'title': 'Preparing Your Order 👨‍🍳',
                'message': f'The baker is now preparing your order {order_id}.',
                'type': 'info'
            },
            'ready': {
                'title': 'Order Ready! ✅',
                'message': f'Your order {order_id} is ready for delivery.',
                'type': 'success'
            },
            'delivered': {
                'title': 'Order Delivered! 🎁',
                'message': f'Your order {order_id} has been delivered. Enjoy!',
                'type': 'success'
            }
        }
        
        return messages.get(status, {
            'title': 'Order Update',
            'message': f'Order {order_id} status: {status}',
            'type': 'info'
        })

class RecommendationEngine:
    """Advanced recommendation system"""
    
    @staticmethod
    def get_collaborative_recommendations(user_orders: List, all_orders: List, products: List) -> List:
        """Collaborative filtering recommendations"""
        
        user_products = set()
        for order in user_orders:
            for item in order.items:
                user_products.add(item.product_id)
        
        similar_user_products = set()
        for order in all_orders:
            order_products = set(item.product_id for item in order.items)
            
            if len(order_products & user_products) >= 2:
                similar_user_products.update(order_products)
        
        recommended_ids = similar_user_products - user_products
        
        return [p for p in products if p.id in recommended_ids][:5]
    
    @staticmethod
    def get_trending_products(orders: List, products: List, days: int = 7) -> List:
        """Get trending products"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        product_scores = {}
        for order in orders:
            if order.created_at >= cutoff_date:
                for item in order.items:
                    if item.product_id not in product_scores:
                        product_scores[item.product_id] = 0
                    product_scores[item.product_id] += item.quantity
        
        trending_ids = sorted(product_scores.keys(), key=lambda x: product_scores[x], reverse=True)[:5]
        
        return [p for p in products if p.id in trending_ids]
