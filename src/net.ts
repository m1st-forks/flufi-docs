import { GeneratePages, GenerateHeader } from './navbar';

export type PageDirContent = PageDirItem[];

export type PageDirItem = { name: string } & ({
    type: "file"
} | {
    type: "dir",
    content: PageDirContent,
    noHeader?: boolean
} | {
    type: "file-dir",
    content: PageDirContent
} | {
    type: "category"
});

export type ServerDir = ServerItem[];
export type ServerItem = string | [string, ServerDir] | { name: string, children: ServerDir };

export let server = "http://localhost:4000/";

export let pages: PageDirContent;

export let header_config: {
    "site_name"?: string,
    "home_page"?: string
} | undefined;
export let header_text: string | undefined;

export function LoadPages() {
    server = server.replace(/^(https?):\/\/((localhost:4000)|(\w+\.\w+\.?\w*))\/?$/gm, "$1://$2");

    function LoadDirItem(item: ServerItem): PageDirItem {
        if (Array.isArray(item))
            return {
                type: "dir",
                content: LoadDir(item[1]),
                name: item[0]
            }
        else if (typeof item === "string") {
            if (item.startsWith("#")) {
                return {
                    type: "category",
                    name: item.slice(1)
                }
            }
            return {
                type: "file",
                name: item
            }
        } else if (typeof item === "object") {
            return {
                type: "file-dir",
                name: item.name,
                content: LoadDir(item.children)
            }
            console.log(item);
        } else
            throw `item ${JSON.stringify(item)} is not a valid server item`;
    }
 
    function LoadDir(content: ServerDir): PageDirContent {
        if (!Array.isArray(content)) throw `content is not an array.`;

        const elems = [];
        for (let i = 0; i < content.length; i++) {
            elems.push(LoadDirItem(content[i]));
        }

        return elems;
    }

    fetch(`${server}/list`)
        .then(r => r.json())
        .then(r => {
            pages = LoadDir(r);
            GeneratePages();
        });
}

export function LoadPage(path: string, callback: (content: string) => void) {
    fetch(`${server}/page${path}`)
        .then(r => r.text())
        .then(r => {
            callback(r);
        });
}

export function LoadNavbarHeader() {
    server = server.replace(/^(https?):\/\/((localhost:4000)|(\w+\.\w+\.?\w*))\/?$/gm, "$1://$2");

    fetch(`${server}/navbar-config`)
        .then(r => r.json())
        .then(r => {
            header_config = r;
            GenerateHeader();
        });
    fetch(`${server}/navbar-text`)
        .then(r => r.text())
        .then(r => {
            header_text = r;
            GenerateHeader();
        });
}

LoadNavbarHeader();