"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUserStore } from "@/store/useUserStore";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sparkles, Undo, Infinity, ArrowRight } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);

  useEffect(() => {
    if (user) {
      router.push("/boards");
    }
  }, [user, router]);

  const features = [
    {
      icon: Sparkles,
      title: "Real-time Sync",
      desc: "Instant updates using CRDTs so everyone stays in sync.",
    },
    {
      icon: Undo,
      title: "Undo / Redo",
      desc: "Powerful history management with collaborative undo.",
    },
    {
      icon: Infinity,
      title: "Infinite Canvas",
      desc: "No limits. Create freely on an endless whiteboard.",
    },
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-white relative">
      <div className="absolute inset-0 bg-grid-white pointer-events-none" />
      <header className="relative flex items-center justify-between px-8 py-5 border-b border-white/[0.06] backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-white font-bold">W</span>
          </div>
          <h1 className="text-xl font-bold">WhiteboardX</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition">
            Login
          </Link>
          <Link href="/signup">
            <Button size="sm" className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-md shadow-indigo-500/20">
              Sign Up
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Real-time collaborative whiteboard
          </div>

          <h2 className="text-5xl md:text-6xl font-extrabold mb-6 bg-linear-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Collaborate on a Whiteboard in Real-Time
          </h2>

          <p className="text-slate-400 text-lg max-w-xl mx-auto mb-10">
            Draw, brainstorm, and build ideas together instantly with your team.
            Powered by real-time sync and smooth interactions.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 px-6 shadow-lg shadow-indigo-600/25">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                Sign In
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-8 py-20 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
            >
              <Card className="bg-white/[0.03] border-white/[0.06] hover:border-indigo-500/30 hover:bg-white/[0.06] transition-all duration-300 hover:-translate-y-0.5">
                <CardContent className="p-6">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 flex items-center justify-center mb-4 shadow-inner">
                    <feature.icon className="h-5 w-5 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-slate-200">{feature.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <h3 className="text-3xl font-bold mb-4">
            Start Collaborating Now
          </h3>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            Invite your team and build ideas together in seconds.
          </p>
          <Link href="/signup">
            <Button size="lg" className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 px-8 shadow-lg shadow-indigo-600/25">Create Free Account</Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="text-center text-slate-500 py-6 border-t border-slate-800/50 text-sm">
        &copy; {new Date().getFullYear()} WhiteboardX. All rights reserved.
      </footer>
    </div>
  );
}