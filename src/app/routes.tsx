import { createBrowserRouter } from "react-router";
import { AdminLayout } from "./components/AdminLayout";
import { Dashboard } from "./pages/Dashboard";
import { Categories } from "./pages/Categories";
import { Products } from "./pages/Products";
import { Banners } from "./pages/Banners";
import { Collections } from "./pages/Collections";
import { Editorial } from "./pages/Editorial";
import { Orders } from "./pages/Orders";
import { Customers } from "./pages/Customers";
import { Settings } from "./pages/Settings";
import { Chat } from "./pages/Chat";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AdminLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "categories", Component: Categories },
      { path: "products", Component: Products },
      { path: "banners", Component: Banners },
      { path: "collections", Component: Collections },
      { path: "editorial", Component: Editorial },
      { path: "orders", Component: Orders },
      { path: "customers", Component: Customers },
      { path: "chat", Component: Chat },
      { path: "settings", Component: Settings },
    ],
  },
]);
