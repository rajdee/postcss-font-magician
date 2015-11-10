'use strict';
var postcss = require('postcss');
var extend = require('util')._extend;
var fs = require('fs');
var path = require('path');
var Promise = global.Promise || require('es6-promise').Promise;
Promise.any = require('promise-any-ext');

function unquote(string) {
  return string.replace(/^(['"])(.+)\1$/g, '$2');
}

function getFirstFontFamily(decl) {
  return unquote(
    postcss.list.space(
      postcss.list.comma(decl.value)[0]
    ).slice(-1)[0]
  );
}

function getSafelyQuoted(string) {
  return string.match(/\s/) ? '"' + string + '"' : string;
}

function createFontFaces(family, font) {
  var fontFaceRules = [];

  if (font) {
    Object.keys(font.variants).forEach(function (weight) {
      var styles = font.variants[weight];

      Object.keys(styles).forEach(function (style) {
        var formats = styles[style],
            sources = [],
            fontFaceRule;

        Object.keys(formats).forEach(function (format) {
          var value = formats[format];
          switch (format) {
            case 'local':
              value.filter(function(elem, pos) {
                return value.indexOf(elem) === pos;
              }).forEach(function(local) {
                sources.push('local(' + getSafelyQuoted(local) + ')');
              });
              break;
            case 'eot':
              value += '?#';
              sources.push('url(' + value + ') format("' + format + '")');
              break;
            default:
              sources.push('url(' + value + ') format("' + format + '")');
          }
        });

        fontFaceRule = postcss.atRule({ 'name': 'font-face' });
        [
          { 'prop': 'font-family', 'value': getSafelyQuoted(family) },
          { 'prop': 'font-weight',  'value': weight },
          { 'prop': 'font-style', 'value': style },
          { 'prop': 'src', 'value': sources.join(',') }
        ].forEach(function(prop) {
          fontFaceRule.append(postcss.decl(prop));
        });
        fontFaceRules.push(fontFaceRule);
      });
    });
  }
  return fontFaceRules;
}

function findFontFamilyInSources(family, sources, cache) {

  if (cache[family]) {
    return Promise.resolve(createFontFaces(family, cache[family]));
  }

  if (!sources.length) {
    return Promise.resolve();
  }
  return new Promise(function(resolve) {
    Promise.any(sources.map(function(source) {
      return source(family);
    })).then(function (results) {
      cache[family] = results;
      resolve(createFontFaces(family, results));
    }, function () {
      resolve();
    });
  });
}

module.exports = postcss.plugin('postcss-font-magician', function (opts) {
  opts = extend({
    'sources': [],
    'except': []
  }, opts);

  return function (css) {
    return new Promise(function (resolve) {
      var cache,
          fontFamiliesDeclared;
      try {
        cache = require(path.join(process.cwd(), 'font-magician.cache.json'));
      } catch (e) {
        cache = {};
      }

      fontFamiliesDeclared = {};

      opts.except.forEach(function (family) {
        fontFamiliesDeclared[family] = true;
      });

      css.walkAtRules('font-face', function (rule) {
        rule.walkDecls('font-family', function (decl) {
          var family = unquote(decl.value);
          fontFamiliesDeclared[family] = true;
        });
      });

      var families = [];
      css.walkDecls(/^font(-family)?$/, function (decl) {
        var family = getFirstFontFamily(decl);
        if (!fontFamiliesDeclared[family]) {
          fontFamiliesDeclared[family] = true;
          families.push(family);
        }
      });

      Promise.all(families.map(function(family) {
        return findFontFamilyInSources(family, opts.sources, cache);
      })).then(function (results) {
        results = results
          .filter(Boolean)
          .reduce(function(a, b) { return a.concat(b); });
        if (results) {
          results.forEach(function(fontFace) { css.prepend(fontFace); });
        }
        resolve();
        fs.writeFileSync('font-magician.cache.json', JSON.stringify(cache));
      });
    });
  };
});
