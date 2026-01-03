/**
 * Weather Service - Open-Meteo Integration
 *
 * Uses Open-Meteo API (free, no API key required) for weather data.
 * https://open-meteo.com/
 *
 * WMO Weather interpretation codes:
 * https://open-meteo.com/en/docs#weathervariables
 */

import { WeatherInfo } from '../../types';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

/**
 * Raw response from Open-Meteo API
 */
interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current_weather: {
    temperature: number;
    weathercode: number;
    windspeed: number;
    winddirection: number;
    is_day: number;
    time: string;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    weathercode: number[];
    relativehumidity_2m: number[];
    windspeed_10m: number[];
  };
}

/**
 * WMO Weather interpretation codes
 * https://open-meteo.com/en/docs#weathervariables
 */
const WMO_CODES: Record<number, { icon: string; description: string }> = {
  0: { icon: 'sunny', description: 'Clear sky' },
  1: { icon: 'partly-cloudy', description: 'Mainly clear' },
  2: { icon: 'partly-cloudy', description: 'Partly cloudy' },
  3: { icon: 'cloudy', description: 'Overcast' },
  45: { icon: 'fog', description: 'Fog' },
  48: { icon: 'fog', description: 'Depositing rime fog' },
  51: { icon: 'drizzle', description: 'Light drizzle' },
  53: { icon: 'drizzle', description: 'Moderate drizzle' },
  55: { icon: 'drizzle', description: 'Dense drizzle' },
  56: { icon: 'freezing-rain', description: 'Light freezing drizzle' },
  57: { icon: 'freezing-rain', description: 'Dense freezing drizzle' },
  61: { icon: 'rain', description: 'Slight rain' },
  63: { icon: 'rain', description: 'Moderate rain' },
  65: { icon: 'heavy-rain', description: 'Heavy rain' },
  66: { icon: 'freezing-rain', description: 'Light freezing rain' },
  67: { icon: 'freezing-rain', description: 'Heavy freezing rain' },
  71: { icon: 'snow', description: 'Slight snowfall' },
  73: { icon: 'snow', description: 'Moderate snowfall' },
  75: { icon: 'snow', description: 'Heavy snowfall' },
  77: { icon: 'snow', description: 'Snow grains' },
  80: { icon: 'showers', description: 'Slight rain showers' },
  81: { icon: 'showers', description: 'Moderate rain showers' },
  82: { icon: 'heavy-rain', description: 'Violent rain showers' },
  85: { icon: 'snow-showers', description: 'Slight snow showers' },
  86: { icon: 'snow-showers', description: 'Heavy snow showers' },
  95: { icon: 'thunderstorm', description: 'Thunderstorm' },
  96: { icon: 'thunderstorm', description: 'Thunderstorm with slight hail' },
  99: { icon: 'thunderstorm', description: 'Thunderstorm with heavy hail' },
};

/**
 * Map WMO weather code to icon and description
 */
function mapWeatherCode(code: number): { icon: string; description: string } {
  return WMO_CODES[code] || { icon: 'unknown', description: 'Unknown weather' };
}

/**
 * Fetch current weather for a location
 *
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns WeatherInfo object with temp, icon, and description
 *
 * @example
 * const weather = await fetchWeather(32.08, 34.78); // Tel Aviv
 * console.log(weather); // { temp: 25, icon: 'sunny', description: 'Clear sky' }
 */
export async function fetchWeather(lat: number, lng: number): Promise<WeatherInfo> {
  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lng.toString(),
      current_weather: 'true',
      hourly: 'temperature_2m,relativehumidity_2m,weathercode,windspeed_10m',
      timezone: 'auto',
    });

    const response = await fetch(`${OPEN_METEO_URL}?${params}`);

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data: OpenMeteoResponse = await response.json();
    const { temperature, weathercode, windspeed } = data.current_weather;
    const { icon, description } = mapWeatherCode(weathercode);

    // Get current hour's humidity if available
    let humidity: number | undefined;
    if (data.hourly) {
      const currentHour = new Date().getHours();
      const todayStr = new Date().toISOString().split('T')[0];
      const hourIndex = data.hourly.time.findIndex((t) =>
        t.startsWith(todayStr) && new Date(t).getHours() === currentHour
      );
      if (hourIndex !== -1) {
        humidity = data.hourly.relativehumidity_2m[hourIndex];
      }
    }

    return {
      temp: Math.round(temperature),
      icon,
      description,
      humidity,
      windSpeed: Math.round(windspeed),
    };
  } catch (error) {
    console.error('Failed to fetch weather:', error);
    // Return fallback weather
    return {
      temp: 20,
      icon: 'unknown',
      description: 'Weather unavailable',
    };
  }
}

/**
 * Get weather icon component name based on icon string
 * Maps our icon names to Ionicons names
 */
export function getWeatherIconName(icon: string): string {
  const iconMap: Record<string, string> = {
    sunny: 'sunny',
    'partly-cloudy': 'partly-sunny',
    cloudy: 'cloudy',
    fog: 'cloudy',
    drizzle: 'rainy',
    rain: 'rainy',
    'heavy-rain': 'rainy',
    'freezing-rain': 'rainy',
    snow: 'snow',
    'snow-showers': 'snow',
    showers: 'rainy',
    thunderstorm: 'thunderstorm',
    unknown: 'help-circle',
  };

  return iconMap[icon] || 'help-circle';
}

/**
 * Get weather-appropriate color
 */
export function getWeatherColor(icon: string): string {
  const colorMap: Record<string, string> = {
    sunny: '#FFB300',
    'partly-cloudy': '#78909C',
    cloudy: '#90A4AE',
    fog: '#B0BEC5',
    drizzle: '#64B5F6',
    rain: '#42A5F5',
    'heavy-rain': '#1E88E5',
    'freezing-rain': '#90CAF9',
    snow: '#E3F2FD',
    'snow-showers': '#BBDEFB',
    showers: '#64B5F6',
    thunderstorm: '#5C6BC0',
    unknown: '#9E9E9E',
  };

  return colorMap[icon] || '#9E9E9E';
}

export default { fetchWeather, getWeatherIconName, getWeatherColor };
