import { INameValuePair, IPlugin } from "./plugins";
import { MiniQuery, $ } from "./mquery";

// TODO: this can break if object key/property contains slash
const pathSeparator = "/";

export class JsonViewer {

    public wrapper: MiniQuery;

    public childrenWrapper: MiniQuery;

    public nodeName: string;

    public header: MiniQuery;

    public isExpandable: boolean;

    constructor(public data: any, public path: string, public plugins: IPlugin[]) {
        this.nodeName = path.split(pathSeparator).pop() as string;

        switch (typeof(data)) {
            case "bigint":
            case "boolean":
            case "number":
            case "string":
                this.isExpandable = false;
                break;
            case "object":
                this.isExpandable = true;
                break;
            default:
                throw "Type not supported";
        }
        
        this.plugins.forEach(p => p.nodeInit?.call(null, this));
    }

    render(container: HTMLElement | string) {
        if (typeof(container) == "string") {
            container = document.getElementById(container) as HTMLElement;
        }

        const wrapper = $("div").addClass("prop-wrapper");

        const dataToRender: INameValuePair = {
            name: this.nodeName,
            value: this.data,
        }

        this.plugins.forEach(p => p.beforeRender?.call(null, this, dataToRender));

        this.header = $("div")
            .addClass("prop-header")
            .appendTo(wrapper)
            .append($("span").text(dataToRender.name).addClass("prop-name"));

        if (this.isExpandable) {
            this.childrenWrapper = $("div").addClass("prop-children");
            this.header
                .append($("span").addClass("prop-expand")).on("click", () => this.toggleExpand());
            wrapper
                .append(this.childrenWrapper);
        }
        else {
            this.header
                .append($("span").text(":").addClass("prop-separator"))
                .append($("span").addClass("prop-value", "prop-type-" + typeof(dataToRender.value)).text(dataToRender.value.toString()));
        }

        this.wrapper = wrapper;

        // update DOM only once at the end
        container.appendChild(this.wrapper.elem);

        this.plugins.forEach(p => p.afterRender?.call(null, this))
    }

    toggleExpand(expand?: boolean) {
        if (!this.isExpandable) {
            return;
        }

        const expandedClassName = "prop-expanded";

        const currentlyExpanded = this.wrapper.hasClass(expandedClassName);
        expand = expand === undefined ? !currentlyExpanded : expand;

        if (expand == currentlyExpanded) {
            return;
        }

        if (expand) {
            this.wrapper.addClass(expandedClassName);

            let propsToRender = Object.keys(this.data);

            this.plugins
                .filter(p => p.beforeRenderProperties)
                .forEach(p => propsToRender = p.beforeRenderProperties!(this, propsToRender));

            this.renderProperties(this.childrenWrapper, propsToRender);

            this.plugins.forEach(p => p.afterRenderProperties?.call(null, this, propsToRender));
        }
        else {
            this.wrapper.removeClass(expandedClassName);
            this.childrenWrapper.empty();
        }

        this.plugins.forEach(p => p.afterToggleExpand?.call(null, this, !!expand));
    }

    renderProperties(conatiner: MiniQuery, propsToRender: string[]) {
        propsToRender.forEach(propName => 
            new JsonViewer(this.data[propName], this.path + pathSeparator + propName, this.plugins).render(conatiner.elem));
    }
}