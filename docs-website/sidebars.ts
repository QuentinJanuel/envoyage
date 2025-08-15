import type { SidebarsConfig } from "@docusaurus/plugin-content-docs"

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    { type: "doc", id: "intro" },
    {
      type: "category",
      label: "Core Concepts",
      items: [
        { type: "doc", id: "core-concepts/environment-registry" },
        { type: "doc", id: "core-concepts/variable-registry" },
        { type: "doc", id: "core-concepts/resolver" },
        { type: "doc", id: "core-concepts/define-type" },
      ],
    },
    {
      type: "category",
      label: "Advanced Usage",
      items: [
        { type: "doc", id: "advanced-usage/dynamic-variable" },
        { type: "doc", id: "advanced-usage/dynamic-resolver" },
      ],
    },
    {
      type: "category",
      label: "Useful Patterns",
      items: [
        { type: "doc", id: "useful-pattern/dotenv-example" },
        { type: "doc", id: "useful-pattern/validate-dotenv" },
      ],
    },
  ],
}

export default sidebars
