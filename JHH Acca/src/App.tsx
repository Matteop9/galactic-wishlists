import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Shell from './components/Shell'
import ThisWeek from './pages/ThisWeek'
import Leaderboards from './pages/Leaderboards'
import EnterPick from './pages/EnterPick'
import Gameweeks from './pages/Gameweeks'
import GameweekDetail from './pages/GameweekDetail'
import PlayerProfile from './pages/PlayerProfile'
import Admin from './pages/Admin'
import Rules from './pages/Rules'
import Login from './pages/Login'
import Claim from './pages/Claim'
import AuthCallback from './pages/AuthCallback'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/claim/:token" element={<Claim />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route element={<Shell />}>
            <Route path="/" element={<ThisWeek />} />
            <Route path="/table" element={<Leaderboards />} />
            <Route path="/pick" element={<EnterPick />} />
            <Route path="/gameweeks" element={<Gameweeks />} />
            <Route path="/gameweeks/:id" element={<GameweekDetail />} />
            <Route path="/players/:id" element={<PlayerProfile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/rules" element={<Rules />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
