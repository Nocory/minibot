<template>
  <div class="py-8 px-4">
    <div class="text-center max-w-4xl mx-auto">
      <h1 class="text-4xl font-bold mb-4 text-gray-900">Welcome to Minibot</h1>
      <p class="text-lg text-gray-600 mb-8">
        A powerful AI chat application powered by Claude
      </p>
      
      <div class="space-y-4">
        <div class="flex justify-center">
          <NuxtLink 
            to="/chat" 
            class="inline-block py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm transition-colors text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Chat with Claude
          </NuxtLink>
        </div>
        
        <p class="text-sm text-gray-500">
          Experience intelligent conversations with advanced AI capabilities including web search
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
useHead({
  title: 'Minibot - Home'
})
</script>