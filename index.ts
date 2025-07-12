import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = new McpServer({
  name: "scancode-license-server",
  version: "1.0.0"
});

server.registerTool(
  "mcp_scancode_license_analysis",
  {
    title: "Scancode License Analysis Tool",
    description: "Provides tools for Scancode license analysis."
  },
  async () => ({
    content: [{ type: "text", text: "This is the Scancode License Analysis tool. Use sub-commands to access license data." }]
  })
);

let licenseData: any = {};

async function loadLicenseData() {
  try {
    const dataPath = path.join(__dirname, 'license_analysis_detailed.json');
    const data = await fs.readFile(dataPath, 'utf8');
    licenseData = JSON.parse(data);
    console.log('License data loaded successfully.');
  } catch (error) {
    console.error('Failed to load license data:', error);
  }
}

// Load data when the server starts
loadLicenseData();

server.registerTool(
  "mcp_scancode_listProblematicLicenseCategories",
  {
    title: "List Problematic License Categories",
    description: "Lists all categories of problematic licenses (e.g., copyleft, gpl, unknown).",
  },
  async () => {
    if (!licenseData || !licenseData.problematic_licenses) {
      return { content: [{ type: "text", text: "License data not loaded or no problematic licenses found." }] };
    }
    const categories = Object.keys(licenseData.problematic_licenses);
    return { content: [{ type: "text", text: `Categories: ${categories.join(', ')}` }] };
  }
);

server.registerTool(
  "mcp_scancode_listProblematicLicensesInCategories",
  {
    title: "List Problematic Licenses in Category",
    description: "Lists all problematic licenses within a given category.",
    inputSchema: {
      category: z.string().describe("The category of problematic licenses (e.g., 'gpl', 'unknown').")
    },
  },
  async ({ category }) => {
    if (!licenseData || !licenseData.problematic_licenses || !licenseData.problematic_licenses[category]) {
      return { content: [{ type: "text", text: `Category \'${category}\' not found or no problematic licenses.` }] };
    }
    const licenses = licenseData.problematic_licenses[category].map((item: any) => `${item.name} (score: ${item.score})`);
    return { content: [{ type: "text", text: `Licenses in ${category}: ${licenses.join('; ')}` }] };
  }
);

server.registerTool(
  "mcp_scancode_getFilesByLicense",
  {
    title: "Get Files by License Name",
    description: "Given a license name, lists all files associated with that license in the problematic_licenses section.",
    inputSchema: {
      licenseName: z.string().describe("The full name of the license to search for.")
    },
  },
  async ({ licenseName }) => {
    if (!licenseData || !licenseData.problematic_licenses) {
      return { content: [{ type: "text", text: "License data not loaded or no problematic licenses found." }] };
    }
    const files: string[] = [];
    for (const category in licenseData.problematic_licenses) {
      for (const item of licenseData.problematic_licenses[category]) {
        if (item.name.toLowerCase().includes(licenseName.toLowerCase())) {
          files.push(item.file);
        }
      }
    }
    if (files.length === 0) {
      return { content: [{ type: "text", text: `No files found for license: ${licenseName}` }] };
    }
    return { content: [{ type: "text", text: `Files for ${licenseName}: ${files.join('; ')}` }] };
  }
);

server.registerTool(
  "mcp_scancode_checkFileForProblematicLicenses",
  {
    title: "Check File for Problematic Licenses",
    description: "Given a file path, lists any problematic licenses found in that specific file.",
    inputSchema: {
      filePath: z.string().describe("The path of the file to check.")
    },
  },
  async ({ filePath }) => {
    if (!licenseData || !licenseData.problematic_licenses) {
      return { content: [{ type: "text", text: "License data not loaded or no problematic licenses found." }] };
    }
    const foundLicenses: string[] = [];
    for (const category in licenseData.problematic_licenses) {
      for (const item of licenseData.problematic_licenses[category]) {
        if (item.file.toLowerCase().includes(filePath.toLowerCase())) {
          foundLicenses.push(`${item.name} (score: ${item.score})`);
        }
      }
    }
    if (foundLicenses.length === 0) {
      return { content: [{ type: "text", text: `No problematic licenses found for file: ${filePath}` }] };
    }
    return { content: [{ type: "text", text: `Problematic licenses in ${filePath}: ${foundLicenses.join('; ')}` }] };
  }
);

server.registerTool(
  "mcp_scancode_getScanIssues",
  {
    title: "Get Scan Issues",
    description: "Lists all files that had scan issues and the details of the issue.",
  },
  async () => {
    if (!licenseData || !licenseData.scan_issues || licenseData.scan_issues.length === 0) {
      return { content: [{ type: "text", text: "No scan issues found." }] };
    }
    const issues = licenseData.scan_issues.map((issue: any) => `File: ${issue.file}, Type: ${issue.type}, Details: ${issue.details.join(' ')}`);
    return { content: [{ type: "text", text: `Scan Issues: ${issues.join('; ')}` }] };
  }
);

server.registerTool(
  "mcp_scancode_getLicenseRecommendations",
  {
    title: "Get License Recommendations",
    description: "Provides the overall recommendations from the license scan.",
  },
  async () => {
    if (!licenseData || !licenseData.recommendations || licenseData.recommendations.length === 0) {
      return { content: [{ type: "text", text: "No license recommendations found." }] };
    }
    const recommendations = licenseData.recommendations.map((rec: any) => `Severity: ${rec.severity}, Category: ${rec.category}, Message: ${rec.message}, Affected Files: ${rec.affected_files}`);
    return { content: [{ type: "text", text: `Recommendations: ${recommendations.join('; ')}` }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport); 
