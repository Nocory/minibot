# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev` (runs on http://localhost:3000)
- **Build for production**: `npm run build`
- **Generate static site**: `npm run generate`
- **Preview production build**: `npm run preview`
- **Install dependencies**: `npm install`

## Architecture Overview

This is a Nuxt 3 application with the following key characteristics:

- **Framework**: Nuxt 3 with TypeScript support
- **Routing**: File-based routing using pages directory
- **Styling**: Tailwind CSS for utility-first styling
- **Icons**: @nuxt/icon for icon management
- **Fonts**: @nuxt/fonts for font optimization
- **Testing**: @nuxt/test-utils integrated
- **Linting**: @nuxt/eslint with custom rule configurations

## Key Directories and Files

- `app.vue`: Root application component
- `pages/`: File-based routing directory
  - `pages/index.vue`: Home page with welcome message and navigation
  - `pages/reverse.vue`: String reversal demo page showing server-client communication
  - `pages/chat.vue`: Interactive chat interface with Claude using streaming responses
- `server/`: Server-side code and API routes
  - `server/api/reverse.post.ts`: POST endpoint for string reversal with validation
  - `server/api/chat.post.ts`: POST endpoint for streaming chat with Anthropic Claude API
- `nuxt.config.ts`: Main configuration file with modules setup
- `eslint.config.mjs`: ESLint configuration with custom rule overrides
- `public/`: Static assets (favicon, robots.txt)

## API Routes

### POST /api/reverse
Reverses a string input with validation.

**Request body:**
```json
{
  "text": "string to reverse"
}
```

**Response:**
```json
{
  "original": "string to reverse",
  "reversed": "esrever ot gnirts",
  "length": 17,
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

**Validation:**
- Text cannot be empty
- Text cannot exceed 1000 characters
- Returns 400 error for invalid input

### POST /api/chat
Streams responses from Anthropic Claude API supporting continuous conversations.

**Request body:**
```json
{
  "system": "Optional system prompt for Claude",
  "messages": [
    {"role": "user", "content": "Hello, how are you?"},
    {"role": "assistant", "content": "I'm doing well, thank you!"},
    {"role": "user", "content": "What can you help me with?"}
  ],
  "enableThinking": false,
  "thinkingBudget": 10000
}
```

**Response:**
Server-sent events (SSE) stream with the following event types:
- `message_start`: Initializes the response message
- `thinking_delta`: Incremental thinking content from Claude (when extended thinking is enabled)
- `text_delta`: Incremental text content from Claude
- `message_delta`: Usage and metadata updates
- `message_stop`: Indicates response completion
- `error`: Error information if something goes wrong
- `done`: Final event marking end of stream

**Validation:**
- Messages array is required and cannot be empty
- Each message must have `role` ("user" or "assistant") and `content`
- Message content must be non-empty strings
- Maximum 50 messages per conversation to prevent excessive API usage
- System prompt is optional but must be a non-empty string if provided
- `enableThinking` is optional boolean (default: false)
- `thinkingBudget` is optional number between 1024 and 100000 (default: 10000)

**Environment Requirements:**
- `ANTHROPIC_API_KEY` environment variable must be set

## Pages

### / (Home)
Welcome page with navigation to demo pages.

### /chat
Interactive chat interface with Claude featuring:
- **Real-time streaming**: Responses stream in real-time using server-sent events
- **Extended thinking mode**: Toggle to enable Claude's visible reasoning process
- **Thinking budget control**: Slider to adjust how deeply Claude thinks (1K-50K tokens)
- **System prompt configuration**: Collapsible area to customize Claude's behavior
- **Conversation history**: Messages persist within the session (no cross-session persistence)
- **Thinking block display**: Collapsible sections showing Claude's internal reasoning
- **Mobile responsive**: Optimized for both desktop and mobile devices
- **Keyboard shortcuts**: Enter to send, Shift+Enter for new lines

### /reverse
String reversal demo showing basic API communication.

## Server-Side Development

- API routes should be created in `server/api/` directory
- Event handlers use `defineEventHandler()` for route definitions
- Request bodies can be read with `readBody(event)`
- Query parameters accessible via `getQuery(event)`
- Use `createError()` for proper error handling

## Frontend-Backend Communication

- Use `$fetch()` for client-side API calls
- Use `useFetch()` for SSR-compatible data fetching
- Server routes in `server/api/` auto-register as `/api/*` endpoints

## Styling Guidelines

- **Tailwind CSS**: Use utility-first classes for styling components
- **Component Structure**: Prefer semantic HTML elements with Tailwind classes
- **Responsive Design**: Use Tailwind's responsive prefixes (sm:, md:, lg:, xl:)
- **Color System**: Use Tailwind's default color palette for consistency
- **Focus States**: Always include focus states for interactive elements

## Module Configuration

The application includes these Nuxt modules:
- `@nuxt/eslint`: ESLint integration with custom rule overrides
- `@nuxt/fonts`: Font optimization
- `@nuxt/icon`: Icon system
- `@nuxt/test-utils`: Testing utilities
- `@nuxtjs/tailwindcss`: Tailwind CSS integration

## Dependencies

Additional packages used:
- `@anthropic-ai/sdk`: Official Anthropic SDK for Claude API integration

## ESLint Configuration

Custom ESLint rules have been configured:
- `vue/html-self-closing`: Disabled to allow flexibility in HTML self-closing tags