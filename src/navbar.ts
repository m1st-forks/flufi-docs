import { header_config, LoadPage, LoadPages, pages, type PageDirContent, header_text } from './net';
import * as fdf from "./fdf";

const navbarElem = document.getElementById("navbar");
if (!navbarElem) throw "no navbar";

let currentPageButton: HTMLButtonElement | HTMLDivElement | undefined = undefined;
let currentPage: string;

let headerElem: HTMLElement | undefined;

export function GeneratePages() {
    if (!navbarElem) throw "no navbar";

    if (!pages) {
        navbarElem.innerHTML = "...";
        return;
    }

    navbarElem.innerHTML = "";

    headerElem = document.createElement("div");
    headerElem.className = "navbar-header";
    navbarElem.appendChild(headerElem);
    GenerateHeader();

    GenerateDir("", navbarElem, [{
        type: "dir",
        content: pages,
        name: "",
        noHeader: true
    }]);

    let path = window.location.pathname;
    if (path === "/") path = `${header_config?.home_page ?? "/home"}`;
    SelectPage(path);
}

const pageMap = new Map<string, HTMLButtonElement | HTMLDivElement>();

export function SelectPage(name: string) {
    if (currentPageButton)
        currentPageButton.classList.remove("active");
    currentPage = name;
    if (pageMap.has(currentPage))
        pageMap.get(currentPage)!.classList.add("active");
    currentPageButton = pageMap.get(currentPage)!;
    fdf.clear();
    LoadPage(currentPage, (content) => {
        fdf.generate(content);
    });
    history.pushState({}, '', currentPage);
}

export function GeneratePage(path: string, name: string): HTMLElement {
    const host = document.createElement("div");
    host.className = "navbar-button-host";
    /* indent */ {
        const elem = document.createElement("div");
        elem.className = "navbar-button-indent";
        host.appendChild(elem);
    }
    /* button */ {
        const elem = document.createElement("button");
        elem.className = "navbar-button";
        elem.textContent = name;

        elem.addEventListener("click", () => {
            SelectPage(path + "/" + name);
        });

        pageMap.set(path + "/" + name, elem);
        host.appendChild(elem);
    }
    
    return host;
}

export function GenerateHeader() {
    if (!headerElem) return;

    const siteNameElem = document.createElement("h3");
    siteNameElem.textContent = header_config?.site_name ?? window.location.origin;
    headerElem.appendChild(siteNameElem);

    const contentElem = document.createElement("div");
    headerElem.appendChild(contentElem);
    fdf.GenerateFDF(header_text ?? "", contentElem);
}

export function GenerateDir(path: string, parent: HTMLElement, content: PageDirContent) {
    if (content.length == 0) {
        const emptyElem = document.createElement("p");
        emptyElem.textContent = "(empty)";
        parent.appendChild(emptyElem);
    }
    for (let i = 0; i < content.length; i++) {
        const element = content[i];
        
        switch (element.type) {
            case "file": {
                const elem = GeneratePage(path, element.name);
                parent.appendChild(elem);
                break;
            }
            case "dir": {
                const hostElem = document.createElement("div");
                hostElem.className = "navbar-dir open" + (element.noHeader ? " noHeader" : "");
                
                /* header */ if (!element.noHeader) {
                    const headerElem = document.createElement("div");
                    headerElem.className = "navbar-dir-header";
                    /* name */ {
                        const nameElem = document.createElement("span");
                        nameElem.className = "navbar-dir-name";
                        nameElem.textContent = element.name;
                        headerElem.appendChild(nameElem);
                    }
                    /* icon */ {
                        const holder = document.createElement("div");
                        
                        // https://lucide.dev/icons/chevron-down
                        holder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down-icon lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>`;

                        headerElem.appendChild(holder);
                    }
                    headerElem.addEventListener("click", () => {
                        hostElem.classList.toggle("open");
                    })
                    hostElem.appendChild(headerElem);
                }

                /* content host */ {
                    const contentHost = document.createElement("div");
                    contentHost.className = "navbar-dir-contentHost";
                    /* indent */ {
                        const indentElem = document.createElement("div");
                        indentElem.className = "navbar-dir-indent";
                        contentHost.appendChild(indentElem);
                    }
                    /* content */ {
                        const content = document.createElement("div");
                        GenerateDir(element.noHeader ? "" : `${path}/${element.name}`, content, element.content);
                        contentHost.appendChild(content);
                    }
                    hostElem.appendChild(contentHost);
                }
                parent.appendChild(hostElem);
                break;
            }
            case "file-dir": {
                const hostElem = document.createElement("div");
                hostElem.className = "navbar-dir open";
                
                /* header */ {
                    const headerElem = document.createElement("div");
                    headerElem.className = "navbar-dir-header";
                    /* indent */ {
                        const indentElem = document.createElement("div");
                        indentElem.className = "navbar-dir-header-indent";
                        headerElem.appendChild(indentElem);
                    }
                    /* name */ {
                        const nameElem = document.createElement("span");
                        nameElem.className = "navbar-dir-name";
                        nameElem.textContent = element.name;
                        headerElem.appendChild(nameElem);
                    }
                    /* icon */ {
                        const holder = document.createElement("div");
                        
                        // https://lucide.dev/icons/chevron-down
                        holder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down-icon lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>`;

                        holder.addEventListener("click", (e) => {
                            e.stopPropagation();
                            hostElem.classList.toggle("open");
                        });

                        headerElem.appendChild(holder);
                    }
                    headerElem.addEventListener("click", () => {
                        if (currentPage == path + "/" + element.name) {
                            hostElem.classList.toggle("open");
                        } else {
                            hostElem.classList.add("open");
                            SelectPage(path + "/" + element.name);
                        }
                    })
                    hostElem.appendChild(headerElem);
                }

                /* content host */ {
                    const contentHost = document.createElement("div");
                    contentHost.className = "navbar-dir-contentHost";
                    /* indent */ {
                        const indentElem = document.createElement("div");
                        indentElem.className = "navbar-dir-indent";
                        contentHost.appendChild(indentElem);
                    }
                    /* content */ {
                        const content = document.createElement("div");
                        GenerateDir(`${path}/${element.name}`, content, element.content);
                        contentHost.appendChild(content);
                    }
                    hostElem.appendChild(contentHost);
                }
                pageMap.set(`${path}/${element.name}`, hostElem);
                parent.appendChild(hostElem);
                break;
            }
            case "category": {
                /*
                    text
                    <l:name> text
                     ^  ^- lucide icon name
                     `- lucide icon
                */
                const data = element.name.match(/^(<(\w):([\w-]+)>)?(.+)$/);
                if (!data) return;
                const hostElem = document.createElement("div");
                hostElem.className = "navbar-category";
                /* title + icon */ if (data[1] != null) {
                    switch (data[2]) {
                        case "l": {
                            fetch(`https://raw.githubusercontent.com/lucide-icons/lucide/refs/heads/main/icons/${data[3]}.svg`)
                                .then(r => r.text())
                                .then(r => {
                                    hostElem.innerHTML = r.replace(/width="\d+"\s+height="\d+"/, `width="24" height="24"`);
                                    const title = document.createElement("h3");
                                    title.innerText = data[4];
                                    hostElem.appendChild(title);
                                });
                        }
                    }
                }
                /* title */ if (data[1] == null) {
                    const title = document.createElement("h3");
                    title.innerText = data[4];
                    hostElem.appendChild(title);
                }
                parent.appendChild(hostElem);
                break;
            }
        }
    }
}

LoadPages();
GeneratePages();