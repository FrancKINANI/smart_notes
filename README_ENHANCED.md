# 🧠 SmartNotes - Advanced Learning Platform

SmartNotes is a comprehensive SaaS platform that transforms traditional note-taking into an intelligent learning ecosystem. Built with modern technologies and AI-powered features, it provides students and learners with the tools they need to maximize their educational potential.

---

## ✨ Key Features

### 🎯 **Core Learning Tools**
- **Enhanced Note Editor** - Rich text, Markdown, and Mind Map modes with collaborative editing
- **AI-Powered Assistant** - Personalized tutoring, explanations, and learning recommendations
- **Advanced Study Sessions** - Pomodoro timer with focus tracking and productivity analytics
- **Smart Flashcards** - Spaced repetition system with adaptive difficulty adjustment
- **Interactive Quizzes** - AI-generated questions with detailed explanations

### 🤝 **Collaborative Learning**
- **Study Groups** - Real-time collaboration with video sessions and shared materials
- **Peer Learning** - Community features with discussion forums and knowledge sharing
- **Live Sessions** - Virtual study rooms with screen sharing and interactive tools
- **Progress Tracking** - Group analytics and individual performance insights

### 🧠 **AI-Enhanced Features**
- **Intelligent Content Analysis** - Automatic summarization and key point extraction
- **Personalized Learning Paths** - Adaptive curriculum based on performance and goals
- **Smart Recommendations** - AI-suggested study materials and improvement areas
- **Voice Integration** - Speech-to-text note taking and audio explanations

### 📊 **Analytics & Insights**
- **Learning Analytics** - Comprehensive progress tracking and performance metrics
- **Study Patterns** - Behavioral analysis and optimization suggestions
- **Goal Setting** - SMART goals with milestone tracking and achievements
- **Retention Analysis** - Memory curve tracking and review scheduling

---

## 🛠️ Technology Stack

### **Frontend**
- **React 18** - Modern UI library with hooks and concurrent features
- **TypeScript** - Type-safe development with enhanced developer experience
- **Tailwind CSS** - Utility-first CSS framework with custom design system
- **Radix UI** - Accessible, unstyled UI components
- **Framer Motion** - Smooth animations and micro-interactions
- **React Query** - Powerful data fetching and state management
- **Wouter** - Lightweight client-side routing

### **Backend**
- **Node.js** - JavaScript runtime for server-side development
- **Express.js** - Fast, unopinionated web framework
- **TypeScript** - Full-stack type safety
- **Drizzle ORM** - Type-safe database operations
- **MySQL** - Reliable relational database
- **Passport.js** - Authentication middleware

### **AI & ML**
- **OpenAI API** - GPT-powered content generation and analysis
- **Mistral AI** - Alternative AI model for diverse capabilities
- **Speech Recognition API** - Voice-to-text functionality
- **Text-to-Speech API** - Audio content generation

### **Development Tools**
- **Vite** - Fast build tool and development server
- **ESBuild** - Ultra-fast JavaScript bundler
- **Zod** - Runtime type validation
- **Winston** - Comprehensive logging solution

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- MySQL 8.0+
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/FrancKINANI/smart_notes.git
   cd smart_notes
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_URL="mysql://username:password@localhost:3306/smartnotes"
   
   # Authentication
   SESSION_SECRET="your-session-secret"
   COOKIE_SECRET="your-cookie-secret"
   
   # AI Services
   OPENAI_API_KEY="your-openai-api-key"
   MISTRAL_API_KEY="your-mistral-api-key"
   
   # Application
   NODE_ENV="development"
   PORT=5000
   ```

4. **Database Setup**
   ```bash
   npm run db:push
   npm run migrate
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Access the Application**
   Open [http://localhost:5000](http://localhost:5000) in your browser

---

## 📱 Features Overview

### **Enhanced Dashboard**
- **Modern Design** - Clean, intuitive interface with dark/light theme support
- **Quick Actions** - One-click access to frequently used features
- **Progress Visualization** - Interactive charts and progress indicators
- **Smart Suggestions** - AI-powered recommendations based on usage patterns

### **Advanced Note Editor**
- **Multiple Modes** - Rich text, Markdown, and interactive mind mapping
- **Real-time Collaboration** - Live editing with multiple users
- **Voice Input** - Speech-to-text note creation
- **Template System** - Pre-built templates for different note types
- **AI Integration** - Smart formatting and content suggestions

### **Intelligent Study Sessions**
- **Pomodoro Technique** - Customizable focus and break intervals
- **Distraction Tracking** - Monitor and improve focus levels
- **Session Analytics** - Detailed productivity insights
- **Ambient Sounds** - Focus-enhancing background audio

### **Smart Flashcard System**
- **Spaced Repetition** - Scientifically-backed review scheduling
- **Adaptive Difficulty** - Dynamic adjustment based on performance
- **Multi-modal Content** - Text, images, and audio support
- **Progress Tracking** - Detailed learning curve analysis

### **AI Learning Assistant**
- **Conversational Interface** - Natural language interaction
- **Personalized Tutoring** - Adaptive explanations and guidance
- **Content Generation** - Automatic quiz and summary creation
- **Learning Path Optimization** - AI-driven curriculum recommendations

---

## 🎨 Design System

### **Color Palette**
- **Primary** - Purple gradient (#8B5CF6 to #7C3AED)
- **Secondary** - Blue tones for accents and highlights
- **Success** - Green for positive actions and feedback
- **Warning** - Amber for cautions and important notices
- **Error** - Red for errors and destructive actions

### **Typography**
- **Headings** - Inter font family with optimized spacing
- **Body Text** - Inter with enhanced readability settings
- **Code** - JetBrains Mono for technical content

### **Components**
- **Glassmorphism** - Subtle transparency effects
- **Smooth Animations** - Framer Motion powered transitions
- **Responsive Design** - Mobile-first approach
- **Accessibility** - WCAG 2.1 AA compliance

---

## 🔧 Development

### **Available Scripts**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - TypeScript type checking
- `npm run db:push` - Push database schema changes
- `npm run migrate` - Run database migrations

### **Project Structure**
```
smart_notes/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility functions
│   │   └── styles/        # Global styles
├── server/                # Backend Express application
│   ├── routes/           # API route handlers
│   ├── middleware/       # Express middleware
│   ├── utils/           # Server utilities
│   └── auth.ts          # Authentication logic
├── shared/              # Shared types and schemas
└── migrations/          # Database migration files
```

---

## 🤝 Contributing

We welcome contributions from the community! Please read our contributing guidelines and code of conduct before submitting pull requests.

### **Development Workflow**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **OpenAI** - For providing powerful AI capabilities
- **Radix UI** - For accessible component primitives
- **Tailwind CSS** - For the utility-first CSS framework
- **React Community** - For the amazing ecosystem and tools

---

## 📞 Support

For support, email support@smartnotes.app or join our Discord community.

**Made with ❤️ for learners everywhere**
