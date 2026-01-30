import { useState } from "react";
import { ChefHat, Store, FileCheck, Package, ArrowRight, ArrowLeft, Upload, Plus, X } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { bakerAPI, type Product } from "@/api/auth";

interface FloatingInputProps {
  id: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}

function FloatingInput({ id, type, placeholder, value, onChange, required = false }: FloatingInputProps) {
  return (
    <div className="relative mb-6">
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-0 py-3 bg-transparent border-0 border-b-2 border-[#4E342E]/20 focus:border-[#D35400] outline-none transition-colors peer"
        placeholder=" "
      />
      <label
        htmlFor={id}
        className="absolute left-0 -top-3.5 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-sm peer-focus:text-[#D35400]"
      >
        {placeholder} {required && <span className="text-[#D35400]">*</span>}
      </label>
    </div>
  );
}

interface FloatingTextareaProps {
  id: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  required?: boolean;
}

function FloatingTextarea({ id, placeholder, value, onChange, required = false }: FloatingTextareaProps) {
  return (
    <div className="relative mb-6">
      <textarea
        id={id}
        value={value}
        onChange={onChange}
        required={required}
        rows={3}
        className="w-full px-0 py-3 bg-transparent border-0 border-b-2 border-[#4E342E]/20 focus:border-[#D35400] outline-none transition-colors peer resize-none"
        placeholder=" "
      />
      <label
        htmlFor={id}
        className="absolute left-0 -top-3.5 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-sm peer-focus:text-[#D35400]"
      >
        {placeholder} {required && <span className="text-[#D35400]">*</span>}
      </label>
    </div>
  );
}

interface BakerRegistrationProps {
  onComplete: () => void;
  onBack: () => void;
}

export function BakerRegistration({ onComplete, onBack }: BakerRegistrationProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Step 1: Basic Information
  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  
  // Step 2: Business Verification
  const [businessLicense, setBusinessLicense] = useState("");
  const [taxId, setTaxId] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [licenseDocument, setLicenseDocument] = useState<string>("");
  
  // Step 3: Product Catalogue
  const [shopDescription, setShopDescription] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [newProductName, setNewProductName] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("Bread");
  const [newProductPrice, setNewProductPrice] = useState("");

  const categories = ["Bread", "Pastries", "Cakes", "Cookies", "Specialty Items"];

  const addProduct = () => {
    if (newProductName && newProductPrice) {
      const newProduct: Product = {
        name: newProductName,
        category: newProductCategory,
        price: newProductPrice
      };
      setProducts([...products, newProduct]);
      setNewProductName("");
      setNewProductPrice("");
    }
  };

  const removeProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete registration - submit to API
      setLoading(true);

      try {
        await bakerAPI.register({
          // Step 1
          shop_name: shopName,
          owner_name: ownerName,
          email,
          phone,
          password,
          
          // Step 2
          business_license: businessLicense,
          tax_id: taxId,
          shop_address: shopAddress,
          city,
          state,
          zip_code: zipCode,
          license_document: licenseDocument,
          
          // Step 3
          shop_description: shopDescription,
          products: products,
        });

        onComplete();
      } catch (err: any) {
        setError(err.message || "Registration failed");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    setError("");
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack();
    }
  };

  const getStepIcon = (step: number) => {
    switch(step) {
      case 1: return <Store className="w-5 h-5" />;
      case 2: return <FileCheck className="w-5 h-5" />;
      case 3: return <Package className="w-5 h-5" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-[#FFF9F5] via-[#FFF5ED] to-[#FDFBF7]">
      <div className="w-full max-w-4xl">
        <Card className="bg-white shadow-xl rounded-2xl">
          <CardContent className="p-8 md:p-12">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-gradient-to-br from-[#FFE5D9] to-[#FFD4C1] rounded-xl">
                <ChefHat className="w-8 h-8 text-[#D35400]" />
              </div>
              <div>
                <h1 className="text-3xl text-[#4E342E]">Artisan Baker Registration</h1>
                <p className="text-sm text-[#4E342E]/60">Join our community of local bakers</p>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="mb-10">
              <div className="flex items-center justify-between">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                          currentStep >= step
                            ? 'bg-[#D35400] border-[#D35400] text-white'
                            : 'bg-white border-[#4E342E]/20 text-[#4E342E]/40'
                        }`}
                      >
                        {getStepIcon(step)}
                      </div>
                      <p className={`text-sm mt-2 ${currentStep >= step ? 'text-[#4E342E]' : 'text-[#4E342E]/40'}`}>
                        {step === 1 && 'Basic Info'}
                        {step === 2 && 'Verification'}
                        {step === 3 && 'Products'}
                      </p>
                    </div>
                    {step < 3 && (
                      <div
                        className={`flex-1 h-1 mx-2 transition-all ${
                          currentStep > step ? 'bg-[#D35400]' : 'bg-[#4E342E]/10'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleNext}>
              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-2xl text-[#4E342E] mb-6">Shop & Owner Information</h3>
                  
                  <FloatingInput
                    id="shopName"
                    type="text"
                    placeholder="Bakery/Shop Name"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    required
                  />
                  
                  <FloatingInput
                    id="ownerName"
                    type="text"
                    placeholder="Owner Full Name"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    required
                  />
                  
                  <FloatingInput
                    id="email"
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  
                  <FloatingInput
                    id="phone"
                    type="tel"
                    placeholder="Phone Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                  
                  <FloatingInput
                    id="password"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* Step 2: Business Verification */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-2xl text-[#4E342E] mb-6">Business Verification</h3>
                  
                  <div className="bg-[#FFF9F5] p-4 rounded-xl border-2 border-[#D35400]/20 mb-6">
                    <p className="text-sm text-[#4E342E]/70">
                      <strong className="text-[#D35400]">Note:</strong> Please provide your official business registration details. 
                      This helps us verify the legitimacy of your bakery and ensures trust within our community.
                    </p>
                  </div>
                  
                  <FloatingInput
                    id="businessLicense"
                    type="text"
                    placeholder="Business License Number"
                    value={businessLicense}
                    onChange={(e) => setBusinessLicense(e.target.value)}
                    required
                  />
                  
                  <FloatingInput
                    id="taxId"
                    type="text"
                    placeholder="Tax ID / EIN Number"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    required
                  />
                  
                  <FloatingInput
                    id="shopAddress"
                    type="text"
                    placeholder="Shop Address (Street)"
                    value={shopAddress}
                    onChange={(e) => setShopAddress(e.target.value)}
                    required
                  />
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <FloatingInput
                      id="city"
                      type="text"
                      placeholder="City"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                    />
                    
                    <FloatingInput
                      id="state"
                      type="text"
                      placeholder="State"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      required
                    />
                    
                    <FloatingInput
                      id="zipCode"
                      type="text"
                      placeholder="ZIP Code"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="mt-6">
                    <label className="block text-sm text-[#4E342E]/70 mb-2">
                      Upload Business License Document <span className="text-[#D35400]">*</span>
                    </label>
                    <div className="border-2 border-dashed border-[#4E342E]/20 rounded-xl p-8 text-center hover:border-[#D35400] transition-colors cursor-pointer">
                      <Upload className="w-10 h-10 text-[#4E342E]/40 mx-auto mb-3" />
                      <p className="text-sm text-[#4E342E]/60">
                        {licenseDocument || "Click to upload or drag and drop"}
                      </p>
                      <p className="text-xs text-[#4E342E]/40 mt-1">PDF, JPG, or PNG (max 5MB)</p>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setLicenseDocument(e.target.files?.[0]?.name || "")}
                        className="hidden"
                        id="licenseUpload"
                      />
                      <label htmlFor="licenseUpload" className="cursor-pointer" />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Product Catalogue */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-2xl text-[#4E342E] mb-6">Product Catalogue Setup</h3>
                  
                  <FloatingTextarea
                    id="shopDescription"
                    placeholder="Describe your bakery and what makes it special"
                    value={shopDescription}
                    onChange={(e) => setShopDescription(e.target.value)}
                    required
                  />
                  
                  <div className="bg-[#FFF9F5] p-6 rounded-xl border-2 border-[#D35400]/20">
                    <h4 className="text-lg text-[#4E342E] mb-4 flex items-center gap-2">
                      <Package className="w-5 h-5 text-[#D35400]" />
                      Add Your Products
                    </h4>
                    
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <input
                        type="text"
                        placeholder="Product Name"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        className="px-4 py-3 border-2 border-[#4E342E]/20 rounded-xl focus:border-[#D35400] outline-none"
                      />
                      
                      <select
                        value={newProductCategory}
                        onChange={(e) => setNewProductCategory(e.target.value)}
                        className="px-4 py-3 border-2 border-[#4E342E]/20 rounded-xl focus:border-[#D35400] outline-none bg-white"
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Price"
                          value={newProductPrice}
                          onChange={(e) => setNewProductPrice(e.target.value)}
                          className="flex-1 px-4 py-3 border-2 border-[#4E342E]/20 rounded-xl focus:border-[#D35400] outline-none"
                        />
                        <Button
                          type="button"
                          onClick={addProduct}
                          className="bg-[#829460] hover:bg-[#829460]/90 text-white px-4 rounded-xl"
                        >
                          <Plus className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Product List */}
                    {products.length > 0 && (
                      <div className="mt-6 space-y-2">
                        <h5 className="text-sm text-[#4E342E]/70 mb-3">Your Products ({products.length})</h5>
                        {products.map((product, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-white p-4 rounded-xl border border-[#4E342E]/10"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-[#4E342E]">{product.name}</p>
                              <p className="text-sm text-[#4E342E]/60">{product.category}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <p className="text-[#D35400] font-medium">${product.price}</p>
                              <button
                                type="button"
                                onClick={() => removeProduct(index)}
                                className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {products.length === 0 && (
                    <p className="text-sm text-[#4E342E]/60 text-center py-4">
                      Add at least one product to continue
                    </p>
                  )}
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-4 mt-8">
                <Button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="flex-1 bg-white hover:bg-[#FFF9F5] text-[#4E342E] border-2 border-[#4E342E]/20 py-6 rounded-xl"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back
                </Button>
                
                <Button
                  type="submit"
                  disabled={(currentStep === 3 && products.length === 0) || loading}
                  className="flex-1 bg-[#D35400] hover:bg-[#D35400]/90 text-white py-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : (currentStep === 3 ? 'Complete Registration' : 'Next Step')}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
