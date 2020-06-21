import commandLineParser from 'commander';
import { AST, parseYamlString, parseYamlFile } from './parser';
import { evalYaml } from './interp';
import { TopLevelScope } from './function';
import config from './config';

function main(argv: string[]) {
  const env = new TopLevelScope();
  commandLineParser
    .version('0.1.0')
    .option(
      '-e,--script [script]',
      'run script from command line',
      (script: string) => {
        evalYaml(parseYamlString(commandLineParser.script), env);
      }
    )
    .option('-v,--verbose', 'verbose output', () => {
      config.verbose = true;
    })
    .option('-p,--perseOnly', 'parse and dump AST', () => {
      config.parseOnly = true;
    })
    .arguments('[file...]')
    .action((fileNames: string) => {
      for (const fileName of fileNames) {
        const program: AST = parseYamlFile(fileName);
        if (config.parseOnly) {
          console.log(JSON.stringify(program, null, ' '));
        } else {
          evalYaml(program, env);
        }
      }
    })
    .on('--help', function () {
      console.log(`

  Examples:

    $ yarn start test.yaml

`);
    })
    .parse(argv);

  commandLineParser.args.length !== 0 || commandLineParser.help();
}

main(process.argv);
