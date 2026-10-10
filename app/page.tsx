import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { hasSessionCookie } from "@/lib/session";
import { BrandMark } from "@/components/brand";
import { Icon, type IconName } from "@/components/icons";
import { LandingHeader } from "@/components/landing/landing-header";
import { LANDING_LINKS } from "@/components/landing/links";
import { MockList } from "@/components/landing/mock-list";
import { delay, reveal } from "@/components/landing/reveal";
import { ScrollReveal } from "@/components/landing/scroll-reveal";

export const metadata: Metadata = {
  title: { absolute: "Pocket Manager · Every rupee, accounted for" },
  description:
    "A simple money app for your month: balances for every account, what you still have to pay, income with Sadqa set aside, loans and savings. Free.",
};

// ---------------------------------------------------------------------------
// The content of the page, kept as plain lists so the JSX below stays short.
// ---------------------------------------------------------------------------

const STEPS: {
  number: string;
  icon: IconName;
  colour: string;
  title: string;
  text: string;
  mock: React.ComponentProps<typeof MockList>;
}[] = [
  {
    number: "01",
    icon: "bank",
    colour: "bg-peach",
    title: "Tell it what you have",
    text: "Enter what's in your bank, your savings and your wallet today. That's your starting point. No bank linking, no passwords.",
    mock: {
      title: "Your accounts",
      rows: [
        { label: "Current", value: "48,000" },
        { label: "Savings", value: "90,000" },
        { label: "Pocket", value: "3,500" },
      ],
    },
  },
  {
    number: "02",
    icon: "calendar",
    colour: "bg-sun",
    title: "Plan the month",
    text: "Add your salary and the payments you know are coming, like rent, internet or school fees. Repeating ones fill themselves in every month.",
    mock: {
      title: "October 2026",
      aside: "planned",
      rows: [
        { label: "Salary", value: "120,000", tag: "Expected", tone: "wait" },
        { label: "Rent", value: "35,000", tag: "To pay", tone: "wait" },
        { label: "Internet", value: "2,500", tag: "To pay", tone: "wait" },
      ],
    },
  },
  {
    number: "03",
    icon: "check-circle",
    colour: "bg-mint",
    title: "Tap when it happens",
    text: "Salary arrived? Rent paid? One tap, with the real amount, and the right account updates. Your numbers always match your bank.",
    mock: {
      title: "October 2026",
      aside: "in progress",
      rows: [
        { label: "Salary", value: "120,000", tag: "Received", tone: "good" },
        { label: "Rent", value: "35,000", tag: "Paid", tone: "good" },
        { label: "Internet", value: "2,600", tag: "Paid", tone: "good" },
      ],
    },
  },
];

