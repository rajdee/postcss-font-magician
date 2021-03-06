/* Required
   ========================================================================== */

var fs = require('fs');
var path = require('path');
var postcss = require('postcss');
var getDirectoryFonts = require('directory-fonts-complete');

/* Options
   ========================================================================== */

var arrayOptions = ['foundries', 'foundriesOrder', 'formats'],
    defaultOptions = {
        async: false,
        aliases: {},
        variants: {},
        custom: {},
        foundries: ['custom', 'hosted', 'bootstrap', 'google'],
        formatHints: {
            otf: 'opentype',
            ttf: 'truetype'
        },
        formats: ['local', 'eot', 'woff2', 'woff'],
        hosted: '',
        display: ''
    },
    foundries = {
        custom: {},
        hosted: {},
        bootstrap: require('bootstrap-fonts-complete'),
        google: require('google-fonts-complete')
    };

/* Helper Methods
   ========================================================================== */

function getConfiguredOptions(options) {
    for (var key in defaultOptions) {
        if (key in options) {
            if (arrayOptions.indexOf(key) && typeof options[key] === 'string') {
                options[key] = options[key].split(/\s+/);
            }
        } else {
            options[key] = defaultOptions[key];
        }
    }

    return options;
}

function getFont(family, options) {
    var index = -1,
        foundryName,
        foundry;

    family = options.aliases[family] || family;

    while (foundryName = options.foundries[++index]) {
        foundry = foundries[foundryName];

        if (foundry && family in foundry) {
            return foundry[family];
        }
    }
}

function getFormatHint(formatHints, extension) {
    return '"' + (formatHints[extension] || extension) + '"';
}

function getMethod(name, params) {
    return name + '(' + params + ')';
}

