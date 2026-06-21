"use server";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

// Server Action → writable cookie context, so signOut's setAll clears the
// apex-scoped auth cookies for all subdomains.
export async function signOut() {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
