#!/bin/bash

# Script d'installation complète automatique de Screen Shift sur Debian 13
# Usage: sudo ./install-screen-shift.sh

set -e

# Fonction pour exécuter PHP sans warnings
run_php() {
    php -d error_reporting=0 -d display_errors=0 -d display_startup_errors=0 "$@"
}

# Configuration
PROJECT_NAME="screen-shift"
DB_NAME="screen-shift"
DB_USER="screenshift-user"
DB_PASS="azerty123"
GITHUB_REPO="https://github.com/vKnie/screen-shift.git"
WEB_USER="www-data"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Vérification des privilèges root
if [[ $EUID -ne 0 ]]; then
   error "Ce script doit être exécuté en tant que root (avec sudo)"
   exit 1
fi

# Détection automatique de l'IP
SERVER_IP=$(hostname -I | awk '{print $1}')
if [[ -z "$SERVER_IP" ]]; then
    SERVER_IP=$(ip route get 8.8.8.8 | awk '{print $7; exit}')
fi

if [[ -z "$SERVER_IP" ]]; then
    error "Impossible de détecter l'IP du serveur automatiquement"
    read -p "Veuillez entrer l'IP de votre serveur: " SERVER_IP
fi

log "IP du serveur détectée: $SERVER_IP"

header "🚀 INSTALLATION DE SCREEN SHIFT SUR DEBIAN 13"
echo "IP du serveur: $SERVER_IP"
echo "Base de données: $DB_NAME"
echo "Utilisateur DB: $DB_USER"
echo ""
read -p "Continuer l'installation? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

header "📦 1. MISE À JOUR DU SYSTÈME ET INSTALLATION DES PAQUETS"

log "Mise à jour du système..."
apt update && apt upgrade -y

log "Installation de PHP et extensions..."
apt install -y php php-fpm php-cli php-common php-mysql \
    php-zip php-gd php-mbstring php-curl php-xml \
    php-bcmath php-intl php-imagick php-dom

log "Installation des autres composants..."
apt install -y mariadb-server mariadb-client nginx imagemagick ghostscript curl git

header "⚙️ CONFIGURATION IMAGEMAGICK ET GHOSTSCRIPT"

log "Configuration d'ImageMagick..."
# Augmenter les limites de ressources ImageMagick
sed -i 's/<policy domain="resource" name="memory" value="256MiB"\/>/<policy domain="resource" name="memory" value="1GiB"\/>/g' /etc/ImageMagick-6/policy.xml 2>/dev/null || true
sed -i 's/<policy domain="resource" name="disk" value="1GiB"\/>/<policy domain="resource" name="disk" value="8GiB"\/>/g' /etc/ImageMagick-6/policy.xml 2>/dev/null || true
sed -i 's/<policy domain="resource" name="area" value="128MB"\/>/<policy domain="resource" name="area" value="512MB"\/>/g' /etc/ImageMagick-6/policy.xml 2>/dev/null || true

# Activer le support PDF en supprimant les restrictions
sed -i '/<policy domain="coder" rights="none" pattern="PDF" \/>/d' /etc/ImageMagick-6/policy.xml 2>/dev/null || true
sed -i '/<policy domain="coder" rights="none" pattern="PS" \/>/d' /etc/ImageMagick-6/policy.xml 2>/dev/null || true
sed -i '/<policy domain="coder" rights="none" pattern="EPS" \/>/d' /etc/ImageMagick-6/policy.xml 2>/dev/null || true

# Ajouter les politiques pour PDF si elles n'existent pas
if ! grep -q 'pattern="PDF"' /etc/ImageMagick-6/policy.xml 2>/dev/null; then
    sed -i '/<\/policymap>/i\  <policy domain="coder" rights="read|write" pattern="PDF" \/>' /etc/ImageMagick-6/policy.xml 2>/dev/null || true
fi

log "Configuration de Ghostscript..."
# Configurer Ghostscript pour permettre le traitement des PDF
if [ -f "/etc/ghostscript/9.*/gs_init.ps" ] || [ -f "/usr/share/ghostscript/*/Resource/Init/gs_init.ps" ]; then
    # Ghostscript est configuré par défaut, pas de modifications spéciales nécessaires
    log "Ghostscript configuré avec les paramètres par défaut"
