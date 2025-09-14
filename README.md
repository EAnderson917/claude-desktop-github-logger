# Claude Desktop GitHub Logger

Automatically log Claude Desktop conversations to GitHub via n8n with full chat history retrieval across sessions.

## Features

- 🤖 **Auto-logging** - Conversations automatically saved to GitHub
- 📚 **Chat history retrieval** - Access previous conversations in new sessions  
- 🔐 **Private repository support** - Works with private GitHub repos
- 📂 **Project organization** - Organize conversations by project folders
- 🔄 **Cross-session continuity** - Maintain context across Claude Desktop sessions

## Quick Start

1. **Set up n8n workflow** - Import `n8n/workflow.json`
2. **Deploy MCP server** - Follow `docs/IMPLEMENTATION_GUIDE.md`
3. **Configure Claude Desktop** - Add MCP server to config
4. **Initialize integration** - Run setup command in Claude

## File Structure

- `docs/IMPLEMENTATION_GUIDE.md` - Complete setup instructions
- `n8n/workflow.json` - n8n workflow for GitHub integration
- `mcp-server/` - Model Context Protocol server source code
- `examples/` - Testing and utility scripts

## Requirements

- Node.js 18+
- Claude Desktop (latest)
- n8n instance (cloud or self-hosted)
- GitHub repository for storing transcripts

## Documentation

See [IMPLEMENTATION_GUIDE.md](docs/IMPLEMENTATION_GUIDE.md) for complete setup instructions.

## Usage

After setup, use these commands in Claude Desktop:

### Retrieve chat history
*Please use the claude-github-logger:retrieve_chat_history tool to show my previous conversations.*

### Manual logging
*Please use the claude-github-logger:log_conversation tool to log this conversation.*

### Check status
*Please use the claude-github-logger:get_logger_status tool.*

### Advanced usage

**Filter by project:**
*Please use the claude-github-logger:retrieve_chat_history tool with project "project-name" to show conversations from a specific project.*

**Log with specific project:**
*Please use the claude-github-logger:log_conversation tool with project "project-name" to organize this conversation.*

## Security

- All credentials stored locally or in n8n
- GitHub tokens only used for API access
- Private repositories remain private
- No sensitive data transmitted unencrypted

## License

MIT License - see LICENSE file for details.

## Contributing

Issues and pull requests welcome! Please read the implementation guide to understand the architecture.
