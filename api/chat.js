const DEFAULT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-5.4-mini";

function extractTextContent(responseBody) {
  if (typeof responseBody?.output_text === "string" && responseBody.output_text.trim()) {
    return responseBody.output_text.trim();
  }

  const outputs = Array.isArray(responseBody?.output) ? responseBody.output : [];

  for (const item of outputs) {
    const content = Array.isArray(item?.content) ? item.content : [];

    for (const entry of content) {
      if (entry?.type === "output_text" && typeof entry.text === "string" && entry.text.trim()) {
        return entry.text.trim();
      }
    }
  }

  return "";
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter((message) => message && (message.role === "user" || message.role === "assistant"))
    .map((message) => ({
      role: message.role,
      content: [
        {
          type: "input_text",
          text: String(message.content || "").trim(),
        },
      ],
    }))
    .filter((message) => message.content[0].text);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method Not Allowed");
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).send("OPENAI_API_KEY is missing on the server.");
  }

  const messages = normalizeMessages(req.body?.messages);
  if (!messages.length) {
    return res.status(400).send("At least one chat message is required.");
  }

  try {
    const apiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        input: [
          {
            role: "developer",
            content: [
              {
                type: "input_text",
                text:
                  "You are Cyan Jewelry's admin assistant. Give concise, practical answers for ecommerce operations, merchandising, marketing, product copywriting, customer support, and internal coordination. If information is missing, say what you need.",
              },
            ],
          },
          ...messages,
        ],
        max_output_tokens: 700,
        reasoning: {
          effort: "low",
        },
        text: {
          format: {
            type: "text",
          },
        },
      }),
    });

    const responseBody = await apiResponse.json();

    if (!apiResponse.ok) {
      const message =
        responseBody?.error?.message || responseBody?.message || "OpenAI request failed without a detailed error.";
      return res.status(apiResponse.status).send(message);
    }

    const answer = extractTextContent(responseBody);
    if (!answer) {
      return res.status(502).send("OpenAI returned an empty response.");
    }

    return res.status(200).json({
      message: {
        role: "assistant",
        content: answer,
      },
      model: responseBody.model || DEFAULT_MODEL,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return res.status(500).send(message);
  }
}
