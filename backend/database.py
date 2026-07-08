"""
Configuration de la base de données avec SQLAlchemy (ORM).

Rôle de ce fichier = la "plomberie" :
  - engine        : la connexion physique à la base SQLite
  - SessionLocal  : une "usine" qui fabrique des sessions (une conversation avec la base)
  - Base          : la classe parente dont hériteront tous les modèles (voir models.py)
  - get_db()      : la dépendance FastAPI qui ouvre/ferme une session par requête HTTP
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session


# ── L'URL de connexion ────────────────────────────────────────────────────────
# En PRODUCTION, l'hébergeur (Render) fournit une variable d'environnement
# DATABASE_URL pointant vers PostgreSQL. En LOCAL, on retombe sur SQLite (fichier).
# Grâce à l'ORM, changer de base = changer cette URL, rien d'autre.
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///watchvault.db")

# Certains hébergeurs donnent une URL "postgres://…" ; SQLAlchemy + psycopg (v3)
# attend "postgresql+psycopg://…". On normalise le préfixe.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)


# ── L'engine : le moteur de connexion ─────────────────────────────────────────
# check_same_thread=False est spécifique à SQLite ; inutile (et invalide) pour
# PostgreSQL, donc on ne le passe que pour SQLite.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)


# ── La fabrique de sessions ───────────────────────────────────────────────────
# Une "session" est une conversation temporaire avec la base : on y ajoute,
# lit, modifie des objets, puis on valide (commit) ou annule (rollback).
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


# ── La classe de base des modèles ─────────────────────────────────────────────
# Tous les modèles (Watch, User…) hériteront de Base. C'est ce lien qui permet
# à SQLAlchemy de connaître toutes les tables et de les créer.
class Base(DeclarativeBase):
    pass


# ── La dépendance FastAPI ─────────────────────────────────────────────────────
# On l'utilisera dans les routes avec Depends(get_db). FastAPI appelle cette
# fonction à chaque requête : elle ouvre une session, la "prête" à la route
# (yield), puis la ferme quoi qu'il arrive (finally). C'est le pattern standard.
def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Création des tables ───────────────────────────────────────────────────────
def init_db():
    """Crée les tables décrites dans models.py si elles n'existent pas encore."""
    # On importe models ICI (et pas en haut) pour éviter un import circulaire :
    # models.py importe Base depuis ce fichier.
    import models  # noqa: F401  (l'import enregistre les modèles sur Base)
    Base.metadata.create_all(bind=engine)
