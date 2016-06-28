"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

var _rxjs = require("rxjs");

var _omnisharpClient = require("omnisharp-client");

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

var _npm = require("npm");

var _npm2 = _interopRequireDefault(_npm);

var _omni = require("./server/omni");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var win32 = process.platform === "win32";

var OmniSharpAtom = function () {
    function OmniSharpAtom() {
        _classCallCheck(this, OmniSharpAtom);

        this.config = {
            autoStartOnCompatibleFile: {
                title: "Autostart Omnisharp Roslyn",
                description: "Automatically starts Omnisharp Roslyn when a compatible file is opened.",
                type: "boolean",
                default: true
            },
            developerMode: {
                title: "Developer Mode",
                description: "Outputs detailed server calls in console.log",
                type: "boolean",
                default: false
            },
            showDiagnosticsForAllSolutions: {
                title: "Show Diagnostics for all Solutions",
                description: "Advanced: This will show diagnostics for all open solutions.  NOTE: May take a restart or change to each server to take effect when turned on.",
                type: "boolean",
                default: false
            },
            enableAdvancedFileNew: {
                title: "Enable `Advanced File New`",
                description: "Enable `Advanced File New` when doing ctrl-n/cmd-n within a C# editor.",
                type: "boolean",
                default: false
            },
            useLeftLabelColumnForSuggestions: {
                title: "Use Left-Label column in Suggestions",
                description: "Shows return types in a right-aligned column to the left of the completion suggestion text.",
                type: "boolean",
                default: false
            },
            useIcons: {
                title: "Use unique icons for kind indicators in Suggestions",
                description: "Shows kinds with unique icons rather than autocomplete default styles.",
                type: "boolean",
                default: true
            },
            autoAdjustTreeView: {
                title: "Adjust the tree view to match the solution root.",
                descrption: "This will automatically adjust the treeview to be the root of the solution.",
                type: "boolean",
                default: false
            },
            nagAdjustTreeView: {
                title: "Show the notifications to Adjust the tree view",
                type: "boolean",
                default: true
            },
            autoAddExternalProjects: {
                title: "Add external projects to the tree view.",
                descrption: "This will automatically add external sources to the tree view.\n External sources are any projects that are loaded outside of the solution root.",
                type: "boolean",
                default: false
            },
            nagAddExternalProjects: {
                title: "Show the notifications to add or remove external projects",
                type: "boolean",
                default: true
            },
            hideLinterInterface: {
                title: "Hide the linter interface when using omnisharp-atom editors",
                type: "boolean",
                default: true
            },
            wantMetadata: {
                title: "Request metadata definition with Goto Definition",
                descrption: "Request symbol metadata from the server, when using go-to-definition.  This is disabled by default on Linux, due to issues with Roslyn on Mono.",
                type: "boolean",
                default: win32
            },
            altGotoDefinition: {
                title: "Alt Go To Definition",
                descrption: "Use the alt key instead of the ctrl/cmd key for goto defintion mouse over.",
                type: "boolean",
                default: false
            },
            showHiddenDiagnostics: {
                title: "Show 'Hidden' diagnostics in the linter",
                descrption: "Show or hide hidden diagnostics in the linter, this does not affect greying out of namespaces that are unused.",
                type: "boolean",
                default: true
            }
        };
    }

    _createClass(OmniSharpAtom, [{
        key: "activate",
        value: function activate(state) {
            var _this = this;

            this.disposable = new _omnisharpClient.CompositeDisposable();
            this._started = new _rxjs.AsyncSubject();
            this._activated = new _rxjs.AsyncSubject();
            this.configureKeybindings();
            this.disposable.add(atom.commands.add("atom-workspace", "omnisharp-atom:toggle", function () {
                return _this.toggle();
            }));
            this.disposable.add(atom.commands.add("atom-workspace", "omnisharp-atom:fix-usings", function () {
                return _omni.Omni.request(function (solution) {
                    return solution.fixusings({});
                });
            }));
            this.disposable.add(atom.commands.add("atom-workspace", "omnisharp-atom:settings", function () {
                return atom.workspace.open("atom://config/packages").then(function (tab) {
                    if (tab && tab.getURI && tab.getURI() !== "atom://config/packages/omnisharp-atom") {
                        atom.workspace.open("atom://config/packages/omnisharp-atom");
                    }
                });
            }));
            var grammars = atom.grammars;
            var grammarCb = function grammarCb(grammar) {
                if (_lodash2.default.find(_omni.Omni.grammars, function (gmr) {
                    return gmr.scopeName === grammar.scopeName;
                })) {
                    atom.grammars.startIdForScope(grammar.scopeName);
                    var omnisharpScopeName = grammar.scopeName + ".omnisharp";
                    var scopeId = grammars.idsByScope[grammar.scopeName];
                    grammars.idsByScope[omnisharpScopeName] = scopeId;
                    grammars.scopesById[scopeId] = omnisharpScopeName;
                    grammar.scopeName = omnisharpScopeName;
                }
            };
            _lodash2.default.each(grammars.grammars, grammarCb);
            this.disposable.add(atom.grammars.onDidAddGrammar(grammarCb));
            var currentRoot = process.cwd();
            var npmRoot = _omni.Omni.packageDir + "/omnisharp-atom";
            var generatorAspnet = npmRoot + "/node_modules/generator-aspnet";
            process.chdir(npmRoot);
            var shouldInstallAspnetGenerator = _rxjs.Observable.bindCallback(_npm2.default.load)().mergeMap(function () {
                return _rxjs.Observable.bindNodeCallback(_fs2.default.exists)(generatorAspnet);
            }).switchMap(function (exists) {
                if (exists) {
                    return _rxjs.Observable.bindNodeCallback(_npm2.default.commands.info)(["generator-aspnet"]).map(function (z) {
                        return z.version !== require(generatorAspnet + "/package.json");
                    });
                } else {
                    return _rxjs.Observable.of(true);
                }
            }).switchMap(function (x) {
                if (x) {
                    return _rxjs.Observable.bindNodeCallback(_npm2.default.commands.install)(["generator-aspnet"]).do(function () {
                        return process.chdir(currentRoot);
                    });
                }
                return _rxjs.Observable.of(undefined);
            }).toPromise();
            Promise.all([shouldInstallAspnetGenerator, require("atom-package-deps").install("omnisharp-atom")]).then(function () {
                console.info("Activating omnisharp-atom solution tracking...");
                _omni.Omni.activate();
                _this.disposable.add(_omni.Omni);
                _this._started.next(true);
                _this._started.complete();
            }).then(function () {
                return _this.loadFeatures(_this.getFeatures("atom").delay(_omni.Omni["_kick_in_the_pants_"] ? 0 : 2000)).toPromise();
            }).then(function () {
                var startingObservable = _omni.Omni.activeSolution.filter(function (z) {
                    return !!z;
                }).take(1);
                if (_omni.Omni["_kick_in_the_pants_"]) {
                    startingObservable = _rxjs.Observable.of(null);
                }
                _this.disposable.add(startingObservable.flatMap(function () {
                    return _this.loadFeatures(_this.getFeatures("features"));
                }).subscribe({
                    complete: function complete() {
                        _this.disposable.add(atom.workspace.observeTextEditors(function (editor) {
                            _this.detectAutoToggleGrammar(editor);
                        }));
                        _this._activated.next(true);
                        _this._activated.complete();
                    }
                }));
            });
        }
    }, {
        key: "getFeatures",
        value: function getFeatures(folder) {
            var _this2 = this;

            var whiteList = atom.config.get("omnisharp-atom:feature-white-list");
            var featureList = atom.config.get("omnisharp-atom:feature-list");
            var whiteListUndefined = typeof whiteList === "undefined";
            console.info("Getting features for \"" + folder + "\"...");
            var packageDir = _omni.Omni.packageDir;
            var featureDir = packageDir + "/omnisharp-atom/lib/" + folder;
            function loadFeature(file) {
                var result = require("./" + folder + "/" + file);
                console.info("Loading feature \"" + folder + "/" + file + "\"...");
                return result;
            }
            return _rxjs.Observable.bindNodeCallback(_fs2.default.readdir)(featureDir).flatMap(function (files) {
                return files;
            }).filter(function (file) {
                return (/\.js$/.test(file)
                );
            }).flatMap(function (file) {
                return _rxjs.Observable.bindNodeCallback(_fs2.default.stat)(featureDir + "/" + file);
            }, function (file, stat) {
                return { file: file, stat: stat };
            }).filter(function (z) {
                return !z.stat.isDirectory();
            }).map(function (z) {
                return {
                    file: (folder + "/" + _path2.default.basename(z.file)).replace(/\.js$/, ""),
                    load: function load() {
                        var feature = loadFeature(z.file);
                        var features = [];
                        _lodash2.default.each(feature, function (value, key) {
                            if (!_lodash2.default.isFunction(value)) {
                                if (!value.required) {
                                    _this2.config[key] = {
                                        title: "" + value.title,
                                        description: value.description,
                                        type: "boolean",
                                        default: _lodash2.default.has(value, "default") ? value.default : true
                                    };
                                }
                                features.push({
                                    key: key, activate: function activate() {
                                        return _this2.activateFeature(whiteListUndefined, key, value);
                                    }
                                });
                            }
                        });
                        return _rxjs.Observable.from(features);
                    }
                };
            }).filter(function (l) {
                if (typeof whiteList === "undefined") {
                    return true;
                }
                if (whiteList) {
                    return _lodash2.default.includes(featureList, l.file);
                } else {
                    return !_lodash2.default.includes(featureList, l.file);
                }
            });
        }
    }, {
        key: "loadFeatures",
        value: function loadFeatures(features) {
            var _this3 = this;

            return features.concatMap(function (z) {
                return z.load();
            }).toArray().concatMap(function (x) {
                return x;
            }).map(function (f) {
                return f.activate();
            }).filter(function (x) {
                return !!x;
            }).toArray().do({
                complete: function complete() {
                    atom.config.setSchema("omnisharp-atom", {
                        type: "object",
                        properties: _this3.config
                    });
                }
            }).concatMap(function (x) {
                return x;
            }).do(function (x) {
                return x();
            });
        }
    }, {
        key: "activateFeature",
        value: function activateFeature(whiteListUndefined, key, value) {
            var _this4 = this;

            var result = null;
            var firstRun = true;
            if (whiteListUndefined && _lodash2.default.has(this.config, key)) {
                (function () {
                    var configKey = "omnisharp-atom." + key;
                    var enableDisposable = void 0,
                        disableDisposable = void 0;
                    _this4.disposable.add(atom.config.observe(configKey, function (enabled) {
                        if (!enabled) {
                            if (disableDisposable) {
                                disableDisposable.dispose();
                                _this4.disposable.remove(disableDisposable);
                                disableDisposable = null;
                            }
                            try {
                                value.dispose();
                            } catch (ex) {}
                            enableDisposable = atom.commands.add("atom-workspace", "omnisharp-feature:enable-" + _lodash2.default.kebabCase(key), function () {
                                return atom.config.set(configKey, true);
                            });
                            _this4.disposable.add(enableDisposable);
                        } else {
                            if (enableDisposable) {
                                enableDisposable.dispose();
                                _this4.disposable.remove(disableDisposable);
                                enableDisposable = null;
                            }
                            console.info("Activating feature \"" + key + "\"...");
                            value.activate();
                            if (_lodash2.default.isFunction(value["attach"])) {
                                if (firstRun) {
                                    result = function result() {
                                        console.info("Attaching feature \"" + key + "\"...");
                                        value["attach"]();
                                    };
                                } else {
                                    console.info("Attaching feature \"" + key + "\"...");
                                    value["attach"]();
                                }
                            }
                            disableDisposable = atom.commands.add("atom-workspace", "omnisharp-feature:disable-" + _lodash2.default.kebabCase(key), function () {
                                return atom.config.set(configKey, false);
                            });
                            _this4.disposable.add(disableDisposable);
                        }
                        firstRun = false;
                    }));
                    _this4.disposable.add(atom.commands.add("atom-workspace", "omnisharp-feature:toggle-" + _lodash2.default.kebabCase(key), function () {
                        return atom.config.set(configKey, !atom.config.get(configKey));
                    }));
                })();
            } else {
                value.activate();
                if (_lodash2.default.isFunction(value["attach"])) {
                    result = function result() {
                        console.info("Attaching feature \"" + key + "\"...");
                        value["attach"]();
                    };
                }
            }
            this.disposable.add(_omnisharpClient.Disposable.create(function () {
                try {
                    value.dispose();
                } catch (ex) {}
            }));
            return result;
        }
    }, {
        key: "detectAutoToggleGrammar",
        value: function detectAutoToggleGrammar(editor) {
            var _this5 = this;

            var grammar = editor.getGrammar();
            this.detectGrammar(editor, grammar);
            this.disposable.add(editor.onDidChangeGrammar(function (gmr) {
                return _this5.detectGrammar(editor, gmr);
            }));
        }
    }, {
        key: "detectGrammar",
        value: function detectGrammar(editor, grammar) {
            if (!atom.config.get("omnisharp-atom.autoStartOnCompatibleFile")) {
                return;
            }
            if (_omni.Omni.isValidGrammar(grammar)) {
                if (_omni.Omni.isOff) {
                    this.toggle();
                }
            } else if (grammar.name === "JSON") {
                if (_path2.default.basename(editor.getPath()) === "project.json") {
                    if (_omni.Omni.isOff) {
                        this.toggle();
                    }
                }
            }
        }
    }, {
        key: "toggle",
        value: function toggle() {
            if (_omni.Omni.isOff) {
                _omni.Omni.connect();
            } else if (_omni.Omni.isOn) {
                _omni.Omni.disconnect();
            }
        }
    }, {
        key: "deactivate",
        value: function deactivate() {
            this.disposable.dispose();
        }
    }, {
        key: "consumeStatusBar",
        value: function consumeStatusBar(statusBar) {
            var f = require("./atom/status-bar");
            f.statusBar.setup(statusBar);
            f = require("./atom/framework-selector");
            f.frameworkSelector.setup(statusBar);
            f = require("./atom/feature-buttons");
            f.featureEditorButtons.setup(statusBar);
        }
    }, {
        key: "consumeYeomanEnvironment",
        value: function consumeYeomanEnvironment(generatorService) {
            var _require = require("./atom/generator-aspnet");

            var generatorAspnet = _require.generatorAspnet;

            generatorAspnet.setup(generatorService);
        }
    }, {
        key: "provideAutocomplete",
        value: function provideAutocomplete() {
            return require("./services/completion-provider");
        }
    }, {
        key: "provideLinter",
        value: function provideLinter() {
            return [];
        }
    }, {
        key: "provideProjectJson",
        value: function provideProjectJson() {
            return require("./services/project-provider").concat(require("./services/framework-provider"));
        }
    }, {
        key: "consumeLinter",
        value: function consumeLinter(linter) {
            var LinterProvider = require("./services/linter-provider");
            var linters = LinterProvider.provider;
            this.disposable.add(_omnisharpClient.Disposable.create(function () {
                _lodash2.default.each(linters, function (l) {
                    linter.deleteLinter(l);
                });
            }));
            this.disposable.add(LinterProvider.init(linter));
        }
    }, {
        key: "consumeIndieLinter",
        value: function consumeIndieLinter(linter) {
            require("./services/linter-provider").registerIndie(linter, this.disposable);
        }
    }, {
        key: "configureKeybindings",
        value: function configureKeybindings() {
            var disposable = void 0;
            var omnisharpAdvancedFileNew = _omni.Omni.packageDir + "/omnisharp-atom/keymaps/omnisharp-file-new.cson";
            this.disposable.add(atom.config.observe("omnisharp-atom.enableAdvancedFileNew", function (enabled) {
                if (enabled) {
                    disposable = atom.keymaps.loadKeymap(omnisharpAdvancedFileNew);
                } else {
                    if (disposable) disposable.dispose();
                    atom.keymaps.removeBindingsFromSource(omnisharpAdvancedFileNew);
                }
            }));
        }
    }]);

    return OmniSharpAtom;
}();

