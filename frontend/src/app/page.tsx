"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUserStore } from "@/store/useUserStore";
import { motion } from "motion/react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import { useEffect } from "react";

export default function LandingPage() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  console.log("User in landing page:", user);
   useEffect(() => {
    if (user) {
     console.log("User in landing page:", user);
      router.push("/boards");
    }
  }, [user, router]);
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 to-black text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-gray-800">
        <h1 className="text-2xl font-bold">WhiteboardX</h1>
        <div className="space-x-4">
          <Link href="/login" className="text-white ">
            Login
          </Link>
          <Link href="/signup" className="text-white ">
            Sign Up
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-24">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-extrabold mb-6"
        >
          Collaborate on a Whiteboard in Real-Time
        </motion.h2>

        <p className="text-gray-400 max-w-xl mb-8">
          Draw, brainstorm, and build ideas together instantly with your team.
          Powered by real-time sync and smooth interactions.
        </p>

        <div className="space-x-4">
          <Link href="/signup" className="text-white ">
            <Button size="lg">Get Started</Button>
          </Link>
          <Link href="/demo" className="text-white ">
            <Button variant="outline" className="text-gray-900"  size="lg">
              Live Demo
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-8 py-16 grid md:grid-cols-3 gap-6">
        {[
          {
            title: "Real-time Sync",
            desc: "Instant updates using CRDTs so everyone stays in sync.",
          },
          {
            title: "Undo / Redo",
            desc: "Powerful history management with collaborative undo.",
          },
          {
            title: "Infinite Canvas",
            desc: "No limits. Create freely on an endless whiteboard.",
          },
        ].map((feature, i) => (
          <Card key={i} className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-2 text-gray-200">{feature.title}</h3>
              <p className="text-gray-400">{feature.desc}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* CTA */}
      <section className="text-center py-20 px-6">
        <h3 className="text-3xl font-bold mb-4">
          Start Collaborating Now
        </h3>
        <p className="text-gray-400 mb-6">
          Invite your team and build ideas together in seconds.
        </p>
        <Button size="lg">Create Board</Button>
      </section>

      {/* Footer */}
      <footer className="text-center text-gray-500 py-6 border-t border-gray-800">
        © {new Date().getFullYear()} WhiteboardX. All rights reserved.
      </footer>
    </div>
  );
}
