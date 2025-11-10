// Stress Monitoring specific functionality
let videoStream = null;
let detectionInterval = null;
let modelsLoaded = false;
let cameraActive = false;

// Load Face-API models on page load
async function loadModels() {
    try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model');
        await faceapi.nets.faceExpressionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model');
        modelsLoaded = true;
        console.log('Face-API models loaded successfully');
    } catch (error) {
        console.error('Error loading models:', error);
    }
}

// Toggle camera on/off
async function toggleCamera() {
    if (cameraActive) {
        stopCamera();
    } else {
        await startCamera();
    }
}

// Start camera and detection
async function startCamera() {
    const videoStatus = document.getElementById('videoStatus');
    const cameraOverlay = document.getElementById('cameraOverlay');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const videoContainer = document.getElementById('videoContainer');
    
    try {
        // Hide camera overlay
        cameraOverlay.classList.add('hidden');
        
        // Show loading overlay while detector warms up
        loadingOverlay.style.display = 'flex';
        
        // Check if models are loaded, if not wait for them
        if (!modelsLoaded) {
            console.log('Waiting for models to load...');
            await loadModels();
        }
        
        // Start video stream
        await startVideo();
        
        // Wait a bit for the detector to warm up (simulate warm-up time)
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Hide loading overlay
        loadingOverlay.classList.add('hidden');
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
            loadingOverlay.classList.remove('hidden');
        }, 300);
        
        // Activate camera
        videoContainer.classList.add('camera-active');
        cameraActive = true;
        
        // Show brief status message
        videoStatus.style.display = 'block';
        videoStatus.textContent = 'Camera active';
        setTimeout(() => {
            videoStatus.style.opacity = '0';
            setTimeout(() => {
                videoStatus.style.display = 'none';
                videoStatus.style.opacity = '1';
            }, 300);
        }, 2000);
        
        // Start detection
        startDetection();
        
    } catch (error) {
        console.error('Error starting camera:', error);
        
        // Hide loading overlay on error
        loadingOverlay.classList.add('hidden');
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
            loadingOverlay.classList.remove('hidden');
        }, 300);
        
        // Show error message
        videoStatus.textContent = 'Error: ' + error.message;
        videoStatus.style.display = 'block';
        videoStatus.style.opacity = '1';
        setTimeout(() => {
            videoStatus.style.opacity = '0';
            setTimeout(() => {
                videoStatus.style.display = 'none';
                videoStatus.style.opacity = '1';
                // Show camera overlay again
                cameraOverlay.classList.remove('hidden');
            }, 300);
        }, 3000);
    }
}

// Stop camera and detection
function stopCamera() {
    const cameraOverlay = document.getElementById('cameraOverlay');
    const videoContainer = document.getElementById('videoContainer');
    const video = document.getElementById('videoFeed');
    
    // Stop detection
    if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
    }
    
    // Stop video stream
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
        video.srcObject = null;
    }
    
    // Show overlay
    cameraOverlay.classList.remove('hidden');
    videoContainer.classList.remove('camera-active');
    cameraActive = false;
    
    // Reset emotion bars
    resetEmotions();
}

// Start video stream
async function startVideo() {
    const video = document.getElementById('videoFeed');
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user' },
            audio: false 
        });
        video.srcObject = videoStream;
    } catch (error) {
        throw new Error('Camera access denied');
    }
}

// Start emotion detection
function startDetection() {
    const video = document.getElementById('videoFeed');
    
    detectionInterval = setInterval(async () => {
        const detections = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();
        
        if (detections) {
            updateEmotions(detections.expressions);
            updateStressLevel(detections.expressions);
        }
    }, 1000);
}

// Update emotion bars
function updateEmotions(expressions) {
    const emotions = ['happy', 'sad', 'angry', 'fearful', 'surprised', 'disgusted', 'neutral'];
    
    emotions.forEach(emotion => {
        const value = Math.round(expressions[emotion] * 100);
        const bar = document.getElementById(`${emotion}Bar`);
        const valueSpan = document.getElementById(`${emotion}Value`);
        
        if (bar && valueSpan) {
            bar.style.setProperty('--emotion-width', `${value}%`);
            valueSpan.textContent = `${value}%`;
        }
    });
}

