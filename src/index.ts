import program from 'commander';
import fs, { appendFileSync } from 'fs';
import yaml from 'js-yaml';

type AST = object;

function parseYamlString(yamlText: string): AST {
  return yaml.safeLoad(yamlText);
}

function parseYamlFile(filename: string): AST {
  const yamlText = fs.readFileSync(filename, 'utf8');
  return parseYamlString(yamlText);
}

const predefinedFunctions = {
  '+': (a: any, b: any) => a + b,
  '-': (a: any, b: any) => a - b,
  '*': (a: any, b: any) => a * b,
  '/': (a: any, b: any) => a / b,
  '**': (a: any, b: any) => a ** b,
  '%': (a: any, b: any) => a % b,
  '==': (a: any, b: any) => a == b,
  '===': (a: any, b: any) => a === b,
  '!=': (a: any, b: any) => a != b,
  '!==': (a: any, b: any) => a !== b,
  '>': (a: any, b: any) => a > b,
  '<': (a: any, b: any) => a < b,
  '>=': (a: any, b: any) => a >= b,
  '<=': (a: any, b: any) => a <= b,
  '&&': (a: any, b: any) => a && b,
  '||': (a: any, b: any) => a || b,
  '!': (a: any) => !a,
  typeof: (a: any) => typeof a,
  instanceof: (a: any, b: any) => a instanceof b,
  '&': (a: any, b: any) => a & b,
  '|': (a: any, b: any) => a | b,
  '~': (a: any) => ~a,
  '^': (a: any, b: any) => a ^ b,
  '<<': (a: any, b: any) => a << b,
  '>>': (a: any, b: any) => a >> b,
  '>>>': (a: any, b: any) => a >>> b,
  $if: (condPart: AST, thenPart: AST, elsePart: AST) => {
    const cond = evalYaml(condPart);
    if (!!cond) {
      return evalYaml(thenPart);
    } else {
      return evalYaml(elsePart);
    }
  },
};

const applyNativeFunc = (funcName: string, args: AST[]) => {
  const programText = `"use strict";return ${funcName}(...args);`;
  return new Function('args', programText)(args);
};

function applyPredefinedFunction(funcName: string, arg: AST[]) {
  if (Object.keys(predefinedFunctions).indexOf(funcName) !== -1) {
    const result = (predefinedFunctions as any)[funcName](...arg);
    return result;
  } else {
    const result = applyNativeFunc(funcName, arg);
    return result;
  }
  return undefined;
}
function evalYaml(script: object): AST {
  let result = null;
  if (Array.isArray(script)) {
    for (const elem of script) {
      result = evalYaml(elem);
    }
  } else if (typeof script === 'string') {
    result = script;
  } else if (typeof script === 'object') {
    for (const key of Object.keys(script)) {
      const arg = (script as any)[key];
      if (Array.isArray(arg)) {
        if (key.startsWith('$')) {
          result = applyPredefinedFunction(key, arg);
        } else {
          result = applyPredefinedFunction(
            key,
            arg.map((elem) => evalYaml(elem))
          );
        }
      } else {
        result = applyPredefinedFunction(key, [evalYaml(arg)]);
      }
    }
  } else {
    result = script;
  }
  return result;
}

function main(argv: string[]) {
  program
    .version('0.1.0')
    .option('-e,--script [script]', 'run script from command line')
    .option('-v,--verbose', 'verbose output')
    .arguments('[file...]')
    .action(function (files, opts) {
      for (const file of files) {
        const data = parseYamlFile(file);
        console.log(evalYaml(data));
      }
    })
    .on('--help', function () {
      console.log(`

  Examples:

    $ yarn start test.yaml

`);
    })
    .parse(argv);

  // for -e,--script option
  if (program.script) {
    const result = evalYaml(parseYamlString(program.script));
    console.log(result);
  } else {
    program.args.length !== 0 || program.help();
  }
}

main(process.argv);
