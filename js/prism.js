/* PrismJS 1.29.0 - Minimal build for Forge EC website */

var _self = (typeof window !== 'undefined')
    ? window
    : (
        (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope)
            ? self
            : {}
    );

var Prism = (function (_self) {
    var lang = /\blang(?:uage)?-([\w-]+)\b/i;
    var uniqueId = 0;

    var _ = {
        manual: _self.Prism && _self.Prism.manual,
        disableWorkerMessageHandler: _self.Prism && _self.Prism.disableWorkerMessageHandler,
        util: {
            encode: function encode(tokens) {
                if (tokens instanceof Token) {
                    return new Token(tokens.type, encode(tokens.content), tokens.alias);
                } else if (Array.isArray(tokens)) {
                    return tokens.map(encode);
                } else {
                    return tokens.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ');
                }
            },

            type: function (o) {
                return Object.prototype.toString.call(o).slice(8, -1);
            },

            objId: function (obj) {
                if (!obj['__id']) {
                    Object.defineProperty(obj, '__id', { value: ++uniqueId });
                }
                return obj['__id'];
            },

            clone: function deepClone(o, visited) {
                visited = visited || {};

                var clone, id;
                switch (_.util.type(o)) {
                    case 'Object':
                        id = _.util.objId(o);
                        if (visited[id]) {
                            return visited[id];
                        }
                        clone = {};
                        visited[id] = clone;

                        for (var key in o) {
                            if (o.hasOwnProperty(key)) {
                                clone[key] = deepClone(o[key], visited);
                            }
                        }

                        return clone;

                    case 'Array':
                        id = _.util.objId(o);
                        if (visited[id]) {
                            return visited[id];
                        }
                        clone = [];
                        visited[id] = clone;

                        o.forEach(function (v, i) {
                            clone[i] = deepClone(v, visited);
                        });

                        return clone;

                    default:
                        return o;
                }
            },

            getLanguage: function (element) {
                while (element && !lang.test(element.className)) {
                    element = element.parentElement;
                }
                if (element) {
                    return (element.className.match(lang) || [, 'none'])[1].toLowerCase();
                }
                return 'none';
            },

            currentScript: function () {
                if (typeof document === 'undefined') {
                    return null;
                }
                if ('currentScript' in document && document.currentScript !== null) {
                    return document.currentScript;
                }

                try {
                    throw new Error();
                } catch (err) {
                    var src = (/at [^(\r\n]*\((.*):.+:.+\)$/i.exec(err.stack) || [])[1];
                    if (src) {
                        var scripts = document.getElementsByTagName('script');
                        for (var i in scripts) {
                            if (scripts[i].src == src) {
                                return scripts[i];
                            }
                        }
                    }
                    return null;
                }
            },

            isActive: function (element, className, defaultActivation) {
                var no = 'no-' + className;

                while (element) {
                    var classList = element.classList;
                    if (classList.contains(className)) {
                        return true;
                    }
                    if (classList.contains(no)) {
                        return false;
                    }
                    element = element.parentElement;
                }
                return !!defaultActivation;
            }
        },

        languages: {
            plain: {},
            plaintext: {},
            text: {},
            txt: {},

            extend: function (id, redef) {
                var lang = _.util.clone(_.languages[id]);

                for (var key in redef) {
                    lang[key] = redef[key];
                }

                return lang;
            },

            insertBefore: function (inside, before, insert, root) {
                root = root || _.languages;
                var grammar = root[inside];
                var ret = {};

                for (var token in grammar) {
                    if (grammar.hasOwnProperty(token)) {
                        if (token == before) {
                            for (var newToken in insert) {
                                if (insert.hasOwnProperty(newToken)) {
                                    ret[newToken] = insert[newToken];
                                }
                            }
                        }

                        ret[token] = grammar[token];
                    }
                }

                var old = root[inside];
                root[inside] = ret;

                _.languages.DFS(_.languages, function(key, value) {
                    if (value === old && key != inside) {
                        this[key] = ret;
                    }
                });

                return ret;
            },

            DFS: function DFS(o, callback, type, visited) {
                visited = visited || {};

                var objId = _.util.objId;

                for (var i in o) {
                    if (o.hasOwnProperty(i)) {
                        callback.call(o, i, o[i], type || i);

                        var property = o[i],
                            propertyType = _.util.type(property);

                        if (propertyType === 'Object' && !visited[objId(property)]) {
                            visited[objId(property)] = true;
                            DFS(property, callback, null, visited);
                        }
                        else if (propertyType === 'Array' && !visited[objId(property)]) {
                            visited[objId(property)] = true;
                            DFS(property, callback, i, visited);
                        }
                    }
                }
            }
        },

        plugins: {},

        highlightAll: function(async, callback) {
            _.highlightAllUnder(document, async, callback);
        },

        highlightAllUnder: function(container, async, callback) {
            var env = {
                callback: callback,
                container: container,
                selector: 'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'
            };

            _.hooks.run('before-highlightall', env);

            env.elements = Array.prototype.slice.apply(env.container.querySelectorAll(env.selector));

            _.hooks.run('before-all-elements-highlight', env);

            for (var i = 0, element; element = env.elements[i++];) {
                _.highlightElement(element, async === true, env.callback);
            }
        },

        highlightElement: function(element, async, callback) {
            var language = _.util.getLanguage(element);
            var grammar = _.languages[language];

            element.className = element.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;

            var parent = element.parentElement;
            if (parent && parent.nodeName.toLowerCase() === 'pre') {
                parent.className = parent.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;
            }

            var code = element.textContent;

            var env = {
                element: element,
                language: language,
                grammar: grammar,
                code: code
            };

            function insertHighlightedCode(highlightedCode) {
                env.highlightedCode = highlightedCode;

                _.hooks.run('before-insert', env);

                env.element.innerHTML = env.highlightedCode;

                _.hooks.run('after-highlight', env);
                _.hooks.run('complete', env);
                callback && callback.call(env.element);
            }

            _.hooks.run('before-sanity-check', env);

            parent = env.element.parentElement;
            if (parent && parent.nodeName.toLowerCase() === 'pre' && !parent.hasAttribute('tabindex')) {
                parent.setAttribute('tabindex', '0');
            }

            if (!env.code) {
                _.hooks.run('complete', env);
                callback && callback.call(env.element);
                return;
            }

            _.hooks.run('before-highlight', env);

            if (!env.grammar) {
                insertHighlightedCode(_.util.encode(env.code));
                return;
            }

            if (async && _self.Worker) {
                var worker = new Worker(_.filename);

                worker.onmessage = function(evt) {
                    insertHighlightedCode(evt.data);
                };

                worker.postMessage(JSON.stringify({
                    language: env.language,
                    code: env.code,
                    immediateClose: true
                }));
            }
            else {
                insertHighlightedCode(_.highlight(env.code, env.grammar, env.language));
            }
        },

        highlight: function (text, grammar, language) {
            var env = {
                code: text,
                grammar: grammar,
                language: language
            };
            _.hooks.run('before-tokenize', env);
            env.tokens = _.tokenize(env.code, env.grammar);
            _.hooks.run('after-tokenize', env);
            return Token.stringify(_.util.encode(env.tokens), env.language);
        },

        tokenize: function(text, grammar) {
            var rest = grammar.rest;
            if (rest) {
                for (var token in rest) {
                    grammar[token] = rest[token];
                }

                delete grammar.rest;
            }

            var tokenList = new LinkedList();
            addAfter(tokenList, tokenList.head, text);

            matchGrammar(text, tokenList, grammar, tokenList.head, 0);

            return toArray(tokenList);
        },

        hooks: {
            all: {},

            add: function (name, callback) {
                var hooks = _.hooks.all;

                hooks[name] = hooks[name] || [];

                hooks[name].push(callback);
            },

            run: function (name, env) {
                var callbacks = _.hooks.all[name];

                if (!callbacks || !callbacks.length) {
                    return;
                }

                for (var i = 0, callback; callback = callbacks[i++];) {
                    callback(env);
                }
            }
        },

        Token: Token
    };

    _self.Prism = _;

    function Token(type, content, alias, matchedStr) {
        this.type = type;
        this.content = content;
        this.alias = alias;
        this.length = (matchedStr || '').length | 0;
    }

    Token.stringify = function stringify(o, language) {
        if (typeof o == 'string') {
            return o;
        }
        if (Array.isArray(o)) {
            var s = '';
            o.forEach(function (e) {
                s += stringify(e, language);
            });
            return s;
        }

        var env = {
            type: o.type,
            content: stringify(o.content, language),
            tag: 'span',
            classes: ['token', o.type],
            attributes: {},
            language: language
        };

        var aliases = o.alias;
        if (aliases) {
            if (Array.isArray(aliases)) {
                Array.prototype.push.apply(env.classes, aliases);
            } else {
                env.classes.push(aliases);
            }
        }

        _.hooks.run('wrap', env);

        var attributes = '';
        for (var name in env.attributes) {
            attributes += ' ' + name + '="' + (env.attributes[name] || '').replace(/"/g, '&quot;') + '"';
        }

        return '<' + env.tag + ' class="' + env.classes.join(' ') + '"' + attributes + '>' + env.content + '</' + env.tag + '>';
    };

    function matchGrammar(text, tokenList, grammar, startNode, startPos, rematch) {
        for (var token in grammar) {
            if (!grammar.hasOwnProperty(token) || !grammar[token]) {
                continue;
            }

            var patterns = grammar[token];
            patterns = Array.isArray(patterns) ? patterns : [patterns];

            for (var j = 0; j < patterns.length; ++j) {
                if (rematch && rematch.cause == token + ',' + j) {
                    return;
                }

                var patternObj = patterns[j],
                    inside = patternObj.inside,
                    lookbehind = !!patternObj.lookbehind,
                    greedy = !!patternObj.greedy,
                    alias = patternObj.alias;

                if (greedy && !patternObj.pattern.global) {
                    var flags = patternObj.pattern.toString().match(/[imsuy]*$/)[0];
                    patternObj.pattern = RegExp(patternObj.pattern.source, flags + 'g');
                }

                var pattern = patternObj.pattern || patternObj;

                for (var currentNode = startNode.next, pos = startPos; currentNode !== tokenList.tail; pos += currentNode.value.length, currentNode = currentNode.next) {

                    if (rematch && pos >= rematch.reach) {
                        break;
                    }

                    var str = currentNode.value;

                    if (tokenList.length > text.length) {
                        return;
                    }

                    if (str instanceof Token) {
                        continue;
                    }

                    var removeCount = 1;
                    var match;

                    if (greedy) {
                        match = findNextMatch(pattern, pos, text, lookbehind);
                        if (!match) {
                            break;
                        }

                        var from = match.index;
                        var to = match.index + match[0].length;
                        var p = pos;

                        p += currentNode.value.length;
                        while (from >= p) {
                            currentNode = currentNode.next;
                            p += currentNode.value.length;
                        }

                        p -= currentNode.value.length;
                        pos = p;

                        if (currentNode.value instanceof Token) {
                            continue;
                        }

                        for (
                            var k = currentNode;
                            k !== tokenList.tail && (p < to || typeof k.value === 'string');
                            k = k.next
                        ) {
                            removeCount++;
                            p += k.value.length;
                        }
                        removeCount--;

                        str = text.slice(pos, p);
                        match.index -= pos;
                    } else {
                        pattern.lastIndex = 0;
                        match = pattern.exec(str);
                    }

                    if (!match) {
                        continue;
                    }

                    if (lookbehind) {
                        var lookbehindLength = match[1] ? match[1].length : 0;
                        var from = match.index + lookbehindLength;
                        var matchStr = match[0].slice(lookbehindLength);
                        var to = from + matchStr.length;
                        var before = str.slice(0, from);
                        var after = str.slice(to);

                        var reach = pos + str.length;
                        if (rematch && reach > rematch.reach) {
                            rematch.reach = reach;
                        }

                        var removeFrom = currentNode.prev;

                        if (before) {
                            removeFrom = addAfter(tokenList, removeFrom, before);
                            pos += before.length;
                        }

                        removeRange(tokenList, removeFrom, removeCount);

                        var wrapped = new Token(token, inside ? _.tokenize(matchStr, inside) : matchStr, alias, matchStr);
                        currentNode = addAfter(tokenList, removeFrom, wrapped);

                        if (after) {
                            addAfter(tokenList, currentNode, after);
                        }

                        if (removeCount > 1) {
                            var nestedRematch = {
                                cause: token + ',' + j,
                                reach: reach
                            };
                            matchGrammar(text, tokenList, grammar, currentNode.prev, pos, nestedRematch);

                            if (rematch && nestedRematch.reach > rematch.reach) {
                                rematch.reach = nestedRematch.reach;
                            }
                        }
                    }
                }
            }
        }
    }

    function findNextMatch(pattern, pos, text, lookbehind) {
        pattern.lastIndex = pos;
        var match = pattern.exec(text);
        if (match && lookbehind && match[1]) {
            var lookbehindLength = match[1].length;
            match.index += lookbehindLength;
            match[0] = match[0].slice(lookbehindLength);
        }
        return match;
    }

    function LinkedList() {
        var head = { value: null, prev: null, next: null };
        var tail = { value: null, prev: head, next: null };
        head.next = tail;

        this.head = head;
        this.tail = tail;
        this.length = 0;
    }

    function addAfter(list, node, value) {
        var next = node.next;
        var newNode = { value: value, prev: node, next: next };
        node.next = newNode;
        next.prev = newNode;
        list.length++;

        return newNode;
    }

    function removeRange(list, node, count) {
        var next = node.next;
        for (var i = 0; i < count && next !== list.tail; i++) {
            next = next.next;
        }
        node.next = next;
        next.prev = node;
        list.length -= i;
    }

    function toArray(list) {
        var array = [];
        var node = list.head.next;
        while (node !== list.tail) {
            array.push(node.value);
            node = node.next;
        }
        return array;
    }

    if (!_self.document) {
        if (!_self.addEventListener) {
            return _;
        }

        if (!_.disableWorkerMessageHandler) {
            _self.addEventListener('message', function (evt) {
                var message = JSON.parse(evt.data);
                var lang = message.language;
                var code = message.code;
                var immediateClose = message.immediateClose;

                _self.postMessage(_.highlight(code, _.languages[lang], lang));
                if (immediateClose) {
                    _self.close();
                }
            }, false);
        }

        return _;
    }

    var script = _.util.currentScript();

    if (script) {
        _.filename = script.src;

        if (script.hasAttribute('data-manual')) {
            _.manual = true;
        }
    }

    function highlightAutomaticallyCallback() {
        if (!_.manual) {
            _.highlightAll();
        }
    }

    if (!_.manual) {
        var readyState = document.readyState;
        if (readyState === 'loading' || readyState === 'interactive' && script && script.defer) {
            document.addEventListener('DOMContentLoaded', highlightAutomaticallyCallback);
        } else {
            if (window.requestAnimationFrame) {
                window.requestAnimationFrame(highlightAutomaticallyCallback);
            } else {
                window.setTimeout(highlightAutomaticallyCallback, 16);
            }
        }
    }

    return _;

})(_self);

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Prism;
}

if (typeof global !== 'undefined') {
    global.Prism = Prism;
}

// Rust language definition
Prism.languages.rust = {
    'comment': [
        {
            pattern: /(^|[^\\])\/\*[\s\S]*?\*\//,
            lookbehind: true,
            greedy: true
        },
        {
            pattern: /(^|[^\\:])\/\/.*/,
            lookbehind: true,
            greedy: true
        }
    ],
    'string': {
        pattern: /b?"(?:\\[\s\S]|[^\\"])*"|b?r(#*)"(?:[^"]|"(?!\1))*"\1/,
        greedy: true
    },
    'char': {
        pattern: /b?'(?:\\(?:x[0-7][\da-fA-F]|u\{(?:[\da-fA-F]_*){1,6}\}|.)|[^\\\r\n\t'])'/,
        greedy: true
    },
    'attribute': {
        pattern: /#!?\[(?:[^\[\]"]|"(?:\\[\s\S]|[^\\"])*")*\]/,
        greedy: true,
        alias: 'attr-name',
        inside: {
            'string': null
        }
    },
    'closure-params': {
        pattern: /([=(,:;]|^|[^&]|\b(?:move|static|async)\s*)\|[^|]*\||\|[^|]*\|(?=\s*(?:\{|->))/,
        lookbehind: true,
        greedy: true,
        inside: {
            'closure-punctuation': {
                pattern: /^\||\|$/,
                alias: 'punctuation'
            },
            rest: null
        }
    },
    'lifetime-annotation': {
        pattern: /'\w+/,
        alias: 'symbol'
    },
    'fragment-specifier': {
        pattern: /(\$\w+:)[a-z]+/,
        lookbehind: true,
        alias: 'punctuation'
    },
    'variable': /\$\w+/,
    'function-definition': {
        pattern: /(\bfn\s+)\w+/,
        lookbehind: true,
        alias: 'function'
    },
    'type-definition': {
        pattern: /(\b(?:enum|struct|trait|type|union)\s+)\w+/,
        lookbehind: true,
        alias: 'class-name'
    },
    'module-declaration': [
        {
            pattern: /(\b(?:crate|mod)\s+)[a-z][a-z_\d]*/,
            lookbehind: true,
            alias: 'namespace'
        },
        {
            pattern: /(\buse\s+)[a-z]\w*(?:::\w+)*(?:\s+as\s+\w+)?/,
            lookbehind: true,
            alias: 'namespace'
        }
    ],
    'keyword': [
        /\b(?:Self|abstract|as|async|await|become|box|break|const|continue|crate|do|dyn|else|enum|extern|false|final|fn|for|if|impl|in|let|loop|macro|match|mod|move|mut|override|priv|pub|ref|return|self|static|struct|super|trait|true|try|type|typeof|union|unsafe|unsized|use|virtual|where|while|yield)\b/
    ],
    'function': /\b[a-z_]\w*(?=\s*(?:::\s*<|\())/,
    'macro': {
        pattern: /\b\w+!/,
        alias: 'property'
    },
    'constant': /\b[A-Z_][A-Z_\d]+\b/,
    'class-name': /\b[A-Z]\w*\b/,
    'namespace': {
        pattern: /(?:\b[a-z][a-z_\d]*\s*::\s*)*\b[a-z][a-z_\d]*\s*::(?!\s*<)/,
        inside: {
            'punctuation': /::/
        }
    },
    'number': /\b(?:0x[\dA-Fa-f](?:_?[\dA-Fa-f])*|0o[0-7](?:_?[0-7])*|0b[01](?:_?[01])*|(?:(?:\d(?:_?\d)*)?\.)?\d(?:_?\d)*(?:[Ee][+-]?\d+)?)(?:_?(?:[iu](?:8|16|32|64|size)?|f32|f64))?\b/,
    'boolean': /\b(?:false|true)\b/,
    'punctuation': /->|\.\.=|\.{1,3}|::|[{}[\];(),:]/,
    'operator': /[-+*\/%!^]=?|=[=>]?|&[&=]?|\|[|=]?|<<?=?|>>?=?|[@?]/
};

Prism.languages.rust['closure-params'].inside.rest = Prism.languages.rust;
Prism.languages.rust['attribute'].inside['string'] = Prism.languages.rust['string'];

// TOML language definition
Prism.languages.toml = {
    'comment': {
        pattern: /#.*/,
        greedy: true
    },
    'key': {
        pattern: /(^[ \t]*|[{,][ \t]*)[A-Za-z_][A-Za-z0-9_-]*(?=[ \t]*=)/m,
        lookbehind: true,
        alias: 'property'
    },
    'section': {
        pattern: /(^[ \t]*)\[(?:[^\[\]"]|"(?:[^"\\]|\\.)*")+\]/m,
        lookbehind: true,
        alias: 'class-name'
    },
    'string': {
        pattern: /"""(?:[^"\\]|\\.|"(?!""))*"""|'''(?:[^'\\]|\\.)*'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/,
        greedy: true
    },
    'date': [
        {
            pattern: /\b\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?\b/i,
            alias: 'number'
        },
        {
            pattern: /\b\d{2}:\d{2}:\d{2}(?:\.\d+)?\b/,
            alias: 'number'
        }
    ],
    'number': /(?:\b0(?:x[\da-zA-Z]+(?:_[\da-zA-Z]+)*|o[0-7]+(?:_[0-7]+)*|b[10]+(?:_[10]+)*))\b|[-+]?\b\d+(?:_\d+)*(?:\.\d+(?:_\d+)*)?(?:[eE][+-]?\d+(?:_\d+)*)?\b|[-+]?\b(?:inf|nan)\b/,
    'boolean': /\b(?:false|true)\b/,
    'punctuation': /[{}[\],=.]/
};
