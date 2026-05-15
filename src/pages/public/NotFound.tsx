import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicShell } from '@/components/layout/AppShell';

export default function NotFound() {
  return (
    <PublicShell>
      <section className="container flex flex-col items-center justify-center py-24 text-center">
        <p className="text-7xl font-extrabold text-primary">404</p>
        <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          The page you're looking for doesn't exist — or it may have moved.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">
            <Home className="mr-2 h-4 w-4" /> Back to home
          </Link>
        </Button>
      </section>
    </PublicShell>
  );
}
