"""
DynamoDB Database configuration and models for AWS deployment
"""
import boto3
from boto3.dynamodb.conditions import Key, Attr
from datetime import datetime
import os
import json
from decimal import Decimal

dynamodb = boto3.resource('dynamodb', region_name=os.getenv('AWS_REGION', 'us-east-1'))

USERS_TABLE = os.getenv('USERS_TABLE', 'Users')
BAKERS_TABLE = os.getenv('BAKERS_TABLE', 'Bakers')
PRODUCTS_TABLE = os.getenv('PRODUCTS_TABLE', 'Products')
ORDERS_TABLE = os.getenv('ORDERS_TABLE', 'Orders')
ORDER_ITEMS_TABLE = os.getenv('ORDER_ITEMS_TABLE', 'OrderItems')
REVIEWS_TABLE = os.getenv('REVIEWS_TABLE', 'Reviews')
WISHLIST_TABLE = os.getenv('WISHLIST_TABLE', 'Wishlist')
LOYALTY_POINTS_TABLE = os.getenv('LOYALTY_POINTS_TABLE', 'LoyaltyPoints')
BADGES_TABLE = os.getenv('BADGES_TABLE', 'Badges')
NOTIFICATIONS_TABLE = os.getenv('NOTIFICATIONS_TABLE', 'Notifications')
ADMINS_TABLE = os.getenv('ADMINS_TABLE', 'Admins')

users_table = dynamodb.Table(USERS_TABLE)
bakers_table = dynamodb.Table(BAKERS_TABLE)
products_table = dynamodb.Table(PRODUCTS_TABLE)
orders_table = dynamodb.Table(ORDERS_TABLE)
order_items_table = dynamodb.Table(ORDER_ITEMS_TABLE)
reviews_table = dynamodb.Table(REVIEWS_TABLE)
wishlist_table = dynamodb.Table(WISHLIST_TABLE)
loyalty_points_table = dynamodb.Table(LOYALTY_POINTS_TABLE)
badges_table = dynamodb.Table(BADGES_TABLE)
notifications_table = dynamodb.Table(NOTIFICATIONS_TABLE)
admins_table = dynamodb.Table(ADMINS_TABLE)

