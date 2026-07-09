"use client";

import { useState } from "react";
import { signup, login } from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const fetchCurrentUser = useUserStore((state) => state.fetchCurrentUser);

  const handleSignup = async () => {
    if (!email || !password) {
      return toast.error("Please fill in all fields");
    }

    if (password.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }

    setLoading(true);
    try {
      await signup(email, password);
      await login(email, password);
      await fetchCurrentUser();
      toast.success("Account created successfully!");
      router.push("/boards");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Signup failed. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center shadow-lg shadow-accent/30">
              <span className="text-white font-bold">W</span>
            </div>
            <span className="text-xl font-bold text-white">WhiteboardX</span>
          </Link>
          <h1 className="text-3xl font-bold text-white">Create an account</h1>
          <p className="text-slate-400 mt-2">Start collaborating in seconds</p>
        </div>

        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 shadow-2xl">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                placeholder="name@company.com"
                className="w-full px-4 py-2.5 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-accent/40 focus:border-accent/50 outline-none transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSignup()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-accent/40 focus:border-accent/50 outline-none transition-all pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSignup()}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1.5">At least 6 characters</p>
            </div>

            <button
              onClick={handleSignup}
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-2.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-accent/25"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : null}
              {loading ? "Creating account..." : "Create account"}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="text-accent hover:text-accent-hover font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
