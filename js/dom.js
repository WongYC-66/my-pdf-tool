
export const elements = {
    pdfInput: document.getElementById('pdfInput'),
    fileInfo: document.getElementById('fileInfo'),
    fileName: document.getElementById('fileName'),
    fileDetails: document.getElementById('fileDetails'),
    splitBtn: document.getElementById('splitBtn'),
    status: document.getElementById('status')
};

export function displayFileInfo(file) {
    elements.fileName.textContent = file.name;

    elements.fileDetails.textContent =
        `${(file.size / 1024 / 1024).toFixed(2)} MB`;

    elements.fileInfo.style.display = 'block';
}

export function updateStatus(message) {
    elements.status.textContent = message;
}

export function setButtonDisabled(disabled) {
    elements.splitBtn.disabled = disabled;
}
