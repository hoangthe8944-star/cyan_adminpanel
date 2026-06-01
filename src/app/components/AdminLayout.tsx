import { Outlet, NavLink } from "react-router";
import {
  LayoutDashboard,
  FolderTree,
  Gem,
  Image,
  Layers3,
  FileText,
  Palette,
  MessageCircleMore,
  ShoppingCart,
  Users,
  Settings as SettingsIcon
} from "lucide-react";

export function AdminLayout() {
  const menuItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/categories", label: "Categories", icon: FolderTree },
    { path: "/products", label: "Products", icon: Gem },
    { path: "/banners", label: "Banners", icon: Image },
    { path: "/collections", label: "Collections", icon: Layers3 },
    { path: "/editorial", label: "Editorial", icon: FileText },
    { path: "/landing-themes", label: "Landing Themes", icon: Palette },
    { path: "/orders", label: "Orders", icon: ShoppingCart },
    { path: "/customers", label: "Customers", icon: Users },
    { path: "/messages", label: "Messages", icon: MessageCircleMore },
    { path: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen">
      {/* Fixed Sidebar - Dark Blue Background */}
      <aside className="w-64 bg-[#06141B] text-[#F8F9F9] flex flex-col fixed h-full border-r border-[rgba(237,217,135,0.15)]">
        {/* Brand Logo */}
        <div className="p-6 border-b border-[rgba(237,217,135,0.15)]">
          <h1 className="font-heading text-[#EDD987] tracking-wide">
            Oriven Jewelry
          </h1>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all relative group ${
                  isActive
                    ? "text-[#EDD987] bg-[rgba(237,217,135,0.1)]"
                    : "text-[#F8F9F9] hover:bg-[rgba(237,217,135,0.05)]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active indicator bar */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#EDD987] rounded-r" />
                  )}
                  <item.icon className="w-5 h-5" />
                  <span className="font-data">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[rgba(237,217,135,0.15)]">
          <p className="text-sm text-[rgba(248,249,249,0.6)] font-data">
            Oriven Admin Panel
          </p>
        </div>
      </aside>

      {/* Main Content Area - Light Background */}
      <main className="flex-1 ml-64 bg-[#F8F9F9] overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
