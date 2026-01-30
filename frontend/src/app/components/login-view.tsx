import { useState } from "react";
import { Wheat, User, ChefHat, Smartphone, Lock } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { BakerRegistration } from "@/app/components/baker-registration";
import { authAPI } from "@/api/auth";

interface FloatingInputProps {
  id: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function FloatingInput({ id, type, placeholder, value, onChange }: FloatingInputProps) {
  return (
    <div className="relative mb-6">
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        className="w-full px-0 py-3 bg-transparent border-0 border-b-2 border-[#4E342E]/20 focus:border-[#D35400] outline-none transition-colors peer"
        placeholder=" "
      />
      <label
        htmlFor={id}
        className="absolute left-0 -top-3.5 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-sm peer-focus:text-[#D35400]"
      >
        {placeholder}
      </label>
    </div>
  );
}

interface LoginViewProps {
  onLogin: (userType: 'customer' | 'baker') => void;
}

export function LoginView({ onLogin }: LoginViewProps) {
  const [userType, setUserType] = useState<'customer' | 'baker'>('customer');
  const [isLogin, setIsLogin] = useState(true);
  const [showOtpLogin, setShowOtpLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [name, setName] = useState("");
  const [showBakerRegistration, setShowBakerRegistration] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await authAPI.sendOTP(email);
      setOtpSent(true);
      
      // In development, the OTP is returned in the response
      if (response.otp) {
        alert(`OTP sent to ${email}: ${response.otp}`);
      } else {
        alert(`OTP sent to ${email}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // If registering as baker, show multi-step registration
    if (!isLogin && userType === 'baker') {
      setShowBakerRegistration(true);
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Login flow
        if (showOtpLogin && otpSent) {
          // OTP login
          const response = await authAPI.verifyOTP(email, otp);
          onLogin(response.user.user_type);
        } else if (!showOtpLogin) {
          // Password login
          const response = await authAPI.login({ email, password });
          onLogin(response.user.user_type);
        }
      } else {
        // Customer registration
        const response = await authAPI.register({
          name,
          email,
          password,
          user_type: userType,
        });
        onLogin(response.user.user_type);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleBakerRegistrationComplete = () => {
    onLogin('baker');
  };

  const handleBackToLogin = () => {
    setShowBakerRegistration(false);
  };

  const handleSwitchToOtp = () => {
    setShowOtpLogin(true);
    setOtpSent(false);
    setPassword("");
    setError("");
  };

  const handleSwitchToPassword = () => {
    setShowOtpLogin(false);
    setOtpSent(false);
    setOtp("");
    setError("");
  };

  // Show baker registration flow
  if (showBakerRegistration) {
    return <BakerRegistration onComplete={handleBakerRegistrationComplete} onBack={handleBackToLogin} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
        {/* Hero Image Section */}
        <div className="hidden md:block rounded-2xl overflow-hidden shadow-2xl">
          <img
            src="https://images.unsplash.com/photo-1659525413607-4cdebb78a999?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb3VyZG91Z2glMjBicmVhZCUyMGZsb3VyfGVufDF8fHx8MTc2ODY1NDQxMHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            alt="Fresh sourdough with flour dusting"
            className="w-full h-[600px] object-cover"
          />
        </div>

        {/* Login Card Section */}
        <Card className="bg-white shadow-xl rounded-2xl">
          <CardContent className="p-8 md:p-12">
            <div className="flex items-center gap-3 mb-8">
              <Wheat className="w-8 h-8 text-[#D35400]" />
              <h1 className="text-4xl text-[#4E342E]">Local Crust</h1>
            </div>

            <p className="text-[#4E342E]/70 mb-8">
              {isLogin ? 'Welcome back!' : 'Join our artisan community'}
            </p>

            {/* User Type Toggle */}
            <div className="grid grid-cols-2 gap-3 mb-8 p-1.5 bg-[#FDFBF7] rounded-xl">
              <button
                onClick={() => setUserType('customer')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all ${
                  userType === 'customer'
                    ? 'bg-white text-[#4E342E] shadow-md'
                    : 'text-[#4E342E]/50 hover:text-[#4E342E]'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Customer</span>
              </button>
              <button
                onClick={() => setUserType('baker')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all ${
                  userType === 'baker'
                    ? 'bg-white text-[#4E342E] shadow-md'
                    : 'text-[#4E342E]/50 hover:text-[#4E342E]'
                }`}
              >
                <ChefHat className="w-4 h-4" />
                <span>Artisan Baker</span>
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <FloatingInput
                  id="name"
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              )}
              <FloatingInput
                id="email"
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              
              {isLogin && showOtpLogin ? (
                <>
                  {!otpSent ? (
                    <>
                      <Button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={loading}
                        className="w-full bg-[#829460] hover:bg-[#829460]/90 text-white py-6 rounded-xl mb-4"
                      >
                        <Smartphone className="w-5 h-5 mr-2" />
                        {loading ? 'Sending...' : 'Send OTP'}
                      </Button>
                      <button
                        type="button"
                        onClick={handleSwitchToPassword}
                        className="text-sm text-[#4E342E]/60 hover:text-[#D35400] transition-colors"
                      >
                        Login with password instead
                      </button>
                    </>
                  ) : (
                    <>
                      <FloatingInput
                        id="otp"
                        type="text"
                        placeholder="Enter 6-digit OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                      />
                      <div className="flex justify-between items-center mb-4">
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={loading}
                          className="text-sm text-[#D35400] hover:underline"
                        >
                          Resend OTP
                        </button>
                        <span className="text-sm text-[#4E342E]/60">OTP expires in 5:00</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSwitchToPassword}
                        className="text-sm text-[#4E342E]/60 hover:text-[#D35400] transition-colors mb-4"
                      >
                        Login with password instead
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <FloatingInput
                    id="password"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {isLogin && (
                    <button
                      type="button"
                      onClick={handleSwitchToOtp}
                      className="text-sm text-[#4E342E]/60 hover:text-[#D35400] transition-colors mb-4"
                    >
                      Login with OTP instead
                    </button>
                  )}
                </>
              )}

              {(!showOtpLogin || otpSent) && (
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#D35400] hover:bg-[#D35400]/90 text-white py-6 rounded-xl mt-2"
                >
                  {loading ? 'Processing...' : (isLogin ? 'Sign In' : (userType === 'baker' ? 'Continue to Registration' : 'Create Account'))}
                </Button>
              )}
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                }}
                className="text-[#4E342E]/60 hover:text-[#D35400] transition-colors"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
