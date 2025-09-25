
export type TokenType =
    "Word" |
    "Keyword" |
    "Type" |
    "Function" |
    "Constant" |
    "String" |
    "Operator" |
    "Entity" |
    "Comment" |
    "Property" |
    "Variable" |
    "Definition" |

    "Debug" |

    "Bracket1" |
    "Bracket2" |
    "Bracket3";

export type TokenBehaviour =
    "Default" |
    "Permanent";

export type TokenMatcherBehaviour =
    "Default" |
    "Fallback";


export type LangContext = {
    bools?: {
        [key: string]: boolean
    },
    numbers?: {
        [key: string]: number
    }
}
export type TokenMatcherFunc = (token: string, data: { tokens: Array<string>, i: number, next: string, previous: string }, context: LangContext) => TokenType | undefined | null | void;
export type TokenMatcher = TokenMatcherFunc | { func: TokenMatcherFunc, behaviour: TokenMatcherBehaviour }
export type StyleLanguage = {
    context?: LangContext,
    match: RegExp,
    tokens: {
        [key: string]: TokenType | {
            type: TokenType,
            behaviour: TokenBehaviour
        }
    },
    matchers?: Array<TokenMatcher>
}
export const MatcherPresets: Record<string, TokenMatcher> = {
    // literals
    string: (token, _data, context) => {
        const flip = (name: string) => context.bools![name] = !context.bools![name];
        const inside = (name: string) => context.bools![name];

        let is: boolean;
        let name: string;

        if (token == "\\n")
            return "Constant";
        
        name = "singleQuote";
        if (is = token == "'") flip(name);
        if (inside(name) || is) return "String";
        name = "doubleQuote";
        if (is = token == '"') flip(name);
        if (inside(name) || is) return "String";
        name = "backQuote";
        if (is = token == "`") flip(name);
        if (inside(name) || is) return "String";
    },
    number: (token) =>
        /^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(token) ? "Constant" : null,
    
    // syntax
    brackets: (token, _data, context) => {
        const add = [ "(", "[", "{" ];
        const sub = [ ")", "]", "}" ];
        const tokens = [ ...add, ...sub ];
        const types = [
            "Bracket1",
            "Bracket2",
            "Bracket3"
        ];
        
        context.numbers!.bracketDepth += 
            add.includes(token) ? 1 :
            sub.includes(token) ? -1 :
            0;
        const depth = context.numbers!.bracketDepth + (sub.includes(token) ? 0 : -1);
        if (tokens.includes(token))
            return types[depth % types.length] as TokenType;
    },

    execution: (_token, { next }) => 
        next == "(" ?
            "Function" :
            null,
    
    property: (token, { previous }) => {
        if (/^\w+$/.test(token) && previous == ".")
            return "Property";
    },

    comment: (token, _data, context) => {
        if (token == "//")
            context.bools!.lineComment = true;
        if (token == "\n")
            context.bools!.lineComment = false;

        if (context.bools!.lineComment)
            return "Comment";

        if (token == "/*")
            context.bools!.multiLineComment = true;
        if (token == "*/")
            context.bools!.multiLineComment = false;
        
        if (context.bools!.multiLineComment || token == "*/")
            return "Comment";
    },

    variable: { func: (token) => {
        return /^\s*\w+\s*$/.test(token) ? "Variable" : null
    }, behaviour: "Fallback"}
}

export const TokenBatch = (tokens: Array<string>, type: TokenType, behaviour?: TokenBehaviour) => 
    Object.fromEntries(tokens.map(v => ["t-"+v, behaviour != null ? {type, behaviour} : type]));

