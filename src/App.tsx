import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import Home from "@/pages/Home";
const CalendarPage = lazy(() => import("@/pages/Calendar"));
const Tournament = lazy(() => import("@/pages/Tournament"));
const Rankings = lazy(() => import("@/pages/Rankings"));
const PlayerDashboard = lazy(() => import("@/pages/player/Dashboard"));
const OrganizerDashboard = lazy(() => import("@/pages/organizer/Dashboard"));
const PlayerProfile = lazy(() => import("@/pages/PlayerProfile"));
const Register = lazy(() => import("@/pages/Register"));
const OrganizerRegistrations = lazy(() => import("@/pages/organizer/Registrations"));
const OrganizerDraws = lazy(() => import("@/pages/organizer/Draws"));
const OrganizerScores = lazy(() => import("@/pages/organizer/Scores"));
const ClubPortal = lazy(() => import("@/pages/club/Portal"));
const RefereeConsole = lazy(() => import("@/pages/referee/Console"));
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const InterclubPage = lazy(() => import("@/pages/interclub/Interclub"));
const InterclubPublicPage = lazy(() => import("@/pages/interclub/InterclubPublic"));
const ClubsPage = lazy(() => import("@/pages/Clubs"));
const ClubPublicPage = lazy(() => import("@/pages/ClubPublic"));
import NotFound from "@/pages/NotFound";
export default function App() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-muted-foreground">Loading…</div>}><Routes>
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="tournaments/:id" element={<Tournament />} />
        <Route path="rankings" element={<Rankings />} />
        <Route path="clubs" element={<ClubsPage />} />
        <Route path="clubs/:id" element={<ClubPublicPage />} />
        <Route path="player" element={<PlayerDashboard />} />
        <Route path="organizer" element={<OrganizerDashboard />} />
        <Route path="organizer/registrations" element={<OrganizerRegistrations />} />
        <Route path="organizer/draws" element={<OrganizerDraws />} />
        <Route path="organizer/scores" element={<OrganizerScores />} />
        <Route path="players/:id" element={<PlayerProfile />} />
        <Route path="register" element={<Register />} />
        <Route path="club" element={<ClubPortal />} />
        <Route path="referee" element={<RefereeConsole />} />
        <Route path="admin" element={<AdminDashboard />} />
        <Route path="interclub" element={<InterclubPage />} />
        <Route path="interclub-public" element={<InterclubPublicPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes></Suspense>
  );
}
