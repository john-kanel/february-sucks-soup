# February Sucks Soup – Hosting Notes

## Environment variables

Create a `.env` file (use `env.example` as a reference) with:

```
RECAPTCHA_SECRET=your-google-secret
UPLOAD_DIR=./uploads           # optional, defaults to ./uploads
DATA_DIR=./data                # optional, defaults to ./data
RESEND_API_KEY=your-resend-api-key
RESEND_FROM="Soup Party RSVP <no-reply@febsucksoup.com>"
PORT=4000                      # optional
```

- **RECAPTCHA_SECRET** is the secret key Google gave you. Do not commit it.
- **UPLOAD_DIR** points to the mounted Railway volume path (see below).
- **DATA_DIR** stores RSVP submissions (JSON). Use the same volume or a second volume.
- **RESEND_API_KEY** is your Resend secret used by the backend to send RSVP emails.
- **RESEND_FROM** is the from-address Resend will use (must be verified in Resend).

## Local development

```
npm install
npm run dev          # starts Vite on 3004 and the API on 4000
```

The Vite dev server proxies `/api` and `/uploads` calls to the Express server, so `fetch("/api/...")` works without CORS headaches.

## Production build

```
npm install
npm run build        # outputs the Vite bundle into /dist
npm start            # serves the API + static assets from /dist
```

`npm start` is what Railway should run after the build step.

## Railway volume

1. In the Railway dashboard, add a **Volume** to the service that will run this app (e.g., mount it at `/data/uploads`).
2. Set the `UPLOAD_DIR` environment variable to that mount point (`/data/uploads`).
3. Set `DATA_DIR` to a directory on the same volume (e.g., `/data/data`) so RSVP submissions persist.
4. Make sure `RECAPTCHA_SECRET` is defined in the service variables.
5. Build command: `npm run build`
6. Start command: `npm start`

The Express server writes files into `UPLOAD_DIR/year` and serves them from `/uploads/...`, while RSVP submissions are stored in `DATA_DIR/rsvps.json`. As long as the volume persists, both photos and RSVP entries will survive deploys/restarts.

## Backups / Limits

- Railway volumes currently cap out at a few GB on the Pro plan. Keep an eye on usage in the Railway dashboard.
- Consider periodically downloading the `/uploads` directory for safekeeping, or move to a dedicated object store if you grow beyond a few GB.



