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
    0: '맑음',
    1: '대체로 맑음',
    2: '구름 조금',
    3: '흐림',
    45: '안개',
    48: '착빙 안개',
    51: '약한 이슬비',
    53: '이슬비',
    55: '강한 이슬비',
    56: '약한 어는 이슬비',
    57: '강한 어는 이슬비',
    61: '약한 비',
    63: '비',
    65: '강한 비',
    66: '약한 어는 비',
    67: '강한 어는 비',
    71: '약한 눈',
    73: '눈',
    75: '많은 눈',
    77: '싸락눈',
    80: '약한 소나기',
    81: '소나기',
    82: '강한 소나기',
    85: '약한 소낙눈',
    86: '강한 소낙눈',
    95: '뇌우',
    96: '약한 우박과 뇌우',
    99: '강한 우박과 뇌우',
};

export const getWeather = async (): Promise<WeatherData> => {
    try {
        const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
            timeout: 8_000,
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
            weatherLabel: WMO_CODES[current.weather_code] || '날씨 정보 없음'
        };
    } catch (error) {
        console.error('Failed to fetch weather:', error);
        throw error;
    }
};