// Calculate and update stress level
function updateStressLevel(expressions) {
    const stressFactors = {
        angry: 0.4,
        fearful: 0.3,
        sad: 0.2,
        disgusted: 0.1
    };
    
    let stressLevel = 0;
    Object.keys(stressFactors).forEach(emotion => {
        stressLevel += expressions[emotion] * stressFactors[emotion];
    });
    
    stressLevel = Math.min(Math.round(stressLevel * 100), 100);
    
    const stressBar = document.getElementById('stressBar');
    const stressPercentage = document.getElementById('stressPercentage');
    
    stressBar.style.setProperty('--stress-width', `${stressLevel}%`);
    stressPercentage.textContent = `${stressLevel}%`;
    
    // Update color based on stress level
    let color;
    if (stressLevel < 30) {
        color = '#4caf50';
    } else if (stressLevel < 70) {
        color = '#f5c563';
    } else {
        color = '#e88b8b';
    }
    stressBar.style.setProperty('--stress-color', color);
}

// Reset all emotion bars to 0
function resetEmotions() {
    const emotions = ['happy', 'sad', 'angry', 'fearful', 'surprised', 'disgusted', 'neutral'];
    
    emotions.forEach(emotion => {
        const bar = document.getElementById(`${emotion}Bar`);
        const valueSpan = document.getElementById(`${emotion}Value`);
        
        if (bar && valueSpan) {
            bar.style.setProperty('--emotion-width', '0%');
            valueSpan.textContent = '0%';
        }
    });
    
    // Reset stress level
    const stressBar = document.getElementById('stressBar');
    const stressPercentage = document.getElementById('stressPercentage');
    
    stressBar.style.setProperty('--stress-width', '0%');
    stressPercentage.textContent = '0%';
    stressBar.style.setProperty('--stress-color', '#4caf50');
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (detectionInterval) clearInterval(detectionInterval);
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
});

// ===== CHAT POPUP FUNCTIONALITY (Using ChatManager) =====
let chatPopupInput = null;
let chatPopupSendBtn = null;
let chatPopupMessagesContainer = null;

