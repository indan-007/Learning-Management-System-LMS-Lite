import { initDB } from './db.js';

let allCourses = [];

export function getCourseById(id) {
    return allCourses.find(c => c.id === id);
}

/**
 * Fetches course data from JSON files, caches them in IndexedDB, and returns them.
 * @returns {Promise<Array<object>>} A promise that resolves with an array of course objects.
 */
async function fetchAndCacheCourses(force = false) {
    const db = await initDB();

    if (!force && allCourses.length > 0) {
        return allCourses;
    }

    // Try to get courses from DB first
    const cachedCourses = await new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction(['courses'], 'readonly');
            const store = transaction.objectStore('courses');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        } catch (error) {
            reject(error);
        }
    });

    if (!force && cachedCourses && cachedCourses.length > 0) {
        console.log('Loaded courses from cache.');
        allCourses = cachedCourses;
        return cachedCourses;
    }

    // If not in cache, fetch from network
    console.log('Fetching courses from network...');
    const response = await fetch('data/courses/courses.json');
    if (!response.ok) throw new Error('Failed to fetch course manifest.');

    const manifest = await response.json();
    const coursePromises = manifest.courses.map(url => fetch(url).then(res => res.json()));

    const courses = await Promise.all(coursePromises);

    // Cache the fetched courses in IndexedDB
    const transaction = db.transaction(['courses'], 'readwrite');
    const store = transaction.objectStore('courses');
    courses.forEach(course => store.put(course));

    allCourses = courses;
    return courses;
}

import { isCourseComplete } from './player.js';
import { getCurrentUser } from './auth.js';

/**
 * Renders a single course card.
 * @param {object} course The course object to render.
 * @returns {string} The HTML string for the course card.
 */
function renderCourseCard(course) {
    // The action button is rendered in a container so we can easily update it later
    // after checking the course completion status.
    return `
        <div class="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col">
            <h3 class="text-xl font-bold mb-2">${course.title}</h3>
            <p class="text-gray-600 mb-4 flex-grow">${course.description}</p>
            <div class="flex justify-between items-center mb-4">
                <span class="text-sm font-semibold text-gray-700 px-3 py-1 rounded-full ${course.difficulty === 'Beginner' ? 'bg-green-100 text-green-800' : course.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}">${course.difficulty}</span>
                <span class="text-sm text-gray-500">${course.duration}</span>
            </div>
            <div class="flex flex-wrap gap-2 mb-4">
                ${course.tags.map(tag => `<span class="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">${tag}</span>`).join('')}
            </div>
            <div id="action-btn-container-${course.id}" class="mt-auto">
                <a href="#course/${course.id}" class="block text-center bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600">View Course</a>
            </div>
        </div>
    `;
}

/**
 * Renders the course grid with the provided courses and then checks for completion status.
 * @param {Array<object>} courses The array of courses to display.
 */
function displayCourses(courses) {
    const courseGrid = document.getElementById('course-grid');
    if (!courseGrid) return;

    if (courses.length === 0) {
        courseGrid.innerHTML = '<p class="text-center col-span-full">No courses found that match your criteria.</p>';
        return;
    }

    courseGrid.innerHTML = courses.map(renderCourseCard).join('');

    // After rendering, check completion status for each card and update the button if needed.
    const user = getCurrentUser();
    if (user) {
        courses.forEach(async (course) => {
            try {
                const isComplete = await isCourseComplete(user.username, course.id);
                if (isComplete) {
                    const container = document.getElementById(`action-btn-container-${course.id}`);
                    if (container) {
                        container.innerHTML = `<a href="#certificate/${course.id}" class="block text-center bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">View Certificate</a>`;
                    }
                }
            } catch (error) {
                console.error(`Could not check completion status for course ${course.id}:`, error);
            }
        });
    }
}

/**
 * Filters courses based on current search and filter values.
 */
function filterCourses() {
    const searchTerm = document.getElementById('search-bar').value.toLowerCase();
    const difficulty = document.getElementById('filter-difficulty').value;
    const tags = document.getElementById('filter-tags').value.toLowerCase().split(',').map(t => t.trim()).filter(t => t);

    const filtered = allCourses.filter(course => {
        const matchesSearch = course.title.toLowerCase().includes(searchTerm) || course.description.toLowerCase().includes(searchTerm);
        const matchesDifficulty = !difficulty || course.difficulty === difficulty;
        const matchesTags = tags.length === 0 || tags.every(tag => course.tags.some(courseTag => courseTag.toLowerCase().includes(tag)));

        return matchesSearch && matchesDifficulty && matchesTags;
    });

    displayCourses(filtered);
}

/**
 * Initializes the course catalog, fetches data, and sets up event listeners.
 */
export async function initCatalog() {
    try {
        const courses = await fetchAndCacheCourses();
        displayCourses(courses);

        document.getElementById('search-bar').addEventListener('input', filterCourses);
        document.getElementById('filter-difficulty').addEventListener('change', filterCourses);
        document.getElementById('filter-tags').addEventListener('input', filterCourses);

        // Listen for updates from the instructor mode
        document.addEventListener('courses-updated', async () => {
            console.log('Courses updated event received, refreshing catalog...');
            // Force a re-fetch from the database
            const updatedCourses = await fetchAndCacheCourses(true);
            displayCourses(updatedCourses);
        });

    } catch (error) {
        console.error('Failed to initialize course catalog:', error);
        const courseGrid = document.getElementById('course-grid');
        if (courseGrid) {
            courseGrid.innerHTML = '<p class="text-center col-span-full text-red-500">Could not load courses. Please try again later.</p>';
        }
    }
}
