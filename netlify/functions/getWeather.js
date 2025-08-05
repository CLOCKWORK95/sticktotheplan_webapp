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
    const { latitude, longitude } = JSON.parse(event.body);

    if (typeof latitude === 'undefined' || typeof longitude === 'undefined') {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing "latitude" and "longitude" in request body.' }),
      };
    }

    // Open-Meteo API URL
    // Richiede temperatura attuale, umidità relativa, velocità del vento e codice meteo.
    // Daily forecast per avere una descrizione testuale del meteo.
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=relativehumidity_2m,windspeed_10m&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Asia%2FTokyo`;

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
    // You can expand this logic for more detailed descriptions
    const weatherCodeDescriptions = {
        0: "Cielo sereno",
        1: "Cielo prevalentemente sereno",
        2: "Parzialmente nuvoloso",
        3: "Coperto",
        45: "Nebbia",
        48: "Nebbia gelata",
        51: "Pioggerella leggera",
        53: "Pioggerella moderata",
        55: "Pioggerella intensa",
        56: "Pioggerella gelata leggera",
        57: "Pioggerella gelata intensa",
        61: "Pioggia leggera",
        63: "Pioggia moderata",
        65: "Pioggia forte",
        66: "Pioggia gelata leggera",
        67: "Pioggia gelata forte",
        71: "Nevicata leggera",
        73: "Nevicata moderata",
        75: "Nevicata forte",
        77: "Grandinata leggera",
        80: "Rovesci di pioggia leggeri",
        81: "Rovesci di pioggia moderati",
        82: "Rovesci di pioggia violenti",
        85: "Rovesci di neve leggeri",
        86: "Rovesci di neve forti",
        95: "Temporale",
        96: "Temporale con grandine leggera",
        99: "Temporale con grandine forte"
    };

    const description = weatherCodeDescriptions[data.current_weather.weathercode] || "Condizioni sconosciute";
    
    // Return only the necessary data
    return {
      statusCode: 200,
      body: JSON.stringify({
        temperature: data.current_weather.temperature,
        weathercode: data.current_weather.weathercode,
        description: description,
        relativehumidity_2m: data.hourly.relativehumidity_2m[0], // Take the first hourly value
        windspeed_10m: data.hourly.windspeed_10m[0] // Take the first hourly value
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