const FEATURES: { icon: IconName; colour: string; title: string; text: string; points: string[] }[] = [
  {
    icon: "home",
    colour: "bg-sand",
    title: "Dashboard",
    text: "The month at a glance.",
    points: [
      "What's left from your income this month",
      "Every account: what it started with and what it has now",
      "What's still to pay, and your biggest spendings",
    ],
  },
  {
    icon: "bank",
    colour: "bg-peach",
    title: "Accounts",
    text: "Current, Savings, Pocket and Sadqa, each on its own page.",
    points: [
      "What's still to pay from it, its loans and activity",
      "Add money, move money between accounts",
      "Look back at any past month",
    ],
  },
  {
    icon: "piggy",
    colour: "bg-mint",
    title: "Savings",
    text: "As many savings pots as you need.",
    points: ["Emergency fund, Hajj, a new phone…", "Borrow from savings, and see what you owe it", "Pay it back from Current or Pocket"],
  },
  {
    icon: "calendar",
    colour: "bg-sun",
    title: "Expected expenses",
    text: "Know what's still coming this month.",
    points: ["One-time or every week, 2 weeks or month", "Each one shows on the account it's paid from", "Unpaid ones never disappear on the 1st"],
  },
  {
    icon: "banknote",
    colour: "bg-sky",
    title: "Income",
    text: "Salary and any other money you earn.",
    points: ["Expected first, received when it arrives", "Goes straight into Current", "Sadqa is set aside automatically"],
  },
  {
    icon: "users",
    colour: "bg-lilac",
    title: "Loans",
    text: "Money you lent or borrowed.",
    points: ["Who owes you, and who you owe", "Pay back in parts, see what's left", "Shown on the account the money used"],
  },
  {
    icon: "receipt",
    colour: "bg-peach",
    title: "Spendings",
    text: "Everything you paid for, in your own words.",
    points: ["Just write what it was for, like Lunch or Petrol", "From any account, cash included", "See your biggest spendings each month"],
  },
  {
    icon: "moon",
    colour: "bg-sand",
    title: "Light and dark",
    text: "Easy on the eyes, day or night.",
    points: ["Follows your phone, or pick one", "Big buttons, made for thumbs", "Works on phone and laptop"],
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Is Pocket Manager free?",
    a: "Yes. There are no plans, no trial and no card. Every feature on this page is included.",
  },
  {
    q: "Do I need to connect my bank?",
    a: "No. You tell it what you have once, then add what happens. Nobody ever asks for your bank login.",
  },
  {
    q: "What happens on the 1st of every month?",
    a: "Nothing is lost. Whatever is left in each account at the end of the month is exactly what the next month starts with, and anything you didn't pay stays on your list until you pay or delete them. You can open any past month to see it as it was.",
  },
  {
    q: "How does Sadqa work?",
    a: "In Settings you choose a percentage, for example 2.5%. Every time you mark income as received, that part moves from Current into your Sadqa account, ready to give. Changing the % never rewrites the past.",
  },
  {
    q: "Can I have more than one savings account?",
    a: "Yes. Next to the built-in Savings you can open as many as you need, each with its own name and balance. If you borrow from one, the app remembers how much you owe it.",
  },
  {
    q: "Which currency does it use?",
    a: "Pakistani Rupees (PKR), and dates follow Pakistan time, so “today” is always your today.",
  },
];

// Small heading above every section: "How it works"
function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <p {...reveal("up")} className={`text-sm ${dark ? "text-zinc-400" : "text-muted"}`}>
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------

