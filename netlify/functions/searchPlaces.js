// netlify/functions/searchPlaces.js

// Importa le dipendenze necessarie.
// Per Node.js, 'node-fetch' è comunemente usato per effettuare richieste HTTP.
// Assicurati di installarlo nel tuo progetto se non lo hai già fatto:
// npm install node-fetch@2
// Nota: Netlify Functions supporta fetch nativamente in versioni recenti di Node.js,
// ma per compatibilità o se si usa una versione più vecchia, node-fetch è utile.
// Per questo esempio, assumiamo un ambiente Node.js moderno su Netlify dove fetch è disponibile.

exports.handler = async function(event, context) {
    // Controlla che la richiesta sia di tipo POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method Not Allowed' }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    let requestBody;
    try {
        // Parsifica il corpo della richiesta JSON
        requestBody = JSON.parse(event.body);
    } catch (e) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid JSON body' }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    // Estrai la query di ricerca, latitudine e longitudine dal corpo della richiesta
    const { query, latitude, longitude } = requestBody;

    // Verifica che i parametri essenziali siano presenti
    if (!query) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Missing search query' }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    // Recupera la chiave API di Google Places dalle variabili d'ambiente di Netlify.
    // È FONDAMENTALE configurare questa variabile nella dashboard di Netlify
    // (Settings -> Build & deploy -> Environment variables).
    // Non includere mai la chiave API direttamente nel codice client-side!
    const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

    if (!GOOGLE_PLACES_API_KEY) {
        console.error("GOOGLE_PLACES_API_KEY non è configurata nelle variabili d'ambiente di Netlify.");
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Server configuration error: Google Places API Key missing.' }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    // Costruisci l'URL per l'API Text Search di Google Places
    // Usiamo 'textsearch' per una ricerca generica basata su testo.
    // 'location' e 'radius' possono essere usati per biasare i risultati verso una zona.
    // 'fields' specifica quali dati vogliamo nella risposta per mantenere la risposta leggera.
    const googlePlacesApiUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}&language=it`;

    // Aggiungi biasing se latitudine e longitudine sono fornite
    if (latitude && longitude) {
        // Bias by location (latitude,longitude) and radius (e.g., 50km)
        // Adjust radius as needed for your application's scope
        googlePlacesApiUrl += `&location=${latitude},${longitude}&radius=50000`; // 50,000 meters = 50 km
    }
    
    // Aggiungi i campi specifici che desideri ricevere
    // Per Place Search, i campi sono specificati nell'URL o nel corpo della richiesta (se POST).
    // Per Text Search, i campi sono inclusi di default o possono essere filtrati.
    // I campi Place ID, Name, Geometry (location) e Vicinity (indirizzo) sono generalmente utili.
    // L'API Text Search restituisce un set predefinito di campi.
    // Se hai bisogno di campi specifici non restituiti di default, dovresti usare Place Details.
    // Per semplicità, ci affidiamo ai campi di default per Text Search.

    try {
        // Effettua la richiesta all'API di Google Places
        const googleResponse = await fetch(googlePlacesApiUrl);
        
        // Controlla se la risposta da Google è OK
        if (!googleResponse.ok) {
            const errorText = await googleResponse.text();
            console.error(`Errore dall'API di Google Places: ${googleResponse.status} ${googleResponse.statusText} - ${errorText}`);
            return {
                statusCode: googleResponse.status,
                body: JSON.stringify({ message: `Errore dall'API di Google Places: ${googleResponse.statusText}`, details: errorText }),
                headers: { 'Content-Type': 'application/json' },
            };
        }

        const googleData = await googleResponse.json();

        // Filtra e formatta i risultati se necessario.
        // L'API Text Search restituisce un array di oggetti 'results'.
        // Ogni oggetto 'result' contiene 'name', 'geometry.location.lat', 'geometry.location.lng', 'vicinity' ecc.
        const places = googleData.results.map(place => ({
            name: place.name,
            geometry: {
                location: {
                    lat: place.geometry.location.lat,
                    lng: place.geometry.location.lng,
                }
            },
            vicinity: place.vicinity, // Indirizzo formattato o vicinanza
            formatted_address: place.formatted_address, // Indirizzo completo
            types: place.types // Array di tipi (es. 'restaurant', 'tourist_attraction')
            // Puoi aggiungere altri campi se Place Search li restituisce e ti servono
        }));

        // Restituisci i risultati al client
        return {
            statusCode: 200,
            body: JSON.stringify({ results: places }),
            headers: { 'Content-Type': 'application/json' },
        };

    } catch (error) {
        console.error("Errore durante la chiamata all'API di Google Places:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error during Places API call', error: error.message }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};
