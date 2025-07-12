# Simple MCP Hello Tool

This project demonstrates a minimal Model Context Protocol (MCP) tool using the official TypeScript SDK. The tool simply prints "hello" when invoked.

## Prerequisites
- Node.js v18 or higher
- npm

## Setup Steps

1. **Clone this repository** (if you haven't already):
   ```bash
   git clone <your-repo-url>
   cd <your-repo-directory>
   ```

2. **Install dependencies:**
   ```bash
   npm install @modelcontextprotocol/sdk typescript tsx zod --save
   ```

3. **Configure TypeScript:**
   Ensure your `tsconfig.json` includes at least:
   ```json
   {
     "compilerOptions": {
       "module": "es2022",
       "target": "es2022",
       "outDir": "dist",
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true
     },
     "include": ["index.ts"]
   }
   ```

4. **Project files:**
   - `index.ts` (your MCP tool server)
   - `.gitignore` (should include `node_modules/`)

5. **Build the project:**
   ```bash
   npx tsc
   ```
   The compiled files will be in the `dist/` directory.

6. **Run the tool (development):**
   ```bash
   npx tsx index.ts
   ```
   Or, to run the built version:
   ```bash
   node dist/index.js
   ```

## Example MCP Tool Code

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "hello-server",
  version: "1.0.0"
});

server.registerTool(
  "hello",
  {
    title: "Hello Tool",
    description: "Prints hello",
    inputSchema: z.object({}),
  },
  async () => ({
    content: [{ type: "text", text: "hello" }]
  })
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

## How to Add This Tool to Cursor MCP

1. **Start your MCP server:**
   - In your project directory, run:
     ```bash
     npx tsx index.ts
     ```
     or (if built):
     ```bash
     node dist/index.js
     ```

2. **Open Cursor and go to the MCP integration panel.**

3. **Add a new MCP server connection:**
   - Click “Add MCP Server” (or similar).
   - For the connection type, select **Stdio** (if supported) or **Streamable HTTP** if you’ve implemented HTTP transport.
   - For Stdio, provide the command to start your server:
     - Example: `npx tsx index.ts` (or `node dist/index.js`)
   - For HTTP, provide the URL if your server exposes an HTTP endpoint (not included in this minimal example).

4. **Save and connect.**
   - Cursor should now detect your “hello” tool and allow you to invoke it from the MCP tool palette.

> **Tip:** If you want to expose your tool over HTTP, see the SDK documentation for `StreamableHTTPServerTransport` and add an HTTP endpoint to your server.

## Example: .cursor/mcp.json Configuration

To launch this tool directly from Cursor, add the following entry to your `.cursor/mcp.json` file (usually in your home directory or project root):

```json
{
  "mcpServers": {
    "hello-tool": {
      "command": "npx",
      "args": [
        "tsx",
        "C:\\Users\\Admin\\Desktop\\Dev\\ScancodeMCP\\index.ts"
      ],
      "env": {
        "NODE_NO_WARNINGS": "1"
      },
      "disabled": false,
      "autoApprove": []
    }
    // ... other servers ...
  }
}
```

- Adjust the path in `args` if your project is in a different location.
- After saving, reload MCP servers in Cursor. Your "hello-tool" will be available in the MCP tool palette.

## License
MIT 
