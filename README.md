# AutoReadMe - AI-Powered README Generator for VS Code

AutoReadMe is a VS Code extension that automatically generates comprehensive README.md files for your projects using AI. It intelligently analyzes your project structure and files, and with your input as context, creates a well-structured README file.

## Features

-  **Smart Project Analysis**: Intelligently identifies project type and only scans relevant files
-  **Project Type Detection**: Automatically detects your project type (Node.js, Python, Java, etc.)
-  **Dual AI Provider Support**: 
  - **Ollama** (Local): Use locally hosted models for privacy and no API costs
  - **Gemini** (Cloud): Use Google's powerful Gemini 1.5 Flash model for high-quality results
-  **Deep Content Analysis**: Analyzes actual file contents, not just file names and structure
-  **Extensive Source Code Processing**: Includes up to 10 source code samples in the generation process
-  **Project-Specific Optimization**: Adjusts file collection based on project type
-  **Deep Directory Scanning**: Scans up to 5 directory levels deep for thorough analysis
-  **Context-Aware**: Takes your input to provide additional context for the README generation
-  **Complete Documentation**: Generates sections for installation, usage, features, dependencies, and more
-  **Customizable**: Choose which AI provider and model to use for generation
-  **Configurable**: Customize which files and directories to include or exclude from analysis
-  **Performance Optimized**: Skips irrelevant files like node_modules, virtual environments, and build artifacts

## Requirements

- For Ollama: [Ollama](https://ollama.ai/) must be installed and running locally
- For Gemini: A Google Gemini API key (get one at [Google AI Studio](https://makersuite.google.com/app/apikey))

## Installation

1. Install the extension from the VS Code Marketplace
2. Make sure either Ollama is installed or you have a Gemini API key
3. Open a project folder in VS Code

## Usage

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type and select `Generate README`
3. Enter additional context about your project when prompted
4. Select your preferred AI provider (Ollama or Gemini)
5. Configure the selected provider:
   - For Ollama: Specify model and endpoint
   - For Gemini: Enter API key (can be saved for future use) and select model
6. Wait for the README to be generated
7. Review and edit the generated README.md file

## How It Works

1. **Project Type Detection**: The extension first analyzes your project to determine its type (Node.js, Python, etc.)
2. **Smart File Scanning**: Based on the project type, it intelligently scans only the most relevant files
3. **Content Analysis**: Important files like package.json, requirements.txt, etc. are analyzed for dependencies
4. **Source Code Extraction**: Up to 10 key source code files are identified and their contents extracted
5. **Deep Directory Scanning**: The extension scans up to 5 directory levels deep for thorough analysis
6. **AI Generation**: The collected information is sent to your chosen AI provider along with your context
7. **README Creation**: A comprehensive README.md is generated and saved to your project

## Extension Settings

This extension contributes the following settings:

* `autoReadme.aiProvider`: The AI provider to use (ollama or gemini)
* `autoReadme.ollamaModel`: The Ollama model to use (default: "llama3.2:latest")
* `autoReadme.ollamaEndpoint`: The Ollama API endpoint URL (default: "http://localhost:11434")
* `autoReadme.geminiApiKey`: Your Gemini API key (required for Gemini provider)
* `autoReadme.geminiModel`: The Gemini model to use (default: "gemini-1.5-flash")
* `autoReadme.ignoreDirectories`: Directories to ignore when scanning the workspace
* `autoReadme.ignoreFiles`: Files to ignore when scanning the workspace

## Comparing AI Providers

| Feature | Ollama | Gemini |
|---------|--------|--------|
| Hosting | Local (your machine) | Cloud (Google) |
| Cost | Free | Free tier available, then pay-as-you-go |
| Privacy | High (data stays local) | Standard (data sent to Google) |
| Setup | Requires Ollama installation | Requires API key only |
| Models | Many options (llama3, mistral, etc.) | gemini-1.5-flash, gemini-1.5-pro |
| Speed | Depends on your hardware | Very fast |
| Quality | Good | Excellent |

## Known Issues

- Ollama must be running locally to use the Ollama provider
- Large projects may take longer to analyze and generate a README

## Development

### Prerequisites

- Node.js
- npm or yarn
- VS Code

### Setup

1. Clone the repository
2. Run `npm install` to install dependencies
3. Open the project in VS Code
4. Press F5 to start debugging

### Building

```bash
npm run lint
vsce package
```

## License

MIT

## Credits

This extension uses:
- [Ollama](https://ollama.ai/) for local AI-powered README generation
- [Google Gemini API](https://ai.google.dev/) for cloud-based AI-powered README generation

---

**Enjoy!**
