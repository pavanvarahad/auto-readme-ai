const vscode = require('vscode');

/**
 * Error handler for the AutoReadMe extension
 */
class ErrorHandler {
    /**
     * Handle Ollama connection errors
     * @param {any} error - The error object from Axios
     * @returns {string} - User-friendly error message
     */
    static handleOllamaError(error) {
        if (error.code === 'ECONNREFUSED') {
            return 'Could not connect to Ollama. Make sure Ollama is running on your machine.';
        }
        
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            if (error.response.status === 404) {
                return 'The specified Ollama model was not found. Please check if the model is installed.';
            }
            
            if (error.response.status === 400) {
                return 'Bad request to Ollama API. Please check your inputs.';
            }
            
            return `Ollama API error: ${error.response.status} - ${error.response.data?.error || 'Unknown error'}`;
        } else if (error.request) {
            // The request was made but no response was received
            return 'No response from Ollama. Please check if Ollama is running correctly.';
        }
        
        // Something happened in setting up the request that triggered an Error
        return `Error connecting to Ollama: ${error.message}`;
    }
    
    /**
     * Handle Gemini API errors
     * @param {any} error - The error object from Gemini API
     * @returns {string} - User-friendly error message
     */
    static handleGeminiError(error) {
        // Check for common Gemini API errors
        if (error.message && error.message.includes('API key')) {
            return 'Invalid Gemini API key. Please check your API key and try again.';
        }
        
        if (error.message && error.message.includes('quota')) {
            return 'Gemini API quota exceeded. Please try again later or check your API usage limits.';
        }
        
        if (error.message && error.message.includes('model')) {
            return 'The specified Gemini model is not available. Please try a different model.';
        }
        
        if (error.message && error.message.includes('content')) {
            return 'The content sent to Gemini API was rejected. It may contain prohibited content.';
        }
        
        // Generic Gemini error
        return `Gemini API error: ${error.message}`;
    }
    
    /**
     * Handle file system errors
     * @param {any} error - The error object from fs operations
     * @returns {string} - User-friendly error message
     */
    static handleFileSystemError(error) {
        if (error.code === 'ENOENT') {
            return 'File or directory not found.';
        }
        
        if (error.code === 'EACCES') {
            return 'Permission denied. Cannot access file or directory.';
        }
        
        if (error.code === 'EISDIR') {
            return 'Expected a file but found a directory.';
        }
        
        return `File system error: ${error.message}`;
    }
    
    /**
     * Show error message to user and log to console
     * @param {any} error - The error object
     * @param {string} context - Context where the error occurred
     */
    static showError(error, context = '') {
        let message = '';
        
        if (error.isAxiosError) {
            message = this.handleOllamaError(error);
        } else if (error.message && (
            error.message.includes('Gemini') || 
            error.message.includes('API key') || 
            error.message.includes('generative')
        )) {
            message = this.handleGeminiError(error);
        } else if (error.code && ['ENOENT', 'EACCES', 'EISDIR'].includes(error.code)) {
            message = this.handleFileSystemError(error);
        } else {
            message = `Error ${context ? 'while ' + context : ''}: ${error.message}`;
        }
        
        vscode.window.showErrorMessage(message);
        console.error(error);
    }
}

module.exports = ErrorHandler; 