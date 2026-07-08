// ─────────────────────────────────────────────────────────────────────────────
//  WatchIQ — page détail d'une montre
//  Lit l'id dans l'URL (watch.html?id=42), appelle GET /watch/42, affiche la fiche.
// ─────────────────────────────────────────────────────────────────────────────

const API_URL = "http://127.0.0.1:8000";
const PLACEHOLDER_IMG = "logo.avif";


// Utilitaire : crée un élément avec sa classe et son texte (textContent = sûr).
function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
}

// Formate un prix : 9500 -> "9 500 $"
function formatPrice(value) {
    return value.toLocaleString("fr-FR") + " $";
}


// Liste des caractéristiques à afficher : [libellé, champ, (formateur optionnel)].
// On n'affichera une ligne que si la valeur existe.
const SPECS = [
    ["Mouvement",         "movement"],
    ["Diamètre",          "diameter_mm",   (v) => `${v} mm`],
    ["Épaisseur",         "thickness_mm",  (v) => `${v} mm`],
    ["Largeur bracelet",  "band_width_mm", (v) => `${v} mm`],
    ["Matière boîtier",   "case_material"],
    ["Bracelet",          "bracelet"],
    ["Étanchéité",        "water_resistance"],
    ["Verre",             "crystal"],
    ["Complications",     "complications"],
    ["Réserve de marche", "power_reserve"],
    ["Couleur du cadran", "dial_color"],
    ["Catégorie",         "category"],
    ["Référence",         "reference"],
    ["Année de sortie",   "release_year"],
    ["Prix de revente",   "resale_price",  formatPrice],
];


// Récupère l'id passé dans l'URL (?id=...).
function getWatchId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}


// Affiche un message d'erreur propre à la place de la fiche.
function showError(message) {
    const container = document.querySelector("#watch-detail");
    container.innerHTML = "";
    container.append(el("div", "detail-error", message));
}


// Construit et affiche la fiche complète d'une montre.
function renderWatch(watch) {
    const container = document.querySelector("#watch-detail");
    container.innerHTML = "";

    const detail = el("div", "detail");

    // Colonne image
    const img = el("img", "detail-img");
    img.src = watch.image_url || PLACEHOLDER_IMG;
    img.alt = `${watch.brand} ${watch.model}`;
    detail.append(img);

    // Colonne infos
    const info = el("div", "detail-info");
    info.append(el("div", "detail-brand", watch.brand));
    info.append(el("div", "detail-model", watch.model));

    // Ligne prix + badge de disponibilité
    const priceRow = el("div", "detail-price-row");
    priceRow.append(el("span", "detail-price", formatPrice(watch.retail_price)));
    if (watch.is_available) {
        priceRow.append(el("span", "badge badge-ok", "● Disponible"));
    } else {
        priceRow.append(el("span", "badge badge-off", "● Indisponible"));
    }
    info.append(priceRow);

    // Tableau des caractéristiques (uniquement celles qui existent)
    const specs = el("div", "specs");
    for (const [label, field, format] of SPECS) {
        const value = watch[field];
        if (value === null || value === undefined || value === "") continue;

        const row = el("div", "spec-row");
        row.append(el("span", "spec-label", label));
        row.append(el("span", "spec-value", format ? format(value) : value));
        specs.append(row);
    }
    info.append(specs);

    detail.append(info);
    container.append(detail);

    // Met à jour le titre de l'onglet.
    document.title = `${watch.brand} ${watch.model} — WatchIQ`;
}


// Point d'entrée : charge la montre correspondant à l'id de l'URL.
async function loadWatch() {
    const container = document.querySelector("#watch-detail");
    if (!container) return;                          // pas sur la page détail

    const id = getWatchId();
    if (!id) {
        showError("Aucune montre spécifiée dans l'adresse.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/watch/${id}`, {
            headers: { Accept: "application/json" },
        });

        if (response.status === 404) {
            showError("Cette montre n'existe pas.");
            return;
        }
        if (!response.ok) throw new Error("Erreur serveur");

        const watch = await response.json();
        renderWatch(watch);
    } catch (error) {
        showError("Impossible de charger la montre. 😕");
        console.error(error);
    }
}


loadWatch();
