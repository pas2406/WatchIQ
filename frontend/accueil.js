// ─────────────────────────────────────────────────────────────────────────────
//  WatchIQ — page d'accueil
//  Carrousel horizontal d'une sélection de montres (défilement auto + flèches).
// ─────────────────────────────────────────────────────────────────────────────

// API_URL est défini dans config.js (chargé avant ce script).
const PLACEHOLDER_IMG = "logo.avif";
const SELECTION_SIZE = 12;          // nombre de montres dans le carrousel


function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
}

function formatPrice(value) {
    return value.toLocaleString("fr-FR") + " $";
}


// Construit une carte montre (identique au catalogue).
function createWatchCard(watch) {
    const article = el("article", "watch");

    const img = el("img", "watch-img");
    img.src = watch.image_url || PLACEHOLDER_IMG;
    img.alt = `${watch.brand} ${watch.model}`;
    article.append(img);

    const body = el("div", "watch-body");
    body.append(el("div", "watch-brand", watch.brand));
    body.append(el("div", "watch-model", watch.model));

    const specs = [
        watch.movement,
        watch.diameter_mm ? `${watch.diameter_mm}mm` : null,
    ].filter(Boolean).join(" · ");
    body.append(el("div", "watch-mecanism", specs));

    const info = el("div", "watch-info");
    info.append(el("div", "watch-price", formatPrice(watch.retail_price)));

    const link = el("a", "watch-detail", "Détails");
    link.href = `watch.html?id=${watch.id}`;
    const linkWrap = el("div");
    linkWrap.append(link);
    info.append(linkWrap);

    body.append(info);
    article.append(body);
    return article;
}


// ── Gère les flèches et le défilement continu ─────────────────────────────────
function setupCarousel(track) {
    const prev = document.querySelector("#carousel-prev");
    const next = document.querySelector("#carousel-next");

    // "Période" de la boucle = distance entre la 1re carte et son double (la copie).
    // Quand on l'a parcourue, on revient en arrière de cette distance -> boucle invisible.
    const cards = track.querySelectorAll(".watch");
    const period = cards.length > SELECTION_SIZE
        ? cards[SELECTION_SIZE].offsetLeft - cards[0].offsetLeft
        : track.scrollWidth / 2;

    // On garde la position dans une variable (accumule les fractions de pixel,
    // même si le navigateur arrondit scrollLeft à l'entier à l'affichage).
    let pos = 0;
    const SPEED = 0.6;   // pixels par image (~36 px/s à 60 fps)

    const apply = () => { track.scrollLeft = pos; };

    // Flèches : un « pas » = une carte + l'espacement (gap 1.5rem = 24px).
    const step = () => {
        const card = track.querySelector(".watch");
        return card ? card.offsetWidth + 24 : 380;
    };
    next.addEventListener("click", () => { pos = (pos + step()) % period; apply(); });
    prev.addEventListener("click", () => { pos = (pos - step() + period) % period; apply(); });

    // Défilement continu, mis en pause au survol.
    let paused = false;
    track.addEventListener("mouseenter", () => { paused = true; });
    track.addEventListener("mouseleave", () => { paused = false; });

    function tick() {
        if (!paused) {
            pos += SPEED;
            if (pos >= period) pos -= period;   // boucle sans couture
            apply();
        }
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}


// ── Charge la sélection et remplit le carrousel ───────────────────────────────
async function loadCarousel() {
    const track = document.querySelector("#carousel-track");
    if (!track) return;                          // pas sur la page d'accueil

    try {
        const response = await fetch(`${API_URL}/watch/`, {
            headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("Erreur serveur");

        const watches = await response.json();
        const selection = watches.slice(0, SELECTION_SIZE);

        // On ajoute la sélection DEUX fois : la copie permet de boucler sans couture.
        for (const watch of selection) track.append(createWatchCard(watch));
        for (const watch of selection) track.append(createWatchCard(watch));

        setupCarousel(track);
    } catch (error) {
        console.error(error);
    }
}


loadCarousel();
