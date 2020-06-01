import program from 'commander';
import fs, { appendFileSync } from 'fs';
import yaml from 'js-yaml';
import { exec } from 'child_process';

function parseYamlString(yamlText: string) {
  return yaml.safeLoad(yamlText);
}

function parseYamlFile(filename: string) {
  const yamlText = fs.readFileSync(filename, 'utf8');
  return parseYamlString(yamlText);
}

const predefinedFunctions = {
  '+': (a: any, b: any) => a + b,
  '-': (a: any, b: any) => a - b,
};

function applyFunction(funcName: string, arg: any[]) {
  if (Object.keys(predefinedFunctions).indexOf(funcName) !== -1) {
    const result = (predefinedFunctions as any)[funcName](...arg);
    return result;
  }
  return undefined;
}
function evalYaml(script: object): any {
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
        result = applyFunction(
          key,
          arg.map((elem) => evalYaml(elem))
        );
      } else {
        result = applyFunction(key, [evalYaml(arg)]);
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
