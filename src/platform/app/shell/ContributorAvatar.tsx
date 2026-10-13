import { Avatar, AvatarImage, AvatarFallback } from '@/platform/systems/studio/components/avatar';

// Local illustrations or GitHub photos enhance the byline; initials survive failed image loads.
export function ContributorAvatar({
  name,
  github,
  avatar,
  size = 'sm',
}: {
  name?: string;
  github?: string;
  avatar?: string;
  size?: 'sm' | 'default' | 'lg';
}) {
  const initials = name?.trim()
    ? name
        .trim()
        .split(/\s+/)
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';
  const account = github?.trim();
  const githubPhoto =
    account && /^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/i.test(account)
      ? `https://github.com/${encodeURIComponent(account)}.png?size=80`
      : undefined;
  const photo = avatar ? `${import.meta.env.BASE_URL}${avatar}` : githubPhoto;
  return (
    <Avatar size={size} aria-hidden>
      {photo && <AvatarImage key={photo} src={photo} alt='' referrerPolicy='no-referrer' />}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}
