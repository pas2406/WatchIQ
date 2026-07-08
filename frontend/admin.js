// ─────────────────────────────────────────────────────────────────────────────
//  WatchIQ — page administration
//  Action 1 : lister l'inventaire (tableau + statistiques) depuis l'API.
// ─────────────────────────────────────────────────────────────────────────────

const API_URL = "http://127.0.0.1:8000";

// On garde la liste complète en mémoire pour pouvoir la filtrer sans re-appeler l'API.
let allWatches = [];

// null = mode "ajout" ; un id = mode "modification" de cette montre.
let editingId = null;


// Utilitaire : crée un élément avec sa classe et son texte.
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


// ── Met à jour les 3 cartes de statistiques ───────────────────────────────────
function renderStats(watches) {
    document.querySelector("#stat-count").textContent = watches.length;
    // new Set(...).size = nombre de marques distinctes.
    document.querySelector("#stat-brands").textContent = new Set(watches.map((w) => w.brand)).size;
    document.querySelector("#stat-available").textContent = watches.filter((w) => w.is_available).length;
}


// ── Construit une ligne du tableau pour une montre ────────────────────────────
function createRow(watch) {
    const tr = el("tr");

    // Colonne "Montre" : marque + modèle
    const tdName = el("td");
    tdName.append(el("div", "marque", watch.brand));
    tdName.append(el("div", "modele", watch.model));
    tr.append(tdName);

    // Colonne "Référence" (vide pour les montres du dataset -> tiret)
    tr.append(el("td", null, watch.reference || "—"));

    // Colonne "Prix"
    tr.append(el("td", null, formatPrice(watch.retail_price)));

    // Colonne actions : Modifier + Supprimer. data-action distingue les deux.
    const tdActions = el("td");

    const edit = el("button", "btn-ghost", "Modifier");
    edit.dataset.id = watch.id;
    edit.dataset.action = "edit";

    const del = el("button", "btn-fill", "Supprimer");
    del.dataset.id = watch.id;
    del.dataset.action = "delete";

    tdActions.append(edit, del);
    tr.append(tdActions);

    return tr;
}


// ── Remplit le tableau ────────────────────────────────────────────────────────
function renderTable(watches) {
    const tbody = document.querySelector("#admin-tbody");
    tbody.innerHTML = "";
    for (const watch of watches) {
        tbody.append(createRow(watch));
    }
}


