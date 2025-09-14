# Pre-defined Agents

This directory contains pre-defined agents that are available globally to all users. These agents are lazy-loaded by the frontend on demand.

## Agent Definition Format

Each agent is defined in a JSON file that follows the [`agent-schema.json`](../agent.schema.json) schema. The structure includes:

```json
{
  "$schema": "../agent.schema.json",
  "id": "unique-agent-id",
  "name": "Agent Name",
  "role": "Brief description of the agent's role",
  "instructions": "Detailed instructions for the agent's behavior and capabilities",
  "temperature": 0.7,
  "tags": ["tag1", "tag2"]
}
```

### Schema Validation

The [`agent-schema.json`](../schemas/agent.schema.json) file provides JSON Schema validation for agent definitions, ensuring:

- Required fields are present
- Data types are correct
- ID follows kebab-case pattern
- Temperature is within valid range (0.0-2.0)
- Tags are unique strings

## Adding New Agents

1. Create a new JSON file with the agent's ID as the filename (e.g., `my-agent.json`)
2. Follow the schema structure above
3. Run `npm run generate-manifest` to update the manifest file
4. The agent will be automatically available in the frontend

## Manifest File

The `manifest.json` file lists all available agents and is automatically generated. This file is used by the frontend to know which agents are available for lazy loading. Always regenerate it after adding/removing agents:

```bash
npm run generate-manifest
```
