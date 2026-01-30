import { useState } from "react";
import { Shield, Lock, Mail } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { apiCall } from "@/api/config";

interface AdminLoginProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await apiCall<{
        token: string;
        user: any;
        message: string;
      }>("/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem("auth_token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
      onLoginSuccess(response.token, response.user);
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#D35400] via-[#E67E22] to-[#F39C12] flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-white shadow-2xl">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-gradient-to-br from-[#D35400] to-[#E67E22] rounded-full mb-4">
              <Shield className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[#4E342E] mb-2">
              Admin Portal
            </h1>
            <p className="text-[#4E342E]/60">Local Crust Management</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#4E342E] mb-2">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#4E342E]/40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@localcrust.com"
                  required
                  className="w-full pl-12 pr-4 py-3 border-2 border-[#D35400]/20 rounded-xl focus:border-[#D35400] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#4E342E] mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#4E342E]/40" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-12 pr-4 py-3 border-2 border-[#D35400]/20 rounded-xl focus:border-[#D35400] outline-none"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#D35400] to-[#E67E22] hover:from-[#E67E22] hover:to-[#D35400] text-white rounded-xl py-6 text-lg font-medium disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Login to Admin Portal"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-[#4E342E]/60">
            <p>Authorized access only</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}