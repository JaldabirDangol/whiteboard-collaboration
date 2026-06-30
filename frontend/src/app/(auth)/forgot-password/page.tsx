"use client";

import { useState } from "react";
import { forgotPassword } from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2, ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      return toast.error("Please enter your email");
    }

    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
      toast.success("Check your email for a reset link");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-violet-900/20 via-transparent to-transparent" />

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-white font-bold">W</span>
            </div>
            <span className="text-xl font-bold text-white">WhiteboardX</span>
          </Link>
          <h1 className="text-3xl font-bold text-white">Reset password</h1>
          <p className="text-slate-400 mt-2">
            {sent ? "Check your email for the reset link" : "Enter your email to receive a reset link"}
          </p>
        </div>

        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 shadow-2xl">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <Mail className="h-6 w-6 text-indigo-400" />
              </div>
              <p className="text-slate-300 text-sm">
                We&apos;ve sent a password reset link to <strong className="text-white">{email}</strong>
              </p>
              <p className="text-slate-500 text-xs">
                Didn&apos;t receive it? Check your spam folder or{" "}
                <button
                  type="button"
                  onClick={() => { setSent(false); setEmail(""); }}
                  className="text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  try again
                </button>
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  className="w-full px-4 py-2.5 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold py-2.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
