"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	ResizablePanelGroup,
	ResizablePanel,
	ResizableHandle,
} from "@/components/ui/resizable";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import ProjectHeader from "./project-header";
import MessageContainer from "./message-container";
import {
	Code2Icon,
	PlayIcon,
	ExternalLinkIcon,
	CopyIcon,
	CheckIcon,
	FileCode2Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ProjectView = ({ projectId }) => {
	const [activeFragment, setActiveFragment] = useState(null);
	const [selectedFilePath, setSelectedFilePath] = useState(null);
	const [copied, setCopied] = useState(false);
	const [copiedUrl, setCopiedUrl] = useState(false);

	useEffect(() => {
		if (activeFragment && activeFragment.files) {
			const paths = Object.keys(activeFragment.files);
			if (paths.length > 0) {
				setSelectedFilePath(paths[0]);
			} else {
				setSelectedFilePath(null);
			}
		} else {
			setSelectedFilePath(null);
		}
	}, [activeFragment]);

	const handleCopy = async () => {
		if (!activeFragment || !selectedFilePath) return;
		const content = activeFragment.files[selectedFilePath] || "";
		try {
			await navigator.clipboard.writeText(content);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy code: ", err);
		}
	};

	const handleCopyUrl = async () => {
		if (!activeFragment || !activeFragment.sandboxUrl) return;
		try {
			await navigator.clipboard.writeText(activeFragment.sandboxUrl);
			setCopiedUrl(true);
			setTimeout(() => setCopiedUrl(false), 2000);
		} catch (err) {
			console.error("Failed to copy URL: ", err);
		}
	};

	return (
		<div className="h-screen">
			<ResizablePanelGroup direction="horizontal">
				<ResizablePanel
					defaultSize={35}
					minSize={20}
					className="flex flex-col min-h-0"
				>
					<ProjectHeader projectId={projectId} />

					<MessageContainer
						projectId={projectId}
						activeFragment={activeFragment}
						setActiveFragment={setActiveFragment}
					/>
				</ResizablePanel>
				<ResizableHandle withHandle />
				<ResizablePanel
					defaultSize={65}
					minSize={35}
					className="flex flex-col h-full"
				>
					{activeFragment ? (
						<Tabs
							defaultValue="demo"
							className="h-full flex flex-col"
						>
							{/* Tab Header Bar */}
							<div className="flex items-center justify-between border-b px-4 h-12 shrink-0">
								<TabsList className="h-9 bg-muted/50 p-1">
									<TabsTrigger
										value="demo"
										className="px-4 py-1.5 text-xs data-active:bg-background"
									>
										<PlayIcon className="size-3.5 mr-1.5 text-emerald-500" />
										Demo
									</TabsTrigger>
									<TabsTrigger
										value="code"
										className="px-4 py-1.5 text-xs data-active:bg-background"
									>
										<Code2Icon className="size-3.5 mr-1.5 text-blue-500" />
										Code
									</TabsTrigger>
								</TabsList>
								<div className="flex items-center gap-2">
									{activeFragment.sandboxUrl && (
										<Button
											variant="outline"
											size="icon"
											className="h-8 w-8 hover:bg-accent"
											asChild
										>
											<a
												href={activeFragment.sandboxUrl}
												target="_blank"
												rel="noopener noreferrer"
												title="Open Live Preview"
											>
												<ExternalLinkIcon className="size-4" />
											</a>
										</Button>
									)}
								</div>
							</div>

							{/* URL Address Bar */}
							{activeFragment.sandboxUrl && (
								<div className="flex items-center gap-2 px-4 py-2 bg-muted/20 border-b shrink-0">
									<div className="flex items-center gap-2 bg-background border rounded-md px-3 py-1 flex-1 min-w-0">
										<span className="text-muted-foreground/40 shrink-0">
											<PlayIcon className="size-3 text-emerald-500 fill-emerald-500" />
										</span>
										<input
											type="text"
											readOnly
											value={activeFragment.sandboxUrl}
											className="flex-1 bg-transparent border-none outline-none text-xs text-muted-foreground font-mono select-all truncate"
										/>
										<Button
											variant="ghost"
											size="icon"
											className="h-5 w-5 hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
											onClick={handleCopyUrl}
											title="Copy Sandbox URL"
										>
											{copiedUrl ? (
												<CheckIcon className="size-3 text-emerald-500" />
											) : (
												<CopyIcon className="size-3" />
											)}
										</Button>
									</div>
								</div>
							)}

							{/* Demo Tab Content */}
							<TabsContent
								value="demo"
								className="flex-1 min-h-0 relative bg-zinc-50 dark:bg-zinc-950"
							>
								{activeFragment.sandboxUrl ? (
									<iframe
										src={activeFragment.sandboxUrl}
										className="w-full h-full border-none bg-white dark:bg-zinc-900"
										title={
											activeFragment.title || "Live Demo"
										}
										sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts"
									/>
								) : (
									<div className="flex items-center justify-center h-full text-muted-foreground">
										No demo URL available
									</div>
								)}
							</TabsContent>

							{/* Code Tab Content */}
							<TabsContent
								value="code"
								className="flex-1 min-h-0 flex flex-col"
							>
								{activeFragment.files &&
								Object.keys(activeFragment.files).length > 0 ? (
									<div className="flex flex-1 min-h-0">
										{/* File Explorer Sidebar */}
										<div className="w-56 border-r bg-muted/10 p-2 flex flex-col gap-1 overflow-y-auto shrink-0">
											<div className="text-[10px] font-bold text-muted-foreground/70 px-2.5 py-1.5 uppercase tracking-wider">
												Explorer
											</div>
											{Object.keys(
												activeFragment.files,
											).map((path) => (
												<button
													key={path}
													onClick={() =>
														setSelectedFilePath(
															path,
														)
													}
													className={cn(
														"flex items-center gap-2 px-2.5 py-2 text-xs rounded-md text-left transition-colors w-full font-mono",
														selectedFilePath ===
															path
															? "bg-primary/10 text-primary font-medium dark:bg-primary/25"
															: "hover:bg-muted text-muted-foreground",
													)}
												>
													<FileCode2Icon className="size-3.5 shrink-0" />
													<span className="truncate">
														{path}
													</span>
												</button>
											))}
										</div>

										{/* Editor Area */}
										<div className="flex-1 flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden relative">
											{/* Editor Header */}
											<div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/60 shrink-0">
												<span className="text-xs font-mono text-zinc-400 truncate pr-4">
													{selectedFilePath}
												</span>
												<Button
													variant="ghost"
													onClick={handleCopy}
													className="h-7 px-2.5 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 flex items-center gap-1.5"
												>
													{copied ? (
														<CheckIcon className="size-3.5 text-emerald-400" />
													) : (
														<CopyIcon className="size-3.5" />
													)}
													{copied
														? "Copied!"
														: "Copy"}
												</Button>
											</div>
											{/* Editor Code */}
											<div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed select-text">
												<pre className="grid grid-cols-[auto_1fr] gap-4">
													{/* Line Numbers */}
													<span className="text-zinc-600 text-right select-none pr-3 border-r border-zinc-800/80">
														{(
															activeFragment
																.files[
																selectedFilePath
															] || ""
														)
															.split("\n")
															.map((_, i) => (
																<span
																	key={i}
																	className="block min-w-5"
																>
																	{i + 1}
																</span>
															))}
													</span>
													{/* Code Content */}
													<code className="block whitespace-pre overflow-x-auto">
														{activeFragment.files[
															selectedFilePath
														] || ""}
													</code>
												</pre>
											</div>
										</div>
									</div>
								) : (
									<div className="flex items-center justify-center h-full text-muted-foreground">
										No files in this preview
									</div>
								)}
							</TabsContent>
						</Tabs>
					) : (
						/* Empty State Placeholder */
						<div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950">
							<div className="max-w-md text-center space-y-4">
								<div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary dark:bg-primary/20">
									<Code2Icon className="size-6 animate-pulse" />
								</div>
								<h3 className="text-lg font-semibold text-foreground">
									Ready to build
								</h3>
								<p className="text-sm text-muted-foreground">
									Send a prompt to describe what you want to
									create. The live demo and source code will
									appear here.
								</p>
							</div>
						</div>
					)}
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
};

export default ProjectView;
