import Sandbox from "@e2b/code-interpreter";
import { inngest } from "./client";
import { gemini, createAgent, createTool, createNetwork, createState } from "@inngest/agent-kit"
import { z } from "zod";
import { FRAGMENT_TITLE_PROMPT, PROMPT, RESPONSE_PROMPT } from "@/prompt";
import { lastAssistantTextMessageContent } from "./utils";
import { MessageRole, MessageType } from "@/generated/prisma/client"
import db from "@/lib/db";

export const codeAgentFunction = inngest.createFunction(
    { id: "code-agent", triggers: { event: "code-agent/run" } },
    async ({ event, step }) => {
        // step-1: create a sandbox and get the sandbox id
        const sandboxId = await step.run("get-sandbbox-id", async () => {
            const sandbox = await Sandbox.create("bhupendralute1234/v0-clone")
            return sandbox.sandboxId;
        })

        const previosMessages = await step.run(
            "get-previous-messages",
            async () => {
                const formattedMessages = [];
                const messages = await db.message.findMany({
                    where: {
                        projectId: event.data.projectId
                    },
                    orderBy: {
                        createdAt: "desc"
                    }
                });

                for (const message of messages) {
                    formattedMessages.push({
                        type: "text",
                        role: message.role === "ASSISTANT" ? "assistant" : "user",
                        content: message.content
                    })
                }

                return formattedMessages;
            }
        )

        const state = createState({
            summary: "",
            files: {}
        },
            {
                messages: previosMessages
            }

        )


        const codeAgent = createAgent({
            name: "code-agent",
            description: "An expert code agent that can write code to solve problems",
            system: PROMPT,
            model: gemini({ model: "gemini-2.5-flash" }),
            tools: [
                // 1. Terminal
                createTool({
                    name: "terminal",
                    description: "A terminal to run commands in the sandbox",
                    parameters: z.object({
                        command: z.string()
                    }),
                    handler: async ({ command }, { step }) => {
                        return await step?.run("terminal", async () => {
                            const buffers = { stdout: "", stderr: "" }

                            try {
                                const sandbox = await Sandbox.connect(sandboxId);
                                const result = await sandbox.commands.run(command, {
                                    onStdout: (data) => {
                                        buffers.stdout += data;
                                    },
                                    onStderr: (data) => {
                                        buffers.stderr += data;
                                    }
                                })
                                return `stdout:\n${buffers.stdout}\nstderr:\n${buffers.stderr}`;
                            } catch (error) {
                                console.log(`Command failed: ${error} \n stdout: ${buffers.stdout} \n stderr: ${buffers.stderr}`);
                                return `Command failed: ${error} \n stdout: ${buffers.stdout} \n stderr: ${buffers.stderr}`
                            }
                        })
                    }
                }),

                // 2. CreateOrUpdateFiles
                createTool({
                    name: "createOrUpdateFiles",
                    description: "Create or update a file in the sandbox",
                    parameters: z.object({
                        files: z.array(
                            z.object({
                                path: z.string(),
                                content: z.string()
                            })
                        )
                    }),
                    handler: async ({ files }, { step, network }) => {
                        const newFiles = await step?.run("createOrUpdateFiles", async () => {
                            try {
                                const updatedFIles = network?.state?.data.files || {}

                                const sandbox = await Sandbox.connect(sandboxId)

                                for (const file of files) {
                                    await sandbox.files.write(file.path, file.content)
                                    updatedFIles[file.path] = file.content
                                }
                                return updatedFIles;
                            } catch (error) {
                                console.error(`Failed to create or update files: ${error}`);
                                return "Error" + error;
                            }
                        })

                        if (typeof newFiles === "object") {
                            network.state.data.files = newFiles;
                        }
                    }
                }),

                // 3. readFiles
                createTool({
                    name: "readFiles",
                    description: "Read files from the sandbox",
                    parameters: z.object({
                        files: z.array(z.string())
                    }),
                    handler: async ({ files }, { step }) => {
                        return await step?.run("readFiles", async () => {
                            try {
                                const sandbox = await Sandbox.connect(sandboxId)
                                const contents = [];

                                for (const file of files) {
                                    const content = await sandbox.files.read(file);
                                    contents.push({ path: file, content })
                                }

                                return JSON.stringify(contents);
                            } catch (error) {
                                console.error(`Failed to read files: ${error}`);
                                return "Error: " + error;
                            }
                        })
                    }
                })
            ],
            lifecycle: {
                onResponse: async ({ result, network }) => {
                    const lastAssistantMessageText = lastAssistantTextMessageContent(result)

                    if (lastAssistantMessageText && network) {
                        if (lastAssistantMessageText.includes("<task_summary>")) {
                            network.state.data.summary = lastAssistantMessageText
                        }
                    }
                    return result
                }
            }
        })

        const network = createNetwork({
            name: "code-agent-network",
            agents: [codeAgent],
            maxIter: 10,
            router: async ({ network }) => {
                const summary = network.state.data.summary
                if (summary) {
                    return
                }
                return codeAgent
            }
        })

        const result = await network.run(event.data.value, { state })

        const fragmentTitleGenerator = createAgent({
            name: "fragment-title-generator",
            description: "Generate a title for fragment",
            system: FRAGMENT_TITLE_PROMPT,
            model: gemini({ model: "gemini-2.5-flash" })
        })

        const responseGenerator = createAgent({
            name: "response-generator",
            description: "Generate a response for the fragment",
            system: RESPONSE_PROMPT,
            model: gemini({ model: "gemini-2.5-flash" })
        })

        const { output: fragmentTitleOutput } = await fragmentTitleGenerator.run(result.state.data.summary);
        const { output: responseOutput } = await responseGenerator.run(result.state.data.summary)

        const generateTitleFragment = () => {
            if (fragmentTitleOutput[0].type !== "text") {
                return "Untitled";
            }

            if (Array.isArray(fragmentTitleOutput[0].content)) {
                return fragmentTitleOutput[0].content.map((c) => c).join(" ")
            } else {
                return fragmentTitleOutput[0].content;
            }
        }

        const generateResponse = () => {
            if (responseOutput[0].type !== "text") {
                return "Here you go"
            }

            if (Array.isArray(responseOutput[0].content)) {
                return responseOutput[0].content.map((c) => c).join(" ")
            } else {
                return responseOutput[0].content || "Here you go";
            }
        }

        const isError = !result.state.data.summary || Object.keys(result.state.data.files || {}).length === 0;

        const sandboxUrl = await step.run("get-sandbox-url", async () => {
            const sandbox = await Sandbox.connect(sandboxId)
            const host = sandbox.getHost(3000);

            return `http://${host}`
        })

        await step.run("save-result", async () => {
            if (isError) {
                return await db.message.create({
                    data: {
                        projectId: event.data.projectId,
                        content: "Sorry something went wrong please try again",
                        type: MessageType.ERROR,
                        role: MessageRole.ASSISTANT,
                    }
                })
            }
            return await db.message.create({
                data: {
                    projectId: event.data.projectId,
                    content: generateResponse(),
                    type: MessageType.RESULT,
                    role: MessageRole.ASSISTANT,
                    fragments: {
                        create: {
                            sandboxUrl: sandboxUrl,
                            title: generateTitleFragment(),
                            files: result.state.data.files,
                        }
                    }
                }
            })
        })

        return {
            url: sandboxUrl,
            title: "Untitled",
            files: result.state.data.files || {},
            summary: result.state.data.summary || "No summary generated",
        }
    }
);