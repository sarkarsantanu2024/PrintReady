import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  FilePenLine,
  Lock,
  Scissors,
  Upload,
  Wifi,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PublicShell } from '@/components/layout/AppShell';

const differentiators = [
  {
    icon: Scissors,
    title: 'Print-engineered output',
    body: 'Correct dimensions, crop marks, bleed, fold guides — locked at 100% scale.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Bulk CSV mode',
    body: 'One CSV → dozens of personalised PDFs laid out on A4 sheets, ready to cut.',
  },
  {
    icon: Lock,
    title: 'Files never leave your browser',
    body: 'Everything is processed locally. Privacy and GDPR-friendly by design.',
  },
  {
    icon: Wifi,
    title: 'Works offline',
    body: 'Install as a PWA, then keep designing — even without a connection.',
  },
];

const tiers = [
  { name: 'Silver', price: '₹0', tag: 'Free', perks: ['5 PDFs / mo', 'Editor + 10 MB upload'] },
  { name: 'Gold', price: '₹499', tag: 'mo', perks: ['15 PDFs / mo', 'CSV (10 rows)', '25 MB upload'], featured: true },
  { name: 'Platinum', price: '₹999', tag: 'mo', perks: ['20 PDFs / mo', 'CSV (50 rows)', 'Multi-file 50 MB'] },
];

export default function Home() {
  return (
    <PublicShell>
      {/* Hero */}
      <section className="container py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            Print-engineered output
          </p>
          <h1 className="text-balance text-4xl font-extrabold tracking-tight md:text-6xl">
            Design once. <span className="text-primary">Print perfectly.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-muted-foreground">
            PrintReady turns any design or template into a print-ready PDF — correct
            dimensions, crop marks, bleed, and fold guides. All in your browser.
          </p>
        </div>

        {/* Two CTA cards */}
        <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2">
          <Card className="group cursor-pointer p-6 transition hover:-translate-y-0.5 hover:shadow-md">
            <Link to="/app/upload" className="block">
              <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary">
                <Upload className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold">Upload your design</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Drop a PDF, JPG, PNG, SVG, TIFF or HEIC. We add crop marks, bleed and
                multi-up grid layout.
              </p>
              <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">
                Get started <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          </Card>

          <Card className="group cursor-pointer p-6 transition hover:-translate-y-0.5 hover:shadow-md">
            <Link to="/app/editor" className="block">
              <div className="mb-4 inline-flex rounded-xl bg-accent/10 p-3 text-accent">
                <FilePenLine className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold">Use the editor</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                ID Cards, Business Cards, Certificates. Form or CSV — live preview
                included.
              </p>
              <span className="mt-4 inline-flex items-center text-sm font-medium text-accent">
                Open editor <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          </Card>
        </div>
      </section>

      {/* Differentiators */}
      <section className="border-t bg-muted/30">
        <div className="container py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold">Built for printers, not slideshow apps.</h2>
            <p className="mt-3 text-muted-foreground">
              Most design tools export to PDF and call it done. PrintReady measures, marks,
              and lays out for the press.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {differentiators.map(({ icon: Icon, title, body }) => (
              <Card key={title} className="p-5">
                <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2.5 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="container py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold">Simple monthly pricing</h2>
          <p className="mt-3 text-muted-foreground">
            Start free. Upgrade only when your team prints more.
          </p>
        </div>
        <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
          {tiers.map((t) => (
            <Card
              key={t.name}
              className={`p-6 ${t.featured ? 'border-primary ring-1 ring-primary/30' : ''}`}
            >
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t.name}
              </p>
              <p className="mt-2 text-3xl font-bold">
                {t.price}
                <span className="ml-1 text-sm font-medium text-muted-foreground">/{t.tag}</span>
              </p>
              <ul className="mt-4 space-y-1.5 text-sm">
                {t.perks.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {p}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button asChild variant="outline" size="lg">
            <Link to="/pricing">See full comparison</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container flex flex-col items-center justify-between gap-3 py-6 text-sm text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} PrintReady · Design once. Print perfectly.</p>
          <div className="flex gap-5">
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link to="/login" className="hover:text-foreground">Log in</Link>
            <Link to="/signup" className="hover:text-foreground">Sign up</Link>
          </div>
        </div>
      </footer>
    </PublicShell>
  );
}
