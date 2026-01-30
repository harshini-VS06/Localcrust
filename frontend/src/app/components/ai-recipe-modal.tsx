import { useState } from "react";
import { X, Sparkles, Loader2, ChefHat, Clock, Users } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";

interface AIRecipeModalProps {
  cartItems: string[];
  onClose: () => void;
}

interface Recipe {
  name: string;
  description: string;
  prepTime: string;
  servings: string;
  ingredients: string[];
  instructions: string[];
}

export function AIRecipeModal({ cartItems, onClose }: AIRecipeModalProps) {
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generateRecipes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate AI recipe generation
      // In a real implementation, this would call your backend API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const sampleRecipes: Recipe[] = [
        {
          name: "Artisan Bread Pudding",
          description: "A delicious dessert made with your fresh bakery items",
          prepTime: "45 minutes",
          servings: "6-8 people",
          ingredients: [
            "4 cups cubed bread (from your cart)",
            "2 cups milk",
            "4 eggs",
            "3/4 cup sugar",
            "1 tsp vanilla extract",
            "1/2 tsp cinnamon",
            "Optional: raisins or chocolate chips"
          ],
          instructions: [
            "Preheat oven to 350°F (175°C)",
            "Cube the bread and place in a greased baking dish",
            "Whisk together milk, eggs, sugar, vanilla, and cinnamon",
            "Pour mixture over bread and let soak for 15 minutes",
            "Bake for 45 minutes until golden and set",
            "Serve warm with cream or ice cream"
          ]
        },
        {
          name: "French Toast Casserole",
          description: "Perfect for breakfast or brunch using your bakery bread",
          prepTime: "30 minutes (+ overnight refrigeration)",
          servings: "8-10 people",
          ingredients: [
            "1 loaf bread, sliced (from your cart)",
            "8 eggs",
            "2 cups milk",
            "1/2 cup cream",
            "1/2 cup sugar",
            "2 tsp vanilla",
            "1 tsp cinnamon",
            "Butter for greasing"
          ],
          instructions: [
            "Grease a 9x13 baking dish with butter",
            "Arrange bread slices in the dish, overlapping slightly",
            "Whisk together eggs, milk, cream, sugar, vanilla, and cinnamon",
            "Pour mixture over bread, pressing down to ensure absorption",
            "Cover and refrigerate overnight",
            "Bake at 350°F for 45-50 minutes until golden",
            "Serve with maple syrup and fresh berries"
          ]
        },
        {
          name: "Bakery Bread Croutons",
          description: "Transform your bread into delicious crunchy toppings",
          prepTime: "20 minutes",
          servings: "4 cups",
          ingredients: [
            "4 cups cubed bread (from your cart)",
            "1/4 cup olive oil",
            "2 cloves garlic, minced",
            "1 tsp dried herbs (Italian seasoning)",
            "Salt and pepper to taste",
            "Optional: grated Parmesan"
          ],
          instructions: [
            "Preheat oven to 375°F (190°C)",
            "Cut bread into 1-inch cubes",
            "Mix olive oil, garlic, herbs, salt, and pepper",
            "Toss bread cubes with the oil mixture",
            "Spread on a baking sheet in a single layer",
            "Bake for 15-20 minutes, stirring halfway, until golden",
            "Let cool and store in an airtight container"
          ]
        }
      ];
      
      setRecipes(sampleRecipes);
    } catch (err) {
      setError("Failed to generate recipes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl">
        <div className="bg-gradient-to-r from-[#D35400] to-[#E67E22] p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                <Sparkles className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">AI Recipe Suggestions</h2>
                <p className="text-white/90">Powered by your cart items</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <h3 className="font-medium mb-2">Your Cart Items:</h3>
            <div className="flex flex-wrap gap-2">
              {cartItems.map((item, index) => (
                <span
                  key={index}
                  className="bg-white/30 backdrop-blur-sm px-3 py-1 rounded-full text-sm"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {!loading && recipes.length === 0 && (
            <div className="text-center py-12">
              <ChefHat className="w-16 h-16 text-[#D35400] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Ready to Get Recipe Ideas?
              </h3>
              <p className="text-gray-600 mb-6">
                Click the button below to generate personalized recipes based on your cart items!
              </p>
              <Button
                onClick={generateRecipes}
                className="bg-gradient-to-r from-[#D35400] to-[#E67E22] hover:from-[#D35400]/90 hover:to-[#E67E22]/90 text-white px-8 py-6 rounded-xl text-lg font-bold"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Recipes
              </Button>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-[#D35400] animate-spin mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Creating Recipe Ideas...
              </h3>
              <p className="text-gray-600">
                Our AI is crafting delicious recipes just for you!
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-red-600">{error}</p>
              <Button
                onClick={generateRecipes}
                className="mt-4 bg-red-500 hover:bg-red-600 text-white"
              >
                Try Again
              </Button>
            </div>
          )}

          {recipes.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-800">
                  Your Personalized Recipes
                </h3>
                <Button
                  onClick={generateRecipes}
                  variant="outline"
                  className="border-[#D35400] text-[#D35400] hover:bg-[#FFF9F5]"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
              </div>

              {recipes.map((recipe, index) => (
                <Card
                  key={index}
                  className="border-2 border-[#D35400]/20 hover:border-[#D35400]/40 transition-all hover:shadow-lg"
                >
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <h4 className="text-xl font-bold text-gray-800 mb-2">
                        {recipe.name}
                      </h4>
                      <p className="text-gray-600 mb-4">{recipe.description}</p>
                      
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{recipe.prepTime}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>{recipe.servings}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h5 className="font-semibold text-gray-800 mb-3">
                          Ingredients:
                        </h5>
                        <ul className="space-y-2">
                          {recipe.ingredients.map((ingredient, i) => (
                            <li key={i} className="text-gray-600 flex items-start gap-2">
                              <span className="text-[#D35400] mt-1">•</span>
                              <span>{ingredient}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h5 className="font-semibold text-gray-800 mb-3">
                          Instructions:
                        </h5>
                        <ol className="space-y-2">
                          {recipe.instructions.map((instruction, i) => (
                            <li key={i} className="text-gray-600 flex items-start gap-3">
                              <span className="font-bold text-[#D35400] flex-shrink-0">
                                {i + 1}.
                              </span>
                              <span>{instruction}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="bg-[#FFF9F5] rounded-xl p-4 text-center">
                <p className="text-gray-600">
                  💡 <strong>Tip:</strong> These recipes are AI-generated suggestions. 
                  Feel free to adjust ingredients and measurements to your taste!
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
