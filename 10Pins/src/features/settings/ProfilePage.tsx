import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import FeedbackSection from './FeedbackSection';
import ScanQueueSection from './ScanQueueSection';
import type { Profile } from '../../lib/auth';

export default function ProfilePage({ profile }: { profile: Profile }) {
  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <h1 className="font-display text-[20px] font-bold">Profile</h1>

      <div className="flex items-center gap-4 rounded-2xl border border-line bg-panel p-4">
        <div className="flex size-14 items-center justify-center rounded-full border-2 border-line bg-well font-display text-[20px] font-bold text-glass">
          {profile.display_name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join('')}
        </div>
        <div>
          <p className="font-display text-[17px] font-bold">{profile.display_name}</p>
          <p className="text-[13.5px] text-dim">@{profile.username}</p>
        </div>
      </div>

      <Link
        to="/friends"
        className="press flex items-center justify-between rounded-2xl border border-line bg-panel px-4 py-3.5"
      >
        <span className="text-[15px] text-text">Friends</span>
        <span className="text-[15px] text-faint">›</span>
      </Link>

      <ScanQueueSection profile={profile} />

      <FeedbackSection profile={profile} />

      <button
        type="button"
        onClick={() => supabase.auth.signOut()}
        className="rounded-[10px] border border-line bg-panel py-3 text-[15px] text-dim"
      >
        Sign out
      </button>
    </div>
  );
}
