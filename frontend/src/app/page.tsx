"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogIn } from "lucide-react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 relative overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-950 to-black">
      {/* Decorative Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/30 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />

      <main className="z-10 flex flex-col items-center text-center space-y-8 max-w-lg w-full bg-neutral-900/50 p-10 rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl">
        <h1 className="text-5xl font-extrabold tracking-tight text-white mb-2">
          ReachInbox<span className="text-blue-500">.</span>
        </h1>
        <p className="text-neutral-400 text-lg mb-8">
          The ultimate email scaling OS. Schedule campaigns infinitely using our powerful Redis-backed BullMQ engine.
        </p>

        <div className="flex flex-col space-y-4 w-full px-8">
          <button
            onClick={() => signIn("google")}
            className="flex items-center justify-center space-x-3 bg-white hover:bg-neutral-200 text-black font-semibold py-4 px-8 rounded-full transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)] w-full"
          >
            <LogIn className="w-5 h-5" />
            <span>Login with Google</span>
          </button>
        </div>
      </main>
    </div>
  );
}
