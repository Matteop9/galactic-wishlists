import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Icon from '../../components/Icon';
import Avatar from '../../components/Avatar';
import FeedbackSection from './FeedbackSection';
import ScanQueueSection from './ScanQueueSection';
import type { Profile } from '../../lib/auth';
import { APP_VERSION } from '../../lib/changelog';

export default function ProfilePage({ profile }: { profile: Profile }) {
  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <h1 className="font-display text-[20px] font-bold">Profile</h1>

      <div className="flex items-center gap-4 rounded-card border border-line bg-panel p-4">
        <Avatar name={profile.display_name} url={profile.avatar_url} size={56} />
        <div>
          <p className="font-display text-[17px] font-bold">{profile.display_name}</p>
          <p className="text-[13.5px] text-dim">@{profile.username}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Link
          to="/friends"
          className="press flex items-center justify-between rounded-card border border-line bg-panel px-4 py-3.5"
        >
          <span className="text-[15px] text-text">Friends</span>
          <Icon name="chevron-right" className="size-4 text-faint" />
        </Link>

        {/* The feed card is dismissible and shows once — this is the way back
            to the notes, and the only place the running version is stated. */}
        <Link
          to="/whats-new"
          className="press flex items-center justify-between rounded-card border border-line bg-panel px-4 py-3.5"
        >
          <span className="text-[15px] text-text">What’s new</span>
          <span className="flex items-center gap-2">
            <span className="score-text text-[12px] text-faint">v{APP_VERSION}</span>
            <Icon name="chevron-right" className="size-4 text-faint" />
          </span>
        </Link>
      </div>

      <ScanQueueSection profile={profile} />

      <FeedbackSection profile={profile} />

      <button
        type="button"
        onClick={() => supabase.auth.signOut()}
        className="rounded-control border border-line bg-panel py-3 text-[15px] text-dim"
      >
        Sign out
      </button>
    </div>
  );
}
