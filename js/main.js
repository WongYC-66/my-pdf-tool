
import {
    elements,
    displayFileInfo,
    updateStatus,
    setButtonDisabled
} from './dom.js';

let selectedFile = null;

// Check external libraries
console.log('[INIT] PDFLib:', typeof PDFLib);
console.log('[INIT] JSZip:', typeof JSZip);

// Handle PDF upload
elements.pdfInput.addEventListener('change', () => {
    console.log('[UPLOAD] File input changed');

    const file = elements.pdfInput.files[0];

    if (!file) {
        console.log('[UPLOAD] No file selected');
        return;
    }

    console.log('[UPLOAD] Selected file:', file.name);
    console.log('[UPLOAD] File type:', file.type);
    console.log('[UPLOAD] File size:', file.size);

    // Validate file
    if (
        file.type !== 'application/pdf' &&
        !file.name.toLowerCase().endsWith('.pdf')
    ) {
        alert('Please select a valid PDF file.');
        elements.pdfInput.value = '';
        return;
    }

    selectedFile = file;

    displayFileInfo(file);
    setButtonDisabled(false);
    updateStatus('PDF uploaded successfully!');

    console.log('[UPLOAD] Upload completed successfully');
});

// Handle PDF splitting
elements.splitBtn.addEventListener('click', async () => {
    if (!selectedFile) {
        updateStatus('Please upload a PDF first.');
        return;
    }

    setButtonDisabled(true);
    updateStatus('Processing PDF...');

    try {
        // Verify libraries
        if (typeof PDFLib === 'undefined') {
            throw new Error('PDFLib failed to load.');
        }

        if (typeof JSZip === 'undefined') {
            throw new Error('JSZip failed to load.');
        }

        const { PDFDocument } = PDFLib;

        console.log('[SPLIT] Reading PDF...');

        const buffer = await selectedFile.arrayBuffer();

        const sourcePdf = await PDFDocument.load(buffer);

        const totalPages = sourcePdf.getPageCount();

        console.log(`[SPLIT] Total pages: ${totalPages}`);

        const zip = new JSZip();

        // Split individual pages
        for (let i = 0; i < totalPages; i++) {
            updateStatus(
                `Processing page ${i + 1} of ${totalPages}...`
            );

            console.log(`[SPLIT] Processing page ${i + 1}`);

            const newPdf = await PDFDocument.create();

            const [page] = await newPdf.copyPages(
                sourcePdf,
                [i]
            );

            newPdf.addPage(page);

            const pdfBytes = await newPdf.save();

            zip.file(`page-${i + 1}.pdf`, pdfBytes);
        }

        // Generate ZIP
        updateStatus('Generating ZIP file...');

        const zipBlob = await zip.generateAsync({
            type: 'blob'
        });

        // Download ZIP
        downloadFile(zipBlob, 'split-pdfs.zip');

        updateStatus(
            `Success! ${totalPages} PDF files generated.`
        );

        console.log('[SPLIT] Completed successfully');

    } catch (error) {
        console.error('[SPLIT] Error:', error);

        updateStatus(`Error: ${error.message}`);

    } finally {
        setButtonDisabled(false);
    }
});

// Download generated file
function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 1000);
}
