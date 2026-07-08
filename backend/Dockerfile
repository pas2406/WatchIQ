# 1) Image de base : un Python 3.12 officiel, version "slim" (légère).
#    C'est le point de départ : une mini-machine Linux avec Python déjà installé.
FROM python:3.12-slim

# 2) Le dossier de travail à l'intérieur du conteneur.
#    Toutes les commandes suivantes s'exécutent depuis /app.
WORKDIR /app

# 3) On copie D'ABORD la liste des dépendances (et rien d'autre).
#    Astuce : Docker met en cache chaque étape. Tant que requirements.txt ne
#    change pas, l'installation (étape 4) n'est PAS refaite -> builds plus rapides.
COPY requirements.txt .

# 4) On installe les dépendances Python dans l'image.
#    --no-cache-dir : on ne garde pas le cache de pip (image plus légère).
RUN pip install --no-cache-dir -r requirements.txt

# 5) On copie tout le reste du code du backend dans l'image.
#    (app.py, database.py, models.py, routers/, seed.py, data/luxury_watches.csv…)
COPY . .

# 6) Port exposé (purement informatif). Render fournira le vrai port via $PORT.
EXPOSE 8000

# 7) La commande lancée au démarrage du conteneur : le serveur uvicorn.
#    On écrit en "forme shell" pour que ${PORT} soit remplacé par la valeur de
#    Render (et 8000 par défaut si la variable n'existe pas, ex. en local).
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]
