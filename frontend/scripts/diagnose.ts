#!/usr/bin/env npx tsx
/**
 * RoamWise System Diagnostics
 *
 * Comprehensive health check for the entire stack:
 * 1. Environment Integrity
 * 2. Weather Service Connectivity
 * 3. AI "Brain" Integration (Real API call)
 * 4. Route Parsing Logic
 *
 * Run with: npm run diagnose
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from project root
config({ path: resolve(process.cwd(), '.env') });

// ============================================================================
// Types
// ============================================================================

interface WeatherData {
  temperature: number;
  weatherCode: number;
  icon: string;
  description: string;
}

interface AIRouteResponse {
  type: 'route';
  summary: string;
  stops: Array<{
    name: string;
    lat: number;
    lng: number;
    description: string;
    stopType?: string;
  }>;
}

interface AIQuestionResponse {
  type: 'question';
  content: string;
  options?: string[];
}

type AIResponse = AIRouteResponse | AIQuestionResponse;

interface RouteWaypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'start' | 'destination' | 'food' | 'attraction' | 'rest' | 'fuel';
}

interface DiagnosticResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: unknown;
  duration?: number;
}

// ============================================================================
// Console Styling
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(message: string) {
  console.log(message);
}

function logHeader(title: string) {
  log(`\n${colors.bold}${colors.cyan}${'═'.repeat(60)}${colors.reset}`);
  log(`${colors.bold}${colors.cyan}  ${title}${colors.reset}`);
  log(`${colors.cyan}${'═'.repeat(60)}${colors.reset}\n`);
}

function logCheck(name: string) {
  log(`${colors.blue}▶ CHECK: ${name}${colors.reset}`);
}

function logResult(result: DiagnosticResult) {
  const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
  const color = result.status === 'PASS' ? colors.green : result.status === 'WARN' ? colors.yellow : colors.red;

  log(`  ${icon} ${color}[${result.status}]${colors.reset} ${result.message}`);

  if (result.duration) {
    log(`     ${colors.gray}Duration: ${result.duration}ms${colors.reset}`);
  }

  if (result.details && result.status !== 'PASS') {
    log(`     ${colors.gray}Details: ${JSON.stringify(result.details, null, 2)}${colors.reset}`);
  }
}

// ============================================================================
// Check 1: Environment Integrity
// ============================================================================

function checkEnvironment(): DiagnosticResult[] {
  logCheck('Environment Integrity');
  const results: DiagnosticResult[] = [];

  // Check AI Provider
  const aiProvider = process.env.VITE_AI_PROVIDER || 'openai';
  results.push({
    check: 'AI Provider',
    status: 'PASS',
    message: `AI Provider set to: ${aiProvider}`,
  });

  // Check OpenAI API Key
  const openaiKey = process.env.VITE_OPENAI_API_KEY;
  if (aiProvider === 'openai') {
    if (openaiKey && openaiKey.startsWith('sk-') && openaiKey.length > 20) {
      results.push({
        check: 'OpenAI API Key',
        status: 'PASS',
        message: `OpenAI API Key present (${openaiKey.slice(0, 12)}...${openaiKey.slice(-4)})`,
      });
    } else {
      results.push({
        check: 'OpenAI API Key',
        status: 'FAIL',
        message: 'OpenAI API Key missing or invalid',
        details: { provided: openaiKey ? `${openaiKey.slice(0, 8)}...` : '(empty)' },
      });
    }
  }

  // Check Groq API Key (if using Groq)
  const groqKey = process.env.VITE_GROQ_API_KEY;
  if (aiProvider === 'groq') {
    if (groqKey && groqKey.startsWith('gsk_') && groqKey.length > 20) {
      results.push({
        check: 'Groq API Key',
        status: 'PASS',
        message: `Groq API Key present (${groqKey.slice(0, 12)}...${groqKey.slice(-4)})`,
      });
    } else {
      results.push({
        check: 'Groq API Key',
        status: 'FAIL',
        message: 'Groq API Key missing or invalid',
        details: { provided: groqKey ? `${groqKey.slice(0, 8)}...` : '(empty)' },
      });
    }
  }

  // Check Weather API Enabled
  const weatherEnabled = process.env.VITE_WEATHER_API_ENABLED;
  results.push({
    check: 'Weather API Enabled',
    status: weatherEnabled === 'true' ? 'PASS' : 'WARN',
    message: weatherEnabled === 'true'
      ? 'Weather API is enabled'
      : `Weather API enabled = "${weatherEnabled}" (expected "true")`,
  });

  // Check Google Maps API Key
  const gmapsKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
  if (gmapsKey && gmapsKey.startsWith('AIza') && gmapsKey.length > 30) {
    results.push({
      check: 'Google Maps API Key',
      status: 'PASS',
      message: `Google Maps API Key present (${gmapsKey.slice(0, 12)}...)`,
    });
  } else {
    results.push({
      check: 'Google Maps API Key',
      status: 'WARN',
      message: 'Google Maps API Key missing (Leaflet will work, but autocomplete disabled)',
    });
  }

  results.forEach(logResult);
  return results;
}

// ============================================================================
// Check 2: Weather Service Connectivity
// ============================================================================

async function checkWeatherService(): Promise<DiagnosticResult> {
  logCheck('Weather Service (Open-Meteo API)');

  const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
  const lat = 32.08;
  const lng = 34.78;

  const start = Date.now();

  try {
    const url = `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lng}&current_weather=true`;
    const response = await fetch(url);

    if (!response.ok) {
      const result: DiagnosticResult = {
        check: 'Weather API',
        status: 'FAIL',
        message: `HTTP ${response.status}: ${response.statusText}`,
        duration: Date.now() - start,
      };
      logResult(result);
      return result;
    }

    const data = await response.json();
    const current = data.current_weather;

    if (!current || typeof current.temperature !== 'number') {
      const result: DiagnosticResult = {
        check: 'Weather API',
        status: 'FAIL',
        message: 'Invalid response structure',
        details: data,
        duration: Date.now() - start,
      };
      logResult(result);
      return result;
    }

    const weatherData: WeatherData = {
      temperature: Math.round(current.temperature),
      weatherCode: current.weathercode,
      icon: 'sun',
      description: `Code ${current.weathercode}`,
    };

    const result: DiagnosticResult = {
      check: 'Weather API',
      status: 'PASS',
      message: `Tel Aviv: ${weatherData.temperature}°C, ${weatherData.description}`,
      duration: Date.now() - start,
    };
    logResult(result);
    log(`     ${colors.gray}Full response: { temp: ${weatherData.temperature}, windspeed: ${current.windspeed}, code: ${current.weathercode} }${colors.reset}`);
    return result;

  } catch (error) {
    const result: DiagnosticResult = {
      check: 'Weather API',
      status: 'FAIL',
      message: `Network error: ${error instanceof Error ? error.message : 'Unknown'}`,
      duration: Date.now() - start,
    };
    logResult(result);
    return result;
  }
}

// ============================================================================
// Check 3: AI "Brain" Integration
// ============================================================================

async function checkAIService(): Promise<{ result: DiagnosticResult; response?: AIResponse }> {
  logCheck('AI Brain Integration (Real API Call)');

  const aiProvider = process.env.VITE_AI_PROVIDER || 'openai';
  const openaiKey = process.env.VITE_OPENAI_API_KEY;
  const groqKey = process.env.VITE_GROQ_API_KEY;

  // Validate we have the right key for the provider
  if (aiProvider === 'openai' && !openaiKey) {
    const result: DiagnosticResult = {
      check: 'AI Service',
      status: 'FAIL',
      message: 'OpenAI API key not configured',
    };
    logResult(result);
    return { result };
  }

  if (aiProvider === 'groq' && !groqKey) {
    const result: DiagnosticResult = {
      check: 'AI Service',
      status: 'FAIL',
      message: 'Groq API key not configured',
    };
    logResult(result);
    return { result };
  }

  const SYSTEM_PROMPT = `
You are an expert Travel Co-Pilot for Israel.
Your goal: create specific, actionable daily itineraries.
Current Location context: User is in Israel.

PROTOCOL:
1. If the user request is VAGUE (e.g., "I'm hungry", "somewhere nice"), return a JSON with type "question" and ask for clarification with helpful options.
2. If you have enough info to suggest places, generate a ROUTE with real Israeli locations.
3. Always respond with valid JSON only. No markdown, no extra text.

RESPONSE SCHEMA (Route):
{
  "type": "route",
  "summary": "A 1-sentence summary of the trip vibe",
  "stops": [
    { "name": "Name of place", "lat": <number>, "lng": <number>, "description": "Short reason to visit", "stopType": "start|destination|food|attraction|rest" }
  ]
}

RESPONSE SCHEMA (Question):
{
  "type": "question",
  "content": "Your clarifying question here",
  "options": ["Option 1", "Option 2", "Option 3"]
}

IMPORTANT:
- Use real coordinates for Israeli locations
- Popular destinations: Ein Gedi (31.45, 35.38), Masada (31.31, 35.35), Dead Sea (31.50, 35.47), Jerusalem Old City (31.77, 35.23), Tel Aviv beaches (32.08, 34.77)
- For food, suggest real Israeli cuisines: hummus, falafel, shakshuka, shawarma
`;

  const userMessage = "I want pizza in Tel Aviv";
  const start = Date.now();

  try {
    let responseContent: string;

    if (aiProvider === 'groq') {
      // Use Groq API
      log(`     ${colors.gray}Using Groq API with llama-3.3-70b-versatile...${colors.reset}`);

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let errorDetails: unknown;
        try {
          errorDetails = JSON.parse(errorBody);
        } catch {
          errorDetails = errorBody;
        }

        const result: DiagnosticResult = {
          check: 'AI Service (Groq)',
          status: 'FAIL',
          message: `Groq API Error: HTTP ${response.status}`,
          details: errorDetails,
          duration: Date.now() - start,
        };
        logResult(result);
        return { result };
      }

      const data = await response.json();
      responseContent = data.choices?.[0]?.message?.content;

    } else {
      // Use OpenAI API
      log(`     ${colors.gray}Using OpenAI API with gpt-4o-mini...${colors.reset}`);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let errorDetails: unknown;
        try {
          errorDetails = JSON.parse(errorBody);
        } catch {
          errorDetails = errorBody;
        }

        const statusMessages: Record<number, string> = {
          401: 'Invalid API Key - check your VITE_OPENAI_API_KEY',
          429: 'Rate limited or quota exceeded - check your OpenAI billing',
          500: 'OpenAI server error - try again later',
          503: 'OpenAI service unavailable - try again later',
        };

        const result: DiagnosticResult = {
          check: 'AI Service (OpenAI)',
          status: 'FAIL',
          message: statusMessages[response.status] || `HTTP ${response.status}`,
          details: errorDetails,
          duration: Date.now() - start,
        };
        logResult(result);
        return { result };
      }

      const data = await response.json();
      responseContent = data.choices?.[0]?.message?.content;
    }

    if (!responseContent) {
      const result: DiagnosticResult = {
        check: 'AI Service',
        status: 'FAIL',
        message: 'Empty response from AI',
        duration: Date.now() - start,
      };
      logResult(result);
      return { result };
    }

    // Parse JSON response
    let parsed: AIResponse;
    try {
      parsed = JSON.parse(responseContent);
    } catch (parseError) {
      const result: DiagnosticResult = {
        check: 'AI Service',
        status: 'FAIL',
        message: 'Failed to parse AI response as JSON',
        details: { raw: responseContent.slice(0, 200) },
        duration: Date.now() - start,
      };
      logResult(result);
      return { result };
    }

    // Validate response structure
    if (parsed.type === 'route' && Array.isArray((parsed as AIRouteResponse).stops)) {
      const routeResponse = parsed as AIRouteResponse;
      const result: DiagnosticResult = {
        check: 'AI Service',
        status: 'PASS',
        message: `Got route with ${routeResponse.stops.length} stops: "${routeResponse.summary}"`,
        duration: Date.now() - start,
      };
      logResult(result);
      log(`     ${colors.gray}Stops: ${routeResponse.stops.map(s => s.name).join(' → ')}${colors.reset}`);
      return { result, response: parsed };

    } else if (parsed.type === 'question') {
      const questionResponse = parsed as AIQuestionResponse;
      const result: DiagnosticResult = {
        check: 'AI Service',
        status: 'PASS',
        message: `Got clarifying question: "${questionResponse.content}"`,
        duration: Date.now() - start,
      };
      logResult(result);
      if (questionResponse.options) {
        log(`     ${colors.gray}Options: ${questionResponse.options.join(', ')}${colors.reset}`);
      }
      return { result, response: parsed };

    } else {
      const result: DiagnosticResult = {
        check: 'AI Service',
        status: 'WARN',
        message: `Unexpected response type: ${parsed.type}`,
        details: parsed,
        duration: Date.now() - start,
      };
      logResult(result);
      return { result, response: parsed };
    }

  } catch (error) {
    const result: DiagnosticResult = {
      check: 'AI Service',
      status: 'FAIL',
      message: `Network error: ${error instanceof Error ? error.message : 'Unknown'}`,
      duration: Date.now() - start,
    };
    logResult(result);
    return { result };
  }
}

// ============================================================================
// Check 4: Route Parsing Logic
// ============================================================================

function checkRouteParsing(aiResponse?: AIResponse): DiagnosticResult {
  logCheck('Route Parsing Logic');

  // If we have a real route response, use it
  let testStops: AIRouteResponse['stops'];

  if (aiResponse?.type === 'route') {
    testStops = (aiResponse as AIRouteResponse).stops;
    log(`     ${colors.gray}Using real AI response with ${testStops.length} stops${colors.reset}`);
  } else {
    // Use mock data for testing
    testStops = [
      { name: 'Starting Point', lat: 32.08, lng: 34.78, description: 'Your location', stopType: 'start' },
      { name: 'Pizza Hut Tel Aviv', lat: 32.07, lng: 34.77, description: 'Great pizza place', stopType: 'food' },
      { name: 'Gordon Beach', lat: 32.08, lng: 34.76, description: 'Enjoy the sunset', stopType: 'destination' },
    ];
    log(`     ${colors.gray}Using mock data (AI returned question or failed)${colors.reset}`);
  }

  try {
    // Convert to waypoints
    const waypoints: RouteWaypoint[] = [];

    testStops.forEach((stop, index) => {
      const typeMap: Record<string, RouteWaypoint['type']> = {
        start: 'start',
        destination: 'destination',
        food: 'food',
        attraction: 'attraction',
        rest: 'rest',
      };

      waypoints.push({
        id: `stop-${index}`,
        name: stop.name,
        lat: stop.lat,
        lng: stop.lng,
        type: typeMap[stop.stopType || 'attraction'] || 'attraction',
      });
    });

    // Validate waypoints
    const validWaypoints = waypoints.filter(w =>
      typeof w.lat === 'number' &&
      typeof w.lng === 'number' &&
      w.lat >= -90 && w.lat <= 90 &&
      w.lng >= -180 && w.lng <= 180
    );

    if (validWaypoints.length === waypoints.length) {
      const result: DiagnosticResult = {
        check: 'Route Parsing',
        status: 'PASS',
        message: `Successfully parsed ${waypoints.length} waypoints`,
      };
      logResult(result);
      log(`     ${colors.gray}Waypoints: ${waypoints.map(w => `${w.name} (${w.type})`).join(' → ')}${colors.reset}`);
      return result;
    } else {
      const result: DiagnosticResult = {
        check: 'Route Parsing',
        status: 'WARN',
        message: `${waypoints.length - validWaypoints.length} waypoints have invalid coordinates`,
        details: waypoints.filter(w => !validWaypoints.includes(w)),
      };
      logResult(result);
      return result;
    }

  } catch (error) {
    const result: DiagnosticResult = {
      check: 'Route Parsing',
      status: 'FAIL',
      message: `Parsing crashed: ${error instanceof Error ? error.message : 'Unknown'}`,
    };
    logResult(result);
    return result;
  }
}

// ============================================================================
// Summary
// ============================================================================

function printSummary(results: DiagnosticResult[]) {
  logHeader('DIAGNOSTIC SUMMARY');

  const passed = results.filter(r => r.status === 'PASS').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  log(`  ${colors.green}✅ Passed: ${passed}${colors.reset}`);
  log(`  ${colors.yellow}⚠️  Warnings: ${warned}${colors.reset}`);
  log(`  ${colors.red}❌ Failed: ${failed}${colors.reset}`);
  log('');

  if (failed > 0) {
    log(`${colors.red}${colors.bold}CRITICAL ISSUES FOUND:${colors.reset}`);
    results.filter(r => r.status === 'FAIL').forEach(r => {
      log(`  • ${r.check}: ${r.message}`);
    });
    log('');
  }

  if (warned > 0) {
    log(`${colors.yellow}${colors.bold}WARNINGS:${colors.reset}`);
    results.filter(r => r.status === 'WARN').forEach(r => {
      log(`  • ${r.check}: ${r.message}`);
    });
    log('');
  }

  // Overall verdict
  if (failed === 0 && warned === 0) {
    log(`${colors.green}${colors.bold}🎉 All systems operational!${colors.reset}`);
  } else if (failed === 0) {
    log(`${colors.yellow}${colors.bold}⚠️  System functional with warnings${colors.reset}`);
  } else {
    log(`${colors.red}${colors.bold}🚨 System has critical issues - check failed items above${colors.reset}`);
  }

  log('');
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  logHeader('RoamWise System Diagnostics');
  log(`${colors.gray}Running comprehensive health checks...${colors.reset}`);
  log(`${colors.gray}Timestamp: ${new Date().toISOString()}${colors.reset}`);
  log('');

  const allResults: DiagnosticResult[] = [];

  // Check 1: Environment
  const envResults = checkEnvironment();
  allResults.push(...envResults);

  // Check 2: Weather
  const weatherResult = await checkWeatherService();
  allResults.push(weatherResult);

  // Check 3: AI Service
  const { result: aiResult, response: aiResponse } = await checkAIService();
  allResults.push(aiResult);

  // Check 4: Route Parsing
  const parseResult = checkRouteParsing(aiResponse);
  allResults.push(parseResult);

  // Summary
  printSummary(allResults);

  // Exit code
  const hasFailed = allResults.some(r => r.status === 'FAIL');
  process.exit(hasFailed ? 1 : 0);
}

main().catch(error => {
  console.error('Diagnostic script crashed:', error);
  process.exit(1);
});
