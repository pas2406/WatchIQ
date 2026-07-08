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

        // Cohérence : lancer une recherche réinitialise le filtre marque.
        resetBrandSelection();

        // Champ vide -> on réaffiche tout le catalogue.
        if (q === "") {
            fetchAndRender("/watch/");
        } else {
            // encodeURIComponent protège les caractères spéciaux dans l'URL.
            fetchAndRender(`/watch/search?q=${encodeURIComponent(q)}`);
        }
    });
}


// ── Remplit la liste des marques (générée depuis l'API) ───────────────────────
async function populateBrands() {
    const menu = document.querySelector("#brand-menu");
    if (!menu) return;

    try {
        const response = await fetch(`${API_URL}/watch/`, {
            headers: { Accept: "application/json" },
        });
        const watches = await response.json();

        // new Set(...) supprime les doublons : chaque marque n'apparaît qu'une fois.
        const brands = [...new Set(watches.map((w) => w.brand))].sort();

        for (const brand of brands) {
            const li = document.createElement("li");
            li.className = "dropdown-option";
            li.dataset.value = brand;        // la valeur envoyée à l'API
            li.textContent = brand;          // le texte affiché
            menu.append(li);
        }
    } catch (error) {
        console.error("Impossible de charger les marques", error);
    }
}


// ── Applique le choix d'une marque (affichage + requête API) ──────────────────
function selectBrand(value, label) {
    const toggle = document.querySelector("#brand-toggle");
    const searchInput = document.querySelector("#search-input");

    toggle.textContent = label;              // le bouton affiche la marque choisie

    // On surligne l'option choisie dans la liste.
    document.querySelectorAll(".dropdown-option").forEach((option) =>
        option.classList.toggle("selected", option.dataset.value === value)
    );

    if (searchInput) searchInput.value = ""; // cohérence : efface la recherche

    if (value === "") {
        fetchAndRender("/watch/");           // "Toutes les marques"
    } else {
        fetchAndRender(`/watch/?brand=${encodeURIComponent(value)}`);
    }
}


// ── Remet le filtre marque à zéro (utilisé quand on lance une recherche) ──────
function resetBrandSelection() {
    const toggle = document.querySelector("#brand-toggle");
    if (toggle) toggle.textContent = "Toutes les marques";

    document.querySelectorAll(".dropdown-option").forEach((option) =>
        option.classList.toggle("selected", option.dataset.value === "")
    );
}


// ── Branche le menu déroulant personnalisé ────────────────────────────────────
function setupBrandFilter() {
    const dropdown = document.querySelector("#brand-dropdown");
    const toggle = document.querySelector("#brand-toggle");
    const menu = document.querySelector("#brand-menu");
    if (!dropdown) return;

    // Clic sur le bouton -> ouvre/ferme la liste.
    toggle.addEventListener("click", (event) => {
        event.stopPropagation();             // empêche le "clic ailleurs" de refermer aussitôt
        menu.classList.toggle("open");
    });

    // Clic sur une marque (délégation : un seul écouteur sur toute la liste).
    menu.addEventListener("click", (event) => {
        const option = event.target.closest(".dropdown-option");
        if (!option) return;
        selectBrand(option.dataset.value, option.textContent.trim());
        menu.classList.remove("open");       // referme après le choix
    });

    // Clic n'importe où ailleurs dans la page -> referme le menu.
    document.addEventListener("click", (event) => {
        if (!dropdown.contains(event.target)) menu.classList.remove("open");
    });
}


// ── Démarrage (defer garantit que le HTML est prêt) ───────────────────────────
// On ne lance rien si on n'est pas sur la page catalogue.
if (document.querySelector("#watch-list")) {
    setupSearch();
    setupBrandFilter();
    populateBrands();
    fetchAndRender("/watch/");
}
