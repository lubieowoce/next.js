/**
 * @license React
 * react-server-dom-turbopack-server.edge.development.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

if (process.env.NODE_ENV !== "production") {
  (function() {
'use strict';

var ReactDOM = require('react-dom');
var React = require('react');

// -----------------------------------------------------------------------------
// Land or remove (zero effort)
//
// Flags that can likely be deleted or landed without consequences
// -----------------------------------------------------------------------------

var enableHalt = true;

// -----------------------------------------------------------------------------
// Debugging and DevTools
// -----------------------------------------------------------------------------

// Gather advanced timing metrics for Profiler subtrees.
var enableProfilerTimer = true;

// Adds performance.measure() marks using Chrome extensions to allow formatted
// Component rendering tracks to show up in the Performance tab.
// This flag will be used for both Server Component and Client Component tracks.
// All calls should also be gated on enableProfilerTimer.
var enableComponentPerformanceTrack = true;
var enableAsyncDebugInfo = true;

// ATTENTION
// When adding new symbols to this file,
// Please consider also adding to 'react-devtools-shared/src/backend/ReactSymbols'

// The Symbol used to tag the ReactElement-like types.
var REACT_LEGACY_ELEMENT_TYPE = Symbol.for('react.element');
var REACT_ELEMENT_TYPE = Symbol.for('react.transitional.element') ;
var REACT_FRAGMENT_TYPE = Symbol.for('react.fragment');
var REACT_CONTEXT_TYPE = Symbol.for('react.context');
var REACT_FORWARD_REF_TYPE = Symbol.for('react.forward_ref');
var REACT_SUSPENSE_TYPE = Symbol.for('react.suspense');
var REACT_SUSPENSE_LIST_TYPE = Symbol.for('react.suspense_list');
var REACT_MEMO_TYPE = Symbol.for('react.memo');
var REACT_LAZY_TYPE = Symbol.for('react.lazy');
var REACT_MEMO_CACHE_SENTINEL = Symbol.for('react.memo_cache_sentinel');
var REACT_VIEW_TRANSITION_TYPE = Symbol.for('react.view_transition');
var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
var FAUX_ITERATOR_SYMBOL = '@@iterator';
function getIteratorFn(maybeIterable) {
  if (maybeIterable === null || typeof maybeIterable !== 'object') {
    return null;
  }
  var maybeIterator = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL];
  if (typeof maybeIterator === 'function') {
    return maybeIterator;
  }
  return null;
}
var ASYNC_ITERATOR = Symbol.asyncIterator;
var REACT_OPTIMISTIC_KEY = Symbol.for('react.optimistic_key');

// This is actually a symbol but Flow doesn't support comparison of symbols to refine.
// We use a boolean since in our code we often expect string (key) or number (index),
// so by pretending to be a boolean we cover a lot of cases that don't consider this case.

function _toPrimitive(t, r) {
  if ("object" != typeof t || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r || "default");
    if ("object" != typeof i) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}
function _toPropertyKey(t) {
  var i = _toPrimitive(t, "string");
  return "symbol" == typeof i ? i : i + "";
}
function _defineProperty(obj, key, value) {
  key = _toPropertyKey(key);
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }
  return obj;
}

function handleErrorInNextTick(error) {
  setTimeout(function () {
    throw error;
  });
}
var LocalPromise = Promise;
var scheduleMicrotask = typeof queueMicrotask === 'function' ? queueMicrotask : function (callback) {
  LocalPromise.resolve(null).then(callback).catch(handleErrorInNextTick);
};
function scheduleWork(callback) {
  setTimeout(callback, 0);
}

// Chunks larger than VIEW_SIZE are written directly, without copying into the
// internal view buffer. This must be at least half of Node's internal Buffer
// pool size (8192) to avoid corrupting the pool when using
// renderToReadableStream, which uses a byte stream that detaches ArrayBuffers.
var VIEW_SIZE = 4096;
var currentView = null;
var writtenBytes = 0;
function beginWriting(destination) {
  currentView = new Uint8Array(VIEW_SIZE);
  writtenBytes = 0;
}
function writeChunk(destination, chunk) {
  if (chunk.byteLength === 0) {
    return;
  }
  if (chunk.byteLength > VIEW_SIZE) {
    // this chunk may overflow a single view which implies it was not
    // one that is cached by the streaming renderer. We will enqueu
    // it directly and expect it is not re-used
    if (writtenBytes > 0) {
      destination.enqueue(new Uint8Array(currentView.buffer, 0, writtenBytes));
      currentView = new Uint8Array(VIEW_SIZE);
      writtenBytes = 0;
    }
    destination.enqueue(chunk);
    return;
  }
  var bytesToWrite = chunk;
  var allowableBytes = currentView.length - writtenBytes;
  if (allowableBytes < bytesToWrite.byteLength) {
    // this chunk would overflow the current view. We enqueue a full view
    // and start a new view with the remaining chunk
    if (allowableBytes === 0) {
      // the current view is already full, send it
      destination.enqueue(currentView);
    } else {
      // fill up the current view and apply the remaining chunk bytes
      // to a new view.
      currentView.set(bytesToWrite.subarray(0, allowableBytes), writtenBytes);
      // writtenBytes += allowableBytes; // this can be skipped because we are going to immediately reset the view
      destination.enqueue(currentView);
      bytesToWrite = bytesToWrite.subarray(allowableBytes);
    }
    currentView = new Uint8Array(VIEW_SIZE);
    writtenBytes = 0;
  }
  currentView.set(bytesToWrite, writtenBytes);
  writtenBytes += bytesToWrite.byteLength;
}
function writeChunkAndReturn(destination, chunk) {
  writeChunk(destination, chunk);
  // in web streams there is no backpressure so we can alwas write more
  return true;
}
function completeWriting(destination) {
  if (currentView && writtenBytes > 0) {
    destination.enqueue(new Uint8Array(currentView.buffer, 0, writtenBytes));
    currentView = null;
    writtenBytes = 0;
  }
}
function close$1(destination) {
  destination.close();
}
var textEncoder = new TextEncoder();
function stringToChunk(content) {
  return textEncoder.encode(content);
}
function typedArrayToBinaryChunk(content) {
  // Convert any non-Uint8Array array to Uint8Array. We could avoid this for Uint8Arrays.
  // If we passed through this straight to enqueue we wouldn't have to convert it but since
  // we need to copy the buffer in that case, we need to convert it to copy it.
  // When we copy it into another array using set() it needs to be a Uint8Array.
  return new Uint8Array(content.buffer, content.byteOffset, content.byteLength);
}
function byteLengthOfChunk(chunk) {
  return chunk.byteLength;
}
function byteLengthOfBinaryChunk(chunk) {
  return chunk.byteLength;
}
function closeWithError(destination, error) {
  // $FlowFixMe[method-unbinding]
  if (typeof destination.error === 'function') {
    // $FlowFixMe[incompatible-call]: This is an Error object or the destination accepts other types.
    destination.error(error);
  } else {
    // Earlier implementations doesn't support this method. In that environment you're
    // supposed to throw from a promise returned but we don't return a promise in our
    // approach. We could fork this implementation but this is environment is an edge
    // case to begin with. It's even less common to run this in an older environment.
    // Even then, this is not where errors are supposed to happen and they get reported
    // to a global callback in addition to this anyway. So it's fine just to close this.
    destination.close();
  }
}

// eslint-disable-next-line no-unused-vars

var CLIENT_REFERENCE_TAG$1 = Symbol.for('react.client.reference');
var SERVER_REFERENCE_TAG = Symbol.for('react.server.reference');
function isClientReference(reference) {
  return reference.$$typeof === CLIENT_REFERENCE_TAG$1;
}
function isServerReference(reference) {
  return reference.$$typeof === SERVER_REFERENCE_TAG;
}
function registerClientReference(proxyImplementation, id, exportName) {
  return registerClientReferenceImpl(proxyImplementation, id + '#' + exportName, false);
}
function registerClientReferenceImpl(proxyImplementation, id, async) {
  return Object.defineProperties(proxyImplementation, {
    $$typeof: {
      value: CLIENT_REFERENCE_TAG$1
    },
    $$id: {
      value: id
    },
    $$async: {
      value: async
    }
  });
}

// $FlowFixMe[method-unbinding]
var FunctionBind = Function.prototype.bind;
// $FlowFixMe[method-unbinding]
var ArraySlice = Array.prototype.slice;
function bind() {
  // $FlowFixMe[incompatible-call]
  var newFn = FunctionBind.apply(this, arguments);
  if (this.$$typeof === SERVER_REFERENCE_TAG) {
    {
      var thisBind = arguments[0];
      if (thisBind != null) {
        console.error('Cannot bind "this" of a Server Action. Pass null or undefined as the first argument to .bind().');
      }
    }
    var args = ArraySlice.call(arguments, 1);
    var $$typeof = {
      value: SERVER_REFERENCE_TAG
    };
    var $$id = {
      value: this.$$id
    };
    var $$bound = {
      value: this.$$bound ? this.$$bound.concat(args) : args
    };
    return Object.defineProperties(newFn, {
      $$typeof: $$typeof,
      $$id: $$id,
      $$bound: $$bound,
      $$location: {
        value: this.$$location,
        configurable: true
      },
      bind: {
        value: bind,
        configurable: true
      }
    } );
  }
  return newFn;
}
var serverReferenceToString = {
  value: function () {
    return 'function () { [omitted code] }';
  },
  configurable: true,
  writable: true
};
function registerServerReference(reference, id, exportName) {
  var $$typeof = {
    value: SERVER_REFERENCE_TAG
  };
  var $$id = {
    value: exportName === null ? id : id + '#' + exportName,
    configurable: true
  };
  var $$bound = {
    value: null,
    configurable: true
  };
  return Object.defineProperties(reference, {
    $$typeof: $$typeof,
    $$id: $$id,
    $$bound: $$bound,
    $$location: {
      value: Error('react-stack-top-frame'),
      configurable: true
    },
    bind: {
      value: bind,
      configurable: true
    },
    toString: serverReferenceToString
  } );
}
var PROMISE_PROTOTYPE = Promise.prototype;
var deepProxyHandlers = {
  get: function (target, name, receiver) {
    switch (name) {
      // These names are read by the Flight runtime if you end up using the exports object.
      case '$$typeof':
        // These names are a little too common. We should probably have a way to
        // have the Flight runtime extract the inner target instead.
        return target.$$typeof;
      case '$$id':
        return target.$$id;
      case '$$async':
        return target.$$async;
      case 'name':
        return target.name;
      case 'displayName':
        return undefined;
      // We need to special case this because createElement reads it if we pass this
      // reference.
      case 'defaultProps':
        return undefined;
      // React looks for debugInfo on thenables.
      case '_debugInfo':
        return undefined;
      // Avoid this attempting to be serialized.
      case 'toJSON':
        return undefined;
      case Symbol.toPrimitive:
        // $FlowFixMe[prop-missing]
        return Object.prototype[Symbol.toPrimitive];
      case Symbol.toStringTag:
        // $FlowFixMe[prop-missing]
        return Object.prototype[Symbol.toStringTag];
      case 'Provider':
        throw new Error("Cannot render a Client Context Provider on the Server. " + "Instead, you can export a Client Component wrapper " + "that itself renders a Client Context Provider.");
      case 'then':
        throw new Error("Cannot await or return from a thenable. " + "You cannot await a client module from a server component.");
    }
    // eslint-disable-next-line react-internal/safe-string-coercion
    var expression = String(target.name) + '.' + String(name);
    throw new Error("Cannot access " + expression + " on the server. " + 'You cannot dot into a client module from a server component. ' + 'You can only pass the imported name through.');
  },
  set: function () {
    throw new Error('Cannot assign to a client module from a server module.');
  }
};
function getReference(target, name) {
  switch (name) {
    // These names are read by the Flight runtime if you end up using the exports object.
    case '$$typeof':
      return target.$$typeof;
    case '$$id':
      return target.$$id;
    case '$$async':
      return target.$$async;
    case 'name':
      return target.name;
    // We need to special case this because createElement reads it if we pass this
    // reference.
    case 'defaultProps':
      return undefined;
    // React looks for debugInfo on thenables.
    case '_debugInfo':
      return undefined;
    // Avoid this attempting to be serialized.
    case 'toJSON':
      return undefined;
    case Symbol.toPrimitive:
      // $FlowFixMe[prop-missing]
      return Object.prototype[Symbol.toPrimitive];
    case Symbol.toStringTag:
      // $FlowFixMe[prop-missing]
      return Object.prototype[Symbol.toStringTag];
    case '__esModule':
      // Something is conditionally checking which export to use. We'll pretend to be
      // an ESM compat module but then we'll check again on the client.
      var moduleId = target.$$id;
      target.default = registerClientReferenceImpl(function () {
        throw new Error("Attempted to call the default export of " + moduleId + " from the server " + "but it's on the client. It's not possible to invoke a client function from " + "the server, it can only be rendered as a Component or passed to props of a " + "Client Component.");
      }, target.$$id + '#', target.$$async);
      return true;
    case 'then':
      if (target.then) {
        // Use a cached value
        return target.then;
      }
      if (!target.$$async) {
        // If this module is expected to return a Promise (such as an AsyncModule) then
        // we should resolve that with a client reference that unwraps the Promise on
        // the client.

        var clientReference = registerClientReferenceImpl({}, target.$$id, true);
        var proxy = new Proxy(clientReference, proxyHandlers$1);

        // Treat this as a resolved Promise for React's use()
        target.status = 'fulfilled';
        target.value = proxy;
        var then = target.then = registerClientReferenceImpl(function then(resolve, reject) {
          // Expose to React.
          return Promise.resolve(resolve(proxy));
        },
        // If this is not used as a Promise but is treated as a reference to a `.then`
        // export then we should treat it as a reference to that name.
        target.$$id + '#then', false);
        return then;
      } else {
        // Since typeof .then === 'function' is a feature test we'd continue recursing
        // indefinitely if we return a function. Instead, we return an object reference
        // if we check further.
        return undefined;
      }
  }
  if (typeof name === 'symbol') {
    throw new Error('Cannot read Symbol exports. Only named exports are supported on a client module ' + 'imported on the server.');
  }
  var cachedReference = target[name];
  if (!cachedReference) {
    var reference = registerClientReferenceImpl(function () {
      throw new Error(
      // eslint-disable-next-line react-internal/safe-string-coercion
      "Attempted to call " + String(name) + "() from the server but " + String(name) + " is on the client. " + "It's not possible to invoke a client function from the server, it can " + "only be rendered as a Component or passed to props of a Client Component.");
    }, target.$$id + '#' + name, target.$$async);
    Object.defineProperty(reference, 'name', {
      value: name
    });
    cachedReference = target[name] = new Proxy(reference, deepProxyHandlers);
  }
  return cachedReference;
}
var proxyHandlers$1 = {
  get: function (target, name, receiver) {
    return getReference(target, name);
  },
  getOwnPropertyDescriptor: function (target, name) {
    var descriptor = Object.getOwnPropertyDescriptor(target, name);
    if (!descriptor) {
      descriptor = {
        value: getReference(target, name),
        writable: false,
        configurable: false,
        enumerable: false
      };
      Object.defineProperty(target, name, descriptor);
    }
    return descriptor;
  },
  getPrototypeOf: function (target) {
    // Pretend to be a Promise in case anyone asks.
    return PROMISE_PROTOTYPE;
  },
  set: function () {
    throw new Error('Cannot assign to a client module from a server module.');
  }
};
function createClientModuleProxy(moduleId) {
  var clientReference = registerClientReferenceImpl({},
  // Represents the whole Module object instead of a particular import.
  moduleId, false);
  return new Proxy(clientReference, proxyHandlers$1);
}

function getClientReferenceKey(reference) {
  return reference.$$async ? reference.$$id + '#async' : reference.$$id;
}
function resolveClientReferenceMetadata(config, clientReference) {
  var modulePath = clientReference.$$id;
  var name = '';
  var resolvedModuleData = config[modulePath];
  if (resolvedModuleData) {
    // The potentially aliased name.
    name = resolvedModuleData.name;
  } else {
    // We didn't find this specific export name but we might have the * export
    // which contains this name as well.
    // TODO: It's unfortunate that we now have to parse this string. We should
    // probably go back to encoding path and name separately on the client reference.
    var idx = modulePath.lastIndexOf('#');
    if (idx !== -1) {
      name = modulePath.slice(idx + 1);
      resolvedModuleData = config[modulePath.slice(0, idx)];
    }
    if (!resolvedModuleData) {
      throw new Error('Could not find the module "' + modulePath + '" in the React Client Manifest. ' + 'This is probably a bug in the React Server Components bundler.');
    }
  }
  if (resolvedModuleData.async === true && clientReference.$$async === true) {
    throw new Error('The module "' + modulePath + '" is marked as an async ESM module but was loaded as a CJS proxy. ' + 'This is probably a bug in the React Server Components bundler.');
  }
  if (resolvedModuleData.async === true || clientReference.$$async === true) {
    return [resolvedModuleData.id, resolvedModuleData.chunks, name, 1];
  } else {
    return [resolvedModuleData.id, resolvedModuleData.chunks, name];
  }
}
function getServerReferenceId(config, serverReference) {
  return serverReference.$$id;
}
function getServerReferenceBoundArguments(config, serverReference) {
  return serverReference.$$bound;
}
function getServerReferenceLocation(config, serverReference) {
  return serverReference.$$location;
}

var ReactDOMSharedInternals = ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

var previousDispatcher = ReactDOMSharedInternals.d; /* ReactDOMCurrentDispatcher */
ReactDOMSharedInternals.d /* ReactDOMCurrentDispatcher */ = {
  f /* flushSyncWork */: previousDispatcher.f /* flushSyncWork */,
  r /* requestFormReset */: previousDispatcher.r /* requestFormReset */,
  D /* prefetchDNS */: prefetchDNS,
  C /* preconnect */: preconnect,
  L /* preload */: preload,
  m /* preloadModule */: preloadModule$1,
  X /* preinitScript */: preinitScript,
  S /* preinitStyle */: preinitStyle,
  M /* preinitModuleScript */: preinitModuleScript
};
function prefetchDNS(href) {
  if (typeof href === 'string' && href) {
    var request = resolveRequest();
    if (request) {
      var hints = getHints(request);
      var key = 'D|' + href;
      if (hints.has(key)) {
        // duplicate hint
        return;
      }
      hints.add(key);
      emitHint(request, 'D', href);
    } else {
      previousDispatcher.D( /* prefetchDNS */href);
    }
  }
}
function preconnect(href, crossOrigin) {
  if (typeof href === 'string') {
    var request = resolveRequest();
    if (request) {
      var hints = getHints(request);
      var key = "C|" + (crossOrigin == null ? 'null' : crossOrigin) + "|" + href;
      if (hints.has(key)) {
        // duplicate hint
        return;
      }
      hints.add(key);
      if (typeof crossOrigin === 'string') {
        emitHint(request, 'C', [href, crossOrigin]);
      } else {
        emitHint(request, 'C', href);
      }
    } else {
      previousDispatcher.C( /* preconnect */href, crossOrigin);
    }
  }
}
function preload(href, as, options) {
  if (typeof href === 'string') {
    var request = resolveRequest();
    if (request) {
      var hints = getHints(request);
      var key = 'L';
      if (as === 'image' && options) {
        key += getImagePreloadKey(href, options.imageSrcSet, options.imageSizes);
      } else {
        key += "[" + as + "]" + href;
      }
      if (hints.has(key)) {
        // duplicate hint
        return;
      }
      hints.add(key);
      var trimmed = trimOptions(options);
      if (trimmed) {
        emitHint(request, 'L', [href, as, trimmed]);
      } else {
        emitHint(request, 'L', [href, as]);
      }
    } else {
      previousDispatcher.L( /* preload */href, as, options);
    }
  }
}
function preloadModule$1(href, options) {
  if (typeof href === 'string') {
    var request = resolveRequest();
    if (request) {
      var hints = getHints(request);
      var key = 'm|' + href;
      if (hints.has(key)) {
        // duplicate hint
        return;
      }
      hints.add(key);
      var trimmed = trimOptions(options);
      if (trimmed) {
        return emitHint(request, 'm', [href, trimmed]);
      } else {
        return emitHint(request, 'm', href);
      }
    } else {
      previousDispatcher.m( /* preloadModule */href, options);
    }
  }
}
function preinitStyle(href, precedence, options) {
  if (typeof href === 'string') {
    var request = resolveRequest();
    if (request) {
      var hints = getHints(request);
      var key = 'S|' + href;
      if (hints.has(key)) {
        // duplicate hint
        return;
      }
      hints.add(key);
      var trimmed = trimOptions(options);
      if (trimmed) {
        return emitHint(request, 'S', [href, typeof precedence === 'string' ? precedence : 0, trimmed]);
      } else if (typeof precedence === 'string') {
        return emitHint(request, 'S', [href, precedence]);
      } else {
        return emitHint(request, 'S', href);
      }
    } else {
      previousDispatcher.S( /* preinitStyle */href, precedence, options);
    }
  }
}
function preinitScript(src, options) {
  if (typeof src === 'string') {
    var request = resolveRequest();
    if (request) {
      var hints = getHints(request);
      var key = 'X|' + src;
      if (hints.has(key)) {
        // duplicate hint
        return;
      }
      hints.add(key);
      var trimmed = trimOptions(options);
      if (trimmed) {
        return emitHint(request, 'X', [src, trimmed]);
      } else {
        return emitHint(request, 'X', src);
      }
    } else {
      previousDispatcher.X( /* preinitScript */src, options);
    }
  }
}
function preinitModuleScript(src, options) {
  if (typeof src === 'string') {
    var request = resolveRequest();
    if (request) {
      var hints = getHints(request);
      var key = 'M|' + src;
      if (hints.has(key)) {
        // duplicate hint
        return;
      }
      hints.add(key);
      var trimmed = trimOptions(options);
      if (trimmed) {
        return emitHint(request, 'M', [src, trimmed]);
      } else {
        return emitHint(request, 'M', src);
      }
    } else {
      previousDispatcher.M( /* preinitModuleScript */src, options);
    }
  }
}

// Flight normally encodes undefined as a special character however for directive option
// arguments we don't want to send unnecessary keys and bloat the payload so we create a
// trimmed object which omits any keys with null or undefined values.
// This is only typesafe because these option objects have entirely optional fields where
// null and undefined represent the same thing as no property.
function trimOptions(options) {
  if (options == null) return null;
  var hasProperties = false;
  var trimmed = {};
  for (var key in options) {
    // $FlowFixMe[invalid-computed-prop]
    if (options[key] != null) {
      hasProperties = true;
      trimmed[key] = options[key];
    }
  }
  return hasProperties ? trimmed : null;
}
function getImagePreloadKey(href, imageSrcSet, imageSizes) {
  var uniquePart = '';
  if (typeof imageSrcSet === 'string' && imageSrcSet !== '') {
    uniquePart += '[' + imageSrcSet + ']';
    if (typeof imageSizes === 'string') {
      uniquePart += '[' + imageSizes + ']';
    }
  } else {
    uniquePart += '[][]' + href;
  }
  return "[image]" + uniquePart;
}

function getCrossOriginString(input) {
  if (typeof input === 'string') {
    return input === 'use-credentials' ? input : '';
  }
  return undefined;
}

// This module registers the host dispatcher so it needs to be imported
// even if no exports are used.

// We use zero to represent the absence of an explicit precedence because it is
// small, smaller than how we encode undefined, and is unambiguous. We could use
// a different tuple structure to encode this instead but this makes the runtime
// cost cheaper by eliminating a type checks in more positions.

// prettier-ignore

function createHints() {
  return new Set();
}
var NO_SCOPE = /*         */0;
var NOSCRIPT_SCOPE = /*   */1;
var PICTURE_SCOPE = /*    */2;
function createRootFormatContext() {
  return NO_SCOPE;
}
function processImg(props, formatContext) {
  // This should mirror the logic of pushImg in ReactFizzConfigDOM.
  var pictureOrNoScriptTagInScope = formatContext & (PICTURE_SCOPE | NOSCRIPT_SCOPE);
  var src = props.src,
    srcSet = props.srcSet;
  if (props.loading !== 'lazy' && (src || srcSet) && (typeof src === 'string' || src == null) && (typeof srcSet === 'string' || srcSet == null) && props.fetchPriority !== 'low' && !pictureOrNoScriptTagInScope &&
  // We exclude data URIs in src and srcSet since these should not be preloaded
  !(typeof src === 'string' && src[4] === ':' && (src[0] === 'd' || src[0] === 'D') && (src[1] === 'a' || src[1] === 'A') && (src[2] === 't' || src[2] === 'T') && (src[3] === 'a' || src[3] === 'A')) && !(typeof srcSet === 'string' && srcSet[4] === ':' && (srcSet[0] === 'd' || srcSet[0] === 'D') && (srcSet[1] === 'a' || srcSet[1] === 'A') && (srcSet[2] === 't' || srcSet[2] === 'T') && (srcSet[3] === 'a' || srcSet[3] === 'A'))) {
    // We have a suspensey image and ought to preload it to optimize the loading of display blocking
    // resumableState.
    var sizes = typeof props.sizes === 'string' ? props.sizes : undefined;
    var crossOrigin = getCrossOriginString(props.crossOrigin);
    preload(
    // The preload() API requires a href but if we have an imageSrcSet then that will take precedence.
    // We already remove the href anyway in both Fizz and Fiber due to a Safari bug so the empty string
    // will never actually appear in the DOM.
    src || '', 'image', {
      imageSrcSet: srcSet,
      imageSizes: sizes,
      crossOrigin: crossOrigin,
      integrity: props.integrity,
      type: props.type,
      fetchPriority: props.fetchPriority,
      referrerPolicy: props.referrerPolicy
    });
  }
}
function processLink(props, formatContext) {
  var noscriptTagInScope = formatContext & NOSCRIPT_SCOPE;
  var rel = props.rel;
  var href = props.href;
  if (noscriptTagInScope || props.itemProp != null || typeof rel !== 'string' || typeof href !== 'string' || href === '') {
    // We shouldn't preload resources that are in noscript or have no configuration.
    return;
  }
  switch (rel) {
    case 'preload':
      {
        preload(href, props.as, {
          crossOrigin: props.crossOrigin,
          integrity: props.integrity,
          nonce: props.nonce,
          type: props.type,
          fetchPriority: props.fetchPriority,
          referrerPolicy: props.referrerPolicy,
          imageSrcSet: props.imageSrcSet,
          imageSizes: props.imageSizes,
          media: props.media
        });
        return;
      }
    case 'modulepreload':
      {
        preloadModule$1(href, {
          as: props.as,
          crossOrigin: props.crossOrigin,
          integrity: props.integrity,
          nonce: props.nonce
        });
        return;
      }
    case 'stylesheet':
      {
        preload(href, 'style', {
          crossOrigin: props.crossOrigin,
          integrity: props.integrity,
          nonce: props.nonce,
          type: props.type,
          fetchPriority: props.fetchPriority,
          referrerPolicy: props.referrerPolicy,
          media: props.media
        });
        return;
      }
  }
}
function getChildFormatContext(parentContext, type, props) {
  switch (type) {
    case 'img':
      processImg(props, parentContext);
      return parentContext;
    case 'link':
      processLink(props, parentContext);
      return parentContext;
    case 'picture':
      return parentContext | PICTURE_SCOPE;
    case 'noscript':
      return parentContext | NOSCRIPT_SCOPE;
    default:
      return parentContext;
  }
}

// Exported for runtimes that don't support Promise instrumentation for async debugging.
function getCurrentAsyncSequence() {
  return null;
}
function getAsyncSequenceFromPromise(promise) {
  return null;
}

var framesToSkip = 0;
var collectedStackTrace = null;
var identifierRegExp = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/;
function getMethodCallName(callSite) {
  var typeName = callSite.getTypeName();
  var methodName = callSite.getMethodName();
  var functionName = callSite.getFunctionName();
  var result = '';
  if (functionName) {
    if (typeName && identifierRegExp.test(functionName) && functionName !== typeName) {
      result += typeName + '.';
    }
    result += functionName;
    if (methodName && functionName !== methodName && !functionName.endsWith('.' + methodName) && !functionName.endsWith(' ' + methodName)) {
      result += ' [as ' + methodName + ']';
    }
  } else {
    if (typeName) {
      result += typeName + '.';
    }
    if (methodName) {
      result += methodName;
    } else {
      result += '<anonymous>';
    }
  }
  return result;
}
function collectStackTracePrivate(error, structuredStackTrace) {
  var result = [];
  // Collect structured stack traces from the callsites.
  // We mirror how V8 serializes stack frames and how we later parse them.
  for (var i = framesToSkip; i < structuredStackTrace.length; i++) {
    var callSite = structuredStackTrace[i];
    var name = callSite.getFunctionName() || '<anonymous>';
    if (name.includes('react_stack_bottom_frame')) {
      // Skip everything after the bottom frame since it'll be internals.
      break;
    } else if (callSite.isNative()) {
      // $FlowFixMe[prop-missing]
      var isAsync = callSite.isAsync();
      result.push([name, '', 0, 0, 0, 0, isAsync]);
    } else {
      // We encode complex function calls as if they're part of the function
      // name since we cannot simulate the complex ones and they look the same
      // as function names in UIs on the client as well as stacks.
      if (callSite.isConstructor()) {
        name = 'new ' + name;
      } else if (!callSite.isToplevel()) {
        name = getMethodCallName(callSite);
      }
      if (name === '<anonymous>') {
        name = '';
      }
      var filename = callSite.getScriptNameOrSourceURL() || '<anonymous>';
      if (filename === '<anonymous>') {
        filename = '';
        if (callSite.isEval()) {
          var origin = callSite.getEvalOrigin();
          if (origin) {
            filename = origin.toString() + ', <anonymous>';
          }
        }
      }
      var line = callSite.getLineNumber() || 0;
      var col = callSite.getColumnNumber() || 0;
      var enclosingLine =
      // $FlowFixMe[prop-missing]
      typeof callSite.getEnclosingLineNumber === 'function' ? callSite.getEnclosingLineNumber() || 0 : 0;
      var enclosingCol =
      // $FlowFixMe[prop-missing]
      typeof callSite.getEnclosingColumnNumber === 'function' ? callSite.getEnclosingColumnNumber() || 0 : 0;
      // $FlowFixMe[prop-missing]
      var _isAsync = callSite.isAsync();
      result.push([name, filename, line, col, enclosingLine, enclosingCol, _isAsync]);
    }
  }
  collectedStackTrace = result;
  return '';
}
function collectStackTrace(error, structuredStackTrace) {
  collectStackTracePrivate(error, structuredStackTrace);
  // At the same time we generate a string stack trace just in case someone
  // else reads it. Ideally, we'd call the previous prepareStackTrace to
  // ensure it's in the expected format but it's common for that to be
  // source mapped and since we do a lot of eager parsing of errors, it
  // would be slow in those environments. We could maybe just rely on those
  // environments having to disable source mapping globally to speed things up.
  // For now, we just generate a default V8 formatted stack trace without
  // source mapping as a fallback.
  var name = error.name || 'Error';
  var message = error.message || '';
  var stack = name + ': ' + message;
  for (var i = 0; i < structuredStackTrace.length; i++) {
    stack += '\n    at ' + structuredStackTrace[i].toString();
  }
  return stack;
}

// This matches either of these V8 formats.
//     at name (filename:0:0)
//     at filename:0:0
//     at async filename:0:0
var frameRegExp = /^ {3} at (?:(.+) \((?:(.+):(\d+):(\d+)|\<anonymous\>)\)|(?:async )?(.+):(\d+):(\d+)|\<anonymous\>)$/;

// DEV-only cache of parsed and filtered stack frames.
var stackTraceCache = new WeakMap() ;

// This version is only used when React fully owns the Error object and there's no risk of it having
// been already initialized and no risky that anyone else will initialize it later.
function parseStackTracePrivate(error, skipFrames) {
  collectedStackTrace = null;
  framesToSkip = skipFrames;
  var previousPrepare = Error.prepareStackTrace;
  Error.prepareStackTrace = collectStackTracePrivate;
  try {
    if (error.stack !== '') {
      return null;
    }
  } finally {
    Error.prepareStackTrace = previousPrepare;
  }
  return collectedStackTrace;
}
function parseStackTrace(error, skipFrames) {
  // We can only get structured data out of error objects once. So we cache the information
  // so we can get it again each time. It also helps performance when the same error is
  // referenced more than once.
  var existing = stackTraceCache.get(error);
  if (existing !== undefined) {
    return existing;
  }
  // We override Error.prepareStackTrace with our own version that collects
  // the structured data. We need more information than the raw stack gives us
  // and we need to ensure that we don't get the source mapped version.
  collectedStackTrace = null;
  framesToSkip = skipFrames;
  var previousPrepare = Error.prepareStackTrace;
  Error.prepareStackTrace = collectStackTrace;
  var stack;
  try {
    // eslint-disable-next-line react-internal/safe-string-coercion
    stack = String(error.stack);
  } finally {
    Error.prepareStackTrace = previousPrepare;
  }
  if (collectedStackTrace !== null) {
    var result = collectedStackTrace;
    collectedStackTrace = null;
    stackTraceCache.set(error, result);
    return result;
  }

  // If the stack has already been read, or this is not actually a V8 compatible
  // engine then we might not get a normalized stack and it might still have been
  // source mapped. Regardless we try our best to parse it. This works best if the
  // environment just uses default V8 formatting and no source mapping.

  if (stack.startsWith('Error: react-stack-top-frame\n')) {
    // V8's default formatting prefixes with the error message which we
    // don't want/need.
    stack = stack.slice(29);
  }
  var idx = stack.indexOf('react_stack_bottom_frame');
  if (idx !== -1) {
    idx = stack.lastIndexOf('\n', idx);
  }
  if (idx !== -1) {
    // Cut off everything after the bottom frame since it'll be internals.
    stack = stack.slice(0, idx);
  }
  var frames = stack.split('\n');
  var parsedFrames = [];
  // We skip top frames here since they may or may not be parseable but we
  // want to skip the same number of frames regardless. I.e. we can't do it
  // in the caller.
  for (var i = skipFrames; i < frames.length; i++) {
    var parsed = frameRegExp.exec(frames[i]);
    if (!parsed) {
      continue;
    }
    var name = parsed[1] || '';
    var isAsync = parsed[8] === 'async ';
    if (name === '<anonymous>') {
      name = '';
    } else if (name.startsWith('async ')) {
      name = name.slice(5);
      isAsync = true;
    }
    var filename = parsed[2] || parsed[5] || '';
    if (filename === '<anonymous>') {
      filename = '';
    }
    var line = +(parsed[3] || parsed[6]);
    var col = +(parsed[4] || parsed[7]);
    parsedFrames.push([name, filename, line, col, 0, 0, isAsync]);
  }
  stackTraceCache.set(error, parsedFrames);
  return parsedFrames;
}

