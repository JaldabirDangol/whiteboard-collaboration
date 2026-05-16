"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { X } from "lucide-react";
import {
	BoardMessage,
	deleteBoardMessage,
	getBoardMessages,
	sendBoardMessage,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { acquireSocket, releaseSocket } from "@/lib/board-socket";

type ChatProps = {
	boardId: string;
	currentUserId?: string;
	className?: string;
	onClose?: () => void;
	showMobileClose?: boolean;
	showHeader?: boolean;
};

const formatTimestamp = (dateLike: string) => {
	const date = new Date(dateLike);
	return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function Chat({
	boardId,
	currentUserId,
	className,
	onClose,
	showMobileClose = false,
	showHeader = true,
}: ChatProps) {
	const [messages, setMessages] = useState<BoardMessage[]>([]);
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(true);
	const [sending, setSending] = useState(false);
	const [onlineCount, setOnlineCount] = useState(1);

	const socketRef = useRef<Socket | null>(null);
	const listRef = useRef<HTMLDivElement | null>(null);

	const sortedMessages = useMemo(
		() => [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
		[messages]
	);

	const scrollToBottom = useCallback(() => {
		const container = listRef.current;
		if (!container) return;
		container.scrollTop = container.scrollHeight;
	}, []);

	useEffect(() => {
		let ignore = false;

		const loadMessages = async () => {
			setLoading(true);
			try {
				const data = await getBoardMessages(boardId);
				if (!ignore) {
					setMessages(data);
				}
			} catch {
				if (!ignore) {
					setMessages([]);
				}
			} finally {
				if (!ignore) {
					setLoading(false);
				}
			}
		};

		loadMessages();

		return () => {
			ignore = true;
		};
	}, [boardId]);

	useEffect(() => {
		scrollToBottom();
	}, [sortedMessages, scrollToBottom]);

	useEffect(() => {
		const socket = acquireSocket();
		socketRef.current = socket;

		// Do NOT emit board:join or presence:join here.
		// The main useBoardRealtime hook already handles that.
		// Chat only needs to join the socket.io room to receive messages.
		// The board:join from the main hook puts this socket's underlying
		// connection into the room. Since we reuse a shared socket,
		// we just listen for broadcast events.

		const onMessageSent = (message: BoardMessage) => {
			setMessages((prev) => {
				if (prev.some((msg) => msg.id === message.id)) {
					return prev;
				}
				return [...prev, message];
			});
		};

		const onMessageDeleted = (messageId: string) => {
			setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
		};

		const onUserOnline = () => {
			setOnlineCount((prev) => prev + 1);
		};

		const onUserOffline = () => {
			setOnlineCount((prev) => Math.max(1, prev - 1));
		};

		const onPresenceState = ({ userIds }: { boardId?: string; userIds?: string[] }) => {
			if (!Array.isArray(userIds)) return;
			setOnlineCount(Math.max(1, new Set(userIds).size));
		};

		socket.on("messageSent", onMessageSent);
		socket.on("messageDeleted", onMessageDeleted);
		socket.on("presence:userOnline", onUserOnline);
		socket.on("presence:userOffline", onUserOffline);
		socket.on("presence:state", onPresenceState);

		return () => {
			socket.off("messageSent", onMessageSent);
			socket.off("messageDeleted", onMessageDeleted);
			socket.off("presence:userOnline", onUserOnline);
			socket.off("presence:userOffline", onUserOffline);
			socket.off("presence:state", onPresenceState);
			socketRef.current = null;
			releaseSocket();
		};
	}, [boardId]);

	const handleSend = async () => {
		const value = input.trim();
		if (!value || sending) return;

		setSending(true);
		try {
			await sendBoardMessage(boardId, value);
			setInput("");
		} finally {
			setSending(false);
		}
	};

	const handleDelete = async (message: BoardMessage) => {
		const canDelete = currentUserId && message.userId === currentUserId;
		if (!canDelete) return;

		await deleteBoardMessage(message.id, boardId);
	};

	return (
		<aside className={cn("flex h-full min-h-0 w-full flex-col border-r border-slate-200 bg-slate-50/70", className)}>
			{showHeader ? (
				<div className="border-b border-slate-200 px-4 py-3">
					<div className="flex items-center justify-between gap-2">
						<div>
							<h2 className="text-sm font-semibold tracking-wide text-slate-900">Board Chat</h2>
							<p className="mt-1 text-xs text-slate-500">{onlineCount} online now</p>
						</div>
						{showMobileClose ? (
							<button
								type="button"
								onClick={onClose}
								className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 md:hidden"
							>
								<X className="h-4 w-4" />
							</button>
						) : null}
					</div>
				</div>
			) : null}

			<div ref={listRef} className="flex-1 min-h-0 space-y-3 overflow-y-auto px-4 py-4">
				{loading ? <p className="text-sm text-slate-500">Loading messages...</p> : null}

				{!loading && sortedMessages.length === 0 ? (
					<p className="text-sm text-slate-500">No messages yet. Start the conversation.</p>
				) : null}

				{sortedMessages.map((message) => {
					const isMine = currentUserId ? message.userId === currentUserId : false;
					const sender = message.user?.name || message.user?.email || "Anonymous";

					return (
						<div
							key={message.id}
							className={`max-w-[92%] rounded-xl px-3 py-2 shadow-sm ${
								isMine ? "ml-auto border border-indigo-200 bg-indigo-50 text-indigo-950" : "border border-slate-200 bg-white text-slate-900"
							}`}
						>
							<div className="mb-1 flex items-center justify-between gap-2">
								<span className={`text-[10px] font-medium ${isMine ? "text-indigo-700" : "text-slate-500"}`}>
									{sender}
								</span>
								<span className={`text-[10px] ${isMine ? "text-indigo-700" : "text-slate-500"}`}>
									{formatTimestamp(message.createdAt)}
								</span>
							</div>
							<p className="break-words text-sm leading-relaxed">{message.content}</p>

							{isMine ? (
								<button
									type="button"
									onClick={() => handleDelete(message)}
									className="mt-2 text-[10px] text-rose-600 transition hover:text-rose-700"
								>
									Delete
								</button>
							) : null}
						</div>
					);
				})}
			</div>

			<div className="border-t border-slate-200 px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
				<div className="flex items-center gap-2">
					<input
						value={input}
						onChange={(event) => setInput(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.preventDefault();
								handleSend();
							}
						}}
						placeholder="Type a message..."
						className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
					/>
					<button
						type="button"
						onClick={handleSend}
						disabled={sending || !input.trim()}
						className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
					>
						Send
					</button>
				</div>
			</div>
		</aside>
	);
}
