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
  // Use a single execAsync batch for speed
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      location TEXT,
      farmSize REAL,
      phone_number TEXT UNIQUE
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
}

/**
 * Saves or updates user registration data.
 * user: { name, location, farmSize, mobileNumber }
 */
async function createUserProfile(user) {
  const database = await getDb();
  await database.runAsync(
    'INSERT OR REPLACE INTO user_profile (name, location, farmSize, phone_number) VALUES (?, ?, ?, ?);',
    [user.name, user.location ?? null, user.farmSize ?? null, user.mobileNumber]
  );
}

/**
 * Fetches a user by their mobile number.
 * Returns an object or null.
 */
async function loginUser(mobileNumber) {
  const database = await getDb();
  const rows = await database.getAllAsync(
    'SELECT id, name, location, farmSize, phone_number as mobileNumber FROM user_profile WHERE phone_number = ?;',
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
    'SELECT id, name, location, farmSize, phone_number as mobileNumber FROM user_profile LIMIT 1;'
  );
  return rows.length > 0 ? rows[0] : null;
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
  getDb, // exported in case custom queries are needed
};

export default DatabaseService;