// Keep in sync with ReactClientConsoleConfig
var badgeFormat = '\x1b[0m\x1b[7m%c%s\x1b[0m%c';
// Same badge styling as DevTools.
var badgeStyle =
// We use a fixed background if light-dark is not supported, otherwise
// we use a transparent background.
'background: #e6e6e6;' + 'background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));' + 'color: #000000;' + 'color: light-dark(#000000, #ffffff);' + 'border-radius: 2px';
var padLength = 1;

// This mutates the args to remove any badges that was added by a FlightClient and
// returns the name in the badge. This is used when a FlightClient replays inside
// a FlightServer and we capture those replays.
function unbadgeConsole(methodName, args) {
  var offset = 0;
  switch (methodName) {
    case 'dir':
    case 'dirxml':
    case 'groupEnd':
    case 'table':
      {
        // These methods cannot be colorized because they don't take a formatting string.
        // So we wouldn't have added any badge in the first place.
        // $FlowFixMe
        return null;
      }
    case 'assert':
      {
        // assert takes formatting options as the second argument.
        offset = 1;
      }
  }
  var format = args[offset];
  var style = args[offset + 1];
  var badge = args[offset + 2];
  if (typeof format === 'string' && format.startsWith(badgeFormat) && style === badgeStyle && typeof badge === 'string') {
    // Remove our badging from the arguments.
    var unbadgedFormat = format.slice(badgeFormat.length);
    if (unbadgedFormat[0] === ' ') {
      // Spacing added on the Client if the original argument was a string.
      unbadgedFormat = unbadgedFormat.slice(1);
    }
    args.splice(offset, 4, unbadgedFormat);
    return badge.slice(padLength, badge.length - padLength);
  }
  return null;
}

// For now, we get this from the global scope, but this will likely move to a module.
var supportsRequestStorage = typeof AsyncLocalStorage === 'function';
var requestStorage = supportsRequestStorage ? new AsyncLocalStorage() : null;
var supportsComponentStorage = supportsRequestStorage;
var componentStorage = supportsComponentStorage ? new AsyncLocalStorage() : null;

var TEMPORARY_REFERENCE_TAG = Symbol.for('react.temporary.reference');

// eslint-disable-next-line no-unused-vars

function createTemporaryReferenceSet() {
  return new WeakMap();
}
function isOpaqueTemporaryReference(reference) {
  return reference.$$typeof === TEMPORARY_REFERENCE_TAG;
}
function resolveTemporaryReference(temporaryReferences, temporaryReference) {
  return temporaryReferences.get(temporaryReference);
}
var proxyHandlers = {
  get: function (target, name, receiver) {
    switch (name) {
      // These names are read by the Flight runtime if you end up using the exports object.
      case '$$typeof':
        // These names are a little too common. We should probably have a way to
        // have the Flight runtime extract the inner target instead.
        return target.$$typeof;
      case 'name':
        return undefined;
      case 'displayName':
        return undefined;
      // We need to special case this because createElement reads it if we pass this
      // reference.
      case 'defaultProps':
        return undefined;
      // React looks for debugInfo on thenables.
      case '_debugInfo':
        return undefined;
      // Avoid this attempting to be serialized.
      case 'toJSON':
        return undefined;
      case Symbol.toPrimitive:
        // $FlowFixMe[prop-missing]
        return Object.prototype[Symbol.toPrimitive];
      case Symbol.toStringTag:
        // $FlowFixMe[prop-missing]
        return Object.prototype[Symbol.toStringTag];
      case 'Provider':
        throw new Error("Cannot render a Client Context Provider on the Server. " + "Instead, you can export a Client Component wrapper " + "that itself renders a Client Context Provider.");
      case 'then':
        // Allow returning a temporary reference from an async function
        // Unlike regular Client References, a Promise would never have been serialized as
        // an opaque Temporary Reference, but instead would have been serialized as a
        // Promise on the server and so doesn't hit this path. So we can assume this wasn't
        // a Promise on the client.
        return undefined;
    }
    throw new Error(
    // eslint-disable-next-line react-internal/safe-string-coercion
    "Cannot access " + String(name) + " on the server. " + 'You cannot dot into a temporary client reference from a server component. ' + 'You can only pass the value through to the client.');
  },
  set: function () {
    throw new Error('Cannot assign to a temporary client reference from a server module.');
  }
};
function createTemporaryReference(temporaryReferences, id) {
  var reference = Object.defineProperties(function () {
    throw new Error("Attempted to call a temporary Client Reference from the server but it is on the client. " + "It's not possible to invoke a client function from the server, it can " + "only be rendered as a Component or passed to props of a Client Component.");
  }, {
    $$typeof: {
      value: TEMPORARY_REFERENCE_TAG
    }
  });
  var wrapper = new Proxy(reference, proxyHandlers);
  registerTemporaryReference(temporaryReferences, wrapper, id);
  return wrapper;
}
function registerTemporaryReference(temporaryReferences, object, id) {
  temporaryReferences.set(object, id);
}

function noop() {}

// Corresponds to ReactFiberWakeable and ReactFizzWakeable modules. Generally,
// changes to one module should be reflected in the others.


// An error that is thrown (e.g. by `use`) to trigger Suspense. If we
// detect this is caught by userspace, we'll log a warning in development.
var SuspenseException = new Error("Suspense Exception: This is not a real error! It's an implementation " + 'detail of `use` to interrupt the current render. You must either ' + 'rethrow it immediately, or move the `use` call outside of the ' + '`try/catch` block. Capturing without rethrowing will lead to ' + 'unexpected behavior.\n\n' + 'To handle async errors, wrap your component in an error boundary, or ' + "call the promise's `.catch` method and pass the result to `use`.");
function createThenableState() {
  // The ThenableState is created the first time a component suspends. If it
  // suspends again, we'll reuse the same state.
  return [];
}
function trackUsedThenable(thenableState, thenable, index) {
  var previous = thenableState[index];
  if (previous === undefined) {
    thenableState.push(thenable);
    {
      var stacks = thenableState._stacks || (thenableState._stacks = []);
      stacks.push(new Error());
    }
  } else {
    if (previous !== thenable) {
      // Reuse the previous thenable, and drop the new one. We can assume
      // they represent the same value, because components are idempotent.

      // Avoid an unhandled rejection errors for the Promises that we'll
      // intentionally ignore.
      thenable.then(noop, noop);
      thenable = previous;
    }
  }

  // We use an expando to track the status and result of a thenable so that we
  // can synchronously unwrap the value. Think of this as an extension of the
  // Promise API, or a custom interface that is a superset of Thenable.
  //
  // If the thenable doesn't have a status, set it to "pending" and attach
  // a listener that will update its status and result when it resolves.
  switch (thenable.status) {
    case 'fulfilled':
      {
        var fulfilledValue = thenable.value;
        return fulfilledValue;
      }
    case 'rejected':
      {
        var rejectedError = thenable.reason;
        throw rejectedError;
      }
    default:
      {
        if (typeof thenable.status === 'string') {
          // Only instrument the thenable if the status if not defined. If
          // it's defined, but an unknown value, assume it's been instrumented by
          // some custom userspace implementation. We treat it as "pending".
          // Attach a dummy listener, to ensure that any lazy initialization can
          // happen. Flight lazily parses JSON when the value is actually awaited.
          thenable.then(noop, noop);
        } else {
          var pendingThenable = thenable;
          pendingThenable.status = 'pending';
          pendingThenable.then(function (fulfilledValue) {
            if (thenable.status === 'pending') {
              var fulfilledThenable = thenable;
              fulfilledThenable.status = 'fulfilled';
              fulfilledThenable.value = fulfilledValue;
            }
          }, function (error) {
            if (thenable.status === 'pending') {
              var rejectedThenable = thenable;
              rejectedThenable.status = 'rejected';
              rejectedThenable.reason = error;
            }
          });
        }

        // Check one more time in case the thenable resolved synchronously
        switch (thenable.status) {
          case 'fulfilled':
            {
              var fulfilledThenable = thenable;
              return fulfilledThenable.value;
            }
          case 'rejected':
            {
              var rejectedThenable = thenable;
              throw rejectedThenable.reason;
            }
        }

        // Suspend.
        //
        // Throwing here is an implementation detail that allows us to unwind the
        // call stack. But we shouldn't allow it to leak into userspace. Throw an
        // opaque placeholder value instead of the actual thenable. If it doesn't
        // get captured by the work loop, log a warning, because that means
        // something in userspace must have caught it.
        suspendedThenable = thenable;
        throw SuspenseException;
      }
  }
}

// This is used to track the actual thenable that suspended so it can be
// passed to the rest of the Suspense implementation — which, for historical
// reasons, expects to receive a thenable.
var suspendedThenable = null;
function getSuspendedThenable() {
  // This is called right after `use` suspends by throwing an exception. `use`
  // throws an opaque value instead of the thenable itself so that it can't be
  // caught in userspace. Then the work loop accesses the actual thenable using
  // this function.
  if (suspendedThenable === null) {
    throw new Error('Expected a suspended thenable. This is a bug in React. Please file ' + 'an issue.');
  }
  var thenable = suspendedThenable;
  suspendedThenable = null;
  return thenable;
}

var currentRequest$1 = null;
var thenableIndexCounter = 0;
var thenableState = null;
var currentComponentDebugInfo = null;
function prepareToUseHooksForRequest(request) {
  currentRequest$1 = request;
}
function resetHooksForRequest() {
  currentRequest$1 = null;
}
function prepareToUseHooksForComponent(prevThenableState, componentDebugInfo) {
  thenableIndexCounter = 0;
  thenableState = prevThenableState;
  {
    currentComponentDebugInfo = componentDebugInfo;
  }
}
function getThenableStateAfterSuspending() {
  // If you use() to Suspend this should always exist but if you throw a Promise instead,
  // which is not really supported anymore, it will be empty. We use the empty set as a
  // marker to know if this was a replay of the same component or first attempt.
  var state = thenableState || createThenableState();
  {
    // This is a hack but we stash the debug info here so that we don't need a completely
    // different data structure just for this in DEV. Not too happy about it.
    state._componentDebugInfo = currentComponentDebugInfo;
    currentComponentDebugInfo = null;
  }
  thenableState = null;
  return state;
}
function getTrackedThenablesAfterRendering() {
  return thenableState;
}
var HooksDispatcher = {
  readContext: unsupportedContext,
  use: use,
  useCallback: function (callback) {
    return callback;
  },
  useContext: unsupportedContext,
  useEffect: unsupportedHook,
  useImperativeHandle: unsupportedHook,
  useLayoutEffect: unsupportedHook,
  useInsertionEffect: unsupportedHook,
  useMemo: function (nextCreate) {
    return nextCreate();
  },
  useReducer: unsupportedHook,
  useRef: unsupportedHook,
  useState: unsupportedHook,
  useDebugValue: function () {},
  useDeferredValue: unsupportedHook,
  useTransition: unsupportedHook,
  useSyncExternalStore: unsupportedHook,
  useId: useId,
  useHostTransitionStatus: unsupportedHook,
  useFormState: unsupportedHook,
  useActionState: unsupportedHook,
  useOptimistic: unsupportedHook,
  useMemoCache: function (size) {
    var data = new Array(size);
    for (var i = 0; i < size; i++) {
      data[i] = REACT_MEMO_CACHE_SENTINEL;
    }
    return data;
  },
  useCacheRefresh: function () {
    return unsupportedRefresh;
  },
  useEffectEvent: unsupportedHook
};
function unsupportedHook() {
  throw new Error('This Hook is not supported in Server Components.');
}
function unsupportedRefresh() {
  throw new Error('Refreshing the cache is not supported in Server Components.');
}
function unsupportedContext() {
  throw new Error('Cannot read a Client Context from a Server Component.');
}
function useId() {
  if (currentRequest$1 === null) {
    throw new Error('useId can only be used while React is rendering');
  }
  var id = currentRequest$1.identifierCount++;
  // use 'S' for Flight components to distinguish from 'R' and 'r' in Fizz/Client
  return '_' + currentRequest$1.identifierPrefix + 'S_' + id.toString(32) + '_';
}
function use(usable) {
  if (usable !== null && typeof usable === 'object' || typeof usable === 'function') {
    // $FlowFixMe[method-unbinding]
    if (typeof usable.then === 'function') {
      // This is a thenable.
      var thenable = usable;

      // Track the position of the thenable within this fiber.
      var index = thenableIndexCounter;
      thenableIndexCounter += 1;
      if (thenableState === null) {
        thenableState = createThenableState();
      }
      return trackUsedThenable(thenableState, thenable, index);
    } else if (usable.$$typeof === REACT_CONTEXT_TYPE) {
      unsupportedContext();
    }
  }
  if (isClientReference(usable)) {
    if (usable.value != null && usable.value.$$typeof === REACT_CONTEXT_TYPE) {
      // Show a more specific message since it's a common mistake.
      throw new Error('Cannot read a Client Context from a Server Component.');
    } else {
      throw new Error('Cannot use() an already resolved Client Reference.');
    }
  } else {
    throw new Error(
    // eslint-disable-next-line react-internal/safe-string-coercion
    'An unsupported type was passed to use(): ' + String(usable));
  }
}

var currentOwner = null;
function setCurrentOwner(componentInfo) {
  currentOwner = componentInfo;
}
function resolveOwner() {
  if (currentOwner) return currentOwner;
  if (supportsComponentStorage) {
    var owner = componentStorage.getStore();
    if (owner) return owner;
  }
  return null;
}

function resolveCache() {
  var request = resolveRequest();
  if (request) {
    return getCache(request);
  }
  return new Map();
}
var DefaultAsyncDispatcher = {
  getCacheForType: function (resourceType) {
    var cache = resolveCache();
    var entry = cache.get(resourceType);
    if (entry === undefined) {
      entry = resourceType();
      // TODO: Warn if undefined?
      cache.set(resourceType, entry);
    }
    return entry;
  },
  cacheSignal: function () {
    var request = resolveRequest();
    if (request) {
      return request.cacheController.signal;
    }
    return null;
  }
};
{
  DefaultAsyncDispatcher.getOwner = resolveOwner;
}

var ReactSharedInternalsServer =
// $FlowFixMe: It's defined in the one we resolve to.
React.__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
if (!ReactSharedInternalsServer) {
  throw new Error('The "react" package in this environment is not configured correctly. ' + 'The "react-server" condition must be enabled in any environment that ' + 'runs React Server Components.');
}

// This file replaces DefaultPrepareStackTrace in Edge/Node Server builds.

function prepareStackTrace(error, structuredStackTrace) {
  var name = error.name || 'Error';
  var message = error.message || '';
  var stack = name + ': ' + message;
  for (var i = 0; i < structuredStackTrace.length; i++) {
    stack += '\n    at ' + structuredStackTrace[i].toString();
  }
  return stack;
}

function formatOwnerStack(error) {
  var prevPrepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = prepareStackTrace;
  var stack = error.stack;
  Error.prepareStackTrace = prevPrepareStackTrace;
  if (stack.startsWith('Error: react-stack-top-frame\n')) {
    // V8's default formatting prefixes with the error message which we
    // don't want/need.
    stack = stack.slice(29);
  }
  var idx = stack.indexOf('\n');
  if (idx !== -1) {
    // Pop the JSX frame.
    stack = stack.slice(idx + 1);
  }
  idx = stack.indexOf('react_stack_bottom_frame');
  if (idx !== -1) {
    idx = stack.lastIndexOf('\n', idx);
  }
  if (idx !== -1) {
    // Cut off everything after the bottom frame since it'll be internals.
    stack = stack.slice(0, idx);
  } else {
    // We didn't find any internal callsite out to user space.
    // This means that this was called outside an owner or the owner is fully internal.
    // To keep things light we exclude the entire trace in this case.
    return '';
  }
  return stack;
}

var prefix;
var suffix;
function describeBuiltInComponentFrame(name) {
  if (prefix === undefined) {
    // Extract the VM specific prefix used by each line.
    try {
      throw Error();
    } catch (x) {
      var match = x.stack.trim().match(/\n( *(at )?)/);
      prefix = match && match[1] || '';
      suffix = x.stack.indexOf('\n    at') > -1 ?
      // V8
      ' (<anonymous>)' :
      // JSC/Spidermonkey
      x.stack.indexOf('@') > -1 ? '@unknown:0:0' :
      // Other
      '';
    }
  }
  // We use the prefix to ensure our stacks line up with native stack frames.
  return '\n' + prefix + name + suffix;
}
{
  var PossiblyWeakMap = typeof WeakMap === 'function' ? WeakMap : Map;
  new PossiblyWeakMap();
}

function getOwnerStackByComponentInfoInDev(componentInfo) {
  try {
    var info = '';

    // The owner stack of the current component will be where it was created, i.e. inside its owner.
    // There's no actual name of the currently executing component. Instead, that is available
    // on the regular stack that's currently executing. However, if there is no owner at all, then
    // there's no stack frame so we add the name of the root component to the stack to know which
    // component is currently executing.
    if (!componentInfo.owner && typeof componentInfo.name === 'string') {
      return describeBuiltInComponentFrame(componentInfo.name);
    }
    var owner = componentInfo;
    while (owner) {
      var ownerStack = owner.debugStack;
      if (ownerStack != null) {
        // Server Component
        owner = owner.owner;
        if (owner) {
          // TODO: Should we stash this somewhere for caching purposes?
          info += '\n' + formatOwnerStack(ownerStack);
        }
      } else {
        break;
      }
    }
    return info;
  } catch (x) {
    return '\nError generating stack: ' + x.message + '\n' + x.stack;
  }
}

var lastResetTime = 0;
var getCurrentTime;
var hasPerformanceNow =
// $FlowFixMe[method-unbinding]
typeof performance === 'object' && typeof performance.now === 'function';
if (hasPerformanceNow) {
  var localPerformance = performance;
  getCurrentTime = function () {
    return localPerformance.now();
  };
} else {
  var localDate = Date;
  getCurrentTime = function () {
    return localDate.now();
  };
}
function resetOwnerStackLimit() {
  {
    var now = getCurrentTime();
    var timeSinceLastReset = now - lastResetTime;
    if (timeSinceLastReset > 1000) {
      ReactSharedInternalsServer.recentlyCreatedOwnerStacks = 0;
      lastResetTime = now;
    }
  }
}

// These indirections exists so we can exclude its stack frame in DEV (and anything below it).
// TODO: Consider marking the whole bundle instead of these boundaries.

var callComponent = {
  react_stack_bottom_frame: function (Component, props, componentDebugInfo) {
    // The secondArg is always undefined in Server Components since refs error early.
    var secondArg = undefined;
    setCurrentOwner(componentDebugInfo);
    try {
      return Component(props, secondArg);
    } finally {
      setCurrentOwner(null);
    }
  }
};
var callComponentInDEV = // We use this technique to trick minifiers to preserve the function name.
callComponent.react_stack_bottom_frame.bind(callComponent) ;
var callLazyInit = {
  react_stack_bottom_frame: function (lazy) {
    var payload = lazy._payload;
    var init = lazy._init;
    return init(payload);
  }
};
var callLazyInitInDEV = // We use this technique to trick minifiers to preserve the function name.
callLazyInit.react_stack_bottom_frame.bind(callLazyInit) ;
var callIterator = {
  react_stack_bottom_frame: function (iterator, progress, error) {
    iterator.next().then(progress, error);
  }
};
var callIteratorInDEV = // We use this technique to trick minifiers to preserve the function name.
callIterator.react_stack_bottom_frame.bind(callIterator) ;

var isArrayImpl = Array.isArray;
function isArray(a) {
  return isArrayImpl(a);
}

var getPrototypeOf = Object.getPrototypeOf;

// Used for DEV messages to keep track of which parent rendered some props,
// in case they error.
var jsxPropsParents = new WeakMap();
var jsxChildrenParents = new WeakMap();
function isObjectPrototype(object) {
  if (!object) {
    return false;
  }
  var ObjectPrototype = Object.prototype;
  if (object === ObjectPrototype) {
    return true;
  }
  // It might be an object from a different Realm which is
  // still just a plain simple object.
  if (getPrototypeOf(object)) {
    return false;
  }
  var names = Object.getOwnPropertyNames(object);
  for (var i = 0; i < names.length; i++) {
    if (!(names[i] in ObjectPrototype)) {
      return false;
    }
  }
  return true;
}
function isGetter(object, name) {
  var ObjectPrototype = Object.prototype;
  if (object === ObjectPrototype || object === null) {
    return false;
  }
  var descriptor = Object.getOwnPropertyDescriptor(object, name);
  if (descriptor === undefined) {
    return isGetter(getPrototypeOf(object), name);
  }
  return typeof descriptor.get === 'function';
}
function isSimpleObject(object) {
  if (!isObjectPrototype(getPrototypeOf(object))) {
    return false;
  }
  var names = Object.getOwnPropertyNames(object);
  for (var i = 0; i < names.length; i++) {
    var descriptor = Object.getOwnPropertyDescriptor(object, names[i]);
    if (!descriptor) {
      return false;
    }
    if (!descriptor.enumerable) {
      if ((names[i] === 'key' || names[i] === 'ref') && typeof descriptor.get === 'function') {
        // React adds key and ref getters to props objects to issue warnings.
        // Those getters will not be transferred to the client, but that's ok,
        // so we'll special case them.
        continue;
      }
      return false;
    }
  }
  return true;
}
function objectName(object) {
  // $FlowFixMe[method-unbinding]
  var name = Object.prototype.toString.call(object);
  // Extract 'Object' from '[object Object]':
  return name.slice(8, name.length - 1);
}
function describeKeyForErrorMessage(key) {
  var encodedKey = JSON.stringify(key);
  return '"' + key + '"' === encodedKey ? key : encodedKey;
}
function describeValueForErrorMessage(value) {
  switch (typeof value) {
    case 'string':
      {
        return JSON.stringify(value.length <= 10 ? value : value.slice(0, 10) + '...');
      }
    case 'object':
      {
        if (isArray(value)) {
          return '[...]';
        }
        if (value !== null && value.$$typeof === CLIENT_REFERENCE_TAG) {
          return describeClientReference();
        }
        var name = objectName(value);
        if (name === 'Object') {
          return '{...}';
        }
        return name;
      }
    case 'function':
      {
        if (value.$$typeof === CLIENT_REFERENCE_TAG) {
          return describeClientReference();
        }
        var _name = value.displayName || value.name;
        return _name ? 'function ' + _name : 'function';
      }
    default:
      // eslint-disable-next-line react-internal/safe-string-coercion
      return String(value);
  }
}
function describeElementType(type) {
  if (typeof type === 'string') {
    return type;
  }
  switch (type) {
    case REACT_SUSPENSE_TYPE:
      return 'Suspense';
    case REACT_SUSPENSE_LIST_TYPE:
      return 'SuspenseList';
    case REACT_VIEW_TRANSITION_TYPE:
      {
        return 'ViewTransition';
      }
  }
  if (typeof type === 'object') {
    switch (type.$$typeof) {
      case REACT_FORWARD_REF_TYPE:
        return describeElementType(type.render);
      case REACT_MEMO_TYPE:
        return describeElementType(type.type);
      case REACT_LAZY_TYPE:
        {
          var lazyComponent = type;
          var payload = lazyComponent._payload;
          var init = lazyComponent._init;
          try {
            // Lazy may contain any component type so we recursively resolve it.
            return describeElementType(init(payload));
          } catch (x) {}
        }
    }
  }
  return '';
}
var CLIENT_REFERENCE_TAG = Symbol.for('react.client.reference');
function describeClientReference(ref) {
  return 'client';
}
function describeObjectForErrorMessage(objectOrArray, expandedName) {
  var objKind = objectName(objectOrArray);
  if (objKind !== 'Object' && objKind !== 'Array') {
    return objKind;
  }
  var str = '';
  var start = -1;
  var length = 0;
  if (isArray(objectOrArray)) {
    if (jsxChildrenParents.has(objectOrArray)) {
      // Print JSX Children
      var type = jsxChildrenParents.get(objectOrArray);
      str = '<' + describeElementType(type) + '>';
      var array = objectOrArray;
      for (var i = 0; i < array.length; i++) {
        var value = array[i];
        var substr = void 0;
        if (typeof value === 'string') {
          substr = value;
        } else if (typeof value === 'object' && value !== null) {
          substr = '{' + describeObjectForErrorMessage(value) + '}';
        } else {
          substr = '{' + describeValueForErrorMessage(value) + '}';
        }
        if ('' + i === expandedName) {
          start = str.length;
          length = substr.length;
          str += substr;
        } else if (substr.length < 15 && str.length + substr.length < 40) {
          str += substr;
        } else {
          str += '{...}';
        }
      }
      str += '</' + describeElementType(type) + '>';
    } else {
      // Print Array
      str = '[';
      var _array = objectOrArray;
      for (var _i = 0; _i < _array.length; _i++) {
        if (_i > 0) {
          str += ', ';
        }
        var _value = _array[_i];
        var _substr = void 0;
        if (typeof _value === 'object' && _value !== null) {
          _substr = describeObjectForErrorMessage(_value);
        } else {
          _substr = describeValueForErrorMessage(_value);
        }
        if ('' + _i === expandedName) {
          start = str.length;
          length = _substr.length;
          str += _substr;
        } else if (_substr.length < 10 && str.length + _substr.length < 40) {
          str += _substr;
        } else {
          str += '...';
        }
      }
      str += ']';
    }
  } else {
    if (objectOrArray.$$typeof === REACT_ELEMENT_TYPE) {
      str = '<' + describeElementType(objectOrArray.type) + '/>';
    } else if (objectOrArray.$$typeof === CLIENT_REFERENCE_TAG) {
      return describeClientReference();
    } else if (jsxPropsParents.has(objectOrArray)) {
      // Print JSX
      var _type = jsxPropsParents.get(objectOrArray);
      str = '<' + (describeElementType(_type) || '...');
      var object = objectOrArray;
      var names = Object.keys(object);
      for (var _i2 = 0; _i2 < names.length; _i2++) {
        str += ' ';
        var name = names[_i2];
        str += describeKeyForErrorMessage(name) + '=';
        var _value2 = object[name];
        var _substr2 = void 0;
        if (name === expandedName && typeof _value2 === 'object' && _value2 !== null) {
          _substr2 = describeObjectForErrorMessage(_value2);
        } else {
          _substr2 = describeValueForErrorMessage(_value2);
        }
        if (typeof _value2 !== 'string') {
          _substr2 = '{' + _substr2 + '}';
        }
        if (name === expandedName) {
          start = str.length;
          length = _substr2.length;
          str += _substr2;
        } else if (_substr2.length < 10 && str.length + _substr2.length < 40) {
          str += _substr2;
        } else {
          str += '...';
        }
      }
      str += '>';
    } else {
      // Print Object
      str = '{';
      var _object = objectOrArray;
      var _names = Object.keys(_object);
      for (var _i3 = 0; _i3 < _names.length; _i3++) {
        if (_i3 > 0) {
          str += ', ';
        }
        var _name2 = _names[_i3];
        str += describeKeyForErrorMessage(_name2) + ': ';
        var _value3 = _object[_name2];
        var _substr3 = void 0;
        if (typeof _value3 === 'object' && _value3 !== null) {
          _substr3 = describeObjectForErrorMessage(_value3);
        } else {
          _substr3 = describeValueForErrorMessage(_value3);
        }
        if (_name2 === expandedName) {
          start = str.length;
          length = _substr3.length;
          str += _substr3;
        } else if (_substr3.length < 10 && str.length + _substr3.length < 40) {
          str += _substr3;
        } else {
          str += '...';
        }
      }
      str += '}';
    }
  }
  if (expandedName === undefined) {
    return str;
  }
  if (start > -1 && length > 0) {
    var highlight = ' '.repeat(start) + '^'.repeat(length);
    return '\n  ' + str + '\n  ' + highlight;
  }
  return '\n  ' + str;
}

// $FlowFixMe[method-unbinding]
var hasOwnProperty = Object.prototype.hasOwnProperty;

