#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

interface ChatLogEntry {
  timestamp: string;
  session_id: string;
  user_msg: string;
  assistant_msg: string;
  model: string;
  tools_used: string[];
  project?: string;
}

interface LoggerConfig {
  webhook_url: string;
  github_repo: string;
  session_id: string;
  auto_log: boolean;
  project?: string;
  github_token?: string;
}

class ClaudeGitHubLogger {
  private config: LoggerConfig | null = null;
  private configPath: string;
  private chatBuffer: ChatLogEntry[] = [];
  private currentUserMessage = '';
  
  constructor() {
    this.configPath = path.join(os.homedir(), '.claude-github-logger.json');
  }

  async loadConfig(): Promise<LoggerConfig | null> {
    try {
      const data = await fs.readFile(this.configPath, 'utf8');
      this.config = JSON.parse(data);
      return this.config;
    } catch (error) {
      return null;
    }
  }

  async saveConfig(config: LoggerConfig): Promise<void> {
    this.config = config;
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
  }

  async sendToN8N(entry: ChatLogEntry): Promise<any> {
    if (!this.config?.webhook_url) {
      throw new Error('Webhook URL not configured');
    }

    const payload = {
      session_id: entry.session_id,
      model: entry.model,
      tools_used: entry.tools_used,
      user_message: entry.user_msg,
      assistant_message: entry.assistant_msg,
      project: entry.project || this.config.project || ''
    };

    const response = await fetch(this.config.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  private getGitHubHeaders(): any {
    const headers: any = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'Claude-GitHub-Logger/1.0'
    };
    
    if (this.config?.github_token) {
      headers['Authorization'] = `token ${this.config.github_token}`;
    }
    
    return headers;
  }

  async retrieveTranscripts(project?: string): Promise<string[]> {
    if (!this.config?.github_repo) {
      throw new Error('GitHub repo not configured');
    }

    const transcripts: string[] = [];
    const headers = this.getGitHubHeaders();

    try {
      // Always get the main latest.md file
      const latestUrl = `https://api.github.com/repos/${this.config.github_repo}/contents/transcripts/latest.md`;
      try {
        const latestResponse = await fetch(latestUrl, { headers });
        if (latestResponse.ok) {
          const latestData = await latestResponse.json() as any;
          if (latestData.download_url) {
            const content = await fetch(latestData.download_url, { headers });
            if (content.ok) {
              transcripts.push(await content.text());
            }
          }
        }
      } catch (error) {
        console.error('Error fetching latest.md:', error);
      }

      // If project specified, get project-specific files
      if (project) {
        const projectLatestUrl = `https://api.github.com/repos/${this.config.github_repo}/contents/transcripts/${project}/latest.md`;
        try {
          const projectResponse = await fetch(projectLatestUrl, { headers });
          if (projectResponse.ok) {
            const projectData = await projectResponse.json() as any;
            if (projectData.download_url) {
              const content = await fetch(projectData.download_url, { headers });
              if (content.ok) {
                transcripts.push(await content.text());
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching ${project}/latest.md:`, error);
        }

        // Try to get archived files from project folder
        const projectFolderUrl = `https://api.github.com/repos/${this.config.github_repo}/contents/transcripts/${project}`;
        try {
          const folderResponse = await fetch(projectFolderUrl, { headers });
          if (folderResponse.ok) {
            const folderContents = await folderResponse.json() as any[];
            
            // Look for year folders (like "2025")
            for (const item of folderContents) {
              if (item.type === 'dir' && /^\d{4}$/.test(item.name)) {
                await this.getTranscriptsFromYearFolder(item.url, transcripts, headers);
              }
            }
          }
        } catch (error) {
          console.error(`Error browsing ${project} folder:`, error);
        }
      }

      return transcripts;

    } catch (error) {
      console.error('Error retrieving transcripts:', error);
      return [];
    }
  }

  private async getTranscriptsFromYearFolder(yearFolderUrl: string, transcripts: string[], headers: any): Promise<void> {
    try {
      const yearResponse = await fetch(yearFolderUrl, { headers });
      if (!yearResponse.ok) return;

      const yearContents = await yearResponse.json() as any[];
      
      // Look for date folders (like "2025-09-13")
      for (const dateItem of yearContents) {
        if (dateItem.type === 'dir') {
          const dateResponse = await fetch(dateItem.url, { headers });
          if (dateResponse.ok) {
            const dateContents = await dateResponse.json() as any[];
            
            // Get .md files from date folder
            for (const file of dateContents) {
              if (file.name.endsWith('.md') && file.download_url) {
                const content = await fetch(file.download_url, { headers });
                if (content.ok) {
                  transcripts.push(await content.text());
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error getting transcripts from year folder:', error);
    }
  }

  generateSessionId(): string {
    return `claude-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

const logger = new ClaudeGitHubLogger();
const server = new Server(
  {
    name: "claude-github-logger",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
const tools: Tool[] = [
  {
    name: "setup_github_logging",
    description: "Configure the GitHub logging integration with your n8n webhook",
    inputSchema: {
      type: "object",
      properties: {
        webhook_url: {
          type: "string",
          description: "Your n8n webhook URL for chat logging"
        },
        github_repo: {
          type: "string", 
          description: "GitHub repository in format 'owner/repo' (e.g., 'john/chat-transcripts')"
        },
        github_token: {
          type: "string",
          description: "GitHub Personal Access Token for private repository access"
        },
        project: {
          type: "string",
          description: "Optional project name for organizing transcripts"
        },
        auto_log: {
          type: "boolean",
          description: "Enable automatic logging of all conversations",
          default: true
        }
      },
      required: ["webhook_url", "github_repo", "github_token"]
    }
  },
  {
    name: "log_conversation",
    description: "Manually log the current conversation to GitHub via n8n",
    inputSchema: {
      type: "object",
      properties: {
        user_message: {
          type: "string",
          description: "The user's message in this conversation"
        },
        assistant_message: {
          type: "string", 
          description: "The assistant's response message"
        },
        tools_used: {
          type: "array",
          items: { type: "string" },
          description: "List of tools used in this conversation",
          default: []
        },
        project: {
          type: "string",
          description: "Optional project override for this specific log"
        }
      },
      required: ["user_message", "assistant_message"]
    }
  },
  {
    name: "retrieve_chat_history",
    description: "Retrieve previous chat transcripts from GitHub",
    inputSchema: {
      type: "object",
      properties: {
        project: {
          type: "string",
          description: "Optional project name to filter transcripts"
        },
        limit: {
          type: "number",
          description: "Maximum number of transcripts to retrieve",
          default: 10
        }
      }
    }
  },
  {
    name: "get_logger_status",
    description: "Check the current configuration and status of GitHub logging",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "update_session_context",
    description: "Update the current session with user message for auto-logging",
    inputSchema: {
      type: "object",
      properties: {
        user_message: {
          type: "string",
          description: "The current user message to prepare for logging"
        }
      },
      required: ["user_message"]
    }
  }
];

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "setup_github_logging": {
        if (!args) {
          throw new Error('No arguments provided');
        }
        
        const config: LoggerConfig = {
          webhook_url: args.webhook_url as string,
          github_repo: args.github_repo as string,
          github_token: args.github_token as string,
          session_id: logger.generateSessionId(),
          auto_log: args.auto_log !== false,
          project: args.project as string | undefined
        };

        await logger.saveConfig(config);

        return {
          content: [{
            type: "text",
            text: `GitHub logging configured successfully!\n\n` +
                  `- Webhook: ${config.webhook_url}\n` +
                  `- Repository: ${config.github_repo}\n` +
                  `- GitHub Token: ${config.github_token ? 'Configured (hidden for security)' : 'Not provided'}\n` +
                  `- Session ID: ${config.session_id}\n` +
                  `- Auto-logging: ${config.auto_log ? 'Enabled' : 'Disabled'}\n` +
                  `- Project: ${config.project || 'None'}\n\n` +
                  `Your conversations will now be logged to GitHub via n8n with authenticated access.`
          }]
        };
      }

      case "log_conversation": {
        if (!args) {
          throw new Error('No arguments provided');
        }
        
        await logger.loadConfig();
        if (!logger['config']) {
          throw new Error('GitHub logging not configured. Run setup_github_logging first.');
        }

        const entry: ChatLogEntry = {
          timestamp: new Date().toISOString(),
          session_id: logger['config'].session_id,
          user_msg: args.user_message as string,
          assistant_msg: args.assistant_message as string,
          model: 'claude-sonnet-4',
          tools_used: (args.tools_used as string[]) || [],
          project: (args.project as string) || logger['config'].project
        };

        const result = await logger.sendToN8N(entry);

        return {
          content: [{
            type: "text",
            text: `Conversation logged successfully!\n\n` +
                  `- Session: ${entry.session_id}\n` +
                  `- Tools used: ${entry.tools_used.join(', ') || 'none'}\n` +
                  `- Project: ${entry.project || 'default'}\n\n` +
                  `GitHub URLs:\n` +
                  `- Latest: ${result.latest_url || 'N/A'}\n` +
                  `- Dated: ${result.dated_url || 'N/A'}\n` +
                  `- Project Latest: ${result.project_latest_url || 'N/A'}`
          }]
        };
      }

      case "retrieve_chat_history": {
        await logger.loadConfig();
        if (!logger['config']) {
          throw new Error('GitHub logging not configured. Run setup_github_logging first.');
        }

        const transcripts = await logger.retrieveTranscripts(args?.project as string);
        const limit = (args?.limit as number) || 10;
        const limited = transcripts.slice(0, limit);

        if (limited.length === 0) {
          return {
            content: [{
              type: "text", 
              text: "No chat transcripts found in the repository."
            }]
          };
        }

        const summary = limited.map((transcript, idx) => {
          const lines = transcript.split('\n');
          const firstLine = lines.find(line => line.startsWith('##')) || 'Unknown session';
          return `**Transcript ${idx + 1}:**\n${transcript}\n\n---\n`;
        }).join('\n');

        return {
          content: [{
            type: "text",
            text: `Found ${transcripts.length} transcripts (showing ${limited.length}):\n\n${summary}`
          }]
        };
      }

      case "get_logger_status": {
        const config = await logger.loadConfig();
        
        if (!config) {
          return {
            content: [{
              type: "text",
              text: "GitHub logging is not configured. Run 'setup_github_logging' to get started."
            }]
          };
        }

        return {
          content: [{
            type: "text",
            text: `GitHub Logger Status:\n\n` +
                  `✅ Configured: Yes\n` +
                  `🔗 Webhook: ${config.webhook_url}\n` +
                  `📁 Repository: ${config.github_repo}\n` +
                  `🔐 GitHub Token: ${config.github_token ? 'Configured' : 'Missing'}\n` +
                  `🆔 Session: ${config.session_id}\n` +
                  `🤖 Auto-logging: ${config.auto_log ? 'Enabled' : 'Disabled'}\n` +
                  `📂 Project: ${config.project || 'None'}\n\n` +
                  `Ready to log conversations to GitHub with authenticated access!`
          }]
        };
      }

      case "update_session_context": {
        if (!args) {
          throw new Error('No arguments provided');
        }
        
        // Store user message for potential auto-logging
        logger['currentUserMessage'] = args.user_message as string;
        
        return {
          content: [{
            type: "text",
            text: "Session context updated. User message prepared for logging."
          }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Claude GitHub Logger MCP Server running on stdio");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
