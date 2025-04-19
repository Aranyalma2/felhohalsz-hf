<h1 align="center"> Human Detection Web Service </h1>

<p align="center">
<img alt="Github top language" src="https://img.shields.io/github/languages/top/Aranyalma2/felhohalsz-hf?color=8f3d3d">
<img alt="Repository size" src="https://img.shields.io/github/repo-size/Aranyalma2/felhohalsz-hf?color=532BEAF">
<img alt="License" src="https://img.shields.io/github/license/Aranyalma2/felhohalsz-hf?color=56BEB8">
</p>

Ez a projekt egy képfeltöltő és emberdetektáló webszolgáltatás, amely CI/CD pipeline segítségével épül és automatikusan deploy-ra kerül. A rendszer feliratkozási lehetőséget is biztosít a felhasználók számára, akik értesítést kapnak a feltöltött képekről.

---

## 🧱 Architektúra

- **Backend**: Node.js (Express + EJS)
- **Adatbázis**: MongoDB
- **Emberi alakok felismerése**: DeepStack
- **Értesítési rendszer**: Email
- **CD**: Docker Compose + Watchtower
- **CI**: GitHub Actions (Docker image build + push)

---

## 🔁 CI/CD Pipeline

### CI: GitHub Actions (build & push Docker image)

- Kód push esetén lefutó automatikus lépések:
  1. **Build**: Node.js alkalmazás buildelése
  2. **Lint/Test**: ESLint + Unit tesztek
  3. **Docker image build**: Dockerfile alapján
  4. **Docker image push**: Docker Hub-ra
  5. **Deploy**: Automatikus deployment

### CD: Watchtower (automatikus frissítés)

A Watchtower egy konténer, amely figyeli a többi konténer új image-eit, és újraindítja őket, ha új verzió érkezik.

#### Watchtower beállítások:

- Figyeli a Docker Hub-on újrapublikált image-eket
- Új image érkezésekor letölti és újraindítja a konténert

---

## 🧪 Fejlesztési folyamat

- Github workflow
- Main branch automatikus deploy
- Feature branch-ek
- Yarn package manager

## 🛠️ Specifikáció

### Funkcionális követelmeények

| Sorszám | Funkció neve | Leírás | Felhasználó típusa |
| ------------- | ------------- | ------------- | ------------- |
| F1 | Kép feltöltése | A felhasználó képet és hozzá tartozó leírást tud feltölteni a rendszerbe | Regisztrált felhasználó |
| F2 | Ember detektálása | A rendszer automatikusan detektálja az embereket a feltöltött képeken és elmenti az eredményt | Rendszer (automatizált) |
| F3 | Kép megjelenítése bekeretezéssel | A feltöltött kép megjelenítése a weboldalon az emberek körberajzolt (keretezett) formájában | Bármely látogató |
| F4 | Felhasználói feliratkozás | A felhasználó feliratkozhat a képek frissítéséről szóló értesítésekre | Vendég / Regisztrált |
| F5 | Értesítés küldése | Új kép feltöltésekor automatikusan kiküldésre kerül egy értesítés a feliratkozott felhasználóknak | Rendszer |
| F6 | Emberdetektálási eredmény statisztika | Az értesítés tartalmazza a képen talált emberek számát is | Rendszer → Felhasználó |
| F7 | Képek listázása | A weboldalon megjelennek az eddig feltöltött képek és azok leírásai | Bármely látogató |
| F8 | Kép és leírás páros tárolása | A rendszer adatbázisban eltárolja a képet és hozzá tartozó leírást | Rendszer |

### Használt adatszerkezetek

#### Képek tárolása (Image)

MongoDB [GridFS](https://www.mongodb.com/docs/manual/core/gridfs/) megoldás (Mongo maximális rekord méret miatt darabolás)

Beépített ```files collection``` (rövidített változat)

```json
{
  "_id" : "_id",
  "uploadDate" : "2025-04-18T12:00:00Z",
  "filename" : "kep-hash.jpg",
  "metadata" : {},
}
```

- filename: a feltöltött fájl neve
- uploadDate: feltöltés időpontja

#### Képek metaadat tárolása (Image metadata)

A collection ```metadata``` attribútuma.

```json
{
  "description": "Piknik a parkban",
  "peopleDetected": 1,
  "detections": [
    {
      "x_min": 100,
      "y_min": 50,
      "x_max": 200,
      "y_max": 300
    }
  ],
  "imageUrl": "/images/_id"
}
```

- description: képhez tartozó leírás
- peopleDetected: észlelt emberek száma
- detections: bekeretezett alakok koordinátái
- imageUrl: elérési út a képfájlhoz

#### Feliratkozó (Subscriber)

```json
{
  "email": "user@example.com",
  "subscribedAt": "2025-04-18T12:00:00Z",
  "isActive": true
}
```

- email: a felhasználó e-mail címe
- subscribedAt: mikor iratkozott fel
- isActive: aktív-e a feliratkozás

### Webszolgáltatás architektúra

```
               +--------------------+
               |      Frontend      |
               |  (HTML/JS Web UI)  |
               +--------------------+
                         |
                         v
               +--------------------+
               |    Backend API     |
               | (Node/Express+ejs) |
               +--------------------+
                         ^
                         |
      +------------------+------------------+
      |                  |                  |
      v                  |                  v
+-------------------+    |      +------------------------+
|     MongoDB       |    |      |   Human Detection API  |
| (képek, user-ek)  |    |      |      (DeepStack)       |
+-------------------+    |      +------------------------+
                         |                   |
                         |                   v
                         |   [Kép elemzése, koordináták visszaadása]
                         v
                +--------------------+
                |   Notification     |
                |     Service        |
                |     (email)        |
                +--------------------+

            🔁 Watchtower (CD frissítésekhez)
            🌐 Nginx (Kifelé proxy)
```

| Komponens | Technológia | Funkció |
| ------------- | ------------- | ------------- |
| Frontend | HTML + JS | Kép feltöltés, UI megjelenítés |
| Backend | Node.js + Express + EJS | Képfeldolgozás, feliratkozás kezelése, szerveroldali renderelés |
| MongoDB | MongoDB | Képek, felhasználók és detekciók tárolása |
| Human Detection | DeepStack | Emberek automatikus felismerése képeken |
| Notification | Node.js + email service | Értesítések küldése feliratkozóknak |

### Projekt struktúra

```
📁 src/
├── models/
│   └── image.js          # Metaadatok a képről
├── routes/
│   └── index.js          # Főoldal, feltöltés űrlap
│   └── upload.js         # Feltöltés kezelése
│   └── images.js         # Kép elérése GridFS-ből
├── views/
│   └── index.ejs
│   └── gallery.ejs       # Képgaléria
├── public/               # statikus fájlok
├── index.js
├── .env
└── package.json
```