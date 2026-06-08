import axios from 'axios';

// Phoenix Pyeongchang Coordinates
const LATITUDE = 37.58;
const LONGITUDE = 128.32;

export interface WeatherData {
    temperature: number;
    weatherCode: number;
    weatherLabel: string;
}

const WMO_CODES: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
};

export const getWeather = async (): Promise<WeatherData> => {
    try {
        const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
            params: {
                latitude: LATITUDE,
                longitude: LONGITUDE,
                current: 'temperature_2m,weather_code',
                timezone: 'auto'
            }
        });

        const current = response.data.current;
        return {
            temperature: current.temperature_2m,
            weatherCode: current.weather_code,
            weatherLabel: WMO_CODES[current.weather_code] || 'Unknown'
        };
    } catch (error) {
        console.error('Failed to fetch weather:', error);
        throw error;
    }
};
