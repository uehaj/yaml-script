import program from 'commander';
/**
 * 指定されたパスの Yaml ファイルを読み込みます。
 */

function loadYamlFile(filename: string) {
  const fs = require('fs');
  const yaml = require('js-yaml');
  const yamlText = fs.readFileSync(filename, 'utf8');
  return yaml.safeLoad(yamlText);
}

function main(argv: string[]) {
  program
    .version('0.1.0')
    .option('-e,--script [script]', 'run script from command line')
    .option('-v,--verbose', 'verbose output')
    .arguments('[file...]')
    .action(function (files, opts) {
      for (const file of files) {
        const data = loadYamlFile(file);
        console.log(data);
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
    console.log(program.script);
  } else {
    program.args.length !== 0 || program.help();
  }
}

main(process.argv);
