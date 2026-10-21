"use client";

import ReplyStatus from "./ReplyStatus";
import type { TicketStatus } from "@/types/ticket";
import MessageBody from "./MessageBody";
import { useEffect, useState, type FormEvent } from "react";
import type { MessagesLoadState } from "@/types/message";
import { subscribeTicketMessages, createTicketMessage } from "@/utils/firebase/messages";
import { formatTokyoDateTime } from "@/utils/date";
import { getErrorMessage } from "@/utils/errors";
import { useAuth } from "@/app/components/AuthProvider";

interface TicketMessagesProps {
  ticketId: string;
  ticketAuthorId: string;
  onStatusChange: (status: TicketStatus) => void;
}

export default function TicketMessages({ ticketId, ticketAuthorId, onStatusChange }: TicketMessagesProps) {
  const { user } = useAuth();
  const [loadState, setLoadState] = useState<MessagesLoadState>({
    ticketId: null,
    messages: [],
    error: "",
  });
  const [newMessage, setNewMessage] = useState("");
  const [status, setStatus] = useState<TicketStatus | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeTicketMessages(
      ticketId,
      (updatedMessages) => {
        setLoadState({
          ticketId,
          messages: updatedMessages,
          error: "",
        });
      },
      (err) => {
        setLoadState({
          ticketId,
          messages: [],
          error: getErrorMessage(err),
        });
      }
    );

    return () => {
      unsubscribe();
    };
  }, [ticketId]);

  const loading = loadState.ticketId !== ticketId;
  const { messages, error } = loadState;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const content = newMessage.trim();
    if (submitting || !content) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      await createTicketMessage(ticketId, content, status || undefined);
      if (status) onStatusChange(status);
      setStatus("");
      setNewMessage("");
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-8 border-t border-gray-200 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-700 m-0">
          Conversation ({messages.length})
        </h3>
        <small className="text-gray-400">Real-time updates enabled</small>
      </div>

      {loading ? (
        <div className="py-6 text-center text-sm text-gray-500">Loading messages...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : messages.length === 0 ? (
        <div className="bg-white rounded-md p-6 text-center text-sm text-gray-500 shadow-sm border border-gray-100 my-4">
          No messages yet. Send a reply below to begin the discussion.
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          {messages.map((message) => {
            const isMe = user?.uid === message.user_id;
            const isAuthor = message.user_id === ticketAuthorId;

            return (
              <div
                key={message.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-2 mb-1 text-xs text-gray-500 px-1">
                  <span className={`font-semibold ${isMe ? "text-primary" : "text-gray-700"}`}>
                    {isMe ? "You" : message.user_email}
                  </span>
                  {isAuthor && (
                    <span className="bg-gray-200 text-gray-700 px-1.5 py-0.2 rounded text-[10px] font-medium">
                      Author
                    </span>
                  )}
                  <span>•</span>
                  <span>{formatTokyoDateTime(message.created_at)}</span>
                </div>

                <div
                  className={`rounded-lg p-4 text-sm w-full min-w-0 max-w-2xl break-words whitespace-pre-wrap shadow-sm ${
                    isMe
                      ? "bg-purple-50 text-gray-900 border border-purple-200"
                      : "bg-white text-gray-900 border border-gray-200"
                  }`}
                >
                  <MessageBody ticketId={ticketId} message={message} canEdit={isMe} onStatusChange={onStatusChange} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply Form */}
      <div className="bg-white rounded-md p-4 shadow-sm border border-gray-200 mt-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Leave a Reply</h4>
        <form onSubmit={handleSubmit} className="!w-full !max-w-full !p-0 !bg-transparent !m-0">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message or response here..."
            rows={3}
            maxLength={10000}
            aria-label="Reply"
            disabled={submitting}
            className="w-full border border-gray-300 rounded p-2.5 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
            required
          />

          <ReplyStatus value={status} onChange={setStatus} disabled={submitting} />
          {submitError && <div className="error my-2">{submitError}</div>}

          <div className="flex justify-end mt-2">
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || !newMessage.trim()}
            >
              {submitting ? "Sending..." : "Send Reply"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
