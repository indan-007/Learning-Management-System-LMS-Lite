import { initDB } from './db.js';
import { showAlert } from './ui.js';

async function getAllCourses() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['courses'], 'readonly');
        const store = transaction.objectStore('courses');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result.sort((a, b) => a.title.localeCompare(b.title)));
        request.onerror = (e) => reject(e.target.error);
    });
}

function handleCourseExport(course) {
    try {
        const jsonString = JSON.stringify(course, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${course.id || 'course'}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showAlert('Course exported successfully!', 'success');
    } catch (error) {
        console.error('Failed to export course:', error);
        showAlert('Could not export course.', 'error');
    }
}

export async function renderInstructorDashboard() {
    const dashboardEl = document.querySelector('#instructor-dashboard-section');
    if (!dashboardEl) return;
    const courseListEl = dashboardEl.querySelector('#instructor-course-list');

    // Add reset button if not present
    if (!dashboardEl.querySelector('#reset-app-data')) {
        const actionsContainer = dashboardEl.querySelector('.flex.gap-4');
        const resetButton = document.createElement('button');
        resetButton.id = 'reset-app-data';
        resetButton.className = 'bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700';
        resetButton.textContent = 'Reset All Data';
        actionsContainer.appendChild(resetButton);
        resetButton.addEventListener('click', handleResetData);
    }

    try {
        const courses = await getAllCourses();
        if (courses.length === 0) {
            courseListEl.innerHTML = '<p class="text-center text-gray-500">No courses found. Create one or import one to get started.</p>';
            return;
        }

        courseListEl.innerHTML = `
            <div class="space-y-3">
                ${courses.map(course => `
                    <div class="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div>
                            <h4 class="font-bold text-lg">${course.title}</h4>
                            <p class="text-sm text-gray-500">ID: ${course.id} | ${course.lessons ? course.lessons.length : 0} lessons</p>
                        </div>
                        <div class="flex gap-2">
                            <a href="#/edit-course/${course.id}" class="bg-yellow-500 text-white py-1 px-3 rounded-md hover:bg-yellow-600 text-sm font-medium">Edit</a>
                            <button data-course-id="${course.id}" class="export-btn bg-blue-500 text-white py-1 px-3 rounded-md hover:bg-blue-600 text-sm font-medium">Export JSON</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        courseListEl.querySelectorAll('.export-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const courseId = button.dataset.courseId;
                const course = courses.find(c => c.id === courseId);
                if (course) {
                    handleCourseExport(course);
                }
            });
        });

    } catch (error) {
        console.error('Failed to render instructor dashboard:', error);
        courseListEl.innerHTML = '<p class="text-center text-red-500">Error loading courses.</p>';
    }

    setupDashboardListeners();
}

// --- Course Editor Rendering ---

function getQuizEditorHTML(lesson = {}, lessonIndex) {
    const questions = lesson.questions || [{ question: '', options: ['', ''], correctAnswers: [''] }];
    return `
        <div class="p-4 bg-gray-100 rounded-md space-y-4">
            <h5 class="font-semibold">Quiz Questions</h5>
            <div class="quiz-questions-container space-y-4">
            ${questions.map((q, qIndex) => `
                <div class="p-3 border bg-white rounded-md quiz-question-form" data-q-index="${qIndex}">
                    <label class="block text-sm font-medium">Question ${qIndex + 1}</label>
                    <input type="text" class="question-title-input mt-1 block w-full" value="${q.question || ''}" placeholder="Question text">

                    <label class="block text-sm font-medium mt-2">Options (one per line)</label>
                    <textarea rows="3" class="question-options-input mt-1 block w-full">${(q.options || []).join('\n')}</textarea>

                    <label class="block text-sm font-medium mt-2">Correct Answer(s) (one per line, must match option text)</label>
                    <textarea rows="2" class="question-correct-input mt-1 block w-full">${(q.correctAnswers || []).join('\n')}</textarea>

                    <label class="block text-sm font-medium mt-2">Question Type</label>
                    <select class="question-type-select mt-1 block w-full">
                        <option value="mcq" ${q.type !== 'multi-select' ? 'selected' : ''}>Multiple Choice (one answer)</option>
                        <option value="multi-select" ${q.type === 'multi-select' ? 'selected' : ''}>Multiple Select (many answers)</option>
                    </select>
                </div>
            `).join('')}
            </div>
            <button type="button" class="add-question-btn bg-white py-1 px-3 rounded-md text-sm">Add Question</button>
        </div>
    `;
}

