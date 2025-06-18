import type { Config, Context } from "@netlify/edge-functions";
import Anthropic from "@anthropic-ai/sdk";

export default async (request: Request, context: Context) => {
  try {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // Only allow POST requests
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response("Invalid JSON", { status: 400 });
    }

    // Validate request body
    if (!body || !Array.isArray(body.messages)) {
      return new Response(
        "Invalid request body. Expected { messages: Array, system?: string, enableThinking?: boolean, thinkingBudget?: number, enableWebSearch?: boolean }",
        { status: 400 }
      );
    }

    // Validate messages array
    if (body.messages.length === 0) {
      return new Response("Messages array cannot be empty", { status: 400 });
    }

    // Validate each message
    for (const message of body.messages) {
      if (!message.role || !message.content) {
        return new Response(
          "Each message must have role and content properties",
          { status: 400 }
        );
      }

      if (!["user", "assistant"].includes(message.role)) {
        return new Response(
          'Message role must be either "user" or "assistant"',
          { status: 400 }
        );
      }

      if (
        typeof message.content !== "string" ||
        message.content.trim() === ""
      ) {
        return new Response("Message content must be a non-empty string", {
          status: 400,
        });
      }
    }

    // Validate conversation history length
    if (body.messages.length > 50) {
      return new Response(
        "Conversation history too long. Maximum 50 messages allowed.",
        { status: 400 }
      );
    }

    // Validate thinking parameters if provided
    if (
      body.enableThinking !== undefined &&
      typeof body.enableThinking !== "boolean"
    ) {
      return new Response("enableThinking must be a boolean", { status: 400 });
    }

    if (body.thinkingBudget !== undefined) {
      if (
        typeof body.thinkingBudget !== "number" ||
        body.thinkingBudget < 1024 ||
        body.thinkingBudget > 100000
      ) {
        return new Response(
          "thinkingBudget must be a number between 1024 and 100000",
          { status: 400 }
        );
      }
    }

    // Validate web search parameter if provided
    if (
      body.enableWebSearch !== undefined &&
      typeof body.enableWebSearch !== "boolean"
    ) {
      return new Response("enableWebSearch must be a boolean", { status: 400 });
    }

    // Get API key from environment
    const apiKey = Netlify.env.get("NUXT_ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response("Anthropic API key not configured", { status: 500 });
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

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

    // Create streaming response using ReadableStream (Netlify Edge Functions pattern)
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Helper function to send SSE event
          const sendEvent = (eventType: string, data: any) => {
            const sseData = `event: ${eventType}\ndata: ${JSON.stringify(
              data
            )}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          };

          // Create the streaming response using Anthropic SDK
          const anthropicStream = await anthropic.messages.create(anthropicRequest);

          // Stream the response
          for await (const chunk of anthropicStream) {
            // Handle different event types
            switch (chunk.type) {
              case "message_start":
                // Send the message start event
                sendEvent("message_start", {
                  id: chunk.message.id,
                  model: chunk.message.model,
                  role: chunk.message.role,
                  usage: chunk.message.usage,
                });
                break;

              case "content_block_start":
                // Send content block start event
                sendEvent("content_block_start", {
                  index: chunk.index,
                  content_block: chunk.content_block,
                });

                // Check if this is a web search tool use
                if (chunk.content_block.type === "server_tool_use" && 
                    chunk.content_block.name === "web_search") {
                  sendEvent("web_search_start", {
                    index: chunk.index,
                    tool_use_id: chunk.content_block.id,
                  });
                } else if (chunk.content_block.type === "web_search_tool_result") {
                  sendEvent("web_search_result", {
                    index: chunk.index,
                    tool_use_id: chunk.content_block.tool_use_id,
                    results: chunk.content_block.content,
                  });
                }
                break;

              case "content_block_delta":
                // Send the actual text or thinking delta
                if (chunk.delta.type === "text_delta") {
                  sendEvent("text_delta", {
                    index: chunk.index,
                    text: chunk.delta.text,
                  });
                } else if (chunk.delta.type === "thinking_delta") {
                  sendEvent("thinking_delta", {
                    index: chunk.index,
                    text: chunk.delta.text || chunk.delta.thinking || "",
                  });
                } else if (chunk.delta.type === "input_json_delta") {
                  // Handle tool input (search query) delta
                  sendEvent("tool_input_delta", {
                    index: chunk.index,
                    partial_json: chunk.delta.partial_json,
                  });
                }
                break;

              case "content_block_stop":
                // Send content block stop event
                sendEvent("content_block_stop", {
                  index: chunk.index,
                });
                break;

              case "message_delta":
                // Send message delta for usage updates
                sendEvent("message_delta", {
                  delta: chunk.delta,
                  usage: chunk.usage,
                });
                break;

              case "message_stop":
                // Send the final message stop event
                sendEvent("message_stop", {});
                break;

              // @ts-expect-error - ping event is documented but not in SDK types
              case "ping":
                // Send ping event to keep connection alive
                sendEvent("ping", {});
                break;
                
              default:
                // Handle unknown event types silently
                break;
            }
          }

          // End the stream
          sendEvent("done", {});
          controller.close();
        } catch (error) {
          console.error("Stream controller error:", error);
          const sendEvent = (eventType: string, data: any) => {
            const sseData = `event: ${eventType}\ndata: ${JSON.stringify(
              data
            )}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          };
          
          // Handle Anthropic API errors
          if (error instanceof Anthropic.APIError) {
            const statusCode = error.status || 500;
            const message = error.message || "Anthropic API error";
            sendEvent("error", { 
              error: message,
              status: statusCode 
            });
          } else {
            sendEvent("error", { 
              error: error.message || "Internal server error",
              status: 500 
            });
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      },
    });
  } catch (error) {
    console.error("Chat edge function error:", error);
    return new Response(`Internal server error: ${error.message}`, {
      status: 500,
    });
  }
};

export const config: Config = {
  path: "/api/chat-edge",
};