export default async function LandingPage() {
  // Logged in? Go straight to the app (this is only a cookie check, no database)
  if (await hasSessionCookie()) redirect("/home");

  return (
    <div className="flex flex-1 flex-col bg-canvas">
      <LandingHeader />
      <ScrollReveal />

      <main className="flex-1">
        {/* ---------- Hero ---------- */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-2 lg:pt-24 lg:pb-28">
          <div>
            <p className="hero-in inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1 text-[13px] text-ink-2 ring-1 ring-line">
              <span className="size-1.5 rounded-full bg-positive-solid" />
              Free · no bank linking · made for PKR
            </p>
            <h1 {...delay(80)} className="hero-in mt-6 text-[42px] leading-[1.05] font-normal tracking-tight text-ink sm:text-6xl">
              Every rupee, accounted for.
            </h1>
            <p {...delay(160)} className="hero-in mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
              One simple place for your month: what&apos;s in each account, what&apos;s still to pay, who owes
              what, and Sadqa set aside from every income.
            </p>
            <div {...delay(240)} className="hero-in mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary min-h-12 px-6 text-base">
                Get started
              </Link>
              <Link href="/login" className="btn-secondary min-h-12 px-6 text-base">
                Log in
              </Link>
            </div>
            <p className="mt-6 text-sm text-muted">Works on your phone and laptop · Takes a minute to set up</p>
          </div>

          <div {...delay(300)} className="hero-in">
            <MockList
              title="October 2026"
              aside="in progress"
              rows={[
                { label: "Salary", value: "+120,000", tag: "Received", tone: "good" },
                { label: "Rent", value: "−35,000", tag: "Paid", tone: "good" },
                { label: "Electricity", value: "−8,400", tag: "Still to pay", tone: "wait" },
                { label: "Sadqa set aside", value: "3,000", tag: "2.5%", tone: "neutral" },
              ]}
              footer={
                <div className="flex items-end justify-between gap-4">
                  <span>
                    Current started October with
                    <span className="block text-2xl text-zinc-100 tabular-nums">PKR 46,000</span>
                  </span>
                  <span className="text-right text-zinc-500">carried over from September</span>
                </div>
              }
            />
          </div>
        </section>

        {/* ---------- Why it is different ---------- */}
        <section className="bg-[#131419] text-zinc-100">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
            <Eyebrow dark>Why it is different</Eyebrow>
            <h2 {...reveal("up", 1)} className="mt-3 max-w-2xl text-4xl font-normal tracking-tight sm:text-5xl">Not just a list of spendings</h2>
            <p {...reveal("up", 2)} className="mt-5 max-w-2xl text-lg text-zinc-400">
              Most expense apps only tell you what is already gone. Pocket Manager shows the whole month while you can
              still do something about it.
            </p>
            <div className="mt-12 grid gap-5 md:grid-cols-2">
              <div {...reveal("left")} className="rounded-xl bg-white/[0.04] p-7 ring-1 ring-white/10">
                <h3 className="text-zinc-300">A typical expense tracker</h3>
                <ul className="mt-5 space-y-4 text-zinc-400">
                  {[
                    "Shows what you spent, once it's too late to change.",
                    "One total for everything, so you never know what's where.",
                    "Every month starts from zero and last month feels lost.",
                    "Loans and borrowed savings live in your head.",
                  ].map((t) => (
                    <li key={t} className="flex gap-3">
                      <Icon name="x" className="mt-0.5 size-4 shrink-0 text-zinc-500" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div {...reveal("right", 1)} className="rounded-xl bg-white p-7 text-zinc-900">
                <h3>Pocket Manager</h3>
                <ul className="mt-5 space-y-4 text-zinc-700">
                  {[
                    "Shows what you still have to pay, so you can plan the rest of the month.",
                    "A balance for every account: bank, savings, wallet and Sadqa.",
                    "Each month carries its money into the next. Nothing is ever reset.",
                    "Remembers who owes what, and what you owe your savings.",
                  ].map((t) => (
                    <li key={t} className="flex gap-3">
                      <Icon name="check" className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- How it works ---------- */}
        <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-20 sm:px-6 lg:py-24">
          <Eyebrow>How it works</Eyebrow>
          <h2 {...reveal("up", 1)} className="mt-3 max-w-2xl text-4xl font-normal tracking-tight text-ink sm:text-5xl">
            Three steps, and your numbers stay true
          </h2>
          <p {...reveal("up", 2)} className="mt-5 max-w-2xl text-lg text-ink-2">
            Set it up once, plan each month, and tap when things actually happen.
          </p>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.number} {...reveal("up", i)} className={`flex flex-col rounded-xl p-6 text-zinc-900 sm:p-7 ${step.colour}`}>
                <div className="flex items-center justify-between text-sm text-zinc-700">
                  {step.number}
                  <Icon name={step.icon} className="size-5" />
                </div>
                <h3 className="mt-5 text-xl">{step.title}</h3>
                <p className="mt-3 mb-7 flex-1 text-[15px] leading-relaxed text-zinc-800">{step.text}</p>
                <div {...reveal("zoom", 2)}>
                  <MockList {...step.mock} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- The whole idea: the month equation ---------- */}
        <section className="px-3 sm:px-6">
          <div className="mx-auto max-w-6xl rounded-2xl bg-rust px-5 py-14 text-white sm:px-10 lg:py-16">
            <p {...reveal("up")} className="text-sm text-white/70">The whole idea</p>
            <h2 {...reveal("up", 1)} className="mt-3 max-w-2xl text-4xl font-normal tracking-tight sm:text-5xl">
              Nothing is lost when a new month starts.
            </h2>
            <p {...reveal("up", 2)} className="mt-5 max-w-2xl text-lg text-white/80">
              Every account works like a page in a bank statement. What&apos;s left on the last day of the month is
              exactly what the next month opens with.
            </p>
            <div {...reveal("zoom", 2)} className="mt-10 rounded-xl bg-black/20 p-4 sm:p-6">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {[
                  { label: "Started with", value: "46,000", sign: "+" },
                  { label: "Money in", value: "120,000", sign: "−" },
                  { label: "Money out", value: "51,400", sign: "=" },
                ].map((box, i) => (
                  <div key={box.label} {...reveal("up", i + 3)} className="flex items-center gap-2 sm:gap-3">
                    <div className="rounded-lg bg-white/10 px-4 py-2.5">
                      <p className="text-xs text-white/70">{box.label}</p>
                      <p className="text-lg tabular-nums">{box.value}</p>
                    </div>
                    <span className="text-white/60">{box.sign}</span>
                  </div>
                ))}
                <div {...reveal("zoom", 6)} className="rounded-lg bg-white px-4 py-2.5 text-zinc-900">
                  <p className="text-xs text-zinc-500">End of month</p>
                  <p className="text-lg tabular-nums">114,600</p>
                </div>
              </div>
              <p className="mt-5 border-t border-white/10 pt-4 text-sm text-white/70">
                → November starts with <span className="text-white">114,600</span>. Anything unpaid comes along too.
              </p>
            </div>
            <Link href="/register" className="mt-10 inline-flex min-h-12 items-center rounded-lg bg-white px-6 text-zinc-900 transition hover:bg-zinc-100">
              Get started
            </Link>
          </div>
        </section>

        {/* ---------- Features ---------- */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-20 sm:px-6 lg:py-24">
          <Eyebrow>Features</Eyebrow>
          <h2 {...reveal("up", 1)} className="mt-3 max-w-2xl text-4xl font-normal tracking-tight text-ink sm:text-5xl">
            Everything your month needs. Nothing it doesn&apos;t.
          </h2>
          <p {...reveal("up", 2)} className="mt-5 max-w-2xl text-lg text-ink-2">Every part does one job, and they all agree on the numbers.</p>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                {...reveal("up", i % 3)}
                // The first card (Dashboard) is twice as wide on laptops
                className={`rounded-xl p-6 text-zinc-900 sm:p-7 lg:first:col-span-2 ${f.colour}`}
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-zinc-900 text-white">
                  <Icon name={f.icon} className="size-[18px]" />
                </span>
                <h3 className="mt-5 text-xl">{f.title}</h3>
                <p className="mt-1 text-zinc-700">{f.text}</p>
                <ul className="mt-5 space-y-2 text-[15px] text-zinc-800">
                  {f.points.map((p) => (
                    <li key={p} className="flex gap-2.5">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-zinc-600" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Sadqa ---------- */}
        <section id="sadqa" className="scroll-mt-16 bg-sand text-zinc-900">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-24">
            <div>
              <p {...reveal("up")} className="text-sm text-zinc-600">Sadqa, built in</p>
              <h2 {...reveal("up", 1)} className="mt-3 text-4xl font-normal tracking-tight sm:text-5xl">Give, without having to remember</h2>
              <p {...reveal("up", 2)} className="mt-5 text-lg text-zinc-700">
                Choose a percentage once. Every time income arrives, that part is set aside in its own Sadqa account,
                ready whenever you want to give.
              </p>
              <ul {...reveal("up", 3)} className="mt-7 space-y-3 text-zinc-800">
                {[
                  "Set aside automatically from every income",
                  "Its own balance, kept apart from your spending money",
                  "Changing the % never rewrites the past",
                ].map((t) => (
                  <li key={t} className="flex gap-3">
                    <Icon name="check" className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div {...reveal("right", 1)}>
              <MockList
                title="Salary received"
                aside="Sadqa 2.5%"
                rows={[
                  { label: "Into Current", value: "+117,000", tone: "good" },
                  { label: "Into Sadqa", value: "+3,000", tag: "Set aside", tone: "good" },
                  { label: "Given this month", value: "−1,500", tag: "Sadqa", tone: "neutral" },
                ]}
                footer={
                  <span>
                    Sadqa ready to give: <span className="text-zinc-100 tabular-nums">PKR 4,500</span>
                  </span>
                }
              />
            </div>
          </div>
        </section>

        {/* ---------- Pricing ---------- */}
        <section id="pricing" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-20 sm:px-6 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <Eyebrow>Pricing</Eyebrow>
              <h2 {...reveal("up", 1)} className="mt-3 text-4xl font-normal tracking-tight text-ink sm:text-5xl">There isn&apos;t any. It&apos;s free.</h2>
              <p {...reveal("up", 2)} className="mt-5 text-lg text-ink-2">
                No plans, no trial countdown, no card. Everything on this page is the whole app, and you get all of it.
              </p>
            </div>
            <ul {...reveal("zoom", 1)} className="card space-y-4">
              {["Every feature, for everyone", "As many months, payments and accounts as you like", "Your data stays yours"].map(
                (t) => (
                  <li key={t} className="flex items-center gap-3 text-ink">
                    <span className="flex size-7 items-center justify-center rounded-full bg-positive-soft text-positive">
                      <Icon name="check" className="size-4" />
                    </span>
                    {t}
                  </li>
                ),
              )}
            </ul>
          </div>
        </section>

        {/* ---------- FAQ ---------- */}
        <section id="faq" className="scroll-mt-16 bg-surface-2">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[2fr_3fr] lg:py-24">
            <div>
              <Eyebrow>FAQ</Eyebrow>
              <h2 {...reveal("up", 1)} className="mt-3 text-4xl font-normal tracking-tight text-ink sm:text-5xl">Questions, answered simply</h2>
              <p {...reveal("up", 2)} className="mt-5 text-lg text-ink-2">What people usually ask before they start.</p>
            </div>
            {/* <details> opens and closes by itself: no JavaScript needed */}
            <div className="border-t border-line">
              {FAQ.map((item, i) => (
                <details key={item.q} {...reveal("up", i)} className="group border-b border-line">
                  <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg text-ink">
                    {item.q}
                    <Icon name="plus" className="size-5 shrink-0 text-muted transition group-open:rotate-45" />
                  </summary>
                  <p className="pb-5 leading-relaxed text-ink-2">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Final call to action ---------- */}
        <section className="px-3 py-16 sm:px-6">
          <div {...reveal("zoom")} className="mx-auto max-w-6xl rounded-2xl bg-[#1b1d24] px-6 py-16 text-center text-white sm:py-20">
            <h2 {...reveal("up", 1)} className="mx-auto max-w-2xl text-4xl font-normal tracking-tight sm:text-5xl">Start your first month today</h2>
            <p {...reveal("up", 2)} className="mx-auto mt-5 max-w-xl text-lg text-zinc-400">
              Create an account, enter what you have, and see your whole month in one place.
            </p>
            <div {...reveal("up", 3)} className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/register" className="btn-primary min-h-12 px-6 text-base">
                Get started, it&apos;s free
              </Link>
              <a href="#how-it-works" className="inline-flex min-h-12 items-center rounded-lg px-6 text-zinc-300 ring-1 ring-white/15 transition hover:bg-white/5">
                See how it works
              </a>
            </div>
          </div>
        </section>

        <section className="bg-tile">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-10 sm:px-6">
            <p className="text-lg text-ink">Already have an account? Pick up where you left off.</p>
            <Link href="/login" className="btn-secondary min-h-12 px-6 text-base">
              Log in to Pocket Manager
            </Link>
          </div>
        </section>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-line-soft">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div>
            <BrandMark size="sm" />
            <p className="mt-4 text-ink">Pocket Manager</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Balances, expected expenses, income, loans and Sadqa in one simple app. Every rupee, accounted for.
            </p>
          </div>
          <FooterColumn title="Product" links={LANDING_LINKS} />
          <FooterColumn
            title="Inside the app"
            links={[
              { href: "/home", label: "Dashboard" },
              { href: "/accounts", label: "Accounts" },
              { href: "/spendings", label: "Spendings" },
              { href: "/expected", label: "Expected expenses" },
              { href: "/income", label: "Income" },
              { href: "/loans", label: "Loans" },
            ]}
          />
          <FooterColumn
            title="Account"
            links={[
              { href: "/register", label: "Get started" },
              { href: "/login", label: "Log in" },
            ]}
          />
        </div>
        <div className="border-t border-line-soft">
          <p className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted sm:px-6">
            © {new Date().getFullYear()} Pocket Manager. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="text-sm font-medium text-ink">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            {/* "#…" scrolls on this page; "/…" opens another page */}
            {link.href.startsWith("#") ? (
              <a href={link.href} className="text-sm text-muted hover:text-ink">
                {link.label}
              </a>
            ) : (
              <Link href={link.href} className="text-sm text-muted hover:text-ink">
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
