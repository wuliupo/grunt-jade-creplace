# A jade-creplace plugin

<https://github.com/nihaox1/grunt-jade-creplace>

## Usage

```js
# Gruntfile.js
module.exports = function (grunt) {
    require("time-grunt")(grunt);
    require("load-grunt-config")(grunt, {
        init: true,
        data: {
            pkg: grunt.file.readJSON('package.json'),
            src: "src",
            temp: ".temp",
            dist: "dist",
            dev: "dev",
            ignoreUrl: [/.*hm\.baidu\.com\/hm\.js.*/, /.*w\.cnzz\.com\/q_stat\.php.*/, /#{/i],
            redirect: "//static.qxwz.com/subdomain"
        }
    });
};
```

```yaml
#jadereplace.yaml
product     :
    src         : <%= src %>/
    dest        : <%= dist %>/
    tempSrc     : <%= dev %>
    ignoreSource: <%= ignoreUrl %>
    ignoreTsUrl : <%= ignoreUrl %>
    isIeHacker  : true
    redirectOrigin    : <%= redirect %>/
```