// Turns a TypedArray or ArrayBuffer into a string that can be used for comparison
// in a Map to see if the bytes are the same.
function binaryToComparableString(view) {
  return String.fromCharCode.apply(String, new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
}

var IO_NODE = 0;
var PROMISE_NODE = 1;
var AWAIT_NODE = 2;
var UNRESOLVED_PROMISE_NODE = 3;
var UNRESOLVED_AWAIT_NODE = 4;

// DEV-only set containing internal objects that should not be limited and turned into getters.
var doNotLimit = new WeakSet() ;
function defaultFilterStackFrame(filename, functionName) {
  return filename !== '' && !filename.startsWith('node:') && !filename.includes('node_modules');
}
function devirtualizeURL(url) {
  if (url.startsWith('about://React/')) {
    // This callsite is a virtual fake callsite that came from another Flight client.
    // We need to reverse it back into the original location by stripping its prefix
    // and suffix. We don't need the environment name because it's available on the
    // parent object that will contain the stack.
    var envIdx = url.indexOf('/', 'about://React/'.length);
    var suffixIdx = url.lastIndexOf('?');
    if (envIdx > -1 && suffixIdx > -1) {
      return decodeURI(url.slice(envIdx + 1, suffixIdx));
    }
  }
  return url;
}
function isPromiseCreationInternal(url, functionName) {
  // Various internals of the JS VM can create Promises but the call frame of the
  // internals are not very interesting for our purposes so we need to skip those.
  if (url === 'node:internal/async_hooks') {
    // Ignore the stack frames from the async hooks themselves.
    return true;
  }
  if (url !== '') {
    return false;
  }
  switch (functionName) {
    case 'new Promise':
    case 'Function.withResolvers':
    case 'Function.reject':
    case 'Function.resolve':
    case 'Function.all':
    case 'Function.allSettled':
    case 'Function.race':
    case 'Function.try':
      return true;
    default:
      return false;
  }
}
function stripLeadingPromiseCreationFrames(stack) {
  for (var i = 0; i < stack.length; i++) {
    var callsite = stack[i];
    var functionName = callsite[0];
    var url = callsite[1];
    if (!isPromiseCreationInternal(url, functionName)) {
      if (i > 0) {
        return stack.slice(i);
      } else {
        return stack;
      }
    }
  }
  return [];
}
function findCalledFunctionNameFromStackTrace(request, stack) {
  // Gets the name of the first function called from first party code.
  var bestMatch = '';
  var filterStackFrame = request.filterStackFrame;
  for (var i = 0; i < stack.length; i++) {
    var callsite = stack[i];
    var functionName = callsite[0];
    var url = devirtualizeURL(callsite[1]);
    var lineNumber = callsite[2];
    var columnNumber = callsite[3];
    if (filterStackFrame(url, functionName, lineNumber, columnNumber) &&
    // Don't consider anonymous code first party even if the filter wants to include them in the stack.
    url !== '') {
      if (bestMatch === '') {
        // If we had no good stack frames for internal calls, just use the last
        // first party function name.
        return functionName;
      }
      return bestMatch;
    } else {
      bestMatch = functionName;
    }
  }
  return '';
}
function filterStackTrace(request, stack) {
  // Since stacks can be quite large and we pass a lot of them, we filter them out eagerly
  // to save bandwidth even in DEV. We'll also replay these stacks on the client so by
  // stripping them early we avoid that overhead. Otherwise we'd normally just rely on
  // the DevTools or framework's ignore lists to filter them out.
  var filterStackFrame = request.filterStackFrame;
  var filteredStack = [];
  for (var i = 0; i < stack.length; i++) {
    var callsite = stack[i];
    var functionName = callsite[0];
    var url = devirtualizeURL(callsite[1]);
    var lineNumber = callsite[2];
    var columnNumber = callsite[3];
    if (filterStackFrame(url, functionName, lineNumber, columnNumber)) {
      // Use a clone because the Flight protocol isn't yet resilient to deduping
      // objects in the debug info. TODO: Support deduping stacks.
      var clone = callsite.slice(0);
      clone[1] = url;
      filteredStack.push(clone);
    }
  }
  return filteredStack;
}
function hasUnfilteredFrame(request, stack) {
  var filterStackFrame = request.filterStackFrame;
  for (var i = 0; i < stack.length; i++) {
    var callsite = stack[i];
    var functionName = callsite[0];
    var url = devirtualizeURL(callsite[1]);
    var lineNumber = callsite[2];
    var columnNumber = callsite[3];
    // Ignore async stack frames because they're not "real". We'd expect to have at least
    // one non-async frame if we're actually executing inside a first party function.
    // Otherwise we might just be in the resume of a third party function that resumed
    // inside a first party stack.
    var isAsync = callsite[6];
    if (!isAsync && filterStackFrame(url, functionName, lineNumber, columnNumber) &&
    // Ignore anonymous stack frames like internals. They are also not in first party
    // code even though it might be useful to include them in the final stack.
    url !== '') {
      return true;
    }
  }
  return false;
}
function isPromiseAwaitInternal(url, functionName) {
  // Various internals of the JS VM can await internally on a Promise. If those are at
  // the top of the stack then we don't want to consider them as internal frames. The
  // true "await" conceptually is the thing that called the helper.
  // Ideally we'd also include common third party helpers for this.
  if (url === 'node:internal/async_hooks') {
    // Ignore the stack frames from the async hooks themselves.
    return true;
  }
  if (url !== '') {
    return false;
  }
  switch (functionName) {
    case 'Promise.then':
    case 'Promise.catch':
    case 'Promise.finally':
    case 'Function.reject':
    case 'Function.resolve':
    case 'Function.all':
    case 'Function.allSettled':
    case 'Function.any':
    case 'Function.race':
    case 'Function.try':
    case 'Function.withResolvers':
      return true;
    default:
      return false;
  }
}
function isAwaitInUserspace(request, stack) {
  var firstFrame = 0;
  while (stack.length > firstFrame && isPromiseAwaitInternal(stack[firstFrame][1], stack[firstFrame][0])) {
    // Skip the internal frame that awaits itself.
    firstFrame++;
  }
  if (stack.length > firstFrame) {
    // Check if the very first stack frame that awaited this Promise was in user space.
    // TODO: This doesn't take into account wrapper functions such as our fake .then()
    // in FlightClient which will always be considered third party awaits if you call
    // .then directly.
    var filterStackFrame = request.filterStackFrame;
    var callsite = stack[firstFrame];
    var functionName = callsite[0];
    var url = devirtualizeURL(callsite[1]);
    var lineNumber = callsite[2];
    var columnNumber = callsite[3];
    return filterStackFrame(url, functionName, lineNumber, columnNumber) && url !== '';
  }
  return false;
}
function patchConsole(consoleInst, methodName) {
  var descriptor = Object.getOwnPropertyDescriptor(consoleInst, methodName);
  if (descriptor && (descriptor.configurable || descriptor.writable) && typeof descriptor.value === 'function') {
    var originalMethod = descriptor.value;
    var originalName = Object.getOwnPropertyDescriptor(
    // $FlowFixMe[incompatible-call]: We should be able to get descriptors from any function.
    originalMethod, 'name');
    var wrapperMethod = function () {
      var request = resolveRequest();
      if (methodName === 'assert' && arguments[0]) ; else if (request !== null) {
        // Extract the stack. Not all console logs print the full stack but they have at
        // least the line it was called from. We could optimize transfer by keeping just
        // one stack frame but keeping it simple for now and include all frames.
        var stack = filterStackTrace(request, parseStackTracePrivate(new Error('react-stack-top-frame'), 1) || []);
        request.pendingDebugChunks++;
        var owner = resolveOwner();
        var args = Array.from(arguments);
        // Extract the env if this is a console log that was replayed from another env.
        var env = unbadgeConsole(methodName, args);
        if (env === null) {
          // Otherwise add the current environment.
          env = (0, request.environmentName)();
        }
        emitConsoleChunk(request, methodName, owner, env, stack, args);
      }
      // $FlowFixMe[incompatible-call]
      return originalMethod.apply(this, arguments);
    };
    if (originalName) {
      Object.defineProperty(wrapperMethod,
      // $FlowFixMe[cannot-write] yes it is
      'name', originalName);
    }
    Object.defineProperty(consoleInst, methodName, {
      value: wrapperMethod
    });
  }
}
if (typeof console === 'object' && console !== null) {
  // Instrument console to capture logs for replaying on the client.
  patchConsole(console, 'assert');
  patchConsole(console, 'debug');
  patchConsole(console, 'dir');
  patchConsole(console, 'dirxml');
  patchConsole(console, 'error');
  patchConsole(console, 'group');
  patchConsole(console, 'groupCollapsed');
  patchConsole(console, 'groupEnd');
  patchConsole(console, 'info');
  patchConsole(console, 'log');
  patchConsole(console, 'table');
  patchConsole(console, 'trace');
  patchConsole(console, 'warn');
}
function getCurrentStackInDEV() {
  {
    var owner = resolveOwner();
    if (owner === null) {
      return '';
    }
    return getOwnerStackByComponentInfoInDev(owner);
  }
}
var ObjectPrototype$1 = Object.prototype;
var stringify = JSON.stringify;

// Serializable values

// Thenable<ReactClientValue>

// task status
var PENDING$1 = 0;
var COMPLETED = 1;
var ABORTED = 3;
var ERRORED$1 = 4;
var RENDERING = 5;
var OPENING = 10;
var OPEN = 11;
var ABORTING = 12;
var CLOSING = 13;
var CLOSED = 14;
var RENDER = 20;
var PRERENDER = 21;
var TaintRegistryObjects = ReactSharedInternalsServer.TaintRegistryObjects,
  TaintRegistryValues = ReactSharedInternalsServer.TaintRegistryValues,
  TaintRegistryByteLengths = ReactSharedInternalsServer.TaintRegistryByteLengths,
  TaintRegistryPendingRequests = ReactSharedInternalsServer.TaintRegistryPendingRequests;
function throwTaintViolation(message) {
  // eslint-disable-next-line react-internal/prod-error-codes
  throw new Error(message);
}
function cleanupTaintQueue(request) {
  var cleanupQueue = request.taintCleanupQueue;
  TaintRegistryPendingRequests.delete(cleanupQueue);
  for (var i = 0; i < cleanupQueue.length; i++) {
    var entryValue = cleanupQueue[i];
    var entry = TaintRegistryValues.get(entryValue);
    if (entry !== undefined) {
      if (entry.count === 1) {
        TaintRegistryValues.delete(entryValue);
      } else {
        entry.count--;
      }
    }
  }
  cleanupQueue.length = 0;
}
function defaultErrorHandler(error) {
  console['error'](error);
  // Don't transform to our wrapper
}
function RequestInstance(type, model, bundlerConfig, onError, onAllReady, onFatalError, identifierPrefix, temporaryReferences, debugStartTime,
// Profiling-only
environmentName,
// DEV-only
filterStackFrame,
// DEV-only
keepDebugAlive // DEV-only
) {
  if (ReactSharedInternalsServer.A !== null && ReactSharedInternalsServer.A !== DefaultAsyncDispatcher) {
    throw new Error('Currently React only supports one RSC renderer at a time.');
  }
  ReactSharedInternalsServer.A = DefaultAsyncDispatcher;
  {
    // Unlike Fizz or Fiber, we don't reset this and just keep it on permanently.
    // This lets it act more like the AsyncDispatcher so that we can get the
    // stack asynchronously too.
    ReactSharedInternalsServer.getCurrentStack = getCurrentStackInDEV;
  }
  var abortSet = new Set();
  var pingedTasks = [];
  var cleanupQueue = [];
  {
    TaintRegistryPendingRequests.add(cleanupQueue);
  }
  var hints = createHints();
  this.type = type;
  this.status = OPENING;
  this.flushScheduled = false;
  this.fatalError = null;
  this.destination = null;
  this.bundlerConfig = bundlerConfig;
  this.cache = new Map();
  this.cacheController = new AbortController();
  this.nextChunkId = 0;
  this.pendingChunks = 0;
  this.hints = hints;
  this.abortableTasks = abortSet;
  this.pingedTasks = pingedTasks;
  this.completedImportChunks = [];
  this.completedHintChunks = [];
  this.completedRegularChunks = [];
  this.completedErrorChunks = [];
  this.writtenSymbols = new Map();
  this.writtenClientReferences = new Map();
  this.writtenServerReferences = new Map();
  this.writtenObjects = new WeakMap();
  this.temporaryReferences = temporaryReferences;
  this.identifierPrefix = identifierPrefix || '';
  this.identifierCount = 1;
  this.taintCleanupQueue = cleanupQueue;
  this.onError = onError === undefined ? defaultErrorHandler : onError;
  this.onAllReady = onAllReady;
  this.onFatalError = onFatalError;
  {
    this.pendingDebugChunks = 0;
    this.completedDebugChunks = [];
    this.debugDestination = null;
    this.environmentName = environmentName === undefined ? function () {
      return 'Server';
    } : typeof environmentName !== 'function' ? function () {
      return environmentName;
    } : environmentName;
    this.filterStackFrame = filterStackFrame === undefined ? defaultFilterStackFrame : filterStackFrame;
    this.didWarnForKey = null;
    this.writtenDebugObjects = new WeakMap();
    this.deferredDebugObjects = keepDebugAlive ? {
      retained: new Map(),
      existing: new Map()
    } : null;
    this.earlyDebugInfoEntries = null;
  }
  var timeOrigin;
  {
    // We start by serializing the time origin. Any future timestamps will be
    // emitted relatively to this origin. Instead of using performance.timeOrigin
    // as this origin, we use the timestamp at the start of the request.
    // This avoids leaking unnecessary information like how long the server has
    // been running and allows for more compact representation of each timestamp.
    // The time origin is stored as an offset in the time space of this environment.
    if (typeof debugStartTime === 'number') {
      // We expect `startTime` to be an absolute timestamp, so relativize it to match the other case.
      timeOrigin = this.timeOrigin = debugStartTime -
      // $FlowFixMe[prop-missing]
      performance.timeOrigin;
    } else {
      timeOrigin = this.timeOrigin = performance.now();
    }
    emitTimeOriginChunk(this, timeOrigin +
    // $FlowFixMe[prop-missing]
    performance.timeOrigin);
    this.abortTime = -0.0;
  }
  var rootTask = createTask(this, model, null, false, createRootFormatContext(), abortSet, timeOrigin, null, null, null);
  pingedTasks.push(rootTask);
}
function createRequest(model, bundlerConfig, onError, identifierPrefix, temporaryReferences, debugStartTime,
// Profiling-only
environmentName,
// DEV-only
filterStackFrame,
// DEV-only
keepDebugAlive // DEV-only
) {
  {
    resetOwnerStackLimit();
  }

  // $FlowFixMe[invalid-constructor]: the shapes are exact here but Flow doesn't like constructors
  return new RequestInstance(RENDER, model, bundlerConfig, onError, noop, noop, identifierPrefix, temporaryReferences, debugStartTime, environmentName, filterStackFrame, keepDebugAlive);
}
function createPrerenderRequest(model, bundlerConfig, onAllReady, onFatalError, onError, identifierPrefix, temporaryReferences, debugStartTime,
// Profiling-only
environmentName,
// DEV-only
filterStackFrame,
// DEV-only
keepDebugAlive // DEV-only
) {
  {
    resetOwnerStackLimit();
  }

  // $FlowFixMe[invalid-constructor]: the shapes are exact here but Flow doesn't like constructors
  return new RequestInstance(PRERENDER, model, bundlerConfig, onError, onAllReady, onFatalError, identifierPrefix, temporaryReferences, debugStartTime, environmentName, filterStackFrame, keepDebugAlive);
}
var currentRequest = null;
function resolveRequest() {
  if (currentRequest) return currentRequest;
  if (supportsRequestStorage) {
    var store = requestStorage.getStore();
    if (store) return store;
  }
  return null;
}
function isTypedArray(value) {
  if (value instanceof ArrayBuffer) {
    return true;
  }
  if (value instanceof Int8Array) {
    return true;
  }
  if (value instanceof Uint8Array) {
    return true;
  }
  if (value instanceof Uint8ClampedArray) {
    return true;
  }
  if (value instanceof Int16Array) {
    return true;
  }
  if (value instanceof Uint16Array) {
    return true;
  }
  if (value instanceof Int32Array) {
    return true;
  }
  if (value instanceof Uint32Array) {
    return true;
  }
  if (value instanceof Float32Array) {
    return true;
  }
  if (value instanceof Float64Array) {
    return true;
  }
  if (value instanceof BigInt64Array) {
    return true;
  }
  if (value instanceof BigUint64Array) {
    return true;
  }
  if (value instanceof DataView) {
    return true;
  }
  return false;
}
function serializeDebugThenable(request, counter, thenable) {
  // Like serializeThenable but for renderDebugModel
  request.pendingDebugChunks++;
  var id = request.nextChunkId++;
  var ref = serializePromiseID(id);
  request.writtenDebugObjects.set(thenable, ref);
  switch (thenable.status) {
    case 'fulfilled':
      {
        emitOutlinedDebugModelChunk(request, id, counter, thenable.value);
        return ref;
      }
    case 'rejected':
      {
        var x = thenable.reason;
        // We don't log these errors since they didn't actually throw into Flight.
        var digest = '';
        emitErrorChunk(request, id, digest, x, true, null);
        return ref;
      }
  }
  if (request.status === ABORTING) {
    // Ensure that we have time to emit the halt chunk if we're sync aborting.
    emitDebugHaltChunk(request, id);
    return ref;
  }
  var deferredDebugObjects = request.deferredDebugObjects;
  if (deferredDebugObjects !== null) {
    // For Promises that are not yet resolved, we always defer them. They are async anyway so it's
    // safe to defer them. This also ensures that we don't eagerly call .then() on a Promise that
    // otherwise wouldn't have initialized. It also ensures that we don't "handle" a rejection
    // that otherwise would have triggered unhandled rejection.
    deferredDebugObjects.retained.set(id, thenable);
    var deferredRef = '$Y@' + id.toString(16);
    // We can now refer to the deferred object in the future.
    request.writtenDebugObjects.set(thenable, deferredRef);
    return deferredRef;
  }
  var cancelled = false;
  thenable.then(function (value) {
    if (cancelled) {
      return;
    }
    cancelled = true;
    if (request.status === ABORTING) {
      emitDebugHaltChunk(request, id);
      enqueueFlush(request);
      return;
    }
    if (isArray(value) && value.length > 200 || isTypedArray(value) && value.byteLength > 1000) {
      // If this should be deferred, but we don't have a debug channel installed
      // it would get omitted. We can't omit outlined models but we can avoid
      // resolving the Promise at all by halting it.
      emitDebugHaltChunk(request, id);
      enqueueFlush(request);
      return;
    }
    emitOutlinedDebugModelChunk(request, id, counter, value);
    enqueueFlush(request);
  }, function (reason) {
    if (cancelled) {
      return;
    }
    cancelled = true;
    if (request.status === ABORTING) {
      emitDebugHaltChunk(request, id);
      enqueueFlush(request);
      return;
    }
    // We don't log these errors since they didn't actually throw into Flight.
    var digest = '';
    emitErrorChunk(request, id, digest, reason, true, null);
    enqueueFlush(request);
  });

  // We don't use scheduleMicrotask here because it doesn't actually schedule a microtask
  // in all our configs which is annoying.
  Promise.resolve().then(function () {
    // If we don't resolve the Promise within a microtask. Leave it as hanging since we
    // don't want to block the render forever on a Promise that might never resolve.
    if (cancelled) {
      return;
    }
    cancelled = true;
    emitDebugHaltChunk(request, id);
    enqueueFlush(request);
    // Clean up the request so we don't leak this forever.
    request = null;
    counter = null;
  });
  return ref;
}
function emitRequestedDebugThenable(request, id, counter, thenable) {
  thenable.then(function (value) {
    if (request.status === ABORTING) {
      emitDebugHaltChunk(request, id);
      enqueueFlush(request);
      return;
    }
    emitOutlinedDebugModelChunk(request, id, counter, value);
    enqueueFlush(request);
  }, function (reason) {
    if (request.status === ABORTING) {
      emitDebugHaltChunk(request, id);
      enqueueFlush(request);
      return;
    }
    // We don't log these errors since they didn't actually throw into Flight.
    var digest = '';
    emitErrorChunk(request, id, digest, reason, true, null);
    enqueueFlush(request);
  });
}
function serializeThenable(request, task, thenable) {
  var newTask = createTask(request, thenable,
  // will be replaced by the value before we retry. used for debug info.
  task.keyPath,
  // the server component sequence continues through Promise-as-a-child.
  task.implicitSlot, task.formatContext, request.abortableTasks, task.time , task.debugOwner , task.debugStack , task.debugTask );
  switch (thenable.status) {
    case 'fulfilled':
      {
        forwardDebugInfoFromThenable(request, newTask, thenable, null, null);
        // We have the resolved value, we can go ahead and schedule it for serialization.
        newTask.model = thenable.value;
        pingTask(request, newTask);
        return newTask.id;
      }
    case 'rejected':
      {
        forwardDebugInfoFromThenable(request, newTask, thenable, null, null);
        var x = thenable.reason;
        erroredTask(request, newTask, x);
        return newTask.id;
      }
    default:
      {
        if (request.status === ABORTING) {
          // We can no longer accept any resolved values
          request.abortableTasks.delete(newTask);
          if (request.type === PRERENDER) {
            haltTask(newTask);
            finishHaltedTask(newTask, request);
          } else {
            var errorId = request.fatalError;
            abortTask(newTask);
            finishAbortedTask(newTask, request, errorId);
          }
          return newTask.id;
        }
        if (typeof thenable.status === 'string') {
          // Only instrument the thenable if the status if not defined. If
          // it's defined, but an unknown value, assume it's been instrumented by
          // some custom userspace implementation. We treat it as "pending".
          break;
        }
        var pendingThenable = thenable;
        pendingThenable.status = 'pending';
        pendingThenable.then(function (fulfilledValue) {
          if (thenable.status === 'pending') {
            var fulfilledThenable = thenable;
            fulfilledThenable.status = 'fulfilled';
            fulfilledThenable.value = fulfilledValue;
          }
        }, function (error) {
          if (thenable.status === 'pending') {
            var rejectedThenable = thenable;
            rejectedThenable.status = 'rejected';
            rejectedThenable.reason = error;
          }
        });
        break;
      }
  }
  thenable.then(function (value) {
    forwardDebugInfoFromCurrentContext(request, newTask, thenable);
    newTask.model = value;
    pingTask(request, newTask);
  }, function (reason) {
    if (newTask.status === PENDING$1) {
      {
        // If this is async we need to time when this task finishes.
        newTask.timed = true;
      }
      // We expect that the only status it might be otherwise is ABORTED.
      // When we abort we emit chunks in each pending task slot and don't need
      // to do so again here.
      erroredTask(request, newTask, reason);
      enqueueFlush(request);
    }
  });
  return newTask.id;
}
function serializeReadableStream(request, task, stream) {
  // Detect if this is a BYOB stream. BYOB streams should be able to be read as bytes on the
  // receiving side. It also implies that different chunks can be split up or merged as opposed
  // to a readable stream that happens to have Uint8Array as the type which might expect it to be
  // received in the same slices.
  // $FlowFixMe: This is a Node.js extension.
  var supportsBYOB = stream.supportsBYOB;
  if (supportsBYOB === undefined) {
    try {
      // $FlowFixMe[extra-arg]: This argument is accepted.
      stream.getReader({
        mode: 'byob'
      }).releaseLock();
      supportsBYOB = true;
    } catch (x) {
      supportsBYOB = false;
    }
  }
  // At this point supportsBYOB is guaranteed to be a boolean.
  var isByteStream = supportsBYOB;
  var reader = stream.getReader();

  // This task won't actually be retried. We just use it to attempt synchronous renders.
  var streamTask = createTask(request, task.model, task.keyPath, task.implicitSlot, task.formatContext, request.abortableTasks, task.time , task.debugOwner , task.debugStack , task.debugTask );

  // The task represents the Stop row. This adds a Start row.
  request.pendingChunks++;
  var startStreamRow = streamTask.id.toString(16) + ':' + (isByteStream ? 'r' : 'R') + '\n';
  request.completedRegularChunks.push(stringToChunk(startStreamRow));
  function progress(entry) {
    if (streamTask.status !== PENDING$1) {
      return;
    }
    if (entry.done) {
      streamTask.status = COMPLETED;
      var endStreamRow = streamTask.id.toString(16) + ':C\n';
      request.completedRegularChunks.push(stringToChunk(endStreamRow));
      request.abortableTasks.delete(streamTask);
      request.cacheController.signal.removeEventListener('abort', abortStream);
      enqueueFlush(request);
      callOnAllReadyIfReady(request);
    } else {
      try {
        request.pendingChunks++;
        streamTask.model = entry.value;
        if (isByteStream) {
          // Chunks of byte streams are always Uint8Array instances.
          var chunk = streamTask.model;
          emitTypedArrayChunk(request, streamTask.id, 'b', chunk, false);
        } else {
          tryStreamTask(request, streamTask);
        }
        enqueueFlush(request);
        reader.read().then(progress, error);
      } catch (x) {
        error(x);
      }
    }
  }
  function error(reason) {
    if (streamTask.status !== PENDING$1) {
      return;
    }
    request.cacheController.signal.removeEventListener('abort', abortStream);
    erroredTask(request, streamTask, reason);
    enqueueFlush(request);

    // $FlowFixMe should be able to pass mixed
    reader.cancel(reason).then(error, error);
  }
  function abortStream() {
    if (streamTask.status !== PENDING$1) {
      return;
    }
    var signal = request.cacheController.signal;
    signal.removeEventListener('abort', abortStream);
    var reason = signal.reason;
    if (request.type === PRERENDER) {
      request.abortableTasks.delete(streamTask);
      haltTask(streamTask);
      finishHaltedTask(streamTask, request);
    } else {
      // TODO: Make this use abortTask() instead.
      erroredTask(request, streamTask, reason);
      enqueueFlush(request);
    }
    // $FlowFixMe should be able to pass mixed
    reader.cancel(reason).then(error, error);
  }
  request.cacheController.signal.addEventListener('abort', abortStream);
  reader.read().then(progress, error);
  return serializeByValueID(streamTask.id);
}
function serializeAsyncIterable(request, task, iterable, iterator) {
  // Generators/Iterators are Iterables but they're also their own iterator
  // functions. If that's the case, we treat them as single-shot. Otherwise,
  // we assume that this iterable might be a multi-shot and allow it to be
  // iterated more than once on the client.
  var isIterator = iterable === iterator;

  // This task won't actually be retried. We just use it to attempt synchronous renders.
  var streamTask = createTask(request, task.model, task.keyPath, task.implicitSlot, task.formatContext, request.abortableTasks, task.time , task.debugOwner , task.debugStack , task.debugTask );
  {
    var debugInfo = iterable._debugInfo;
    if (debugInfo) {
      forwardDebugInfo(request, streamTask, debugInfo);
    }
  }

  // The task represents the Stop row. This adds a Start row.
  request.pendingChunks++;
  var startStreamRow = streamTask.id.toString(16) + ':' + (isIterator ? 'x' : 'X') + '\n';
  request.completedRegularChunks.push(stringToChunk(startStreamRow));
  function progress(entry) {
    if (streamTask.status !== PENDING$1) {
      return;
    }
    if (entry.done) {
      streamTask.status = COMPLETED;
      var endStreamRow;
      if (entry.value === undefined) {
        endStreamRow = streamTask.id.toString(16) + ':C\n';
      } else {
        // Unlike streams, the last value may not be undefined. If it's not
        // we outline it and encode a reference to it in the closing instruction.
        try {
          var chunkId = outlineModel(request, entry.value);
          endStreamRow = streamTask.id.toString(16) + ':C' + stringify(serializeByValueID(chunkId)) + '\n';
        } catch (x) {
          error(x);
          return;
        }
      }
      request.completedRegularChunks.push(stringToChunk(endStreamRow));
      request.abortableTasks.delete(streamTask);
      request.cacheController.signal.removeEventListener('abort', abortIterable);
      enqueueFlush(request);
      callOnAllReadyIfReady(request);
    } else {
      try {
        streamTask.model = entry.value;
        request.pendingChunks++;
        tryStreamTask(request, streamTask);
        enqueueFlush(request);
        if (true) {
          callIteratorInDEV(iterator, progress, error);
        }
      } catch (x) {
        error(x);
        return;
      }
    }
  }
  function error(reason) {
    if (streamTask.status !== PENDING$1) {
      return;
    }
    request.cacheController.signal.removeEventListener('abort', abortIterable);
    erroredTask(request, streamTask, reason);
    enqueueFlush(request);
    if (typeof iterator.throw === 'function') {
      // The iterator protocol doesn't necessarily include this but a generator do.
      // $FlowFixMe should be able to pass mixed
      iterator.throw(reason).then(error, error);
    }
  }
  function abortIterable() {
    if (streamTask.status !== PENDING$1) {
      return;
    }
    var signal = request.cacheController.signal;
    signal.removeEventListener('abort', abortIterable);
    var reason = signal.reason;
    if (request.type === PRERENDER) {
      request.abortableTasks.delete(streamTask);
      haltTask(streamTask);
      finishHaltedTask(streamTask, request);
    } else {
      // TODO: Make this use abortTask() instead.
      erroredTask(request, streamTask, signal.reason);
      enqueueFlush(request);
    }
    if (typeof iterator.throw === 'function') {
      // The iterator protocol doesn't necessarily include this but a generator do.
      // $FlowFixMe should be able to pass mixed
      iterator.throw(reason).then(error, error);
    }
  }
  request.cacheController.signal.addEventListener('abort', abortIterable);
  {
    callIteratorInDEV(iterator, progress, error);
  }
  return serializeByValueID(streamTask.id);
}
function emitHint(request, code, model) {
  emitHintChunk(request, code, model);
  enqueueFlush(request);
}
function getHints(request) {
  return request.hints;
}
function getCache(request) {
  return request.cache;
}
function readThenable(thenable) {
  if (thenable.status === 'fulfilled') {
    return thenable.value;
  } else if (thenable.status === 'rejected') {
    throw thenable.reason;
  }
  throw thenable;
}
function createLazyWrapperAroundWakeable(request, task, wakeable) {
  // This is a temporary fork of the `use` implementation until we accept
  // promises everywhere.
  var thenable = wakeable;
  switch (thenable.status) {
    case 'fulfilled':
      {
        forwardDebugInfoFromThenable(request, task, thenable, null, null);
        return thenable.value;
      }
    case 'rejected':
      forwardDebugInfoFromThenable(request, task, thenable, null, null);
      break;
    default:
      {
        if (typeof thenable.status === 'string') {
          // Only instrument the thenable if the status if not defined. If
          // it's defined, but an unknown value, assume it's been instrumented by
          // some custom userspace implementation. We treat it as "pending".
          break;
        }
        var pendingThenable = thenable;
        pendingThenable.status = 'pending';
        pendingThenable.then(function (fulfilledValue) {
          forwardDebugInfoFromCurrentContext(request, task, thenable);
          if (thenable.status === 'pending') {
            var fulfilledThenable = thenable;
            fulfilledThenable.status = 'fulfilled';
            fulfilledThenable.value = fulfilledValue;
          }
        }, function (error) {
          forwardDebugInfoFromCurrentContext(request, task, thenable);
          if (thenable.status === 'pending') {
            var rejectedThenable = thenable;
            rejectedThenable.status = 'rejected';
            rejectedThenable.reason = error;
          }
        });
        break;
      }
  }
  var lazyType = {
    $$typeof: REACT_LAZY_TYPE,
    _payload: thenable,
    _init: readThenable
  };
  return lazyType;
}
function callWithDebugContextInDEV(request, task, callback, arg) {
  // We don't have a Server Component instance associated with this callback and
  // the nearest context is likely a Client Component being serialized. We create
  // a fake owner during this callback so we can get the stack trace from it.
  // This also gets sent to the client as the owner for the replaying log.
  var componentDebugInfo = {
    name: '',
    env: task.environmentName,
    key: null,
    owner: task.debugOwner
  };
  // $FlowFixMe[cannot-write]
  componentDebugInfo.stack = task.debugStack === null ? null : filterStackTrace(request, parseStackTrace(task.debugStack, 1));
  // $FlowFixMe[cannot-write]
  componentDebugInfo.debugStack = task.debugStack;
  // $FlowFixMe[cannot-write]
  componentDebugInfo.debugTask = task.debugTask;
  var debugTask = task.debugTask;
  // We don't need the async component storage context here so we only set the
  // synchronous tracking of owner.
  setCurrentOwner(componentDebugInfo);
  try {
    if (debugTask) {
      return debugTask.run(callback.bind(null, arg));
    }
    return callback(arg);
  } finally {
    setCurrentOwner(null);
  }
}
var voidHandler = function () {};
function processServerComponentReturnValue(request, task, Component, result) {
  // A Server Component's return value has a few special properties due to being
  // in the return position of a Component. We convert them here.
  if (typeof result !== 'object' || result === null || isClientReference(result)) {
    return result;
  }
  if (typeof result.then === 'function') {
    // When the return value is in children position we can resolve it immediately,
    // to its value without a wrapper if it's synchronously available.
    var thenable = result;
    {
      // If the thenable resolves to an element, then it was in a static position,
      // the return value of a Server Component. That doesn't need further validation
      // of keys. The Server Component itself would have had a key.
      thenable.then(function (resolvedValue) {
        if (typeof resolvedValue === 'object' && resolvedValue !== null && resolvedValue.$$typeof === REACT_ELEMENT_TYPE) {
          resolvedValue._store.validated = 1;
        }
      }, voidHandler);
    }
    // TODO: Once we accept Promises as children on the client, we can just return
    // the thenable here.
    return createLazyWrapperAroundWakeable(request, task, result);
  }
  {
    if (result.$$typeof === REACT_ELEMENT_TYPE) {
      // If the server component renders to an element, then it was in a static position.
      // That doesn't need further validation of keys. The Server Component itself would
      // have had a key.
      result._store.validated = 1;
    }
  }

  // Normally we'd serialize an Iterator/AsyncIterator as a single-shot which is not compatible
  // to be rendered as a React Child. However, because we have the function to recreate
  // an iterable from rendering the element again, we can effectively treat it as multi-
  // shot. Therefore we treat this as an Iterable/AsyncIterable, whether it was one or not, by
  // adding a wrapper so that this component effectively renders down to an AsyncIterable.
  var iteratorFn = getIteratorFn(result);
  if (iteratorFn) {
    var iterableChild = result;
    var multiShot = _defineProperty({}, Symbol.iterator, function () {
      var iterator = iteratorFn.call(iterableChild);
      {
        // If this was an Iterator but not a GeneratorFunction we warn because
        // it might have been a mistake. Technically you can make this mistake with
        // GeneratorFunctions and even single-shot Iterables too but it's extra
        // tempting to try to return the value from a generator.
        if (iterator === iterableChild) {
          var isGeneratorComponent =
          // $FlowIgnore[method-unbinding]
          Object.prototype.toString.call(Component) === '[object GeneratorFunction]' &&
          // $FlowIgnore[method-unbinding]
          Object.prototype.toString.call(iterableChild) === '[object Generator]';
          if (!isGeneratorComponent) {
            callWithDebugContextInDEV(request, task, function () {
              console.error('Returning an Iterator from a Server Component is not supported ' + 'since it cannot be looped over more than once. ');
            });
          }
        }
      }
      return iterator;
    });
    {
      multiShot._debugInfo = iterableChild._debugInfo;
    }
    return multiShot;
  }
  if (typeof result[ASYNC_ITERATOR] === 'function' && (typeof ReadableStream !== 'function' || !(result instanceof ReadableStream))) {
    var _iterableChild = result;
    var multishot = _defineProperty({}, ASYNC_ITERATOR, function () {
      var iterator = _iterableChild[ASYNC_ITERATOR]();
      {
        // If this was an AsyncIterator but not an AsyncGeneratorFunction we warn because
        // it might have been a mistake. Technically you can make this mistake with
        // AsyncGeneratorFunctions and even single-shot AsyncIterables too but it's extra
        // tempting to try to return the value from a generator.
        if (iterator === _iterableChild) {
          var isGeneratorComponent =
          // $FlowIgnore[method-unbinding]
          Object.prototype.toString.call(Component) === '[object AsyncGeneratorFunction]' &&
          // $FlowIgnore[method-unbinding]
          Object.prototype.toString.call(_iterableChild) === '[object AsyncGenerator]';
          if (!isGeneratorComponent) {
            callWithDebugContextInDEV(request, task, function () {
              console.error('Returning an AsyncIterator from a Server Component is not supported ' + 'since it cannot be looped over more than once. ');
            });
          }
        }
      }
      return iterator;
    });
    {
      multishot._debugInfo = _iterableChild._debugInfo;
    }
    return multishot;
  }
  return result;
}
function renderFunctionComponent(request, task, key, Component, props, validated // DEV-only
) {
  // Reset the task's thenable state before continuing, so that if a later
  // component suspends we can reuse the same task object. If the same
  // component suspends again, the thenable state will be restored.
  var prevThenableState = task.thenableState;
  task.thenableState = null;
  var result;
  var componentDebugInfo;
  {
    if (!canEmitDebugInfo) {
      // We don't have a chunk to assign debug info. We need to outline this
      // component to assign it an ID.
      return outlineTask(request, task);
    } else if (prevThenableState !== null) {
      // This is a replay and we've already emitted the debug info of this component
      // in the first pass. We skip emitting a duplicate line.
      // As a hack we stashed the previous component debug info on this object in DEV.
      componentDebugInfo = prevThenableState._componentDebugInfo;
    } else {
      // This is a new component in the same task so we can emit more debug info.
      var componentDebugID = task.id;
      var componentName = Component.displayName || Component.name || '';
      var componentEnv = (0, request.environmentName)();
      request.pendingChunks++;
      componentDebugInfo = {
        name: componentName,
        env: componentEnv,
        key: key,
        owner: task.debugOwner
      };
      // $FlowFixMe[cannot-write]
      componentDebugInfo.stack = task.debugStack === null ? null : filterStackTrace(request, parseStackTrace(task.debugStack, 1));
      // $FlowFixMe[cannot-write]
      componentDebugInfo.props = props;
      // $FlowFixMe[cannot-write]
      componentDebugInfo.debugStack = task.debugStack;
      // $FlowFixMe[cannot-write]
      componentDebugInfo.debugTask = task.debugTask;

      // We outline this model eagerly so that we can refer to by reference as an owner.
      // If we had a smarter way to dedupe we might not have to do this if there ends up
      // being no references to this as an owner.

      outlineComponentInfo(request, componentDebugInfo);

      // Track when we started rendering this component.
      {
        advanceTaskTime(request, task, performance.now());
      }
      emitDebugChunk(request, componentDebugID, componentDebugInfo);

      // We've emitted the latest environment for this task so we track that.
      task.environmentName = componentEnv;
      if (validated === 2) {
        warnForMissingKey(request, key, componentDebugInfo, task.debugTask);
      }
    }
    prepareToUseHooksForComponent(prevThenableState, componentDebugInfo);
    if (supportsComponentStorage) {
      // Run the component in an Async Context that tracks the current owner.
      if (task.debugTask) {
        result = task.debugTask.run(
        // $FlowFixMe[method-unbinding]
        componentStorage.run.bind(componentStorage, componentDebugInfo, callComponentInDEV, Component, props, componentDebugInfo));
      } else {
        result = componentStorage.run(componentDebugInfo, callComponentInDEV, Component, props, componentDebugInfo);
      }
    } else {
      if (task.debugTask) {
        result = task.debugTask.run(callComponentInDEV.bind(null, Component, props, componentDebugInfo));
      } else {
        result = callComponentInDEV(Component, props, componentDebugInfo);
      }
    }
  }
  if (request.status === ABORTING) {
    if (typeof result === 'object' && result !== null && typeof result.then === 'function' && !isClientReference(result)) {
      result.then(voidHandler, voidHandler);
    }
    // If we aborted during rendering we should interrupt the render but
    // we don't need to provide an error because the renderer will encode
    // the abort error as the reason.
    // eslint-disable-next-line no-throw-literal
    throw null;
  }
  {
    // Forward any debug information for any Promises that we use():ed during the render.
    // We do this at the end so that we don't keep doing this for each retry.
    var trackedThenables = getTrackedThenablesAfterRendering();
    if (trackedThenables !== null) {
      var stacks = trackedThenables._stacks || (trackedThenables._stacks = []) ;
      for (var i = 0; i < trackedThenables.length; i++) {
        var stack = stacks[i] ;
        forwardDebugInfoFromThenable(request, task, trackedThenables[i], componentDebugInfo , stack);
      }
    }
  }

  // Apply special cases.
  result = processServerComponentReturnValue(request, task, Component, result);
  {
    // From this point on, the parent is the component we just rendered until we
    // hit another JSX element.
    task.debugOwner = componentDebugInfo;
    // Unfortunately, we don't have a stack frame for this position. Conceptually
    // it would be the location of the `return` inside component that just rendered.
    task.debugStack = null;
    task.debugTask = null;
  }

  // Track this element's key on the Server Component on the keyPath context..
  var prevKeyPath = task.keyPath;
  var prevImplicitSlot = task.implicitSlot;
  if (key !== null) {
    // Append the key to the path. Technically a null key should really add the child
    // index. We don't do that to hold the payload small and implementation simple.
    if (key === REACT_OPTIMISTIC_KEY || prevKeyPath === REACT_OPTIMISTIC_KEY) {
      // The optimistic key is viral. It turns the whole key into optimistic if any part is.
      task.keyPath = REACT_OPTIMISTIC_KEY;
    } else {
      task.keyPath = prevKeyPath === null ? key : prevKeyPath + ',' + key;
    }
  } else if (prevKeyPath === null) {
    // This sequence of Server Components has no keys. This means that it was rendered
    // in a slot that needs to assign an implicit key. Even if children below have
    // explicit keys, they should not be used for the outer most key since it might
    // collide with other slots in that set.
    task.implicitSlot = true;
  }
  var json = renderModelDestructive(request, task, emptyRoot, '', result);
  task.keyPath = prevKeyPath;
  task.implicitSlot = prevImplicitSlot;
  return json;
}
function warnForMissingKey(request, key, componentDebugInfo, debugTask) {
  {
    var didWarnForKey = request.didWarnForKey;
    if (didWarnForKey == null) {
      didWarnForKey = request.didWarnForKey = new WeakSet();
    }
    var parentOwner = componentDebugInfo.owner;
    if (parentOwner != null) {
      if (didWarnForKey.has(parentOwner)) {
        // We already warned for other children in this parent.
        return;
      }
      didWarnForKey.add(parentOwner);
    }

    // Call with the server component as the currently rendering component
    // for context.
    var logKeyError = function () {
      console.error('Each child in a list should have a unique "key" prop.' + '%s%s See https://react.dev/link/warning-keys for more information.', '', '');
    };
    if (supportsComponentStorage) {
      // Run the component in an Async Context that tracks the current owner.
      if (debugTask) {
        debugTask.run(
        // $FlowFixMe[method-unbinding]
        componentStorage.run.bind(componentStorage, componentDebugInfo, callComponentInDEV, logKeyError, null, componentDebugInfo));
      } else {
        componentStorage.run(componentDebugInfo, callComponentInDEV, logKeyError, null, componentDebugInfo);
      }
    } else {
      if (debugTask) {
        debugTask.run(callComponentInDEV.bind(null, logKeyError, null, componentDebugInfo));
      } else {
        callComponentInDEV(logKeyError, null, componentDebugInfo);
      }
    }
  }
}
function renderFragment(request, task, children) {
  {
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (child !== null && typeof child === 'object' && child.$$typeof === REACT_ELEMENT_TYPE) {
        var element = child;
        if (element.key === null && !element._store.validated) {
          element._store.validated = 2;
        }
      }
    }
  }
  if (task.keyPath !== null) {
    // We have a Server Component that specifies a key but we're now splitting
    // the tree using a fragment.
    var fragment = [REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE, task.keyPath, {
      children: children
    }, null, null, 0] ;
    if (!task.implicitSlot) {
      // If this was keyed inside a set. I.e. the outer Server Component was keyed
      // then we need to handle reorders of the whole set. To do this we need to wrap
      // this array in a keyed Fragment.
      return fragment;
    }
    // If the outer Server Component was implicit but then an inner one had a key
    // we don't actually need to be able to move the whole set around. It'll always be
    // in an implicit slot. The key only exists to be able to reset the state of the
    // children. We could achieve the same effect by passing on the keyPath to the next
    // set of components inside the fragment. This would also allow a keyless fragment
    // reconcile against a single child.
    // Unfortunately because of JSON.stringify, we can't call the recursive loop for
    // each child within this context because we can't return a set with already resolved
    // values. E.g. a string would get double encoded. Returning would pop the context.
    // So instead, we wrap it with an unkeyed fragment and inner keyed fragment.
    return [fragment];
  }
  // Since we're yielding here, that implicitly resets the keyPath context on the
  // way up. Which is what we want since we've consumed it. If this changes to
  // be recursive serialization, we need to reset the keyPath and implicitSlot,
  // before recursing here.
  {
    var debugInfo = children._debugInfo;
    if (debugInfo) {
      // If this came from Flight, forward any debug info into this new row.
      if (!canEmitDebugInfo) {
        // We don't have a chunk to assign debug info. We need to outline this
        // component to assign it an ID.
        return outlineTask(request, task);
      } else {
        // Forward any debug info we have the first time we see it.
        // We do this after init so that we have received all the debug info
        // from the server by the time we emit it.
        forwardDebugInfo(request, task, debugInfo);
      }
      // Since we're rendering this array again, create a copy that doesn't
      // have the debug info so we avoid outlining or emitting debug info again.
      children = Array.from(children);
    }
  }
  return children;
}
function renderAsyncFragment(request, task, children, getAsyncIterator) {
  if (task.keyPath !== null) {
    // We have a Server Component that specifies a key but we're now splitting
    // the tree using a fragment.
    var fragment = [REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE, task.keyPath, {
      children: children
    }, null, null, 0] ;
    if (!task.implicitSlot) {
      // If this was keyed inside a set. I.e. the outer Server Component was keyed
      // then we need to handle reorders of the whole set. To do this we need to wrap
      // this array in a keyed Fragment.
      return fragment;
    }
    // If the outer Server Component was implicit but then an inner one had a key
    // we don't actually need to be able to move the whole set around. It'll always be
    // in an implicit slot. The key only exists to be able to reset the state of the
    // children. We could achieve the same effect by passing on the keyPath to the next
    // set of components inside the fragment. This would also allow a keyless fragment
    // reconcile against a single child.
    // Unfortunately because of JSON.stringify, we can't call the recursive loop for
    // each child within this context because we can't return a set with already resolved
    // values. E.g. a string would get double encoded. Returning would pop the context.
    // So instead, we wrap it with an unkeyed fragment and inner keyed fragment.
    return [fragment];
  }

  // Since we're yielding here, that implicitly resets the keyPath context on the
  // way up. Which is what we want since we've consumed it. If this changes to
  // be recursive serialization, we need to reset the keyPath and implicitSlot,
  // before recursing here.
  var asyncIterator = getAsyncIterator.call(children);
  return serializeAsyncIterable(request, task, children, asyncIterator);
}
function renderClientElement(request, task, type, key, props, validated // DEV-only
) {
  // We prepend the terminal client element that actually gets serialized with
  // the keys of any Server Components which are not serialized.
  var keyPath = task.keyPath;
  if (key === null) {
    key = keyPath;
  } else if (keyPath !== null) {
    if (keyPath === REACT_OPTIMISTIC_KEY || key === REACT_OPTIMISTIC_KEY) {
      // Optimistic key is viral and turns the whole key optimistic.
      key = REACT_OPTIMISTIC_KEY;
    } else {
      key = keyPath + ',' + key;
    }
  }
  var debugOwner = null;
  var debugStack = null;
  {
    debugOwner = task.debugOwner;
    if (debugOwner !== null) {
      // Ensure we outline this owner if it is the first time we see it.
      // So that we can refer to it directly.
      outlineComponentInfo(request, debugOwner);
    }
    if (task.debugStack !== null) {
      // Outline the debug stack so that we write to the completedDebugChunks instead.
      debugStack = filterStackTrace(request, parseStackTrace(task.debugStack, 1));
      var id = outlineDebugModel(request, {
        objectLimit: debugStack.length * 2 + 1
      }, debugStack);
      // We also store this in the main dedupe set so that it can be referenced by inline React Elements.
      request.writtenObjects.set(debugStack, serializeByValueID(id));
    }
  }
  var element = [REACT_ELEMENT_TYPE, type, key, props, debugOwner, debugStack, validated] ;
  if (task.implicitSlot && key !== null) {
    // The root Server Component had no key so it was in an implicit slot.
    // If we had a key lower, it would end up in that slot with an explicit key.
    // We wrap the element in a fragment to give it an implicit key slot with
    // an inner explicit key.
    return [element];
  }
  // Since we're yielding here, that implicitly resets the keyPath context on the
  // way up. Which is what we want since we've consumed it. If this changes to
  // be recursive serialization, we need to reset the keyPath and implicitSlot,
  // before recursing here. We also need to reset it once we render into an array
  // or anything else too which we also get implicitly.
  return element;
}

