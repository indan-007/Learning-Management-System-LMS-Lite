// A collection of all major sections that can be shown/hidden
const allSections = [
    'login-section',
    'register-section',
    'course-catalog-section',
    'lesson-player-section',
    'certificate-section',
    'instructor-dashboard-section',
    'course-editor-section'
];

/**
 * Hides all main content sections and shows only the specified one.
 * Traverses the main content area and applies 'hidden' class to all direct children,
 * then removes it from the target section.
 * @param {string} activeSectionId The ID of the section to make visible.
 */
export function showSection(activeSectionId) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    // Hide all direct child sections of main
    for (const child of mainContent.children) {
        if (child.tagName === 'SECTION') {
            child.classList.add('hidden');
        }
    }

    // Show the active section
    const activeSection = document.getElementById(activeSectionId);
    if (activeSection) {
        activeSection.classList.remove('hidden');
    }
}

/**
 * Updates the main navigation links based on the user's authentication status.
 * @param {boolean} isLoggedIn - True if the user is logged in, false otherwise.
 */
export function updateNav(isLoggedIn) {
    const loginNav = document.getElementById('login-nav');
    const registerNav = document.getElementById('register-nav');
    const logoutNav = document.getElementById('logout-nav');

    if (!loginNav || !registerNav || !logoutNav) return;

    if (isLoggedIn) {
        loginNav.classList.add('hidden');
        registerNav.classList.add('hidden');
        logoutNav.classList.remove('hidden');
    } else {
        loginNav.classList.remove('hidden');
        registerNav.classList.remove('hidden');
        logoutNav.classList.add('hidden');
    }
}

/**
 * Renders the Home page view, which is the course catalog.
 */
export function renderHomePage() {
    showSection('course-catalog-section');
}

/**
 * Renders the Login page view.
 */
export function renderLoginPage() {
    showSection('login-section');
}

import { renderLessonPlayer } from './player.js';
import { renderCertificate } from './cert.js';
import { renderInstructorDashboard, renderCourseEditor } from './instructor.js';

/**
 * Renders the Register page view.
 */
export function renderRegisterPage() {
    showSection('register-section');
}

/**
 * Renders the Instructor Dashboard page view.
 */
export function renderInstructorDashboardPage() {
    showSection('instructor-dashboard-section');
    renderInstructorDashboard();
}

/**
 * Renders the Course Editor page view.
 * @param {string} [courseId] - The ID of the course to edit, or undefined for a new course.
 */
export function renderCourseEditorPage(courseId) {
    showSection('course-editor-section');
    renderCourseEditor(courseId);
}

/**
 * Renders the Lesson Player page view.
 * @param {string} courseId
 * @param {string} lessonId
 */
export function renderLessonPage(courseId, lessonId) {
    showSection('lesson-player-section');
    renderLessonPlayer(courseId, lessonId);
}

/**
 * Renders the Certificate page view.
 * @param {string} courseId
 */
export function renderCertificatePage(courseId) {
    showSection('certificate-section');
    renderCertificate(courseId);
}

/**
 * Renders a 404 Not Found page within the main content area.
 * @param {string} path - The hash path that could not be found.
 */
export function renderNotFoundPage(path) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    // Hide all sections before showing the 404 message
    for (const child of mainContent.children) {
        if (child.tagName === 'SECTION') {
            child.classList.add('hidden');
        }
    }

    // Check if a 404 message is already there to avoid duplicates
    let notFoundContainer = document.getElementById('not-found-section');
    if (!notFoundContainer) {
        notFoundContainer = document.createElement('div');
        notFoundContainer.id = 'not-found-section';
        mainContent.appendChild(notFoundContainer);
    }

    notFoundContainer.innerHTML = `
        <div class="text-center py-16">
            <h2 class="text-4xl font-bold text-gray-800">404 - Page Not Found</h2>
            <p class="mt-4 text-lg text-gray-600">The resource at <code>${path}</code> could not be found.</p>
            <a href="#" class="mt-6 inline-block bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors">Go Home</a>
        </div>
    `;
}

/**
 * Shows a simple alert message at the top of the page.
 * @param {string} message The message to display.
 * @param {string} type The type of alert ('success', 'error', 'info').
 */
export function showAlert(message, type = 'info') {
    const alertContainer = document.createElement('div');
    const colorClasses = {
        success: 'bg-green-100 border-green-400 text-green-700',
        error: 'bg-red-100 border-red-400 text-red-700',
        info: 'bg-blue-100 border-blue-400 text-blue-700',
    };

    alertContainer.className = `border px-4 py-3 rounded relative ${colorClasses[type] || colorClasses['info']}`;
    alertContainer.role = 'alert';
    alertContainer.innerHTML = `<span class="block sm:inline">${message}</span>`;

    document.body.prepend(alertContainer);

    setTimeout(() => {
        alertContainer.remove();
    }, 5000);
}

/**
 * Shows a full-screen loading spinner.
 */
export function showSpinner() {
    document.getElementById('loading-spinner').classList.remove('hidden');
}

/**
 * Hides the full-screen loading spinner.
 */
export function hideSpinner() {
    document.getElementById('loading-spinner').classList.add('hidden');
}
