# Astro Starter Kit: Blog

[![Generate Astro Blog with Custom Agent](https://github.com/ahmetbozkurt/ahmetbozkurt.com/actions/workflows/agent-blog.yml/badge.svg?branch=main)](https://github.com/ahmetbozkurt/ahmetbozkurt.com/actions/workflows/agent-blog.yml)

```sh
npm create astro@latest -- --template blog
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

Features:

- ✅ Minimal styling (make it your own!)
- ✅ 100/100 Lighthouse performance
- ✅ SEO-friendly with canonical URLs and OpenGraph data
- ✅ Sitemap support
- ✅ RSS Feed support
- ✅ Markdown & MDX support

## Agent-Driven Blog Generation (SDLC + GitHub)

This repo includes an automated flow to generate Astro blog posts using a custom agent.

- Script: `scripts/generate-post.mjs`
	- Calls a custom agent via `AGENT_URL`/`AGENT_API_KEY` (HTTP JSON).
	- Falls back to `OPENAI_API_KEY` if available.
	- Finally uses a local template if no agent is configured.
	- Writes a new Markdown file to `src/content/blog/` with required frontmatter.

- Workflow: `.github/workflows/agent-blog.yml`
	- Trigger: manual (`workflow_dispatch`) with inputs, or weekly schedule.
	- Steps: checkout → install → generate → build (schema validation) → open PR.
	- Secrets to configure (in GitHub repo settings → Secrets and variables → Actions):
		- `AGENT_URL` (optional): Your custom agent endpoint (POST JSON).
		- `AGENT_API_KEY` (optional): Bearer token for your agent.
		- `OPENAI_API_KEY` (optional): Fallback using OpenAI Chat Completions API.
		- `GH_PAT` (required for PR): Personal Access Token with `repo` scope. Used if org policy blocks `GITHUB_TOKEN` from creating PRs; the workflow creates a draft PR using this token.

### Local Usage

Generate a new post locally:

```bash
npm run generate:post -- --topic "Custom Agent ile Astro Blog Üretimi: SDLC ve GitHub Süreci" --lang tr
```

Then validate/build:

```bash
npm run build
```

Run multi-agent review locally (creates AGENT_PR_BODY.md):

```bash
npm run generate:review
```

### Workflow & Governance

**Default: PR-based (recommended)**
- If `GH_PAT` is set, the workflow creates a draft PR for review.
- Provides governance and explicit approval before merge.

**Fallback: Direct commit to main**
- If PR creation fails (e.g., no PAT or org policy), content commits directly to `main` with `[skip ci]`.
- Ensures content is always published, even under restrictive org policies.
- The workflow continues on error, so the job succeeds either way.

### Notes
- Frontmatter is validated against `src/content.config.ts`.
- Default `heroImage` is `../../assets/blog-placeholder-2.jpg` — update as needed.
- Multi-agent reviews (Developer/PM/Tester/Reviewer/Security) are generated and included in the PR body for transparency.

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
├── public/
├── src/
│   ├── components/
│   ├── content/
│   ├── layouts/
│   └── pages/
├── astro.config.mjs
├── README.md
├── package.json
└── tsconfig.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

The `src/content/` directory contains "collections" of related Markdown and MDX documents. Use `getCollection()` to retrieve posts from `src/content/blog/`, and type-check your frontmatter using an optional schema. See [Astro's Content Collections docs](https://docs.astro.build/en/guides/content-collections/) to learn more.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Check out [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Credit

This theme is based off of the lovely [Bear Blog](https://github.com/HermanMartinus/bearblog/).

git add .
git commit -m "Read Me Update"
git push
