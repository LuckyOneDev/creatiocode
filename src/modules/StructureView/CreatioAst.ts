/* eslint-disable @typescript-eslint/naming-convention */
import * as parser from "@babel/parser";
import traverse, { Node, NodePath } from "@babel/traverse";
import * as babel from "@babel/types";
import * as vscode from "vscode";

export interface ShemaStructureNode {
    tag: string;
    name: string;
    children?: ShemaStructureNode[];
    tooltip?: string;
    location?: babel.SourceLocation | null;
}

export class SchemaEntry {
    constructor(moduleUri: vscode.Uri, name: string, location?: babel.SourceLocation | null) {
        this.moduleUri = moduleUri;
        this.name = name;
        this.location = location;
    }

    moduleUri: vscode.Uri;
    name: string;
    location?: babel.SourceLocation | null;
}

export class DetailsEntry extends SchemaEntry {
    constructor(moduleUri: vscode.Uri, detailName: string, location?: babel.SourceLocation | null, schemaName?: string) {
        super(moduleUri, detailName, location);
        this.schemaName = schemaName;
    }
    schemaName?: string;
}

export class MethodsEntry extends SchemaEntry {
    constructor(moduleUri: vscode.Uri, methodName: string, location?: babel.SourceLocation | null, comments?: string[]) {
        super(moduleUri, methodName, location);
        this.comments = comments;
    }
    comments?: string[];
}

export class MixinsEntry extends SchemaEntry {
    constructor(moduleUri: vscode.Uri, mixinName: string, className: string, location?: babel.SourceLocation | null) {
        super(moduleUri, mixinName, location);
        this.className = className;
    }
    className: string;
}

export class ShemaAstStructure {
    constructor(source: string) {
        let parseResult = parser.parse(source);
        this.parseRequireJsDefine(parseResult);
        this.parseBody(parseResult);
    }

    moduleUri!: vscode.Uri;
    dependencies: babel.StringLiteral[] = [];

    diff: babel.ObjectExpression[] = [];
    methods: MethodsEntry[] = [];
    messages: babel.ObjectProperty[] = [];
    attributes: babel.ObjectProperty[] = [];
    mixins: MixinsEntry[] = [];
    businessRules: babel.ObjectProperty[] = [];
    details: DetailsEntry[] = [];

    static getNodeName(source: string, node: Node): string | undefined {
        if (node.start && node.end) {
            return source.substring(node.start, node.end);
        }
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

    protected getValueOfExpression(key: babel.Expression | babel.PrivateName) {
        switch (key.type) {
            case "StringLiteral":
                return key.value;
            case "Identifier":
                return key.name;
            default:
                return "nostringerror";
        }
    }

    // const basicStructureItems = ["mixins", "attributes", "messages", "details", "rules", "businessRules", "methods", "modules", "diff"];
    protected parseBody(parseResult: babel.File) {
        var $this = this;
        traverse(parseResult, {
            ObjectProperty(path) {
                if (path.node.key.type === "Identifier") {
                    switch (path.node.key.name) {
                        case "details":
                            let babelDetails = $this.parseObjectExpression(path);
                            $this.details = babelDetails.map(objProp => {
                                return new DetailsEntry($this.moduleUri, $this.getValueOfExpression(objProp.key), objProp.loc, "NOT IMPLEMENTED");
                            });
                            break;
                        case "diff":
                            $this.diff = $this.parseArrayExpression(path);
                            break;
                        case "methods":
                            let babelMethods = $this.parseObjectExpression(path);
                            $this.methods = babelMethods.map(objProp => {
                                return new MethodsEntry($this.moduleUri, $this.getValueOfExpression(objProp.key), objProp.loc, objProp.leadingComments?.map(x => x.value));
                            });

                            break;
                        case "attributes":
                            $this.attributes = $this.parseObjectExpression(path);
                            break;
                        case "messages":
                            $this.messages = $this.parseObjectExpression(path);
                            break;
                        case "mixins":
                            let babelMixins = $this.parseObjectExpression(path);
                            $this.mixins = babelMixins.map(objProp => {
                                if (objProp.value.type === "StringLiteral") {
                                    return new MixinsEntry($this.moduleUri, $this.getValueOfExpression(objProp.key), objProp.value.value, objProp.loc);
                                } else {
                                    return new MixinsEntry($this.moduleUri, $this.getValueOfExpression(objProp.key), "Invalid mixin. Error detected", objProp.loc);
                                }
                            });
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
                        $this.moduleUri = vscode.Uri.parse(path.node.arguments[0].value);
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

    getAsNodes(): ShemaStructureNode[] {
        function pushIfNotEmpty(name: string, getFunc: () => ShemaStructureNode[]) {
            let children = getFunc();
            if (children.length > 0) {
                nodes.push({ tag: "root", name: name, children: children });
            }
        }

        var nodes: ShemaStructureNode[] = [];
        pushIfNotEmpty("messages", this.getMessageNodes.bind(this));
        pushIfNotEmpty("attributes", this.getAttributeNodes.bind(this));
        pushIfNotEmpty("dependencies", this.getDependencyNodes.bind(this));
        pushIfNotEmpty("mixins", this.getMixinNodes.bind(this));
        pushIfNotEmpty("details", this.getDetailNodes.bind(this));
        pushIfNotEmpty("methods", this.getMethodNodes.bind(this));
        pushIfNotEmpty("diff", this.getDiffNodes.bind(this));
        
        return nodes;
    }
    
    getAttributeNodes(): ShemaStructureNode[] {
        return this.attributes.map(item => {
            let name = item.key.type === "StringLiteral" ? item.key.value : "";
            return {
                tag: "attributeItem",
                name: name ? name : "unknown",
                location: item.loc
            };
        });
    }

    getMessageNodes(): ShemaStructureNode[] {
        return this.messages.map(item => {
            let name = item.key.type === "StringLiteral" ? item.key.value : "";
            return {
                tag: "messageItem",
                name: name ? name : "unknown",
                location: item.loc
            };
        });
    }

    getMethodNodes(): ShemaStructureNode[] {
        return this.methods.map(item => {
            return {
                tag: "methodItem",
                name: item.name,
                location: item.location
            };
        });
    }

    getDetailNodes(): ShemaStructureNode[] {
        return this.details.map(item => {
            return {
                tag: "detailItem",
                name: item.name,
                location: item.location
            };
        });
    }

    getMixinNodes(): ShemaStructureNode[] {
        return this.mixins.map(item => {
            return {
                tag: "mixinItem",
                name: item.name,
                location: item.location
            };
        });
    }

    getDependencyNodes(): ShemaStructureNode[] {
        return this.dependencies.map(item => {
            return { tag: "dependency", name: item.value, location: item.loc };
        });
    }

    getDiffNodes(): ShemaStructureNode[] {
        let mapped = this.diff.map(item => {
            let opName = this.findKeyInObjectExpression(item, "operation");
            let name = this.findKeyInObjectExpression(item, "name");
            let node: ShemaStructureNode = {
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
        }, [] as ShemaStructureNode[]);
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