fi

header "🐘 CONFIGURATION PHP"

log "Configuration avancée de PHP..."
# Détecter la version PHP
PHP_VERSION=$(run_php -r "echo PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION;")
PHP_INI_PATH="/etc/php/${PHP_VERSION}/fpm/php.ini"
PHP_CLI_INI_PATH="/etc/php/${PHP_VERSION}/cli/php.ini"

log "Version PHP détectée: $PHP_VERSION"
log "Fichier de configuration: $PHP_INI_PATH"

# Fonction pour mettre à jour la configuration PHP
update_php_config() {
    local ini_file=$1
    
    # Fonction pour définir ou modifier une valeur PHP
    set_php_value() {
        local key=$1
        local value=$2
        local file=$3
        
        log "Définition de ${key} = ${value} dans ${file}"
        
        # Supprimer toutes les occurrences existantes (commentées ou non)
        sed -i "/^${key}[[:space:]]*=/d" "$file"
        sed -i "/^;[[:space:]]*${key}[[:space:]]*=/d" "$file"
        
        # Ajouter la nouvelle valeur à la fin du fichier
        echo "${key} = ${value}" >> "$file"
        
        # Vérifier que la valeur a été ajoutée
        if grep -q "^${key}[[:space:]]*=[[:space:]]*${value}" "$file"; then
            log "✓ ${key} configuré avec succès"
        else
            warn "⚠ Problème lors de la configuration de ${key}"
        fi
    }
    
    # Augmenter les limites mémoire
    set_php_value "memory_limit" "512M" "$ini_file"
    
    # Augmenter les limites de téléchargement
    set_php_value "upload_max_filesize" "100M" "$ini_file"
    set_php_value "post_max_size" "100M" "$ini_file"
    set_php_value "max_file_uploads" "20" "$ini_file"
    
    # Augmenter le temps d'exécution
    set_php_value "max_execution_time" "300" "$ini_file"
    set_php_value "max_input_time" "300" "$ini_file"
    
    # Supprimer les duplicatas d'extensions pour éviter les warnings
    log "Nettoyage des extensions en double dans $ini_file..."
    
    # Créer un fichier temporaire sans duplicatas d'extensions
    cp "$ini_file" "$ini_file.bak"
    
    # Supprimer toutes les lignes extension= pour les extensions problématiques
    for ext in curl gd mbstring xml imagick; do
        sed -i "/^extension=$ext$/d" "$ini_file"
        sed -i "/^;extension=$ext$/d" "$ini_file"
    done
    
    # Vérifier si imagick est disponible via le paquet système
    if run_php -m | grep -q "imagick" 2>/dev/null; then
        log "Extension imagick déjà chargée par le système, pas besoin de la déclarer"
    else
        # Ajouter imagick seulement si pas disponible
        echo "extension=imagick" >> "$ini_file"
        log "Extension imagick ajoutée au fichier de configuration"
    fi
    
    # Configuration spécifique pour ImageMagick
    if ! grep -q "imagick.locale_fix" "$ini_file" 2>/dev/null; then
        echo "" >> "$ini_file"
        echo "; Configuration ImageMagick" >> "$ini_file"
        echo "imagick.locale_fix = 1" >> "$ini_file"
        echo "imagick.progress_monitor = 0" >> "$ini_file"
    fi
}

# Mettre à jour la configuration PHP-FPM
if [ -f "$PHP_INI_PATH" ]; then
    log "Configuration de PHP-FPM..."
    update_php_config "$PHP_INI_PATH"
fi

# Mettre à jour la configuration PHP-CLI
if [ -f "$PHP_CLI_INI_PATH" ]; then
    log "Configuration de PHP-CLI..."
    update_php_config "$PHP_CLI_INI_PATH"
fi