// Determines if we're currently rendering at the top level of a task and therefore
// is safe to emit debug info associated with that task. Otherwise, if we're in
// a nested context, we need to first outline.
var canEmitDebugInfo = false;

// Approximate string length of the currently serializing row.
// Used to power outlining heuristics.
var serializedSize = 0;
var MAX_ROW_SIZE = 3200;
function deferTask(request, task) {
  // Like outlineTask but instead the item is scheduled to be serialized
  // after its parent in the stream.
  var newTask = createTask(request, task.model,
  // the currently rendering element
  task.keyPath,
  // unlike outlineModel this one carries along context
  task.implicitSlot, task.formatContext, request.abortableTasks, task.time , task.debugOwner , task.debugStack , task.debugTask );
  pingTask(request, newTask);
  return serializeLazyID(newTask.id);
}
function outlineTask(request, task) {
  var newTask = createTask(request, task.model,
  // the currently rendering element
  task.keyPath,
  // unlike outlineModel this one carries along context
  task.implicitSlot, task.formatContext, request.abortableTasks, task.time , task.debugOwner , task.debugStack , task.debugTask );
  retryTask(request, newTask);
  if (newTask.status === COMPLETED) {
    // We completed synchronously so we can refer to this by reference. This
    // makes it behaves the same as prod during deserialization.
    return serializeByValueID(newTask.id);
  }
  // This didn't complete synchronously so it wouldn't have even if we didn't
  // outline it, so this would reduce to a lazy reference even in prod.
  return serializeLazyID(newTask.id);
}
function outlineHaltedTask(request, task, allowLazy) {
  // In the future if we track task state for resuming we'll maybe need to
  // construnct an actual task here but since we're never going to retry it
  // we just claim the id and serialize it according to the proper convention
  var taskId = request.nextChunkId++;
  if (allowLazy) {
    // We're halting in a position that can handle a lazy reference
    return serializeLazyID(taskId);
  } else {
    // We're halting in a position that needs a value reference
    return serializeByValueID(taskId);
  }
}
function renderElement(request, task, type, key, ref, props, validated // DEV only
) {
  if (ref !== null && ref !== undefined) {
    // When the ref moves to the regular props object this will implicitly
    // throw for functions. We could probably relax it to a DEV warning for other
    // cases.
    // TODO: `ref` is now just a prop when `enableRefAsProp` is on. Should we
    // do what the above comment says?
    throw new Error('Refs cannot be used in Server Components, nor passed to Client Components.');
  }
  {
    jsxPropsParents.set(props, type);
    if (typeof props.children === 'object' && props.children !== null) {
      jsxChildrenParents.set(props.children, type);
    }
  }
  if (typeof type === 'function' && !isClientReference(type) && !isOpaqueTemporaryReference(type)) {
    // This is a Server Component.
    return renderFunctionComponent(request, task, key, type, props, validated);
  } else if (type === REACT_FRAGMENT_TYPE && key === null) {
    // For key-less fragments, we add a small optimization to avoid serializing
    // it as a wrapper.
    if (validated === 2) {
      // Create a fake owner node for the error stack.
      var componentDebugInfo = {
        name: 'Fragment',
        env: (0, request.environmentName)(),
        key: key,
        owner: task.debugOwner,
        stack: task.debugStack === null ? null : filterStackTrace(request, parseStackTrace(task.debugStack, 1)),
        props: props,
        debugStack: task.debugStack,
        debugTask: task.debugTask
      };
      warnForMissingKey(request, key, componentDebugInfo, task.debugTask);
    }
    var prevImplicitSlot = task.implicitSlot;
    if (task.keyPath === null) {
      task.implicitSlot = true;
    }
    var json = renderModelDestructive(request, task, emptyRoot, '', props.children);
    task.implicitSlot = prevImplicitSlot;
    return json;
  } else if (type != null && typeof type === 'object' && !isClientReference(type)) {
    switch (type.$$typeof) {
      case REACT_LAZY_TYPE:
        {
          var wrappedType;
          {
            wrappedType = callLazyInitInDEV(type);
          }
          if (request.status === ABORTING) {
            // lazy initializers are user code and could abort during render
            // we don't wan to return any value resolved from the lazy initializer
            // if it aborts so we interrupt rendering here
            // eslint-disable-next-line no-throw-literal
            throw null;
          }
          return renderElement(request, task, wrappedType, key, ref, props, validated);
        }
      case REACT_FORWARD_REF_TYPE:
        {
          return renderFunctionComponent(request, task, key, type.render, props, validated);
        }
      case REACT_MEMO_TYPE:
        {
          return renderElement(request, task, type.type, key, ref, props, validated);
        }
      case REACT_ELEMENT_TYPE:
        {
          // This is invalid but we'll let the client determine that it is.
          {
            // Disable the key warning that would happen otherwise because this
            // element gets serialized inside an array. We'll error later anyway.
            type._store.validated = 1;
          }
        }
    }
  } else if (typeof type === 'string') {
    var parentFormatContext = task.formatContext;
    var newFormatContext = getChildFormatContext(parentFormatContext, type, props);
    if (parentFormatContext !== newFormatContext && props.children != null) {
      // We've entered a new context. We need to create another Task which has
      // the new context set up since it's not safe to push/pop in the middle of
      // a tree. Additionally this means that any deduping within this tree now
      // assumes the new context even if it's reused outside in a different context.
      // We'll rely on this to dedupe the value later as we discover it again
      // inside the returned element's tree.
      outlineModelWithFormatContext(request, props.children, newFormatContext);
    }
  }
  // For anything else, try it on the client instead.
  // We don't know if the client will support it or not. This might error on the
  // client or error during serialization but the stack will point back to the
  // server.
  return renderClientElement(request, task, type, key, props, validated);
}
function visitAsyncNode(request, task, node, visited, cutOff) {
  if (visited.has(node)) {
    // It's possible to visit them same node twice when it's part of both an "awaited" path
    // and a "previous" path. This also gracefully handles cycles which would be a bug.
    return visited.get(node);
  }
  // Set it as visited early in case we see ourselves before returning.
  visited.set(node, null);
  var result = visitAsyncNodeImpl(request, task, node, visited, cutOff);
  if (result !== null) {
    // If we ended up with a value, let's use that value for future visits.
    visited.set(node, result);
  }
  return result;
}
function visitAsyncNodeImpl(request, task, node, visited, cutOff) {
  // TODO: add a way to preserve IO nodes from before the request started
  if (node.end >= 0 && node.end <= request.timeOrigin) {
    // This was already resolved when we started this render. It must have been either something
    // that's part of a start up sequence or externally cached data. We exclude that information.
    // The technique for debugging the effects of uncached data on the render is to simply uncache it.
    return null;
  }
  var previousIONode = null;
  // First visit anything that blocked this sequence to start in the first place.
  if (node.previous !== null) {
    previousIONode = visitAsyncNode(request, task, node.previous, visited, cutOff);
    if (previousIONode === undefined) {
      // Undefined is used as a signal that we found a suitable aborted node and we don't have to find
      // further aborted nodes.
      return undefined;
    }
  }

  // `found` represents the return value of the following switch statement.
  // We can't use multiple `return` statements in the switch statement
  // since that prevents Closure compiler from inlining `visitAsyncImpl`
  // thus doubling the call stack size.
  var found;
  switch (node.tag) {
    case IO_NODE:
      {
        found = node;
        break;
      }
    case UNRESOLVED_PROMISE_NODE:
      {
        found = previousIONode;
        break;
      }
    case PROMISE_NODE:
      {
        var awaited = node.awaited;
        var match = previousIONode;
        var promise = node.promise.deref();
        if (awaited !== null) {
          var ioNode = visitAsyncNode(request, task, awaited, visited, cutOff);
          if (ioNode === undefined) {
            // Undefined is used as a signal that we found a suitable aborted node and we don't have to find
            // further aborted nodes.
            found = undefined;
            break;
          } else if (ioNode !== null) {
            // This Promise was blocked on I/O. That's a signal that this Promise is interesting to log.
            // We don't log it yet though. We return it to be logged by the point where it's awaited.
            // The ioNode might be another PromiseNode in the case where none of the AwaitNode had
            // unfiltered stacks.
            if (ioNode.tag === PROMISE_NODE) {
              // If the ioNode was a Promise, then that means we found one in user space since otherwise
              // we would've returned an IO node. We assume this has the best stack.
              // Note: This might also be a Promise with a displayName but potentially a worse stack.
              // We could potentially favor the outer Promise if it has a stack but not the inner.
              match = ioNode;
            } else if (node.stack !== null && hasUnfilteredFrame(request, node.stack) || promise !== undefined &&
            // $FlowFixMe[prop-missing]
            typeof promise.displayName === 'string' && (ioNode.stack === null || !hasUnfilteredFrame(request, ioNode.stack))) {
              // If this Promise has a stack trace then we favor that over the I/O node since we're
              // mainly dealing with Promises as the abstraction.
              // If it has no stack but at least has a displayName and the io doesn't have a better
              // stack anyway, then also use this Promise instead since at least it has a name.
              match = node;
            } else {
              // If this Promise was created inside only third party code, then try to use
              // the inner I/O node instead. This could happen if third party calls into first
              // party to perform some I/O.
              match = ioNode;
            }
          } else if (request.status === ABORTING) {
            if (node.start < request.abortTime && node.end > request.abortTime) {
              // We aborted this render. If this Promise spanned the abort time it was probably the
              // Promise that was aborted. This won't necessarily have I/O associated with it but
              // it's a point of interest.
              if (node.stack !== null && hasUnfilteredFrame(request, node.stack) || promise !== undefined &&
              // $FlowFixMe[prop-missing]
              typeof promise.displayName === 'string') {
                match = node;
              }
            }
          }
        }
        // We need to forward after we visit awaited nodes because what ever I/O we requested that's
        // the thing that generated this node and its virtual children.
        if (promise !== undefined) {
          var debugInfo = promise._debugInfo;
          if (debugInfo != null && !visited.has(debugInfo)) {
            visited.set(debugInfo, null);
            forwardDebugInfo(request, task, debugInfo);
          }
        }
        found = match;
        break;
      }
    case UNRESOLVED_AWAIT_NODE:
      {
        found = previousIONode;
        break;
      }
    case AWAIT_NODE:
      {
        var _awaited = node.awaited;
        var _match = previousIONode;
        if (_awaited !== null) {
          var _ioNode = visitAsyncNode(request, task, _awaited, visited, cutOff);
          if (_ioNode === undefined) {
            // Undefined is used as a signal that we found a suitable aborted node and we don't have to find
            // further aborted nodes.
            found = undefined;
            break;
          } else if (_ioNode !== null) {
            var startTime = node.start;
            var endTime = node.end;
            if (startTime < cutOff) {
              // We started awaiting this node before we started rendering this sequence.
              // This means that this particular await was never part of the current sequence.
              // If we have another await higher up in the chain it might have a more actionable stack
              // from the perspective of this component. If we end up here from the "previous" path,
              // then this gets I/O ignored, which is what we want because it means it was likely
              // just part of a previous component's rendering.
              _match = _ioNode;
              if (node.stack !== null && isAwaitInUserspace(request, node.stack)) {
                // This await happened earlier but it was done in user space. This is the first time
                // that user space saw the value of the I/O. We know we'll emit the I/O eventually
                // but if we do it now we can override the promise value of the I/O entry to the
                // one observed by this await which will be a better value than the internals of
                // the I/O entry. If it's still alive that is.
                var _promise2 = _awaited.promise === null ? undefined : _awaited.promise.deref();
                if (_promise2 !== undefined) {
                  serializeIONode(request, _ioNode, _awaited.promise);
                }
              }
            } else {
              if (node.stack === null || !isAwaitInUserspace(request, node.stack)) {
                // If this await was fully filtered out, then it was inside third party code
                // such as in an external library. We return the I/O node and try another await.
                _match = _ioNode;
              } else if (request.status === ABORTING && startTime > request.abortTime) ; else {
                // We found a user space await.

                // Outline the IO node.
                // The ioNode is where the I/O was initiated, but after that it could have been
                // processed through various awaits in the internals of the third party code.
                // Therefore we don't use the inner most Promise as the conceptual value but the
                // Promise that was ultimately awaited by the user space await.
                serializeIONode(request, _ioNode, _awaited.promise);

                // If we ever visit this I/O node again, skip it because we already emitted this
                // exact entry and we don't need two awaits on the same thing.
                visited.set(_ioNode, null);

                // Ensure the owner is already outlined.
                if (node.owner != null) {
                  outlineComponentInfo(request, node.owner);
                }

                // We log the environment at the time when the last promise pigned ping which may
                // be later than what the environment was when we actually started awaiting.
                var env = (0, request.environmentName)();
                advanceTaskTime(request, task, startTime);
                // Then emit a reference to us awaiting it in the current task.
                request.pendingChunks++;
                emitDebugChunk(request, task.id, {
                  awaited: _ioNode,
                  // This is deduped by this reference.
                  env: env,
                  owner: node.owner,
                  stack: node.stack === null ? null : filterStackTrace(request, node.stack)
                });
                // Mark the end time of the await. If we're aborting then we don't emit this
                // to signal that this never resolved inside this render.
                markOperationEndTime(request, task, endTime);
                if (request.status === ABORTING) {
                  // Undefined is used as a signal that we found a suitable aborted node and we don't have to find
                  // further aborted nodes.
                  _match = undefined;
                }
              }
            }
          }
        }
        // We need to forward after we visit awaited nodes because what ever I/O we requested that's
        // the thing that generated this node and its virtual children.
        var _promise = node.promise.deref();
        if (_promise !== undefined) {
          var _debugInfo = _promise._debugInfo;
          if (_debugInfo != null && !visited.has(_debugInfo)) {
            visited.set(_debugInfo, null);
            forwardDebugInfo(request, task, _debugInfo);
          }
        }
        found = _match;
        break;
      }
    default:
      {
        // eslint-disable-next-line react-internal/prod-error-codes
        throw new Error('Unknown AsyncSequence tag. This is a bug in React.');
      }
  }
  return found;
}
function emitAsyncSequence(request, task, node, alreadyForwardedDebugInfo, owner, stack) {
  var visited = new Map();
  if (alreadyForwardedDebugInfo) {
    visited.set(alreadyForwardedDebugInfo, null);
  }
  var awaitedNode = visitAsyncNode(request, task, node, visited, task.time);
  if (awaitedNode === undefined) ; else if (awaitedNode !== null) {
    // Nothing in user space (unfiltered stack) awaited this.
    serializeIONode(request, awaitedNode, awaitedNode.promise);
    request.pendingChunks++;
    // We log the environment at the time when we ping which may be later than what the
    // environment was when we actually started awaiting.
    var env = (0, request.environmentName)();
    // If we don't have any thing awaited, the time we started awaiting was internal
    // when we yielded after rendering. The current task time is basically that.
    var debugInfo = {
      awaited: awaitedNode,
      // This is deduped by this reference.
      env: env
    };
    {
      if (owner === null && stack === null) {
        // We have no location for the await. We can use the JSX callsite of the parent
        // as the await if this was just passed as a prop.
        if (task.debugOwner !== null) {
          // $FlowFixMe[cannot-write]
          debugInfo.owner = task.debugOwner;
        }
        if (task.debugStack !== null) {
          // $FlowFixMe[cannot-write]
          debugInfo.stack = filterStackTrace(request, parseStackTrace(task.debugStack, 1));
        }
      } else {
        if (owner != null) {
          // $FlowFixMe[cannot-write]
          debugInfo.owner = owner;
        }
        if (stack != null) {
          // $FlowFixMe[cannot-write]
          debugInfo.stack = filterStackTrace(request, parseStackTrace(stack, 1));
        }
      }
    }
    // We don't have a start time for this await but in case there was no start time emitted
    // we need to include something. TODO: We should maybe ideally track the time when we
    // called .then() but without updating the task.time field since that's used for the cutoff.
    advanceTaskTime(request, task, task.time);
    emitDebugChunk(request, task.id, debugInfo);
    // Mark the end time of the await. If we're aborting then we don't emit this
    // to signal that this never resolved inside this render.
    // If we're currently aborting, then this never resolved into user space.
    markOperationEndTime(request, task, awaitedNode.end);
  }
}
function pingTask(request, task) {
  {
    // If this was async we need to emit the time when it completes.
    task.timed = true;
  }
  var pingedTasks = request.pingedTasks;
  pingedTasks.push(task);
  if (pingedTasks.length === 1) {
    request.flushScheduled = request.destination !== null;
    if (request.type === PRERENDER || request.status === OPENING) {
      scheduleMicrotask(function () {
        return performWork(request);
      });
    } else {
      scheduleWork(function () {
        return performWork(request);
      });
    }
  }
}
function createTask(request, model, keyPath, implicitSlot, formatContext, abortSet, lastTimestamp,
// Profiling-only
debugOwner,
// DEV-only
debugStack,
// DEV-only
debugTask // DEV-only
) {
  request.pendingChunks++;
  var id = request.nextChunkId++;
  if (typeof model === 'object' && model !== null) {
    // If we're about to write this into a new task we can assign it an ID early so that
    // any other references can refer to the value we're about to write.
    if (keyPath !== null || implicitSlot) ; else {
      request.writtenObjects.set(model, serializeByValueID(id));
    }
  }
  var task = {
    id: id,
    status: PENDING$1,
    model: model,
    keyPath: keyPath,
    implicitSlot: implicitSlot,
    formatContext: formatContext,
    ping: function () {
      return pingTask(request, task);
    },
    toJSON: function (parentPropertyName, value) {
      var parent = this;
      // Make sure that `parent[parentPropertyName]` wasn't JSONified before `value` was passed to us
      {
        // $FlowFixMe[incompatible-use]
        var originalValue = parent[parentPropertyName];
        if (typeof originalValue === 'object' && originalValue !== value && !(originalValue instanceof Date)) {
          // Call with the server component as the currently rendering component
          // for context.
          callWithDebugContextInDEV(request, task, function () {
            if (objectName(originalValue) !== 'Object') {
              var jsxParentType = jsxChildrenParents.get(parent);
              if (typeof jsxParentType === 'string') {
                console.error('%s objects cannot be rendered as text children. Try formatting it using toString().%s', objectName(originalValue), describeObjectForErrorMessage(parent, parentPropertyName));
              } else {
                console.error('Only plain objects can be passed to Client Components from Server Components. ' + '%s objects are not supported.%s', objectName(originalValue), describeObjectForErrorMessage(parent, parentPropertyName));
              }
            } else {
              console.error('Only plain objects can be passed to Client Components from Server Components. ' + 'Objects with toJSON methods are not supported. Convert it manually ' + 'to a simple value before passing it to props.%s', describeObjectForErrorMessage(parent, parentPropertyName));
            }
          });
        }
      }
      return renderModel(request, task, parent, parentPropertyName, value);
    },
    thenableState: null
  };
  {
    task.timed = false;
    task.time = lastTimestamp;
  }
  {
    task.environmentName = request.environmentName();
    task.debugOwner = debugOwner;
    task.debugStack = debugStack;
    task.debugTask = debugTask;
  }
  abortSet.add(task);
  return task;
}
function serializeByValueID(id) {
  return '$' + id.toString(16);
}
function serializeLazyID(id) {
  return '$L' + id.toString(16);
}
function serializePromiseID(id) {
  return '$@' + id.toString(16);
}
function serializeServerReferenceID(id) {
  return '$h' + id.toString(16);
}
function serializeSymbolReference(name) {
  return '$S' + name;
}
function serializeDeferredObject(request, value) {
  var deferredDebugObjects = request.deferredDebugObjects;
  if (deferredDebugObjects !== null) {
    // This client supports a long lived connection. We can assign this object
    // an ID to be lazy loaded later.
    // This keeps the connection alive until we ask for it or release it.
    request.pendingDebugChunks++;
    var id = request.nextChunkId++;
    deferredDebugObjects.existing.set(value, id);
    deferredDebugObjects.retained.set(id, value);
    return '$Y' + id.toString(16);
  }
  return '$Y';
}
function serializeNumber(number) {
  if (Number.isFinite(number)) {
    if (number === 0 && 1 / number === -Infinity) {
      return '$-0';
    } else {
      return number;
    }
  } else {
    if (number === Infinity) {
      return '$Infinity';
    } else if (number === -Infinity) {
      return '$-Infinity';
    } else {
      return '$NaN';
    }
  }
}
function serializeUndefined() {
  return '$undefined';
}
function serializeDate(date) {
  // JSON.stringify automatically calls Date.prototype.toJSON which calls toISOString.
  // We need only tack on a $D prefix.
  return '$D' + date.toJSON();
}
function serializeDateFromDateJSON(dateJSON) {
  // JSON.stringify automatically calls Date.prototype.toJSON which calls toISOString.
  // We need only tack on a $D prefix.
  return '$D' + dateJSON;
}
function serializeBigInt(n) {
  return '$n' + n.toString(10);
}
function serializeRowHeader(tag, id) {
  return id.toString(16) + ':' + tag;
}
function encodeReferenceChunk(request, id, reference) {
  var json = stringify(reference);
  var row = id.toString(16) + ':' + json + '\n';
  return stringToChunk(row);
}
function serializeClientReference(request, parent, parentPropertyName, clientReference) {
  var clientReferenceKey = getClientReferenceKey(clientReference);
  var writtenClientReferences = request.writtenClientReferences;
  var existingId = writtenClientReferences.get(clientReferenceKey);
  if (existingId !== undefined) {
    if (parent[0] === REACT_ELEMENT_TYPE && parentPropertyName === '1') {
      // If we're encoding the "type" of an element, we can refer
      // to that by a lazy reference instead of directly since React
      // knows how to deal with lazy values. This lets us suspend
      // on this component rather than its parent until the code has
      // loaded.
      return serializeLazyID(existingId);
    }
    return serializeByValueID(existingId);
  }
  try {
    var clientReferenceMetadata = resolveClientReferenceMetadata(request.bundlerConfig, clientReference);
    request.pendingChunks++;
    var importId = request.nextChunkId++;
    emitImportChunk(request, importId, clientReferenceMetadata, false);
    writtenClientReferences.set(clientReferenceKey, importId);
    if (parent[0] === REACT_ELEMENT_TYPE && parentPropertyName === '1') {
      // If we're encoding the "type" of an element, we can refer
      // to that by a lazy reference instead of directly since React
      // knows how to deal with lazy values. This lets us suspend
      // on this component rather than its parent until the code has
      // loaded.
      return serializeLazyID(importId);
    }
    return serializeByValueID(importId);
  } catch (x) {
    request.pendingChunks++;
    var errorId = request.nextChunkId++;
    var digest = logRecoverableError(request, x, null);
    emitErrorChunk(request, errorId, digest, x, false, null);
    return serializeByValueID(errorId);
  }
}
function serializeDebugClientReference(request, parent, parentPropertyName, clientReference) {
  // Like serializeDebugClientReference but it doesn't dedupe in the regular set
  // and it writes to completedDebugChunk instead of imports.
  var clientReferenceKey = getClientReferenceKey(clientReference);
  var writtenClientReferences = request.writtenClientReferences;
  var existingId = writtenClientReferences.get(clientReferenceKey);
  if (existingId !== undefined) {
    if (parent[0] === REACT_ELEMENT_TYPE && parentPropertyName === '1') {
      // If we're encoding the "type" of an element, we can refer
      // to that by a lazy reference instead of directly since React
      // knows how to deal with lazy values. This lets us suspend
      // on this component rather than its parent until the code has
      // loaded.
      return serializeLazyID(existingId);
    }
    return serializeByValueID(existingId);
  }
  try {
    var clientReferenceMetadata = resolveClientReferenceMetadata(request.bundlerConfig, clientReference);
    request.pendingDebugChunks++;
    var importId = request.nextChunkId++;
    emitImportChunk(request, importId, clientReferenceMetadata, true);
    if (parent[0] === REACT_ELEMENT_TYPE && parentPropertyName === '1') {
      // If we're encoding the "type" of an element, we can refer
      // to that by a lazy reference instead of directly since React
      // knows how to deal with lazy values. This lets us suspend
      // on this component rather than its parent until the code has
      // loaded.
      return serializeLazyID(importId);
    }
    return serializeByValueID(importId);
  } catch (x) {
    request.pendingDebugChunks++;
    var errorId = request.nextChunkId++;
    var digest = logRecoverableError(request, x, null);
    emitErrorChunk(request, errorId, digest, x, true, null);
    return serializeByValueID(errorId);
  }
}
function outlineModel(request, value) {
  return outlineModelWithFormatContext(request, value,
  // For deduped values we don't know which context it will be reused in
  // so we have to assume that it's the root context.
  createRootFormatContext());
}
function outlineModelWithFormatContext(request, value, formatContext) {
  var newTask = createTask(request, value, null,
  // The way we use outlining is for reusing an object.
  false,
  // It makes no sense for that use case to be contextual.
  formatContext,
  // Except for FormatContext we optimistically use it.
  request.abortableTasks, performance.now() // TODO: This should really inherit the time from the task.
  , null,
  // TODO: Currently we don't associate any debug information with
  null,
  // this object on the server. If it ends up erroring, it won't
  null // have any context on the server but can on the client.
  );
  retryTask(request, newTask);
  return newTask.id;
}
function serializeServerReference(request, serverReference) {
  var writtenServerReferences = request.writtenServerReferences;
  var existingId = writtenServerReferences.get(serverReference);
  if (existingId !== undefined) {
    return serializeServerReferenceID(existingId);
  }
  var boundArgs = getServerReferenceBoundArguments(request.bundlerConfig, serverReference);
  var bound = boundArgs === null ? null : Promise.resolve(boundArgs);
  var id = getServerReferenceId(request.bundlerConfig, serverReference);
  var location = null;
  {
    var error = getServerReferenceLocation(request.bundlerConfig, serverReference);
    if (error) {
      var frames = parseStackTrace(error, 1);
      if (frames.length > 0) {
        var firstFrame = frames[0];
        location = [firstFrame[0], firstFrame[1], firstFrame[2],
        // The line and col of the callsite represents the
        firstFrame[3] // enclosing line and col of the function.
        ];
      }
    }
  }
  var serverReferenceMetadata = location !== null ? {
    id: id,
    bound: bound,
    name: typeof serverReference === 'function' ? serverReference.name : '',
    env: (0, request.environmentName)(),
    location: location
  } : {
    id: id,
    bound: bound
  };
  var metadataId = outlineModel(request, serverReferenceMetadata);
  writtenServerReferences.set(serverReference, metadataId);
  return serializeServerReferenceID(metadataId);
}
function serializeTemporaryReference(request, reference) {
  return '$T' + reference;
}
function serializeLargeTextString(request, text) {
  request.pendingChunks++;
  var textId = request.nextChunkId++;
  emitTextChunk(request, textId, text, false);
  return serializeByValueID(textId);
}
function serializeDebugLargeTextString(request, text) {
  request.pendingDebugChunks++;
  var textId = request.nextChunkId++;
  emitTextChunk(request, textId, text, true);
  return serializeByValueID(textId);
}
function serializeMap(request, map) {
  var entries = Array.from(map);
  var id = outlineModel(request, entries);
  return '$Q' + id.toString(16);
}
function serializeFormData(request, formData) {
  var entries = Array.from(formData.entries());
  var id = outlineModel(request, entries);
  return '$K' + id.toString(16);
}
function serializeDebugFormData(request, formData) {
  var entries = Array.from(formData.entries());
  var id = outlineDebugModel(request, {
    objectLimit: entries.length * 2 + 1
  }, entries);
  return '$K' + id.toString(16);
}
function serializeSet(request, set) {
  var entries = Array.from(set);
  var id = outlineModel(request, entries);
  return '$W' + id.toString(16);
}
function serializeDebugMap(request, counter, map) {
  // Like serializeMap but for renderDebugModel.
  var entries = Array.from(map);
  // The Map itself doesn't take up any space but the outlined object does.
  counter.objectLimit++;
  for (var i = 0; i < entries.length; i++) {
    // Outline every object entry in case we run out of space to serialize them.
    // Because we can't mark these values as limited.
    var entry = entries[i];
    doNotLimit.add(entry);
    var key = entry[0];
    var value = entry[1];
    if (typeof key === 'object' && key !== null) {
      doNotLimit.add(key);
    }
    if (typeof value === 'object' && value !== null) {
      doNotLimit.add(value);
    }
  }
  var id = outlineDebugModel(request, counter, entries);
  return '$Q' + id.toString(16);
}
function serializeDebugSet(request, counter, set) {
  // Like serializeMap but for renderDebugModel.
  var entries = Array.from(set);
  // The Set itself doesn't take up any space but the outlined object does.
  counter.objectLimit++;
  for (var i = 0; i < entries.length; i++) {
    // Outline every object entry in case we run out of space to serialize them.
    // Because we can't mark these values as limited.
    var entry = entries[i];
    if (typeof entry === 'object' && entry !== null) {
      doNotLimit.add(entry);
    }
  }
  var id = outlineDebugModel(request, counter, entries);
  return '$W' + id.toString(16);
}
function serializeIterator(request, iterator) {
  var id = outlineModel(request, Array.from(iterator));
  return '$i' + id.toString(16);
}
function serializeTypedArray(request, tag, typedArray) {
  request.pendingChunks++;
  var bufferId = request.nextChunkId++;
  emitTypedArrayChunk(request, bufferId, tag, typedArray, false);
  return serializeByValueID(bufferId);
}
function serializeDebugTypedArray(request, tag, typedArray) {
  if (typedArray.byteLength > 1000 && !doNotLimit.has(typedArray)) {
    // Defer large typed arrays.
    return serializeDeferredObject(request, typedArray);
  }
  request.pendingDebugChunks++;
  var bufferId = request.nextChunkId++;
  emitTypedArrayChunk(request, bufferId, tag, typedArray, true);
  return serializeByValueID(bufferId);
}
function serializeDebugBlob(request, blob) {
  var model = [blob.type];
  var reader = blob.stream().getReader();
  request.pendingDebugChunks++;
  var id = request.nextChunkId++;
  function progress(entry) {
    if (entry.done) {
      emitOutlinedDebugModelChunk(request, id, {
        objectLimit: model.length + 2
      }, model);
      enqueueFlush(request);
      return;
    }
    // TODO: Emit the chunk early and refer to it later by dedupe.
    model.push(entry.value);
    // $FlowFixMe[incompatible-call]
    return reader.read().then(progress).catch(error);
  }
  function error(reason) {
    var digest = '';
    emitErrorChunk(request, id, digest, reason, true, null);
    enqueueFlush(request);
    // $FlowFixMe should be able to pass mixed
    reader.cancel(reason).then(noop, noop);
  }
  // $FlowFixMe[incompatible-call]
  reader.read().then(progress).catch(error);
  return '$B' + id.toString(16);
}
function serializeBlob(request, blob) {
  var model = [blob.type];
  var newTask = createTask(request, model, null, false, createRootFormatContext(), request.abortableTasks, performance.now() // TODO: This should really inherit the time from the task.
  , null,
  // TODO: Currently we don't associate any debug information with
  null,
  // this object on the server. If it ends up erroring, it won't
  null // have any context on the server but can on the client.
  );
  var reader = blob.stream().getReader();
  function progress(entry) {
    if (newTask.status !== PENDING$1) {
      return;
    }
    if (entry.done) {
      request.cacheController.signal.removeEventListener('abort', abortBlob);
      pingTask(request, newTask);
      return;
    }
    // TODO: Emit the chunk early and refer to it later by dedupe.
    model.push(entry.value);
    // $FlowFixMe[incompatible-call]
    return reader.read().then(progress).catch(error);
  }
  function error(reason) {
    if (newTask.status !== PENDING$1) {
      return;
    }
    request.cacheController.signal.removeEventListener('abort', abortBlob);
    erroredTask(request, newTask, reason);
    enqueueFlush(request);
    // $FlowFixMe should be able to pass mixed
    reader.cancel(reason).then(error, error);
  }
  function abortBlob() {
    if (newTask.status !== PENDING$1) {
      return;
    }
    var signal = request.cacheController.signal;
    signal.removeEventListener('abort', abortBlob);
    var reason = signal.reason;
    if (request.type === PRERENDER) {
      request.abortableTasks.delete(newTask);
      haltTask(newTask);
      finishHaltedTask(newTask, request);
    } else {
      // TODO: Make this use abortTask() instead.
      erroredTask(request, newTask, reason);
      enqueueFlush(request);
    }
    // $FlowFixMe should be able to pass mixed
    reader.cancel(reason).then(error, error);
  }
  request.cacheController.signal.addEventListener('abort', abortBlob);

  // $FlowFixMe[incompatible-call]
  reader.read().then(progress).catch(error);
  return '$B' + newTask.id.toString(16);
}
function escapeStringValue(value) {
  if (value[0] === '$') {
    // We need to escape $ prefixed strings since we use those to encode
    // references to IDs and as special symbol values.
    return '$' + value;
  } else {
    return value;
  }
}
var modelRoot = false;
function renderModel(request, task, parent, key, value) {
  // First time we're serializing the key, we should add it to the size.
  serializedSize += key.length;
  var prevKeyPath = task.keyPath;
  var prevImplicitSlot = task.implicitSlot;
  try {
    return renderModelDestructive(request, task, parent, key, value);
  } catch (thrownValue) {
    // If the suspended/errored value was an element or lazy it can be reduced
    // to a lazy reference, so that it doesn't error the parent.
    var model = task.model;
    var wasReactNode = typeof model === 'object' && model !== null && (model.$$typeof === REACT_ELEMENT_TYPE || model.$$typeof === REACT_LAZY_TYPE);
    if (request.status === ABORTING) {
      task.status = ABORTED;
      if (request.type === PRERENDER) {
        // This will create a new task and refer to it in this slot
        // the new task won't be retried because we are aborting
        return outlineHaltedTask(request, task, wasReactNode);
      }
      var _errorId = request.fatalError;
      if (wasReactNode) {
        return serializeLazyID(_errorId);
      }
      return serializeByValueID(_errorId);
    }
    var x = thrownValue === SuspenseException ?
    // This is a special type of exception used for Suspense. For historical
    // reasons, the rest of the Suspense implementation expects the thrown
    // value to be a thenable, because before `use` existed that was the
    // (unstable) API for suspending. This implementation detail can change
    // later, once we deprecate the old API in favor of `use`.
    getSuspendedThenable() : thrownValue;
    if (typeof x === 'object' && x !== null) {
      // $FlowFixMe[method-unbinding]
      if (typeof x.then === 'function') {
        // Something suspended, we'll need to create a new task and resolve it later.
        var newTask = createTask(request, task.model, task.keyPath, task.implicitSlot, task.formatContext, request.abortableTasks, task.time , task.debugOwner , task.debugStack , task.debugTask );
        var ping = newTask.ping;
        x.then(ping, ping);
        newTask.thenableState = getThenableStateAfterSuspending();

        // Restore the context. We assume that this will be restored by the inner
        // functions in case nothing throws so we don't use "finally" here.
        task.keyPath = prevKeyPath;
        task.implicitSlot = prevImplicitSlot;
        if (wasReactNode) {
          return serializeLazyID(newTask.id);
        }
        return serializeByValueID(newTask.id);
      }
    }

    // Restore the context. We assume that this will be restored by the inner
    // functions in case nothing throws so we don't use "finally" here.
    task.keyPath = prevKeyPath;
    task.implicitSlot = prevImplicitSlot;

    // Something errored. We'll still send everything we have up until this point.
    request.pendingChunks++;
    var errorId = request.nextChunkId++;
    var digest = logRecoverableError(request, x, task);
    emitErrorChunk(request, errorId, digest, x, false, task.debugOwner );
    if (wasReactNode) {
      // We'll replace this element with a lazy reference that throws on the client
      // once it gets rendered.
      return serializeLazyID(errorId);
    }
    // If we don't know if it was a React Node we render a direct reference and let
    // the client deal with it.
    return serializeByValueID(errorId);
  }
}
function renderModelDestructive(request, task, parent, parentPropertyName, value) {
  // Set the currently rendering model
  task.model = value;

  // Special Symbol, that's very common.
  if (value === REACT_ELEMENT_TYPE) {
    return '$';
  }
  if (value === null) {
    return null;
  }
  if (typeof value === 'object') {
    switch (value.$$typeof) {
      case REACT_ELEMENT_TYPE:
        {
          var elementReference = null;
          var _writtenObjects = request.writtenObjects;
          if (task.keyPath !== null || task.implicitSlot) ; else {
            var _existingReference = _writtenObjects.get(value);
            if (_existingReference !== undefined) {
              if (modelRoot === value) {
                // This is the ID we're currently emitting so we need to write it
                // once but if we discover it again, we refer to it by id.
                modelRoot = null;
              } else {
                // We've already emitted this as an outlined object, so we can refer to that by its
                // existing ID. TODO: We should use a lazy reference since, unlike plain objects,
                // elements might suspend so it might not have emitted yet even if we have the ID for
                // it. However, this creates an extra wrapper when it's not needed. We should really
                // detect whether this already was emitted and synchronously available. In that
                // case we can refer to it synchronously and only make it lazy otherwise.
                // We currently don't have a data structure that lets us see that though.
                return _existingReference;
              }
            } else if (parentPropertyName.indexOf(':') === -1) {
              // TODO: If the property name contains a colon, we don't dedupe. Escape instead.
              var parentReference = _writtenObjects.get(parent);
              if (parentReference !== undefined) {
                // If the parent has a reference, we can refer to this object indirectly
                // through the property name inside that parent.
                elementReference = parentReference + ':' + parentPropertyName;
                _writtenObjects.set(value, elementReference);
              }
            }
          }
          var element = value;
          if (serializedSize > MAX_ROW_SIZE) {
            return deferTask(request, task);
          }
          {
            var debugInfo = value._debugInfo;
            if (debugInfo) {
              // If this came from Flight, forward any debug info into this new row.
              if (!canEmitDebugInfo) {
                // We don't have a chunk to assign debug info. We need to outline this
                // component to assign it an ID.
                return outlineTask(request, task);
              } else {
                // Forward any debug info we have the first time we see it.
                // If this element came from a lazy chunk, then the Flight Client transferred
                // the lazy chunk's debug info onto the inner element in `initializeElement`.
                // We might have already written some of that debug info out into the stream
                // (before the lazy resolved), so we shouldn't do it again.
                // The consumer of this stream will once again transfer the debug info from
                // the lazy chunk onto the element itself, thus recombining them into one array.
                forwardDebugInfoOnce(request, task, debugInfo);
              }
            }
          }
          var props = element.props;
          // TODO: We should get the ref off the props object right before using
          // it.
          var refProp = props.ref;
          var ref = refProp !== undefined ? refProp : null;

          // Attempt to render the Server Component.

          {
            task.debugOwner = element._owner;
            task.debugStack = element._debugStack;
            task.debugTask = element._debugTask;
            if (element._owner === undefined || element._debugStack === undefined || element._debugTask === undefined) {
              var key = '';
              if (element.key !== null && element.key !== REACT_OPTIMISTIC_KEY) {
                key = ' key="' + element.key + '"';
              }
              console.error('Attempted to render <%s%s> without development properties. ' + 'This is not supported. It can happen if:' + '\n- The element is created with a production version of React but rendered in development.' + '\n- The element was cloned with a custom function instead of `React.cloneElement`.\n' + 'The props of this element may help locate this element: %o', element.type, key, element.props);
            }
            // TODO: Pop this. Since we currently don't have a point where we can pop the stack
            // this debug information will be used for errors inside sibling properties that
            // are not elements. Leading to the wrong attribution on the server. We could fix
            // that if we switch to a proper stack instead of JSON.stringify's trampoline.
            // Attribution on the client is still correct since it has a pop.
          }
          var newChild = renderElement(request, task, element.type,
          // $FlowFixMe[incompatible-call] the key of an element is null | string | ReactOptimisticKey
          element.key, ref, props, element._store.validated );
          if (typeof newChild === 'object' && newChild !== null && elementReference !== null) {
            // If this element renders another object, we can now refer to that object through
            // the same location as this element.
            if (!_writtenObjects.has(newChild)) {
              _writtenObjects.set(newChild, elementReference);
            }
          }
          return newChild;
        }
      case REACT_LAZY_TYPE:
        {
          if (serializedSize > MAX_ROW_SIZE) {
            return deferTask(request, task);
          }

          // Reset the task's thenable state before continuing. If there was one, it was
          // from suspending the lazy before.
          task.thenableState = null;
          var lazy = value;
          var resolvedModel;
          {
            // Check if we already have some debug info before initializing.
            // If we do, we want to emit it as soon as possible, without waiting for initialization.
            var _debugInfo2 = lazy._debugInfo;
            if (_debugInfo2) {
              // If this came from Flight, forward any debug info into this new row.
              if (!canEmitDebugInfo) {
                // We don't have a chunk to assign debug info. We need to outline this
                // component to assign it an ID.
                return outlineTask(request, task);
              } else {
                // Forward any debug info we have the first time we see it.
                forwardDebugInfoOnce(request, task, _debugInfo2);
              }
            }
            resolvedModel = callLazyInitInDEV(lazy);
          }
          if (request.status === ABORTING) {
            // lazy initializers are user code and could abort during render
            // we don't wan to return any value resolved from the lazy initializer
            // if it aborts so we interrupt rendering here
            // eslint-disable-next-line no-throw-literal
            throw null;
          }

          // Check for new debug info that may have arrived after initializing.
          {
            var _debugInfo3 = lazy._debugInfo;
            if (_debugInfo3) {
              // If this came from Flight, forward any debug info into this new row.
              if (!canEmitDebugInfo) {
                // We don't have a chunk to assign debug info. We need to outline this
                // component to assign it an ID.
                return outlineTask(request, task);
              } else {
                // Forward any debug info we have the first time we see it.
                forwardDebugInfoOnce(request, task, _debugInfo3);
              }
            }
          }
          return renderModelDestructive(request, task, parent, parentPropertyName, resolvedModel);
        }
      case REACT_LEGACY_ELEMENT_TYPE:
        {
          throw new Error('A React Element from an older version of React was rendered. ' + 'This is not supported. It can happen if:\n' + '- Multiple copies of the "react" package is used.\n' + '- A library pre-bundled an old copy of "react" or "react/jsx-runtime".\n' + '- A compiler tries to "inline" JSX instead of using the runtime.');
        }
    }
    if (isClientReference(value)) {
      return serializeClientReference(request, parent, parentPropertyName, value);
    }
    if (request.temporaryReferences !== undefined) {
      var tempRef = resolveTemporaryReference(request.temporaryReferences, value);
      if (tempRef !== undefined) {
        return serializeTemporaryReference(request, tempRef);
      }
    }
    {
      var tainted = TaintRegistryObjects.get(value);
      if (tainted !== undefined) {
        throwTaintViolation(tainted);
      }
    }
    var writtenObjects = request.writtenObjects;
    var existingReference = writtenObjects.get(value);
    // $FlowFixMe[method-unbinding]
    if (typeof value.then === 'function') {
      if (existingReference !== undefined) {
        if (task.keyPath !== null || task.implicitSlot) {
          // If we're in some kind of context we can't reuse the result of this render or
          // previous renders of this element. We only reuse Promises if they're not wrapped
          // by another Server Component.
          var _promiseId = serializeThenable(request, task, value);
          return serializePromiseID(_promiseId);
        } else if (modelRoot === value) {
          // This is the ID we're currently emitting so we need to write it
          // once but if we discover it again, we refer to it by id.
          modelRoot = null;
        } else {
          // We've seen this promise before, so we can just refer to the same result.
          return existingReference;
        }
      }
      // We assume that any object with a .then property is a "Thenable" type,
      // or a Promise type. Either of which can be represented by a Promise.
      var promiseId = serializeThenable(request, task, value);
      var promiseReference = serializePromiseID(promiseId);
      writtenObjects.set(value, promiseReference);
      return promiseReference;
    }
    if (existingReference !== undefined) {
      if (modelRoot === value) {
        if (existingReference !== serializeByValueID(task.id)) {
          // Turns out that we already have this root at a different reference.
          // Use that after all.
          return existingReference;
        }
        // This is the ID we're currently emitting so we need to write it
        // once but if we discover it again, we refer to it by id.
        modelRoot = null;
      } else {
        // We've already emitted this as an outlined object, so we can
        // just refer to that by its existing ID.
        return existingReference;
      }
    } else if (parentPropertyName.indexOf(':') === -1) {
      // TODO: If the property name contains a colon, we don't dedupe. Escape instead.
      var _parentReference = writtenObjects.get(parent);
      if (_parentReference !== undefined) {
        // If the parent has a reference, we can refer to this object indirectly
        // through the property name inside that parent.
        var propertyName = parentPropertyName;
        if (isArray(parent) && parent[0] === REACT_ELEMENT_TYPE) {
          // For elements, we've converted it to an array but we'll have converted
          // it back to an element before we read the references so the property
          // needs to be aliased.
          switch (parentPropertyName) {
            case '1':
              propertyName = 'type';
              break;
            case '2':
              propertyName = 'key';
              break;
            case '3':
              propertyName = 'props';
              break;
            case '4':
              propertyName = '_owner';
              break;
          }
        }
        writtenObjects.set(value, _parentReference + ':' + propertyName);
      }
    }
    if (isArray(value)) {
      return renderFragment(request, task, value);
    }
    if (value instanceof Map) {
      return serializeMap(request, value);
    }
    if (value instanceof Set) {
      return serializeSet(request, value);
    }
    // TODO: FormData is not available in old Node. Remove the typeof later.
    if (typeof FormData === 'function' && value instanceof FormData) {
      return serializeFormData(request, value);
    }
    if (value instanceof Error) {
      return serializeErrorValue(request, value);
    }
    if (value instanceof ArrayBuffer) {
      return serializeTypedArray(request, 'A', new Uint8Array(value));
    }
    if (value instanceof Int8Array) {
      // char
      return serializeTypedArray(request, 'O', value);
    }
    if (value instanceof Uint8Array) {
      // unsigned char
      return serializeTypedArray(request, 'o', value);
    }
    if (value instanceof Uint8ClampedArray) {
      // unsigned clamped char
      return serializeTypedArray(request, 'U', value);
    }
    if (value instanceof Int16Array) {
      // sort
      return serializeTypedArray(request, 'S', value);
    }
    if (value instanceof Uint16Array) {
      // unsigned short
      return serializeTypedArray(request, 's', value);
    }
    if (value instanceof Int32Array) {
      // long
      return serializeTypedArray(request, 'L', value);
    }
    if (value instanceof Uint32Array) {
      // unsigned long
      return serializeTypedArray(request, 'l', value);
    }
    if (value instanceof Float32Array) {
      // float
      return serializeTypedArray(request, 'G', value);
    }
    if (value instanceof Float64Array) {
      // double
      return serializeTypedArray(request, 'g', value);
    }
    if (value instanceof BigInt64Array) {
      // number
      return serializeTypedArray(request, 'M', value);
    }
    if (value instanceof BigUint64Array) {
      // unsigned number
      // We use "m" instead of "n" since JSON can start with "null"
      return serializeTypedArray(request, 'm', value);
    }
    if (value instanceof DataView) {
      return serializeTypedArray(request, 'V', value);
    }
    // TODO: Blob is not available in old Node. Remove the typeof check later.
    if (typeof Blob === 'function' && value instanceof Blob) {
      return serializeBlob(request, value);
    }
    var iteratorFn = getIteratorFn(value);
    if (iteratorFn) {
      // TODO: Should we serialize the return value as well like we do for AsyncIterables?
      var iterator = iteratorFn.call(value);
      if (iterator === value) {
        // Iterator, not Iterable
        return serializeIterator(request, iterator);
      }
      return renderFragment(request, task, Array.from(iterator));
    }

    // TODO: Blob is not available in old Node. Remove the typeof check later.
    if (typeof ReadableStream === 'function' && value instanceof ReadableStream) {
      return serializeReadableStream(request, task, value);
    }
    var getAsyncIterator = value[ASYNC_ITERATOR];
    if (typeof getAsyncIterator === 'function') {
      // We treat AsyncIterables as a Fragment and as such we might need to key them.
      return renderAsyncFragment(request, task, value, getAsyncIterator);
    }

    // We put the Date check low b/c most of the time Date's will already have been serialized
    // before we process it in this function but when rendering a Date() as a top level it can
    // end up being a Date instance here. This is rare so we deprioritize it by putting it deep
    // in this function
    if (value instanceof Date) {
      return serializeDate(value);
    }

    // Verify that this is a simple plain object.
    var proto = getPrototypeOf(value);
    if (proto !== ObjectPrototype$1 && (proto === null || getPrototypeOf(proto) !== null)) {
      throw new Error('Only plain objects, and a few built-ins, can be passed to Client Components ' + 'from Server Components. Classes or null prototypes are not supported.' + describeObjectForErrorMessage(parent, parentPropertyName));
    }
    {
      if (objectName(value) !== 'Object') {
        callWithDebugContextInDEV(request, task, function () {
          console.error('Only plain objects can be passed to Client Components from Server Components. ' + '%s objects are not supported.%s', objectName(value), describeObjectForErrorMessage(parent, parentPropertyName));
        });
      } else if (!isSimpleObject(value)) {
        callWithDebugContextInDEV(request, task, function () {
          console.error('Only plain objects can be passed to Client Components from Server Components. ' + 'Classes or other objects with methods are not supported.%s', describeObjectForErrorMessage(parent, parentPropertyName));
        });
      } else if (Object.getOwnPropertySymbols) {
        var symbols = Object.getOwnPropertySymbols(value);
        if (symbols.length > 0) {
          callWithDebugContextInDEV(request, task, function () {
            console.error('Only plain objects can be passed to Client Components from Server Components. ' + 'Objects with symbol properties like %s are not supported.%s', symbols[0].description, describeObjectForErrorMessage(parent, parentPropertyName));
          });
        }
      }
    }

    // $FlowFixMe[incompatible-return]
    return value;
  }
  if (typeof value === 'string') {
    {
      var _tainted = TaintRegistryValues.get(value);
      if (_tainted !== undefined) {
        throwTaintViolation(_tainted.message);
      }
    }
    serializedSize += value.length;
    // TODO: Maybe too clever. If we support URL there's no similar trick.
    if (value[value.length - 1] === 'Z') {
      // Possibly a Date, whose toJSON automatically calls toISOString
      // $FlowFixMe[incompatible-use]
      var originalValue = parent[parentPropertyName];
      if (originalValue instanceof Date) {
        return serializeDateFromDateJSON(value);
      }
    }
    if (value.length >= 1024 && byteLengthOfChunk !== null) {
      // For large strings, we encode them outside the JSON payload so that we
      // don't have to double encode and double parse the strings. This can also
      // be more compact in case the string has a lot of escaped characters.
      return serializeLargeTextString(request, value);
    }
    return escapeStringValue(value);
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return serializeNumber(value);
  }
  if (typeof value === 'undefined') {
    return serializeUndefined();
  }
  if (typeof value === 'function') {
    if (isClientReference(value)) {
      return serializeClientReference(request, parent, parentPropertyName, value);
    }
    if (isServerReference(value)) {
      return serializeServerReference(request, value);
    }
    if (request.temporaryReferences !== undefined) {
      var _tempRef = resolveTemporaryReference(request.temporaryReferences, value);
      if (_tempRef !== undefined) {
        return serializeTemporaryReference(request, _tempRef);
      }
    }
    {
      var _tainted2 = TaintRegistryObjects.get(value);
      if (_tainted2 !== undefined) {
        throwTaintViolation(_tainted2);
      }
    }
    if (isOpaqueTemporaryReference(value)) {
      throw new Error('Could not reference an opaque temporary reference. ' + 'This is likely due to misconfiguring the temporaryReferences options ' + 'on the server.');
    } else if (/^on[A-Z]/.test(parentPropertyName)) {
      throw new Error('Event handlers cannot be passed to Client Component props.' + describeObjectForErrorMessage(parent, parentPropertyName) + '\nIf you need interactivity, consider converting part of this to a Client Component.');
    } else if ((jsxChildrenParents.has(parent) || jsxPropsParents.has(parent) && parentPropertyName === 'children')) {
      var componentName = value.displayName || value.name || 'Component';
      throw new Error('Functions are not valid as a child of Client Components. This may happen if ' + 'you return ' + componentName + ' instead of <' + componentName + ' /> from render. ' + 'Or maybe you meant to call this function rather than return it.' + describeObjectForErrorMessage(parent, parentPropertyName));
    } else {
      throw new Error('Functions cannot be passed directly to Client Components ' + 'unless you explicitly expose it by marking it with "use server". ' + 'Or maybe you meant to call this function rather than return it.' + describeObjectForErrorMessage(parent, parentPropertyName));
    }
  }
  if (typeof value === 'symbol') {
    var writtenSymbols = request.writtenSymbols;
    var existingId = writtenSymbols.get(value);
    if (existingId !== undefined) {
      return serializeByValueID(existingId);
    }
    // $FlowFixMe[incompatible-type] `description` might be undefined
    var name = value.description;
    if (Symbol.for(name) !== value) {
      throw new Error('Only global symbols received from Symbol.for(...) can be passed to Client Components. ' + ("The symbol Symbol.for(" +
      // $FlowFixMe[incompatible-type] `description` might be undefined
      value.description + ") cannot be found among global symbols.") + describeObjectForErrorMessage(parent, parentPropertyName));
    }
    request.pendingChunks++;
    var symbolId = request.nextChunkId++;
    emitSymbolChunk(request, symbolId, name);
    writtenSymbols.set(value, symbolId);
    return serializeByValueID(symbolId);
  }
  if (typeof value === 'bigint') {
    {
      var _tainted3 = TaintRegistryValues.get(value);
      if (_tainted3 !== undefined) {
        throwTaintViolation(_tainted3.message);
      }
    }
    return serializeBigInt(value);
  }
  throw new Error("Type " + typeof value + " is not supported in Client Component props." + describeObjectForErrorMessage(parent, parentPropertyName));
}
function logRecoverableError(request, error, task // DEV-only
) {
  var prevRequest = currentRequest;
  // We clear the request context so that console.logs inside the callback doesn't
  // get forwarded to the client.
  currentRequest = null;
  var errorDigest;
  try {
    var onError = request.onError;
    if (true && task !== null) {
      if (supportsRequestStorage) {
        errorDigest = requestStorage.run(undefined, callWithDebugContextInDEV, request, task, onError, error);
      } else {
        errorDigest = callWithDebugContextInDEV(request, task, onError, error);
      }
    } else if (supportsRequestStorage) {
      // Exit the request context while running callbacks.
      errorDigest = requestStorage.run(undefined, onError, error);
    } else {
      errorDigest = onError(error);
    }
  } finally {
    currentRequest = prevRequest;
  }
  if (errorDigest != null && typeof errorDigest !== 'string') {
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error("onError returned something with a type other than \"string\". onError should return a string and may return null or undefined but must not return anything else. It received something of type \"" + typeof errorDigest + "\" instead");
  }
  return errorDigest || '';
}
function fatalError(request, error) {
  var onFatalError = request.onFatalError;
  onFatalError(error);
  {
    cleanupTaintQueue(request);
  }
  // This is called outside error handling code such as if an error happens in React internals.
  if (request.destination !== null) {
    request.status = CLOSED;
    closeWithError(request.destination, error);
  } else {
    request.status = CLOSING;
    request.fatalError = error;
  }
  var abortReason = new Error('The render was aborted due to a fatal error.', {
    cause: error
  });
  request.cacheController.abort(abortReason);
}
function serializeErrorValue(request, error) {
  {
    var name = 'Error';
    var message;
    var stack;
    var env = (0, request.environmentName)();
    try {
      name = error.name;
      // eslint-disable-next-line react-internal/safe-string-coercion
      message = String(error.message);
      stack = filterStackTrace(request, parseStackTrace(error, 0));
      var errorEnv = error.environmentName;
      if (typeof errorEnv === 'string') {
        // This probably came from another FlightClient as a pass through.
        // Keep the environment name.
        env = errorEnv;
      }
    } catch (x) {
      message = 'An error occurred but serializing the error message failed.';
      stack = [];
    }
    var errorInfo = {
      name: name,
      message: message,
      stack: stack,
      env: env
    };
    var id = outlineModel(request, errorInfo);
    return '$Z' + id.toString(16);
  }
}
function serializeDebugErrorValue(request, error) {
  {
    var name = 'Error';
    var message;
    var stack;
    var env = (0, request.environmentName)();
    try {
      name = error.name;
      // eslint-disable-next-line react-internal/safe-string-coercion
      message = String(error.message);
      stack = filterStackTrace(request, parseStackTrace(error, 0));
      var errorEnv = error.environmentName;
      if (typeof errorEnv === 'string') {
        // This probably came from another FlightClient as a pass through.
        // Keep the environment name.
        env = errorEnv;
      }
    } catch (x) {
      message = 'An error occurred but serializing the error message failed.';
      stack = [];
    }
    var errorInfo = {
      name: name,
      message: message,
      stack: stack,
      env: env
    };
    var id = outlineDebugModel(request, {
      objectLimit: stack.length * 2 + 1
    }, errorInfo);
    return '$Z' + id.toString(16);
  }
}
function emitErrorChunk(request, id, digest, error, debug,
// DEV-only
owner // DEV-only
) {
  var errorInfo;
  {
    var name = 'Error';
    var message;
    var stack;
    var env = (0, request.environmentName)();
    try {
      if (error instanceof Error) {
        name = error.name;
        // eslint-disable-next-line react-internal/safe-string-coercion
        message = String(error.message);
        stack = filterStackTrace(request, parseStackTrace(error, 0));
        var errorEnv = error.environmentName;
        if (typeof errorEnv === 'string') {
          // This probably came from another FlightClient as a pass through.
          // Keep the environment name.
          env = errorEnv;
        }
      } else if (typeof error === 'object' && error !== null) {
        message = describeObjectForErrorMessage(error);
        stack = [];
      } else {
        // eslint-disable-next-line react-internal/safe-string-coercion
        message = String(error);
        stack = [];
      }
    } catch (x) {
      message = 'An error occurred but serializing the error message failed.';
      stack = [];
    }
    var ownerRef = owner == null ? null : outlineComponentInfo(request, owner);
    errorInfo = {
      digest: digest,
      name: name,
      message: message,
      stack: stack,
      env: env,
      owner: ownerRef
    };
  }
  var row = serializeRowHeader('E', id) + stringify(errorInfo) + '\n';
  var processedChunk = stringToChunk(row);
  if (debug) {
    request.completedDebugChunks.push(processedChunk);
  } else {
    request.completedErrorChunks.push(processedChunk);
  }
}
function emitImportChunk(request, id, clientReferenceMetadata, debug) {
  // $FlowFixMe[incompatible-type] stringify can return null
  var json = stringify(clientReferenceMetadata);
  var row = serializeRowHeader('I', id) + json + '\n';
  var processedChunk = stringToChunk(row);
  if (debug) {
    request.completedDebugChunks.push(processedChunk);
  } else {
    request.completedImportChunks.push(processedChunk);
  }
}
function emitHintChunk(request, code, model) {
  var json = stringify(model);
  var row = ':H' + code + json + '\n';
  var processedChunk = stringToChunk(row);
  request.completedHintChunks.push(processedChunk);
}
function emitSymbolChunk(request, id, name) {
  var symbolReference = serializeSymbolReference(name);
  var processedChunk = encodeReferenceChunk(request, id, symbolReference);
  request.completedImportChunks.push(processedChunk);
}
function emitModelChunk(request, id, json) {
  var row = id.toString(16) + ':' + json + '\n';
  var processedChunk = stringToChunk(row);
  request.completedRegularChunks.push(processedChunk);
}
function emitDebugHaltChunk(request, id) {
  // This emits a marker that this row will never complete and should intentionally never resolve
  // even when the client stream is closed. We use just the lack of data to indicate this.
  var row = id.toString(16) + ':\n';
  var processedChunk = stringToChunk(row);
  request.completedDebugChunks.push(processedChunk);
}
function emitDebugChunk(request, id, debugInfo) {
  var json = serializeDebugModel(request, 500, debugInfo);
  if (request.debugDestination !== null) {
    if (json[0] === '"' && json[1] === '$') {
      // This is already an outlined reference so we can just emit it directly,
      // without an unnecessary indirection.
      var row = serializeRowHeader('D', id) + json + '\n';
      request.completedRegularChunks.push(stringToChunk(row));
    } else {
      // Outline the debug information to the debug channel.
      var outlinedId = request.nextChunkId++;
      var debugRow = outlinedId.toString(16) + ':' + json + '\n';
      request.pendingDebugChunks++;
      request.completedDebugChunks.push(stringToChunk(debugRow));
      var _row = serializeRowHeader('D', id) + '"$' + outlinedId.toString(16) + '"\n';
      request.completedRegularChunks.push(stringToChunk(_row));
    }
  } else {
    var _row2 = serializeRowHeader('D', id) + json + '\n';
    request.completedRegularChunks.push(stringToChunk(_row2));
  }
}
function outlineComponentInfo(request, componentInfo) {
  var existingRef = request.writtenDebugObjects.get(componentInfo);
  if (existingRef !== undefined) {
    // Already written
    return existingRef;
  }
  if (componentInfo.owner != null) {
    // Ensure the owner is already outlined.
    outlineComponentInfo(request, componentInfo.owner);
  }

  // Limit the number of objects we write to prevent emitting giant props objects.
  var objectLimit = 10;
  if (componentInfo.stack != null) {
    // Ensure we have enough object limit to encode the stack trace.
    objectLimit += componentInfo.stack.length;
  }

  // We use the console encoding so that we can dedupe objects but don't necessarily
  // use the full serialization that requires a task.
  var counter = {
    objectLimit: objectLimit
  };

  // We can't serialize the ConsoleTask/Error objects so we need to omit them before serializing.
  var componentDebugInfo = {
    name: componentInfo.name,
    key: componentInfo.key
  };
  if (componentInfo.env != null) {
    // $FlowFixMe[cannot-write]
    componentDebugInfo.env = componentInfo.env;
  }
  if (componentInfo.owner != null) {
    // $FlowFixMe[cannot-write]
    componentDebugInfo.owner = componentInfo.owner;
  }
  if (componentInfo.stack == null && componentInfo.debugStack != null) {
    // If we have a debugStack but no parsed stack we should parse it.
    // $FlowFixMe[cannot-write]
    componentDebugInfo.stack = filterStackTrace(request, parseStackTrace(componentInfo.debugStack, 1));
  } else if (componentInfo.stack != null) {
    // $FlowFixMe[cannot-write]
    componentDebugInfo.stack = componentInfo.stack;
  }
  // Ensure we serialize props after the stack to favor the stack being complete.
  // $FlowFixMe[cannot-write]
  componentDebugInfo.props = componentInfo.props;
  var id = outlineDebugModel(request, counter, componentDebugInfo);
  var ref = serializeByValueID(id);
  request.writtenDebugObjects.set(componentInfo, ref);
  // We also store this in the main dedupe set so that it can be referenced by inline React Elements.
  request.writtenObjects.set(componentInfo, ref);
  return ref;
}
function emitIOInfoChunk(request, id, name, start, end, value, env, owner, stack) {
  var objectLimit = 10;
  if (stack) {
    objectLimit += stack.length;
  }
  var relativeStartTimestamp = start - request.timeOrigin;
  var relativeEndTimestamp = end - request.timeOrigin;
  var debugIOInfo = {
    name: name,
    start: relativeStartTimestamp,
    end: relativeEndTimestamp
  };
  if (env != null) {
    // $FlowFixMe[cannot-write]
    debugIOInfo.env = env;
  }
  if (stack != null) {
    // $FlowFixMe[cannot-write]
    debugIOInfo.stack = stack;
  }
  if (owner != null) {
    // $FlowFixMe[cannot-write]
    debugIOInfo.owner = owner;
  }
  if (value !== undefined) {
    // $FlowFixMe[cannot-write]
    debugIOInfo.value = value;
  }
  var json = serializeDebugModel(request, objectLimit, debugIOInfo);
  var row = id.toString(16) + ':J' + json + '\n';
  var processedChunk = stringToChunk(row);
  request.completedDebugChunks.push(processedChunk);
}
function outlineIOInfo(request, ioInfo) {
  if (request.writtenObjects.has(ioInfo)) {
    // Already written
    return;
  }
  // We can't serialize the ConsoleTask/Error objects so we need to omit them before serializing.
  request.pendingDebugChunks++;
  var id = request.nextChunkId++;
  var owner = ioInfo.owner;
  // Ensure the owner is already outlined.
  if (owner != null) {
    outlineComponentInfo(request, owner);
  }
  var debugStack;
  if (ioInfo.stack == null && ioInfo.debugStack != null) {
    // If we have a debugStack but no parsed stack we should parse it.
    debugStack = filterStackTrace(request, parseStackTrace(ioInfo.debugStack, 1));
  } else {
    debugStack = ioInfo.stack;
  }
  var env = ioInfo.env;
  if (env == null) {
    // If we're forwarding IO info from this environment, an empty env is effectively the "client" side.
    // The "client" from the perspective of our client will be this current environment.
    env = (0, request.environmentName)();
  }
  emitIOInfoChunk(request, id, ioInfo.name, ioInfo.start, ioInfo.end, ioInfo.value, env, owner, debugStack);
  request.writtenDebugObjects.set(ioInfo, serializeByValueID(id));
}
function serializeIONode(request, ioNode, promiseRef) {
  var existingRef = request.writtenDebugObjects.get(ioNode);
  if (existingRef !== undefined) {
    // Already written
    return existingRef;
  }
  var stack = null;
  var name = '';
  if (ioNode.promise !== null) {
    // Pick an explicit name from the Promise itself if it exists.
    // Note that we don't use the promiseRef passed in since that's sometimes the awaiting Promise
    // which is the value observed but it's likely not the one with the name on it.
    var promise = ioNode.promise.deref();
    if (promise !== undefined &&
    // $FlowFixMe[prop-missing]
    typeof promise.displayName === 'string') {
      name = promise.displayName;
    }
  }
  if (ioNode.stack !== null) {
    // The stack can contain some leading internal frames for the construction of the promise that we skip.
    var fullStack = stripLeadingPromiseCreationFrames(ioNode.stack);
    stack = filterStackTrace(request, fullStack);
    if (name === '') {
      // If we didn't have an explicit name, try finding one from the stack.
      name = findCalledFunctionNameFromStackTrace(request, fullStack);
      // The name can include the object that this was called on but sometimes that's
      // just unnecessary context.
      if (name.startsWith('Window.')) {
        name = name.slice(7);
      } else if (name.startsWith('<anonymous>.')) {
        name = name.slice(7);
      }
    }
  }
  var owner = ioNode.owner;
  // Ensure the owner is already outlined.
  if (owner != null) {
    outlineComponentInfo(request, owner);
  }
  var value = undefined;
  if (promiseRef !== null) {
    value = promiseRef.deref();
  }

  // We log the environment at the time when we serialize the I/O node.
  // The environment name may have changed from when the I/O was actually started.
  var env = (0, request.environmentName)();
  var endTime = ioNode.tag === UNRESOLVED_PROMISE_NODE ?
  // Mark the end time as now. It's arbitrary since it's not resolved but this
  // marks when we called abort and therefore stopped trying.
  request.abortTime : ioNode.end;
  request.pendingDebugChunks++;
  var id = request.nextChunkId++;
  emitIOInfoChunk(request, id, name, ioNode.start, endTime, value, env, owner, stack);
  var ref = serializeByValueID(id);
  request.writtenDebugObjects.set(ioNode, ref);
  return ref;
}
function emitTypedArrayChunk(request, id, tag, typedArray, debug) {
  {
    if (TaintRegistryByteLengths.has(typedArray.byteLength)) {
      // If we have had any tainted values of this length, we check
      // to see if these bytes matches any entries in the registry.
      var tainted = TaintRegistryValues.get(binaryToComparableString(typedArray));
      if (tainted !== undefined) {
        throwTaintViolation(tainted.message);
      }
    }
  }
  if (debug) {
    request.pendingDebugChunks++;
  } else {
    request.pendingChunks++; // Extra chunk for the header.
  }
  // TODO: Convert to little endian if that's not the server default.
  var binaryChunk = typedArrayToBinaryChunk(typedArray);
  var binaryLength = byteLengthOfBinaryChunk(binaryChunk);
  var row = id.toString(16) + ':' + tag + binaryLength.toString(16) + ',';
  var headerChunk = stringToChunk(row);
  if (debug) {
    request.completedDebugChunks.push(headerChunk, binaryChunk);
  } else {
    request.completedRegularChunks.push(headerChunk, binaryChunk);
  }
}
function emitTextChunk(request, id, text, debug) {
  if (byteLengthOfChunk === null) {
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error('Existence of byteLengthOfChunk should have already been checked. This is a bug in React.');
  }
  if (debug) {
    request.pendingDebugChunks++;
  } else {
    request.pendingChunks++; // Extra chunk for the header.
  }
  var textChunk = stringToChunk(text);
  var binaryLength = byteLengthOfChunk(textChunk);
  var row = id.toString(16) + ':T' + binaryLength.toString(16) + ',';
  var headerChunk = stringToChunk(row);
  if (debug) {
    request.completedDebugChunks.push(headerChunk, textChunk);
  } else {
    request.completedRegularChunks.push(headerChunk, textChunk);
  }
}
function serializeEval(source) {
  return '$E' + source;
}
var CONSTRUCTOR_MARKER = Symbol() ;
var debugModelRoot = null;
var debugNoOutline = null;
// This is a forked version of renderModel which should never error, never suspend and is limited
// in the depth it can encode.
function renderDebugModel(request, counter, parent, parentPropertyName, value) {
  if (value === null) {
    return null;
  }

  // Special Symbol, that's very common.
  if (value === REACT_ELEMENT_TYPE) {
    return '$';
  }
  if (typeof value === 'object') {
    if (isClientReference(value)) {
      // We actually have this value on the client so we could import it.
      // This might be confusing though because on the Server it won't actually
      // be this value, so if you're debugging client references maybe you'd be
      // better with a place holder.
      return serializeDebugClientReference(request, parent, parentPropertyName, value);
    }
    if (value.$$typeof === CONSTRUCTOR_MARKER) {
      var _constructor = value.constructor;
      var ref = request.writtenDebugObjects.get(_constructor);
      if (ref === undefined) {
        var id = outlineDebugModel(request, counter, _constructor);
        ref = serializeByValueID(id);
      }
      return '$P' + ref.slice(1);
    }
    if (request.temporaryReferences !== undefined) {
      var tempRef = resolveTemporaryReference(request.temporaryReferences, value);
      if (tempRef !== undefined) {
        return serializeTemporaryReference(request, tempRef);
      }
    }
    var writtenDebugObjects = request.writtenDebugObjects;
    var existingDebugReference = writtenDebugObjects.get(value);
    if (existingDebugReference !== undefined) {
      if (debugModelRoot === value) {
        // This is the ID we're currently emitting so we need to write it
        // once but if we discover it again, we refer to it by id.
        debugModelRoot = null;
      } else {
        // We've already emitted this as a debug object. We favor that version if available.
        return existingDebugReference;
      }
    } else if (parentPropertyName.indexOf(':') === -1) {
      // TODO: If the property name contains a colon, we don't dedupe. Escape instead.
      var parentReference = writtenDebugObjects.get(parent);
      if (parentReference !== undefined) {
        // If the parent has a reference, we can refer to this object indirectly
        // through the property name inside that parent.
        if (counter.objectLimit <= 0 && !doNotLimit.has(value)) {
          // If we are going to defer this, don't dedupe it since then we'd dedupe it to be
          // deferred in future reference.
          return serializeDeferredObject(request, value);
        }
        var propertyName = parentPropertyName;
        if (isArray(parent) && parent[0] === REACT_ELEMENT_TYPE) {
          // For elements, we've converted it to an array but we'll have converted
          // it back to an element before we read the references so the property
          // needs to be aliased.
          switch (parentPropertyName) {
            case '1':
              propertyName = 'type';
              break;
            case '2':
              propertyName = 'key';
              break;
            case '3':
              propertyName = 'props';
              break;
            case '4':
              propertyName = '_owner';
              break;
          }
        }
        writtenDebugObjects.set(value, parentReference + ':' + propertyName);
      } else if (debugNoOutline !== value) {
        // If this isn't the root object (like meta data) and we don't have an id for it, outline
        // it so that we can dedupe it by reference later.
        // $FlowFixMe[method-unbinding]
        if (typeof value.then === 'function') {
          // If this is a Promise we're going to assign it an external ID anyway which can be deduped.
          var thenable = value;
          return serializeDebugThenable(request, counter, thenable);
        } else {
          var outlinedId = outlineDebugModel(request, counter, value);
          return serializeByValueID(outlinedId);
        }
      }
    }
    var writtenObjects = request.writtenObjects;
    var existingReference = writtenObjects.get(value);
    if (existingReference !== undefined) {
      // We've already emitted this as a real object, so we can refer to that by its existing reference.
      // This might be slightly different serialization than what renderDebugModel would've produced.
      return existingReference;
    }
    if (counter.objectLimit <= 0 && !doNotLimit.has(value)) {
      // We've reached our max number of objects to serialize across the wire so we serialize this
      // as a marker so that the client can error or lazy load this when accessed by the console.
      return serializeDeferredObject(request, value);
    }
    counter.objectLimit--;
    var deferredDebugObjects = request.deferredDebugObjects;
    if (deferredDebugObjects !== null) {
      var deferredId = deferredDebugObjects.existing.get(value);
      // We earlier deferred this same object. We're now going to eagerly emit it so let's emit it
      // at the same ID that we already used to refer to it.
      if (deferredId !== undefined) {
        deferredDebugObjects.existing.delete(value);
        deferredDebugObjects.retained.delete(deferredId);
        emitOutlinedDebugModelChunk(request, deferredId, counter, value);
        return serializeByValueID(deferredId);
      }
    }
    switch (value.$$typeof) {
      case REACT_ELEMENT_TYPE:
        {
          var element = value;
          if (element._owner != null) {
            outlineComponentInfo(request, element._owner);
          }
          if (typeof element.type === 'object' && element.type !== null) {
            // If the type is an object it can get cut off which shouldn't happen here.
            doNotLimit.add(element.type);
          }
          if (typeof element.key === 'object' && element.key !== null) {
            // This should never happen but just in case.
            doNotLimit.add(element.key);
          }
          doNotLimit.add(element.props);
          if (element._owner !== null) {
            doNotLimit.add(element._owner);
          }
          var debugStack = null;
          if (element._debugStack != null) {
            // Outline the debug stack so that it doesn't get cut off.
            debugStack = filterStackTrace(request, parseStackTrace(element._debugStack, 1));
            doNotLimit.add(debugStack);
            for (var i = 0; i < debugStack.length; i++) {
              doNotLimit.add(debugStack[i]);
            }
          }
          return [REACT_ELEMENT_TYPE, element.type, element.key, element.props, element._owner, debugStack, element._store.validated];
        }
      case REACT_LAZY_TYPE:
        {
          // To avoid actually initializing a lazy causing a side-effect, we make
          // some assumptions about the structure of the payload even though
          // that's not really part of the contract. In practice, this is really
          // just coming from React.lazy helper or Flight.
          var lazy = value;
          var payload = lazy._payload;
          if (payload !== null && typeof payload === 'object') {
            // React.lazy constructor
            switch (payload._status) {
              case -1 /* Uninitialized */:
              case 0 /* Pending */:
                break;
              case 1 /* Resolved */:
                {
                  var _id2 = outlineDebugModel(request, counter, payload._result);
                  return serializeLazyID(_id2);
                }
              case 2 /* Rejected */:
                {
                  // We don't log these errors since they didn't actually throw into
                  // Flight.
                  var digest = '';
                  var _id3 = request.nextChunkId++;
                  emitErrorChunk(request, _id3, digest, payload._result, true, null);
                  return serializeLazyID(_id3);
                }
            }

            // React Flight
            switch (payload.status) {
              case 'pending':
              case 'blocked':
              case 'resolved_model':
                // The value is an uninitialized model from the Flight client.
                // It's not very useful to emit that.
                break;
              case 'resolved_module':
                // The value is client reference metadata from the Flight client.
                // It's likely for SSR, so we choose not to emit it.
                break;
              case 'fulfilled':
                {
                  var _id4 = outlineDebugModel(request, counter, payload.value);
                  return serializeLazyID(_id4);
                }
              case 'rejected':
                {
                  // We don't log these errors since they didn't actually throw into
                  // Flight.
                  var _digest = '';
                  var _id5 = request.nextChunkId++;
                  emitErrorChunk(request, _id5, _digest, payload.reason, true, null);
                  return serializeLazyID(_id5);
                }
            }
          }

          // We couldn't emit a resolved or rejected value synchronously. For now,
          // we emit this as a halted chunk. TODO: We could maybe also handle
          // pending lazy debug models like we do in serializeDebugThenable,
          // if/when we determine that it's worth the added complexity.
          request.pendingDebugChunks++;
          var _id = request.nextChunkId++;
          emitDebugHaltChunk(request, _id);
          return serializeLazyID(_id);
        }
    }

    // $FlowFixMe[method-unbinding]
    if (typeof value.then === 'function') {
      var _thenable = value;
      return serializeDebugThenable(request, counter, _thenable);
    }
    if (isArray(value)) {
      if (value.length > 200 && !doNotLimit.has(value)) {
        // Defer large arrays. They're heavy to serialize.
        // TODO: Consider doing the same for objects with many properties too.
        return serializeDeferredObject(request, value);
      }
      return value;
    }
    if (value instanceof Date) {
      return serializeDate(value);
    }
    if (value instanceof Map) {
      return serializeDebugMap(request, counter, value);
    }
    if (value instanceof Set) {
      return serializeDebugSet(request, counter, value);
    }
    // TODO: FormData is not available in old Node. Remove the typeof later.
    if (typeof FormData === 'function' && value instanceof FormData) {
      return serializeDebugFormData(request, value);
    }
    if (value instanceof Error) {
      return serializeDebugErrorValue(request, value);
    }
    if (value instanceof ArrayBuffer) {
      return serializeDebugTypedArray(request, 'A', new Uint8Array(value));
    }
    if (value instanceof Int8Array) {
      // char
      return serializeDebugTypedArray(request, 'O', value);
    }
    if (value instanceof Uint8Array) {
      // unsigned char
      return serializeDebugTypedArray(request, 'o', value);
    }
    if (value instanceof Uint8ClampedArray) {
      // unsigned clamped char
      return serializeDebugTypedArray(request, 'U', value);
    }
    if (value instanceof Int16Array) {
      // sort
      return serializeDebugTypedArray(request, 'S', value);
    }
    if (value instanceof Uint16Array) {
      // unsigned short
      return serializeDebugTypedArray(request, 's', value);
    }
    if (value instanceof Int32Array) {
      // long
      return serializeDebugTypedArray(request, 'L', value);
    }
    if (value instanceof Uint32Array) {
      // unsigned long
      return serializeDebugTypedArray(request, 'l', value);
    }
    if (value instanceof Float32Array) {
      // float
      return serializeDebugTypedArray(request, 'G', value);
    }
    if (value instanceof Float64Array) {
      // double
      return serializeDebugTypedArray(request, 'g', value);
    }
    if (value instanceof BigInt64Array) {
      // number
      return serializeDebugTypedArray(request, 'M', value);
    }
    if (value instanceof BigUint64Array) {
      // unsigned number
      // We use "m" instead of "n" since JSON can start with "null"
      return serializeDebugTypedArray(request, 'm', value);
    }
    if (value instanceof DataView) {
      return serializeDebugTypedArray(request, 'V', value);
    }
    // TODO: Blob is not available in old Node. Remove the typeof check later.
    if (typeof Blob === 'function' && value instanceof Blob) {
      return serializeDebugBlob(request, value);
    }
    var iteratorFn = getIteratorFn(value);
    if (iteratorFn) {
      return Array.from(value);
    }
    var proto = getPrototypeOf(value);
    if (proto !== ObjectPrototype$1 && proto !== null) {
      var object = value;
      var instanceDescription = Object.create(null);
      for (var propName in object) {
        if (hasOwnProperty.call(value, propName) || isGetter(proto, propName)) {
          // We intentionally invoke getters on the prototype to read any enumerable getters.
          instanceDescription[propName] = object[propName];
        }
      }
      var _constructor2 = proto.constructor;
      if (typeof _constructor2 === 'function' && _constructor2.prototype === proto) {
        // This is a simple class shape.
        if (hasOwnProperty.call(object, '') || isGetter(proto, '')) ; else {
          instanceDescription[''] = {
            $$typeof: CONSTRUCTOR_MARKER,
            constructor: _constructor2
          };
        }
      }
      return instanceDescription;
    }

    // $FlowFixMe[incompatible-return]
    return value;
  }
  if (typeof value === 'string') {
    if (value.length >= 1024) {
      // Large strings are counted towards the object limit.
      if (counter.objectLimit <= 0) {
        // We've reached our max number of objects to serialize across the wire so we serialize this
        // as a marker so that the client can error or lazy load this when accessed by the console.
        return serializeDeferredObject(request, value);
      }
      counter.objectLimit--;
      // For large strings, we encode them outside the JSON payload so that we
      // don't have to double encode and double parse the strings. This can also
      // be more compact in case the string has a lot of escaped characters.
      return serializeDebugLargeTextString(request, value);
    }
    return escapeStringValue(value);
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return serializeNumber(value);
  }
  if (typeof value === 'undefined') {
    return serializeUndefined();
  }
  if (typeof value === 'function') {
    if (isClientReference(value)) {
      return serializeDebugClientReference(request, parent, parentPropertyName, value);
    }
    if (request.temporaryReferences !== undefined) {
      var _tempRef2 = resolveTemporaryReference(request.temporaryReferences, value);
      if (_tempRef2 !== undefined) {
        return serializeTemporaryReference(request, _tempRef2);
      }
    }

    // Serialize the body of the function as an eval so it can be printed.
    var _writtenDebugObjects = request.writtenDebugObjects;
    var _existingReference2 = _writtenDebugObjects.get(value);
    if (_existingReference2 !== undefined) {
      // We've already emitted this function, so we can
      // just refer to that by its existing reference.
      return _existingReference2;
    }

    // $FlowFixMe[method-unbinding]
    var functionBody = Function.prototype.toString.call(value);
    var name = value.name;
    var serializedValue = serializeEval(typeof name === 'string' ? 'Object.defineProperty(' + functionBody + ',"name",{value:' + JSON.stringify(name) + '})' : '(' + functionBody + ')');
    request.pendingDebugChunks++;
    var _id6 = request.nextChunkId++;
    var processedChunk = encodeReferenceChunk(request, _id6, serializedValue);
    request.completedDebugChunks.push(processedChunk);
    var reference = serializeByValueID(_id6);
    _writtenDebugObjects.set(value, reference);
    return reference;
  }
  if (typeof value === 'symbol') {
    var writtenSymbols = request.writtenSymbols;
    var existingId = writtenSymbols.get(value);
    if (existingId !== undefined) {
      return serializeByValueID(existingId);
    }
    // $FlowFixMe[incompatible-type] `description` might be undefined
    var _name = value.description;
    // We use the Symbol.for version if it's not a global symbol. Close enough.
    request.pendingChunks++;
    var symbolId = request.nextChunkId++;
    emitSymbolChunk(request, symbolId, _name);
    return serializeByValueID(symbolId);
  }
  if (typeof value === 'bigint') {
    return serializeBigInt(value);
  }
  return 'unknown type ' + typeof value;
}
function serializeDebugModel(request, objectLimit, model) {
  var counter = {
    objectLimit: objectLimit
  };
  function replacer(parentPropertyName, value) {
    try {
      // By-pass toJSON and use the original value.
      // $FlowFixMe[incompatible-use]
      var originalValue = this[parentPropertyName];
      return renderDebugModel(request, counter, this, parentPropertyName, originalValue);
    } catch (x) {
      return 'Unknown Value: React could not send it from the server.\n' + x.message;
    }
  }
  var prevNoOutline = debugNoOutline;
  debugNoOutline = model;
  try {
    // $FlowFixMe[incompatible-cast] stringify can return null
    return stringify(model, replacer);
  } catch (x) {
    // $FlowFixMe[incompatible-cast] stringify can return null
    return stringify('Unknown Value: React could not send it from the server.\n' + x.message);
  } finally {
    debugNoOutline = prevNoOutline;
  }
}
function emitOutlinedDebugModelChunk(request, id, counter, model) {
  if (typeof model === 'object' && model !== null) {
    // We can't limit outlined values.
    doNotLimit.add(model);
  }
  function replacer(parentPropertyName, value) {
    try {
      // By-pass toJSON and use the original value.
      // $FlowFixMe[incompatible-use]
      var originalValue = this[parentPropertyName];
      return renderDebugModel(request, counter, this, parentPropertyName, originalValue);
    } catch (x) {
      return 'Unknown Value: React could not send it from the server.\n' + x.message;
    }
  }
  var prevModelRoot = debugModelRoot;
  debugModelRoot = model;
  if (typeof model === 'object' && model !== null) {
    // Future references can refer to this object by id.
    request.writtenDebugObjects.set(model, serializeByValueID(id));
  }
  var json;
  try {
    // $FlowFixMe[incompatible-cast] stringify can return null
    json = stringify(model, replacer);
  } catch (x) {
    // $FlowFixMe[incompatible-cast] stringify can return null
    json = stringify('Unknown Value: React could not send it from the server.\n' + x.message);
  } finally {
    debugModelRoot = prevModelRoot;
  }
  var row = id.toString(16) + ':' + json + '\n';
  var processedChunk = stringToChunk(row);
  request.completedDebugChunks.push(processedChunk);
}
function outlineDebugModel(request, counter, model) {
  var id = request.nextChunkId++;
  request.pendingDebugChunks++;
  emitOutlinedDebugModelChunk(request, id, counter, model);
  return id;
}
function emitConsoleChunk(request, methodName, owner, env, stackTrace, args) {

  // Ensure the owner is already outlined.
  if (owner != null) {
    outlineComponentInfo(request, owner);
  }
  var payload = [methodName, stackTrace, owner, env];
  // $FlowFixMe[method-unbinding]
  payload.push.apply(payload, args);
  var objectLimit = request.deferredDebugObjects === null ? 500 : 10;
  var json = serializeDebugModel(request, objectLimit + stackTrace.length, payload);
  if (json[0] !== '[') {
    // This looks like an error. Try a simpler object.
    json = serializeDebugModel(request, 10 + stackTrace.length, [methodName, stackTrace, owner, env, 'Unknown Value: React could not send it from the server.']);
  }
  var row = ':W' + json + '\n';
  var processedChunk = stringToChunk(row);
  request.completedDebugChunks.push(processedChunk);
}
function emitTimeOriginChunk(request, timeOrigin) {
  // We emit the time origin once. All ReactTimeInfo timestamps later in the stream
  // are relative to this time origin. This allows for more compact number encoding
  // and lower precision loss.
  request.pendingDebugChunks++;
  var row = ':N' + timeOrigin + '\n';
  var processedChunk = stringToChunk(row);
  // TODO: Move to its own priority queue.
  request.completedDebugChunks.push(processedChunk);
}
function forwardDebugInfoOnce(request, task, debugInfo) {
  // Track which items from this array have already been forwarded,
  // and don't emit them again. Note that elements can sometimes move
  // from one array to another, e.g. when a lazy chunk's debug info is
  // transferred to the element it resolves to in `initializeElement`.
  var earlyDebugInfoEntries = request.earlyDebugInfoEntries;
  if (!earlyDebugInfoEntries) {
    earlyDebugInfoEntries = request.earlyDebugInfoEntries = new WeakSet();
  }
  forwardDebugInfoImpl(request, task, debugInfo, earlyDebugInfoEntries);
}
function forwardDebugInfo(request, task, debugInfo) {
  forwardDebugInfoImpl(request, task, debugInfo, null);
}
function forwardDebugInfoImpl(request, task, debugInfo, seenInfos) {
  var id = task.id;
  for (var i = 0; i < debugInfo.length; i++) {
    var info = debugInfo[i];
    if (seenInfos !== null) {
      if (seenInfos.has(info)) {
        continue;
      }
      seenInfos.add(info);
    }
    if (typeof info.time === 'number') {
      // When forwarding time we need to ensure to convert it to the time space of the payload.
      // We clamp the time to the starting render of the current component. It's as if it took
      // no time to render and await if we reuse cached content.
      markOperationEndTime(request, task, info.time);
    } else {
      if (typeof info.name === 'string') {
        // We outline this model eagerly so that we can refer to by reference as an owner.
        // If we had a smarter way to dedupe we might not have to do this if there ends up
        // being no references to this as an owner.
        outlineComponentInfo(request, info);
        // Emit a reference to the outlined one.
        request.pendingChunks++;
        emitDebugChunk(request, id, info);
      } else if (info.awaited) {
        var ioInfo = info.awaited;
        // TODO: add a way to preserve IO nodes from before the request started
        if (ioInfo.end <= request.timeOrigin) ; else {
          // Outline the IO info in case the same I/O is awaited in more than one place.
          outlineIOInfo(request, ioInfo);
          // Ensure the owner is already outlined.
          if (info.owner != null) {
            outlineComponentInfo(request, info.owner);
          }
          // We can't serialize the ConsoleTask/Error objects so we need to omit them before serializing.
          var debugStack = void 0;
          if (info.stack == null && info.debugStack != null) {
            // If we have a debugStack but no parsed stack we should parse it.
            debugStack = filterStackTrace(request, parseStackTrace(info.debugStack, 1));
          } else {
            debugStack = info.stack;
          }
          var debugAsyncInfo = {
            awaited: ioInfo
          };
          if (info.env != null) {
            // $FlowFixMe[cannot-write]
            debugAsyncInfo.env = info.env;
          } else {
            // If we're forwarding IO info from this environment, an empty env is effectively the "client" side.
            // The "client" from the perspective of our client will be this current environment.
            // $FlowFixMe[cannot-write]
            debugAsyncInfo.env = (0, request.environmentName)();
          }
          if (info.owner != null) {
            // $FlowFixMe[cannot-write]
            debugAsyncInfo.owner = info.owner;
          }
          if (debugStack != null) {
            // $FlowFixMe[cannot-write]
            debugAsyncInfo.stack = debugStack;
          }
          request.pendingChunks++;
          emitDebugChunk(request, id, debugAsyncInfo);
        }
      } else {
        request.pendingChunks++;
        emitDebugChunk(request, id, info);
      }
    }
  }
}
function forwardDebugInfoFromThenable(request, task, thenable, owner,
// DEV-only
stack // DEV-only
) {
  var debugInfo;
  {
    // If this came from Flight, forward any debug info into this new row.
    debugInfo = thenable._debugInfo;
    if (debugInfo) {
      forwardDebugInfo(request, task, debugInfo);
    }
  }
  {
    var sequence = getAsyncSequenceFromPromise();
    if (sequence !== null) {
      emitAsyncSequence(request, task, sequence, debugInfo, owner, stack);
    }
  }
}
function forwardDebugInfoFromCurrentContext(request, task, thenable) {
  var debugInfo;
  {
    // If this came from Flight, forward any debug info into this new row.
    debugInfo = thenable._debugInfo;
    if (debugInfo) {
      forwardDebugInfo(request, task, debugInfo);
    }
  }
  {
    var sequence = getCurrentAsyncSequence();
    if (sequence !== null) {
      emitAsyncSequence(request, task, sequence, debugInfo, null, null);
    }
  }
}
function forwardDebugInfoFromAbortedTask(request, task) {
  // If a task is aborted, we can still include as much debug info as we can from the
  // value that we have so far.
  var model = task.model;
  if (typeof model !== 'object' || model === null) {
    return;
  }
  var debugInfo;
  {
    // If this came from Flight, forward any debug info into this new row.
    debugInfo = model._debugInfo;
    if (debugInfo) {
      forwardDebugInfo(request, task, debugInfo);
    }
  }
  {
    var thenable = null;
    if (typeof model.then === 'function') {
      thenable = model;
    } else if (model.$$typeof === REACT_LAZY_TYPE) {
      var payload = model._payload;
      if (typeof payload.then === 'function') {
        thenable = payload;
      }
    }
    if (thenable !== null) {
      var sequence = getAsyncSequenceFromPromise();
      if (sequence !== null) {
        var node = sequence;
        while (node.tag === UNRESOLVED_AWAIT_NODE && node.awaited !== null) {
          // See if any of the dependencies are resolved yet.
          node = node.awaited;
        }
        if (node.tag === UNRESOLVED_PROMISE_NODE) {
          // We don't know what Promise will eventually end up resolving this Promise and if it
          // was I/O at all. However, we assume that it was some kind of I/O since it didn't
          // complete in time before aborting.
          // The best we can do is try to emit the stack of where this Promise was created.
          serializeIONode(request, node, null);
          request.pendingChunks++;
          var env = (0, request.environmentName)();
          var asyncInfo = {
            awaited: node,
            // This is deduped by this reference.
            env: env
          };
          // We don't have a start time for this await but in case there was no start time emitted
          // we need to include something. TODO: We should maybe ideally track the time when we
          // called .then() but without updating the task.time field since that's used for the cutoff.
          advanceTaskTime(request, task, task.time);
          emitDebugChunk(request, task.id, asyncInfo);
        } else {
          // We have a resolved Promise. Its debug info can include both awaited data and rejected
          // promises after the abort.
          emitAsyncSequence(request, task, sequence, debugInfo, null, null);
        }
      }
    }
  }
}
function emitTimingChunk(request, id, timestamp) {
  request.pendingChunks++;
  var relativeTimestamp = timestamp - request.timeOrigin;
  var json = '{"time":' + relativeTimestamp + '}';
  if (request.debugDestination !== null) {
    // Outline the actual timing information to the debug channel.
    var outlinedId = request.nextChunkId++;
    var debugRow = outlinedId.toString(16) + ':' + json + '\n';
    request.pendingDebugChunks++;
    request.completedDebugChunks.push(stringToChunk(debugRow));
    var row = serializeRowHeader('D', id) + '"$' + outlinedId.toString(16) + '"\n';
    request.completedRegularChunks.push(stringToChunk(row));
  } else {
    var _row3 = serializeRowHeader('D', id) + json + '\n';
    request.completedRegularChunks.push(stringToChunk(_row3));
  }
}
function advanceTaskTime(request, task, timestamp) {
  // Emits a timing chunk, if the new timestamp is higher than the previous timestamp of this task.
  if (timestamp > task.time) {
    emitTimingChunk(request, task.id, timestamp);
    task.time = timestamp;
  } else if (!task.timed) {
    // If it wasn't timed before, e.g. an outlined object, we need to emit the first timestamp and
    // it is now timed.
    emitTimingChunk(request, task.id, task.time);
  }
  task.timed = true;
}
function markOperationEndTime(request, task, timestamp) {
  // This is like advanceTaskTime() but always emits a timing chunk even if it doesn't advance.
  // This ensures that the end time of the previous entry isn't implied to be the start of the next one.
  if (request.status === ABORTING && timestamp > request.abortTime) {
    // If we're aborting then we don't emit any end times that happened after.
    return;
  }
  if (timestamp > task.time) {
    emitTimingChunk(request, task.id, timestamp);
    task.time = timestamp;
  } else {
    emitTimingChunk(request, task.id, task.time);
  }
}
function emitChunk(request, task, value) {
  var id = task.id;
  // For certain types we have special types, we typically outlined them but
  // we can emit them directly for this row instead of through an indirection.
  if (typeof value === 'string' && byteLengthOfChunk !== null) {
    {
      var tainted = TaintRegistryValues.get(value);
      if (tainted !== undefined) {
        throwTaintViolation(tainted.message);
      }
    }
    emitTextChunk(request, id, value, false);
    return;
  }
  if (value instanceof ArrayBuffer) {
    emitTypedArrayChunk(request, id, 'A', new Uint8Array(value), false);
    return;
  }
  if (value instanceof Int8Array) {
    // char
    emitTypedArrayChunk(request, id, 'O', value, false);
    return;
  }
  if (value instanceof Uint8Array) {
    // unsigned char
    emitTypedArrayChunk(request, id, 'o', value, false);
    return;
  }
  if (value instanceof Uint8ClampedArray) {
    // unsigned clamped char
    emitTypedArrayChunk(request, id, 'U', value, false);
    return;
  }
  if (value instanceof Int16Array) {
    // sort
    emitTypedArrayChunk(request, id, 'S', value, false);
    return;
  }
  if (value instanceof Uint16Array) {
    // unsigned short
    emitTypedArrayChunk(request, id, 's', value, false);
    return;
  }
  if (value instanceof Int32Array) {
    // long
    emitTypedArrayChunk(request, id, 'L', value, false);
    return;
  }
  if (value instanceof Uint32Array) {
    // unsigned long
    emitTypedArrayChunk(request, id, 'l', value, false);
    return;
  }
  if (value instanceof Float32Array) {
    // float
    emitTypedArrayChunk(request, id, 'G', value, false);
    return;
  }
  if (value instanceof Float64Array) {
    // double
    emitTypedArrayChunk(request, id, 'g', value, false);
    return;
  }
  if (value instanceof BigInt64Array) {
    // number
    emitTypedArrayChunk(request, id, 'M', value, false);
    return;
  }
  if (value instanceof BigUint64Array) {
    // unsigned number
    // We use "m" instead of "n" since JSON can start with "null"
    emitTypedArrayChunk(request, id, 'm', value, false);
    return;
  }
  if (value instanceof DataView) {
    emitTypedArrayChunk(request, id, 'V', value, false);
    return;
  }
  // For anything else we need to try to serialize it using JSON.
  // $FlowFixMe[incompatible-type] stringify can return null for undefined but we never do
  var json = stringify(value, task.toJSON);
  emitModelChunk(request, task.id, json);
}
function erroredTask(request, task, error) {
  {
    if (task.timed) {
      markOperationEndTime(request, task, performance.now());
    }
  }
  task.status = ERRORED$1;
  var digest = logRecoverableError(request, error, task);
  emitErrorChunk(request, task.id, digest, error, false, task.debugOwner );
  request.abortableTasks.delete(task);
  callOnAllReadyIfReady(request);
}
var emptyRoot = {};
function retryTask(request, task) {
  if (task.status !== PENDING$1) {
    // We completed this by other means before we had a chance to retry it.
    return;
  }
  var prevCanEmitDebugInfo = canEmitDebugInfo;
  task.status = RENDERING;

  // We stash the outer parent size so we can restore it when we exit.
  var parentSerializedSize = serializedSize;
  // We don't reset the serialized size counter from reentry because that indicates that we
  // are outlining a model and we actually want to include that size into the parent since
  // it will still block the parent row. It only restores to zero at the top of the stack.
  try {
    // Track the root so we know that we have to emit this object even though it
    // already has an ID. This is needed because we might see this object twice
    // in the same toJSON if it is cyclic.
    modelRoot = task.model;
    if (true) {
      // Track that we can emit debug info for the current task.
      canEmitDebugInfo = true;
    }

    // We call the destructive form that mutates this task. That way if something
    // suspends again, we can reuse the same task instead of spawning a new one.
    var resolvedModel = renderModelDestructive(request, task, emptyRoot, '', task.model);
    if (true) {
      // We're now past rendering this task and future renders will spawn new tasks for their
      // debug info.
      canEmitDebugInfo = false;
    }

    // Track the root again for the resolved object.
    modelRoot = resolvedModel;

    // The keyPath resets at any terminal child node.
    task.keyPath = null;
    task.implicitSlot = false;
    if (true) {
      var currentEnv = (0, request.environmentName)();
      if (currentEnv !== task.environmentName) {
        request.pendingChunks++;
        // The environment changed since we last emitted any debug information for this
        // task. We emit an entry that just includes the environment name change.
        emitDebugChunk(request, task.id, {
          env: currentEnv
        });
      }
    }
    // We've finished rendering. Log the end time.
    if (enableProfilerTimer && (enableComponentPerformanceTrack || enableAsyncDebugInfo)) {
      if (task.timed) {
        markOperationEndTime(request, task, performance.now());
      }
    }
    if (typeof resolvedModel === 'object' && resolvedModel !== null) {
      // We're not in a contextual place here so we can refer to this object by this ID for
      // any future references.
      request.writtenObjects.set(resolvedModel, serializeByValueID(task.id));

      // Object might contain unresolved values like additional elements.
      // This is simulating what the JSON loop would do if this was part of it.
      emitChunk(request, task, resolvedModel);
    } else {
      // If the value is a string, it means it's a terminal value and we already escaped it
      // We don't need to escape it again so it's not passed the toJSON replacer.
      // $FlowFixMe[incompatible-type] stringify can return null for undefined but we never do
      var json = stringify(resolvedModel);
      emitModelChunk(request, task.id, json);
    }
    task.status = COMPLETED;
    request.abortableTasks.delete(task);
    callOnAllReadyIfReady(request);
  } catch (thrownValue) {
    if (request.status === ABORTING) {
      request.abortableTasks.delete(task);
      task.status = PENDING$1;
      if (request.type === PRERENDER) {
        // When aborting a prerener with halt semantics we don't emit
        // anything into the slot for a task that aborts, it remains unresolved
        haltTask(task);
        finishHaltedTask(task, request);
      } else {
        // Otherwise we emit an error chunk into the task slot.
        var errorId = request.fatalError;
        abortTask(task);
        finishAbortedTask(task, request, errorId);
      }
      return;
    }
    var x = thrownValue === SuspenseException ?
    // This is a special type of exception used for Suspense. For historical
    // reasons, the rest of the Suspense implementation expects the thrown
    // value to be a thenable, because before `use` existed that was the
    // (unstable) API for suspending. This implementation detail can change
    // later, once we deprecate the old API in favor of `use`.
    getSuspendedThenable() : thrownValue;
    if (typeof x === 'object' && x !== null) {
      // $FlowFixMe[method-unbinding]
      if (typeof x.then === 'function') {
        // Something suspended again, let's pick it back up later.
        task.status = PENDING$1;
        task.thenableState = getThenableStateAfterSuspending();
        var ping = task.ping;
        x.then(ping, ping);
        return;
      }
    }
    erroredTask(request, task, x);
  } finally {
    {
      canEmitDebugInfo = prevCanEmitDebugInfo;
    }
    serializedSize = parentSerializedSize;
  }
}
function tryStreamTask(request, task) {
  // This is used to try to emit something synchronously but if it suspends,
  // we emit a reference to a new outlined task immediately instead.
  var prevCanEmitDebugInfo = canEmitDebugInfo;
  {
    // We can't emit debug into to a specific row of a stream task. Instead we leave
    // it false so that we instead outline the row to get a new canEmitDebugInfo if needed.
    canEmitDebugInfo = false;
  }
  var parentSerializedSize = serializedSize;
  try {
    emitChunk(request, task, task.model);
  } finally {
    serializedSize = parentSerializedSize;
    {
      canEmitDebugInfo = prevCanEmitDebugInfo;
    }
  }
}
function performWork(request) {
  var prevDispatcher = ReactSharedInternalsServer.H;
  ReactSharedInternalsServer.H = HooksDispatcher;
  var prevRequest = currentRequest;
  currentRequest = request;
  prepareToUseHooksForRequest(request);
  try {
    var pingedTasks = request.pingedTasks;
    request.pingedTasks = [];
    for (var i = 0; i < pingedTasks.length; i++) {
      var task = pingedTasks[i];
      retryTask(request, task);
    }
    flushCompletedChunks(request);
  } catch (error) {
    logRecoverableError(request, error, null);
    fatalError(request, error);
  } finally {
    ReactSharedInternalsServer.H = prevDispatcher;
    resetHooksForRequest();
    currentRequest = prevRequest;
  }
}
function abortTask(task, request, errorId) {
  if (task.status !== PENDING$1) {
    // If this is already completed/errored we don't abort it.
    // If currently rendering it will be aborted by the render
    return;
  }
  task.status = ABORTED;
}
function finishAbortedTask(task, request, errorId) {
  if (task.status !== ABORTED) {
    return;
  }
  forwardDebugInfoFromAbortedTask(request, task);
  // Track when we aborted this task as its end time.
  {
    if (task.timed) {
      markOperationEndTime(request, task, request.abortTime);
    }
  }
  // Instead of emitting an error per task.id, we emit a model that only
  // has a single value referencing the error.
  var ref = serializeByValueID(errorId);
  var processedChunk = encodeReferenceChunk(request, task.id, ref);
  request.completedErrorChunks.push(processedChunk);
}
function haltTask(task, request) {
  if (task.status !== PENDING$1) {
    // If this is already completed/errored we don't abort it.
    // If currently rendering it will be aborted by the render
    return;
  }
  task.status = ABORTED;
}
function finishHaltedTask(task, request) {
  if (task.status !== ABORTED) {
    return;
  }
  forwardDebugInfoFromAbortedTask(request, task);
  // We don't actually emit anything for this task id because we are intentionally
  // leaving the reference unfulfilled.
  request.pendingChunks--;
}
function flushCompletedChunks(request) {
  if (request.debugDestination !== null) {
    var debugDestination = request.debugDestination;
    beginWriting();
    try {
      var debugChunks = request.completedDebugChunks;
      var i = 0;
      for (; i < debugChunks.length; i++) {
        request.pendingDebugChunks--;
        var chunk = debugChunks[i];
        writeChunkAndReturn(debugDestination, chunk);
      }
      debugChunks.splice(0, i);
    } finally {
      completeWriting(debugDestination);
    }
  }
  var destination = request.destination;
  if (destination !== null) {
    beginWriting();
    try {
      // We emit module chunks first in the stream so that
      // they can be preloaded as early as possible.
      var importsChunks = request.completedImportChunks;
      var _i = 0;
      for (; _i < importsChunks.length; _i++) {
        request.pendingChunks--;
        var _chunk = importsChunks[_i];
        var keepWriting = writeChunkAndReturn(destination, _chunk);
        if (!keepWriting) {
          request.destination = null;
          _i++;
          break;
        }
      }
      importsChunks.splice(0, _i);

      // Next comes hints.
      var hintChunks = request.completedHintChunks;
      _i = 0;
      for (; _i < hintChunks.length; _i++) {
        var _chunk2 = hintChunks[_i];
        var _keepWriting = writeChunkAndReturn(destination, _chunk2);
        if (!_keepWriting) {
          request.destination = null;
          _i++;
          break;
        }
      }
      hintChunks.splice(0, _i);

      // Debug meta data comes before the model data because it will often end up blocking the model from
      // completing since the JSX will reference the debug data.
      if (true && request.debugDestination === null) {
        var _debugChunks = request.completedDebugChunks;
        _i = 0;
        for (; _i < _debugChunks.length; _i++) {
          request.pendingDebugChunks--;
          var _chunk3 = _debugChunks[_i];
          var _keepWriting2 = writeChunkAndReturn(destination, _chunk3);
          if (!_keepWriting2) {
            request.destination = null;
            _i++;
            break;
          }
        }
        _debugChunks.splice(0, _i);
      }

      // Next comes model data.
      var regularChunks = request.completedRegularChunks;
      _i = 0;
      for (; _i < regularChunks.length; _i++) {
        request.pendingChunks--;
        var _chunk4 = regularChunks[_i];
        var _keepWriting3 = writeChunkAndReturn(destination, _chunk4);
        if (!_keepWriting3) {
          request.destination = null;
          _i++;
          break;
        }
      }
      regularChunks.splice(0, _i);

      // Finally, errors are sent. The idea is that it's ok to delay
      // any error messages and prioritize display of other parts of
      // the page.
      var errorChunks = request.completedErrorChunks;
      _i = 0;
      for (; _i < errorChunks.length; _i++) {
        request.pendingChunks--;
        var _chunk5 = errorChunks[_i];
        var _keepWriting4 = writeChunkAndReturn(destination, _chunk5);
        if (!_keepWriting4) {
          request.destination = null;
          _i++;
          break;
        }
      }
      errorChunks.splice(0, _i);
    } finally {
      request.flushScheduled = false;
      completeWriting(destination);
    }
  }
  if (request.pendingChunks === 0) {
    {
      var _debugDestination = request.debugDestination;
      if (request.pendingDebugChunks === 0) {
        // Continue fully closing both streams.
        if (_debugDestination !== null) {
          close$1(_debugDestination);
          request.debugDestination = null;
        }
      } else {
        // We still have debug information to write.
        if (_debugDestination === null) {
          // We'll continue writing on this stream so nothing closes.
          return;
        } else {
          // We'll close the main stream but keep the debug stream open.
          // TODO: If this destination is not currently flowing we'll not close it when it resumes flowing.
          // We should keep a separate status for this.
          if (request.destination !== null) {
            request.status = CLOSED;
            close$1(request.destination);
            request.destination = null;
          }
          return;
        }
      }
    }
    // We're done.
    {
      cleanupTaintQueue(request);
    }
    if (request.status < ABORTING) {
      var abortReason = new Error('This render completed successfully. All cacheSignals are now aborted to allow clean up of any unused resources.');
      request.cacheController.abort(abortReason);
    }
    if (request.destination !== null) {
      request.status = CLOSED;
      close$1(request.destination);
      request.destination = null;
    }
    if (request.debugDestination !== null) {
      close$1(request.debugDestination);
      request.debugDestination = null;
    }
  }
}
function startWork(request) {
  request.flushScheduled = request.destination !== null;
  if (supportsRequestStorage) {
    scheduleMicrotask(function () {
      requestStorage.run(request, performWork, request);
    });
  } else {
    scheduleMicrotask(function () {
      return performWork(request);
    });
  }
  scheduleWork(function () {
    if (request.status === OPENING) {
      request.status = OPEN;
    }
  });
}
function enqueueFlush(request) {
  if (request.flushScheduled === false &&
  // If there are pinged tasks we are going to flush anyway after work completes
  request.pingedTasks.length === 0 && (
  // If there is no destination there is nothing we can flush to. A flush will
  // happen when we start flowing again
  request.destination !== null || request.debugDestination !== null)) {
    request.flushScheduled = true;
    // Unlike startWork and pingTask we intetionally use scheduleWork
    // here even during prerenders to allow as much batching as possible
    scheduleWork(function () {
      request.flushScheduled = false;
      flushCompletedChunks(request);
    });
  }
}
function callOnAllReadyIfReady(request) {
  if (request.abortableTasks.size === 0) {
    var onAllReady = request.onAllReady;
    onAllReady();
  }
}
function startFlowing(request, destination) {
  if (request.status === CLOSING) {
    request.status = CLOSED;
    closeWithError(destination, request.fatalError);
    return;
  }
  if (request.status === CLOSED) {
    return;
  }
  if (request.destination !== null) {
    // We're already flowing.
    return;
  }
  request.destination = destination;
  try {
    flushCompletedChunks(request);
  } catch (error) {
    logRecoverableError(request, error, null);
    fatalError(request, error);
  }
}
function startFlowingDebug(request, debugDestination) {
  if (request.status === CLOSING) {
    request.status = CLOSED;
    closeWithError(debugDestination, request.fatalError);
    return;
  }
  if (request.status === CLOSED) {
    return;
  }
  if (request.debugDestination !== null) {
    // We're already flowing.
    return;
  }
  request.debugDestination = debugDestination;
  try {
    flushCompletedChunks(request);
  } catch (error) {
    logRecoverableError(request, error, null);
    fatalError(request, error);
  }
}
function stopFlowing(request) {
  request.destination = null;
}
function finishHalt(request, abortedTasks) {
  try {
    abortedTasks.forEach(function (task) {
      return finishHaltedTask(task, request);
    });
    var onAllReady = request.onAllReady;
    onAllReady();
    flushCompletedChunks(request);
  } catch (error) {
    logRecoverableError(request, error, null);
    fatalError(request, error);
  }
}
function finishAbort(request, abortedTasks, errorId) {
  try {
    abortedTasks.forEach(function (task) {
      return finishAbortedTask(task, request, errorId);
    });
    var onAllReady = request.onAllReady;
    onAllReady();
    flushCompletedChunks(request);
  } catch (error) {
    logRecoverableError(request, error, null);
    fatalError(request, error);
  }
}
function abort(request, reason) {
  // We define any status below OPEN as OPEN equivalent
  if (request.status > OPEN) {
    return;
  }
  try {
    request.status = ABORTING;
    if (enableProfilerTimer && (enableComponentPerformanceTrack || enableAsyncDebugInfo)) {
      request.abortTime = performance.now();
    }
    request.cacheController.abort(reason);
    var abortableTasks = request.abortableTasks;
    if (abortableTasks.size > 0) {
      if (enableHalt && request.type === PRERENDER) {
        // When prerendering with halt semantics we simply halt the task
        // and leave the reference unfulfilled.
        abortableTasks.forEach(function (task) {
          return haltTask(task, request);
        });
        scheduleWork(function () {
          return finishHalt(request, abortableTasks);
        });
      } else {
        var error = reason === undefined ? new Error('The render was aborted by the server without a reason.') : typeof reason === 'object' && reason !== null && typeof reason.then === 'function' ? new Error('The render was aborted by the server with a promise.') : reason;
        var digest = logRecoverableError(request, error, null);
        // When rendering we produce a shared error chunk and then
        // fulfill each task with a reference to that chunk.
        var errorId = request.nextChunkId++;
        request.fatalError = errorId;
        request.pendingChunks++;
        emitErrorChunk(request, errorId, digest, error, false, null);
        abortableTasks.forEach(function (task) {
          return abortTask(task, request, errorId);
        });
        scheduleWork(function () {
          return finishAbort(request, abortableTasks, errorId);
        });
      }
    } else {
      var onAllReady = request.onAllReady;
      onAllReady();
      flushCompletedChunks(request);
    }
  } catch (error) {
    logRecoverableError(request, error, null);
    fatalError(request, error);
  }
}
function fromHex(str) {
  return parseInt(str, 16);
}
function resolveDebugMessage(request, message) {
  var deferredDebugObjects = request.deferredDebugObjects;
  if (deferredDebugObjects === null) {
    throw new Error("resolveDebugMessage/closeDebugChannel should not be called for a Request that wasn't kept alive. This is a bug in React.");
  }
  if (message === '') {
    closeDebugChannel(request);
    return;
  }
  // This function lets the client ask for more data lazily through the debug channel.
  var command = message.charCodeAt(0);
  var ids = message.slice(2).split(',').map(fromHex);
  switch (command) {
    case 82 /* "R" */:
      // Release IDs
      for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        var retainedValue = deferredDebugObjects.retained.get(id);
        if (retainedValue !== undefined) {
          // We're no longer blocked on this. We won't emit it.
          request.pendingDebugChunks--;
          deferredDebugObjects.retained.delete(id);
          deferredDebugObjects.existing.delete(retainedValue);
          enqueueFlush(request);
        }
      }
      break;
    case 81 /* "Q" */:
      // Query IDs
      for (var _i2 = 0; _i2 < ids.length; _i2++) {
        var _id7 = ids[_i2];
        var _retainedValue = deferredDebugObjects.retained.get(_id7);
        if (_retainedValue !== undefined) {
          // If we still have this object, and haven't emitted it before, emit it on the stream.
          var counter = {
            objectLimit: 10
          };
          deferredDebugObjects.retained.delete(_id7);
          deferredDebugObjects.existing.delete(_retainedValue);
          emitOutlinedDebugModelChunk(request, _id7, counter, _retainedValue);
          enqueueFlush(request);
        }
      }
      break;
    case 80 /* "P" */:
      // Query Promise IDs
      for (var _i3 = 0; _i3 < ids.length; _i3++) {
        var _id8 = ids[_i3];
        var _retainedValue2 = deferredDebugObjects.retained.get(_id8);
        if (_retainedValue2 !== undefined) {
          // If we still have this Promise, and haven't emitted it before, wait for it
          // and then emit it on the stream.
          var _counter = {
            objectLimit: 10
          };
          deferredDebugObjects.retained.delete(_id8);
          emitRequestedDebugThenable(request, _id8, _counter, _retainedValue2);
        }
      }
      break;
    default:
      throw new Error('Unknown command. The debugChannel was not wired up properly.');
  }
}
function closeDebugChannel(request) {
  // This clears all remaining deferred objects, potentially resulting in the completion of the Request.
  var deferredDebugObjects = request.deferredDebugObjects;
  if (deferredDebugObjects === null) {
    throw new Error("resolveDebugMessage/closeDebugChannel should not be called for a Request that wasn't kept alive. This is a bug in React.");
  }
  deferredDebugObjects.retained.forEach(function (value, id) {
    request.pendingDebugChunks--;
    deferredDebugObjects.retained.delete(id);
    deferredDebugObjects.existing.delete(value);
  });
  enqueueFlush(request);
}

