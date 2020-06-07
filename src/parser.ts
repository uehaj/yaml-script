import fs from 'fs';
import yaml from 'js-yaml';

export type AST = object;

export function parseYamlString(yamlText: string): AST {
  return yaml.safeLoad(yamlText);
}

export function parseYamlFile(filename: string): AST {
  const yamlText = fs.readFileSync(filename, 'utf8');
  return parseYamlString(yamlText);
}
