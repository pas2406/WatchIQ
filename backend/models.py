"""
Les modèles ORM : chaque classe = une table de la base.

Avec SQLAlchemy 2.0 on décrit chaque colonne avec :
    nom: Mapped[type_python] = mapped_column(...)

Le type entre crochets indique aussi si la colonne accepte NULL :
    Mapped[str]         -> colonne obligatoire (NOT NULL)
    Mapped[str | None]  -> colonne optionnelle (peut être NULL / vide)
"""

from sqlalchemy import String, Float, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Watch(Base):
    __tablename__ = "watches"

    # ── Identité ──────────────────────────────────────────────────────────────
    id: Mapped[int] = mapped_column(primary_key=True)   # clé primaire auto-incrémentée

    # ── Champs obligatoires ───────────────────────────────────────────────────
    brand:        Mapped[str]   = mapped_column(String, nullable=False)
    model:        Mapped[str]   = mapped_column(String, nullable=False)
    retail_price: Mapped[float] = mapped_column(Float,  nullable=False)

    # ── Caractéristiques venant du dataset (optionnelles) ─────────────────────
    case_material:    Mapped[str | None]   = mapped_column(String)
    bracelet:         Mapped[str | None]   = mapped_column(String)   # Strap Material
    movement:         Mapped[str | None]   = mapped_column(String)   # Movement Type
    water_resistance: Mapped[str | None]   = mapped_column(String)   # ex: "300 meters"
    diameter_mm:      Mapped[float | None] = mapped_column(Float)    # Case Diameter
    thickness_mm:     Mapped[float | None] = mapped_column(Float)    # Case Thickness
    band_width_mm:    Mapped[float | None] = mapped_column(Float)    # Band Width
    dial_color:       Mapped[str | None]   = mapped_column(String)   # Dial Color
    crystal:          Mapped[str | None]   = mapped_column(String)   # Crystal Material
    complications:    Mapped[str | None]   = mapped_column(String)
    power_reserve:    Mapped[str | None]   = mapped_column(String)   # ex: "48 hours"

    # ── Champs "métier" absents du dataset, remplissables plus tard ───────────
    reference:    Mapped[str | None]   = mapped_column(String)   # plus de contrainte UNIQUE
    resale_price: Mapped[float | None] = mapped_column(Float)
    release_year: Mapped[int | None]   = mapped_column(Integer)
    category:     Mapped[str | None]   = mapped_column(String)
    description:  Mapped[str | None]   = mapped_column(String)
    image_url:    Mapped[str | None]   = mapped_column(String)

    # ── Disponibilité ─────────────────────────────────────────────────────────
    is_available: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class User(Base):
    __tablename__ = "users"

    id:       Mapped[int]  = mapped_column(primary_key=True)
    username: Mapped[str]  = mapped_column(String, nullable=False, unique=True)
    email:    Mapped[str]  = mapped_column(String, nullable=False, unique=True)
    password: Mapped[str]  = mapped_column(String, nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
