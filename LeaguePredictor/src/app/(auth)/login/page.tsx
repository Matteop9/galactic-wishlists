import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import AuthForm from '../AuthForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  if (await getSession()) redirect(next && next.startsWith('/') ? next : '/');
  return <AuthForm mode="login" next={next ?? '/'} />;
}
