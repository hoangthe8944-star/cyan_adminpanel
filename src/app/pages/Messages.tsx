import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, MessageCircleMore, RefreshCcw, Send, Trash2 } from "lucide-react";

import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { adminApi } from "../lib/api";
import type { ConversationDetail, ConversationMessage, ConversationParticipant, ConversationSummary } from "../lib/types";

const DEFAULT_ADMIN_NAME = "Oriven Admin";
const POLLING_INTERVAL_MS = 3000;
const DELETE_HOLD_MS = 1200;

function getParticipantInitials(name: string) {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "NA"
  );
}

function formatMessageTime(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatConversationTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("vi-VN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolveRemoteParticipant(conversation: ConversationSummary | null, adminName: string) {
  if (!conversation) {
    return null;
  }

  const lowerAdminName = adminName.trim().toLowerCase();
  return (
    conversation.participants.find((participant) => participant.name.trim().toLowerCase() !== lowerAdminName) ||
    conversation.participants[0] ||
    null
  );
}

export function Messages() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [adminName, setAdminName] = useState(DEFAULT_ADMIN_NAME);
  const [messageInput, setMessageInput] = useState("");
  const [error, setError] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [deletingConversationId, setDeletingConversationId] = useState("");
  const [holdTargetConversationId, setHoldTargetConversationId] = useState("");
  const [deleteHoldProgress, setDeleteHoldProgress] = useState(0);
  const deleteHoldTimeoutRef = useRef<number | null>(null);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) || detail?.conversation || null,
    [conversations, detail, selectedConversationId]
  );

  const remoteParticipant = useMemo(
    () => resolveRemoteParticipant(selectedConversation, adminName),
    [selectedConversation, adminName]
  );

  const messages = detail?.messages ?? [];

  const loadConversations = async (keepSelection = true, silent = false) => {
    try {
      if (!silent) {
        setIsLoadingConversations(true);
      }

      const data = await adminApi.conversations();
      setConversations(data);
      setSelectedConversationId((current) => {
        if (keepSelection && current && data.some((conversation) => conversation.id === current)) {
          return current;
        }

        return data[0]?.id || "";
      });
      setError("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load conversations");
    } finally {
      if (!silent) {
        setIsLoadingConversations(false);
      }
    }
  };

  const loadConversationDetail = async (
    conversationId: string,
    options: { shouldMarkRead?: boolean; silent?: boolean } = {}
  ) => {
    if (!conversationId) {
      setDetail(null);
      return;
    }

    const { shouldMarkRead = false, silent = false } = options;

    try {
      if (!silent) {
        setIsLoadingMessages(true);
      }

      const nextDetail = shouldMarkRead
        ? await adminApi.markConversationRead(conversationId)
        : await adminApi.conversationDetail(conversationId);

      setDetail(nextDetail);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === nextDetail.conversation.id ? { ...conversation, ...nextDetail.conversation, unreadCount: 0 } : conversation
        )
      );
      setError("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load messages");
    } finally {
      if (!silent) {
        setIsLoadingMessages(false);
      }
    }
  };

  const clearDeleteHold = () => {
    if (deleteHoldTimeoutRef.current) {
      window.clearTimeout(deleteHoldTimeoutRef.current);
      deleteHoldTimeoutRef.current = null;
    }

    setHoldTargetConversationId("");
    setDeleteHoldProgress(0);
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (deletingConversationId) {
      return;
    }

    setDeletingConversationId(conversationId);
    setError("");

    try {
      await adminApi.deleteConversation(conversationId);
      setConversations((current) => current.filter((conversation) => conversation.id !== conversationId));
      setSelectedConversationId((current) => (current === conversationId ? "" : current));
      setDetail((current) => (current?.conversation.id === conversationId ? null : current));
      await loadConversations(false, true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to delete conversation");
    } finally {
      setDeletingConversationId("");
      clearDeleteHold();
    }
  };

  const startDeleteHold = (conversationId: string) => {
    if (deletingConversationId) {
      return;
    }

    clearDeleteHold();
    setHoldTargetConversationId(conversationId);
    setDeleteHoldProgress(0);

    window.requestAnimationFrame(() => {
      setDeleteHoldProgress(100);
    });

    deleteHoldTimeoutRef.current = window.setTimeout(() => {
      handleDeleteConversation(conversationId);
    }, DELETE_HOLD_MS);
  };

  useEffect(() => {
    loadConversations(false);
  }, []);

  useEffect(() => {
    if (!selectedConversationId) {
      setDetail(null);
      return;
    }

    loadConversationDetail(selectedConversationId, { shouldMarkRead: true });

    const intervalId = window.setInterval(() => {
      loadConversationDetail(selectedConversationId, { silent: true });
      loadConversations(true, true);
    }, POLLING_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [selectedConversationId]);

  useEffect(() => {
    return () => {
      if (deleteHoldTimeoutRef.current) {
        window.clearTimeout(deleteHoldTimeoutRef.current);
      }
    };
  }, []);

  const handleManualRefresh = async () => {
    await loadConversations(true);
    if (selectedConversationId) {
      await loadConversationDetail(selectedConversationId);
    }
  };

  const handleSendMessage = async () => {
    const message = messageInput.trim();
    if (!selectedConversationId || !message || isSendingMessage) {
      return;
    }

    setIsSendingMessage(true);
    setError("");

    try {
      const nextDetail = await adminApi.sendConversationMessage(selectedConversationId, {
        adminName: adminName.trim() || DEFAULT_ADMIN_NAME,
        message,
      });

      setDetail(nextDetail);
      setMessageInput("");
      await loadConversations(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to send message");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const isOwnMessage = (sender: ConversationParticipant) => sender.name.trim().toLowerCase() === adminName.trim().toLowerCase();

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="font-heading mb-2">Messages</h1>
          <p className="text-[#5a6169]">Each customer has a separate conversation thread. Pick one on the left to reply.</p>
        </div>
        <div className="w-full max-w-[320px]">
          <Label>Admin Name</Label>
          <Input value={adminName} onChange={(event) => setAdminName(event.target.value)} className="mt-1.5 bg-white" />
        </div>
      </div>

      {error ? <div className="mb-4 text-sm text-red-600">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="max-h-[720px] border-[rgba(6,20,27,0.1)] bg-white p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-heading">User Conversations</h3>
              <p className="mt-1 text-sm text-[#5a6169]">One thread per user or customer case.</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={isLoadingConversations || isLoadingMessages}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>

          <div className="mb-4 rounded-2xl bg-[rgba(237,217,135,0.12)] px-4 py-3 text-sm text-[#7b5327]">
            The list auto-refreshes every {POLLING_INTERVAL_MS / 1000} seconds and follows the Spring admin chat routes.
          </div>

          <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
            {isLoadingConversations ? (
              <div className="flex items-center gap-2 rounded-2xl border border-[rgba(6,20,27,0.08)] px-4 py-5 text-sm text-[#5a6169]">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Loading conversations...
              </div>
            ) : null}

            {!isLoadingConversations && !conversations.length ? (
              <div className="rounded-2xl border border-[rgba(6,20,27,0.08)] px-4 py-6 text-sm text-[#5a6169]">
                No conversations were returned by the API yet.
              </div>
            ) : null}

            {conversations.map((conversation) => {
              const active = conversation.id === selectedConversationId;
              const participant = resolveRemoteParticipant(conversation, adminName);

              return (
                <div
                  key={conversation.id}
                  className={`w-full rounded-2xl border p-4 transition ${
                    active
                      ? "border-[rgba(163,107,49,0.45)] bg-[rgba(237,217,135,0.12)]"
                      : "border-[rgba(6,20,27,0.08)] bg-[#fbfbfa] hover:bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedConversationId(conversation.id)}
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    >
                      <Avatar>
                        <AvatarFallback className="bg-[rgba(6,20,27,0.1)] text-[#06141B]">
                          {getParticipantInitials(participant?.name || conversation.title)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-medium text-[#06141B]">{participant?.name || conversation.title}</div>
                            <div className="truncate text-sm text-[#5a6169]">{conversation.lastMessage || "No messages yet"}</div>
                            <div className="mt-1 text-xs text-[#7b858e]">
                              {conversation.status || "OPEN"}
                              {conversation.assignedAdminName ? ` · ${conversation.assignedAdminName}` : ""}
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <div className="text-xs text-[#7b858e]">{formatConversationTime(conversation.lastMessageAt)}</div>
                            {conversation.unreadCount ? (
                              <div className="mt-2 inline-flex min-w-6 items-center justify-center rounded-full bg-[#06141B] px-2 py-1 text-xs text-white">
                                {conversation.unreadCount}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </button>

                    <div className="shrink-0 text-right">
                      <button
                        type="button"
                        aria-label={`Delete conversation ${conversation.id}`}
                        title="Hold to delete conversation"
                        onMouseDown={() => startDeleteHold(conversation.id)}
                        onMouseUp={clearDeleteHold}
                        onMouseLeave={clearDeleteHold}
                        onTouchStart={() => startDeleteHold(conversation.id)}
                        onTouchEnd={clearDeleteHold}
                        disabled={Boolean(deletingConversationId)}
                        className="mb-2 ml-auto flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(182,47,47,0.18)] bg-white text-[#b62f2f] transition hover:bg-[rgba(182,47,47,0.08)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingConversationId === conversation.id ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>

                      {holdTargetConversationId === conversation.id ? (
                        <div className="mb-2 ml-auto h-1.5 w-16 overflow-hidden rounded-full bg-[rgba(182,47,47,0.12)]">
                          <div
                            className="h-full bg-[#b62f2f]"
                            style={{ width: `${deleteHoldProgress}%`, transition: `width ${DELETE_HOLD_MS}ms linear` }}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="flex h-[720px] max-h-[720px] flex-col overflow-hidden border-[rgba(6,20,27,0.1)] bg-white p-0">
          <div className="flex items-center justify-between border-b border-[rgba(6,20,27,0.08)] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-[rgba(237,217,135,0.18)] p-3 text-[#7b5327]">
                <MessageCircleMore className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-heading text-[20px]">{remoteParticipant?.name || selectedConversation?.title || "Conversation"}</h3>
                <p className="text-sm text-[#5a6169]">
                  {selectedConversation?.status || "Open"}
                  {selectedConversation?.assignedAdminName ? ` · Assigned to ${selectedConversation.assignedAdminName}` : ""}
                </p>
              </div>
            </div>
            <div className="text-right text-xs text-[#7b858e]">
              <div>Conversation ID</div>
              <div className="font-data text-[#06141B]">{selectedConversation?.id || "-"}</div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden bg-[linear-gradient(180deg,rgba(248,249,249,0.2),rgba(237,217,135,0.08))] px-6 py-5">
            <div className="h-full space-y-4 overflow-y-auto pr-1">
              {isLoadingMessages ? (
                <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm text-[#5a6169] shadow-[0_8px_30px_rgba(6,20,27,0.06)]">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Syncing messages...
                </div>
              ) : null}

              {!isLoadingMessages && !selectedConversationId ? (
                <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-[rgba(6,20,27,0.12)] bg-white/75 text-sm text-[#5a6169]">
                  Select a conversation on the left to open that user's thread.
                </div>
              ) : null}

              {!isLoadingMessages && selectedConversationId && !messages.length ? (
                <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-[rgba(6,20,27,0.12)] bg-white/75 text-sm text-[#5a6169]">
                  This conversation has no messages yet.
                </div>
              ) : null}

              {messages.map((message: ConversationMessage) => {
                const mine = isOwnMessage(message.sender);

                return (
                  <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[78%]">
                      <div
                        className={`rounded-[26px] px-4 py-3 text-sm leading-6 shadow-[0_10px_30px_rgba(6,20,27,0.06)] ${
                          mine ? "bg-[#06141B] text-white" : "bg-white text-[#06141B]"
                        }`}
                      >
                        <div className="mb-1 text-[11px] uppercase tracking-[0.18em] opacity-70">{mine ? "You" : message.sender.name}</div>
                        <div className="whitespace-pre-wrap break-words">{message.content}</div>
                      </div>

                      <div className={`mt-1 px-1 text-xs text-[#7b858e] ${mine ? "text-right" : "text-left"}`}>
                        {formatMessageTime(message.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-[rgba(6,20,27,0.08)] bg-white px-6 py-5">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <div>
                <Label>Reply To This User</Label>
                <Textarea
                  className="mt-1.5 min-h-28 bg-[#fbfbfa]"
                  value={messageInput}
                  onChange={(event) => setMessageInput(event.target.value)}
                  placeholder="Write a reply for the selected conversation..."
                  disabled={!selectedConversationId || isSendingMessage}
                />
              </div>

              <Button
                className="h-12 bg-[#06141B] px-6 text-white hover:bg-[#0a1f29]"
                onClick={handleSendMessage}
                disabled={!selectedConversationId || !messageInput.trim() || isSendingMessage}
              >
                {isSendingMessage ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send Message
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
