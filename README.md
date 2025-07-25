# Scancode License Analysis Tool for MCP

This project provides a set of tools built with the Model Context Protocol (MCP) TypeScript SDK. These tools help you analyze software licenses, specifically using data from a Scancode-generated `license_analysis_detailed.json` file. It's designed to make license compliance easier to manage by providing quick access to critical information about problematic licenses, affected files, and scan issues.

## What is the Model Context Protocol (MCP)?

MCP is a standardized way for applications (like code editors or AI agents) to communicate with external services (like this license analysis tool). Think of it as a universal language that allows different software components to understand each other and work together, especially when dealing with large codebases or complex data.

## Why use this tool?

If you work with software projects, understanding the licenses of your dependencies is crucial for legal compliance. This tool helps you:

*   **Quickly identify problematic licenses:** See which licenses are a concern (e.g., copyleft, GPL, unknown).
*   **Pinpoint affected files:** Find out which specific files in your codebase are associated with these licenses.
*   **Review scan issues:** Understand if there were any problems during the license scanning process.
*   **Get recommendations:** Receive high-level guidance on how to address licensing concerns.
*   **Generate file reports:** Easily get the content of a specific file along with its associated problematic licenses, directly from the tool.

## Prerequisites

Before you get started, make sure you have the following installed on your system:

