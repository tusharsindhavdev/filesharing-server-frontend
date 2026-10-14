# File Sharing Frontend

React frontend for the file-sharing API. It supports server status, uploading files, listing stored files, downloading files, and deleting files.

## Development

Run the API server bound to all network interfaces on port `8008`, then start the frontend bound to all interfaces on port `5173`:

```sh
uvicorn main:app --host 0.0.0.0 --port 8008
npm run dev -- --host 0.0.0.0
```

The API origin is set by `VITE_API_URL`. Copy `.env.example` to `.env` and set it to the backend computer's LAN address:

```sh
cp .env.example .env
# VITE_API_URL=http://192.168.1.81:8008
```

Restart Vite after changing `.env`; Vite embeds environment values when it starts. Keep `.env` local (it is ignored by Git). The backend CORS configuration must allow both `http://localhost:5173` and the frontend computer's LAN origin, such as `http://192.168.1.81:5173`.

From another computer on the same LAN, open `http://192.168.1.81:5173` and check the browser's Network panel to confirm API requests go to `http://192.168.1.81:8008`. Test the backend separately at `http://192.168.1.81:8008/` or `http://192.168.1.81:8008/docs`. If the Mac's IP changes, update `VITE_API_URL` in `.env` and the backend's allowed frontend origin if that address is used there, then restart both servers.
