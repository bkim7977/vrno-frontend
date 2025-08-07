# VRNO Frontend

React + TypeScript frontend for the VRNO Token Market application.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔧 Environment Variables

Create a `.env` file:

```env
VITE_API_URL=https://your-backend-api-url.vercel.app
```

## 📦 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Vercel will auto-detect this as a Vite project
3. Set environment variables in Vercel dashboard
4. Deploy!

### Manual Deployment

```bash
npm run build
# Upload dist/ folder to your hosting provider
```

## 🛠️ Tech Stack

- **React 18** - UI Framework
- **TypeScript** - Type Safety
- **Vite** - Build Tool
- **Tailwind CSS** - Styling
- **Radix UI** - Component Library
- **React Router** - Routing
- **Recharts** - Charts & Analytics

## 🔗 Backend

This frontend connects to the VRNO Backend API. Make sure to:

1. Deploy the backend first
2. Update `VITE_API_URL` to point to your backend
3. Ensure CORS is configured properly

## 📁 Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components
├── contexts/      # React contexts
├── hooks/         # Custom hooks
├── lib/           # Utilities
├── types/         # TypeScript types
└── constants/     # App constants
```
