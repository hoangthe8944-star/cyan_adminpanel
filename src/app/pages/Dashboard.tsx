import { useEffect, useState } from "react";

import { Gem, ShoppingCart, FileText, ImageIcon } from "lucide-react";

import { Card } from "../components/ui/card";
import { adminApi } from "../lib/api";
import type { AdminDashboardResponse } from "../lib/types";

export function Dashboard() {
  const [data, setData] = useState<AdminDashboardResponse | null>(null);

  useEffect(() => {
    adminApi.dashboard().then(setData).catch(() => setData(null));
  }, []);

  const stats = [
    { label: "Total Products", value: data?.totalProducts ?? 0, icon: Gem, meta: `${data?.activeProducts ?? 0} active` },
    { label: "Total Orders", value: data?.totalOrders ?? 0, icon: ShoppingCart, meta: `${data?.paidOrders ?? 0} paid` },
    { label: "Editorial Posts", value: data?.totalEditorials ?? 0, icon: FileText, meta: `${data?.publishedEditorials ?? 0} published` },
    { label: "Banners", value: data?.totalBanners ?? 0, icon: ImageIcon, meta: `${data?.activeBanners ?? 0} active` },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-heading mb-2">Dashboard</h1>
        <p className="text-[#5a6169]">Live overview from the Oriven Jewelry backend</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-6 bg-white border-[rgba(6,20,27,0.1)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[#5a6169] mb-1 font-data">{stat.label}</p>
                <p className="text-3xl font-data mb-2">{stat.value}</p>
                <p className="text-sm text-[#A36B31] font-data">{stat.meta}</p>
              </div>
              <div className="p-3 bg-[rgba(237,217,135,0.1)] rounded-lg">
                <stat.icon className="w-6 h-6 text-[#A36B31]" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
