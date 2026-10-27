/*
   Copyright 2019 Allan Mendes Silva Baliberdin

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

*/


import * as chupim from 'chupim';
import type { WebContext } from './types';

/*
  DEFAULT CHUPIM STAGES.
  FEEL FREE TO REMOVE OR UPDATE THEM.
*/

export function registerExamples(): void {
  chupim.registerStage({
    prefix: 'Chupim',
    name: 'Enable Debug',
    fn: async (c) => {
      c._chupim_.params.debug = true;
      return c;
    }
  });

  chupim.registerStage({
    prefix: 'Fallback',
    name: 'Return Context',
    fn: async (c) => {
      return c;
    }
  });

  chupim.registerStage({
    prefix: "HTTP Filters", 
    name: "Get?", 
    fn: async (context) => {
      if ((context as WebContext)._chupim_.method == "GET") return context;
    }
  });

  chupim.registerStage({
    prefix: "HTTP Filters", 
    name: "Post?", 
    fn: async (context) => {
      if ((context as WebContext)._chupim_.method == "POST") return context;
    }
  });

  chupim.registerStage({
    prefix: "HTTP Filters", 
    name: "Put?", 
    fn: async (context) => {
      if ((context as WebContext)._chupim_.method == "PUT") return context;
    }
  });

  chupim.registerStage({
    prefix: "HTTP Filters", 
    name: "Head?", 
    fn: async (context) => {
      if ((context as WebContext)._chupim_.method == "HEAD") return context;
    }
  });

  chupim.registerStage({
    prefix: "HTTP Filters", 
    name: "Options?", 
    fn: async (context) => {
      if ((context as WebContext)._chupim_.method == "OPTIONS") return context;
    }
  });

  chupim.registerStage({
    prefix: "HTTP Filters", 
    name: "Delete?", 
    fn: async (context) => {
      if ((context as WebContext)._chupim_.method == "DELETE") return context;
    }
  });

  chupim.registerStage({
    prefix: "Hello World", 
    name: "sayHello", 
    fn: async (context) => {
      context.say = "Hello World!";
      return context;
    }
  });

  chupim.registerComponent({
    id:'v1/helloworld',
    name: 'Helo World API',
    stages:['HTTP Filters.Get?', 'Hello World.sayHello'],
    enabled: true,
    methods: ['GET','POST']
  });

  registerWeatherExample();
}