// ── Charge l'inventaire depuis l'API ──────────────────────────────────────────
async function loadInventory() {
    const tbody = document.querySelector("#admin-tbody");
    if (!tbody) return;                              // pas sur la page admin

    try {
        const response = await fetch(`${API_URL}/watch/`, {
            headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("Erreur serveur");

        allWatches = await response.json();
        renderStats(allWatches);       // les stats portent sur tout l'inventaire
        renderTable(allWatches);
    } catch (error) {
        console.error(error);
    }
}


// ── Affiche le tableau en tenant compte du filtre courant ─────────────────────
function applyFilter() {
    const input = document.querySelector("#admin-search");
    const term = input ? input.value.trim().toLowerCase() : "";

    const filtered = term
        ? allWatches.filter((w) => `${w.brand} ${w.model}`.toLowerCase().includes(term))
        : allWatches;

    renderTable(filtered);
}


// ── Filtre instantané du tableau (par marque ou modèle) ───────────────────────
function setupAdminSearch() {
    const input = document.querySelector("#admin-search");
    if (!input) return;

    // input = à chaque frappe. On filtre la liste déjà en mémoire (pas d'appel API).
    input.addEventListener("input", applyFilter);
}


// ── Pré-remplit le formulaire avec une montre (mode modification) ─────────────
function fillForm(watch) {
    const set = (id, value) => { document.querySelector(id).value = value ?? ""; };
    set("#brandinput", watch.brand);
    set("#modelinput", watch.model);
    set("#prixinput", watch.retail_price);
    set("#resaleinput", watch.resale_price);
    set("#caseinput", watch.case_material);
    set("#braceletinput", watch.bracelet);
    set("#mvtinput", watch.movement);
    set("#waterinput", watch.water_resistance);
    set("#crystalinput", watch.crystal);
    set("#complicationsinput", watch.complications);
    set("#powerinput", watch.power_reserve);
    set("#dialinput", watch.dial_color);
    set("#diametre-input", watch.diameter_mm);
    set("#thicknessinput", watch.thickness_mm);
    set("#bandwidthinput", watch.band_width_mm);
    set("#Refinput", watch.reference);
    set("#categoryinput", watch.category);
    set("#yearinput", watch.release_year);
    set("#imageinput", watch.image_url);
    set("#description-input", watch.description);
    document.querySelector("#availableinput").checked = watch.is_available;
}


// ── Ouvre la modale en mode "ajout" ───────────────────────────────────────────
function openModalForCreate() {
    editingId = null;
    document.querySelector("#create-form").reset();
    document.querySelector("#modal-title").textContent = "Ajouter une montre";
    document.querySelector("#create-submit").textContent = "Ajouter la montre";
    showMessage("", "");
    document.querySelector("#create-modal").classList.add("open");
}


// ── Ouvre la modale en mode "modification" (pré-remplie) ──────────────────────
function openModalForEdit(watch) {
    editingId = watch.id;
    fillForm(watch);
    document.querySelector("#modal-title").textContent = "Modifier la montre";
    document.querySelector("#create-submit").textContent = "Enregistrer";
    showMessage("", "");
    document.querySelector("#create-modal").classList.add("open");
}


// ── Fermeture de la modale (croix, annuler, clic sur le voile) ────────────────
function setupCreateModal() {
    const modal = document.querySelector("#create-modal");
    const openBtn = document.querySelector("#open-create");
    const closeBtn = document.querySelector("#create-close");
    const cancelBtn = document.querySelector("#create-cancel");
    if (!modal) return;

    const close = () => modal.classList.remove("open");

    openBtn.addEventListener("click", openModalForCreate);
    closeBtn.addEventListener("click", close);
    cancelBtn.addEventListener("click", close);
    modal.addEventListener("click", (event) => {
        if (event.target === modal) close();
    });
}


// ── Fenêtre de confirmation centrée (remplace le confirm() du navigateur) ─────
// Renvoie une Promise : true si l'utilisateur confirme, false sinon.
function confirmDialog(message) {
    return new Promise((resolve) => {
        const modal = document.querySelector("#confirm-modal");
        const text = document.querySelector("#confirm-text");
        const okBtn = document.querySelector("#confirm-ok");
        const cancelBtn = document.querySelector("#confirm-cancel");

        // Sécurité : si la modale n'existe pas, on retombe sur le confirm natif.
        if (!modal) { resolve(window.confirm(message)); return; }

        text.textContent = message;
        modal.classList.add("open");

        // Ferme la modale et renvoie le résultat, en retirant les écouteurs.
        const close = (result) => {
            modal.classList.remove("open");
            okBtn.removeEventListener("click", onOk);
            cancelBtn.removeEventListener("click", onCancel);
            modal.removeEventListener("click", onBackdrop);
            resolve(result);
        };
        const onOk = () => close(true);
        const onCancel = () => close(false);
        const onBackdrop = (event) => {          // clic sur le voile (hors boîte) = annuler
            if (event.target === modal) close(false);
        };

        okBtn.addEventListener("click", onOk);
        cancelBtn.addEventListener("click", onCancel);
        modal.addEventListener("click", onBackdrop);
    });
}


// ── Action 3 : supprimer une montre (DELETE) ──────────────────────────────────
function setupDelete() {
    const tbody = document.querySelector("#admin-tbody");
    if (!tbody) return;

    // Un seul écouteur sur tout le tableau (délégation). On ne réagit qu'au bouton Supprimer.
    tbody.addEventListener("click", async (event) => {
        const button = event.target.closest("button[data-action='delete']");
        if (!button) return;

        const id = button.dataset.id;

        // Attend la réponse de la fenêtre de confirmation centrée.
        const confirmed = await confirmDialog("Supprimer cette montre ?");
        if (!confirmed) return;

        try {
            const response = await fetch(`${API_URL}/watch/${id}`, { method: "DELETE" });

            if (response.status === 404) {
                showMessage("Montre introuvable.", "error");
                return;
            }
            if (!response.ok) throw new Error("Erreur serveur");   // 204 est "ok"

            // On retire la montre de la liste en mémoire, puis on rafraîchit.
            allWatches = allWatches.filter((w) => String(w.id) !== String(id));
            renderStats(allWatches);
            applyFilter();                                   // garde le filtre courant
            showMessage("🗑️ Montre supprimée.", "ok");
        } catch (error) {
            showMessage("Impossible de supprimer la montre. 😕", "error");
            console.error(error);
        }
    });
}


// ── Affiche un message de retour sous le formulaire ───────────────────────────
function showMessage(text, type) {
    const message = document.querySelector("#form-message");
    if (!message) return;
    message.textContent = text;
    message.className = type === "ok" ? "form-message-ok" : "form-message-error";
}


// ── Lit le formulaire et construit le corps JSON à envoyer ────────────────────
function readForm() {
    // texte : valeur nettoyée, ou null si vide
    const text = (id) => document.querySelector(id).value.trim() || null;
    // nombre décimal : null si vide, sinon float
    const number = (id) => {
        const v = document.querySelector(id).value.trim();
        return v === "" ? null : parseFloat(v);
    };
    // nombre entier : null si vide, sinon int
    const integer = (id) => {
        const v = document.querySelector(id).value.trim();
        return v === "" ? null : parseInt(v, 10);
    };

    return {
        brand:            text("#brandinput"),
        model:            text("#modelinput"),
        retail_price:     number("#prixinput"),
        resale_price:     number("#resaleinput"),
        case_material:    text("#caseinput"),
        bracelet:         text("#braceletinput"),
        movement:         text("#mvtinput"),
        water_resistance: text("#waterinput"),
        crystal:          text("#crystalinput"),
        complications:    text("#complicationsinput"),
        power_reserve:    text("#powerinput"),
        dial_color:       text("#dialinput"),
        diameter_mm:      number("#diametre-input"),
        thickness_mm:     number("#thicknessinput"),
        band_width_mm:    number("#bandwidthinput"),
        reference:        text("#Refinput"),
        category:         text("#categoryinput"),
        release_year:     integer("#yearinput"),
        image_url:        text("#imageinput"),
        description:      text("#description-input"),
        is_available:     document.querySelector("#availableinput").checked,
    };
}


// ── Action 2 : créer une montre (POST) ────────────────────────────────────────
function setupCreateForm() {
    const form = document.querySelector("#create-form");
    if (!form) return;

    // submit = clic sur le bouton OU touche Entrée.
    form.addEventListener("submit", async (event) => {
        event.preventDefault();                      // pas de rechargement de page

        const payload = readForm();

        // Validation minimale côté client (les 3 champs obligatoires de l'API).
        if (!payload.brand || !payload.model || payload.retail_price === null) {
            showMessage("Marque, modèle et prix sont obligatoires.", "error");
            return;
        }

        // Mode ajout (POST) ou modification (PATCH) selon editingId.
        const isEdit = editingId !== null;
        const url = isEdit ? `${API_URL}/watch/${editingId}` : `${API_URL}/watch/`;
        const method = isEdit ? "PATCH" : "POST";

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",   // on annonce qu'on envoie du JSON
                    Accept: "application/json",
                },
                body: JSON.stringify(payload),            // l'objet JS -> texte JSON
            });

            if (response.status === 422) {
                showMessage("Données invalides (vérifie les champs).", "error");
                return;
            }
            if (!response.ok) throw new Error("Erreur serveur");

            await response.json();
            form.reset();                                // vide le formulaire
            editingId = null;                            // on repasse en mode ajout
            loadInventory();                             // rafraîchit tableau + stats
            document.querySelector("#create-modal").classList.remove("open");  // ferme la modale
        } catch (error) {
            showMessage("Impossible d'enregistrer la montre. 😕", "error");
            console.error(error);
        }
    });
}


// ── Action 4 : modifier une montre (ouvre la modale pré-remplie) ──────────────
function setupEdit() {
    const tbody = document.querySelector("#admin-tbody");
    if (!tbody) return;

    tbody.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-action='edit']");
        if (!button) return;

        const id = Number(button.dataset.id);
        const watch = allWatches.find((w) => w.id === id);
        if (watch) openModalForEdit(watch);
    });
}


// ── Démarrage ─────────────────────────────────────────────────────────────────
loadInventory();
setupCreateForm();
setupCreateModal();
setupAdminSearch();
setupDelete();
setupEdit();
