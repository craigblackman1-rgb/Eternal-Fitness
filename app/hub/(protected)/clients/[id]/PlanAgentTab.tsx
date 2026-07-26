"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { HubCard, HubCardHeader } from "@/components/hub";
import { Badge } from "@/components/ui/badge";
import { IconBot, IconLoader2, IconPlus, IconSend } from "@/components/icons";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface PlanAgentTabProps {
  clientNumber: number;
  clientName: string;
  paceMode: string;
}

const STARTER_PROMPTS = [
  "What should Block 1 focus on for this client?",
  "Review the last block and suggest what comes next.",
  "Build a plan taking into account the outstanding actions.",
  "What adaptations does this client need in every session?",
];

export function PlanAgentTab({ clientNumber, clientName, paceMode }: PlanAgentTabProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [generatingBlock, setGeneratingBlock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

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
      const response = await fetch("/api/claude/plan-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientNumber, messages: updatedMessages }),
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

  async function generateBlock() {
    if (messages.length === 0) return;
    setGeneratingBlock(true);
    setError(null);

    const lastAssistantMessage = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");

    const conversationSummary = messages
      .map((m) => `${m.role === "user" ? "Esther" : "Agent"}: ${m.content}`)
      .join("\n\n");

    try {
      const response = await fetch("/api/claude/generate-block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientNumber,
          blockNote: lastAssistantMessage?.content.slice(0, 500) ?? "",
          previousSummary: conversationSummary.slice(0, 2000),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to generate block");
      }

      const { blockId } = await response.json();
      router.push(`/hub/clients/${clientNumber}/blocks/${blockId}/review`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate block");
    } finally {
      setGeneratingBlock(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const hasConversation = messages.length > 0;
  const lastMessageIsAssistant = messages[messages.length - 1]?.role === "assistant";

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal/10 flex items-center justify-center">
            <IconBot className="w-4 h-4 text-teal" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Plan Agent</p>
            <p className="text-xs text-muted-foreground">
              {clientName} &middot; {paceMode.charAt(0).toUpperCase() + paceMode.slice(1)} pace
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasConversation && lastMessageIsAssistant && !streaming && (
            <Button
              onClick={generateBlock}
              disabled={generatingBlock}
              className="rounded-lg gap-1.5 bg-rose hover:bg-rose/90 text-white"
            >
              {generatingBlock ? (
                <IconLoader2 className="h-4 w-4 animate-spin" />
              ) : (
                <IconPlus className="h-4 w-4" />
              )}
              Create Block
            </Button>
          )}
        </div>
      </div>

      {!hasConversation && (
        <div className="grid grid-cols-2 gap-2">
          {STARTER_PROMPTS.map((prompt) => (
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
        <HubCard>
          <HubCardHeader icon={<IconBot className="w-4 h-4" />} title="Conversation" color="teal" noBottomPadding />
          <div className="px-5 pb-5 space-y-4 max-h-[520px] overflow-y-auto">
            {messages.map((message, i) => (
              <div
                key={i}
                className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    message.role === "user"
                      ? "bg-rose/15 text-rose"
                      : "bg-teal/10 text-teal"
                  }`}
                >
                  {message.role === "user" ? "E" : <IconBot className="w-3.5 h-3.5" />}
                </div>
                <div
                  className={`flex-1 rounded-xl px-4 py-3 text-sm ${
                    message.role === "user"
                      ? "bg-rose/8 text-foreground max-w-[80%] ml-auto"
                      : "bg-off-white/60 text-foreground"
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

      {error && (
        <div className="p-3 rounded-lg bg-rose/8 border border-rose/20 text-sm text-rose">
          {error}
        </div>
      )}

      {hasConversation && lastMessageIsAssistant && !streaming && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <Badge variant="outline" className="rounded-full text-xs">
            {messages.filter((m) => m.role === "user").length} messages
          </Badge>
          <span>When ready, click Create Block to turn this conversation into a draft block.</span>
        </div>
      )}

      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about this client's programme, or describe what you want to build..."
          rows={2}
          disabled={streaming}
          className="flex-1 resize-none rounded-xl border border-border/60 bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose/30 focus:border-rose/40 disabled:opacity-50 transition-colors"
        />
        <Button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || streaming}
          className="rounded-xl bg-rose hover:bg-rose/90 text-white h-[68px] w-[52px] shrink-0"
        >
          {streaming ? (
            <IconLoader2 className="h-4 w-4 animate-spin" />
          ) : (
            <IconSend className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground px-1">Enter to send &middot; Shift+Enter for new line</p>
    </div>
  );
}
