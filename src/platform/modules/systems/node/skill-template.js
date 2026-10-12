// A skill's new SKILL.md: the frontmatter the Agent Skills format needs, and a start for the body.
// A description that isn't plain text goes in a block, which any YAML reader takes literally.
export function skillTemplate(name, description) {
  const plain = /^[A-Za-z0-9][^:#"'\\\n]*$/.test(description) && !/\s$/.test(description);
  const line = plain ? `description: ${description}` : `description: >\n  ${description.replace(/\s+/g, ' ').trim()}`;
  return `---\nname: ${name}\n${line}\n---\n\nSay what to do, step by step, and when it applies.\n`;
}
