
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

  ## AI chat integration

  The admin now includes an `AI Chat` page wired to a server-side route at `/api/chat`.

  Required server environment variables:
  - `OPENAI_API_KEY`: your OpenAI API key
  - `OPENAI_CHAT_MODEL`: optional, defaults to `gpt-5.4-mini`

  Optional frontend variable:
  - `VITE_CHAT_API_URL`: override the chat endpoint if you want the UI to call another server

  Notes for local development:
  - `npm run dev` starts the Vite frontend only
  - To test the built-in `/api/chat` route locally, run the project with `vercel dev`
  
