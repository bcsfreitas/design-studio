import { Link } from '@tanstack/react-router';

// Unknown URLs, prototypes, and views.
export function NotFound() {
  return (
    <div className='space-y-2 p-8'>
      <p className='text-sm font-medium text-foreground'>Page not found</p>
      <p className='text-sm text-muted-foreground'>
        There's nothing at this address.{' '}
        <Link to='/' className='text-primary hover:underline'>
          View all prototypes
        </Link>
      </p>
      {/* Archived work isn't on the deployed site (src/platform/core/archive.ts), and nothing there says which address it was. */}
      {!import.meta.env.DEV && (
        <p className='text-sm text-muted-foreground'>
          If it was archived, it isn't on the deployed site. Run the sandbox locally to open it.
        </p>
      )}
    </div>
  );
}