function getQuoteless(string) {
    return string.replace(/^(['"])(.+)\1$/g, '$2');
}

function getRelativePath(cssPath, relativePath) {
    relativePath = path.dirname(cssPath || '.') + '/' + relativePath;

    return relativePath.replace(/(^|\/)\.\//g, '$1').replace(/\/$/, '');
}

function getSafelyQuoted(string) {
    string = getQuoteless(string);
    return string.match(/\s/) ? '"' + string + '"' : string;
}

function splitValue(value) {
  var splittedValue = value.split(' ');

  if (splittedValue.length) {
    if (
        !splittedValue[1]
        || (splittedValue[1] !== 'normal' && splittedValue[1] !== 'italic')) {
          splittedValue.splice(1, 0, 'normal');
    }

    return {
          weight: splittedValue[0],
          style: splittedValue[1],
          stretch: splittedValue[2] || '',
    };
  }
}

function generateFont(family, fontFaceRules, options, defaultOptions) {
    var sources = [],
        formats = options.formats || defaultOptions.formats;

    formats.forEach(function(format) {
        var url, formatHint, source;

        if (format === 'local' && options.urls.local) {
            options.urls.local.forEach(function (local) {
                var localSource = getMethod('local', getSafelyQuoted(local));
                sources.push(localSource);
            });
        } else if (options.urls.url) {
            url = options.urls.url[format];
            if (!url) return;

            url = url.replace(/^https?:/, '');

            if (format === 'eot') {
                url += '?#';
            }

            formatHint = getFormatHint(defaultOptions.formatHints, format);
            source = getMethod('url', url) + ' ' + getMethod('format', formatHint);
            sources.push(source);
        }
    });

    if (sources.length) {
        var fontFaceRule = postcss.atRule({
            name: 'font-face'
        });

        fontFaceRule.append(postcss.decl({
            prop: 'font-family',
            value: getSafelyQuoted(family)
        }));

        fontFaceRule.append(postcss.decl({
            prop: 'font-style',
            value: options.style
        }));

        fontFaceRule.append(postcss.decl({
            prop: 'font-weight',
            value: options.weight
        }));

        fontFaceRule.append(postcss.decl({
            prop: 'src',
            value: sources.join(',')
        }));

        if (options.ranges) {
            fontFaceRule.append(postcss.decl({
                prop: 'unicode-ranges',
                value: options.ranges
            }));
        }

        if (options.stretch) {
            fontFaceRule.append(postcss.decl({
                prop: 'font-stretch',
                value: options.stretch
            }));
        }

        if (options.display) {
            fontFaceRule.append(postcss.decl({
                prop: 'font-display',
                value: options.display
            }));
        }

        return [].concat(fontFaceRules, fontFaceRule);
    } else {
      return fontFaceRules;
    }
};


/* CSS Methods
   ========================================================================== */

function getValueByDeclaration(rule, property) {
    var index = -1,
        declaration;

    while (declaration = rule.nodes[++index]) {
        if (declaration.prop === property) {
            return declaration.value;
        }
    }

    return '';
}

function getFirstFontFamily(decl) {
    return getQuoteless(
        postcss.list.space(
            postcss.list.comma(decl.value)[0]
        ).slice(-1)[0]
    );
}

function getFontFaceRules(family, options) {
    var weight, style, formats, ranges, stretch, googleWeights, key, splittedValue,
        display,
        fontFaceRules = [],
        font = getFont(family, options),
        variants = options.variants;

    if (!font) {
        return fontFaceRules;
    }

    if (variants && variants[family]) {
      for (key in variants[family]) {
        splittedValue = splitValue(key);
        weight = splittedValue.weight;
        style = splittedValue.style;
        stretch = splittedValue.stretch;
        formats = variants[family][key][0]
          ? variants[family][key][0].replace(/\W+/g, " ").split(' ')
          : options.formats;
        ranges = variants[family][key][1]
          ? variants[family][key][1].toUpperCase()
          : null;
        googleWeights = font.variants[style];

        if (googleWeights && googleWeights[weight]) {
          fontFaceRules =  generateFont(
            family,
            fontFaceRules,
            {
              style: style,
              urls: googleWeights[weight],
              weight: weight,
              formats: formats,
              ranges: ranges,
              stretch: stretch,
              display: options.display
            },
            options
            );
        }
      }
    } else {
        Object.keys(font.variants).forEach(function (style) {
            var weights = font.variants[style];
            Object.keys(weights).forEach(function (weight) {
                var urls = weights[weight];
                fontFaceRules = generateFont(
                  family,
                  fontFaceRules,
                  {
                    style: style,
                    urls: urls,
                    weight: weight,
                    formats: null,
                    ranges: null,
                    stretch: null,
                    display: options.display
                  },
                  options
                );
            });
        });
    }

    return fontFaceRules;
}

function plugin(options) {
    options = getConfiguredOptions(options || {});
    foundries.custom = options.custom;

    return function (css) {
        var fontFamiliesDeclared = {};

        if (options.hosted && options.foundries.indexOf('hosted') !== -1) {
            foundries.hosted = getDirectoryFonts(
                getRelativePath(css.source.input.file, options.hosted)
            );
        } else {
            delete foundries.hosted;
        }

        css.walkAtRules('font-face', function (rule) {
            rule.walkDecls('font-family', function (decl) {
                var family = getQuoteless(decl.value);

                fontFamiliesDeclared[family] = true;
            });
        });

        css.walkDecls(/^font(-family)?$/, function (decl) {
            var family = getFirstFontFamily(decl);

            if (!fontFamiliesDeclared[family]) {
                fontFamiliesDeclared[family] = true;

                var fontFaceRules = getFontFaceRules(family, options);

                if (fontFaceRules.length) {
                    css.prepend(fontFaceRules);
                }
            }
        });

        if (options.async) {
            var fontFaces = [];

            css.walkAtRules('font-face', function (rule) {
                rule.remove();

                fontFaces.push({
                    family: getValueByDeclaration(rule, 'font-family'),
                    weight: getValueByDeclaration(rule, 'font-weight'),
                    style: getValueByDeclaration(rule, 'font-style'),
                    src: getValueByDeclaration(rule, 'src')
                });
            });

            if (fontFaces) {
                var asyncPath = getRelativePath(css.source.input.file, options.async);

                var asyncJs = '(function(){' +
                  fs.readFileSync('loader.min.js', 'utf8') + 'loadFonts(' + JSON.stringify(fontFaces) + ')' +
                '})()';

                fs.writeFileSync(asyncPath, asyncJs);
            }
        }
    };
}

module.exports = postcss.plugin('postcss-font-magician', plugin);

module.exports.process = function (css, options) {
    var processed = postcss([module.exports(options)]).process(css, options);

    return options && options.map && !options.map.inline ? processed : processed.css;
};
