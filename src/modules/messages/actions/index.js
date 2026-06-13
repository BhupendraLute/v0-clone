"use server"

import { MessageRole, MessageType } from "@/generated/prisma/client"
import db from "@/lib/db"
import { inngest } from "@/inngest/client"
import { getCurrentUser } from "@/modules/auth/actions"
import { consumeCredits } from "@/lib/usage"

export const createMessage = async (value, projectId) => {
    const user = await getCurrentUser()

    if (!user) throw new Error("Unauthorized")

    const project = await db.project.findUnique({
        where: {
            id: projectId,
            userId: user.id
        }
    })

    if (!project) throw new Error("Project not found")

    try {
        await consumeCredits()
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(error.message || "Something went wrong")
        } else {
            throw new Error("Too many requests")
        }
    }

    const newMessage = await db.message.create({
        data: {
            projectId: projectId,
            content: value,
            role: MessageRole.USER,
            type: MessageType.RESULT
        }
    })

    await inngest.send({
        name: "code-agent/run",
        data: {
            value: value,
            projectId: projectId,
        }
    })

    return newMessage
}

export const getMessages = async (projectId) => {
    const user = await getCurrentUser();

    if (!user) throw new Error("Unauthorized");

    const project = await db.project.findUnique({
        where: {
            id: projectId,
            userId: user.id
        }
    })

    if (!project) throw new Error("Project not found")

    const messages = await db.message.findMany({
        where: {
            projectId: projectId
        },
        orderBy: {
            updatedAt: "asc"
        },
        include: {
            fragments: true
        }
    })

    return messages
}