function initializeChatPopup() {
    // Initialize ChatManager
    if (window.ChatManager) {
        window.ChatManager.initialize();
    }
    
    const openChatBtn = document.getElementById('openChatBtn');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const chatPopup = document.getElementById('chatPopup');
    chatPopupInput = document.getElementById('chatPopupInput');
    chatPopupSendBtn = document.getElementById('chatPopupSendBtn');
    chatPopupMessagesContainer = document.getElementById('chatPopupMessages');
    const chatToneSelect = document.getElementById('chatToneSelect');
    const resetToneBtn = document.getElementById('resetToneBtn');
    
    // Open chat popup
    if (openChatBtn) {
        openChatBtn.addEventListener('click', () => {
            chatPopup.classList.add('active');
            
            // If no current chat, start a new one
            if (!ChatManager.getCurrentChatId()) {
                startNewChat();
            } else {
                // Render current chat
                renderCurrentChat();
            }
            
            // Focus on input
            setTimeout(() => chatPopupInput.focus(), 300);
        });
    }
    
    // Close chat popup
    if (closeChatBtn) {
        closeChatBtn.addEventListener('click', () => {
            chatPopup.classList.remove('active');
        });
    }
    
    // Close on background click
    chatPopup.addEventListener('click', (e) => {
        if (e.target === chatPopup) {
            chatPopup.classList.remove('active');
        }
    });
    
    // Send message on button click
    if (chatPopupSendBtn) {
        chatPopupSendBtn.addEventListener('click', handleChatSend);
    }
    
    // Send message on Enter (Shift+Enter for new line)
    if (chatPopupInput) {
        chatPopupInput.addEventListener('keydown', (e) => {
            const isEnter = e.key === 'Enter' || e.key === 'NumpadEnter';
            if (!isEnter) return;
            
            if (e.shiftKey) {
                setTimeout(() => autoResizeChatTextarea(), 0);
                return;
            }
            
            e.preventDefault();
            handleChatSend();
        });
        
        chatPopupInput.addEventListener('input', autoResizeChatTextarea);
    }
    
    // Tone selection
    if (chatToneSelect) {
        chatToneSelect.value = ChatManager.getCurrentTone();
        chatToneSelect.addEventListener('change', (e) => {
            ChatManager.setCurrentTone(e.target.value);
        });
    }
    
    // Reset tone button
    if (resetToneBtn) {
        resetToneBtn.addEventListener('click', () => {
            ChatManager.setCurrentTone('friendly');
            if (chatToneSelect) {
                chatToneSelect.value = 'friendly';
            }
        });
    }
    
    // Chat history sidebar event listeners
    const newChatBtn = document.getElementById('newChatBtn');
    const deleteAllChatsBtn = document.getElementById('deleteAllChatsBtn');
    const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const chatHistorySidebar = document.querySelector('.chat-history-sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    if (newChatBtn) {
        newChatBtn.addEventListener('click', startNewChat);
    }
    
    if (deleteAllChatsBtn) {
        deleteAllChatsBtn.addEventListener('click', deleteAllChats);
    }
    
    // Mobile sidebar toggle
    if (toggleHistoryBtn && chatHistorySidebar) {
        toggleHistoryBtn.addEventListener('click', () => {
            chatHistorySidebar.classList.add('active');
            if (sidebarOverlay) {
                sidebarOverlay.classList.add('active');
            }
        });
    }
    
    if (closeSidebarBtn && chatHistorySidebar) {
        closeSidebarBtn.addEventListener('click', () => {
            chatHistorySidebar.classList.remove('active');
            if (sidebarOverlay) {
                sidebarOverlay.classList.remove('active');
            }
        });
    }
    
    if (sidebarOverlay && chatHistorySidebar) {
        sidebarOverlay.addEventListener('click', () => {
            chatHistorySidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }
    
    // Render chat history
    renderChatHistory();
}

function renderCurrentChat() {
    chatPopupMessagesContainer.innerHTML = '';
    const chatHistory = ChatManager.getChatHistory();
    chatHistory.forEach(msg => {
        displayChatMessage(msg.text, msg.sender, false);
    });
}

function startNewChat() {
    ChatManager.startNewChat();
    chatPopupMessagesContainer.innerHTML = '';
    chatPopupInput.placeholder = "Share your daily life. AI is all ears ready for you.";
    
    // Add welcome message
    ChatManager.addMessage("Hello! I'm MindfulU, your empathetic companion. I'm here to listen and support you while monitoring your stress levels. How are you feeling today?", 'bot');
    displayChatMessage("Hello! I'm MindfulU, your empathetic companion. I'm here to listen and support you while monitoring your stress levels. How are you feeling today?", 'bot', true);
    
    renderChatHistory();
}

function loadChatFromHistory(chatId) {
    const chat = ChatManager.loadChat(chatId);
    if (chat) {
        renderCurrentChat();
        renderChatHistory();
    }
}

async function deleteChatFromHistory(chatId, event) {
    event.stopPropagation();
    
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
    
    const wasCurrentChat = ChatManager.deleteChat(chatId);
    ChatManager.saveChatSessions();
    
    if (wasCurrentChat) {
        startNewChat();
    } else {
        renderChatHistory();
    }
    
    showToast?.({ type: 'success', title: 'Chat Deleted', message: 'The chat has been removed.', duration: 2000 });
}

async function deleteAllChats() {
    const sessions = ChatManager.getChatSessions();
    if (!sessions || sessions.length === 0) {
        showToast?.({ type: 'info', title: 'No Chats', message: 'There are no chats to delete.', duration: 2000 });
        return;
    }
    
    const confirmed = await confirmDialog?.({
        type: 'error',
        title: 'Delete All Chats',
        subtitle: 'This will permanently delete all chat history',
        message: `Are you sure you want to delete all ${sessions.length} chat${sessions.length > 1 ? 's' : ''}?`,
        confirmText: 'Delete All',
        cancelText: 'Cancel',
        isDanger: true
    });
    if (confirmed === false) return;
    
    ChatManager.deleteAllChats();
    startNewChat();
    showToast?.({ type: 'success', title: 'All Chats Deleted', message: 'All chat history has been permanently removed.', duration: 2500 });
}

function renderChatHistory() {
    const chatHistoryList = document.getElementById('chatHistoryList');
    if (!chatHistoryList) return;
    
    const sessions = ChatManager.getChatSessions();
    const currentChatId = ChatManager.getCurrentChatId();
    
    if (sessions.length === 0) {
        chatHistoryList.innerHTML = '<div class="empty-history">No chat history yet</div>';
        return;
    }
    
    chatHistoryList.innerHTML = '';
    
    sessions.forEach(chat => {
        const item = document.createElement('div');
        item.className = 'chat-history-item' + (chat.id === currentChatId ? ' active' : '');
        item.onclick = () => loadChatFromHistory(chat.id);
        
        const date = new Date(chat.lastUpdated);
        const dateStr = ChatManager.formatDate(date);
        
        const lastMsg = chat.messages[chat.messages.length - 1];
        const preview = lastMsg 
            ? lastMsg.text.substring(0, 40) + (lastMsg.text.length > 40 ? '...' : '')
            : 'Empty chat';
        
        item.innerHTML = `
            <div class="chat-history-item-header">
                <div class="chat-history-item-title">${chat.title}</div>
                <div class="chat-history-item-date">${dateStr}</div>
            </div>
            <div class="chat-history-item-preview">${preview}</div>
            <button class="delete-chat-btn" onclick="deleteChatFromHistory('${chat.id}', event)" title="Delete chat">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </button>
        `;
        
        chatHistoryList.appendChild(item);
    });
}

// Make functions globally available
window.deleteChatFromHistory = deleteChatFromHistory;
window.deleteAllChats = deleteAllChats;

function autoResizeChatTextarea() {
    chatPopupInput.style.height = 'auto';
    const newHeight = Math.min(Math.max(chatPopupInput.scrollHeight, 54), 200);
    chatPopupInput.style.height = newHeight + 'px';
}

async function handleChatSend() {
    const message = chatPopupInput.value.trim();
    
    if (!message) return;
    
    chatPopupSendBtn.disabled = true;
    chatPopupInput.disabled = true;
    
    const emotionSnapshot = getCurrentEmotions();
    
    // Add emotion to ChatManager
    ChatManager.addEmotion(emotionSnapshot);
    
    // Add user message
    ChatManager.addMessage(message, 'user');
    displayChatMessage(message, 'user', true);
    
    chatPopupInput.value = '';
    chatPopupInput.style.height = 'auto';
    
    showChatTypingIndicator();
    
    try {
        if (ChatManager.isAIEnabled() && ChatManager.getApiKey()) {
            const result = await getAIResponse(message, emotionSnapshot);
            hideChatTypingIndicator();
            
            ChatManager.addMessage(result.response, 'bot');
            displayChatMessage(result.response, 'bot', true);
            
            if (result.recommendedPrompt) {
                chatPopupInput.placeholder = result.recommendedPrompt;
            }
        } else {
            setTimeout(() => {
                hideChatTypingIndicator();
                const response = 'You have not config the AI. Please go to <a href="settings.html">Settings</a>.';
                ChatManager.addMessage(response, 'bot');
                displayChatMessage(response, 'bot', true);
            }, 1000 + Math.random() * 1000);
        }
    } catch (error) {
        console.error('Chat error:', error);
        hideChatTypingIndicator();
        
        if (!ChatManager.isAIEnabled() || !ChatManager.getApiKey()) {
            const response = 'You have not config the AI. Please go to <a href="settings.html">Settings</a>.';
            ChatManager.addMessage(response, 'bot');
            displayChatMessage(response, 'bot', true);
        } else {
            const response = generateSimpleChatResponse(message);
            ChatManager.addMessage(response, 'bot');
            displayChatMessage(response, 'bot', true);
            updateRecommendationPrompt();
        }
    } finally {
        chatPopupSendBtn.disabled = false;
        chatPopupInput.disabled = false;
        chatPopupInput.focus();
    }
}

async function getAIResponse(userMessage, emotionSnapshot) {
    const stressPercentage = document.getElementById('stressPercentage');
    const stressScore = parseInt(stressPercentage?.textContent) || 0;
    const stressLevel = stressScore > 65 ? 'high' : stressScore < 30 ? 'low' : 'medium';
    
    const dominantEmotion = Object.keys(emotionSnapshot).reduce((a, b) =>
        emotionSnapshot[a] > emotionSnapshot[b] ? a : b
    );
    
    const emotionValues = Object.entries(emotionSnapshot)
        .filter(([_, value]) => value > 0.2)
        .sort((a, b) => b[1] - a[1])
        .map(([emotion, value]) => `${emotion} (${Math.round(value * 100)}%)`)
        .join(', ');
    
    const emotionContext = emotionValues 
        ? `Current detected emotions: ${emotionValues}. Dominant emotion: ${dominantEmotion}.`
        : `Dominant emotion: ${dominantEmotion}.`;
    
    const systemPrompt = getSystemPromptForTone(ChatManager.getCurrentTone(), stressLevel, emotionContext, ChatManager.getMessageCount(), stressScore);
    
    const recentHistory = ChatManager.getChatHistory().slice(-6).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
    }));
    
    const messages = [
        { role: 'system', content: systemPrompt },
        ...recentHistory,
        { role: 'user', content: userMessage }
    ];
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
        // Provider-aware routing (OpenRouter / OpenAI-compatible / Deepseek)
        const provider = localStorage.getItem('mindfulU_provider') || 'openrouter';
        const baseUrlPref = localStorage.getItem('mindfulU_baseUrl') || (provider === 'deepseek' ? 'https://api.deepseek.com/v1' : '');
        const selectedModel =
            localStorage.getItem('mindfulU_model') ||
            (provider === 'openrouter' ? 'deepseek/deepseek-chat-v3-0324:free' : (provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini'));

        let url, headers, body;
        if (provider === 'openrouter') {
            url = 'https://openrouter.ai/api/v1/chat/completions';
            headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ChatManager.getApiKey()}`,
                'HTTP-Referer': 'https://mindfulu.local',
                'X-Title': 'MindfulU'
            };
            body = {
                model: selectedModel,
                provider: { allow_fallbacks: true },
                messages: messages,
                max_tokens: 500,
                temperature: 0.8
            };
        } else {
            const base = (baseUrlPref || (provider === 'deepseek' ? 'https://api.deepseek.com/v1' : 'https://api.openai.com/v1')).replace(/\/+$/, '');
            url = `${base}/chat/completions`;
            headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ChatManager.getApiKey()}`
            };
            body = {
                model: selectedModel,
                messages: messages,
                max_tokens: 500,
                temperature: 0.8
            };
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`API request failed: HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const fullResponse = data.choices[0].message.content.trim();
        
        const responseMatch = fullResponse.match(/\[RESPONSE\]([\s\S]*?)(?:\[\/RESPONSE\]|$)/);
        const promptMatch = fullResponse.match(/\[PROMPT\]\s*([\s\S]*?)(?:\[\/PROMPT\]|$)/);
        
        let botResponse;
        if (responseMatch) {
            botResponse = responseMatch[1].trim();
        } else {
            botResponse = fullResponse
                .replace(/\[PROMPT\][\s\S]*?(?:\[\/PROMPT\]|$)/gi, '')
                .replace(/\[RESPONSE\]/gi, '')
                .replace(/\[\/RESPONSE\]/gi, '')
                .replace(/\[PROMPT\]\s*$/gi, '')
                .trim();
        }
        
        let recommendedPrompt = null;
        if (promptMatch && promptMatch[1]) {
            recommendedPrompt = promptMatch[1].trim();
        }
        
        const promptIndex = botResponse.indexOf('[PROMPT]');
        if (promptIndex !== -1) {
            botResponse = botResponse.substring(0, promptIndex).trim();
        }
        
        return { response: botResponse, recommendedPrompt };
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

function getSystemPromptForTone(tone, stressLevel, emotionContext, messageCount, stressScore) {
    const baseContext = `Current Context:
- User's stress level: ${stressLevel} (${stressScore}%)
- ${emotionContext}
- Messages exchanged: ${messageCount}

IMPORTANT: You MUST tailor your response based on the user's current emotional state and stress level. Reference their emotions naturally in your response to show you're aware of how they're feeling.`;

    const baseGuidelines = `Guidelines:
- Keep responses natural and conversational (2-3 sentences)
- ALWAYS acknowledge their current emotional state in your response (e.g., "I can see you're feeling [emotion]...")
- Use "I" statements to show empathy ("I hear you", "I understand", "I notice you're feeling...")
- If stress is high (>65%), prioritize calming and validation
- If stress is medium (30-65%), provide balanced support
- If stress is low (<30%), be encouraging and positive
- Reference specific emotions you detect (happy, sad, angry, fearful, surprised, disgusted, neutral)
- Use emojis naturally but sparingly (like texting a friend)
- Never diagnose or provide medical advice - if serious, suggest talking to a counselor
- Your response should feel personalized to their current state, not generic

IMPORTANT: You must format your response in two parts:
1. Your caring response to the user (MUST reference their current emotional state)
2. A personalized prompt suggestion for their next message

Format EXACTLY as follows (including the tags):
[RESPONSE]Your caring response here[/RESPONSE]
[PROMPT]A short, engaging prompt suggestion (e.g., "Tell me about your favorite moment today")[/PROMPT]

CRITICAL: Always include both opening and closing tags. The [PROMPT] section will be hidden from the user and only used to update the input placeholder.`;

    const tonePrompts = {
        'friendly': `You are MindfulU, a warm and friendly AI companion for undergraduate students. Think of yourself as a supportive friend who genuinely cares about their well-being and can see how they're feeling right now.

${baseContext}

Your Personality:
- Talk like a caring friend who notices and acknowledges their emotions
- ALWAYS start by acknowledging their current emotional state based on the detected emotions
- Be conversational, warm, and relatable
- Use casual language while remaining supportive
- Show genuine interest in what they're sharing
- Connect your response to their specific emotional state (e.g., if they're sad, be comforting; if happy, be celebratory)

${baseGuidelines}`,

        'professional': `You are MindfulU, a professional AI counselor for undergraduate students. You provide supportive guidance with a calm, composed demeanor while being attuned to their emotional state.

${baseContext}

Your Personality:
- Maintain a professional yet approachable tone
- ALWAYS acknowledge their current emotional state professionally
- Use clear, structured language
- Show empathy through thoughtful, emotion-aware responses
- Provide practical advice tailored to their emotional state
- Maintain appropriate boundaries as a professional helper

${baseGuidelines}`,

        'casual': `You are MindfulU, a laid-back AI buddy for undergraduate students. You're chill and easy-going, like hanging out with a good friend who notices how they're vibing.

${baseContext}

Your Personality:
- Use very casual, conversational language
- ALWAYS acknowledge their vibe/emotional state casually (e.g., "I can tell you're feeling...")
- Be relaxed and informal
- Use slang and contractions naturally
- Keep it light-hearted and fun while being emotionally aware
- Show you care in a low-key way by noticing their feelings

${baseGuidelines}`,

        'empathetic': `You are MindfulU, a deeply empathetic AI companion for undergraduate students. Your primary focus is understanding and validating the specific emotions you detect.

${baseContext}

Your Personality:
- Focus intensely on emotional validation of their CURRENT detected emotions
- ALWAYS name and validate the specific emotions you detect
- Use phrases that show deep understanding of their emotional state
- Acknowledge their specific feelings before offering suggestions
- Be gentle and patient
- Create a safe space for emotional expression by showing you truly see how they feel

${baseGuidelines}`,

        'motivational': `You are MindfulU, an encouraging AI coach for undergraduate students. You inspire action and build confidence while being aware of their emotional state.

${baseContext}

Your Personality:
- Be energetic and encouraging
- ALWAYS acknowledge their current emotional state before motivating
- Focus on strengths and potential
- Provide motivational support tailored to their emotions
- Help set small, achievable goals based on their current state
- Celebrate progress and effort while validating their feelings

${baseGuidelines}`
    };

    return tonePrompts[tone] || tonePrompts['friendly'];
}

