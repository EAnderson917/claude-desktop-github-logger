# Claude Desktop GitHub Chat Logger - Complete Implementation Guide

## Overview

This guide helps you create an integration that automatically logs Claude Desktop conversations to GitHub via n8n, with the ability to retrieve chat history in new sessions.

## Prerequisites

- **Node.js 18+** installed
- **Claude Desktop** (latest version)
- **n8n instance** (cloud or self-hosted)
- **GitHub account** with a repository for storing transcripts
- **Basic terminal/command line knowledge**

## Part 1: n8n Workflow Setup

### 1.1 Create GitHub Repository

1. Create a new GitHub repository (e.g., `chat-transcripts`)
2. Can be **private** (recommended) or public
3. Initialize with a README

### 1.2 Set up GitHub Credentials in n8n

1. In n8n, go to **Settings** → **Credentials**
2. Add **GitHub API** credentials
3. Generate a GitHub Personal Access Token:
   - Go to GitHub → Settings → Developer settings → Personal access tokens
   - Create token with `repo` scope (full control of repositories)
   - Copy the token and save in n8n credentials

### 1.3 Set up Environment Variable in n8n

1. In n8n, go to **Settings** → **Variables**
2. Create a new variable:
   - **Name**: `GITHUB_REPO`
   - **Value**: `your-username/your-repo-name` (e.g., `johndoe/chat-transcripts`)

### 1.4 Import n8n Workflow

1. **Create a new workflow** in n8n
2. **Import the workflow JSON** provided in the deployment package
3. **Update the GitHub credentials** in all GitHub API nodes:
   - Click on each HTTP Request node that connects to GitHub
   - Select your GitHub API credentials from the dropdown
4. **Activate the workflow** (toggle switch)
5. **Copy the webhook URL** from the Webhook node (Production URL)

**Note**: The workflow uses environment variables for security. After import, ensure the `GITHUB_REPO` variable is set correctly.

### 1.4 Activate Workflow

1. Ensure all nodes are connected properly
2. Test the workflow with sample data
3. **Activate** the workflow (toggle switch)
4. **Copy the webhook URL** (Production URL from Webhook node)

## Part 2: MCP Server Setup

### 2.1 Create Project Structure

```bash
mkdir claude-github-logger
cd claude-github-logger
mkdir src
```

### 2.2 Create Configuration Files

**package.json:**
```json
{
  "name": "claude-github-logger-mcp",
  "version": "1.0.0",
  "description": "MCP server for logging Claude conversations to GitHub via n8n",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "claude-github-logger": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "node-fetch": "^3.3.2"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  },
  "keywords": ["mcp", "claude", "github", "logging", "n8n"],
  "author": "Your Name",
  "license": "MIT"
}
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": false,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 2.3 Create Main Server Code

**src/index.ts:** (This is a complex 400+ line TypeScript file)

Key components include:
- GitHub API authentication
- Webhook communication with n8n
- Chat history retrieval from GitHub
- Configuration management
- Tool definitions for Claude Desktop

*Contact the original implementer for the complete source code, as it contains sensitive implementation details.*

### 2.4 Install Dependencies and Build

```bash
npm install
npm run build
```

### 2.5 Test the Server

```bash
node dist/index.js
```

Should output: "Claude GitHub Logger MCP Server running on stdio"

## Part 3: Claude Desktop Configuration

### 3.1 Configure MCP Server

Edit your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add to the `mcpServers` section:
```json
{
  "mcpServers": {
    "claude-github-logger": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/your/claude-github-logger/dist/index.js"]
    }
  }
}
```

Replace `/ABSOLUTE/PATH/TO/your/claude-github-logger` with your actual project path.

### 3.2 Restart Claude Desktop

Completely quit and restart Claude Desktop to load the MCP server.

## Part 4: Initial Setup and Configuration

### 4.1 Generate GitHub Personal Access Token

For **private repositories**, create a GitHub Personal Access Token:

1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Create new token with:
   - **Repository access:** Your chat transcript repository
   - **Permissions:** Contents (Read), Metadata (Read)
3. Copy the token (starts with `github_pat_`)

### 4.2 Configure the Logger

In Claude Desktop, run:
```
Please use the claude-github-logger:setup_github_logging tool with these parameters:
- webhook_url: YOUR_N8N_WEBHOOK_URL
- github_repo: YOUR_USERNAME/YOUR_REPO_NAME
- github_token: YOUR_GITHUB_TOKEN
- auto_log: true
- project: initial-setup
```

Replace with your actual values:
- `YOUR_N8N_WEBHOOK_URL`: From step 1.4
- `YOUR_USERNAME/YOUR_REPO_NAME`: Your GitHub repository 
- `YOUR_GITHUB_TOKEN`: From step 4.1 (only needed for private repos)

## Part 5: Usage Guide

### 5.1 Automatic Logging

With `auto_log: true`, conversations are automatically saved to GitHub.

### 5.2 Manual Logging

Log specific conversations:
```
Please use the claude-github-logger:log_conversation tool with:
- user_message: "Your question here"
- assistant_message: "Claude's response here" 
- project: "project-name"
- tools_used: ["list", "of", "tools"]
```

### 5.3 Retrieving Chat History

In any new conversation:
```
Please use the claude-github-logger:retrieve_chat_history tool to show me my previous conversations.
```

With project filter:
```
Please use the claude-github-logger:retrieve_chat_history tool with project "project-name".
```

### 5.4 Checking Status

```
Please use the claude-github-logger:get_logger_status tool to verify the configuration.
```

## Part 6: File Organization

The system creates files in GitHub with this structure:
```
your-repo/
├── transcripts/
│   ├── latest.md                    # Most recent conversation
│   ├── project-name/
│   │   ├── latest.md                # Latest for this project
│   │   └── 2025/
│   │       └── 2025-09-14/
│   │           └── session-file.md  # Archived conversations
│   └── other-project/
│       ├── latest.md
│       └── 2025/...
```

## Troubleshooting

### MCP Server Not Loading
- Check file paths in Claude Desktop config
- Verify TypeScript compilation succeeded
- Restart Claude Desktop completely

### Webhook Issues
- Test webhook URL directly with curl/Postman
- Check n8n workflow is active
- Verify GitHub credentials in n8n

### Empty Conversation Content
- Ensure field names match between MCP server and n8n workflow
- Check n8n execution logs for errors
- Verify GitHub API authentication

### Retrieval Issues
- Confirm GitHub token has read permissions
- Check repository structure matches expected format
- Test GitHub API access manually

## Security Notes

- Store configuration locally in `~/.claude-github-logger.json`
- GitHub tokens are only used for API access
- Private repositories remain private
- No sensitive data is transmitted unencrypted

## Advanced Features

- **Project-based organization** for different workflows
- **Conversation threading** with session IDs
- **Tool usage tracking** in conversation metadata
- **Automatic archiving** by date
- **Cross-session context** via history retrieval

This integration enables seamless conversation continuity across Claude Desktop sessions while maintaining organized, searchable chat archives in GitHub.
