const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const express = require('express');
const ejs = require('ejs');
const openbrowser = require('openbrowser');
const mkdir = require('mkdirp');
const projectRoot = path.resolve(__dirname, '..');

module.exports = {
  start
};

function start(obj,unused,opts) {
  const {
    port = 8888,
    host = '127.0.0.1',
    openBrowser = true,
    bundleDir = null
  } = opts || {};

  const chartData = getChartData(obj,opts.root);

  if (!chartData) return;

  const app = express();

  app.engine('ejs', require('ejs').renderFile);
  app.set('view engine', 'ejs');
  app.set('views', `${projectRoot}/views`);
  app.use(express.static(`${projectRoot}/public`));

  app.use('/', (req, res) => {
    res.render('viewer', {
      chartData: JSON.stringify(chartData),
      unused: unused,
    });
  });

  return app.listen(port, host, () => {
    const url = `http://${host}:${port}`;

    if (openBrowser) {
      openbrowser(url);
    }
  });
}

function find(list,name){
    return list.find(function(i){
        return i.name == name;
    })
}


function getChartData(tree,root) {
    var data = {nodes:[],edges:[]}
    for(var i in tree) {
        var l = tree[i].modules.length;
        tree[i].modules.forEach(function(i){
            if (i.dependencies) {
                i.dependencies.forEach(function(j){
                    data.edges.push({
                        target: j.replace(root,''),
                        source: i.name.replace(root,''),
                    })
                })
            }
           
            data.nodes.push({
                shape: 'customNode',
                id: i.name.replace(root,''),
                x: Math.random() * 1000,
                y: Math.random() * 800,
                type: i.type
            })
        });
    }

    return data;
}
