// netlify/functions/getWeather.js
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed. Use POST.' }),
    };
  }

  try {
    const { latitude, longitude, reverseGeocode } = JSON.parse(event.body);

    if (typeof latitude === 'undefined' || typeof longitude === 'undefined') {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing "latitude" and "longitude" in request body.' }),
      };
    }

    let locationName = null;
    if (reverseGeocode) {
      try {
        // Reverse geocoding using OpenStreetMap Nominatim
        const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`;
        const nominatimResponse = await fetch(nominatimUrl, {
          headers: {
            'User-Agent': 'JapanTripApp/1.0 (your-email@example.com)' // Required for Nominatim. Replace with your actual email or app identifier.
          }
        });
        if (nominatimResponse.ok) {
          const nominatimData = await nominatimResponse.json();
          locationName = nominatimData.address.city || nominatimData.address.town || nominatimData.address.village || nominatimData.display_name;
        } else {
          console.warn("Nominatim reverse geocoding failed:", nominatimResponse.status, nominatimResponse.statusText);
        }
      } catch (geoError) {
        console.error("Error during reverse geocoding:", geoError);
      }
    }

    // Open-Meteo API URL for current and hourly data
    // We request hourly data for temperature, relative humidity, wind speed, and weather code.
    // We also request daily max/min temperatures and weather code for the day.
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,windspeed_10m,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Asia%2FTokyo`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      const errorBody = await response.text(); // Read the text for easier debugging
      console.error("Open-Meteo API Error:", errorBody);
      return {
        statusCode: response.status,
        body: JSON.stringify({ message: `Error from Open-Meteo API: ${errorBody || 'Unknown'}` }),
      };
    }

    const data = await response.json();

    // Map WMO weather codes to a textual description (simplified)
    const weatherCodeDescriptions = {
      0: "Cielo sereno", 1: "Cielo prevalentemente sereno", 2: "Parzialmente nuvoloso", 3: "Coperto",
      45: "Nebbia", 48: "Nebbia gelata",
      51: "Pioggerella leggera", 53: "Pioggerella moderata", 55: "Pioggerella intensa",
      56: "Pioggerella gelata leggera", 57: "Pioggerella gelata intensa",
      61: "Pioggia leggera", 63: "Pioggia moderata", 65: "Pioggia forte",
      66: "Pioggia gelata leggera", 67: "Pioggia gelata forte",
      71: "Nevicata leggera", 73: "Nevicata moderata", 75: "Nevicata forte",
      77: "Grandinata leggera",
      80: "Rovesci di pioggia leggeri", 81: "Rovesci di pioggia moderati", 82: "Rovesci di pioggia violenti",
      85: "Rovesci di neve leggeri", 86: "Rovesci di neve forti",
      95: "Temporale", 96: "Temporale con grandine leggera", 99: "Temporale con grandine forte"
    };

    // Determine current hour index to get current hourly data
    const now = new Date();
    // Get the UTC offset from Open-Meteo data and convert to hours
    const offsetHours = data.utc_offset_seconds / 3600;
    // Calculate the current local hour based on UTC hour and offset
    const currentLocalHour = (now.getUTCHours() + offsetHours) % 24;
    const currentHourIndex = Math.floor(currentLocalHour);

    // Aggregate hourly data for morning (6-12), afternoon (12-18), evening (18-24)
    const getPeriodData = (hourlyData, startHour, endHour) => {
        const relevantHours = [];
        for (let i = 0; i < hourlyData.time.length; i++) {
            const hour = new Date(hourlyData.time[i]).getHours();
            if (hour >= startHour && hour < endHour) {
                relevantHours.push({
                    temperature_2m: hourlyData.temperature_2m[i],
                    weathercode: hourlyData.weathercode[i]
                });
            }
        }
        if (relevantHours.length === 0) return { temperature_2m_max: null, weathercode: null };

        // For temperature, take the average for the period
        const avgTemp = relevantHours.reduce((sum, h) => sum + h.temperature_2m, 0) / relevantHours.length;
        // For weather code, find the most frequent one in the period, or simply the first one
        const representativeWeatherCode = relevantHours.length > 0 ? relevantHours[0].weathercode : null;

        return {
            temperature_2m_max: avgTemp,
            weathercode: representativeWeatherCode
        };
    };

    const morningData = getPeriodData(data.hourly, 6, 12);
    const afternoonData = getPeriodData(data.hourly, 12, 18);
    const eveningData = getPeriodData(data.hourly, 18, 24);


    // Return only the necessary data
    return {
      statusCode: 200,
      body: JSON.stringify({
        locationName: locationName, // Include the resolved location name
        current: {
          temperature: data.current_weather.temperature,
          weathercode: data.current_weather.weathercode,
          description: weatherCodeDescriptions[data.current_weather.weathercode] || "Condizioni sconosciute",
          relativehumidity_2m: data.hourly.relativehumidity_2m[currentHourIndex],
          windspeed_10m: data.hourly.windspeed_10m[currentHourIndex]
        },
        morning: {
          temperature_2m_max: morningData.temperature_2m_max,
          weathercode: morningData.weathercode
        },
        afternoon: {
          temperature_2m_max: afternoonData.temperature_2m_max,
          weathercode: afternoonData.weathercode
        },
        evening: {
          temperature_2m_max: eveningData.temperature_2m_max,
          weathercode: eveningData.weathercode
        }
      }),
    };

  } catch (error) {
    console.error("Error in Netlify Function (Weather):", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `Internal server error (Weather): ${error.message}` }),
    };
  }
};
