import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import CheckinFlow from './components/CheckinFlow'
import HomeView from './components/dashboard/HomeView'
import TalkView from './components/dashboard/TalkView'
import GamesView from './components/dashboard/GamesView'
import PsychiatristView from './components/dashboard/PsychiatristView'
import MoodView from './components/dashboard/MoodView'
import ProfileView from './components/dashboard/ProfileView'
import PsychiatristAuthPage from './pages/PsychiatristAuthPage'
import PsychiatristDashboardPage from './pages/PsychiatristDashboardPage'
import { PsychiatristProtectedRoute } from './components/PsychiatristProtectedRoute'
import InstitutionAuthPage from './pages/InstitutionAuthPage'
import InstitutionDashboardPage from './pages/InstitutionDashboardPage'
import { InstitutionProtectedRoute } from './components/InstitutionProtectedRoute'
import InstitutionOverviewView from './components/institution/InstitutionOverviewView'
import InstitutionStudentsView from './components/institution/InstitutionStudentsView'
import MeetingPage from './pages/MeetingPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/check" element={<CheckinFlow isGuest />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/dashboard" element={<ProtectedRoute />}>
        <Route element={<DashboardPage />}>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<HomeView />} />
          <Route path="check" element={<CheckinFlow />} />
          <Route path="talk" element={<TalkView />} />
          <Route path="games" element={<GamesView />} />
          <Route path="psychiatrist" element={<PsychiatristView />} />
          <Route path="mood" element={<MoodView />} />
          <Route path="profile" element={<ProfileView />} />
        </Route>
      </Route>
      <Route path="/psychiatrist/signin" element={<PsychiatristAuthPage />} />
      <Route path="/psychiatrist" element={<PsychiatristProtectedRoute />}>
        <Route path="dashboard" element={<PsychiatristDashboardPage />} />
      </Route>
      <Route path="/institution/login" element={<InstitutionAuthPage />} />
      <Route path="/institution" element={<InstitutionProtectedRoute />}>
        <Route path="dashboard" element={<InstitutionDashboardPage />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<InstitutionOverviewView />} />
          <Route path="students" element={<InstitutionStudentsView />} />
        </Route>
      </Route>
      <Route path="/meeting/:meetingId" element={<MeetingPage />} />
    </Routes>
  )
}
