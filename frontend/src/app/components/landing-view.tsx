import { Wheat, Heart, Users, ShoppingBag, ChefHat, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";

interface LandingViewProps {
  onNavigateToLogin: () => void;
  onNavigateToAdmin?: () => void;
}

export function LandingView({ onNavigateToLogin, onNavigateToAdmin }: LandingViewProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF9F5] via-[#FFF5ED] to-[#FDFBF7]">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-[#D35400]/10 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl text-[#4E342E]">Local Crust</h1>
            </div>
            
            <div className="flex items-center gap-8">
              <a href="#home" className="text-[#4E342E] hover:text-[#D35400] transition-colors font-medium">
                Home
              </a>
              <a href="#about" className="text-[#4E342E] hover:text-[#D35400] transition-colors font-medium">
                About Us
              </a>
              <Button 
                onClick={onNavigateToLogin}
                className="bg-gradient-to-r from-[#D35400] to-[#E67E50] hover:from-[#C34000] hover:to-[#D35400] text-white rounded-xl px-6 py-2 shadow-lg shadow-[#D35400]/20"
              >
                Login
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative overflow-hidden py-20">
        {/* Decorative Background Elements */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-[#FFE5D9] rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#C8E6C9] rounded-full blur-3xl opacity-40" />
        
        <div className="container mx-auto px-6 relative">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full border border-[#D35400]/20 mb-6">
                <Sparkles className="w-4 h-4 text-[#D35400]" />
                <span className="text-sm text-[#4E342E]/80">Fresh Daily from Local Artisans</span>
              </div>
              
              <h2 className="text-6xl mb-6 text-[#4E342E] leading-tight">
                Your Daily Dose of
                <span className="block text-[#D35400]">Fresh Baked Joy</span>
              </h2>
              
              <p className="text-xl text-[#4E342E]/70 mb-8 leading-relaxed">
                Connect with talented local bakers and discover authentic, handcrafted bread and pastries made with love and the finest ingredients. Experience the taste of true artisan craftsmanship.
              </p>
              
              <div className="flex gap-4">
                <Button 
                  onClick={onNavigateToLogin}
                  className="bg-gradient-to-r from-[#D35400] to-[#E67E50] hover:from-[#C34000] hover:to-[#D35400] text-white rounded-xl px-8 py-6 text-lg shadow-xl shadow-[#D35400]/30"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button 
                  onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
                  className="bg-white hover:bg-[#FFF9F5] text-[#4E342E] border-2 border-[#D35400]/20 rounded-xl px-8 py-6 text-lg shadow-lg"
                >
                  Learn More
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute -top-6 -right-6 w-full h-full bg-gradient-to-br from-[#FFE5D9] to-[#FFD4C1] rounded-3xl opacity-20 blur-2xl" />
              <img 
                src="https://images.unsplash.com/photo-1571157577110-493b325fdd3d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVzaCUyMGNyb2lzc2FudCUyMHBhc3RyeXxlbnwxfHx8fDE3Njg2NTk3OTF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Fresh croissants"
                className="relative rounded-3xl shadow-2xl w-full h-[500px] object-cover border-4 border-white"
              />
              <div className="absolute -bottom-8 -left-8 bg-white p-6 rounded-2xl shadow-xl border-2 border-[#D35400]/10">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-[#C8E6C9] to-[#A5D6A7] rounded-xl">
                    <Heart className="w-6 h-6 text-[#2E7D32]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#4E342E]/60">Made with</p>
                    <p className="text-lg text-[#4E342E] font-medium">100% Love & Care</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h3 className="text-4xl text-[#4E342E] mb-4">Why Choose Local Crust?</h3>
            <p className="text-xl text-[#4E342E]/70">Experience the perfect blend of tradition and convenience</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-gradient-to-br from-white to-[#FFF9F5] hover:shadow-2xl transition-all duration-300 border-2 border-[#FFE5D9] rounded-2xl group">
              <CardContent className="p-8 text-center">
                <div className="inline-flex p-4 bg-gradient-to-br from-[#FFE5D9] to-[#FFD4C1] rounded-2xl mb-6 group-hover:scale-110 transition-transform">
                  <ShoppingBag className="w-10 h-10 text-[#D35400]" />
                </div>
                <h4 className="text-2xl text-[#4E342E] mb-4">Easy Ordering</h4>
                <p className="text-[#4E342E]/70 leading-relaxed">
                  Browse beautiful displays, select your favorites, and order with just a few clicks. Fresh bread delivered to your door.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white to-[#F1F8E9] hover:shadow-2xl transition-all duration-300 border-2 border-[#C8E6C9] rounded-2xl group">
              <CardContent className="p-8 text-center">
                <div className="inline-flex p-4 bg-gradient-to-br from-[#C8E6C9] to-[#A5D6A7] rounded-2xl mb-6 group-hover:scale-110 transition-transform">
                  <Users className="w-10 h-10 text-[#2E7D32]" />
                </div>
                <h4 className="text-2xl text-[#4E342E] mb-4">Support Local</h4>
                <p className="text-[#4E342E]/70 leading-relaxed">
                  Every purchase supports talented local bakers in your community. Help small businesses thrive while enjoying quality.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white to-[#FFF3E0] hover:shadow-2xl transition-all duration-300 border-2 border-[#FFE0B2] rounded-2xl group">
              <CardContent className="p-8 text-center">
                <div className="inline-flex p-4 bg-gradient-to-br from-[#FFE0B2] to-[#FFCC80] rounded-2xl mb-6 group-hover:scale-110 transition-transform">
                  <ChefHat className="w-10 h-10 text-[#E65100]" />
                </div>
                <h4 className="text-2xl text-[#4E342E] mb-4">Artisan Quality</h4>
                <p className="text-[#4E342E]/70 leading-relaxed">
                  Experience authentic craftsmanship. Every loaf, pastry, and treat is handmade with premium ingredients and expertise.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="py-20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#FFF9F5] via-[#FFF5ED] to-[#F1F8E9] -z-10" />
        
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1627308593341-d886acdc06a2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcnRpc2FuJTIwYnJlYWQlMjBiYWtlcnl8ZW58MXx8fHwxNzY4NjI5ODczfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Artisan bread bakery"
                className="rounded-3xl shadow-2xl w-full h-[450px] object-cover border-4 border-white"
              />
            </div>
            
            <div>
              <h3 className="text-5xl text-[#4E342E] mb-6">
                Our Story:
                <span className="block text-[#2E7D32]">Farm-to-Table Meets Modern</span>
              </h3>
              
              <p className="text-lg text-[#4E342E]/70 mb-6 leading-relaxed">
                Local Crust was born from a simple idea: to bridge the gap between passionate artisan bakers and customers who appreciate authentic, handcrafted baked goods.
              </p>
              
              <p className="text-lg text-[#4E342E]/70 mb-6 leading-relaxed">
                We believe in the power of community, the joy of fresh-baked bread, and the importance of supporting local businesses. Our platform makes it easy to discover and order from talented bakers in your neighborhood.
              </p>
              
              <div className="grid grid-cols-2 gap-6 mt-8">
                <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border-2 border-[#D35400]/10">
                  <p className="text-4xl text-[#D35400] mb-2">50+</p>
                  <p className="text-[#4E342E]/70">Local Bakers</p>
                </div>
                <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border-2 border-[#2E7D32]/10">
                  <p className="text-4xl text-[#2E7D32] mb-2">1000+</p>
                  <p className="text-[#4E342E]/70">Happy Customers</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#D35400] via-[#E67E50] to-[#D35400] -z-10" />
        <div className="absolute inset-0 bg-black/20 -z-10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-6 text-center relative">
          <h3 className="text-5xl text-white mb-6 drop-shadow-lg font-bold">Ready to Taste the Difference?</h3>
          <p className="text-xl text-white mb-8 max-w-2xl mx-auto drop-shadow-md font-medium">
            Join our community today and discover the finest artisan baked goods from local bakers who care about quality and tradition.
          </p>
          <Button 
            onClick={onNavigateToLogin}
            className="bg-white hover:bg-[#FFF9F5] text-[#D35400] rounded-xl px-10 py-6 text-lg shadow-2xl hover:scale-105 transition-transform font-bold"
          >
            Start Your Journey
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#4E342E] text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#D35400] rounded-xl">
                  <Wheat className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-2xl">Local Crust</h4>
              </div>
              <p className="text-white/70">
                Connecting artisan bakers with customers who value quality, authenticity, and freshness.
              </p>
            </div>
            
            <div>
              <h5 className="text-lg mb-4">Quick Links</h5>
              <ul className="space-y-2">
                <li><a href="#home" className="text-white/70 hover:text-white transition-colors">Home</a></li>
                <li><a href="#about" className="text-white/70 hover:text-white transition-colors">About Us</a></li>
                <li><button onClick={onNavigateToLogin} className="text-white/70 hover:text-white transition-colors">Login</button></li>
              </ul>
            </div>
            
            <div>
              <h5 className="text-lg mb-4">Contact</h5>
              <p className="text-white/70">support@localcrust.com</p>
              <p className="text-white/70">+1 (555) 123-4567</p>
            </div>
          </div>
          
          <div className="border-t border-white/20 mt-8 pt-8 text-center text-white/60">
            <p>© 2026 Local Crust. All rights reserved. Made with ❤️ for artisan bakers.</p>
            {onNavigateToAdmin && (
              <button 
                onClick={onNavigateToAdmin}
                className="mt-2 text-xs text-white/40 hover:text-white/60 transition-colors"
              >
                Admin Access
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}