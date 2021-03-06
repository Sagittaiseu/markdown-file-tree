#!/usr/bin/env node
import path from 'path';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import DirectoryTree from './components/DirectoryTree';
import { initConfig, getConfig } from './config';
import * as FSUtils from './fsUtils';


const mdFileTree = async (dirPath, linkPrefix, depth = 0) => {
  if (depth > getConfig('maxDepth')) {
    return null;
  }

  const tree = {
    rootName: path.basename(dirPath),
    rootPath: path.resolve(dirPath),
    hasRootMd: false,
    childDirs: [],
    childFiles: [],
  };
  const children = await FSUtils.readdirPromise(dirPath);

  await Promise.all(children.map(async child => {
    const childPath = path.resolve(dirPath, child);
    if (getConfig('exclude').some(exclude => exclude.test(childPath))) {
      return;
    }
    const childStats = await FSUtils.statPromise(childPath);
    if (childStats.isDirectory()) {
      const childLinkPrefix = `${linkPrefix}`;
      const childDir = await mdFileTree(childPath, childLinkPrefix, depth + 1);
      if (childDir !== null) {
        tree.childDirs.push(childDir);
      }
    } else if (
      depth === 0 && getConfig('rootFileName') === child ||
      tree.rootName === FSUtils.trimExtension(child)
    ) {
      tree.hasRootMd = true;
    } else if (getConfig('include').some(include => include.test(child))) {
      tree.childFiles.push(child);
    }
    return;
  }));

  return tree;
};

const run = async configPath => {
  try {
    await initConfig(configPath || '.mftrc.json');
    const dirPath = path.resolve(FSUtils.resolveHome(getConfig('source')));
    const tree = await mdFileTree(dirPath, getConfig('linkPrefix'));
    const treeHtml = ReactDOMServer.renderToStaticMarkup(<DirectoryTree tree={tree} />);
    const outputPath = path.resolve(FSUtils.resolveHome(getConfig('output')));
    await FSUtils.writeFilePromise(outputPath, treeHtml);
  } catch (error) {
    console.log(error);
  }
};

run(process.argv[2]);
