import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { getSupabaseServer } from "@/lib/supabase-server";

export const metadata = {
  title: "Dashboard · letxcook",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sb = getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  return (
    <main>
      <Navbar />
      <div className="mx-auto grid max-w-7xl gap-8 px-6 pb-20 pt-2 md:grid-cols-[220px_1fr] md:px-10 md:pt-4">
        <DashboardSidebar />
        <section className="min-w-0">{children}</section>
      </div>
      <Footer />
    </main>
  );
}
