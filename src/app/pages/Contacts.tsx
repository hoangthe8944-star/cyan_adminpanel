import { useEffect, useState } from "react";
import { Eye, Trash2 } from "lucide-react";

import { adminApi } from "../lib/api";
import type { AdminContact } from "../lib/types";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Contacts() {
  const [contacts, setContacts] = useState<AdminContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<AdminContact | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [error, setError] = useState("");

  const loadContacts = () => {
    adminApi
      .contacts()
      .then(setContacts)
      .catch((err: Error) => setError(err.message));
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const openDetail = (contact: AdminContact) => {
    setSelectedContact(contact);
    setDetailOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer feedback?")) {
      return;
    }
    try {
      await adminApi.deleteContact(id);
      loadContacts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete contact");
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-heading mb-2">Customer Feedback</h1>
        <p className="text-[#5a6169]">View and manage feedback messages submitted by customers</p>
      </div>

      {error ? <div className="mb-4 text-sm text-red-600">{error}</div> : null}

      <Card className="bg-white border-[rgba(6,20,27,0.1)]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-[rgba(6,20,27,0.05)]">
              <TableHead className="font-data">Customer</TableHead>
              <TableHead className="font-data">Email</TableHead>
              <TableHead className="font-data">Phone</TableHead>
              <TableHead className="font-data">Subject</TableHead>
              <TableHead className="font-data">Date</TableHead>
              <TableHead className="font-data text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow key={contact.id} className="border-[rgba(6,20,27,0.05)] hover:bg-[rgba(237,217,135,0.05)]">
                <TableCell className="font-data font-medium">{contact.customerName}</TableCell>
                <TableCell className="font-data text-[#5a6169]">{contact.email}</TableCell>
                <TableCell className="font-data text-[#5a6169]">{contact.phoneNumber || "-"}</TableCell>
                <TableCell className="font-data text-[#5a6169] max-w-[200px] truncate">{contact.subject}</TableCell>
                <TableCell className="font-data text-[#5a6169]">{formatDate(contact.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => openDetail(contact)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(contact.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!contacts.length ? (
              <TableRow className="border-[rgba(6,20,27,0.05)]">
                <TableCell colSpan={6} className="py-10 text-center text-sm text-[#5a6169]">
                  No feedback messages found.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-white max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-heading">Feedback Details</DialogTitle>
          </DialogHeader>
          {selectedContact ? (
            <div className="space-y-4 text-sm mt-2">
              <div className="grid grid-cols-2 gap-4 border-b border-[rgba(6,20,27,0.05)] pb-3">
                <div>
                  <span className="text-xs text-[#5a6169] block font-data">Customer Name</span>
                  <strong className="font-data text-[#06141B]">{selectedContact.customerName}</strong>
                </div>
                <div>
                  <span className="text-xs text-[#5a6169] block font-data">Submitted At</span>
                  <span className="font-data text-[#06141B]">{formatDate(selectedContact.createdAt)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-b border-[rgba(6,20,27,0.05)] pb-3">
                <div>
                  <span className="text-xs text-[#5a6169] block font-data">Email</span>
                  <span className="font-data text-[#06141B]">{selectedContact.email}</span>
                </div>
                <div>
                  <span className="text-xs text-[#5a6169] block font-data">Phone Number</span>
                  <span className="font-data text-[#06141B]">{selectedContact.phoneNumber || "-"}</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-[#5a6169] block font-data">Subject</span>
                <strong className="font-data text-[#06141B] text-base">{selectedContact.subject}</strong>
              </div>
              <div>
                <span className="text-xs text-[#5a6169] block font-data mb-1">Message</span>
                <div className="bg-[#fbfbfa] p-4 rounded-xl border border-[rgba(6,20,27,0.08)] whitespace-pre-wrap text-[#06141B] font-data leading-relaxed max-h-[300px] overflow-y-auto">
                  {selectedContact.message}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
