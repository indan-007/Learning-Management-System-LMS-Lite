import { initDB } from './db.js';

let currentUser = null;
const SESSION_STORAGE_KEY = 'lms_lite_session';

/**
 * Hashes a password using the Web Crypto API (SHA-256).
 * @param {string} password The password to hash.
 * @returns {Promise<string>} A promise that resolves with the hex-encoded hash.
 */
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * Registers a new user.
 * @param {string} username The username.
 * @param {string} password The password.
 * @returns {Promise<boolean>} A promise that resolves to true if registration is successful, false otherwise.
 */
export async function register(username, password) {
    const db = await initDB();
    const hashedPassword = await hashPassword(password);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['users'], 'readwrite');
        const store = transaction.objectStore('users');
        const request = store.add({ username, hashedPassword });

        request.onsuccess = () => {
            console.log('User registered successfully');
            resolve(true);
        };

        request.onerror = (event) => {
            console.error('Registration error:', event.target.error);
            // It's likely a duplicate username (ConstraintError)
            reject(new Error('Registration failed. Username may already exist.'));
        };
    });
}

/**
 * Logs in a user.
 * @param {string} username The username.
 * @param {string} password The password.
 * @returns {Promise<object>} A promise that resolves with the user object if login is successful.
 */
export async function login(username, password) {
    const db = await initDB();
    const hashedPassword = await hashPassword(password);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        const request = store.get(username);

        request.onsuccess = (event) => {
            const user = event.target.result;
            if (user && user.hashedPassword === hashedPassword) {
                console.log('Login successful');
                currentUser = { username: user.username };
                // Simulate a session token
                const sessionId = self.crypto.randomUUID();
                sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ sessionId, username }));
                resolve(currentUser);
            } else {
                console.log('Login failed: Invalid username or password');
                reject(new Error('Invalid username or password.'));
            }
        };

        request.onerror = (event) => {
            console.error('Login error:', event.target.error);
            reject(new Error('An error occurred during login.'));
        };
    });
}

/**
 * Logs out the current user.
 */
export function logout() {
    currentUser = null;
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    console.log('User logged out.');
    // This event will be used by ui.js to update the interface
    document.dispatchEvent(new CustomEvent('auth-change', { detail: { loggedIn: false } }));
}

/**
 * Checks if a user is currently logged in by checking session storage.
 * This should be called on app initialization.
 * @returns {object | null} The current user object or null.
 */
export function getCurrentUser() {
    if (currentUser) {
        return currentUser;
    }
    try {
        const session = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (session) {
            const { username } = JSON.parse(session);
            if (username) {
                currentUser = { username };
                return currentUser;
            }
        }
    } catch (error) {
        console.error('Error parsing session data:', error);
        sessionStorage.removeItem(SESSION_STORAGE_KEY); // Clear corrupted session data
    }
    return null;
}

/**
 * Initializes the auth system, checking for an existing session and updating the UI.
 */
export function initAuth() {
    getCurrentUser();
    // This event will be used by ui.js to update the interface
    document.dispatchEvent(new CustomEvent('auth-change', { detail: { loggedIn: !!currentUser } }));
}
