// tslint:disable:no-console

import * as commander from 'commander';

import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import { join } from 'path';

interface Options {
  contract: string;
}

const argv = (commander
  .option('-c, --contract <contract', 'contract name')
  .parse(process.argv)
  .opts() as any) as Options;

if (!argv.contract) {
  throw new Error('Missing contract name [-c, --contract]');
}

const args = [
  'run',
  '--rm',
  'flatten',
  '--solc-paths',
  'zeppelin-solidity/=/project/node_modules/zeppelin-solidity/',
  `/project/contracts/${argv.contract}.sol`
];

const outPath = join(__dirname, '..', 'build', 'flat', `${argv.contract}.sol`);
const outStream = createWriteStream(outPath);

const child = spawn('docker-compose', args, {
  cwd: join(__dirname, '..', 'docker')
});

child.stdout.pipe(outStream);
child.stderr.on('data', chunk => {
  console.error(chunk.toString());
});

child.on('close', code => {
  if (code !== 0) {
    console.error(`Failed to flatten ${argv.contract} contract`);
  } else {
    console.log(`Saved flattened ${argv.contract} contract to ${outPath}`);
  }
});
