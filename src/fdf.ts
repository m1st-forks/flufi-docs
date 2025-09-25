import * as highlighter from "./highlighter";

function split(text: string, type: "bracket" | "curly" | "square" | "arrow", useendbracket?: boolean, arrow?: boolean): Array<string> {
    text = text ?? "";
    const tokens = [];
    let current = "";

    let bracketDepth = 0,
        curlyDepth = 0,
        squareDepth = 0,
        arrowDepth = 0;
    
    const brackets = {"bracket":["(",")"],"curly":["{","}"],"square":["[","]"],"arrow":["<",">"]}[type] ?? ["",""]; // get the bracket pairs
    const open = brackets[0],
        close = brackets[1];
    const splitChars = (typeof type == "string") ? (type.length === 1 ? type : "") : type;

    const operators = [
        "+","-","*","/","^","%",
        "."
    ]
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (char == "\\") { current += char + text[i + 1]; i ++; continue; }

        if (char === "(")
            bracketDepth ++;
        if (char === ")")
            bracketDepth --;
        if (char === "{")
            curlyDepth ++;
        if (char === "}")
            curlyDepth --;
        if (char === "[")
            squareDepth ++;
        if (char === "]")
            squareDepth --;
        if (char === "<" && (type == "arrow" || arrow))
            arrowDepth ++;
        if (char === ">" && (type == "arrow" || arrow))
            arrowDepth --;

        bracketDepth = Math.max(bracketDepth, 0);
        curlyDepth = Math.max(curlyDepth, 0);
        squareDepth = Math.max(squareDepth, 0);
        arrowDepth = Math.max(arrowDepth, 0);
        
        if (char === open && 
            bracketDepth == (type == "bracket" ? 1 : 0) &&
            curlyDepth == (type == "curly" ? 1 : 0) &&
            squareDepth == (type == "square" ? 1 : 0) &&
            arrowDepth == (type == "arrow" ? 1 : 0)
        ) {
            tokens.push(current);
            if (text[i+1] == close && !tokens[tokens.length - 1])
                tokens.push("");
            else
                current = ")";
            current = open;
            continue;
        }
        if (char === close && bracketDepth == 0 && curlyDepth == 0 && squareDepth == 0 && arrowDepth == 0) {
            current += close;
                tokens.push(current);
            current = "";
            continue;
        }

        if (useendbracket && char === "}" && !operators.includes(text[i + 1]) && bracketDepth == 0 && curlyDepth == 0 && squareDepth == 0 && arrowDepth == 0) {
            current += char;
            tokens.push(current);
            current = "";
            continue;
        }

        if (splitChars.includes(char) && bracketDepth == 0 && curlyDepth == 0 && squareDepth == 0 && arrowDepth == 0) {
            if (current)
                tokens.push(current);
            tokens.push(char);
            current = "";
            continue;
        }

        current += char;
    }

    if (current)
        tokens.push(current);

    return tokens;
}
function splitChar(text: string, char: string | string[], useendbracket?: boolean) {
    // @ts-expect-error
    return split(text, char, useendbracket).filter(c => Array.isArray(char) ? true : c !== char);
}
function is(text: string, type: "bracket" | "curly" | "square" | "arrow" | "single-q" | "double-q" | "back-q") {
    text = text ?? "";
    const first = text[0],
        last = text[text.length - 1];
    
    const pairs = {
        "bracket": ["(",")"],
        "curly":["{","}"],
        "square":["[","]"],
        "arrow":["<",">"],
        "single-q":["'","'"],
        "double-q":['"','"'],
        "back-q":["`","`"]
    }

    const pair = pairs[type];
    return pair ? (first === pair[0] && last === pair[1]) : false;
}

function Fix(code: string) {
    code = code.trimEnd().split("\n").join("\n");
    const indent = code.split("\n").reduce((acc, line) => line.trim() == "" ? acc : Math.min(acc, (/^\s+/.exec(line) ?? [""])[0].length), 999);
    code = code.split("\n").map(l => l.slice(indent)).join("\n");
    return code;
}

export type FDFNode = {
    kind: "text" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6",
    content: string
} | {
    kind: "code",
    content: string,
    lang?: string
} | {
    kind: "block",
    content: FDFNode[],
    type: string
};

export function GenerateFDFNode(code: string): FDFNode {
    if (code.trim().startsWith("#")) {
        return {
            kind: `h${code.trim().match(/^(#+)/)![0].length as 1|2|3|4|5|6}`,
            content: code.trim().match(/^#+\s+(.+)/)![1]
        }
    }
    const curlyTokens = split(code.trim(), "curly");
    if (curlyTokens.length == 2 && /^[\w ]+$/.test(curlyTokens[0]) && is(curlyTokens[1], "curly")) {
        const name = curlyTokens[0].match(/^code ?(\w+)?/);
        if (name) {
            return {
                kind: "code",
                content: curlyTokens[1].slice(1,-1),
                lang: name[1]
            }
        }
        if (["split", "block", "preview"].includes(curlyTokens[0].trim())) {
            return {
                kind: "block",
                content: GenerateFDFNodes(curlyTokens[1].slice(1,-1)),
                type: curlyTokens[0].trim()
            };
        }
    }
    return {
        kind: "text",
        content: code
    }
}

export function GenerateFDFNodes(code: string): FDFNode[] {
    const lines = splitChar(code.trim(), "\n", true);
    return lines.map(l => {
        return GenerateFDFNode(l);
    });
}

export function GenerateFDF(code: string | FDFNode[], parent: HTMLElement) {
    parent.innerHTML = "";

    if (typeof code == "string")
        code = GenerateFDFNodes(code);
    
    function GenerateNode(node: FDFNode): HTMLElement {
        switch (node.kind) {
            case "h1": case "h2": case "h3": case "h4": case "h5": case "h6": {
                const elem = document.createElement(node.kind);
                elem.className = "fdf-text";
                elem.textContent = node.content;
                return elem;
            }
            case "text": {
                const elem = document.createElement("p");
                elem.className = "fdf-text";
                elem.textContent = node.content.trim();
                return elem;
            }
            case "code": {
                const elem = document.createElement("div");
                elem.className = "fdf-code";
                const content = Fix(node.content);
                let lang = highlighter.StyleLanguages[(node.lang ?? "none").toLowerCase()];
                lang ??= highlighter.StyleLanguages.none;
                if (content)
                    highlighter.Generate(elem, content.trim(), lang);
                return elem;
            }
            case "block": {
                const elem = document.createElement("div");
                elem.className = `fdf-block ${node.type}`;
                GenerateNodes(node.content, elem);
                return elem;
            }
            default:
                // @ts-ignore
                throw `cannot generate node of type ${node.kind}`;
        }
    }
    function GenerateNodes(nodes: FDFNode[], parent: HTMLElement) {
        for (let i = 0; i < nodes.length; i++) {
            parent.appendChild(GenerateNode(nodes[i]));
        }
    }

    GenerateNodes(code, parent);
}

export function clear() {
    document.getElementById("content")!.textContent = "";
}

export function generate(text: string) {
    const start = performance.now();
    GenerateFDF(text, document.getElementById("content")!);
    console.log(`generating fdf for ${window.location.pathname} took ${performance.now() - start}ms`);
}

clear();