def float_to_decimal(obj):
    """Convert float values to Decimal for DynamoDB"""
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, dict):
        return {k: float_to_decimal(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [float_to_decimal(item) for item in obj]
    return obj

def decimal_to_float(obj):
    """Convert Decimal values to float for JSON serialization"""
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        return {k: decimal_to_float(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [decimal_to_float(item) for item in obj]
    return obj

class DynamoDBModel:
    """Base class for DynamoDB models"""
    
    @staticmethod
    def get_timestamp():
        """Get current timestamp in ISO format"""
        return datetime.utcnow().isoformat()

class User(DynamoDBModel):
    @staticmethod
    def create(user_id, name, email, password_hash, user_type, saved_address=None):
        """Create a new user"""
        item = {
            'id': str(user_id),
            'name': name,
            'email': email,
            'password_hash': password_hash,
            'user_type': user_type,
            'saved_address': saved_address,
            'created_at': User.get_timestamp()
        }
        users_table.put_item(Item=item)
        return item
    
    @staticmethod
    def get_by_id(user_id):
        """Get user by ID"""
        response = users_table.get_item(Key={'id': str(user_id)})
        return response.get('Item')
    
    @staticmethod
    def get_by_email(email):
        """Get user by email"""
        response = users_table.scan(
            FilterExpression=Attr('email').eq(email)
        )
        items = response.get('Items', [])
        return items[0] if items else None
    
    @staticmethod
    def update(user_id, **kwargs):
        """Update user attributes"""
        update_expression = "SET " + ", ".join([f"#{k} = :{k}" for k in kwargs.keys()])
        expression_attribute_names = {f"#{k}": k for k in kwargs.keys()}
        expression_attribute_values = {f":{k}": v for k, v in kwargs.items()}
        
        users_table.update_item(
            Key={'id': str(user_id)},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values
        )

class Bakers(DynamoDBModel):
    @staticmethod
    def create(baker_id, user_id, shop_name, owner_name, phone, business_license, tax_id,
               shop_address, city, state, zip_code, shop_description, license_document='', verified=False):
        """Create a new baker profile"""
        item = {
            'id': str(baker_id),
            'user_id': str(user_id),
            'shop_name': shop_name,
            'owner_name': owner_name,
            'phone': phone,
            'business_license': business_license,
            'tax_id': tax_id,
            'shop_address': shop_address,
            'city': city,
            'state': state,
            'zip_code': zip_code,
            'license_document': license_document,
            'shop_description': shop_description,
            'verified': verified,
            'created_at': Baker.get_timestamp()
        }
        bakers_table.put_item(Item=item)
        return item
    
    @staticmethod
    def get_by_id(baker_id):
        """Get baker by ID"""
        response = bakers_table.get_item(Key={'id': str(baker_id)})
        return response.get('Item')
    
    @staticmethod
    def get_by_user_id(user_id):
        """Get baker profile by user ID"""
        response = bakers_table.query(
            IndexName='user_id-index',
            KeyConditionExpression=Key('user_id').eq(str(user_id))
        )
        items = response.get('Items', [])
        return items[0] if items else None
    
    @staticmethod
    def get_all_verified():
        """Get all verified bakers"""
        response = bakers_table.scan(
            FilterExpression=Attr('verified').eq(True)
        )
        return response.get('Items', [])
    
    @staticmethod
    def update(baker_id, **kwargs):
        """Update baker attributes"""
        update_expression = "SET " + ", ".join([f"#{k} = :{k}" for k in kwargs.keys()])
        expression_attribute_names = {f"#{k}": k for k in kwargs.keys()}
        expression_attribute_values = {f":{k}": v for k, v in kwargs.items()}
        
        bakers_table.update_item(
            Key={'id': str(baker_id)},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values
        )

class Products(DynamoDBModel):
    @staticmethod
    def create(product_id, baker_id, name, category, price, description='', image_url='', in_stock=True):
        """Create a new product"""
        item = float_to_decimal({
            'id': str(product_id),
            'baker_id': str(baker_id),
            'name': name,
            'category': category,
            'price': price,
            'description': description,
            'image_url': image_url,
            'in_stock': in_stock,
            'created_at': Product.get_timestamp()
        })
        products_table.put_item(Item=item)
        return decimal_to_float(item)
    
    @staticmethod
    def get_by_id(product_id):
        """Get product by ID"""
        response = products_table.get_item(Key={'id': str(product_id)})
        item = response.get('Item')
        return decimal_to_float(item) if item else None
    
    @staticmethod
    def get_by_baker_id(baker_id):
        """Get all products by baker ID"""
        response = products_table.query(
            IndexName='baker_id-index',
            KeyConditionExpression=Key('baker_id').eq(str(baker_id))
        )
        return decimal_to_float(response.get('Items', []))
    
    @staticmethod
    def get_all_in_stock():
        """Get all in-stock products"""
        response = products_table.scan(
            FilterExpression=Attr('in_stock').eq(True)
        )
        return decimal_to_float(response.get('Items', []))
    
    @staticmethod
    def update(product_id, **kwargs):
        """Update product attributes"""
        kwargs = float_to_decimal(kwargs)
        update_expression = "SET " + ", ".join([f"#{k} = :{k}" for k in kwargs.keys()])
        expression_attribute_names = {f"#{k}": k for k in kwargs.keys()}
        expression_attribute_values = {f":{k}": v for k, v in kwargs.items()}
        
        products_table.update_item(
            Key={'id': str(product_id)},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values
        )
    
    @staticmethod
    def delete(product_id):
        """Delete a product"""
        products_table.delete_item(Key={'id': str(product_id)})

class Orders(DynamoDBModel):
    @staticmethod
    def create(order_db_id, order_id, user_id, total_amount, delivery_address, 
               status='pending', payment_status='pending', payment_id=''):
        """Create a new order"""
        item = float_to_decimal({
            'id': str(order_db_id),
            'order_id': order_id,
            'user_id': str(user_id),
            'total_amount': total_amount,
            'status': status,
            'payment_status': payment_status,
            'payment_id': payment_id,
            'delivery_address': delivery_address,
            'created_at': Order.get_timestamp(),
            'updated_at': Order.get_timestamp()
        })
        orders_table.put_item(Item=item)
        return decimal_to_float(item)
    
    @staticmethod
    def get_by_id(order_db_id):
        """Get order by database ID"""
        response = orders_table.get_item(Key={'id': str(order_db_id)})
        item = response.get('Item')
        return decimal_to_float(item) if item else None
    
    @staticmethod
    def get_by_user_id(user_id):
        """Get all orders by user ID"""
        response = orders_table.query(
            IndexName='user_id-index',
            KeyConditionExpression=Key('user_id').eq(str(user_id))
        )
        return decimal_to_float(response.get('Items', []))
    
    @staticmethod
    def update(order_db_id, **kwargs):
        """Update order attributes"""
        kwargs = float_to_decimal(kwargs)
        kwargs['updated_at'] = Order.get_timestamp()
        
        update_expression = "SET " + ", ".join([f"#{k} = :{k}" for k in kwargs.keys()])
        expression_attribute_names = {f"#{k}": k for k in kwargs.keys()}
        expression_attribute_values = {f":{k}": v for k, v in kwargs.items()}
        
        orders_table.update_item(
            Key={'id': str(order_db_id)},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values
        )

class OrderItems(DynamoDBModel):
    @staticmethod
    def create(item_id, order_db_id, product_id, product_name, baker_name, quantity, price):
        """Create a new order item"""
        item = float_to_decimal({
            'id': str(item_id),
            'order_id': str(order_db_id),
            'product_id': str(product_id),
            'product_name': product_name,
            'baker_name': baker_name,
            'quantity': quantity,
            'price': price
        })
        order_items_table.put_item(Item=item)
        return decimal_to_float(item)
    
    @staticmethod
    def get_by_order_id(order_db_id):
        """Get all items for an order"""
        response = order_items_table.query(
            IndexName='order_id-index',
            KeyConditionExpression=Key('order_id').eq(str(order_db_id))
        )
        return decimal_to_float(response.get('Items', []))

class Reviews(DynamoDBModel):
    @staticmethod
    def create(review_id, user_id, product_id, baker_id, rating, comment, baker_reply='', reply_at=''):
        """Create a new review"""
        item = {
            'id': str(review_id),
            'user_id': str(user_id),
            'product_id': str(product_id),
            'baker_id': str(baker_id),
            'rating': rating,
            'comment': comment,
            'baker_reply': baker_reply,
            'reply_at': reply_at,
            'created_at': Review.get_timestamp()
        }
        reviews_table.put_item(Item=item)
        return item
    
    @staticmethod
    def get_by_product_id(product_id):
        """Get all reviews for a product"""
        response = reviews_table.query(
            IndexName='product_id-index',
            KeyConditionExpression=Key('product_id').eq(str(product_id))
        )
        return response.get('Items', [])
    
    @staticmethod
    def get_by_user_and_product(user_id, product_id):
        """Get review by user and product"""
        response = reviews_table.scan(
            FilterExpression=Attr('user_id').eq(str(user_id)) & Attr('product_id').eq(str(product_id))
        )
        items = response.get('Items', [])
        return items[0] if items else None
    
    @staticmethod
    def update(review_id, **kwargs):
        """Update review attributes"""
        update_expression = "SET " + ", ".join([f"#{k} = :{k}" for k in kwargs.keys()])
        expression_attribute_names = {f"#{k}": k for k in kwargs.keys()}
        expression_attribute_values = {f":{k}": v for k, v in kwargs.items()}
        
        reviews_table.update_item(
            Key={'id': str(review_id)},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values
        )

class Wishlist(DynamoDBModel):
    @staticmethod
    def create(wishlist_id, user_id, product_id):
        """Create a new wishlist item"""
        item = {
            'id': str(wishlist_id),
            'user_id': str(user_id),
            'product_id': str(product_id),
            'created_at': Wishlist.get_timestamp()
        }
        wishlist_table.put_item(Item=item)
        return item
    
    @staticmethod
    def get_by_user_id(user_id):
        """Get all wishlist items for a user"""
        response = wishlist_table.query(
            IndexName='user_id-index',
            KeyConditionExpression=Key('user_id').eq(str(user_id))
        )
        return response.get('Items', [])
    
    @staticmethod
    def get_by_user_and_product(user_id, product_id):
        """Check if product is in user's wishlist"""
        response = wishlist_table.scan(
            FilterExpression=Attr('user_id').eq(str(user_id)) & Attr('product_id').eq(str(product_id))
        )
        items = response.get('Items', [])
        return items[0] if items else None
    
    @staticmethod
    def delete(wishlist_id):
        """Delete a wishlist item"""
        wishlist_table.delete_item(Key={'id': str(wishlist_id)})

class Notifications(DynamoDBModel):
    @staticmethod
    def create(notification_id, user_id, title, message, notification_type='info', 
               read=False, related_review_id=''):
        """Create a new notification"""
        item = {
            'id': str(notification_id),
            'user_id': str(user_id),
            'title': title,
            'message': message,
            'type': notification_type,
            'read': read,
            'related_review_id': str(related_review_id) if related_review_id else '',
            'created_at': Notification.get_timestamp()
        }
        notifications_table.put_item(Item=item)
        return item
    
    @staticmethod
    def get_by_user_id(user_id, limit=50):
        """Get notifications for a user"""
        response = notifications_table.query(
            IndexName='user_id-index',
            KeyConditionExpression=Key('user_id').eq(str(user_id)),
            Limit=limit,
            ScanIndexForward=False  
        )
        return response.get('Items', [])
    
    @staticmethod
    def update(notification_id, **kwargs):
        """Update notification attributes"""
        update_expression = "SET " + ", ".join([f"#{k} = :{k}" for k in kwargs.keys()])
        expression_attribute_names = {f"#{k}": k for k in kwargs.keys()}
        expression_attribute_values = {f":{k}": v for k, v in kwargs.items()}
        
        notifications_table.update_item(
            Key={'id': str(notification_id)},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values
        )

class Admins(DynamoDBModel):
    @staticmethod
    def create(admin_id, username, email, password_hash, full_name, role='admin', is_active=True):
        """Create a new admin"""
        item = {
            'id': str(admin_id),
            'username': username,
            'email': email,
            'password_hash': password_hash,
            'full_name': full_name,
            'role': role,
            'is_active': is_active,
            'created_at': Admin.get_timestamp(),
            'last_login': ''
        }
        admins_table.put_item(Item=item)
        return item
    
    @staticmethod
    def get_by_username(username):
        """Get admin by username"""
        response = admins_table.scan(
            FilterExpression=Attr('username').eq(username)
        )
        items = response.get('Items', [])
        return items[0] if items else None
    
    @staticmethod
    def update(admin_id, **kwargs):
        """Update admin attributes"""
        update_expression = "SET " + ", ".join([f"#{k} = :{k}" for k in kwargs.keys()])
        expression_attribute_names = {f"#{k}": k for k in kwargs.keys()}
        expression_attribute_values = {f":{k}": v for k, v in kwargs.items()}
        
        admins_table.update_item(
            Key={'id': str(admin_id)},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values
        )

def generate_id():
    """Generate a unique ID using timestamp and random component"""
    import time
    import random
    timestamp = int(time.time() * 1000)
    random_part = random.randint(1000, 9999)
    return f"{timestamp}{random_part}"
