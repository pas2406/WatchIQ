"""
Import du dataset Kaggle "Luxury Watches Price" dans la base.

On lit le CSV avec pandas (lecture + nettoyage), puis on insère chaque ligne
comme un objet Watch via l'ORM SQLAlchemy.

Usage :
    python seed.py           # vide la table watches puis réimporte tout le CSV
"""

from pathlib import Path

import pandas as pd
from sqlalchemy import delete

from database import SessionLocal, init_db
from models import Watch


# Chemin du CSV, calculé par rapport à CE fichier (marche peu importe d'où on lance).
CSV_PATH = Path(__file__).parent / "data" / "luxury_watches.csv"


# Correspondance : colonne du CSV  ->  attribut du modèle Watch
COLONNES = {
    "Brand":              "brand",
    "Model":              "model",
    "Case Material":      "case_material",
    "Strap Material":     "bracelet",
    "Movement Type":      "movement",
    "Water Resistance":   "water_resistance",
    "Case Diameter (mm)": "diameter_mm",
    "Case Thickness (mm)":"thickness_mm",
    "Band Width (mm)":    "band_width_mm",
    "Dial Color":         "dial_color",
    "Crystal Material":   "crystal",
    "Complications":      "complications",
    "Power Reserve":      "power_reserve",
    "Price (USD)":        "retail_price",
}

# Colonnes qui doivent devenir des nombres décimaux (float).
COLONNES_NUM = ["diameter_mm", "thickness_mm", "band_width_mm", "retail_price"]


def charger_csv() -> pd.DataFrame:
    """Lit le CSV et le nettoie ; renvoie un DataFrame prêt à insérer."""
    # utf-8-sig : gère le caractère invisible (BOM) au début du fichier.
    df = pd.read_csv(CSV_PATH, encoding="utf-8-sig")

    # 1) On ne garde que les colonnes connues et on les renomme d'un coup.
    df = df[list(COLONNES.keys())].rename(columns=COLONNES)

    # 2) Prix : "9,500" -> "9500" -> 9500.0. On enlève la virgule des milliers.
    df["retail_price"] = df["retail_price"].astype(str).str.replace(",", "", regex=False)

    # 3) On convertit toutes les colonnes numériques ; une valeur illisible -> NaN.
    for col in COLONNES_NUM:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # 4) retail_price est obligatoire : on jette les lignes sans prix valide.
    avant = len(df)
    df = df.dropna(subset=["retail_price"])
    ignorees = avant - len(df)
    if ignorees:
        print(f"⚠️  {ignorees} ligne(s) sans prix valide ignorée(s).")

    # 5) pandas met NaN pour les cases vides ; SQLAlchemy veut None -> on convertit.
    df = df.astype(object).where(pd.notnull(df), None)

    return df


def importer():
    init_db()  # s'assure que les tables existent

    df = charger_csv()

    with SessionLocal() as db:
        # On vide d'abord la table pour que relancer le script ne crée pas de doublons
        # (on a retiré la contrainte UNIQUE, donc c'est notre garde-fou anti-doublon).
        db.execute(delete(Watch))

        # Chaque ligne du DataFrame -> un objet Watch. **row déplie le dict en arguments.
        montres = [Watch(**row) for row in df.to_dict(orient="records")]
        db.add_all(montres)
        db.commit()

    print(f"✅ {len(df)} montres importées dans la base.")


if __name__ == "__main__":
    importer()