# Configuration du pool PHP-FPM
PHP_POOL_PATH="/etc/php/${PHP_VERSION}/fpm/pool.d/www.conf"
if [ -f "$PHP_POOL_PATH" ]; then
    log "Configuration du pool PHP-FPM..."
    # Augmenter les limites du pool
    sed -i 's/pm.max_children = .*/pm.max_children = 50/' "$PHP_POOL_PATH"
    sed -i 's/pm.start_servers = .*/pm.start_servers = 10/' "$PHP_POOL_PATH"
    sed -i 's/pm.min_spare_servers = .*/pm.min_spare_servers = 5/' "$PHP_POOL_PATH"
    sed -i 's/pm.max_spare_servers = .*/pm.max_spare_servers = 15/' "$PHP_POOL_PATH"
    sed -i 's/pm.max_requests = .*/pm.max_requests = 1000/' "$PHP_POOL_PATH"
    
    # Augmenter les timeouts
    sed -i 's/;request_terminate_timeout = .*/request_terminate_timeout = 300/' "$PHP_POOL_PATH"
fi

log "Vérification de la configuration PHP..."
run_php -m | grep -E "(imagick|gd|mbstring|curl|xml)" || warn "Certaines extensions PHP pourraient ne pas être activées"

log "Redémarrage de PHP-FPM pour appliquer les changements..."
PHP_FPM_SERVICE="php${PHP_VERSION}-fpm"
systemctl restart "$PHP_FPM_SERVICE"

log "Vérification des limites PHP pour les uploads..."
echo "Configuration PHP actuelle :"
MEMORY=$(run_php -r 'echo ini_get("memory_limit");')
UPLOAD=$(run_php -r 'echo ini_get("upload_max_filesize");')
POST=$(run_php -r 'echo ini_get("post_max_size");')
FILES=$(run_php -r 'echo ini_get("max_file_uploads");')
EXEC=$(run_php -r 'echo ini_get("max_execution_time");')

echo "- Memory limit: $MEMORY"
echo "- Upload max filesize: $UPLOAD"
echo "- Post max size: $POST"
echo "- Max file uploads: $FILES"
echo "- Max execution time: $EXEC (0 = illimité pour CLI)"

# Vérifications critiques
if [[ "$POST" != "100M" ]]; then
    error "ERREUR: post_max_size n'est pas configuré à 100M (actuellement: $POST)"
    error "Vérifiez le fichier $PHP_INI_PATH"
fi

if [[ "$UPLOAD" != "100M" ]]; then
    error "ERREUR: upload_max_filesize n'est pas configuré à 100M (actuellement: $UPLOAD)"
    error "Vérifiez le fichier $PHP_INI_PATH"
fi

log "Installation de Composer..."
curl -sS https://getcomposer.org/installer | run_php
mv composer.phar /usr/local/bin/composer
chmod +x /usr/local/bin/composer

log "Vérification de Composer..."
composer --version

header "🗄️ 2. CONFIGURATION DE LA BASE DE DONNÉES"

log "Démarrage de MariaDB..."
systemctl start mariadb
systemctl enable mariadb

