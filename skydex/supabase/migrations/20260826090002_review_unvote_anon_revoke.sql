-- review_unvote kept its PUBLIC grant, so revoking from anon alone was a no-op.
-- Signed-in users are the only legitimate callers.
revoke execute on function public.review_unvote(uuid) from public, anon;
grant execute on function public.review_unvote(uuid) to authenticated;
