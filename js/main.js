
import {
    elements,
    displayFileInfo,
    setTabsEnabled,
    setActiveMode,
    renderSplitPagePreviews,
    renderEditPagePreviews,
    updatePageThumbnail,
    setActionButtonsDisabled,
    setPageControlsDisabled,
    updateResetButton,
    setStatus,
    clearWorkspace
} from './dom.js';

import {
    loadPdfFile,
    renderPageThumbnail,
    createSplitZip,
    createReorderedPdf
} from './pdf-service.js';

// Application state
let selectedFile = null;
let sourcePdf = null;
let previewDocument = null;

// Original pages never change.
// editablePages stores the user's working order.
let originalPages = [];
let editablePages = [];

let uploadRequestId = 0;
let previewsReady = false;
let isBusy = false;
let activeMode = 'split';

// Initial UI state
clearWorkspace();

setStatus('Upload a PDF to get started.');

// ========================================
// PDF UPLOAD AND PREVIEW
// ========================================

elements.pdfInput.addEventListener('change', handlePdfUpload);

async function handlePdfUpload() {
    const file = elements.pdfInput.files?.[0];

    // Allow uploading the same file again later.
    elements.pdfInput.value = '';

    if (!file) return;

    const requestId = ++uploadRequestId;

    // Destroy previous PDF.js document.
    if (previewDocument) {
        previewDocument.destroy().catch(() => {});
    }

    // Reset previous application state.
    selectedFile = null;
    sourcePdf = null;
    previewDocument = null;

    originalPages = [];
    editablePages = [];

    previewsReady = false;
    isBusy = false;

    clearWorkspace();

    setStatus('Loading PDF...');

    const isPdf =
        file.type === 'application/pdf' ||
        file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
        setStatus('Please select a PDF file.', 'error');
        return;
    }

    try {
        // Load PDF using pdf-lib and PDF.js
        const loaded = await loadPdfFile(file);

        // Ignore outdated upload operations.
        if (requestId !== uploadRequestId) {
            loaded.previewDocument.destroy().catch(() => {});
            return;
        }

        if (loaded.pageCount < 1) {
            throw new Error('This PDF does not contain any pages.');
        }

        selectedFile = file;
        sourcePdf = loaded.sourcePdf;
        previewDocument = loaded.previewDocument;

        // Initialise original page collection.
        originalPages = Array.from(
            { length: loaded.pageCount },
            (_, index) => ({
                originalIndex: index,
                thumbnail: null
            })
        );

        // Create a separate editable collection.
        editablePages = originalPages.map(page => ({
            ...page
        }));

        // Update UI
        displayFileInfo(file, loaded.pageCount);

        setTabsEnabled(true);

        activeMode = 'split';
        setActiveMode(activeMode);

        renderSplitPagePreviews(originalPages);

        renderEditPagePreviews(editablePages, {
            onMove: movePage,
            onDelete: deletePage
        });

        setActionButtonsDisabled(true);

        setStatus(
            `Generating page previews: 0 / ${loaded.pageCount}...`
        );

        // Render thumbnails sequentially.
        // This avoids creating too many canvases simultaneously.
        for (let index = 0; index < loaded.pageCount; index++) {

            if (requestId !== uploadRequestId) return;

            try {
                const thumbnail = await renderPageThumbnail(
                    previewDocument,
                    index + 1
                );

                if (requestId !== uploadRequestId) return;

                originalPages[index].thumbnail = thumbnail;
                editablePages[index].thumbnail = thumbnail;

                updatePageThumbnail(index, thumbnail);

            } catch (previewError) {
                console.warn(
                    `[PREVIEW] Could not render page ${index + 1}:`,
                    previewError
                );
            }

            setStatus(
                `Generating page previews: ${index + 1} / ${loaded.pageCount}...`
            );
        }

        if (requestId !== uploadRequestId) return;

        previewsReady = true;

        setActionButtonsDisabled(false);
        updateResetButton(false);

        setStatus(
            `Ready. ${loaded.pageCount} page previews loaded.`,
            'success'
        );

        console.log('[UPLOAD] PDF loaded:', file.name);
        console.log('[UPLOAD] Total pages:', loaded.pageCount);

    } catch (error) {

        if (requestId !== uploadRequestId) return;

        console.error('[UPLOAD] Failed to load PDF:', error);

        selectedFile = null;
        sourcePdf = null;
        previewDocument = null;

        originalPages = [];
        editablePages = [];

        previewsReady = false;

        clearWorkspace();

        setStatus(
            `Could not open PDF: ${error.message}`,
            'error'
        );
    }
}

// ========================================
// MODE TAB SWITCHING
// ========================================

elements.splitTab.addEventListener('click', () => {
    if (!sourcePdf) return;

    activeMode = 'split';

    setActiveMode(activeMode);
});

elements.editTab.addEventListener('click', () => {
    if (!sourcePdf) return;

    activeMode = 'edit';

    setActiveMode(activeMode);
});