module.exports = new OmniSharpAtom();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9vbW5pc2hhcnAtYXRvbS5qcyIsImxpYi9vbW5pc2hhcnAtYXRvbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUE7Ozs7QUFDQTs7QUFDQTs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7Ozs7O0FDR0EsSUFBTSxRQUFRLFFBQVEsUUFBUixLQUFxQixPQUFyQjs7SUFFZDtBQUFBLDZCQUFBOzs7QUFnV1csYUFBQSxNQUFBLEdBQVM7QUFDWix1Q0FBMkI7QUFDdkIsdUJBQU8sNEJBQVA7QUFDQSw2QkFBYSx5RUFBYjtBQUNBLHNCQUFNLFNBQU47QUFDQSx5QkFBUyxJQUFUO2FBSko7QUFNQSwyQkFBZTtBQUNYLHVCQUFPLGdCQUFQO0FBQ0EsNkJBQWEsOENBQWI7QUFDQSxzQkFBTSxTQUFOO0FBQ0EseUJBQVMsS0FBVDthQUpKO0FBTUEsNENBQWdDO0FBQzVCLHVCQUFPLG9DQUFQO0FBQ0EsNkJBQWEsZ0pBQWI7QUFDQSxzQkFBTSxTQUFOO0FBQ0EseUJBQVMsS0FBVDthQUpKO0FBTUEsbUNBQXVCO0FBQ25CLHVCQUFPLDRCQUFQO0FBQ0EsNkJBQWEsd0VBQWI7QUFDQSxzQkFBTSxTQUFOO0FBQ0EseUJBQVMsS0FBVDthQUpKO0FBTUEsOENBQWtDO0FBQzlCLHVCQUFPLHNDQUFQO0FBQ0EsNkJBQWEsNkZBQWI7QUFDQSxzQkFBTSxTQUFOO0FBQ0EseUJBQVMsS0FBVDthQUpKO0FBTUEsc0JBQVU7QUFDTix1QkFBTyxxREFBUDtBQUNBLDZCQUFhLHdFQUFiO0FBQ0Esc0JBQU0sU0FBTjtBQUNBLHlCQUFTLElBQVQ7YUFKSjtBQU1BLGdDQUFvQjtBQUNoQix1QkFBTyxrREFBUDtBQUNBLDRCQUFZLDZFQUFaO0FBQ0Esc0JBQU0sU0FBTjtBQUNBLHlCQUFTLEtBQVQ7YUFKSjtBQU1BLCtCQUFtQjtBQUNmLHVCQUFPLGdEQUFQO0FBQ0Esc0JBQU0sU0FBTjtBQUNBLHlCQUFTLElBQVQ7YUFISjtBQUtBLHFDQUF5QjtBQUNyQix1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b3VyY2VzQ29udGVudCI6WyJpbXBvcnQgXyBmcm9tIFwibG9kYXNoXCI7XG5pbXBvcnQgeyBPYnNlcnZhYmxlLCBBc3luY1N1YmplY3QgfSBmcm9tIFwicnhqc1wiO1xuaW1wb3J0IHsgQ29tcG9zaXRlRGlzcG9zYWJsZSwgRGlzcG9zYWJsZSB9IGZyb20gXCJvbW5pc2hhcnAtY2xpZW50XCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IGZzIGZyb20gXCJmc1wiO1xuaW1wb3J0IG5wbSBmcm9tIFwibnBtXCI7XG5pbXBvcnQgeyBPbW5pIH0gZnJvbSBcIi4vc2VydmVyL29tbmlcIjtcbmNvbnN0IHdpbjMyID0gcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gXCJ3aW4zMlwiO1xuY2xhc3MgT21uaVNoYXJwQXRvbSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuY29uZmlnID0ge1xuICAgICAgICAgICAgYXV0b1N0YXJ0T25Db21wYXRpYmxlRmlsZToge1xuICAgICAgICAgICAgICAgIHRpdGxlOiBcIkF1dG9zdGFydCBPbW5pc2hhcnAgUm9zbHluXCIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiQXV0b21hdGljYWxseSBzdGFydHMgT21uaXNoYXJwIFJvc2x5biB3aGVuIGEgY29tcGF0aWJsZSBmaWxlIGlzIG9wZW5lZC5cIixcbiAgICAgICAgICAgICAgICB0eXBlOiBcImJvb2xlYW5cIixcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGV2ZWxvcGVyTW9kZToge1xuICAgICAgICAgICAgICAgIHRpdGxlOiBcIkRldmVsb3BlciBNb2RlXCIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiT3V0cHV0cyBkZXRhaWxlZCBzZXJ2ZXIgY2FsbHMgaW4gY29uc29sZS5sb2dcIixcbiAgICAgICAgICAgICAgICB0eXBlOiBcImJvb2xlYW5cIixcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNob3dEaWFnbm9zdGljc0ZvckFsbFNvbHV0aW9uczoge1xuICAgICAgICAgICAgICAgIHRpdGxlOiBcIlNob3cgRGlhZ25vc3RpY3MgZm9yIGFsbCBTb2x1dGlvbnNcIixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJBZHZhbmNlZDogVGhpcyB3aWxsIHNob3cgZGlhZ25vc3RpY3MgZm9yIGFsbCBvcGVuIHNvbHV0aW9ucy4gIE5PVEU6IE1heSB0YWtlIGEgcmVzdGFydCBvciBjaGFuZ2UgdG8gZWFjaCBzZXJ2ZXIgdG8gdGFrZSBlZmZlY3Qgd2hlbiB0dXJuZWQgb24uXCIsXG4gICAgICAgICAgICAgICAgdHlwZTogXCJib29sZWFuXCIsXG4gICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlbmFibGVBZHZhbmNlZEZpbGVOZXc6IHtcbiAgICAgICAgICAgICAgICB0aXRsZTogXCJFbmFibGUgYEFkdmFuY2VkIEZpbGUgTmV3YFwiLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkVuYWJsZSBgQWR2YW5jZWQgRmlsZSBOZXdgIHdoZW4gZG9pbmcgY3RybC1uL2NtZC1uIHdpdGhpbiBhIEMjIGVkaXRvci5cIixcbiAgICAgICAgICAgICAgICB0eXBlOiBcImJvb2xlYW5cIixcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVzZUxlZnRMYWJlbENvbHVtbkZvclN1Z2dlc3Rpb25zOiB7XG4gICAgICAgICAgICAgICAgdGl0bGU6IFwiVXNlIExlZnQtTGFiZWwgY29sdW1uIGluIFN1Z2dlc3Rpb25zXCIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiU2hvd3MgcmV0dXJuIHR5cGVzIGluIGEgcmlnaHQtYWxpZ25lZCBjb2x1bW4gdG8gdGhlIGxlZnQgb2YgdGhlIGNvbXBsZXRpb24gc3VnZ2VzdGlvbiB0ZXh0LlwiLFxuICAgICAgICAgICAgICAgIHR5cGU6IFwiYm9vbGVhblwiLFxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXNlSWNvbnM6IHtcbiAgICAgICAgICAgICAgICB0aXRsZTogXCJVc2UgdW5pcXVlIGljb25zIGZvciBraW5kIGluZGljYXRvcnMgaW4gU3VnZ2VzdGlvbnNcIixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJTaG93cyBraW5kcyB3aXRoIHVuaXF1ZSBpY29ucyByYXRoZXIgdGhhbiBhdXRvY29tcGxldGUgZGVmYXVsdCBzdHlsZXMuXCIsXG4gICAgICAgICAgICAgICAgdHlwZTogXCJib29sZWFuXCIsXG4gICAgICAgICAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGF1dG9BZGp1c3RUcmVlVmlldzoge1xuICAgICAgICAgICAgICAgIHRpdGxlOiBcIkFkanVzdCB0aGUgdHJlZSB2aWV3IHRvIG1hdGNoIHRoZSBzb2x1dGlvbiByb290LlwiLFxuICAgICAgICAgICAgICAgIGRlc2NycHRpb246IFwiVGhpcyB3aWxsIGF1dG9tYXRpY2FsbHkgYWRqdXN0IHRoZSB0cmVldmlldyB0byBiZSB0aGUgcm9vdCBvZiB0aGUgc29sdXRpb24uXCIsXG4gICAgICAgICAgICAgICAgdHlwZTogXCJib29sZWFuXCIsXG4gICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBuYWdBZGp1c3RUcmVlVmlldzoge1xuICAgICAgICAgICAgICAgIHRpdGxlOiBcIlNob3cgdGhlIG5vdGlmaWNhdGlvbnMgdG8gQWRqdXN0IHRoZSB0cmVlIHZpZXdcIixcbiAgICAgICAgICAgICAgICB0eXBlOiBcImJvb2xlYW5cIixcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYXV0b0FkZEV4dGVybmFsUHJvamVjdHM6IHtcbiAgICAgICAgICAgICAgICB0aXRsZTogXCJBZGQgZXh0ZXJuYWwgcHJvamVjdHMgdG8gdGhlIHRyZWUgdmlldy5cIixcbiAgICAgICAgICAgICAgICBkZXNjcnB0aW9uOiBcIlRoaXMgd2lsbCBhdXRvbWF0aWNhbGx5IGFkZCBleHRlcm5hbCBzb3VyY2VzIHRvIHRoZSB0cmVlIHZpZXcuXFxuIEV4dGVybmFsIHNvdXJjZXMgYXJlIGFueSBwcm9qZWN0cyB0aGF0IGFyZSBsb2FkZWQgb3V0c2lkZSBvZiB0aGUgc29sdXRpb24gcm9vdC5cIixcbiAgICAgICAgICAgICAgICB0eXBlOiBcImJvb2xlYW5cIixcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG5hZ0FkZEV4dGVybmFsUHJvamVjdHM6IHtcbiAgICAgICAgICAgICAgICB0aXRsZTogXCJTaG93IHRoZSBub3RpZmljYXRpb25zIHRvIGFkZCBvciByZW1vdmUgZXh0ZXJuYWwgcHJvamVjdHNcIixcbiAgICAgICAgICAgICAgICB0eXBlOiBcImJvb2xlYW5cIixcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaGlkZUxpbnRlckludGVyZmFjZToge1xuICAgICAgICAgICAgICAgIHRpdGxlOiBcIkhpZGUgdGhlIGxpbnRlciBpbnRlcmZhY2Ugd2hlbiB1c2luZyBvbW5pc2hhcnAtYXRvbSBlZGl0b3JzXCIsXG4gICAgICAgICAgICAgICAgdHlwZTogXCJib29sZWFuXCIsXG4gICAgICAgICAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHdhbnRNZXRhZGF0YToge1xuICAgICAgICAgICAgICAgIHRpdGxlOiBcIlJlcXVlc3QgbWV0YWRhdGEgZGVmaW5pdGlvbiB3aXRoIEdvdG8gRGVmaW5pdGlvblwiLFxuICAgICAgICAgICAgICAgIGRlc2NycHRpb246IFwiUmVxdWVzdCBzeW1ib2wgbWV0YWRhdGEgZnJvbSB0aGUgc2VydmVyLCB3aGVuIHVzaW5nIGdvLXRvLWRlZmluaXRpb24uICBUaGlzIGlzIGRpc2FibGVkIGJ5IGRlZmF1bHQgb24gTGludXgsIGR1ZSB0byBpc3N1ZXMgd2l0aCBSb3NseW4gb24gTW9uby5cIixcbiAgICAgICAgICAgICAgICB0eXBlOiBcImJvb2xlYW5cIixcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiB3aW4zMlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFsdEdvdG9EZWZpbml0aW9uOiB7XG4gICAgICAgICAgICAgICAgdGl0bGU6IFwiQWx0IEdvIFRvIERlZmluaXRpb25cIixcbiAgICAgICAgICAgICAgICBkZXNjcnB0aW9uOiBcIlVzZSB0aGUgYWx0IGtleSBpbnN0ZWFkIG9mIHRoZSBjdHJsL2NtZCBrZXkgZm9yIGdvdG8gZGVmaW50aW9uIG1vdXNlIG92ZXIuXCIsXG4gICAgICAgICAgICAgICAgdHlwZTogXCJib29sZWFuXCIsXG4gICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzaG93SGlkZGVuRGlhZ25vc3RpY3M6IHtcbiAgICAgICAgICAgICAgICB0aXRsZTogXCJTaG93ICdIaWRkZW4nIGRpYWdub3N0aWNzIGluIHRoZSBsaW50ZXJcIixcbiAgICAgICAgICAgICAgICBkZXNjcnB0aW9uOiBcIlNob3cgb3IgaGlkZSBoaWRkZW4gZGlhZ25vc3RpY3MgaW4gdGhlIGxpbnRlciwgdGhpcyBkb2VzIG5vdCBhZmZlY3QgZ3JleWluZyBvdXQgb2YgbmFtZXNwYWNlcyB0aGF0IGFyZSB1bnVzZWQuXCIsXG4gICAgICAgICAgICAgICAgdHlwZTogXCJib29sZWFuXCIsXG4gICAgICAgICAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbiAgICBhY3RpdmF0ZShzdGF0ZSkge1xuICAgICAgICB0aGlzLmRpc3Bvc2FibGUgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZTtcbiAgICAgICAgdGhpcy5fc3RhcnRlZCA9IG5ldyBBc3luY1N1YmplY3QoKTtcbiAgICAgICAgdGhpcy5fYWN0aXZhdGVkID0gbmV3IEFzeW5jU3ViamVjdCgpO1xuICAgICAgICB0aGlzLmNvbmZpZ3VyZUtleWJpbmRpbmdzKCk7XG4gICAgICAgIHRoaXMuZGlzcG9zYWJsZS5hZGQoYXRvbS5jb21tYW5kcy5hZGQoXCJhdG9tLXdvcmtzcGFjZVwiLCBcIm9tbmlzaGFycC1hdG9tOnRvZ2dsZVwiLCAoKSA9PiB0aGlzLnRvZ2dsZSgpKSk7XG4gICAgICAgIHRoaXMuZGlzcG9zYWJsZS5hZGQoYXRvbS5jb21tYW5kcy5hZGQoXCJhdG9tLXdvcmtzcGFjZVwiLCBcIm9tbmlzaGFycC1hdG9tOmZpeC11c2luZ3NcIiwgKCkgPT4gT21uaS5yZXF1ZXN0KHNvbHV0aW9uID0+IHNvbHV0aW9uLmZpeHVzaW5ncyh7fSkpKSk7XG4gICAgICAgIHRoaXMuZGlzcG9zYWJsZS5hZGQoYXRvbS5jb21tYW5kcy5hZGQoXCJhdG9tLXdvcmtzcGFjZVwiLCBcIm9tbmlzaGFycC1hdG9tOnNldHRpbmdzXCIsICgpID0+IGF0b20ud29ya3NwYWNlLm9wZW4oXCJhdG9tOi8vY29uZmlnL3BhY2thZ2VzXCIpXG4gICAgICAgICAgICAudGhlbih0YWIgPT4ge1xuICAgICAgICAgICAgaWYgKHRhYiAmJiB0YWIuZ2V0VVJJICYmIHRhYi5nZXRVUkkoKSAhPT0gXCJhdG9tOi8vY29uZmlnL3BhY2thZ2VzL29tbmlzaGFycC1hdG9tXCIpIHtcbiAgICAgICAgICAgICAgICBhdG9tLndvcmtzcGFjZS5vcGVuKFwiYXRvbTovL2NvbmZpZy9wYWNrYWdlcy9vbW5pc2hhcnAtYXRvbVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkpKTtcbiAgICAgICAgY29uc3QgZ3JhbW1hcnMgPSBhdG9tLmdyYW1tYXJzO1xuICAgICAgICBjb25zdCBncmFtbWFyQ2IgPSAoZ3JhbW1hcikgPT4ge1xuICAgICAgICAgICAgaWYgKF8uZmluZChPbW5pLmdyYW1tYXJzLCAoZ21yKSA9PiBnbXIuc2NvcGVOYW1lID09PSBncmFtbWFyLnNjb3BlTmFtZSkpIHtcbiAgICAgICAgICAgICAgICBhdG9tLmdyYW1tYXJzLnN0YXJ0SWRGb3JTY29wZShncmFtbWFyLnNjb3BlTmFtZSk7XG4gICAgICAgICAgICAgICAgY29uc3Qgb21uaXNoYXJwU2NvcGVOYW1lID0gYCR7Z3JhbW1hci5zY29wZU5hbWV9Lm9tbmlzaGFycGA7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2NvcGVJZCA9IGdyYW1tYXJzLmlkc0J5U2NvcGVbZ3JhbW1hci5zY29wZU5hbWVdO1xuICAgICAgICAgICAgICAgIGdyYW1tYXJzLmlkc0J5U2NvcGVbb21uaXNoYXJwU2NvcGVOYW1lXSA9IHNjb3BlSWQ7XG4gICAgICAgICAgICAgICAgZ3JhbW1hcnMuc2NvcGVzQnlJZFtzY29wZUlkXSA9IG9tbmlzaGFycFNjb3BlTmFtZTtcbiAgICAgICAgICAgICAgICBncmFtbWFyLnNjb3BlTmFtZSA9IG9tbmlzaGFycFNjb3BlTmFtZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXy5lYWNoKGdyYW1tYXJzLmdyYW1tYXJzLCBncmFtbWFyQ2IpO1xuICAgICAgICB0aGlzLmRpc3Bvc2FibGUuYWRkKGF0b20uZ3JhbW1hcnMub25EaWRBZGRHcmFtbWFyKGdyYW1tYXJDYikpO1xuICAgICAgICBjb25zdCBjdXJyZW50Um9vdCA9IHByb2Nlc3MuY3dkKCk7XG4gICAgICAgIGNvbnN0IG5wbVJvb3QgPSBgJHtPbW5pLnBhY2thZ2VEaXJ9L29tbmlzaGFycC1hdG9tYDtcbiAgICAgICAgY29uc3QgZ2VuZXJhdG9yQXNwbmV0ID0gYCR7bnBtUm9vdH0vbm9kZV9tb2R1bGVzL2dlbmVyYXRvci1hc3BuZXRgO1xuICAgICAgICBwcm9jZXNzLmNoZGlyKG5wbVJvb3QpO1xuICAgICAgICBjb25zdCBzaG91bGRJbnN0YWxsQXNwbmV0R2VuZXJhdG9yID0gT2JzZXJ2YWJsZS5iaW5kQ2FsbGJhY2sobnBtLmxvYWQpKClcbiAgICAgICAgICAgIC5tZXJnZU1hcCgoKSA9PiBPYnNlcnZhYmxlLmJpbmROb2RlQ2FsbGJhY2soZnMuZXhpc3RzKShnZW5lcmF0b3JBc3BuZXQpKVxuICAgICAgICAgICAgLnN3aXRjaE1hcChleGlzdHMgPT4ge1xuICAgICAgICAgICAgaWYgKGV4aXN0cykge1xuICAgICAgICAgICAgICAgIHJldHVybiBPYnNlcnZhYmxlLmJpbmROb2RlQ2FsbGJhY2sobnBtLmNvbW1hbmRzLmluZm8pKFtcImdlbmVyYXRvci1hc3BuZXRcIl0pXG4gICAgICAgICAgICAgICAgICAgIC5tYXAoeiA9PiB6LnZlcnNpb24gIT09IHJlcXVpcmUoYCR7Z2VuZXJhdG9yQXNwbmV0fS9wYWNrYWdlLmpzb25gKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gT2JzZXJ2YWJsZS5vZih0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgICAgIC5zd2l0Y2hNYXAoeCA9PiB7XG4gICAgICAgICAgICBpZiAoeCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBPYnNlcnZhYmxlLmJpbmROb2RlQ2FsbGJhY2sobnBtLmNvbW1hbmRzLmluc3RhbGwpKFtcImdlbmVyYXRvci1hc3BuZXRcIl0pXG4gICAgICAgICAgICAgICAgICAgIC5kbygoKSA9PiBwcm9jZXNzLmNoZGlyKGN1cnJlbnRSb290KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gT2JzZXJ2YWJsZS5vZih1bmRlZmluZWQpO1xuICAgICAgICB9KVxuICAgICAgICAgICAgLnRvUHJvbWlzZSgpO1xuICAgICAgICBQcm9taXNlLmFsbChbXG4gICAgICAgICAgICBzaG91bGRJbnN0YWxsQXNwbmV0R2VuZXJhdG9yLFxuICAgICAgICAgICAgcmVxdWlyZShcImF0b20tcGFja2FnZS1kZXBzXCIpLmluc3RhbGwoXCJvbW5pc2hhcnAtYXRvbVwiKVxuICAgICAgICBdKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhcIkFjdGl2YXRpbmcgb21uaXNoYXJwLWF0b20gc29sdXRpb24gdHJhY2tpbmcuLi5cIik7XG4gICAgICAgICAgICBPbW5pLmFjdGl2YXRlKCk7XG4gICAgICAgICAgICB0aGlzLmRpc3Bvc2FibGUuYWRkKE9tbmkpO1xuICAgICAgICAgICAgdGhpcy5fc3RhcnRlZC5uZXh0KHRydWUpO1xuICAgICAgICAgICAgdGhpcy5fc3RhcnRlZC5jb21wbGV0ZSgpO1xuICAgICAgICB9KVxuICAgICAgICAgICAgLnRoZW4oKCkgPT4gdGhpcy5sb2FkRmVhdHVyZXModGhpcy5nZXRGZWF0dXJlcyhcImF0b21cIikuZGVsYXkoT21uaVtcIl9raWNrX2luX3RoZV9wYW50c19cIl0gPyAwIDogMjAwMCkpLnRvUHJvbWlzZSgpKVxuICAgICAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgbGV0IHN0YXJ0aW5nT2JzZXJ2YWJsZSA9IE9tbmkuYWN0aXZlU29sdXRpb25cbiAgICAgICAgICAgICAgICAuZmlsdGVyKHogPT4gISF6KVxuICAgICAgICAgICAgICAgIC50YWtlKDEpO1xuICAgICAgICAgICAgaWYgKE9tbmlbXCJfa2lja19pbl90aGVfcGFudHNfXCJdKSB7XG4gICAgICAgICAgICAgICAgc3RhcnRpbmdPYnNlcnZhYmxlID0gT2JzZXJ2YWJsZS5vZihudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZGlzcG9zYWJsZS5hZGQoc3RhcnRpbmdPYnNlcnZhYmxlXG4gICAgICAgICAgICAgICAgLmZsYXRNYXAoKCkgPT4gdGhpcy5sb2FkRmVhdHVyZXModGhpcy5nZXRGZWF0dXJlcyhcImZlYXR1cmVzXCIpKSlcbiAgICAgICAgICAgICAgICAuc3Vic2NyaWJlKHtcbiAgICAgICAgICAgICAgICBjb21wbGV0ZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmRpc3Bvc2FibGUuYWRkKGF0b20ud29ya3NwYWNlLm9ic2VydmVUZXh0RWRpdG9ycygoZWRpdG9yKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRldGVjdEF1dG9Ub2dnbGVHcmFtbWFyKGVkaXRvcik7XG4gICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fYWN0aXZhdGVkLm5leHQodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2FjdGl2YXRlZC5jb21wbGV0ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGdldEZlYXR1cmVzKGZvbGRlcikge1xuICAgICAgICBjb25zdCB3aGl0ZUxpc3QgPSBhdG9tLmNvbmZpZy5nZXQoXCJvbW5pc2hhcnAtYXRvbTpmZWF0dXJlLXdoaXRlLWxpc3RcIik7XG4gICAgICAgIGNvbnN0IGZlYXR1cmVMaXN0ID0gYXRvbS5jb25maWcuZ2V0KFwib21uaXNoYXJwLWF0b206ZmVhdHVyZS1saXN0XCIpO1xuICAgICAgICBjb25zdCB3aGl0ZUxpc3RVbmRlZmluZWQgPSAodHlwZW9mIHdoaXRlTGlzdCA9PT0gXCJ1bmRlZmluZWRcIik7XG4gICAgICAgIGNvbnNvbGUuaW5mbyhgR2V0dGluZyBmZWF0dXJlcyBmb3IgXCIke2ZvbGRlcn1cIi4uLmApO1xuICAgICAgICBjb25zdCBwYWNrYWdlRGlyID0gT21uaS5wYWNrYWdlRGlyO1xuICAgICAgICBjb25zdCBmZWF0dXJlRGlyID0gYCR7cGFja2FnZURpcn0vb21uaXNoYXJwLWF0b20vbGliLyR7Zm9sZGVyfWA7XG4gICAgICAgIGZ1bmN0aW9uIGxvYWRGZWF0dXJlKGZpbGUpIHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHJlcXVpcmUoYC4vJHtmb2xkZXJ9LyR7ZmlsZX1gKTtcbiAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhgTG9hZGluZyBmZWF0dXJlIFwiJHtmb2xkZXJ9LyR7ZmlsZX1cIi4uLmApO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gT2JzZXJ2YWJsZS5iaW5kTm9kZUNhbGxiYWNrKGZzLnJlYWRkaXIpKGZlYXR1cmVEaXIpXG4gICAgICAgICAgICAuZmxhdE1hcChmaWxlcyA9PiBmaWxlcylcbiAgICAgICAgICAgIC5maWx0ZXIoZmlsZSA9PiAvXFwuanMkLy50ZXN0KGZpbGUpKVxuICAgICAgICAgICAgLmZsYXRNYXAoZmlsZSA9PiBPYnNlcnZhYmxlLmJpbmROb2RlQ2FsbGJhY2soZnMuc3RhdCkoYCR7ZmVhdHVyZURpcn0vJHtmaWxlfWApLCAoZmlsZSwgc3RhdCkgPT4gKHsgZmlsZSwgc3RhdCB9KSlcbiAgICAgICAgICAgIC5maWx0ZXIoeiA9PiAhei5zdGF0LmlzRGlyZWN0b3J5KCkpXG4gICAgICAgICAgICAubWFwKHogPT4gKHtcbiAgICAgICAgICAgIGZpbGU6IGAke2ZvbGRlcn0vJHtwYXRoLmJhc2VuYW1lKHouZmlsZSl9YC5yZXBsYWNlKC9cXC5qcyQvLCBcIlwiKSxcbiAgICAgICAgICAgIGxvYWQ6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBmZWF0dXJlID0gbG9hZEZlYXR1cmUoei5maWxlKTtcbiAgICAgICAgICAgICAgICBjb25zdCBmZWF0dXJlcyA9IFtdO1xuICAgICAgICAgICAgICAgIF8uZWFjaChmZWF0dXJlLCAodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIV8uaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdmFsdWUucmVxdWlyZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZ1trZXldID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogYCR7dmFsdWUudGl0bGV9YCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IHZhbHVlLmRlc2NyaXB0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImJvb2xlYW5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogKF8uaGFzKHZhbHVlLCBcImRlZmF1bHRcIikgPyB2YWx1ZS5kZWZhdWx0IDogdHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZmVhdHVyZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5LCBhY3RpdmF0ZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5hY3RpdmF0ZUZlYXR1cmUod2hpdGVMaXN0VW5kZWZpbmVkLCBrZXksIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBPYnNlcnZhYmxlLmZyb20oZmVhdHVyZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSlcbiAgICAgICAgICAgIC5maWx0ZXIobCA9PiB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHdoaXRlTGlzdCA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHdoaXRlTGlzdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBfLmluY2x1ZGVzKGZlYXR1cmVMaXN0LCBsLmZpbGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICFfLmluY2x1ZGVzKGZlYXR1cmVMaXN0LCBsLmZpbGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgbG9hZEZlYXR1cmVzKGZlYXR1cmVzKSB7XG4gICAgICAgIHJldHVybiBmZWF0dXJlc1xuICAgICAgICAgICAgLmNvbmNhdE1hcCh6ID0+IHoubG9hZCgpKVxuICAgICAgICAgICAgLnRvQXJyYXkoKVxuICAgICAgICAgICAgLmNvbmNhdE1hcCh4ID0+IHgpXG4gICAgICAgICAgICAubWFwKGYgPT4gZi5hY3RpdmF0ZSgpKVxuICAgICAgICAgICAgLmZpbHRlcih4ID0+ICEheClcbiAgICAgICAgICAgIC50b0FycmF5KClcbiAgICAgICAgICAgIC5kbyh7XG4gICAgICAgICAgICBjb21wbGV0ZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGF0b20uY29uZmlnLnNldFNjaGVtYShcIm9tbmlzaGFycC1hdG9tXCIsIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczogdGhpcy5jb25maWdcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgICAgIC5jb25jYXRNYXAoeCA9PiB4KVxuICAgICAgICAgICAgLmRvKHggPT4geCgpKTtcbiAgICB9XG4gICAgYWN0aXZhdGVGZWF0dXJlKHdoaXRlTGlzdFVuZGVmaW5lZCwga2V5LCB2YWx1ZSkge1xuICAgICAgICBsZXQgcmVzdWx0ID0gbnVsbDtcbiAgICAgICAgbGV0IGZpcnN0UnVuID0gdHJ1ZTtcbiAgICAgICAgaWYgKHdoaXRlTGlzdFVuZGVmaW5lZCAmJiBfLmhhcyh0aGlzLmNvbmZpZywga2V5KSkge1xuICAgICAgICAgICAgY29uc3QgY29uZmlnS2V5ID0gYG9tbmlzaGFycC1hdG9tLiR7a2V5fWA7XG4gICAgICAgICAgICBsZXQgZW5hYmxlRGlzcG9zYWJsZSwgZGlzYWJsZURpc3Bvc2FibGU7XG4gICAgICAgICAgICB0aGlzLmRpc3Bvc2FibGUuYWRkKGF0b20uY29uZmlnLm9ic2VydmUoY29uZmlnS2V5LCBlbmFibGVkID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIWVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpc2FibGVEaXNwb3NhYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxlRGlzcG9zYWJsZS5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRpc3Bvc2FibGUucmVtb3ZlKGRpc2FibGVEaXNwb3NhYmxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc2FibGVEaXNwb3NhYmxlID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUuZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNhdGNoIChleCkgeyB9XG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZURpc3Bvc2FibGUgPSBhdG9tLmNvbW1hbmRzLmFkZChcImF0b20td29ya3NwYWNlXCIsIGBvbW5pc2hhcnAtZmVhdHVyZTplbmFibGUtJHtfLmtlYmFiQ2FzZShrZXkpfWAsICgpID0+IGF0b20uY29uZmlnLnNldChjb25maWdLZXksIHRydWUpKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kaXNwb3NhYmxlLmFkZChlbmFibGVEaXNwb3NhYmxlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbmFibGVEaXNwb3NhYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVEaXNwb3NhYmxlLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGlzcG9zYWJsZS5yZW1vdmUoZGlzYWJsZURpc3Bvc2FibGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlRGlzcG9zYWJsZSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKGBBY3RpdmF0aW5nIGZlYXR1cmUgXCIke2tleX1cIi4uLmApO1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZS5hY3RpdmF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKHZhbHVlW1wiYXR0YWNoXCJdKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpcnN0UnVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oYEF0dGFjaGluZyBmZWF0dXJlIFwiJHtrZXl9XCIuLi5gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVbXCJhdHRhY2hcIl0oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKGBBdHRhY2hpbmcgZmVhdHVyZSBcIiR7a2V5fVwiLi4uYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVbXCJhdHRhY2hcIl0oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBkaXNhYmxlRGlzcG9zYWJsZSA9IGF0b20uY29tbWFuZHMuYWRkKFwiYXRvbS13b3Jrc3BhY2VcIiwgYG9tbmlzaGFycC1mZWF0dXJlOmRpc2FibGUtJHtfLmtlYmFiQ2FzZShrZXkpfWAsICgpID0+IGF0b20uY29uZmlnLnNldChjb25maWdLZXksIGZhbHNlKSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGlzcG9zYWJsZS5hZGQoZGlzYWJsZURpc3Bvc2FibGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmaXJzdFJ1biA9IGZhbHNlO1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgdGhpcy5kaXNwb3NhYmxlLmFkZChhdG9tLmNvbW1hbmRzLmFkZChcImF0b20td29ya3NwYWNlXCIsIGBvbW5pc2hhcnAtZmVhdHVyZTp0b2dnbGUtJHtfLmtlYmFiQ2FzZShrZXkpfWAsICgpID0+IGF0b20uY29uZmlnLnNldChjb25maWdLZXksICFhdG9tLmNvbmZpZy5nZXQoY29uZmlnS2V5KSkpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhbHVlLmFjdGl2YXRlKCk7XG4gICAgICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKHZhbHVlW1wiYXR0YWNoXCJdKSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKGBBdHRhY2hpbmcgZmVhdHVyZSBcIiR7a2V5fVwiLi4uYCk7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlW1wiYXR0YWNoXCJdKCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLmRpc3Bvc2FibGUuYWRkKERpc3Bvc2FibGUuY3JlYXRlKCgpID0+IHsgdHJ5IHtcbiAgICAgICAgICAgIHZhbHVlLmRpc3Bvc2UoKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXgpIHsgfSB9KSk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIGRldGVjdEF1dG9Ub2dnbGVHcmFtbWFyKGVkaXRvcikge1xuICAgICAgICBjb25zdCBncmFtbWFyID0gZWRpdG9yLmdldEdyYW1tYXIoKTtcbiAgICAgICAgdGhpcy5kZXRlY3RHcmFtbWFyKGVkaXRvciwgZ3JhbW1hcik7XG4gICAgICAgIHRoaXMuZGlzcG9zYWJsZS5hZGQoZWRpdG9yLm9uRGlkQ2hhbmdlR3JhbW1hcigoZ21yKSA9PiB0aGlzLmRldGVjdEdyYW1tYXIoZWRpdG9yLCBnbXIpKSk7XG4gICAgfVxuICAgIGRldGVjdEdyYW1tYXIoZWRpdG9yLCBncmFtbWFyKSB7XG4gICAgICAgIGlmICghYXRvbS5jb25maWcuZ2V0KFwib21uaXNoYXJwLWF0b20uYXV0b1N0YXJ0T25Db21wYXRpYmxlRmlsZVwiKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChPbW5pLmlzVmFsaWRHcmFtbWFyKGdyYW1tYXIpKSB7XG4gICAgICAgICAgICBpZiAoT21uaS5pc09mZikge1xuICAgICAgICAgICAgICAgIHRoaXMudG9nZ2xlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZ3JhbW1hci5uYW1lID09PSBcIkpTT05cIikge1xuICAgICAgICAgICAgaWYgKHBhdGguYmFzZW5hbWUoZWRpdG9yLmdldFBhdGgoKSkgPT09IFwicHJvamVjdC5qc29uXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoT21uaS5pc09mZikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRvZ2dsZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICB0b2dnbGUoKSB7XG4gICAgICAgIGlmIChPbW5pLmlzT2ZmKSB7XG4gICAgICAgICAgICBPbW5pLmNvbm5lY3QoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChPbW5pLmlzT24pIHtcbiAgICAgICAgICAgIE9tbmkuZGlzY29ubmVjdCgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGRlYWN0aXZhdGUoKSB7XG4gICAgICAgIHRoaXMuZGlzcG9zYWJsZS5kaXNwb3NlKCk7XG4gICAgfVxuICAgIGNvbnN1bWVTdGF0dXNCYXIoc3RhdHVzQmFyKSB7XG4gICAgICAgIGxldCBmID0gcmVxdWlyZShcIi4vYXRvbS9zdGF0dXMtYmFyXCIpO1xuICAgICAgICBmLnN0YXR1c0Jhci5zZXR1cChzdGF0dXNCYXIpO1xuICAgICAgICBmID0gcmVxdWlyZShcIi4vYXRvbS9mcmFtZXdvcmstc2VsZWN0b3JcIik7XG4gICAgICAgIGYuZnJhbWV3b3JrU2VsZWN0b3Iuc2V0dXAoc3RhdHVzQmFyKTtcbiAgICAgICAgZiA9IHJlcXVpcmUoXCIuL2F0b20vZmVhdHVyZS1idXR0b25zXCIpO1xuICAgICAgICBmLmZlYXR1cmVFZGl0b3JCdXR0b25zLnNldHVwKHN0YXR1c0Jhcik7XG4gICAgfVxuICAgIGNvbnN1bWVZZW9tYW5FbnZpcm9ubWVudChnZW5lcmF0b3JTZXJ2aWNlKSB7XG4gICAgICAgIGNvbnN0IHsgZ2VuZXJhdG9yQXNwbmV0IH0gPSByZXF1aXJlKFwiLi9hdG9tL2dlbmVyYXRvci1hc3BuZXRcIik7XG4gICAgICAgIGdlbmVyYXRvckFzcG5ldC5zZXR1cChnZW5lcmF0b3JTZXJ2aWNlKTtcbiAgICB9XG4gICAgcHJvdmlkZUF1dG9jb21wbGV0ZSgpIHtcbiAgICAgICAgcmV0dXJuIHJlcXVpcmUoXCIuL3NlcnZpY2VzL2NvbXBsZXRpb24tcHJvdmlkZXJcIik7XG4gICAgfVxuICAgIHByb3ZpZGVMaW50ZXIoKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgcHJvdmlkZVByb2plY3RKc29uKCkge1xuICAgICAgICByZXR1cm4gcmVxdWlyZShcIi4vc2VydmljZXMvcHJvamVjdC1wcm92aWRlclwiKS5jb25jYXQocmVxdWlyZShcIi4vc2VydmljZXMvZnJhbWV3b3JrLXByb3ZpZGVyXCIpKTtcbiAgICB9XG4gICAgY29uc3VtZUxpbnRlcihsaW50ZXIpIHtcbiAgICAgICAgY29uc3QgTGludGVyUHJvdmlkZXIgPSByZXF1aXJlKFwiLi9zZXJ2aWNlcy9saW50ZXItcHJvdmlkZXJcIik7XG4gICAgICAgIGNvbnN0IGxpbnRlcnMgPSBMaW50ZXJQcm92aWRlci5wcm92aWRlcjtcbiAgICAgICAgdGhpcy5kaXNwb3NhYmxlLmFkZChEaXNwb3NhYmxlLmNyZWF0ZSgoKSA9PiB7XG4gICAgICAgICAgICBfLmVhY2gobGludGVycywgbCA9PiB7XG4gICAgICAgICAgICAgICAgbGludGVyLmRlbGV0ZUxpbnRlcihsKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KSk7XG4gICAgICAgIHRoaXMuZGlzcG9zYWJsZS5hZGQoTGludGVyUHJvdmlkZXIuaW5pdChsaW50ZXIpKTtcbiAgICB9XG4gICAgY29uc3VtZUluZGllTGludGVyKGxpbnRlcikge1xuICAgICAgICByZXF1aXJlKFwiLi9zZXJ2aWNlcy9saW50ZXItcHJvdmlkZXJcIikucmVnaXN0ZXJJbmRpZShsaW50ZXIsIHRoaXMuZGlzcG9zYWJsZSk7XG4gICAgfVxuICAgIGNvbmZpZ3VyZUtleWJpbmRpbmdzKCkge1xuICAgICAgICBsZXQgZGlzcG9zYWJsZTtcbiAgICAgICAgY29uc3Qgb21uaXNoYXJwQWR2YW5jZWRGaWxlTmV3ID0gT21uaS5wYWNrYWdlRGlyICsgXCIvb21uaXNoYXJwLWF0b20va2V5bWFwcy9vbW5pc2hhcnAtZmlsZS1uZXcuY3NvblwiO1xuICAgICAgICB0aGlzLmRpc3Bvc2FibGUuYWRkKGF0b20uY29uZmlnLm9ic2VydmUoXCJvbW5pc2hhcnAtYXRvbS5lbmFibGVBZHZhbmNlZEZpbGVOZXdcIiwgKGVuYWJsZWQpID0+IHtcbiAgICAgICAgICAgIGlmIChlbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgZGlzcG9zYWJsZSA9IGF0b20ua2V5bWFwcy5sb2FkS2V5bWFwKG9tbmlzaGFycEFkdmFuY2VkRmlsZU5ldyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoZGlzcG9zYWJsZSlcbiAgICAgICAgICAgICAgICAgICAgZGlzcG9zYWJsZS5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgYXRvbS5rZXltYXBzLnJlbW92ZUJpbmRpbmdzRnJvbVNvdXJjZShvbW5pc2hhcnBBZHZhbmNlZEZpbGVOZXcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSk7XG4gICAgfVxufVxubW9kdWxlLmV4cG9ydHMgPSBuZXcgT21uaVNoYXJwQXRvbTtcbiIsImltcG9ydCBfIGZyb20gXCJsb2Rhc2hcIjtcclxuaW1wb3J0IHtPYnNlcnZhYmxlLCBBc3luY1N1YmplY3R9IGZyb20gXCJyeGpzXCI7XHJcbmltcG9ydCB7Q29tcG9zaXRlRGlzcG9zYWJsZSwgRGlzcG9zYWJsZSwgSURpc3Bvc2FibGV9IGZyb20gXCJvbW5pc2hhcnAtY2xpZW50XCI7XHJcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCBmcyBmcm9tIFwiZnNcIjtcclxuaW1wb3J0IG5wbSBmcm9tIFwibnBtXCI7XHJcblxyXG4vLyBUT0RPOiBSZW1vdmUgdGhlc2UgYXQgc29tZSBwb2ludCB0byBzdHJlYW0gbGluZSBzdGFydHVwLlxyXG5pbXBvcnQge09tbml9IGZyb20gXCIuL3NlcnZlci9vbW5pXCI7XHJcbmNvbnN0IHdpbjMyID0gcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gXCJ3aW4zMlwiO1xyXG5cclxuY2xhc3MgT21uaVNoYXJwQXRvbSB7XHJcbiAgICBwcml2YXRlIGRpc3Bvc2FibGU6IENvbXBvc2l0ZURpc3Bvc2FibGU7XHJcbiAgICAvLyBJbnRlcm5hbDogVXNlZCBieSB1bml0IHRlc3RpbmcgdG8gbWFrZSBzdXJlIHRoZSBwbHVnaW4gaXMgY29tcGxldGVseSBhY3RpdmF0ZWQuXHJcbiAgICBwcml2YXRlIF9zdGFydGVkOiBBc3luY1N1YmplY3Q8Ym9vbGVhbj47XHJcbiAgICBwcml2YXRlIF9hY3RpdmF0ZWQ6IEFzeW5jU3ViamVjdDxib29sZWFuPjtcclxuXHJcbiAgICBwdWJsaWMgYWN0aXZhdGUoc3RhdGU6IGFueSkge1xyXG4gICAgICAgIHRoaXMuZGlzcG9zYWJsZSA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlO1xyXG4gICAgICAgIHRoaXMuX3N0YXJ0ZWQgPSBuZXcgQXN5bmNTdWJqZWN0PGJvb2xlYW4+KCk7XHJcbiAgICAgICAgdGhpcy5fYWN0aXZhdGVkID0gbmV3IEFzeW5jU3ViamVjdDxib29sZWFuPigpO1xyXG5cclxuICAgICAgICB0aGlzLmNvbmZpZ3VyZUtleWJpbmRpbmdzKCk7XHJcblxyXG4gICAgICAgIHRoaXMuZGlzcG9zYWJsZS5hZGQoYXRvbS5jb21tYW5kcy5hZGQoXCJhdG9tLXdvcmtzcGFjZVwiLCBcIm9tbmlzaGFycC1hdG9tOnRvZ2dsZVwiLCAoKSA9PiB0aGlzLnRvZ2dsZSgpKSk7XHJcbiAgICAgICAgdGhpcy5kaXNwb3NhYmxlLmFkZChhdG9tLmNvbW1hbmRzLmFkZChcImF0b20td29ya3NwYWNlXCIsIFwib21uaXNoYXJwLWF0b206Zml4LXVzaW5nc1wiLCAoKSA9PiBPbW5pLnJlcXVlc3Qoc29sdXRpb24gPT4gc29sdXRpb24uZml4dXNpbmdzKHt9KSkpKTtcclxuICAgICAgICB0aGlzLmRpc3Bvc2FibGUuYWRkKGF0b20uY29tbWFuZHMuYWRkKFwiYXRvbS13b3Jrc3BhY2VcIiwgXCJvbW5pc2hhcnAtYXRvbTpzZXR0aW5nc1wiLCAoKSA9PiBhdG9tLndvcmtzcGFjZS5vcGVuKFwiYXRvbTovL2NvbmZpZy9wYWNrYWdlc1wiKVxyXG4gICAgICAgICAgICAudGhlbih0YWIgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRhYiAmJiB0YWIuZ2V0VVJJICYmIHRhYi5nZXRVUkkoKSAhPT0gXCJhdG9tOi8vY29uZmlnL3BhY2thZ2VzL29tbmlzaGFycC1hdG9tXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICBhdG9tLndvcmtzcGFjZS5vcGVuKFwiYXRvbTovL2NvbmZpZy9wYWNrYWdlcy9vbW5pc2hhcnAtYXRvbVwiKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSkpKTtcclxuXHJcbiAgICAgICAgY29uc3QgZ3JhbW1hcnMgPSAoPGFueT5hdG9tLmdyYW1tYXJzKTtcclxuICAgICAgICBjb25zdCBncmFtbWFyQ2IgPSAoZ3JhbW1hcjogeyBzY29wZU5hbWU6IHN0cmluZzsgfSkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoXy5maW5kKE9tbmkuZ3JhbW1hcnMsIChnbXI6IGFueSkgPT4gZ21yLnNjb3BlTmFtZSA9PT0gZ3JhbW1hci5zY29wZU5hbWUpKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBlbnN1cmUgdGhlIHNjb3BlIGhhcyBiZWVuIGluaXRlZFxyXG4gICAgICAgICAgICAgICAgYXRvbS5ncmFtbWFycy5zdGFydElkRm9yU2NvcGUoZ3JhbW1hci5zY29wZU5hbWUpO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IG9tbmlzaGFycFNjb3BlTmFtZSA9IGAke2dyYW1tYXIuc2NvcGVOYW1lfS5vbW5pc2hhcnBgO1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc2NvcGVJZCA9IGdyYW1tYXJzLmlkc0J5U2NvcGVbZ3JhbW1hci5zY29wZU5hbWVdO1xyXG4gICAgICAgICAgICAgICAgZ3JhbW1hcnMuaWRzQnlTY29wZVtvbW5pc2hhcnBTY29wZU5hbWVdID0gc2NvcGVJZDtcclxuICAgICAgICAgICAgICAgIGdyYW1tYXJzLnNjb3Blc0J5SWRbc2NvcGVJZF0gPSBvbW5pc2hhcnBTY29wZU5hbWU7XHJcbiAgICAgICAgICAgICAgICBncmFtbWFyLnNjb3BlTmFtZSA9IG9tbmlzaGFycFNjb3BlTmFtZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgXy5lYWNoKGdyYW1tYXJzLmdyYW1tYXJzLCBncmFtbWFyQ2IpO1xyXG4gICAgICAgIHRoaXMuZGlzcG9zYWJsZS5hZGQoYXRvbS5ncmFtbWFycy5vbkRpZEFkZEdyYW1tYXIoZ3JhbW1hckNiKSk7XHJcblxyXG4gICAgICAgIGNvbnN0IGN1cnJlbnRSb290ID0gcHJvY2Vzcy5jd2QoKTtcclxuICAgICAgICBjb25zdCBucG1Sb290ID0gYCR7T21uaS5wYWNrYWdlRGlyfS9vbW5pc2hhcnAtYXRvbWA7XHJcbiAgICAgICAgY29uc3QgZ2VuZXJhdG9yQXNwbmV0ID0gYCR7bnBtUm9vdH0vbm9kZV9tb2R1bGVzL2dlbmVyYXRvci1hc3BuZXRgO1xyXG5cclxuICAgICAgICBwcm9jZXNzLmNoZGlyKG5wbVJvb3QpO1xyXG5cclxuICAgICAgICAvLyBDaGVjayBpZiBnZW5lcmF0b3ItYXNwbmV0IGlzIGluc3RhbGxlZFxyXG4gICAgICAgIC8vIGlmIG5vdCBpbnN0YWxsZWQgaW5zdGFsbFxyXG4gICAgICAgIC8vIGlmIG91dGRhdGVkIGluc3RhbGxcclxuICAgICAgICAvLyBvdGhlcndpc2UgZmluaXNoXHJcbiAgICAgICAgY29uc3Qgc2hvdWxkSW5zdGFsbEFzcG5ldEdlbmVyYXRvciA9IE9ic2VydmFibGUuYmluZENhbGxiYWNrKG5wbS5sb2FkKSgpXHJcbiAgICAgICAgICAgIC5tZXJnZU1hcCgoKSA9PiBPYnNlcnZhYmxlLmJpbmROb2RlQ2FsbGJhY2soZnMuZXhpc3RzKShnZW5lcmF0b3JBc3BuZXQpKVxyXG4gICAgICAgICAgICAuc3dpdGNoTWFwKGV4aXN0cyA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXhpc3RzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE9ic2VydmFibGUuYmluZE5vZGVDYWxsYmFjayhucG0uY29tbWFuZHMuaW5mbykoW1wiZ2VuZXJhdG9yLWFzcG5ldFwiXSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgLm1hcCh6ID0+IHoudmVyc2lvbiAhPT0gcmVxdWlyZShgJHtnZW5lcmF0b3JBc3BuZXR9L3BhY2thZ2UuanNvbmApKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE9ic2VydmFibGUub2YodHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5zd2l0Y2hNYXAoeCA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoeCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBPYnNlcnZhYmxlLmJpbmROb2RlQ2FsbGJhY2sobnBtLmNvbW1hbmRzLmluc3RhbGwpKFtcImdlbmVyYXRvci1hc3BuZXRcIl0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5kbygoKSA9PiBwcm9jZXNzLmNoZGlyKGN1cnJlbnRSb290KSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gT2JzZXJ2YWJsZS5vZih1bmRlZmluZWQpO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAudG9Qcm9taXNlKCk7XHJcblxyXG4gICAgICAgIFByb21pc2UuYWxsKFtcclxuICAgICAgICAgICAgc2hvdWxkSW5zdGFsbEFzcG5ldEdlbmVyYXRvcixcclxuICAgICAgICAgICAgcmVxdWlyZShcImF0b20tcGFja2FnZS1kZXBzXCIpLmluc3RhbGwoXCJvbW5pc2hhcnAtYXRvbVwiKVxyXG4gICAgICAgIF0pLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmluZm8oXCJBY3RpdmF0aW5nIG9tbmlzaGFycC1hdG9tIHNvbHV0aW9uIHRyYWNraW5nLi4uXCIpO1xyXG4gICAgICAgICAgICBPbW5pLmFjdGl2YXRlKCk7XHJcbiAgICAgICAgICAgIHRoaXMuZGlzcG9zYWJsZS5hZGQoT21uaSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLl9zdGFydGVkLm5leHQodHJ1ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuX3N0YXJ0ZWQuY29tcGxldGUoKTtcclxuICAgICAgICB9KVxyXG4gICAgICAgICAgICAvKiB0c2xpbnQ6ZGlzYWJsZTpuby1zdHJpbmctbGl0ZXJhbCAqL1xyXG4gICAgICAgICAgICAudGhlbigoKSA9PiB0aGlzLmxvYWRGZWF0dXJlcyh0aGlzLmdldEZlYXR1cmVzKFwiYXRvbVwiKS5kZWxheShPbW5pW1wiX2tpY2tfaW5fdGhlX3BhbnRzX1wiXSA/IDAgOiAyMDAwKSkudG9Qcm9taXNlKCkpXHJcbiAgICAgICAgICAgIC8qIHRzbGludDplbmFibGU6bm8tc3RyaW5nLWxpdGVyYWwgKi9cclxuICAgICAgICAgICAgLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IHN0YXJ0aW5nT2JzZXJ2YWJsZSA9IE9tbmkuYWN0aXZlU29sdXRpb25cclxuICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKHogPT4gISF6KVxyXG4gICAgICAgICAgICAgICAgICAgIC50YWtlKDEpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8qIHRzbGludDpkaXNhYmxlOm5vLXN0cmluZy1saXRlcmFsICovXHJcbiAgICAgICAgICAgICAgICBpZiAoT21uaVtcIl9raWNrX2luX3RoZV9wYW50c19cIl0pIHtcclxuICAgICAgICAgICAgICAgICAgICBzdGFydGluZ09ic2VydmFibGUgPSBPYnNlcnZhYmxlLm9mKG51bGwpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLyogdHNsaW50OmRpc2FibGU6bm8tc3RyaW5nLWxpdGVyYWwgKi9cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBPbmx5IGFjdGl2YXRlIGZlYXR1cmVzIG9uY2Ugd2UgaGF2ZSBhIHNvbHV0aW9uIVxyXG4gICAgICAgICAgICAgICAgdGhpcy5kaXNwb3NhYmxlLmFkZChzdGFydGluZ09ic2VydmFibGVcclxuICAgICAgICAgICAgICAgICAgICAuZmxhdE1hcCgoKSA9PiB0aGlzLmxvYWRGZWF0dXJlcyh0aGlzLmdldEZlYXR1cmVzKFwiZmVhdHVyZXNcIikpKVxyXG4gICAgICAgICAgICAgICAgICAgIC5zdWJzY3JpYmUoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZTogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kaXNwb3NhYmxlLmFkZChhdG9tLndvcmtzcGFjZS5vYnNlcnZlVGV4dEVkaXRvcnMoKGVkaXRvcjogQXRvbS5UZXh0RWRpdG9yKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kZXRlY3RBdXRvVG9nZ2xlR3JhbW1hcihlZGl0b3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2FjdGl2YXRlZC5uZXh0KHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fYWN0aXZhdGVkLmNvbXBsZXRlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KSk7XHJcblxyXG4gICAgICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0RmVhdHVyZXMoZm9sZGVyOiBzdHJpbmcpIHtcclxuICAgICAgICBjb25zdCB3aGl0ZUxpc3QgPSBhdG9tLmNvbmZpZy5nZXQ8Ym9vbGVhbj4oXCJvbW5pc2hhcnAtYXRvbTpmZWF0dXJlLXdoaXRlLWxpc3RcIik7XHJcbiAgICAgICAgY29uc3QgZmVhdHVyZUxpc3QgPSBhdG9tLmNvbmZpZy5nZXQ8c3RyaW5nW10+KFwib21uaXNoYXJwLWF0b206ZmVhdHVyZS1saXN0XCIpO1xyXG4gICAgICAgIGNvbnN0IHdoaXRlTGlzdFVuZGVmaW5lZCA9ICh0eXBlb2Ygd2hpdGVMaXN0ID09PSBcInVuZGVmaW5lZFwiKTtcclxuXHJcbiAgICAgICAgY29uc29sZS5pbmZvKGBHZXR0aW5nIGZlYXR1cmVzIGZvciBcIiR7Zm9sZGVyfVwiLi4uYCk7XHJcblxyXG4gICAgICAgIGNvbnN0IHBhY2thZ2VEaXIgPSBPbW5pLnBhY2thZ2VEaXI7XHJcbiAgICAgICAgY29uc3QgZmVhdHVyZURpciA9IGAke3BhY2thZ2VEaXJ9L29tbmlzaGFycC1hdG9tL2xpYi8ke2ZvbGRlcn1gO1xyXG5cclxuICAgICAgICBmdW5jdGlvbiBsb2FkRmVhdHVyZShmaWxlOiBzdHJpbmcpIHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gcmVxdWlyZShgLi8ke2ZvbGRlcn0vJHtmaWxlfWApO1xyXG4gICAgICAgICAgICBjb25zb2xlLmluZm8oYExvYWRpbmcgZmVhdHVyZSBcIiR7Zm9sZGVyfS8ke2ZpbGV9XCIuLi5gKTtcclxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDsvL18udmFsdWVzKHJlc3VsdCkuZmlsdGVyKGZlYXR1cmUgPT4gIV8uaXNGdW5jdGlvbihmZWF0dXJlKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gT2JzZXJ2YWJsZS5iaW5kTm9kZUNhbGxiYWNrKGZzLnJlYWRkaXIpKGZlYXR1cmVEaXIpXHJcbiAgICAgICAgICAgIC5mbGF0TWFwKGZpbGVzID0+IGZpbGVzKVxyXG4gICAgICAgICAgICAuZmlsdGVyKGZpbGUgPT4gL1xcLmpzJC8udGVzdChmaWxlKSlcclxuICAgICAgICAgICAgLmZsYXRNYXAoZmlsZSA9PiBPYnNlcnZhYmxlLmJpbmROb2RlQ2FsbGJhY2soZnMuc3RhdCkoYCR7ZmVhdHVyZURpcn0vJHtmaWxlfWApLCAoZmlsZSwgc3RhdCkgPT4gKHsgZmlsZSwgc3RhdCB9KSlcclxuICAgICAgICAgICAgLmZpbHRlcih6ID0+ICF6LnN0YXQuaXNEaXJlY3RvcnkoKSlcclxuICAgICAgICAgICAgLm1hcCh6ID0+ICh7XHJcbiAgICAgICAgICAgICAgICBmaWxlOiBgJHtmb2xkZXJ9LyR7cGF0aC5iYXNlbmFtZSh6LmZpbGUpfWAucmVwbGFjZSgvXFwuanMkLywgXCJcIiksXHJcbiAgICAgICAgICAgICAgICBsb2FkOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmVhdHVyZSA9IGxvYWRGZWF0dXJlKHouZmlsZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZlYXR1cmVzOiB7IGtleTogc3RyaW5nLCBhY3RpdmF0ZTogKCkgPT4gKCkgPT4gdm9pZCB9W10gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICBfLmVhY2goZmVhdHVyZSwgKHZhbHVlOiBJRmVhdHVyZSwga2V5OiBzdHJpbmcpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFfLmlzRnVuY3Rpb24odmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXZhbHVlLnJlcXVpcmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25maWdba2V5XSA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IGAke3ZhbHVlLnRpdGxlfWAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB2YWx1ZS5kZXNjcmlwdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJib29sZWFuXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IChfLmhhcyh2YWx1ZSwgXCJkZWZhdWx0XCIpID8gdmFsdWUuZGVmYXVsdCA6IHRydWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmZWF0dXJlcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXksIGFjdGl2YXRlOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmFjdGl2YXRlRmVhdHVyZSh3aGl0ZUxpc3RVbmRlZmluZWQsIGtleSwgdmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBPYnNlcnZhYmxlLmZyb208eyBrZXk6IHN0cmluZywgYWN0aXZhdGU6ICgpID0+ICgpID0+IHZvaWQgfT4oZmVhdHVyZXMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KSlcclxuICAgICAgICAgICAgLmZpbHRlcihsID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygd2hpdGVMaXN0ID09PSBcInVuZGVmaW5lZFwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHdoaXRlTGlzdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfLmluY2x1ZGVzKGZlYXR1cmVMaXN0LCBsLmZpbGUpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gIV8uaW5jbHVkZXMoZmVhdHVyZUxpc3QsIGwuZmlsZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBsb2FkRmVhdHVyZXMoZmVhdHVyZXM6IE9ic2VydmFibGU8eyBmaWxlOiBzdHJpbmc7IGxvYWQ6ICgpID0+IE9ic2VydmFibGU8eyBrZXk6IHN0cmluZywgYWN0aXZhdGU6ICgpID0+ICgpID0+IHZvaWQgfT4gfT4pIHtcclxuICAgICAgICByZXR1cm4gZmVhdHVyZXNcclxuICAgICAgICAgICAgLmNvbmNhdE1hcCh6ID0+IHoubG9hZCgpKVxyXG4gICAgICAgICAgICAudG9BcnJheSgpXHJcbiAgICAgICAgICAgIC5jb25jYXRNYXAoeCA9PiB4KVxyXG4gICAgICAgICAgICAubWFwKGYgPT4gZi5hY3RpdmF0ZSgpKVxyXG4gICAgICAgICAgICAuZmlsdGVyKHggPT4gISF4KVxyXG4gICAgICAgICAgICAudG9BcnJheSgpXHJcbiAgICAgICAgICAgIC5kbyh7XHJcbiAgICAgICAgICAgICAgICBjb21wbGV0ZTogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICg8YW55PmF0b20uY29uZmlnKS5zZXRTY2hlbWEoXCJvbW5pc2hhcnAtYXRvbVwiLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHRoaXMuY29uZmlnXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5jb25jYXRNYXAoeCA9PiB4KVxyXG4gICAgICAgICAgICAuZG8oeCA9PiB4KCkpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBhY3RpdmF0ZUZlYXR1cmUod2hpdGVMaXN0VW5kZWZpbmVkOiBib29sZWFuLCBrZXk6IHN0cmluZywgdmFsdWU6IElGZWF0dXJlKSB7XHJcbiAgICAgICAgbGV0IHJlc3VsdDogKCkgPT4gdm9pZCA9IG51bGw7XHJcbiAgICAgICAgbGV0IGZpcnN0UnVuID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgLy8gV2hpdGVsaXN0IGlzIHVzZWQgZm9yIHVuaXQgdGVzdGluZywgd2UgZG9uXCJ0IHdhbnQgdGhlIGNvbmZpZyB0byBtYWtlIGNoYW5nZXMgaGVyZVxyXG4gICAgICAgIGlmICh3aGl0ZUxpc3RVbmRlZmluZWQgJiYgXy5oYXModGhpcy5jb25maWcsIGtleSkpIHtcclxuICAgICAgICAgICAgY29uc3QgY29uZmlnS2V5ID0gYG9tbmlzaGFycC1hdG9tLiR7a2V5fWA7XHJcbiAgICAgICAgICAgIGxldCBlbmFibGVEaXNwb3NhYmxlOiBJRGlzcG9zYWJsZSwgZGlzYWJsZURpc3Bvc2FibGU6IElEaXNwb3NhYmxlO1xyXG4gICAgICAgICAgICB0aGlzLmRpc3Bvc2FibGUuYWRkKGF0b20uY29uZmlnLm9ic2VydmUoY29uZmlnS2V5LCBlbmFibGVkID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICghZW5hYmxlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkaXNhYmxlRGlzcG9zYWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxlRGlzcG9zYWJsZS5kaXNwb3NlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGlzcG9zYWJsZS5yZW1vdmUoZGlzYWJsZURpc3Bvc2FibGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxlRGlzcG9zYWJsZSA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB0cnkgeyB2YWx1ZS5kaXNwb3NlKCk7IH0gY2F0Y2ggKGV4KSB7IC8qICovIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlRGlzcG9zYWJsZSA9IGF0b20uY29tbWFuZHMuYWRkKFwiYXRvbS13b3Jrc3BhY2VcIiwgYG9tbmlzaGFycC1mZWF0dXJlOmVuYWJsZS0ke18ua2ViYWJDYXNlKGtleSl9YCwgKCkgPT4gYXRvbS5jb25maWcuc2V0KGNvbmZpZ0tleSwgdHJ1ZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGlzcG9zYWJsZS5hZGQoZW5hYmxlRGlzcG9zYWJsZSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChlbmFibGVEaXNwb3NhYmxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZURpc3Bvc2FibGUuZGlzcG9zZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRpc3Bvc2FibGUucmVtb3ZlKGRpc2FibGVEaXNwb3NhYmxlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlRGlzcG9zYWJsZSA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oYEFjdGl2YXRpbmcgZmVhdHVyZSBcIiR7a2V5fVwiLi4uYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUuYWN0aXZhdGUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF8uaXNGdW5jdGlvbih2YWx1ZVtcImF0dGFjaFwiXSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpcnN0UnVuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKGBBdHRhY2hpbmcgZmVhdHVyZSBcIiR7a2V5fVwiLi4uYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVbXCJhdHRhY2hcIl0oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oYEF0dGFjaGluZyBmZWF0dXJlIFwiJHtrZXl9XCIuLi5gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlW1wiYXR0YWNoXCJdKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGRpc2FibGVEaXNwb3NhYmxlID0gYXRvbS5jb21tYW5kcy5hZGQoXCJhdG9tLXdvcmtzcGFjZVwiLCBgb21uaXNoYXJwLWZlYXR1cmU6ZGlzYWJsZS0ke18ua2ViYWJDYXNlKGtleSl9YCwgKCkgPT4gYXRvbS5jb25maWcuc2V0KGNvbmZpZ0tleSwgZmFsc2UpKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRpc3Bvc2FibGUuYWRkKGRpc2FibGVEaXNwb3NhYmxlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGZpcnN0UnVuID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH0pKTtcclxuXHJcblxyXG4gICAgICAgICAgICB0aGlzLmRpc3Bvc2FibGUuYWRkKGF0b20uY29tbWFuZHMuYWRkKFwiYXRvbS13b3Jrc3BhY2VcIiwgYG9tbmlzaGFycC1mZWF0dXJlOnRvZ2dsZS0ke18ua2ViYWJDYXNlKGtleSl9YCwgKCkgPT4gYXRvbS5jb25maWcuc2V0KGNvbmZpZ0tleSwgIWF0b20uY29uZmlnLmdldChjb25maWdLZXkpKSkpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHZhbHVlLmFjdGl2YXRlKCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKHZhbHVlW1wiYXR0YWNoXCJdKSkge1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhgQXR0YWNoaW5nIGZlYXR1cmUgXCIke2tleX1cIi4uLmApO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlW1wiYXR0YWNoXCJdKCk7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmRpc3Bvc2FibGUuYWRkKERpc3Bvc2FibGUuY3JlYXRlKCgpID0+IHsgdHJ5IHsgdmFsdWUuZGlzcG9zZSgpOyB9IGNhdGNoIChleCkgeyAvKiAqLyB9IH0pKTtcclxuICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZGV0ZWN0QXV0b1RvZ2dsZUdyYW1tYXIoZWRpdG9yOiBBdG9tLlRleHRFZGl0b3IpIHtcclxuICAgICAgICBjb25zdCBncmFtbWFyID0gZWRpdG9yLmdldEdyYW1tYXIoKTtcclxuICAgICAgICB0aGlzLmRldGVjdEdyYW1tYXIoZWRpdG9yLCBncmFtbWFyKTtcclxuICAgICAgICB0aGlzLmRpc3Bvc2FibGUuYWRkKGVkaXRvci5vbkRpZENoYW5nZUdyYW1tYXIoKGdtcjogRmlyc3RNYXRlLkdyYW1tYXIpID0+IHRoaXMuZGV0ZWN0R3JhbW1hcihlZGl0b3IsIGdtcikpKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGRldGVjdEdyYW1tYXIoZWRpdG9yOiBBdG9tLlRleHRFZGl0b3IsIGdyYW1tYXI6IEZpcnN0TWF0ZS5HcmFtbWFyKSB7XHJcbiAgICAgICAgaWYgKCFhdG9tLmNvbmZpZy5nZXQoXCJvbW5pc2hhcnAtYXRvbS5hdXRvU3RhcnRPbkNvbXBhdGlibGVGaWxlXCIpKSB7XHJcbiAgICAgICAgICAgIHJldHVybjsgLy9zaG9ydCBvdXQsIGlmIHNldHRpbmcgdG8gbm90IGF1dG8gc3RhcnQgaXMgZW5hYmxlZFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKE9tbmkuaXNWYWxpZEdyYW1tYXIoZ3JhbW1hcikpIHtcclxuICAgICAgICAgICAgaWYgKE9tbmkuaXNPZmYpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudG9nZ2xlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2UgaWYgKGdyYW1tYXIubmFtZSA9PT0gXCJKU09OXCIpIHtcclxuICAgICAgICAgICAgaWYgKHBhdGguYmFzZW5hbWUoZWRpdG9yLmdldFBhdGgoKSkgPT09IFwicHJvamVjdC5qc29uXCIpIHtcclxuICAgICAgICAgICAgICAgIGlmIChPbW5pLmlzT2ZmKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50b2dnbGUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgdG9nZ2xlKCkge1xyXG4gICAgICAgIGlmIChPbW5pLmlzT2ZmKSB7XHJcbiAgICAgICAgICAgIE9tbmkuY29ubmVjdCgpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoT21uaS5pc09uKSB7XHJcbiAgICAgICAgICAgIE9tbmkuZGlzY29ubmVjdCgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZGVhY3RpdmF0ZSgpIHtcclxuICAgICAgICB0aGlzLmRpc3Bvc2FibGUuZGlzcG9zZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBjb25zdW1lU3RhdHVzQmFyKHN0YXR1c0JhcjogYW55KSB7XHJcbiAgICAgICAgbGV0IGYgPSByZXF1aXJlKFwiLi9hdG9tL3N0YXR1cy1iYXJcIik7XHJcbiAgICAgICAgZi5zdGF0dXNCYXIuc2V0dXAoc3RhdHVzQmFyKTtcclxuICAgICAgICBmID0gcmVxdWlyZShcIi4vYXRvbS9mcmFtZXdvcmstc2VsZWN0b3JcIik7XHJcbiAgICAgICAgZi5mcmFtZXdvcmtTZWxlY3Rvci5zZXR1cChzdGF0dXNCYXIpO1xyXG4gICAgICAgIGYgPSByZXF1aXJlKFwiLi9hdG9tL2ZlYXR1cmUtYnV0dG9uc1wiKTtcclxuICAgICAgICBmLmZlYXR1cmVFZGl0b3JCdXR0b25zLnNldHVwKHN0YXR1c0Jhcik7XHJcbiAgICB9XHJcblxyXG4gICAgLyogdHNsaW50OmRpc2FibGU6dmFyaWFibGUtbmFtZSAqL1xyXG4gICAgcHVibGljIGNvbnN1bWVZZW9tYW5FbnZpcm9ubWVudChnZW5lcmF0b3JTZXJ2aWNlOiBhbnkpIHtcclxuICAgICAgICBjb25zdCB7Z2VuZXJhdG9yQXNwbmV0fSA9IHJlcXVpcmUoXCIuL2F0b20vZ2VuZXJhdG9yLWFzcG5ldFwiKTtcclxuICAgICAgICBnZW5lcmF0b3JBc3BuZXQuc2V0dXAoZ2VuZXJhdG9yU2VydmljZSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHByb3ZpZGVBdXRvY29tcGxldGUoKSB7XHJcbiAgICAgICAgcmV0dXJuIHJlcXVpcmUoXCIuL3NlcnZpY2VzL2NvbXBsZXRpb24tcHJvdmlkZXJcIik7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHByb3ZpZGVMaW50ZXIoKTogYW55W10ge1xyXG4gICAgICAgIHJldHVybiBbXTtcclxuICAgICAgICAvL2NvbnN0IExpbnRlclByb3ZpZGVyID0gcmVxdWlyZShcIi4vc2VydmljZXMvbGludGVyLXByb3ZpZGVyXCIpO1xyXG4gICAgICAgIC8vcmV0dXJuIExpbnRlclByb3ZpZGVyLnByb3ZpZGVyO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBwcm92aWRlUHJvamVjdEpzb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIHJlcXVpcmUoXCIuL3NlcnZpY2VzL3Byb2plY3QtcHJvdmlkZXJcIikuY29uY2F0KHJlcXVpcmUoXCIuL3NlcnZpY2VzL2ZyYW1ld29yay1wcm92aWRlclwiKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGNvbnN1bWVMaW50ZXIobGludGVyOiBhbnkpIHtcclxuICAgICAgICBjb25zdCBMaW50ZXJQcm92aWRlciA9IHJlcXVpcmUoXCIuL3NlcnZpY2VzL2xpbnRlci1wcm92aWRlclwiKTtcclxuICAgICAgICBjb25zdCBsaW50ZXJzID0gTGludGVyUHJvdmlkZXIucHJvdmlkZXI7XHJcblxyXG4gICAgICAgIHRoaXMuZGlzcG9zYWJsZS5hZGQoRGlzcG9zYWJsZS5jcmVhdGUoKCkgPT4ge1xyXG4gICAgICAgICAgICBfLmVhY2gobGludGVycywgbCA9PiB7XHJcbiAgICAgICAgICAgICAgICBsaW50ZXIuZGVsZXRlTGludGVyKGwpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KSk7XHJcblxyXG4gICAgICAgIHRoaXMuZGlzcG9zYWJsZS5hZGQoTGludGVyUHJvdmlkZXIuaW5pdChsaW50ZXIpKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgY29uc3VtZUluZGllTGludGVyKGxpbnRlcjogYW55KSB7XHJcbiAgICAgICAgcmVxdWlyZShcIi4vc2VydmljZXMvbGludGVyLXByb3ZpZGVyXCIpLnJlZ2lzdGVySW5kaWUobGludGVyLCB0aGlzLmRpc3Bvc2FibGUpO1xyXG4gICAgfVxyXG4gICAgLyogdHNsaW50OmVuYWJsZTp2YXJpYWJsZS1uYW1lICovXHJcblxyXG4gICAgcHJpdmF0ZSBjb25maWd1cmVLZXliaW5kaW5ncygpIHtcclxuICAgICAgICBsZXQgZGlzcG9zYWJsZTogRXZlbnRLaXQuRGlzcG9zYWJsZTtcclxuICAgICAgICBjb25zdCBvbW5pc2hhcnBBZHZhbmNlZEZpbGVOZXcgPSBPbW5pLnBhY2thZ2VEaXIgKyBcIi9vbW5pc2hhcnAtYXRvbS9rZXltYXBzL29tbmlzaGFycC1maWxlLW5ldy5jc29uXCI7XHJcbiAgICAgICAgdGhpcy5kaXNwb3NhYmxlLmFkZChhdG9tLmNvbmZpZy5vYnNlcnZlKFwib21uaXNoYXJwLWF0b20uZW5hYmxlQWR2YW5jZWRGaWxlTmV3XCIsIChlbmFibGVkOiBib29sZWFuKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChlbmFibGVkKSB7XHJcbiAgICAgICAgICAgICAgICBkaXNwb3NhYmxlID0gYXRvbS5rZXltYXBzLmxvYWRLZXltYXAob21uaXNoYXJwQWR2YW5jZWRGaWxlTmV3KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmIChkaXNwb3NhYmxlKSBkaXNwb3NhYmxlLmRpc3Bvc2UoKTtcclxuICAgICAgICAgICAgICAgIGF0b20ua2V5bWFwcy5yZW1vdmVCaW5kaW5nc0Zyb21Tb3VyY2Uob21uaXNoYXJwQWR2YW5jZWRGaWxlTmV3KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgY29uZmlnID0ge1xyXG4gICAgICAgIGF1dG9TdGFydE9uQ29tcGF0aWJsZUZpbGU6IHtcclxuICAgICAgICAgICAgdGl0bGU6IFwiQXV0b3N0YXJ0IE9tbmlzaGFycCBSb3NseW5cIixcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiQXV0b21hdGljYWxseSBzdGFydHMgT21uaXNoYXJwIFJvc2x5biB3aGVuIGEgY29tcGF0aWJsZSBmaWxlIGlzIG9wZW5lZC5cIixcclxuICAgICAgICAgICAgdHlwZTogXCJib29sZWFuXCIsXHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IHRydWVcclxuICAgICAgICB9LFxyXG4gICAgICAgIGRldmVsb3Blck1vZGU6IHtcclxuICAgICAgICAgICAgdGl0bGU6IFwiRGV2ZWxvcGVyIE1vZGVcIixcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiT3V0cHV0cyBkZXRhaWxlZCBzZXJ2ZXIgY2FsbHMgaW4gY29uc29sZS5sb2dcIixcclxuICAgICAgICAgICAgdHlwZTogXCJib29sZWFuXCIsXHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzaG93RGlhZ25vc3RpY3NGb3JBbGxTb2x1dGlvbnM6IHtcclxuICAgICAgICAgICAgdGl0bGU6IFwiU2hvdyBEaWFnbm9zdGljcyBmb3IgYWxsIFNvbHV0aW9uc1wiLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJBZHZhbmNlZDogVGhpcyB3aWxsIHNob3cgZGlhZ25vc3RpY3MgZm9yIGFsbCBvcGVuIHNvbHV0aW9ucy4gIE5PVEU6IE1heSB0YWtlIGEgcmVzdGFydCBvciBjaGFuZ2UgdG8gZWFjaCBzZXJ2ZXIgdG8gdGFrZSBlZmZlY3Qgd2hlbiB0dXJuZWQgb24uXCIsXHJcbiAgICAgICAgICAgIHR5cGU6IFwiYm9vbGVhblwiLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZW5hYmxlQWR2YW5jZWRGaWxlTmV3OiB7XHJcbiAgICAgICAgICAgIHRpdGxlOiBcIkVuYWJsZSBgQWR2YW5jZWQgRmlsZSBOZXdgXCIsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkVuYWJsZSBgQWR2YW5jZWQgRmlsZSBOZXdgIHdoZW4gZG9pbmcgY3RybC1uL2NtZC1uIHdpdGhpbiBhIEMjIGVkaXRvci5cIixcclxuICAgICAgICAgICAgdHlwZTogXCJib29sZWFuXCIsXHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXHJcbiAgICAgICAgfSxcclxuICAgICAgICB1c2VMZWZ0TGFiZWxDb2x1bW5Gb3JTdWdnZXN0aW9uczoge1xyXG4gICAgICAgICAgICB0aXRsZTogXCJVc2UgTGVmdC1MYWJlbCBjb2x1bW4gaW4gU3VnZ2VzdGlvbnNcIixcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiU2hvd3MgcmV0dXJuIHR5cGVzIGluIGEgcmlnaHQtYWxpZ25lZCBjb2x1bW4gdG8gdGhlIGxlZnQgb2YgdGhlIGNvbXBsZXRpb24gc3VnZ2VzdGlvbiB0ZXh0LlwiLFxyXG4gICAgICAgICAgICB0eXBlOiBcImJvb2xlYW5cIixcclxuICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcclxuICAgICAgICB9LFxyXG4gICAgICAgIHVzZUljb25zOiB7XHJcbiAgICAgICAgICAgIHRpdGxlOiBcIlVzZSB1bmlxdWUgaWNvbnMgZm9yIGtpbmQgaW5kaWNhdG9ycyBpbiBTdWdnZXN0aW9uc1wiLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJTaG93cyBraW5kcyB3aXRoIHVuaXF1ZSBpY29ucyByYXRoZXIgdGhhbiBhdXRvY29tcGxldGUgZGVmYXVsdCBzdHlsZXMuXCIsXHJcbiAgICAgICAgICAgIHR5cGU6IFwiYm9vbGVhblwiLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiB0cnVlXHJcbiAgICAgICAgfSxcclxuICAgICAgICBhdXRvQWRqdXN0VHJlZVZpZXc6IHtcclxuICAgICAgICAgICAgdGl0bGU6IFwiQWRqdXN0IHRoZSB0cmVlIHZpZXcgdG8gbWF0Y2ggdGhlIHNvbHV0aW9uIHJvb3QuXCIsXHJcbiAgICAgICAgICAgIGRlc2NycHRpb246IFwiVGhpcyB3aWxsIGF1dG9tYXRpY2FsbHkgYWRqdXN0IHRoZSB0cmVldmlldyB0byBiZSB0aGUgcm9vdCBvZiB0aGUgc29sdXRpb24uXCIsXHJcbiAgICAgICAgICAgIHR5cGU6IFwiYm9vbGVhblwiLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgbmFnQWRqdXN0VHJlZVZpZXc6IHtcclxuICAgICAgICAgICAgdGl0bGU6IFwiU2hvdyB0aGUgbm90aWZpY2F0aW9ucyB0byBBZGp1c3QgdGhlIHRyZWUgdmlld1wiLFxyXG4gICAgICAgICAgICB0eXBlOiBcImJvb2xlYW5cIixcclxuICAgICAgICAgICAgZGVmYXVsdDogdHJ1ZVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYXV0b0FkZEV4dGVybmFsUHJvamVjdHM6IHtcclxuICAgICAgICAgICAgdGl0bGU6IFwiQWRkIGV4dGVybmFsIHByb2plY3RzIHRvIHRoZSB0cmVlIHZpZXcuXCIsXHJcbiAgICAgICAgICAgIGRlc2NycHRpb246IFwiVGhpcyB3aWxsIGF1dG9tYXRpY2FsbHkgYWRkIGV4dGVybmFsIHNvdXJjZXMgdG8gdGhlIHRyZWUgdmlldy5cXG4gRXh0ZXJuYWwgc291cmNlcyBhcmUgYW55IHByb2plY3RzIHRoYXQgYXJlIGxvYWRlZCBvdXRzaWRlIG9mIHRoZSBzb2x1dGlvbiByb290LlwiLFxyXG4gICAgICAgICAgICB0eXBlOiBcImJvb2xlYW5cIixcclxuICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcclxuICAgICAgICB9LFxyXG4gICAgICAgIG5hZ0FkZEV4dGVybmFsUHJvamVjdHM6IHtcclxuICAgICAgICAgICAgdGl0bGU6IFwiU2hvdyB0aGUgbm90aWZpY2F0aW9ucyB0byBhZGQgb3IgcmVtb3ZlIGV4dGVybmFsIHByb2plY3RzXCIsXHJcbiAgICAgICAgICAgIHR5cGU6IFwiYm9vbGVhblwiLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiB0cnVlXHJcbiAgICAgICAgfSxcclxuICAgICAgICBoaWRlTGludGVySW50ZXJmYWNlOiB7XHJcbiAgICAgICAgICAgIHRpdGxlOiBcIkhpZGUgdGhlIGxpbnRlciBpbnRlcmZhY2Ugd2hlbiB1c2luZyBvbW5pc2hhcnAtYXRvbSBlZGl0b3JzXCIsXHJcbiAgICAgICAgICAgIHR5cGU6IFwiYm9vbGVhblwiLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiB0cnVlXHJcbiAgICAgICAgfSxcclxuICAgICAgICB3YW50TWV0YWRhdGE6IHtcclxuICAgICAgICAgICAgdGl0bGU6IFwiUmVxdWVzdCBtZXRhZGF0YSBkZWZpbml0aW9uIHdpdGggR290byBEZWZpbml0aW9uXCIsXHJcbiAgICAgICAgICAgIGRlc2NycHRpb246IFwiUmVxdWVzdCBzeW1ib2wgbWV0YWRhdGEgZnJvbSB0aGUgc2VydmVyLCB3aGVuIHVzaW5nIGdvLXRvLWRlZmluaXRpb24uICBUaGlzIGlzIGRpc2FibGVkIGJ5IGRlZmF1bHQgb24gTGludXgsIGR1ZSB0byBpc3N1ZXMgd2l0aCBSb3NseW4gb24gTW9uby5cIixcclxuICAgICAgICAgICAgdHlwZTogXCJib29sZWFuXCIsXHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IHdpbjMyXHJcbiAgICAgICAgfSxcclxuICAgICAgICBhbHRHb3RvRGVmaW5pdGlvbjoge1xyXG4gICAgICAgICAgICB0aXRsZTogXCJBbHQgR28gVG8gRGVmaW5pdGlvblwiLFxyXG4gICAgICAgICAgICBkZXNjcnB0aW9uOiBcIlVzZSB0aGUgYWx0IGtleSBpbnN0ZWFkIG9mIHRoZSBjdHJsL2NtZCBrZXkgZm9yIGdvdG8gZGVmaW50aW9uIG1vdXNlIG92ZXIuXCIsXHJcbiAgICAgICAgICAgIHR5cGU6IFwiYm9vbGVhblwiLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2hvd0hpZGRlbkRpYWdub3N0aWNzOiB7XHJcbiAgICAgICAgICAgIHRpdGxlOiBcIlNob3cgJ0hpZGRlbicgZGlhZ25vc3RpY3MgaW4gdGhlIGxpbnRlclwiLFxyXG4gICAgICAgICAgICBkZXNjcnB0aW9uOiBcIlNob3cgb3IgaGlkZSBoaWRkZW4gZGlhZ25vc3RpY3MgaW4gdGhlIGxpbnRlciwgdGhpcyBkb2VzIG5vdCBhZmZlY3QgZ3JleWluZyBvdXQgb2YgbmFtZXNwYWNlcyB0aGF0IGFyZSB1bnVzZWQuXCIsXHJcbiAgICAgICAgICAgIHR5cGU6IFwiYm9vbGVhblwiLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBuZXcgT21uaVNoYXJwQXRvbTtcclxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9