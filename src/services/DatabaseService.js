// DatabaseService.js
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

let db = null;

// Open or reuse the SQLite database using the new API.
// For JS, prefer the async open to keep the app responsive.
async function getDb() {
  if (Platform.OS === 'web') {
    // Web requires special setup for expo-sqlite; use a no-op mock in dev.
    // See Expo docs for proper web setup, otherwise guard code from running on web.
    // https://docs.expo.dev/versions/latest/sdk/sqlite/
    return {
      execAsync: async () => {},
      runAsync: async () => ({ changes: 0, lastInsertRowId: 0 }),
      getAllAsync: async () => [],
      transactionAsync: async () => {},
      withTransactionAsync: async (fn) => fn(),
    };
  }

  if (!db) {
    // New API in SDK 51+: openDatabaseAsync/openDatabaseSync
    db = await SQLite.openDatabaseAsync('agroai.db');
  }
  return db;
}

/**
 * Initializes the database schema (idempotent).
 */
async function initialize() {
  const database = await getDb();

  try {
    // Ensure the base tables exist (idempotent) - CREATE TABLES FIRST
    await database.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS user_profile (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        location TEXT,
        farmSize REAL,
        phone_number TEXT UNIQUE,
        language TEXT DEFAULT 'en'  -- Add language preference
      );
      CREATE TABLE IF NOT EXISTS disease_history (
        id INTEGER PRIMARY KEY NOT NULL,
        cropName TEXT,
        diseaseName TEXT NOT NULL,
        confidence REAL,
        imagePath TEXT,
        timestamp INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS weather_cache (
        id INTEGER PRIMARY KEY NOT NULL,
        location TEXT UNIQUE,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );
    `);

    // Check if the language column exists - THEN MIGRATE
    const tableInfo = await database.getAllAsync(`PRAGMA table_info(user_profile);`);
    const languageColumnExists = tableInfo.some((column) => column.name === 'language');

    // If the language column doesn't exist, perform the schema migration
    if (!languageColumnExists) {
      console.log('Migrating database schema to add language column...');

      // 1. Create a new table with the updated schema
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS user_profile_new (
          id INTEGER PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          location TEXT,
          farmSize REAL,
          phone_number TEXT UNIQUE,
          language TEXT DEFAULT 'en'
        );
      `);

      // 2. Copy data from the old table to the new table
      try {
        await database.execAsync(`
          INSERT INTO user_profile_new (id, name, location, farmSize, phone_number)
          SELECT id, name, location, farmSize, phone_number FROM user_profile;
        `);
      } catch (migrationError) {
        console.warn('Migration failed, likely due to an empty user_profile table.  This is normal on first run.', migrationError);
      }

      // 3. Drop the old table
      await database.execAsync(`DROP TABLE user_profile;`);

      // 4. Rename the new table to the original table name
      await database.execAsync(`ALTER TABLE user_profile_new RENAME TO user_profile;`);

      console.log('Database schema migration complete.');
    }
  } catch (error) {
    console.error('Database initialization or migration error:', error);
    throw error;
  }
}

/**
 * Saves or updates user registration data.
 * user: { name, location, farmSize, mobileNumber, language }
 */
async function createUserProfile(user) {
  const database = await getDb();
  await database.runAsync(
    'INSERT OR REPLACE INTO user_profile (name, location, farmSize, phone_number, language) VALUES (?, ?, ?, ?, ?);',
    [user.name, user.location ?? null, user.farmSize ?? null, user.mobileNumber, user.language ?? 'en']
  );
}

/**
 * Fetches a user by their mobile number.
 * Returns an object or null.
 */
async function loginUser(mobileNumber) {
  const database = await getDb();
  const rows = await database.getAllAsync(
    'SELECT id, name, location, farmSize, phone_number as mobileNumber, language FROM user_profile WHERE phone_number = ?;',
    [mobileNumber]
  );
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Fetches the first user profile (placeholder for current user).
 * Returns an object or null.
 */
async function getUserProfile() {
  const database = await getDb();
  const rows = await database.getAllAsync(
    'SELECT id, name, location, farmSize, phone_number as mobileNumber, language FROM user_profile LIMIT 1;'
  );
  // return first row or null
  return rows && rows.length > 0 ? rows[0] : null;
}

// add helper to update language for existing user
async function updateUserLanguage(userId, language) {
  const database = await getDb();
  await database.runAsync(
    'UPDATE user_profile SET language = ? WHERE id = ?;',
    [language, userId]
  );
}

/**
 * Adds a disease detection record.
 * record: { cropName, diseaseName, confidence, imagePath }
 */
async function addDiseaseDetection(record) {
  const database = await getDb();
  await database.runAsync(
    'INSERT INTO disease_history (cropName, diseaseName, confidence, imagePath, timestamp) VALUES (?, ?, ?, ?, ?);',
    [
      record.cropName ?? null,
      record.diseaseName,
      record.confidence ?? null,
      record.imagePath ?? null,
      Date.now(),
    ]
  );
}

const DatabaseService = {
  initialize,
  createUserProfile,
  loginUser,
  getUserProfile,
  addDiseaseDetection,
  updateUserLanguage,
  getDb, // exported in case custom queries are needed
};

export default DatabaseService;
