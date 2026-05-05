#!/usr/bin/env node

/**
 * Import raw Figma file context into this repository.
 *
 * Usage:
 *   FIGMA_ACCESS_TOKEN=... FIGMA_FILE_KEY=... node figma/import-figma.mjs
 *
 * Optional:
 *   FIGMA_OUTPUT_DIR=figma/download node figma/import-figma.mjs
 *   FIGMA_FILE_KEY=... FIGMA_ACCESS_TOKEN=... node figma/import-figma.mjs --file-key ... --token ...
 *
 * The importer intentionally preserves the raw Figma API response as the
 * source of truth, then writes smaller extracted/indexed files for easier use.
 */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const API_BASE = "https://api.figma.com/v1";

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

const token = readArg("token") || process.env.FIGMA_ACCESS_TOKEN;
const fileKey = readArg("file-key") || process.env.FIGMA_FILE_KEY;
const outputDir = readArg("output-dir") || process.env.FIGMA_OUTPUT_DIR || "figma/download";

if (!token || !fileKey) {
  console.error(`Missing required Figma credentials.

Provide both values using environment variables:
  FIGMA_ACCESS_TOKEN=your_token FIGMA_FILE_KEY=your_file_key node figma/import-figma.mjs

Or using CLI flags:
  node figma/import-figma.mjs --token your_token --file-key your_file_key
`);
  process.exit(1);
}

async function figmaGet(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "X-Figma-Token": token,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Figma API request failed: ${response.status} ${response.statusText}\n${body}`);
  }

  return response.json();
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function sanitizeNodeForIndex(node, pageName, parentId = null) {
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    pageName,
    parentId,
    componentId: node.componentId || null,
    componentSetId: node.componentSetId || null,
    styleIds: node.styles || null,
    absoluteBoundingBox: node.absoluteBoundingBox || null,
    layoutMode: node.layoutMode || null,
    primaryAxisSizingMode: node.primaryAxisSizingMode || null,
    counterAxisSizingMode: node.counterAxisSizingMode || null,
    constraints: node.constraints || null,
    children: Array.isArray(node.children) ? node.children.map((child) => child.id) : [],
  };
}

function buildNodeIndex(document) {
  const nodesById = {};
  const pages = [];
  const typeCounts = {};

  function visit(node, pageName, parentId = null) {
    typeCounts[node.type] = (typeCounts[node.type] || 0) + 1;
    nodesById[node.id] = sanitizeNodeForIndex(node, pageName, parentId);

    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        visit(child, pageName, node.id);
      }
    }
  }

  for (const page of document.children || []) {
    pages.push({
      id: page.id,
      name: page.name,
      type: page.type,
      children: Array.isArray(page.children) ? page.children.map((child) => child.id) : [],
    });
    visit(page, page.name, null);
  }

  return { pages, nodesById, typeCounts };
}

function summarizeComponents(components = {}, componentSets = {}) {
  const componentsBySet = {};

  for (const [componentId, component] of Object.entries(components)) {
    const setId = component.componentSetId || "__no_component_set__";
    componentsBySet[setId] ||= [];
    componentsBySet[setId].push({ id: componentId, ...component });
  }

  return {
    componentCount: Object.keys(components).length,
    componentSetCount: Object.keys(componentSets).length,
    componentsBySet,
  };
}

async function main() {
  const startedAt = new Date().toISOString();
  const absoluteOutputDir = path.resolve(outputDir);

  console.log(`Importing Figma file ${fileKey}...`);
  console.log(`Output directory: ${absoluteOutputDir}`);

  const file = await figmaGet(`/files/${encodeURIComponent(fileKey)}`);

  const rawDir = path.join(outputDir, "raw");
  await writeJson(path.join(rawDir, "file.json"), file);
  await writeJson(path.join(rawDir, "document.json"), file.document || {});
  await writeJson(path.join(rawDir, "components.json"), file.components || {});
  await writeJson(path.join(rawDir, "component-sets.json"), file.componentSets || {});
  await writeJson(path.join(rawDir, "styles.json"), file.styles || {});

  const nodeIndex = buildNodeIndex(file.document || { children: [] });
  const componentSummary = summarizeComponents(file.components, file.componentSets);

  const index = {
    importedAt: startedAt,
    fileKey,
    name: file.name,
    lastModified: file.lastModified,
    thumbnailUrl: file.thumbnailUrl,
    version: file.version,
    role: file.role,
    editorType: file.editorType,
    linkAccess: file.linkAccess,
    schemaVersion: file.schemaVersion,
    ...nodeIndex,
    components: componentSummary,
    stylesCount: Object.keys(file.styles || {}).length,
    rawFiles: {
      file: "raw/file.json",
      document: "raw/document.json",
      components: "raw/components.json",
      componentSets: "raw/component-sets.json",
      styles: "raw/styles.json",
    },
  };

  await writeJson(path.join(outputDir, "index.json"), index);

  const metadata = {
    importedAt: startedAt,
    fileKey,
    fileName: file.name,
    lastModified: file.lastModified,
    version: file.version,
    nodeCount: Object.keys(nodeIndex.nodesById).length,
    typeCounts: nodeIndex.typeCounts,
    componentCount: componentSummary.componentCount,
    componentSetCount: componentSummary.componentSetCount,
    stylesCount: Object.keys(file.styles || {}).length,
  };

  await writeJson(path.join(outputDir, "metadata.json"), metadata);

  console.log("Figma import complete.");
  console.log(`- Raw source: ${path.join(outputDir, "raw/file.json")}`);
  console.log(`- Node index: ${path.join(outputDir, "index.json")}`);
  console.log(`- Metadata: ${path.join(outputDir, "metadata.json")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
