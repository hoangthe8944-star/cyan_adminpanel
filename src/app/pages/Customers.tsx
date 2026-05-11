import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Crown } from "lucide-react";

interface Customer {
  id: number;
  name: string;
  email: string;
  orders: number;
  totalSpent: number;
  tier: "regular" | "vip" | "platinum";
  joinDate: string;
}

export function Customers() {
  const customers: Customer[] = [
    { id: 1, name: "Sarah Chen", email: "sarah.chen@email.com", orders: 12, totalSpent: 18500, tier: "platinum", joinDate: "2025-01-15" },
    { id: 2, name: "Emma Wilson", email: "emma.w@email.com", orders: 8, totalSpent: 12200, tier: "vip", joinDate: "2025-03-22" },
    { id: 3, name: "Michael Brown", email: "m.brown@email.com", orders: 3, totalSpent: 2100, tier: "regular", joinDate: "2026-02-10" },
    { id: 4, name: "Lisa Anderson", email: "lisa.a@email.com", orders: 15, totalSpent: 24000, tier: "platinum", joinDate: "2024-11-05" },
    { id: 5, name: "David Lee", email: "david.lee@email.com", orders: 6, totalSpent: 8500, tier: "vip", joinDate: "2025-08-18" },
  ];

  const getTierBadge = (tier: Customer["tier"]) => {
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading mb-2">Customer Management</h1>
        <p className="text-[#5a6169]">Manage customer relationships and loyalty</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 bg-white border-[rgba(6,20,27,0.1)]">
          <p className="text-sm text-[#5a6169] mb-1 font-data">Total Customers</p>
          <p className="text-3xl font-data">1,234</p>
        </Card>
        <Card className="p-6 bg-white border-[rgba(6,20,27,0.1)]">
          <p className="text-sm text-[#5a6169] mb-1 font-data">VIP Members</p>
          <p className="text-3xl font-data text-[#A36B31]">87</p>
        </Card>
        <Card className="p-6 bg-white border-[rgba(6,20,27,0.1)]">
          <p className="text-sm text-[#5a6169] mb-1 font-data">Lifetime Value</p>
          <p className="text-3xl font-data">$892k</p>
        </Card>
      </div>

      {/* Customers Table */}
      <Card className="bg-white border-[rgba(6,20,27,0.1)]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-[rgba(6,20,27,0.05)]">
              <TableHead className="font-data">Customer</TableHead>
              <TableHead className="font-data">Email</TableHead>
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
                <TableCell className="font-data">{customer.orders}</TableCell>
                <TableCell className="font-data text-[#A36B31]">${customer.totalSpent.toLocaleString()}</TableCell>
                <TableCell>{getTierBadge(customer.tier)}</TableCell>
                <TableCell className="font-data text-[#5a6169]">{customer.joinDate}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