function getLessonFormHTML(lesson = {}, index) {
    const lessonId = lesson.lessonId || `new-${Date.now()}`;
    const isQuiz = lesson.type === 'quiz';

    const contentEditor = isQuiz
        ? getQuizEditorHTML(lesson, index)
        : `<textarea rows="8" class="lesson-content-input mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="Markdown content...">${lesson.content || ''}</textarea>`;

    return `
        <div class="p-4 border rounded-lg space-y-4 lesson-form bg-white" data-index="${index}">
            <div class="flex justify-between items-center">
                <h4 class="text-lg font-bold">Lesson ${index + 1}</h4>
                <button type="button" class="remove-lesson-btn text-red-500 hover:text-red-700 font-medium">Remove</button>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Lesson Title</label>
                <input type="text" value="${lesson.title || ''}" class="lesson-title-input mt-1 block w-full rounded-md border-gray-300 shadow-sm" required>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Lesson Type</label>
                <select class="lesson-type-select mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                    <option value="lesson" ${!isQuiz ? 'selected' : ''}>Markdown Lesson</option>
                    <option value="quiz" ${isQuiz ? 'selected' : ''}>Quiz</option>
                </select>
            </div>
            <div class="lesson-content-editor">
                ${contentEditor}
            </div>
            <input type="hidden" class="lesson-id-input" value="${lessonId}">
        </div>
    `;
}

export async function renderCourseEditor(courseId) {
    const editorTitle = document.getElementById('editor-title');
    const form = document.getElementById('course-editor-form');
    const lessonsContainer = document.getElementById('lessons-editor-container');

    form.reset();
    lessonsContainer.innerHTML = '';
    document.getElementById('course-id').value = '';

    if (courseId) {
        editorTitle.textContent = 'Edit Course';
        const db = await initDB();
        const course = await new Promise(res => db.transaction('courses').objectStore('courses').get(courseId).onsuccess = e => res(e.target.result));

        if (course) {
            document.getElementById('course-id').value = course.id;
            document.getElementById('course-title').value = course.title;
            document.getElementById('course-description').value = course.description;
            document.getElementById('course-difficulty').value = course.difficulty;
            document.getElementById('course-duration').value = course.duration;
            document.getElementById('course-tags').value = course.tags.join(', ');

            if (course.lessons && course.lessons.length > 0) {
                course.lessons.forEach((lesson, index) => {
                    lessonsContainer.innerHTML += getLessonFormHTML(lesson, index);
                });
            } else {
                 lessonsContainer.innerHTML = getLessonFormHTML({}, 0);
            }
        }
    } else {
        editorTitle.textContent = 'Create New Course';
        lessonsContainer.innerHTML = getLessonFormHTML({}, 0);
    }

    setupEditorListeners();
}

// --- Event Listeners and Handlers ---

async function handleResetData() {
    if (confirm('Are you sure you want to delete ALL application data, including users and courses? This cannot be undone.')) {
        try {
            showAlert('Resetting all data...', 'info');
            const db = await initDB();
            const tx = db.transaction(['users', 'courses', 'user_progress'], 'readwrite');

            const usersStore = tx.objectStore('users');
            const coursesStore = tx.objectStore('courses');
            const progressStore = tx.objectStore('user_progress');

            usersStore.clear();
            coursesStore.clear();
            progressStore.clear();

            await new Promise(resolve => tx.oncomplete = resolve);

            sessionStorage.clear();
            localStorage.clear();

            // Force a full reload to clear all state
            window.location.reload();
        } catch (error) {
            console.error('Failed to reset data:', error);
            showAlert('Could not reset data.', 'error');
        }
    }
}

