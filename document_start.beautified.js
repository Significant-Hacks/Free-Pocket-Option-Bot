(() => {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("web_accessible_resources.js");
    script.onload = function() {
        this.parentNode.removeChild(this);
    };
    (document.head || document.documentElement).appendChild(script);
})();
