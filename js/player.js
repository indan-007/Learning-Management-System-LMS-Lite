import { initDB } from './db.js';
import { getCurrentUser } from './auth.js';
import { showAlert } from './ui.js';
import { renderQuiz } from './quiz.js';

// Initialize markdown-it once
const md = window.markdownit({
    html: true, // Enable HTML tags in source
    linkify: true, // Autoconvert URL-like text to links
    typographer: true, // Enable smartquotes and other typographic replacements
});

let currentCourse = null;
let currentLessonIndex = -1;

/**
 * Fetches a single course from IndexedDB.
 * @param {string} courseId The ID of the course to fetch.
 * @returns {Promise<object>} The course object.
 */
async function getCourse(courseId) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['courses'], 'readonly');
        const store = transaction.objectStore('courses');
        const request = store.get(courseId);
        request.onsuccess = () => {
            if (request.result) {
                resolve(request.result);
            } else {
                reject(new Error(`Course with ID ${courseId} not found in DB.`));
            }
        };
        request.onerror = (e) => reject(e.target.error);
    });
}

/**
 * Renders the lesson player for a specific course and lesson.
 * This function is exported and called by the UI module.
 * @param {string} courseId
 * @param {string} lessonId
 */
export async function renderLessonPlayer(courseId, lessonId) {
    try {
        currentCourse = await getCourse(courseId);
        currentLessonIndex = currentCourse.lessons.findIndex(l => l.lessonId === lessonId);

        if (currentLessonIndex === -1) {
            throw new Error(`Lesson with ID ${lessonId} not found in course ${courseId}.`);
        }

        const lesson = currentCourse.lessons[currentLessonIndex];

        document.getElementById('lesson-title').textContent = lesson.title;
        const breadcrumb = document.getElementById('course-title-breadcrumb');
        breadcrumb.textContent = `Back to ${currentCourse.title}`;
        // A course detail page would be better, but for now, back to the catalog.
        breadcrumb.onclick = () => window.location.hash = `#courses`;

        const lessonContentEl = document.getElementById('lesson-content');
        const lessonNavEl = document.getElementById('lesson-navigation');

        if (lesson.type === 'quiz') {
            // This is a quiz, so render the quiz UI instead of Markdown
            renderQuiz(lessonContentEl, lesson, () => markCurrentLessonComplete());
            lessonNavEl.classList.add('hidden'); // Hide prev/next/complete buttons
        } else {
            // This is a standard Markdown lesson
            lessonContentEl.innerHTML = md.render(lesson.content || '');
            Prism.highlightAll(); // Apply syntax highlighting
            lessonNavEl.classList.remove('hidden'); // Show prev/next/complete buttons
            updateCompletionStatus();
        }

        updateNavigationButtons();

    } catch (error) {
        console.error('Failed to render lesson player:', error);
        // In a real app, a more robust error UI would be shown.
        document.getElementById('main-content').innerHTML = `<p class="text-center text-red-500 p-8">${error.message}</p>`;
    }
}

/**
 * Updates the state and event listeners for the previous/next lesson buttons.
 */
function updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-lesson-btn');
    const nextBtn = document.getElementById('next-lesson-btn');

    prevBtn.disabled = currentLessonIndex <= 0;
    nextBtn.disabled = currentLessonIndex >= currentCourse.lessons.length - 1;

    prevBtn.onclick = () => {
        if (currentLessonIndex > 0) {
            const prevLesson = currentCourse.lessons[currentLessonIndex - 1];
            window.location.hash = `#course/${currentCourse.id}/lesson/${prevLesson.lessonId}`;
        }
    };

    nextBtn.onclick = () => {
        if (currentLessonIndex < currentCourse.lessons.length - 1) {
            const nextLesson = currentCourse.lessons[currentLessonIndex + 1];
            window.location.hash = `#course/${currentCourse.id}/lesson/${nextLesson.lessonId}`;
        }
    };
}

/**
 * Checks if the current lesson is complete for the logged-in user and updates the UI.
 */
async function updateCompletionStatus() {
    const user = getCurrentUser();
    const completeBtn = document.getElementById('complete-lesson-btn');

    if (!user) {
        completeBtn.textContent = 'Login to Track Progress';
        completeBtn.disabled = true;
        return;
    }

    const lesson = currentCourse.lessons[currentLessonIndex];
    const isComplete = await isLessonComplete(user.username, currentCourse.id, lesson.lessonId);

    if (isComplete) {
        completeBtn.textContent = 'Completed';
        completeBtn.disabled = true;
        completeBtn.classList.replace('bg-green-500', 'bg-gray-400');
    } else {
        completeBtn.textContent = 'Mark as Complete';
        completeBtn.disabled = false;
        completeBtn.classList.add('bg-green-500');
        completeBtn.classList.remove('bg-gray-400');
        completeBtn.onclick = () => markCurrentLessonComplete();
    }
}

/**
 * Checks the database to see if a lesson has been completed by a user.
 * @param {string} username
 * @param {string} courseId
 * @param {string} lessonId
 * @returns {Promise<boolean>}
 */
async function isLessonComplete(username, courseId, lessonId) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['user_progress'], 'readonly');
        const store = transaction.objectStore('user_progress');
        const index = store.index('userLesson');
        const request = index.get([username, courseId, lessonId]);
        request.onsuccess = () => resolve(!!request.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

/**
 * Marks the current lesson as complete for the logged-in user.
 */
export async function isCourseComplete(username, courseId) {
    const db = await initDB();
    const course = await getCourse(courseId);
    if (!course || !course.lessons) return false;

    const progressTx = await db.transaction(['user_progress'], 'readonly');
    const progressStore = progressTx.objectStore('user_progress');
    const userLessonIndex = progressStore.index('userLesson');

    const allLessons = course.lessons;

    const completionPromises = allLessons.map(lesson => {
        return new Promise((resolve, reject) => {
            const request = userLessonIndex.get([username, courseId, lesson.lessonId]);
            request.onsuccess = () => resolve(!!request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    });

    const completions = await Promise.all(completionPromises);
    return completions.length > 0 && completions.every(c => c === true);
}

async function markCurrentLessonComplete() {
    const user = getCurrentUser();
    if (!user) {
        showAlert('You must be logged in to track progress.', 'error');
        return;
    }

    const lesson = currentCourse.lessons[currentLessonIndex];
    const db = await initDB();
    const transaction = db.transaction(['user_progress'], 'readwrite');
    const store = transaction.objectStore('user_progress');

    const request = store.add({
        username: user.username,
        courseId: currentCourse.id,
        lessonId: lesson.lessonId,
        completedAt: new Date()
    });

    transaction.oncomplete = () => {
        console.log('Lesson marked as complete');
        showAlert('Lesson completed!', 'success');
        updateCompletionStatus();
    };

    transaction.onerror = (e) => {
        console.error('Failed to mark lesson as complete:', e.target.error);
        showAlert('Error saving progress. You may have already completed this lesson.', 'error');
        // Prevent default error handling (which might abort the transaction)
        e.preventDefault();
    };
}
