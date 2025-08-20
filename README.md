# Screen Shift

![Symfony](https://img.shields.io/badge/Symfony-7.3-000000?style=flat&logo=symfony)
![PHP](https://img.shields.io/badge/PHP-8.2+-777BB4?style=flat&logo=php)
![MariaDB](https://img.shields.io/badge/MariaDB-10.6+-003545?style=flat&logo=mariadb)
[![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC%20BY--NC--ND%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-nd/4.0/)

## Prérequis

- PHP 8.2 ou supérieur
- Composer
- MariaDB/MySQL

Pour plus d'informations sur les dépendances et versions requises, consultez la [documentation officielle Symfony](https://symfony.com/doc/current/setup.html).

## Extensions PHP requises

### Extensions principales
Assurez-vous que ces extensions PHP sont installées et activées :

- `curl` - Requêtes HTTP
- `fileinfo` - Détection des types de fichiers (uploads)
- `gd` - Manipulation d'images de base
- `intl` - Internationalisation (requis par Symfony)
- `mbstring` - Gestion des chaînes multi-octets
- `openssl` - Sécurité et HTTPS
- `pdo_mysql` - Connexion MariaDB/MySQL
- `zip` - Gestion des archives ZIP (requis pour l'export PDF)
- `xml`, `dom`, `simplexml` - Traitement XML
- `tokenizer`, `ctype`, `json` - Analyse et validation de données

### Extensions avancées pour la conversion PDF
Pour la fonctionnalité de conversion PDF en images :
- `imagick` - **Requis** pour la conversion PDF réelle

## Configuration des uploads d'images

En cas de problème avec les uploads d'images, modifier les fichiers de configuration PHP :
- `/etc/php/8.2/fpm/php.ini`
- `/etc/php/8.2/cli/php.ini`

**Conseil :** Augmenter la taille maximale des uploads dans les directives suivantes :
```ini
upload_max_filesize = 50M
post_max_size = 50M
max_execution_time = 300
max_input_time = 300
memory_limit = 256M
```

## Base de données
Le projet utilise MariaDB avec phpMyAdmin pour la consultation des données.


### Prérequis système
- **ImageMagick** : Conversion PDF native
- **Ghostscript** : Moteur de rendu PDF
- **php-imagick** : Extension PHP pour ImageMagick

## Structure du projet
Application Symfony 7.3 avec architecture MVC standard.

## Support
Pour toute question ou problème, consultez la documentation Symfony ou ouvrez une issue sur le repository GitHub.

# test

```mermaid
flowchart TD
    A[Client MagicInfo accède à /screen/{id}] --> B[ScreenController::show]
    B --> C{Screen existe ?}
    C -->|Non| D[Page d'erreur]
    C -->|Oui| E[getActivePictures]
    
    E --> F[Parcourir toutes les images du screen]
    F --> G{Image a des dates ?}
    G -->|Non| H[Image considérée comme active]
    G -->|Oui| I{Date actuelle entre startDate et endDate ?}
    I -->|Oui| J[Image active]
    I -->|Non| K[Image ignorée]
    
    H --> L[Ajouter à activePictures]
    J --> L
    K --> M{Autres images ?}
    L --> M
    M -->|Oui| F
    M -->|Non| N[Générer hash des images actives]
    
    N --> O[Stocker hash dans cache]
    O --> P[Rendu template show.html.twig]
    P --> Q[Affichage slideshow côté client]
    
    Q --> R[Boucle JavaScript]
    R --> S[Afficher image courante]
    S --> T[Appliquer couleur de fond]
    T --> U[Attendre delay de l'image]
    U --> V{Fin du delay ?}
    V -->|Non| U
    V -->|Oui| W[Image suivante]
    W --> X{Dernière image ?}
    X -->|Non| S
    X -->|Oui| Y[Retour à la première image]
    Y --> S
    
    Z[Timer AJAX - Toutes les 30s] --> AA[checkUpdates]
    AA --> BB{Hash différent ?}
    BB -->|Oui| CC[Recharger les slides]
    BB -->|Non| DD[Continuer slideshow]
    CC --> EE[getSlides - nouvelles images]
    EE --> FF[Mettre à jour slideshow]
    FF --> S
    DD --> Z
    
    style A fill:#e1f5fe
    style D fill:#ffebee
    style Q fill:#e8f5e8
    style R fill:#fff3e0
    style S fill:#f3e5f5
    style T fill:#e3f2fd
    style U fill:#fce4ec
```