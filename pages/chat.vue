<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <!-- Header with System Prompt -->
    <div class="bg-white border-b border-gray-200 p-4">
      <div class="max-w-4xl mx-auto">
        <div class="flex items-center justify-between mb-2">
          <h1 class="text-xl font-semibold text-gray-900">Chat with Claude</h1>
          <button
            class="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded-md border border-gray-300 hover:border-gray-400 transition-colors"
            @click="showSystemPrompt = !showSystemPrompt"
          >
            {{ showSystemPrompt ? "Hide" : "Show" }} System Prompt
          </button>
        </div>

        <div v-if="showSystemPrompt" class="mt-3">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            System Prompt
          </label>
          <textarea
            v-model="systemPrompt"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="Enter system instructions for Claude..."
          />
        </div>
      </div>
    </div>

    <!-- Chat Messages Area -->
    <div ref="messagesContainer" class="flex-1 overflow-y-auto px-4 py-6">
      <div class="max-w-4xl mx-auto space-y-6">
        <!-- Welcome Message -->
        <div
          v-if="messages.length === 0"
          class="text-center text-gray-500 mt-8"
        >
          <p class="text-lg">Start a conversation with Claude</p>
          <p class="text-sm mt-2">Type your message below to begin</p>
        </div>

        <!-- Messages -->
        <div v-for="(message, index) in messages" :key="index" class="flex">
          <!-- User Message -->
          <div v-if="message.role === 'user'" class="flex justify-end w-full">
            <div
              class="max-w-xs lg:max-w-2xl px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              <p class="text-sm whitespace-pre-wrap">{{ message.content }}</p>
            </div>
          </div>

          <!-- Assistant Message -->
          <div v-else class="flex justify-start w-full">
            <div
              class="max-w-xs lg:max-w-2xl bg-white border border-gray-200 rounded-lg shadow-sm"
            >
              <!-- Thinking Block (if present) -->
              <div v-if="message.thinking" class="border-b border-gray-200">
                <button
                  class="w-full px-4 py-2 text-left bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                  @click="showThinking[index] = !showThinking[index]"
                >
                  <span
                    class="text-sm font-medium text-gray-700 flex items-center"
                  >
                    🤔 Claude's Thinking Process
                  </span>
                  <svg
                    :class="{ 'rotate-180': showThinking[index] }"
                    class="w-4 h-4 text-gray-500 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                <div
                  v-if="showThinking[index]"
                  class="px-4 py-3 bg-gray-50 border-t border-gray-200"
                >
                  <pre
                    class="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed"
                    >{{ message.thinking }}</pre
                  >
                </div>
              </div>

              <!-- Main Response -->
              <div class="px-4 py-2">
                <div class="text-sm text-gray-900">
                  <MarkdownRenderer :content="message.content" />
                </div>
              </div>

              <!-- Source Citations -->
              <div
                v-if="message.sources && message.sources.length > 0"
                class="px-4 py-2 border-t border-gray-100 bg-gray-50"
              >
                <div class="text-xs text-gray-600 mb-2">
                  <span class="font-medium">Sources:</span>
                </div>
                <div class="space-y-1">
                  <div
                    v-for="(source, sourceIndex) in message.sources"
                    :key="sourceIndex"
                    class="flex items-start gap-2"
                  >
                    <span class="text-xs text-gray-500 mt-0.5">{{
                      sourceIndex + 1
                    }}.</span>
                    <a
                      :href="source.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-xs text-blue-600 hover:text-blue-800 underline flex-1 break-all"
                    >
                      {{ source.title || source.domain || source.url }}
                    </a>
                  </div>
                </div>
              </div>

              <!-- Usage Information -->
              <div
                v-if="message.usage"
                class="px-4 py-2 border-t border-gray-100 bg-gray-50 rounded-b-lg"
              >
                <div class="text-xs text-gray-600 space-y-1">
                  <div class="flex justify-between">
                    <span>Input tokens:</span>
                    <span class="font-mono">{{
                      message.usage.input_tokens?.toLocaleString() || 0
                    }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Output tokens:</span>
                    <span class="font-mono">{{
                      message.usage.output_tokens?.toLocaleString() || 0
                    }}</span>
                  </div>
                  <div
                    v-if="message.usage.thinking_tokens"
                    class="flex justify-between text-purple-600"
                  >
                    <span>• Thinking tokens:</span>
                    <span class="font-mono">{{
                      message.usage.thinking_tokens?.toLocaleString() || 0
                    }}</span>
                  </div>
                  <div
                    v-if="message.usage.response_tokens"
                    class="flex justify-between text-blue-600"
                  >
                    <span>• Response tokens:</span>
                    <span class="font-mono">{{
                      message.usage.response_tokens?.toLocaleString() || 0
                    }}</span>
                  </div>
                  <div
                    v-if="message.usage.cache_creation_input_tokens"
                    class="flex justify-between text-green-600"
                  >
                    <span>Cache creation:</span>
                    <span class="font-mono">{{
                      message.usage.cache_creation_input_tokens?.toLocaleString() ||
                      0
                    }}</span>
                  </div>
                  <div
                    v-if="message.usage.cache_read_input_tokens"
                    class="flex justify-between text-green-600"
                  >
                    <span>Cache read:</span>
                    <span class="font-mono">{{
                      message.usage.cache_read_input_tokens?.toLocaleString() ||
                      0
                    }}</span>
                  </div>
                  <div
                    class="flex justify-between font-medium border-t border-gray-200 pt-1 mt-1"
                  >
                    <span>Total tokens:</span>
                    <span class="font-mono">{{
                      (
                        (message.usage.input_tokens || 0) +
                        (message.usage.output_tokens || 0) +
                        (message.usage.cache_creation_input_tokens || 0)
                      ).toLocaleString()
                    }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Streaming Message (if actively receiving) -->
        <div
          v-if="
            isStreaming && (currentStreamingThinking || currentStreamingMessage)
          "
          class="flex justify-start w-full"
        >
          <div
            class="max-w-xs lg:max-w-2xl bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            <!-- Streaming Thinking Block -->
            <div
              v-if="currentStreamingThinking"
              class="border-b border-gray-200"
            >
              <div class="px-4 py-2 bg-gray-50">
                <div class="flex items-center mb-2">
                  <span class="text-sm font-medium text-gray-700">
                    🤔 Claude is thinking...
                  </span>
                  <div class="flex items-center ml-2">
                    <div
                      class="animate-pulse w-2 h-2 bg-gray-500 rounded-full mr-1"
                    ></div>
                    <div
                      class="animate-pulse w-2 h-2 bg-gray-500 rounded-full mr-1"
                      style="animation-delay: 0.2s"
                    ></div>
                    <div
                      class="animate-pulse w-2 h-2 bg-gray-500 rounded-full"
                      style="animation-delay: 0.4s"
                    ></div>
                  </div>
                </div>
                <pre
                  class="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed"
                  >{{ currentStreamingThinking }}</pre
                >
              </div>
            </div>

            <!-- Web Search Indicator -->
            <div
              v-if="isSearching"
              class="border-b border-gray-200"
            >
              <div class="px-4 py-2 bg-green-50">
                <div class="flex items-center">
                  <span class="text-sm font-medium text-green-700">
                    🔍 Searching the web
                    <span v-if="searchQuery">: "{{ searchQuery }}"</span>
                  </span>
                  <div class="flex items-center ml-2">
                    <div
                      class="animate-spin w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Streaming Response -->
            <div v-if="currentStreamingMessage" class="px-4 py-2">
              <div class="text-sm text-gray-900">
                <MarkdownRenderer :content="currentStreamingMessage" />
              </div>
              <div class="flex items-center mt-1">
                <div
                  class="animate-pulse w-2 h-2 bg-blue-500 rounded-full mr-1"
                ></div>
                <div
                  class="animate-pulse w-2 h-2 bg-blue-500 rounded-full mr-1"
                  style="animation-delay: 0.2s"
                ></div>
                <div
                  class="animate-pulse w-2 h-2 bg-blue-500 rounded-full"
                  style="animation-delay: 0.4s"
                ></div>
              </div>
            </div>

            <!-- Show thinking indicator when no message yet -->
            <div
              v-else-if="
                isStreaming &&
                !currentStreamingMessage &&
                !currentStreamingThinking
              "
              class="px-4 py-2"
            >
              <div class="flex items-center text-gray-500">
                <span class="text-sm">Claude is preparing to respond...</span>
                <div class="flex items-center ml-2">
                  <div
                    class="animate-pulse w-2 h-2 bg-gray-400 rounded-full mr-1"
                  ></div>
                  <div
                    class="animate-pulse w-2 h-2 bg-gray-400 rounded-full mr-1"
                    style="animation-delay: 0.2s"
                  ></div>
                  <div
                    class="animate-pulse w-2 h-2 bg-gray-400 rounded-full"
                    style="animation-delay: 0.4s"
                  ></div>
                </div>
              </div>
            </div>

            <!-- Usage during streaming -->
            <div
              v-if="currentStreamingUsage"
              class="px-4 py-2 border-t border-gray-100 bg-gray-50 rounded-b-lg"
            >
              <div class="text-xs text-gray-600 space-y-1">
                <div class="flex justify-between">
                  <span>Input tokens:</span>
                  <span class="font-mono">{{
                    currentStreamingUsage.input_tokens?.toLocaleString() || 0
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Output tokens:</span>
                  <span class="font-mono">{{
                    currentStreamingUsage.output_tokens?.toLocaleString() || 0
                  }}</span>
                </div>
                <div
                  v-if="currentStreamingUsage.thinking_tokens"
                  class="flex justify-between text-purple-600"
                >
                  <span>• Thinking tokens:</span>
                  <span class="font-mono">{{
                    currentStreamingUsage.thinking_tokens?.toLocaleString() || 0
                  }}</span>
                </div>
                <div
                  v-if="currentStreamingUsage.response_tokens"
                  class="flex justify-between text-blue-600"
                >
                  <span>• Response tokens:</span>
                  <span class="font-mono">{{
                    currentStreamingUsage.response_tokens?.toLocaleString() || 0
                  }}</span>
                </div>
                <div
                  v-if="currentStreamingUsage.cache_creation_input_tokens"
                  class="flex justify-between text-green-600"
                >
                  <span>Cache creation:</span>
                  <span class="font-mono">{{
                    currentStreamingUsage.cache_creation_input_tokens?.toLocaleString() ||
                    0
                  }}</span>
                </div>
                <div
                  v-if="currentStreamingUsage.cache_read_input_tokens"
                  class="flex justify-between text-green-600"
                >
                  <span>Cache read:</span>
                  <span class="font-mono">{{
                    currentStreamingUsage.cache_read_input_tokens?.toLocaleString() ||
                    0
                  }}</span>
                </div>
                <div
                  class="flex justify-between font-medium border-t border-gray-200 pt-1 mt-1"
                >
                  <span>Total tokens:</span>
                  <span class="font-mono">{{
                    (
                      (currentStreamingUsage.input_tokens || 0) +
                      (currentStreamingUsage.output_tokens || 0) +
                      (currentStreamingUsage.cache_creation_input_tokens || 0)
                    ).toLocaleString()
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="bg-white border-t border-gray-200 p-4">
      <div class="max-w-4xl mx-auto">
        <div class="flex space-x-4">
          <div class="flex-1">
            <textarea
              v-model="currentInput"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
              :disabled="isStreaming"
              @keydown.enter.exact.prevent="sendMessage"
              @keydown.enter.shift.exact="handleShiftEnter"
            />
          </div>
          <div class="flex flex-col justify-center">
            <button
              :disabled="!currentInput.trim() || isStreaming"
              class="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              @click="sendMessage"
            >
              {{ isStreaming ? "Sending..." : "Send" }}
            </button>
          </div>
        </div>

        <!-- Extended Thinking Controls -->
        <div class="mt-3 border-t border-gray-200 pt-3">
          <div class="flex items-center gap-3 flex-wrap">
            <div class="flex items-center gap-2">
              <label class="text-sm font-medium text-gray-700">
                Extended Thinking
              </label>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  v-model="enableThinking"
                  type="checkbox"
                  class="sr-only peer"
                />
                <div
                  class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
                ></div>
              </label>
            </div>

            <div class="flex items-center gap-2">
              <label class="text-sm font-medium text-gray-700">
                Web Search
              </label>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  v-model="enableWebSearch"
                  type="checkbox"
                  class="sr-only peer"
                />
                <div
                  class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"
                ></div>
              </label>
            </div>

            <div
              v-if="enableThinking"
              class="hidden sm:flex items-center gap-2 flex-1 min-w-0"
            >
              <span class="text-sm text-gray-600 whitespace-nowrap"
                >{{ thinkingBudget.toLocaleString() }} tokens</span
              >
              <input
                v-model.number="thinkingBudget"
                type="range"
                min="1024"
                max="8192"
                step="1024"
                class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          </div>
          <!--
          <div v-if="enableThinking" class="mt-2">
            <p class="text-xs text-gray-600">
              Higher budgets allow Claude to think more deeply about complex problems but use more tokens.
            </p>
          </div>
          -->
        </div>

        <!-- Error Display -->
        <div
          v-if="error"
          class="mt-3 p-3 bg-red-50 border border-red-200 rounded-md"
        >
          <p class="text-sm text-red-800">{{ error }}</p>
          <button
            class="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            @click="error = ''"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Import markdown renderer component
import MarkdownRenderer from "~/components/MarkdownRenderer.vue";

useHead({
  title: "Chat with Claude - Minibot",
});

// Reactive state
const messages = ref([]);
const currentInput = ref("");
const currentStreamingMessage = ref("");
const currentStreamingThinking = ref("");
const currentStreamingUsage = ref(null);
const isStreaming = ref(false);
const isSearching = ref(false);
const searchQuery = ref("");
const currentSearchResults = ref([]);
const error = ref("");
const showSystemPrompt = ref(false);
const systemPrompt = ref(
  "You are Claude, a helpful AI assistant created by Anthropic. Be concise, accurate, and helpful in your responses."
);
const enableThinking = ref(false);
const thinkingBudget = ref(4096);
const enableWebSearch = ref(false);
const showThinking = ref({});

// Template refs
const messagesContainer = ref(null);

// Extract URLs from text for source citations
const extractSources = (text) => {
  const urlRegex = /https?:\/\/[^\s\)]+/g;
  const urls = text.match(urlRegex) || [];
  
  // Remove duplicates and create source objects
  const uniqueUrls = [...new Set(urls)];
  return uniqueUrls.map(url => {
    try {
      const urlObj = new URL(url);
      return {
        url: url,
        domain: urlObj.hostname,
        title: urlObj.hostname
      };
    } catch (e) {
      return {
        url: url,
        domain: url,
        title: url
      };
    }
  });
};

// Check if user is at the bottom of the scroll area
const isAtBottom = () => {
  if (!messagesContainer.value) return false;
  const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value;
  // Consider "at bottom" if within 10px of actual bottom to account for small discrepancies
  return scrollTop + clientHeight >= scrollHeight - 10;
};

// Auto-scroll to bottom only if user is already at the bottom
const scrollToBottom = (force = false) => {
  nextTick(() => {
    if (messagesContainer.value && (force || isAtBottom())) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

// Handle Shift+Enter for new lines
const handleShiftEnter = (event) => {
  // Allow default behavior (new line)
  return true;
};

// Send message function
const sendMessage = async () => {
  if (!currentInput.value.trim() || isStreaming.value) return;

  const userMessage = currentInput.value.trim();
  currentInput.value = "";
  error.value = "";

  // Add user message to chat
  messages.value.push({
    role: "user",
    content: userMessage,
    timestamp: new Date().toISOString(),
  });

  scrollToBottom(true); // Force scroll when user sends a message

  // Start streaming
  isStreaming.value = true;
  currentStreamingMessage.value = "";
  currentStreamingThinking.value = "";
  currentStreamingUsage.value = null;
  isSearching.value = false;
  searchQuery.value = "";
  currentSearchResults.value = [];

  try {
    // Prepare the request body
    const requestBody = {
      messages: messages.value.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    };

    // Add system prompt if provided
    if (systemPrompt.value.trim()) {
      requestBody.system = systemPrompt.value.trim();
    }

    // Add thinking parameters if enabled
    if (enableThinking.value) {
      requestBody.enableThinking = true;
      requestBody.thinkingBudget = thinkingBudget.value;
    }

    // Add web search parameter if enabled
    if (enableWebSearch.value) {
      requestBody.enableWebSearch = true;
    }

    // Send the request and read stream manually (EventSource doesn't support POST)
    const response = await fetch("/api/chat-edge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Read the stream manually
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let currentEventType = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete lines
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim() === "") continue;

        if (line.startsWith("event: ")) {
          currentEventType = line.substring(7).trim();
          continue;
        }

        if (line.startsWith("data: ")) {
          const data = line.substring(6);

          try {
            const parsed = JSON.parse(data);

            // Handle different event types
            if (currentEventType === "text_delta") {
              currentStreamingMessage.value += parsed.text;
              scrollToBottom();
            } else if (currentEventType === "thinking_delta") {
              const thinkingText = parsed.text || "";
              currentStreamingThinking.value += thinkingText;
              scrollToBottom();
            } else if (currentEventType === "message_start") {
              // Capture initial usage info if available
              if (parsed.usage) {
                currentStreamingUsage.value = { ...parsed.usage };
              }
            } else if (currentEventType === "message_delta") {
              // Update usage info during streaming - merge with existing usage
              if (parsed.usage) {
                if (currentStreamingUsage.value) {
                  // Merge the usage data, taking the latest values (they should be cumulative)
                  currentStreamingUsage.value = {
                    input_tokens:
                      parsed.usage.input_tokens ??
                      currentStreamingUsage.value.input_tokens ??
                      0,
                    output_tokens:
                      parsed.usage.output_tokens ??
                      currentStreamingUsage.value.output_tokens ??
                      0,
                    thinking_tokens:
                      parsed.usage.thinking_tokens ??
                      currentStreamingUsage.value.thinking_tokens ??
                      0,
                    response_tokens:
                      parsed.usage.response_tokens ??
                      currentStreamingUsage.value.response_tokens ??
                      0,
                    cache_creation_input_tokens:
                      parsed.usage.cache_creation_input_tokens ??
                      currentStreamingUsage.value.cache_creation_input_tokens ??
                      0,
                    cache_read_input_tokens:
                      parsed.usage.cache_read_input_tokens ??
                      currentStreamingUsage.value.cache_read_input_tokens ??
                      0,
                  };
                } else {
                  currentStreamingUsage.value = { ...parsed.usage };
                }
              }
            } else if (currentEventType === "message_stop") {
              // Finalize the message
              const newMessage = {
                role: "assistant",
                content: currentStreamingMessage.value,
                timestamp: new Date().toISOString(),
                usage: currentStreamingUsage.value,
              };

              // Add thinking content if present
              if (currentStreamingThinking.value) {
                newMessage.thinking = currentStreamingThinking.value;
              }

              // Add search results as sources if available
              if (currentSearchResults.value.length > 0) {
                newMessage.sources = currentSearchResults.value
                  .filter(result => result.type === 'web_search_result')
                  .map(result => ({
                    url: result.url,
                    title: result.title,
                    domain: new URL(result.url).hostname
                  }));
              }

              messages.value.push(newMessage);
              currentStreamingMessage.value = "";
              currentStreamingThinking.value = "";
              currentStreamingUsage.value = null;
              currentSearchResults.value = [];
              isStreaming.value = false;
              scrollToBottom(true); // Force scroll when message is complete
              break;
            } else if (currentEventType === "web_search_start") {
              isSearching.value = true;
              scrollToBottom();
            } else if (currentEventType === "web_search_result") {
              isSearching.value = false;
              searchQuery.value = "";
              // Store search results for later use in citations
              if (parsed.results) {
                currentSearchResults.value = parsed.results;
              }
              scrollToBottom();
            } else if (currentEventType === "tool_input_delta") {
              // Handle partial search query updates
              try {
                const partialInput = JSON.parse(parsed.partial_json || "{}");
                if (partialInput.query) {
                  searchQuery.value = partialInput.query;
                  scrollToBottom();
                }
              } catch (e) {
                // Ignore malformed JSON during streaming
              }
            } else if (currentEventType === "done") {
              isStreaming.value = false;
              break;
            } else if (currentEventType === "error") {
              throw new Error(parsed.error || "Unknown error occurred");
            }
          } catch (parseError) {
            console.warn("Failed to parse SSE data:", parseError);
          }
        }
      }
    }
  } catch (err) {
    console.error("Chat error:", err);
    error.value = err.message || "Failed to send message. Please try again.";
    isStreaming.value = false;
    currentStreamingMessage.value = "";
    currentStreamingThinking.value = "";
    currentStreamingUsage.value = null;
    isSearching.value = false;
    searchQuery.value = "";
    currentSearchResults.value = [];
  }
};

// Clear chat function
const clearChat = () => {
  messages.value = [];
  error.value = "";
  currentStreamingMessage.value = "";
  currentStreamingThinking.value = "";
  currentStreamingUsage.value = null;
  isStreaming.value = false;
  isSearching.value = false;
  searchQuery.value = "";
  currentSearchResults.value = [];
  showThinking.value = {};
};
</script>
