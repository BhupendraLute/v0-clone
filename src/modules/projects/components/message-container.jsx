import {
	useGetMessages,
	prefetchMessage,
} from "@/modules/messages/hooks/message";
import { useEffect, useRef } from "react";
import { MessageRole, MessageType } from "@/generated/prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import MessageCard from "./message-card";
import MessageForm from "./message-form";
import MessageLoading from "./message-loading";

const MessageContainer = ({ projectId, activeFragment, setActiveFragment }) => {
	const queryClient = useQueryClient();
	const bottomRef = useRef(null);
	const lastAssistantMessageIdRef = useRef(null);

	const {
		data: messages,
		isPending,
		isError,
		error,
	} = useGetMessages(projectId);

	useEffect(() => {
		if (projectId) {
			prefetchMessage(queryClient, projectId);
		}
	}, [projectId, queryClient]);

	useEffect(() => {
		const lastAssistantMessage = messages?.findLast(
			(message) => message.role === MessageRole.ASSISTANT,
		);
		if (
			lastAssistantMessage?.fragments &&
			lastAssistantMessage.id !== lastAssistantMessageIdRef.current
		) {
			setActiveFragment(lastAssistantMessage?.fragments);
			lastAssistantMessageIdRef.current = lastAssistantMessage.id;
		}
	}, [messages, setActiveFragment]);

	useEffect(() => {
		if (!messages || messages.length === 0) return;

		const lastMessage = messages[messages.length - 1];
		const isLastMessageUser = lastMessage.role === MessageRole.USER;

		if (!isLastMessageUser) {
			bottomRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages?.length, messages]);

	if (isPending) {
		return (
			<div className="flex items-center justify-center h-full">
				<Spinner className={"text-emerald-400"} />
			</div>
		);
	}

	if (isError) {
		return (
			<div className="flex items-center justify-center h-full text-red-500">
				Error: {error?.message || "Failed to load messages."}
			</div>
		);
	}

	if (!messages || messages.length === 0) {
		return (
			<div className="flex flex-col flex-1 min-h-0">
				<div className="flex-1 flex items-center justify-center overflow-y-auto">
					<p className="text-muted-foreground">No messages yet...</p>
				</div>
				<div className="relative p-3 pt-1">
					<div className="absolute -top-6 left-0 right-0 h-6 bg-linear-to-b from-transparent to-background pointer-events-none" />
				</div>
			</div>
		);
	}

	const lastMessage = messages[messages.length - 1];
	const isLastMessageUser = lastMessage.role === MessageRole.USER;
	const isStuck = isLastMessageUser && (new Date() - new Date(lastMessage.createdAt)) > 3 * 60 * 1000;

	return (
		<div className="flex flex-col flex-1 min-h-0">
			<div className="flex-1 min-h-0 overflow-y-auto">
				{messages?.map((message) => (
					<MessageCard
						key={message.id}
						content={message.content}
						role={message.role}
						fragment={message.fragments}
						createdAt={message.createdAt}
						isActiveFragment={
							activeFragment?.id === message.fragments?.id
						}
						onFragmentClick={() =>
							setActiveFragment(message.fragments)
						}
						type={message.type}
					/>
				))}
				{isLastMessageUser && !isStuck && <MessageLoading />}
				{isStuck && (
					<MessageCard
						content="The agent stopped responding or the run timed out. Please try sending a new message."
						role={MessageRole.ASSISTANT}
						type={MessageType.ERROR}
						createdAt={new Date()}
					/>
				)}
				<div ref={bottomRef} />
			</div>
			<div className="relative p-3 pt-1">
				<div className="absolute -top-6 left-0 right-0 h-6 bg-linear-to-b from-transparent to-background pointer-events-none" />
				<MessageForm projectId={projectId} />
			</div>
		</div>
	);
};

export default MessageContainer;
