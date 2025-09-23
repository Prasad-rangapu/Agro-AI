import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

let db = null;

/**
 * Opens a database connection or creates it if it doesn't exist.
 * This function initializes the DB connection lazily.
 * @returns {SQLite.SQLiteDatabase} The database object.
 */
function getDb() {
  if (!db) {
    if (Platform.OS === 'web') {
      // Return a mock for web since SQLite is not supported
      db = {
        transaction: () => ({ executeSql: () => {} }),
      };
    } else {
      db = SQLite.openDatabase('agroai.db');
    }
  }
  return db;
}

/**
 * Initializes the database, creating tables if they don't exist.
 */
const initDatabase = () => {
  const promise = new Promise((resolve, reject) => {
    getDb().transaction((tx) => {
      // Create user_profile table for registration data
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS user_profile (
          id INTEGER PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          location TEXT,
          farmSize REAL,
          phone_number TEXT UNIQUE
        );`,
        [],
        () => {},
        (_, error) => {
          console.error('Error creating user_profile table:', error);
          reject(error);
          return true; // Stop transaction
        }
      );

      // Create disease_history table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS disease_history (
          id INTEGER PRIMARY KEY NOT NULL,
          cropName TEXT,
          diseaseName TEXT NOT NULL,
          confidence REAL,
          imagePath TEXT,
          timestamp INTEGER NOT NULL
        );`,
        [],
        () => {},
        (_, error) => {
          console.error('Error creating disease_history table:', error);
          reject(error);
          return true; // Stop transaction
        }
      );

      // Create a cache table for weather data
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS weather_cache (
          id INTEGER PRIMARY KEY NOT NULL,
          location TEXT UNIQUE,
          data TEXT NOT NULL,
          timestamp INTEGER NOT NULL
        );`,
        [],
        () => {
          resolve();
        },
        (_, error) => {
          console.error('Error creating weather_cache table:', error);
          reject(error);
          return true; // Stop transaction
        }
      );
    });
  });
  return promise;
};

/**
 * Saves or updates user registration data.
 * @param {object} user - The user object { name, location, farmSize, mobileNumber }.
 * @returns {Promise<SQLite.SQLResultSet>}
 */
const createUserProfile = (user) => {
  const { name, location, farmSize, mobileNumber } = user;
  const promise = new Promise((resolve, reject) => {
    getDb().transaction((tx) => {
      tx.executeSql(
        'INSERT OR REPLACE INTO user_profile (name, location, farmSize, phone_number) VALUES (?, ?, ?, ?);',
        [name, location, farmSize, mobileNumber],
        (_, result) => {
          resolve(result);
        },
        (_, error) => {
          reject(error);
          return true;
        }
      );
    });
  });
  return promise;
};

/**
 * Fetches a user by their mobile number.
 * @param {string} mobileNumber
 * @returns {Promise<object|null>}
 */
const loginUser = (mobileNumber) => {
  const promise = new Promise((resolve) => {
    getDb().transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM user_profile WHERE phone_number = ?;',
        [mobileNumber],
        (_, { rows }) => {
          resolve(rows.length > 0 ? rows.item(0) : null);
        },
        (_, error) => {
          console.error('Error logging in user:', error);
          resolve(null); // Resolve with null on error
          return true;
        }
      );
    });
  });
  return promise;
};

/**
 * Fetches the current user's profile.
 * This is a placeholder; in a real app, you'd use the stored user token.
 * @returns {Promise<object|null>}
 */
const getUserProfile = async () => {
  // For this app, we assume the "logged in" user is the first one.
  // A more robust implementation would use AsyncStorage to store the current user's ID/token.
  const promise = new Promise((resolve) => {
    getDb().transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM user_profile LIMIT 1;',
        [],
        (_, { rows }) => {
          resolve(rows.length > 0 ? rows.item(0) : null);
        },
        (_, error) => {
          console.error('Error getting user profile:', error);
          resolve(null);
          return true;
        }
      );
    });
  });
  return promise;
};

/**
 * Adds a disease detection record to the history.
 * @param {object} record - { cropName, diseaseName, confidence, imagePath }
 * @returns {Promise<SQLite.SQLResultSet>}
 */
const addDiseaseDetection = (record) => {
  const { cropName, diseaseName, confidence, imagePath } = record;
  const promise = new Promise((resolve, reject) => {
    getDb().transaction((tx) => {
      tx.executeSql(
        'INSERT INTO disease_history (cropName, diseaseName, confidence, imagePath, timestamp) VALUES (?, ?, ?, ?, ?);',
        [cropName, diseaseName, confidence, imagePath, Date.now()],
        (_, result) => {
          resolve(result);
        },
        (_, error) => {
          reject(error);
          return true;
        }
      );
    });
  });
  return promise;
};

export const DatabaseService = {
  // Renamed for consistency with App.js
  initialize: initDatabase,
  createUserProfile,
  loginUser,
  getUserProfile,
  addDiseaseDetection,
  getDb, // Exporting getDb for more complex queries if needed
};