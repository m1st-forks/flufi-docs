const http = require("http");
const fs = require("fs");
const url = require("url");
const path = require("path");

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);

    const urlPath = parsedUrl.pathname.slice(1).split("/");
    if (urlPath[0] == "page") {
        const filePath = `./${urlPath.slice(1).join("/")}.fdf`;
        if (fs.existsSync(filePath)) {
            res.writeHead(200, { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" });
            res.end(fs.readFileSync(filePath));
            return;
        }
    }
    if (urlPath[0] == "list") {
        const list = (p) => {
            if (!fs.existsSync(path.join(p,".doclist")))
                return [];

            const elems = [];

            const fsElems = JSON.parse(fs.readFileSync(path.join(p,".doclist")));
            for (let i = 0; i < fsElems.length; i++) {
                const element = fsElems[i];
                const elemPath = path.join(p, element);

                if (element.endsWith("/"))
                    elems.push([element.slice(0,-1), list(elemPath)]);
                else if (element.endsWith("/?"))
                    elems.push({
                        "name": element.slice(0, -2),
                        "children": list(path.join(p, element.slice(0,-1)))
                    });
                else if (element.startsWith("#"))
                    elems.push(element);
                else
                    elems.push(element.match(/^\w+/)[0]);
            }
            return elems;
        }
        res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify(list("./")));
        return;
    }
    if (urlPath[0] == "navbar-text"){ 
        if (fs.existsSync("./.navbar/text.fdf")) {
            res.writeHead(200, { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" });
            res.end(fs.readFileSync("./.navbar/text.fdf"))
            return;
        }
    }
    if (urlPath[0] == "navbar-config"){ 
        if (fs.existsSync("./.navbar/config.json")) {
            res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
            res.end(fs.readFileSync("./.navbar/config.json"));
            return;
        }
    }

    res.writeHead(404, { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" });
    res.end("404 Not Found\n");
});

server.listen(4000, () => {
    console.log(`docs server running, serving ${path.resolve("./")} :3`);
});