// ========================================
// MODE 1: SPLIT PDF
// ========================================

elements.splitBtn.addEventListener('click', async () => {

    if (
        !sourcePdf ||
        !selectedFile ||
        !previewsReady ||
        isBusy
    ) {
        return;
    }

    isBusy = true;

    elements.pdfInput.disabled = true;

    setActionButtonsDisabled(true);
    setPageControlsDisabled(true);

    setStatus('Preparing separate PDF files...');

    try {

        // Every original page becomes one individual PDF.
        const zipBlob = await createSplitZip(
            sourcePdf,
            (current, total) => {
                setStatus(`Splitting page ${current} of ${total}...`);
            }
        );

        const baseName = getBaseFilename(selectedFile.name);

        downloadBlob(
            zipBlob,
            `${baseName}-split-pages.zip`
        );

        setStatus(
            `Done! ${originalPages.length} individual PDFs were added to the ZIP file.`,
            'success'
        );

    } catch (error) {

        console.error('[SPLIT] Failed:', error);

        setStatus(
            `Could not split PDF: ${error.message}`,
            'error'
        );

    } finally {

        isBusy = false;

        elements.pdfInput.disabled = false;

        setActionButtonsDisabled(!previewsReady);
        setPageControlsDisabled(false);
    }
});

// ========================================
// MODE 2: REORDER AND DELETE
// ========================================

// Move page up or down.
function movePage(position, direction) {

    if (isBusy || !previewsReady) return;

    const targetPosition = position + direction;

    // Prevent moving outside the page list.
    if (
        targetPosition < 0 ||
        targetPosition >= editablePages.length
    ) {
        return;
    }

    // Remove page from its current position.
    const [movedPage] = editablePages.splice(position, 1);

    // Insert page at the new position.
    editablePages.splice(targetPosition, 0, movedPage);

    // Refresh UI.
    renderEditPagePreviews(editablePages, {
        onMove: movePage,
        onDelete: deletePage
    });

    updateResetButton(false);

    setStatus(
        `Moved original page ${movedPage.originalIndex + 1} to position ${targetPosition + 1}.`
    );
}

// Delete a selected page.
function deletePage(position) {

    if (isBusy || !previewsReady) return;

    // Always retain at least one page.
    if (editablePages.length <= 1) {
        setStatus(
            'A PDF must contain at least one page.',
            'error'
        );
        return;
    }

    const [removedPage] = editablePages.splice(position, 1);

    // Refresh UI.
    renderEditPagePreviews(editablePages, {
        onMove: movePage,
        onDelete: deletePage
    });

    updateResetButton(false);

    setStatus(
        `Removed original page ${removedPage.originalIndex + 1}. ${editablePages.length} pages remain.`
    );
}

// Reset page order and restore deleted pages.
elements.resetBtn.addEventListener('click', () => {

    if (isBusy || !previewsReady) return;

    editablePages = originalPages.map(page => ({
        ...page
    }));

    renderEditPagePreviews(editablePages, {
        onMove: movePage,
        onDelete: deletePage
    });

    updateResetButton(true);

    setStatus(
        'Page order and deleted pages have been reset.'
    );
});

// ========================================
// DOWNLOAD REVISED PDF
// ========================================

elements.downloadEditedBtn.addEventListener('click', async () => {

    if (
        !sourcePdf ||
        !selectedFile ||
        !previewsReady ||
        isBusy
    ) {
        return;
    }

    isBusy = true;

    elements.pdfInput.disabled = true;

    setActionButtonsDisabled(true);
    setPageControlsDisabled(true);

    setStatus('Generating revised PDF...');

    try {

        // Snapshot the selected page order.
        const pageIndexes = editablePages.map(
            page => page.originalIndex
        );

        const pdfBytes = await createReorderedPdf(
            sourcePdf,
            pageIndexes
        );

        const blob = new Blob(
            [pdfBytes],
            { type: 'application/pdf' }
        );

        const baseName = getBaseFilename(selectedFile.name);

        downloadBlob(
            blob,
            `${baseName}-revised.pdf`
        );

        setStatus(
            `Done! Revised PDF downloaded with ${pageIndexes.length} pages.`,
            'success'
        );

    } catch (error) {

        console.error('[EDIT] Failed:', error);

        setStatus(
            `Could not generate revised PDF: ${error.message}`,
            'error'
        );

    } finally {

        isBusy = false;

        elements.pdfInput.disabled = false;

        setActionButtonsDisabled(!previewsReady);
        setPageControlsDisabled(false);
    }
});

// ========================================
// DOWNLOAD HELPERS
// ========================================

function getBaseFilename(filename) {
    return filename.replace(/\.pdf$/i, '') || 'document';
}

function downloadBlob(blob, filename) {

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);

    link.click();
    link.remove();

    window.setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 1500);
}
