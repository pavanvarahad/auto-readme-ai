const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Generates a README using Gemini API
 * @param {Object} workspaceData - Data from the workspace scan
 * @param {string} userContext - Additional context provided by the user
 * @param {string} apiKey - Gemini API key
 * @param {string} model - Gemini model to use
 * @returns {Promise<string>} - Generated README content
 */
async function generateReadmeWithGemini(workspaceData, userContext, apiKey, model = 'gemini-1.5-flash') {
    try {
        // Initialize the Gemini API client
        const genAI = new GoogleGenerativeAI(apiKey);
        const geminiModel = genAI.getGenerativeModel({ model });
        
        // Prepare the prompt for Gemini
        const filesList = workspaceData.files.join('\n');
        const dirsList = workspaceData.directories.join('\n');
        
        // Prepare important file contents to include in the prompt
        let importantFileContents = '';
        
        // Add package.json content if available
        const packageJsonContent = workspaceData.fileContents['package.json'] || '';
        if (packageJsonContent) {
            importantFileContents += `package.json content:\n${JSON.stringify(packageJsonContent, null, 2)}\n\n`;
        }
        
        // Add existing README content for reference
        const existingReadmeContent = workspaceData.fileContents['README.md'] || '';
        if (existingReadmeContent) {
            importantFileContents += `Existing README.md content (for reference):\n${existingReadmeContent}\n\n`;
        }
        
        // Add other important file contents based on project type
        const importantFiles = getImportantFilesForProjectType(workspaceData.projectType, workspaceData.mainLanguages);
        
        for (const fileName of importantFiles) {
            // Find the file in the workspace data
            const fileKey = Object.keys(workspaceData.fileContents).find(key => 
                key.toLowerCase() === fileName.toLowerCase() || key.endsWith(`/${fileName.toLowerCase()}`)
            );
            
            if (fileKey && workspaceData.fileContents[fileKey]) {
                importantFileContents += `${fileName} content:\n${workspaceData.fileContents[fileKey]}\n\n`;
            }
        }
        
        // Add source code samples
        const sourceCodeSamples = getSourceCodeSamples(workspaceData);
        if (sourceCodeSamples) {
            importantFileContents += sourceCodeSamples;
        }
        
        // Create a prompt for Gemini
        const prompt = `
You are an expert developer tasked with creating a comprehensive README.md file for a project.
Based on the following project structure and file contents, generate a well-structured README.md file.

Project Type: ${workspaceData.projectType}
Main Languages/Frameworks: ${workspaceData.mainLanguages.join(', ')}

Project Files:
${filesList}

Project Directories:
${dirsList}

Important File Contents:
${importantFileContents}

Additional context from the user:
${userContext}

Please generate a comprehensive README.md file that includes:
1. Project title and description
2. Installation instructions
3. Usage examples
4. Features
5. Dependencies
6. License information (if available)
7. Any other relevant sections based on the project structure

Format the README using proper Markdown syntax.
`;

        // Generate content with Gemini
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Error generating README with Gemini:', error);
        throw new Error(`Failed to generate README with Gemini: ${error.message}`);
    }
}

// Import helper functions from utils.js
const { getImportantFilesForProjectType, getSourceCodeSamples } = require('./utils');

module.exports = {
    generateReadmeWithGemini
}; 