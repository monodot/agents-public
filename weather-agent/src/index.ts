#!/usr/bin/env node
import Anthropic from '@anthropic-ai/sdk';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Weather tool definition for Claude
const weatherTool: Anthropic.Tool = {
  name: 'get_weather',
  description: 'Get current weather conditions for a specific location using coordinates (latitude and longitude). Returns temperature, weather conditions, and other meteorological data from the Norwegian Meteorological Institute.',
  input_schema: {
    type: 'object',
    properties: {
      latitude: {
        type: 'number',
        description: 'Latitude coordinate of the location (e.g., 59.91 for Oslo)'
      },
      longitude: {
        type: 'number',
        description: 'Longitude coordinate of the location (e.g., 10.75 for Oslo)'
      },
      location_name: {
        type: 'string',
        description: 'Name of the location for context (e.g., "Oslo, Norway")'
      }
    },
    required: ['latitude', 'longitude']
  }
};

// Function to call the api.met.no API using curl
async function getWeatherData(latitude: number, longitude: number): Promise<string> {
  try {
    const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${latitude}&lon=${longitude}`;
    const command = `curl -s -A "WeatherAgent/1.0 github.com/monodot/agents-public" "${url}"`;
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.error('Error from curl:', stderr);
    }
    
    return stdout;
  } catch (error) {
    throw new Error(`Failed to fetch weather data: ${error}`);
  }
}

// Process tool calls from Claude
async function processToolCall(toolName: string, toolInput: any): Promise<string> {
  if (toolName === 'get_weather') {
    const { latitude, longitude, location_name } = toolInput;
    console.log(`\n🌍 Fetching weather for ${location_name || `${latitude}, ${longitude}`}...`);
    
    const weatherData = await getWeatherData(latitude, longitude);
    const data = JSON.parse(weatherData);
    
    // Extract current weather from the API response
    const currentWeather = data.properties.timeseries[0];
    const instant = currentWeather.data.instant.details;
    
    const result = {
      location: location_name || `${latitude}, ${longitude}`,
      timestamp: currentWeather.time,
      temperature: instant.air_temperature,
      humidity: instant.relative_humidity,
      wind_speed: instant.wind_speed,
      wind_direction: instant.wind_from_direction,
      pressure: instant.air_pressure_at_sea_level,
      cloud_coverage: instant.cloud_area_fraction
    };
    
    return JSON.stringify(result, null, 2);
  }
  
  throw new Error(`Unknown tool: ${toolName}`);
}

// Main function to run the weather agent
async function runWeatherAgent(userQuery: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is not set.');
    console.error('Please set it with: export ANTHROPIC_API_KEY=your-api-key');
    process.exit(1);
  }
  
  const client = new Anthropic({ apiKey });
  
  console.log(`\n🤖 Weather Agent Starting...`);
  console.log(`📝 Your question: ${userQuery}\n`);
  
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userQuery }
  ];
  
  let response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    tools: [weatherTool],
    messages: messages
  });
  
  console.log(`\n💭 Initial response from Claude:`);
  console.log(`Stop reason: ${response.stop_reason}`);
  
  // Handle tool use in agentic loop
  while (response.stop_reason === 'tool_use') {
    const toolUseBlock = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );
    
    if (!toolUseBlock) break;
    
    console.log(`\n🔧 Tool requested: ${toolUseBlock.name}`);
    console.log(`📥 Input:`, JSON.stringify(toolUseBlock.input, null, 2));
    
    // Execute the tool
    const toolResult = await processToolCall(toolUseBlock.name, toolUseBlock.input);
    
    console.log(`\n✅ Tool result:`, toolResult);
    
    // Continue the conversation with tool result
    messages.push(
      { role: 'assistant', content: response.content },
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: toolUseBlock.id,
            content: toolResult
          }
        ]
      }
    );
    
    // Get next response from Claude
    response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      tools: [weatherTool],
      messages: messages
    });
    
    console.log(`\n💭 Next response from Claude:`);
    console.log(`Stop reason: ${response.stop_reason}`);
  }
  
  // Extract and display final text response
  const finalText = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  );
  
  if (finalText) {
    console.log(`\n🎯 Final Answer:\n`);
    console.log(finalText.text);
  }
}

// CLI entry point
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
Weather Agent - Ask about the current weather anywhere!

Usage:
  npm start -- "What's the weather in Oslo, Norway?"
  npm start -- "How's the weather in London?"
  npm start -- "Tell me the weather at latitude 40.7128, longitude -74.0060"

Make sure to set ANTHROPIC_API_KEY environment variable:
  export ANTHROPIC_API_KEY=your-api-key
  `);
  process.exit(0);
}

const query = args.join(' ');
runWeatherAgent(query).catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