export const StyleLanguages: { [key: string]: StyleLanguage } = {
    none: {
        match: /.+/,
        tokens: {}
    },
    fcl: {
        context: {
            bools: {
                singleQuote: false,
                doubleQuote: false,
                backQuote: false,

                lineComment: false,
                multiLineComment: false,
            },
            numbers: {
                bracketDepth: 0
            }
        },
        
        match: /((\w+<\w+:\s*\d+>)|(\w+<\w+>)|(\w+))|\\[n]|\w+|[\t\f ]+|[~?:+\-*\/=.|&]+|[,;(){}\[\]<>\n'`"\\]|./g,

        tokens: {
            ...TokenBatch([ // types
                "str",
                "num",
                "bool",
                
                "Obj",
                "Arr",

                "void",
                "any",
                "Type"
            ], "Type"),

            ...TokenBatch([ // statements
                "return"
            ], "Keyword"),

            ...TokenBatch([ // keywords
                "struct",
                "import",

                "if","else","while","until","for"
            ], "Keyword"),

            ...TokenBatch([ // constants
                "true","false",
                "null"
            ], "Constant"),

            ...TokenBatch([ // entities
                "self"
            ], "Entity"),

            ...TokenBatch([ // operators
                "=",

                "+","++","-","*","/","^","%",
                "~+","~++","?",

                "||","|||", "&&","&&&",

                ":",

                "new"
            ], "Operator"),

            ...TokenBatch([
                "print"
            ], "Debug", "Permanent")
        },

        matchers: [
            MatcherPresets.comment,

            MatcherPresets.string,
            MatcherPresets.number,

            MatcherPresets.brackets,
            MatcherPresets.execution,
            MatcherPresets.property,

            /* type def, -> Type <- Name */ (token, { next, tokens, i }) => {
                if (/^(\w+)|(\w+<\w+>)|(\w+<\w+:\s*\d+>)$/.test(token) && next == " " && /^\w+$/.test(tokens[i+2] ?? ""))
                    return "Type";
            },

            /* struct def, struct -> Name <- */ (token, { previous, tokens, i }) => {
                if (/^\w+$/.test(token) && previous == " " && (tokens[i-2] ?? "") == "struct")
                    return "Entity";
            },

            MatcherPresets.variable
        ]
    }
}

export function Generate(parent: HTMLElement, text: string, lang: StyleLanguage) {
    const lines = text.split("\n");

    if (!parent.classList.contains("code"))
        parent.classList.add("code");

    parent.innerHTML = "";

    const context: LangContext = lang.context ?? {};

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] + "\n";
        const lineDiv = document.createElement("span");
        lineDiv.className = "code-line";

        const text = line.match(/^( *)(.*)/)! as [string, string, string];

        let indents = text[1];
        if (indents) {
            indents = indents.replace(/    /gm, "%%%%IDNT4");
            indents = indents.replace(/  /gm, "%%%%IDNT2");
            const indentArr = indents.match(/%%%%IDNT[24]/gm) ?? [];
            for (let i = 0; i < indentArr.length; i++) {
                const txt = indentArr[i];

                let size = Number(txt.match(/%%%%IDNT([24])/)![1]);
                
                const span = document.createElement("span");
                span.className = `code-token code-indent`;
                span.textContent = " ".repeat(size);
                lineDiv.appendChild(span);
            }
            //span.textContent = span.textContent.replaceAll("IDNT4", "▏   ");
            //span.textContent = span.textContent.replaceAll("IDNT2", "▏ ");
        }

        const tokens = text[2].match(lang.match) ?? [];

        const addSpan = (type: TokenType, text: string) => {
            const span = document.createElement("span");
            span.className = `code-token code-token-${type}`;
            span.textContent = text;
            lineDiv.appendChild(span);
        }

        let matchers: Array<TokenMatcher> = lang.matchers ?? [];

        let currentType: TokenType | null = null;
        let currentText = "";
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            let type = lang.tokens["t-"+token] ?? "Word";
            let behaviour = "Default"

            if (type instanceof Object) {
                behaviour = type.behaviour;
                type = type.type;
            }

            if (behaviour == "Default") {
                for (let matchi = 0; matchi < matchers.length; matchi++) {
                    const matcher = matchers[matchi];
                    const func: Function = matcher instanceof Function ? matcher : matcher.func;
                    if (!(matcher instanceof Function)) {
                        if (type != "Word" && matcher.behaviour == "Fallback") {
                            continue;
                        }
                    }
                    const out: TokenType | null | undefined = func(token, {
                        tokens, i, next: tokens[i+1] ?? "", previous: tokens[i-1] ?? ""
                    }, context);
                    type = out ?? type;
                    if (out)
                        break;
                }
            }

            currentType ??= type;

            if (currentType != type && token != " ") {
                addSpan(currentType, currentText);
                currentType = type;
                currentText = "";
            }

            currentText += token;
        }
        addSpan(currentType ?? "Word", currentText);

        parent.appendChild(lineDiv);
    }
}