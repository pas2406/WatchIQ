from pydantic import BaseModel, ConfigDict  # BaseModel = classe de base qui valide les types.
from typing import Optional                  # Optional[x] = le champ peut être None.


# ── Watch ───────────────────────────────────────────────────────────────────

class WatchCreate(BaseModel):
    """Données attendues pour CRÉER une montre (POST). brand/model/prix obligatoires."""
    brand:            str
    model:            str
    retail_price:     float
    case_material:    Optional[str]   = None
    bracelet:         Optional[str]   = None
    movement:         Optional[str]   = None
    water_resistance: Optional[str]   = None
    diameter_mm:      Optional[float] = None
    thickness_mm:     Optional[float] = None
    band_width_mm:    Optional[float] = None
    dial_color:       Optional[str]   = None
    crystal:          Optional[str]   = None
    complications:    Optional[str]   = None
    power_reserve:    Optional[str]   = None
    reference:        Optional[str]   = None
    resale_price:     Optional[float] = None
    release_year:     Optional[int]   = None
    category:         Optional[str]   = None
    description:      Optional[str]   = None
    image_url:        Optional[str]   = None
    is_available:     bool            = True


class WatchUpdate(BaseModel):
    """Données pour MODIFIER une montre (PATCH). Tout est optionnel : on ne met
    à jour que les champs réellement fournis."""
    brand:            Optional[str]   = None
    model:            Optional[str]   = None
    retail_price:     Optional[float] = None
    case_material:    Optional[str]   = None
    bracelet:         Optional[str]   = None
    movement:         Optional[str]   = None
    water_resistance: Optional[str]   = None
    diameter_mm:      Optional[float] = None
    thickness_mm:     Optional[float] = None
    band_width_mm:    Optional[float] = None
    dial_color:       Optional[str]   = None
    crystal:          Optional[str]   = None
    complications:    Optional[str]   = None
    power_reserve:    Optional[str]   = None
    reference:        Optional[str]   = None
    resale_price:     Optional[float] = None
    release_year:     Optional[int]   = None
    category:         Optional[str]   = None
    description:      Optional[str]   = None
    image_url:        Optional[str]   = None
    is_available:     Optional[bool]  = None


class WatchOut(BaseModel):
    """Données RENVOYÉES par l'API. from_attributes=True permet à Pydantic de lire
    directement un objet Watch (ses attributs) au lieu d'un dict."""
    model_config = ConfigDict(from_attributes=True)

    id:               int
    brand:            str
    model:            str
    retail_price:     float
    case_material:    Optional[str]
    bracelet:         Optional[str]
    movement:         Optional[str]
    water_resistance: Optional[str]
    diameter_mm:      Optional[float]
    thickness_mm:     Optional[float]
    band_width_mm:    Optional[float]
    dial_color:       Optional[str]
    crystal:          Optional[str]
    complications:    Optional[str]
    power_reserve:    Optional[str]
    reference:        Optional[str]
    resale_price:     Optional[float]
    release_year:     Optional[int]
    category:         Optional[str]
    description:      Optional[str]
    image_url:        Optional[str]
    is_available:     bool


# ── Auth (inchangé, pour plus tard) ───────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    email:    str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:       int
    username: str
    email:    str
    is_admin: bool


class LoginRequest(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type:   str = "bearer"
