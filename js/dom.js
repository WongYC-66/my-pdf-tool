
export const elements = {
    pdfInput: document.getElementById('pdfInput'),

    fileInfo: document.getElementById('fileInfo'),
    fileName: document.getElementById('fileName'),
    fileDetails: document.getElementById('fileDetails'),

    splitTab: document.getElementById('splitTab'),
    editTab: document.getElementById('editTab'),

    splitPanel: document.getElementById('splitPanel'),
    editPanel: document.getElementById('editPanel'),

    splitPageCount: document.getElementById('splitPageCount'),
    editPageCount: document.getElementById('editPageCount'),

    splitPageGrid: document.getElementById('splitPageGrid'),
    editPageGrid: document.getElementById('editPageGrid'),

    splitBtn: document.getElementById('splitBtn'),
    downloadEditedBtn: document.getElementById('downloadEditedBtn'),
    resetBtn: document.getElementById('resetBtn'),

    status: document.getElementById('status')
};

// Display uploaded file information
export function displayFileInfo(file, pageCount) {
    elements.fileName.textContent = file.name;

    elements.fileDetails.textContent =
        `${formatFileSize(file.size)} · ${pageCount} ${pageCount === 1 ? 'page' : 'pages'}`;

    elements.fileInfo.hidden = false;
}

// Enable or disable mode tabs
export function setTabsEnabled(enabled) {
    elements.splitTab.disabled = !enabled;
    elements.editTab.disabled = !enabled;
}

// Switch between tabs
export function setActiveMode(mode) {
    const showSplit = mode === 'split';

    elements.splitTab.classList.toggle('is-active', showSplit);
    elements.editTab.classList.toggle('is-active', !showSplit);

    elements.splitTab.setAttribute('aria-selected', String(showSplit));
    elements.editTab.setAttribute('aria-selected', String(!showSplit));

    elements.splitPanel.hidden = !showSplit;
    elements.editPanel.hidden = showSplit;
}

// Render Split mode previews
export function renderSplitPagePreviews(pages) {
    renderPageCards(elements.splitPageGrid, pages, 'split');

    elements.splitPageCount.textContent =
        `${pages.length} ${pages.length === 1 ? 'page' : 'pages'}`;
}

// Render Edit mode previews
export function renderEditPagePreviews(pages, handlers = {}) {
    renderPageCards(elements.editPageGrid, pages, 'edit', handlers);

    elements.editPageCount.textContent =
        `${pages.length} ${pages.length === 1 ? 'page' : 'pages'}`;
}

// Create individual page cards
function renderPageCards(container, pages, mode, handlers = {}) {
    const fragment = document.createDocumentFragment();

    pages.forEach((page, position) => {
        const card = document.createElement('article');
        card.className = 'page-card';

        card.dataset.originalIndex = String(page.originalIndex);

        // Preview container
        const previewFrame = document.createElement('div');
        previewFrame.className = 'preview-frame';

        const placeholder = document.createElement('span');
        placeholder.className = 'preview-placeholder';
        placeholder.textContent = 'Preparing preview...';
        placeholder.hidden = Boolean(page.thumbnail);

        const image = document.createElement('img');
        image.className = 'preview-image';

        image.alt = `Preview of original PDF page ${page.originalIndex + 1}`;
        image.loading = 'lazy';
        image.hidden = !page.thumbnail;

        if (page.thumbnail) {
            image.src = page.thumbnail;
        }

        previewFrame.append(placeholder, image);

        // Page information
        const footer = document.createElement('div');
        footer.className = 'page-card-footer';

        const label = document.createElement('div');
        label.className = 'page-label';

        const title = document.createElement('strong');
        const subtitle = document.createElement('span');

        if (mode === 'split') {
            const digits = String(pages.length).length;

            title.textContent =
                `page-${String(page.originalIndex + 1).padStart(digits, '0')}.pdf`;

            subtitle.textContent =
                `Original page ${page.originalIndex + 1}`;

        } else {
            title.textContent =
                `Original page ${page.originalIndex + 1}`;

            subtitle.textContent =
                `New position: ${position + 1}`;
        }

        label.append(title, subtitle);
        footer.append(label);

        // Edit controls
        if (mode === 'edit') {
            const actions = document.createElement('div');
            actions.className = 'page-actions';

            // Move up
            const upButton = createIconButton('↑', 'Move page up');

            upButton.disabled = position === 0;
            upButton.dataset.boundary = String(position === 0);

            upButton.addEventListener('click', () => {
                handlers.onMove?.(position, -1);
            });

            // Move down
            const downButton = createIconButton('↓', 'Move page down');

            downButton.disabled = position === pages.length - 1;
            downButton.dataset.boundary =
                String(position === pages.length - 1);

            downButton.addEventListener('click', () => {
                handlers.onMove?.(position, 1);
            });

            // Delete
            const deleteButton = createIconButton(
                '×',
                'Delete page',
                'delete-button'
            );

            deleteButton.disabled = pages.length <= 1;
            deleteButton.dataset.boundary = String(pages.length <= 1);

            deleteButton.addEventListener('click', () => {
                handlers.onDelete?.(position);
            });

            actions.append(upButton, downButton, deleteButton);
            footer.append(actions);
        }

        card.append(previewFrame, footer);
        fragment.append(card);
    });

    container.replaceChildren(fragment);
}

// Create action buttons
function createIconButton(text, label, extraClass = '') {
    const button = document.createElement('button');

    button.type = 'button';
    button.className = `icon-button ${extraClass}`.trim();
    button.textContent = text;
    button.title = label;
    button.setAttribute('aria-label', label);

    return button;
}

// Update thumbnail without rebuilding the entire page list
export function updatePageThumbnail(originalIndex, thumbnail) {
    const selector = `[data-original-index="${originalIndex}"]`;

    [
        elements.splitPageGrid,
        elements.editPageGrid
    ].forEach(container => {
        const card = container.querySelector(selector);

        if (!card) return;

        const image = card.querySelector('.preview-image');
        const placeholder = card.querySelector('.preview-placeholder');

        image.src = thumbnail;
        image.hidden = false;
        placeholder.hidden = true;
    });
}

// Disable main action buttons
export function setActionButtonsDisabled(disabled) {
    elements.splitBtn.disabled = disabled;
    elements.downloadEditedBtn.disabled = disabled;
    elements.resetBtn.disabled = disabled;
}

// Disable page controls during PDF export
export function setPageControlsDisabled(disabled) {
    elements.editPageGrid.querySelectorAll('button').forEach(button => {
        button.disabled =
            disabled || button.dataset.boundary === 'true';
    });
}

// Reset button state
export function updateResetButton(disabled) {
    elements.resetBtn.disabled = disabled;
}

// Update status message
export function setStatus(message, kind = 'info') {
    elements.status.textContent = message;
    elements.status.dataset.kind = kind;
}

// Reset workspace when uploading a new file
export function clearWorkspace() {
    elements.fileInfo.hidden = true;

    elements.splitPanel.hidden = true;
    elements.editPanel.hidden = true;

    elements.splitPageGrid.replaceChildren();
    elements.editPageGrid.replaceChildren();

    elements.splitPageCount.textContent = '0 pages';
    elements.editPageCount.textContent = '0 pages';

    setTabsEnabled(false);
    setActionButtonsDisabled(true);
}

// Format file size
function formatFileSize(bytes) {
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