*   **Node.js (v18 or higher):** A JavaScript runtime. You can download it from [nodejs.org](https://nodejs.org/).
*   **npm:** Node Package Manager, which comes with Node.js.

## Setup Steps

Follow these steps to set up and run your Scancode License Analysis Tool:

1.  **Clone this repository** (if you haven't already):
    Open your terminal or command prompt and run:
    ```bash
    git clone <your-repo-url> # Replace <your-repo-url> with the actual URL
    cd <your-repo-directory> # Navigate into the cloned project folder
    ```

2.  **Install project dependencies:**
    This command downloads all the necessary libraries and packages for the tool to run:
    ```bash
    npm install
    ```

3.  **Ensure your `license_analysis_detailed.json` file is present:**
    This tool relies on a `license_analysis_detailed.json` file generated by Scancode. Make sure this file is in the root directory of your project (where `index.ts` is located). This file contains the license scan results that the tools will analyze.

4.  **Configure TypeScript (Optional, but recommended for development):**
    A `tsconfig.json` file is already included and configured. It tells TypeScript how to compile your code. Key settings for this project include:
    ```json
    {
      "compilerOptions": {
        "module": "nodenext",  // Ensures modern module resolution for Node.js
        "target": "es2022",    // Compiles to a recent JavaScript version
        "outDir": "dist",      // Output compiled JavaScript files to the 'dist' folder
        // ... other settings for strictness and compatibility ...
      },
      "include": ["index.ts"] // Only compile this file
    }
    ```

5.  **Build the project (Compile TypeScript to JavaScript):**
    This step compiles your TypeScript code (`.ts`) into plain JavaScript (`.js`) files, which Node.js can execute. The compiled files will be placed in the `dist/` directory.
    ```bash
    npx tsc
    ```

## Running the Tool

YouYou have two main ways to run this tool:

### 1. For Development (using `tsx`)

`tsx` allows you to run TypeScript files directly without a separate compilation step, which is great for development and testing:

```bash
npx tsx index.ts
```

### 2. Running the Built Version

After building your project (step 5 above), you can run the compiled JavaScript files from the `dist/` directory:

```bash
node dist/index.js
```

## How to Add This Tool to Cursor MCP

To integrate this tool with Cursor’s Model Context Protocol (MCP) feature, follow these steps:

1.  **Start your MCP server:**
    First, get your MCP server running using one of the methods above (e.g., `npx tsx index.ts`). This will keep the server active and listening for requests from Cursor.

2.  **Open Cursor and navigate to the MCP integration panel.**
    In Cursor, look for the MCP panel (usually in the sidebar or a dedicated view).

3.  **Add a new MCP server connection:**
    Click on the option to “Add MCP Server” or similar. You'll need to configure how Cursor connects to your running tool.

    *   **Connection Type:** Select **Stdio**.
    *   **Command:** Provide the command to start your server. This is the same command you used to run it in your terminal.
        *   Example (for development): `npx tsx C:\Users\Admin\Desktop\Dev\ScancodeMCP\index.ts`
        *   Example (for built version): `node C:\Users\Admin\Desktop\Dev\ScancodeMCP\dist\index.js`

    *   **(Optional) Environment Variables:** You might want to add `NODE_NO_WARNINGS: 1` under environment variables to suppress Node.js warnings.

4.  **Save and Connect.**
    Once configured, save the connection. Cursor should automatically detect your tools and make them available in the MCP tool palette.

## Example: `.cursor/mcp.json` Configuration

For a permanent setup, you can add this tool directly to your Cursor's global or project-specific `.cursor/mcp.json` file. This file tells Cursor which MCP servers to automatically start and connect to.

Here's an example entry to add to your `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "scancode-license-server": {
      "command": "npx",
      "args": [
        "tsx",
        "C:\\Users\\Admin\\Desktop\\Dev\\ScancodeMCP\\index.ts"
      ],
      "env": {
        "NODE_NO_WARNINGS": "1"
      },
      "disabled": false,
      "autoApprove": [
        "mcp_ScancodeMCP_analyze_license_file",
        "mcp_ScancodeMCP_summarize_license_risks",
        "mcp_ScancodeMCP_compare_license_compatibility",
        "mcp_ScancodeMCP_list_high_risk_files",
        "mcp_ScancodeMCP_get_license_clause_summary"
      ]
    }
    // ... any other MCP servers you have ...
  }
}
```

*   **Adjust the `args` path**: Make sure the `C:\\Users\\Admin\\Desktop\\Dev\\ScancodeMCP\\index.ts` path matches the actual location of your `index.ts` file.
*   **`autoApprove`**: This list tells Cursor which tools from your server can be automatically approved by the AI. This is convenient for frequently used tools.

After saving `mcp.json`, reload MCP servers in Cursor (there's usually a refresh button in the MCP panel). Your "Scancode License Analysis Tool" and its sub-tools will then be available in the MCP tool palette, ready to use!

## Available Tools and Their Uses

Here are the tools provided by this server, designed to help with license compliance:

| Tool Name                               | Description                                                                                                                                                                                                                         | How to Use (Example)                                                                                                                                                                                                                                                                                                                         |
| :-------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mcp_ScancodeMCP_analyze_license_file`  | Clause-by-clause legal analysis of all licenses detected in a file, including obligations, risks, and compatibility. Supports analyzing multiple files and reading a configurable number of lines from each file.                  | `mcp_ScancodeMCP_analyze_license_file(filePaths=['path/to/file1.txt', 'path/to/file2.txt'], linesToRead=50, scannedDataBasePath='C:\\Users\\Admin\\Desktop\\LICENSE_MANAGER\\')` <br/> `mcp_ScancodeMCP_analyze_license_file(filePaths=['path/to/single_file.txt'])`                                                              |
| `mcp_ScancodeMCP_summarize_license_risks` | Lists all files with high-risk/problematic licenses and provides a legal risk summary for each license type.                                                                                                            | `mcp_ScancodeMCP_summarize_license_risks()`                                                                                                                                                                                                                                                                                          |
| `mcp_ScancodeMCP_compare_license_compatibility` | Legal compatibility verdict and explanation for two license types (e.g., MIT vs GPLv3).                                                                                                                            | `mcp_ScancodeMCP_compare_license_compatibility(licenseA='MIT', licenseB='GPL-3.0')`                                                                                                                                                                                                                                                 |
| `mcp_ScancodeMCP_list_high_risk_files`  | Lists all files with copyleft, unknown, or commercial-unfriendly licenses, with a legal warning for each.                                                                                                             | `mcp_ScancodeMCP_list_high_risk_files()`                                                                                                                                                                                                                                                                                             |
| `mcp_ScancodeMCP_get_license_clause_summary` | Clause-by-clause legal summary of a license (obligations, risks, compatibility, etc).                                                                                                                               | `mcp_ScancodeMCP_get_license_clause_summary(licenseName='MIT')`                                                                                                                                                                                                                                                                     |

## License
MIT

## Keywords

#OpenSource #LicenseCompliance #LegalTech #Scancode #MCP #ModelContextProtocol #SoftwareLicenses #LicenseAnalysis #ComplianceTool #DeveloperTools #TypeScript #NodeJS #AutomatedLegal #CodeAnalysis 
