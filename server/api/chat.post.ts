import Anthropic from "@anthropic-ai/sdk";

export default defineEventHandler(async (event) => {
  try {
    // Get the request body
    const body = await readBody(event);

    // Validate request body
    if (!body || !Array.isArray(body.messages)) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "Invalid request body. Expected { messages: Array, system?: string, enableThinking?: boolean, thinkingBudget?: number, enableWebSearch?: boolean }",
      });
    }

    // Validate messages array
    if (body.messages.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "Messages array cannot be empty",
      });
    }

    // Validate each message
    for (const message of body.messages) {
      if (!message.role || !message.content) {
        throw createError({
          statusCode: 400,
          statusMessage: "Each message must have role and content properties",
        });
      }

      if (!["user", "assistant"].includes(message.role)) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Message role must be either "user" or "assistant"',
        });
      }

      if (
        typeof message.content !== "string" ||
        message.content.trim() === ""
      ) {
        throw createError({
          statusCode: 400,
          statusMessage: "Message content must be a non-empty string",
        });
      }
    }

    // Validate conversation history length (prevent excessive API usage)
    if (body.messages.length > 50) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "Conversation history too long. Maximum 50 messages allowed.",
      });
    }

    // Validate thinking parameters if provided
    if (
      body.enableThinking !== undefined &&
      typeof body.enableThinking !== "boolean"
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: "enableThinking must be a boolean",
      });
    }

    if (body.thinkingBudget !== undefined) {
      if (
        typeof body.thinkingBudget !== "number" ||
        body.thinkingBudget < 1024 ||
        body.thinkingBudget > 100000
      ) {
        throw createError({
          statusCode: 400,
          statusMessage:
            "thinkingBudget must be a number between 1024 and 100000",
        });
      }
    }

    // Validate web search parameter if provided
    if (
      body.enableWebSearch !== undefined &&
      typeof body.enableWebSearch !== "boolean"
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: "enableWebSearch must be a boolean",
      });
    }

    // Get runtime config and API key
    const config = useRuntimeConfig();
    const apiKey = config.anthropicApiKey;
    if (!apiKey) {
      throw createError({
        statusCode: 500,
        statusMessage: "Anthropic API key not configured",
      });
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    // Set up server-sent events headers
    setHeader(event, "Content-Type", "text/event-stream");
    setHeader(event, "Cache-Control", "no-cache");
    setHeader(event, "Connection", "keep-alive");
    setHeader(event, "Access-Control-Allow-Origin", "*");
    setHeader(event, "Access-Control-Allow-Headers", "Cache-Control");

    // Prepare the request for Anthropic API
    const anthropicRequest: Anthropic.Messages.MessageCreateParams = {
      model: "claude-sonnet-4-20250514",
      max_tokens: 16384,
      messages: body.messages,
      stream: true,
    };

    // Add system prompt if provided
    if (body.system && typeof body.system === "string" && body.system.trim()) {
      anthropicRequest.system = body.system;
    }

    // Add thinking configuration if enabled
    if (body.enableThinking) {
      (anthropicRequest as any).thinking = {
        type: "enabled",
        budget_tokens: body.thinkingBudget || 10000,
      };
    }

    // Add web search tool if enabled
    if (body.enableWebSearch) {
      anthropicRequest.tools = [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 10,
        },
      ];
    }

    // Create the streaming response
    const stream = await anthropic.messages.create(anthropicRequest);

    // Stream the response
    for await (const chunk of stream) {
      // Handle different event types
      switch (chunk.type) {
        case "message_start":
          // Send the message start event
          await writeSSE(event, "message_start", {
            id: chunk.message.id,
            model: chunk.message.model,
            role: chunk.message.role,
            usage: chunk.message.usage,
          });
          break;

        case "content_block_start":
          // Send content block start event
          await writeSSE(event, "content_block_start", {
            index: chunk.index,
            content_block: chunk.content_block,
          });

          // Check if this is a web search tool use
          if (chunk.content_block.type === "server_tool_use" && 
              chunk.content_block.name === "web_search") {
            await writeSSE(event, "web_search_start", {
              index: chunk.index,
              tool_use_id: chunk.content_block.id,
            });
          } else if (chunk.content_block.type === "web_search_tool_result") {
            await writeSSE(event, "web_search_result", {
              index: chunk.index,
              tool_use_id: chunk.content_block.tool_use_id,
              results: chunk.content_block.content,
            });
          }
          break;

        case "content_block_delta":
          // Send the actual text or thinking delta
          if (chunk.delta.type === "text_delta") {
            await writeSSE(event, "text_delta", {
              index: chunk.index,
              text: chunk.delta.text,
            });
          } else if (chunk.delta.type === "thinking_delta") {
            await writeSSE(event, "thinking_delta", {
              index: chunk.index,
              text: chunk.delta.text || chunk.delta.thinking || "",
            });
          } else if (chunk.delta.type === "input_json_delta") {
            // Handle tool input (search query) delta
            await writeSSE(event, "tool_input_delta", {
              index: chunk.index,
              partial_json: chunk.delta.partial_json,
            });
          }
          break;

        case "content_block_stop":
          // Send content block stop event
          await writeSSE(event, "content_block_stop", {
            index: chunk.index,
          });

          // Content block completed
          break;

        case "message_delta":
          // Send message delta for usage updates
          await writeSSE(event, "message_delta", {
            delta: chunk.delta,
            usage: chunk.usage,
          });
          break;

        case "message_stop":
          // Send the final message stop event
          await writeSSE(event, "message_stop", {});
          break;

        // @ts-expect-error - ping event is documented but not in SDK types
        case "ping":
          // Send ping event to keep connection alive
          await writeSSE(event, "ping", {});
          break;
          
        default:
          // Handle unknown event types silently
          break;
      }
    }

    // End the stream
    await writeSSE(event, "done", {});
  } catch (error) {
    console.error("Chat API error:", error);

    // Handle Anthropic API errors
    if (error instanceof Anthropic.APIError) {
      const statusCode = error.status || 500;
      const message = error.message || "Anthropic API error";

      // Send error as SSE event if headers are already set
      if (event.node.res.headersSent) {
        await writeSSE(event, "error", {
          error: message,
          status: statusCode,
        });
        return;
      }

      throw createError({
        statusCode,
        statusMessage: message,
      });
    }

    // Handle other errors
    if (error.statusCode) {
      throw error;
    }

    // Send error as SSE event if headers are already set
    if (event.node.res.headersSent) {
      await writeSSE(event, "error", {
        error: "Internal server error",
        status: 500,
      });
      return;
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error",
    });
  }
});

// Helper function to write Server-Sent Events
async function writeSSE(event: any, eventType: string, data: any) {
  const sseData = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;

  // Write the data to the response stream
  event.node.res.write(sseData);

  // Small delay to ensure proper streaming
  await new Promise((resolve) => setTimeout(resolve, 1));
}
