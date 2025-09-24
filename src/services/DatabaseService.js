// DatabaseService.js
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

let db = null;

// Open or reuse the SQLite database using the new API (SDK 51+)
async function getDb() {
  if (Platform.OS === 'web') {
    // Web mock — see Expo docs for proper web setup if needed
    return {
      execAsync: async () => {},
      runAsync: async () => ({ changes: 0, lastInsertRowId: 0 }),
      getAllAsync: async () => [],
      transactionAsync: async () => {},
      withTransactionAsync: async (fn) => fn(),
    };
  }

  if (!db) {
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
    await database.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS user_profile (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        location TEXT,
        farmSize REAL,
        phone_number TEXT UNIQUE,
        language TEXT DEFAULT 'en'
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

    // Migration guard for language column
    const tableInfo = await database.getAllAsync(`PRAGMA table_info(user_profile);`);
    const languageColumnExists = tableInfo.some((column) => column.name === 'language');

    if (!languageColumnExists) {
      console.log('Migrating database schema to add language column...');
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

      try {
        await database.execAsync(`
          INSERT INTO user_profile_new (id, name, location, farmSize, phone_number)
          SELECT id, name, location, farmSize, phone_number FROM user_profile;
        `);
      } catch (migrationError) {
        console.warn('Migration copy skipped or table empty:', migrationError);
      }

      await database.execAsync(`DROP TABLE user_profile;`);
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
 * Fetches the first user profile.
 */
async function getUserProfile() {
  const database = await getDb();
  const rows = await database.getAllAsync(
    'SELECT id, name, location, farmSize, phone_number as mobileNumber, language FROM user_profile LIMIT 1;'
  );
  return rows && rows.length > 0 ? rows[0] : null;
}

async function updateUserLanguage(userId, language) {
  const database = await getDb();
  await database.runAsync(
    'UPDATE user_profile SET language = ? WHERE id = ?;',
    [language, userId]
  );
}

/**
 * Cache weather JSON for a location key (e.g. "lat,lon").
 */
async function cacheWeather(locationKey, data) {
  const database = await getDb();
  await database.runAsync(
    `INSERT OR REPLACE INTO weather_cache (location, data, timestamp) VALUES (?, ?, ?);`,
    [locationKey, data, Date.now()]
  );
}

/**
 * Get cached weather for a location key.
 * Returns { data, timestamp } or null.
 */
async function getWeatherCache(locationKey) {
  const database = await getDb();
  const rows = await database.getAllAsync(
    `SELECT data, timestamp FROM weather_cache WHERE location = ? LIMIT 1;`,
    [locationKey]
  );
  if (!rows || rows.length === 0) return null;
  try {
    return { data: JSON.parse(rows[0].data), timestamp: rows[0].timestamp };
  } catch (e) {
    try {
      await database.runAsync(`DELETE FROM weather_cache WHERE location = ?;`, [locationKey]);
    } catch {}
    return null;
  }
}

const DatabaseService = {
  initialize,
  createUserProfile,
  loginUser,
  getUserProfile,
  addDiseaseDetection: async (record) => {
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
  },
  updateUserLanguage,
  getDb,
  cacheWeather,
  getWeatherCache,
};

export default DatabaseService;
