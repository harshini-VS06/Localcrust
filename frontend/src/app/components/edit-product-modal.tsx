import { useState } from "react";
import { X, Edit } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { bakerAPI, type Product } from "@/api/baker";

interface EditProductModalProps {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}

const categories = ["Bread", "Pastries", "Cakes", "Cookies", "Specialty Items"];

export function EditProductModal({ product, onClose, onSuccess }: EditProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: product.name,
    category: product.category,
    price: product.price.toString(),
    description: product.description || "",
    in_stock: product.in_stock,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await bakerAPI.updateProduct(product.id, {
        name: formData.name,
        category: formData.category,
        price: parseFloat(formData.price),
        description: formData.description,
        in_stock: formData.in_stock,
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to update product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 bg-white/80 rounded-full p-2 hover:bg-[#FFF9F5] transition-colors z-10"
          >
            <X className="w-6 h-6 text-[#4E342E]" />
          </button>

          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-500 rounded-xl">
                <Edit className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl text-[#4E342E]">Edit Product</h2>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#4E342E] mb-2">
                  Product Name <span className="text-[#D35400]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-[#4E342E]/20 rounded-xl focus:border-[#D35400] outline-none"
                  placeholder="e.g., Sourdough Bread"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4E342E] mb-2">
                  Category <span className="text-[#D35400]">*</span>
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-[#4E342E]/20 rounded-xl focus:border-[#D35400] outline-none bg-white"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4E342E] mb-2">
                  Price (USD) <span className="text-[#D35400]">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#4E342E]/70">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full pl-8 pr-4 py-3 border-2 border-[#4E342E]/20 rounded-xl focus:border-[#D35400] outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4E342E] mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-[#4E342E]/20 rounded-xl focus:border-[#D35400] outline-none resize-none"
                  placeholder="Describe your product..."
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="in_stock"
                  checked={formData.in_stock}
                  onChange={(e) => setFormData({ ...formData, in_stock: e.target.checked })}
                  className="w-5 h-5 text-[#2E7D32] border-2 border-[#4E342E]/20 rounded focus:ring-[#2E7D32]"
                />
                <label htmlFor="in_stock" className="text-sm font-medium text-[#4E342E]">
                  Product is in stock
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-white hover:bg-[#FFF9F5] text-[#4E342E] border-2 border-[#4E342E]/20 rounded-xl py-6 text-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-6 text-lg"
                >
                  {loading ? "Updating..." : "Update Product"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
