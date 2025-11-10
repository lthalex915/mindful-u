(function () {
"use strict";
/**
 * Reconstructed app.js
 * - Scope to chat.html only (UI, tone, config, send/start/delete)
 * - No camera/face-api logic here (moved to stress-monitoring.js)
 * - Single source of truth for chat state is ChatManager
 * - Cross-tab sync via ChatManager storage events -> mindfulU:chat-updated
 */

// ===== STATE (Chat page only) =====
let chatHistory = [];
let chatSessions = [];
let currentChatId = null;
let messageCount = 0;
let conversationEmotions = []; // kept for compatibility with some functions
let currentTone = 'friendly';
let apiKey = null;
let useAI = false;

// DOM references (chat.html)
const chatMessages = document.getElementById("chatMessages");
const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendButton");

// Optional controls on chat.html
const toneSelect = document.getElementById("toneSelect");
const resetToneBtn = document.getElementById("resetToneBtn");

// Optional API config controls (if present on chat.html or other pages)
const apiKeyInput = document.getElementById("apiKeyInput");
const modelInput = document.getElementById("modelInput");
const saveConfigBtn = document.getElementById("saveConfigBtn");
const toggleConfigBtn = document.getElementById("toggleConfigBtn");
const apiConfigContent = document.getElementById("apiConfigContent");
const statusIndicator = document.getElementById("statusIndicator");
const statusText = document.getElementById("statusText");

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  // Initialize ChatManager and hydrate local copies
  if (window.ChatManager) {
    ChatManager.initialize();
    hydrateFromManager();
  }

  // Render existing messages if any
  renderCurrentChat();

  // Wire chat input
  if (sendButton) sendButton.addEventListener("click", handleSendMessage);
  if (userInput) {
    userInput.addEventListener("keydown", onTextareaKeydown);
    userInput.addEventListener("input", autoResizeTextarea);
  }

  // History sidebar (chat.html)
  wireHistorySidebar();

  // Tone controls
  if (toneSelect) {
    toneSelect.value = currentTone;
    toneSelect.addEventListener("change", (e) => {
      ChatManager.setCurrentTone(e.target.value);
      currentTone = e.target.value;
      showToast?.({ type: 'info', title: 'Tone Updated', message: `Tone: ${getToneDisplayName(currentTone)}`, duration: 1500 });
    });
  }
  if (resetToneBtn) {
    resetToneBtn.addEventListener("click", () => {
      ChatManager.setCurrentTone('friendly');
      currentTone = 'friendly';
      if (toneSelect) toneSelect.value = 'friendly';
      showToast?.({ type: 'success', title: 'Tone Reset', message: 'Back to Friendly', duration: 1500 });
    });
  }

  // API config (if present)
  if (toggleConfigBtn) toggleConfigBtn.addEventListener("click", toggleApiConfig);
  if (saveConfigBtn) saveConfigBtn.addEventListener("click", saveConfiguration);
  loadConfiguration();

  // Cross-tab sync: refresh UI when other tab updates sessions
  window.addEventListener('mindfulU:chat-updated', () => {
    hydrateFromManager();
    renderCurrentChat();
    renderChatHistory();
  });
});

// ===== HYDRATE/RENDER =====
function hydrateFromManager() {
  chatHistory = ChatManager.getChatHistory();
  chatSessions = ChatManager.getChatSessions();
  currentChatId = ChatManager.getCurrentChatId();
  messageCount = ChatManager.getMessageCount();
  conversationEmotions = ChatManager.getConversationEmotions();
  currentTone = ChatManager.getCurrentTone();
  apiKey = ChatManager.getApiKey();
  useAI = ChatManager.isAIEnabled();
}

function renderCurrentChat() {
  if (!chatMessages) return;
  chatMessages.innerHTML = "";
  (chatHistory || []).forEach(msg => {
    displayMessage(msg.text, msg.sender, false);
  });
}

function renderChatHistory() {
  const chatHistoryList = document.getElementById("chatHistoryList");
  if (!chatHistoryList) return;

  if (!chatSessions || chatSessions.length === 0) {
    chatHistoryList.innerHTML = '<div class="empty-history">No chat history yet</div>';
    return;
  }

  chatHistoryList.innerHTML = "";
  chatSessions.forEach(chat => {
    const item = document.createElement("div");
    item.className = "chat-history-item" + (chat.id === currentChatId ? " active" : "");
    item.onclick = () => loadChat(chat.id);

    const date = new Date(chat.lastUpdated);
    const dateStr = ChatManager.formatDate(date);
    const lastMsg = chat.messages?.[chat.messages.length - 1];
    const preview = lastMsg ? lastMsg.text.substring(0, 40) + (lastMsg.text.length > 40 ? "..." : "") : "Empty chat";

    item.innerHTML = `
      <div class="chat-history-item-header">
        <div class="chat-history-item-title">${chat.title}</div>
        <div class="chat-history-item-date">${dateStr}</div>
      </div>
      <div class="chat-history-item-preview">${preview}</div>
      <button class="delete-chat-btn" onclick="deleteChat('${chat.id}', event)" title="Delete chat">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    `;

    chatHistoryList.appendChild(item);
  });
}

// ===== CHAT ACTIONS =====
function startNewChat() {
  ChatManager.startNewChat();
  hydrateFromManager();
  if (userInput) userInput.placeholder = "Share your daily life. AI is all ears ready for you.";
  addBotMessage("Hello! I'm MindfulU, your empathetic companion. I'm here to listen and support you. How are you feeling today?");
  renderChatHistory();
}

function saveCurrentChat() {
  ChatManager.saveCurrentChat();
  hydrateFromManager();
}

function loadChat(chatId) {
  const chat = ChatManager.loadChat(chatId);
  if (chat) {
    hydrateFromManager();
    renderCurrentChat();
    renderChatHistory();
  }
}

async function deleteChat(chatId, event) {
  event?.stopPropagation?.();
  const confirmed = await confirmDialog?.({
    type: 'warning',
    title: 'Delete Chat',
    subtitle: 'This action cannot be undone',
    message: 'Are you sure you want to delete this chat?',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    isDanger: true
  });
  if (confirmed === false) return;

  const wasCurrent = ChatManager.deleteChat(chatId);
  ChatManager.saveChatSessions();
  hydrateFromManager();
  if (wasCurrent) startNewChat();
  else renderChatHistory();

  showToast?.({ type: 'success', title: 'Chat Deleted', message: 'The chat has been removed.', duration: 2000 });
}

async function deleteAllChats() {
  if (!chatSessions || chatSessions.length === 0) {
    showToast?.({ type: 'info', title: 'No Chats', message: 'There are no chats to delete.', duration: 2000 });
    return;
  }

  const confirmed = await confirmDialog?.({
    type: 'error',
    title: 'Delete All Chats',
    subtitle: 'This will permanently delete all chat history',
    message: `Are you sure you want to delete all ${chatSessions.length} chat${chatSessions.length > 1 ? 's' : ''}?`,
    confirmText: 'Delete All',
    cancelText: 'Cancel',
    isDanger: true
  });
  if (confirmed === false) return;

  ChatManager.deleteAllChats();
  hydrateFromManager();
  startNewChat();

  showToast?.({ type: 'success', title: 'All Chats Deleted', message: 'All chat history has been permanently removed.', duration: 2500 });
}

