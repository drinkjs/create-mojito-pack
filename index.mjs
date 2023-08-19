#!/usr/bin/env node

import inquirer from "inquirer";
import path from "path";
import fs from "fs"
import got from 'got';
import { pipeline } from 'stream/promises';
import unzipper from "unzipper"
import copydir from "copy-dir"
import { exec } from "child_process"

const cwd = process.cwd();

inquirer.prompt([
  {
    type: "input",
    message: "Pack Name",
    name: "name",
    default: path.basename(cwd),
  },
  {
    type: "list",
    message: "Select Type",
    name: "type",
    choices: ["React", "Vue"],
  }
]).then(async (rel) => {

  if (!rel.name) {
    throw new Error("Pack name is empty");
  }

  const zipFile = rel.type === "React" ? "https://github.com/drinkjs/react-mojito-pack/archive/refs/heads/main.zip" : "https://github.com/drinkjs/vue-mojito-pack/archive/refs/heads/main.zip";
  const pathname = rel.type === "React" ? "react-mojito-pack-main" : "vue-mojito-pack-main"
  const readStream = got.stream(zipFile);
  let flag = false;
  console.log("Loading...")
  readStream.on('downloadProgress', (progress) => {
    if (flag && progress.percent !== 1) {
      console.log('\x1b[1ALoading...');
    } else {
      console.log('\x1b[1A' + " ".repeat(10));
    }
    flag = !flag;
  });

  const mainZip = fs.createWriteStream(`${cwd}/main.zip`)
  await pipeline(
    readStream,
    mainZip
  );
  mainZip.close();

  const unzip = fs.createReadStream(`${cwd}/main.zip`).pipe(unzipper.Extract({ path: cwd }));

  unzip.once("close", () => {
    fs.rmSync(`${cwd}/main.zip`);
    copydir.sync(`${cwd}/${pathname}`, `${cwd}/`, {
      utimes: true,
      mode: true,
      cover: true
    });
    fs.rmSync(`${cwd}/${pathname}`, { recursive: true });
    const pkg = JSON.parse(fs.readFileSync(`${cwd}/package.json`).toString());
    pkg.name = rel.name;
    fs.writeFileSync(`${cwd}/package.json`, JSON.stringify(pkg, null, 2));

    console.log("Installing...")
    exec('npm install');

  });
});

