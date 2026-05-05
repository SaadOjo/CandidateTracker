# Figma import

This folder contains a small importer that downloads the raw Figma REST API document into the repo for development context.

## What it downloads

Running the importer creates:

```txt
figma/download/
  metadata.json
  index.json
  raw/
    file.json
    document.json
    components.json
    component-sets.json
    styles.json
```

`raw/file.json` is the source of truth. It preserves the full Figma API response, including the document tree, pages, frames, components, component sets, styles, layout metadata, fills, strokes, effects, and text data available through the API.

`index.json` is a lighter searchable index of nodes by ID.

## Run

```bash
FIGMA_ACCESS_TOKEN="your_token" FIGMA_FILE_KEY="your_file_key" node figma/import-figma.mjs
```

Or:

```bash
node figma/import-figma.mjs --token "your_token" --file-key "your_file_key"
```

Optional output directory:

```bash
FIGMA_OUTPUT_DIR="figma/download" FIGMA_ACCESS_TOKEN="your_token" FIGMA_FILE_KEY="your_file_key" node figma/import-figma.mjs
```

## Required info

1. **Figma access token**
   - Figma account menu → Settings → Security → Personal access tokens.
   - The token must have access to the file.

2. **Figma file key**
   - From a Figma URL like:

```txt
https://www.figma.com/design/FILE_KEY/File-Name
```

The `FILE_KEY` portion is what the script needs.

Do not commit your access token.
