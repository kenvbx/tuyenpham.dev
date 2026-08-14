import type { ReactNode } from "react";

const profileImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAe5UIY-zLIw6EqxOTXoUUDDDlczkgPFhX31jkkNgIW1Aw_GHNa2LRlIUvws4AETbor8wDGcceR4IUwdVPAH7R0XL5xDQTMzSTIwlQJy0VsB9_uN4rnNPIEsQn7wN1Gqun9R1tr1R8gVbY5jFj--fKVjfVZZJv-nj3gE4SpJdxoQMI1ssifiv3JTRfnj_8wD42MkTI_lQN04HiZINtK10C47TraCXPEmkv2pw_-JiSpU1J5nszEnhmfTg";

const skills = [
  {
    icon: "web",
    items: [
      ["React/Next.js", 95],
      ["TypeScript", 90],
      ["Tailwind CSS", 95],
    ],
    title: "Frontend",
  },
  {
    icon: "dns",
    items: [
      ["Node.js/Express", 90],
      ["Python/Django", 85],
      ["GraphQL", 80],
    ],
    title: "Backend",
  },
  {
    icon: "database",
    items: [
      ["PostgreSQL", 95],
      ["MongoDB", 85],
      ["Redis", 80],
    ],
    title: "Database",
  },
  {
    icon: "cloud",
    items: [
      ["AWS", 85],
      ["Docker/K8s", 80],
      ["CI/CD", 90],
    ],
    title: "DevOps",
  },
];

const timeline = [
  {
    company: "Independent",
    period: "2021 - Present",
    role: "Senior Full Stack Engineer",
    text: "Leading product architecture, rebuilding core platforms, and shipping scalable web systems with strong engineering foundations.",
  },
  {
    company: "DataFlow Inc",
    period: "2018 - 2021",
    role: "Software Developer",
    text: "Developed and maintained high-traffic web applications, implemented test suites, and improved deployment pipelines.",
  },
  {
    company: "Creative Digital",
    period: "2015 - 2018",
    role: "Frontend Developer",
    text: "Built interactive responsive websites and commerce platforms using React and modern CSS systems.",
  },
];

const products = [
  ["Moves - Landing Page", "Landing Pages / Packers and Movers"],
  ["FoodZon - PreSchool Landing Page", "Landing Pages / Order Food Online"],
  ["Tutor Center - Landing Page", "Landing Pages / Education"],
];

const posts = [
  ["Architecture", "5 min read", "Scaling Next.js Applications for Enterprise"],
  ["Design Systems", "8 min read", "Building Type-Safe Design Tokens"],
  ["Career", "4 min read", "The Product-Minded Engineer"],
];

type IconName =
  | "arrow_forward"
  | "arrow_right_alt"
  | "cloud"
  | "code"
  | "database"
  | "dns"
  | "mail"
  | "open_in_new"
  | "rocket_launch"
  | "schedule"
  | "terminal"
  | "web";