function updateRecommendationPrompt() {
    const stressPercentage = document.getElementById('stressPercentage');
    const stressScore = parseInt(stressPercentage?.textContent) || 0;
    
    const prompts = {
        high: [
            "Want to talk about what's stressing you out?",
            "Did something particular happen today?",
            "How can I help you right now?",
            "Tell me how you're feeling",
            "Would you like some relaxation tips?"
        ],
        medium: [
            "Share what you've been up to today",
            "Is there anything on your mind?",
            "What's new with you lately?",
            "How are your studies going?",
            "How has your day been?"
        ],
        low: [
            "Share something that made you happy!",
            "What was your favorite moment today?",
            "Let's chat about something you enjoy",
            "Any exciting plans you'd like to share?",
            "Tell me about your recent happy moments"
        ]
    };
    
    const stressCategory = stressScore > 65 ? 'high' : stressScore < 30 ? 'low' : 'medium';
    const categoryPrompts = prompts[stressCategory];
    const randomPrompt = categoryPrompts[Math.floor(Math.random() * categoryPrompts.length)];
    
    chatPopupInput.placeholder = randomPrompt;
}

function getCurrentEmotions() {
    const emotions = {};
    const emotionNames = ['happy', 'sad', 'angry', 'fearful', 'surprised', 'disgusted', 'neutral'];
    
    emotionNames.forEach(emotion => {
        const valueSpan = document.getElementById(`${emotion}Value`);
        if (valueSpan) {
            const percentage = parseInt(valueSpan.textContent) || 0;
            emotions[emotion] = percentage / 100;
        } else {
            emotions[emotion] = 0;
        }
    });
    
    return emotions;
}

