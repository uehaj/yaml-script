import fs from 'fs';
import yaml from 'js-yaml';

export type AST =
  | number
  | string
  | boolean
  | AST[]
  | { [funcName: string]: AST[] }
  | null;

export function parseYamlString(yamlText: string): AST {
  return yaml.safeLoad(yamlText);
}

export function parseYamlFile(filename: string): AST {
  const yamlText = fs.readFileSync(filename, 'utf8');
  return parseYamlString(yamlText);
}

export function isASTArray(params: AST): params is AST[] {
  if (Array.isArray(params)) {
    return true;
  }
  return false;
}

export function isASTNull(params: any): params is null {
  return params === null;
}
