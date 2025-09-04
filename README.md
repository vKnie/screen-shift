# Screen Shift

![Symfony](https://img.shields.io/badge/Symfony-7.3-000000?style=flat&logo=symfony)
![PHP](https://img.shields.io/badge/PHP-8.2+-777BB4?style=flat&logo=php)
![MariaDB](https://img.shields.io/badge/MariaDB-10.6+-003545?style=flat&logo=mariadb)
[![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC%20BY--NC--ND%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-nd/4.0/)

## Installation manuelle sur Debian 13

### Configuration du projet
- **Nom du projet** : screen-shift
- **Base de données** : screen-shift
- **Utilisateur DB** : screenshift-user
- **Mot de passe DB** : azerty123
- **Repository GitHub** : https://github.com/vKnie/screen-shift.git

### Étape 1 : Installation des dépendances système

```bash
# Mise à jour du système
sudo apt update && sudo apt upgrade -y

# Installation de PHP et ses extensions
sudo apt install -y php php-fpm php-cli php-common php-mysql php-zip php-gd php-mbstring php-curl php-xml php-bcmath php-intl php-imagick php-dom

# Installation des autres composants
sudo apt install -y mariadb-server mariadb-client nginx imagemagick ghostscript curl git
```

### Étape 2 : Configuration d'ImageMagick

Éditer le fichier `/etc/ImageMagick-6/policy.xml` :
- Augmenter `memory_limit` à 1GiB
- Augmenter `disk_limit` à 8GiB  
- Augmenter `area_limit` à 512MB
- Supprimer les restrictions PDF/PS/EPS
- Ajouter : `<policy domain="coder" rights="read|write" pattern="PDF" />`

### Étape 3 : Configuration PHP

1. **Détecter la version PHP** :
   ```bash
   php -r "echo PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION;"
   ```

2. **Éditer `/etc/php/[VERSION]/fpm/php.ini` et `/etc/php/[VERSION]/cli/php.ini`** :
   ```ini
   memory_limit = 512M
   upload_max_filesize = 100M
   post_max_size = 100M
   max_file_uploads = 20
   max_execution_time = 300
   max_input_time = 300
   imagick.locale_fix = 1
   imagick.progress_monitor = 0
   ```

3. **Configurer le pool PHP-FPM dans `/etc/php/[VERSION]/fpm/pool.d/www.conf`** :
   ```ini
   pm.max_children = 50
   pm.start_servers = 10
   pm.min_spare_servers = 5
   pm.max_spare_servers = 15
   pm.max_requests = 1000
   request_terminate_timeout = 300
   ```

4. **Installer Composer** :
   ```bash
   curl -sS https://getcomposer.org/installer | php
   sudo mv composer.phar /usr/local/bin/composer
   sudo chmod +x /usr/local/bin/composer
   ```

5. **Redémarrer PHP-FPM** :
   ```bash
   sudo systemctl restart php[VERSION]-fpm
   ```

### Étape 4 : Configuration de la base de données

```bash
# Démarrer et activer MariaDB
sudo systemctl start mariadb
sudo systemctl enable mariadb

# Configuration de la base de données
sudo mysql -u root
```

```sql
CREATE DATABASE IF NOT EXISTS `screen-shift`;
CREATE USER IF NOT EXISTS 'screenshift-user'@'localhost' IDENTIFIED BY 'azerty123';
GRANT ALL PRIVILEGES ON `screen-shift`.* TO 'screenshift-user'@'localhost';
FLUSH PRIVILEGES;
exit;
```

### Étape 5 : Installation du projet

```bash
# Cloner le projet
cd /tmp
git clone https://github.com/vKnie/screen-shift.git
sudo mv screen-shift /var/www/
cd /var/www/screen-shift

# Configurer Git
sudo git config --global --add safe.directory /var/www/screen-shift

# Générer une clé secrète
openssl rand -hex 32
```

Créer le fichier `.env.local` :
```env
APP_ENV=prod
APP_DEBUG=false
APP_SECRET=[CLÉ_GÉNÉRÉE_PRÉCÉDEMMENT]
DATABASE_URL="mysql://screenshift-user:azerty123@127.0.0.1:3306/screen-shift"
MESSENGER_TRANSPORT_DSN=doctrine://default?auto_setup=0
MAILER_DSN=null://null
SYMFONY_DEPRECATIONS_HELPER=disabled
```

```bash
# Installer les dépendances
sudo composer install --no-dev --optimize-autoloader

# Configurer la base de données
sudo php bin/console doctrine:schema:update --force --env=prod

# Optimiser le cache
sudo php bin/console cache:clear --env=prod
sudo php bin/console asset-map:compile --env=prod
```

### Étape 6 : Configuration SSL

```bash
# Créer le répertoire SSL
sudo mkdir -p /etc/nginx/ssl

# Générer le certificat SSL
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/screen-shift.key \
    -out /etc/nginx/ssl/screen-shift.crt \
    -subj "/C=FR/ST=France/L=Paris/O=ScreenShift/CN=[VOTRE_IP]"
```

### Étape 7 : Configuration Nginx

1. **Détecter le socket PHP-FPM** :
   ```bash
   find /var/run -name "php*fpm*.sock"
   ```

2. **Créer le fichier `/etc/nginx/sites-available/screen-shift`** :
   ```nginx
   server {
       listen 80;
       server_name [VOTRE_IP];
       return 301 https://$server_name$request_uri;
   }
   
   server {
       listen 443 ssl;
       http2 on;
       server_name [VOTRE_IP];
       
       ssl_certificate /etc/nginx/ssl/screen-shift.crt;
       ssl_certificate_key /etc/nginx/ssl/screen-shift.key;
       
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers HIGH:!aNULL:!MD5;
       ssl_prefer_server_ciphers on;
       
       client_max_body_size 100M;
       
       root /var/www/screen-shift/public;
       index index.php;
   
       location / {
           try_files $uri /index.php$is_args$args;
       }
   
       location ~ ^/index\.php(/|$) {
           fastcgi_pass unix:[SOCKET_PHP_FPM];
           fastcgi_split_path_info ^(.+\.php)(/.*)$;
           include fastcgi_params;
           fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
           fastcgi_param DOCUMENT_ROOT $realpath_root;
           fastcgi_param HTTPS on;
       }
   
       location ~ \.php$ {
           return 404;
       }
   }
   ```

3. **Activer le site** :
   ```bash
   sudo ln -sf /etc/nginx/sites-available/screen-shift /etc/nginx/sites-enabled/
   sudo rm -f /etc/nginx/sites-enabled/default
   sudo nginx -t
   ```

### Étape 8 : Démarrage des services

```bash
# Arrêter Apache2 si présent
sudo systemctl stop apache2
sudo systemctl disable apache2

# Démarrer les services
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl start php[VERSION]-fpm
sudo systemctl enable php[VERSION]-fpm
```

### Étape 9 : Configuration des permissions

```bash
# Configurer les permissions
sudo chown -R www-data:www-data /var/www/screen-shift
sudo chmod -R 755 /var/www/screen-shift
sudo chmod -R 775 /var/www/screen-shift/var
sudo mkdir -p /var/www/screen-shift/public/uploads
sudo chmod -R 775 /var/www/screen-shift/public/uploads
sudo chmod 600 /var/www/screen-shift/.env*

# Créer les dossiers nécessaires
sudo mkdir -p /var/www/screen-shift/var/cache/prod/vich_uploader
sudo chown -R www-data:www-data /var/www/screen-shift/var /var/www/screen-shift/public/uploads
```

### Étape 10 : Création de l'utilisateur administrateur

Exécuter le script suivant :
```bash
sudo -u www-data php -r "
require_once '/var/www/screen-shift/vendor/autoload.php';

use Symfony\Component\Dotenv\Dotenv;
use Doctrine\DBAL\DriverManager;
use Symfony\Component\PasswordHasher\Hasher\PasswordHasherFactory;

\$dotenv = new Dotenv();
\$dotenv->load('/var/www/screen-shift/.env.local');

\$databaseUrl = \$_ENV['DATABASE_URL'];

\$connection = DriverManager::getConnection(['url' => \$databaseUrl]);
\$passwordHasherFactory = new PasswordHasherFactory(['common' => ['algorithm' => 'auto']]);
\$passwordHasher = \$passwordHasherFactory->getPasswordHasher('common');

\$email = 'screenshift.admin@univ-evry.fr';
\$plainPassword = 'ens&go1_';
\$roles = ['ROLE_ADMIN', 'ROLE_ACCESS', 'ROLE_USER'];
\$hashedPassword = \$passwordHasher->hash(\$plainPassword);

\$existingUser = \$connection->fetchOne('SELECT COUNT(*) FROM user WHERE email = ?', [\$email]);

if (\$existingUser > 0) {
    \$connection->executeStatement('UPDATE user SET password = ?, roles = ? WHERE email = ?', [\$hashedPassword, json_encode(\$roles), \$email]);
    echo \"Mot de passe mis à jour\n\";
} else {
    \$connection->executeStatement('INSERT INTO user (email, roles, password) VALUES (?, ?, ?)', [\$email, json_encode(\$roles), \$hashedPassword]);
    echo \"Utilisateur admin créé\n\";
}
"
```

## Accès à l'application

- **URL** : https://[VOTRE_IP]
- **Email admin** : screenshift.admin@univ-evry.fr
- **Mot de passe** : ens&go1_

## Notes importantes

- Remplacez `[VOTRE_IP]` par l'adresse IP de votre serveur
- Remplacez `[VERSION]` par votre version PHP (ex: 8.3)  
- Remplacez `[SOCKET_PHP_FPM]` par le chemin du socket détecté
- Le certificat SSL est auto-signé, le navigateur affichera un avertissement
- Vérifiez que tous les services sont actifs avec `systemctl status`

## Extensions PHP requises

### Extensions principales
- `php-fpm`, `php-cli`, `php-common` - PHP de base
- `php-mysql` - Connexion MariaDB/MySQL
- `php-zip` - Gestion des archives ZIP
- `php-gd` - Manipulation d'images de base  
- `php-mbstring` - Gestion des chaînes multi-octets
- `php-curl` - Requêtes HTTP
- `php-xml`, `php-dom` - Traitement XML
- `php-bcmath` - Calculs mathématiques précis
- `php-intl` - Internationalisation (requis par Symfony)
- `php-imagick` - **Extension critique pour la conversion PDF**

### Prérequis système
- **ImageMagick** : Conversion PDF native
- **Ghostscript** : Moteur de rendu PDF  
- **Nginx** : Serveur web
- **MariaDB** : Base de données

## Structure du projet
Application Symfony 7.3 avec architecture MVC standard.

## Support
Pour toute question ou problème, consultez la documentation complète dans `installation_manuelle.txt` ou ouvrez une issue sur le repository GitHub.