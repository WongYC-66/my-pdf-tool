
# PDF Studio

A simple browser-based PDF utility built with vanilla HTML, CSS and JavaScript.

PDF Studio allows users to split PDF documents into individual pages, reorder pages, and delete unwanted pages.

All PDF processing happens locally in the browser. No backend or file uploads are required.

## Features

### Mode 1: Split PDF
- Upload a PDF document.
- Preview every page.
- Split each page into an individual PDF.
- Download all generated PDFs in one ZIP file.

### Mode 2: Reorder / Delete
- Preview every page.
- Move pages up or down.
- Delete unwanted pages.
- Reset changes to the original page order.
- Download the revised PDF.

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript (ES Modules)
- PDF.js - PDF page rendering and previews
- pdf-lib - PDF manipulation
- JSZip - ZIP file generation
- http-server - Local development server

## Project Structure

```text
pdf-studio/
│
├── index.html
├── package.json
├── README.md
│
├── css/
│   └── style.css
│
└── js/
    ├── dom.js
    ├── main.js
    └── pdf-service.js
```

## Prerequisites

- Node.js
- npm

Check your installation:

```bash
node -v
npm -v
```

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd pdf-studio
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

Alternatively:

```bash
npm start
```

### 4. Open in browser

Visit:

```text
http://localhost:8000
```

## External Dependencies

The following libraries are loaded through CDN:

- PDF.js
- pdf-lib
- JSZip

An active internet connection is required to load these libraries.

## Privacy

PDF documents are processed directly inside the browser.

No backend server, database or cloud storage is used.

## Limitations

- Large PDFs may consume considerable browser memory.
- Reconstructed PDFs may not preserve all document-level features, such as bookmarks, attachments and interactive form behaviour.
- This project is intended for basic PDF manipulation, not full-featured document editing.

## License

For personal and educational use.
