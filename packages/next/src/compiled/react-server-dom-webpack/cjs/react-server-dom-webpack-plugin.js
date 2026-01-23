/**
 * @license React
 * react-server-dom-webpack-plugin.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

'use strict';

var path = require('path');
var url = require('url');
var asyncLib = require('neo-async');
var acorn = require('acorn-loose');
var ModuleDependency = require('webpack/lib/dependencies/ModuleDependency');
var NullDependency = require('webpack/lib/dependencies/NullDependency');
var Template = require('webpack/lib/Template');
var webpack = require('webpack');

function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
}
function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;
  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
  return arr2;
}
function _createForOfIteratorHelper(o, allowArrayLike) {
  var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];
  if (!it) {
    if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
      if (it) o = it;
      var i = 0;
      var F = function () {};
      return {
        s: F,
        n: function () {
          if (i >= o.length) return {
            done: true
          };
          return {
            done: false,
            value: o[i++]
          };
        },
        e: function (e) {
          throw e;
        },
        f: F
      };
    }
    throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }
  var normalCompletion = true,
    didErr = false,
    err;
  return {
    s: function () {
      it = it.call(o);
    },
    n: function () {
      var step = it.next();
      normalCompletion = step.done;
      return step;
    },
    e: function (e) {
      didErr = true;
      err = e;
    },
    f: function () {
      try {
        if (!normalCompletion && it.return != null) it.return();
      } finally {
        if (didErr) throw err;
      }
    }
  };
}

const isArrayImpl = Array.isArray;
function isArray(a) {
  return isArrayImpl(a);
}

class ClientReferenceDependency extends ModuleDependency {
  constructor(request) {
    super(request);
  }
  get type() {
    return 'client-reference';
  }
}

// This is the module that will be used to anchor all client references to.
// I.e. it will have all the client files as async deps from this point on.
// We use the Flight client implementation because you can't get to these
// without the client runtime so it's the first time in the loading sequence
// you might want them.
const clientImportName = 'react-server-dom-webpack/client';
const clientFileName = require.resolve('../client.browser.js');
const PLUGIN_NAME = 'React Server Plugin';
class ReactFlightWebpackPlugin {
  constructor(options) {
    this.clientReferences = void 0;
    this.chunkName = void 0;
    this.clientManifestFilename = void 0;
    this.serverConsumerManifestFilename = void 0;
    if (!options || typeof options.isServer !== 'boolean') {
      throw new Error(PLUGIN_NAME + ': You must specify the isServer option as a boolean.');
    }
    if (options.isServer) {
      throw new Error('TODO: Implement the server compiler.');
    }
    if (!options.clientReferences) {
      this.clientReferences = [{
        directory: '.',
        recursive: true,
        include: /\.(js|ts|jsx|tsx)$/
      }];
    } else if (typeof options.clientReferences === 'string' || !isArray(options.clientReferences)) {
      this.clientReferences = [options.clientReferences];
    } else {
      // $FlowFixMe[incompatible-type] found when upgrading Flow
      this.clientReferences = options.clientReferences;
    }
    if (typeof options.chunkName === 'string') {
      this.chunkName = options.chunkName;
      if (!/\[(index|request)\]/.test(this.chunkName)) {
        this.chunkName += '[index]';
      }
    } else {
      this.chunkName = 'client[index]';
    }
    this.clientManifestFilename = options.clientManifestFilename || 'react-client-manifest.json';
    this.serverConsumerManifestFilename = options.serverConsumerManifestFilename || 'react-ssr-manifest.json';
  }
  apply(compiler) {
    const _this = this;
    let resolvedClientReferences;
    let clientFileNameFound = false;

    // Find all client files on the file system
    compiler.hooks.beforeCompile.tapAsync(PLUGIN_NAME, (_ref, callback) => {
      let contextModuleFactory = _ref.contextModuleFactory;
      const contextResolver = compiler.resolverFactory.get('context', {});
      const normalResolver = compiler.resolverFactory.get('normal');
      _this.resolveAllClientFiles(compiler.context, contextResolver, normalResolver, compiler.inputFileSystem, contextModuleFactory, function (err, resolvedClientRefs) {
        if (err) {
          callback(err);
          return;
        }
        resolvedClientReferences = resolvedClientRefs;
        callback();
      });
    });
    compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation, _ref2) => {
      let normalModuleFactory = _ref2.normalModuleFactory;
      compilation.dependencyFactories.set(ClientReferenceDependency, normalModuleFactory);
      compilation.dependencyTemplates.set(ClientReferenceDependency, new NullDependency.Template());

      // $FlowFixMe[missing-local-annot]
      const handler = parser => {
        // We need to add all client references as dependency of something in the graph so
        // Webpack knows which entries need to know about the relevant chunks and include the
        // map in their runtime. The things that actually resolves the dependency is the Flight
        // client runtime. So we add them as a dependency of the Flight client runtime.
        // Anything that imports the runtime will be made aware of these chunks.
        parser.hooks.program.tap(PLUGIN_NAME, () => {
          const module = parser.state.module;
          if (module.resource !== clientFileName) {
            return;
          }
          clientFileNameFound = true;
          if (resolvedClientReferences) {
            // $FlowFixMe[incompatible-use] found when upgrading Flow
            for (let i = 0; i < resolvedClientReferences.length; i++) {
              // $FlowFixMe[incompatible-use] found when upgrading Flow
              const dep = resolvedClientReferences[i];
              const chunkName = _this.chunkName.replace(/\[index\]/g, '' + i).replace(/\[request\]/g, Template.toPath(dep.userRequest));
              const block = new webpack.AsyncDependenciesBlock({
                name: chunkName
              }, null, dep.request);
              block.addDependency(dep);
              module.addBlock(block);
            }
          }
        });
      };
      normalModuleFactory.hooks.parser.for('javascript/auto').tap('HarmonyModulesPlugin', handler);
      normalModuleFactory.hooks.parser.for('javascript/esm').tap('HarmonyModulesPlugin', handler);
      normalModuleFactory.hooks.parser.for('javascript/dynamic').tap('HarmonyModulesPlugin', handler);
    });
    compiler.hooks.make.tap(PLUGIN_NAME, compilation => {
      compilation.hooks.processAssets.tap({
        name: PLUGIN_NAME,
        stage: webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT
      }, function () {
        if (clientFileNameFound === false) {
          compilation.warnings.push(new webpack.WebpackError("Client runtime at " + clientImportName + " was not found. React Server Components module map file " + _this.clientManifestFilename + " was not created."));
          return;
        }
        const configuredCrossOriginLoading = compilation.outputOptions.crossOriginLoading;
        const crossOriginMode = typeof configuredCrossOriginLoading === 'string' ? configuredCrossOriginLoading === 'use-credentials' ? configuredCrossOriginLoading : 'anonymous' : null;
        const resolvedClientFiles = new Set((resolvedClientReferences || []).map(ref => ref.request));
        const clientManifest = {};
        const moduleMap = {};
        const ssrBundleConfig = {
          moduleLoading: {
            prefix: compilation.outputOptions.publicPath || '',
            crossOrigin: crossOriginMode
          },
          moduleMap
        };

        // We figure out which files are always loaded by any initial chunk (entrypoint).
        // We use this to filter out chunks that Flight will never need to load
        const emptySet = new Set();
        const runtimeChunkFiles = emptySet;
        compilation.entrypoints.forEach(entrypoint => {
          const runtimeChunk = entrypoint.getRuntimeChunk();
          if (runtimeChunk) {
            runtimeChunk.files.forEach(runtimeFile => {
              runtimeChunkFiles.add(runtimeFile);
            });
          }
        });
        compilation.chunkGroups.forEach(function (chunkGroup) {
          const chunks = [];
          chunkGroup.chunks.forEach(function (c) {
            // eslint-disable-next-line no-for-of-loops/no-for-of-loops
            var _iterator = _createForOfIteratorHelper(c.files),
              _step;
            try {
              for (_iterator.s(); !(_step = _iterator.n()).done;) {
                const file = _step.value;
                if (!(file.endsWith('.js') || file.endsWith('.mjs'))) {
                  return;
                }
                if (file.endsWith('.hot-update.js') || file.endsWith('.hot-update.mjs')) return;
                chunks.push(c.id, file);
                break;
              }
            } catch (err) {
              _iterator.e(err);
            } finally {
              _iterator.f();
            }
          });

          // $FlowFixMe[missing-local-annot]
          function recordModule(id, module) {
            // TODO: Hook into deps instead of the target module.
            // That way we know by the type of dep whether to include.
            // It also resolves conflicts when the same module is in multiple chunks.
            if (!resolvedClientFiles.has(module.resource)) {
              return;
            }
            const href = url.pathToFileURL(module.resource).href;
            if (href !== undefined) {
              const ssrExports = {};
              clientManifest[href] = {
                id,
                chunks,
                name: '*'
              };
              ssrExports['*'] = {
                specifier: href,
                name: '*'
              };

              // TODO: If this module ends up split into multiple modules, then
              // we should encode each the chunks needed for the specific export.
              // When the module isn't split, it doesn't matter and we can just
              // encode the id of the whole module. This code doesn't currently
              // deal with module splitting so is likely broken from ESM anyway.
              /*
              clientManifest[href + '#'] = {
                id,
                chunks,
                name: '',
              };
              ssrExports[''] = {
                specifier: href,
                name: '',
              };
               const moduleProvidedExports = compilation.moduleGraph
                .getExportsInfo(module)
                .getProvidedExports();
               if (Array.isArray(moduleProvidedExports)) {
                moduleProvidedExports.forEach(function (name) {
                  clientManifest[href + '#' + name] = {
                    id,
                    chunks,
                    name: name,
                  };
                  ssrExports[name] = {
                    specifier: href,
                    name: name,
                  };
                });
              }
              */

              moduleMap[id] = ssrExports;
            }
          }
          chunkGroup.chunks.forEach(function (chunk) {
            const chunkModules = compilation.chunkGraph.getChunkModulesIterable(chunk);
            Array.from(chunkModules).forEach(function (module) {
              const moduleId = compilation.chunkGraph.getModuleId(module);
              recordModule(moduleId, module);
              // If this is a concatenation, register each child to the parent ID.
              if (module.modules) {
                module.modules.forEach(concatenatedMod => {
                  recordModule(moduleId, concatenatedMod);
                });
              }
            });
          });
        });
        const clientOutput = JSON.stringify(clientManifest, null, 2);
        compilation.emitAsset(_this.clientManifestFilename, new webpack.sources.RawSource(clientOutput, false));
        const ssrOutput = JSON.stringify(ssrBundleConfig, null, 2);
        compilation.emitAsset(_this.serverConsumerManifestFilename, new webpack.sources.RawSource(ssrOutput, false));
      });
    });
  }

  // This attempts to replicate the dynamic file path resolution used for other wildcard
  // resolution in Webpack is using.
  resolveAllClientFiles(context, contextResolver, normalResolver, fs, contextModuleFactory, callback) {
    function hasUseClientDirective(source) {
      if (source.indexOf('use client') === -1) {
        return false;
      }
      let body;
      try {
        body = acorn.parse(source, {
          ecmaVersion: '2024',
          sourceType: 'module'
        }).body;
      } catch (x) {
        return false;
      }
      for (let i = 0; i < body.length; i++) {
        const node = body[i];
        if (node.type !== 'ExpressionStatement' || !node.directive) {
          break;
        }
        if (node.directive === 'use client') {
          return true;
        }
      }
      return false;
    }
    asyncLib.map(this.clientReferences, (clientReferencePath, cb) => {
      if (typeof clientReferencePath === 'string') {
        cb(null, [new ClientReferenceDependency(clientReferencePath)]);
        return;
      }
      const clientReferenceSearch = clientReferencePath;
      contextResolver.resolve({}, context, clientReferencePath.directory, {}, (err, resolvedDirectory) => {
        if (err) return cb(err);
        const options = {
          resource: resolvedDirectory,
          resourceQuery: '',
          recursive: clientReferenceSearch.recursive === undefined ? true : clientReferenceSearch.recursive,
          regExp: clientReferenceSearch.include,
          include: undefined,
          exclude: clientReferenceSearch.exclude
        };
        contextModuleFactory.resolveDependencies(fs, options, (err2, deps) => {
          if (err2) return cb(err2);
          const clientRefDeps = deps.map(dep => {
            // use userRequest instead of request. request always end with undefined which is wrong
            const request = path.join(resolvedDirectory, dep.userRequest);
            const clientRefDep = new ClientReferenceDependency(request);
            clientRefDep.userRequest = dep.userRequest;
            return clientRefDep;
          });
          asyncLib.filter(clientRefDeps, (clientRefDep, filterCb) => {
            normalResolver.resolve({}, context, clientRefDep.request, {}, (err3, resolvedPath) => {
              if (err3 || typeof resolvedPath !== 'string') {
                return filterCb(null, false);
              }
              fs.readFile(resolvedPath, 'utf-8', (err4, content) => {
                if (err4 || typeof content !== 'string') {
                  return filterCb(null, false);
                }
                const useClient = hasUseClientDirective(content);
                filterCb(null, useClient);
              });
            });
          }, cb);
        });
      });
    }, (err, result) => {
      if (err) return callback(err);
      const flat = [];
      for (let i = 0; i < result.length; i++) {
        // $FlowFixMe[method-unbinding]
        flat.push.apply(flat, result[i]);
      }
      callback(null, flat);
    });
  }
}

module.exports = ReactFlightWebpackPlugin;
