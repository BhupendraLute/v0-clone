import Sandbox from "@e2b/code-interpreter";
import { inngest } from "./client";
import { gemini, createAgent, createTool, createNetwork } from "@inngest/agent-kit"
import { z } from "zod";
import { PROMPT } from "@/prompt";
import { lastAssistantTextMessageContent } from "./utils";

export const codeAgentFunction = inngest.createFunction(
    { id: "code-agent", triggers: { event: "code-agent/run" } },
    async ({ event, step }) => {
        // step-1: create a sandbox and get the sandbox id
        const sandboxId = await step.run("get-sandbbox-id", async () => {
            const sandbox = await Sandbox.create("bhupendralute1234/v0-clone")
            return sandbox.sandboxId;
        })


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
                        return await step?.run("terminal"), async () => {
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
                            } catch (error) {
                                console.log(`Command failed: ${error} \n stdout: ${buffers.stdout} \n stderr: ${buffers.stderr}`);
                                return `Command failed: ${error} \n stdout: ${buffers.stdout} \n stderr: ${buffers.stderr}`
                            }
                        }
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

        const result = await network.run(event.data.value)

        const isError = !result.state.data.summary || Object.keys(result.state.data.files || {}).length === 0;

        const sandboxUrl = await step.run("get-sandbox-url", async () => {
            const sandbox = await Sandbox.connect(sandboxId)
            const host = sandbox.getHost(3000);

            return `http://${host}`
        })

        return {
            url: sandboxUrl,
            title: "Untitled",
            files: result.state.data.files || {},
            summary: result.state.data.summary || "No summary generated",
        }
    }
);