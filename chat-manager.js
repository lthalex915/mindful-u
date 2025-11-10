// ===== SHARED CHAT MANAGEMENT MODULE =====
// This file manages chat sessions and history shared between chat.html and stress-monitoring.html

// Chat history management
let chatSessions = [];
let currentChatId = null;
const MAX_CHAT_SESSIONS = 5;

// Current chat state
let chatHistory = [];
let conversationEmotions = [];
let messageCount = 0;

// Settings
let currentTone = 'friendly';
let apiKey = null;
let useAI = false;

// ===== INITIALIZATION =====
function initializeChatManager() {
    loadChatSessions();
    loadSettings();
}

// ===== CHAT SESSION MANAGEMENT =====
function loadChatSessions() {
    try {
        const saved = localStorage.getItem('mindfulU_chatSessions');
        if (saved) {
            chatSessions = JSON.parse(saved);
        }
        
        const savedCurrentId = localStorage.getItem('mindfulU_currentChatId');
        if (savedCurrentId) {
            currentChatId = savedCurrentId;
            // Load the current chat
            const currentChat = chatSessions.find(s => s.id === savedCurrentId);
            if (currentChat) {
                chatHistory = currentChat.messages || [];
                conversationEmotions = currentChat.emotions || [];
                messageCount = currentChat.messageCount || 0;
            }
        }
    } catch (error) {
        console.error('Error loading chat sessions:', error);
        chatSessions = [];
    }
}

function saveChatSessions() {
    try {
        localStorage.setItem('mindfulU_chatSessions', JSON.stringify(chatSessions));
        localStorage.setItem('mindfulU_currentChatId', currentChatId || '');
        // Broadcast change so other tabs update immediately
        localStorage.setItem('mindfulU_chatSessions_updated', Date.now().toString());
    } catch (error) {
        console.error('Error saving chat sessions:', error);
    }
}

