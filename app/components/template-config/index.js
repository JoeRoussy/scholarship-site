import handlebars from 'express-handlebars';
import marked from 'marked';
import eol from 'eol';
import format_date from '../format-date';
import urlHelper from 'url';

export default app => {
    const hbs = handlebars.create({
        extname: '.hbs',
        defaultLayout: 'main',
        layoutsDir: 'app/views/layouts',
        partialsDir: [ 'app/views/partials' ],
        helpers: {
            math: function(lvalue, operator, rvalue, roundTo) {
                lvalue = parseFloat(lvalue);
                rvalue = parseFloat(rvalue);

                let result = {
                    "+": lvalue + rvalue,
                    "-": lvalue - rvalue,
                    "*": lvalue * rvalue,
                    "/": lvalue / rvalue,
                    "%": lvalue % rvalue
                }[operator];

                return roundTo ? result.toFixed(roundTo) : result;
            },
            isMultipleOf: function(index, amount, scope) {
                if ( ++index % amount ) {
                    return scope.inverse(this);
                } else {
                    return scope.fn(this);
                }
            },
            ternary: function (test, yes, no) {
                return test ? yes : no;
            },
            md: function (text, supressParagraph, options) {
                if (!text) {
                    return;
                }

                if (typeof supressParagraph == 'object') {
                    options = supressParagraph;
                    supressParagraph = false;
                }

                const renderer = new marked.Renderer();

                if (supressParagraph) {
                    renderer.paragraph = function (text) {
                        return text;
                    };
                }

                return marked(text, {
                    renderer: renderer
                });
            },
            interpolate(string, options) {
                return string.replace(/{(\w+)}/g, (match, key) => options[key]);
            },
            inlineInterpolate(string, value) {
                return string.replace('{value}', value);
            },
            formatDate(date, format) {
                if (typeof format === 'object' && !format.fr && !format.en) {
                    // No format config was provided
                    format = null;
                }

                // TODO: Add in a utility to get user language later
                return format_date({
                    date,
                    format
                });
           },
            equals: function (a, b, options) {
                if (a == b) {
                    return options.fn(this);
                }

                return options.inverse(this);
            },
            equalsInline: function (a, b) {
                return a == b;
            },
            urlResolve: function (from, to) {
                return urlHelper.resolve(from, to);
            },
            gt:function(a, b){
                var next =  arguments[arguments.length-1];
                    return (a > b) ? next.fn(this) : next.inverse(this);
            },
            stringify: function (object) {
                return JSON.stringify(object);
            },
            applyDiscount: function (price, discount, options) {
                return (price - discount).toFixed(2);
            },
            paginate: function (totalPages, currentPage, block) {
                var out = '';

                for (var i=1; i<=totalPages; i++) {
                    out += block.fn({
                        current:i,
                        active:(currentPage == i)
                    });
                }

                return out;
            },
            join: function () {
                var args = [].slice.call(arguments, 0, -1);

                return args.join('');
            },
            cond: function (a, operator, b, options) {
                switch (operator) {
                    case '==':
                        return (a == b) ? options.fn(this) : options.inverse(this);
                    case '===':
                        return (a === b) ? options.fn(this) : options.inverse(this);
                    case '!=':
                        return (a != b) ? options.fn(this) : options.inverse(this);
                    case '!==':
                        return (a !== b) ? options.fn(this) : options.inverse(this);
                    case '<':
                        return (a < b) ? options.fn(this) : options.inverse(this);
                    case '<=':
                        return (a <= b) ? options.fn(this) : options.inverse(this);
                    case '>':
                        return (a > b) ? options.fn(this) : options.inverse(this);
                    case '>=':
                        return (a >= b) ? options.fn(this) : options.inverse(this);
                    case '&&':
                        return (a && b) ? options.fn(this) : options.inverse(this);
                    case '||':
                        return (a || b) ? options.fn(this) : options.inverse(this);
                    case 'in':
                        return JSON.parse(b).indexOf(a) > -1 ? options.fn(this) : options.inverse(this);
                    default:
                        return options.inverse(this);
                }
            },
            formatCurrency: function (val, omitCents, lang, isBVariant) {
                const value = val.split('.');

                if (typeof omitCents === 'boolean' && omitCents) {
                    return value[0];
                }

                const result = isBVariant ? `<span>${value[0]}</span><sup>${value[1]}</sup>` : `${value[0]}<sup>.${value[1]}</sup>`;

                if (typeof lang === 'string') {
                    if (isBVariant) {
                        return lang === 'en' ? `<abbr title="CAD">$</abbr>${result}` : `${result}<abbr title="CAD">$</abbr>`;
                    } else {
                        return lang === 'en' ? `$${result}` : `${result}$`;
                    }
                }

                return result;
            },
            formatCurrencyFlat: function (val, lang, spacing) {
                // NOTE: This function only positions a '$' based on the language
                let space = '';

                if (typeof spacing === 'string') {
                    space = spacing;
                }

                return lang === 'en' ? `$${space}${val}` : `${val}${space}$`
            },
            repeat: function (n, block) {
                let out = '';

                for (let i = 0; i < n; i++) {
                    out += block.fn(i);
                }

                return out;
            },
            parseJSON: function (data) {
                return JSON.parse(data);
            },
            truncate: function (str, len) {
                if (str.length > len) {
                   var new_str = str.substr (0, len+1);

                   while (new_str.length) {
                       var ch = new_str.substr ( -1 );
                       new_str = new_str.substr ( 0, -1 );

                       if (ch == ' ') {
                           break;
                       }
                   }

                   if ( new_str == '' ) {
                       new_str = str.substr ( 0, len );
                   }

                   return new_str +'...';
               }

               return str;
           },
           getPrice: function (prices, key) {
               return prices[key].price;
           },
           getDiscount: function (prices, key) {
               return prices[key].discount;
           },
           addLineBreaks: function(text) {
               return eol.lf(text).replace(/\n/g, '<br>');
           },
           maskEmail: function(email) {
               const [ username, domain ] = email.split('@');

               return `${username.charAt(0)}*****@${domain}`;
           }
        }
    });

    app.engine('.hbs', hbs.engine);
    app.set('view engine', '.hbs');
    app.set('views', 'app/views');
}
