from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy import select, or_
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import Watch
from schemas import WatchCreate, WatchUpdate, WatchOut

router = APIRouter()


# ── Lister / Filtrer ──────────────────────────────────────────────────────────

@router.get("/", response_model=List[WatchOut])
def list_watches(
    brand:     Optional[str]   = Query(None),
    category:  Optional[str]   = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    # ── Pagination (opt-in) ───────────────────────────────────────────────────
    # limit = combien de montres renvoyer ; offset = combien en sauter (à partir
    # de quelle position). Si limit est None, on renvoie TOUT comme avant : ça
    # évite de casser admin/versus/accueil qui attendent la liste complète.
    limit:     Optional[int]   = Query(None, ge=1, le=100),
    offset:    int             = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    On part de select(Watch) et on ajoute des .where() seulement pour les filtres
    fournis. ilike = LIKE insensible à la casse. Chaque .where() renvoie une NOUVELLE
    requête, d'où le stmt = stmt.where(...).
    """
    stmt = select(Watch)

    if brand:
        stmt = stmt.where(Watch.brand.ilike(f"%{brand}%"))
    if category:
        stmt = stmt.where(Watch.category.ilike(f"%{category}%"))
    if min_price is not None:
        stmt = stmt.where(Watch.retail_price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Watch.retail_price <= max_price)

    # On pagine SEULEMENT si le client a demandé un limit. .offset(n).limit(m)
    # se traduit en SQL par « OFFSET n LIMIT m » : la base ne renvoie qu'une tranche.
    if limit is not None:
        stmt = stmt.order_by(Watch.id).offset(offset).limit(limit)

    # scalars(...).all() renvoie une liste d'objets Watch (pas des tuples).
    return db.scalars(stmt).all()


# ── Rechercher ────────────────────────────────────────────────────────────────

@router.get("/search", response_model=List[WatchOut])
def search_watches(
    q: str = Query(..., min_length=1),
    limit:  Optional[int] = Query(None, ge=1, le=100),
    offset: int           = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Recherche plein-texte sur brand, model, dial_color (or_ = OU logique)."""
    term = f"%{q}%"
    stmt = select(Watch).where(
        or_(
            Watch.brand.ilike(term),
            Watch.model.ilike(term),
            Watch.dial_color.ilike(term),
        )
    )
    if limit is not None:
        stmt = stmt.order_by(Watch.id).offset(offset).limit(limit)
    return db.scalars(stmt).all()


# ── Lister les marques (léger : juste des noms, pas les 504 montres) ───────────

@router.get("/brands", response_model=List[str])
def list_brands(db: Session = Depends(get_db)):
    """
    Renvoie la liste des marques distinctes, triées. C'est BEAUCOUP plus léger que
    de télécharger toutes les montres juste pour en extraire les marques côté front.
    select(Watch.brand).distinct() = « SELECT DISTINCT brand FROM watches ».

    ⚠️ Doit être déclaré AVANT la route /{watch_id}, sinon FastAPI croirait que
    « brands » est un id de montre (et renverrait une erreur).
    """
    stmt = select(Watch.brand).distinct().order_by(Watch.brand)
    return db.scalars(stmt).all()


# ── Comparer ──────────────────────────────────────────────────────────────────

@router.get("/compare", response_model=List[WatchOut])
def compare_watches(
    ids: str = Query(..., description="IDs séparés par virgule : 1,2"),
    db: Session = Depends(get_db),
):
    """SELECT ... WHERE id IN (...) via Watch.id.in_(liste)."""
    try:
        id_list = [int(i) for i in ids.split(",")]
    except ValueError:
        raise HTTPException(status_code=400, detail="IDs invalides")

    if len(id_list) < 2:
        raise HTTPException(status_code=400, detail="Fournir au moins 2 IDs")

    rows = db.scalars(select(Watch).where(Watch.id.in_(id_list))).all()

    if len(rows) < 2:
        raise HTTPException(status_code=404, detail="Un ou plusieurs IDs introuvables")

    return rows


# ── Voir une montre ───────────────────────────────────────────────────────────

@router.get("/{watch_id}", response_model=WatchOut)
def get_watch(watch_id: int, db: Session = Depends(get_db)):
    """db.get(Watch, id) = récupération directe par clé primaire (le plus simple)."""
    watch = db.get(Watch, watch_id)
    if not watch:
        raise HTTPException(status_code=404, detail="Watch introuvable")
    return watch


# ── Créer ─────────────────────────────────────────────────────────────────────

@router.post("/", response_model=WatchOut, status_code=201)
def create_watch(payload: WatchCreate, db: Session = Depends(get_db)):
    """
    On construit un objet Watch à partir du payload validé, on l'ajoute à la
    session, on valide (commit), puis refresh pour récupérer l'id auto-généré.
    """
    watch = Watch(**payload.model_dump())
    db.add(watch)
    db.commit()
    db.refresh(watch)
    return watch


# ── Modifier ──────────────────────────────────────────────────────────────────

@router.patch("/{watch_id}", response_model=WatchOut)
def update_watch(watch_id: int, payload: WatchUpdate, db: Session = Depends(get_db)):
    """
    On récupère l'objet, puis on modifie SES attributs Python : SQLAlchemy suit
    les changements et génère le UPDATE tout seul au commit.
    exclude_unset=True = ne garder que les champs réellement envoyés.
    """
    watch = db.get(Watch, watch_id)
    if not watch:
        raise HTTPException(status_code=404, detail="watch introuvable")

    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status_code=400, detail="Aucun champ à modifier")

    for key, value in fields.items():
        setattr(watch, key, value)

    db.commit()
    db.refresh(watch)
    return watch


# ── Supprimer ─────────────────────────────────────────────────────────────────

@router.delete("/{watch_id}", status_code=204)
def delete_watch(watch_id: int, db: Session = Depends(get_db)):
    """db.delete(objet) + commit."""
    watch = db.get(Watch, watch_id)
    if not watch:
        raise HTTPException(status_code=404, detail="watch introuvable")

    db.delete(watch)
    db.commit()
