import { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "./dashboard-sidebar";

export const metadata = {
  title: "Dashboard | PokeVault",
  description: "Manage your PokeVault account, listings, and orders.",
};

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("display_name, username, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <DashboardSidebar
        displayName={profile?.display_name ?? profile?.username ?? "Trainer"}
        username={profile?.username ?? ""}
        avatarUrl={profile?.avatar_url ?? null}
      />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
