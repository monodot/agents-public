# Weather Agent

A command-line weather agent that uses Claude AI to answer questions about current weather conditions. The agent uses the Claude API with tool calling to fetch real-time weather data from the Norwegian Meteorological Institute's API (api.met.no).

## Features

- 🤖 Natural language queries powered by Claude AI
- 🌍 Real-time weather data from api.met.no
- 🛠️ Tool-calling demonstration with Claude's function calling capabilities
- 📍 Supports location names or coordinates
- ⚡ Fast CLI interface

## Prerequisites

- Node.js (v18 or higher)
- npm
- An Anthropic API key

## Installation

1. Navigate to the weather-agent directory:
```bash
cd weather-agent
```

2. Install dependencies:
```bash
npm install
```

3. Build the TypeScript code:
```bash
npm run build
```

4. Set your Anthropic API key:
```bash
export ANTHROPIC_API_KEY=your-api-key-here
```

## Usage

Run the agent with a natural language query:

```bash
npm start -- "What's the weather in Oslo, Norway?"
```

### Example Queries

```bash
# Ask about a specific city
npm start -- "What's the weather like in London?"

# Ask about weather conditions
npm start -- "Is it raining in Tokyo right now?"

# Use coordinates directly
npm start -- "Tell me the weather at latitude 40.7128, longitude -74.0060"

# Ask comparative questions
npm start -- "What's the temperature in Paris?"
```

## How It Works

1. **User Query**: You ask a question about the weather in natural language
2. **Claude Processing**: Claude AI interprets your query and determines the location
3. **Tool Calling**: Claude calls the `get_weather` tool with appropriate coordinates
4. **Data Fetch**: The agent uses curl to fetch real-time data from api.met.no
5. **Response**: Claude interprets the weather data and provides a natural language answer

## Technical Details

### Architecture

- **Language**: TypeScript
- **LLM**: Claude 3.5 Sonnet (via Anthropic API)
- **Weather API**: api.met.no (Norwegian Meteorological Institute)
- **Tool Calling**: Native Claude tool use with agentic loop

### Weather Data

The agent fetches:
- Temperature (°C)
- Humidity (%)
- Wind speed (m/s)
- Wind direction (degrees)
- Air pressure (hPa)
- Cloud coverage (%)

### API Attribution

Weather data is provided by the Norwegian Meteorological Institute's Location Forecast API.
- API: https://api.met.no/weatherapi/locationforecast/2.0/
- Terms: https://api.met.no/doc/TermsOfService

## Development

### Build
```bash
npm run build
```

### Project Structure
```
weather-agent/
├── src/
│   └── index.ts          # Main agent implementation
├── dist/                 # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

## Notes

- The agent uses Claude's tool calling feature to determine when to fetch weather data
- Weather coordinates are determined by Claude based on your query
- The api.met.no API does not require authentication but requests a User-Agent header
- Weather data is updated regularly by the Norwegian Meteorological Institute

## License

MIT
