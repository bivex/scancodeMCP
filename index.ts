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

let licenseData: any = {};

async function loadLicenseData() {
  try {
    const dataPath = path.join(__dirname, 'license_analysis_detailed.json');
    const data = await fs.readFile(dataPath, 'utf8');
    licenseData = JSON.parse(data);
  } catch (error) {
    console.error('Failed to load license data:', error);
  }
}

// Load data when the server starts
loadLicenseData();

// --- LEGAL-EXPERT-GRADE TOOLS ---

// A. Analyze a file's license(s) in legal detail
server.registerTool(
  "mcp_ScancodeMCP_analyze_license_file",
  {
    title: "Analyze License File (Legal Breakdown)",
    description: "Clause-by-clause legal analysis of all licenses detected in a file, including obligations, risks, and compatibility.",
    inputSchema: {
      filePaths: z.array(z.string()).describe("An array of file paths to analyze. Can be a single file path for individual analysis."),
      linesToRead: z.number().int().min(1).optional().describe("Number of lines to read from each file (default: 100)."),
      scannedDataBasePath: z.string().optional().describe("The base absolute path for resolving relative license paths (default: 'C:\\Users\\Admin\\Desktop\\LICENSE_MANAGER\\').")
    },
  },
  async ({ filePaths, linesToRead, scannedDataBasePath }) => {
    if (!licenseData?.problematic_licenses) {
      return { content: [{ type: "text", text: "License data not loaded or no problematic licenses found." }] };
    }

    const effectiveLinesToRead = linesToRead ?? 100;
    const effectiveScannedDataBasePath = scannedDataBasePath ?? "C:\\Users\\Admin\\Desktop\\LICENSE_MANAGER\\";

    if (!filePaths?.length) {
      return { content: [{ type: "text", text: "Please provide 'filePaths' to analyze." }] };
    }

    let overallReport = '';

    for (const currentFilePath of filePaths) {
      overallReport += await processFileForLicenseAnalysis(currentFilePath, effectiveLinesToRead, effectiveScannedDataBasePath);
    }
    return { content: [{ type: "text", text: overallReport.trim() }] };
  }
);

// Helper for analyze_license_file
async function processFileForLicenseAnalysis(currentFilePath: string, effectiveLinesToRead: number, effectiveScannedDataBasePath: string): Promise<string> {
  const fileContentSnippet = await readFirstNLines(currentFilePath, effectiveLinesToRead);
  let report = `\n--- File Content Snippet for ${currentFilePath} ---\n${fileContentSnippet}\n`;

  let pathForLookup = currentFilePath;
  if (path.isAbsolute(currentFilePath)) {
    pathForLookup = path.relative(effectiveScannedDataBasePath, currentFilePath);
  }
  pathForLookup = pathForLookup.replace(/\\/g, '/');

  const found: { name: string, score: number }[] = findLicensesForFile(pathForLookup);

  if (found.length === 0) {
    report += `No problematic licenses found for file: ${currentFilePath}\n\n`;
  } else {
    let licReport = `Legal Analysis for ${currentFilePath}:\n`;
    for (const lic of found) {
      licReport += `\n---\nLicense: ${lic.name}\nScore: ${lic.score}\n`;
      licReport += await legalSummaryForLicense(lic.name);
    }
    report += `${licReport}\n\n`;
  }
  return report;
}

function findLicensesForFile(pathForLookup: string): { name: string, score: number }[] {
  const found: { name: string, score: number }[] = [];
  for (const category in licenseData?.problematic_licenses ?? {}) {
    for (const item of licenseData?.problematic_licenses?.[category] ?? []) {
      if (item.file?.toLowerCase() === pathForLookup?.toLowerCase()) {
        found.push({ name: item.name, score: item.score });
      }
    }
  }
  return found;
}

// B. Summarize all high-risk/problematic licenses and files
server.registerTool(
  "mcp_ScancodeMCP_summarize_license_risks",
  {
    title: "Summarize License Risks",
    description: "Lists all files with high-risk/problematic licenses and provides a legal risk summary for each license type.",
    inputSchema: { random_string: z.string().describe("Dummy parameter for no-parameter tools").optional() },
  },
  async ({ random_string }) => {
    if (!licenseData?.problematic_licenses) {
      return { content: [{ type: "text", text: "License data not loaded or no problematic licenses found." }] };
    }
    const riskMap: Record<string, Set<string>> = buildRiskMap();
    let report = 'Summary of High-Risk/Problematic Licenses and Files:\n';
    for (const lic in riskMap) {
      report += `\nLicense: ${lic}\nFiles: ${Array.from(riskMap?.[lic] ?? []).join('; ')}\n`;
      report += await legalSummaryForLicense(lic, true);
    }
    return { content: [{ type: "text", text: report }] };
  }
);

