import { useState } from "react";
import { Wheat, ChevronRight, ChevronLeft, Store, ShoppingBag, Package, TrendingUp, Heart } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";

interface OnboardingSlide {
  title: string;
  description: string;
  image: string;
  icon: React.ReactNode;
  highlights?: string[];
}

const slides: OnboardingSlide[] = [
  {
    title: "Welcome to Local Crust",
    description: "An innovative platform connecting artisan bakers with customers who value quality, authenticity, and freshness. Join a community that celebrates handmade bakery products.",
    image: "https://images.unsplash.com/photo-1659525413607-4cdebb78a999?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb3VyZG91Z2glMjBicmVhZCUyMGZsb3VyfGVufDF8fHx8MTc2ODY1NDQxMHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    icon: <Heart className="w-12 h-12 text-[#D35400]" />,
    highlights: ["Fresh, handmade products", "Support local artisans", "Quality you can taste"]
  },
  {
    title: "For Artisan Bakers",
    description: "Transform your craft into a thriving business. Local Crust provides you with a digital storefront to showcase your products, manage inventory effortlessly, and connect with customers who appreciate your artistry.",
    image: "https://images.unsplash.com/photo-1561216997-d7c8e45eda37?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYWtlciUyMGhhbmRzJTIwZG91Z2h8ZW58MXx8fHwxNzY4NjU0NzM3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    icon: <Store className="w-12 h-12 text-[#D35400]" />,
    highlights: ["Digital storefront", "Real-time order tracking", "Inventory management"]
  },
  {
    title: "Powerful Baker Tools",
    description: "Manage your bakery with ease using our intuitive dashboard. Track sales, monitor inventory levels, receive instant order notifications, and analyze your business growth—all in one place.",
    image: "https://images.unsplash.com/photo-1665782670932-7fc408a0b655?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYWtlcnklMjBkaXNwbGF5JTIwZnJlc2h8ZW58MXx8fHwxNzY4NjU0NzM3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    icon: <TrendingUp className="w-12 h-12 text-[#D35400]" />,
    highlights: ["Analytics dashboard", "Order management", "Stock alerts"]
  },
  {
    title: "For Customers",
    description: "Discover a world of authentic, fresh-baked goods from talented local bakers. Browse beautiful product displays, read detailed descriptions, and order with just a few clicks. Experience the taste of true craftsmanship.",
    image: "https://images.unsplash.com/photo-1767814984711-57d1901d22ee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcnRpc2FuJTIwYmFrZXIlMjBzaG9wfGVufDF8fHx8MTc2ODY1NDczOHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    icon: <ShoppingBag className="w-12 h-12 text-[#D35400]" />,
    highlights: ["Rich browsing experience", "Easy ordering", "Fresh daily deliveries"]
  }
];

interface OnboardingViewProps {
  onComplete: () => void;
}

export function OnboardingView({ onComplete }: OnboardingViewProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const slide = slides[currentSlide];

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FDFBF7] via-[#f5f0e8] to-[#FDFBF7] -z-10" />
      <div className="absolute top-20 left-20 w-64 h-64 bg-[#D35400]/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#829460]/5 rounded-full blur-3xl -z-10" />

      <div className="w-full max-w-6xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Wheat className="w-10 h-10 text-[#D35400]" />
          <h1 className="text-4xl text-[#4E342E]">Local Crust</h1>
        </div>

        {/* Main Content Card */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-3xl overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Image Section */}
            <div className="relative h-[400px] md:h-[600px] overflow-hidden">
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover transition-all duration-700 ease-out"
                key={currentSlide}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              
              {/* Icon Badge */}
              <div className="absolute bottom-8 left-8 p-4 bg-white rounded-2xl shadow-xl">
                {slide.icon}
              </div>
            </div>

            {/* Content Section */}
            <div className="p-8 md:p-12 flex flex-col justify-between">
              <div>
                <h2 className="text-4xl md:text-5xl text-[#4E342E] mb-6">
                  {slide.title}
                </h2>
                
                <p className="text-lg text-[#4E342E]/70 leading-relaxed mb-8">
                  {slide.description}
                </p>

                {/* Highlights */}
                {slide.highlights && (
                  <div className="space-y-3 mb-8">
                    {slide.highlights.map((highlight, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-[#D35400] rounded-full" />
                        <span className="text-[#4E342E]/80">{highlight}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Progress Dots */}
              <div className="mb-8">
                <div className="flex items-center justify-center gap-2">
                  {slides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlide(idx)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        idx === currentSlide
                          ? 'w-8 bg-[#D35400]'
                          : 'w-2 bg-[#4E342E]/20 hover:bg-[#4E342E]/40'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between gap-4">
                <Button
                  onClick={handleSkip}
                  variant="ghost"
                  className="text-[#4E342E]/60 hover:text-[#4E342E] hover:bg-transparent"
                >
                  Skip
                </Button>

                <div className="flex items-center gap-3">
                  {currentSlide > 0 && (
                    <Button
                      onClick={handlePrev}
                      variant="outline"
                      className="border-[#4E342E]/20 text-[#4E342E] hover:bg-[#4E342E]/5 rounded-xl px-6"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Back
                    </Button>
                  )}
                  
                  <Button
                    onClick={handleNext}
                    className="bg-[#D35400] hover:bg-[#D35400]/90 text-white rounded-xl px-8"
                  >
                    {currentSlide === slides.length - 1 ? (
                      "Get Started"
                    ) : (
                      <>
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Footer Text */}
        <p className="text-center text-[#4E342E]/50 mt-6">
          Supporting local artisans, one loaf at a time
        </p>
      </div>
    </div>
  );
}
