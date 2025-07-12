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
  "mcp_ScancodeMCP_analyze_licenses",
  {
    title: "Scancode License Analysis Tool",
    description: "Provides tools for Scancode license analysis. Use sub-commands to access license data.",
    inputSchema: { random_string: z.string().describe("Dummy parameter for no-parameter tools") },
  },
  async ({ random_string }) => ({
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
  "mcp_ScancodeMCP_list_categories",
  {
    title: "List Problematic License Categories",
    description: "Lists all categories of problematic licenses (e.g., copyleft, gpl, unknown).",
    inputSchema: { random_string: z.string().describe("Dummy parameter for no-parameter tools") },
  },
  async ({ random_string }) => {
    if (!licenseData || !licenseData.problematic_licenses) {
      return { content: [{ type: "text", text: "License data not loaded or no problematic licenses found." }] };
    }
    const categories = Object.keys(licenseData.problematic_licenses);
    return { content: [{ type: "text", text: `Categories: ${categories.join(', ')}` }] };
  }
);

server.registerTool(
  "mcp_ScancodeMCP_list_licenses_in_category",
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
  "mcp_ScancodeMCP_get_files_by_license",
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
  "mcp_ScancodeMCP_check_file_licenses",
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
  "mcp_ScancodeMCP_list_scan_issues",
  {
    title: "Get Scan Issues",
    description: "Lists all files that had scan issues and the details of the issue.",
    inputSchema: { random_string: z.string().describe("Dummy parameter for no-parameter tools") },
  },
  async ({ random_string }) => {
    if (!licenseData || !licenseData.scan_issues || licenseData.scan_issues.length === 0) {
      return { content: [{ type: "text", text: "No scan issues found." }] };
    }
    const issues = licenseData.scan_issues.map((issue: any) => `File: ${issue.file}, Type: ${issue.type}, Details: ${issue.details.join(' ')}`);
    return { content: [{ type: "text", text: `Scan Issues: ${issues.join('; ')}` }] };
  }
);

server.registerTool(
  "mcp_ScancodeMCP_get_recommendations",
  {
    title: "Get License Recommendations",
    description: "Provides the overall recommendations from the license scan.",
    inputSchema: { random_string: z.string().describe("Dummy parameter for no-parameter tools") },
  },
  async ({ random_string }) => {
    if (!licenseData || !licenseData.recommendations || licenseData.recommendations.length === 0) {
      return { content: [{ type: "text", text: "No license recommendations found." }] };
    }
    const recommendations = licenseData.recommendations.map((rec: any) => `Severity: ${rec.severity}, Category: ${rec.category}, Message: ${rec.message}, Affected Files: ${rec.affected_files}`);
    return { content: [{ type: "text", text: `Recommendations: ${recommendations.join('; ')}` }] };
  }
);

server.registerTool(
  "mcp_ScancodeMCP_list_files_for_analysis",
  {
    title: "List Files for Analysis",
    description: "Lists all unique files that have problematic licenses and require review.",
    inputSchema: { random_string: z.string().describe("Dummy parameter for no-parameter tools") },
  },
  async ({ random_string }) => {
    if (!licenseData || !licenseData.problematic_licenses) {
      return { content: [{ type: "text", text: "License data not loaded or no problematic licenses found." }] };
    }
    const files = new Set<string>();
    for (const category in licenseData.problematic_licenses) {
      for (const item of licenseData.problematic_licenses[category]) {
        files.add(item.file);
      }
    }
    if (files.size === 0) {
      return { content: [{ type: "text", text: "No files with problematic licenses found for analysis." }] };
    }
    return { content: [{ type: "text", text: `Files for Analysis: ${Array.from(files).join('; ')}` }] };
  }
);

server.registerTool(
  "mcp_ScancodeMCP_generate_file_report",
  {
    title: "Generate File Report",
    description: "Reads a specified file from disk and provides its content along with any associated problematic licenses. Reports if the file cannot be read.",
    inputSchema: {
      filePath: z.string().describe("The path of the file to generate a report for. Must be a full path.")
    },
  },
  async ({ filePath }) => {
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      let report = `File Content for ${filePath}:\n---\n${fileContent}\n---\n`;

      const foundLicenses: string[] = [];
      if (licenseData && licenseData.problematic_licenses) {
        for (const category in licenseData.problematic_licenses) {
          for (const item of licenseData.problematic_licenses[category]) {
            if (item.file.toLowerCase() === filePath.toLowerCase()) { // Exact match for detailed report
              foundLicenses.push(`${item.name} (score: ${item.score})`);
            }
          }
        }
      }

      if (foundLicenses.length > 0) {
        report += `\nAssociated Problematic Licenses: ${foundLicenses.join('; ')}`; 
      } else {
        report += `\nNo problematic licenses associated directly with this file.`;
      }
      return { content: [{ type: "text", text: report }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Could not read file ${filePath}: ${error.message}. Some files might not be accessible due to permissions or being outside the project context.` }] };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport); 
