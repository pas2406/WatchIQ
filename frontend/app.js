// ─────────────────────────────────────────────────────────────────────────────
//  WatchIQ — logique du catalogue
//  Récupère les montres depuis l'API FastAPI et les affiche dynamiquement.
// ─────────────────────────────────────────────────────────────────────────────

// API_URL est défini dans config.js (chargé avant ce script).

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
    img.loading = "lazy";        // le navigateur ne charge l'image que si elle approche de l'écran
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


// ── Pagination ────────────────────────────────────────────────────────────────
// On ne télécharge plus les 504 montres d'un coup : on demande des « pages » de
// PAGE_SIZE montres à l'API, et le bouton « Charger plus » demande la suivante.
const PAGE_SIZE = 24;

let currentPath = "/watch/";   // la requête en cours SANS limit/offset
let currentOffset = 0;         // où on en est (combien de montres déjà chargées)
let loadedCount = 0;           // nombre total de montres actuellement affichées
let reachedEnd = false;        // vrai quand l'API a renvoyé une page incomplète

// Ajoute limit/offset à un chemin, en gérant le "?" déjà présent (ex. ?brand=Rolex).
function pagedUrl(path, offset) {
    const sep = path.includes("?") ? "&" : "?";
    return `${API_URL}${path}${sep}limit=${PAGE_SIZE}&offset=${offset}`;
}

// Met à jour le compteur et l'état du bouton « Charger plus ».
function updateUI() {
    const quantity = document.querySelector("#quantity");
    const btn = document.querySelector("#load-more");

    if (loadedCount === 0) {
        quantity.textContent = "Aucune montre trouvée";
    } else {
        // On n'affiche "+" que s'il reste potentiellement des montres à charger.
        quantity.textContent = reachedEnd ? `${loadedCount} montres`
                                          : `${loadedCount}+ montres`;
    }

    if (btn) {
        btn.hidden = reachedEnd || loadedCount === 0;
        btn.textContent = "Voir plus de montres";
        btn.disabled = false;
    }
}

// Charge UNE page depuis l'API. append=false => nouvelle recherche (on vide) ;
// append=true => on ajoute à la suite (clic sur « Charger plus »).
async function loadPage(append) {
    const list = document.querySelector("#watch-list");
    const quantity = document.querySelector("#quantity");
    const btn = document.querySelector("#load-more");

    if (!append) quantity.textContent = "Chargement…";
    if (btn && append) { btn.textContent = "Chargement…"; btn.disabled = true; }

    try {
        const response = await fetch(pagedUrl(currentPath, currentOffset), {
            headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("Erreur serveur");

        const watches = await response.json();

        if (!append) { list.innerHTML = ""; loadedCount = 0; }

        for (const watch of watches) list.append(createWatchCard(watch));

        loadedCount   += watches.length;
        currentOffset += watches.length;
        // Une page incomplète (< PAGE_SIZE) signifie qu'il n'y a plus rien après.
        reachedEnd = watches.length < PAGE_SIZE;

        updateUI();
    } catch (error) {
        quantity.textContent = "Impossible de charger le catalogue 😕";
        if (btn) { btn.textContent = "Réessayer"; btn.disabled = false; }
        console.error(error);
    }
}

// Démarre une NOUVELLE requête (remet la pagination à zéro).
// `path` = ex. "/watch/", "/watch/?brand=Rolex", "/watch/search?q=rolex".
function fetchAndRender(path) {
    currentPath = path;
    currentOffset = 0;
    loadedCount = 0;
    reachedEnd = false;
    loadPage(false);
}

// Branche le bouton « Charger plus » (clic => page suivante, ajoutée à la suite).
function setupLoadMore() {
    const btn = document.querySelector("#load-more");
    if (!btn) return;
    btn.addEventListener("click", () => loadPage(true));
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
        // Point d'API léger : renvoie SEULEMENT les noms de marques (distincts, triés),
        // pas les 504 montres. Avant, on téléchargeait tout le catalogue une 2ᵉ fois ici !
        const response = await fetch(`${API_URL}/watch/brands`, {
            headers: { Accept: "application/json" },
        });
        const brands = await response.json();

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
    setupLoadMore();
    populateBrands();
    fetchAndRender("/watch/");
}
