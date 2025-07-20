# Link Saver & Auto Summary App

A web application for saving bookmarks with automatic summary generation using Jina AI's free API.

## Features

- **User Authentication**: Sign up and login with email & password (bcrypt hashed)
- **Save Bookmarks**: Paste any URL to save it with auto-fetched title and favicon
- **Auto Summary**: Automatically generates summaries using Jina AI's free API
- **Responsive Design**: Works on desktop and mobile devices
- **Bookmark Management**: View, delete bookmarks in a responsive grid layout

## Tech Stack

- **Frontend**: React
- **Backend**: Node.js / Express
- **Database**: SQLite
- **Authentication**: JWT tokens

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Update the `.env` file with your preferences (optional):
   ```
   PORT=5000
   JWT_SECRET=your_secret_key_here_change_in_production
   DATABASE_PATH=./database.sqlite
   ```

4. Start the backend server:
   ```bash
   npm run dev
   ```

   The server will run on http://localhost:5000

### Frontend Setup

1. In a new terminal, navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the React development server:
   ```bash
   npm start
   ```

   The app will open in your browser at http://localhost:3000

## Usage

1. **Register**: Create a new account with your email and password
2. **Login**: Sign in with your credentials
3. **Add Bookmarks**: Paste any URL in the input field and click "Add Bookmark"
4. **View Summaries**: Bookmarks will automatically fetch summaries (rate limit: ~60/hour)
5. **Manage Bookmarks**: Delete bookmarks or fetch summaries manually if needed

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Bookmarks
- `GET /api/bookmarks` - Get all bookmarks (requires auth)
- `POST /api/bookmarks` - Create new bookmark (requires auth)
- `PATCH /api/bookmarks/:id/summary` - Update bookmark summary (requires auth)
- `DELETE /api/bookmarks/:id` - Delete bookmark (requires auth)

## Notes

- The Jina AI API has a rate limit of approximately 60 requests per hour
- Summaries may fail to load if the rate limit is exceeded
- You can manually fetch summaries later using the "Fetch Summary" button

## Security

- Passwords are hashed using bcrypt
- JWT tokens are used for authentication
- Tokens expire after 7 days
