# Liberty Mutual Agent Portal — contributor guidance

This private customer application derives from Sitecore's official Content SDK starter. It is not an upstream starter contribution. The active app is `examples/liberty-mutual-agent-portal`; other examples are preserved reference material.

- Work on short-lived feature branches from `main`. Open reviewable pull requests into `main`; do not use the inherited upstream DMZ workflow.
- Keep business authorization and mutable agency data on the server. Sitecore profile rules personalize content; they do not grant permissions.
- Editorial content, page composition, resource guidance and campaign variants belong in Sitecore. External insurance systems use typed JSON-backed adapters until replaced.
- Use readable domain names, kebab-case feature directories, PascalCase Sitecore components, and sidecar `*.props.ts` types. Render editable fields using Content SDK field components.
- Generate component maps/import maps with SDK tooling. Do not hand-edit generated code or dependencies. Required package and lockfile changes are made through the package manager.
- Never commit secrets, real agency/customer data, local runtime state, or private configuration. Fixture credentials are synthetic and documented; no actual account password belongs in a fixture.
- New app configurations, deployment scripts, dependencies, and CI are permitted when necessary for the approved portal architecture. Keep changes scoped and document their purpose.
- Keep content model updates separate from initial content seeding. Normal application releases must not overwrite marketers' content.
- Validate affected behavior with type/lint checks, domain tests, serialization checks, a production build, and relevant browser journeys. Checks must fail on errors.
- Document capability evidence honestly: native SitecoreAI, custom application behavior, synthetic integration, or pending tenant configuration. Do not claim a fixture implementation proves a native capability.
- No demo/POC/persona-switcher labels in the agent-facing interface. Operator/reset controls belong outside agent navigation.

The historical upstream rules are archived in `docs/upstream-agent-guidance.md` for provenance; this file governs this customer repository.
