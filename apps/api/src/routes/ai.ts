import type { FastifyInstance } from "fastify";
import Anthropic from "@anthropic-ai/sdk";
import { withAuth, getUser } from "../lib/auth/withAuth.js";

const ACTIONS = {
  fix_grammar:        "Fix any grammar, spelling, and punctuation errors in this social media caption. Do not use em dashes. Return only the corrected caption with no explanation.",
  concise:            "Make this social media caption shorter and more concise while keeping the core message. Do not use em dashes. Return only the revised caption with no explanation.",
  expand:             "Expand this social media caption to be more detailed and engaging. Do not use em dashes. Return only the expanded caption with no explanation.",
  rephrase:           "Rephrase this social media caption in a fresh way while keeping the same meaning. Do not use em dashes. Return only the rephrased caption with no explanation.",
  improve_structure:  "Improve the structure and flow of this social media caption to make it more readable. Do not use em dashes. Return only the improved caption with no explanation.",
  simplify:           "Simplify the language in this social media caption so it's easy to understand. Do not use em dashes. Return only the simplified caption with no explanation.",
  polish:             "Polish this social media caption to make it compelling and professional. Do not use em dashes. Return only the polished caption with no explanation.",
} as const;

type Action = keyof typeof ACTIONS;

export async function aiRoutes(app: FastifyInstance) {
  app.post("/ai/caption", {
    preHandler: [withAuth],
    config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
  }, async (req, reply) => {
    getUser(req); // ensures authenticated

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return reply.status(503).send({ error: "AI features not configured" });
    }

    const { text, action } = req.body as { text?: string; action?: string };
    if (!text?.trim()) return reply.status(400).send({ error: "text is required" });
    if (!action || !(action in ACTIONS)) return reply.status(400).send({ error: "invalid action" });

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `${ACTIONS[action as Action]}\n\nCaption:\n${text}`,
        },
      ],
    });

    const result = message.content[0];
    if (result.type !== "text") return reply.status(500).send({ error: "Unexpected response" });

    return reply.send({ text: result.text.trim() });
  });
}
