import { describe, test, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import * as chupim from 'chupim';
import app from '../src/app';

const geocoding = { results: [{ name: 'Lisbon', admin1: 'Lisbon District', country: 'Portugal', latitude: 38.7, longitude: -9.1, timezone: 'Europe/Lisbon' }] };
const forecast = {
  current: { time: '2026-10-27T14:00', temperature_2m: 8, apparent_temperature: 6, relative_humidity_2m: 80, precipitation: 0.4, weather_code: 61, wind_speed_10m: 12, is_day: 1 },
  daily: {
    time: ['2026-10-27', '2026-10-28', '2026-10-29'],
    weather_code: [61, 3, 0],
    temperature_2m_max: [12, 14, 16],
    temperature_2m_min: [6, 7, 9],
    precipitation_probability_max: [80, 20, 0],
    uv_index_max: [2, 7, 8],
    sunrise: ['2026-10-27T07:58', '2026-10-28T07:59', '2026-10-29T08:00'],
    sunset: ['2026-10-27T18:42', '2026-10-28T18:41', '2026-10-29T18:40'],
  },
};
const airQuality = { current: { european_aqi: 65, pm2_5: 30, pm10: 41 } };

type Fake = { status?: number; body?: unknown };

/** Fakes the Open-Meteo APIs used by the weather example. */
function mockApis(overrides: { geocoding?: Fake; forecast?: Fake; airQuality?: Fake } = {}) {
  const fetch = vi.fn(async (url: string) => {
    const name = url.includes('geocoding-api') ? 'geocoding' : url.includes('air-quality-api') ? 'airQuality' : 'forecast';
    const fake = overrides[name as keyof typeof overrides] ?? {};
    const body = fake.body ?? { geocoding, forecast, airQuality }[name];
    return new Response(JSON.stringify(body), { status: fake.status ?? 200 });
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('weather example', () => {
  test('builds a report from the three APIs', async () => {
    const fetch = mockApis();
    const res = await request(app).get('/api/v1/weather').query({ city: 'Lisbon' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      location: { name: 'Lisbon', region: 'Lisbon District', country: 'Portugal', latitude: 38.7, longitude: -9.1, timezone: 'Europe/Lisbon' },
      now: { time: '2026-10-27T14:00', conditions: 'Light rain', isDay: true, temperature: 8, feelsLike: 6, humidity: 80, precipitation: 0.4, windSpeed: 12 },
      forecast: [
        { date: '2026-10-27', conditions: 'Light rain', min: 6, max: 12, rainChance: 80, uvIndexMax: 2, sunrise: '07:58', sunset: '18:42' },
        { date: '2026-10-28', conditions: 'Overcast', min: 7, max: 14, rainChance: 20, uvIndexMax: 7, sunrise: '07:59', sunset: '18:41' },
        { date: '2026-10-29', conditions: 'Clear sky', min: 9, max: 16, rainChance: 0, uvIndexMax: 8, sunrise: '08:00', sunset: '18:40' },
      ],
      airQuality: { index: 65, level: 'Poor', pm2_5: 30, pm10: 41 },
      advice: [
        'Take an umbrella: 80% chance of rain today.',
        'Wear a warm coat.',
        'Poor air quality: avoid outdoor exercise.',
      ],
      units: { temperature: '°C', humidity: '%', precipitation: 'mm', windSpeed: 'km/h', pm: 'μg/m³' },
    });

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[0][0]).toContain('name=Lisbon');
    expect(fetch.mock.calls[1][0]).toContain('latitude=38.7&longitude=-9.1');
  });

  test('requires the city parameter', async () => {
    const fetch = mockApis();
    const res = await request(app).get('/api/v1/weather');

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/"city" is required/);
    expect(fetch).not.toHaveBeenCalled();
  });

  test('answers 404 for an unknown city', async () => {
    mockApis({ geocoding: { body: {} } });
    const res = await request(app).get('/api/v1/weather').query({ city: 'Nowhere' });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('City not found: Nowhere');
  });

  test('goes on without air quality when its service fails', async () => {
    mockApis({ airQuality: { status: 503 } });
    const res = await request(app).get('/api/v1/weather').query({ city: 'Lisbon' });

    expect(res.status).toBe(200);
    expect(res.body.airQuality).toBeNull();
    expect(res.body.warnings).toEqual(['Air quality is unavailable right now.']);
    expect(res.body.now.conditions).toBe('Light rain');
  });

  test('fails when the forecast service fails', async () => {
    mockApis({ forecast: { status: 500 } });
    const res = await request(app).get('/api/v1/weather').query({ city: 'Lisbon' });

    expect(res.status).toBe(502);
    expect(res.body.message).toBe('Forecast service answered 500');
  });

  test('stage sources can be saved again from the stage editor', async () => {
    // The editor shows Function.toString() and evaluates it on save, so every
    // stage must work without references to the module where it was declared
    for (const [name, stage] of Object.entries(chupim.stages.container['Weather'])) {
      const cb = stage.circuitbreaker;
      const res = await request(app).post('/stage').type('form').send({
        prefix: 'Weather',
        name,
        source: stage.source,
        'circuitBreaker.enabled': String(cb?.enabled ?? false),
        'circuitBreaker.action': String(cb?.action ?? 0),
        'circuitBreaker.fn': cb?.fn ?? '',
        'circuitBreaker.timeout': String(cb?.timeout ?? 1000),
      });
      expect(res.status, `${name} saved`).toBe(302);
    }

    mockApis();
    const res = await request(app).get('/api/v1/weather').query({ city: 'Lisbon' });
    expect(res.status).toBe(200);
    expect(res.body.advice).toHaveLength(3);
  });
});
