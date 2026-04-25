# Skill Registry — novadesk

Generated: 2026-04-25
Project: novadesk
Stack: TypeScript + Node.js + @builderbot/bot + MetaProvider (WhatsApp)

---

## Compact Rules

### branch-pr
- Every PR MUST link an approved issue — no exceptions
- Every PR MUST have exactly one `type:*` label
- Automated checks must pass before merge

### judgment-day
- Trigger: "judgment day", "judgment-day", "doble review", "juzgar", "que lo juzguen"
- Launches two independent blind judge sub-agents in parallel
- Synthesizes findings, applies fixes, re-judges until both pass (max 2 iterations)

### issue-creation
- Trigger: creating a GitHub issue, reporting a bug, or requesting a feature
- Follow issue-first enforcement system

### sdd-* skills
- sdd-explore: investigate ideas before committing to a change
- sdd-propose: create change proposal with intent, scope, approach
- sdd-spec: write specs with requirements and scenarios (Given/When/Then)
- sdd-design: create technical design with architecture decisions
- sdd-tasks: break change into implementation task checklist
- sdd-apply: implement tasks from the change following specs and design
- sdd-verify: validate implementation matches specs
- sdd-archive: sync delta specs to main specs and archive completed change

### skill-creator
- Trigger: create a new skill, add agent instructions, document patterns for AI

### go-testing
- Trigger: writing Go tests, using teatest, adding test coverage
- NOT applicable to this project (TypeScript stack)

---

## User Skills

| Skill | Trigger |
|-------|---------|
| branch-pr | Creating a PR or preparing changes for review |
| find-skills | User asks "how do I do X" or "find a skill for X" |
| go-testing | Writing Go tests (N/A — TS project) |
| issue-creation | Creating a GitHub issue or reporting a bug |
| judgment-day | "judgment day", "doble review", "juzgar" |
| sdd-apply | Implement tasks from a change |
| sdd-archive | Archive a completed change |
| sdd-design | Technical design for a change |
| sdd-explore | Explore/investigate ideas |
| sdd-init | Initialize SDD context |
| sdd-onboard | Guided SDD walkthrough |
| sdd-propose | Create change proposal |
| sdd-spec | Write specifications |
| sdd-tasks | Break change into tasks |
| sdd-verify | Validate implementation |
| skill-creator | Create a new AI skill |
| skill-registry | Update the skill registry |

---

## Project Conventions

No project-level CLAUDE.md found.
No project-level skills directory found.
