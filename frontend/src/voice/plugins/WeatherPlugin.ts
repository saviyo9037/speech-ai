import { VoicePlugin, PluginContext, PluginExecutionResult } from '../types';

export class WeatherPlugin implements VoicePlugin {
  public id = 'weather';
  public name = 'Weather Center';
  public description = 'Reads current temperature and conditions for any location.';
  public intents = ['get_weather'];

  public async execute(
    intent: string,
    parameters: Record<string, any>,
    context: PluginContext
  ): Promise<PluginExecutionResult> {
    let location = String(parameters.location || '').trim();
    if (!location || location === 'your location' || location.toLowerCase() === 'here') {
      location = 'New York';
    }

    try {
      // Fetch real weather from wttr.in
      const res = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j1`);
      
      if (res.ok) {
        const data = await res.json();
        const current = data.current_condition?.[0];
        const tempC = current?.temp_C || '22';
        const desc = current?.weatherDesc?.[0]?.value || 'Clear';
        const humidity = current?.humidity || '50';

        return {
          success: true,
          message: `The weather in ${location} is currently ${desc} at ${tempC} degrees Celsius, with ${humidity}% humidity.`,
          data: { location, tempC, condition: desc, humidity }
        };
      }
    } catch (e) {
      console.warn('[WeatherPlugin] Failed to fetch real weather, reverting to simulation.');
    }

    // Dynamic Mock Fallback
    const weatherTypes = ['Sunny', 'Cloudy', 'Rainy', 'Clear', 'Windy'];
    const chosenType = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
    const mockTemp = Math.floor(Math.random() * 15) + 15; // 15 to 30

    return {
      success: true,
      message: `[Simulated] The weather in ${location} is ${chosenType} and ${mockTemp} degrees Celsius.`,
      data: { location, tempC: mockTemp, condition: chosenType, humidity: 60 }
    };
  }
}
