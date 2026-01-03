/**
 * Weather Service - Open-Meteo Integration
 *
 * Free weather API with no key required.
 * https://open-meteo.com/
 */

export interface WeatherData {
  temperature: number;
  weatherCode: number;
  icon: string;
  description: string;
  humidity?: number;
  windSpeed?: number;
}

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

/**
 * WMO Weather Interpretation Codes
 * https://open-meteo.com/en/docs
 */
const WEATHER_CODES: Record<number, { icon: string; description: string }> = {
  0: { icon: 'sun', description: 'Clear sky' },
  1: { icon: 'sun', description: 'Mainly clear' },
  2: { icon: 'cloud-sun', description: 'Partly cloudy' },
  3: { icon: 'cloud', description: 'Overcast' },
  45: { icon: 'cloud-fog', description: 'Foggy' },
  48: { icon: 'cloud-fog', description: 'Depositing rime fog' },
  51: { icon: 'cloud-drizzle', description: 'Light drizzle' },
  53: { icon: 'cloud-drizzle', description: 'Moderate drizzle' },
  55: { icon: 'cloud-drizzle', description: 'Dense drizzle' },
  61: { icon: 'cloud-rain', description: 'Slight rain' },
  63: { icon: 'cloud-rain', description: 'Moderate rain' },
  65: { icon: 'cloud-rain', description: 'Heavy rain' },
  71: { icon: 'snowflake', description: 'Slight snow' },
  73: { icon: 'snowflake', description: 'Moderate snow' },
  75: { icon: 'snowflake', description: 'Heavy snow' },
  80: { icon: 'cloud-rain', description: 'Slight showers' },
  81: { icon: 'cloud-rain', description: 'Moderate showers' },
  82: { icon: 'cloud-rain', description: 'Violent showers' },
  95: { icon: 'cloud-lightning', description: 'Thunderstorm' },
  96: { icon: 'cloud-lightning', description: 'Thunderstorm with hail' },
  99: { icon: 'cloud-lightning', description: 'Thunderstorm with heavy hail' },
};

/**
 * Fetch current weather for coordinates
 */
export async function fetchWeather(lat: number, lng: number): Promise<WeatherData> {
  try {
    const url = `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=relativehumidity_2m`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    const current = data.current_weather;
    const weatherInfo = WEATHER_CODES[current.weathercode] || { icon: 'help-circle', description: 'Unknown' };

    return {
      temperature: Math.round(current.temperature),
      weatherCode: current.weathercode,
      icon: weatherInfo.icon,
      description: weatherInfo.description,
      windSpeed: current.windspeed,
      humidity: data.hourly?.relativehumidity_2m?.[0],
    };
  } catch (error) {
    console.error('Failed to fetch weather:', error);
    return {
      temperature: 0,
      weatherCode: -1,
      icon: 'help-circle',
      description: 'Weather unavailable',
    };
  }
}

/**
 * Get weather icon name (for lucide-react)
 */
export function getWeatherIconName(code: number): string {
  return WEATHER_CODES[code]?.icon || 'help-circle';
}

/**
 * Get weather color based on conditions
 */
export function getWeatherColor(code: number): string {
  if (code === 0 || code === 1) return '#FFB800'; // Sunny
  if (code === 2 || code === 3) return '#9CA3AF'; // Cloudy
  if (code >= 45 && code <= 48) return '#6B7280'; // Fog
  if (code >= 51 && code <= 67) return '#3B82F6'; // Rain
  if (code >= 71 && code <= 77) return '#E5E7EB'; // Snow
  if (code >= 80 && code <= 82) return '#60A5FA'; // Showers
  if (code >= 95) return '#7C3AED'; // Thunder
  return '#9CA3AF';
}
