<template>
  <div v-html="renderedMarkdown" class="markdown-content"></div>
</template>

<script setup>
import MarkdownIt from 'markdown-it'

const props = defineProps({
  content: {
    type: String,
    default: ''
  }
})

// Initialize markdown-it with basic settings
const md = new MarkdownIt()

// Compute the rendered markdown
const renderedMarkdown = computed(() => {
  return md.render(props.content || '')
})
</script>

<style scoped>
.markdown-content {
  /* Basic markdown styling */
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  font-weight: 600;
  margin-top: 1em;
  margin-bottom: 0.5em;
}

.markdown-content :deep(h1) { font-size: 1.25em; }
.markdown-content :deep(h2) { font-size: 1.125em; }
.markdown-content :deep(h3) { font-size: 1.1em; }

.markdown-content :deep(p) {
  margin-bottom: 0.75em;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin-bottom: 0.75em;
  margin-left: 1.5em;
}

.markdown-content :deep(li) {
  margin-bottom: 0.25em;
}

.markdown-content :deep(code) {
  background-color: #f3f4f6;
  border-radius: 0.25rem;
  padding: 0.125rem 0.25rem;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 0.875em;
}

.markdown-content :deep(pre) {
  background-color: #f3f4f6;
  border-radius: 0.5rem;
  padding: 1rem;
  overflow-x: auto;
  margin-bottom: 0.75em;
}

.markdown-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid #e5e7eb;
  padding-left: 1rem;
  margin-left: 0;
  margin-bottom: 0.75em;
  color: #6b7280;
}

.markdown-content :deep(strong) {
  font-weight: 600;
}

.markdown-content :deep(em) {
  font-style: italic;
}

.markdown-content :deep(a) {
  color: #2563eb;
  text-decoration: underline;
}

.markdown-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 0.75em;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid #e5e7eb;
  padding: 0.5rem;
  text-align: left;
}

.markdown-content :deep(th) {
  background-color: #f9fafb;
  font-weight: 600;
}
</style>