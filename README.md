
  # Modern Dark E-commerce Dashboard

  This is a code bundle for Modern Dark E-commerce Dashboard. The original project is available at https://www.figma.com/design/spC6kCpHYNsJatQAzTejaC/Modern-Dark-E-commerce-Dashboard.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## API configuration

  Copy `.env.example` to `.env` if you want to override API targets.

  Default behavior:
  - Local frontend (`localhost`) tries `http://localhost:8081` first, then falls back to `https://cyan-admin.onrender.com`
  - Deployed frontend uses `https://cyan-admin.onrender.com`

  Optional override:
  - Set `VITE_API_BASE_URL` to force the app to use exactly one backend
  
