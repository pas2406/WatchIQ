// ─────────────────────────────────────────────────────────────────────────────
//  WatchIQ — logique du catalogue
//  Récupère les montres depuis l'API FastAPI et les affiche dynamiquement.
// ─────────────────────────────────────────────────────────────────────────────

// Adresse de base de l'API (le serveur uvicorn).
const API_URL = "http://127.0.0.1:8000";

// Image affichée tant qu'une montre n'a pas de vraie photo (image_url vide).
const PLACEHOLDER_IMG = "logo.avif";


// ── Petit utilitaire : crée un élément avec sa classe et son texte 
// On utilise textContent (et pas innerHTML) : c'est sûr, ça n'interprète pas le
// HTML, donc pas de risque d'injection.
function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
}


// ── Formate un prix : 9500 -> "9 500 $" 
function formatPrice(value) {
    return value.toLocaleString("fr-FR") + " $";
}


// ── Construit la carte HTML d'une montre ──────────────────────────────────────
function createWatchCard(watch) {
    const article = el("article", "watch");

    // Image (placeholder si pas de photo)
    const img = el("img", "watch-img");
    img.src = watch.image_url || PLACEHOLDER_IMG;
    img.alt = `${watch.brand} ${watch.model}`;
    article.append(img);

    // Corps de la carte
    const body = el("div", "watch-body");
    body.append(el("div", "watch-brand", watch.brand));
    body.append(el("div", "watch-model", watch.model));

    // Ligne "specs" : ex. "Automatic · 40mm" — on n'affiche que ce qui existe.
    const specs = [
        watch.movement,
        watch.diameter_mm ? `${watch.diameter_mm}mm` : null,
    ].filter(Boolean).join(" · ");
    body.append(el("div", "watch-mecanism", specs));

    // Ligne du bas : prix + lien "Détails"
    const info = el("div", "watch-info");
    info.append(el("div", "watch-price", formatPrice(watch.retail_price)));

    const link = el("a", "watch-detail", "Détails");
    link.href = `watch.html?id=${watch.id}`;   // on passe l'id dans l'URL
    const linkWrap = el("div");
    linkWrap.append(link);
    info.append(linkWrap);

    body.append(info);
    article.append(body);
    return article;
}


// ── Affiche une liste de montres déjà récupérée ───────────────────────────────
function renderWatches(watches) {
    const list = document.querySelector("#watch-list");
    const quantity = document.querySelector("#quantity");

    list.innerHTML = "";                            // on vide l'affichage précédent

    if (watches.length === 0) {
        quantity.textContent = "Aucune montre trouvée";
        return;
    }

    quantity.textContent = `${watches.length} montres`;
    for (const watch of watches) {
        list.append(createWatchCard(watch));
    }
}


// ── Récupère des montres depuis l'API puis les affiche ────────────────────────
// `path` = la fin de l'URL, ex. "/watch/" ou "/watch/search?q=rolex".
async function fetchAndRender(path) {
    const quantity = document.querySelector("#quantity");
    quantity.textContent = "Chargement…";

    try {
        const response = await fetch(`${API_URL}${path}`, {
            headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("Erreur serveur");

        const watches = await response.json();
        renderWatches(watches);
    } catch (error) {
        quantity.textContent = "Impossible de charger le catalogue 😕";
        console.error(error);
    }
}


// ── Branche le formulaire de recherche ────────────────────────────────────────
function setupSearch() {
    const form = document.querySelector("#search-form");
    const input = document.querySelector("#search-input");
    if (!form) return;

    // submit = quand on tape Entrée ou qu'on valide le formulaire.
    form.addEventListener("submit", (event) => {
        event.preventDefault();                     // empêche le rechargement de la page
        const q = input.value.trim();

        // Champ vide -> on réaffiche tout le catalogue.
        if (q === "") {
            fetchAndRender("/watch/");
        } else {
            // encodeURIComponent protège les caractères spéciaux dans l'URL.
            fetchAndRender(`/watch/search?q=${encodeURIComponent(q)}`);
        }
    });
}


// ── Démarrage (defer garantit que le HTML est prêt) ───────────────────────────
// On ne lance rien si on n'est pas sur la page catalogue.
if (document.querySelector("#watch-list")) {
    setupSearch();
    fetchAndRender("/watch/");
}