/*
  WEATHER DASHBOARD EXAMPLE
  GET /api/v1/weather?city=Lisbon

  A backend for frontend that composes three Open-Meteo APIs (no API key needed):

    readCity → findCity → ┬ fetchForecast   ┬→ buildReport
                          └ fetchAirQuality ┘

  Each stage is self-contained, since its source can be edited and saved again
  on the stage editor.
*/
function registerWeatherExample(): void {
  // Reads and validates the "city" query parameter
  chupim.registerStage({
    prefix: 'Weather',
    name: 'readCity',
    fn: async (context) => {
      const city = String((context as WebContext)._chupim_.query.city ?? '').trim();
      if (!city) {
        throw { status: 400, message: 'Query parameter "city" is required, e.g. /api/v1/weather?city=Lisbon' };
      }
      context.city = city;
      return context;
    }
  });

  // Finds the coordinates of the city
  chupim.registerStage({
    prefix: 'Weather',
    name: 'findCity',
    fn: async (context) => {
      const url = `https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&name=${encodeURIComponent(context.city)}`;
      const response = await fetch(url);
      if (!response.ok) throw { status: 502, message: `Geocoding service answered ${response.status}` };

      const data: any = await response.json();
      const place = data.results?.[0];
      if (!place) throw { status: 404, message: `City not found: ${context.city}` };

      context.location = {
        name: place.name,
        region: place.admin1,
        country: place.country,
        latitude: place.latitude,
        longitude: place.longitude,
        timezone: place.timezone,
      };
      delete context.city;
      return context;
    },
    circuitbreaker: { enabled: true, timeout: 3000, action: 0 }
  });

  // Current conditions and the forecast for the next days
  chupim.registerStage({
    prefix: 'Weather',
    name: 'fetchForecast',
    fn: async (context) => {
      const { latitude, longitude } = context.location;
      const url = 'https://api.open-meteo.com/v1/forecast?timezone=auto&forecast_days=3'
        + `&latitude=${latitude}&longitude=${longitude}`
        + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day'
        + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset';
      const response = await fetch(url);
      if (!response.ok) throw { status: 502, message: `Forecast service answered ${response.status}` };

      const data: any = await response.json();
      context.weather = { current: data.current, daily: data.daily };
      return context;
    },
    circuitbreaker: { enabled: true, timeout: 4000, action: 0 }
  });

  // Fallback: air quality is a nice to have, the report goes on without it
  chupim.registerStage({
    prefix: 'Weather',
    name: 'withoutAirQuality',
    fn: async (context) => {
      context.airQuality = null;
      context.warnings = [...(context.warnings ?? []), 'Air quality is unavailable right now.'];
      return context;
    }
  });

  // Current air quality, with a fallback when the service fails or is slow
  chupim.registerStage({
    prefix: 'Weather',
    name: 'fetchAirQuality',
    fn: async (context) => {
      const { latitude, longitude } = context.location;
      const url = 'https://air-quality-api.open-meteo.com/v1/air-quality?timezone=auto'
        + `&latitude=${latitude}&longitude=${longitude}&current=european_aqi,pm2_5,pm10`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Air quality service answered ${response.status}`);

      const data: any = await response.json();
      context.airQuality = data.current;
      return context;
    },
    circuitbreaker: { enabled: true, timeout: 2500, action: 1, fn: 'Weather.withoutAirQuality' }
  });

  // Turns the raw data into a compact report with some advice
  chupim.registerStage({
    prefix: 'Weather',
    name: 'buildReport',
    fn: async (context) => {
      const describe = (code: number) => ({
        0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Freezing fog',
        51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 56: 'Freezing drizzle', 57: 'Freezing drizzle',
        61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain',
        71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
        80: 'Light showers', 81: 'Showers', 82: 'Violent showers', 85: 'Snow showers', 86: 'Heavy snow showers',
        95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with hail',
      } as Record<number, string>)[code] ?? 'Unknown';

      const { current, daily } = context.weather;
      const forecast = daily.time.map((date: string, i: number) => ({
        date,
        conditions: describe(daily.weather_code[i]),
        min: daily.temperature_2m_min[i],
        max: daily.temperature_2m_max[i],
        rainChance: daily.precipitation_probability_max[i],
        uvIndexMax: daily.uv_index_max[i],
        sunrise: daily.sunrise[i].slice(11),
        sunset: daily.sunset[i].slice(11),
      }));

      const aqi = context.airQuality?.european_aqi;
      const airQuality = context.airQuality && {
        index: aqi,
        level: aqi <= 20 ? 'Good' : aqi <= 40 ? 'Fair' : aqi <= 60 ? 'Moderate' : aqi <= 80 ? 'Poor' : aqi <= 100 ? 'Very poor' : 'Extremely poor',
        pm2_5: context.airQuality.pm2_5,
        pm10: context.airQuality.pm10,
      };

      const today = forecast[0];
      const advice = [];
      if (today.rainChance >= 50) advice.push(`Take an umbrella: ${today.rainChance}% chance of rain today.`);
      if (current.apparent_temperature < 10) advice.push('Wear a warm coat.');
      else if (current.apparent_temperature < 18) advice.push('Bring a light jacket.');
      else if (current.apparent_temperature > 28) advice.push('It is hot: stay hydrated.');
      if (today.uvIndexMax >= 6) advice.push(`Use sunscreen: UV index up to ${today.uvIndexMax}.`);
      if (current.wind_speed_10m >= 40) advice.push('Expect strong winds.');
      if (aqi > 60) advice.push('Poor air quality: avoid outdoor exercise.');
      if (advice.length == 0) advice.push('Enjoy your day!');

      context.now = {
        time: current.time,
        conditions: describe(current.weather_code),
        isDay: current.is_day == 1,
        temperature: current.temperature_2m,
        feelsLike: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        precipitation: current.precipitation,
        windSpeed: current.wind_speed_10m,
      };
      context.forecast = forecast;
      context.airQuality = airQuality;
      context.advice = advice;
      context.units = { temperature: '°C', humidity: '%', precipitation: 'mm', windSpeed: 'km/h', pm: 'μg/m³' };
      delete context.weather;
      return context;
    }
  });

  chupim.registerComponent({
    id: 'v1/weather',
    name: 'Weather Dashboard',
    stages: [
      'Weather.readCity',
      'Weather.findCity',
      [['Weather.fetchForecast'], ['Weather.fetchAirQuality']],
      'Weather.buildReport',
    ],
    enabled: true,
    methods: ['GET']
  });
}
