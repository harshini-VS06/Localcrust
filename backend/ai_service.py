"""
Gemini AI service for recipe suggestions and recommendations
"""
import google.generativeai as genai
import os
from dotenv import load_dotenv
import json

load_dotenv()

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-pro')
else:
    model = None
    print("⚠️  Gemini API key not configured")

def get_recipe_suggestions(cart_items: list) -> dict:
    """
    Get recipe suggestions based on cart items
    
    Args:
        cart_items: List of product names in cart
        
    Returns:
        dict with recipes and suggestions
    """
    if not model:
        return {
            'recipes': [],
            'message': 'AI service not configured. Please add GEMINI_API_KEY to .env file.'
        }
    
    try:
        products_text = ", ".join(cart_items)
        prompt = f"""
        Based on these bakery items that a customer has in their cart: {products_text}
        
        Please suggest 3 creative and delicious recipes or meal ideas that would pair well with these items.
        
        For each recipe, provide:
        1. Recipe name
        2. Brief description (1-2 sentences)
        3. Why it pairs well with the cart items
        4. Difficulty level (Easy/Medium/Hard)
        5. Preparation time
        
        Format the response as a JSON array with these fields:
        [
            {{
                "name": "Recipe Name",
                "description": "Brief description",
                "pairing_reason": "Why it pairs well",
                "difficulty": "Easy",
                "prep_time": "30 minutes",
                "ingredients_needed": ["ingredient1", "ingredient2"],
                "serving_suggestion": "How to serve"
            }}
        ]
        
        Keep it practical and family-friendly. Focus on recipes that highlight fresh bread and baked goods.
        Return ONLY the JSON array, no other text.
        """
        
        response = model.generate_content(prompt)
        
        text = response.text.strip()
        
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]
        text = text.strip()
        
        recipes = json.loads(text)
        
        return {
            'recipes': recipes,
            'message': 'Here are some delicious recipes based on your cart!'
        }
        
    except Exception as e:
        print(f"❌ Gemini API error: {e}")
        return {
            'recipes': get_fallback_recipes(cart_items),
            'message': 'Here are some recipe suggestions for you!'
        }

def get_fallback_recipes(cart_items: list) -> list:
    """
    Fallback recipes when AI is not available
    """
    return [
        {
            "name": "Classic French Toast",
            "description": "Transform fresh bread into a delicious breakfast treat with eggs, milk, and cinnamon.",
            "pairing_reason": "Perfect way to use artisan bread for a gourmet breakfast experience.",
            "difficulty": "Easy",
            "prep_time": "15 minutes",
            "ingredients_needed": ["Eggs", "Milk", "Cinnamon", "Butter", "Maple syrup"],
            "serving_suggestion": "Serve warm with fresh berries and maple syrup"
        },
        {
            "name": "Artisan Bread Pudding",
            "description": "A comforting dessert made with cubed bread, custard, and your choice of fruits or chocolate.",
            "pairing_reason": "Excellent use of bread to create an elegant dessert.",
            "difficulty": "Medium",
            "prep_time": "45 minutes",
            "ingredients_needed": ["Bread cubes", "Eggs", "Cream", "Sugar", "Vanilla", "Raisins"],
            "serving_suggestion": "Serve warm with vanilla ice cream or whipped cream"
        },
        {
            "name": "Gourmet Sandwich Platter",
            "description": "Create an impressive array of sandwiches using fresh bread with various gourmet fillings.",
            "pairing_reason": "Showcases the quality of artisan bread with simple, delicious ingredients.",
            "difficulty": "Easy",
            "prep_time": "20 minutes",
            "ingredients_needed": ["Assorted deli meats", "Cheeses", "Fresh vegetables", "Spreads", "Herbs"],
            "serving_suggestion": "Cut into halves and arrange on a wooden board"
        }
    ]

def get_product_recommendations(user_preferences: list, available_products: list) -> list:
    """
    Get personalized product recommendations
    
    Args:
        user_preferences: List of previously ordered items
        available_products: List of available products
        
    Returns:
        List of recommended product names
    """
    if not model or not user_preferences:
        return available_products[:3] if len(available_products) >= 3 else available_products
    
    try:
        preferences_text = ", ".join(user_preferences)
        products_text = ", ".join(available_products)
        
        prompt = f"""
        A customer has previously enjoyed these bakery items: {preferences_text}
        
        From this available product list: {products_text}
        
        Recommend 5 products they would most likely enjoy based on their preferences.
        Consider flavor profiles, product types, and complementary items.
        
        Return ONLY a JSON array of product names from the available list:
        ["Product Name 1", "Product Name 2", "Product Name 3", "Product Name 4", "Product Name 5"]
        
        Return ONLY the JSON array, no other text.
        """
        
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]
        text = text.strip()
        
        recommendations = json.loads(text)
        return recommendations[:5]
        
    except Exception as e:
        print(f"❌ Recommendation error: {e}")
        return available_products[:5]

def generate_recipe_from_scratch(ingredients: list, dietary_preference: str = "none") -> dict:
    """
    Generate a complete recipe from ingredients
    """
    if not model:
        return None
    
    try:
        ingredients_text = ", ".join(ingredients)
        
        prompt = f"""
        Create a delicious recipe using these bakery items and common ingredients: {ingredients_text}
        Dietary preference: {dietary_preference}
        
        Provide:
        1. Recipe name
        2. Full ingredient list with measurements
        3. Step-by-step instructions
        4. Cooking time and servings
        5. Nutritional highlights
        
        Format as JSON:
        {{
            "name": "Recipe Name",
            "servings": 4,
            "prep_time": "15 min",
            "cook_time": "30 min",
            "ingredients": [{{"item": "ingredient", "amount": "measurement"}}],
            "instructions": ["Step 1", "Step 2"],
            "nutritional_info": "Brief nutritional highlights",
            "tips": ["Tip 1", "Tip 2"]
        }}
        
        Return ONLY the JSON, no other text.
        """
        
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]
        text = text.strip()
        
        recipe = json.loads(text)
        return recipe
        
    except Exception as e:
        print(f"❌ Recipe generation error: {e}")
        return None
