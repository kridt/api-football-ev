import React from "react";
import { Routes, Route, Link, NavLink } from "react-router-dom";
import FavoritesHome from "./pages/FavoritesHome";
import Leagues from "./pages/Leagues";
import MatchDetails from "./pages/MatchDetails";

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-ink/90 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-semibold tracking-wide">
            API-Football EV
          </Link>
          <nav className="flex gap-6 text-sm">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                isActive ? "text-white" : "text-muted hover:text-white"
              }
            >
              Favorites
            </NavLink>
            <NavLink
              to="/leagues"
              className={({ isActive }) =>
                isActive ? "text-white" : "text-muted hover:text-white"
              }
            >
              Browse all
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<FavoritesHome />} />
          <Route path="/leagues" element={<Leagues />} />
          <Route path="/match/:fixtureId" element={<MatchDetails />} />
        </Routes>
      </main>

      <footer className="border-t border-white/10 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-xs text-muted">
          Times shown in{" "}
          <span className="font-semibold">
            {import.meta.env.VITE_TZ || "Europe/Copenhagen"}
          </span>
          .
        </div>
      </footer>
    </div>
  );
}
