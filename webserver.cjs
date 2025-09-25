const http = require("http");
const fs = require("fs");
const url = require("url");
const path = require("path");

const mimeTypes = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".wasm": "application/wasm",
};

const server = http.createServer((req, res) => {
    console.log(req.url);
    if (!/^(\/[.\-\w]+)+\.\w+/.test(req.url)) {
        console.log("ret");
        res.writeHead(200, { "Content-Type": "text/html", "Access-Control-Allow-Origin": "*" });
        res.end(fs.readFileSync(`./dist/index.html`, "utf-8"));
    } else {
        const filePath = path.join(__dirname, "dist", req.url);
        let ext = path.extname(filePath).toLowerCase();
        
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404, { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" });
                res.end("404 Not Found");
            } else {
                res.writeHead(200, { "Content-Type": mimeTypes[ext], "Access-Control-Allow-Origin": "*" });
                res.end(data);
            }
        });
    }
});

server.listen(8000, () => {
    console.log("web server running :3");
});
