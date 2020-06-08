import commandLineParser from 'commander';
import { AST, parseYamlString, parseYamlFile } from './parser';

class Scope {}
class TopLevelScope extends Scope {
  ['+'] = (a: any, b: any) => a + b;
  ['-'] = (a: any, b: any) => a - b;
  ['*'] = (a: any, b: any) => a * b;
  ['/'] = (a: any, b: any) => a / b;
  ['**'] = (a: any, b: any) => a ** b;
  ['%'] = (a: any, b: any) => a % b;
  ['=='] = (a: any, b: any) => a == b;
  ['==='] = (a: any, b: any) => a === b;
  ['!='] = (a: any, b: any) => a != b;
  ['!=='] = (a: any, b: any) => a !== b;
  ['>'] = (a: any, b: any) => a > b;
  ['<'] = (a: any, b: any) => a < b;
  ['>='] = (a: any, b: any) => a >= b;
  ['<='] = (a: any, b: any) => a <= b;
  ['&&'] = (a: any, b: any) => a && b;
  ['||'] = (a: any, b: any) => a || b;
  ['!'] = (a: any) => !a;
  ['typeof'] = (a: any) => typeof a;
  ['instanceof'] = (a: any, b: any) => a instanceof b;
  ['&'] = (a: any, b: any) => a & b;
  ['|'] = (a: any, b: any) => a | b;
  ['~'] = (a: any) => ~a;
  ['^'] = (a: any, b: any) => a ^ b;
  ['<<'] = (a: any, b: any) => a << b;
  ['>>'] = (a: any, b: any) => a >> b;
  ['>>>'] = (a: any, b: any) => a >>> b;
  $if = (condPart: AST, thenPart: AST, elsePart: AST) => {
    const cond = this.eval(condPart);
    if (!!cond) {
      return this.eval(thenPart);
    } else {
      return this.eval(elsePart);
    }
  };
  $setq = (varName: string, exp: AST) => {
    (this as any)[varName] = exp;
  };
  eval = (expr: AST): AST => evalYaml(expr, this);
}

const applyNativeFunction = (funcName: string, args: AST[]) => {
  const programText = `"use strict";return ${funcName}(...args);`;
  return new Function('args', programText)(args);
};

function applyFunction(funcName: string, arg: AST[], env: Scope) {
  console.log(`${funcName} ${Object.keys(env)}`);
  if (Object.keys(env).indexOf(funcName) !== -1) {
    const result = (env as any)[funcName](...arg);
    return result;
  } else {
    const result = applyNativeFunction(funcName, arg);
    return result;
  }
  return undefined;
}

function evalYaml(script: AST, env: Scope): AST {
  let result = null;
  if (Array.isArray(script)) {
    for (const elem of script) {
      result = evalYaml(elem, env);
    }
  } else if (typeof script === 'string') {
    result = script;
  } else if (typeof script === 'object') {
    for (const key of Object.keys(script)) {
      const arg = (script as any)[key];
      if (Array.isArray(arg)) {
        if (key.startsWith('$')) {
          result = applyFunction(key, arg, env);
        } else {
          result = applyFunction(
            key,
            arg.map((elem) => evalYaml(elem, env)),
            env
          );
        }
      } else {
        result = applyFunction(key, [evalYaml(arg, env)], env);
      }
    }
  } else {
    result = script;
  }
  return result;
}

function main(argv: string[]) {
  let env = new TopLevelScope();
  commandLineParser
    .version('0.1.0')
    .option('-e,--script [script]', 'run script from command line')
    .option('-v,--verbose', 'verbose output')
    .arguments('[file...]')
    .action(function (files, opts) {
      for (const file of files) {
        const program: AST = parseYamlFile(file);
        console.log(evalYaml(program, env));
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
  if (commandLineParser.script) {
    const result = evalYaml(env, parseYamlString(commandLineParser.script));
    console.log(result);
  } else {
    commandLineParser.args.length !== 0 || commandLineParser.help();
  }
}

main(process.argv);
