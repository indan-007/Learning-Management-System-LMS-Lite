# LMS Lite

LMS Lite is a fully static, client-side Learning Management System built with vanilla HTML, CSS (Tailwind), and JavaScript. It runs entirely in the browser, requiring no backend or build tools. It's designed to be a lightweight, portable, and secure solution for delivering educational content.

## Features

*   **100% Static**: No server-side processing needed. Host it on any static web host.
*   **Local-First with PWA**: Uses IndexedDB for local storage and a Service Worker for offline access, making it a Progressive Web App.
*   **Secure Client-Side Auth**: User registration and login handled locally using the Web Crypto API for password hashing (SHA-256).
*   **Course Catalog**: A filterable and searchable catalog of available courses.
*   **Markdown-Based Lessons**: Course content is written in Markdown for easy authoring, with code syntax highlighting provided by Prism.js.
*   **Interactive Quizzes**: Support for multiple-choice and multiple-select questions with instant feedback.
*   **Certificate Generation**: Dynamically generates an SVG certificate upon course completion, with options to download as SVG, PNG, or PDF.
*   **Instructor Mode**: A complete client-side interface for creating, editing, importing, and exporting course content directly in the browser.

## Tech Stack

![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![IndexedDB](https://img.shields.io/badge/IndexedDB-blue?style=for-the-badge&logo=indexeddb&logoColor=white)

## Live Demo & Screenshots

> **Note:** Due to the limitations of the development environment, a live demo and screenshots for this project are not available. The application is designed to be run locally using a simple static file server.

## How to Use

1.  Clone or download this repository.
2.  Serve the files using any simple static file server (e.g., `python -m http.server`, `npx serve`, or the Live Server extension in VS Code).
3.  Open the served URL in your browser.

## Content Authoring Guide

Courses are defined as individual `.json` files located in the `/data/courses/` directory. To add a new course, you can either use the built-in **Instructor Mode** or create the JSON file manually.

### Course JSON Structure

Each course file must follow this structure:

```json
{
  "id": "unique-course-id",
  "title": "Course Title",
  "description": "A brief description of the course.",
  "difficulty": "Beginner",
  "duration": "X hours",
  "tags": ["tag1", "tag2"],
  "lessons": [
    {
      "lessonId": "unique-lesson-id-1",
      "title": "Title of the First Lesson",
      "type": "lesson",
      "content": "## Markdown Content\\n\\nYour lesson content, written in Markdown. Use `\\n` for newlines."
    },
    {
      "lessonId": "unique-quiz-id-1",
      "title": "Title of the Quiz",
      "type": "quiz",
      "questions": [
        {
          "question": "What is the capital of France?",
          "options": ["London", "Paris", "Berlin"],
          "correctAnswers": ["Paris"],
          "type": "mcq"
        },
        {
          "question": "Which of these are primary colors?",
          "options": ["Red", "Green", "Blue", "Yellow"],
          "correctAnswers": ["Red", "Blue", "Yellow"],
          "type": "multi-select"
        }
      ]
    }
  ]
}
```

### Manifest File

After adding a new course JSON file, you must also add its path to the manifest file at `/data/courses/courses.json` so the application can discover it:

```json
{
  "courses": [
    "data/courses/js-101.json",
    "data/courses/css-201.json",
    "data/courses/your-new-course.json"
  ]
}
```

## Future Improvements

This project serves as a robust foundation. Future enhancements could include:
*   **Course Detail Page**: A dedicated page for each course showing all its lessons, progress, and a "Start" or "Resume" button.
*   **Advanced User Roles**: A more secure, server-based authentication system to properly distinguish between students and instructors.
*   **More Quiz Types**: Adding other question formats like fill-in-the-blank or drag-and-drop.
*   **Themes**: Allowing users to switch between light and dark modes.

## Found This Project Useful?

If you found this LMS Lite project helpful or interesting, please consider giving it a ⭐ on GitHub!

## Security Notes

LMS Lite is designed for maximum portability and simplicity, which comes with certain security trade-offs due to its static nature.

*   **Client-Side Authentication**: User accounts are stored and authenticated entirely within the user's browser in IndexedDB. While passwords are not stored in plaintext (they are hashed with SHA-256), the database itself is accessible to anyone with physical or remote access to the user's browser. This system is designed to protect against casual observation, not targeted attacks.
*   **Instructor Mode**: The Instructor Mode is currently accessible to **any user**. There is no server-side role management to protect it. This is a deliberate design choice to maintain the "100% static" constraint. In a production environment where course integrity is critical, this application should be placed behind a proper authentication gateway, or the instructor-related routes and UI should be removed.
*   **Subresource Integrity (SRI)**: The application uses several third-party libraries from CDNs. While SRI hashes are recommended for security, they could not be programmatically obtained during the development of this version. They should be added to the `<script>` and `<link>` tags in `index.html` for a production deployment to mitigate the risk of CDN-based attacks.
