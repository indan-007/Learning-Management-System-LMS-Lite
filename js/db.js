const DB_NAME = 'LMS_Lite_DB';
const DB_VERSION = 1;
let db;

/**
 * Initializes the IndexedDB database and creates object stores.
 * @returns {Promise<IDBDatabase>} A promise that resolves with the database instance.
 */
export function initDB() {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve(db);
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const tempDb = event.target.result;
            console.log('Upgrading database...');

            // Users store: stores user credentials
            // keyPath: 'username' ensures uniqueness.
            if (!tempDb.objectStoreNames.contains('users')) {
                const usersStore = tempDb.createObjectStore('users', { keyPath: 'username' });
                // We can store username and hashedPassword. No extra indexes needed for now.
                console.log('Created "users" object store.');
            }

            // Courses store: caches course data fetched from JSON files
            // keyPath: 'id' is the unique course identifier.
            if (!tempDb.objectStoreNames.contains('courses')) {
                const coursesStore = tempDb.createObjectStore('courses', { keyPath: 'id' });
                // Indexes for filtering and sorting
                coursesStore.createIndex('tags', 'tags', { multiEntry: true });
                coursesStore.createIndex('difficulty', 'difficulty', { unique: false });
                coursesStore.createIndex('duration', 'duration', { unique: false });
                console.log('Created "courses" object store.');
            }

            // User Progress store: tracks completed lessons for each user
            // Using autoIncrementing key as a simple primary key.
            if (!tempDb.objectStoreNames.contains('user_progress')) {
                const progressStore = tempDb.createObjectStore('user_progress', { autoIncrement: true });
                // Composite index to quickly find a user's progress for a specific lesson
                progressStore.createIndex('userLesson', ['username', 'courseId', 'lessonId'], { unique: true });
                // Index to get all progress for a user in a given course
                progressStore.createIndex('userCourse', ['username', 'courseId'], { unique: false });
                console.log('Created "user_progress" object store.');
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Database initialized successfully.');
            resolve(db);
        };

        request.onerror = (event) => {
            console.error('Database error:', event.target.error);
            reject(new Error(`Database error: ${event.target.errorCode}`));
        };
    });
}

// We can add more helper functions here later to interact with the DB,
// for example, to add a user, get a user, etc.
