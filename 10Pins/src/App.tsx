import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import MobileTabBar from './components/MobileTabBar';
import Splash from './components/Splash';
import FirstRun from './features/auth/FirstRun';
import SignIn from './features/auth/SignIn';
import Home from './features/feed/Home';
import Gallery from './features/gallery/Gallery';
import GameDetail from './features/games/GameDetail';
import Friends from './features/friends/Friends';
import GuestClaim from './features/friends/GuestClaim';
import GroupPage from './features/groups/GroupPage';
import GroupsList from './features/groups/GroupsList';
import GroupSettings from './features/groups/GroupSettings';
import InviteLanding from './features/groups/InviteLanding';
import LiveJoin from './features/live/LiveJoin';
import LiveScorer from './features/live/LiveScorer';
import LiveSetup from './features/live/LiveSetup';
import LiveSpectator from './features/live/LiveSpectator';
import LegEntry from './features/matchday/LegEntry';
import MatchDayLive from './features/matchday/MatchDayLive';
import MatchDaySetup from './features/matchday/MatchDaySetup';
import Notifications from './features/notifications/Notifications';
import ManualEntry from './features/manual/ManualEntry';
import ScanCapture from './features/capture/ScanCapture';
import CelebrationHost from './components/Celebration';
import ErrorBoundary from './components/ErrorBoundary';
import { useScanQueueDrain } from './lib/useScanQueue';
import QuickAdd from './features/quickadd/QuickAdd';
import ProfilePage from './features/settings/ProfilePage';
import Stats from './features/stats/Stats';
import { useAuth, useProfile, type Profile } from './lib/auth';

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Dev component gallery — engine-fixture-driven, no auth needed (milestone 3) */}
        <Route path="/gallery" element={<Gallery />} />
        <Route path="*" element={<AuthGate />} />
      </Routes>
    </ErrorBoundary>
  );
}

function AuthGate() {
  const { session, loading } = useAuth();
  const profile = useProfile();

  if (loading || (session && profile.isPending)) return <Splash />;
  if (!session) return <SignIn />;
  if (!profile.data) return <FirstRun />;
  return <Shell profile={profile.data} />;
}

function Shell({ profile }: { profile: Profile }) {
  const location = useLocation();
  useScanQueueDrain(profile.id);
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[390px] pb-[94px]">
      {/* Keyed on the path so each screen cross-fades in (120ms, never in the
          way of a tap); the tab bar sits outside so it never flickers. */}
      <div key={location.pathname} className="fade-in">
        <Routes>
        <Route path="/" element={<Home profile={profile} />} />
        <Route path="/stats" element={<Stats profile={profile} />} />
        <Route path="/groups" element={<GroupsList profile={profile} />} />
        <Route path="/groups/:id" element={<GroupPage profile={profile} />} />
        <Route path="/groups/:id/settings" element={<GroupSettings profile={profile} />} />
        <Route path="/join/:code" element={<InviteLanding />} />
        <Route path="/friends" element={<Friends profile={profile} />} />
        <Route path="/claim/:code" element={<GuestClaim />} />
        <Route path="/groups/:id/matchday/new" element={<MatchDaySetup profile={profile} />} />
        <Route path="/matchday/:id" element={<MatchDayLive profile={profile} />} />
        <Route path="/matchday/:id/leg/:n" element={<LegEntry profile={profile} />} />
        <Route path="/live/new" element={<LiveSetup profile={profile} />} />
        <Route path="/live/join/:code" element={<LiveJoin />} />
        <Route path="/live/:id" element={<LiveScorer profile={profile} />} />
        <Route path="/live/:id/watch" element={<LiveSpectator profile={profile} />} />
        <Route path="/notifications" element={<Notifications profile={profile} />} />
        <Route path="/profile" element={<ProfilePage profile={profile} />} />
        <Route path="/add/scan" element={<ScanCapture profile={profile} />} />
        <Route path="/add/quick" element={<QuickAdd profile={profile} />} />
        <Route path="/add/manual" element={<ManualEntry profile={profile} />} />
        <Route path="/games/:id" element={<GameDetail profile={profile} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <MobileTabBar />
      {/* Outside the keyed fade wrapper on purpose: inside it, every route
          change would remount the host and kill a celebration mid-flight. */}
      <CelebrationHost />
    </div>
  );
}