function createStringDecoder() {
  return new TextDecoder();
}
var decoderOptions = {
  stream: true
};
function readPartialStringChunk(decoder, buffer) {
  return decoder.decode(buffer, decoderOptions);
}
function readFinalStringChunk(decoder, buffer) {
  return decoder.decode(buffer);
}

// This is the parsed shape of the wire format which is why it is
// condensed to only the essentialy information

var ID = 0;
var CHUNKS = 1;
var NAME = 2;
// export const ASYNC = 3;

// This logic is correct because currently only include the 4th tuple member
// when the module is async. If that changes we will need to actually assert
// the value is true. We don't index into the 4th slot because flow does not
// like the potential out of bounds access
function isAsyncImport(metadata) {
  return metadata.length === 4;
}

function resolveServerReference(bundlerConfig, id) {
  var name = '';
  var resolvedModuleData = bundlerConfig[id];
  if (resolvedModuleData) {
    // The potentially aliased name.
    name = resolvedModuleData.name;
  } else {
    // We didn't find this specific export name but we might have the * export
    // which contains this name as well.
    // TODO: It's unfortunate that we now have to parse this string. We should
    // probably go back to encoding path and name separately on the client reference.
    var idx = id.lastIndexOf('#');
    if (idx !== -1) {
      name = id.slice(idx + 1);
      resolvedModuleData = bundlerConfig[id.slice(0, idx)];
    }
    if (!resolvedModuleData) {
      throw new Error('Could not find the module "' + id + '" in the React Server Manifest. ' + 'This is probably a bug in the React Server Components bundler.');
    }
  }
  if (resolvedModuleData.async) {
    // If the module is marked as async in a Client Reference, we don't actually care.
    // What matters is whether the consumer wants to unwrap it or not.
    // For Server References, it is different because the consumer is completely internal
    // to the bundler. So instead of passing it to each reference we can mark it in the
    // manifest.
    return [resolvedModuleData.id, resolvedModuleData.chunks, name, 1 /* async */];
  }
  return [resolvedModuleData.id, resolvedModuleData.chunks, name];
}
function requireAsyncModule(id) {
  // We've already loaded all the chunks. We can require the module.
  var promise = globalThis.__next_require__(id);
  if (typeof promise.then !== 'function') {
    // This wasn't a promise after all.
    return null;
  } else if (promise.status === 'fulfilled') {
    // This module was already resolved earlier.
    return null;
  } else {
    // Instrument the Promise to stash the result.
    promise.then(function (value) {
      var fulfilledThenable = promise;
      fulfilledThenable.status = 'fulfilled';
      fulfilledThenable.value = value;
    }, function (reason) {
      var rejectedThenable = promise;
      rejectedThenable.status = 'rejected';
      rejectedThenable.reason = reason;
    });
    return promise;
  }
}