export function App() {
  return (
    <>
      <TopNav />
      <main className="site-main">
        <HeroSection />
        <SkillsSection />
        <ProjectsSection />
        <ExperienceSection />
        <ProductsSection />
        <BlogSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}

function Icon({ name }: { name: IconName }) {
  const common = {
    "aria-hidden": true,
    className: "site-icon",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24",
  };
  const paths: Record<IconName, ReactNode> = {
    arrow_forward: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    arrow_right_alt: (
      <>
        <path d="M4 12h15" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    cloud: (
      <>
        <path d="M17.5 19H8a5 5 0 1 1 .7-9.95A6.5 6.5 0 0 1 21 12.5 3.5 3.5 0 0 1 17.5 19Z" />
      </>
    ),
    code: (
      <>
        <path d="m8 9-3 3 3 3" />
        <path d="m16 9 3 3-3 3" />
        <path d="m14 5-4 14" />
      </>
    ),
    database: (
      <>
        <ellipse cx="12" cy="5" rx="7" ry="3" />
        <path d="M5 5v6c0 1.66 3.13 3 7 3s7-1.34 7-3V5" />
        <path d="M5 11v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6" />
      </>
    ),
    dns: (
      <>
        <rect height="6" rx="1" width="16" x="4" y="4" />
        <rect height="6" rx="1" width="16" x="4" y="14" />
        <path d="M8 7h.01M8 17h.01" />
      </>
    ),
    mail: (
      <>
        <rect height="14" rx="2" width="18" x="3" y="5" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    open_in_new: (
      <>
        <path d="M14 4h6v6" />
        <path d="m10 14 10-10" />
        <path d="M20 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4" />
      </>
    ),
    rocket_launch: (
      <>
        <path d="M4.5 16.5c-1 1-1.5 3-1.5 3s2-.5 3-1.5" />
        <path d="M7 17 4 14l4-4 6 6-4 4-3-3Z" />
        <path d="M14 6c2.2-2.2 5.1-2.6 6-2 .6.9.2 3.8-2 6l-4 4-4-4 4-4Z" />
        <path d="M15 7h.01" />
      </>
    ),
    schedule: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    terminal: (
      <>
        <path d="m7 8 4 4-4 4" />
        <path d="M13 16h4" />
        <rect height="16" rx="2" width="20" x="2" y="4" />
      </>
    ),
    web: (
      <>
        <rect height="14" rx="2" width="18" x="3" y="5" />
        <path d="M3 9h18" />
        <path d="M8 15h3" />
        <path d="M14 15h2" />
      </>
    ),
  };

  return <svg {...common}>{paths[name]}</svg>;
}

function TopNav() {
  return (
    <nav className="top-nav">
      <div className="nav-inner">
        <a className="brand" href="#top" aria-label="Tuyen Pham home">
          Tuyen Pham
        </a>
        <div className="nav-links">
          <a href="#about">About</a>
          <a href="#projects">Projects</a>
          <a href="#experience">Experience</a>
          <a href="#products">Products</a>
          <a href="#blog">Blog</a>
        </div>
        <div className="nav-actions">
          <button aria-label="Email">
            <Icon name="mail" />
          </button>
          <button aria-label="Terminal">
            <Icon name="terminal" />
          </button>
          <a className="primary-button small" href="#contact">
            Hire Me
          </a>
        </div>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="hero-section" id="about">
      <div className="glow-ambient hero-glow-left" />
      <div className="hero-copy fade-visible">
        <div className="availability-pill">
          <span />
          <strong>Available for freelance</strong>
        </div>
        <h1>Building digital products that make an impact.</h1>
        <p>
          I am a full-stack developer specializing in creating high-performance, scalable web
          applications with a focus on exceptional user experiences and robust architecture.
        </p>
        <div className="hero-actions">
          <a className="primary-button" href="#projects">
            View My Work <Icon name="arrow_forward" />
          </a>
          <a className="secondary-button" href="#contact">
            Let's Work Together
          </a>
        </div>
      </div>
      <div className="hero-visual fade-visible">
        <div className="portrait-wrap">
          <div className="portrait-glow" />
          <div className="portrait-panel">
            <img alt="Developer Profile" src={profileImage} />
          </div>
          <StatCard className="stat-left" icon="code" label="Years Exp" value="10+" />
          <StatCard className="stat-right" icon="rocket_launch" label="Projects" value="50+" />
        </div>
      </div>
    </section>
  );
}

function StatCard({
  className,
  icon,
  label,
  value,
}: {
  className: string;
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className={`stat-card glass-panel ${className}`}>
      <div className="stat-icon">
        <Icon name={icon as IconName} />
      </div>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function SkillsSection() {
  return (
    <section className="section skills-section" id="skills">
      <div className="section-heading centered">
        <h2>Tools I use to turn ideas into products.</h2>
      </div>
      <div className="skills-grid">
        {skills.map((group) => (
          <article className="skill-card glass-panel" key={group.title}>
            <div className="section-icon">
              <Icon name={group.icon as IconName} />
            </div>
            <h3>{group.title}</h3>
            <div className="skill-bars">
              {group.items.map(([label, value]) => (
                <div className="skill-row" key={label}>
                  <span>{label}</span>
                  <div className="skill-track">
                    <div style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProjectsSection() {
  return (
    <section className="section" id="projects">
      <div className="section-heading">
        <h2>Selected Work</h2>
        <p>A collection of products, platforms, and experiments I've built.</p>
      </div>
      <article className="featured-project glass-panel">
        <div className="project-copy">
          <TagList tags={["Next.js", "Stripe", "Supabase"]} />
          <h3>FinTech Dashboard Platform</h3>
          <p>
            A comprehensive financial dashboard providing real-time analytics, portfolio management,
            and secure transaction processing for high-net-worth individuals.
          </p>
          <div className="project-actions">
            <a className="primary-button compact" href="#contact">
              View Case Study <Icon name="arrow_forward" />
            </a>
            <a className="secondary-button compact" href="#contact">
              Live Site <Icon name="open_in_new" />
            </a>
          </div>
        </div>
        <div className="project-visual visual-a" />
      </article>
      <div className="project-grid">
        <ProjectCard
          gradient="visual-b"
          tags={["React Native", "Firebase"]}
          title="HealthTrack Mobile"
          text="A mobile application for tracking fitness metrics, integrating with wearable devices and providing AI-driven workout recommendations."
        />
        <ProjectCard
          gradient="visual-c"
          tags={["Vue.js", "Laravel"]}
          title="E-Commerce Architecture"
          text="A scalable headless e-commerce backend built to support multi-tenant architectures and high-volume transaction processing."
        />
      </div>
    </section>
  );
}

function ProjectCard({
  gradient,
  tags,
  text,
  title,
}: {
  gradient: string;
  tags: string[];
  text: string;
  title: string;
}) {
  return (
    <article className="project-card glass-panel">
      <div className={`project-card-visual ${gradient}`} />
      <div className="project-card-body">
        <TagList muted tags={tags} />
        <h3>{title}</h3>
        <p>{text}</p>
        <a href="#contact">
          View Details <Icon name="arrow_right_alt" />
        </a>
      </div>
    </article>
  );
}

function TagList({ muted = false, tags }: { muted?: boolean; tags: string[] }) {
  return (
    <div className="tag-list">
      {tags.map((tag) => (
        <span className={muted ? "tag muted" : "tag"} key={tag}>
          {tag}
        </span>
      ))}
    </div>
  );
}

function ExperienceSection() {
  return (
    <section className="section" id="experience">
      <div className="section-heading">
        <h2>Experience</h2>
      </div>
      <div className="timeline">
        {timeline.map((item, index) => (
          <article className="timeline-item" key={item.role}>
            <span className={index === 0 ? "timeline-dot active" : "timeline-dot"} />
            <div className="glass-panel timeline-card">
              <div className="timeline-top">
                <div>
                  <h3>{item.role}</h3>
                  <strong>{item.company}</strong>
                </div>
                <span>{item.period}</span>
              </div>
              <p>{item.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProductsSection() {
  return (
    <section className="section products-section" id="products">
      <div className="section-heading centered">
        <h2>Products I've built</h2>
        <p>Not just client work - I also build and launch my own digital products.</p>
      </div>
      <div className="products-grid">
        {products.map(([title, subtitle]) => (
          <article className="product-card" key={title}>
            <div className="product-image">
              <img alt={title} src={profileImage} />
            </div>
            <div className="product-meta">
              <div>
                <h3>{title}</h3>
                <p>{subtitle}</p>
              </div>
              <span>$17</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function BlogSection() {
  return (
    <section className="section" id="blog">
      <div className="section-heading split">
        <h2>From the blog</h2>
        <a href="#contact">
          View all posts <Icon name="arrow_forward" />
        </a>
      </div>
      <div className="blog-grid">
        {posts.map(([category, readTime, title], index) => (
          <article className="blog-card glass-panel" key={title}>
            <div className={`blog-visual blog-${index + 1}`} />
            <div className="blog-body">
              <div>
                <strong>{category}</strong>
                <span>{readTime}</span>
              </div>
              <h3>{title}</h3>
              <p>
                Lessons learned from scaling, designing, and building product systems that stay
                maintainable as teams and traffic grow.
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ContactSection() {
  return (
    <section className="section contact-section" id="contact">
      <div className="contact-copy">
        <h2>
          Have an idea?
          <br />
          Let's build it.
        </h2>
        <p>
          I'm currently accepting new projects. Fill out the form to get started, or drop me an
          email directly.
        </p>
        <div className="contact-lines">
          <ContactLine icon="mail" label="Email" value="hello@tuyenpham.dev" />
          <ContactLine icon="schedule" label="Availability Status" value="Available in 2-3 weeks" />
        </div>
        <div className="response-note">Usually responds within 24 hours.</div>
      </div>
      <form className="contact-form glass-panel">
        <div className="form-grid">
          <Field label="Name" placeholder="John Doe" />
          <Field label="Email" placeholder="john@example.com" type="email" />
        </div>
        <label>
          <span>Project Type</span>
          <select defaultValue="Web Application">
            <option>Web Application</option>
            <option>Mobile App</option>
            <option>Architecture Consulting</option>
            <option>Other</option>
          </select>
        </label>
        <label>
          <span>Message</span>
          <textarea placeholder="Tell me about your project..." rows={4} />
        </label>
        <button type="button">Send Message</button>
      </form>
    </section>
  );
}

function Field({
  label,
  placeholder,
  type = "text",
}: {
  label: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <label>
      <span>{label}</span>
      <input placeholder={placeholder} type={type} />
    </label>
  );
}

function ContactLine({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="contact-line">
      <div>
        <Icon name={icon as IconName} />
      </div>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-cta glass-panel">
          <h2>Ready to build something amazing?</h2>
          <p>Let's discuss how I can help bring your ideas to life.</p>
          <a className="primary-button" href="#contact">
            Start a Project
          </a>
        </div>
        <div className="footer-row">
          <strong>Tuyen Pham</strong>
          <nav>
            <a href="#projects">Services</a>
            <a href="#skills">Skills</a>
            <a href="#contact">Privacy</a>
            <a href="#contact">Terms</a>
            <a href="#contact">Contact</a>
          </nav>
        </div>
        <p className="copyright">© 2026 Tuyen Pham. Built with precision.</p>
      </div>
    </footer>
  );
}
