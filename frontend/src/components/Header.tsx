"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import Image from "next/image";

export function Header() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  return (
    <header className="w-full bg-neutral-900/40 backdrop-blur-md border-b border-white/5 sticky top-0 z-50 px-6 py-4 flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <h1 className="text-xl font-bold font-mono tracking-tight text-white">
          ReachInbox<span className="text-blue-500">.</span>
        </h1>
      </div>
      
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-3 text-sm text-neutral-300">
          <div className="hidden sm:flex flex-col items-end">
            <span className="font-semibold text-white">{session.user.name}</span>
            <span className="text-xs text-neutral-500">{session.user.email}</span>
          </div>
          {session.user.image ? (
            <Image
              src={session.user.image} 
              alt="Avatar" 
              width={40}
              height={40}
              className="w-10 h-10 rounded-full border border-white/10 shadow-lg object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center border border-white/10 uppercase font-bold">
              {session.user.name?.[0] || session.user.email?.[0] || '?'}
            </div>
          )}
        </div>
        
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-neutral-400 hover:text-white"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