async function handleSendMessage() {
  const message = (userInput?.value || "").trim();
  const validation = validateInput(message);
  if (!validation.valid) {
    userInput?.classList?.add('error');
    showErrorMessage(validation.error);
    setTimeout(() => userInput?.classList?.remove('error'), 1500);
    return;
  }

  // ensure session
  if (!ChatManager.getCurrentChatId()) {
    ChatManager.startNewChat();
    hydrateFromManager();
  }

  // Add user message
  addUserMessage(message);
  if (userInput) {
    userInput.value = "";
    userInput.style.height = "auto";
  }

  showTypingIndicator();

  try {
    if (useAI && apiKey) {
      const result = await getAIResponse(message);
      hideTypingIndicator();
      addBotMessage(result.response);
      if (result.recommendedPrompt && userInput) {
        userInput.placeholder = result.recommendedPrompt;
      }
    } else {
      setTimeout(() => {
        hideTypingIndicator();
        addBotMessage('You have not config the AI. Please go to <a href="settings.html">Settings</a>.');
      }, 1000 + Math.random() * 1000);
    }
  } catch (e) {
    console.error("Chat send error:", e);
    hideTypingIndicator();
    showErrorMessage('AI error. Using fallback response.');
    addBotMessage(generateBotResponse(message));
    updateRecommendationPrompt();
  }
}

