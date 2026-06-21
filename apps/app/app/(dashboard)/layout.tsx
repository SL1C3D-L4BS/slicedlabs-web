import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

// Server-side guard in addition to middleware (defense in depth).
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <div className="grid gap-6">{children}</div>;
}
