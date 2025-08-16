import { getCourseById } from './catalog.js';
import { getCurrentUser } from './auth.js';

/**
 * Generates the SVG markup for the certificate.
 * @param {string} userName
 * @param {string} courseTitle
 * @param {string} completionDate
 * @returns {string} SVG string
 */
function createCertificateSVG(userName, courseTitle, completionDate) {
    // Using template literals for a readable SVG template
    return `
        <svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg" style="background-color: #f3f9ff; font-family: sans-serif;">
            <rect x="10" y="10" width="780" height="580" fill="none" stroke="#1e40af" stroke-width="8"/>
            <rect x="25" y="25" width="750" height="550" fill="none" stroke="#60a5fa" stroke-width="2"/>

            <text x="400" y="120" font-family="'Georgia', serif" font-size="48" text-anchor="middle" fill="#1e3a8a">
                Certificate of Completion
            </text>

            <text x="400" y="200" font-size="24" text-anchor="middle" fill="#333">
                This certificate is proudly presented to
            </text>

            <text x="400" y="300" font-family="'Brush Script MT', cursive" font-size="60" text-anchor="middle" fill="#059669">
                ${userName}
            </text>

            <text x="400" y="380" font-size="24" text-anchor="middle" fill="#333">
                for successfully completing the course
            </text>

            <text x="400" y="450" font-family="'Georgia', serif" font-size="36" text-anchor="middle" font-weight="bold" fill="#1e3a8a">
                ${courseTitle}
            </text>

            <text x="150" y="540" font-size="16" text-anchor="middle" fill="#555">
                Date: ${completionDate}
            </text>

            <text x="650" y="540" font-family="'Georgia', serif" font-size="16" text-anchor="middle" fill="#555" font-style="italic">
                LMS Lite
            </text>
        </svg>
    `;
}

/**
 * Converts an SVG string to a data URL for embedding in images.
 * @param {string} svgString The raw SVG string.
 * @returns {string} The data URL.
 */
function svgToDataURL(svgString) {
    // Using btoa for better handling of binary characters
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;
}

/**
 * Renders the certificate and sets up download buttons.
 * @param {string} courseId
 */
export async function renderCertificate(courseId) {
    const viewer = document.getElementById('certificate-viewer');
    const actions = document.getElementById('certificate-actions');

    try {
        const user = getCurrentUser();
        if (!user) {
            throw new Error('You must be logged in to view certificates.');
        }

        const course = await getCourseById(courseId);
        if (!course) {
            throw new Error('Course not found.');
        }

        const completionDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const svgString = createCertificateSVG(user.username, course.title, completionDate);

        viewer.innerHTML = svgString;
        actions.classList.remove('hidden');

        const svgElement = viewer.querySelector('svg');

        // Setup download buttons
        document.getElementById('download-svg-btn').onclick = () => downloadSVG(svgString, course.id);
        document.getElementById('download-png-btn').onclick = () => downloadPNG(svgElement, course.id);
        document.getElementById('download-pdf-btn').onclick = () => downloadPDF(svgElement, course.id);

    } catch (error) {
        console.error('Failed to render certificate:', error);
        viewer.innerHTML = `<p class="text-red-500">${error.message}</p>`;
        actions.classList.add('hidden');
    }
}

function downloadSVG(svgString, courseId) {
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate-${courseId}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function downloadPNG(svgElement, courseId) {
    const canvas = document.createElement('canvas');
    const scale = 2; // Render at 2x for better quality
    canvas.width = svgElement.width.baseVal.value * scale;
    canvas.height = svgElement.height.baseVal.value * scale;
    const ctx = canvas.getContext('2d');

    const svgString = new XMLSerializer().serializeToString(svgElement);
    const img = new Image();
    img.src = svgToDataURL(svgString);

    img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `certificate-${courseId}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };
}

function downloadPDF(svgElement, courseId) {
    const { jsPDF } = window.jspdf;
    const canvas = document.createElement('canvas');
    const scale = 2;
    canvas.width = svgElement.width.baseVal.value * scale;
    canvas.height = svgElement.height.baseVal.value * scale;
    const ctx = canvas.getContext('2d');

    const svgString = new XMLSerializer().serializeToString(svgElement);
    const img = new Image();
    img.src = svgToDataURL(svgString);

    img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL('image/png');

        // Use the SVG dimensions for the PDF page size
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [svgElement.width.baseVal.value, svgElement.height.baseVal.value]
        });

        pdf.addImage(pngUrl, 'PNG', 0, 0, svgElement.width.baseVal.value, svgElement.height.baseVal.value);
        pdf.save(`certificate-${courseId}.pdf`);
    };
}
