const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * Determines if a file is likely to be important for README generation
 * @param {string} filePath - Path to the file
 * @returns {boolean} - Whether the file is likely important
 */
function isLikelyImportantFile(filePath) {
    const fileName = path.basename(filePath).toLowerCase();
    const ext = path.extname(filePath).toLowerCase();
    
    // Important root files
    const importantRootFiles = [
        'readme.md', 'license', 'license.md', 'license.txt',
        'package.json', 'setup.py', 'requirements.txt', 'pyproject.toml',
        'cargo.toml', 'gemfile', 'composer.json', 'go.mod',
        'dockerfile', 'docker-compose.yml', 'makefile', 'cmakelists.txt',
        '.gitignore', '.travis.yml', '.github', 'contributing.md',
        'changelog.md', 'history.md', 'code_of_conduct.md', 'main.py', 'app.py'
    ];
    
    // Important file extensions
    const importantExtensions = [
        // Documentation
        '.md', '.rst', '.txt', '.py', '.js','.php',
        '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg',
        '.py', '.js', '.ts', '.java', '.c', '.cpp', '.h', '.hpp',
        '.go', '.rb', '.php', '.cs', '.swift', '.kt', '.rs',
        '.html', '.css'
    ];
    
    if (importantRootFiles.includes(fileName)) {
        return true;
    }
    
    if (importantExtensions.includes(ext)) {
        return true;
    }
    
    if ((fileName.startsWith('main.') || fileName.startsWith('index.')) && 
        importantExtensions.includes(ext)) {
        return true;
    }
    
    return false;
}

/**
 * Determines if a directory is likely to be important for README generation
 * @param {string} dirName - Name of the directory
 * @returns {boolean} - Whether the directory is likely important
 */
function isLikelyImportantDirectory(dirName) {
    const lowercaseName = dirName.toLowerCase();
    
    // Common directories to ignore
    const unimportantDirs = [
        'node_modules', '.git', '.github', '.vscode', '.idea',
        'venv', 'env', '.env', '__pycache__', '.pytest_cache',
        'build', 'dist', 'out', 'target', 'bin', 'obj',
        'coverage', 'logs', 'tmp', 'temp', 'cache'
    ];
    
    // Check if it's in the unimportant list
    if (unimportantDirs.includes(lowercaseName)) {
        return false;
    }
    
    // Common important directories
    const importantDirs = [
        'src', 'lib', 'app', 'api', 'core', 'docs',
        'examples', 'tests', 'scripts', 'config', 'public',
        'assets', 'resources', 'templates', 'views', 'components'
    ];
    
    // Check if it's in the important list
    if (importantDirs.includes(lowercaseName)) {
        return true;
    }
    
    // Default to true for other directories, but with limited depth
    return true;
}

/**
 * Scans the workspace and returns a list of files and directories
 * @param {string} rootPath - The root path of the workspace
 * @param {string[]} ignoreDirs - Directories to ignore
 * @param {string[]} ignoreFiles - Files to ignore
 * @returns {Promise<Object>} - Object containing files and directories
 */
async function scanWorkspace(rootPath, ignoreDirs = [], ignoreFiles = []) {
    const defaultIgnoreDirs = ['.git', 'node_modules', '.vscode', 'dist', 'build', 'out'];
    const defaultIgnoreFiles = ['.DS_Store', '.gitignore', 'package-lock.json', 'yarn.lock'];
    
    const dirsToIgnore = [...defaultIgnoreDirs, ...ignoreDirs];
    const filesToIgnore = [...defaultIgnoreFiles, ...ignoreFiles];
    
    const result = {
        files: [],
        directories: [],
        fileContents: {},
        projectType: 'unknown',
        mainLanguages: []
    };
    
    // First pass: Identify project type and structure
    await identifyProjectType(rootPath, result);
    
    // Second pass: Scan for important files based on project type
    await scanImportantFiles(rootPath, result, dirsToIgnore, filesToIgnore);
    
    return result;
}

/**
 * Identifies the project type and main languages
 * @param {string} rootPath - The root path of the workspace
 * @param {Object} result - The result object to update
 * @returns {Promise<void>}
 */
