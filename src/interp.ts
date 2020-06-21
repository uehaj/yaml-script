import { AST, isASTArray } from './parser';
import config from './config';

export class Scope {}
export class YamlScriptError extends Error {}

const callJSFunction = (funcName: string, args: AST[]) => {
  const programText = `"use strict";return ${funcName}(...args);`;
  config.verbose && console.log(`programText = ${programText}`);
  return new Function('args', programText)(args);
};

function applyFunction(funcName: string, arg: AST[], env: Scope) {
  config.verbose &&
    console.log(
      `applyFunction funcName=${funcName}, arg=${JSON.stringify(
        arg
      )}, env=${JSON.stringify(Object.keys(env))}`
    );
  if (funcName.startsWith('$')) {
    config.verbose && console.log(`func=${funcName}`);
    const evalueted = evalYaml(funcName, env);
    if (typeof evalueted === 'string') {
      funcName = evalueted;
    }
  }
  if (!!(env as any)[funcName]) {
    config.verbose && console.log(`[1]`);
    return (env as any)[funcName].applyFunc(arg, env);
  } else {
    config.verbose && console.log(`[2] ${funcName}, ${typeof arg}`);
    arg = arg.map((elm) => evalYaml(elm, env));
    return callJSFunction(funcName, arg);
  }
}

export function evalYaml(script: AST, env: Scope): AST {
  config.verbose &&
    console.log(
      `evalYaml ${JSON.stringify(script)} env=${JSON.stringify(
        Object.keys(env)
      )}`
    );
  let result: AST = null;
  if (isASTArray(script)) {
    // [a,b,c] ==> eval(a),eval(c),result=eval(c)
    for (const elem of script) {
      result = evalYaml(elem, env);
    }
  } else if (typeof script === 'string') {
    if (script.startsWith('$')) {
      // $x ==> find x from the Scope
      const varName = script.slice(1);
      result = (env as any)[varName];
    } else {
      // x ==> "x"
      result = script;
    }
  } else if (typeof script === 'number' || typeof script === 'boolean') {
    // 3 ==> 3
    // true === true
    result = script;
  } else if (script === null) {
    result = script;
  } else if (typeof script === 'object') {
    // {k1:v1, k2:v2} ==> k1(v1), result=k2(v2)
    for (const key of Object.keys(script)) {
      let arg = (script as any)[key];
      if (!Array.isArray(arg)) {
        arg = [arg];
      }
      //      const aruguments = arg.map((e: AST) => evalYaml(e, env));
      result = applyFunction(key, arg, env);
    }
  }
  config.verbose && console.log(`   result=${result}`);
  return result;
}