function loadSettings() {
    try {
        // Load tone
        const savedTone = localStorage.getItem('mindfulU_tone');
        if (savedTone) {
            currentTone = savedTone;
        }
        
        // Load API key
        const savedKey = localStorage.getItem('mindfulU_apiKey');
        if (savedKey) {
            apiKey = savedKey;
            useAI = true;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

function saveSettings() {
    try {
        localStorage.setItem('mindfulU_tone', currentTone);
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

function startNewChat() {
    // Save current chat if it exists and has messages
    if (currentChatId && chatHistory.length > 0) {
        saveCurrentChat();
    }
    
    // Create new chat
    const newChatId = Date.now().toString();
    currentChatId = newChatId;
    
    // Clear current chat
    chatHistory = [];
    conversationEmotions = [];
    messageCount = 0;
    
    return newChatId;
}

function saveCurrentChat() {
    if (!currentChatId || chatHistory.length === 0) return;
    
    const existingIndex = chatSessions.findIndex(s => s.id === currentChatId);
    
    const firstUserMsg = chatHistory.find(m => m.sender === 'user');
    const title = firstUserMsg 
        ? firstUserMsg.text.substring(0, 30) + (firstUserMsg.text.length > 30 ? '...' : '')
        : 'New Chat';
    
    const chatData = {
        id: currentChatId,
        title: title,
        messages: chatHistory,
        emotions: conversationEmotions,
        messageCount: messageCount,
        lastUpdated: Date.now()
    };
    
    if (existingIndex >= 0) {
        chatSessions[existingIndex] = chatData;
    } else {
        chatSessions.unshift(chatData);
    }
    
    if (chatSessions.length > MAX_CHAT_SESSIONS) {
        chatSessions = chatSessions.slice(0, MAX_CHAT_SESSIONS);
    }
    
    saveChatSessions();
}

function loadChat(chatId) {
    if (currentChatId && chatHistory.length > 0) {
        saveCurrentChat();
    }
    
    const chat = chatSessions.find(s => s.id === chatId);
    if (!chat) return null;
    
    currentChatId = chatId;
    chatHistory = chat.messages || [];
    conversationEmotions = chat.emotions || [];
    messageCount = chat.messageCount || 0;
    
    localStorage.setItem('mindfulU_currentChatId', currentChatId);
    
    return chat;
}

function deleteChat(chatId) {
    chatSessions = chatSessions.filter(s => s.id !== chatId);
    
    if (currentChatId === chatId) {
        currentChatId = null;
        chatHistory = [];
        conversationEmotions = [];
        messageCount = 0;
        return true; // Indicates current chat was deleted
    }
    
    saveChatSessions();
    return false;
}

function deleteAllChats() {
    chatSessions = [];
    localStorage.removeItem('mindfulU_chatSessions');
    localStorage.removeItem('mindfulU_currentChatId');
    // Broadcast deletion across tabs
    localStorage.setItem('mindfulU_chatSessions_updated', Date.now().toString());
    
    currentChatId = null;
    chatHistory = [];
    conversationEmotions = [];
    messageCount = 0;
}

function getChatSessions() {
    return chatSessions;
}

function getCurrentChatId() {
    return currentChatId;
}

function getChatHistory() {
    return chatHistory;
}

function addMessage(text, sender) {
    const message = { text, sender, timestamp: Date.now() };
    chatHistory.push(message);
    
    // Save chat to history when first user message is sent
    const hasUserMessages = chatHistory.filter(m => m.sender === 'user').length;
    if (hasUserMessages === 1 && currentChatId) {
        saveCurrentChat();
    } else {
        // Update lastUpdated and broadcast for other tabs
        const existingIndex = chatSessions.findIndex(s => s.id === currentChatId);
        if (existingIndex >= 0) {
            chatSessions[existingIndex].messages = chatHistory;
            chatSessions[existingIndex].lastUpdated = Date.now();
            saveChatSessions();
        }
    }
    
    return message;
}

function addEmotion(emotions) {
    messageCount++;
    conversationEmotions.push({
        messageNumber: messageCount,
        emotions: emotions,
        timestamp: Date.now()
    });
}

function getMessageCount() {
    return messageCount;
}

function getConversationEmotions() {
    return conversationEmotions;
}

function getCurrentTone() {
    return currentTone;
}

function setCurrentTone(tone) {
    currentTone = tone;
    saveSettings();
}

function getApiKey() {
    return apiKey;
}

function isAIEnabled() {
    return useAI;
}

function setApiKey(key) {
    apiKey = key;
    useAI = !!key;
    if (key) {
        localStorage.setItem('mindfulU_apiKey', key);
    }
}

function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
}

/**
 * Cross-tab synchronization: listen for storage events that indicate
 * chat sessions/current chat changed in another tab.
 */
window.addEventListener('storage', (e) => {
    if (!e) return;
    // If sessions or current id changed, reload our in-memory state
    if (e.key === 'mindfulU_chatSessions' || e.key === 'mindfulU_currentChatId' || e.key === 'mindfulU_chatSessions_updated') {
        try {
            // Rehydrate from localStorage
            const saved = localStorage.getItem('mindfulU_chatSessions');
            chatSessions = saved ? JSON.parse(saved) : [];
            const savedCurrentId = localStorage.getItem('mindfulU_currentChatId');
            currentChatId = savedCurrentId || null;
            if (currentChatId) {
                const currentChat = chatSessions.find(s => s.id === currentChatId);
                chatHistory = currentChat?.messages || [];
                conversationEmotions = currentChat?.emotions || [];
                messageCount = currentChat?.messageCount || 0;
            } else {
                chatHistory = [];
                conversationEmotions = [];
                messageCount = 0;
            }
            // Optionally, emit a custom event so UIs can re-render without tight coupling
            const evt = new CustomEvent('mindfulU:chat-updated', {
                detail: {
                    currentChatId,
                    chatSessionsLength: chatSessions.length,
                    lastUpdated: Date.now()
                }
            });
            window.dispatchEvent(evt);
        } catch (err) {
            console.error('Error syncing chat sessions from storage:', err);
        }
    }
});

// Auto-save current chat periodically
setInterval(() => {
    if (currentChatId && chatHistory.length > 0) {
        saveCurrentChat();
    }
}, 30000); // Save every 30 seconds

// Save before page unload
window.addEventListener('beforeunload', () => {
    if (currentChatId && chatHistory.length > 0) {
        saveCurrentChat();
    }
});

// Export functions for use in other files
window.ChatManager = {
    initialize: initializeChatManager,
    startNewChat,
    saveCurrentChat,
    loadChat,
    deleteChat,
    deleteAllChats,
    getChatSessions,
    getCurrentChatId,
    getChatHistory,
    addMessage,
    addEmotion,
    getMessageCount,
    getConversationEmotions,
    getCurrentTone,
    setCurrentTone,
    getApiKey,
    isAIEnabled,
    setApiKey,
    formatDate,
    saveChatSessions
};
