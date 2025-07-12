import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
const server = new McpServer({
    name: "hello-server",
    version: "1.0.0"
});
server.registerTool("hello", {
    title: "Hello Tool",
    description: "Prints hello"
    // inputSchema removed for no-parameter tool
}, async () => ({
    content: [{ type: "text", text: "hello" }]
}));
const transport = new StdioServerTransport();
await server.connect(transport);
