/*
 * grunt-jade-creplace
 *
 * Copyright (c) 2015 bo.cheng
 * Licensed under the MIT license.
 */
var grunt ,
    sys ,
    config ,
    tool ,
    Jade ,
    MD5     = require( "md5" ) ,
    Path    = require( "path" ) ,
    minjs   = require( "uglify-js" ),
    mincss  = require( "clean-css" );

'use strict';

E = function( x ){
    if( typeof x == "object" ){
        for( var a in x ){
            E( x[ a ] );
        };
    } else {
        grunt.log.writeln( x );
    };
};

Jade    = function( url ){
    var _tp = new Date().getTime();
    this.config     = {
        __url       : url,
        url         : url,
        dest        : Path.join( config.dir.pubDir , url.replace( config.dir.jadeDir , "" ) ),
        jade        : 0,
        js          : 0,
        css         : 0,
        tp          : "=" + _tp + "=",
        name        : url.replace( /.*[\/|\\](.*)$/g , "$1" ),
        md5         : tool.getRandMd5( config.md5 + _tp + parseInt( Math.random() * 999999999 ) )
    }
    Jade.fn.lists.push( this );
    this.handle();
}

Jade.fn     = Jade.prototype    = {
    lists   : [] ,
    handle  : function(){
        var _content    = grunt.file.read( this.config.url ).toString();
        this.config.jade = _content;
        try {
            this.config.jade = this.replaceCss();
            this.config.jade = this.replaceJs();
            grunt.file.write( this.config.dest , this.config.jade );
            E( "page : " + this.config.url + " build success!" );
        } catch( e ){
            E( "Error " + this.config.url + "; Jade page charset error..." );
        }
    } ,
    /*!
     *  替换jade文本中的 JS项
     */
    replaceJs : function(){
        var _replace    = this.config.tp + "$1" + this.config.tp,
            _al         = this.config.jade.replace( /(script\([^\)|^\n|^\r|]*\))/gi , _replace ).split( this.config.tp ),
            _js         = [],
            _url        = "js/" + this.config.md5 + ".js";
        for( var i = _al.length; i--; ){
            if( i % 2 ){
                _al[ i ]    = _al[ i ].replace( /\s/gi , "" );
                tool.checkFileStatus( _al[ i ].replace( /.*src=['|"]([^'|^"]*)['|"].*/gi , "$1" ) , function( exists , filePath ){
                    if( exists ){
                        _js.push( filePath );
                        _al[ i ] = "";
                    } else {
                        if( !config.filePath.fetchUrl[ filePath ] ){
                            config.filePath.fetchUrl[ filePath ] = tool.getFileTs( filePath );
                        }
                        _al[ i ] = _al[ i ].replace( /(.*src=['|"])([^'|^"]*)(['|"].*)/gi , "$1" + config.filePath.fetchUrl[ filePath ] + "$3" );
                    };
                } );
            };
        };
        if( _js.length ){
            _al[ _al.length - 2 ] += "\nscript(src='" + config.redirectOrigin + _url + "')";
            this.config.js = _js;
            tool.uglifyJs( this.config , Path.join( config.dir.pubDir , _url ) );
            tool.concatDone( _js , this.config , Path.join( config.dir.pubDir , _url ) );
        };
        return _al.join( "" );
    },
    replaceCss: function(){
        var _replace    = this.config.tp + "$1" + this.config.tp,
            _al         = this.config.jade.replace( /(link\([^\)|^\n|^\r|]*\))/gi , _replace ).split( this.config.tp ),
            _css        = [],
            _url        = "css/" + this.config.md5 + ".css";
        for( var i = _al.length; i--; ){
            if( i % 2 ){
                _al[ i ]    = _al[ i ].replace( /\s/gi , "" );
                tool.checkFileStatus( _al[ i ].replace( /.*href=['|"](.*)['|"].*/gi , "$1" ) , function( exists , filePath ){
                    if( exists ){
                        _css.push( filePath );
                        _al[ i ] = "";
                    } else {
                        if( !config.filePath.fetchUrl[ filePath ] ){
                            config.filePath.fetchUrl[ filePath ] = filePath + ( /\?/.test( filePath ) ? "&" : "?" ) + tool.getRandMd5();
                        }
                        _al[ i ] = _al[ i ].replace( /(.*href=['|"]).*(['|"].*)/i , "$1" + config.filePath.fetchUrl[ filePath ] + "$2" );
                    };
                } );
            };
        };
        if( _css.length ){
            _al[ 1 ] += "link(rel='stylesheet',type='text/css',href='" + config.redirectOrigin + _url + "')";
            this.config.css = _css;
            tool.uglifyCss( this.config , Path.join( config.dir.pubDir , _url ) );
            tool.concatDone( _css , this.config , Path.join( config.dir.pubDir , _url ) );
        };
        return _al.join( "" );
    },
};

tool    = {
    initConfig  : function(){
        config = {
            md5         : Math.ceil( Math.random() * 1e26 ).toString( 36 ) ,
            dir         : {},
            /*!
             *  用于记录已处理的文件路径
             */
            filePath    : {
                jade    : {},
                css     : {},
                js      : {},
                others  : [],
                fetchUrl: {}
            },
            /*!
             *  用户过滤目录中相同的资源文件
             */
            resources   : {},
            ignoreUrl   : [],
            redirectOrigin : ""
        }
        return this;
    } ,
    getRandMd5  : function( tp ){
       return MD5( config.md5 + ( tp || new Date().getTime() ) + parseInt( Math.random() * 999999999 ) ); 
    } ,
    delFileFromHash : function( url ){
        if( config.filePath.js[ url ] ){
            delete config.filePath.js[ url ];
        } else if( config.filePath.css[ url ] ) {
            delete config.filePath.css[ url ];
        };
    },
    /*!
     *  根据文件的相对地址 获取 它的目录
     *  @url    {string}    相对地址
     *  @belong {string}    归属文件的相对地址
     */
    getResourcePath : function( url , belong ){
        return ( belong.replace( /(.*[\/|\\]).*/gi , "$1" ) + url.replace( /\?|\#.*/gi , "" ) ).
                    replace( /[\\|\/][^\\|^\/]*[\\|\/]\.{2}/gi , "" );
    },
    /*!
     *  修正对应内容的图片/其它资源的引用
     *  @str    {string}    内容
     *  @dest   {string}    目标文件地址
     *  return  修正后的内容
     */
    fixImageUrl : function( str , dest ){
        var _spilt  = "cb==cb",
            _imgs   = str.replace( /\s+/gi , " " ).replace( /url\(([^\)]*)\)/gi , _spilt + "$1" + _spilt ).split( _spilt ),
            _md5,
            _dest;
        for( var i = _imgs.length; i--; ){
            if( i % 2 ){
                _img    = tool.getResourcePath( _imgs[ i ].replace( /[\'|\"|\s]*/gi , "" ) , dest );
                if( !grunt.file.exists( _img ) ){
                    continue;
                };
                if( !config.resources[ _img ] ){
                    _md5    = [
                        "resources/",
                        tool.getRandMd5(),
                        _img.replace( /.*(\..*)$/gi , "$1" )
                    ].join( "" );
                    config.resources[ _img ] = _md5;
                } else {
                    _md5 = config.resources[ _img ];
                };
                _imgs[ i ] = "url('../" + _md5 + "')";
            };
        };
        return _imgs.join( "" );
    },
    /*!
     *   获取文件时间戳
     */
    getFileTs : function( filePath ){
        var _ts = ( /\?/.test( filePath ) ? "&" : "?" ) + tool.getRandMd5();
        for( var i = config.ignoreTsUrl.length; i--; ){
            if( config.ignoreTsUrl[ i ].test( filePath ) ){
                _ts = "";
                break;
            }
        }
        return filePath + _ts;
    },
    /*!
     *  串联文件
     *  @files      {array}     待串联的文件集合
     *  @replace    {object}    replace 的配置文件
     */
    concatDone     : function( files , replace , dest ){
        var _url;
        for( var i = files.length; i--; ){
            _url    = replace.src + files[ i ];
            tool.delFileFromHash( _url );
        };
    },
    /*!
     *  串联文件
     *  @files      {array}     待串联的文件集合
     *  @replace    {object}    replace 的配置文件
     */
    concat  : function( files , replace , dest ){
        var _buffer = [],
            _url;
        for( var i = files.length; i--; ){
            _url    = replace.src + files[ i ];
            tool.delFileFromHash( _url );
            if( grunt.file.exists( _url ) ){
                _buffer.push( grunt.file.read( _url ).toString() );
            };
        };
        grunt.file.write( dest , _buffer.join( "" ) );
    },
    /*!
     *  压缩文件
     *  @replace    {object}    replace 的配置文
     *  @dest       {string}    保存的目标地址
     *  return      {string}
     */
    uglifyCss : function( replace , dest ){
        var _buffer = [],
            _url,
            _code,
            _files  = replace.css;
        for( var i = _files.length; i--; ){
            _url    = Path.join( config.dir.srcDir , _files[ i ] );
            if( grunt.file.exists( _url ) ){
                _code = tool.fixImageUrl( grunt.file.read( _url ).toString() , _url );
                _buffer.push( _code );
            };
        };
        _code = new mincss( config.mincss ).minify( _buffer.join( "" ) );
        grunt.file.write( dest , _code );
    } ,
    /*!
     *  压缩文件
     *  @replace    {object}    replace 的配置文
     *  @dest       {string}    保存的目标地址
     *  return      {string}
     */
    uglifyJs : function( replace , dest ){
        var _urls = [];
        for( var i = replace.js.length; i--; ){
            _urls.push( Path.join( config.dir.srcDir , replace.js[ i ] ) );
        };
        try{
            grunt.file.write( dest , minjs.minify( _urls ).code.toString() );   
        } catch( e ){
            E( "Error : uglifyJS error. check js files " + _urls.join( " ; " ) );
        }
    },
    checkFileStatus : function( filePath , func ){
        var _isIgnore = false,
            _exists;
        if( /\.(com|cn|net|org|me)\//.test( filePath ) ){
            for( var i = config.ignoreUrl.length; i--; ){
                if( config.ignoreUrl[ i ].test( filePath ) ){
                    _isIgnore = true;
                    filePath = filePath.replace( config.ignoreUrl[ i ] , "$1" );
                    break;
                };
            };
        };
        _exists = grunt.file.exists( Path.join( config.dir.srcDir , filePath ) );
        func( _exists , ( _isIgnore && !_exists ? config.redirectOrigin : "" ) + filePath );
    },
    getHtmlFiles  : function( dir ){
        grunt.file.recurse( dir , function( path ){
            if( /.*\.jade$/.test( path ) ){
                config.filePath.jade[ path ] = new Jade( path );
            }
        } );
        return this;
    } ,
    getHandleDir : function(){
        sys.files.forEach( function( file ){
            config.dir = {
                jadeDir     : Path.resolve( file.src.toString() ),
                pubDir      : Path.resolve( file.dest.toString() ) ,
                srcDir      : Path.resolve( file.tempSrc.toString() )
            };
            config.ieHacker         = file.isIeHacker;
            config.redirectOrigin   = file.redirectOrigin || "";
            config.ignoreUrl        = file.ignoreUrl instanceof Array ? file.ignoreUrl : 
                                        file.ignoreUrl ? [ file.ignoreUrl ] : [];
            config.ignoreTsUrl      = file.ignoreTsUrl instanceof Array ? file.ignoreTsUrl : 
                                        file.ignoreTsUrl ? [ file.ignoreTsUrl ] : [];
            config.mincss           = file.isIeHacker ? { compatibility : "ie7" } : {};
            if( !grunt.file.isDir( config.dir.srcDir ) ){
                return false;
            };
            if( grunt.file.isDir( config.dir.pubDir ) ){
                grunt.file.delete( config.dir.pubDir , { force : true } );
            };
            grunt.file.mkdir( config.dir.pubDir );
        } );
        return this;
    },
    initHandler : function(){
        tool.getHandleDir();
        if( config.dir.jadeDir && config.dir.srcDir && config.dir.pubDir ){
            tool.getHtmlFiles( config.dir.jadeDir );
        };
        E( "replace completed!!" );
    }
}

module.exports = function( __grunt ) {
    grunt   = __grunt;
    grunt.registerMultiTask( "jadereplace" , "a jade creplace plugin" , function() {
        sys     = this;
        tool.initConfig()
            .initHandler();
    });
};
