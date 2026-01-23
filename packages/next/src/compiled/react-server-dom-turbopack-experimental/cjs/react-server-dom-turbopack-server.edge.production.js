/**
 * @license React
 * react-server-dom-turbopack-server.edge.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

var ReactDOM = require('react-dom');
var React = require('react');

// -----------------------------------------------------------------------------
// Land or remove (zero effort)
//
// Flags that can likely be deleted or landed without consequences
// -----------------------------------------------------------------------------

const enableHalt = true;

// -----------------------------------------------------------------------------
// Debugging and DevTools
// -----------------------------------------------------------------------------

// Gather advanced timing metrics for Profiler subtrees.
const enableProfilerTimer = false;

// Adds performance.measure() marks using Chrome extensions to allow formatted
// Component rendering tracks to show up in the Performance tab.
// This flag will be used for both Server Component and Client Component tracks.
// All calls should also be gated on enableProfilerTimer.
const enableComponentPerformanceTrack = true;
const enableAsyncDebugInfo = true;

// ATTENTION
// When adding new symbols to this file,
// Please consider also adding to 'react-devtools-shared/src/backend/ReactSymbols'

// The Symbol used to tag the ReactElement-like types.
const REACT_LEGACY_ELEMENT_TYPE = Symbol.for('react.element');
const REACT_ELEMENT_TYPE = Symbol.for('react.transitional.element') ;
const REACT_FRAGMENT_TYPE = Symbol.for('react.fragment');
const REACT_CONTEXT_TYPE = Symbol.for('react.context');
const REACT_FORWARD_REF_TYPE = Symbol.for('react.forward_ref');
const REACT_SUSPENSE_TYPE = Symbol.for('react.suspense');
const REACT_SUSPENSE_LIST_TYPE = Symbol.for('react.suspense_list');
const REACT_MEMO_TYPE = Symbol.for('react.memo');
const REACT_LAZY_TYPE = Symbol.for('react.lazy');
const REACT_MEMO_CACHE_SENTINEL = Symbol.for('react.memo_cache_sentinel');
const REACT_VIEW_TRANSITION_TYPE = Symbol.for('react.view_transition');
const MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
const FAUX_ITERATOR_SYMBOL = '@@iterator';
function getIteratorFn(maybeIterable) {
  if (maybeIterable === null || typeof maybeIterable !== 'object') {
    return null;
  }
  const maybeIterator = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL];
  if (typeof maybeIterator === 'function') {
    return maybeIterator;
  }
  return null;
}
const ASYNC_ITERATOR = Symbol.asyncIterator;
const REACT_OPTIMISTIC_KEY = Symbol.for('react.optimistic_key');

// This is actually a symbol but Flow doesn't support comparison of symbols to refine.
// We use a boolean since in our code we often expect string (key) or number (index),
// so by pretending to be a boolean we cover a lot of cases that don't consider this case.

function handleErrorInNextTick(error) {
  setTimeout(() => {
    throw error;
  });
}
const LocalPromise = Promise;
const scheduleMicrotask = typeof queueMicrotask === 'function' ? queueMicrotask : callback => {
  LocalPromise.resolve(null).then(callback).catch(handleErrorInNextTick);
};
function scheduleWork(callback) {
  setTimeout(callback, 0);
}

// Chunks larger than VIEW_SIZE are written directly, without copying into the
// internal view buffer. This must be at least half of Node's internal Buffer
// pool size (8192) to avoid corrupting the pool when using
// renderToReadableStream, which uses a byte stream that detaches ArrayBuffers.
const VIEW_SIZE = 4096;
let currentView = null;
let writtenBytes = 0;
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
  let bytesToWrite = chunk;
  const allowableBytes = currentView.length - writtenBytes;
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
const textEncoder = new TextEncoder();
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

const CLIENT_REFERENCE_TAG$1 = Symbol.for('react.client.reference');
const SERVER_REFERENCE_TAG = Symbol.for('react.server.reference');
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
const FunctionBind = Function.prototype.bind;
// $FlowFixMe[method-unbinding]
const ArraySlice = Array.prototype.slice;
function bind() {
  // $FlowFixMe[incompatible-call]
  const newFn = FunctionBind.apply(this, arguments);
  if (this.$$typeof === SERVER_REFERENCE_TAG) {
    const args = ArraySlice.call(arguments, 1);
    const $$typeof = {
      value: SERVER_REFERENCE_TAG
    };
    const $$id = {
      value: this.$$id
    };
    const $$bound = {
      value: this.$$bound ? this.$$bound.concat(args) : args
    };
    return Object.defineProperties(newFn, {
      $$typeof,
      $$id,
      $$bound,
      bind: {
        value: bind,
        configurable: true
      }
    });
  }
  return newFn;
}
const serverReferenceToString = {
  value: () => 'function () { [omitted code] }',
  configurable: true,
  writable: true
};
function registerServerReference(reference, id, exportName) {
  const $$typeof = {
    value: SERVER_REFERENCE_TAG
  };
  const $$id = {
    value: exportName === null ? id : id + '#' + exportName,
    configurable: true
  };
  const $$bound = {
    value: null,
    configurable: true
  };
  return Object.defineProperties(reference, {
    $$typeof,
    $$id,
    $$bound,
    bind: {
      value: bind,
      configurable: true
    },
    toString: serverReferenceToString
  });
}
const PROMISE_PROTOTYPE = Promise.prototype;
const deepProxyHandlers = {
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
    const expression = String(target.name) + '.' + String(name);
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
      const moduleId = target.$$id;
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

        const clientReference = registerClientReferenceImpl({}, target.$$id, true);
        const proxy = new Proxy(clientReference, proxyHandlers$1);

        // Treat this as a resolved Promise for React's use()
        target.status = 'fulfilled';
        target.value = proxy;
        const then = target.then = registerClientReferenceImpl(function then(resolve, reject) {
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
  let cachedReference = target[name];
  if (!cachedReference) {
    const reference = registerClientReferenceImpl(function () {
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
const proxyHandlers$1 = {
  get: function (target, name, receiver) {
    return getReference(target, name);
  },
  getOwnPropertyDescriptor: function (target, name) {
    let descriptor = Object.getOwnPropertyDescriptor(target, name);
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
  getPrototypeOf(target) {
    // Pretend to be a Promise in case anyone asks.
    return PROMISE_PROTOTYPE;
  },
  set: function () {
    throw new Error('Cannot assign to a client module from a server module.');
  }
};
function createClientModuleProxy(moduleId) {
  const clientReference = registerClientReferenceImpl({},
  // Represents the whole Module object instead of a particular import.
  moduleId, false);
  return new Proxy(clientReference, proxyHandlers$1);
}

function getClientReferenceKey(reference) {
  return reference.$$async ? reference.$$id + '#async' : reference.$$id;
}
function resolveClientReferenceMetadata(config, clientReference) {
  const modulePath = clientReference.$$id;
  let name = '';
  let resolvedModuleData = config[modulePath];
  if (resolvedModuleData) {
    // The potentially aliased name.
    name = resolvedModuleData.name;
  } else {
    // We didn't find this specific export name but we might have the * export
    // which contains this name as well.
    // TODO: It's unfortunate that we now have to parse this string. We should
    // probably go back to encoding path and name separately on the client reference.
    const idx = modulePath.lastIndexOf('#');
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

const ReactDOMSharedInternals = ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

const previousDispatcher = ReactDOMSharedInternals.d; /* ReactDOMCurrentDispatcher */
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
    const request = resolveRequest();
    if (request) {
      const hints = getHints(request);
      const key = 'D|' + href;
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
    const request = resolveRequest();
    if (request) {
      const hints = getHints(request);
      const key = "C|" + (crossOrigin == null ? 'null' : crossOrigin) + "|" + href;
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
    const request = resolveRequest();
    if (request) {
      const hints = getHints(request);
      let key = 'L';
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
      const trimmed = trimOptions(options);
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
    const request = resolveRequest();
    if (request) {
      const hints = getHints(request);
      const key = 'm|' + href;
      if (hints.has(key)) {
        // duplicate hint
        return;
      }
      hints.add(key);
      const trimmed = trimOptions(options);
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
    const request = resolveRequest();
    if (request) {
      const hints = getHints(request);
      const key = 'S|' + href;
      if (hints.has(key)) {
        // duplicate hint
        return;
      }
      hints.add(key);
      const trimmed = trimOptions(options);
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
    const request = resolveRequest();
    if (request) {
      const hints = getHints(request);
      const key = 'X|' + src;
      if (hints.has(key)) {
        // duplicate hint
        return;
      }
      hints.add(key);
      const trimmed = trimOptions(options);
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
    const request = resolveRequest();
    if (request) {
      const hints = getHints(request);
      const key = 'M|' + src;
      if (hints.has(key)) {
        // duplicate hint
        return;
      }
      hints.add(key);
      const trimmed = trimOptions(options);
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
  let hasProperties = false;
  const trimmed = {};
  for (const key in options) {
    // $FlowFixMe[invalid-computed-prop]
    if (options[key] != null) {
      hasProperties = true;
      trimmed[key] = options[key];
    }
  }
  return hasProperties ? trimmed : null;
}
function getImagePreloadKey(href, imageSrcSet, imageSizes) {
  let uniquePart = '';
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
const NO_SCOPE = /*         */0b000000;
const NOSCRIPT_SCOPE = /*   */0b000001;
const PICTURE_SCOPE = /*    */0b000010;
function createRootFormatContext() {
  return NO_SCOPE;
}
function processImg(props, formatContext) {
  // This should mirror the logic of pushImg in ReactFizzConfigDOM.
  const pictureOrNoScriptTagInScope = formatContext & (PICTURE_SCOPE | NOSCRIPT_SCOPE);
  const src = props.src,
    srcSet = props.srcSet;
  if (props.loading !== 'lazy' && (src || srcSet) && (typeof src === 'string' || src == null) && (typeof srcSet === 'string' || srcSet == null) && props.fetchPriority !== 'low' && !pictureOrNoScriptTagInScope &&
  // We exclude data URIs in src and srcSet since these should not be preloaded
  !(typeof src === 'string' && src[4] === ':' && (src[0] === 'd' || src[0] === 'D') && (src[1] === 'a' || src[1] === 'A') && (src[2] === 't' || src[2] === 'T') && (src[3] === 'a' || src[3] === 'A')) && !(typeof srcSet === 'string' && srcSet[4] === ':' && (srcSet[0] === 'd' || srcSet[0] === 'D') && (srcSet[1] === 'a' || srcSet[1] === 'A') && (srcSet[2] === 't' || srcSet[2] === 'T') && (srcSet[3] === 'a' || srcSet[3] === 'A'))) {
    // We have a suspensey image and ought to preload it to optimize the loading of display blocking
    // resumableState.
    const sizes = typeof props.sizes === 'string' ? props.sizes : undefined;
    const crossOrigin = getCrossOriginString(props.crossOrigin);
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
  const noscriptTagInScope = formatContext & NOSCRIPT_SCOPE;
  const rel = props.rel;
  const href = props.href;
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

let framesToSkip = 0;
let collectedStackTrace = null;
const identifierRegExp = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/;
function getMethodCallName(callSite) {
  const typeName = callSite.getTypeName();
  const methodName = callSite.getMethodName();
  const functionName = callSite.getFunctionName();
  let result = '';
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
  const result = [];
  // Collect structured stack traces from the callsites.
  // We mirror how V8 serializes stack frames and how we later parse them.
  for (let i = framesToSkip; i < structuredStackTrace.length; i++) {
    const callSite = structuredStackTrace[i];
    let name = callSite.getFunctionName() || '<anonymous>';
    if (name.includes('react_stack_bottom_frame')) {
      // Skip everything after the bottom frame since it'll be internals.
      break;
    } else if (callSite.isNative()) {
      // $FlowFixMe[prop-missing]
      const isAsync = callSite.isAsync();
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
      let filename = callSite.getScriptNameOrSourceURL() || '<anonymous>';
      if (filename === '<anonymous>') {
        filename = '';
        if (callSite.isEval()) {
          const origin = callSite.getEvalOrigin();
          if (origin) {
            filename = origin.toString() + ', <anonymous>';
          }
        }
      }
      const line = callSite.getLineNumber() || 0;
      const col = callSite.getColumnNumber() || 0;
      const enclosingLine =
      // $FlowFixMe[prop-missing]
      typeof callSite.getEnclosingLineNumber === 'function' ? callSite.getEnclosingLineNumber() || 0 : 0;
      const enclosingCol =
      // $FlowFixMe[prop-missing]
      typeof callSite.getEnclosingColumnNumber === 'function' ? callSite.getEnclosingColumnNumber() || 0 : 0;
      // $FlowFixMe[prop-missing]
      const isAsync = callSite.isAsync();
      result.push([name, filename, line, col, enclosingLine, enclosingCol, isAsync]);
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
  const name = error.name || 'Error';
  const message = error.message || '';
  let stack = name + ': ' + message;
  for (let i = 0; i < structuredStackTrace.length; i++) {
    stack += '\n    at ' + structuredStackTrace[i].toString();
  }
  return stack;
}

// This matches either of these V8 formats.
//     at name (filename:0:0)
//     at filename:0:0
//     at async filename:0:0
const frameRegExp = /^ {3} at (?:(.+) \((?:(.+):(\d+):(\d+)|\<anonymous\>)\)|(?:async )?(.+):(\d+):(\d+)|\<anonymous\>)$/;

// DEV-only cache of parsed and filtered stack frames.
const stackTraceCache = null;
function parseStackTrace(error, skipFrames) {
  // We can only get structured data out of error objects once. So we cache the information
  // so we can get it again each time. It also helps performance when the same error is
  // referenced more than once.
  const existing = stackTraceCache.get(error);
  if (existing !== undefined) {
    return existing;
  }
  // We override Error.prepareStackTrace with our own version that collects
  // the structured data. We need more information than the raw stack gives us
  // and we need to ensure that we don't get the source mapped version.
  collectedStackTrace = null;
  framesToSkip = skipFrames;
  const previousPrepare = Error.prepareStackTrace;
  Error.prepareStackTrace = collectStackTrace;
  let stack;
  try {
    // eslint-disable-next-line react-internal/safe-string-coercion
    stack = String(error.stack);
  } finally {
    Error.prepareStackTrace = previousPrepare;
  }
  if (collectedStackTrace !== null) {
    const result = collectedStackTrace;
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
  let idx = stack.indexOf('react_stack_bottom_frame');
  if (idx !== -1) {
    idx = stack.lastIndexOf('\n', idx);
  }
  if (idx !== -1) {
    // Cut off everything after the bottom frame since it'll be internals.
    stack = stack.slice(0, idx);
  }
  const frames = stack.split('\n');
  const parsedFrames = [];
  // We skip top frames here since they may or may not be parseable but we
  // want to skip the same number of frames regardless. I.e. we can't do it
  // in the caller.
  for (let i = skipFrames; i < frames.length; i++) {
    const parsed = frameRegExp.exec(frames[i]);
    if (!parsed) {
      continue;
    }
    let name = parsed[1] || '';
    let isAsync = parsed[8] === 'async ';
    if (name === '<anonymous>') {
      name = '';
    } else if (name.startsWith('async ')) {
      name = name.slice(5);
      isAsync = true;
    }
    let filename = parsed[2] || parsed[5] || '';
    if (filename === '<anonymous>') {
      filename = '';
    }
    const line = +(parsed[3] || parsed[6]);
    const col = +(parsed[4] || parsed[7]);
    parsedFrames.push([name, filename, line, col, 0, 0, isAsync]);
  }
  stackTraceCache.set(error, parsedFrames);
  return parsedFrames;
}

// For now, we get this from the global scope, but this will likely move to a module.
const supportsRequestStorage = typeof AsyncLocalStorage === 'function';
const requestStorage = supportsRequestStorage ? new AsyncLocalStorage() : null;

const TEMPORARY_REFERENCE_TAG = Symbol.for('react.temporary.reference');

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
const proxyHandlers = {
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
  const reference = Object.defineProperties(function () {
    throw new Error("Attempted to call a temporary Client Reference from the server but it is on the client. " + "It's not possible to invoke a client function from the server, it can " + "only be rendered as a Component or passed to props of a Client Component.");
  }, {
    $$typeof: {
      value: TEMPORARY_REFERENCE_TAG
    }
  });
  const wrapper = new Proxy(reference, proxyHandlers);
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
const SuspenseException = new Error("Suspense Exception: This is not a real error! It's an implementation " + 'detail of `use` to interrupt the current render. You must either ' + 'rethrow it immediately, or move the `use` call outside of the ' + '`try/catch` block. Capturing without rethrowing will lead to ' + 'unexpected behavior.\n\n' + 'To handle async errors, wrap your component in an error boundary, or ' + "call the promise's `.catch` method and pass the result to `use`.");
function createThenableState() {
  // The ThenableState is created the first time a component suspends. If it
  // suspends again, we'll reuse the same state.
  return [];
}
function trackUsedThenable(thenableState, thenable, index) {
  const previous = thenableState[index];
  if (previous === undefined) {
    thenableState.push(thenable);
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
        const fulfilledValue = thenable.value;
        return fulfilledValue;
      }
    case 'rejected':
      {
        const rejectedError = thenable.reason;
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
          const pendingThenable = thenable;
          pendingThenable.status = 'pending';
          pendingThenable.then(fulfilledValue => {
            if (thenable.status === 'pending') {
              const fulfilledThenable = thenable;
              fulfilledThenable.status = 'fulfilled';
              fulfilledThenable.value = fulfilledValue;
            }
          }, error => {
            if (thenable.status === 'pending') {
              const rejectedThenable = thenable;
              rejectedThenable.status = 'rejected';
              rejectedThenable.reason = error;
            }
          });
        }

        // Check one more time in case the thenable resolved synchronously
        switch (thenable.status) {
          case 'fulfilled':
            {
              const fulfilledThenable = thenable;
              return fulfilledThenable.value;
            }
          case 'rejected':
            {
              const rejectedThenable = thenable;
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
let suspendedThenable = null;
function getSuspendedThenable() {
  // This is called right after `use` suspends by throwing an exception. `use`
  // throws an opaque value instead of the thenable itself so that it can't be
  // caught in userspace. Then the work loop accesses the actual thenable using
  // this function.
  if (suspendedThenable === null) {
    throw new Error('Expected a suspended thenable. This is a bug in React. Please file ' + 'an issue.');
  }
  const thenable = suspendedThenable;
  suspendedThenable = null;
  return thenable;
}

let currentRequest$1 = null;
let thenableIndexCounter = 0;
let thenableState = null;
function prepareToUseHooksForRequest(request) {
  currentRequest$1 = request;
}
function resetHooksForRequest() {
  currentRequest$1 = null;
}
function prepareToUseHooksForComponent(prevThenableState, componentDebugInfo) {
  thenableIndexCounter = 0;
  thenableState = prevThenableState;
}
function getThenableStateAfterSuspending() {
  // If you use() to Suspend this should always exist but if you throw a Promise instead,
  // which is not really supported anymore, it will be empty. We use the empty set as a
  // marker to know if this was a replay of the same component or first attempt.
  const state = thenableState || createThenableState();
  thenableState = null;
  return state;
}
const HooksDispatcher = {
  readContext: unsupportedContext,
  use,
  useCallback(callback) {
    return callback;
  },
  useContext: unsupportedContext,
  useEffect: unsupportedHook,
  useImperativeHandle: unsupportedHook,
  useLayoutEffect: unsupportedHook,
  useInsertionEffect: unsupportedHook,
  useMemo(nextCreate) {
    return nextCreate();
  },
  useReducer: unsupportedHook,
  useRef: unsupportedHook,
  useState: unsupportedHook,
  useDebugValue() {},
  useDeferredValue: unsupportedHook,
  useTransition: unsupportedHook,
  useSyncExternalStore: unsupportedHook,
  useId,
  useHostTransitionStatus: unsupportedHook,
  useFormState: unsupportedHook,
  useActionState: unsupportedHook,
  useOptimistic: unsupportedHook,
  useMemoCache(size) {
    const data = new Array(size);
    for (let i = 0; i < size; i++) {
      data[i] = REACT_MEMO_CACHE_SENTINEL;
    }
    return data;
  },
  useCacheRefresh() {
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
  const id = currentRequest$1.identifierCount++;
  // use 'S' for Flight components to distinguish from 'R' and 'r' in Fizz/Client
  return '_' + currentRequest$1.identifierPrefix + 'S_' + id.toString(32) + '_';
}
function use(usable) {
  if (usable !== null && typeof usable === 'object' || typeof usable === 'function') {
    // $FlowFixMe[method-unbinding]
    if (typeof usable.then === 'function') {
      // This is a thenable.
      const thenable = usable;

      // Track the position of the thenable within this fiber.
      const index = thenableIndexCounter;
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

function resolveCache() {
  const request = resolveRequest();
  if (request) {
    return getCache(request);
  }
  return new Map();
}
const DefaultAsyncDispatcher = {
  getCacheForType(resourceType) {
    const cache = resolveCache();
    let entry = cache.get(resourceType);
    if (entry === undefined) {
      entry = resourceType();
      // TODO: Warn if undefined?
      cache.set(resourceType, entry);
    }
    return entry;
  },
  cacheSignal() {
    const request = resolveRequest();
    if (request) {
      return request.cacheController.signal;
    }
    return null;
  }
};

const ReactSharedInternalsServer =
// $FlowFixMe: It's defined in the one we resolve to.
React.__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
if (!ReactSharedInternalsServer) {
  throw new Error('The "react" package in this environment is not configured correctly. ' + 'The "react-server" condition must be enabled in any environment that ' + 'runs React Server Components.');
}

const callIteratorInDEV = null;

const isArrayImpl = Array.isArray;
function isArray(a) {
  return isArrayImpl(a);
}

const getPrototypeOf = Object.getPrototypeOf;

function objectName(object) {
  // $FlowFixMe[method-unbinding]
  const name = Object.prototype.toString.call(object);
  // Extract 'Object' from '[object Object]':
  return name.slice(8, name.length - 1);
}
function describeKeyForErrorMessage(key) {
  const encodedKey = JSON.stringify(key);
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
        const name = objectName(value);
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
        const name = value.displayName || value.name;
        return name ? 'function ' + name : 'function';
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
          const lazyComponent = type;
          const payload = lazyComponent._payload;
          const init = lazyComponent._init;
          try {
            // Lazy may contain any component type so we recursively resolve it.
            return describeElementType(init(payload));
          } catch (x) {}
        }
    }
  }
  return '';
}
const CLIENT_REFERENCE_TAG = Symbol.for('react.client.reference');
function describeClientReference(ref) {
  return 'client';
}
function describeObjectForErrorMessage(objectOrArray, expandedName) {
  const objKind = objectName(objectOrArray);
  if (objKind !== 'Object' && objKind !== 'Array') {
    return objKind;
  }
  let str = '';
  let start = -1;
  let length = 0;
  if (isArray(objectOrArray)) {
    {
      // Print Array
      str = '[';
      const array = objectOrArray;
      for (let i = 0; i < array.length; i++) {
        if (i > 0) {
          str += ', ';
        }
        const value = array[i];
        let substr;
        if (typeof value === 'object' && value !== null) {
          substr = describeObjectForErrorMessage(value);
        } else {
          substr = describeValueForErrorMessage(value);
        }
        if ('' + i === expandedName) {
          start = str.length;
          length = substr.length;
          str += substr;
        } else if (substr.length < 10 && str.length + substr.length < 40) {
          str += substr;
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
    } else {
      // Print Object
      str = '{';
      const object = objectOrArray;
      const names = Object.keys(object);
      for (let i = 0; i < names.length; i++) {
        if (i > 0) {
          str += ', ';
        }
        const name = names[i];
        str += describeKeyForErrorMessage(name) + ': ';
        const value = object[name];
        let substr;
        if (typeof value === 'object' && value !== null) {
          substr = describeObjectForErrorMessage(value);
        } else {
          substr = describeValueForErrorMessage(value);
        }
        if (name === expandedName) {
          start = str.length;
          length = substr.length;
          str += substr;
        } else if (substr.length < 10 && str.length + substr.length < 40) {
          str += substr;
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
    const highlight = ' '.repeat(start) + '^'.repeat(length);
    return '\n  ' + str + '\n  ' + highlight;
  }
  return '\n  ' + str;
}

// $FlowFixMe[method-unbinding]
const hasOwnProperty = Object.prototype.hasOwnProperty;

// Turns a TypedArray or ArrayBuffer into a string that can be used for comparison
// in a Map to see if the bytes are the same.
function binaryToComparableString(view) {
  return String.fromCharCode.apply(String, new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
}

function devirtualizeURL(url) {
  if (url.startsWith('about://React/')) {
    // This callsite is a virtual fake callsite that came from another Flight client.
    // We need to reverse it back into the original location by stripping its prefix
    // and suffix. We don't need the environment name because it's available on the
    // parent object that will contain the stack.
    const envIdx = url.indexOf('/', 'about://React/'.length);
    const suffixIdx = url.lastIndexOf('?');
    if (envIdx > -1 && suffixIdx > -1) {
      return decodeURI(url.slice(envIdx + 1, suffixIdx));
    }
  }
  return url;
}
function filterStackTrace(request, stack) {
  // Since stacks can be quite large and we pass a lot of them, we filter them out eagerly
  // to save bandwidth even in DEV. We'll also replay these stacks on the client so by
  // stripping them early we avoid that overhead. Otherwise we'd normally just rely on
  // the DevTools or framework's ignore lists to filter them out.
  const filterStackFrame = request.filterStackFrame;
  const filteredStack = [];
  for (let i = 0; i < stack.length; i++) {
    const callsite = stack[i];
    const functionName = callsite[0];
    const url = devirtualizeURL(callsite[1]);
    const lineNumber = callsite[2];
    const columnNumber = callsite[3];
    if (filterStackFrame(url, functionName, lineNumber, columnNumber)) {
      // Use a clone because the Flight protocol isn't yet resilient to deduping
      // objects in the debug info. TODO: Support deduping stacks.
      const clone = callsite.slice(0);
      clone[1] = url;
      filteredStack.push(clone);
    }
  }
  return filteredStack;
}
const ObjectPrototype$1 = Object.prototype;
const stringify = JSON.stringify;

// Serializable values

// Thenable<ReactClientValue>

// task status
const PENDING$1 = 0;
const COMPLETED = 1;
const ABORTED = 3;
const ERRORED$1 = 4;
const RENDERING = 5;
const OPENING = 10;
const OPEN = 11;
const ABORTING = 12;
const CLOSING = 13;
const CLOSED = 14;
const RENDER = 20;
const PRERENDER = 21;
const TaintRegistryObjects = ReactSharedInternalsServer.TaintRegistryObjects,
  TaintRegistryValues = ReactSharedInternalsServer.TaintRegistryValues,
  TaintRegistryByteLengths = ReactSharedInternalsServer.TaintRegistryByteLengths,
  TaintRegistryPendingRequests = ReactSharedInternalsServer.TaintRegistryPendingRequests;
function throwTaintViolation(message) {
  // eslint-disable-next-line react-internal/prod-error-codes
  throw new Error(message);
}
function cleanupTaintQueue(request) {
  const cleanupQueue = request.taintCleanupQueue;
  TaintRegistryPendingRequests.delete(cleanupQueue);
  for (let i = 0; i < cleanupQueue.length; i++) {
    const entryValue = cleanupQueue[i];
    const entry = TaintRegistryValues.get(entryValue);
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
  const abortSet = new Set();
  const pingedTasks = [];
  const cleanupQueue = [];
  {
    TaintRegistryPendingRequests.add(cleanupQueue);
  }
  const hints = createHints();
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
  const rootTask = createTask(this, model, null, false, createRootFormatContext(), abortSet);
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

  // $FlowFixMe[invalid-constructor]: the shapes are exact here but Flow doesn't like constructors
  return new RequestInstance(RENDER, model, bundlerConfig, onError, noop, noop, identifierPrefix, temporaryReferences);
}
function createPrerenderRequest(model, bundlerConfig, onAllReady, onFatalError, onError, identifierPrefix, temporaryReferences, debugStartTime,
// Profiling-only
environmentName,
// DEV-only
filterStackFrame,
// DEV-only
keepDebugAlive // DEV-only
) {

  // $FlowFixMe[invalid-constructor]: the shapes are exact here but Flow doesn't like constructors
  return new RequestInstance(PRERENDER, model, bundlerConfig, onError, onAllReady, onFatalError, identifierPrefix, temporaryReferences);
}
let currentRequest = null;
function resolveRequest() {
  if (currentRequest) return currentRequest;
  if (supportsRequestStorage) {
    const store = requestStorage.getStore();
    if (store) return store;
  }
  return null;
}
function serializeThenable(request, task, thenable) {
  const newTask = createTask(request, thenable,
  // will be replaced by the value before we retry. used for debug info.
  task.keyPath,
  // the server component sequence continues through Promise-as-a-child.
  task.implicitSlot, task.formatContext, request.abortableTasks);
  switch (thenable.status) {
    case 'fulfilled':
      {
        // We have the resolved value, we can go ahead and schedule it for serialization.
        newTask.model = thenable.value;
        pingTask(request, newTask);
        return newTask.id;
      }
    case 'rejected':
      {
        const x = thenable.reason;
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
            const errorId = request.fatalError;
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
        const pendingThenable = thenable;
        pendingThenable.status = 'pending';
        pendingThenable.then(fulfilledValue => {
          if (thenable.status === 'pending') {
            const fulfilledThenable = thenable;
            fulfilledThenable.status = 'fulfilled';
            fulfilledThenable.value = fulfilledValue;
          }
        }, error => {
          if (thenable.status === 'pending') {
            const rejectedThenable = thenable;
            rejectedThenable.status = 'rejected';
            rejectedThenable.reason = error;
          }
        });
        break;
      }
  }
  thenable.then(value => {
    newTask.model = value;
    pingTask(request, newTask);
  }, reason => {
    if (newTask.status === PENDING$1) {
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
  let supportsBYOB = stream.supportsBYOB;
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
  const isByteStream = supportsBYOB;
  const reader = stream.getReader();

  // This task won't actually be retried. We just use it to attempt synchronous renders.
  const streamTask = createTask(request, task.model, task.keyPath, task.implicitSlot, task.formatContext, request.abortableTasks);

  // The task represents the Stop row. This adds a Start row.
  request.pendingChunks++;
  const startStreamRow = streamTask.id.toString(16) + ':' + (isByteStream ? 'r' : 'R') + '\n';
  request.completedRegularChunks.push(stringToChunk(startStreamRow));
  function progress(entry) {
    if (streamTask.status !== PENDING$1) {
      return;
    }
    if (entry.done) {
      streamTask.status = COMPLETED;
      const endStreamRow = streamTask.id.toString(16) + ':C\n';
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
          const chunk = streamTask.model;
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
    const signal = request.cacheController.signal;
    signal.removeEventListener('abort', abortStream);
    const reason = signal.reason;
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
  const isIterator = iterable === iterator;

  // This task won't actually be retried. We just use it to attempt synchronous renders.
  const streamTask = createTask(request, task.model, task.keyPath, task.implicitSlot, task.formatContext, request.abortableTasks);

  // The task represents the Stop row. This adds a Start row.
  request.pendingChunks++;
  const startStreamRow = streamTask.id.toString(16) + ':' + (isIterator ? 'x' : 'X') + '\n';
  request.completedRegularChunks.push(stringToChunk(startStreamRow));
  function progress(entry) {
    if (streamTask.status !== PENDING$1) {
      return;
    }
    if (entry.done) {
      streamTask.status = COMPLETED;
      let endStreamRow;
      if (entry.value === undefined) {
        endStreamRow = streamTask.id.toString(16) + ':C\n';
      } else {
        // Unlike streams, the last value may not be undefined. If it's not
        // we outline it and encode a reference to it in the closing instruction.
        try {
          const chunkId = outlineModel(request, entry.value);
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
        if (false) ; else {
          iterator.next().then(progress, error);
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
    const signal = request.cacheController.signal;
    signal.removeEventListener('abort', abortIterable);
    const reason = signal.reason;
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
    iterator.next().then(progress, error);
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
  const thenable = wakeable;
  switch (thenable.status) {
    case 'fulfilled':
      {
        return thenable.value;
      }
    case 'rejected':
      break;
    default:
      {
        if (typeof thenable.status === 'string') {
          // Only instrument the thenable if the status if not defined. If
          // it's defined, but an unknown value, assume it's been instrumented by
          // some custom userspace implementation. We treat it as "pending".
          break;
        }
        const pendingThenable = thenable;
        pendingThenable.status = 'pending';
        pendingThenable.then(fulfilledValue => {
          if (thenable.status === 'pending') {
            const fulfilledThenable = thenable;
            fulfilledThenable.status = 'fulfilled';
            fulfilledThenable.value = fulfilledValue;
          }
        }, error => {
          if (thenable.status === 'pending') {
            const rejectedThenable = thenable;
            rejectedThenable.status = 'rejected';
            rejectedThenable.reason = error;
          }
        });
        break;
      }
  }
  const lazyType = {
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
  const componentDebugInfo = {
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
  const debugTask = task.debugTask;
  try {
    if (debugTask) {
      return debugTask.run(callback.bind(null, arg));
    }
    return callback(arg);
  } finally {
  }
}
const voidHandler = () => {};
function processServerComponentReturnValue(request, task, Component, result) {
  // A Server Component's return value has a few special properties due to being
  // in the return position of a Component. We convert them here.
  if (typeof result !== 'object' || result === null || isClientReference(result)) {
    return result;
  }
  if (typeof result.then === 'function') {
    // TODO: Once we accept Promises as children on the client, we can just return
    // the thenable here.
    return createLazyWrapperAroundWakeable(request, task, result);
  }

  // Normally we'd serialize an Iterator/AsyncIterator as a single-shot which is not compatible
  // to be rendered as a React Child. However, because we have the function to recreate
  // an iterable from rendering the element again, we can effectively treat it as multi-
  // shot. Therefore we treat this as an Iterable/AsyncIterable, whether it was one or not, by
  // adding a wrapper so that this component effectively renders down to an AsyncIterable.
  const iteratorFn = getIteratorFn(result);
  if (iteratorFn) {
    const iterableChild = result;
    const multiShot = {
      [Symbol.iterator]: function () {
        const iterator = iteratorFn.call(iterableChild);
        return iterator;
      }
    };
    return multiShot;
  }
  if (typeof result[ASYNC_ITERATOR] === 'function' && (typeof ReadableStream !== 'function' || !(result instanceof ReadableStream))) {
    const iterableChild = result;
    const multishot = {
      [ASYNC_ITERATOR]: function () {
        const iterator = iterableChild[ASYNC_ITERATOR]();
        return iterator;
      }
    };
    return multishot;
  }
  return result;
}
function renderFunctionComponent(request, task, key, Component, props, validated // DEV-only
) {
  // Reset the task's thenable state before continuing, so that if a later
  // component suspends we can reuse the same task object. If the same
  // component suspends again, the thenable state will be restored.
  const prevThenableState = task.thenableState;
  task.thenableState = null;
  let result;
  {
    prepareToUseHooksForComponent(prevThenableState);
    // The secondArg is always undefined in Server Components since refs error early.
    const secondArg = undefined;
    result = Component(props, secondArg);
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

  // Apply special cases.
  result = processServerComponentReturnValue(request, task, Component, result);

  // Track this element's key on the Server Component on the keyPath context..
  const prevKeyPath = task.keyPath;
  const prevImplicitSlot = task.implicitSlot;
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
  const json = renderModelDestructive(request, task, emptyRoot, '', result);
  task.keyPath = prevKeyPath;
  task.implicitSlot = prevImplicitSlot;
  return json;
}
function renderFragment(request, task, children) {
  if (task.keyPath !== null) {
    // We have a Server Component that specifies a key but we're now splitting
    // the tree using a fragment.
    const fragment = [REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE, task.keyPath, {
      children
    }];
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
  return children;
}
function renderAsyncFragment(request, task, children, getAsyncIterator) {
  if (task.keyPath !== null) {
    // We have a Server Component that specifies a key but we're now splitting
    // the tree using a fragment.
    const fragment = [REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE, task.keyPath, {
      children
    }];
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
  const asyncIterator = getAsyncIterator.call(children);
  return serializeAsyncIterable(request, task, children, asyncIterator);
}
function renderClientElement(request, task, type, key, props, validated // DEV-only
) {
  // We prepend the terminal client element that actually gets serialized with
  // the keys of any Server Components which are not serialized.
  const keyPath = task.keyPath;
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
  const element = [REACT_ELEMENT_TYPE, type, key, props];
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
let canEmitDebugInfo = false;

// Approximate string length of the currently serializing row.
// Used to power outlining heuristics.
let serializedSize = 0;
const MAX_ROW_SIZE = 3200;
function deferTask(request, task) {
  // Like outlineTask but instead the item is scheduled to be serialized
  // after its parent in the stream.
  const newTask = createTask(request, task.model,
  // the currently rendering element
  task.keyPath,
  // unlike outlineModel this one carries along context
  task.implicitSlot, task.formatContext, request.abortableTasks);
  pingTask(request, newTask);
  return serializeLazyID(newTask.id);
}
function outlineHaltedTask(request, task, allowLazy) {
  // In the future if we track task state for resuming we'll maybe need to
  // construnct an actual task here but since we're never going to retry it
  // we just claim the id and serialize it according to the proper convention
  const taskId = request.nextChunkId++;
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
  if (typeof type === 'function' && !isClientReference(type) && !isOpaqueTemporaryReference(type)) {
    // This is a Server Component.
    return renderFunctionComponent(request, task, key, type, props);
  } else if (type === REACT_FRAGMENT_TYPE && key === null) {
    const prevImplicitSlot = task.implicitSlot;
    if (task.keyPath === null) {
      task.implicitSlot = true;
    }
    const json = renderModelDestructive(request, task, emptyRoot, '', props.children);
    task.implicitSlot = prevImplicitSlot;
    return json;
  } else if (type != null && typeof type === 'object' && !isClientReference(type)) {
    switch (type.$$typeof) {
      case REACT_LAZY_TYPE:
        {
          let wrappedType;
          {
            const payload = type._payload;
            const init = type._init;
            wrappedType = init(payload);
          }
          if (request.status === ABORTING) {
            // lazy initializers are user code and could abort during render
            // we don't wan to return any value resolved from the lazy initializer
            // if it aborts so we interrupt rendering here
            // eslint-disable-next-line no-throw-literal
            throw null;
          }
          return renderElement(request, task, wrappedType, key, ref, props);
        }
      case REACT_FORWARD_REF_TYPE:
        {
          return renderFunctionComponent(request, task, key, type.render, props);
        }
      case REACT_MEMO_TYPE:
        {
          return renderElement(request, task, type.type, key, ref, props);
        }
    }
  } else if (typeof type === 'string') {
    const parentFormatContext = task.formatContext;
    const newFormatContext = getChildFormatContext(parentFormatContext, type, props);
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
  return renderClientElement(request, task, type, key, props);
}
function pingTask(request, task) {
  const pingedTasks = request.pingedTasks;
  pingedTasks.push(task);
  if (pingedTasks.length === 1) {
    request.flushScheduled = request.destination !== null;
    if (request.type === PRERENDER || request.status === OPENING) {
      scheduleMicrotask(() => performWork(request));
    } else {
      scheduleWork(() => performWork(request));
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
  const id = request.nextChunkId++;
  if (typeof model === 'object' && model !== null) {
    // If we're about to write this into a new task we can assign it an ID early so that
    // any other references can refer to the value we're about to write.
    if (keyPath !== null || implicitSlot) ; else {
      request.writtenObjects.set(model, serializeByValueID(id));
    }
  }
  const task = {
    id,
    status: PENDING$1,
    model,
    keyPath,
    implicitSlot,
    formatContext: formatContext,
    ping: () => pingTask(request, task),
    toJSON: function (parentPropertyName, value) {
      const parent = this;
      return renderModel(request, task, parent, parentPropertyName, value);
    },
    thenableState: null
  };
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
  const json = stringify(reference);
  const row = id.toString(16) + ':' + json + '\n';
  return stringToChunk(row);
}
function serializeClientReference(request, parent, parentPropertyName, clientReference) {
  const clientReferenceKey = getClientReferenceKey(clientReference);
  const writtenClientReferences = request.writtenClientReferences;
  const existingId = writtenClientReferences.get(clientReferenceKey);
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
    const clientReferenceMetadata = resolveClientReferenceMetadata(request.bundlerConfig, clientReference);
    request.pendingChunks++;
    const importId = request.nextChunkId++;
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
    const errorId = request.nextChunkId++;
    const digest = logRecoverableError(request, x, null);
    emitErrorChunk(request, errorId, digest);
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
  const newTask = createTask(request, value, null,
  // The way we use outlining is for reusing an object.
  false,
  // It makes no sense for that use case to be contextual.
  formatContext,
  // Except for FormatContext we optimistically use it.
  request.abortableTasks);
  retryTask(request, newTask);
  return newTask.id;
}
function serializeServerReference(request, serverReference) {
  const writtenServerReferences = request.writtenServerReferences;
  const existingId = writtenServerReferences.get(serverReference);
  if (existingId !== undefined) {
    return serializeServerReferenceID(existingId);
  }
  const boundArgs = getServerReferenceBoundArguments(request.bundlerConfig, serverReference);
  const bound = boundArgs === null ? null : Promise.resolve(boundArgs);
  const id = getServerReferenceId(request.bundlerConfig, serverReference);
  const serverReferenceMetadata = {
    id,
    bound
  };
  const metadataId = outlineModel(request, serverReferenceMetadata);
  writtenServerReferences.set(serverReference, metadataId);
  return serializeServerReferenceID(metadataId);
}
function serializeTemporaryReference(request, reference) {
  return '$T' + reference;
}
function serializeLargeTextString(request, text) {
  request.pendingChunks++;
  const textId = request.nextChunkId++;
  emitTextChunk(request, textId, text, false);
  return serializeByValueID(textId);
}
function serializeMap(request, map) {
  const entries = Array.from(map);
  const id = outlineModel(request, entries);
  return '$Q' + id.toString(16);
}
function serializeFormData(request, formData) {
  const entries = Array.from(formData.entries());
  const id = outlineModel(request, entries);
  return '$K' + id.toString(16);
}
function serializeSet(request, set) {
  const entries = Array.from(set);
  const id = outlineModel(request, entries);
  return '$W' + id.toString(16);
}
function serializeIterator(request, iterator) {
  const id = outlineModel(request, Array.from(iterator));
  return '$i' + id.toString(16);
}
function serializeTypedArray(request, tag, typedArray) {
  request.pendingChunks++;
  const bufferId = request.nextChunkId++;
  emitTypedArrayChunk(request, bufferId, tag, typedArray, false);
  return serializeByValueID(bufferId);
}
function serializeBlob(request, blob) {
  const model = [blob.type];
  const newTask = createTask(request, model, null, false, createRootFormatContext(), request.abortableTasks);
  const reader = blob.stream().getReader();
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
    const signal = request.cacheController.signal;
    signal.removeEventListener('abort', abortBlob);
    const reason = signal.reason;
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
let modelRoot = false;
function renderModel(request, task, parent, key, value) {
  // First time we're serializing the key, we should add it to the size.
  serializedSize += key.length;
  const prevKeyPath = task.keyPath;
  const prevImplicitSlot = task.implicitSlot;
  try {
    return renderModelDestructive(request, task, parent, key, value);
  } catch (thrownValue) {
    // If the suspended/errored value was an element or lazy it can be reduced
    // to a lazy reference, so that it doesn't error the parent.
    const model = task.model;
    const wasReactNode = typeof model === 'object' && model !== null && (model.$$typeof === REACT_ELEMENT_TYPE || model.$$typeof === REACT_LAZY_TYPE);
    if (request.status === ABORTING) {
      task.status = ABORTED;
      if (request.type === PRERENDER) {
        // This will create a new task and refer to it in this slot
        // the new task won't be retried because we are aborting
        return outlineHaltedTask(request, task, wasReactNode);
      }
      const errorId = request.fatalError;
      if (wasReactNode) {
        return serializeLazyID(errorId);
      }
      return serializeByValueID(errorId);
    }
    const x = thrownValue === SuspenseException ?
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
        const newTask = createTask(request, task.model, task.keyPath, task.implicitSlot, task.formatContext, request.abortableTasks);
        const ping = newTask.ping;
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
    const errorId = request.nextChunkId++;
    const digest = logRecoverableError(request, x, task);
    emitErrorChunk(request, errorId, digest);
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
          let elementReference = null;
          const writtenObjects = request.writtenObjects;
          if (task.keyPath !== null || task.implicitSlot) ; else {
            const existingReference = writtenObjects.get(value);
            if (existingReference !== undefined) {
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
                return existingReference;
              }
            } else if (parentPropertyName.indexOf(':') === -1) {
              // TODO: If the property name contains a colon, we don't dedupe. Escape instead.
              const parentReference = writtenObjects.get(parent);
              if (parentReference !== undefined) {
                // If the parent has a reference, we can refer to this object indirectly
                // through the property name inside that parent.
                elementReference = parentReference + ':' + parentPropertyName;
                writtenObjects.set(value, elementReference);
              }
            }
          }
          const element = value;
          if (serializedSize > MAX_ROW_SIZE) {
            return deferTask(request, task);
          }
          const props = element.props;
          // TODO: We should get the ref off the props object right before using
          // it.
          const refProp = props.ref;
          const ref = refProp !== undefined ? refProp : null;
          const newChild = renderElement(request, task, element.type,
          // $FlowFixMe[incompatible-call] the key of an element is null | string | ReactOptimisticKey
          element.key, ref, props);
          if (typeof newChild === 'object' && newChild !== null && elementReference !== null) {
            // If this element renders another object, we can now refer to that object through
            // the same location as this element.
            if (!writtenObjects.has(newChild)) {
              writtenObjects.set(newChild, elementReference);
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
          const lazy = value;
          let resolvedModel;
          {
            const payload = lazy._payload;
            const init = lazy._init;
            resolvedModel = init(payload);
          }
          if (request.status === ABORTING) {
            // lazy initializers are user code and could abort during render
            // we don't wan to return any value resolved from the lazy initializer
            // if it aborts so we interrupt rendering here
            // eslint-disable-next-line no-throw-literal
            throw null;
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
      const tempRef = resolveTemporaryReference(request.temporaryReferences, value);
      if (tempRef !== undefined) {
        return serializeTemporaryReference(request, tempRef);
      }
    }
    {
      const tainted = TaintRegistryObjects.get(value);
      if (tainted !== undefined) {
        throwTaintViolation(tainted);
      }
    }
    const writtenObjects = request.writtenObjects;
    const existingReference = writtenObjects.get(value);
    // $FlowFixMe[method-unbinding]
    if (typeof value.then === 'function') {
      if (existingReference !== undefined) {
        if (task.keyPath !== null || task.implicitSlot) {
          // If we're in some kind of context we can't reuse the result of this render or
          // previous renders of this element. We only reuse Promises if they're not wrapped
          // by another Server Component.
          const promiseId = serializeThenable(request, task, value);
          return serializePromiseID(promiseId);
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
      const promiseId = serializeThenable(request, task, value);
      const promiseReference = serializePromiseID(promiseId);
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
      const parentReference = writtenObjects.get(parent);
      if (parentReference !== undefined) {
        // If the parent has a reference, we can refer to this object indirectly
        // through the property name inside that parent.
        let propertyName = parentPropertyName;
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
        writtenObjects.set(value, parentReference + ':' + propertyName);
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
      return serializeErrorValue();
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
    const iteratorFn = getIteratorFn(value);
    if (iteratorFn) {
      // TODO: Should we serialize the return value as well like we do for AsyncIterables?
      const iterator = iteratorFn.call(value);
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
    const getAsyncIterator = value[ASYNC_ITERATOR];
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
    const proto = getPrototypeOf(value);
    if (proto !== ObjectPrototype$1 && (proto === null || getPrototypeOf(proto) !== null)) {
      throw new Error('Only plain objects, and a few built-ins, can be passed to Client Components ' + 'from Server Components. Classes or null prototypes are not supported.' + describeObjectForErrorMessage(parent, parentPropertyName));
    }

    // $FlowFixMe[incompatible-return]
    return value;
  }
  if (typeof value === 'string') {
    {
      const tainted = TaintRegistryValues.get(value);
      if (tainted !== undefined) {
        throwTaintViolation(tainted.message);
      }
    }
    serializedSize += value.length;
    // TODO: Maybe too clever. If we support URL there's no similar trick.
    if (value[value.length - 1] === 'Z') {
      // Possibly a Date, whose toJSON automatically calls toISOString
      // $FlowFixMe[incompatible-use]
      const originalValue = parent[parentPropertyName];
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
      const tempRef = resolveTemporaryReference(request.temporaryReferences, value);
      if (tempRef !== undefined) {
        return serializeTemporaryReference(request, tempRef);
      }
    }
    {
      const tainted = TaintRegistryObjects.get(value);
      if (tainted !== undefined) {
        throwTaintViolation(tainted);
      }
    }
    if (isOpaqueTemporaryReference(value)) {
      throw new Error('Could not reference an opaque temporary reference. ' + 'This is likely due to misconfiguring the temporaryReferences options ' + 'on the server.');
    } else if (/^on[A-Z]/.test(parentPropertyName)) {
      throw new Error('Event handlers cannot be passed to Client Component props.' + describeObjectForErrorMessage(parent, parentPropertyName) + '\nIf you need interactivity, consider converting part of this to a Client Component.');
    } else {
      throw new Error('Functions cannot be passed directly to Client Components ' + 'unless you explicitly expose it by marking it with "use server". ' + 'Or maybe you meant to call this function rather than return it.' + describeObjectForErrorMessage(parent, parentPropertyName));
    }
  }
  if (typeof value === 'symbol') {
    const writtenSymbols = request.writtenSymbols;
    const existingId = writtenSymbols.get(value);
    if (existingId !== undefined) {
      return serializeByValueID(existingId);
    }
    // $FlowFixMe[incompatible-type] `description` might be undefined
    const name = value.description;
    if (Symbol.for(name) !== value) {
      throw new Error('Only global symbols received from Symbol.for(...) can be passed to Client Components. ' + ("The symbol Symbol.for(" +
      // $FlowFixMe[incompatible-type] `description` might be undefined
      value.description + ") cannot be found among global symbols.") + describeObjectForErrorMessage(parent, parentPropertyName));
    }
    request.pendingChunks++;
    const symbolId = request.nextChunkId++;
    emitSymbolChunk(request, symbolId, name);
    writtenSymbols.set(value, symbolId);
    return serializeByValueID(symbolId);
  }
  if (typeof value === 'bigint') {
    {
      const tainted = TaintRegistryValues.get(value);
      if (tainted !== undefined) {
        throwTaintViolation(tainted.message);
      }
    }
    return serializeBigInt(value);
  }
  throw new Error("Type " + typeof value + " is not supported in Client Component props." + describeObjectForErrorMessage(parent, parentPropertyName));
}
function logRecoverableError(request, error, task // DEV-only
) {
  const prevRequest = currentRequest;
  // We clear the request context so that console.logs inside the callback doesn't
  // get forwarded to the client.
  currentRequest = null;
  let errorDigest;
  try {
    const onError = request.onError;
    if (false && task !== null) ; else if (supportsRequestStorage) {
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
  const onFatalError = request.onFatalError;
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
  const abortReason = new Error('The render was aborted due to a fatal error.', {
    cause: error
  });
  request.cacheController.abort(abortReason);
}
function serializeErrorValue(request, error) {
  {
    // In prod we don't emit any information about this Error object to avoid
    // unintentional leaks. Since this doesn't actually throw on the server
    // we don't go through onError and so don't register any digest neither.
    return '$Z';
  }
}
function emitErrorChunk(request, id, digest, error, debug,
// DEV-only
owner // DEV-only
) {
  let errorInfo;
  {
    errorInfo = {
      digest
    };
  }
  const row = serializeRowHeader('E', id) + stringify(errorInfo) + '\n';
  const processedChunk = stringToChunk(row);
  {
    request.completedErrorChunks.push(processedChunk);
  }
}
function emitImportChunk(request, id, clientReferenceMetadata, debug) {
  // $FlowFixMe[incompatible-type] stringify can return null
  const json = stringify(clientReferenceMetadata);
  const row = serializeRowHeader('I', id) + json + '\n';
  const processedChunk = stringToChunk(row);
  {
    request.completedImportChunks.push(processedChunk);
  }
}
function emitHintChunk(request, code, model) {
  const json = stringify(model);
  const row = ':H' + code + json + '\n';
  const processedChunk = stringToChunk(row);
  request.completedHintChunks.push(processedChunk);
}
function emitSymbolChunk(request, id, name) {
  const symbolReference = serializeSymbolReference(name);
  const processedChunk = encodeReferenceChunk(request, id, symbolReference);
  request.completedImportChunks.push(processedChunk);
}
function emitModelChunk(request, id, json) {
  const row = id.toString(16) + ':' + json + '\n';
  const processedChunk = stringToChunk(row);
  request.completedRegularChunks.push(processedChunk);
}
function emitDebugChunk(request, id, debugInfo) {
  {
    // These errors should never make it into a build so we don't need to encode them in codes.json
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error('emitDebugChunk should never be called in production mode. This is a bug in React.');
  }
}
function emitTypedArrayChunk(request, id, tag, typedArray, debug) {
  {
    if (TaintRegistryByteLengths.has(typedArray.byteLength)) {
      // If we have had any tainted values of this length, we check
      // to see if these bytes matches any entries in the registry.
      const tainted = TaintRegistryValues.get(binaryToComparableString(typedArray));
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
  const binaryChunk = typedArrayToBinaryChunk(typedArray);
  const binaryLength = byteLengthOfBinaryChunk(binaryChunk);
  const row = id.toString(16) + ':' + tag + binaryLength.toString(16) + ',';
  const headerChunk = stringToChunk(row);
  {
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
  const textChunk = stringToChunk(text);
  const binaryLength = byteLengthOfChunk(textChunk);
  const row = id.toString(16) + ':T' + binaryLength.toString(16) + ',';
  const headerChunk = stringToChunk(row);
  {
    request.completedRegularChunks.push(headerChunk, textChunk);
  }
}
function markOperationEndTime(request, task, timestamp) {
  {
    return;
  }
}
function emitChunk(request, task, value) {
  const id = task.id;
  // For certain types we have special types, we typically outlined them but
  // we can emit them directly for this row instead of through an indirection.
  if (typeof value === 'string' && byteLengthOfChunk !== null) {
    {
      const tainted = TaintRegistryValues.get(value);
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
  const json = stringify(value, task.toJSON);
  emitModelChunk(request, task.id, json);
}
function erroredTask(request, task, error) {
  task.status = ERRORED$1;
  const digest = logRecoverableError(request, error, task);
  emitErrorChunk(request, task.id, digest);
  request.abortableTasks.delete(task);
  callOnAllReadyIfReady(request);
}
const emptyRoot = {};
function retryTask(request, task) {
  if (task.status !== PENDING$1) {
    // We completed this by other means before we had a chance to retry it.
    return;
  }
  task.status = RENDERING;

  // We stash the outer parent size so we can restore it when we exit.
  const parentSerializedSize = serializedSize;
  // We don't reset the serialized size counter from reentry because that indicates that we
  // are outlining a model and we actually want to include that size into the parent since
  // it will still block the parent row. It only restores to zero at the top of the stack.
  try {
    // Track the root so we know that we have to emit this object even though it
    // already has an ID. This is needed because we might see this object twice
    // in the same toJSON if it is cyclic.
    modelRoot = task.model;
    if (false) ;

    // We call the destructive form that mutates this task. That way if something
    // suspends again, we can reuse the same task instead of spawning a new one.
    const resolvedModel = renderModelDestructive(request, task, emptyRoot, '', task.model);
    if (false) ;

    // Track the root again for the resolved object.
    modelRoot = resolvedModel;

    // The keyPath resets at any terminal child node.
    task.keyPath = null;
    task.implicitSlot = false;
    if (false) ;
    // We've finished rendering. Log the end time.
    if (enableProfilerTimer && (enableComponentPerformanceTrack || enableAsyncDebugInfo)) ;
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
      const json = stringify(resolvedModel);
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
        const errorId = request.fatalError;
        abortTask(task);
        finishAbortedTask(task, request, errorId);
      }
      return;
    }
    const x = thrownValue === SuspenseException ?
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
        const ping = task.ping;
        x.then(ping, ping);
        return;
      }
    }
    erroredTask(request, task, x);
  } finally {
    serializedSize = parentSerializedSize;
  }
}
function tryStreamTask(request, task) {
  const parentSerializedSize = serializedSize;
  try {
    emitChunk(request, task, task.model);
  } finally {
    serializedSize = parentSerializedSize;
  }
}
function performWork(request) {
  const prevDispatcher = ReactSharedInternalsServer.H;
  ReactSharedInternalsServer.H = HooksDispatcher;
  const prevRequest = currentRequest;
  currentRequest = request;
  prepareToUseHooksForRequest(request);
  try {
    const pingedTasks = request.pingedTasks;
    request.pingedTasks = [];
    for (let i = 0; i < pingedTasks.length; i++) {
      const task = pingedTasks[i];
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
  // Instead of emitting an error per task.id, we emit a model that only
  // has a single value referencing the error.
  const ref = serializeByValueID(errorId);
  const processedChunk = encodeReferenceChunk(request, task.id, ref);
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
  // We don't actually emit anything for this task id because we are intentionally
  // leaving the reference unfulfilled.
  request.pendingChunks--;
}
function flushCompletedChunks(request) {
  const destination = request.destination;
  if (destination !== null) {
    beginWriting();
    try {
      // We emit module chunks first in the stream so that
      // they can be preloaded as early as possible.
      const importsChunks = request.completedImportChunks;
      let i = 0;
      for (; i < importsChunks.length; i++) {
        request.pendingChunks--;
        const chunk = importsChunks[i];
        const keepWriting = writeChunkAndReturn(destination, chunk);
        if (!keepWriting) ;
      }
      importsChunks.splice(0, i);

      // Next comes hints.
      const hintChunks = request.completedHintChunks;
      i = 0;
      for (; i < hintChunks.length; i++) {
        const chunk = hintChunks[i];
        const keepWriting = writeChunkAndReturn(destination, chunk);
        if (!keepWriting) ;
      }
      hintChunks.splice(0, i);

      // Debug meta data comes before the model data because it will often end up blocking the model from
      // completing since the JSX will reference the debug data.
      if (false && request.debugDestination === null) ;

      // Next comes model data.
      const regularChunks = request.completedRegularChunks;
      i = 0;
      for (; i < regularChunks.length; i++) {
        request.pendingChunks--;
        const chunk = regularChunks[i];
        const keepWriting = writeChunkAndReturn(destination, chunk);
        if (!keepWriting) ;
      }
      regularChunks.splice(0, i);

      // Finally, errors are sent. The idea is that it's ok to delay
      // any error messages and prioritize display of other parts of
      // the page.
      const errorChunks = request.completedErrorChunks;
      i = 0;
      for (; i < errorChunks.length; i++) {
        request.pendingChunks--;
        const chunk = errorChunks[i];
        const keepWriting = writeChunkAndReturn(destination, chunk);
        if (!keepWriting) ;
      }
      errorChunks.splice(0, i);
    } finally {
      request.flushScheduled = false;
      completeWriting(destination);
    }
  }
  if (request.pendingChunks === 0) {
    // We're done.
    {
      cleanupTaintQueue(request);
    }
    if (request.status < ABORTING) {
      const abortReason = new Error('This render completed successfully. All cacheSignals are now aborted to allow clean up of any unused resources.');
      request.cacheController.abort(abortReason);
    }
    if (request.destination !== null) {
      request.status = CLOSED;
      close$1(request.destination);
      request.destination = null;
    }
  }
}
function startWork(request) {
  request.flushScheduled = request.destination !== null;
  if (supportsRequestStorage) {
    scheduleMicrotask(() => {
      requestStorage.run(request, performWork, request);
    });
  } else {
    scheduleMicrotask(() => performWork(request));
  }
  scheduleWork(() => {
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
  request.destination !== null || false )) {
    request.flushScheduled = true;
    // Unlike startWork and pingTask we intetionally use scheduleWork
    // here even during prerenders to allow as much batching as possible
    scheduleWork(() => {
      request.flushScheduled = false;
      flushCompletedChunks(request);
    });
  }
}
function callOnAllReadyIfReady(request) {
  if (request.abortableTasks.size === 0) {
    const onAllReady = request.onAllReady;
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
function stopFlowing(request) {
  request.destination = null;
}
function finishHalt(request, abortedTasks) {
  try {
    abortedTasks.forEach(task => finishHaltedTask(task, request));
    const onAllReady = request.onAllReady;
    onAllReady();
    flushCompletedChunks(request);
  } catch (error) {
    logRecoverableError(request, error, null);
    fatalError(request, error);
  }
}
function finishAbort(request, abortedTasks, errorId) {
  try {
    abortedTasks.forEach(task => finishAbortedTask(task, request, errorId));
    const onAllReady = request.onAllReady;
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
    if (enableProfilerTimer && (enableComponentPerformanceTrack || enableAsyncDebugInfo)) ;
    request.cacheController.abort(reason);
    const abortableTasks = request.abortableTasks;
    if (abortableTasks.size > 0) {
      if (enableHalt && request.type === PRERENDER) {
        // When prerendering with halt semantics we simply halt the task
        // and leave the reference unfulfilled.
        abortableTasks.forEach(task => haltTask(task, request));
        scheduleWork(() => finishHalt(request, abortableTasks));
      } else {
        const error = reason === undefined ? new Error('The render was aborted by the server without a reason.') : typeof reason === 'object' && reason !== null && typeof reason.then === 'function' ? new Error('The render was aborted by the server with a promise.') : reason;
        const digest = logRecoverableError(request, error, null);
        // When rendering we produce a shared error chunk and then
        // fulfill each task with a reference to that chunk.
        const errorId = request.nextChunkId++;
        request.fatalError = errorId;
        request.pendingChunks++;
        emitErrorChunk(request, errorId, digest, error, false, null);
        abortableTasks.forEach(task => abortTask(task, request, errorId));
        scheduleWork(() => finishAbort(request, abortableTasks, errorId));
      }
    } else {
      const onAllReady = request.onAllReady;
      onAllReady();
      flushCompletedChunks(request);
    }
  } catch (error) {
    logRecoverableError(request, error, null);
    fatalError(request, error);
  }
}

// This is the parsed shape of the wire format which is why it is
// condensed to only the essentialy information

const ID = 0;
const CHUNKS = 1;
const NAME = 2;
// export const ASYNC = 3;

// This logic is correct because currently only include the 4th tuple member
// when the module is async. If that changes we will need to actually assert
// the value is true. We don't index into the 4th slot because flow does not
// like the potential out of bounds access
function isAsyncImport(metadata) {
  return metadata.length === 4;
}

function resolveServerReference(bundlerConfig, id) {
  let name = '';
  let resolvedModuleData = bundlerConfig[id];
  if (resolvedModuleData) {
    // The potentially aliased name.
    name = resolvedModuleData.name;
  } else {
    // We didn't find this specific export name but we might have the * export
    // which contains this name as well.
    // TODO: It's unfortunate that we now have to parse this string. We should
    // probably go back to encoding path and name separately on the client reference.
    const idx = id.lastIndexOf('#');
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
  const promise = globalThis.__next_require__(id);
  if (typeof promise.then !== 'function') {
    // This wasn't a promise after all.
    return null;
  } else if (promise.status === 'fulfilled') {
    // This module was already resolved earlier.
    return null;
  } else {
    // Instrument the Promise to stash the result.
    promise.then(value => {
      const fulfilledThenable = promise;
      fulfilledThenable.status = 'fulfilled';
      fulfilledThenable.value = value;
    }, reason => {
      const rejectedThenable = promise;
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
const instrumentedChunks = new WeakSet();
const loadedChunks = new WeakSet();
function ignoreReject() {
  // We rely on rejected promises to be handled by another listener.
}
// Start preloading the modules since we might need them soon.
// This function doesn't suspend.
function preloadModule(metadata) {
  const chunks = metadata[CHUNKS];
  const promises = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunkFilename = chunks[i];
    const thenable = loadChunk(chunkFilename);
    if (!loadedChunks.has(thenable)) {
      promises.push(thenable);
    }
    if (!instrumentedChunks.has(thenable)) {
      // $FlowFixMe[method-unbinding]
      const resolve = loadedChunks.add.bind(loadedChunks, thenable);
      thenable.then(resolve, ignoreReject);
      instrumentedChunks.add(thenable);
    }
  }
  if (isAsyncImport(metadata)) {
    if (promises.length === 0) {
      return requireAsyncModule(metadata[ID]);
    } else {
      return Promise.all(promises).then(() => {
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
  let moduleExports = globalThis.__next_require__(metadata[ID]);
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

// The server acts as a Client of itself when resolving Server References.
// That's why we import the Client configuration from the Server.
// Everything is aliased as their Server equivalence for clarity.

const PENDING = 'pending';
const BLOCKED = 'blocked';
const RESOLVED_MODEL = 'resolved_model';
const INITIALIZED = 'fulfilled';
const ERRORED = 'rejected';

// Fake symbol type.
const RESPONSE_SYMBOL = Symbol();

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
  const chunk = this;
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
        let inspectedValue = chunk.value;
        // Recursively check if the value is itself a ReactPromise and if so if it points
        // back to itself. This helps catch recursive thenables early error.
        let cycleProtection = 0;
        const visited = new Set();
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
const ObjectPrototype = Object.prototype;
const ArrayPrototype = Array.prototype;
function getRoot(response) {
  const chunk = getChunk(response, 0);
  return chunk;
}
function createPendingChunk(response) {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(PENDING, null, null);
}
function wakeChunk(response, listeners, value) {
  for (let i = 0; i < listeners.length; i++) {
    const listener = listeners[i];
    if (typeof listener === 'function') {
      listener(value);
    } else {
      fulfillReference(response, listener, value);
    }
  }
}
function rejectChunk(response, listeners, error) {
  for (let i = 0; i < listeners.length; i++) {
    const listener = listeners[i];
    if (typeof listener === 'function') {
      listener(error);
    } else {
      rejectReference(response, listener.handler, error);
    }
  }
}
function resolveBlockedCycle(resolvedChunk, reference) {
  const referencedChunk = reference.handler.chunk;
  if (referencedChunk === null) {
    return null;
  }
  if (referencedChunk === resolvedChunk) {
    // We found the cycle. We can resolve the blocked cycle now.
    return reference.handler;
  }
  const resolveListeners = referencedChunk.value;
  if (resolveListeners !== null) {
    for (let i = 0; i < resolveListeners.length; i++) {
      const listener = resolveListeners[i];
      if (typeof listener !== 'function') {
        const foundHandler = resolveBlockedCycle(resolvedChunk, listener);
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
      for (let i = 0; i < resolveListeners.length; i++) {
        const listener = resolveListeners[i];
        if (typeof listener !== 'function') {
          const reference = listener;
          const cyclicHandler = resolveBlockedCycle(chunk, reference);
          if (cyclicHandler !== null) {
            // This reference points back to this chunk. We can resolve the cycle by
            // using the value from that handler.
            fulfillReference(response, reference, cyclicHandler.value);
            resolveListeners.splice(i, 1);
            i--;
            if (rejectListeners !== null) {
              const rejectionIdx = rejectListeners.indexOf(reference);
              if (rejectionIdx !== -1) {
                rejectListeners.splice(rejectionIdx, 1);
              }
            }
            // The status might have changed after fulfilling the reference.
            switch (chunk.status) {
              case INITIALIZED:
                const initializedChunk = chunk;
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
        for (let i = 0; i < resolveListeners.length; i++) {
          chunk.value.push(resolveListeners[i]);
        }
      } else {
        chunk.value = resolveListeners;
      }
      if (chunk.reason) {
        if (rejectListeners) {
          for (let i = 0; i < rejectListeners.length; i++) {
            chunk.reason.push(rejectListeners[i]);
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
    const streamChunk = chunk;
    const controller = streamChunk.reason;
    // $FlowFixMe[incompatible-call]: The error method should accept mixed.
    controller.error(error);
    return;
  }
  const listeners = chunk.reason;
  const erroredChunk = chunk;
  erroredChunk.status = ERRORED;
  erroredChunk.reason = error;
  if (listeners !== null) {
    rejectChunk(response, listeners, error);
  }
}
function createResolvedModelChunk(response, value, id) {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(RESOLVED_MODEL, value, {
    id,
    [RESPONSE_SYMBOL]: response
  });
}
function createErroredChunk(response, reason) {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(ERRORED, null, reason);
}
function resolveModelChunk(response, chunk, value, id) {
  if (chunk.status !== PENDING) {
    // If we get more data to an already resolved ID, we assume that it's
    // a stream chunk since any other row shouldn't have more than one entry.
    const streamChunk = chunk;
    const controller = streamChunk.reason;
    if (value[0] === 'C') {
      controller.close(value === 'C' ? '"$undefined"' : value.slice(1));
    } else {
      controller.enqueueModel(value);
    }
    return;
  }
  const resolveListeners = chunk.value;
  const rejectListeners = chunk.reason;
  const resolvedChunk = chunk;
  resolvedChunk.status = RESOLVED_MODEL;
  resolvedChunk.value = value;
  resolvedChunk.reason = {
    id,
    [RESPONSE_SYMBOL]: response
  };
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
  const iteratorResultJSON = (done ? '{"done":true,"value":' : '{"done":false,"value":') + value + '}';
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(RESOLVED_MODEL, iteratorResultJSON, {
    id: -1,
    [RESPONSE_SYMBOL]: response
  });
}
function resolveIteratorResultChunk(response, chunk, value, done) {
  // To reuse code as much code as possible we add the wrapper element as part of the JSON.
  const iteratorResultJSON = (done ? '{"done":true,"value":' : '{"done":false,"value":') + value + '}';
  resolveModelChunk(response, chunk, iteratorResultJSON, -1);
}
function loadServerReference$1(response, metaData, parentObject, key) {
  const id = metaData.id;
  if (typeof id !== 'string') {
    return null;
  }
  if (key === 'then') {
    // This should never happen because we always serialize objects with then-functions
    // as "thenable" which reduces to ReactPromise with no other fields.
    return null;
  }
  const serverReference = resolveServerReference(response._bundlerConfig, id);
  // We expect most servers to not really need this because you'd just have all
  // the relevant modules already loaded but it allows for lazy loading of code
  // if needed.
  const bound = metaData.bound;
  let promise = preloadModule(serverReference);
  if (!promise) {
    if (bound instanceof ReactPromise) {
      promise = Promise.resolve(bound);
    } else {
      const resolvedValue = requireModule(serverReference);
      return resolvedValue;
    }
  } else if (bound instanceof ReactPromise) {
    promise = Promise.all([promise, bound]);
  }
  let handler;
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
    let resolvedValue = requireModule(serverReference);
    if (metaData.bound) {
      // This promise is coming from us and should have initilialized by now.
      const promiseValue = metaData.bound.value;
      const boundArgs = Array.isArray(promiseValue) ? promiseValue.slice(0) : [];
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
      const chunk = handler.chunk;
      if (chunk === null || chunk.status !== BLOCKED) {
        return;
      }
      const resolveListeners = chunk.value;
      const initializedChunk = chunk;
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
    const chunk = handler.chunk;
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
      for (let i = 0; i < value.length; i++) {
        const childRef = reference !== undefined ? reference + ':' + i : undefined;
        // $FlowFixMe[cannot-write]
        value[i] = reviveModel(response, value, '' + i, value[i], childRef);
      }
    } else {
      for (const key in value) {
        if (hasOwnProperty.call(value, key)) {
          const childRef = reference !== undefined && key.indexOf(':') === -1 ? reference + ':' + key : undefined;
          const newValue = reviveModel(response, value, key, value[key], childRef);
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
let initializingHandler = null;
function initializeModelChunk(chunk) {
  const prevHandler = initializingHandler;
  initializingHandler = null;
  const _chunk$reason = chunk.reason,
    response = _chunk$reason[RESPONSE_SYMBOL],
    id = _chunk$reason.id;
  const rootReference = id === -1 ? undefined : id.toString(16);
  const resolvedModel = chunk.value;

  // We go to the BLOCKED state until we've fully resolved this.
  // We do this before parsing in case we try to initialize the same chunk
  // while parsing the model. Such as in a cyclic reference.
  const cyclicChunk = chunk;
  cyclicChunk.status = BLOCKED;
  cyclicChunk.value = null;
  cyclicChunk.reason = null;
  try {
    const rawModel = JSON.parse(resolvedModel);
    const value = reviveModel(response, {
      '': rawModel
    }, '', rawModel, rootReference);

    // Invoke any listeners added while resolving this model. I.e. cyclic
    // references. This may or may not fully resolve the model depending on
    // if they were blocked.
    const resolveListeners = cyclicChunk.value;
    if (resolveListeners !== null) {
      cyclicChunk.value = null;
      cyclicChunk.reason = null;
      for (let i = 0; i < resolveListeners.length; i++) {
        const listener = resolveListeners[i];
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
    const initializedChunk = chunk;
    initializedChunk.status = INITIALIZED;
    initializedChunk.value = value;
    initializedChunk.reason = null;
  } catch (error) {
    const erroredChunk = chunk;
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
  response._chunks.forEach(chunk => {
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
  const chunks = response._chunks;
  let chunk = chunks.get(id);
  if (!chunk) {
    const prefix = response._prefix;
    const key = prefix + id;
    // Check if we have this field in the backing store already.
    const backingEntry = response._formData.get(key);
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
  const handler = reference.handler,
    parentObject = reference.parentObject,
    key = reference.key,
    map = reference.map,
    path = reference.path;
  try {
    for (let i = 1; i < path.length; i++) {
      // The server doesn't have any lazy references so we don't expect to go through a Promise.
      const name = path[i];
      if (typeof value === 'object' && value !== null && (getPrototypeOf(value) === ObjectPrototype || getPrototypeOf(value) === ArrayPrototype) && hasOwnProperty.call(value, name)) {
        value = value[name];
      } else {
        throw new Error('Invalid reference.');
      }
    }
    const mappedValue = map(response, value, parentObject, key);
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
    const chunk = handler.chunk;
    if (chunk === null || chunk.status !== BLOCKED) {
      return;
    }
    const resolveListeners = chunk.value;
    const initializedChunk = chunk;
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
  const chunk = handler.chunk;
  if (chunk === null || chunk.status !== BLOCKED) {
    return;
  }
  // There's no debug info to forward in this direction.
  triggerErrorOnChunk(response, chunk, error);
}
function waitForReference(referencedChunk, parentObject, key, response, map, path) {
  let handler;
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
  const reference = {
    handler,
    parentObject,
    key,
    map,
    path
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
  const path = reference.split(':');
  const id = parseInt(path[0], 16);
  const chunk = getChunk(response, id);
  switch (chunk.status) {
    case RESOLVED_MODEL:
      initializeModelChunk(chunk);
      break;
  }
  // The status might have changed after initialization.
  switch (chunk.status) {
    case INITIALIZED:
      let value = chunk.value;
      for (let i = 1; i < path.length; i++) {
        const name = path[i];
        if (typeof value === 'object' && value !== null && (getPrototypeOf(value) === ObjectPrototype || getPrototypeOf(value) === ArrayPrototype) && hasOwnProperty.call(value, name)) {
          value = value[name];
        } else {
          throw new Error('Invalid reference.');
        }
      }
      const chunkValue = map(response, value, parentObject, key);
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
  const id = parseInt(reference.slice(2), 16);
  const prefix = response._prefix;
  const key = prefix + id;
  const chunks = response._chunks;
  if (chunks.has(id)) {
    throw new Error('Already initialized typed array.');
  }

  // We should have this backingEntry in the store already because we emitted
  // it before referencing it. It should be a Blob.
  // TODO: Use getOutlinedModel to allow us to emit the Blob later. We should be able to do that now.
  const backingEntry = response._formData.get(key);
  const promise = backingEntry.arrayBuffer();

  // Since loading the buffer is an async operation we'll be blocking the parent
  // chunk.

  let handler;
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
    const resolvedValue = constructor === ArrayBuffer ? buffer : new constructor(buffer);
    parentObject[parentKey] = resolvedValue;

    // If this is the root object for a model reference, where `handler.value`
    // is a stale `null`, the resolved value can be used directly.
    if (parentKey === '' && handler.value === null) {
      handler.value = resolvedValue;
    }
    handler.deps--;
    if (handler.deps === 0) {
      const chunk = handler.chunk;
      if (chunk === null || chunk.status !== BLOCKED) {
        return;
      }
      const resolveListeners = chunk.value;
      const initializedChunk = chunk;
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
    const chunk = handler.chunk;
    if (chunk === null || chunk.status !== BLOCKED) {
      return;
    }
    triggerErrorOnChunk(response, chunk, error);
  }
  promise.then(fulfill, reject);
  return null;
}
function resolveStream(response, id, stream, controller) {
  const chunks = response._chunks;
  const chunk = createInitializedStreamChunk(response, stream, controller);
  chunks.set(id, chunk);
  const prefix = response._prefix;
  const key = prefix + id;
  const existingEntries = response._formData.getAll(key);
  for (let i = 0; i < existingEntries.length; i++) {
    const value = existingEntries[i];
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
  const id = parseInt(reference.slice(2), 16);
  const chunks = response._chunks;
  if (chunks.has(id)) {
    throw new Error('Already initialized stream.');
  }
  let controller = null;
  let closed = false;
  const stream = new ReadableStream({
    type: type,
    start(c) {
      controller = c;
    }
  });
  let previousBlockedChunk = null;
  const flightController = {
    enqueueModel(json) {
      if (previousBlockedChunk === null) {
        // If we're not blocked on any other chunks, we can try to eagerly initialize
        // this as a fast-path to avoid awaiting them.
        const chunk = createResolvedModelChunk(response, json, -1);
        initializeModelChunk(chunk);
        const initializedChunk = chunk;
        if (initializedChunk.status === INITIALIZED) {
          controller.enqueue(initializedChunk.value);
        } else {
          chunk.then(v => controller.enqueue(v), e => controller.error(e));
          previousBlockedChunk = chunk;
        }
      } else {
        // We're still waiting on a previous chunk so we can't enqueue quite yet.
        const blockedChunk = previousBlockedChunk;
        const chunk = createPendingChunk();
        chunk.then(v => controller.enqueue(v), e => controller.error(e));
        previousBlockedChunk = chunk;
        blockedChunk.then(function () {
          if (previousBlockedChunk === chunk) {
            // We were still the last chunk so we can now clear the queue and return
            // to synchronous emitting.
            previousBlockedChunk = null;
          }
          resolveModelChunk(response, chunk, json, -1);
        });
      }
    },
    close(json) {
      if (closed) {
        return;
      }
      closed = true;
      if (previousBlockedChunk === null) {
        controller.close();
      } else {
        const blockedChunk = previousBlockedChunk;
        // We shouldn't get any more enqueues after this so we can set it back to null.
        previousBlockedChunk = null;
        blockedChunk.then(() => controller.close());
      }
    },
    error(error) {
      if (closed) {
        return;
      }
      closed = true;
      if (previousBlockedChunk === null) {
        // $FlowFixMe[incompatible-call]
        controller.error(error);
      } else {
        const blockedChunk = previousBlockedChunk;
        // We shouldn't get any more enqueues after this so we can set it back to null.
        previousBlockedChunk = null;
        blockedChunk.then(() => controller.error(error));
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
  const iterator = {
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
  const id = parseInt(reference.slice(2), 16);
  const chunks = response._chunks;
  if (chunks.has(id)) {
    throw new Error('Already initialized stream.');
  }
  const buffer = [];
  let closed = false;
  let nextWriteIndex = 0;
  const flightController = {
    enqueueModel(value) {
      if (nextWriteIndex === buffer.length) {
        buffer[nextWriteIndex] = createResolvedIteratorResultChunk(response, value, false);
      } else {
        resolveIteratorResultChunk(response, buffer[nextWriteIndex], value, false);
      }
      nextWriteIndex++;
    },
    close(value) {
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
    error(error) {
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
  const iterable = {
    [ASYNC_ITERATOR]() {
      let nextReadIndex = 0;
      return createIterator(arg => {
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
    }
  };
  // TODO: If it's a single shot iterator we can optimize memory by cleaning up the buffer after
  // reading through the end, but currently we favor code size over this optimization.
  const stream = iterator ? iterable[ASYNC_ITERATOR]() : iterable;
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
          const id = parseInt(value.slice(2), 16);
          const chunk = getChunk(response, id);
          return chunk;
        }
      case 'h':
        {
          // Server Reference
          const ref = value.slice(2);
          return getOutlinedModel(response, ref, obj, key, loadServerReference$1);
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
          const ref = value.slice(2);
          return getOutlinedModel(response, ref, obj, key, createMap);
        }
      case 'W':
        {
          // Set
          const ref = value.slice(2);
          return getOutlinedModel(response, ref, obj, key, createSet);
        }
      case 'K':
        {
          // FormData
          const stringId = value.slice(2);
          const formPrefix = response._prefix + stringId + '_';
          const data = new FormData();
          const backingFormData = response._formData;
          // We assume that the reference to FormData always comes after each
          // entry that it references so we can assume they all exist in the
          // backing store already.
          // $FlowFixMe[prop-missing] FormData has forEach on it.
          backingFormData.forEach((entry, entryKey) => {
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
          const ref = value.slice(2);
          return getOutlinedModel(response, ref, obj, key, extractIterator);
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
          const id = parseInt(value.slice(2), 16);
          const prefix = response._prefix;
          const blobKey = prefix + id;
          // We should have this backingEntry in the store already because we emitted
          // it before referencing it. It should be a Blob.
          const backingEntry = response._formData.get(blobKey);
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
    const ref = value.slice(1);
    return getOutlinedModel(response, ref, obj, key, createModel);
  }
  return value;
}
function createResponse(bundlerConfig, formFieldPrefix, temporaryReferences) {
  let backingFormData = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : new FormData();
  const chunks = new Map();
  const response = {
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
  const prefix = response._prefix;
  if (key.startsWith(prefix)) {
    const chunks = response._chunks;
    const id = +key.slice(prefix.length);
    const chunk = chunks.get(id);
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
  const serverReference = resolveServerReference(bundlerConfig, id);
  // We expect most servers to not really need this because you'd just have all
  // the relevant modules already loaded but it allows for lazy loading of code
  // if needed.
  const preloadPromise = preloadModule(serverReference);
  if (bound) {
    return Promise.all([bound, preloadPromise]).then(_ref => {
      let args = _ref[0];
      return bindArgs(requireModule(serverReference), args);
    });
  } else if (preloadPromise) {
    return Promise.resolve(preloadPromise).then(() => requireModule(serverReference));
  } else {
    // Synchronously available
    return Promise.resolve(requireModule(serverReference));
  }
}
function decodeBoundActionMetaData(body, serverManifest, formFieldPrefix) {
  // The data for this reference is encoded in multiple fields under this prefix.
  const actionResponse = createResponse(serverManifest, formFieldPrefix, undefined, body);
  close(actionResponse);
  const refPromise = getRoot(actionResponse);
  // Force it to initialize
  // $FlowFixMe
  refPromise.then(() => {});
  if (refPromise.status !== 'fulfilled') {
    // $FlowFixMe
    throw refPromise.reason;
  }
  return refPromise.value;
}
function decodeAction(body, serverManifest) {
  // We're going to create a new formData object that holds all the fields except
  // the implementation details of the action data.
  const formData = new FormData();
  let action = null;

  // $FlowFixMe[prop-missing]
  body.forEach((value, key) => {
    if (!key.startsWith('$ACTION_')) {
      // $FlowFixMe[incompatible-call]
      formData.append(key, value);
      return;
    }
    // Later actions may override earlier actions if a button is used to override the default
    // form action.
    if (key.startsWith('$ACTION_REF_')) {
      const formFieldPrefix = '$ACTION_' + key.slice(12) + ':';
      const metaData = decodeBoundActionMetaData(body, serverManifest, formFieldPrefix);
      action = loadServerReference(serverManifest, metaData.id, metaData.bound);
      return;
    }
    if (key.startsWith('$ACTION_ID_')) {
      const id = key.slice(11);
      action = loadServerReference(serverManifest, id, null);
      return;
    }
  });
  if (action === null) {
    return null;
  }
  // Return the action with the remaining FormData bound to the first argument.
  return action.then(fn => fn.bind(null, formData));
}
function decodeFormState(actionResult, body, serverManifest) {
  const keyPath = body.get('$ACTION_KEY');
  if (typeof keyPath !== 'string') {
    // This form submission did not include any form state.
    return Promise.resolve(null);
  }
  // Search through the form data object to get the reference id and the number
  // of bound arguments. This repeats some of the work done in decodeAction.
  let metaData = null;
  // $FlowFixMe[prop-missing]
  body.forEach((value, key) => {
    if (key.startsWith('$ACTION_REF_')) {
      const formFieldPrefix = '$ACTION_' + key.slice(12) + ':';
      metaData = decodeBoundActionMetaData(body, serverManifest, formFieldPrefix);
    }
    // We don't check for the simple $ACTION_ID_ case because form state actions
    // are always bound to the state argument.
  });
  if (metaData === null) {
    // Should be unreachable.
    return Promise.resolve(null);
  }
  const referenceId = metaData.id;
  return Promise.resolve(metaData.bound).then(bound => {
    if (bound === null) {
      // Should be unreachable because form state actions are always bound to the
      // state argument.
      return null;
    }
    // The form action dispatch method is always bound to the initial state.
    // But when comparing signatures, we compare to the original unbound action.
    // Subtract one from the arity to account for this.
    const boundArity = bound.length - 1;
    return [actionResult, keyPath, referenceId, boundArity];
  });
}

function renderToReadableStream(model, turbopackMap, options) {
  const request = createRequest(model, turbopackMap, options ? options.onError : undefined, options ? options.identifierPrefix : undefined, options ? options.temporaryReferences : undefined);
  if (options && options.signal) {
    const signal = options.signal;
    if (signal.aborted) {
      abort(request, signal.reason);
    } else {
      const listener = () => {
        abort(request, signal.reason);
        signal.removeEventListener('abort', listener);
      };
      signal.addEventListener('abort', listener);
    }
  }
  const stream = new ReadableStream({
    type: 'bytes',
    start: controller => {
      startWork(request);
    },
    pull: controller => {
      startFlowing(request, controller);
    },
    cancel: reason => {
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
  return new Promise((resolve, reject) => {
    const onFatalError = reject;
    function onAllReady() {
      const stream = new ReadableStream({
        type: 'bytes',
        pull: controller => {
          startFlowing(request, controller);
        },
        cancel: reason => {
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
    const request = createPrerenderRequest(model, turbopackMap, onAllReady, onFatalError, options ? options.onError : undefined, options ? options.identifierPrefix : undefined, options ? options.temporaryReferences : undefined);
    if (options && options.signal) {
      const signal = options.signal;
      if (signal.aborted) {
        const reason = signal.reason;
        abort(request, reason);
      } else {
        const listener = () => {
          const reason = signal.reason;
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
    const form = new FormData();
    form.append('0', body);
    body = form;
  }
  const response = createResponse(turbopackMap, '', options ? options.temporaryReferences : undefined, body);
  const root = getRoot(response);
  close(response);
  return root;
}
function decodeReplyFromAsyncIterable(iterable, turbopackMap, options) {
  const iterator = iterable[ASYNC_ITERATOR]();
  const response = createResponse(turbopackMap, '', options ? options.temporaryReferences : undefined);
  function progress(entry) {
    if (entry.done) {
      close(response);
    } else {
      const _entry$value = entry.value,
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