async function identifyProjectType(rootPath, result) {
    try {
        const entries = fs.readdirSync(rootPath, { withFileTypes: true });
        
        // Check for key files that identify project type
        for (const entry of entries) {
            if (entry.isFile()) {
                const fileName = entry.name.toLowerCase();
                
                // JavaScript/Node.js project
                if (fileName === 'package.json') {
                    result.projectType = 'node';
                    result.mainLanguages.push('javascript');
                    
                    // Read package.json to get more info
                    try {
                        const packageJson = JSON.parse(fs.readFileSync(path.join(rootPath, 'package.json'), 'utf8'));
                        result.fileContents['package.json'] = packageJson;
                        
                        // Check for TypeScript
                        if (packageJson.devDependencies && 
                            (packageJson.devDependencies.typescript || 
                             packageJson.dependencies && packageJson.dependencies.typescript)) {
                            result.mainLanguages.push('typescript');
                        }
                        
                        // Check for frameworks
                        if (packageJson.dependencies) {
                            if (packageJson.dependencies.react) result.mainLanguages.push('react');
                            if (packageJson.dependencies.vue) result.mainLanguages.push('vue');
                            if (packageJson.dependencies.angular) result.mainLanguages.push('angular');
                            if (packageJson.dependencies.express) result.mainLanguages.push('express');
                            if (packageJson.dependencies.next) result.mainLanguages.push('nextjs');
                        }
                    } catch (error) {
                        console.error('Error parsing package.json:', error);
                    }
                }
                
                // Python project
                else if (fileName === 'requirements.txt' || fileName === 'setup.py' || fileName === 'pyproject.toml') {
                    result.projectType = 'python';
                    result.mainLanguages.push('python');
                    
                    // Read requirements.txt to get dependencies
                    if (fileName === 'requirements.txt') {
                        try {
                            result.fileContents['requirements.txt'] = fs.readFileSync(
                                path.join(rootPath, 'requirements.txt'), 'utf8'
                            );
                        } catch (error) {
                            console.error('Error reading requirements.txt:', error);
                        }
                    }
                }
                
                // Java/Maven project
                else if (fileName === 'pom.xml') {
                    result.projectType = 'java';
                    result.mainLanguages.push('java');
                }
                
                // Rust project
                else if (fileName === 'cargo.toml') {
                    result.projectType = 'rust';
                    result.mainLanguages.push('rust');
                }
                
                // Go project
                else if (fileName === 'go.mod') {
                    result.projectType = 'go';
                    result.mainLanguages.push('go');
                }
                
                // Ruby project
                else if (fileName === 'gemfile') {
                    result.projectType = 'ruby';
                    result.mainLanguages.push('ruby');
                }
                
                // PHP/Composer project
                else if (fileName === 'composer.json') {
                    result.projectType = 'php';
                    result.mainLanguages.push('php');
                }
                
                // Docker project
                else if (fileName === 'dockerfile' || fileName === 'docker-compose.yml') {
                    result.mainLanguages.push('docker');
                }
                
                // Existing README
                else if (fileName === 'readme.md') {
                    try {
                        result.fileContents['README.md'] = fs.readFileSync(
                            path.join(rootPath, entry.name), 'utf8'
                        );
                    } catch (error) {
                        console.error('Error reading README.md:', error);
                    }
                }
                
                // License file
                else if (fileName.startsWith('license')) {
                    try {
                        result.fileContents['LICENSE'] = fs.readFileSync(
                            path.join(rootPath, entry.name), 'utf8'
                        );
                    } catch (error) {
                        console.error('Error reading LICENSE:', error);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error identifying project type:', error);
    }
}

/**
 * Scans for important files based on project type
 * @param {string} rootPath - The root path of the workspace
 * @param {Object} result - The result object to update
 * @param {string[]} dirsToIgnore - Directories to ignore
 * @param {string[]} filesToIgnore - Files to ignore
 * @param {number} depth - Current directory depth
 * @returns {Promise<void>}
 */
async function scanImportantFiles(rootPath, result, dirsToIgnore, filesToIgnore, depth = 0) {
    try {
        // Limit depth to prevent excessive scanning
        const maxDepth = 5; // Increased from 3 to 5 for more thorough scanning
        if (depth > maxDepth) {
            return;
        }
        
        const entries = fs.readdirSync(rootPath, { withFileTypes: true });
        
        // Get source file extensions for this project type
        const sourceExtensions = getSourceFileExtensions(result.projectType, result.mainLanguages);
        
        // Calculate max files to collect based on project type
        const maxFiles = calculateMaxFiles(result.projectType);
        const currentFileCount = Object.keys(result.fileContents).length;
        
        for (const entry of entries) {
            const entryPath = path.join(rootPath, entry.name);
            const relativePath = path.relative(rootPath, entryPath);
            
            if (entry.isDirectory()) {
                const dirName = entry.name;
                
                // Skip ignored directories
                if (dirsToIgnore.includes(dirName)) {
                    continue;
                }
                
                // Check if directory is likely important
                if (isLikelyImportantDirectory(dirName)) {
                    result.directories.push(relativePath);
                    
                    // Recursively scan important directories
                    await scanImportantFiles(
                        entryPath, 
                        result, 
                        dirsToIgnore, 
                        filesToIgnore, 
                        depth + 1
                    );
                }
            } else if (entry.isFile()) {
                const fileName = entry.name;
                
                // Skip ignored files
                if (filesToIgnore.includes(fileName)) {
                    continue;
                }
                
                // Check if we've reached the max file limit
                if (Object.keys(result.fileContents).length >= maxFiles) {
                    // Still add to files list but don't read content
                    if (isLikelyImportantFile(entryPath)) {
                        result.files.push(relativePath);
                    }
                    continue;
                }
                
                // Check if file is likely important
                if (isLikelyImportantFile(entryPath)) {
                    result.files.push(relativePath);
                    
                    // Read content of important files
                    try {
                        const ext = path.extname(fileName).toLowerCase();
                        
                        // Only read text files
                        if (['.md', '.txt', '.json', '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.h', 
                              '.go', '.rb', '.php', '.cs', '.html', '.css', '.yml', '.yaml', '.toml', 
                              '.ini', '.cfg'].includes(ext) ||
                            fileName.toLowerCase() === 'dockerfile' || 
                            fileName.toLowerCase() === 'makefile' ||
                            fileName.toLowerCase() === 'license') {
                            
                            // For large files, only read the first portion
                            const stats = fs.statSync(entryPath);
                            const maxFileSize = 50 * 1024; // 50KB (increased from 10KB)
                            
                            if (stats.size > maxFileSize) {
                                const buffer = Buffer.alloc(maxFileSize);
                                const fd = fs.openSync(entryPath, 'r');
                                fs.readSync(fd, buffer, 0, maxFileSize, 0);
                                fs.closeSync(fd);
                                result.fileContents[relativePath] = buffer.toString('utf8') + '\n... [file truncated due to size]';
                            } else {
                                result.fileContents[relativePath] = fs.readFileSync(entryPath, 'utf8');
                            }
                        }
                    } catch (error) {
                        console.error(`Error reading file ${entryPath}:`, error);
                    }
                } else if (sourceExtensions.includes(path.extname(fileName).toLowerCase())) {
                    // Also include source code files even if they're not in the "important" list
                    result.files.push(relativePath);
                    
                    // Read content of source code files
                    try {
                        const stats = fs.statSync(entryPath);
                        const maxFileSize = 30 * 1024; // 30KB for source files
                        
                        if (stats.size > maxFileSize) {
                            const buffer = Buffer.alloc(maxFileSize);
                            const fd = fs.openSync(entryPath, 'r');
                            fs.readSync(fd, buffer, 0, maxFileSize, 0);
                            fs.closeSync(fd);
                            result.fileContents[relativePath] = buffer.toString('utf8') + '\n... [file truncated due to size]';
                        } else {
                            result.fileContents[relativePath] = fs.readFileSync(entryPath, 'utf8');
                        }
                    } catch (error) {
                        console.error(`Error reading file ${entryPath}:`, error);
                    }
                }
            }
        }
    } catch (error) {
        console.error(`Error scanning directory ${rootPath}:`, error);
    }
}

/**
 * Calculates the maximum number of files to collect based on project type
 * @param {string} projectType - The type of project
 * @returns {number} - Maximum number of files to collect
 */
function calculateMaxFiles(projectType) {
    // Base number of files to collect
    const baseMax = 50;
    
    // Adjust based on project type
    switch (projectType) {
        case 'node':
            return baseMax + 20; // Node.js projects often have many small files
            
        case 'python':
            return baseMax + 10; // Python projects typically have fewer, larger files
            
        case 'java':
            return baseMax + 15; // Java projects have a moderate number of files
            
        case 'rust':
            return baseMax + 5; // Rust projects typically have fewer files
            
        case 'go':
            return baseMax + 10; // Go projects have a moderate number of files
            
        default:
            return baseMax;
    }
}

/**
 * Generates a README using Ollama
 * @param {Object} workspaceData - Data from the workspace scan
 * @param {string} userContext - Additional context provided by the user
 * @param {string} ollamaEndpoint - Endpoint for Ollama API
 * @param {string} ollamaModel - Model to use for generation
 * @returns {Promise<string>} - Generated README content
 */
async function generateReadmeWithOllama(workspaceData, userContext, ollamaEndpoint = 'http://localhost:11434', ollamaModel = 'llama3') {
    try {
        // Prepare the prompt for Ollama
        const filesList = workspaceData.files.join('\n');
        const dirsList = workspaceData.directories.join('\n');
        
        // Get important file contents
        const packageJsonContent = workspaceData.fileContents['package.json'] || '';
        const existingReadmeContent = workspaceData.fileContents['README.md'] || '';
        
        // Prepare important file contents to include in the prompt
        let importantFileContents = '';
        
        // Add package.json content
        if (packageJsonContent) {
            importantFileContents += `package.json content:\n${JSON.stringify(packageJsonContent, null, 2)}\n\n`;
        }
        
        // Add existing README content for reference
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
        
        // Add source code samples (limit to a few key files)
        const sourceCodeSamples = getSourceCodeSamples(workspaceData);
        if (sourceCodeSamples) {
            importantFileContents += sourceCodeSamples;
        }
        
        // Create a prompt for Ollama
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

        // Make API call to Ollama
        const response = await axios.post(`${ollamaEndpoint}/api/generate`, {
            model: ollamaModel,
            prompt: prompt,
            stream: false
        });

        return response.data.response;
    } catch (error) {
        console.error('Error generating README with Ollama:', error);
        throw new Error(`Failed to generate README: ${error.message}`);
    }
}

/**
 * Gets a list of important files to include in the prompt based on project type
 * @param {string} projectType - The type of project
 * @param {string[]} languages - The main languages used in the project
 * @returns {string[]} - List of important file names
 */
function getImportantFilesForProjectType(projectType, languages) {
    const commonFiles = ['LICENSE', 'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md'];
    
    switch (projectType) {
        case 'node':
            return [...commonFiles, 'package.json', 'tsconfig.json', 'webpack.config.js', '.npmrc', '.npmignore'];
            
        case 'python':
            return [...commonFiles, 'requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile','app.py','main.py','setup.py'];
            
        case 'java':
            return [...commonFiles, 'pom.xml', 'build.gradle', 'settings.gradle'];
            
        case 'rust':
            return [...commonFiles, 'Cargo.toml'];
            
        case 'go':
            return [...commonFiles, 'go.mod', 'go.sum'];
            
        case 'ruby':
            return [...commonFiles, 'Gemfile', 'Rakefile'];
            
        case 'php':
            return [...commonFiles, 'composer.json', 'composer.lock'];
            
        default:
            return commonFiles;
    }
}

/**
 * Gets source code samples from the workspace data
 * @param {Object} workspaceData - Data from the workspace scan
 * @returns {string} - Source code samples formatted for the prompt
 */
function getSourceCodeSamples(workspaceData) {
    let samples = '';
    const maxSamples = 10; // Increased from 3 to 10 samples
    let sampleCount = 0;
    
    // Get main source files based on project type
    const mainFilePatterns = getMainFilePatterns(workspaceData.projectType, workspaceData.mainLanguages);
    
    // First, prioritize key files based on project type
    const priorityFiles = getPriorityFilesForProjectType(workspaceData.projectType, workspaceData.mainLanguages);
    
    // Add priority files first
    for (const priorityPattern of priorityFiles) {
        if (sampleCount >= maxSamples) break;
        
        for (const filePath of Object.keys(workspaceData.fileContents)) {
            if (sampleCount >= maxSamples) break;
            
            const fileName = filePath.split('/').pop().toLowerCase();
            if (priorityPattern.test(fileName)) {
                samples += `Source code (${filePath}):\n\`\`\`\n${workspaceData.fileContents[filePath]}\n\`\`\`\n\n`;
                sampleCount++;
            }
        }
    }
    
    // Then add files matching the main patterns
    for (const pattern of mainFilePatterns) {
        if (sampleCount >= maxSamples) break;
        
        for (const filePath of Object.keys(workspaceData.fileContents)) {
            if (sampleCount >= maxSamples) break;
            
            // Skip files we've already included
            if (samples.includes(`Source code (${filePath}):`)) continue;
            
            if (filePath.match(pattern)) {
                samples += `Source code (${filePath}):\n\`\`\`\n${workspaceData.fileContents[filePath]}\n\`\`\`\n\n`;
                sampleCount++;
            }
        }
    }
    
    // If we still have room, add some additional source files
    if (sampleCount < maxSamples) {
        // Get source file extensions based on project type
        const sourceExtensions = getSourceFileExtensions(workspaceData.projectType, workspaceData.mainLanguages);
        
        for (const filePath of Object.keys(workspaceData.fileContents)) {
            if (sampleCount >= maxSamples) break;
            
            // Skip files we've already included
            if (samples.includes(`Source code (${filePath}):`)) continue;
            
            const ext = path.extname(filePath).toLowerCase();
            if (sourceExtensions.includes(ext)) {
                samples += `Source code (${filePath}):\n\`\`\`\n${workspaceData.fileContents[filePath]}\n\`\`\`\n\n`;
                sampleCount++;
            }
        }
    }
    
    return samples;
}

/**
 * Gets priority files for a specific project type
 * @param {string} projectType - The type of project
 * @param {string[]} languages - The main languages used in the project
 * @returns {RegExp[]} - List of patterns for priority files
 */
function getPriorityFilesForProjectType(projectType, languages) {
    const patterns = [];
    
    switch (projectType) {
        case 'node':
            patterns.push(/^index\.(js|ts)$/i, /^main\.(js|ts)$/i, /^app\.(js|ts)$/i);
            if (languages.includes('react')) {
                patterns.push(/^app\.(jsx|tsx)$/i, /^index\.(jsx|tsx)$/i);
            }
            break;
            
        case 'python':
            patterns.push(/^main\.py$/i, /^app\.py$/i, /^__init__\.py$/i);
            break;
            
        case 'java':
            patterns.push(/^main\.java$/i, /^application\.java$/i);
            break;
            
        case 'rust':
            patterns.push(/^main\.rs$/i, /^lib\.rs$/i);
            break;
            
        case 'go':
            patterns.push(/^main\.go$/i);
            break;
            
        case 'ruby':
            patterns.push(/^main\.rb$/i, /^application\.rb$/i);
            break;
            
        case 'php':
            patterns.push(/^index\.php$/i);
            break;
    }
    
    return patterns;
}

/**
 * Gets source file extensions for a specific project type
 * @param {string} projectType - The type of project
 * @param {string[]} languages - The main languages used in the project
 * @returns {string[]} - List of source file extensions
 */
function getSourceFileExtensions(projectType, languages) {
    switch (projectType) {
        case 'node':
            const jsExts = ['.js', '.jsx', '.ts', '.tsx'];
            if (languages.includes('react')) {
                return ['.jsx', '.tsx', '.js', '.ts'];
            }
            return jsExts;
            
        case 'python':
            return ['.py'];
            
        case 'java':
            return ['.java'];
            
        case 'rust':
            return ['.rs'];
            
        case 'go':
            return ['.go'];
            
        case 'ruby':
            return ['.rb'];
            
        case 'php':
            return ['.php'];
            
        default:
            return ['.js', '.py', '.java', '.c', '.cpp', '.h', '.go', '.rb', '.php', '.cs'];
    }
}

/**
 * Gets patterns for main source files based on project type
 * @param {string} projectType - The type of project
 * @param {string[]} languages - The main languages used in the project
 * @returns {RegExp[]} - List of patterns for main source files
 */
function getMainFilePatterns(projectType, languages) {
    const patterns = [];
    
    switch (projectType) {
        case 'node':
            patterns.push(/index\.(js|ts)$/i, /main\.(js|ts)$/i, /app\.(js|ts)$/i);
            if (languages.includes('react')) {
                patterns.push(/App\.(js|tsx)$/i, /index\.(js|tsx)$/i);
            }
            break;
            
        case 'python':
            patterns.push(/main\.py$/i, /__init__\.py$/i, /app\.py$/i);
            break;
            
        case 'java':
            patterns.push(/Main\.java$/i, /Application\.java$/i);
            break;
            
        case 'rust':
            patterns.push(/main\.rs$/i, /lib\.rs$/i);
            break;
            
        case 'go':
            patterns.push(/main\.go$/i);
            break;
            
        case 'ruby':
            patterns.push(/main\.rb$/i, /application\.rb$/i);
            break;
            
        case 'php':
            patterns.push(/index\.php$/i);
            break;
    }
    
    // Add generic patterns for any project type
    patterns.push(/README\.md$/i, /CONTRIBUTING\.md$/i);
    
    return patterns;
}

module.exports = {
    scanWorkspace,
    generateReadmeWithOllama,
    getImportantFilesForProjectType,
    getSourceCodeSamples,
    getMainFilePatterns,
    getPriorityFilesForProjectType,
    getSourceFileExtensions,
    calculateMaxFiles,
    isLikelyImportantFile,
    isLikelyImportantDirectory
}; 