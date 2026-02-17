"use client";

import { supabase } from "@/lib/supabase";

export default function Home() {
  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="flex h-screen items-center justify-center">
      <button
        onClick={loginWithGoogle}
        className="px-6 py-3 bg-black text-white rounded"
      >
        Login with Google
      </button>
    </div>
  );
}
