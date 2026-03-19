Requirements
Make sure you have the following installed before running the project:
Tool	Version	Download
Node.js	v18.0.0 or higher	nodejs.org
npm	v9.0.0 or higher	Comes with Node.js

Troubleshooting
Blank page when opening index.html directly → You must use npm run dev. React/Vite apps cannot be opened as plain HTML files.

npm run dev — "missing script: dev" → Make sure your package.json has "dev": "vite" inside the scripts section.

Camera permission denied → Click the camera icon in the browser address bar and allow access, then refresh.

AR overlay not aligning with body → Make sure you are fully visible from head to hip, with even lighting. Use the scale and position controls to fine-tune.

Size always shows XS → Stand further back so more of your body fills the frame, or use the manual controls.

MediaPipe model not loading → Check your internet connection — the pose model is downloaded from a CDN on first use.

License
MIT — free to use and modify.
