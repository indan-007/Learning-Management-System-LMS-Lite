/**
 * Renders the HTML for a single quiz question.
 * @param {object} question The question object.
 * @param {number} index The index of the question.
 * @returns {string} The HTML string for the question.
 */
function renderQuestion(question, index) {
    const optionsHtml = question.options.map((option, i) => {
        const inputType = question.type === 'multi-select' ? 'checkbox' : 'radio';
        const uniqueId = `q${index}-option${i}`;
        return `
            <div class="flex items-center p-2 rounded-md hover:bg-gray-100">
                <input type="${inputType}" id="${uniqueId}" name="question${index}" value="${option}" class="mr-3 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                <label for="${uniqueId}" class="w-full cursor-pointer">${option}</label>
            </div>
        `;
    }).join('');

    return `
        <div class="mb-8 p-4 border rounded-lg" id="question-${index}">
            <p class="font-semibold text-lg">${index + 1}. ${question.question}</p>
            <div class="mt-4 space-y-2">
                ${optionsHtml}
            </div>
            <div id="feedback-${index}" class="mt-3 text-sm font-medium"></div>
        </div>
    `;
}

/**
 * Renders a full quiz into a container.
 * @param {HTMLElement} container The HTML element to render the quiz into.
 * @param {object} quizLesson The lesson object of type 'quiz'.
 * @param {Function} onComplete A callback function to be called when the quiz is submitted and graded.
 */
export function renderQuiz(container, quizLesson, onComplete) {
    if (!container || !quizLesson || !quizLesson.questions) {
        container.innerHTML = '<p class="text-red-500">Error: Could not load quiz data.</p>';
        return;
    }
    const questionsHtml = quizLesson.questions.map(renderQuestion).join('');

    container.innerHTML = `
        <div class="prose-h2:mb-4">
            <h2>Quiz: ${quizLesson.title}</h2>
            <p>${quizLesson.description || 'Test your knowledge by answering the questions below.'}</p>
        </div>
        <form id="quiz-form" class="mt-6">
            ${questionsHtml}
            <button type="submit" class="w-full mt-6 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Submit Quiz</button>
        </form>
        <div id="quiz-results" class="hidden mt-8 p-6 bg-gray-50 rounded-lg"></div>
    `;

    const quizForm = document.getElementById('quiz-form');
    quizForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSubmit(quizLesson, onComplete);
    });
}

/**
 * Handles the submission of the quiz, grades it, and displays results.
 * @param {object} quizLesson The lesson object of type 'quiz'.
 * @param {Function} onComplete The callback to run after grading.
 */
function handleSubmit(quizLesson, onComplete) {
    let score = 0;
    const questions = quizLesson.questions;

    questions.forEach((question, index) => {
        const feedbackEl = document.getElementById(`feedback-${index}`);
        const formInputs = document.querySelectorAll(`input[name="question${index}"]:checked`);
        const selectedAnswers = Array.from(formInputs).map(input => input.value);

        const correctAnswers = [...question.correctAnswers].sort();
        const userAnswers = [...selectedAnswers].sort();

        const isCorrect = JSON.stringify(correctAnswers) === JSON.stringify(userAnswers);

        if (isCorrect) {
            score++;
            feedbackEl.innerHTML = `<p class="text-green-600">✓ Correct!</p>`;
        } else {
            feedbackEl.innerHTML = `<p class="text-red-600">✗ Incorrect.</p><p class="text-gray-600">The correct answer(s) are: ${correctAnswers.join(', ')}</p>`;
        }

        // Disable inputs for this question after submission
        document.querySelectorAll(`input[name="question${index}"]`).forEach(input => input.disabled = true);
    });

    const resultsEl = document.getElementById('quiz-results');
    resultsEl.innerHTML = `
        <h3 class="text-2xl font-bold text-gray-800">Quiz Complete!</h3>
        <p class="text-lg mt-2">Your score: <span class="font-bold">${score}</span> out of <span class="font-bold">${questions.length}</span></p>
    `;
    resultsEl.classList.remove('hidden');

    // Disable the submit button
    const submitButton = document.querySelector('#quiz-form button[type="submit"]');
    submitButton.disabled = true;
    submitButton.classList.add('bg-gray-400', 'cursor-not-allowed');
    submitButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');

    // If a callback was provided, call it. This can be used to mark the lesson as complete.
    if (onComplete) {
        onComplete({ score, total: questions.length });
    }
}
