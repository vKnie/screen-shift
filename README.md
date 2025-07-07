# Screen Shift

![Symfony](https://img.shields.io/badge/Symfony-7.3-000000?style=flat&logo=symfony)
![PHP](https://img.shields.io/badge/PHP-8.2+-777BB4?style=flat&logo=php)
![MariaDB](https://img.shields.io/badge/MariaDB-10.6+-003545?style=flat&logo=mariadb)
![PM2](https://img.shields.io/badge/PM2-Process%20Manager-2B037A?style=flat&logo=pm2)
[![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC%20BY--NC--ND%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-nd/4.0/)

Application développée avec Symfony 7.3 et déployée sur serveur Debian 12.

## Prérequis

- PHP 8.2 ou supérieur
- Composer
- MariaDB/MySQL

Pour plus d'informations sur les dépendances et versions requises, consultez la [documentation officielle Symfony](https://symfony.com/doc/current/setup.html).

## Installation en mode production

### Étape 1 : Cloner le projet

```bash
git clone https://github.com/vKnie/screen-shift_symfony.git
cd screen-shift_symfony
```

### Étape 2 : Installer les dépendances

```bash
composer install --no-dev --optimize-autoloader
```

### Étape 3 : Configuration de l'environnement

Modifier le fichier `.env` :

- Remplacer `APP_ENV=dev` par `APP_ENV=prod`
- Configurer la base de données

Exemple de configuration pour MariaDB :

```env
DATABASE_URL="mysql://symfony_user:azerty123@127.0.0.1:3306/screen-shift"
```

### Étape 4 : Mise à jour de la base de données

```bash
php bin/console doctrine:schema:update --force
```

### Étape 5 : Optimisation du cache

```bash
php bin/console cache:clear --env=prod
php bin/console cache:warmup --env=prod
```

## Déploiement avec PM2

L'application utilise PM2 pour la gestion des processus. Consultez la [documentation PM2](https://pm2.keymetrics.io/) pour l'installation.

### Démarrer l'application

```bash
pm2 start "symfony server:start --allow-all-ip" --name symfony-app
```

### Consulter les logs

```bash
pm2 log
```

## Configuration des uploads d'images

En cas de problème avec les uploads d'images, modifier les fichiers de configuration PHP :

- `/etc/php/8.2/fpm/php.ini`
- `/etc/php/8.2/cli/php.ini`

**Conseil :** Augmenter la taille maximale des uploads à 50M dans les directives suivantes :

```ini
upload_max_filesize = 50M
post_max_size = 50M
max_execution_time = 300
max_input_time = 300
memory_limit = 256M
```

## Base de données

Le projet utilise MariaDB avec phpMyAdmin pour la consultation des données.

## Structure du projet

Application Symfony 7.3 avec architecture MVC standard.

## Support

Pour toute question ou problème, consultez la documentation Symfony ou ouvrez une issue sur le repository GitHub.
