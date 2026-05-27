import { useEffect, useMemo, useState } from "react";

import { Crown } from "lucide-react";

import { adminApi, formatCurrency } from "../lib/api";
import type { AdminOrder } from "../lib/types";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";

interface CustomerSummary {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  orders: number;
  totalSpent: number;
  tier: "regular" | "vip" | "platinum";
  joinDate: string;
}

function resolveCustomerKey(order: AdminOrder) {
  return order.customer.email?.trim().toLowerCase() || order.customer.phoneNumber.trim() || order.id;
}

function resolveTier(totalSpent: number, orderCount: number): CustomerSummary["tier"] {
  if (totalSpent >= 20000000 || orderCount >= 10) {
    return "platinum";
  }

  if (totalSpent >= 8000000 || orderCount >= 4) {
    return "vip";
  }

  return "regular";
}

function formatJoinDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-CA");
}

export function Customers() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi.orders().then(setOrders).catch((err: Error) => setError(err.message));
  }, []);

  const customers = useMemo<CustomerSummary[]>(() => {
    const map = new Map<string, CustomerSummary>();

    for (const order of orders) {
      const key = resolveCustomerKey(order);
      const existing = map.get(key);
      const createdAt = order.createdAt || null;

      if (!existing) {
        map.set(key, {
          id: key,
          name: order.customer.fullName,
          email: order.customer.email || "-",
          phoneNumber: order.customer.phoneNumber,
          orders: 1,
          totalSpent: order.totalAmount,
          tier: resolveTier(order.totalAmount, 1),
          joinDate: createdAt || "",
        });
        continue;
      }

      const nextOrders = existing.orders + 1;
      const nextSpent = existing.totalSpent + order.totalAmount;
      const earliestJoinDate =
        existing.joinDate && createdAt
          ? new Date(existing.joinDate).getTime() <= new Date(createdAt).getTime()
            ? existing.joinDate
            : createdAt
          : existing.joinDate || createdAt || "";

      map.set(key, {
        ...existing,
        name: existing.name || order.customer.fullName,
        email: existing.email !== "-" ? existing.email : order.customer.email || "-",
        phoneNumber: existing.phoneNumber || order.customer.phoneNumber,
        orders: nextOrders,
        totalSpent: nextSpent,
        tier: resolveTier(nextSpent, nextOrders),
        joinDate: earliestJoinDate,
      });
    }

    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  const stats = useMemo(
    () => ({
      totalCustomers: customers.length,
      vipMembers: customers.filter((customer) => customer.tier === "vip" || customer.tier === "platinum").length,
      lifetimeValue: customers.reduce((sum, customer) => sum + customer.totalSpent, 0),
    }),
    [customers]
  );

  const getTierBadge = (tier: CustomerSummary["tier"]) => {
    switch (tier) {
      case "platinum":
        return <Badge className="bg-[#A36B31] text-white border-0"><Crown className="w-3 h-3 mr-1" />Platinum</Badge>;
      case "vip":
        return <Badge className="bg-[#EDD987] text-[#06141B] border-0">VIP</Badge>;
      default:
        return <Badge variant="secondary" className="border-0">Regular</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("");
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-heading mb-2">Customer Management</h1>
        <p className="text-[#5a6169]">Live customer summary derived from Oriven order data</p>
      </div>

      {error ? <div className="mb-4 text-sm text-red-600">{error}</div> : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 bg-white border-[rgba(6,20,27,0.1)]">
          <p className="text-sm text-[#5a6169] mb-1 font-data">Total Customers</p>
          <p className="text-3xl font-data">{stats.totalCustomers}</p>
        </Card>
        <Card className="p-6 bg-white border-[rgba(6,20,27,0.1)]">
          <p className="text-sm text-[#5a6169] mb-1 font-data">VIP Members</p>
          <p className="text-3xl font-data text-[#A36B31]">{stats.vipMembers}</p>
        </Card>
        <Card className="p-6 bg-white border-[rgba(6,20,27,0.1)]">
          <p className="text-sm text-[#5a6169] mb-1 font-data">Lifetime Value</p>
          <p className="text-3xl font-data">{formatCurrency(stats.lifetimeValue)}</p>
        </Card>
      </div>

      <Card className="bg-white border-[rgba(6,20,27,0.1)]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-[rgba(6,20,27,0.05)]">
              <TableHead className="font-data">Customer</TableHead>
              <TableHead className="font-data">Email</TableHead>
              <TableHead className="font-data">Phone</TableHead>
              <TableHead className="font-data">Orders</TableHead>
              <TableHead className="font-data">Total Spent</TableHead>
              <TableHead className="font-data">Tier</TableHead>
              <TableHead className="font-data">Join Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id} className="border-[rgba(6,20,27,0.05)] hover:bg-[rgba(237,217,135,0.05)]">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-[rgba(237,217,135,0.2)] text-[#A36B31] font-data">
                        {getInitials(customer.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-data">{customer.name}</span>
                  </div>
                </TableCell>
                <TableCell className="font-data text-[#5a6169]">{customer.email}</TableCell>
                <TableCell className="font-data text-[#5a6169]">{customer.phoneNumber}</TableCell>
                <TableCell className="font-data">{customer.orders}</TableCell>
                <TableCell className="font-data text-[#A36B31]">{formatCurrency(customer.totalSpent)}</TableCell>
                <TableCell>{getTierBadge(customer.tier)}</TableCell>
                <TableCell className="font-data text-[#5a6169]">{formatJoinDate(customer.joinDate)}</TableCell>
              </TableRow>
            ))}
            {!customers.length ? (
              <TableRow className="border-[rgba(6,20,27,0.05)]">
                <TableCell colSpan={7} className="py-10 text-center text-sm text-[#5a6169]">
                  No customer data available from orders yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
