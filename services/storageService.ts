import { PlantData } from '../types';

const DB_NAME = 'lavender_garden_db';
const STORE_NAME = 'plants';
const DB_VERSION = 1;

// Helper to open the database
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

export const getPlants = async (): Promise<PlantData[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        // Sort by newest first
        const results = request.result as PlantData[];
        resolve(results.reverse());
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to get plants", error);
    return [];
  }
};

export const savePlant = async (plant: PlantData): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(plant); // put handles both add and update

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Failed to save plant", e);
    throw new Error("Storage Error");
  }
};

export const deletePlant = async (id: string): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Failed to delete plant", e);
  }
};