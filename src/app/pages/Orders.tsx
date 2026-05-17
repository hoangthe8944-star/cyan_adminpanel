import { useEffect, useMemo, useState } from "react";

import { Eye, Pencil } from "lucide-react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { adminApi, formatCurrency } from "../lib/api";
import type { AdminOrder } from "../lib/types";

function formatAddress(address?: AdminOrder["shippingAddress"] | AdminOrder["billingAddress"]) {
  if (!address) {
    return "-";
  }

  return [
    address.line1,
    address.line2,
    address.ward,
    address.district,
    address.city,
    address.country,
    address.postalCode,
  ]
    .filter(Boolean)
    .join(", ");
}

export function Orders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [momoOpen, setMomoOpen] = useState(false);
  const [orderStatus, setOrderStatus] = useState("PENDING");
  const [paymentStatus, setPaymentStatus] = useState("UNPAID");
  const [momoResultCode, setMomoResultCode] = useState("");
  const [momoTransId, setMomoTransId] = useState("");
  const [momoMessage, setMomoMessage] = useState("");
  const [momoPayUrl, setMomoPayUrl] = useState("");
  const [momoDeeplink, setMomoDeeplink] = useState("");
  const [momoQrCodeUrl, setMomoQrCodeUrl] = useState("");
  const [error, setError] = useState("");

  const loadOrders = () => {
    adminApi.orders().then(setOrders).catch((err: Error) => setError(err.message));
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const stats = useMemo(() => {
    const byStatus = {
      PENDING: 0,
      PROCESSING: 0,
      SHIPPED: 0,
      COMPLETED: 0,
    };
    for (const order of orders) {
      if (order.orderStatus in byStatus) {
        byStatus[order.orderStatus as keyof typeof byStatus] += 1;
      }
    }
    return byStatus;
  }, [orders]);

  const openDetail = (order: AdminOrder) => {
    setSelectedOrder(order);
    setDetailOpen(true);
  };

  const openStatusEditor = (order: AdminOrder) => {
    setSelectedOrder(order);
    setOrderStatus(order.orderStatus);
    setPaymentStatus(order.paymentStatus);
    setStatusOpen(true);
  };

  const openMomoEditor = (order: AdminOrder) => {
    setSelectedOrder(order);
    setPaymentStatus(order.paymentStatus);
    setMomoResultCode(order.momoPayment?.resultCode?.toString() || "");
    setMomoTransId(order.momoPayment?.transId?.toString() || "");
    setMomoMessage(order.momoPayment?.message || "");
    setMomoPayUrl(order.momoPayment?.payUrl || "");
    setMomoDeeplink(order.momoPayment?.deeplink || "");
    setMomoQrCodeUrl(order.momoPayment?.qrCodeUrl || "");
    setMomoOpen(true);
  };

  const saveStatus = async () => {
    if (!selectedOrder) {
      return;
    }
    try {
      await adminApi.updateOrderStatus(selectedOrder.id, orderStatus, paymentStatus);
      setStatusOpen(false);
      loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update order status");
    }
  };

  const saveMomoCallback = async () => {
    if (!selectedOrder) {
      return;
    }

    try {
      await adminApi.updateOrderMomoCallback(selectedOrder.id, {
        paymentStatus,
        resultCode: momoResultCode ? Number(momoResultCode) : null,
        transId: momoTransId ? Number(momoTransId) : null,
        message: momoMessage || null,
        payUrl: momoPayUrl || null,
        deeplink: momoDeeplink || null,
        qrCodeUrl: momoQrCodeUrl || null,
      });
      setMomoOpen(false);
      loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update MoMo callback");
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-heading mb-2">Order Management</h1>
        <p className="text-[#5a6169]">View order detail and update order/payment state</p>
      </div>

      {error ? <div className="mb-4 text-sm text-red-600">{error}</div> : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Pending", count: stats.PENDING, color: "text-yellow-600" },
          { label: "Processing", count: stats.PROCESSING, color: "text-blue-600" },
          { label: "Shipped", count: stats.SHIPPED, color: "text-purple-600" },
          { label: "Completed", count: stats.COMPLETED, color: "text-green-600" },
        ].map((stat) => (
          <Card key={stat.label} className="p-6 bg-white border-[rgba(6,20,27,0.1)]">
            <p className="text-sm text-[#5a6169] mb-1 font-data">{stat.label}</p>
            <p className={`text-3xl font-data ${stat.color}`}>{stat.count}</p>
          </Card>
        ))}
      </div>

      <Card className="bg-white border-[rgba(6,20,27,0.1)]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-[rgba(6,20,27,0.05)]">
              <TableHead className="font-data">Order ID</TableHead>
              <TableHead className="font-data">Customer</TableHead>
              <TableHead className="font-data">Products</TableHead>
              <TableHead className="font-data">Method</TableHead>
              <TableHead className="font-data">Total</TableHead>
              <TableHead className="font-data">Status</TableHead>
              <TableHead className="font-data">Payment</TableHead>
              <TableHead className="font-data">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id} className="border-[rgba(6,20,27,0.05)] hover:bg-[rgba(237,217,135,0.05)]">
                <TableCell className="font-data">{order.orderCode}</TableCell>
                <TableCell className="font-data">{order.customer.fullName}</TableCell>
                <TableCell className="font-data text-[#5a6169]">{order.items.map((item) => item.productName).join(", ")}</TableCell>
                <TableCell className="font-data text-[#5a6169]">{order.paymentMethod}</TableCell>
                <TableCell className="font-data text-[#A36B31]">{formatCurrency(order.totalAmount)}</TableCell>
                <TableCell><Badge className="bg-[rgba(237,217,135,0.2)] text-[#A36B31] border-0 capitalize">{order.orderStatus}</Badge></TableCell>
                <TableCell className="font-data text-[#5a6169]">{order.paymentStatus}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openDetail(order)}><Eye className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" onClick={() => openStatusEditor(order)}><Pencil className="w-4 h-4" /></Button>
                    {order.paymentMethod === "MOMO" ? (
                      <Button variant="outline" size="sm" onClick={() => openMomoEditor(order)}>MoMo</Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-white max-w-2xl">
          <DialogHeader><DialogTitle className="font-heading">Order Detail</DialogTitle></DialogHeader>
          {selectedOrder ? (
            <div className="space-y-3 text-sm">
              <p><strong>Order:</strong> {selectedOrder.orderCode}</p>
              <p><strong>Customer:</strong> {selectedOrder.customer.fullName} - {selectedOrder.customer.phoneNumber}</p>
              <p><strong>Email:</strong> {selectedOrder.customer.email || "-"}</p>
              <p><strong>Shipping:</strong> {formatAddress(selectedOrder.shippingAddress)}</p>
              <p><strong>Billing:</strong> {formatAddress(selectedOrder.billingAddress || selectedOrder.shippingAddress)}</p>
              <p><strong>Payment Method:</strong> {selectedOrder.paymentMethod}</p>
              <p><strong>Order Status:</strong> {selectedOrder.orderStatus}</p>
              <p><strong>Payment Status:</strong> {selectedOrder.paymentStatus}</p>
              <p><strong>Subtotal:</strong> {formatCurrency(selectedOrder.subtotal || 0)}</p>
              <p><strong>Shipping Fee:</strong> {formatCurrency(selectedOrder.shippingFee || 0)}</p>
              <p><strong>Discount:</strong> {formatCurrency(selectedOrder.discountAmount || 0)}</p>
              <p><strong>Total:</strong> {formatCurrency(selectedOrder.totalAmount)}</p>
              <p><strong>Currency:</strong> {selectedOrder.currency || "VND"}</p>
              <p><strong>Note:</strong> {selectedOrder.note || "-"}</p>
              <div>
                <strong>Items:</strong>
                <ul className="mt-2 space-y-1">
                  {selectedOrder.items.map((item) => (
                    <li key={`${item.productName}-${item.variantCode}`}>
                      {item.productName} | {item.variantCode} | qty {item.quantity} | {formatCurrency(item.lineTotal || 0)}
                    </li>
                  ))}
                </ul>
              </div>
              {selectedOrder.momoPayment ? (
                <div className="rounded-xl border border-[rgba(6,20,27,0.08)] bg-[#fbfbfa] p-4">
                  <p><strong>MoMo Result Code:</strong> {selectedOrder.momoPayment.resultCode ?? "-"}</p>
                  <p><strong>MoMo Transaction:</strong> {selectedOrder.momoPayment.transId ?? "-"}</p>
                  <p><strong>MoMo Message:</strong> {selectedOrder.momoPayment.message || "-"}</p>
                  <p><strong>Pay URL:</strong> {selectedOrder.momoPayment.payUrl || "-"}</p>
                  <p><strong>Deep Link:</strong> {selectedOrder.momoPayment.deeplink || "-"}</p>
                  <p><strong>QR URL:</strong> {selectedOrder.momoPayment.qrCodeUrl || "-"}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle className="font-heading">Update Order Status</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <span className="text-sm text-[#5a6169]">Order Status</span>
              <Select value={orderStatus} onValueChange={setOrderStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">PENDING</SelectItem>
                  <SelectItem value="AWAITING_PAYMENT">AWAITING_PAYMENT</SelectItem>
                  <SelectItem value="PAID">PAID</SelectItem>
                  <SelectItem value="PROCESSING">PROCESSING</SelectItem>
                  <SelectItem value="SHIPPED">SHIPPED</SelectItem>
                  <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                  <SelectItem value="CANCELED">CANCELED</SelectItem>
                  <SelectItem value="FAILED">FAILED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="text-sm text-[#5a6169]">Payment Status</span>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNPAID">UNPAID</SelectItem>
                  <SelectItem value="PENDING">PENDING</SelectItem>
                  <SelectItem value="PAID">PAID</SelectItem>
                  <SelectItem value="REFUNDED">REFUNDED</SelectItem>
                  <SelectItem value="FAILED">FAILED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-[#06141B] hover:bg-[#0a1f29] text-white" onClick={saveStatus}>
              Save Status
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={momoOpen} onOpenChange={setMomoOpen}>
        <DialogContent className="bg-white max-w-lg">
          <DialogHeader><DialogTitle className="font-heading">Update MoMo Callback</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <span className="text-sm text-[#5a6169]">Payment Status</span>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNPAID">UNPAID</SelectItem>
                  <SelectItem value="PENDING">PENDING</SelectItem>
                  <SelectItem value="PAID">PAID</SelectItem>
                  <SelectItem value="REFUNDED">REFUNDED</SelectItem>
                  <SelectItem value="FAILED">FAILED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="text-sm text-[#5a6169]">Result Code</span>
              <input className="mt-1 w-full rounded-xl border border-[rgba(6,20,27,0.14)] px-4 py-2 text-sm" value={momoResultCode} onChange={(e) => setMomoResultCode(e.target.value)} />
            </div>
            <div>
              <span className="text-sm text-[#5a6169]">Transaction ID</span>
              <input className="mt-1 w-full rounded-xl border border-[rgba(6,20,27,0.14)] px-4 py-2 text-sm" value={momoTransId} onChange={(e) => setMomoTransId(e.target.value)} />
            </div>
            <div>
              <span className="text-sm text-[#5a6169]">Message</span>
              <input className="mt-1 w-full rounded-xl border border-[rgba(6,20,27,0.14)] px-4 py-2 text-sm" value={momoMessage} onChange={(e) => setMomoMessage(e.target.value)} />
            </div>
            <div>
              <span className="text-sm text-[#5a6169]">Pay URL</span>
              <input className="mt-1 w-full rounded-xl border border-[rgba(6,20,27,0.14)] px-4 py-2 text-sm" value={momoPayUrl} onChange={(e) => setMomoPayUrl(e.target.value)} />
            </div>
            <div>
              <span className="text-sm text-[#5a6169]">Deep Link</span>
              <input className="mt-1 w-full rounded-xl border border-[rgba(6,20,27,0.14)] px-4 py-2 text-sm" value={momoDeeplink} onChange={(e) => setMomoDeeplink(e.target.value)} />
            </div>
            <div>
              <span className="text-sm text-[#5a6169]">QR Code URL</span>
              <input className="mt-1 w-full rounded-xl border border-[rgba(6,20,27,0.14)] px-4 py-2 text-sm" value={momoQrCodeUrl} onChange={(e) => setMomoQrCodeUrl(e.target.value)} />
            </div>
            <Button className="w-full bg-[#06141B] hover:bg-[#0a1f29] text-white" onClick={saveMomoCallback}>
              Save MoMo Update
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
