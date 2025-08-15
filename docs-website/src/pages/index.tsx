import type { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import CodeBlock from '@theme/CodeBlock';

import styles from './index.module.css';

const features = [
  {
    title: 'Type-Safe by Design',
    description: 'Full TypeScript support with compile-time validation of environment configurations and variable usage.',
  },
  {
    title: 'Zero Dependencies',
    description: 'Lightweight and secure with no external runtime dependencies.',
  },
  {
    title: 'Flexible Resolution',
    description: 'Support for multiple resolution strategies including environment variables, secrets, and custom methods.',
  },
  {
    title: 'Environment Registry',
    description: 'Centralized management of multiple environments (local, staging, production) with distinct configurations.',
  },
  {
    title: 'Async Support',
    description: 'Handle both synchronous and asynchronous variable resolution, perfect for external secrets managers.',
  },
  {
    title: 'Secure by Default',
    description: 'Built-in protection against accidental logging of sensitive values through redacted data patterns.',
  },
];

const demoCode = `import { createEnvironmentRegistry, defineType } from 'envoyage'

// Define environments with type-safe configurations
const envReg = createEnvironmentRegistry()
  .addEnv("local", defineType<{ env: Record<string, string> }>(), (env) => env
    .addResolution("from-env", defineType<undefined>(), (data) =>
      data.envData.env[data.variableName]))
  .addEnv("prod", defineType<{ secrets: Record<string, string> }>(), (env) => env
    .addResolution("from-secrets", defineType<undefined>(), (data) =>
      data.envData.secrets[data.variableName]))

// Define variables with environment-specific resolution
const varReg = envReg.createVariableRegistry()
  .addVar("DATABASE_URL", (v) => v
    .for("local", "from-env")
    .for("prod", "from-secrets"))

// Create a resolver and use variables
const resolver = varReg.createResolver("local", {
  env: process.env
})

const dbUrl = resolver.get("DATABASE_URL")`

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg margin-right--md" to="/docs/intro">
            Get Started
          </Link>
          <Link className="button button--secondary button--lg" to="/api">
            API Reference
          </Link>
        </div>
      </div>
    </header>
  );
}

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className={clsx('col col--4', styles.feature)}>
      <div className="padding-horiz--md padding-bottom--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

function DemoSection() {
  return (
    <section className={styles.demoSection}>
      <div className="container">
        <div className="row">
          <div className="col col--12">
            <Heading as="h2" className={styles.demoTitle}>See it in Action</Heading>
            <CodeBlock language="typescript" className={styles.demoCode}>
              {demoCode}
            </CodeBlock>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="A zero-dependency, type-safe environment variable management library for TypeScript applications.">
      <HomepageHeader />
      <main>
        <section className={styles.features}>
          <div className="container">
            <div className="row">
              {features.map((props, idx) => (
                <Feature key={idx} {...props} />
              ))}
            </div>
          </div>
        </section>
        <DemoSection />
      </main>
    </Layout>
  );
}
