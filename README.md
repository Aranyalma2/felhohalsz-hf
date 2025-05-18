<h1 align="center"> Human Detection Web Service </h1>

<p align="center">
<img alt="Github top language" src="https://img.shields.io/github/languages/top/Aranyalma2/felhohalsz-hf?color=8f3d3d">
<img alt="Repository size" src="https://img.shields.io/github/repo-size/Aranyalma2/felhohalsz-hf?color=532BEAF">
<img alt="License" src="https://img.shields.io/github/license/Aranyalma2/felhohalsz-hf?color=56BEB8">
</p>

This project is an image upload and human detection web service that is built and automatically deployed via a CI/CD pipeline. The system also provides a subscription option for users who will receive notifications about uploaded images.

---

## 🧱 Architecture

- **Backend**: Node.js (Express + EJS)
- **Database**: MongoDB
- **Human Detection**: DeepStack
- **Notification System**: Email
- **CD**: Docker Compose + Watchtower
- **CI**: GitHub Actions (Docker image build + push)

---

## 🔁 CI/CD Pipeline

### CI: GitHub Actions (build & push Docker image)

- Automatic steps triggered on code push:
  1. **Build**: Build the Node.js application
  2. **Lint/Test**: ESLint + Unit tests
  3. **Docker image build**: Based on Dockerfile
  4. **Docker image push**: To Docker Hub
  5. **Deploy**: Automatic deployment

### CD: Watchtower (automatic update)

Watchtower is a container that monitors other containers’ images and restarts them when a new version is available.

#### Watchtower settings:

- Monitors newly published images on Docker Hub
- Downloads and restarts the container when a new image is detected

---

## 🧪 Development Workflow

- GitHub workflow
- Automatic deployment from the main branch
- Feature branches
- Yarn package manager

## 🛠️ Specification

### Functional Requirements

| ID | Feature Name | Description | User Type |
|----|--------------|-------------|-----------|
| F1 | Image Upload | Users can upload an image along with a description to the system | Any visitor |
| F2 | Human Detection | The system automatically detects people in uploaded images and saves the result | System (automated) |
| F3 | Display Image with Bounding Boxes | Uploaded images are displayed on the website with people highlighted | Any visitor |
| F4 | User Subscription | Users can subscribe to receive updates about new images | Any visitor |
| F5 | Send Notification | Upon a new image upload, a notification is sent to subscribed users | System |
| F6 | Human Detection Statistics | The notification includes the number of people detected in the image | System → Subscribed visitor |
| F7 | List Images | All uploaded images and their descriptions are displayed on the website | Any visitor |
| F8 | Store Image and Description Pair | The system stores the image and its description in the database | System |

### Web Service Architecture

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
| (pic,meta,users)  |    |      |      (DeepStack)       |
+-------------------+    |      +------------------------+
                         |                   |
                         |                   v
                         |    [Image analysis, return coordinates]
                         v
                +--------------------+
                |    Notification    |
                |      Service       |
                |   (Email service)  |
                +--------------------+

    🔁 Watchtower (CD)
    🌐 Nginx (Proxy)
```


| Component | Technology | Function |
|----------|------------|----------|
| Frontend | HTML + JS | Image upload, UI display |
| Backend | Node.js + Express + EJS | Image processing, subscription handling, server-side rendering |
| MongoDB | MongoDB | Storage of images, users, and detections |
| Human Detection | DeepStack | Automatic detection of people in images |
| Notification | Email service (SMTP) | Sending notifications to subscribers |

### Communication Interfaces Between Services

Frontend <-> Backend: HTTP  
Backend <-> MongoDB: MongoDB Wire  
Backend <-> DeepStack: REST  
Backend <-> Email sender: SMTP

### Backend Technologies Used

- Express (Webserver)
- EJS (Server-side rendering)
- Mongoose (ODM)
- Multer + GridFS (File upload & storage)
- Axios (HTTP Client)
- Nodemailer (SMTP client)

### Project Structure

```
📁 src/
├── models/               # Database schema objects
├── views/
│   └── layouts/          # Ejs layout templates
│   └── index.ejs
│   └── upload.ejs
│   └── subscribe.ejs
├── public/
├── index.js
├── .env
└── package.json
```

### Data Structures Used

#### Image Storage (Image)

MongoDB [GridFS](https://www.mongodb.com/docs/manual/core/gridfs/) solution (splitting due to Mongo's max record size)

Built-in `files collection` (shortened format)

```json
{
  "_id" : "_id",
  "uploadDate" : "2025-04-18T12:00:00Z",
  "filename" : "image-hash.jpg",
  "metadata" : {},
}
```

- filename: name of the uploaded file
- uploadDate: time of upload

#### Image Metadata Storage

Stored in the ```metadata``` attribute of the collection.

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

- description: text description of the image
- peopleDetected: number of people detected
- detections: coordinates of the bounding boxes
- imageUrl: path to the image file

#### Subscriber

```json
{
  "email": "user@example.com",
  "subscribedAt": "2025-04-18T12:00:00Z",
  "isActive": true
}
```

- email: user's email address
- subscribedAt: time of subscription
- isActive: whether the subscription is active
