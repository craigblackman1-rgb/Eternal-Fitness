"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { HubCard } from "@/components/hub";
import { Badge } from "@/components/ui/badge";
import { IconBot, IconLoader2, IconSparkles, IconSend, IconAlertTriangle } from "@/components/icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface UpdateChatPanelProps {
  clientNumber: number;
  clientName: string;
  templateKind: string;
  starterPrompts: string[];
  generating: boolean;
  onCreateDraft: (conversationSummary: string) => void;
}

export function UpdateChatPanel({
  clientNumber,
  clientName,
  templateKind,
  starterPrompts,
  generating,
  onCreateDraft,
}: UpdateChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const CONVERSATION_SUMMARY_CAP = 20000;

  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(content: string) {
    if (!content.trim() || streaming) return;

    const userMessage: Message = { role: "user", content: content.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setError(null);
    setStreaming(true);

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const response = await fetch("/api/claude/update-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientNumber, messages: updatedMessages, templateKind }),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.statusText}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: updated[updated.length - 1].content + text,
          };
          return updated;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  }

  function handleCreateDraft() {
    const conversationSummary = messages
      .map((m) => `${m.role === "user" ? "Esther" : "Agent"}: ${m.content}`)
      .join("\n\n");
    if (conversationSummary.length > CONVERSATION_SUMMARY_CAP) {
      setTruncated(true);
    }
    onCreateDraft(conversationSummary.slice(0, CONVERSATION_SUMMARY_CAP));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const hasConversation = messages.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-dark-navy/10 flex items-center justify-center">
            <IconBot className="w-4 h-4 text-dark-navy" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Update Agent</p>
            <p className="text-xs text-muted-foreground">{clientName}</p>
          </div>
        </div>
        <Button
          onClick={handleCreateDraft}
          disabled={generating || streaming}
          className="rounded-lg gap-1.5 bg-rose hover:bg-rose/90 text-white"
        >
          {generating ? <IconLoader2 className="h-4 w-4 animate-spin" /> : <IconSparkles className="h-4 w-4" />}
          Create Draft
        </Button>
      </div>

      {!hasConversation && (
        <div className="grid grid-cols-2 gap-2">
          {starterPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              className="text-left p-3 rounded-xl border border-border/60 text-sm text-muted-foreground hover:border-rose/20 hover:text-foreground hover:bg-off-white transition-all"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {hasConversation && (
        <HubCard className="shadow-sm" padded={false}>
          <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto">
            {messages.map((message, i) => (
              <div key={i} className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    message.role === "user" ? "bg-rose/15 text-rose" : "bg-dark-navy/10 text-dark-navy"
                  }`}
                >
                  {message.role === "user" ? "E" : <IconBot className="w-3.5 h-3.5" />}
                </div>
                <div
                  className={`flex-1 rounded-xl px-4 py-3 text-sm ${
                    message.role === "user" ? "bg-rose/8 text-foreground max-w-[80%] ml-auto" : "bg-off-white/60 text-foreground"
                  }`}
                >
                  {message.content === "" && streaming ? (
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                    </span>
                  ) : message.role === "assistant" ? (
                    <div className="plan-agent-md leading-relaxed">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </HubCard>
      )}

      {error && <div className="p-3 rounded-lg bg-rose/8 border border-rose/20 text-sm text-rose">{error}</div>}

      {truncated && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber/12 border border-amber/30 text-sm text-amber">
          <IconAlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Your conversation is longer than the 20,000-character draft limit.</p>
            <p className="mt-0.5">
              Only the first 20,000 characters will be sent to the AI for draft generation. If your conversation
              covered topics after that point, they won&rsquo;t appear in the generated draft and you&rsquo;ll need
              to fill those sections manually. To avoid this, keep your chat concise or start a new conversation
              for a second update.
            </p>
          </div>
        </div>
      )}

      {hasConversation && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <Badge variant="outline" className="rounded-full text-xs">
            {messages.filter((m) => m.role === "user").length} messages
          </Badge>
          <span>When ready, click Create Draft — data-only is fine too if there's nothing more to add.</span>
        </div>
      )}

      <div className="flex gap-2 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tell the agent what happened this block, what's worth saying, what's next..."
          rows={2}
          disabled={streaming}
          className="flex-1 resize-none rounded-xl border border-border/60 bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose/30 focus:border-rose/40 disabled:opacity-50 transition-colors"
        />
        <Button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || streaming}
          className="rounded-xl bg-rose hover:bg-rose/90 text-white h-[68px] w-[52px] shrink-0"
        >
          {streaming ? <IconLoader2 className="h-4 w-4 animate-spin" /> : <IconSend className="h-4 w-4" />}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground px-1">Enter to send &middot; Shift+Enter for new line</p>
    </div>
  );
}