function generateSimpleChatResponse(message) {
    // Check if AI is configured
    if (!ChatManager.isAIEnabled() || !ChatManager.getApiKey()) {
        return 'You have not config the AI. Please go to <a href="settings.html">Settings</a>.';
    }
    
    const stressPercentage = document.getElementById('stressPercentage');
    const stressLevel = parseInt(stressPercentage?.textContent) || 0;
    const emotions = getCurrentEmotions();
    
    const dominantEmotion = Object.keys(emotions).reduce((a, b) =>
        emotions[a] > emotions[b] ? a : b
    );
    
    const emotionValue = emotions[dominantEmotion];
    
    if (stressLevel > 65) {
        if (dominantEmotion === 'angry' && emotionValue > 0.3) {
            return "I can see you're feeling angry and your stress is high right now. It's okay to feel this way. Let's take a moment - try taking three slow, deep breaths. What's making you feel this way?";
        } else if (dominantEmotion === 'fearful' && emotionValue > 0.3) {
            return "I notice you're feeling fearful and stressed. That must be really difficult. You're safe here. Take a deep breath with me. What's worrying you right now?";
        } else if (dominantEmotion === 'sad' && emotionValue > 0.3) {
            return "I can see you're feeling sad and stressed. I'm here with you. It's okay to feel this way. Would you like to talk about what's bothering you?";
        } else {
            return "I notice your stress levels are quite high right now. Remember to take breaks and be kind to yourself. What's one small thing that might help you feel better?";
        }
    } else if (stressLevel < 30) {
        if (dominantEmotion === 'happy' && emotionValue > 0.3) {
            return "I can see you're feeling happy and relaxed! That's wonderful! What's bringing you joy today? 😊";
        } else if (dominantEmotion === 'surprised' && emotionValue > 0.3) {
            return "You seem surprised and in a good place! Something interesting happen? I'd love to hear about it!";
        } else {
            return "You seem to be in a good place! That's wonderful to see. Keep taking care of yourself. Is there anything you'd like to talk about?";
        }
    } else {
        if (dominantEmotion === 'sad' && emotionValue > 0.3) {
            return "I notice you're feeling a bit sad. I'm here to listen. Tell me more about what's on your mind.";
        } else if (dominantEmotion === 'neutral' && emotionValue > 0.5) {
            return "You seem calm and balanced right now. How are things going for you today?";
        } else {
            return "I'm here to listen. Tell me more about what's on your mind. Sometimes talking things through can help us see them more clearly.";
        }
    }
}

