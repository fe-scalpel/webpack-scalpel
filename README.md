### @alife/webpack-scalpel

解析使用webpack构建过程中的模块依赖，以及项目可能没用到的文件或者依赖。


![](https://img.alicdn.com/tfs/TB19PpdRpXXXXbdXVXXXXXXXXXX-1428-685.png)

```
const webpackScalpel = require('@alife/webpack-scalpel');
const path = require('path';)

plugins:[
    new webpackScalpel({
        packageJson: path.resolve('./package.json'),
        fileFilter: /package.json|gulpfile.js|webpack.config.js|build|fie.config.js|^\.|node_modules|.+\.md/,
        root:'./',
        ignore: [],
    })
]
```