function buildRiskMap(): Record<string, Set<string>> {
  const riskMap: Record<string, Set<string>> = {};
  for (const category in licenseData?.problematic_licenses ?? {}) {
    for (const item of licenseData?.problematic_licenses?.[category] ?? []) {
      if (!riskMap[item.name]) riskMap[item.name] = new Set();
      riskMap[item.name].add(item.file);
    }
  }
  return riskMap;
}

// C. Compare two licenses for compatibility/conflict
server.registerTool(
  "mcp_ScancodeMCP_compare_license_compatibility",
  {
    title: "Compare License Compatibility",
    description: "Legal compatibility verdict and explanation for two license types (e.g., MIT vs GPLv3).",
    inputSchema: {
      licenseA: z.string().describe("First license name (e.g., MIT, GPL-3.0)") ,
      licenseB: z.string().describe("Second license name (e.g., Apache-2.0, GPL-2.0)")
    },
  },
  async ({ licenseA, licenseB }) => {
    // Use a built-in matrix for common licenses, else flag for manual review
    return { content: [{ type: "text", text: licenseCompatibilityVerdict(licenseA, licenseB) }] };
  }
);

// D. List all high-risk files (copyleft, unknown, commercial-unfriendly)
server.registerTool(
  "mcp_ScancodeMCP_list_high_risk_files",
  {
    title: "List High-Risk Files",
    description: "Lists all files with copyleft, unknown, or commercial-unfriendly licenses, with a legal warning for each.",
    inputSchema: { random_string: z.string().describe("Dummy parameter for no-parameter tools").optional() },
  },
  async ({ random_string }) => {
    if (!licenseData?.problematic_licenses) {
      return { content: [{ type: "text", text: "License data not loaded or no problematic licenses found." }] };
    }
    const highRiskCats = ["copyleft", "unknown", "commercial_unfriendly", "gpl", "agpl"];
    let report = 'High-Risk Files (copyleft, unknown, commercial-unfriendly):\n';
    for (const cat of highRiskCats) {
      if (!licenseData.problematic_licenses[cat]) continue;
      for (const item of licenseData.problematic_licenses[cat]) {
        report += `\nFile: ${item.file}\nLicense: ${item.name}\n`;
        report += await legalSummaryForLicense(item.name, true);
      }
    }
    return { content: [{ type: "text", text: report }] };
  }
);

// E. Get clause-by-clause legal summary for a license
server.registerTool(
  "mcp_ScancodeMCP_get_license_clause_summary",
  {
    title: "Get License Clause Summary",
    description: "Clause-by-clause legal summary of a license (obligations, risks, compatibility, etc).",
    inputSchema: {
      licenseName: z.string().describe("The license name to summarize (e.g., MIT, GPL-3.0, unknown)")
    },
  },
  async ({ licenseName }) => {
    return { content: [{ type: "text", text: await legalSummaryForLicense(licenseName) }] };
  }
);

// --- LEGAL SUMMARY LOGIC ---

