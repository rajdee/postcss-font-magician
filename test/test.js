var postcss = require('postcss');
var expect  = require('chai').expect;

var plugin = require('../');

var test = function (input, output, opts, done) {
  postcss([ plugin(opts) ]).process(input).then(function (result) {
    expect(result.css).to.eql(output);

    expect(result.warnings()).to.be.empty;

    done();
  }).catch(function (error) {
    done(error);
  });
};

describe('postcss-font-magician', function () {
  it('supports bootstrap fonts', function (done) {
    test(
      'a{font-family:monospace}b{}',

      '@font-face{font-family:monospace;font-style:italic;font-weight:400;src:local("Menlo Italic"),local(Menlo-Italic),local("Consolas Italic"),local(Consolas-Italic),local("Courier New Italic")}' +
      '@font-face{font-family:monospace;font-style:italic;font-weight:700;src:local("Menlo Bold Italic"),local(Menlo-BoldItalic),local(Monaco),local("Consolas Bold Italic"),local(Consolas-BoldItalic),local("Courier New Bold Italic")}' +
      '@font-face{font-family:monospace;font-style:normal;font-weight:400;src:local("Menlo Regular"),local(Menlo-Regular),local(Monaco),local(Consolas),local("Courier New")}' +
      '@font-face{font-family:monospace;font-style:normal;font-weight:700;src:local("Menlo Bold"),local(Menlo-Bold),local(Monaco),local("Consolas Bold"),local(Consolas-Bold),local("Courier New Bold")}' +
      'a{font-family:monospace}b{}',

      {},
      done
    );
  });

  it('adds bootstrap fonts once', function (done) {
    test(
      'a{font-family:monospace}b{font-family:monospace}',

      '@font-face{font-family:monospace;font-style:italic;font-weight:400;src:local("Menlo Italic"),local(Menlo-Italic),local("Consolas Italic"),local(Consolas-Italic),local("Courier New Italic")}' +
      '@font-face{font-family:monospace;font-style:italic;font-weight:700;src:local("Menlo Bold Italic"),local(Menlo-BoldItalic),local(Monaco),local("Consolas Bold Italic"),local(Consolas-BoldItalic),local("Courier New Bold Italic")}' +
      '@font-face{font-family:monospace;font-style:normal;font-weight:400;src:local("Menlo Regular"),local(Menlo-Regular),local(Monaco),local(Consolas),local("Courier New")}' +
      '@font-face{font-family:monospace;font-style:normal;font-weight:700;src:local("Menlo Bold"),local(Menlo-Bold),local(Monaco),local("Consolas Bold"),local(Consolas-Bold),local("Courier New Bold")}' +
      'a{font-family:monospace}b{font-family:monospace}',

      {},
      done
    );
  });

  it('supports google fonts', function (done) {
    test(
      'a{font-family:"Alice"}b{}',

      '@font-face{font-family:Alice;font-style:normal;font-weight:400;src:local(Alice),local(Alice-Regular),url(//fonts.gstatic.com/s/alice/v7/sZyKh5NKrCk1xkCk_F1S8A.eot?#) format("eot"),url(//fonts.gstatic.com/s/alice/v7/l5RFQT5MQiajQkFxjDLySg.woff2) format("woff2"),url(//fonts.gstatic.com/s/alice/v7/_H4kMcdhHr0B8RDaQcqpTA.woff) format("woff")}' +
      'a{font-family:"Alice"}b{}',

      {},
      done
    );
  });

  it('supports custom google fonts', function (done) {
    test(
      'a{font-family:"Open Sans"}b{}',

      '@font-face{font-family:"Open Sans";font-style:normal;font-weight:300;src:url(//fonts.gstatic.com/s/opensans/v13/DXI1ORHCpsQm3Vp6mXoaTXhCUOGz7vYGh680lGh-uXM.woff) format("woff")}@font-face{font-family:"Open Sans";font-style:italic;font-weight:400;src:url(//fonts.gstatic.com/s/opensans/v13/xjAJXh38I15wypJXxuGMBmfQcKutQXcIrRfyR5jdjY8.eot?#) format("eot"),url(//fonts.gstatic.com/s/opensans/v13/xjAJXh38I15wypJXxuGMBobN6UDyHWBl620a-IRfuBk.woff) format("woff")}a{font-family:"Open Sans"}b{}',
      {
        variants: {
                'Open Sans': {
                    '300': ['woff'],
                    '400 italic': ["eot woff"]
                }
            }
      },
      done
    );
  });

  it('supports custom google fonts (default formats)', function (done) {
    test(
      'a{font-family:"Open Sans"}b{}',

      '@font-face{font-family:"Open Sans";font-style:normal;font-weight:300;src:local("Open Sans Light"),local(OpenSans-Light),url(//fonts.gstatic.com/s/opensans/v13/DXI1ORHCpsQm3Vp6mXoaTXZ2MAKAc2x4R1uOSeegc5U.eot?#) format("eot"),url(//fonts.gstatic.com/s/opensans/v13/DXI1ORHCpsQm3Vp6mXoaTegdm0LZdjqr5-oayXSOefg.woff2) format("woff2"),url(//fonts.gstatic.com/s/opensans/v13/DXI1ORHCpsQm3Vp6mXoaTXhCUOGz7vYGh680lGh-uXM.woff) format("woff")}a{font-family:"Open Sans"}b{}',

      {
        variants: {
                'Open Sans': {
                    '300': []
                }
            }
      },
      done
    );
  });

  it('supports custom unicode-range', function (done) {
    test(
      'a{font-family:"Open Sans"}b{}',

      '@font-face{font-family:"Open Sans";font-style:normal;font-weight:300;src:url(//fonts.gstatic.com/s/opensans/v13/DXI1ORHCpsQm3Vp6mXoaTXhCUOGz7vYGh680lGh-uXM.woff) format("woff");unicode-ranges:U+0100-024F, U+1E00-1EFF, U+20A0-20AB, U+20AD-20CF, U+2C60-2C7F, U+A720-A7FF}@font-face{font-family:"Open Sans";font-style:italic;font-weight:400;src:url(//fonts.gstatic.com/s/opensans/v13/xjAJXh38I15wypJXxuGMBmfQcKutQXcIrRfyR5jdjY8.eot?#) format("eot"),url(//fonts.gstatic.com/s/opensans/v13/xjAJXh38I15wypJXxuGMBobN6UDyHWBl620a-IRfuBk.woff) format("woff")}a{font-family:"Open Sans"}b{}',
      {
        variants: {
                'Open Sans': {
                    '300': ['woff', 'U+0100-024F, U+1E00-1EFF, U+20A0-20AB, U+20AD-20CF, U+2C60-2C7F, U+A720-A7FF'],
                    '400 italic': ["eot woff"]
                }
            }
      },
      done
    );
  });

  it('adds google fonts once', function (done) {
    test(
      'a{font-family:"Alice"}b{font-family:"Alice"}',

      '@font-face{font-family:Alice;font-style:normal;font-weight:400;src:local(Alice),local(Alice-Regular),url(//fonts.gstatic.com/s/alice/v7/sZyKh5NKrCk1xkCk_F1S8A.eot?#) format("eot"),url(//fonts.gstatic.com/s/alice/v7/l5RFQT5MQiajQkFxjDLySg.woff2) format("woff2"),url(//fonts.gstatic.com/s/alice/v7/_H4kMcdhHr0B8RDaQcqpTA.woff) format("woff")}' +
      'a{font-family:"Alice"}b{font-family:"Alice"}',

      {},
      done
    );
  });

  it('supports hosted fonts', function (done) {
    test(
      'a{font-family:"Source Sans Pro"}b{}',

      '@font-face{font-family:"Source Sans Pro";font-style:400;font-weight:normal;src:local(SourceSansPro-Regular),local(SourceSansPro-Regular),url(./test/fonts/pathFont.woff) format("woff")}' +
      'a{font-family:"Source Sans Pro"}b{}',

      {
        hosted: './test/fonts'
      },
      done
    );
  });

  it('does not overwrite existing @font-face rules', function (done) {
    test(
      '@font-face{font-family:Alice}a{font-family:"Alice"}b{}',

      '@font-face{font-family:Alice}a{font-family:"Alice"}b{}',

      {},
      done
    );
  });

  it('support foundry exclusion', function (done) {
    test(
      'a{font-family:"Alice"}b{}',

      'a{font-family:"Alice"}b{}',

      {
        foundries: 'hosted'
      },
      done
    );
  });

  it('support font aliasing', function (done) {
    test(
      'a{font-family:body}b{}',

      '@font-face{font-family:body;font-style:normal;font-weight:400;src:local(Montserrat-Regular),url(//fonts.gstatic.com/s/montserrat/v6/zhcz-_WihjSQC0oHJ9TCYFQlYEbsez9cZjKsNMjLOwM.eot?#) format("eot"),url(//fonts.gstatic.com/s/montserrat/v6/zhcz-_WihjSQC0oHJ9TCYPk_vArhqVIZ0nv9q090hN8.woff2) format("woff2"),url(//fonts.gstatic.com/s/montserrat/v6/zhcz-_WihjSQC0oHJ9TCYBsxEYwM7FgeyaSgU71cLG0.woff) format("woff")}' +
      '@font-face{font-family:body;font-style:normal;font-weight:700;src:local(Montserrat-Bold),url(//fonts.gstatic.com/s/montserrat/v6/IQHow_FEYlDC4Gzy_m8fcmzklk6MJbhg7BmBP42CjCQ.eot?#) format("eot"),url(//fonts.gstatic.com/s/montserrat/v6/IQHow_FEYlDC4Gzy_m8fcoWiMMZ7xLd792ULpGE4W_Y.woff2) format("woff2"),url(//fonts.gstatic.com/s/montserrat/v6/IQHow_FEYlDC4Gzy_m8fcgFhaRv2pGgT5Kf0An0s4MM.woff) format("woff")}' +
      'a{font-family:body}b{}',

      {
        aliases: {
          body: 'Montserrat'
        }
      },
      done
    );
  });

  it('support custom fonts', function (done) {
    test(
      'a{font-family:body}b{}',

      '@font-face{font-family:body;font-style:400;font-weight:normal;src:url(path/to/my-body-font.woff2) format("woff2")}' +
      'a{font-family:body}b{}',

      {
        custom: {
          body: {
            variants: {
              400: {
                normal: {
                  url: {
                    woff2: 'path/to/my-body-font.woff2'
                  }
                }
              }
            }
          }
        }
      },
      done
    );
  });

  it('support async font loading', function (done) {
    test(
      'a{font-family:Alice}b{}',

      'a{font-family:Alice}b{}',

      {
        async: './test/fontface.js.result'
      },
      done
    );
  });
});
