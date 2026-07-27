# Deploy pe cPanel (fără git, fără SSH)

Tot proiectul se urcă în `public_html`, iar fișierul `.htaccess` din rădăcină
direcționează traficul în `public/` și blochează accesul la fișierele interne
(`.env`, `vendor/`, `storage/` etc.). Nu trebuie schimbat document root-ul.

## 1. Pregătire locală (o singură comandă)

```bash
bash scripts/build-cpanel-package.sh
```

Scriptul face build-ul de assets, instalează `vendor/` fără dependențele de
dezvoltare și produce `osu-cpanel-<data>.zip` cu tot ce trebuie urcat.
La final își reinstalează singur dependențele de dezvoltare local.

## 2. Baza de date

Pe cPanel nu poți rula `php artisan migrate`, așa că structura se importă ca SQL:

1. Local, cu MySQL-ul de dezvoltare pornit (Sail):
   ```bash
   php artisan migrate --force
   php artisan db:seed --class=ProductSeeder --force
   php artisan products:import-stripe        # o singură dată: aduce catalogul din Stripe în tabela locală
   ```
2. Exportă baza locală: `./vendor/bin/sail exec mysql mysqldump -u sail -ppassword laravel > osu.sql`
   (sau din phpMyAdmin-ul local: Export → SQL).
3. În cPanel: **MySQL Databases** → creează baza + userul + leagă-le (All privileges).
4. În **phpMyAdmin** (cPanel) → selectează baza → Import → `osu.sql`.

La actualizări ulterioare care aduc migrații noi, exportă din local doar
tabelele noi/modificate sau reimportă tot dump-ul (atenție: reimportul total
suprascrie datele din producție — fă întâi backup din phpMyAdmin).

## 3. Urcarea fișierelor

1. cPanel → **File Manager** → `public_html`.
2. Upload `osu-cpanel-<data>.zip` → click dreapta → **Extract**.
3. Șterge arhiva după extragere.
4. Creează fișierul `.env`: copiază conținutul din `.env.cpanel.example`,
   completează valorile (`APP_KEY` îl copiezi din `.env`-ul local — NU genera
   altul nou) și salvează-l ca `.env` în `public_html`.

## 4. Setări PHP în cPanel

**MultiPHP Manager** → alege PHP **8.3** (minim) sau **8.4** pentru domeniu —
dependențele proiectului cer cel puțin 8.3.
**Select PHP Version / Extensions** → activează: `mbstring`, `pdo_mysql`,
`zip`, `gd`, `fileinfo`, `intl` (zip și gd sunt necesare pentru exportul
Excel al rapoartelor JE).

Recomandat în MultiPHP INI Editor: `memory_limit = 512M`,
`upload_max_filesize = 32M`, `post_max_size = 33M` (upload-ul jurnalelor .je
acceptă fișiere până la 30 MB).

## 5. Verificare

- `https://domeniul-tau.ro/magazin` — magazinul cu produsele din tabela locală.
- `https://domeniul-tau.ro/login` — autentifică-te și verifică dashboard-ul
  (Products, Rapoarte JE).
- Testează un checkout de probă.

## Depanare

| Simptom | Cauză probabilă |
|---|---|
| 500 imediat | `.env` lipsă/greșit sau `APP_KEY` gol — verifică `storage/logs/laravel.log` prin File Manager |
| 403 pe orice pagină | `.htaccess` nu a fost extras în `public_html` (fișierele care încep cu punct sunt ascunse — activează „Show Hidden Files" în File Manager) |
| Pagina albă, fără CSS | `public/build/` lipsește din arhivă — rulează din nou scriptul de împachetare |
| „could not find driver" | activează extensia `pdo_mysql` |
| Exportul Excel dă eroare | activează extensiile `zip` și `gd` |
| Imaginile produselor nu se văd | folderul `public/uploads/products` trebuie să aibă permisiuni 755 |

## Actualizări ulterioare

Rulează iar `bash scripts/build-cpanel-package.sh`, urcă zip-ul, extrage peste
fișierele existente (Overwrite). `.env`-ul din server nu e în arhivă, deci
rămâne neatins. Dacă versiunea nouă are migrații, aplică și pasul de la
secțiunea 2.