// Turbopack will return cached promises for the same chunk.
// We still want to keep track of which chunks we have already instrumented
// and which chunks have already been loaded until Turbopack returns instrumented
// thenables directly.
var instrumentedChunks = new WeakSet();
var loadedChunks = new WeakSet();
function ignoreReject() {
  // We rely on rejected promises to be handled by another listener.
}
// Start preloading the modules since we might need them soon.
// This function doesn't suspend.
function preloadModule(metadata) {
  var chunks = metadata[CHUNKS];
  var promises = [];
  for (var i = 0; i < chunks.length; i++) {
    var chunkFilename = chunks[i];
    var thenable = loadChunk(chunkFilename);
    if (!loadedChunks.has(thenable)) {
      promises.push(thenable);
    }
    if (!instrumentedChunks.has(thenable)) {
      // $FlowFixMe[method-unbinding]
      var resolve = loadedChunks.add.bind(loadedChunks, thenable);
      thenable.then(resolve, ignoreReject);
      instrumentedChunks.add(thenable);
    }
  }
  if (isAsyncImport(metadata)) {
    if (promises.length === 0) {
      return requireAsyncModule(metadata[ID]);
    } else {
      return Promise.all(promises).then(function () {
        return requireAsyncModule(metadata[ID]);
      });
    }
  } else if (promises.length > 0) {
    return Promise.all(promises);
  } else {
    return null;
  }
}

