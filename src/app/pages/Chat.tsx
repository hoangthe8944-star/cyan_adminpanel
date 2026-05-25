import { FormEvent, useMemo, useRef, useState } from "react";
import { Bot, LoaderCircle, Send, Sparkles, User } from "lucide-react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { adminApi } from "../lib/api";
import type { AdminChatMessage } from "../lib/types";

const STARTER_PROMPTS = [
  "Tom tat cac tinh nang cua trang Products de onboarding nhan vien moi.",
  "Viet noi dung banner khuyen mai 20% theo tone sang trong cho Cyan Jewelry.",
  "Goi y 5 y tuong upsell cho khach da mua nhan cuoi.",
];

const INITIAL_MESSAGES: AdminChatMessage[] = [
  {
    role: "assistant",
    content:
      "Xin chao. Toi la AI assistant cho admin Cyan Jewelry. Ban co the nhan toi viet noi dung, tom tat du lieu, ho tro van hanh, hoac len y tuong san pham.",
  },
];

function MessageBubble({ message }: { message: AdminChatMessage }) {
  const isAssistant = message.role === "assistant";

  return (
    <div className={`flex gap-3 ${isAssistant ? "justify-start" : "justify-end"}`}>
      {isAssistant ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#06141B] text-[#EDD987]">
          <Bot className="h-5 w-5" />
        </div>
      ) : null}

      <div
        className={`max-w-[min(720px,100%)] rounded-3xl px-4 py-3 text-sm leading-7 shadow-sm ${
          isAssistant
            ? "border border-[rgba(6,20,27,0.08)] bg-white text-[#06141B]"
            : "bg-[#06141B] text-white"
        }`}
      >
        <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.2em] opacity-70">
          {isAssistant ? "Assistant" : "You"}
        </div>
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
      </div>

      {!isAssistant ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(237,217,135,0.28)] text-[#7b5327]">
          <User className="h-5 w-5" />
        </div>
      ) : null}
    </div>
  );
}

export function Chat() {
  const [messages, setMessages] = useState<AdminChatMessage[]>(INITIAL_MESSAGES);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [model, setModel] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  const messageCount = useMemo(() => messages.filter((message) => message.role === "user").length, [messages]);

  const scrollToBottom = () => {
    window.requestAnimationFrame(() => {
      if (!listRef.current) {
        return;
      }

      listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  };

  const sendMessage = async (content: string) => {
    const normalized = content.trim();
    if (!normalized || isSending) {
      return;
    }

    const nextMessages = [...messages, { role: "user" as const, content: normalized }];
    setMessages(nextMessages);
    setDraft("");
    setError("");
    setIsSending(true);
    scrollToBottom();

    try {
      const response = await adminApi.chat(nextMessages);
      setModel(response.model);
      setMessages((current) => [...current, response.message]);
      scrollToBottom();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong the gui tin nhan luc nay.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendMessage(draft);
  };

  return (
    <div className="flex min-h-full flex-col p-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-heading mb-2">AI Chat Assistant</h1>
          <p className="max-w-2xl text-[#5a6169]">
            Ho tro team admin viet content, tom tat yeu cau, len y tuong campaign, va thao tac nhanh hon ngay trong dashboard.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Badge className="border-0 bg-[rgba(237,217,135,0.2)] px-3 py-1 text-[#7b5327]">
            <Sparkles className="mr-2 h-3.5 w-3.5" />
            {messageCount} prompt da gui
          </Badge>
          {model ? (
            <Badge className="border border-[rgba(6,20,27,0.08)] bg-white px-3 py-1 text-[#06141B]">{model}</Badge>
          ) : null}
        </div>
      </div>

      <div className="grid flex-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="h-fit border-[rgba(6,20,27,0.1)] bg-white p-5">
          <h2 className="font-heading text-[20px] text-[#06141B]">Prompt Goi Y</h2>
          <p className="mt-2 text-sm leading-6 text-[#5a6169]">
            Bam mot mau de bat dau nhanh. Ban van co the sua lai truoc khi gui.
          </p>

          <div className="mt-5 space-y-3">
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="w-full rounded-2xl border border-[rgba(6,20,27,0.08)] bg-[#fbfbfa] p-4 text-left text-sm leading-6 text-[#06141B] transition-colors hover:border-[rgba(163,107,49,0.35)] hover:bg-[rgba(237,217,135,0.12)]"
                onClick={() => setDraft(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        </Card>

        <Card className="flex min-h-[70vh] flex-col overflow-hidden border-[rgba(6,20,27,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,249,249,1))]">
          <div className="border-b border-[rgba(6,20,27,0.08)] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#06141B] text-[#EDD987]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-heading text-[20px] text-[#06141B]">Workspace Chat</h2>
                <p className="text-sm text-[#5a6169]">Hoi dap noi bo cho van hanh, content va merchandising.</p>
              </div>
            </div>
          </div>

          <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto bg-[rgba(248,249,249,0.86)] px-6 py-6">
            {messages.map((message, index) => (
              <MessageBubble key={`${message.role}-${index}-${message.content.slice(0, 24)}`} message={message} />
            ))}

            {isSending ? (
              <div className="flex gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#06141B] text-[#EDD987]">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="inline-flex items-center gap-2 rounded-3xl border border-[rgba(6,20,27,0.08)] bg-white px-4 py-3 text-sm text-[#5a6169]">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Dang suy nghi...
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-[rgba(6,20,27,0.08)] bg-white px-6 py-5">
            {error ? (
              <div className="mb-3 rounded-2xl border border-[rgba(220,38,38,0.18)] bg-[rgba(254,242,242,0.9)] px-4 py-3 text-sm text-[#b91c1c]">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-3">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Nhap prompt cho AI assistant..."
                className="min-h-32 rounded-3xl border-[rgba(6,20,27,0.12)] bg-[#fbfbfa] px-4 py-3"
                disabled={isSending}
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[#5a6169]">
                  API key duoc giu o server qua route <code>/api/chat</code>.
                </p>

                <Button
                  type="submit"
                  className="h-11 rounded-2xl bg-[#06141B] px-6 text-white hover:bg-[#0a1f29]"
                  disabled={isSending || !draft.trim()}
                >
                  {isSending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Gui Tin Nhan
                </Button>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
