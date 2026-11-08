
const PDFJS_WORKER_URL =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

function getPdfLibraries() {
    if (!window.PDFLib?.PDFDocument) {
        throw new Error(
            'pdf-lib did not load. Check your internet connection and refresh the page.'
        );
    }

    if (!window.pdfjsLib?.getDocument) {
        throw new Error(
            'PDF.js did not load. Check your internet connection and refresh the page.'
        );
    }

    return {
        PDFDocument: window.PDFLib.PDFDocument,
        pdfjsLib: window.pdfjsLib
    };
}

// Load PDF for processing and preview
export async function loadPdfFile(file) {
    const { PDFDocument, pdfjsLib } = getPdfLibraries();

    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;

    const fileBuffer = await file.arrayBuffer();

    // Give each library its own copy of the PDF bytes.
    const pdfLibBytes = new Uint8Array(fileBuffer.slice(0));
    const pdfJsBytes = new Uint8Array(fileBuffer.slice(0));

    const sourcePdf = await PDFDocument.load(pdfLibBytes);

    const previewDocument = await pdfjsLib.getDocument({
        data: pdfJsBytes
    }).promise;

    return {
        sourcePdf,
        previewDocument,
        pageCount: sourcePdf.getPageCount()
    };
}

// Render an individual page thumbnail
export async function renderPageThumbnail(previewDocument, pageNumber) {
    const page = await previewDocument.getPage(pageNumber);

    const baseViewport = page.getViewport({
        scale: 1
    });

    // Small previews to reduce memory usage
    const targetWidth = 210;

    const scale = Math.min(
        targetWidth / baseViewport.width,
        1.25
    );

    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');

    const context = canvas.getContext('2d', {
        alpha: false
    });

    if (!context) {
        throw new Error(
            `Could not create a preview for page ${pageNumber}.`
        );
    }

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    try {
        await page.render({
            canvasContext: context,
            viewport,
            background: '#ffffff'
        }).promise;

        return canvas.toDataURL('image/jpeg', 0.78);

    } finally {
        page.cleanup();

        canvas.width = 0;
        canvas.height = 0;
    }
}

// MODE 1: Split every page into an individual PDF
export async function createSplitZip(sourcePdf, onProgress = () => {}) {
    if (!window.JSZip) {
        throw new Error(
            'JSZip did not load. Check your internet connection and refresh the page.'
        );
    }

    const { PDFDocument } = getPdfLibraries();

    const totalPages = sourcePdf.getPageCount();

    const zip = new window.JSZip();

    const digits = String(totalPages).length;

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {

        const singlePagePdf = await PDFDocument.create();

        // Copy one page from the original PDF
        const [page] = await singlePagePdf.copyPages(
            sourcePdf,
            [pageIndex]
        );

        singlePagePdf.addPage(page);

        const pdfBytes = await singlePagePdf.save();

        const filename =
            `page-${String(pageIndex + 1).padStart(digits, '0')}.pdf`;

        zip.file(filename, pdfBytes);

        onProgress(pageIndex + 1, totalPages);
    }

    return zip.generateAsync({
        type: 'blob'
    });
}

// MODE 2: Create a revised PDF
export async function createReorderedPdf(sourcePdf, originalPageIndexes) {
    if (!originalPageIndexes.length) {
        throw new Error(
            'The revised PDF must contain at least one page.'
        );
    }

    const { PDFDocument } = getPdfLibraries();

    const revisedPdf = await PDFDocument.create();

    // Copy pages in the order requested by the user
    const copiedPages = await revisedPdf.copyPages(
        sourcePdf,
        originalPageIndexes
    );

    copiedPages.forEach(page => {
        revisedPdf.addPage(page);
    });

    return revisedPdf.save();
}