async function legalSummaryForLicense(licenseName: string, short = false): Promise<string> {
  // This is a simplified legal expert system for demo purposes
  const name = licenseName.toLowerCase();

  const licenseSummaries: { [key: string]: { short: string; long: string } } = {
    "mit": {
      short: "MIT: Permissive, allows reuse/modification, requires attribution, disclaims warranties. Low risk.",
      long: `Type: Permissive\nGrant: Broad rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies.\nObligations: Must include original copyright and license.\nWarranty: Disclaimed.\nIndemnity: None.\nCompatibility: Compatible with most open and closed licenses.\nRisks: Minimal.\nCommercial Use: Safe.\n`
    },
    "gpl": {
      short: "GPL: Copyleft, requires derivatives to be GPL, viral effect, not business-friendly for closed source.",
      long: `Type: Copyleft\nGrant: Use, copy, modify, distribute.\nObligations: Derivatives must be GPL, source code disclosure required.\nWarranty: Disclaimed.\nIndemnity: None.\nCompatibility: Incompatible with most closed/proprietary licenses.\nRisks: Viral obligations, business model conflict.\nCommercial Use: Risky for proprietary.\n`
    },
    "lgpl": {
      short: "LGPL: Weak copyleft, allows dynamic linking, but modifications to LGPL code must be open.",
      long: `Type: Weak Copyleft\nGrant: Use, copy, modify, distribute.\nObligations: Modifications to LGPL code must be LGPL, dynamic linking allowed.\nWarranty: Disclaimed.\nIndemnity: None.\nCompatibility: More compatible than GPL, but still viral for modifications.\nRisks: Linking confusion.\nCommercial Use: Moderate risk.\n`
    },
    "bsd": {
      short: "BSD: Permissive, minimal restrictions, requires attribution.",
      long: `Type: Permissive\nGrant: Use, copy, modify, distribute.\nObligations: Attribution, sometimes no endorsement.\nWarranty: Disclaimed.\nIndemnity: None.\nCompatibility: High.\nRisks: Minimal.\nCommercial Use: Safe.\n`
    },
    "apache": {
      short: "Apache: Permissive, explicit patent grant, requires NOTICE file.",
      long: `Type: Permissive\nGrant: Use, copy, modify, distribute.\nObligations: Attribution, NOTICE file, patent grant.\nWarranty: Disclaimed.\nIndemnity: None.\nCompatibility: High, but not with GPLv2.\nRisks: Patent termination.\nCommercial Use: Safe.\n`
    },
    "proprietary": {
      short: "Proprietary: Custom terms, usually restricts use, modification, redistribution. High legal risk.",
      long: `Type: Proprietary\nGrant: Limited, as specified.\nObligations: As specified, often strict.\nWarranty: Varies.\nIndemnity: Varies.\nCompatibility: Usually incompatible with open source.\nRisks: High, custom terms.\nCommercial Use: Review required.\n`
    },
    "unknown": {
      short: "Unknown: No license detected, all rights reserved by default. Cannot use, modify, or distribute.",
      long: `Type: Unknown\nGrant: None.\nObligations: Cannot use, modify, or distribute.\nWarranty: None.\nIndemnity: None.\nCompatibility: None.\nRisks: Maximum.\nCommercial Use: Forbidden.\n`
    },
    "cc-by": {
      short: "CC-BY: Attribution required, otherwise permissive.",
      long: `Type: Permissive (Creative Commons)\nGrant: Use, share, adapt.\nObligations: Attribution.\nWarranty: Disclaimed.\nIndemnity: None.\nCompatibility: Not for software.\nRisks: License scope confusion.\nCommercial Use: Allowed.\n`
    },
    "public-domain": {
      short: "Public Domain: No rights reserved, free to use.",
      long: `Type: Public Domain\nGrant: Unrestricted.\nObligations: None.\nWarranty: None.\nIndemnity: None.\nCompatibility: Universal.\nRisks: None.\nCommercial Use: Safe.\n`
    },
    "default": {
      short: `Custom/Unknown: Legal review required. High risk of non-compliance or business conflict.`,
      long: `Type: Custom/Unknown\nGrant: Unclear.\nObligations: Unclear.\nWarranty: Unclear.\nIndemnity: Unclear.\nCompatibility: Unclear.\nRisks: High.\nCommercial Use: Not recommended without legal review.\n`
    }
  };

  for (const key in licenseSummaries) {
    if (name.includes(key)) {
      const summary = licenseSummaries[key];
      return short ? summary.short : summary.long;
    }
  }

  // Fallback for custom/complex/unknown if no match found
  const defaultSummary = licenseSummaries["default"];
  return short ? defaultSummary.short : defaultSummary.long;
}

async function readFirstNLines(filePath: string, numLines: number): Promise<string> {
  try {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(__dirname, filePath);
    const fileContent = await fs.readFile(fullPath, 'utf8');
    const lines = fileContent.split('\n');
    return `\n${lines.slice(0, numLines).join('\n')}\n`;
  } catch (error: any) {
    return `\nError reading file ${filePath}: ${(error as Error).message}\n`;
  }
}

function licenseCompatibilityVerdict(licenseA: string, licenseB: string): string {
  // Simple matrix for demo; real-world use would be more complex
  const a = licenseA.toLowerCase();
  const b = licenseB.toLowerCase();
  if (a === b) return `Both are ${licenseA}. Compatible.`;
  if ((a.includes("mit") && b.includes("gpl")) || (b.includes("mit") && a.includes("gpl"))) {
    return "MIT and GPL: MIT code can be included in GPL projects, but the combined work must be GPL. GPL code cannot be relicensed as MIT. Compatible with restrictions.";
  }
  if ((a.includes("mit") && b.includes("apache")) || (b.includes("mit") && a.includes("apache"))) {
    return "MIT and Apache: Compatible. Both are permissive, but Apache has extra patent terms.";
  }
  if ((a.includes("gpl") && b.includes("apache")) || (b.includes("gpl") && a.includes("apache"))) {
    return "GPL and Apache: Apache 2.0 is compatible with GPLv3, but not with GPLv2. Check versions.";
  }
  if (a.includes("proprietary") || b.includes("proprietary")) {
    return "Proprietary and open source: Usually incompatible. Legal review required.";
  }
  if (a.includes("unknown") || b.includes("unknown")) {
    return "Unknown license: Cannot determine compatibility. Legal review required.";
  }
  return "Compatibility unknown or complex. Legal review recommended.";
}

const transport = new StdioServerTransport();
await server.connect(transport); 
