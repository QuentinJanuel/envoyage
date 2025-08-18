import { themes as prismThemes } from "prism-react-renderer"
import type { Config } from "@docusaurus/types"
import type * as Preset from "@docusaurus/preset-classic"

const config: Config = {
  title: "envoyage",
  tagline: "Type-safe environment variables",
  favicon: "img/logo.png",

  future: { v4: true },

  url: "https://quentinjanuel.github.io",
  baseUrl: "/envoyage/",

  organizationName: "QuentinJanuel",
  projectName: "envoyage",

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  i18n: { defaultLocale: "en", locales: ["en"] },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
        },
        blog: false,
        theme: { customCss: "./src/css/custom.css" },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [],

  themeConfig: {
    image: "img/logo.png",
    navbar: {
      title: "envoyage",
      logo: { alt: "envoyage logo", src: "img/logo.png" },
      items: [
        { type: "doc", docId: "intro", label: "Documentation", position: "left" },
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
