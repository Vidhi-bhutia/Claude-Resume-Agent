# Claude Resume & JD Optimizer

A high-fidelity, agent-driven web application designed to help job seekers perfectly tailor their resumes to specific job descriptions using semantic analysis and intelligent profile recalibration.

## 🚀 Features

- **Agent-Based Optimization**: A guided workflow that detects when you need to match a resume to a JD and launches a specialized optimization agent.
- **Deep Semantic Analysis**: Goes beyond simple keyword matching to perform a "Gap Analysis" between your background and the role requirements.
- **Real-time Processing Interface**: Watch the agent work through distinct phases (Parsing, Analyzing, Refining, Finalizing) with a polished, interactive UI.
- **Integrated Chat Experience**: A seamless transition between standard AI chat (Claude 3.5 Sonnet styling) and specialized tool execution.
- **Beautiful Result Previews**: View your refined professional summary and experience pillars in a clean, professional layout designed for impact.
- **File & Link Handling**: Attach resumes and job descriptions directly in the chat or via the dedicated agent setup screen.

## 🛠 Tech Stack

- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS (Modern, spacing-dense aesthetic)
- **Animations**: Framer Motion (for smooth route transitions and progress bars)
- **Icons**: Lucide React
- **AI**: Google Gemini API (via `@google/genai` SDK)
- **Formatting**: React Markdown for rich text responses

## ⚙️ Setup & Installation

1. **Clone the repository** (if exported) or continue in AI Studio.
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Create a `.env` file based on `.env.example`:
   - `GEMINI_API_KEY`: Your Google AI Studio API key.
   - `APP_URL`: The URL where your application is hosted (e.g., your AI Studio preview URL).

4. **Run the development server**:
   ```bash
   npm run dev
   ```

## 🎨 UI Philosophy

This application follows a "Technical Editorial" aesthetic, inspired by high-end AI research interfaces. It focuses on:
- **High-contrast typography**: Using Inter and professional scale.
- **Intentional Spacing**: Generous gutters and balanced layouts for focus mode.
- **Micro-interactions**: Subtle hover states, pulse animations for active processing, and staggered list entries to reduce cognitive load.
