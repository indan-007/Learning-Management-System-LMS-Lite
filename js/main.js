import { initDB } from './db.js';
import { initAuth, register, login, logout } from './auth.js';
import { initCatalog, getCourseById } from './catalog.js';
import { initRouter } from './router.js';
import * as ui from './ui.js';

/**
 * Main application initialization function.
 * This function is the entry point of the application.
 */
async function initApp() {
    // Register Service Worker for PWA capabilities
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(error => {
                    console.log('ServiceWorker registration failed: ', error);
                });
        });
    }

    ui.showSpinner();
    try {
        // Initialize all core modules
        await initDB();
        initAuth();     // Checks for an existing session and dispatches 'auth-change'
        initRouter();   // Sets up route handling and dispatches the initial 'route-change'
        await initCatalog(); // Fetches course data and populates the catalog view

        // Setup all event listeners for the application
        setupEventListeners();

        console.log('LMS Lite application initialized successfully.');

    } catch (error) {
        console.error('Failed to initialize application:', error);
        ui.showAlert('Application failed to load. Please try again later.', 'error');
    } finally {
        ui.hideSpinner();
    }
}

/**
 * Sets up all the global event listeners for the application.
 */
function setupEventListeners() {
    // 1. Listen for route changes from router.js
    document.addEventListener('route-change', (e) => {
        const { handler, params, path } = e.detail;

        // On every route change, we might want to hide any alerts
        // This is a simple way to clear transient messages

        switch (handler) {
            case 'home':
            case 'courses':
                ui.renderHomePage();
                break;
            case 'login':
                ui.renderLoginPage();
                break;
            case 'register':
                ui.renderRegisterPage();
                break;
            case 'course':
                {
                    // For now, a "course" route just redirects to its first lesson.
                    // A full implementation might show a course detail page.
                    const course = getCourseById(params.id);
                    if (course && course.lessons && course.lessons.length > 0) {
                        window.location.hash = `#course/${params.id}/lesson/${course.lessons[0].lessonId}`;
                    } else {
                        ui.renderNotFoundPage(path);
                    }
                    break;
                }
            case 'lesson':
                ui.renderLessonPage(params.id, params.lessonId);
                break;
            case 'certificate':
                ui.renderCertificatePage(params.id);
                break;
            case 'instructor':
                ui.renderInstructorDashboardPage();
                break;
            case 'createCourse':
                ui.renderCourseEditorPage();
                break;
            case 'editCourse':
                ui.renderCourseEditorPage(params.id);
                break;
            default:
                ui.renderNotFoundPage(path);
                break;
        }
    });

    // 2. Listen for auth state changes from auth.js
    document.addEventListener('auth-change', (e) => {
        const { loggedIn } = e.detail;
        ui.updateNav(loggedIn);
    });

    // 3. Auth form submissions
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = loginForm.username.value.trim();
            const password = loginForm.password.value;
            try {
                await login(username, password);
                window.location.hash = '#'; // Redirect to home after login
                document.dispatchEvent(new CustomEvent('auth-change', { detail: { loggedIn: true } }));
                ui.showAlert('Login successful!', 'success');
            } catch (error) {
                console.error(error);
                ui.showAlert(error.message, 'error');
            }
        });
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = registerForm.username.value.trim();
            const password = registerForm.password.value;
            if (password.length < 6) {
                ui.showAlert('Password must be at least 6 characters long.', 'error');
                return;
            }
            try {
                await register(username, password);
                window.location.hash = '#login'; // Redirect to login after registration
                ui.showAlert('Registration successful! Please log in.', 'success');
            } catch (error) {
                console.error(error);
                ui.showAlert(error.message, 'error');
            }
        });
    }

    // 4. Logout button
    const logoutNav = document.getElementById('logout-nav');
    if (logoutNav) {
        logoutNav.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
            window.location.hash = '#';
            ui.showAlert('You have been logged out.', 'info');
        });
    }

    // 5. Links to switch between login/register forms
    const showRegisterLink = document.getElementById('show-register');
    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = '#register';
        });
    }

    const showLoginLink = document.getElementById('show-login');
    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = '#login';
        });
    }
}

// Start the application once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);
