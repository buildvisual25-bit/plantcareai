
export interface CareInstructions {
  water: string;
  light: string;
  soil: string;
  temperature: string;
  fertilizer: string;
  lifespan?: string; // e.g. Perennial, Annual
  pruning?: string;
  pests?: string;
  toxicity?: string; // e.g. Toxic to cats
}

export interface Reminder {
  id: string;
  type: string;
  frequencyDays: number;
  lastCompleted: number;
  nextDue: number;
}

export interface PlantData {
  id: string;
  name: string;
  scientificName: string;
  care: CareInstructions;
  imageUri: string; // Base64
  dateAdded: number;
  notes?: string;
  reminders?: Reminder[];
}

export interface WeatherData {
  temperature: number;
  weatherCode: number;
  isDay: boolean;
  humidity: number;
  windSpeed: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
  id: string;
}

export enum AppTab {
  GARDEN = 'GARDEN',
  IDENTIFY = 'IDENTIFY',
  TOOLS = 'TOOLS',
  CHAT = 'CHAT',
  SETTINGS = 'SETTINGS'
}
