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
        hosted: ''
    },
    foundries = {
        custom: {},
        hosted: {},
        bootstrap: require('bootstrap-fonts-complete'),
        google: require('google-fonts-complete')
    };

/* Helper Methods
   ========================================================================== */

function getConfiguredOptions(opts) {
    for (var key in defaultOptions) {
        if (key in opts) {
            if (arrayOptions.indexOf(key) && typeof opts[key] === 'string') {
                opts[key] = opts[key].split(/\s+/);
            }
        } else {
            opts[key] = defaultOptions[key];
        }
    }

    return opts;
}

function getFont(family, opts) {
    var index = -1,
        foundryName,
        foundry;

    family = opts.aliases[family] || family;

    while (foundryName = opts.foundries[++index]) {
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

function convertVariants(variants) {
    var family,
        weights,
        style,
        formats,
        result = {};
    for (family in variants) {
        result[family] = {};
        for (style in variants[family]) {
            weights = variants[family][style];
            if (Array.isArray(weights)) {
                formats = weights[1] ? weights[1].split(' ') : [];
                result[family][style] = {
                    weights: weights[0].split(' '),
                    formats: formats
                };
            }
        }
    }
    return result;
}

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

function getFontFaceRules(family, opts) {
    var fontFaceRules = [],
        font = getFont(family, opts),
        variants = opts.variants,
        generateFont = function generateFont(style, urls, weight) {
            var sources = [],
                formats = opts.formats;

            if (opts.variants[family] && opts.variants[family][style].formats) {
              formats = opts.variants[family][style].formats;
            }

            formats.forEach(function (format) {
                var url,
                    formatHint,
                    source;

                if (format === 'local' && urls.local) {
                    urls.local.forEach(function (local) {
                        var localSource = getMethod('local', getSafelyQuoted(local));
                        sources.push(localSource);
                    });
                } else if (urls.url) {
                    url = urls.url[format];
                    if (!url) return;

                    url = url.replace(/^https?:/, '');

                    if (format === 'eot') {
                        url += '?#';
                    }

                    formatHint = getFormatHint(opts.formatHints, format);
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
                    value: style
                }));

                fontFaceRule.append(postcss.decl({
                    prop: 'font-weight',
                    value: weight
                }));

                fontFaceRule.append(postcss.decl({
                    prop: 'src',
                    value: sources.join(',')
                }));

                fontFaceRules.push(fontFaceRule);
            }
        };

    if (!font) {
        return fontFaceRules;
    }

    if (variants && variants[family]) {
        Object.keys(variants[family]).forEach(function (style) {
            var googleWeights = font.variants[style],
                variantsWeights = variants[family][style].weights;
            if (googleWeights && Array.isArray(variantsWeights)) {
                variantsWeights.forEach(function (weight) {
                    if (googleWeights[weight]) {
                        generateFont(style, googleWeights[weight], weight);
                    }
                });
            }
        });
    } else {
        Object.keys(font.variants).forEach(function (style) {
            var weights = font.variants[style];
            Object.keys(weights).forEach(function (weight) {
                var urls = weights[weight];
                generateFont(style, urls, weight);
            });
        });
    }
    return fontFaceRules;
}

function plugin(opts) {
    opts = getConfiguredOptions(opts || {});
    foundries.custom = opts.custom;
    opts.variants = convertVariants(opts.variants);

    return function (css) {
        var fontFamiliesDeclared = {};

        if (opts.hosted && opts.foundries.indexOf('hosted') !== -1) {
            foundries.hosted = getDirectoryFonts(
                getRelativePath(css.source.input.file, opts.hosted)
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

                var fontFaceRules = getFontFaceRules(family, opts);

                if (fontFaceRules.length) {
                    css.prepend(fontFaceRules);
                }
            }
        });

        if (opts.async) {
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
                var asyncPath = getRelativePath(css.source.input.file, opts.async);

                var asyncJs = '(function(){' +
                  fs.readFileSync('loader.min.js', 'utf8') + 'loadFonts(' + JSON.stringify(fontFaces) + ')' +
                '})()';

                fs.writeFileSync(asyncPath, asyncJs);
            }
        }
    };
}

module.exports = postcss.plugin('postcss-font-magician', plugin);

module.exports.process = function (css, opts) {
    var processed = postcss([module.exports(opts)]).process(css, opts);

    return opts && opts.map && !opts.map.inline ? processed : processed.css;
};
