const assert = require('assert');
const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const { scanWorkspace } = require('../utils');

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// const myExtension = require('../extension');

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Starting all tests.');

	test('Utils - scanWorkspace should return files and directories', async () => {
		// Create a temporary test directory
		const tempDir = path.join(__dirname, 'temp-test-dir');
		if (!fs.existsSync(tempDir)) {
			fs.mkdirSync(tempDir);
		}
		
		// Create some test files
		fs.writeFileSync(path.join(tempDir, 'test-file.js'), 'console.log("test");');
		
		// Create a subdirectory
		const subDir = path.join(tempDir, 'subdir');
		if (!fs.existsSync(subDir)) {
			fs.mkdirSync(subDir);
		}
		
		// Create a file in the subdirectory
		fs.writeFileSync(path.join(subDir, 'subdir-file.js'), 'console.log("subdir test");');
		
		// Run the scanWorkspace function
		const result = await scanWorkspace(tempDir);
		
		// Clean up
		fs.unlinkSync(path.join(tempDir, 'test-file.js'));
		fs.unlinkSync(path.join(subDir, 'subdir-file.js'));
		fs.rmdirSync(subDir);
		fs.rmdirSync(tempDir);
		
		// Assertions
		assert.strictEqual(Array.isArray(result.files), true, 'files should be an array');
		assert.strictEqual(Array.isArray(result.directories), true, 'directories should be an array');
		assert.strictEqual(typeof result.fileContents, 'object', 'fileContents should be an object');
		
		assert.strictEqual(result.files.includes('test-file.js'), true, 'should include test-file.js');
		assert.strictEqual(result.directories.includes('subdir'), true, 'should include subdir directory');
		assert.strictEqual(result.files.includes(path.join('subdir', 'subdir-file.js')), true, 'should include subdir/subdir-file.js');
		
		assert.strictEqual(typeof result.fileContents['test-file.js'], 'string', 'should have content for test-file.js');
		assert.strictEqual(result.fileContents['test-file.js'], 'console.log("test");', 'content should match');
	});

	test('Extension should be present', () => {
		assert.ok(vscode.extensions.getExtension('auto-readme-ai'));
	});

	test('Extension should activate', function() {
		this.timeout(10000);
		return vscode.extensions.getExtension('auto-readme-ai').activate().then(() => {
			assert.ok(true);
		});
	});

	test('Command should be registered', async () => {
		const commands = await vscode.commands.getCommands();
		assert.ok(commands.includes('auto-readme-ai.generate_readme'));
	});
});
