// netlify/functions/getGoogleMapsApiKey.js
exports.handler = async function(event, context) {
    try {
        // Recupera la chiave API dalla variabile d'ambiente di Netlify
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
            // Se la variabile d'ambiente non è impostata, restituisci un errore
            return {
                statusCode: 500,
                body: JSON.stringify({ message: "Google Maps API Key non impostata nelle variabili d'ambiente." }),
            };
        }

        // Restituisci la chiave API in un oggetto JSON
        return {
            statusCode: 200,
            body: JSON.stringify({ apiKey: apiKey }),
        };
    } catch (error) {
        // Gestione di eventuali errori durante l'esecuzione della funzione
        console.error("Errore nella funzione getGoogleMapsApiKey:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: error.message }),
        };
    }
};
