import { useState, useEffect } from "react";
import { LandingView } from "@/app/components/landing-view";
import { OnboardingView } from "@/app/components/onboarding-view";
import { LoginView } from "@/app/components/login-view";
import { MarketplaceView } from "@/app/components/marketplace-view";
import { BakerDashboardEnhanced } from "@/app/components/baker-dashboard-enhanced";
import { BakerProfile } from "@/app/components/baker-profile";
import { AdminLogin } from "@/app/components/admin-login";
import { AdminDashboard } from "@/app/components/admin-dashboard";

type View = 'landing' | 'onboarding' | 'login' | 'marketplace' | 'baker-dashboard' | 'baker-profile' | 'admin-login' | 'admin-dashboard';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('landing');
  const [userType, setUserType] = useState<'customer' | 'baker' | 'admin' | null>(null);

  // Handle hash-based navigation for profile
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // Remove the '#'
      if (hash === 'profile' && userType === 'baker') {
        setCurrentView('baker-profile');
      } else if (hash === 'dashboard' && userType === 'baker') {
        setCurrentView('baker-dashboard');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Check initial hash

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [userType]);

  const handleNavigateToLogin = () => {
    setCurrentView('login');
  };

  const handleNavigateToAdminLogin = () => {
    setCurrentView('admin-login');
  };

  const handleOnboardingComplete = () => {
    setCurrentView('login');
  };

  const handleLogin = (type: 'customer' | 'baker') => {
    setUserType(type);
    if (type === 'customer') {
      setCurrentView('marketplace');
    } else {
      setCurrentView('baker-dashboard');
    }
  };

  const handleAdminLoginSuccess = (token: string, user: any) => {
    setUserType('admin');
    setCurrentView('admin-dashboard');
  };

  const handleLogout = () => {
    setUserType(null);
    setCurrentView('landing');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
  };

  const handleViewCart = () => {
    // Could navigate to a cart view in the future
    alert('Cart functionality - coming soon!');
  };

  return (
    <div className="min-h-screen">
      <div className="animate-fadeIn">
        {currentView === 'landing' && <LandingView onNavigateToLogin={handleNavigateToLogin} onNavigateToAdmin={handleNavigateToAdminLogin} />}
      </div>
      <div className="animate-fadeIn">
        {currentView === 'onboarding' && <OnboardingView onComplete={handleOnboardingComplete} />}
      </div>
      <div className="animate-fadeIn">
        {currentView === 'login' && <LoginView onLogin={handleLogin} />}
      </div>
      <div className="animate-fadeIn">
        {currentView === 'marketplace' && <MarketplaceView onViewCart={handleViewCart} />}
      </div>
      <div className="animate-fadeIn">
        {currentView === 'baker-dashboard' && <BakerDashboardEnhanced onLogout={handleLogout} />}
      </div>
      <div className="animate-fadeIn">
        {currentView === 'baker-profile' && <BakerProfile onLogout={handleLogout} />}
      </div>
      <div className="animate-fadeIn">
        {currentView === 'admin-login' && <AdminLogin onLoginSuccess={handleAdminLoginSuccess} />}
      </div>
      <div className="animate-fadeIn">
        {currentView === 'admin-dashboard' && <AdminDashboard onLogout={handleLogout} />}
      </div>
    </div>
  );
}
