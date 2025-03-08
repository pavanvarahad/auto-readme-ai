// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { scanWorkspace, generateReadmeWithOllama } = require('./utils');
const { generateReadmeWithGemini } = require('./geminiService');
const ErrorHandler = require('./errorHandler');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "auto-readme-ai" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('auto-readme-ai.generate_readme', async function () {
		try {
			// Get the workspace folder
			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (!workspaceFolders || workspaceFolders.length === 0) {
				vscode.window.showErrorMessage('No workspace folder found. Please open a folder first.');
				return;
			}
			
			const workspaceRoot = workspaceFolders[0].uri.fsPath;
			
			// Get configuration settings
			const config = vscode.workspace.getConfiguration('autoReadme');
			const aiProvider = config.get('aiProvider') || 'ollama';
			const defaultOllamaModel = config.get('ollamaModel') || 'llama3.2:latest';
			const defaultOllamaEndpoint = config.get('ollamaEndpoint') || 'http://localhost:11434';
			const defaultGeminiModel = config.get('geminiModel') || 'gemini-2.0-flash';
			const geminiApiKey = config.get('geminiApiKey') || '';
			const ignoreDirectories = config.get('ignoreDirectories') || [];
			const ignoreFiles = config.get('ignoreFiles') || [];
			
			// Show progress indicator
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "Generating README",
				cancellable: false
			}, async (progress) => {
				// Step 1: Ask for user context
				progress.report({ message: "Getting user input..." });
				const userContext = await vscode.window.showInputBox({
					prompt: "Provide additional context for your README (project purpose, target audience, etc.)",
					placeHolder: "This project is a...",
					ignoreFocusOut: true
				});
				
				if (userContext === undefined) {
					// User cancelled the input
					return;
				}
				
				// Step 2: Ask for AI provider
				progress.report({ message: "Configuring AI provider..." });
				const selectedProvider = await vscode.window.showQuickPick(
					[
						{ label: 'Ollama (Local)', description: 'Use locally hosted Ollama models' },
						{ label: 'Gemini (Cloud)', description: 'Use Google Gemini API' }
					],
					{
						placeHolder: 'Select AI provider',
						ignoreFocusOut: true
					}
				);
				
				if (!selectedProvider) {
					// User cancelled the selection
					return;
				}
				
				const provider = selectedProvider.label.startsWith('Ollama') ? 'ollama' : 'gemini';
				
				let readmeContent = '';
				
				try {
					// Step 3: Scan workspace
					progress.report({ message: "Scanning workspace files..." });
					const workspaceData = await scanWorkspace(workspaceRoot, ignoreDirectories, ignoreFiles);
					
					// Step 4: Generate README with selected provider
					if (provider === 'ollama') {
						// Configure Ollama
						const ollamaModel = await vscode.window.showInputBox({
							prompt: "Enter the Ollama model to use",
							placeHolder: defaultOllamaModel,
							value: defaultOllamaModel,
							ignoreFocusOut: true
						}) || defaultOllamaModel;
						
						const ollamaEndpoint = await vscode.window.showInputBox({
							prompt: "Enter the Ollama API endpoint",
							placeHolder: defaultOllamaEndpoint,
							value: defaultOllamaEndpoint,
							ignoreFocusOut: true
						}) || defaultOllamaEndpoint;
						
						// Generate with Ollama
						progress.report({ message: "Generating README with Ollama..." });
						readmeContent = await generateReadmeWithOllama(
							workspaceData, 
							userContext || "", 
							ollamaEndpoint,
							ollamaModel
						);
					} else {
						// Configure Gemini
						let apiKey = geminiApiKey;
						
						// If API key is not set in settings, ask for it
						if (!apiKey) {
							apiKey = await vscode.window.showInputBox({
								prompt: "Enter your Gemini API key",
								password: true,
								ignoreFocusOut: true,
								placeHolder: "Enter your Gemini API key here"
							});
							
							if (!apiKey) {
								vscode.window.showErrorMessage('Gemini API key is required.');
								return;
							}
							
							// Ask if user wants to save the API key in settings
							const saveApiKey = await vscode.window.showQuickPick(
								['Yes', 'No'],
								{
									placeHolder: 'Save API key in settings?',
									ignoreFocusOut: true
								}
							);
							
							if (saveApiKey === 'Yes') {
								await config.update('geminiApiKey', apiKey, vscode.ConfigurationTarget.Global);
							}
						}
						
						const geminiModel = await vscode.window.showQuickPick(
							['gemini-2.0-flash','gemini-1.5-flash', 'gemini-1.5-pro'],
							{
								placeHolder: 'Select Gemini model',
								ignoreFocusOut: true
							}
						) || defaultGeminiModel;
						
						// Generate with Gemini
						progress.report({ message: "Generating README with Gemini..." });
						readmeContent = await generateReadmeWithGemini(
							workspaceData,
							userContext || "",
							apiKey,
							geminiModel
						);
					}
					
					// Step 5: Write README.md file
					progress.report({ message: "Writing README.md file..." });
					const readmePath = path.join(workspaceRoot, 'README.md');
					
					// Check if README.md already exists
					if (fs.existsSync(readmePath)) {
						const overwrite = await vscode.window.showWarningMessage(
							'README.md already exists. Do you want to overwrite it?',
							{ modal: true },
							'Yes',
							'No'
						);
						
						if (overwrite !== 'Yes') {
							vscode.window.showInformationMessage('README generation cancelled.');
							return;
						}
					}
					
					fs.writeFileSync(readmePath, readmeContent);
					
					// Step 6: Open the README.md file
					const readmeUri = vscode.Uri.file(readmePath);
					await vscode.window.showTextDocument(readmeUri);
					
					// Show success message
					vscode.window.showInformationMessage('README.md has been generated successfully!');
				} catch (error) {
					ErrorHandler.showError(error, 'generating README');
				}
			});
			
		} catch (error) {
			ErrorHandler.showError(error);
		}
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
