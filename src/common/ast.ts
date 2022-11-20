/* eslint-disable @typescript-eslint/naming-convention */
import * as parser from "@babel/parser";
import traverse, { Node, NodePath } from "@babel/traverse";
import * as babel from "@babel/types";

export interface CreatioAstNode {
    tag: string;
    name: string;
    children?: CreatioAstNode[];
    tooltip?: string;
    location?: babel.SourceLocation | null;
}

export class CreatioAstStructure {
    source: string;
    moduleName: babel.StringLiteral = babel.stringLiteral("");
    dependencies: babel.StringLiteral[] = [];

    diff: babel.ObjectExpression[] = [];

    methods: babel.ObjectProperty[] = [];
    messages: babel.ObjectProperty[] = [];
    attributes: babel.ObjectProperty[] = [];
    mixins: babel.ObjectProperty[] = [];
    businessRules: babel.ObjectProperty[] = [];
    details: babel.ObjectProperty[] = [];

    static getNodeName(source: string, node: Node): string | undefined {
        if (node.start && node.end) {
            return source.substring(node.start, node.end);
        }
    }

    constructor(source: string) {
        this.source = source;
        let parseResult = parser.parse(source);
        this.parseRequireJsDefine(parseResult);
        this.parseBody(parseResult);
    }

    protected parseArrayExpression(path: NodePath<babel.ObjectProperty>) {
        var properties: babel.ObjectExpression[] = [];
        if (path.node.value.type === "ArrayExpression") {
            path.node.value.elements.forEach(element => {
                if (element && element.type === "ObjectExpression") {
                    properties.push(element);
                }
            });
        }
        return properties;
    }

    protected parseObjectExpression(path: NodePath<babel.ObjectProperty>) {
        var properties: babel.ObjectProperty[] = [];
        if (path.node.value.type === "ObjectExpression") {
            path.node.value.properties.forEach(property => {
                if (property.type === "ObjectProperty") {
                    properties.push(property);
                }
            });
        }
        return properties;
    }

    // const basicStructureItems = ["mixins", "attributes", "messages", "details", "rules", "businessRules", "methods", "modules", "diff"];
    protected parseBody(parseResult: babel.File) {
        var $this = this;
        traverse(parseResult, {
            ObjectProperty(path) {
                if (path.node.key.type === "Identifier") {
                    switch (path.node.key.name) {
                        case "details":
                            $this.details = $this.parseObjectExpression(path);
                            break;
                        case "diff":
                            $this.diff = $this.parseArrayExpression(path);
                            break;
                        case "methods":
                            $this.methods = $this.parseObjectExpression(path);
                            break;
                        case "attributes":
                            $this.attributes = $this.parseObjectExpression(path);
                            break;
                        case "messages":
                            $this.messages = $this.parseObjectExpression(path);
                            break;
                        case "mixins":
                            $this.mixins = $this.parseObjectExpression(path);
                            break;
                        case "businessRules":
                            $this.businessRules = $this.parseObjectExpression(path);
                            break;
                        default:
                            break;
                    }
                }
            }
        });
    }

    protected parseRequireJsDefine(parseResult: babel.File) {
        var $this = this;
        traverse(parseResult, {
            CallExpression(path) {
                if (path.node.callee.type === "Identifier" && path.node.callee.name === "define") {
                    if (path.node.arguments[0].type === "StringLiteral") {
                        $this.moduleName = path.node.arguments[0];
                    }

                    if (path.node.arguments[1].type === "ArrayExpression") {
                        path.node.arguments[1].elements.forEach(element => {
                            if (element && element.type === "StringLiteral") {
                                $this.dependencies.push(element);
                            }
                        });
                    }
                }
            }
        });
    }

    public getAsNodes(): CreatioAstNode[] {
        function pushIfNotEmpty(name: string, getFunc: () => CreatioAstNode[]) {
            let children = getFunc();
            if (children.length > 0) {
                nodes.push({ tag: "root", name: name, children: children });
            }
        }

        var nodes: CreatioAstNode[] = [];
        pushIfNotEmpty("messages", this.getMessageNodes.bind(this));
        pushIfNotEmpty("attributes", this.getAttributeNodes.bind(this));
        pushIfNotEmpty("dependencies", this.getDependencyNodes.bind(this));
        pushIfNotEmpty("mixins", this.getMixinNodes.bind(this));
        pushIfNotEmpty("details", this.getDetailNodes.bind(this));
        pushIfNotEmpty("methods", this.getMethodNodes.bind(this));
        pushIfNotEmpty("diff", this.getDiffNodes.bind(this));
        
        return nodes;
    }
    
    public getAttributeNodes(): CreatioAstNode[] {
        return this.attributes.map(item => {
            let name = item.key.type === "StringLiteral" ? item.key.value : "";
            return {
                tag: "attributeItem",
                name: name ? name : "unknown",
                location: item.loc
            };
        });
    }

    public getMessageNodes(): CreatioAstNode[] {
        return this.messages.map(item => {
            let name = item.key.type === "StringLiteral" ? item.key.value : "";
            return {
                tag: "messageItem",
                name: name ? name : "unknown",
                location: item.loc
            };
        });
    }

    public getMethodNodes(): CreatioAstNode[] {
        return this.methods.map(item => {
            let name = item.key.type === "Identifier" ? item.key.name : "";
            return {
                tag: "methodItem",
                name: name ? name : "unknown",
                location: item.loc
            };
        });
    }

    public getDetailNodes(): CreatioAstNode[] {
        return this.details.map(item => {
            let name = item.key.type === "StringLiteral" ? item.key.value : "";
            return {
                tag: "detailItem",
                name: name ? name : "unknown",
                location: item.loc
            };
        });
    }

    public getMixinNodes(): CreatioAstNode[] {
        return this.mixins.map(item => {
            let name = item.value.type === "StringLiteral" ? item.value.value : "";
            return {
                tag: "mixinItem",
                name: name ? name : "unknown",
                location: item.loc
            };
        });
    }

    getDependencyNodes(): CreatioAstNode[] {
        return this.dependencies.map(item => {
            return { tag: "dependency", name: item.value, location: item.loc };
        });
    }

    getDiffNodes(): CreatioAstNode[] {
        let mapped = this.diff.map(item => {
            let opName = this.findKeyInObjectExpression(item, "operation");
            let name = this.findKeyInObjectExpression(item, "name");
            let node: CreatioAstNode = {
                tag: "diffItem",
                name: opName?.value ? opName.value : "unknown",
                location: item.loc,
                children: [{ tag: "diffItem", name: name?.value ? name.value : "undefined", location: item.loc }]
            };
            return node;
        });

        mapped = mapped.reduce((accumulator, currentValue) => {
            let parent = accumulator.find(item => item.name === currentValue.name);
            if (parent) {
                if (!parent.children) { parent.children = []; }
                if (currentValue.children) {
                    parent.children.push(...currentValue.children);
                }
            } else {
                accumulator.push(currentValue);
            }
            return accumulator;
        }, [] as CreatioAstNode[]);
        return mapped;
    }

    findKeyInObjectExpression(objectExpression: babel.ObjectExpression, key: string): babel.StringLiteral | undefined {
        var result: babel.StringLiteral | undefined = undefined;
        objectExpression.properties.forEach(property => {
            if (property.type === "ObjectProperty" && property.key.type === "StringLiteral") {
                if (property.key.value === key && property.value.type === "StringLiteral") {
                    result = property.value;
                }
            }
        });
        return result;
    }
}