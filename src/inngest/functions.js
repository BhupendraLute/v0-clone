import Sandbox from "@e2b/code-interpreter";
import { inngest } from "./client";
import { gemini, createAgent } from "@inngest/agent-kit"

export const processTask = inngest.createFunction(
    { id: "process-task", triggers: { event: "agent/hello" } },
    async ({ event, step }) => {

        const sandboxId = await step.run("get-sandbbox-id", async () => {
            const sandbox = await Sandbox.create("bhupendralute1234/v0-clone")
            return sandbox.sandboxId;
        })

        const helloAgent = createAgent({
            name: "hello-agent",
            description: "A simple agent that say hello",
            system: "Always greet with enthusiasm",
            model: gemini({ model: "gemini-2.5-flash" })
        })

        const { output } = await helloAgent.run("Hi!")

        const sandboxUrl = await step.run("get-sandbox-url", async () => {
            const sandbox = await Sandbox.connect(sandboxId)
            const host = sandbox.getHost(3000);

            return `http://${host}`
        })

        return {
            message: output[0].content
        }
    }
);