// Actually require the module or suspend if it's not yet ready.
// Increase priority if necessary.
function requireModule(metadata) {
  var moduleExports = globalThis.__next_require__(metadata[ID]);
  if (isAsyncImport(metadata)) {
    if (typeof moduleExports.then !== 'function') ; else if (moduleExports.status === 'fulfilled') {
      // This Promise should've been instrumented by preloadModule.
      moduleExports = moduleExports.value;
    } else {
      throw moduleExports.reason;
    }
  }
  if (metadata[NAME] === '*') {
    // This is a placeholder value that represents that the caller imported this
    // as a CommonJS module as is.
    return moduleExports;
  }
  if (metadata[NAME] === '') {
    // This is a placeholder value that represents that the caller accessed the
    // default property of this if it was an ESM interop module.
    return moduleExports.__esModule ? moduleExports.default : moduleExports;
  }
  if (hasOwnProperty.call(moduleExports, metadata[NAME])) {
    return moduleExports[metadata[NAME]];
  }
  return undefined;
}

function loadChunk(filename) {
  return globalThis.__next_chunk_load__(filename);
}

var PENDING = 'pending';
var BLOCKED = 'blocked';
var RESOLVED_MODEL = 'resolved_model';
var INITIALIZED = 'fulfilled';
var ERRORED = 'rejected';

// Fake symbol type.
var RESPONSE_SYMBOL = Symbol();

// $FlowFixMe[missing-this-annot]
function ReactPromise(status, value, reason) {
  this.status = status;
  this.value = value;
  this.reason = reason;
}
// We subclass Promise.prototype so that we get other methods like .catch
ReactPromise.prototype = Object.create(Promise.prototype);
// TODO: This doesn't return a new Promise chain unlike the real .then
ReactPromise.prototype.then = function (resolve, reject) {
  var chunk = this;
  // If we have resolved content, we try to initialize it first which
  // might put us back into one of the other states.
  switch (chunk.status) {
    case RESOLVED_MODEL:
      initializeModelChunk(chunk);
      break;
  }
  // The status might have changed after initialization.
  switch (chunk.status) {
    case INITIALIZED:
      if (typeof resolve === 'function') {
        var inspectedValue = chunk.value;
        // Recursively check if the value is itself a ReactPromise and if so if it points
        // back to itself. This helps catch recursive thenables early error.
        var cycleProtection = 0;
        var visited = new Set();
        while (inspectedValue instanceof ReactPromise) {
          cycleProtection++;
          if (inspectedValue === chunk || visited.has(inspectedValue) || cycleProtection > 1000) {
            if (typeof reject === 'function') {
              reject(new Error('Cannot have cyclic thenables.'));
            }
            return;
          }
          visited.add(inspectedValue);
          if (inspectedValue.status === INITIALIZED) {
            inspectedValue = inspectedValue.value;
          } else {
            // If this is lazily resolved, pending or blocked, it'll eventually become
            // initialized and break the loop. Rejected also breaks it.
            break;
          }
        }
        resolve(chunk.value);
      }
      break;
    case PENDING:
    case BLOCKED:
      if (typeof resolve === 'function') {
        if (chunk.value === null) {
          chunk.value = [];
        }
        chunk.value.push(resolve);
      }
      if (typeof reject === 'function') {
        if (chunk.reason === null) {
          chunk.reason = [];
        }
        chunk.reason.push(reject);
      }
      break;
    default:
      if (typeof reject === 'function') {
        reject(chunk.reason);
      }
      break;
  }
};
var ObjectPrototype = Object.prototype;
var ArrayPrototype = Array.prototype;
function getRoot(response) {
  var chunk = getChunk(response, 0);
  return chunk;
}
function createPendingChunk(response) {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(PENDING, null, null);
}
function wakeChunk(response, listeners, value) {
  for (var i = 0; i < listeners.length; i++) {
    var listener = listeners[i];
    if (typeof listener === 'function') {
      listener(value);
    } else {
      fulfillReference(response, listener, value);
    }
  }
}
function rejectChunk(response, listeners, error) {
  for (var i = 0; i < listeners.length; i++) {
    var listener = listeners[i];
    if (typeof listener === 'function') {
      listener(error);
    } else {
      rejectReference(response, listener.handler, error);
    }
  }
}
function resolveBlockedCycle(resolvedChunk, reference) {
  var referencedChunk = reference.handler.chunk;
  if (referencedChunk === null) {
    return null;
  }
  if (referencedChunk === resolvedChunk) {
    // We found the cycle. We can resolve the blocked cycle now.
    return reference.handler;
  }
  var resolveListeners = referencedChunk.value;
  if (resolveListeners !== null) {
    for (var i = 0; i < resolveListeners.length; i++) {
      var listener = resolveListeners[i];
      if (typeof listener !== 'function') {
        var foundHandler = resolveBlockedCycle(resolvedChunk, listener);
        if (foundHandler !== null) {
          return foundHandler;
        }
      }
    }
  }
  return null;
}
function wakeChunkIfInitialized(response, chunk, resolveListeners, rejectListeners) {
  switch (chunk.status) {
    case INITIALIZED:
      wakeChunk(response, resolveListeners, chunk.value);
      break;
    case BLOCKED:
      // It is possible that we're blocked on our own chunk if it's a cycle.
      // Before adding back the listeners to the chunk, let's check if it would
      // result in a cycle.
      for (var i = 0; i < resolveListeners.length; i++) {
        var listener = resolveListeners[i];
        if (typeof listener !== 'function') {
          var reference = listener;
          var cyclicHandler = resolveBlockedCycle(chunk, reference);
          if (cyclicHandler !== null) {
            // This reference points back to this chunk. We can resolve the cycle by
            // using the value from that handler.
            fulfillReference(response, reference, cyclicHandler.value);
            resolveListeners.splice(i, 1);
            i--;
            if (rejectListeners !== null) {
              var rejectionIdx = rejectListeners.indexOf(reference);
              if (rejectionIdx !== -1) {
                rejectListeners.splice(rejectionIdx, 1);
              }
            }
            // The status might have changed after fulfilling the reference.
            switch (chunk.status) {
              case INITIALIZED:
                var initializedChunk = chunk;
                wakeChunk(response, resolveListeners, initializedChunk.value);
                return;
              case ERRORED:
                if (rejectListeners !== null) {
                  rejectChunk(response, rejectListeners, chunk.reason);
                }
                return;
            }
          }
        }
      }
    // Fallthrough
    case PENDING:
      if (chunk.value) {
        for (var _i = 0; _i < resolveListeners.length; _i++) {
          chunk.value.push(resolveListeners[_i]);
        }
      } else {
        chunk.value = resolveListeners;
      }
      if (chunk.reason) {
        if (rejectListeners) {
          for (var _i2 = 0; _i2 < rejectListeners.length; _i2++) {
            chunk.reason.push(rejectListeners[_i2]);
          }
        }
      } else {
        chunk.reason = rejectListeners;
      }
      break;
    case ERRORED:
      if (rejectListeners) {
        wakeChunk(response, rejectListeners, chunk.reason);
      }
      break;
  }
}
function triggerErrorOnChunk(response, chunk, error) {
  if (chunk.status !== PENDING && chunk.status !== BLOCKED) {
    // If we get more data to an already resolved ID, we assume that it's
    // a stream chunk since any other row shouldn't have more than one entry.
    var streamChunk = chunk;
    var controller = streamChunk.reason;
    // $FlowFixMe[incompatible-call]: The error method should accept mixed.
    controller.error(error);
    return;
  }
  var listeners = chunk.reason;
  var erroredChunk = chunk;
  erroredChunk.status = ERRORED;
  erroredChunk.reason = error;
  if (listeners !== null) {
    rejectChunk(response, listeners, error);
  }
}
function createResolvedModelChunk(response, value, id) {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(RESOLVED_MODEL, value, _defineProperty({
    id: id
  }, RESPONSE_SYMBOL, response));
}
function createErroredChunk(response, reason) {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(ERRORED, null, reason);
}
function resolveModelChunk(response, chunk, value, id) {
  if (chunk.status !== PENDING) {
    // If we get more data to an already resolved ID, we assume that it's
    // a stream chunk since any other row shouldn't have more than one entry.
    var streamChunk = chunk;
    var controller = streamChunk.reason;
    if (value[0] === 'C') {
      controller.close(value === 'C' ? '"$undefined"' : value.slice(1));
    } else {
      controller.enqueueModel(value);
    }
    return;
  }
  var resolveListeners = chunk.value;
  var rejectListeners = chunk.reason;
  var resolvedChunk = chunk;
  resolvedChunk.status = RESOLVED_MODEL;
  resolvedChunk.value = value;
  resolvedChunk.reason = _defineProperty({
    id: id
  }, RESPONSE_SYMBOL, response);
  if (resolveListeners !== null) {
    // This is unfortunate that we're reading this eagerly if
    // we already have listeners attached since they might no
    // longer be rendered or might not be the highest pri.
    initializeModelChunk(resolvedChunk);
    // The status might have changed after initialization.
    wakeChunkIfInitialized(response, chunk, resolveListeners, rejectListeners);
  }
}
function createInitializedStreamChunk(response, value, controller) {
  // We use the reason field to stash the controller since we already have that
  // field. It's a bit of a hack but efficient.
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(INITIALIZED, value, controller);
}
function createResolvedIteratorResultChunk(response, value, done) {
  // To reuse code as much code as possible we add the wrapper element as part of the JSON.
  var iteratorResultJSON = (done ? '{"done":true,"value":' : '{"done":false,"value":') + value + '}';
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(RESOLVED_MODEL, iteratorResultJSON, _defineProperty({
    id: -1
  }, RESPONSE_SYMBOL, response));
}
function resolveIteratorResultChunk(response, chunk, value, done) {
  // To reuse code as much code as possible we add the wrapper element as part of the JSON.
  var iteratorResultJSON = (done ? '{"done":true,"value":' : '{"done":false,"value":') + value + '}';
  resolveModelChunk(response, chunk, iteratorResultJSON, -1);
}
function loadServerReference$1(response, metaData, parentObject, key) {
  var id = metaData.id;
  if (typeof id !== 'string') {
    return null;
  }
  if (key === 'then') {
    // This should never happen because we always serialize objects with then-functions
    // as "thenable" which reduces to ReactPromise with no other fields.
    return null;
  }
  var serverReference = resolveServerReference(response._bundlerConfig, id);
  // We expect most servers to not really need this because you'd just have all
  // the relevant modules already loaded but it allows for lazy loading of code
  // if needed.
  var bound = metaData.bound;
  var promise = preloadModule(serverReference);
  if (!promise) {
    if (bound instanceof ReactPromise) {
      promise = Promise.resolve(bound);
    } else {
      var resolvedValue = requireModule(serverReference);
      return resolvedValue;
    }
  } else if (bound instanceof ReactPromise) {
    promise = Promise.all([promise, bound]);
  }
  var handler;
  if (initializingHandler) {
    handler = initializingHandler;
    handler.deps++;
  } else {
    handler = initializingHandler = {
      chunk: null,
      value: null,
      reason: null,
      deps: 1,
      errored: false
    };
  }
  function fulfill() {
    var resolvedValue = requireModule(serverReference);
    if (metaData.bound) {
      // This promise is coming from us and should have initilialized by now.
      var promiseValue = metaData.bound.value;
      var boundArgs = Array.isArray(promiseValue) ? promiseValue.slice(0) : [];
      boundArgs.unshift(null); // this
      resolvedValue = resolvedValue.bind.apply(resolvedValue, boundArgs);
    }
    parentObject[key] = resolvedValue;

    // If this is the root object for a model reference, where `handler.value`
    // is a stale `null`, the resolved value can be used directly.
    if (key === '' && handler.value === null) {
      handler.value = resolvedValue;
    }
    handler.deps--;
    if (handler.deps === 0) {
      var chunk = handler.chunk;
      if (chunk === null || chunk.status !== BLOCKED) {
        return;
      }
      var resolveListeners = chunk.value;
      var initializedChunk = chunk;
      initializedChunk.status = INITIALIZED;
      initializedChunk.value = handler.value;
      initializedChunk.reason = null;
      if (resolveListeners !== null) {
        wakeChunk(response, resolveListeners, handler.value);
      }
    }
  }
  function reject(error) {
    if (handler.errored) {
      // We've already errored. We could instead build up an AggregateError
      // but if there are multiple errors we just take the first one like
      // Promise.all.
      return;
    }
    handler.errored = true;
    handler.value = null;
    handler.reason = error;
    var chunk = handler.chunk;
    if (chunk === null || chunk.status !== BLOCKED) {
      return;
    }
    triggerErrorOnChunk(response, chunk, error);
  }
  promise.then(fulfill, reject);

  // Return a place holder value for now.
  return null;
}
function reviveModel(response, parentObj, parentKey, value, reference) {
  if (typeof value === 'string') {
    // We can't use .bind here because we need the "this" value.
    return parseModelString(response, parentObj, parentKey, value, reference);
  }
  if (typeof value === 'object' && value !== null) {
    if (reference !== undefined && response._temporaryReferences !== undefined) {
      // Store this object's reference in case it's returned later.
      registerTemporaryReference(response._temporaryReferences, value, reference);
    }
    if (Array.isArray(value)) {
      for (var i = 0; i < value.length; i++) {
        var childRef = reference !== undefined ? reference + ':' + i : undefined;
        // $FlowFixMe[cannot-write]
        value[i] = reviveModel(response, value, '' + i, value[i], childRef);
      }
    } else {
      for (var key in value) {
        if (hasOwnProperty.call(value, key)) {
          var _childRef = reference !== undefined && key.indexOf(':') === -1 ? reference + ':' + key : undefined;
          var newValue = reviveModel(response, value, key, value[key], _childRef);
          if (newValue !== undefined || key === '__proto__') {
            // $FlowFixMe[cannot-write]
            value[key] = newValue;
          } else {
            // $FlowFixMe[cannot-write]
            delete value[key];
          }
        }
      }
    }
  }
  return value;
}
var initializingHandler = null;
function initializeModelChunk(chunk) {
  var prevHandler = initializingHandler;
  initializingHandler = null;
  var _chunk$reason = chunk.reason,
    response = _chunk$reason[RESPONSE_SYMBOL],
    id = _chunk$reason.id;
  var rootReference = id === -1 ? undefined : id.toString(16);
  var resolvedModel = chunk.value;

  // We go to the BLOCKED state until we've fully resolved this.
  // We do this before parsing in case we try to initialize the same chunk
  // while parsing the model. Such as in a cyclic reference.
  var cyclicChunk = chunk;
  cyclicChunk.status = BLOCKED;
  cyclicChunk.value = null;
  cyclicChunk.reason = null;
  try {
    var rawModel = JSON.parse(resolvedModel);
    var value = reviveModel(response, {
      '': rawModel
    }, '', rawModel, rootReference);

    // Invoke any listeners added while resolving this model. I.e. cyclic
    // references. This may or may not fully resolve the model depending on
    // if they were blocked.
    var resolveListeners = cyclicChunk.value;
    if (resolveListeners !== null) {
      cyclicChunk.value = null;
      cyclicChunk.reason = null;
      for (var i = 0; i < resolveListeners.length; i++) {
        var listener = resolveListeners[i];
        if (typeof listener === 'function') {
          listener(value);
        } else {
          fulfillReference(response, listener, value);
        }
      }
    }
    if (initializingHandler !== null) {
      if (initializingHandler.errored) {
        throw initializingHandler.reason;
      }
      if (initializingHandler.deps > 0) {
        // We discovered new dependencies on modules that are not yet resolved.
        // We have to keep the BLOCKED state until they're resolved.
        initializingHandler.value = value;
        initializingHandler.chunk = cyclicChunk;
        return;
      }
    }
    var initializedChunk = chunk;
    initializedChunk.status = INITIALIZED;
    initializedChunk.value = value;
    initializedChunk.reason = null;
  } catch (error) {
    var erroredChunk = chunk;
    erroredChunk.status = ERRORED;
    erroredChunk.reason = error;
  } finally {
    initializingHandler = prevHandler;
  }
}

