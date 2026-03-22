"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
	BoardMessage,
	deleteBoardMessage,
	getBoardMessages,
	sendBoardMessage,
} from "@/lib/api";

type ChatProps = {
	boardId: string;
	currentUserId?: string;
};

const getSocketUrl = () => {
	if (process.env.NEXT_PUBLIC_SOCKET_URL) {
		return process.env.NEXT_PUBLIC_SOCKET_URL;
	}

	if (process.env.NEXT_PUBLIC_API_URL) {
		return process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, "");
	}

	return "http://localhost:3050";
};

const formatTimestamp = (dateLike: string) => {
	const date = new Date(dateLike);
	return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function Chat({ boardId, currentUserId }: ChatProps) {
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
			} catch (error) {
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
		const socket = io(getSocketUrl(), {
			withCredentials: true,
			transports: ["websocket"],
		});

		socketRef.current = socket;
		socket.emit("board:join", boardId);
		socket.emit("presence:join", { boardId });

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

		socket.on("messageSent", onMessageSent);
		socket.on("messageDeleted", onMessageDeleted);
		socket.on("presence:userOnline", onUserOnline);
		socket.on("presence:userOffline", onUserOffline);

		return () => {
			socket.emit("presence:leave", { boardId });
			socket.emit("board:leave", boardId);
			socket.off("messageSent", onMessageSent);
			socket.off("messageDeleted", onMessageDeleted);
			socket.off("presence:userOnline", onUserOnline);
			socket.off("presence:userOffline", onUserOffline);
			socket.disconnect();
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
		<aside className="h-full w-85 border-r border-slate-200 bg-slate-50/80 backdrop-blur-sm">
			<div className="border-b border-slate-200 px-4 py-3">
				<h2 className="text-sm font-semibold tracking-wide text-slate-900">Board Chat</h2>
				<p className="mt-1 text-xs text-slate-500">{onlineCount} online now</p>
			</div>

			<div ref={listRef} className="h-[calc(100%-130px)] space-y-3 overflow-y-auto px-4 py-4">
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
								isMine ? "ml-auto bg-slate-900 text-white" : "bg-white text-slate-900"
							}`}
						>
							<div className="mb-1 flex items-center justify-between gap-2">
								<span className={`text-[10px] font-medium ${isMine ? "text-slate-300" : "text-slate-500"}`}>
									{sender}
								</span>
								<span className={`text-[10px] ${isMine ? "text-slate-300" : "text-slate-500"}`}>
									{formatTimestamp(message.createdAt)}
								</span>
							</div>
							  <p className="wrap-break-word text-sm leading-relaxed">{message.content}</p>

							{isMine ? (
								<button
									type="button"
									onClick={() => handleDelete(message)}
									className="mt-2 text-[10px] text-rose-300 transition hover:text-rose-200"
								>
									Delete
								</button>
							) : null}
						</div>
					);
				})}
			</div>

			<div className="border-t border-slate-200 px-3 py-3">
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
						className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
					>
						Send
					</button>
				</div>
			</div>
		</aside>
	);
}
