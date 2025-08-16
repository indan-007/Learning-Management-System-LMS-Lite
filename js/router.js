/**
 * A simple hash-based router.
 */

// Define the routes and their corresponding handlers.
// The handler is just a name that will be used in a custom event.
const routes = {
    '': 'home', // Default route
    '#/courses': 'courses',
    '#/login': 'login',
    '#/register': 'register',
    '#/course/:id': 'course',
    '#/course/:id/lesson/:lessonId': 'lesson',
    '#/certificate/:id': 'certificate',
    '#/instructor': 'instructor',
    '#/create-course': 'createCourse',
    '#/edit-course/:id': 'editCourse'
};

/**
 * Parses the current URL hash to find a matching route.
 * @returns {{handler: string, params: object, path: string}} The matched handler, URL parameters, and path.
 */
function parseRoute() {
    const path = window.location.hash || '#';

    // Handle the case where the hash is just '#'
    if (path === '#') {
        return { handler: routes[''], params: {}, path: '#' };
    }

    for (const route in routes) {
        // Create a regex from the route string (e.g., '#/course/:id' -> /^#\/course\/([\w-]+)$/)
        const paramNames = [];
        const regexPath = route.replace(/:(\w+)/g, (_, paramName) => {
            paramNames.push(paramName);
            return '([\\w-]+)'; // Match one or more word characters or hyphens
        });

        const regex = new RegExp(`^${regexPath}$`);
        const match = path.match(regex);

        if (match) {
            const params = {};
            paramNames.forEach((name, index) => {
                params[name] = match[index + 1];
            });
            return { handler: routes[route], params, path };
        }
    }

    return { handler: '404', params: {}, path }; // Not found handler
}

/**
 * Handles the route change event.
 * It parses the new route and dispatches a custom event for other modules to listen to.
 */
function handleRouteChange() {
    const { handler, params, path } = parseRoute();
    console.log(`Route changed:`, { handler, params, path });

    // Dispatch a custom event so other parts of the app can react to route changes.
    // This decouples the router from the UI update logic.
    document.dispatchEvent(new CustomEvent('route-change', {
        detail: { handler, params, path }
    }));
}

/**
 * Initializes the router by adding event listeners for hash changes and initial page load.
 */
export function initRouter() {
    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('load', () => {
        // Handle the initial route on page load.
        // If there's no hash, redirect to the default view.
        if (!window.location.hash) {
            window.location.hash = '#';
        }
        handleRouteChange();
    });
    console.log('Router initialized.');
}
