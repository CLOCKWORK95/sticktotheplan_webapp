// netlify/functions/translate.js
const fetch = require('node-fetch'); // Per fare richieste HTTP in Node.js

exports.handler = async function(event, context) {
  // Assicurati che la richiesta sia un POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Metodo non permesso. Usa POST.' }),
    };
  }

  // Recupera la chiave API e il nome del modello dalle variabili d'ambiente di Netlify
  // Queste variabili devono essere configurate nel pannello di controllo di Netlify
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash-lite'; // Default se non impostato

  if (!GEMINI_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'API Key di Gemini non configurata nelle variabili d\'ambiente di Netlify.' }),
    };
  }

  try {
    const { prompt } = JSON.parse(event.body);

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Campo "prompt" mancante nel corpo della richiesta.' }),
      };
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;
    
    const payload = {
      contents: [{ parts: [{ text: prompt }] }]
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error("Errore API Gemini:", errorBody);
      return {
        statusCode: response.status,
        body: JSON.stringify({ message: `Errore dall'API Gemini: ${errorBody.error.message || 'Sconosciuto'}` }),
      };
    }

    const result = await response.json();
    const translation = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (translation) {
      return {
        statusCode: 200,
        body: JSON.stringify({ translation: translation }),
      };
    } else {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Nessuna traduzione valida ricevuta dall\'API Gemini.' }),
      };
    }

  } catch (error) {
    console.error("Errore nella Netlify Function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `Errore interno del server: ${error.message}` }),
    };
  }
};
