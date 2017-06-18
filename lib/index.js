var dir = require('./dir');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var _ignore = ['webpack-dev-server','process'];
var view = require('./view');

var getModule = function(str) {
    var type = testType(str);
    var match;
    if (type == 'module') {
        str = str.replace(/^.*node_modules\//,'');
        match = str.match(/\d+\.\d+\.\d+.*?@(.*)/);
        if (match) {
            str = match[1];
        }
        var array = str.split('/');
        return str[0] === '@' ? array[0] + '/' + array[1] : array[0];
    } else {
        return str;
    }
}

var handlerRequire = function(array) {
    var ret = [];
    var map = {};

    for(let i in array) {
        var match = i.match(/node_modules/g);
        if (match && match.length >1) {
            continue;
        }
        var item = getModule(i);
        if (!map[item]) {
            ret.push(item);
            map[item] = true;
        }
    }
    return ret;
}

var testType = function (str) {
    return /node_modules/.test(str) ? 'module' : 'file';
}

var handlerStats = function(array,stats,statsMap) {
    array.forEach(function(i){
        if (!statsMap[i]) {
            stats.push(i);
            statsMap[i] = true;
        }
    })
}

var getFile = function(str) {
    var _str = str.split('!');
    return _str[_str.length-1];
}

var handlerDependencies=function(d) {
    return d.map(function(i){
       return i.module ? getModule(i.module.userRequest) : getModule(i.userRequest);
    }).filter(function(i){
        return i;
    });
}

// don't care module inner
// simple mode
var handlerModules = function(modules,ignore){
    var ret = [];
    var stats = [];
    var map = {};
    var statsMap = {};
    var _fileDependencies = [];

    modules.forEach(function(i) {
        var resource = i.resource || '';
        var request = i.request || '';
        var issuer = i.issuer || '';
        var fileDependencies = i.fileDependencies || [];
        var dependencies = i.dependencies;
        var loaders = i.loaders || [];
        var type = testType(resource);
        var name = getModule(resource);
        loaders = loaders.map(getModule);
        fileDependencies = fileDependencies.map(getModule);
        dependencies = handlerDependencies(dependencies);
        handlerStats(loaders.concat(fileDependencies),stats,statsMap);
        
        dependencies = fileDependencies.concat(dependencies).filter(function(i){
            return i != name;
        })

        if (name && !map[name] && ignore.indexOf(name) == -1) {
            if (type == 'module') {
                if (testType(getFile(issuer)) != 'module') {
                     ret.push({
                        name: name,
                        type: type,
                    })
                    map[name] = true;
                }
            } else {
                _fileDependencies = _fileDependencies.concat(fileDependencies);
                ret.push({
                    dependencies:_.uniq(dependencies),
                    type:type,
                    name:name
                })
                map[name] = true;
            }
        }
    });

    //loader import
    _fileDependencies.forEach(function(i){
        var item = ret.find(function(j){
            return j.type == 'file' && j.name == i; 
        })
        if (!item) {
            ret.push({
                name: i,
                type: 'file',
                dependencies: []
            })
        }
    });

    return {
        modules: ret,
        stats: _.uniq(stats)
    };
}

function MyPlugin(options) {
    this.opts = Object.assign({
        packageJson: './package.json',
        fileFilter: /package.json|gulpfile.js|stats.json|fie.config.js|^\.|analyse|node_modules|.+\.md/,
        root:'./',
        ignore: [],
        statsJson: './stats.json'
    },options);
}

MyPlugin.prototype.apply = function(compiler) {
  var stats = [];
  var self = this;
  var tree = {};
  var files = dir.read(self.opts.root,self.opts.fileFilter);
  var packageJson = require(self.opts.packageJson);
  var dependencies = Object.assign({},packageJson.devDependencies,packageJson.dependencies);

  compiler.plugin('done', function(s) {
    var requireModule = handlerRequire(require.cache);
    var ret = [];
     var unUsed = [];
     stats = _.uniq(stats.concat(requireModule));
     Object.keys(dependencies).concat(files).forEach(function(i){
        var item = stats.findIndex(function(j){
            return j == i;
        })
        if (item == -1) {
            unUsed.push(i);
        }
    })

    // tree
    // unUsed  

    view.start(tree,unUsed,{
        root: path.resolve(self.opts.root)
    })

  })

  compiler.plugin('emit', function(compilation, callback) {
    compilation.chunks.forEach(function(chunk) {
        var ret = handlerModules(chunk.modules,self.opts.ignore.concat(_ignore));
        var unUsed = [];
        var modules = [];

        modules = ret.modules;
        tree[chunk.name] = {modules:modules,files:chunk.files};
        stats = stats.concat(ret.stats);
    });
    callback();
  });
};

module.exports = MyPlugin;