// ─────────────────────────────────────────────────────────────────────────────
//  WatchIQ — page Versus (comparateur)
//  Deux sélecteurs cherchables ; quand les deux montres sont choisies, on les
//  compare côte à côte via GET /watch/compare?ids=A,B.
// ─────────────────────────────────────────────────────────────────────────────

const API_URL = "http://127.0.0.1:8000";
const PLACEHOLDER_IMG = "logo.avif";

let allWatches = [];                 // toutes les montres (pour remplir les listes)
const selected = { a: null, b: null };   // ids choisis dans chaque colonne


// Caractéristiques affichées (comme sur la page détail).
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
    ["Prix de revente",   "resale_price",  (v) => v.toLocaleString("fr-FR") + " $"],
];


function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
}

function formatPrice(value) {
    return value.toLocaleString("fr-FR") + " $";
}


// ── Remplit la liste d'un sélecteur (filtrée par le terme de recherche) ───────
function renderOptions(slot, term = "") {
    const list = document.querySelector(`#vs-list-${slot}`);
    list.innerHTML = "";

    const t = term.toLowerCase();
    const filtered = t
        ? allWatches.filter((w) => `${w.brand} ${w.model}`.toLowerCase().includes(t))
        : allWatches;

    for (const w of filtered) {
        const li = el("li", "dropdown-option", `${w.brand} ${w.model}`);
        li.dataset.id = w.id;
        list.append(li);
    }
}


// ── Branche un sélecteur cherchable (slot = "a" ou "b") ───────────────────────
function setupSelector(slot) {
    const dropdown = document.querySelector(`#vs-select-${slot}`);
    const toggle = document.querySelector(`#vs-toggle-${slot}`);
    const menu = document.querySelector(`#vs-menu-${slot}`);
    const search = document.querySelector(`#vs-search-${slot}`);
    const list = document.querySelector(`#vs-list-${slot}`);

    // Ouvre/ferme la liste ; à l'ouverture, on réinitialise la recherche.
    toggle.addEventListener("click", (event) => {
        event.stopPropagation();
        const willOpen = !menu.classList.contains("open");
        menu.classList.toggle("open");
        if (willOpen) {
            search.value = "";
            renderOptions(slot);
            search.focus();
        }
    });

    // Filtre en direct pendant qu'on tape.
    search.addEventListener("input", () => renderOptions(slot, search.value.trim()));

    // Choix d'une montre (délégation d'événement sur la liste).
    list.addEventListener("click", (event) => {
        const option = event.target.closest(".dropdown-option");
        if (!option) return;

        selected[slot] = Number(option.dataset.id);
        toggle.textContent = option.textContent;
        menu.classList.remove("open");
        updateComparison();
    });

    // Clic en dehors du sélecteur -> on ferme.
    document.addEventListener("click", (event) => {
        if (!dropdown.contains(event.target)) menu.classList.remove("open");
    });
}


// ── Affiche la fiche d'une montre dans une colonne ────────────────────────────
function renderColumn(slot, watch) {
    const container = document.querySelector(`#vs-card-${slot}`);
    container.innerHTML = "";

    if (!watch) {
        container.append(el("div", "vs-placeholder", "Choisis une montre"));
        return;
    }

    const img = el("img", "vs-card-img");
    img.src = watch.image_url || PLACEHOLDER_IMG;
    img.alt = `${watch.brand} ${watch.model}`;
    container.append(img);

    container.append(el("div", "detail-brand", watch.brand));
    container.append(el("div", "detail-model", watch.model));

    const priceRow = el("div", "detail-price-row");
    priceRow.append(el("span", "detail-price", formatPrice(watch.retail_price)));
    container.append(priceRow);

    const specs = el("div", "specs");
    for (const [label, field, format] of SPECS) {
        const value = watch[field];
        if (value === null || value === undefined || value === "") continue;

        const row = el("div", "spec-row");
        row.append(el("span", "spec-label", label));
        row.append(el("span", "spec-value", format ? format(value) : value));
        specs.append(row);
    }
    container.append(specs);
}


// ── Met à jour les deux colonnes selon la sélection ───────────────────────────
async function updateComparison() {
    // Si DEUX montres différentes sont choisies -> on utilise l'endpoint compare.
    if (selected.a && selected.b && selected.a !== selected.b) {
        try {
            const response = await fetch(
                `${API_URL}/watch/compare?ids=${selected.a},${selected.b}`,
                { headers: { Accept: "application/json" } }
            );
            if (!response.ok) throw new Error("Erreur serveur");

            const watches = await response.json();
            renderColumn("a", watches.find((w) => w.id === selected.a));
            renderColumn("b", watches.find((w) => w.id === selected.b));
            return;
        } catch (error) {
            console.error(error);
        }
    }

    // Sinon (une seule choisie, ou la même des deux côtés) : affichage indépendant.
    renderColumn("a", allWatches.find((w) => w.id === selected.a));
    renderColumn("b", allWatches.find((w) => w.id === selected.b));
}


// ── Démarrage ─────────────────────────────────────────────────────────────────
async function init() {
    const wrap = document.querySelector("#versus");
    if (!wrap) return;

    try {
        const response = await fetch(`${API_URL}/watch/`, {
            headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("Erreur serveur");

        allWatches = await response.json();

        renderOptions("a");
        renderOptions("b");
        setupSelector("a");
        setupSelector("b");
        renderColumn("a", null);       // placeholders au départ
        renderColumn("b", null);
    } catch (error) {
        console.error(error);
    }
}


init();
