// ─────────────────────────────────────────────────────────────────────────────
//  Configuration globale du frontend
//  API_URL = l'adresse de base de l'API, choisie automatiquement :
//    - en local (localhost / 127.0.0.1) -> le backend lancé sur ton PC
//    - sinon (site déployé) -> l'URL du backend sur Render
//  ⚠️ Après avoir déployé le backend, remplace API_BASE_PROD par ta vraie URL Render.
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE_LOCAL = "http://127.0.0.1:8000";
const API_BASE_PROD  = "https://REMPLACER-PAR-URL-RENDER.onrender.com";

const API_URL =
    (location.hostname === "localhost" || location.hostname === "127.0.0.1")
        ? API_BASE_LOCAL
        : API_BASE_PROD;
