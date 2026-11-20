import type { Metadata } from "next";
import { getStoreAccess, getUserStores } from "@/server/auth";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { ToastProvider } from "@/components/toast";

export async function generateMetadata({ params }: LayoutProps<"/s/[store]">): Promise<Metadata> {
  const { store } = await params;
  const access = await getStoreAccess(store);
  return { title: { default: access.store.name, template: `%s · ${access.store.name}` } };
}

export default async function StoreLayout({ children, params }: LayoutProps<"/s/[store]">) {
  const { store: slug } = await params;
  const { store, user, role } = await getStoreAccess(slug);
  const stores = await getUserStores(user.id);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <Sidebar slug={store.slug} />
      <div className="min-w-0">
        <Topbar
          current={{ slug: store.slug, name: store.name, accent: store.accent, role }}
          stores={stores}
          user={user}
        />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <ToastProvider>{children}</ToastProvider>
        </main>
      </div>
    </div>
  );
}
