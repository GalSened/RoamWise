import type { WeatherProvider, WeatherNow, WeatherForecast } from '@/types';
import { AppError } from '@/types';
import { telemetry } from '@/lib/telemetry';

interface OpenWeatherConfig {
  apiKey: string;
  units?: 'metric' | 'imperial';
  language?: string;
}

interface OpenWeatherResponse {
  current: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
    visibility: number;
    wind_speed: number;
    wind_deg: number;
    weather: Array<{
      main: string;
      description: string;
      icon: string;
    }>;
    clouds: { all: number };
    uvi: number;
    dt: number;
    sunrise: number;
    sunset: number;
  };
  hourly?: Array<{
    dt: number;
    temp: number;
    pop: number;
    wind_speed: number;
    weather: Array<{
      main: string;
      description: string;
      icon: string;
    }>;
  }>;
  daily?: Array<{
    dt: number;
    temp: { max: number; min: number };
    pop: number;
    wind_speed: number;
    weather: Array<{
      main: string;
      description: string;
      icon: string;
    }>;
    sunrise: number;
    sunset: number;
  }>;
}

export class OpenWeatherProvider implements WeatherProvider {
  private config: OpenWeatherConfig;
  private baseUrl = 'https://api.openweathermap.org/data/3.0';

  constructor(config: OpenWeatherConfig) {
    this.config = {
      units: 'metric',
      language: 'en',
      ...config
    };
  }

  async getCurrent(lat: number, lng: number): Promise<WeatherNow> {
    const startTime = performance.now();
    
    try {
      const url = new URL(`${this.baseUrl}/onecall`);
      url.searchParams.set('lat', lat.toString());
      url.searchParams.set('lon', lng.toString());
      url.searchParams.set('appid', this.config.apiKey);
      url.searchParams.set('units', this.config.units!);
      url.searchParams.set('lang', this.config.language!);
      url.searchParams.set('exclude', 'minutely,hourly,daily,alerts');

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new AppError(
          `Weather API error: ${response.status}`,
          'WEATHER_API_ERROR',
          response.status
        );
      }

      const data: OpenWeatherResponse = await response.json();
      const weather = this.transformCurrentWeather(data);
      
      telemetry.track('weather_current', {
        lat,
        lng,
        duration: performance.now() - startTime,
        condition: weather.condition
      });

      return weather;
    } catch (error) {
      telemetry.track('weather_current_error', {
        lat,
        lng,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - startTime
      });
      throw error;
    }
  }

  async getForecast(lat: number, lng: number, at?: Date): Promise<WeatherForecast> {
    const startTime = performance.now();
    
    try {
      const url = new URL(`${this.baseUrl}/onecall`);
      url.searchParams.set('lat', lat.toString());
      url.searchParams.set('lon', lng.toString());
      url.searchParams.set('appid', this.config.apiKey);
      url.searchParams.set('units', this.config.units!);
      url.searchParams.set('lang', this.config.language!);
      url.searchParams.set('exclude', 'minutely,alerts');

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new AppError(
          `Weather API error: ${response.status}`,
          'WEATHER_API_ERROR',
          response.status
        );
      }

      const data: OpenWeatherResponse = await response.json();
      const forecast = this.transformForecast(data);
      
      telemetry.track('weather_forecast', {
        lat,
        lng,
        duration: performance.now() - startTime,
        hourly_count: forecast.hourly.length,
        daily_count: forecast.daily.length
      });

      return forecast;
    } catch (error) {
      telemetry.track('weather_forecast_error', {
        lat,
        lng,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - startTime
      });
      throw error;
    }
  }

  private transformCurrentWeather(data: OpenWeatherResponse): WeatherNow {
    const current = data.current;
    const weather = current.weather[0];
    const now = new Date();
    const sunrise = new Date(current.sunrise * 1000);
    const sunset = new Date(current.sunset * 1000);
    
    return {
      temperature: current.temp,
      feelsLike: current.feels_like,
      humidity: current.humidity,
      pressure: current.pressure,
      visibility: current.visibility / 1000, // Convert to km
      windSpeed: current.wind_speed,
      windDirection: current.wind_deg,
      precipitation: 0, // Current precipitation not provided in current weather
      cloudCover: current.clouds.all,
      uvIndex: current.uvi,
      condition: weather.description,
      icon: this.transformIcon(weather.icon),
      isDaylight: now >= sunrise && now <= sunset
    };
  }

  private transformForecast(data: OpenWeatherResponse): WeatherForecast {
    return {
      hourly: (data.hourly || []).map(hour => ({
        time: new Date(hour.dt * 1000),
        temperature: hour.temp,
        precipitation: hour.pop * 100, // Convert probability to percentage
        windSpeed: hour.wind_speed,
        condition: hour.weather[0]?.description || '',
        icon: this.transformIcon(hour.weather[0]?.icon || '')
      })),
      daily: (data.daily || []).map(day => ({
        date: new Date(day.dt * 1000),
        temperatureMax: day.temp.max,
        temperatureMin: day.temp.min,
        precipitation: 0, // Daily precipitation sum not provided
        precipitationProbability: day.pop * 100,
        windSpeed: day.wind_speed,
        condition: day.weather[0]?.description || '',
        icon: this.transformIcon(day.weather[0]?.icon || ''),
        sunrise: new Date(day.sunrise * 1000),
        sunset: new Date(day.sunset * 1000)
      }))
    };
  }

  private transformIcon(openWeatherIcon: string): string {
    // Map OpenWeatherMap icons to emoji/unicode icons
    const iconMap: Record<string, string> = {
      '01d': '☀️',   // clear sky day
      '01n': '🌙',   // clear sky night
      '02d': '⛅',   // few clouds day
      '02n': '☁️',   // few clouds night
      '03d': '☁️',   // scattered clouds
      '03n': '☁️',   // scattered clouds
      '04d': '☁️',   // broken clouds
      '04n': '☁️',   // broken clouds
      '09d': '🌧️',   // shower rain
      '09n': '🌧️',   // shower rain
      '10d': '🌦️',   // rain day
      '10n': '🌧️',   // rain night
      '11d': '⛈️',   // thunderstorm
      '11n': '⛈️',   // thunderstorm
      '13d': '🌨️',   // snow
      '13n': '🌨️',   // snow
      '50d': '🌫️',   // mist
      '50n': '🌫️'    // mist
    };

    return iconMap[openWeatherIcon] || '🌤️';
  }
}

// Factory function
export function createOpenWeatherProvider(apiKey: string): WeatherProvider {
  return new OpenWeatherProvider({ apiKey });
}