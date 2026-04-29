import { inngest } from "./client";
import { gemini, createAgent } from "@inngest/agent-kit"

export const processTask = inngest.createFunction(
    { id: "process-task", triggers: { event: "agent/hello" } },
    async ({ event, step }) => {
        const helloAgent = createAgent({
            name: "hello-agent",
            description: "A simple agent that say hello",
            system: "Always greet with enthusiasm",
            model: gemini({ model: "gemini-2.5-flash" })
        })

        const { output } = await helloAgent.run("Hi!")

        return {
            message: output[0].content
        }
    }
);