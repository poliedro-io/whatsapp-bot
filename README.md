# WhatsApp Bot

Herramienta de automatizacion con dos modulos principales: envio masivo de mensajes por WhatsApp Web y extraccion de datos de negocios desde Google Maps, enfocado en el mercado chileno.

## Tech Stack

- **Frontend:** Vue.js 2, Bootstrap-Vue, SCSS, vue-qr
- **Backend:** Node.js, Express, WebSocket (ws)
- **Automatizacion:** Puppeteer (navegador headless/headed)
- **Datos:** XLSX (exportacion Excel), Lodash

## Funcionalidades

### Envio de Mensajes (WhatsApp Sender)

- Envio masivo de mensajes de texto e imagenes via WhatsApp Web
- Validacion de numeros telefonicos chilenos (+56, +569)
- Deteccion automatica de duplicados usando historial de envios (`data/logs.json`)
- Autenticacion por codigo QR en tiempo real
- Adjuntar imagen desde `data/imagen.png`
- Cancelacion de tareas en proceso

### Scraper de Datos (Data Scraper)

- Extraccion de datos de negocios desde Google Maps (nombre, telefono, direccion, sitio web)
- Busqueda por palabras clave + ubicacion geografica
- Cobertura de las 16 regiones de Chile con provincias y comunas
- Procesamiento en lotes paralelos (10 concurrentes)
- Exportacion a Excel (`data/scraped-data.xlsx`)
- Filtrado de resultados por pais

## Arquitectura

```
Browser (Vue.js) <--WebSocket--> Node.js Server <--Puppeteer--> WhatsApp Web / Google Maps
```

## Estructura del Proyecto

```
whatsapp-bot/
├── public/                     # Archivos estaticos
├── src/                        # Frontend (Vue.js)
│   ├── App.vue                 # Componente raiz (auth, modulos, WebSocket)
│   ├── assets/
│   │   ├── countries.json      # Lista de paises
│   │   └── regions.json        # Regiones/provincias/comunas de Chile
│   └── components/
│       ├── WhatsappCard.vue    # Formulario de envio de mensajes
│       ├── SendingMessage.vue  # Overlay de progreso de envio
│       ├── DataScraperCard.vue # Formulario de scraping
│       └── ScrapingData.vue    # Overlay de progreso de scraping
├── server/                     # Backend (Node.js)
│   ├── index.js                # Servidor Express + WebSocket
│   └── tasks/
│       ├── whatsapp-sender.js  # Automatizacion de WhatsApp
│       └── data-scraper.js     # Scraping de Google Maps
├── ls-config.json              # Configuracion de lite-server
└── package.json
```

## Requisitos

- Node.js 12.x
- npm

## Instalacion

```bash
npm install
```

## Uso

### Construir y ejecutar

```bash
npm start
```

Esto inicia el servidor backend (puerto 3000) y lite-server (puerto 4000) simultaneamente.

Acceder a `http://localhost:4000` en el navegador.

### Desarrollo

```bash
# Solo frontend (Vue dev server)
npm run dev:ui

# Solo backend (con nodemon)
npm run dev:server
```

### Build de produccion

```bash
npm run build
```

## Directorio de datos (runtime)

```
data/
├── logs.json           # Historial de envios {telefono: {timestamp, error}}
├── scraped-data.json   # Negocios extraidos
├── scraped-data.xlsx   # Exportacion Excel
└── imagen.png          # Imagen para adjuntar en mensajes
```
