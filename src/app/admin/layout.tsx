import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  LayoutDashboard,
  PackageSearch,
  Gavel,
  ShoppingCart,
  Users,
  Shield,
  ChevronRight,
} from "lucide-react";

const adminNav = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Consignments", href: "/admin/consignments", icon: PackageSearch },
  { label: "Listings", href: "/admin/listings", icon: Gavel },
  { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
  { label: "Users", href: "/admin/users", icon: Users },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/dashboard");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0F172A]">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-[#334155] bg-[#1E293B] lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-[#334155] px-6">
          <Shield className="h-6 w-6 text-[#FACC15]" />
          <span className="text-lg font-bold text-[#E2E8F0]">PokeVault</span>
          <span className="ml-auto rounded bg-[#EF4444]/15 px-2 py-0.5 text-xs font-semibold text-[#EF4444]">
            Admin
          </span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#94A3B8] transition-colors hover:bg-[#0F172A]/50 hover:text-[#E2E8F0]"
            >
              <item.icon className="h-5 w-5 flex-shrink-0 transition-colors group-hover:text-[#FACC15]" />
              {item.label}
              <ChevronRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          ))}
        </nav>

        <div className="border-t border-[#334155] px-4 py-3">
          <p className="truncate text-xs text-[#94A3B8]">{user.email}</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-[#334155] bg-[#1E293B] px-6">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-[#FACC15] lg:hidden" />
            <h1 className="text-lg font-semibold text-[#E2E8F0]">
              Admin Panel
            </h1>
          </div>

          {/* Mobile nav */}
          <nav className="flex items-center gap-1 lg:hidden">
            {adminNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg p-2 text-[#94A3B8] transition-colors hover:bg-[#0F172A]/50 hover:text-[#E2E8F0]"
                title={item.label}
              >
                <item.icon className="h-5 w-5" />
              </Link>
            ))}
          </nav>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
