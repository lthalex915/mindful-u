# MindfulU 🧠💙

An empathetic chatbot and mood tracker for undergraduate students, featuring real-time facial emotion recognition to provide adaptive, stress-aware conversations.

## 🎯 Project Overview

**MindfulU** is a client-side web application designed to support undergraduate students dealing with academic stress and anxiety. It combines:

- **Facial Emotion Recognition (FER)** using face-api.js
- **Real-time Stress Tracking** with a visual stress bar
- **Empathetic AI Chatbot** powered by OpenAI's GPT models
- **Persistent Chat History** using browser localStorage

## ✨ Key Features

### 1. **Facial Emotion Recognition**

- Uses your webcam to detect emotions in real-time
- Analyzes 7 emotions: happy, sad, angry, fearful, disgusted, surprised, neutral
- Updates every 2 seconds for optimal performance

### 2. **Dynamic Stress Score**

- Calculates stress based on detected emotions
- Visual stress bar with color-coded feedback:
  - 🟢 **0-30%**: Calm (Green)
  - 🟡 **31-65%**: Moderate (Yellow)
  - 🔴 **66-100%**: High Stress (Red)

### 3. **Context-Aware Chatbot**

- Adapts responses based on your current stress level
- Recognizes keywords like "exam", "stressed", "anxious", "happy"
- Provides calming exercises when stress is high
- Maintains conversation history across sessions

### 4. **Modern UI/UX**

- Soft, calming design with neumorphism effects
- Light mode optimized for comfort
- Responsive design for desktop and mobile
- Minimalist, distraction-free interface

## 🚀 Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Edge, Safari)
- Webcam access for emotion recognition
- Internet connection (for loading face-api.js models and AI chatbot)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/lthalex915/ee4213-group-project.git
   cd ee4213-group-project
   ```

2. **Open the application:**

   - Simply open `index.html` in your web browser
   - Or use a local server (recommended):

     ```bash
     # Using Python
     python -m http.server 8000

     # Using Node.js
     npx http-server
     ```

   - Then navigate to `http://localhost:8000`

3. **Grant camera permissions:**
   - Your browser will ask for webcam access
   - Click "Allow" to enable emotion recognition

## 🔧 Configuration

### Setting Up the AI Chatbot

The chatbot requires an OpenAI API key to function. You have two options:

#### Option 1: Use Your Own API Key (Recommended)

1. Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Click the **"⚙️ API Configuration"** section at the top of the app
3. Enter your API key in the **"OpenAI API Key"** field
4. (Optional) Change the model (default: `gpt-3.5-turbo`)
5. Click **"Save Configuration"**

#### Option 2: Use Default Key (Limited)

1. Click **"Use Default Key"** in the configuration section
2. This uses a shared demo key with limited usage
3. May stop working if quota is exceeded

### Supported Models

- `gpt-3.5-turbo` (default, fast and cost-effective)
- `gpt-4` (more advanced, requires GPT-4 API access)
- `gpt-4-turbo`
- Any other OpenAI chat completion model

## 📖 How to Use

### Step 1: Start the Application

1. Open `index.html` in your browser
2. Allow camera access when prompted
3. Wait for the face detection models to load (~5-10 seconds)

### Step 2: Configure the Chatbot

1. Expand the **API Configuration** section
2. Enter your OpenAI API key or use the default
3. Save the configuration

### Step 3: Start Chatting

1. Type your message in the input field at the bottom
2. Press **Enter** or click the **Send** button
3. The chatbot will respond based on your stress level and message content

### Step 4: Monitor Your Stress

- Watch the **"Your Stress Level"** bar at the top
- The color and percentage indicate your current stress state
- The chatbot adapts its responses accordingly

## 🎨 UI Components

### Main Interface

- **API Configuration Panel**: Collapsible section for API setup
- **Stress Bar**: Real-time stress level indicator (0-100%)
- **Chat Container**: Message history with user and bot bubbles
- **Video Feed**: Circular webcam preview (bottom-right corner)
- **Input Field**: Type your messages here

### Visual Feedback

- **Typing Indicator**: Animated dots when the bot is responding
- **Video Status**: Shows "Analyzing..." when detecting emotions
- **Status Indicator**: Shows API connection status (⚫ inactive, 🟢 active, 🔴 error)

## 💾 Data Persistence

All data is stored locally in your browser:

- **Chat History**: Saved in localStorage, persists across sessions
- **Stress Level**: Last known stress score is saved
- **API Configuration**: Your API key and model preference are stored securely

To clear your data:

- Open browser DevTools (F12)
- Go to Application → Local Storage
- Delete items starting with `mindfulU_`

## 🔒 Privacy & Security

- **No Backend Server**: Everything runs in your browser
- **Local Storage Only**: No data is sent to external servers (except OpenAI API for chat)
- **Camera Privacy**: Video feed is processed locally, never uploaded
- **API Key Security**: Stored in browser localStorage (not transmitted except to OpenAI)

## 🛠️ Technical Stack

- **HTML5**: Structure and semantic markup
- **CSS3**: Neumorphic design with custom properties
- **Vanilla JavaScript**: No frameworks, pure ES6+
- **face-api.js**: TensorFlow.js-based facial recognition
- **OpenAI API**: GPT-powered conversational AI
- **localStorage**: Client-side data persistence

## 📱 Browser Compatibility

| Browser | Support       | Notes                        |
| ------- | ------------- | ---------------------------- |
| Chrome  | ✅ Full       | Recommended                  |
| Firefox | ✅ Full       | Recommended                  |
| Edge    | ✅ Full       | Chromium-based               |
| Safari  | ⚠️ Partial    | Some CSS features may differ |
| Mobile  | ✅ Responsive | Touch-optimized              |

## 🐛 Troubleshooting

### Camera Not Working

- **Check permissions**: Ensure camera access is allowed in browser settings
- **HTTPS required**: Some browsers require HTTPS for camera access (use localhost for development)
- **Other apps**: Close other applications using the camera

### Chatbot Not Responding

- **API Key**: Verify your OpenAI API key is correct
- **Quota**: Check if you have API credits remaining
- **Network**: Ensure you have internet connection
- **Console**: Open DevTools (F12) to check for error messages

### Stress Bar Not Updating

- **Face Detection**: Ensure your face is visible and well-lit
- **Model Loading**: Wait for models to fully load (check video status)
- **Browser Console**: Check for JavaScript errors

### Chat History Lost

- **localStorage**: Don't use incognito/private mode
- **Browser Data**: Avoid clearing browser data
- **Same Browser**: History is browser-specific

## 🤝 Contributing

This is a group project for EE4213 HCI. Team members can:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is created for educational purposes as part of EE4213 Human-Computer Interaction course.

## 👥 Team

- **Repository**: [lthalex915/ee4213-group-project](https://github.com/lthalex915/ee4213-group-project)
- **Course**: EE4213 Human-Computer Interaction
- **Institution**: City University of Hong Kong

## 📞 Support

For questions or issues:

1. Check the troubleshooting section above
2. Open an issue on GitHub
3. Contact team members

---

**Built with ❤️ for students, by students**
