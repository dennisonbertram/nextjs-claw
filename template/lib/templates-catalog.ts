export interface TemplateEntry {
  slug: string;
  name: string;
  tagline: string;
  preview: { kind: 'image'; src: string } | { kind: 'gradient'; className: string };
  prompt: string;
}

export const TEMPLATES: TemplateEntry[] = [
  {
    slug: '01-saas-landing',
    name: 'SaaS Landing',
    tagline: 'Product hero, features, social proof, pricing teaser.',
    preview: { kind: 'image', src: '/template-previews/01-saas-landing.png' },
    prompt: 'Build me a SaaS landing page.',
  },
  {
    slug: '02-pricing-page',
    name: 'Pricing Page',
    tagline: 'Three tiers, feature comparison table, FAQ.',
    preview: { kind: 'image', src: '/template-previews/02-pricing-page.png' },
    prompt: 'Build me a pricing page with three tiers and a comparison table.',
  },
  {
    slug: '03-portfolio-dev',
    name: 'Dev Portfolio',
    tagline: 'Bold type, project grid, about, contact.',
    preview: { kind: 'image', src: '/template-previews/03-portfolio-dev.png' },
    prompt: 'Build me a developer portfolio.',
  },
  {
    slug: '04-portfolio-photo',
    name: 'Photo Portfolio',
    tagline: 'Edge-to-edge imagery, masonry gallery, minimal chrome.',
    preview: { kind: 'image', src: '/template-previews/04-portfolio-photo.png' },
    prompt: 'Build me a photography portfolio with a masonry gallery.',
  },
  {
    slug: '05-blog-editorial',
    name: 'Editorial Blog',
    tagline: 'Magazine layout, featured article, serif typography.',
    preview: { kind: 'image', src: '/template-previews/05-blog-editorial.png' },
    prompt: 'Build me an editorial blog with a magazine-style layout.',
  },
  {
    slug: '06-dashboard-shell',
    name: 'Dashboard',
    tagline: 'Sidebar nav, top bar, stats cards, responsive.',
    preview: { kind: 'image', src: '/template-previews/06-dashboard-shell.png' },
    prompt: 'Build me a SaaS dashboard with a sidebar and stats cards.',
  },
  {
    slug: '07-docs-site',
    name: 'Docs Site',
    tagline: 'Three-column layout, code blocks, on-this-page nav.',
    preview: { kind: 'image', src: '/template-previews/07-docs-site.png' },
    prompt: 'Build me a developer documentation site.',
  },
  {
    slug: '08-agency',
    name: 'Agency',
    tagline: 'Big statement hero, services, case studies, team.',
    preview: { kind: 'image', src: '/template-previews/08-agency.png' },
    prompt: 'Build me a design agency site.',
  },
  {
    slug: '09-restaurant-local',
    name: 'Restaurant',
    tagline: 'Food photography vibe, menu, hours, contact.',
    preview: { kind: 'image', src: '/template-previews/09-restaurant-local.png' },
    prompt: 'Build me a restaurant website with a menu section.',
  },
  {
    slug: '10-event-conference',
    name: 'Conference',
    tagline: 'Date hero, schedule, speakers, sponsors, tickets.',
    preview: { kind: 'image', src: '/template-previews/10-event-conference.png' },
    prompt: 'Build me a conference landing page.',
  },
  {
    slug: '11-newsletter-creator',
    name: 'Newsletter',
    tagline: 'Big email capture, recent posts, about, social proof.',
    preview: { kind: 'image', src: '/template-previews/11-newsletter-creator.png' },
    prompt: 'Build me a newsletter landing page.',
  },
  {
    slug: '12-coming-soon',
    name: 'Coming Soon',
    tagline: 'Centered waitlist, email capture, minimal.',
    preview: { kind: 'image', src: '/template-previews/12-coming-soon.png' },
    prompt: 'Build me a coming-soon waitlist page.',
  },
];
