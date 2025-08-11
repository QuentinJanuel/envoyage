import { themes as prismThemes } from "prism-react-renderer"
import type { Config } from "@docusaurus/types"
import type * as Preset from "@docusaurus/preset-classic"

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: "envoyage",
  tagline: "Type-safe environment variables",
  favicon: "img/logo.png",

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: { v4: true },

  // Set the production url of your site here
  url: "https://your-docusaurus-site.example.com",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "QuentinJanuel", // Usually your GitHub org/user name.
  projectName: "envoyage", // Usually your repo name.

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: { defaultLocale: "en", locales: ["en"] },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            "https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/",
        },
        // Disable blog for now to keep the template minimal
        blog: false,
        theme: { customCss: "./src/css/custom.css" },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [["@docusaurus/plugin-client-redirects", { redirects: [{ from: "/typedoc", to: "/typedoc/" }] }]],

  themeConfig: {
    image: "img/logo.png",
    navbar: {
      title: "envoyage",
      logo: { alt: "envoyage logo", src: "img/logo.png" },
      items: [
        { type: "doc", docId: "intro", label: "Docs", position: "left" },
        { to: "/api", label: "API", position: "left" },
        { href: "https://github.com/QuentinJanuel/envoyage", label: "GitHub", position: "right" },
      ],
    },
    footer: {
      style: "dark",
      links: [
        { title: "More", items: [{ label: "GitHub", href: "https://github.com/QuentinJanuel/envoyage" }] },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} envoyage.`,
    },
    prism: { theme: prismThemes.github, darkTheme: prismThemes.dracula },
  } satisfies Preset.ThemeConfig,
}

export default config