// ===== UI HELPERS =====
function displayMessage(text, sender, animate = true) {
  if (!chatMessages) return;
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${sender}`;
  if (!animate) messageDiv.style.animation = "none";
  const bubbleDiv = document.createElement("div");
  bubbleDiv.className = "message-bubble";
  if (sender === "bot") {
    bubbleDiv.innerHTML = text;
  } else {
    bubbleDiv.textContent = text;
  }
  messageDiv.appendChild(bubbleDiv);
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addUserMessage(text) {
  displayMessage(text, "user", true);
  ChatManager.addMessage(text, "user");
  hydrateFromManager();
}

function addBotMessage(text) {
  displayMessage(text, "bot", true);
  ChatManager.addMessage(text, "bot");
  hydrateFromManager();
}

function showTypingIndicator() {
  if (!chatMessages) return;
  const typingDiv = document.createElement("div");
  typingDiv.className = "message bot";
  typingDiv.id = "typingIndicator";
  const bubbleDiv = document.createElement("div");
  bubbleDiv.className = "message-bubble typing-indicator";
  bubbleDiv.innerHTML = "<span></span><span></span><span></span>";
  typingDiv.appendChild(bubbleDiv);
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTypingIndicator() {
  const typingIndicator = document.getElementById("typingIndicator");
  typingIndicator?.remove?.();
}

function autoResizeTextarea() {
  if (!userInput) return;
  userInput.style.height = "auto";
  const newHeight = Math.min(Math.max(userInput.scrollHeight, 54), 200);
  userInput.style.height = newHeight + "px";
}

function onTextareaKeydown(e) {
  const isEnter = e.key === "Enter" || e.key === "NumpadEnter";
  if (!isEnter) return;
  if (e.shiftKey) {
    setTimeout(() => autoResizeTextarea(), 0);
    return;
  }
  e.preventDefault();
  handleSendMessage();
}

function showErrorMessage(message) {
  if (!chatMessages) return;
  const errorDiv = document.createElement('div');
  errorDiv.className = 'message bot error-message';
  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'message-bubble error-bubble';
  bubbleDiv.innerHTML = `<strong>⚠️ Error:</strong> ${message}`;
  errorDiv.appendChild(bubbleDiv);
  chatMessages.appendChild(errorDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function validateInput(input) {
  if (!input || input.trim().length === 0) return { valid: false, error: 'Please enter a message.' };
  if (input.trim().length > 5000) return { valid: false, error: 'Message is too long. Please keep it under 5000 characters.' };
  if (!/[a-zA-Z]/.test(input) && input.length < 3) return { valid: false, error: 'Please enter a meaningful message.' };
  return { valid: true };
}

function getToneDisplayName(tone) {
  const names = { friendly: 'Friendly', professional: 'Professional', casual: 'Casual', empathetic: 'Empathetic', motivational: 'Motivational' };
  return names[tone] || 'Friendly';
}

// ===== HISTORY SIDEBAR WIRING =====
function wireHistorySidebar() {
  const newChatBtn = document.getElementById("newChatBtn");
  const deleteAllChatsBtn = document.getElementById("deleteAllChatsBtn");
  const toggleHistoryBtn = document.getElementById("toggleHistoryBtn");
  const closeSidebarBtn = document.getElementById("closeSidebarBtn");
  const chatHistorySidebar = document.querySelector(".chat-history-sidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const chatHistoryList = document.getElementById("chatHistoryList");

  if (newChatBtn) newChatBtn.addEventListener("click", startNewChat);
  if (deleteAllChatsBtn) deleteAllChatsBtn.addEventListener("click", deleteAllChats);

  if (toggleHistoryBtn && chatHistorySidebar) {
    toggleHistoryBtn.addEventListener("click", () => {
      chatHistorySidebar.classList.add("active");
      toggleHistoryBtn.classList.add("hidden");
      sidebarOverlay?.classList?.add("active");
    });
  }
  if (closeSidebarBtn && chatHistorySidebar) {
    closeSidebarBtn.addEventListener("click", () => {
      chatHistorySidebar.classList.remove("active");
      toggleHistoryBtn?.classList?.remove("hidden");
      sidebarOverlay?.classList?.remove("active");
    });
  }
  if (sidebarOverlay && chatHistorySidebar) {
    sidebarOverlay.addEventListener("click", () => {
      chatHistorySidebar.classList.remove("active");
      toggleHistoryBtn?.classList?.remove("hidden");
      sidebarOverlay.classList.remove("active");
    });
  }

  if (chatHistoryList) renderChatHistory();
}

// ===== MODEL/CONFIG (kept minimal and page-agnostic) =====
function toggleApiConfig() {
  apiConfigContent?.classList?.toggle("hidden");
  toggleConfigBtn?.classList?.toggle("collapsed");
}

function loadConfiguration() {
  const savedKey = localStorage.getItem("mindfulU_apiKey");
  if (savedKey) {
    apiKey = savedKey;
    useAI = true;
    statusIndicator && updateApiStatus("active", "Configuration loaded - AI enabled");
  } else {
    statusIndicator && updateApiStatus("inactive", "Enter API key and model to continue");
  }
  const savedModel = localStorage.getItem("mindfulU_model");
  if (savedModel && modelInput) modelInput.value = savedModel;
  if (apiKeyInput && modelInput) validateConfigInputs();
}

function validateConfigInputs() {
  const apiKeyValue = apiKeyInput?.value?.trim();
  const modelValue = modelInput?.value?.trim();
  if (saveConfigBtn) saveConfigBtn.disabled = !(apiKeyValue && modelValue);
}

async function saveConfiguration() {
  const key = apiKeyInput?.value?.trim();
  const model = modelInput?.value?.trim();
  if (!key || !model) return updateApiStatus("error", "Please fill in both fields");
  if (!key.startsWith("sk-or-")) return updateApiStatus("error", "Invalid OpenRouter API key format");

  saveConfigBtn && (saveConfigBtn.disabled = true);
  updateApiStatus("inactive", "Testing configuration...");

  try {
    const ok = await testApiKeyWithModel(key, model);
    if (ok.success) {
      apiKey = key; useAI = true;
      localStorage.setItem("mindfulU_apiKey", key);
      localStorage.setItem("mindfulU_model", model);
      if (apiKeyInput) apiKeyInput.value = "";
      if (modelInput) modelInput.value = model;
      updateApiStatus("active", "Configuration saved - AI enabled");
      addBotMessage("✓ AI configuration successful! I'm now powered by AI and ready to provide personalized support.");
      addBotMessage(ok.message);
    } else {
      updateApiStatus("error", "Configuration failed" + (ok.error ? `: ${ok.error}` : ""));
    }
  } catch (e) {
    console.error(e);
    updateApiStatus("error", "Failed to validate configuration");
  } finally {
    validateConfigInputs();
  }
}

async function testApiKeyWithModel(key, model) {
  try {
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "HTTP-Referer": "https://mindfulu.local", "X-Title": "MindfulU" },
      body: JSON.stringify({ model, provider: { allow_fallbacks: false }, messages: [{ role: "user", content: "Introduce yourself briefly in one sentence." }], max_tokens: 50 })
    });
    const raw = await resp.text();
    let data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch {}
    if (!resp.ok) {
      const http = `HTTP ${resp.status}`;
      const providerCode = data?.error?.code ? ` [code: ${data.error.code}]` : "";
      const errMsg = (data && (data.error?.message || data.error || data.message)) || raw || http;
      const backoff = resp.status === 429 ? " Tip: Rate limit reached. Wait and try again." : "";
      return { success: false, message: null, error: `${http}${providerCode}: ${errMsg}${backoff}` };
    }
    const intro = data?.choices?.[0]?.message?.content?.trim() || "Hi, I'm your MindfulU AI companion.";
    return { success: true, message: intro, error: null };
  } catch (e) {
    console.error("API test error:", e);
    return { success: false, message: null, error: "Network/CORS error. Run a local server instead of file://." };
  }
}

function updateApiStatus(status, text) {
  if (!statusIndicator || !statusText) return;
  statusIndicator.className = `status-indicator ${status}`;
  statusText.textContent = text;
}

// ===== SIMPLE FALLBACK RESPONSE + PROMPT =====
function generateBotResponse(userMessage) {
  const lower = userMessage.toLowerCase();
  if (lower.includes("exam") || lower.includes("test") || lower.includes("study")) {
    return "Studying can be challenging. Remember to take regular breaks. How's your preparation going?";
  }
  if (lower.includes("tired") || lower.includes("exhausted")) {
    return "It sounds like you might need some rest. Have you been getting enough sleep lately?";
  }
  if (lower.includes("happy") || lower.includes("great") || lower.includes("good")) {
    return "That's wonderful to hear! What's been going well for you today? 😊";
  }
  return "I'm here to listen. Tell me more about what's on your mind.";
}

function updateRecommendationPrompt() {
  const prompts = [
    "Share what you've been up to today",
    "Is there anything on your mind?",
    "How are your studies going?",
    "Tell me about your recent happy moments"
  ];
  const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
  if (userInput) userInput.placeholder = randomPrompt;
}

// ===== AI CALL (no camera context here) =====
async function getAIResponse(userMessage) {
  const systemPrompt = `You are MindfulU, a supportive companion. Keep responses 2-3 sentences. Provide a [PROMPT] for the next message.\n\nFormat:\n[RESPONSE]...[/RESPONSE]\n[PROMPT]...[/PROMPT]`;
  const recentHistory = (chatHistory || []).slice(-6).map(msg => ({ role: msg.sender === "user" ? "user" : "assistant", content: msg.text }));
  const messages = [{ role: "system", content: systemPrompt }, ...recentHistory, { role: "user", content: userMessage }];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    // Provider-aware routing (OpenRouter / OpenAI-compatible / Deepseek)
    const provider = localStorage.getItem("mindfulU_provider") || "openrouter";
    const baseUrlPref = localStorage.getItem("mindfulU_baseUrl") || (provider === "deepseek" ? "https://api.deepseek.com/v1" : "");
    const selectedModel = localStorage.getItem("mindfulU_model")
      || (provider === "openrouter" ? "deepseek/deepseek-chat-v3-0324:free" : (provider === "deepseek" ? "deepseek-chat" : "gpt-4o-mini"));

    let url, headers, body;
    if (provider === "openrouter") {
      url = "https://openrouter.ai/api/v1/chat/completions";
      headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://mindfulu.local",
        "X-Title": "MindfulU"
      };
      body = {
        model: selectedModel,
        provider: { allow_fallbacks: true },
        messages,
        max_tokens: 500,
        temperature: 0.8
      };
    } else {
      const base = (baseUrlPref || (provider === "deepseek" ? "https://api.deepseek.com/v1" : "https://api.openai.com/v1")).replace(/\/+$/, "");
      url = `${base}/chat/completions`;
      headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      };
      body = {
        model: selectedModel,
        messages,
        max_tokens: 500,
        temperature: 0.8
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const text = await response.text();
      let msg = text;
      try { const j = text ? JSON.parse(text) : null; msg = j?.error?.message || j?.message || msg || `HTTP ${response.status}`; } catch {}
      throw new Error(`API request failed: HTTP ${response.status} - ${msg}`);
    }
    const data = await response.json();
    const fullResponse = data.choices?.[0]?.message?.content?.trim() || "";
    const responseMatch = fullResponse.match(/\[RESPONSE\]([\s\S]*?)(?:\[\/RESPONSE\]|$)/);
    const promptMatch = fullResponse.match(/\[PROMPT\]\s*([\s\S]*?)(?:\[\/PROMPT\]|$)/);
    let botResponse = responseMatch ? responseMatch[1].trim() : fullResponse.replace(/\[PROMPT\][\s\S]*?(?:\[\/PROMPT\]|$)/gi, "").replace(/\[\/?RESPONSE\]/gi, "").trim();
    let recommendedPrompt = promptMatch && promptMatch[1] ? promptMatch[1].trim() : null;
    const idx = botResponse.indexOf("[PROMPT]");
    if (idx !== -1) botResponse = botResponse.substring(0, idx).trim();
    return { response: botResponse, recommendedPrompt };
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

// ===== API CONFIGURATION FUNCTIONS =====
function toggleApiConfig() {
  apiConfigContent.classList.toggle("hidden");
  toggleConfigBtn.classList.toggle("collapsed");
}

// ===== MODEL SELECTION (AI) =====
function loadSelectedModel() {
  try {
    const savedModel = localStorage.getItem("mindfulU_model");
    if (savedModel && modelInput) {
      modelInput.value = savedModel;
    } else if (modelInput && !savedModel) {
      // Set default model
      modelInput.value = "deepseek/deepseek-chat-v3-0324:free";
    }
  } catch (e) {
    console.warn("Unable to load saved model:", e);
  }
}

function saveSelectedModel() {
  if (!modelInput) return;
  const selected = (modelInput.value || "").trim();

  if (!selected) {
    addBotMessage("⚠️ Please enter a valid model identifier.");
    return;
  }

  try {
    localStorage.setItem("mindfulU_model", selected);
    addBotMessage(`✓ Model set to: ${selected}`);
  } catch (e) {
    console.warn("Unable to save model selection:", e);
    addBotMessage("❌ Failed to save model selection.");
  }
}

async function saveApiKey() {
  const key = apiKeyInput.value.trim();

  if (!key) {
    updateApiStatus("error", "Please enter an API key");
    return;
  }

  if (!key.startsWith("sk-or-")) {
    updateApiStatus("error", "Invalid OpenRouter API key format");
    return;
  }

  // Persist the user's typed key as a pending value so it survives reloads
  try {
    localStorage.setItem("mindfulU_pending_apiKey", key);
  } catch {}

  // Test the API key
  updateApiStatus("inactive", "Testing API key...");
  saveApiKeyBtn.disabled = true;

  try {
    const result = await testApiKey(key);

    if (result.success) {
      apiKey = key;
      useAI = true;
      // Save as the active key and clear any pending draft
      localStorage.setItem("mindfulU_apiKey", key);
      localStorage.removeItem("mindfulU_pending_apiKey");
      updateApiStatus("active", "API key saved and active");
      apiKeyInput.value = "";

      // Add AI introduction message
      addBotMessage(result.message);
      addBotMessage(
        "I'm now ready to provide personalized support. How can I help you today?"
      );
    } else {
      const details = result.error ? `: ${result.error}` : "";
      updateApiStatus(
        "error",
        "Invalid API key or connection failed" + details
      );
      // keep the input so the user can edit/retry; do not overwrite saved active key
    }
  } catch (error) {
    console.error("Error testing API key:", error);
    updateApiStatus("error", "Failed to validate API key");
  } finally {
    saveApiKeyBtn.disabled = false;
  }
}

async function useDefaultKey() {
  updateApiStatus("inactive", "Activating default key...");
  useDefaultKeyBtn.disabled = true;

  try {
    const result = await testApiKey(DEFAULT_API_KEY);

    if (result.success) {
      // Only apply default if there is no user-provided active key
      const existing = localStorage.getItem("mindfulU_apiKey");
      if (!existing) {
        apiKey = DEFAULT_API_KEY;
        useAI = true;
        localStorage.setItem("mindfulU_apiKey", DEFAULT_API_KEY);
        updateApiStatus("active", "Default API key activated");
      } else {
        // Respect user's saved key
        apiKey = existing;
        useAI = true;
        updateApiStatus("active", "Using your saved API key");
      }

      // Add AI introduction message
      addBotMessage(result.message);
      addBotMessage("I'm now ready to support you. How can I help you today?");
    } else {
      updateApiStatus("error", "Default key validation failed");
    }
  } catch (error) {
    console.error("Error activating default key:", error);
    updateApiStatus("error", "Failed to activate default key");
  } finally {
    useDefaultKeyBtn.disabled = false;
  }
}

async function testApiKey(key) {
  try {
    const selectedModel =
      localStorage.getItem("mindfulU_model") ||
      "deepseek/deepseek-chat-v3-0324:free";

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          // If running via file:// some providers may reject dynamic referers
          "HTTP-Referer": "https://mindfulu.local",
          "X-Title": "MindfulU",
        },
        body: JSON.stringify({
          // Use the selected model for validation too
          model: selectedModel,
          // For validation, keep strict routing to surface access issues clearly
          provider: { allow_fallbacks: false },
          messages: [
            {
              role: "user",
              content: "Introduce yourself briefly in one sentence.",
            },
          ],
          max_tokens: 50,
        }),
      }
    );

    const raw = await response.text();
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch (_) {
      // keep raw text
    }

    if (!response.ok) {
      // Surface HTTP code and provider error code if present
      const http = `HTTP ${response.status}`;
      const providerCode = data?.error?.code
        ? ` [code: ${data.error.code}]`
        : "";
      const errMsg =
        (data && (data.error?.message || data.error || data.message)) ||
        raw ||
        http;

      // Rate limit/backoff hint for 429
      const backoff =
        response.status === 429
          ? " Tip: You have hit a rate limit. Wait a minute and try again, or use a different model/enable fallbacks."
          : "";

      return {
        success: false,
        message: null,
        error: `${http}${providerCode}: ${errMsg}${backoff}`,
      };
    }

    const aiIntroduction =
      data?.choices?.[0]?.message?.content?.trim() ||
      "Hi, I'm your MindfulU AI companion.";

    return { success: true, message: aiIntroduction, error: null };
  } catch (error) {
    console.error("API test error:", error);
    return {
      success: false,
      message: null,
      error:
        "Network/CORS error. If you opened index.html directly, run a local server (e.g., VSCode Live Server) so requests are not from file://.",
    };
  }
}

function updateApiStatus(status, text) {
  statusIndicator.className = `status-indicator ${status}`;
  statusText.textContent = text;
}

function loadApiKey() {
  const savedKey = localStorage.getItem("mindfulU_apiKey");
  if (savedKey) {
    apiKey = savedKey;
    useAI = true;
    updateApiStatus("active", "API key loaded");
  } else {
    apiKey = null;
    useAI = false;
    updateApiStatus("inactive", "No API key set");
  }

  // Pre-fill input with any pending key user typed previously (not validated yet)
  const pendingKey = localStorage.getItem("mindfulU_pending_apiKey");
  if (pendingKey && typeof apiKeyInput !== "undefined" && apiKeyInput) {
    apiKeyInput.value = pendingKey;
  }
}

// ===== NEW CONFIGURATION SYSTEM =====
function validateConfigInputs() {
  const apiKeyValue = apiKeyInput.value.trim();
  const modelValue = modelInput.value.trim();

  // Enable button only if both fields are filled
  if (apiKeyValue && modelValue) {
    saveConfigBtn.disabled = false;
  } else {
    saveConfigBtn.disabled = true;
  }
}

function loadConfiguration() {
  // Load saved API key
  const savedKey = localStorage.getItem("mindfulU_apiKey");
  if (savedKey) {
    apiKey = savedKey;
    useAI = true;
    if (statusIndicator) {
      updateApiStatus("active", "Configuration loaded - AI enabled");
    }
  } else {
    if (statusIndicator) {
      updateApiStatus("inactive", "Enter API key and model to continue");
    }
  }

  // Load saved model
  const savedModel = localStorage.getItem("mindfulU_model");
  if (savedModel && modelInput) {
    modelInput.value = savedModel;
  }

  // Validate inputs to set button state (only if elements exist)
  if (apiKeyInput && modelInput) {
    validateConfigInputs();
  }
}

async function saveConfiguration() {
  const key = apiKeyInput.value.trim();
  const model = modelInput.value.trim();

  if (!key || !model) {
    updateApiStatus("error", "Please fill in both fields");
    return;
  }

  if (!key.startsWith("sk-or-")) {
    updateApiStatus("error", "Invalid OpenRouter API key format");
    return;
  }

  // Disable button and show testing status
  saveConfigBtn.disabled = true;
  updateApiStatus("inactive", "Testing configuration...");

  try {
    // Test the API key with the selected model
    const result = await testApiKeyWithModel(key, model);

    if (result.success) {
      // Save configuration
      apiKey = key;
      useAI = true;
      localStorage.setItem("mindfulU_apiKey", key);
      localStorage.setItem("mindfulU_model", model);

      // Clear inputs
      apiKeyInput.value = "";
      modelInput.value = model; // Keep model visible

      // Update status
      updateApiStatus("active", "Configuration saved - AI enabled");

      // Add success message
      addBotMessage(
        "✓ AI configuration successful! I'm now powered by AI and ready to provide personalized support."
      );
      addBotMessage(result.message);
    } else {
      const details = result.error ? `: ${result.error}` : "";
      updateApiStatus("error", "Configuration failed" + details);
    }
  } catch (error) {
    console.error("Error saving configuration:", error);
    updateApiStatus("error", "Failed to validate configuration");
  } finally {
    validateConfigInputs(); // Re-enable button if fields are still filled
  }
}

async function testApiKeyWithModel(key, model) {
  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          "HTTP-Referer": "https://mindfulu.local",
          "X-Title": "MindfulU",
        },
        body: JSON.stringify({
          model: model,
          provider: { allow_fallbacks: false },
          messages: [
            {
              role: "user",
              content: "Introduce yourself briefly in one sentence.",
            },
          ],
          max_tokens: 50,
        }),
      }
    );

    const raw = await response.text();
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch (_) {}

    if (!response.ok) {
      const http = `HTTP ${response.status}`;
      const providerCode = data?.error?.code
        ? ` [code: ${data.error.code}]`
        : "";
      const errMsg =
        (data && (data.error?.message || data.error || data.message)) ||
        raw ||
        http;
      const backoff =
        response.status === 429
          ? " Tip: Rate limit reached. Wait and try again."
          : "";

      return {
        success: false,
        message: null,
        error: `${http}${providerCode}: ${errMsg}${backoff}`,
      };
    }

    const aiIntroduction =
      data?.choices?.[0]?.message?.content?.trim() ||
      "Hi, I'm your MindfulU AI companion.";

    return { success: true, message: aiIntroduction, error: null };
  } catch (error) {
    console.error("API test error:", error);
    return {
      success: false,
      message: null,
      error:
        "Network/CORS error. Run a local server (e.g., VSCode Live Server) instead of opening index.html directly.",
    };
  }
}

// ===== TONE SELECTION FUNCTIONS =====
function handleToneChange(event) {
  currentTone = event.target.value;
  saveToLocalStorage();
  
  // Show a brief notification that tone has changed
  showToast({
    type: 'info',
    title: 'Tone Updated',
    message: `Chatbot tone changed to ${getToneDisplayName(currentTone)}.`,
    duration: 2000
  });
}

function resetTone() {
  currentTone = 'friendly';
  if (toneSelect) {
    toneSelect.value = currentTone;
  }
  saveToLocalStorage();
  
  showToast({
    type: 'success',
    title: 'Tone Reset',
    message: 'Chatbot tone reset to default (Friendly).',
    duration: 2000
  });
}

function getToneDisplayName(tone) {
  const names = {
    'friendly': 'Friendly',
    'professional': 'Professional',
    'casual': 'Casual',
    'empathetic': 'Empathetic',
    'motivational': 'Motivational'
  };
  return names[tone] || 'Friendly';
}

function getSystemPromptForTone(tone, stressLevel, emotionContext, messageCount) {
  const baseContext = `Current Context:
- User's stress level: ${stressLevel} (${Math.round(stressScore)}%)
- ${emotionContext}
- Messages exchanged: ${messageCount}`;

  const baseGuidelines = `Guidelines:
- Keep responses natural and conversational (2-3 sentences)
- Use "I" statements to show empathy ("I hear you", "I understand")
- If stress is high, gently suggest calming techniques as a friend would
- If stress is low, celebrate with them and be encouraging
- Use emojis naturally but sparingly (like texting a friend)
- Never diagnose or provide medical advice - if serious, suggest talking to a counselor as a friend would recommend
- Adapt your tone based on their emotional state

IMPORTANT: You must format your response in two parts:
1. Your caring response to the user
2. A personalized prompt suggestion for their next message

Format EXACTLY as follows (including the tags):
[RESPONSE]Your caring response here[/RESPONSE]
[PROMPT]A short, engaging prompt suggestion (e.g., "Tell me about your favorite moment today")[/PROMPT]

CRITICAL: Always include both opening and closing tags. The [PROMPT] section will be hidden from the user and only used to update the input placeholder.`;

  const tonePrompts = {
    'friendly': `You are MindfulU, a warm and friendly AI companion for undergraduate students. Think of yourself as a supportive friend who genuinely cares about their well-being.

${baseContext}

Your Personality:
- Talk like a caring friend, not a therapist or formal assistant
- Be conversational, warm, and relatable
- Use casual language while remaining supportive
- Show genuine interest in what they're sharing
- Acknowledge their feelings without being overly clinical

${baseGuidelines}`,

    'professional': `You are MindfulU, a professional AI counselor for undergraduate students. You provide supportive guidance with a calm, composed demeanor.

${baseContext}

Your Personality:
- Maintain a professional yet approachable tone
- Use clear, structured language
- Show empathy through thoughtful responses
- Provide practical advice when appropriate
- Maintain appropriate boundaries as a professional helper

${baseGuidelines}`,

    'casual': `You are MindfulU, a laid-back AI buddy for undergraduate students. You're chill and easy-going, like hanging out with a good friend.

${baseContext}

Your Personality:
- Use very casual, conversational language
- Be relaxed and informal
- Use slang and contractions naturally
- Keep it light-hearted and fun
- Show you care in a low-key way

${baseGuidelines}`,

    'empathetic': `You are MindfulU, a deeply empathetic AI companion for undergraduate students. Your primary focus is understanding and validating emotions.

${baseContext}

Your Personality:
- Focus intensely on emotional validation
- Use phrases that show deep understanding
- Acknowledge feelings before offering suggestions
- Be gentle and patient
- Create a safe space for emotional expression

${baseGuidelines}`,

    'motivational': `You are MindfulU, an encouraging AI coach for undergraduate students. You inspire action and build confidence.

${baseContext}

Your Personality:
- Be energetic and encouraging
- Focus on strengths and potential
- Provide motivational support
- Help set small, achievable goals
- Celebrate progress and effort

${baseGuidelines}`
  };

  return tonePrompts[tone] || tonePrompts['friendly'];
}


// ===== TEXTAREA AUTO-RESIZE =====
function autoResizeTextarea() {
  // Reset height to auto to get the correct scrollHeight
  userInput.style.height = "auto";

  // Set the height based on scrollHeight, respecting min and max
  const newHeight = Math.min(Math.max(userInput.scrollHeight, 54), 200);
  userInput.style.height = newHeight + "px";
}

// Insert a newline at the current caret position within the textarea
function insertNewLineAtCursor(textarea) {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const before = textarea.value.substring(0, start);
  const after = textarea.value.substring(end);
  textarea.value = `${before}\n${after}`;
  // Move caret to just after the inserted newline
  const newCaret = start + 1;
  textarea.setSelectionRange(newCaret, newCaret);
}

// ===== ERROR HANDLING UTILITIES =====
function showErrorMessage(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'message bot error-message';
  
  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'message-bubble error-bubble';
  bubbleDiv.innerHTML = `<strong>⚠️ Error:</strong> ${message}`;
  
  errorDiv.appendChild(bubbleDiv);
  chatMessages.appendChild(errorDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function validateInput(input) {
  if (!input || input.trim().length === 0) {
    return { valid: false, error: 'Please enter a message.' };
  }
  
  if (input.trim().length > 5000) {
    return { valid: false, error: 'Message is too long. Please keep it under 5000 characters.' };
  }
  
  // Check for only special characters or numbers
  if (!/[a-zA-Z]/.test(input) && input.length < 3) {
    return { valid: false, error: 'Please enter a meaningful message.' };
  }
  
  return { valid: true };
}

// ===== CHATBOT LOGIC =====
async function handleSendMessage() {
  const message = userInput.value.trim();

  // Validate input
  const validation = validateInput(message);
  if (!validation.valid) {
    userInput.classList.add('error');
    showErrorMessage(validation.error);
    setTimeout(() => {
      userInput.classList.remove('error');
    }, 2000);
    return;
  }

  // Disable send button and input during processing
  sendButton.disabled = true;
  userInput.disabled = true;

  try {
    // Increment message count (for simple analytics only)
    messageCount++;

    // Add user message
    addUserMessage(message);

    // Clear input and reset height
    userInput.value = "";
    userInput.style.height = "auto";

    // Show typing indicator
    showTypingIndicator();

    // Check if AI is enabled
    if (useAI && apiKey) {
      try {
        const result = await getAIResponse(message);
        hideTypingIndicator();
        addBotMessage(result.response);

        // Update placeholder with recommended prompt
        if (result.recommendedPrompt) {
          userInput.placeholder = result.recommendedPrompt;
        }
      } catch (error) {
        console.error("AI response error:", error);
        hideTypingIndicator();
        
        // Show specific error messages
        if (error.message.includes('HTTP 429') || error.message.includes('Rate limit')) {
          showErrorMessage('Too many requests. Please wait a moment before trying again.');
        } else if (error.message.includes('HTTP 401') || error.message.includes('unauthorized')) {
          showErrorMessage('API key is invalid. Please check your configuration.');
        } else if (error.message.includes('HTTP 5')) {
          showErrorMessage('AI service is temporarily unavailable. Using fallback response.');
        } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
          showErrorMessage('Network error. Please check your internet connection.');
        } else {
          showErrorMessage('AI service error. Using fallback response.');
        }
        
        // Fallback to rule-based response
        const response = generateBotResponse(message);
        addBotMessage(response);

        // Generate a simple recommendation prompt for fallback
        updateRecommendationPrompt();
      }
    } else {
      setTimeout(() => {
        hideTypingIndicator();
        addBotMessage('You have not config the AI. Please go to <a href="settings.html">Settings</a>.');
      }, 1000 + Math.random() * 1000);
    }
  } catch (error) {
    console.error("Message handling error:", error);
    hideTypingIndicator();
    showErrorMessage('An unexpected error occurred. Please try again.');
  } finally {
    // Re-enable input and button
    sendButton.disabled = false;
    userInput.disabled = false;
    userInput.focus();
  }
}

// ===== RECOMMENDATION PROMPT GENERATOR =====
function updateRecommendationPrompt() {
  // Generate contextual prompt suggestions based on stress level and conversation
  const prompts = {
    high: [
      "Want to talk about what's stressing you out?",
      "Did something particular happen today?",
      "How can I help you right now?",
      "Tell me how you're feeling",
      "Would you like some relaxation tips?",
    ],
    medium: [
      "Share what you've been up to today",
      "Is there anything on your mind?",
      "What's new with you lately?",
      "How are your studies going?",
      "How has your day been?",
    ],
    low: [
      "Share something that made you happy!",
      "What was your favorite moment today?",
      "Let's chat about something you enjoy",
      "Any exciting plans you'd like to share?",
      "Tell me about your recent happy moments",
    ],
  };

  // Determine stress category
  const stressCategory =
    stressScore > 65 ? "high" : stressScore < 30 ? "low" : "medium";

  // Select a random prompt from the appropriate category
  const categoryPrompts = prompts[stressCategory];
  const randomPrompt =
    categoryPrompts[Math.floor(Math.random() * categoryPrompts.length)];

  // Update the placeholder
  userInput.placeholder = randomPrompt;
}

// ===== STRESS ANALYSIS FROM CONVERSATION =====
function analyzeConversationalStress() {
  // Analyze emotions from recent messages (last 3-5 messages)
  const recentEmotions = conversationEmotions.slice(-5);

  if (recentEmotions.length < 3) return; // Need at least 3 messages

  // Calculate average emotion levels across conversation
  const avgEmotions = {
    happy: 0,
    sad: 0,
    angry: 0,
    fearful: 0,
    surprised: 0,
    disgusted: 0,
    neutral: 0,
  };

  recentEmotions.forEach((snapshot) => {
    Object.keys(avgEmotions).forEach((emotion) => {
      avgEmotions[emotion] += snapshot.emotions[emotion];
    });
  });

  // Calculate averages
  const count = recentEmotions.length;
  Object.keys(avgEmotions).forEach((emotion) => {
    avgEmotions[emotion] /= count;
  });

  // Calculate conversational stress score (0-100)
  // Negative emotions contribute to stress
  const negativeScore =
    (avgEmotions.sad +
      avgEmotions.angry +
      avgEmotions.fearful +
      avgEmotions.disgusted) *
    100;
  // Positive emotions reduce stress
  const positiveScore = avgEmotions.happy * 100;
  // Neutral is baseline
  const neutralScore = avgEmotions.neutral * 50;

  // Weighted calculation: more weight on negative emotions
  const conversationalStress = Math.min(
    100,
    Math.max(0, negativeScore * 1.5 - positiveScore * 1.2 + neutralScore * 0.3)
  );

  // Blend conversational stress with real-time camera stress (60% conversation, 40% camera)
  const blendedStress = conversationalStress * 0.6 + stressScore * 0.4;

  // Update stress score with blended value
  stressScore = blendedStress;

  // Update UI
  updateStressBar();

  // Save to localStorage
  saveToLocalStorage();

  console.log(`Conversational Stress Analysis (${count} messages):`, {
    conversationalStress: Math.round(conversationalStress),
    cameraStress: Math.round((stressScore * 0.4) / 0.6),
    blendedStress: Math.round(blendedStress),
    avgEmotions: Object.fromEntries(
      Object.entries(avgEmotions).map(([k, v]) => [
        k,
        Math.round(v * 100) + "%",
      ])
    ),
  });
}

async function getAIResponse(userMessage) {
  // Simpler prompt for chat-only page
  const systemPrompt = `You are MindfulU, a supportive companion for students. Keep responses friendly, 2-3 sentences. Also provide a suggested next prompt.\n\nFormat exactly:\n[RESPONSE]...[/RESPONSE]\n[PROMPT]...[/PROMPT]`;

  // Get recent chat history for context (last 6 messages)
  const recentHistory = (chatHistory || []).slice(-6).map((msg) => ({
    role: msg.sender === "user" ? "user" : "assistant",
    content: msg.text,
  }));

  const messages = [
    { role: "system", content: systemPrompt },
    ...recentHistory,
    { role: "user", content: userMessage },
  ];

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    // Provider-aware routing (OpenRouter / OpenAI-compatible / Deepseek)
    const provider = localStorage.getItem("mindfulU_provider") || "openrouter";
    const baseUrlPref = localStorage.getItem("mindfulU_baseUrl") || (provider === "deepseek" ? "https://api.deepseek.com/v1" : "");
    const selectedModel =
      localStorage.getItem("mindfulU_model") ||
      (provider === "openrouter" ? "deepseek/deepseek-chat-v3-0324:free" : (provider === "deepseek" ? "deepseek-chat" : "gpt-4o-mini"));

    let url, headers, body;
    if (provider === "openrouter") {
      url = "https://openrouter.ai/api/v1/chat/completions";
      headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        // Use stable referer like in validation
        "HTTP-Referer": "https://mindfulu.local",
        "X-Title": "MindfulU",
      };
      body = {
        // Use the user-selected model for chat
        model: selectedModel,
        // Enable fallbacks in chat calls to reduce 429 from a single provider
        provider: { allow_fallbacks: true },
        messages: messages,
        max_tokens: 500,
        temperature: 0.8,
      };
    } else {
      const base = (baseUrlPref || (provider === "deepseek" ? "https://api.deepseek.com/v1" : "https://api.openai.com/v1")).replace(/\/+$/, "");
      url = `${base}/chat/completions`;
      headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      };
      body = {
        model: selectedModel,
        messages: messages,
        max_tokens: 500,
        temperature: 0.8,
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text();
      let msg = text;
      try {
        const j = text ? JSON.parse(text) : null;
        msg = j?.error?.message || j?.message || msg || `HTTP ${response.status}`;
      } catch {}
      const rateHint =
        response.status === 429
          ? " Tip: Rate limit reached. Wait and retry, or try again in a bit."
          : "";
      throw new Error(
        `API request failed: HTTP ${response.status} - ${msg}${rateHint}`
      );
    }

    const data = await response.json();
    
    // Validate response data
    if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from API');
    }
  const fullResponse = data.choices[0].message.content.trim();

  // Parse the response and prompt with flexible matching
  const responseMatch = fullResponse.match(
    /\[RESPONSE\]([\s\S]*?)(?:\[\/RESPONSE\]|$)/
  );
  const promptMatch = fullResponse.match(
    /\[PROMPT\]\s*([\s\S]*?)(?:\[\/PROMPT\]|$)/
  );

  // Extract the bot response, removing all PROMPT and RESPONSE tags
  let botResponse;
  if (responseMatch) {
    // If RESPONSE tags found, use only that content
    botResponse = responseMatch[1].trim();
  } else {
    // Clean up the response by removing all tag variations
    botResponse = fullResponse
      // Remove [PROMPT]...[/PROMPT] blocks
      .replace(/\[PROMPT\][\s\S]*?(?:\[\/PROMPT\]|$)/gi, "")
      // Remove [RESPONSE] and [/RESPONSE] tags
      .replace(/\[RESPONSE\]/gi, "")
      .replace(/\[\/RESPONSE\]/gi, "")
      // Remove standalone [PROMPT] at the end
      .replace(/\[PROMPT\]\s*$/gi, "")
      .trim();
  }

  // Extract recommended prompt if found
  let recommendedPrompt = null;
  if (promptMatch && promptMatch[1]) {
    recommendedPrompt = promptMatch[1].trim();
  }

    // Additional cleanup: if botResponse still contains [PROMPT], remove everything after it
    const promptIndex = botResponse.indexOf("[PROMPT]");
    if (promptIndex !== -1) {
      botResponse = botResponse.substring(0, promptIndex).trim();
    }

    return { response: botResponse, recommendedPrompt };
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Handle timeout errors
    if (error.name === 'AbortError') {
      throw new Error('Request timed out after 30 seconds. Please try again.');
    }
    
    // Re-throw other errors
    throw error;
  }
}

function generateBotResponse(userMessage) {
  const lower = (userMessage || "").toLowerCase();
  if (lower.includes("exam") || lower.includes("test") || lower.includes("study")) {
    return "Studying can be challenging. Remember to take regular breaks. How's your preparation going?";
  }
  if (lower.includes("tired") || lower.includes("exhausted")) {
    return "It sounds like you might need some rest. Have you been getting enough sleep lately?";
  }
  if (lower.includes("happy") || lower.includes("great") || lower.includes("good")) {
    return "That's wonderful to hear! What's been going well for you today? 😊";
  }
  return "I'm here to listen. Tell me more about what's on your mind.";
}

// ===== MESSAGE DISPLAY FUNCTIONS =====
function addUserMessage(text) {
  displayMessage(text, "user", true);
  
  if (window.ChatManager) {
    // Ensure a chat exists
    if (!ChatManager.getCurrentChatId()) {
      ChatManager.startNewChat();
    }
    ChatManager.addMessage(text, "user");
    chatHistory = ChatManager.getChatHistory();
  } else {
    chatHistory.push({ text, sender: "user", timestamp: Date.now() });
    saveToLocalStorage();
  }
}

function addBotMessage(text) {
  displayMessage(text, "bot", true);
  
  // Use ChatManager if available, otherwise use local storage
  if (window.ChatManager) {
    ChatManager.addMessage(text, "bot");
    chatHistory = ChatManager.getChatHistory(); // Sync local copy
  } else {
    chatHistory.push({ text, sender: "bot", timestamp: Date.now() });
    saveToLocalStorage();
  }
}

function displayMessage(text, sender, animate = true) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${sender}`;
  if (!animate) {
    messageDiv.style.animation = "none";
  }

  const bubbleDiv = document.createElement("div");
  bubbleDiv.className = "message-bubble";
  if (sender === "bot") {
    bubbleDiv.innerHTML = text;
  } else {
    bubbleDiv.textContent = text;
  }

  messageDiv.appendChild(bubbleDiv);
  chatMessages.appendChild(messageDiv);

  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTypingIndicator() {
  const typingDiv = document.createElement("div");
  typingDiv.className = "message bot";
  typingDiv.id = "typingIndicator";

  const bubbleDiv = document.createElement("div");
  bubbleDiv.className = "message-bubble typing-indicator";
  bubbleDiv.innerHTML = "<span></span><span></span><span></span>";

  typingDiv.appendChild(bubbleDiv);
  chatMessages.appendChild(typingDiv);

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTypingIndicator() {
  const typingIndicator = document.getElementById("typingIndicator");
  if (typingIndicator) {
    typingIndicator.remove();
  }
}

// ===== LOCAL STORAGE FUNCTIONS =====
function saveToLocalStorage() {
  try {
    localStorage.setItem("mindfulU_stressScore", stressScore.toString());
    localStorage.setItem("mindfulU_chatHistory", JSON.stringify(chatHistory));
    localStorage.setItem("mindfulU_tone", currentTone);
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
}

function loadFromLocalStorage() {
  try {
    const savedStress = localStorage.getItem("mindfulU_stressScore");
    if (savedStress !== null) {
      stressScore = parseFloat(savedStress);
    }

    const savedHistory = localStorage.getItem("mindfulU_chatHistory");
    if (savedHistory !== null) {
      chatHistory = JSON.parse(savedHistory);
    }

    const savedTone = localStorage.getItem("mindfulU_tone");
    if (savedTone !== null) {
      currentTone = savedTone;
    }
  } catch (error) {
    console.error("Error loading from localStorage:", error);
  }
}

async function clearChatHistory() {
  const confirmed = await confirmDialog({
    type: 'warning',
    title: 'Clear Chat History',
    subtitle: 'This action cannot be undone',
    message: 'Are you sure you want to clear all chat history? All your conversations will be permanently deleted.',
    confirmText: 'Clear History',
    cancelText: 'Keep History',
    isDanger: true
  });

  if (confirmed) {
    // Clear chat history array
    chatHistory = [];

    // Clear chat messages from UI
    chatMessages.innerHTML = "";

    // Remove from localStorage
    localStorage.removeItem("mindfulU_chatHistory");

    // Reset input placeholder to default
    userInput.placeholder =
      "Share your daily life. AI is all ears ready for you.";

    // Add welcome message
    addBotMessage(
      "Chat history cleared! Hello! I'm MindfulU, your empathetic companion. I'm here to listen and support you. How are you feeling today?"
    );

    // Show success toast
    showToast({
      type: 'success',
      title: 'History Cleared',
      message: 'Your conversation history has been cleared.',
      duration: 3000
    });
  }
}

// ===== DISCLAIMER MODAL FUNCTIONS =====
function checkDisclaimerAcceptance() {
  const disclaimerAccepted = localStorage.getItem(
    "mindfulU_disclaimerAccepted"
  );
  const disclaimerModal = document.getElementById("disclaimerModal");

  if (!disclaimerAccepted) {
    // Show disclaimer modal
    setTimeout(() => {
      disclaimerModal.classList.add("show");
    }, 300);
  } else {
    // Add a way to view disclaimer again via console
    console.log(
      "Disclaimer already accepted. To view it again, run: viewDisclaimer()"
    );
  }
}

// Global function to view disclaimer again (for testing/review)
window.viewDisclaimer = function () {
  const disclaimerModal = document.getElementById("disclaimerModal");
  disclaimerModal.classList.add("show");
  console.log(
    "Disclaimer modal opened. You can close it by clicking 'I Understand and Agree' or 'I Do Not Agree'."
  );
};

// Global function to reset disclaimer acceptance
window.resetDisclaimer = function () {
  localStorage.removeItem("mindfulU_disclaimerAccepted");
  console.log("Disclaimer acceptance reset. Reload the page to see it again.");
};

function setupDisclaimerListeners() {
  const disclaimerModal = document.getElementById("disclaimerModal");
  const acceptBtn = document.getElementById("acceptBtn");
  const declineBtn = document.getElementById("declineBtn");

  acceptBtn.addEventListener("click", () => {
    // Save acceptance to localStorage
    localStorage.setItem("mindfulU_disclaimerAccepted", "true");

    // Hide modal with animation
    disclaimerModal.classList.remove("show");

    // Add confirmation message
    setTimeout(() => {
      addBotMessage(
        "✓ Thank you for accepting the disclaimer. Welcome to MindfulU!"
      );
    }, 400);
  });

  declineBtn.addEventListener("click", async () => {
    // Show warning using custom notification
    const confirmed = await confirmDialog({
      type: 'error',
      title: 'Cannot Use Platform',
      subtitle: 'Disclaimer must be accepted',
      message: 'If you do not agree to the disclaimer, you cannot use this platform. The page will now close.',
      confirmText: 'Close Page',
      cancelText: 'Go Back',
      isDanger: true
    });

    if (confirmed) {
      // Try to close the window/tab
      window.close();

      // If window.close() doesn't work (some browsers block it), redirect to a blank page
      setTimeout(() => {
        window.location.href = "about:blank";
      }, 100);
    }
  });
}

// ===== CHAT HISTORY MANAGEMENT (Using ChatManager) =====
function loadChatSessions() {
  if (window.ChatManager) {
    chatSessions = ChatManager.getChatSessions();
    currentChatId = ChatManager.getCurrentChatId();
  }
  renderChatHistory();
}

function saveChatSessions() {
  if (window.ChatManager) {
    ChatManager.saveChatSessions();
  }
}

function startNewChat() {
  if (window.ChatManager) {
    ChatManager.startNewChat();
    // Sync local variables
    chatHistory = ChatManager.getChatHistory();
    conversationEmotions = ChatManager.getConversationEmotions();
    messageCount = ChatManager.getMessageCount();
    currentChatId = ChatManager.getCurrentChatId();
  }
  
  // Clear UI
  chatMessages.innerHTML = "";
  
  // Reset placeholder
  userInput.placeholder = "Share your daily life. AI is all ears ready for you.";
  
  // Add welcome message
  addBotMessage(
    "Hello! I'm MindfulU, your empathetic companion. I'm here to listen and support you. How are you feeling today?"
  );
  
  // Update history sidebar
  renderChatHistory();
}

function saveCurrentChat() {
  if (window.ChatManager) {
    ChatManager.saveCurrentChat();
    // Sync local variables
    chatSessions = ChatManager.getChatSessions();
  }
}

function loadChat(chatId) {
  if (window.ChatManager) {
    const chat = ChatManager.loadChat(chatId);
    if (chat) {
      // Sync local variables
      chatHistory = ChatManager.getChatHistory();
      conversationEmotions = ChatManager.getConversationEmotions();
      messageCount = ChatManager.getMessageCount();
      currentChatId = ChatManager.getCurrentChatId();
      
      // Clear and reload UI
      chatMessages.innerHTML = "";
      chatHistory.forEach(msg => {
        displayMessage(msg.text, msg.sender, false);
      });
      
      // Update history sidebar
      renderChatHistory();
    }
  }
}

async function deleteChat(chatId, event) {
  event.stopPropagation();
  
  const confirmed = await confirmDialog({
    type: 'warning',
    title: 'Delete Chat',
    subtitle: 'This action cannot be undone',
    message: 'Are you sure you want to delete this chat? All messages in this conversation will be permanently removed.',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    isDanger: true
  });

  if (!confirmed) return;

  let wasCurrent = false;
  if (window.ChatManager) {
    wasCurrent = ChatManager.deleteChat(chatId);
    ChatManager.saveChatSessions();
    chatSessions = ChatManager.getChatSessions();
    currentChatId = ChatManager.getCurrentChatId();
  } else {
    // Fallback local behavior
    chatSessions = chatSessions.filter(s => s.id !== chatId);
    wasCurrent = currentChatId === chatId;
    if (wasCurrent) currentChatId = null;
    saveChatSessions();
  }

  if (wasCurrent) {
    startNewChat();
  } else {
    renderChatHistory();
  }
  
  showToast({
    type: 'success',
    title: 'Chat Deleted',
    message: 'The chat has been removed.',
    duration: 2500
  });
}

function renderChatHistory() {
  const chatHistoryList = document.getElementById("chatHistoryList");
  if (!chatHistoryList) return;
  
  if (chatSessions.length === 0) {
    chatHistoryList.innerHTML = '<div class="empty-history">No chat history yet</div>';
    return;
  }
  
  chatHistoryList.innerHTML = "";
  
  chatSessions.forEach(chat => {
    const item = document.createElement("div");
    item.className = "chat-history-item" + (chat.id === currentChatId ? " active" : "");
    item.onclick = () => loadChat(chat.id);
    
    const date = new Date(chat.lastUpdated);
    const dateStr = formatDate(date);
    
    // Get preview from last message
    const lastMsg = chat.messages[chat.messages.length - 1];
    const preview = lastMsg 
      ? lastMsg.text.substring(0, 40) + (lastMsg.text.length > 40 ? "..." : "")
      : "Empty chat";
    
    item.innerHTML = `
      <div class="chat-history-item-header">
        <div class="chat-history-item-title">${chat.title}</div>
        <div class="chat-history-item-date">${dateStr}</div>
      </div>
      <div class="chat-history-item-preview">${preview}</div>
      <button class="delete-chat-btn" onclick="deleteChat('${chat.id}', event)" title="Delete chat">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    `;
    
    chatHistoryList.appendChild(item);
  });
}

function formatDate(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString();
}

async function deleteAllChats() {
  if (chatSessions.length === 0) {
    showToast({
      type: 'info',
      title: 'No Chats',
      message: 'There are no chats to delete.',
      duration: 2500
    });
    return;
  }
  
  const confirmed = await confirmDialog({
    type: 'error',
    title: 'Delete All Chats',
    subtitle: 'This will permanently delete all chat history',
    message: `Are you sure you want to delete all ${chatSessions.length} chat${chatSessions.length > 1 ? 's' : ''}? This action cannot be undone and all conversations will be permanently removed.`,
    confirmText: 'Delete All',
    cancelText: 'Cancel',
    isDanger: true
  });

  if (!confirmed) return;

  if (window.ChatManager) {
    ChatManager.deleteAllChats();
    chatSessions = ChatManager.getChatSessions();
    currentChatId = ChatManager.getCurrentChatId();
  } else {
    chatSessions = [];
    localStorage.removeItem("mindfulU_chatSessions");
    localStorage.removeItem("mindfulU_currentChatId");
    currentChatId = null;
  }

  startNewChat();
  
  showToast({
    type: 'success',
    title: 'All Chats Deleted',
    message: 'All chat history has been permanently removed.',
    duration: 3000
  });
}

// Make deleteChat and deleteAllChats available globally for onclick
window.deleteChat = deleteChat;
window.deleteAllChats = deleteAllChats;

// Auto-save current chat periodically
setInterval(() => {
  if (currentChatId && chatHistory.length > 0) {
    saveCurrentChat();
  }
}, 30000); // Save every 30 seconds

// ===== CLEANUP =====
window.addEventListener("beforeunload", () => {
  // Save current chat before leaving
  if (currentChatId && chatHistory.length > 0) {
    saveCurrentChat();
  }
});
})(); // end IIFE
