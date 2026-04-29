"use server"

import { inngest } from "@/inngest/client"

export const onInvoke = async () => {
    const result = await inngest.send({
        name: "agent/hello",
    });
};