function displayChatMessage(text, sender, animate = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    if (!animate) {
        messageDiv.style.animation = 'none';
    }
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';
    if (sender === 'bot') {
        bubbleDiv.innerHTML = text;
    } else {
        bubbleDiv.textContent = text;
    }
    
    messageDiv.appendChild(bubbleDiv);
    chatPopupMessagesContainer.appendChild(messageDiv);
    
    chatPopupMessagesContainer.scrollTop = chatPopupMessagesContainer.scrollHeight;
}

function showChatTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot';
    typingDiv.id = 'chatTypingIndicator';
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble typing-indicator';
    bubbleDiv.innerHTML = '<span></span><span></span><span></span>';
    
    typingDiv.appendChild(bubbleDiv);
    chatPopupMessagesContainer.appendChild(typingDiv);
    
    chatPopupMessagesContainer.scrollTop = chatPopupMessagesContainer.scrollHeight;
}

function hideChatTypingIndicator() {
    const typingIndicator = document.getElementById('chatTypingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Initialize when page loads
window.addEventListener('load', async () => {
    await loadModels();
    
    const videoContainer = document.getElementById('videoContainer');
    videoContainer.addEventListener('click', async () => {
        if (modelsLoaded) {
            await toggleCamera();
        }
    });
});

// Initialize chat popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeChatPopup();
});
