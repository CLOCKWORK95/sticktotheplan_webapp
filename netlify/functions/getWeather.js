// netlify/functions/getWeather.js
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Metodo non permesso. Usa POST.' }),
    };
  }

  const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

  if (!OPENWEATHER_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'API Key di OpenWeatherMap non configurata nelle variabili d\'ambiente di Netlify.' }),
    };
  }

  try {
    const { city } = JSON.parse(event.body);

    if (!city) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Campo "city" mancante nel corpo della richiesta.' }),
      };
    }

    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city},JP&appid=${OPENWEATHER_API_KEY}&units=metric&lang=it`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      const errorBody = await response.json();
      console.error("Errore API OpenWeatherMap:", errorBody);
      return {
        statusCode: response.status,
        body: JSON.stringify({ message: `Errore dall'API OpenWeatherMap: ${errorBody.message || 'Sconosciuto'}` }),
      };
    }

    const data = await response.json();
    // Restituisci solo i dati necessari per ridurre il payload e nascondere dettagli non essenziali
    return {
      statusCode: 200,
      body: JSON.stringify({
        temp: data.main.temp,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        humidity: data.main.humidity,
        speed: data.wind.speed
      }),
    };

  } catch (error) {
    console.error("Errore nella Netlify Function (Meteo):", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `Errore interno del server (Meteo): ${error.message}` }),
    };
  }
};