// Report that any missing chunks in the model is now going to throw this
// error upon read. Also notify any pending promises.
function reportGlobalError(response, error) {
  response._closed = true;
  response._closedReason = error;
  response._chunks.forEach(function (chunk) {
    // If this chunk was already resolved or errored, it won't
    // trigger an error but if it wasn't then we need to
    // because we won't be getting any new data to resolve it.
    if (chunk.status === PENDING) {
      triggerErrorOnChunk(response, chunk, error);
    } else if (chunk.status === INITIALIZED && chunk.reason !== null) {
      chunk.reason.error(error);
    }
  });
}
function getChunk(response, id) {
  var chunks = response._chunks;
  var chunk = chunks.get(id);
  if (!chunk) {
    var prefix = response._prefix;
    var key = prefix + id;
    // Check if we have this field in the backing store already.
    var backingEntry = response._formData.get(key);
    if (typeof backingEntry === 'string') {
      chunk = createResolvedModelChunk(response, backingEntry, id);
    } else if (response._closed) {
      // We have already errored the response and we're not going to get
      // anything more streaming in so this will immediately error.
      chunk = createErroredChunk(response, response._closedReason);
    } else {
      // We're still waiting on this entry to stream in.
      chunk = createPendingChunk();
    }
    chunks.set(id, chunk);
  }
  return chunk;
}
function fulfillReference(response, reference, value) {
  var handler = reference.handler,
    parentObject = reference.parentObject,
    key = reference.key,
    map = reference.map,
    path = reference.path;
  try {
    for (var i = 1; i < path.length; i++) {
      // The server doesn't have any lazy references so we don't expect to go through a Promise.
      var name = path[i];
      if (typeof value === 'object' && value !== null && (getPrototypeOf(value) === ObjectPrototype || getPrototypeOf(value) === ArrayPrototype) && hasOwnProperty.call(value, name)) {
        value = value[name];
      } else {
        throw new Error('Invalid reference.');
      }
    }
    var mappedValue = map(response, value, parentObject, key);
    parentObject[key] = mappedValue;

    // If this is the root object for a model reference, where `handler.value`
    // is a stale `null`, the resolved value can be used directly.
    if (key === '' && handler.value === null) {
      handler.value = mappedValue;
    }
  } catch (error) {
    rejectReference(response, reference.handler, error);
    return;
  }

  // There are no Elements or Debug Info to transfer here.

  handler.deps--;
  if (handler.deps === 0) {
    var chunk = handler.chunk;
    if (chunk === null || chunk.status !== BLOCKED) {
      return;
    }
    var resolveListeners = chunk.value;
    var initializedChunk = chunk;
    initializedChunk.status = INITIALIZED;
    initializedChunk.value = handler.value;
    initializedChunk.reason = handler.reason; // Used by streaming chunks
    if (resolveListeners !== null) {
      wakeChunk(response, resolveListeners, handler.value);
    }
  }
}
function rejectReference(response, handler, error) {
  if (handler.errored) {
    // We've already errored. We could instead build up an AggregateError
    // but if there are multiple errors we just take the first one like
    // Promise.all.
    return;
  }
  handler.errored = true;
  handler.value = null;
  handler.reason = error;
  var chunk = handler.chunk;
  if (chunk === null || chunk.status !== BLOCKED) {
    return;
  }
  // There's no debug info to forward in this direction.
  triggerErrorOnChunk(response, chunk, error);
}
function waitForReference(referencedChunk, parentObject, key, response, map, path) {
  var handler;
  if (initializingHandler) {
    handler = initializingHandler;
    handler.deps++;
  } else {
    handler = initializingHandler = {
      chunk: null,
      value: null,
      reason: null,
      deps: 1,
      errored: false
    };
  }
  var reference = {
    handler: handler,
    parentObject: parentObject,
    key: key,
    map: map,
    path: path
  };

  // Add "listener".
  if (referencedChunk.value === null) {
    referencedChunk.value = [reference];
  } else {
    referencedChunk.value.push(reference);
  }
  if (referencedChunk.reason === null) {
    referencedChunk.reason = [reference];
  } else {
    referencedChunk.reason.push(reference);
  }

  // Return a place holder value for now.
  return null;
}
function getOutlinedModel(response, reference, parentObject, key, map) {
  var path = reference.split(':');
  var id = parseInt(path[0], 16);
  var chunk = getChunk(response, id);
  switch (chunk.status) {
    case RESOLVED_MODEL:
      initializeModelChunk(chunk);
      break;
  }
  // The status might have changed after initialization.
  switch (chunk.status) {
    case INITIALIZED:
      var value = chunk.value;
      for (var i = 1; i < path.length; i++) {
        var name = path[i];
        if (typeof value === 'object' && value !== null && (getPrototypeOf(value) === ObjectPrototype || getPrototypeOf(value) === ArrayPrototype) && hasOwnProperty.call(value, name)) {
          value = value[name];
        } else {
          throw new Error('Invalid reference.');
        }
      }
      var chunkValue = map(response, value, parentObject, key);
      // There's no Element nor Debug Info in the ReplyServer so we don't have to check those here.
      return chunkValue;
    case PENDING:
    case BLOCKED:
      return waitForReference(chunk, parentObject, key, response, map, path);
    default:
      // This is an error. Instead of erroring directly, we're going to encode this on
      // an initialization handler.
      if (initializingHandler) {
        initializingHandler.errored = true;
        initializingHandler.value = null;
        initializingHandler.reason = chunk.reason;
      } else {
        initializingHandler = {
          chunk: null,
          value: null,
          reason: chunk.reason,
          deps: 0,
          errored: true
        };
      }
      // Placeholder
      return null;
  }
}
function createMap(response, model) {
  return new Map(model);
}
function createSet(response, model) {
  return new Set(model);
}
function extractIterator(response, model) {
  // $FlowFixMe[incompatible-use]: This uses raw Symbols because we're extracting from a native array.
  return model[Symbol.iterator]();
}
function createModel(response, model, parentObject, key) {
  if (key === 'then' && typeof model === 'function') {
    // This should never happen because we always serialize objects with then-functions
    // as "thenable" which reduces to ReactPromise with no other fields.
    return null;
  }
  return model;
}
function parseTypedArray(response, reference, constructor, bytesPerElement, parentObject, parentKey) {
  var id = parseInt(reference.slice(2), 16);
  var prefix = response._prefix;
  var key = prefix + id;
  var chunks = response._chunks;
  if (chunks.has(id)) {
    throw new Error('Already initialized typed array.');
  }

  // We should have this backingEntry in the store already because we emitted
  // it before referencing it. It should be a Blob.
  // TODO: Use getOutlinedModel to allow us to emit the Blob later. We should be able to do that now.
  var backingEntry = response._formData.get(key);
  var promise = backingEntry.arrayBuffer();

  // Since loading the buffer is an async operation we'll be blocking the parent
  // chunk.

  var handler;
  if (initializingHandler) {
    handler = initializingHandler;
    handler.deps++;
  } else {
    handler = initializingHandler = {
      chunk: null,
      value: null,
      reason: null,
      deps: 1,
      errored: false
    };
  }
  function fulfill(buffer) {
    var resolvedValue = constructor === ArrayBuffer ? buffer : new constructor(buffer);
    parentObject[parentKey] = resolvedValue;

    // If this is the root object for a model reference, where `handler.value`
    // is a stale `null`, the resolved value can be used directly.
    if (parentKey === '' && handler.value === null) {
      handler.value = resolvedValue;
    }
    handler.deps--;
    if (handler.deps === 0) {
      var chunk = handler.chunk;
      if (chunk === null || chunk.status !== BLOCKED) {
        return;
      }
      var resolveListeners = chunk.value;
      var initializedChunk = chunk;
      initializedChunk.status = INITIALIZED;
      initializedChunk.value = handler.value;
      initializedChunk.reason = null;
      if (resolveListeners !== null) {
        wakeChunk(response, resolveListeners, handler.value);
      }
    }
  }
  function reject(error) {
    if (handler.errored) {
      // We've already errored. We could instead build up an AggregateError
      // but if there are multiple errors we just take the first one like
      // Promise.all.
      return;
    }
    handler.errored = true;
    handler.value = null;
    handler.reason = error;
    var chunk = handler.chunk;
    if (chunk === null || chunk.status !== BLOCKED) {
      return;
    }
    triggerErrorOnChunk(response, chunk, error);
  }
  promise.then(fulfill, reject);
  return null;
}
function resolveStream(response, id, stream, controller) {
  var chunks = response._chunks;
  var chunk = createInitializedStreamChunk(response, stream, controller);
  chunks.set(id, chunk);
  var prefix = response._prefix;
  var key = prefix + id;
  var existingEntries = response._formData.getAll(key);
  for (var i = 0; i < existingEntries.length; i++) {
    var value = existingEntries[i];
    if (typeof value === 'string') {
      if (value[0] === 'C') {
        controller.close(value === 'C' ? '"$undefined"' : value.slice(1));
      } else {
        controller.enqueueModel(value);
      }
    }
  }
}
function parseReadableStream(response, reference, type, parentObject, parentKey) {
  var id = parseInt(reference.slice(2), 16);
  var chunks = response._chunks;
  if (chunks.has(id)) {
    throw new Error('Already initialized stream.');
  }
  var controller = null;
  var closed = false;
  var stream = new ReadableStream({
    type: type,
    start: function (c) {
      controller = c;
    }
  });
  var previousBlockedChunk = null;
  var flightController = {
    enqueueModel: function (json) {
      if (previousBlockedChunk === null) {
        // If we're not blocked on any other chunks, we can try to eagerly initialize
        // this as a fast-path to avoid awaiting them.
        var chunk = createResolvedModelChunk(response, json, -1);
        initializeModelChunk(chunk);
        var initializedChunk = chunk;
        if (initializedChunk.status === INITIALIZED) {
          controller.enqueue(initializedChunk.value);
        } else {
          chunk.then(function (v) {
            return controller.enqueue(v);
          }, function (e) {
            return controller.error(e);
          });
          previousBlockedChunk = chunk;
        }
      } else {
        // We're still waiting on a previous chunk so we can't enqueue quite yet.
        var blockedChunk = previousBlockedChunk;
        var _chunk = createPendingChunk();
        _chunk.then(function (v) {
          return controller.enqueue(v);
        }, function (e) {
          return controller.error(e);
        });
        previousBlockedChunk = _chunk;
        blockedChunk.then(function () {
          if (previousBlockedChunk === _chunk) {
            // We were still the last chunk so we can now clear the queue and return
            // to synchronous emitting.
            previousBlockedChunk = null;
          }
          resolveModelChunk(response, _chunk, json, -1);
        });
      }
    },
    close: function (json) {
      if (closed) {
        return;
      }
      closed = true;
      if (previousBlockedChunk === null) {
        controller.close();
      } else {
        var blockedChunk = previousBlockedChunk;
        // We shouldn't get any more enqueues after this so we can set it back to null.
        previousBlockedChunk = null;
        blockedChunk.then(function () {
          return controller.close();
        });
      }
    },
    error: function (error) {
      if (closed) {
        return;
      }
      closed = true;
      if (previousBlockedChunk === null) {
        // $FlowFixMe[incompatible-call]
        controller.error(error);
      } else {
        var blockedChunk = previousBlockedChunk;
        // We shouldn't get any more enqueues after this so we can set it back to null.
        previousBlockedChunk = null;
        blockedChunk.then(function () {
          return controller.error(error);
        });
      }
    }
  };
  resolveStream(response, id, stream, flightController);
  return stream;
}
function asyncIterator() {
  // Self referencing iterator.
  return this;
}
function createIterator(next) {
  var iterator = {
    next: next
    // TODO: Add return/throw as options for aborting.
  };
  // TODO: The iterator could inherit the AsyncIterator prototype which is not exposed as
  // a global but exists as a prototype of an AsyncGenerator. However, it's not needed
  // to satisfy the iterable protocol.
  iterator[ASYNC_ITERATOR] = asyncIterator;
  return iterator;
}
function parseAsyncIterable(response, reference, iterator, parentObject, parentKey) {
  var id = parseInt(reference.slice(2), 16);
  var chunks = response._chunks;
  if (chunks.has(id)) {
    throw new Error('Already initialized stream.');
  }
  var buffer = [];
  var closed = false;
  var nextWriteIndex = 0;
  var flightController = {
    enqueueModel: function (value) {
      if (nextWriteIndex === buffer.length) {
        buffer[nextWriteIndex] = createResolvedIteratorResultChunk(response, value, false);
      } else {
        resolveIteratorResultChunk(response, buffer[nextWriteIndex], value, false);
      }
      nextWriteIndex++;
    },
    close: function (value) {
      if (closed) {
        return;
      }
      closed = true;
      if (nextWriteIndex === buffer.length) {
        buffer[nextWriteIndex] = createResolvedIteratorResultChunk(response, value, true);
      } else {
        resolveIteratorResultChunk(response, buffer[nextWriteIndex], value, true);
      }
      nextWriteIndex++;
      while (nextWriteIndex < buffer.length) {
        // In generators, any extra reads from the iterator have the value undefined.
        resolveIteratorResultChunk(response, buffer[nextWriteIndex++], '"$undefined"', true);
      }
    },
    error: function (error) {
      if (closed) {
        return;
      }
      closed = true;
      if (nextWriteIndex === buffer.length) {
        buffer[nextWriteIndex] = createPendingChunk();
      }
      while (nextWriteIndex < buffer.length) {
        triggerErrorOnChunk(response, buffer[nextWriteIndex++], error);
      }
    }
  };
  var iterable = _defineProperty({}, ASYNC_ITERATOR, function () {
    var nextReadIndex = 0;
    return createIterator(function (arg) {
      if (arg !== undefined) {
        throw new Error('Values cannot be passed to next() of AsyncIterables passed to Client Components.');
      }
      if (nextReadIndex === buffer.length) {
        if (closed) {
          // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
          return new ReactPromise(INITIALIZED, {
            done: true,
            value: undefined
          }, null);
        }
        buffer[nextReadIndex] = createPendingChunk();
      }
      return buffer[nextReadIndex++];
    });
  });
  // TODO: If it's a single shot iterator we can optimize memory by cleaning up the buffer after
  // reading through the end, but currently we favor code size over this optimization.
  var stream = iterator ? iterable[ASYNC_ITERATOR]() : iterable;
  resolveStream(response, id, stream, flightController);
  return stream;
}
function parseModelString(response, obj, key, value, reference) {
  if (value[0] === '$') {
    switch (value[1]) {
      case '$':
        {
          // This was an escaped string value.
          return value.slice(1);
        }
      case '@':
        {
          // Promise
          var id = parseInt(value.slice(2), 16);
          var chunk = getChunk(response, id);
          return chunk;
        }
      case 'h':
        {
          // Server Reference
          var _ref = value.slice(2);
          return getOutlinedModel(response, _ref, obj, key, loadServerReference$1);
        }
      case 'T':
        {
          // Temporary Reference
          if (reference === undefined || response._temporaryReferences === undefined) {
            throw new Error('Could not reference an opaque temporary reference. ' + 'This is likely due to misconfiguring the temporaryReferences options ' + 'on the server.');
          }
          return createTemporaryReference(response._temporaryReferences, reference);
        }
      case 'Q':
        {
          // Map
          var _ref2 = value.slice(2);
          return getOutlinedModel(response, _ref2, obj, key, createMap);
        }
      case 'W':
        {
          // Set
          var _ref3 = value.slice(2);
          return getOutlinedModel(response, _ref3, obj, key, createSet);
        }
      case 'K':
        {
          // FormData
          var stringId = value.slice(2);
          var formPrefix = response._prefix + stringId + '_';
          var data = new FormData();
          var backingFormData = response._formData;
          // We assume that the reference to FormData always comes after each
          // entry that it references so we can assume they all exist in the
          // backing store already.
          // $FlowFixMe[prop-missing] FormData has forEach on it.
          backingFormData.forEach(function (entry, entryKey) {
            if (entryKey.startsWith(formPrefix)) {
              // $FlowFixMe[incompatible-call]
              data.append(entryKey.slice(formPrefix.length), entry);
            }
          });
          return data;
        }
      case 'i':
        {
          // Iterator
          var _ref4 = value.slice(2);
          return getOutlinedModel(response, _ref4, obj, key, extractIterator);
        }
      case 'I':
        {
          // $Infinity
          return Infinity;
        }
      case '-':
        {
          // $-0 or $-Infinity
          if (value === '$-0') {
            return -0;
          } else {
            return -Infinity;
          }
        }
      case 'N':
        {
          // $NaN
          return NaN;
        }
      case 'u':
        {
          // matches "$undefined"
          // Special encoding for `undefined` which can't be serialized as JSON otherwise.
          return undefined;
        }
      case 'D':
        {
          // Date
          return new Date(Date.parse(value.slice(2)));
        }
      case 'n':
        {
          // BigInt
          return BigInt(value.slice(2));
        }
    }
    switch (value[1]) {
      case 'A':
        return parseTypedArray(response, value, ArrayBuffer, 1, obj, key);
      case 'O':
        return parseTypedArray(response, value, Int8Array, 1, obj, key);
      case 'o':
        return parseTypedArray(response, value, Uint8Array, 1, obj, key);
      case 'U':
        return parseTypedArray(response, value, Uint8ClampedArray, 1, obj, key);
      case 'S':
        return parseTypedArray(response, value, Int16Array, 2, obj, key);
      case 's':
        return parseTypedArray(response, value, Uint16Array, 2, obj, key);
      case 'L':
        return parseTypedArray(response, value, Int32Array, 4, obj, key);
      case 'l':
        return parseTypedArray(response, value, Uint32Array, 4, obj, key);
      case 'G':
        return parseTypedArray(response, value, Float32Array, 4, obj, key);
      case 'g':
        return parseTypedArray(response, value, Float64Array, 8, obj, key);
      case 'M':
        return parseTypedArray(response, value, BigInt64Array, 8, obj, key);
      case 'm':
        return parseTypedArray(response, value, BigUint64Array, 8, obj, key);
      case 'V':
        return parseTypedArray(response, value, DataView, 1, obj, key);
      case 'B':
        {
          // Blob
          var _id = parseInt(value.slice(2), 16);
          var prefix = response._prefix;
          var blobKey = prefix + _id;
          // We should have this backingEntry in the store already because we emitted
          // it before referencing it. It should be a Blob.
          var backingEntry = response._formData.get(blobKey);
          return backingEntry;
        }
    }
    switch (value[1]) {
      case 'R':
        {
          return parseReadableStream(response, value, undefined);
        }
      case 'r':
        {
          return parseReadableStream(response, value, 'bytes');
        }
      case 'X':
        {
          return parseAsyncIterable(response, value, false);
        }
      case 'x':
        {
          return parseAsyncIterable(response, value, true);
        }
    }
    // We assume that anything else is a reference ID.
    var ref = value.slice(1);
    return getOutlinedModel(response, ref, obj, key, createModel);
  }
  return value;
}
function createResponse(bundlerConfig, formFieldPrefix, temporaryReferences) {
  var backingFormData = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : new FormData();
  var chunks = new Map();
  var response = {
    _bundlerConfig: bundlerConfig,
    _prefix: formFieldPrefix,
    _formData: backingFormData,
    _chunks: chunks,
    _closed: false,
    _closedReason: null,
    _temporaryReferences: temporaryReferences
  };
  return response;
}
function resolveField(response, key, value) {
  // Add this field to the backing store.
  response._formData.append(key, value);
  var prefix = response._prefix;
  if (key.startsWith(prefix)) {
    var chunks = response._chunks;
    var id = +key.slice(prefix.length);
    var chunk = chunks.get(id);
    if (chunk) {
      // We were waiting on this key so now we can resolve it.
      resolveModelChunk(response, chunk, value, id);
    }
  }
}
function resolveFile(response, key, file) {
  // Add this field to the backing store.
  response._formData.append(key, file);
}
function close(response) {
  // In case there are any remaining unresolved chunks, they won't
  // be resolved now. So we need to issue an error to those.
  // Ideally we should be able to early bail out if we kept a
  // ref count of pending chunks.
  reportGlobalError(response, new Error('Connection closed.'));
}

function bindArgs(fn, args) {
  return fn.bind.apply(fn, [null].concat(args));
}
function loadServerReference(bundlerConfig, id, bound) {
  var serverReference = resolveServerReference(bundlerConfig, id);
  // We expect most servers to not really need this because you'd just have all
  // the relevant modules already loaded but it allows for lazy loading of code
  // if needed.
  var preloadPromise = preloadModule(serverReference);
  if (bound) {
    return Promise.all([bound, preloadPromise]).then(function (_ref) {
      var args = _ref[0];
      return bindArgs(requireModule(serverReference), args);
    });
  } else if (preloadPromise) {
    return Promise.resolve(preloadPromise).then(function () {
      return requireModule(serverReference);
    });
  } else {
    // Synchronously available
    return Promise.resolve(requireModule(serverReference));
  }
}
function decodeBoundActionMetaData(body, serverManifest, formFieldPrefix) {
  // The data for this reference is encoded in multiple fields under this prefix.
  var actionResponse = createResponse(serverManifest, formFieldPrefix, undefined, body);
  close(actionResponse);
  var refPromise = getRoot(actionResponse);
  // Force it to initialize
  // $FlowFixMe
  refPromise.then(function () {});
  if (refPromise.status !== 'fulfilled') {
    // $FlowFixMe
    throw refPromise.reason;
  }
  return refPromise.value;
}
function decodeAction(body, serverManifest) {
  // We're going to create a new formData object that holds all the fields except
  // the implementation details of the action data.
  var formData = new FormData();
  var action = null;

  // $FlowFixMe[prop-missing]
  body.forEach(function (value, key) {
    if (!key.startsWith('$ACTION_')) {
      // $FlowFixMe[incompatible-call]
      formData.append(key, value);
      return;
    }
    // Later actions may override earlier actions if a button is used to override the default
    // form action.
    if (key.startsWith('$ACTION_REF_')) {
      var formFieldPrefix = '$ACTION_' + key.slice(12) + ':';
      var metaData = decodeBoundActionMetaData(body, serverManifest, formFieldPrefix);
      action = loadServerReference(serverManifest, metaData.id, metaData.bound);
      return;
    }
    if (key.startsWith('$ACTION_ID_')) {
      var id = key.slice(11);
      action = loadServerReference(serverManifest, id, null);
      return;
    }
  });
  if (action === null) {
    return null;
  }
  // Return the action with the remaining FormData bound to the first argument.
  return action.then(function (fn) {
    return fn.bind(null, formData);
  });
}
function decodeFormState(actionResult, body, serverManifest) {
  var keyPath = body.get('$ACTION_KEY');
  if (typeof keyPath !== 'string') {
    // This form submission did not include any form state.
    return Promise.resolve(null);
  }
  // Search through the form data object to get the reference id and the number
  // of bound arguments. This repeats some of the work done in decodeAction.
  var metaData = null;
  // $FlowFixMe[prop-missing]
  body.forEach(function (value, key) {
    if (key.startsWith('$ACTION_REF_')) {
      var formFieldPrefix = '$ACTION_' + key.slice(12) + ':';
      metaData = decodeBoundActionMetaData(body, serverManifest, formFieldPrefix);
    }
    // We don't check for the simple $ACTION_ID_ case because form state actions
    // are always bound to the state argument.
  });
  if (metaData === null) {
    // Should be unreachable.
    return Promise.resolve(null);
  }
  var referenceId = metaData.id;
  return Promise.resolve(metaData.bound).then(function (bound) {
    if (bound === null) {
      // Should be unreachable because form state actions are always bound to the
      // state argument.
      return null;
    }
    // The form action dispatch method is always bound to the initial state.
    // But when comparing signatures, we compare to the original unbound action.
    // Subtract one from the arity to account for this.
    var boundArity = bound.length - 1;
    return [actionResult, keyPath, referenceId, boundArity];
  });
}

function startReadingFromDebugChannelReadableStream(request, stream) {
  var reader = stream.getReader();
  var stringDecoder = createStringDecoder();
  var stringBuffer = '';
  function progress(_ref) {
    var done = _ref.done,
      value = _ref.value;
    var buffer = value;
    stringBuffer += done ? readFinalStringChunk(stringDecoder, new Uint8Array(0)) : readPartialStringChunk(stringDecoder, buffer);
    var messages = stringBuffer.split('\n');
    for (var i = 0; i < messages.length - 1; i++) {
      resolveDebugMessage(request, messages[i]);
    }
    stringBuffer = messages[messages.length - 1];
    if (done) {
      closeDebugChannel(request);
      return;
    }
    return reader.read().then(progress).catch(error);
  }
  function error(e) {
    abort(request, new Error('Lost connection to the Debug Channel.', {
      cause: e
    }));
  }
  reader.read().then(progress).catch(error);
}
function renderToReadableStream(model, turbopackMap, options) {
  var debugChannelReadable = options && options.debugChannel ? options.debugChannel.readable : undefined;
  var debugChannelWritable = options && options.debugChannel ? options.debugChannel.writable : undefined;
  var request = createRequest(model, turbopackMap, options ? options.onError : undefined, options ? options.identifierPrefix : undefined, options ? options.temporaryReferences : undefined, options ? options.startTime : undefined, options ? options.environmentName : undefined, options ? options.filterStackFrame : undefined, debugChannelReadable !== undefined);
  if (options && options.signal) {
    var signal = options.signal;
    if (signal.aborted) {
      abort(request, signal.reason);
    } else {
      var listener = function () {
        abort(request, signal.reason);
        signal.removeEventListener('abort', listener);
      };
      signal.addEventListener('abort', listener);
    }
  }
  if (debugChannelWritable !== undefined) {
    var debugStream = new ReadableStream({
      type: 'bytes',
      pull: function (controller) {
        startFlowingDebug(request, controller);
      }
    },
    // $FlowFixMe[prop-missing] size() methods are not allowed on byte streams.
    {
      highWaterMark: 0
    });
    debugStream.pipeTo(debugChannelWritable);
  }
  if (debugChannelReadable !== undefined) {
    startReadingFromDebugChannelReadableStream(request, debugChannelReadable);
  }
  var stream = new ReadableStream({
    type: 'bytes',
    start: function (controller) {
      startWork(request);
    },
    pull: function (controller) {
      startFlowing(request, controller);
    },
    cancel: function (reason) {
      stopFlowing(request);
      abort(request, reason);
    }
  },
  // $FlowFixMe[prop-missing] size() methods are not allowed on byte streams.
  {
    highWaterMark: 0
  });
  return stream;
}
function prerender(model, turbopackMap, options) {
  return new Promise(function (resolve, reject) {
    var onFatalError = reject;
    function onAllReady() {
      var stream = new ReadableStream({
        type: 'bytes',
        pull: function (controller) {
          startFlowing(request, controller);
        },
        cancel: function (reason) {
          stopFlowing(request);
          abort(request, reason);
        }
      },
      // $FlowFixMe[prop-missing] size() methods are not allowed on byte streams.
      {
        highWaterMark: 0
      });
      resolve({
        prelude: stream
      });
    }
    var request = createPrerenderRequest(model, turbopackMap, onAllReady, onFatalError, options ? options.onError : undefined, options ? options.identifierPrefix : undefined, options ? options.temporaryReferences : undefined, options ? options.startTime : undefined, options ? options.environmentName : undefined, options ? options.filterStackFrame : undefined, false);
    if (options && options.signal) {
      var signal = options.signal;
      if (signal.aborted) {
        var reason = signal.reason;
        abort(request, reason);
      } else {
        var listener = function () {
          var reason = signal.reason;
          abort(request, reason);
          signal.removeEventListener('abort', listener);
        };
        signal.addEventListener('abort', listener);
      }
    }
    startWork(request);
  });
}
function decodeReply(body, turbopackMap, options) {
  if (typeof body === 'string') {
    var form = new FormData();
    form.append('0', body);
    body = form;
  }
  var response = createResponse(turbopackMap, '', options ? options.temporaryReferences : undefined, body);
  var root = getRoot(response);
  close(response);
  return root;
}
function decodeReplyFromAsyncIterable(iterable, turbopackMap, options) {
  var iterator = iterable[ASYNC_ITERATOR]();
  var response = createResponse(turbopackMap, '', options ? options.temporaryReferences : undefined);
  function progress(entry) {
    if (entry.done) {
      close(response);
    } else {
      var _entry$value = entry.value,
        name = _entry$value[0],
        value = _entry$value[1];
      if (typeof value === 'string') {
        resolveField(response, name, value);
      } else {
        resolveFile(response, name, value);
      }
      iterator.next().then(progress, error);
    }
  }
  function error(reason) {
    reportGlobalError(response, reason);
    if (typeof iterator.throw === 'function') {
      // The iterator protocol doesn't necessarily include this but a generator do.
      // $FlowFixMe should be able to pass mixed
      iterator.throw(reason).then(error, error);
    }
  }
  iterator.next().then(progress, error);
  return getRoot(response);
}

exports.createClientModuleProxy = createClientModuleProxy;
exports.createTemporaryReferenceSet = createTemporaryReferenceSet;
exports.decodeAction = decodeAction;
exports.decodeFormState = decodeFormState;
exports.decodeReply = decodeReply;
exports.decodeReplyFromAsyncIterable = decodeReplyFromAsyncIterable;
exports.prerender = prerender;
exports.registerClientReference = registerClientReference;
exports.registerServerReference = registerServerReference;
exports.renderToReadableStream = renderToReadableStream;
  })();
}
