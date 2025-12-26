import { WeatherData } from '../types';

export const getWeather = async (lat: number, lon: number): Promise<WeatherData | null> => {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,is_day,weather_code&temperature_unit=celsius`
    );
    const data = await response.json();
    
    if (!data.current) return null;

    return {
      temperature: data.current.temperature_2m,
      isDay: data.current.is_day === 1,
      weatherCode: data.current.weather_code,
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m
    };
  } catch (error) {
    console.error("Weather fetch failed", error);
    return null;
  }
};