async function handleCourseSave(event) {
    event.preventDefault();
    const form = event.target;

    const course = {
        id: form.querySelector('#course-id').value,
        title: form.querySelector('#course-title').value.trim(),
        description: form.querySelector('#course-description').value.trim(),
        difficulty: form.querySelector('#course-difficulty').value,
        duration: form.querySelector('#course-duration').value.trim(),
        tags: form.querySelector('#course-tags').value.split(',').map(t => t.trim()).filter(Boolean),
        lessons: []
    };

    if (!course.id) {
        course.id = course.title.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    }

    const lessonForms = form.querySelectorAll('.lesson-form');
    lessonForms.forEach((lessonForm, index) => {
        const lesson = {
            lessonId: lessonForm.querySelector('.lesson-id-input').value,
            title: lessonForm.querySelector('.lesson-title-input').value.trim(),
            type: lessonForm.querySelector('.lesson-type-select').value,
        };

        if (lesson.type === 'quiz') {
            lesson.questions = [];
            const questionForms = lessonForm.querySelectorAll('.quiz-question-form');
            questionForms.forEach(qForm => {
                lesson.questions.push({
                    question: qForm.querySelector('.question-title-input').value,
                    options: qForm.querySelector('.question-options-input').value.split('\n').filter(Boolean),
                    correctAnswers: qForm.querySelector('.question-correct-input').value.split('\n').filter(Boolean),
                    type: qForm.querySelector('.question-type-select').value,
                });
            });
        } else {
            lesson.content = lessonForm.querySelector('.lesson-content-input').value;
        }
        course.lessons.push(lesson);
    });

    try {
        const db = await initDB();
        const tx = db.transaction('courses', 'readwrite');
        const store = tx.objectStore('courses');
        store.put(course);
        await new Promise(resolve => tx.oncomplete = resolve);

        showAlert('Course saved successfully!', 'success');
        document.dispatchEvent(new CustomEvent('courses-updated'));
        window.location.hash = '#instructor';

    } catch (error) {
        console.error('Failed to save course:', error);
        showAlert('Error saving course.', 'error');
    }
}

async function handleCourseImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const course = JSON.parse(e.target.result);
            // Basic validation
            if (!course.id || !course.title || !course.lessons) {
                throw new Error('Invalid course file format.');
            }

            const db = await initDB();
            const tx = db.transaction('courses', 'readwrite');
            const store = tx.objectStore('courses');
            store.put(course);
            await new Promise(resolve => tx.oncomplete = resolve);

            showAlert(`Course "${course.title}" imported successfully!`, 'success');
            document.dispatchEvent(new CustomEvent('courses-updated'));
            renderInstructorDashboard();

        } catch (error) {
            console.error('Failed to import course:', error);
            showAlert(`Error importing course: ${error.message}`, 'error');
        }
    };
    reader.readAsText(file);
}

function setupDashboardListeners() {
    const importInput = document.getElementById('import-course-input');
    if (importInput && !importInput.dataset.listenerAdded) {
        importInput.addEventListener('change', handleCourseImport);
        importInput.dataset.listenerAdded = 'true';
    }

    const resetButton = document.getElementById('reset-app-data');
    if (resetButton && !resetButton.dataset.listenerAdded) {
        resetButton.addEventListener('click', handleResetData);
        resetButton.dataset.listenerAdded = 'true';
    }
}

function setupEditorListeners() {
    const form = document.getElementById('course-editor-form');
    if (form.dataset.listenersAdded) return;
    form.dataset.listenersAdded = 'true';

    form.addEventListener('submit', handleCourseSave);

    form.addEventListener('click', (e) => {
        if (e.target.id === 'add-lesson-btn') {
            const lessonsContainer = document.getElementById('lessons-editor-container');
            const newIndex = lessonsContainer.children.length;
            lessonsContainer.insertAdjacentHTML('beforeend', getLessonFormHTML({}, newIndex));
        }
        if (e.target.classList.contains('remove-lesson-btn')) {
            e.target.closest('.lesson-form').remove();
            document.querySelectorAll('.lesson-form').forEach((form, index) => {
                form.dataset.index = index;
                form.querySelector('h4').textContent = `Lesson ${index + 1}`;
            });
        }
    });

    form.addEventListener('change', (e) => {
        if (e.target.classList.contains('lesson-type-select')) {
            const lessonForm = e.target.closest('.lesson-form');
            const contentEditor = lessonForm.querySelector('.lesson-content-editor');
            if (e.target.value === 'quiz') {
                contentEditor.innerHTML = getQuizEditorHTML({}, lessonForm.dataset.index);
            } else {
                contentEditor.innerHTML = `<textarea rows="8" class="lesson-content-input mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="Markdown content..."></textarea>`;
            }
        }
    });
}