log "Configuration de la base de données..."
mysql -u root <<EOF
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\`;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF

log "Base de données configurée avec succès"

header "📥 3. CLONAGE ET CONFIGURATION DU PROJET"

log "Clonage du projet depuis GitHub..."
if [ -d "/var/www/$PROJECT_NAME" ]; then
    warn "Le projet existe déjà, suppression..."
    rm -rf "/var/www/$PROJECT_NAME"
fi

cd /tmp
git clone $GITHUB_REPO
mv $PROJECT_NAME /var/www/
cd /var/www/$PROJECT_NAME

log "Configuration de Git..."
git config --global --add safe.directory /var/www/$PROJECT_NAME

log "Génération de l'APP_SECRET..."
APP_SECRET=$(openssl rand -hex 32)

log "Création du fichier .env.local..."
cat > .env.local <<EOF
APP_ENV=prod
APP_DEBUG=false
APP_SECRET=$APP_SECRET

DATABASE_URL="mysql://$DB_USER:$DB_PASS@127.0.0.1:3306/$DB_NAME"

MESSENGER_TRANSPORT_DSN=doctrine://default?auto_setup=0

MAILER_DSN=null://null

SYMFONY_DEPRECATIONS_HELPER=disabled
EOF

log "Installation des dépendances Composer..."
composer install --no-dev --optimize-autoloader

log "Exécution des migrations de base de données..."
php bin/console doctrine:schema:update --force --env=prod

log "Optimisation du cache..."
php bin/console cache:clear --env=prod
php bin/console asset-map:compile --env=prod

header "🔒 4. CONFIGURATION SSL"

log "Création du répertoire SSL..."
mkdir -p /etc/nginx/ssl

log "Génération du certificat SSL pour $SERVER_IP..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/screen-shift.key \
    -out /etc/nginx/ssl/screen-shift.crt \
    -subj "/C=FR/ST=France/L=Paris/O=ScreenShift/CN=$SERVER_IP"

header "🌐 5. CONFIGURATION NGINX"

log "Détection du socket PHP-FPM..."
PHP_FPM_SOCK=$(find /var/run -name "php*fpm*.sock" 2>/dev/null | head -n1)
if [[ -z "$PHP_FPM_SOCK" ]]; then
    PHP_FPM_SOCK="/var/run/php/php-fpm.sock"
    warn "Socket PHP-FPM non trouvé, utilisation de: $PHP_FPM_SOCK"
else
    log "Socket PHP-FPM détecté: $PHP_FPM_SOCK"
fi

log "Création de la configuration Nginx..."
cat > /etc/nginx/sites-available/screen-shift <<EOF
server {
    listen 80;
    server_name $SERVER_IP;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    server_name $SERVER_IP;
    
    ssl_certificate /etc/nginx/ssl/screen-shift.crt;
    ssl_certificate_key /etc/nginx/ssl/screen-shift.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Augmenter la taille maximale des uploads
    client_max_body_size 100M;
    
    root /var/www/screen-shift/public;
    index index.php;

    location / {
        try_files \$uri /index.php\$is_args\$args;
    }

    location ~ ^/index\.php(/|\$) {
        fastcgi_pass unix:$PHP_FPM_SOCK;
        fastcgi_split_path_info ^(.+\.php)(/.*)$;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;
        fastcgi_param DOCUMENT_ROOT \$realpath_root;
        fastcgi_param HTTPS on;
    }

    location ~ \.php$ {
        return 404;
    }
}
EOF

log "Activation du site..."
ln -sf /etc/nginx/sites-available/screen-shift /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

log "Test de la configuration Nginx..."
nginx -t

header "🔧 6. GESTION DES SERVICES"

log "Arrêt d'Apache2 si présent..."
if systemctl is-active --quiet apache2; then
    systemctl stop apache2
    systemctl disable apache2
    log "Apache2 arrêté et désactivé"
fi

log "Démarrage des services..."
systemctl start nginx
systemctl enable nginx

# Démarrage de PHP-FPM avec le bon nom de service
PHP_FPM_SERVICE="php${PHP_VERSION}-fpm"
log "Démarrage de PHP-FPM (${PHP_FPM_SERVICE})..."
systemctl start "$PHP_FPM_SERVICE"
systemctl enable "$PHP_FPM_SERVICE"

header "📁 7. CONFIGURATION DES PERMISSIONS"

log "Configuration des permissions..."
chown -R $WEB_USER:$WEB_USER /var/www/screen-shift
chmod -R 755 /var/www/screen-shift
chmod -R 775 /var/www/screen-shift/var
chmod -R 775 /var/www/screen-shift/public/uploads 2>/dev/null || mkdir -p /var/www/screen-shift/public/uploads
chmod 600 /var/www/screen-shift/.env*

# Créer les dossiers nécessaires
mkdir -p /var/www/screen-shift/var/cache/prod/vich_uploader
mkdir -p /var/www/screen-shift/public/uploads
chown -R $WEB_USER:$WEB_USER /var/www/screen-shift/var /var/www/screen-shift/public/uploads

header "👤 8. CRÉATION DE L'UTILISATEUR ADMINISTRATEUR"

log "Création de l'utilisateur administrateur..."
runuser -u $WEB_USER -- php -d error_reporting=0 -d display_errors=0 -d display_startup_errors=0 -r "
require_once '/var/www/screen-shift/vendor/autoload.php';

use Symfony\Component\Dotenv\Dotenv;
use Doctrine\DBAL\DriverManager;
use Symfony\Component\PasswordHasher\Hasher\PasswordHasherFactory;

// Charger les variables d'environnement
\$dotenv = new Dotenv();
\$dotenv->load('/var/www/screen-shift/.env.local');

// Configuration de la base de données
\$databaseUrl = \$_ENV['DATABASE_URL'];

try {
    // Connexion à la base de données
    \$connection = DriverManager::getConnection([
        'url' => \$databaseUrl,
    ]);

    // Configuration du hasher de mot de passe
    \$passwordHasherFactory = new PasswordHasherFactory([
        'common' => ['algorithm' => 'auto'],
        'sodium' => ['algorithm' => 'sodium'],
    ]);

    \$passwordHasher = \$passwordHasherFactory->getPasswordHasher('common');

    // Données de l'utilisateur admin
    \$email = 'screenshift.admin@univ-evry.fr';
    \$plainPassword = 'ens&go1_';
    \$roles = ['ROLE_ADMIN', 'ROLE_ACCESS', 'ROLE_USER'];

    // Hasher le mot de passe
    \$hashedPassword = \$passwordHasher->hash(\$plainPassword);

    // Vérifier si l'utilisateur existe déjà
    \$existingUser = \$connection->fetchOne(
        'SELECT COUNT(*) FROM user WHERE email = ?',
        [\$email]
    );

    if (\$existingUser > 0) {
        echo \"✅ L'utilisateur admin existe déjà : \$email\n\";

        // Mettre à jour le mot de passe
        \$connection->executeStatement(
            'UPDATE user SET password = ?, roles = ? WHERE email = ?',
            [\$hashedPassword, json_encode(\$roles), \$email]
        );
        echo \"🔄 Mot de passe mis à jour\n\";
    } else {
        // Créer le nouvel utilisateur
        \$connection->executeStatement(
            'INSERT INTO user (email, roles, password) VALUES (?, ?, ?)',
            [\$email, json_encode(\$roles), \$hashedPassword]
        );
        echo \"🎉 Utilisateur admin créé avec succès !\n\";
    }

    echo \"\n📧 Email: \$email\n\";
    echo \"🔐 Mot de passe: \$plainPassword\n\";
    echo \"👑 Rôles: \" . implode(', ', \$roles) . \"\n\";
    echo \"✅ Compte activé avec ROLE_ACCESS\n\";

} catch (Exception \$e) {
    echo \"❌ Erreur: \" . \$e->getMessage() . \"\n\";
    exit(1);
}
"

header "✅ INSTALLATION TERMINÉE AVEC SUCCÈS !"

echo ""
echo -e "${GREEN}🎉 Screen Shift est maintenant installé et configuré !${NC}"
echo ""
echo -e "${BLUE}📋 INFORMATIONS DE CONNEXION:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "🌐 URL d'accès:     ${GREEN}https://$SERVER_IP${NC}"
echo -e "📧 Email admin:     ${GREEN}screenshift.admin@univ-evry.fr${NC}"
echo -e "🔐 Mot de passe:    ${GREEN}ens&go1_${NC}"
echo ""
echo -e "${BLUE}📊 ÉTAT DES SERVICES:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
systemctl is-active --quiet nginx && echo -e "✅ Nginx:          ${GREEN}Actif${NC}" || echo -e "❌ Nginx:          ${RED}Inactif${NC}"
systemctl is-active --quiet "$PHP_FPM_SERVICE" && echo -e "✅ PHP-FPM:        ${GREEN}Actif${NC}" || echo -e "❌ PHP-FPM:        ${RED}Inactif${NC}"
systemctl is-active --quiet mariadb && echo -e "✅ MariaDB:        ${GREEN}Actif${NC}" || echo -e "❌ MariaDB:        ${RED}Inactif${NC}"
echo ""
echo -e "${YELLOW}⚠️  Note: Le certificat SSL est auto-signé, votre navigateur affichera un avertissement de sécurité.${NC}"
echo -e "   Cliquez sur 'Continuer vers le site' pour accéder à l'application."
echo ""
echo -e "${GREEN}🎯 Vous pouvez maintenant accéder à Screen Shift via: https://$SERVER_IP${NC}"