var rhombus = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // app.tsx
  var app_exports = {};
  __export(app_exports, {
    renderChallenges: () => renderChallenges
  });

  // node_modules/.pnpm/solid-js@1.8.17/node_modules/solid-js/dist/solid.js
  var sharedConfig = {
    context: void 0,
    registry: void 0
  };
  function setHydrateContext(context) {
    sharedConfig.context = context;
  }
  function nextHydrateContext() {
    return {
      ...sharedConfig.context,
      id: `${sharedConfig.context.id}${sharedConfig.context.count++}-`,
      count: 0
    };
  }
  var equalFn = (a, b) => a === b;
  var $PROXY = Symbol("solid-proxy");
  var $TRACK = Symbol("solid-track");
  var $DEVCOMP = Symbol("solid-dev-component");
  var signalOptions = {
    equals: equalFn
  };
  var ERROR = null;
  var runEffects = runQueue;
  var STALE = 1;
  var PENDING = 2;
  var UNOWNED = {
    owned: null,
    cleanups: null,
    context: null,
    owner: null
  };
  var NO_INIT = {};
  var Owner = null;
  var Transition = null;
  var Scheduler = null;
  var ExternalSourceConfig = null;
  var Listener = null;
  var Updates = null;
  var Effects = null;
  var ExecCount = 0;
  function createRoot(fn, detachedOwner) {
    const listener = Listener, owner = Owner, unowned = fn.length === 0, current = detachedOwner === void 0 ? owner : detachedOwner, root = unowned ? UNOWNED : {
      owned: null,
      cleanups: null,
      context: current ? current.context : null,
      owner: current
    }, updateFn = unowned ? fn : () => fn(() => untrack(() => cleanNode(root)));
    Owner = root;
    Listener = null;
    try {
      return runUpdates(updateFn, true);
    } finally {
      Listener = listener;
      Owner = owner;
    }
  }
  function createSignal(value, options) {
    options = options ? Object.assign({}, signalOptions, options) : signalOptions;
    const s = {
      value,
      observers: null,
      observerSlots: null,
      comparator: options.equals || void 0
    };
    const setter = (value2) => {
      if (typeof value2 === "function") {
        if (Transition && Transition.running && Transition.sources.has(s)) value2 = value2(s.tValue);
        else value2 = value2(s.value);
      }
      return writeSignal(s, value2);
    };
    return [readSignal.bind(s), setter];
  }
  function createComputed(fn, value, options) {
    const c = createComputation(fn, value, true, STALE);
    if (Scheduler && Transition && Transition.running) Updates.push(c);
    else updateComputation(c);
  }
  function createRenderEffect(fn, value, options) {
    const c = createComputation(fn, value, false, STALE);
    if (Scheduler && Transition && Transition.running) Updates.push(c);
    else updateComputation(c);
  }
  function createEffect(fn, value, options) {
    runEffects = runUserEffects;
    const c = createComputation(fn, value, false, STALE), s = SuspenseContext && useContext(SuspenseContext);
    if (s) c.suspense = s;
    if (!options || !options.render) c.user = true;
    Effects ? Effects.push(c) : updateComputation(c);
  }
  function createMemo(fn, value, options) {
    options = options ? Object.assign({}, signalOptions, options) : signalOptions;
    const c = createComputation(fn, value, true, 0);
    c.observers = null;
    c.observerSlots = null;
    c.comparator = options.equals || void 0;
    if (Scheduler && Transition && Transition.running) {
      c.tState = STALE;
      Updates.push(c);
    } else updateComputation(c);
    return readSignal.bind(c);
  }
  function isPromise(v) {
    return v && typeof v === "object" && "then" in v;
  }
  function createResource(pSource, pFetcher, pOptions) {
    let source;
    let fetcher;
    let options;
    if (arguments.length === 2 && typeof pFetcher === "object" || arguments.length === 1) {
      source = true;
      fetcher = pSource;
      options = pFetcher || {};
    } else {
      source = pSource;
      fetcher = pFetcher;
      options = pOptions || {};
    }
    let pr = null, initP = NO_INIT, id = null, loadedUnderTransition = false, scheduled = false, resolved = "initialValue" in options, dynamic = typeof source === "function" && createMemo(source);
    const contexts = /* @__PURE__ */ new Set(), [value, setValue] = (options.storage || createSignal)(options.initialValue), [error, setError] = createSignal(void 0), [track, trigger] = createSignal(void 0, {
      equals: false
    }), [state, setState] = createSignal(resolved ? "ready" : "unresolved");
    if (sharedConfig.context) {
      id = `${sharedConfig.context.id}${sharedConfig.context.count++}`;
      let v;
      if (options.ssrLoadFrom === "initial") initP = options.initialValue;
      else if (sharedConfig.load && (v = sharedConfig.load(id))) initP = v;
    }
    function loadEnd(p, v, error2, key) {
      if (pr === p) {
        pr = null;
        key !== void 0 && (resolved = true);
        if ((p === initP || v === initP) && options.onHydrated)
          queueMicrotask(
            () => options.onHydrated(key, {
              value: v
            })
          );
        initP = NO_INIT;
        if (Transition && p && loadedUnderTransition) {
          Transition.promises.delete(p);
          loadedUnderTransition = false;
          runUpdates(() => {
            Transition.running = true;
            completeLoad(v, error2);
          }, false);
        } else completeLoad(v, error2);
      }
      return v;
    }
    function completeLoad(v, err) {
      runUpdates(() => {
        if (err === void 0) setValue(() => v);
        setState(err !== void 0 ? "errored" : resolved ? "ready" : "unresolved");
        setError(err);
        for (const c of contexts.keys()) c.decrement();
        contexts.clear();
      }, false);
    }
    function read() {
      const c = SuspenseContext && useContext(SuspenseContext), v = value(), err = error();
      if (err !== void 0 && !pr) throw err;
      if (Listener && !Listener.user && c) {
        createComputed(() => {
          track();
          if (pr) {
            if (c.resolved && Transition && loadedUnderTransition) Transition.promises.add(pr);
            else if (!contexts.has(c)) {
              c.increment();
              contexts.add(c);
            }
          }
        });
      }
      return v;
    }
    function load(refetching = true) {
      if (refetching !== false && scheduled) return;
      scheduled = false;
      const lookup = dynamic ? dynamic() : source;
      loadedUnderTransition = Transition && Transition.running;
      if (lookup == null || lookup === false) {
        loadEnd(pr, untrack(value));
        return;
      }
      if (Transition && pr) Transition.promises.delete(pr);
      const p = initP !== NO_INIT ? initP : untrack(
        () => fetcher(lookup, {
          value: value(),
          refetching
        })
      );
      if (!isPromise(p)) {
        loadEnd(pr, p, void 0, lookup);
        return p;
      }
      pr = p;
      if ("value" in p) {
        if (p.status === "success") loadEnd(pr, p.value, void 0, lookup);
        else loadEnd(pr, void 0, void 0, lookup);
        return p;
      }
      scheduled = true;
      queueMicrotask(() => scheduled = false);
      runUpdates(() => {
        setState(resolved ? "refreshing" : "pending");
        trigger();
      }, false);
      return p.then(
        (v) => loadEnd(p, v, void 0, lookup),
        (e) => loadEnd(p, void 0, castError(e), lookup)
      );
    }
    Object.defineProperties(read, {
      state: {
        get: () => state()
      },
      error: {
        get: () => error()
      },
      loading: {
        get() {
          const s = state();
          return s === "pending" || s === "refreshing";
        }
      },
      latest: {
        get() {
          if (!resolved) return read();
          const err = error();
          if (err && !pr) throw err;
          return value();
        }
      }
    });
    if (dynamic) createComputed(() => load(false));
    else load(false);
    return [
      read,
      {
        refetch: load,
        mutate: setValue
      }
    ];
  }
  function untrack(fn) {
    if (!ExternalSourceConfig && Listener === null) return fn();
    const listener = Listener;
    Listener = null;
    try {
      if (ExternalSourceConfig) return ExternalSourceConfig.untrack(fn);
      return fn();
    } finally {
      Listener = listener;
    }
  }
  function onCleanup(fn) {
    if (Owner === null) ;
    else if (Owner.cleanups === null) Owner.cleanups = [fn];
    else Owner.cleanups.push(fn);
    return fn;
  }
  function getOwner() {
    return Owner;
  }
  function runWithOwner(o, fn) {
    const prev = Owner;
    const prevListener = Listener;
    Owner = o;
    Listener = null;
    try {
      return runUpdates(fn, true);
    } catch (err) {
      handleError(err);
    } finally {
      Owner = prev;
      Listener = prevListener;
    }
  }
  function startTransition(fn) {
    if (Transition && Transition.running) {
      fn();
      return Transition.done;
    }
    const l = Listener;
    const o = Owner;
    return Promise.resolve().then(() => {
      Listener = l;
      Owner = o;
      let t;
      if (Scheduler || SuspenseContext) {
        t = Transition || (Transition = {
          sources: /* @__PURE__ */ new Set(),
          effects: [],
          promises: /* @__PURE__ */ new Set(),
          disposed: /* @__PURE__ */ new Set(),
          queue: /* @__PURE__ */ new Set(),
          running: true
        });
        t.done || (t.done = new Promise((res) => t.resolve = res));
        t.running = true;
      }
      runUpdates(fn, false);
      Listener = Owner = null;
      return t ? t.done : void 0;
    });
  }
  var [transPending, setTransPending] = /* @__PURE__ */ createSignal(false);
  function createContext(defaultValue, options) {
    const id = Symbol("context");
    return {
      id,
      Provider: createProvider(id),
      defaultValue
    };
  }
  function useContext(context) {
    return Owner && Owner.context && Owner.context[context.id] !== void 0 ? Owner.context[context.id] : context.defaultValue;
  }
  function children(fn) {
    const children2 = createMemo(fn);
    const memo = createMemo(() => resolveChildren(children2()));
    memo.toArray = () => {
      const c = memo();
      return Array.isArray(c) ? c : c != null ? [c] : [];
    };
    return memo;
  }
  var SuspenseContext;
  function readSignal() {
    const runningTransition = Transition && Transition.running;
    if (this.sources && (runningTransition ? this.tState : this.state)) {
      if ((runningTransition ? this.tState : this.state) === STALE) updateComputation(this);
      else {
        const updates = Updates;
        Updates = null;
        runUpdates(() => lookUpstream(this), false);
        Updates = updates;
      }
    }
    if (Listener) {
      const sSlot = this.observers ? this.observers.length : 0;
      if (!Listener.sources) {
        Listener.sources = [this];
        Listener.sourceSlots = [sSlot];
      } else {
        Listener.sources.push(this);
        Listener.sourceSlots.push(sSlot);
      }
      if (!this.observers) {
        this.observers = [Listener];
        this.observerSlots = [Listener.sources.length - 1];
      } else {
        this.observers.push(Listener);
        this.observerSlots.push(Listener.sources.length - 1);
      }
    }
    if (runningTransition && Transition.sources.has(this)) return this.tValue;
    return this.value;
  }
  function writeSignal(node, value, isComp) {
    let current = Transition && Transition.running && Transition.sources.has(node) ? node.tValue : node.value;
    if (!node.comparator || !node.comparator(current, value)) {
      if (Transition) {
        const TransitionRunning = Transition.running;
        if (TransitionRunning || !isComp && Transition.sources.has(node)) {
          Transition.sources.add(node);
          node.tValue = value;
        }
        if (!TransitionRunning) node.value = value;
      } else node.value = value;
      if (node.observers && node.observers.length) {
        runUpdates(() => {
          for (let i = 0; i < node.observers.length; i += 1) {
            const o = node.observers[i];
            const TransitionRunning = Transition && Transition.running;
            if (TransitionRunning && Transition.disposed.has(o)) continue;
            if (TransitionRunning ? !o.tState : !o.state) {
              if (o.pure) Updates.push(o);
              else Effects.push(o);
              if (o.observers) markDownstream(o);
            }
            if (!TransitionRunning) o.state = STALE;
            else o.tState = STALE;
          }
          if (Updates.length > 1e6) {
            Updates = [];
            if (false) ;
            throw new Error();
          }
        }, false);
      }
    }
    return value;
  }
  function updateComputation(node) {
    if (!node.fn) return;
    cleanNode(node);
    const time = ExecCount;
    runComputation(
      node,
      Transition && Transition.running && Transition.sources.has(node) ? node.tValue : node.value,
      time
    );
    if (Transition && !Transition.running && Transition.sources.has(node)) {
      queueMicrotask(() => {
        runUpdates(() => {
          Transition && (Transition.running = true);
          Listener = Owner = node;
          runComputation(node, node.tValue, time);
          Listener = Owner = null;
        }, false);
      });
    }
  }
  function runComputation(node, value, time) {
    let nextValue;
    const owner = Owner, listener = Listener;
    Listener = Owner = node;
    try {
      nextValue = node.fn(value);
    } catch (err) {
      if (node.pure) {
        if (Transition && Transition.running) {
          node.tState = STALE;
          node.tOwned && node.tOwned.forEach(cleanNode);
          node.tOwned = void 0;
        } else {
          node.state = STALE;
          node.owned && node.owned.forEach(cleanNode);
          node.owned = null;
        }
      }
      node.updatedAt = time + 1;
      return handleError(err);
    } finally {
      Listener = listener;
      Owner = owner;
    }
    if (!node.updatedAt || node.updatedAt <= time) {
      if (node.updatedAt != null && "observers" in node) {
        writeSignal(node, nextValue, true);
      } else if (Transition && Transition.running && node.pure) {
        Transition.sources.add(node);
        node.tValue = nextValue;
      } else node.value = nextValue;
      node.updatedAt = time;
    }
  }
  function createComputation(fn, init, pure, state = STALE, options) {
    const c = {
      fn,
      state,
      updatedAt: null,
      owned: null,
      sources: null,
      sourceSlots: null,
      cleanups: null,
      value: init,
      owner: Owner,
      context: Owner ? Owner.context : null,
      pure
    };
    if (Transition && Transition.running) {
      c.state = 0;
      c.tState = state;
    }
    if (Owner === null) ;
    else if (Owner !== UNOWNED) {
      if (Transition && Transition.running && Owner.pure) {
        if (!Owner.tOwned) Owner.tOwned = [c];
        else Owner.tOwned.push(c);
      } else {
        if (!Owner.owned) Owner.owned = [c];
        else Owner.owned.push(c);
      }
    }
    if (ExternalSourceConfig && c.fn) {
      const [track, trigger] = createSignal(void 0, {
        equals: false
      });
      const ordinary = ExternalSourceConfig.factory(c.fn, trigger);
      onCleanup(() => ordinary.dispose());
      const triggerInTransition = () => startTransition(trigger).then(() => inTransition.dispose());
      const inTransition = ExternalSourceConfig.factory(c.fn, triggerInTransition);
      c.fn = (x) => {
        track();
        return Transition && Transition.running ? inTransition.track(x) : ordinary.track(x);
      };
    }
    return c;
  }
  function runTop(node) {
    const runningTransition = Transition && Transition.running;
    if ((runningTransition ? node.tState : node.state) === 0) return;
    if ((runningTransition ? node.tState : node.state) === PENDING) return lookUpstream(node);
    if (node.suspense && untrack(node.suspense.inFallback)) return node.suspense.effects.push(node);
    const ancestors = [node];
    while ((node = node.owner) && (!node.updatedAt || node.updatedAt < ExecCount)) {
      if (runningTransition && Transition.disposed.has(node)) return;
      if (runningTransition ? node.tState : node.state) ancestors.push(node);
    }
    for (let i = ancestors.length - 1; i >= 0; i--) {
      node = ancestors[i];
      if (runningTransition) {
        let top = node, prev = ancestors[i + 1];
        while ((top = top.owner) && top !== prev) {
          if (Transition.disposed.has(top)) return;
        }
      }
      if ((runningTransition ? node.tState : node.state) === STALE) {
        updateComputation(node);
      } else if ((runningTransition ? node.tState : node.state) === PENDING) {
        const updates = Updates;
        Updates = null;
        runUpdates(() => lookUpstream(node, ancestors[0]), false);
        Updates = updates;
      }
    }
  }
  function runUpdates(fn, init) {
    if (Updates) return fn();
    let wait = false;
    if (!init) Updates = [];
    if (Effects) wait = true;
    else Effects = [];
    ExecCount++;
    try {
      const res = fn();
      completeUpdates(wait);
      return res;
    } catch (err) {
      if (!wait) Effects = null;
      Updates = null;
      handleError(err);
    }
  }
  function completeUpdates(wait) {
    if (Updates) {
      if (Scheduler && Transition && Transition.running) scheduleQueue(Updates);
      else runQueue(Updates);
      Updates = null;
    }
    if (wait) return;
    let res;
    if (Transition) {
      if (!Transition.promises.size && !Transition.queue.size) {
        const sources = Transition.sources;
        const disposed = Transition.disposed;
        Effects.push.apply(Effects, Transition.effects);
        res = Transition.resolve;
        for (const e2 of Effects) {
          "tState" in e2 && (e2.state = e2.tState);
          delete e2.tState;
        }
        Transition = null;
        runUpdates(() => {
          for (const d of disposed) cleanNode(d);
          for (const v of sources) {
            v.value = v.tValue;
            if (v.owned) {
              for (let i = 0, len = v.owned.length; i < len; i++) cleanNode(v.owned[i]);
            }
            if (v.tOwned) v.owned = v.tOwned;
            delete v.tValue;
            delete v.tOwned;
            v.tState = 0;
          }
          setTransPending(false);
        }, false);
      } else if (Transition.running) {
        Transition.running = false;
        Transition.effects.push.apply(Transition.effects, Effects);
        Effects = null;
        setTransPending(true);
        return;
      }
    }
    const e = Effects;
    Effects = null;
    if (e.length) runUpdates(() => runEffects(e), false);
    if (res) res();
  }
  function runQueue(queue) {
    for (let i = 0; i < queue.length; i++) runTop(queue[i]);
  }
  function scheduleQueue(queue) {
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      const tasks = Transition.queue;
      if (!tasks.has(item)) {
        tasks.add(item);
        Scheduler(() => {
          tasks.delete(item);
          runUpdates(() => {
            Transition.running = true;
            runTop(item);
          }, false);
          Transition && (Transition.running = false);
        });
      }
    }
  }
  function runUserEffects(queue) {
    let i, userLength = 0;
    for (i = 0; i < queue.length; i++) {
      const e = queue[i];
      if (!e.user) runTop(e);
      else queue[userLength++] = e;
    }
    if (sharedConfig.context) {
      if (sharedConfig.count) {
        sharedConfig.effects || (sharedConfig.effects = []);
        sharedConfig.effects.push(...queue.slice(0, userLength));
        return;
      } else if (sharedConfig.effects) {
        queue = [...sharedConfig.effects, ...queue];
        userLength += sharedConfig.effects.length;
        delete sharedConfig.effects;
      }
      setHydrateContext();
    }
    for (i = 0; i < userLength; i++) runTop(queue[i]);
  }
  function lookUpstream(node, ignore) {
    const runningTransition = Transition && Transition.running;
    if (runningTransition) node.tState = 0;
    else node.state = 0;
    for (let i = 0; i < node.sources.length; i += 1) {
      const source = node.sources[i];
      if (source.sources) {
        const state = runningTransition ? source.tState : source.state;
        if (state === STALE) {
          if (source !== ignore && (!source.updatedAt || source.updatedAt < ExecCount))
            runTop(source);
        } else if (state === PENDING) lookUpstream(source, ignore);
      }
    }
  }
  function markDownstream(node) {
    const runningTransition = Transition && Transition.running;
    for (let i = 0; i < node.observers.length; i += 1) {
      const o = node.observers[i];
      if (runningTransition ? !o.tState : !o.state) {
        if (runningTransition) o.tState = PENDING;
        else o.state = PENDING;
        if (o.pure) Updates.push(o);
        else Effects.push(o);
        o.observers && markDownstream(o);
      }
    }
  }
  function cleanNode(node) {
    let i;
    if (node.sources) {
      while (node.sources.length) {
        const source = node.sources.pop(), index = node.sourceSlots.pop(), obs = source.observers;
        if (obs && obs.length) {
          const n = obs.pop(), s = source.observerSlots.pop();
          if (index < obs.length) {
            n.sourceSlots[s] = index;
            obs[index] = n;
            source.observerSlots[index] = s;
          }
        }
      }
    }
    if (Transition && Transition.running && node.pure) {
      if (node.tOwned) {
        for (i = node.tOwned.length - 1; i >= 0; i--) cleanNode(node.tOwned[i]);
        delete node.tOwned;
      }
      reset(node, true);
    } else if (node.owned) {
      for (i = node.owned.length - 1; i >= 0; i--) cleanNode(node.owned[i]);
      node.owned = null;
    }
    if (node.cleanups) {
      for (i = node.cleanups.length - 1; i >= 0; i--) node.cleanups[i]();
      node.cleanups = null;
    }
    if (Transition && Transition.running) node.tState = 0;
    else node.state = 0;
  }
  function reset(node, top) {
    if (!top) {
      node.tState = 0;
      Transition.disposed.add(node);
    }
    if (node.owned) {
      for (let i = 0; i < node.owned.length; i++) reset(node.owned[i]);
    }
  }
  function castError(err) {
    if (err instanceof Error) return err;
    return new Error(typeof err === "string" ? err : "Unknown error", {
      cause: err
    });
  }
  function runErrors(err, fns, owner) {
    try {
      for (const f of fns) f(err);
    } catch (e) {
      handleError(e, owner && owner.owner || null);
    }
  }
  function handleError(err, owner = Owner) {
    const fns = ERROR && owner && owner.context && owner.context[ERROR];
    const error = castError(err);
    if (!fns) throw error;
    if (Effects)
      Effects.push({
        fn() {
          runErrors(error, fns, owner);
        },
        state: STALE
      });
    else runErrors(error, fns, owner);
  }
  function resolveChildren(children2) {
    if (typeof children2 === "function" && !children2.length) return resolveChildren(children2());
    if (Array.isArray(children2)) {
      const results = [];
      for (let i = 0; i < children2.length; i++) {
        const result = resolveChildren(children2[i]);
        Array.isArray(result) ? results.push.apply(results, result) : results.push(result);
      }
      return results;
    }
    return children2;
  }
  function createProvider(id, options) {
    return function provider(props) {
      let res;
      createRenderEffect(
        () => res = untrack(() => {
          Owner.context = {
            ...Owner.context,
            [id]: props.value
          };
          return children(() => props.children);
        }),
        void 0
      );
      return res;
    };
  }
  var FALLBACK = Symbol("fallback");
  function dispose(d) {
    for (let i = 0; i < d.length; i++) d[i]();
  }
  function mapArray(list, mapFn, options = {}) {
    let items = [], mapped = [], disposers = [], len = 0, indexes = mapFn.length > 1 ? [] : null;
    onCleanup(() => dispose(disposers));
    return () => {
      let newItems = list() || [], i, j;
      newItems[$TRACK];
      return untrack(() => {
        let newLen = newItems.length, newIndices, newIndicesNext, temp, tempdisposers, tempIndexes, start, end, newEnd, item;
        if (newLen === 0) {
          if (len !== 0) {
            dispose(disposers);
            disposers = [];
            items = [];
            mapped = [];
            len = 0;
            indexes && (indexes = []);
          }
          if (options.fallback) {
            items = [FALLBACK];
            mapped[0] = createRoot((disposer) => {
              disposers[0] = disposer;
              return options.fallback();
            });
            len = 1;
          }
        } else if (len === 0) {
          mapped = new Array(newLen);
          for (j = 0; j < newLen; j++) {
            items[j] = newItems[j];
            mapped[j] = createRoot(mapper);
          }
          len = newLen;
        } else {
          temp = new Array(newLen);
          tempdisposers = new Array(newLen);
          indexes && (tempIndexes = new Array(newLen));
          for (start = 0, end = Math.min(len, newLen); start < end && items[start] === newItems[start]; start++) ;
          for (end = len - 1, newEnd = newLen - 1; end >= start && newEnd >= start && items[end] === newItems[newEnd]; end--, newEnd--) {
            temp[newEnd] = mapped[end];
            tempdisposers[newEnd] = disposers[end];
            indexes && (tempIndexes[newEnd] = indexes[end]);
          }
          newIndices = /* @__PURE__ */ new Map();
          newIndicesNext = new Array(newEnd + 1);
          for (j = newEnd; j >= start; j--) {
            item = newItems[j];
            i = newIndices.get(item);
            newIndicesNext[j] = i === void 0 ? -1 : i;
            newIndices.set(item, j);
          }
          for (i = start; i <= end; i++) {
            item = items[i];
            j = newIndices.get(item);
            if (j !== void 0 && j !== -1) {
              temp[j] = mapped[i];
              tempdisposers[j] = disposers[i];
              indexes && (tempIndexes[j] = indexes[i]);
              j = newIndicesNext[j];
              newIndices.set(item, j);
            } else disposers[i]();
          }
          for (j = start; j < newLen; j++) {
            if (j in temp) {
              mapped[j] = temp[j];
              disposers[j] = tempdisposers[j];
              if (indexes) {
                indexes[j] = tempIndexes[j];
                indexes[j](j);
              }
            } else mapped[j] = createRoot(mapper);
          }
          mapped = mapped.slice(0, len = newLen);
          items = newItems.slice(0);
        }
        return mapped;
      });
      function mapper(disposer) {
        disposers[j] = disposer;
        if (indexes) {
          const [s, set] = createSignal(j);
          indexes[j] = set;
          return mapFn(newItems[j], s);
        }
        return mapFn(newItems[j]);
      }
    };
  }
  var hydrationEnabled = false;
  function createComponent(Comp, props) {
    if (hydrationEnabled) {
      if (sharedConfig.context) {
        const c = sharedConfig.context;
        setHydrateContext(nextHydrateContext());
        const r = untrack(() => Comp(props || {}));
        setHydrateContext(c);
        return r;
      }
    }
    return untrack(() => Comp(props || {}));
  }
  function trueFn() {
    return true;
  }
  var propTraps = {
    get(_, property, receiver) {
      if (property === $PROXY) return receiver;
      return _.get(property);
    },
    has(_, property) {
      if (property === $PROXY) return true;
      return _.has(property);
    },
    set: trueFn,
    deleteProperty: trueFn,
    getOwnPropertyDescriptor(_, property) {
      return {
        configurable: true,
        enumerable: true,
        get() {
          return _.get(property);
        },
        set: trueFn,
        deleteProperty: trueFn
      };
    },
    ownKeys(_) {
      return _.keys();
    }
  };
  function resolveSource(s) {
    return !(s = typeof s === "function" ? s() : s) ? {} : s;
  }
  function resolveSources() {
    for (let i = 0, length = this.length; i < length; ++i) {
      const v = this[i]();
      if (v !== void 0) return v;
    }
  }
  function mergeProps(...sources) {
    let proxy = false;
    for (let i = 0; i < sources.length; i++) {
      const s = sources[i];
      proxy = proxy || !!s && $PROXY in s;
      sources[i] = typeof s === "function" ? (proxy = true, createMemo(s)) : s;
    }
    if (proxy) {
      return new Proxy(
        {
          get(property) {
            for (let i = sources.length - 1; i >= 0; i--) {
              const v = resolveSource(sources[i])[property];
              if (v !== void 0) return v;
            }
          },
          has(property) {
            for (let i = sources.length - 1; i >= 0; i--) {
              if (property in resolveSource(sources[i])) return true;
            }
            return false;
          },
          keys() {
            const keys = [];
            for (let i = 0; i < sources.length; i++)
              keys.push(...Object.keys(resolveSource(sources[i])));
            return [...new Set(keys)];
          }
        },
        propTraps
      );
    }
    const sourcesMap = {};
    const defined = /* @__PURE__ */ Object.create(null);
    for (let i = sources.length - 1; i >= 0; i--) {
      const source = sources[i];
      if (!source) continue;
      const sourceKeys = Object.getOwnPropertyNames(source);
      for (let i2 = sourceKeys.length - 1; i2 >= 0; i2--) {
        const key = sourceKeys[i2];
        if (key === "__proto__" || key === "constructor") continue;
        const desc = Object.getOwnPropertyDescriptor(source, key);
        if (!defined[key]) {
          defined[key] = desc.get ? {
            enumerable: true,
            configurable: true,
            get: resolveSources.bind(sourcesMap[key] = [desc.get.bind(source)])
          } : desc.value !== void 0 ? desc : void 0;
        } else {
          const sources2 = sourcesMap[key];
          if (sources2) {
            if (desc.get) sources2.push(desc.get.bind(source));
            else if (desc.value !== void 0) sources2.push(() => desc.value);
          }
        }
      }
    }
    const target = {};
    const definedKeys = Object.keys(defined);
    for (let i = definedKeys.length - 1; i >= 0; i--) {
      const key = definedKeys[i], desc = defined[key];
      if (desc && desc.get) Object.defineProperty(target, key, desc);
      else target[key] = desc ? desc.value : void 0;
    }
    return target;
  }
  function splitProps(props, ...keys) {
    if ($PROXY in props) {
      const blocked = new Set(keys.length > 1 ? keys.flat() : keys[0]);
      const res = keys.map((k) => {
        return new Proxy(
          {
            get(property) {
              return k.includes(property) ? props[property] : void 0;
            },
            has(property) {
              return k.includes(property) && property in props;
            },
            keys() {
              return k.filter((property) => property in props);
            }
          },
          propTraps
        );
      });
      res.push(
        new Proxy(
          {
            get(property) {
              return blocked.has(property) ? void 0 : props[property];
            },
            has(property) {
              return blocked.has(property) ? false : property in props;
            },
            keys() {
              return Object.keys(props).filter((k) => !blocked.has(k));
            }
          },
          propTraps
        )
      );
      return res;
    }
    const otherObject = {};
    const objects = keys.map(() => ({}));
    for (const propName of Object.getOwnPropertyNames(props)) {
      const desc = Object.getOwnPropertyDescriptor(props, propName);
      const isDefaultDesc = !desc.get && !desc.set && desc.enumerable && desc.writable && desc.configurable;
      let blocked = false;
      let objectIndex = 0;
      for (const k of keys) {
        if (k.includes(propName)) {
          blocked = true;
          isDefaultDesc ? objects[objectIndex][propName] = desc.value : Object.defineProperty(objects[objectIndex], propName, desc);
        }
        ++objectIndex;
      }
      if (!blocked) {
        isDefaultDesc ? otherObject[propName] = desc.value : Object.defineProperty(otherObject, propName, desc);
      }
    }
    return [...objects, otherObject];
  }
  var counter = 0;
  function createUniqueId() {
    const ctx = sharedConfig.context;
    return ctx ? `${ctx.id}${ctx.count++}` : `cl-${counter++}`;
  }
  var narrowedError = (name) => `Stale read from <${name}>.`;
  function For(props) {
    const fallback = "fallback" in props && {
      fallback: () => props.fallback
    };
    return createMemo(mapArray(() => props.each, props.children, fallback || void 0));
  }
  function Show(props) {
    const keyed = props.keyed;
    const condition = createMemo(() => props.when, void 0, {
      equals: (a, b) => keyed ? a === b : !a === !b
    });
    return createMemo(
      () => {
        const c = condition();
        if (c) {
          const child = props.children;
          const fn = typeof child === "function" && child.length > 0;
          return fn ? untrack(
            () => child(
              keyed ? c : () => {
                if (!untrack(condition)) throw narrowedError("Show");
                return props.when;
              }
            )
          ) : child;
        }
        return props.fallback;
      },
      void 0,
      void 0
    );
  }
  var SuspenseListContext = createContext();

  // node_modules/.pnpm/solid-js@1.8.17/node_modules/solid-js/web/dist/web.js
  var booleans = [
    "allowfullscreen",
    "async",
    "autofocus",
    "autoplay",
    "checked",
    "controls",
    "default",
    "disabled",
    "formnovalidate",
    "hidden",
    "indeterminate",
    "inert",
    "ismap",
    "loop",
    "multiple",
    "muted",
    "nomodule",
    "novalidate",
    "open",
    "playsinline",
    "readonly",
    "required",
    "reversed",
    "seamless",
    "selected"
  ];
  var Properties = /* @__PURE__ */ new Set([
    "className",
    "value",
    "readOnly",
    "formNoValidate",
    "isMap",
    "noModule",
    "playsInline",
    ...booleans
  ]);
  var ChildProperties = /* @__PURE__ */ new Set([
    "innerHTML",
    "textContent",
    "innerText",
    "children"
  ]);
  var Aliases = /* @__PURE__ */ Object.assign(/* @__PURE__ */ Object.create(null), {
    className: "class",
    htmlFor: "for"
  });
  var PropAliases = /* @__PURE__ */ Object.assign(/* @__PURE__ */ Object.create(null), {
    class: "className",
    formnovalidate: {
      $: "formNoValidate",
      BUTTON: 1,
      INPUT: 1
    },
    ismap: {
      $: "isMap",
      IMG: 1
    },
    nomodule: {
      $: "noModule",
      SCRIPT: 1
    },
    playsinline: {
      $: "playsInline",
      VIDEO: 1
    },
    readonly: {
      $: "readOnly",
      INPUT: 1,
      TEXTAREA: 1
    }
  });
  function getPropAlias(prop, tagName) {
    const a = PropAliases[prop];
    return typeof a === "object" ? a[tagName] ? a["$"] : void 0 : a;
  }
  var DelegatedEvents = /* @__PURE__ */ new Set([
    "beforeinput",
    "click",
    "dblclick",
    "contextmenu",
    "focusin",
    "focusout",
    "input",
    "keydown",
    "keyup",
    "mousedown",
    "mousemove",
    "mouseout",
    "mouseover",
    "mouseup",
    "pointerdown",
    "pointermove",
    "pointerout",
    "pointerover",
    "pointerup",
    "touchend",
    "touchmove",
    "touchstart"
  ]);
  var SVGElements = /* @__PURE__ */ new Set([
    "altGlyph",
    "altGlyphDef",
    "altGlyphItem",
    "animate",
    "animateColor",
    "animateMotion",
    "animateTransform",
    "circle",
    "clipPath",
    "color-profile",
    "cursor",
    "defs",
    "desc",
    "ellipse",
    "feBlend",
    "feColorMatrix",
    "feComponentTransfer",
    "feComposite",
    "feConvolveMatrix",
    "feDiffuseLighting",
    "feDisplacementMap",
    "feDistantLight",
    "feDropShadow",
    "feFlood",
    "feFuncA",
    "feFuncB",
    "feFuncG",
    "feFuncR",
    "feGaussianBlur",
    "feImage",
    "feMerge",
    "feMergeNode",
    "feMorphology",
    "feOffset",
    "fePointLight",
    "feSpecularLighting",
    "feSpotLight",
    "feTile",
    "feTurbulence",
    "filter",
    "font",
    "font-face",
    "font-face-format",
    "font-face-name",
    "font-face-src",
    "font-face-uri",
    "foreignObject",
    "g",
    "glyph",
    "glyphRef",
    "hkern",
    "image",
    "line",
    "linearGradient",
    "marker",
    "mask",
    "metadata",
    "missing-glyph",
    "mpath",
    "path",
    "pattern",
    "polygon",
    "polyline",
    "radialGradient",
    "rect",
    "set",
    "stop",
    "svg",
    "switch",
    "symbol",
    "text",
    "textPath",
    "tref",
    "tspan",
    "use",
    "view",
    "vkern"
  ]);
  var SVGNamespace = {
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace"
  };
  function reconcileArrays(parentNode, a, b) {
    let bLength = b.length, aEnd = a.length, bEnd = bLength, aStart = 0, bStart = 0, after = a[aEnd - 1].nextSibling, map = null;
    while (aStart < aEnd || bStart < bEnd) {
      if (a[aStart] === b[bStart]) {
        aStart++;
        bStart++;
        continue;
      }
      while (a[aEnd - 1] === b[bEnd - 1]) {
        aEnd--;
        bEnd--;
      }
      if (aEnd === aStart) {
        const node = bEnd < bLength ? bStart ? b[bStart - 1].nextSibling : b[bEnd - bStart] : after;
        while (bStart < bEnd) parentNode.insertBefore(b[bStart++], node);
      } else if (bEnd === bStart) {
        while (aStart < aEnd) {
          if (!map || !map.has(a[aStart])) a[aStart].remove();
          aStart++;
        }
      } else if (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]) {
        const node = a[--aEnd].nextSibling;
        parentNode.insertBefore(b[bStart++], a[aStart++].nextSibling);
        parentNode.insertBefore(b[--bEnd], node);
        a[aEnd] = b[bEnd];
      } else {
        if (!map) {
          map = /* @__PURE__ */ new Map();
          let i = bStart;
          while (i < bEnd) map.set(b[i], i++);
        }
        const index = map.get(a[aStart]);
        if (index != null) {
          if (bStart < index && index < bEnd) {
            let i = aStart, sequence = 1, t;
            while (++i < aEnd && i < bEnd) {
              if ((t = map.get(a[i])) == null || t !== index + sequence) break;
              sequence++;
            }
            if (sequence > index - bStart) {
              const node = a[aStart];
              while (bStart < index) parentNode.insertBefore(b[bStart++], node);
            } else parentNode.replaceChild(b[bStart++], a[aStart++]);
          } else aStart++;
        } else a[aStart++].remove();
      }
    }
  }
  var $$EVENTS = "_$DX_DELEGATE";
  function render(code, element, init, options = {}) {
    let disposer;
    createRoot((dispose2) => {
      disposer = dispose2;
      element === document ? code() : insert(element, code(), element.firstChild ? null : void 0, init);
    }, options.owner);
    return () => {
      disposer();
      element.textContent = "";
    };
  }
  function template(html, isCE, isSVG) {
    let node;
    const create = () => {
      const t = document.createElement("template");
      t.innerHTML = html;
      return isSVG ? t.content.firstChild.firstChild : t.content.firstChild;
    };
    const fn = isCE ? () => untrack(() => document.importNode(node || (node = create()), true)) : () => (node || (node = create())).cloneNode(true);
    fn.cloneNode = fn;
    return fn;
  }
  function delegateEvents(eventNames, document2 = window.document) {
    const e = document2[$$EVENTS] || (document2[$$EVENTS] = /* @__PURE__ */ new Set());
    for (let i = 0, l = eventNames.length; i < l; i++) {
      const name = eventNames[i];
      if (!e.has(name)) {
        e.add(name);
        document2.addEventListener(name, eventHandler);
      }
    }
  }
  function setAttribute(node, name, value) {
    if (!!sharedConfig.context && node.isConnected) return;
    if (value == null) node.removeAttribute(name);
    else node.setAttribute(name, value);
  }
  function setAttributeNS(node, namespace, name, value) {
    if (!!sharedConfig.context && node.isConnected) return;
    if (value == null) node.removeAttributeNS(namespace, name);
    else node.setAttributeNS(namespace, name, value);
  }
  function className(node, value) {
    if (!!sharedConfig.context && node.isConnected) return;
    if (value == null) node.removeAttribute("class");
    else node.className = value;
  }
  function addEventListener(node, name, handler2, delegate) {
    if (delegate) {
      if (Array.isArray(handler2)) {
        node[`$$${name}`] = handler2[0];
        node[`$$${name}Data`] = handler2[1];
      } else node[`$$${name}`] = handler2;
    } else if (Array.isArray(handler2)) {
      const handlerFn = handler2[0];
      node.addEventListener(name, handler2[0] = (e) => handlerFn.call(node, handler2[1], e));
    } else node.addEventListener(name, handler2);
  }
  function classList(node, value, prev = {}) {
    const classKeys = Object.keys(value || {}), prevKeys = Object.keys(prev);
    let i, len;
    for (i = 0, len = prevKeys.length; i < len; i++) {
      const key = prevKeys[i];
      if (!key || key === "undefined" || value[key]) continue;
      toggleClassKey(node, key, false);
      delete prev[key];
    }
    for (i = 0, len = classKeys.length; i < len; i++) {
      const key = classKeys[i], classValue = !!value[key];
      if (!key || key === "undefined" || prev[key] === classValue || !classValue) continue;
      toggleClassKey(node, key, true);
      prev[key] = classValue;
    }
    return prev;
  }
  function style(node, value, prev) {
    if (!value) return prev ? setAttribute(node, "style") : value;
    const nodeStyle = node.style;
    if (typeof value === "string") return nodeStyle.cssText = value;
    typeof prev === "string" && (nodeStyle.cssText = prev = void 0);
    prev || (prev = {});
    value || (value = {});
    let v, s;
    for (s in prev) {
      value[s] == null && nodeStyle.removeProperty(s);
      delete prev[s];
    }
    for (s in value) {
      v = value[s];
      if (v !== prev[s]) {
        nodeStyle.setProperty(s, v);
        prev[s] = v;
      }
    }
    return prev;
  }
  function spread(node, props = {}, isSVG, skipChildren) {
    const prevProps = {};
    if (!skipChildren) {
      createRenderEffect(
        () => prevProps.children = insertExpression(node, props.children, prevProps.children)
      );
    }
    createRenderEffect(
      () => typeof props.ref === "function" ? use(props.ref, node) : props.ref = node
    );
    createRenderEffect(() => assign(node, props, isSVG, true, prevProps, true));
    return prevProps;
  }
  function use(fn, element, arg) {
    return untrack(() => fn(element, arg));
  }
  function insert(parent, accessor, marker, initial) {
    if (marker !== void 0 && !initial) initial = [];
    if (typeof accessor !== "function") return insertExpression(parent, accessor, initial, marker);
    createRenderEffect((current) => insertExpression(parent, accessor(), current, marker), initial);
  }
  function assign(node, props, isSVG, skipChildren, prevProps = {}, skipRef = false) {
    props || (props = {});
    for (const prop in prevProps) {
      if (!(prop in props)) {
        if (prop === "children") continue;
        prevProps[prop] = assignProp(node, prop, null, prevProps[prop], isSVG, skipRef);
      }
    }
    for (const prop in props) {
      if (prop === "children") {
        if (!skipChildren) insertExpression(node, props.children);
        continue;
      }
      const value = props[prop];
      prevProps[prop] = assignProp(node, prop, value, prevProps[prop], isSVG, skipRef);
    }
  }
  function getNextElement(template2) {
    let node, key;
    if (!sharedConfig.context || !(node = sharedConfig.registry.get(key = getHydrationKey()))) {
      return template2();
    }
    if (sharedConfig.completed) sharedConfig.completed.add(node);
    sharedConfig.registry.delete(key);
    return node;
  }
  function toPropertyName(name) {
    return name.toLowerCase().replace(/-([a-z])/g, (_, w) => w.toUpperCase());
  }
  function toggleClassKey(node, key, value) {
    const classNames = key.trim().split(/\s+/);
    for (let i = 0, nameLen = classNames.length; i < nameLen; i++)
      node.classList.toggle(classNames[i], value);
  }
  function assignProp(node, prop, value, prev, isSVG, skipRef) {
    let isCE, isProp, isChildProp, propAlias, forceProp;
    if (prop === "style") return style(node, value, prev);
    if (prop === "classList") return classList(node, value, prev);
    if (value === prev) return prev;
    if (prop === "ref") {
      if (!skipRef) value(node);
    } else if (prop.slice(0, 3) === "on:") {
      const e = prop.slice(3);
      prev && node.removeEventListener(e, prev);
      value && node.addEventListener(e, value);
    } else if (prop.slice(0, 10) === "oncapture:") {
      const e = prop.slice(10);
      prev && node.removeEventListener(e, prev, true);
      value && node.addEventListener(e, value, true);
    } else if (prop.slice(0, 2) === "on") {
      const name = prop.slice(2).toLowerCase();
      const delegate = DelegatedEvents.has(name);
      if (!delegate && prev) {
        const h = Array.isArray(prev) ? prev[0] : prev;
        node.removeEventListener(name, h);
      }
      if (delegate || value) {
        addEventListener(node, name, value, delegate);
        delegate && delegateEvents([name]);
      }
    } else if (prop.slice(0, 5) === "attr:") {
      setAttribute(node, prop.slice(5), value);
    } else if ((forceProp = prop.slice(0, 5) === "prop:") || (isChildProp = ChildProperties.has(prop)) || !isSVG && ((propAlias = getPropAlias(prop, node.tagName)) || (isProp = Properties.has(prop))) || (isCE = node.nodeName.includes("-"))) {
      if (forceProp) {
        prop = prop.slice(5);
        isProp = true;
      } else if (!!sharedConfig.context && node.isConnected) return value;
      if (prop === "class" || prop === "className") className(node, value);
      else if (isCE && !isProp && !isChildProp) node[toPropertyName(prop)] = value;
      else node[propAlias || prop] = value;
    } else {
      const ns = isSVG && prop.indexOf(":") > -1 && SVGNamespace[prop.split(":")[0]];
      if (ns) setAttributeNS(node, ns, prop, value);
      else setAttribute(node, Aliases[prop] || prop, value);
    }
    return value;
  }
  function eventHandler(e) {
    const key = `$$${e.type}`;
    let node = e.composedPath && e.composedPath()[0] || e.target;
    if (e.target !== node) {
      Object.defineProperty(e, "target", {
        configurable: true,
        value: node
      });
    }
    Object.defineProperty(e, "currentTarget", {
      configurable: true,
      get() {
        return node || document;
      }
    });
    if (sharedConfig.registry && !sharedConfig.done) sharedConfig.done = _$HY.done = true;
    while (node) {
      const handler2 = node[key];
      if (handler2 && !node.disabled) {
        const data2 = node[`${key}Data`];
        data2 !== void 0 ? handler2.call(node, data2, e) : handler2.call(node, e);
        if (e.cancelBubble) return;
      }
      node = node._$host || node.parentNode || node.host;
    }
  }
  function insertExpression(parent, value, current, marker, unwrapArray) {
    const hydrating = !!sharedConfig.context && parent.isConnected;
    if (hydrating) {
      !current && (current = [...parent.childNodes]);
      let cleaned = [];
      for (let i = 0; i < current.length; i++) {
        const node = current[i];
        if (node.nodeType === 8 && node.data.slice(0, 2) === "!$") node.remove();
        else cleaned.push(node);
      }
      current = cleaned;
    }
    while (typeof current === "function") current = current();
    if (value === current) return current;
    const t = typeof value, multi = marker !== void 0;
    parent = multi && current[0] && current[0].parentNode || parent;
    if (t === "string" || t === "number") {
      if (hydrating) return current;
      if (t === "number") value = value.toString();
      if (multi) {
        let node = current[0];
        if (node && node.nodeType === 3) {
          node.data !== value && (node.data = value);
        } else node = document.createTextNode(value);
        current = cleanChildren(parent, current, marker, node);
      } else {
        if (current !== "" && typeof current === "string") {
          current = parent.firstChild.data = value;
        } else current = parent.textContent = value;
      }
    } else if (value == null || t === "boolean") {
      if (hydrating) return current;
      current = cleanChildren(parent, current, marker);
    } else if (t === "function") {
      createRenderEffect(() => {
        let v = value();
        while (typeof v === "function") v = v();
        current = insertExpression(parent, v, current, marker);
      });
      return () => current;
    } else if (Array.isArray(value)) {
      const array = [];
      const currentArray = current && Array.isArray(current);
      if (normalizeIncomingArray(array, value, current, unwrapArray)) {
        createRenderEffect(() => current = insertExpression(parent, array, current, marker, true));
        return () => current;
      }
      if (hydrating) {
        if (!array.length) return current;
        if (marker === void 0) return [...parent.childNodes];
        let node = array[0];
        let nodes = [node];
        while ((node = node.nextSibling) !== marker) nodes.push(node);
        return current = nodes;
      }
      if (array.length === 0) {
        current = cleanChildren(parent, current, marker);
        if (multi) return current;
      } else if (currentArray) {
        if (current.length === 0) {
          appendNodes(parent, array, marker);
        } else reconcileArrays(parent, current, array);
      } else {
        current && cleanChildren(parent);
        appendNodes(parent, array);
      }
      current = array;
    } else if (value.nodeType) {
      if (hydrating && value.parentNode) return current = multi ? [value] : value;
      if (Array.isArray(current)) {
        if (multi) return current = cleanChildren(parent, current, marker, value);
        cleanChildren(parent, current, null, value);
      } else if (current == null || current === "" || !parent.firstChild) {
        parent.appendChild(value);
      } else parent.replaceChild(value, parent.firstChild);
      current = value;
    } else ;
    return current;
  }
  function normalizeIncomingArray(normalized, array, current, unwrap) {
    let dynamic = false;
    for (let i = 0, len = array.length; i < len; i++) {
      let item = array[i], prev = current && current[normalized.length], t;
      if (item == null || item === true || item === false) ;
      else if ((t = typeof item) === "object" && item.nodeType) {
        normalized.push(item);
      } else if (Array.isArray(item)) {
        dynamic = normalizeIncomingArray(normalized, item, prev) || dynamic;
      } else if (t === "function") {
        if (unwrap) {
          while (typeof item === "function") item = item();
          dynamic = normalizeIncomingArray(
            normalized,
            Array.isArray(item) ? item : [item],
            Array.isArray(prev) ? prev : [prev]
          ) || dynamic;
        } else {
          normalized.push(item);
          dynamic = true;
        }
      } else {
        const value = String(item);
        if (prev && prev.nodeType === 3 && prev.data === value) normalized.push(prev);
        else normalized.push(document.createTextNode(value));
      }
    }
    return dynamic;
  }
  function appendNodes(parent, array, marker = null) {
    for (let i = 0, len = array.length; i < len; i++) parent.insertBefore(array[i], marker);
  }
  function cleanChildren(parent, current, marker, replacement) {
    if (marker === void 0) return parent.textContent = "";
    const node = replacement || document.createTextNode("");
    if (current.length) {
      let inserted = false;
      for (let i = current.length - 1; i >= 0; i--) {
        const el = current[i];
        if (node !== el) {
          const isParent = el.parentNode === parent;
          if (!inserted && !i)
            isParent ? parent.replaceChild(node, el) : parent.insertBefore(node, marker);
          else isParent && el.remove();
        } else inserted = true;
      }
    } else parent.insertBefore(node, marker);
    return [node];
  }
  function getHydrationKey() {
    const hydrate = sharedConfig.context;
    return `${hydrate.id}${hydrate.count++}`;
  }
  var RequestContext = Symbol();
  var SVG_NAMESPACE = "http://www.w3.org/2000/svg";
  function createElement(tagName, isSVG = false) {
    return isSVG ? document.createElementNS(SVG_NAMESPACE, tagName) : document.createElement(tagName);
  }
  function Portal(props) {
    const { useShadow } = props, marker = document.createTextNode(""), mount = () => props.mount || document.body, owner = getOwner();
    let content;
    let hydrating = !!sharedConfig.context;
    createEffect(
      () => {
        if (hydrating) getOwner().user = hydrating = false;
        content || (content = runWithOwner(owner, () => createMemo(() => props.children)));
        const el = mount();
        if (el instanceof HTMLHeadElement) {
          const [clean, setClean] = createSignal(false);
          const cleanup = () => setClean(true);
          createRoot((dispose2) => insert(el, () => !clean() ? content() : dispose2(), null));
          onCleanup(cleanup);
        } else {
          const container = createElement(props.isSVG ? "g" : "div", props.isSVG), renderRoot = useShadow && container.attachShadow ? container.attachShadow({
            mode: "open"
          }) : container;
          Object.defineProperty(container, "_$host", {
            get() {
              return marker.parentNode;
            },
            configurable: true
          });
          insert(renderRoot, content);
          el.appendChild(container);
          props.ref && props.ref(container);
          onCleanup(() => el.removeChild(container));
        }
      },
      void 0,
      {
        render: !hydrating
      }
    );
    return marker;
  }
  function Dynamic(props) {
    const [p, others] = splitProps(props, ["component"]);
    const cached = createMemo(() => p.component);
    return createMemo(() => {
      const component = cached();
      switch (typeof component) {
        case "function":
          return untrack(() => component(others));
        case "string":
          const isSvg = SVGElements.has(component);
          const el = sharedConfig.context ? getNextElement() : createElement(component, isSvg);
          spread(el, others, isSvg);
          return el;
      }
    });
  }

  // node_modules/.pnpm/@corvu+utils@0.2.0_solid-js@1.8.17/node_modules/@corvu/utils/dist/chunk/OZCI4NDN.js
  var access = (v) => typeof v === "function" ? v() : v;
  var chain = (callbacks) => {
    return (...args) => {
      for (const callback of callbacks)
        callback && callback(...args);
    };
  };
  var mergeRefs = (...refs) => {
    return chain(refs);
  };
  var some = (...signals) => {
    return signals.some((signal) => !!signal());
  };

  // node_modules/.pnpm/@corvu+utils@0.2.0_solid-js@1.8.17/node_modules/@corvu/utils/dist/chunk/A7SFFOAG.js
  var createTagName = (props) => {
    const tagName = createMemo(
      () => access(props.element)?.tagName.toLowerCase() ?? props.fallback
    );
    return tagName;
  };
  var tagName_default = createTagName;

  // node_modules/.pnpm/@corvu+utils@0.2.0_solid-js@1.8.17/node_modules/@corvu/utils/dist/chunk/2WOKOHZS.js
  var isFunction = (value) => {
    return typeof value === "function";
  };
  var buttonInputTypes = ["button", "color", "file", "image", "reset", "submit"];
  var isButton = (tagName, type) => {
    if (tagName === "button")
      return true;
    if (tagName === "input" && type !== void 0) {
      return buttonInputTypes.indexOf(type) !== -1;
    }
    return false;
  };
  var dataIf = (condition) => condition ? "" : void 0;

  // node_modules/.pnpm/@corvu+utils@0.2.0_solid-js@1.8.17/node_modules/@corvu/utils/dist/chunk/7TEIQTJZ.js
  var DEFAULT_DYNAMIC_ELEMENT = "div";
  var Dynamic2 = (props) => {
    const [localProps, otherProps] = splitProps(props, ["as"]);
    const cached = createMemo(() => localProps.as ?? DEFAULT_DYNAMIC_ELEMENT);
    const memoizedDynamic = createMemo(() => {
      const component = cached();
      switch (typeof component) {
        case "function":
          return untrack(() => component(otherProps));
        case "string":
          return createComponent(Dynamic, mergeProps({
            component
          }, otherProps));
      }
    });
    return memoizedDynamic;
  };
  var Dynamic_default = Dynamic2;
  var DEFAULT_DYNAMIC_BUTTON_ELEMENT = "button";
  var DynamicButton = (props) => {
    const [ref, setRef] = createSignal(null);
    const [localProps, otherProps] = splitProps(props, ["ref", "type"]);
    const tagName = tagName_default({
      element: ref,
      fallback: DEFAULT_DYNAMIC_BUTTON_ELEMENT
    });
    const memoizedIsButton = createMemo(() => {
      return isButton(tagName(), localProps.type);
    });
    return createComponent(Dynamic_default, mergeProps({
      ref(r$) {
        var _ref$ = mergeRefs(setRef, localProps.ref);
        typeof _ref$ === "function" && _ref$(r$);
      },
      get type() {
        return memoizedIsButton() ? "button" : void 0;
      },
      get role() {
        return !memoizedIsButton() ? "button" : void 0;
      }
    }, otherProps));
  };
  var DynamicButton_default = DynamicButton;

  // node_modules/.pnpm/@corvu+utils@0.2.0_solid-js@1.8.17/node_modules/@corvu/utils/dist/create/keyedContext.js
  var keyedContexts = /* @__PURE__ */ new Map();
  var createKeyedContext = (key, defaultValue) => {
    if (keyedContexts.has(key)) {
      return keyedContexts.get(key);
    }
    const keyedContext = createContext(defaultValue);
    keyedContexts.set(key, keyedContext);
    return keyedContext;
  };
  var useKeyedContext = (key) => {
    const keyedContext = keyedContexts.get(key);
    if (!keyedContext)
      return void 0;
    return useContext(keyedContext);
  };

  // node_modules/.pnpm/@corvu+utils@0.2.0_solid-js@1.8.17/node_modules/@corvu/utils/dist/chunk/2NBQPVIG.js
  var getFloatingStyle = (props) => {
    const memoizedFloatingStyle = createMemo(() => {
      const strategy = access(props.strategy);
      const floatingState = access(props.floatingState);
      const side = floatingState.placement.split("-")[0];
      const alignment = floatingState.placement.split("-")[1];
      let transformOrigin;
      switch (floatingState.placement) {
        case "top":
        case "bottom":
          transformOrigin = `${alignment ? alignment : "center"} ${PositionToDirection[side]}`;
        case "left":
        case "right":
          transformOrigin = `${PositionToDirection[side]} ${alignment ? alignment : "center"}`;
      }
      return {
        position: strategy,
        top: `${floatingState.y}px`,
        left: `${floatingState.x}px`,
        width: floatingState.width !== null ? `${floatingState.width}px` : void 0,
        height: floatingState.height !== null ? `${floatingState.height}px` : void 0,
        "max-width": floatingState.maxWidth !== null ? `${floatingState.maxWidth}px` : void 0,
        "max-height": floatingState.maxHeight !== null ? `${floatingState.maxHeight}px` : void 0,
        "--corvu-floating-transform-origin": transformOrigin
      };
    });
    return memoizedFloatingStyle;
  };
  var PositionToDirection = {
    top: "bottom",
    bottom: "top",
    left: "right",
    right: "left"
  };

  // node_modules/.pnpm/@corvu+utils@0.2.0_solid-js@1.8.17/node_modules/@corvu/utils/dist/components/FloatingArrow.js
  var _tmpl$ = /* @__PURE__ */ template(`<svg viewBox="0 0 14 8"fill=none xmlns=http://www.w3.org/2000/svg><path d="M0 0L6.24742 7.13991C6.64583 7.59524 7.35416 7.59524 7.75258 7.13991L14 0H0Z"fill=currentColor>`);
  var DEFAULT_FLOATING_ARROW_ELEMENT = "div";
  var Transform = {
    top: "rotate(180deg)",
    bottom: "translate3d(0, 100%, 0)",
    left: "translate3d(0, 50%, 0) rotate(90deg) translate3d(-50%, 0, 0)",
    right: "translate3d(0, 50%, 0) rotate(-90deg) translate3d(50%, 0, 0)"
  };
  var TransformOrigin = {
    top: "center 0px",
    bottom: void 0,
    left: "0px 0px",
    right: "100% 0px"
  };
  var FloatingArrow = (props) => {
    const defaultedProps = mergeProps({
      size: 16
    }, props);
    const [localProps, otherProps] = splitProps(defaultedProps, ["as", "floatingState", "size", "style", "children"]);
    const arrowDirection = createMemo(() => PositionToDirection[localProps.floatingState.placement.split("-")[0]]);
    const arrowTop = createMemo(() => {
      const y = localProps.floatingState.arrowY;
      if (y === null)
        return void 0;
      return `${y}px`;
    });
    const arrowLeft = createMemo(() => {
      const x = localProps.floatingState.arrowX;
      if (x === null)
        return void 0;
      return `${x}px`;
    });
    const resolveChildren2 = children(() => localProps.children);
    const defaultArrow = () => resolveChildren2.toArray().length === 0;
    return createComponent(Dynamic_default, mergeProps({
      get as() {
        return localProps.as ?? DEFAULT_FLOATING_ARROW_ELEMENT;
      },
      get style() {
        return {
          position: "absolute",
          left: arrowLeft(),
          top: arrowTop(),
          [arrowDirection()]: "0px",
          transform: Transform[arrowDirection()],
          "transform-origin": TransformOrigin[arrowDirection()],
          height: defaultArrow() ? `${localProps.size}px` : void 0,
          width: defaultArrow() ? `${localProps.size}px` : void 0,
          "pointer-events": "none",
          ...localProps.style
        };
      }
    }, otherProps, {
      get children() {
        return createComponent(Show, {
          get when() {
            return defaultArrow();
          },
          get fallback() {
            return resolveChildren2();
          },
          get children() {
            return _tmpl$();
          }
        });
      }
    }));
  };
  var FloatingArrow_default = FloatingArrow;

  // node_modules/.pnpm/@corvu+utils@0.2.0_solid-js@1.8.17/node_modules/@corvu/utils/dist/chunk/6PYUKSWQ.js
  var activeStyles = /* @__PURE__ */ new Map();
  var createStyle = (props) => {
    createEffect(() => {
      const style2 = access(props.style) ?? {};
      const properties = access(props.properties) ?? [];
      const originalStyles = {};
      for (const key in style2) {
        originalStyles[key] = props.element.style[key];
      }
      const activeStyle = activeStyles.get(props.key);
      if (activeStyle) {
        activeStyle.activeCount++;
      } else {
        activeStyles.set(props.key, {
          activeCount: 1,
          originalStyles,
          properties: properties.map((property) => property.key)
        });
      }
      Object.assign(props.element.style, props.style);
      for (const property of properties) {
        props.element.style.setProperty(property.key, property.value);
      }
      onCleanup(() => {
        const activeStyle2 = activeStyles.get(props.key);
        if (!activeStyle2)
          return;
        if (activeStyle2.activeCount !== 1) {
          activeStyle2.activeCount--;
          return;
        }
        activeStyles.delete(props.key);
        for (const [key, value] of Object.entries(activeStyle2.originalStyles)) {
          props.element.style[key] = value;
        }
        for (const property of activeStyle2.properties) {
          props.element.style.removeProperty(property);
        }
        if (props.element.style.length === 0) {
          props.element.removeAttribute("style");
        }
        props.cleanup?.();
      });
    });
  };
  var style_default = createStyle;

  // node_modules/.pnpm/@corvu+utils@0.2.0_solid-js@1.8.17/node_modules/@corvu/utils/dist/chunk/RIR6JQYF.js
  var createNoPointerEvents = (props) => {
    const defaultedProps = mergeProps(
      {
        enabled: true
      },
      props
    );
    createEffect(() => {
      const { body } = document;
      if (!access(defaultedProps.enabled))
        return;
      style_default({
        key: "no-pointer-events",
        element: body,
        style: {
          pointerEvents: "none"
        }
      });
    });
  };
  var noPointerEvents_default = createNoPointerEvents;

  // node_modules/.pnpm/@corvu+utils@0.2.0_solid-js@1.8.17/node_modules/@corvu/utils/dist/chunk/ZGBCCOKW.js
  var createOutsidePointer = (props) => {
    const defaultedProps = mergeProps(
      {
        enabled: true,
        strategy: "pointerup"
      },
      props
    );
    createEffect(() => {
      if (!access(defaultedProps.enabled)) {
        return;
      }
      const strategy = access(defaultedProps.strategy);
      document.addEventListener(strategy, handlePointer);
      onCleanup(() => {
        document.removeEventListener(strategy, handlePointer);
      });
    });
    const handlePointer = (event) => {
      const element = access(defaultedProps.element);
      const ignore = access(defaultedProps.ignore);
      if (element && !element.contains(event.target) && !(ignore && ignore.contains(event.target))) {
        defaultedProps.onPointer(event);
      }
    };
  };
  var outsidePointer_default = createOutsidePointer;

  // node_modules/.pnpm/@corvu+utils@0.2.0_solid-js@1.8.17/node_modules/@corvu/utils/dist/chunk/K6EPLWU3.js
  var createEscapeKeyDown = (props) => {
    const defaultedProps = mergeProps(
      {
        enabled: true
      },
      props
    );
    createEffect(() => {
      if (!access(defaultedProps.enabled)) {
        return;
      }
      document.addEventListener("keydown", handleKeyDown);
      onCleanup(() => {
        document.removeEventListener("keydown", handleKeyDown);
      });
    });
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        defaultedProps.onEscapeKeyDown(event);
      }
    };
  };
  var escapeKeyDown_default = createEscapeKeyDown;

  // node_modules/.pnpm/@corvu+utils@0.2.0_solid-js@1.8.17/node_modules/@corvu/utils/dist/chunk/5G3ZDSU3.js
  var createDismissible = (props) => {
    const defaultedProps = mergeProps(
      {
        dismissOnEscapeKeyDown: true,
        dismissOnOutsidePointer: true,
        closeOnOutsidePointerStrategy: "pointerup",
        noOutsidePointerEvents: true
      },
      props
    );
    escapeKeyDown_default({
      enabled: defaultedProps.dismissOnEscapeKeyDown,
      onEscapeKeyDown: (event) => {
        defaultedProps.onEscapeKeyDown?.(event);
        if (!event.defaultPrevented) {
          defaultedProps.onDismiss("escapeKey");
        }
      }
    });
    outsidePointer_default({
      enabled: defaultedProps.dismissOnOutsidePointer,
      strategy: defaultedProps.closeOnOutsidePointerStrategy,
      ignore: defaultedProps.dismissOnOutsidePointerIgnore,
      onPointer: (event) => {
        defaultedProps.onOutsidePointer?.(event);
        if (!event.defaultPrevented) {
          const ctrlLeftClick = event.button === 0 && event.ctrlKey === true;
          const isRightClick = event.button === 2 || ctrlLeftClick;
          if (isRightClick)
            return;
          defaultedProps.onDismiss("pointerOutside");
        }
      },
      element: defaultedProps.element
    });
    noPointerEvents_default({
      enabled: defaultedProps.noOutsidePointerEvents
    });
  };
  var dismissible_default = createDismissible;

  // node_modules/.pnpm/@corvu+utils@0.2.0_solid-js@1.8.17/node_modules/@corvu/utils/dist/components/Dismissible.js
  var DismissibleContext = createContext();
  var Dismissible = (props) => {
    const memoizedDismissible = createMemo(() => {
      const upperContext = useContext(DismissibleContext);
      if (upperContext) {
        return createComponent(DismissibleLayer, props);
      }
      const layerId = createUniqueId();
      const [layers, setLayers] = createSignal([layerId]);
      const onLayerShow = (layerId2) => {
        setLayers((layers2) => [...layers2, layerId2]);
      };
      const onLayerDismiss = (layerId2) => {
        setLayers((layers2) => layers2.filter((layer) => layer !== layerId2));
      };
      return createComponent(DismissibleContext.Provider, {
        value: {
          layers,
          onLayerShow,
          onLayerDismiss
        },
        get children() {
          return createComponent(DismissibleLayer, props);
        }
      });
    });
    return memoizedDismissible;
  };
  var DismissibleLayer = (props) => {
    const defaultedProps = mergeProps({
      enabled: true,
      dismissOnEscapeKeyDown: true,
      dismissOnOutsidePointer: true,
      dismissOnOutsidePointerStrategy: "pointerup",
      noOutsidePointerEvents: true
    }, props);
    const [localProps, otherProps] = splitProps(defaultedProps, ["enabled", "children", "dismissOnEscapeKeyDown", "dismissOnOutsidePointer", "dismissOnOutsidePointerStrategy", "dismissOnOutsidePointerIgnore", "noOutsidePointerEvents", "onDismiss"]);
    const context = useContext(DismissibleContext);
    const layerId = createUniqueId();
    onCleanup(() => {
      context.onLayerDismiss(layerId);
    });
    createEffect(() => {
      if (localProps.enabled) {
        context.onLayerShow(layerId);
      } else {
        context.onLayerDismiss(layerId);
      }
    });
    const isLastLayer = () => {
      return context.layers()[context.layers().length - 1] === layerId;
    };
    dismissible_default({
      dismissOnEscapeKeyDown: () => access(localProps.dismissOnEscapeKeyDown) && isLastLayer() && localProps.enabled,
      dismissOnOutsidePointer: () => access(localProps.dismissOnOutsidePointer) && isLastLayer() && localProps.enabled,
      dismissOnOutsidePointerStrategy: localProps.dismissOnOutsidePointerStrategy,
      dismissOnOutsidePointerIgnore: localProps.dismissOnOutsidePointerIgnore,
      noOutsidePointerEvents: () => access(localProps.noOutsidePointerEvents) && localProps.enabled,
      onDismiss: (reason) => {
        localProps.onDismiss(reason);
      },
      ...otherProps
    });
    const memoizedChildren = createMemo(() => localProps.children);
    const resolveChildren2 = () => {
      const children2 = memoizedChildren();
      if (isFunction(children2)) {
        return children2({
          get isLastLayer() {
            return isLastLayer();
          }
        });
      }
      return children2;
    };
    return untrack(() => resolveChildren2());
  };
  var Dismissible_default = Dismissible;

  // node_modules/.pnpm/@corvu+utils@0.2.0_solid-js@1.8.17/node_modules/@corvu/utils/dist/chunk/UXTHOCCU.js
  var afterPaint = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));
  var callEventHandler = (eventHandler2, event) => {
    if (eventHandler2) {
      if (isFunction(eventHandler2)) {
        eventHandler2(event);
      } else {
        eventHandler2[0](eventHandler2[1], event);
      }
    }
    return event.defaultPrevented;
  };

  // node_modules/.pnpm/@corvu+utils@0.2.0_solid-js@1.8.17/node_modules/@corvu/utils/dist/create/controllableSignal.js
  function createControllableSignal(props) {
    const [uncontrolledSignal, setUncontrolledSignal] = createSignal(
      props.initialValue
    );
    const isControlled = () => props.value?.() !== void 0;
    const value = () => isControlled() ? props.value?.() : uncontrolledSignal();
    const setValue = (next) => {
      return untrack(() => {
        let nextValue;
        if (isFunction(next)) {
          nextValue = next(value());
        } else {
          nextValue = next;
        }
        if (!Object.is(nextValue, value())) {
          if (!isControlled()) {
            setUncontrolledSignal(nextValue);
          }
          props.onChange?.(nextValue);
        }
        return nextValue;
      });
    };
    return [value, setValue];
  }
  var controllableSignal_default = createControllableSignal;

  // node_modules/.pnpm/@floating-ui+utils@0.2.2/node_modules/@floating-ui/utils/dist/floating-ui.utils.mjs
  var sides = ["top", "right", "bottom", "left"];
  var alignments = ["start", "end"];
  var placements = /* @__PURE__ */ sides.reduce((acc, side) => acc.concat(side, side + "-" + alignments[0], side + "-" + alignments[1]), []);
  var min = Math.min;
  var max = Math.max;
  var round = Math.round;
  var floor = Math.floor;
  var createCoords = (v) => ({
    x: v,
    y: v
  });
  var oppositeSideMap = {
    left: "right",
    right: "left",
    bottom: "top",
    top: "bottom"
  };
  var oppositeAlignmentMap = {
    start: "end",
    end: "start"
  };
  function clamp(start, value, end) {
    return max(start, min(value, end));
  }
  function evaluate(value, param) {
    return typeof value === "function" ? value(param) : value;
  }
  function getSide(placement) {
    return placement.split("-")[0];
  }
  function getAlignment(placement) {
    return placement.split("-")[1];
  }
  function getOppositeAxis(axis) {
    return axis === "x" ? "y" : "x";
  }
  function getAxisLength(axis) {
    return axis === "y" ? "height" : "width";
  }
  function getSideAxis(placement) {
    return ["top", "bottom"].includes(getSide(placement)) ? "y" : "x";
  }
  function getAlignmentAxis(placement) {
    return getOppositeAxis(getSideAxis(placement));
  }
  function getAlignmentSides(placement, rects, rtl) {
    if (rtl === void 0) {
      rtl = false;
    }
    const alignment = getAlignment(placement);
    const alignmentAxis = getAlignmentAxis(placement);
    const length = getAxisLength(alignmentAxis);
    let mainAlignmentSide = alignmentAxis === "x" ? alignment === (rtl ? "end" : "start") ? "right" : "left" : alignment === "start" ? "bottom" : "top";
    if (rects.reference[length] > rects.floating[length]) {
      mainAlignmentSide = getOppositePlacement(mainAlignmentSide);
    }
    return [mainAlignmentSide, getOppositePlacement(mainAlignmentSide)];
  }
  function getExpandedPlacements(placement) {
    const oppositePlacement = getOppositePlacement(placement);
    return [getOppositeAlignmentPlacement(placement), oppositePlacement, getOppositeAlignmentPlacement(oppositePlacement)];
  }
  function getOppositeAlignmentPlacement(placement) {
    return placement.replace(/start|end/g, (alignment) => oppositeAlignmentMap[alignment]);
  }
  function getSideList(side, isStart, rtl) {
    const lr = ["left", "right"];
    const rl = ["right", "left"];
    const tb = ["top", "bottom"];
    const bt = ["bottom", "top"];
    switch (side) {
      case "top":
      case "bottom":
        if (rtl) return isStart ? rl : lr;
        return isStart ? lr : rl;
      case "left":
      case "right":
        return isStart ? tb : bt;
      default:
        return [];
    }
  }
  function getOppositeAxisPlacements(placement, flipAlignment, direction, rtl) {
    const alignment = getAlignment(placement);
    let list = getSideList(getSide(placement), direction === "start", rtl);
    if (alignment) {
      list = list.map((side) => side + "-" + alignment);
      if (flipAlignment) {
        list = list.concat(list.map(getOppositeAlignmentPlacement));
      }
    }
    return list;
  }
  function getOppositePlacement(placement) {
    return placement.replace(/left|right|bottom|top/g, (side) => oppositeSideMap[side]);
  }
  function expandPaddingObject(padding) {
    return {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      ...padding
    };
  }
  function getPaddingObject(padding) {
    return typeof padding !== "number" ? expandPaddingObject(padding) : {
      top: padding,
      right: padding,
      bottom: padding,
      left: padding
    };
  }
  function rectToClientRect(rect) {
    const {
      x,
      y,
      width,
      height
    } = rect;
    return {
      width,
      height,
      top: y,
      left: x,
      right: x + width,
      bottom: y + height,
      x,
      y
    };
  }

  // node_modules/.pnpm/@floating-ui+core@1.6.1/node_modules/@floating-ui/core/dist/floating-ui.core.mjs
  function computeCoordsFromPlacement(_ref, placement, rtl) {
    let {
      reference,
      floating
    } = _ref;
    const sideAxis = getSideAxis(placement);
    const alignmentAxis = getAlignmentAxis(placement);
    const alignLength = getAxisLength(alignmentAxis);
    const side = getSide(placement);
    const isVertical = sideAxis === "y";
    const commonX = reference.x + reference.width / 2 - floating.width / 2;
    const commonY = reference.y + reference.height / 2 - floating.height / 2;
    const commonAlign = reference[alignLength] / 2 - floating[alignLength] / 2;
    let coords;
    switch (side) {
      case "top":
        coords = {
          x: commonX,
          y: reference.y - floating.height
        };
        break;
      case "bottom":
        coords = {
          x: commonX,
          y: reference.y + reference.height
        };
        break;
      case "right":
        coords = {
          x: reference.x + reference.width,
          y: commonY
        };
        break;
      case "left":
        coords = {
          x: reference.x - floating.width,
          y: commonY
        };
        break;
      default:
        coords = {
          x: reference.x,
          y: reference.y
        };
    }
    switch (getAlignment(placement)) {
      case "start":
        coords[alignmentAxis] -= commonAlign * (rtl && isVertical ? -1 : 1);
        break;
      case "end":
        coords[alignmentAxis] += commonAlign * (rtl && isVertical ? -1 : 1);
        break;
    }
    return coords;
  }
  var computePosition = async (reference, floating, config) => {
    const {
      placement = "bottom",
      strategy = "absolute",
      middleware = [],
      platform: platform2
    } = config;
    const validMiddleware = middleware.filter(Boolean);
    const rtl = await (platform2.isRTL == null ? void 0 : platform2.isRTL(floating));
    let rects = await platform2.getElementRects({
      reference,
      floating,
      strategy
    });
    let {
      x,
      y
    } = computeCoordsFromPlacement(rects, placement, rtl);
    let statefulPlacement = placement;
    let middlewareData = {};
    let resetCount = 0;
    for (let i = 0; i < validMiddleware.length; i++) {
      const {
        name,
        fn
      } = validMiddleware[i];
      const {
        x: nextX,
        y: nextY,
        data: data2,
        reset: reset2
      } = await fn({
        x,
        y,
        initialPlacement: placement,
        placement: statefulPlacement,
        strategy,
        middlewareData,
        rects,
        platform: platform2,
        elements: {
          reference,
          floating
        }
      });
      x = nextX != null ? nextX : x;
      y = nextY != null ? nextY : y;
      middlewareData = {
        ...middlewareData,
        [name]: {
          ...middlewareData[name],
          ...data2
        }
      };
      if (reset2 && resetCount <= 50) {
        resetCount++;
        if (typeof reset2 === "object") {
          if (reset2.placement) {
            statefulPlacement = reset2.placement;
          }
          if (reset2.rects) {
            rects = reset2.rects === true ? await platform2.getElementRects({
              reference,
              floating,
              strategy
            }) : reset2.rects;
          }
          ({
            x,
            y
          } = computeCoordsFromPlacement(rects, statefulPlacement, rtl));
        }
        i = -1;
      }
    }
    return {
      x,
      y,
      placement: statefulPlacement,
      strategy,
      middlewareData
    };
  };
  async function detectOverflow(state, options) {
    var _await$platform$isEle;
    if (options === void 0) {
      options = {};
    }
    const {
      x,
      y,
      platform: platform2,
      rects,
      elements,
      strategy
    } = state;
    const {
      boundary = "clippingAncestors",
      rootBoundary = "viewport",
      elementContext = "floating",
      altBoundary = false,
      padding = 0
    } = evaluate(options, state);
    const paddingObject = getPaddingObject(padding);
    const altContext = elementContext === "floating" ? "reference" : "floating";
    const element = elements[altBoundary ? altContext : elementContext];
    const clippingClientRect = rectToClientRect(await platform2.getClippingRect({
      element: ((_await$platform$isEle = await (platform2.isElement == null ? void 0 : platform2.isElement(element))) != null ? _await$platform$isEle : true) ? element : element.contextElement || await (platform2.getDocumentElement == null ? void 0 : platform2.getDocumentElement(elements.floating)),
      boundary,
      rootBoundary,
      strategy
    }));
    const rect = elementContext === "floating" ? {
      x,
      y,
      width: rects.floating.width,
      height: rects.floating.height
    } : rects.reference;
    const offsetParent = await (platform2.getOffsetParent == null ? void 0 : platform2.getOffsetParent(elements.floating));
    const offsetScale = await (platform2.isElement == null ? void 0 : platform2.isElement(offsetParent)) ? await (platform2.getScale == null ? void 0 : platform2.getScale(offsetParent)) || {
      x: 1,
      y: 1
    } : {
      x: 1,
      y: 1
    };
    const elementClientRect = rectToClientRect(platform2.convertOffsetParentRelativeRectToViewportRelativeRect ? await platform2.convertOffsetParentRelativeRectToViewportRelativeRect({
      elements,
      rect,
      offsetParent,
      strategy
    }) : rect);
    return {
      top: (clippingClientRect.top - elementClientRect.top + paddingObject.top) / offsetScale.y,
      bottom: (elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom) / offsetScale.y,
      left: (clippingClientRect.left - elementClientRect.left + paddingObject.left) / offsetScale.x,
      right: (elementClientRect.right - clippingClientRect.right + paddingObject.right) / offsetScale.x
    };
  }
  var arrow = (options) => ({
    name: "arrow",
    options,
    async fn(state) {
      const {
        x,
        y,
        placement,
        rects,
        platform: platform2,
        elements,
        middlewareData
      } = state;
      const {
        element,
        padding = 0
      } = evaluate(options, state) || {};
      if (element == null) {
        return {};
      }
      const paddingObject = getPaddingObject(padding);
      const coords = {
        x,
        y
      };
      const axis = getAlignmentAxis(placement);
      const length = getAxisLength(axis);
      const arrowDimensions = await platform2.getDimensions(element);
      const isYAxis = axis === "y";
      const minProp = isYAxis ? "top" : "left";
      const maxProp = isYAxis ? "bottom" : "right";
      const clientProp = isYAxis ? "clientHeight" : "clientWidth";
      const endDiff = rects.reference[length] + rects.reference[axis] - coords[axis] - rects.floating[length];
      const startDiff = coords[axis] - rects.reference[axis];
      const arrowOffsetParent = await (platform2.getOffsetParent == null ? void 0 : platform2.getOffsetParent(element));
      let clientSize = arrowOffsetParent ? arrowOffsetParent[clientProp] : 0;
      if (!clientSize || !await (platform2.isElement == null ? void 0 : platform2.isElement(arrowOffsetParent))) {
        clientSize = elements.floating[clientProp] || rects.floating[length];
      }
      const centerToReference = endDiff / 2 - startDiff / 2;
      const largestPossiblePadding = clientSize / 2 - arrowDimensions[length] / 2 - 1;
      const minPadding = min(paddingObject[minProp], largestPossiblePadding);
      const maxPadding = min(paddingObject[maxProp], largestPossiblePadding);
      const min$1 = minPadding;
      const max2 = clientSize - arrowDimensions[length] - maxPadding;
      const center = clientSize / 2 - arrowDimensions[length] / 2 + centerToReference;
      const offset3 = clamp(min$1, center, max2);
      const shouldAddOffset = !middlewareData.arrow && getAlignment(placement) != null && center !== offset3 && rects.reference[length] / 2 - (center < min$1 ? minPadding : maxPadding) - arrowDimensions[length] / 2 < 0;
      const alignmentOffset = shouldAddOffset ? center < min$1 ? center - min$1 : center - max2 : 0;
      return {
        [axis]: coords[axis] + alignmentOffset,
        data: {
          [axis]: offset3,
          centerOffset: center - offset3 - alignmentOffset,
          ...shouldAddOffset && {
            alignmentOffset
          }
        },
        reset: shouldAddOffset
      };
    }
  });
  function getPlacementList(alignment, autoAlignment, allowedPlacements) {
    const allowedPlacementsSortedByAlignment = alignment ? [...allowedPlacements.filter((placement) => getAlignment(placement) === alignment), ...allowedPlacements.filter((placement) => getAlignment(placement) !== alignment)] : allowedPlacements.filter((placement) => getSide(placement) === placement);
    return allowedPlacementsSortedByAlignment.filter((placement) => {
      if (alignment) {
        return getAlignment(placement) === alignment || (autoAlignment ? getOppositeAlignmentPlacement(placement) !== placement : false);
      }
      return true;
    });
  }
  var autoPlacement = function(options) {
    if (options === void 0) {
      options = {};
    }
    return {
      name: "autoPlacement",
      options,
      async fn(state) {
        var _middlewareData$autoP, _middlewareData$autoP2, _placementsThatFitOnE;
        const {
          rects,
          middlewareData,
          placement,
          platform: platform2,
          elements
        } = state;
        const {
          crossAxis = false,
          alignment,
          allowedPlacements = placements,
          autoAlignment = true,
          ...detectOverflowOptions
        } = evaluate(options, state);
        const placements$1 = alignment !== void 0 || allowedPlacements === placements ? getPlacementList(alignment || null, autoAlignment, allowedPlacements) : allowedPlacements;
        const overflow = await detectOverflow(state, detectOverflowOptions);
        const currentIndex = ((_middlewareData$autoP = middlewareData.autoPlacement) == null ? void 0 : _middlewareData$autoP.index) || 0;
        const currentPlacement = placements$1[currentIndex];
        if (currentPlacement == null) {
          return {};
        }
        const alignmentSides = getAlignmentSides(currentPlacement, rects, await (platform2.isRTL == null ? void 0 : platform2.isRTL(elements.floating)));
        if (placement !== currentPlacement) {
          return {
            reset: {
              placement: placements$1[0]
            }
          };
        }
        const currentOverflows = [overflow[getSide(currentPlacement)], overflow[alignmentSides[0]], overflow[alignmentSides[1]]];
        const allOverflows = [...((_middlewareData$autoP2 = middlewareData.autoPlacement) == null ? void 0 : _middlewareData$autoP2.overflows) || [], {
          placement: currentPlacement,
          overflows: currentOverflows
        }];
        const nextPlacement = placements$1[currentIndex + 1];
        if (nextPlacement) {
          return {
            data: {
              index: currentIndex + 1,
              overflows: allOverflows
            },
            reset: {
              placement: nextPlacement
            }
          };
        }
        const placementsSortedByMostSpace = allOverflows.map((d) => {
          const alignment2 = getAlignment(d.placement);
          return [d.placement, alignment2 && crossAxis ? (
            // Check along the mainAxis and main crossAxis side.
            d.overflows.slice(0, 2).reduce((acc, v) => acc + v, 0)
          ) : (
            // Check only the mainAxis.
            d.overflows[0]
          ), d.overflows];
        }).sort((a, b) => a[1] - b[1]);
        const placementsThatFitOnEachSide = placementsSortedByMostSpace.filter((d) => d[2].slice(
          0,
          // Aligned placements should not check their opposite crossAxis
          // side.
          getAlignment(d[0]) ? 2 : 3
        ).every((v) => v <= 0));
        const resetPlacement = ((_placementsThatFitOnE = placementsThatFitOnEachSide[0]) == null ? void 0 : _placementsThatFitOnE[0]) || placementsSortedByMostSpace[0][0];
        if (resetPlacement !== placement) {
          return {
            data: {
              index: currentIndex + 1,
              overflows: allOverflows
            },
            reset: {
              placement: resetPlacement
            }
          };
        }
        return {};
      }
    };
  };
  var flip = function(options) {
    if (options === void 0) {
      options = {};
    }
    return {
      name: "flip",
      options,
      async fn(state) {
        var _middlewareData$arrow, _middlewareData$flip;
        const {
          placement,
          middlewareData,
          rects,
          initialPlacement,
          platform: platform2,
          elements
        } = state;
        const {
          mainAxis: checkMainAxis = true,
          crossAxis: checkCrossAxis = true,
          fallbackPlacements: specifiedFallbackPlacements,
          fallbackStrategy = "bestFit",
          fallbackAxisSideDirection = "none",
          flipAlignment = true,
          ...detectOverflowOptions
        } = evaluate(options, state);
        if ((_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) {
          return {};
        }
        const side = getSide(placement);
        const isBasePlacement = getSide(initialPlacement) === initialPlacement;
        const rtl = await (platform2.isRTL == null ? void 0 : platform2.isRTL(elements.floating));
        const fallbackPlacements = specifiedFallbackPlacements || (isBasePlacement || !flipAlignment ? [getOppositePlacement(initialPlacement)] : getExpandedPlacements(initialPlacement));
        if (!specifiedFallbackPlacements && fallbackAxisSideDirection !== "none") {
          fallbackPlacements.push(...getOppositeAxisPlacements(initialPlacement, flipAlignment, fallbackAxisSideDirection, rtl));
        }
        const placements2 = [initialPlacement, ...fallbackPlacements];
        const overflow = await detectOverflow(state, detectOverflowOptions);
        const overflows = [];
        let overflowsData = ((_middlewareData$flip = middlewareData.flip) == null ? void 0 : _middlewareData$flip.overflows) || [];
        if (checkMainAxis) {
          overflows.push(overflow[side]);
        }
        if (checkCrossAxis) {
          const sides2 = getAlignmentSides(placement, rects, rtl);
          overflows.push(overflow[sides2[0]], overflow[sides2[1]]);
        }
        overflowsData = [...overflowsData, {
          placement,
          overflows
        }];
        if (!overflows.every((side2) => side2 <= 0)) {
          var _middlewareData$flip2, _overflowsData$filter;
          const nextIndex = (((_middlewareData$flip2 = middlewareData.flip) == null ? void 0 : _middlewareData$flip2.index) || 0) + 1;
          const nextPlacement = placements2[nextIndex];
          if (nextPlacement) {
            return {
              data: {
                index: nextIndex,
                overflows: overflowsData
              },
              reset: {
                placement: nextPlacement
              }
            };
          }
          let resetPlacement = (_overflowsData$filter = overflowsData.filter((d) => d.overflows[0] <= 0).sort((a, b) => a.overflows[1] - b.overflows[1])[0]) == null ? void 0 : _overflowsData$filter.placement;
          if (!resetPlacement) {
            switch (fallbackStrategy) {
              case "bestFit": {
                var _overflowsData$map$so;
                const placement2 = (_overflowsData$map$so = overflowsData.map((d) => [d.placement, d.overflows.filter((overflow2) => overflow2 > 0).reduce((acc, overflow2) => acc + overflow2, 0)]).sort((a, b) => a[1] - b[1])[0]) == null ? void 0 : _overflowsData$map$so[0];
                if (placement2) {
                  resetPlacement = placement2;
                }
                break;
              }
              case "initialPlacement":
                resetPlacement = initialPlacement;
                break;
            }
          }
          if (placement !== resetPlacement) {
            return {
              reset: {
                placement: resetPlacement
              }
            };
          }
        }
        return {};
      }
    };
  };
  function getSideOffsets(overflow, rect) {
    return {
      top: overflow.top - rect.height,
      right: overflow.right - rect.width,
      bottom: overflow.bottom - rect.height,
      left: overflow.left - rect.width
    };
  }
  function isAnySideFullyClipped(overflow) {
    return sides.some((side) => overflow[side] >= 0);
  }
  var hide = function(options) {
    if (options === void 0) {
      options = {};
    }
    return {
      name: "hide",
      options,
      async fn(state) {
        const {
          rects
        } = state;
        const {
          strategy = "referenceHidden",
          ...detectOverflowOptions
        } = evaluate(options, state);
        switch (strategy) {
          case "referenceHidden": {
            const overflow = await detectOverflow(state, {
              ...detectOverflowOptions,
              elementContext: "reference"
            });
            const offsets = getSideOffsets(overflow, rects.reference);
            return {
              data: {
                referenceHiddenOffsets: offsets,
                referenceHidden: isAnySideFullyClipped(offsets)
              }
            };
          }
          case "escaped": {
            const overflow = await detectOverflow(state, {
              ...detectOverflowOptions,
              altBoundary: true
            });
            const offsets = getSideOffsets(overflow, rects.floating);
            return {
              data: {
                escapedOffsets: offsets,
                escaped: isAnySideFullyClipped(offsets)
              }
            };
          }
          default: {
            return {};
          }
        }
      }
    };
  };
  function getBoundingRect(rects) {
    const minX = min(...rects.map((rect) => rect.left));
    const minY = min(...rects.map((rect) => rect.top));
    const maxX = max(...rects.map((rect) => rect.right));
    const maxY = max(...rects.map((rect) => rect.bottom));
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
  function getRectsByLine(rects) {
    const sortedRects = rects.slice().sort((a, b) => a.y - b.y);
    const groups = [];
    let prevRect = null;
    for (let i = 0; i < sortedRects.length; i++) {
      const rect = sortedRects[i];
      if (!prevRect || rect.y - prevRect.y > prevRect.height / 2) {
        groups.push([rect]);
      } else {
        groups[groups.length - 1].push(rect);
      }
      prevRect = rect;
    }
    return groups.map((rect) => rectToClientRect(getBoundingRect(rect)));
  }
  var inline = function(options) {
    if (options === void 0) {
      options = {};
    }
    return {
      name: "inline",
      options,
      async fn(state) {
        const {
          placement,
          elements,
          rects,
          platform: platform2,
          strategy
        } = state;
        const {
          padding = 2,
          x,
          y
        } = evaluate(options, state);
        const nativeClientRects = Array.from(await (platform2.getClientRects == null ? void 0 : platform2.getClientRects(elements.reference)) || []);
        const clientRects = getRectsByLine(nativeClientRects);
        const fallback = rectToClientRect(getBoundingRect(nativeClientRects));
        const paddingObject = getPaddingObject(padding);
        function getBoundingClientRect2() {
          if (clientRects.length === 2 && clientRects[0].left > clientRects[1].right && x != null && y != null) {
            return clientRects.find((rect) => x > rect.left - paddingObject.left && x < rect.right + paddingObject.right && y > rect.top - paddingObject.top && y < rect.bottom + paddingObject.bottom) || fallback;
          }
          if (clientRects.length >= 2) {
            if (getSideAxis(placement) === "y") {
              const firstRect = clientRects[0];
              const lastRect = clientRects[clientRects.length - 1];
              const isTop = getSide(placement) === "top";
              const top2 = firstRect.top;
              const bottom2 = lastRect.bottom;
              const left2 = isTop ? firstRect.left : lastRect.left;
              const right2 = isTop ? firstRect.right : lastRect.right;
              const width2 = right2 - left2;
              const height2 = bottom2 - top2;
              return {
                top: top2,
                bottom: bottom2,
                left: left2,
                right: right2,
                width: width2,
                height: height2,
                x: left2,
                y: top2
              };
            }
            const isLeftSide = getSide(placement) === "left";
            const maxRight = max(...clientRects.map((rect) => rect.right));
            const minLeft = min(...clientRects.map((rect) => rect.left));
            const measureRects = clientRects.filter((rect) => isLeftSide ? rect.left === minLeft : rect.right === maxRight);
            const top = measureRects[0].top;
            const bottom = measureRects[measureRects.length - 1].bottom;
            const left = minLeft;
            const right = maxRight;
            const width = right - left;
            const height = bottom - top;
            return {
              top,
              bottom,
              left,
              right,
              width,
              height,
              x: left,
              y: top
            };
          }
          return fallback;
        }
        const resetRects = await platform2.getElementRects({
          reference: {
            getBoundingClientRect: getBoundingClientRect2
          },
          floating: elements.floating,
          strategy
        });
        if (rects.reference.x !== resetRects.reference.x || rects.reference.y !== resetRects.reference.y || rects.reference.width !== resetRects.reference.width || rects.reference.height !== resetRects.reference.height) {
          return {
            reset: {
              rects: resetRects
            }
          };
        }
        return {};
      }
    };
  };
  async function convertValueToCoords(state, options) {
    const {
      placement,
      platform: platform2,
      elements
    } = state;
    const rtl = await (platform2.isRTL == null ? void 0 : platform2.isRTL(elements.floating));
    const side = getSide(placement);
    const alignment = getAlignment(placement);
    const isVertical = getSideAxis(placement) === "y";
    const mainAxisMulti = ["left", "top"].includes(side) ? -1 : 1;
    const crossAxisMulti = rtl && isVertical ? -1 : 1;
    const rawValue = evaluate(options, state);
    let {
      mainAxis,
      crossAxis,
      alignmentAxis
    } = typeof rawValue === "number" ? {
      mainAxis: rawValue,
      crossAxis: 0,
      alignmentAxis: null
    } : {
      mainAxis: 0,
      crossAxis: 0,
      alignmentAxis: null,
      ...rawValue
    };
    if (alignment && typeof alignmentAxis === "number") {
      crossAxis = alignment === "end" ? alignmentAxis * -1 : alignmentAxis;
    }
    return isVertical ? {
      x: crossAxis * crossAxisMulti,
      y: mainAxis * mainAxisMulti
    } : {
      x: mainAxis * mainAxisMulti,
      y: crossAxis * crossAxisMulti
    };
  }
  var offset = function(options) {
    if (options === void 0) {
      options = 0;
    }
    return {
      name: "offset",
      options,
      async fn(state) {
        var _middlewareData$offse, _middlewareData$arrow;
        const {
          x,
          y,
          placement,
          middlewareData
        } = state;
        const diffCoords = await convertValueToCoords(state, options);
        if (placement === ((_middlewareData$offse = middlewareData.offset) == null ? void 0 : _middlewareData$offse.placement) && (_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) {
          return {};
        }
        return {
          x: x + diffCoords.x,
          y: y + diffCoords.y,
          data: {
            ...diffCoords,
            placement
          }
        };
      }
    };
  };
  var shift = function(options) {
    if (options === void 0) {
      options = {};
    }
    return {
      name: "shift",
      options,
      async fn(state) {
        const {
          x,
          y,
          placement
        } = state;
        const {
          mainAxis: checkMainAxis = true,
          crossAxis: checkCrossAxis = false,
          limiter = {
            fn: (_ref) => {
              let {
                x: x2,
                y: y2
              } = _ref;
              return {
                x: x2,
                y: y2
              };
            }
          },
          ...detectOverflowOptions
        } = evaluate(options, state);
        const coords = {
          x,
          y
        };
        const overflow = await detectOverflow(state, detectOverflowOptions);
        const crossAxis = getSideAxis(getSide(placement));
        const mainAxis = getOppositeAxis(crossAxis);
        let mainAxisCoord = coords[mainAxis];
        let crossAxisCoord = coords[crossAxis];
        if (checkMainAxis) {
          const minSide = mainAxis === "y" ? "top" : "left";
          const maxSide = mainAxis === "y" ? "bottom" : "right";
          const min2 = mainAxisCoord + overflow[minSide];
          const max2 = mainAxisCoord - overflow[maxSide];
          mainAxisCoord = clamp(min2, mainAxisCoord, max2);
        }
        if (checkCrossAxis) {
          const minSide = crossAxis === "y" ? "top" : "left";
          const maxSide = crossAxis === "y" ? "bottom" : "right";
          const min2 = crossAxisCoord + overflow[minSide];
          const max2 = crossAxisCoord - overflow[maxSide];
          crossAxisCoord = clamp(min2, crossAxisCoord, max2);
        }
        const limitedCoords = limiter.fn({
          ...state,
          [mainAxis]: mainAxisCoord,
          [crossAxis]: crossAxisCoord
        });
        return {
          ...limitedCoords,
          data: {
            x: limitedCoords.x - x,
            y: limitedCoords.y - y
          }
        };
      }
    };
  };
  var size = function(options) {
    if (options === void 0) {
      options = {};
    }
    return {
      name: "size",
      options,
      async fn(state) {
        const {
          placement,
          rects,
          platform: platform2,
          elements
        } = state;
        const {
          apply = () => {
          },
          ...detectOverflowOptions
        } = evaluate(options, state);
        const overflow = await detectOverflow(state, detectOverflowOptions);
        const side = getSide(placement);
        const alignment = getAlignment(placement);
        const isYAxis = getSideAxis(placement) === "y";
        const {
          width,
          height
        } = rects.floating;
        let heightSide;
        let widthSide;
        if (side === "top" || side === "bottom") {
          heightSide = side;
          widthSide = alignment === (await (platform2.isRTL == null ? void 0 : platform2.isRTL(elements.floating)) ? "start" : "end") ? "left" : "right";
        } else {
          widthSide = side;
          heightSide = alignment === "end" ? "top" : "bottom";
        }
        const overflowAvailableHeight = height - overflow[heightSide];
        const overflowAvailableWidth = width - overflow[widthSide];
        const noShift = !state.middlewareData.shift;
        let availableHeight = overflowAvailableHeight;
        let availableWidth = overflowAvailableWidth;
        if (isYAxis) {
          const maximumClippingWidth = width - overflow.left - overflow.right;
          availableWidth = alignment || noShift ? min(overflowAvailableWidth, maximumClippingWidth) : maximumClippingWidth;
        } else {
          const maximumClippingHeight = height - overflow.top - overflow.bottom;
          availableHeight = alignment || noShift ? min(overflowAvailableHeight, maximumClippingHeight) : maximumClippingHeight;
        }
        if (noShift && !alignment) {
          const xMin = max(overflow.left, 0);
          const xMax = max(overflow.right, 0);
          const yMin = max(overflow.top, 0);
          const yMax = max(overflow.bottom, 0);
          if (isYAxis) {
            availableWidth = width - 2 * (xMin !== 0 || xMax !== 0 ? xMin + xMax : max(overflow.left, overflow.right));
          } else {
            availableHeight = height - 2 * (yMin !== 0 || yMax !== 0 ? yMin + yMax : max(overflow.top, overflow.bottom));
          }
        }
        await apply({
          ...state,
          availableWidth,
          availableHeight
        });
        const nextDimensions = await platform2.getDimensions(elements.floating);
        if (width !== nextDimensions.width || height !== nextDimensions.height) {
          return {
            reset: {
              rects: true
            }
          };
        }
        return {};
      }
    };
  };

  // node_modules/.pnpm/@floating-ui+utils@0.2.2/node_modules/@floating-ui/utils/dist/floating-ui.utils.dom.mjs
  function getNodeName(node) {
    if (isNode(node)) {
      return (node.nodeName || "").toLowerCase();
    }
    return "#document";
  }
  function getWindow(node) {
    var _node$ownerDocument;
    return (node == null || (_node$ownerDocument = node.ownerDocument) == null ? void 0 : _node$ownerDocument.defaultView) || window;
  }
  function getDocumentElement(node) {
    var _ref;
    return (_ref = (isNode(node) ? node.ownerDocument : node.document) || window.document) == null ? void 0 : _ref.documentElement;
  }
  function isNode(value) {
    return value instanceof Node || value instanceof getWindow(value).Node;
  }
  function isElement(value) {
    return value instanceof Element || value instanceof getWindow(value).Element;
  }
  function isHTMLElement(value) {
    return value instanceof HTMLElement || value instanceof getWindow(value).HTMLElement;
  }
  function isShadowRoot(value) {
    if (typeof ShadowRoot === "undefined") {
      return false;
    }
    return value instanceof ShadowRoot || value instanceof getWindow(value).ShadowRoot;
  }
  function isOverflowElement(element) {
    const {
      overflow,
      overflowX,
      overflowY,
      display
    } = getComputedStyle2(element);
    return /auto|scroll|overlay|hidden|clip/.test(overflow + overflowY + overflowX) && !["inline", "contents"].includes(display);
  }
  function isTableElement(element) {
    return ["table", "td", "th"].includes(getNodeName(element));
  }
  function isContainingBlock(element) {
    const webkit = isWebKit();
    const css = getComputedStyle2(element);
    return css.transform !== "none" || css.perspective !== "none" || (css.containerType ? css.containerType !== "normal" : false) || !webkit && (css.backdropFilter ? css.backdropFilter !== "none" : false) || !webkit && (css.filter ? css.filter !== "none" : false) || ["transform", "perspective", "filter"].some((value) => (css.willChange || "").includes(value)) || ["paint", "layout", "strict", "content"].some((value) => (css.contain || "").includes(value));
  }
  function getContainingBlock(element) {
    let currentNode = getParentNode(element);
    while (isHTMLElement(currentNode) && !isLastTraversableNode(currentNode)) {
      if (isContainingBlock(currentNode)) {
        return currentNode;
      }
      currentNode = getParentNode(currentNode);
    }
    return null;
  }
  function isWebKit() {
    if (typeof CSS === "undefined" || !CSS.supports) return false;
    return CSS.supports("-webkit-backdrop-filter", "none");
  }
  function isLastTraversableNode(node) {
    return ["html", "body", "#document"].includes(getNodeName(node));
  }
  function getComputedStyle2(element) {
    return getWindow(element).getComputedStyle(element);
  }
  function getNodeScroll(element) {
    if (isElement(element)) {
      return {
        scrollLeft: element.scrollLeft,
        scrollTop: element.scrollTop
      };
    }
    return {
      scrollLeft: element.pageXOffset,
      scrollTop: element.pageYOffset
    };
  }
  function getParentNode(node) {
    if (getNodeName(node) === "html") {
      return node;
    }
    const result = (
      // Step into the shadow DOM of the parent of a slotted node.
      node.assignedSlot || // DOM Element detected.
      node.parentNode || // ShadowRoot detected.
      isShadowRoot(node) && node.host || // Fallback.
      getDocumentElement(node)
    );
    return isShadowRoot(result) ? result.host : result;
  }
  function getNearestOverflowAncestor(node) {
    const parentNode = getParentNode(node);
    if (isLastTraversableNode(parentNode)) {
      return node.ownerDocument ? node.ownerDocument.body : node.body;
    }
    if (isHTMLElement(parentNode) && isOverflowElement(parentNode)) {
      return parentNode;
    }
    return getNearestOverflowAncestor(parentNode);
  }
  function getOverflowAncestors(node, list, traverseIframes) {
    var _node$ownerDocument2;
    if (list === void 0) {
      list = [];
    }
    if (traverseIframes === void 0) {
      traverseIframes = true;
    }
    const scrollableAncestor = getNearestOverflowAncestor(node);
    const isBody = scrollableAncestor === ((_node$ownerDocument2 = node.ownerDocument) == null ? void 0 : _node$ownerDocument2.body);
    const win = getWindow(scrollableAncestor);
    if (isBody) {
      return list.concat(win, win.visualViewport || [], isOverflowElement(scrollableAncestor) ? scrollableAncestor : [], win.frameElement && traverseIframes ? getOverflowAncestors(win.frameElement) : []);
    }
    return list.concat(scrollableAncestor, getOverflowAncestors(scrollableAncestor, [], traverseIframes));
  }

  // node_modules/.pnpm/@floating-ui+dom@1.6.5/node_modules/@floating-ui/dom/dist/floating-ui.dom.mjs
  function getCssDimensions(element) {
    const css = getComputedStyle2(element);
    let width = parseFloat(css.width) || 0;
    let height = parseFloat(css.height) || 0;
    const hasOffset = isHTMLElement(element);
    const offsetWidth = hasOffset ? element.offsetWidth : width;
    const offsetHeight = hasOffset ? element.offsetHeight : height;
    const shouldFallback = round(width) !== offsetWidth || round(height) !== offsetHeight;
    if (shouldFallback) {
      width = offsetWidth;
      height = offsetHeight;
    }
    return {
      width,
      height,
      $: shouldFallback
    };
  }
  function unwrapElement(element) {
    return !isElement(element) ? element.contextElement : element;
  }
  function getScale(element) {
    const domElement = unwrapElement(element);
    if (!isHTMLElement(domElement)) {
      return createCoords(1);
    }
    const rect = domElement.getBoundingClientRect();
    const {
      width,
      height,
      $
    } = getCssDimensions(domElement);
    let x = ($ ? round(rect.width) : rect.width) / width;
    let y = ($ ? round(rect.height) : rect.height) / height;
    if (!x || !Number.isFinite(x)) {
      x = 1;
    }
    if (!y || !Number.isFinite(y)) {
      y = 1;
    }
    return {
      x,
      y
    };
  }
  var noOffsets = /* @__PURE__ */ createCoords(0);
  function getVisualOffsets(element) {
    const win = getWindow(element);
    if (!isWebKit() || !win.visualViewport) {
      return noOffsets;
    }
    return {
      x: win.visualViewport.offsetLeft,
      y: win.visualViewport.offsetTop
    };
  }
  function shouldAddVisualOffsets(element, isFixed, floatingOffsetParent) {
    if (isFixed === void 0) {
      isFixed = false;
    }
    if (!floatingOffsetParent || isFixed && floatingOffsetParent !== getWindow(element)) {
      return false;
    }
    return isFixed;
  }
  function getBoundingClientRect(element, includeScale, isFixedStrategy, offsetParent) {
    if (includeScale === void 0) {
      includeScale = false;
    }
    if (isFixedStrategy === void 0) {
      isFixedStrategy = false;
    }
    const clientRect = element.getBoundingClientRect();
    const domElement = unwrapElement(element);
    let scale = createCoords(1);
    if (includeScale) {
      if (offsetParent) {
        if (isElement(offsetParent)) {
          scale = getScale(offsetParent);
        }
      } else {
        scale = getScale(element);
      }
    }
    const visualOffsets = shouldAddVisualOffsets(domElement, isFixedStrategy, offsetParent) ? getVisualOffsets(domElement) : createCoords(0);
    let x = (clientRect.left + visualOffsets.x) / scale.x;
    let y = (clientRect.top + visualOffsets.y) / scale.y;
    let width = clientRect.width / scale.x;
    let height = clientRect.height / scale.y;
    if (domElement) {
      const win = getWindow(domElement);
      const offsetWin = offsetParent && isElement(offsetParent) ? getWindow(offsetParent) : offsetParent;
      let currentWin = win;
      let currentIFrame = currentWin.frameElement;
      while (currentIFrame && offsetParent && offsetWin !== currentWin) {
        const iframeScale = getScale(currentIFrame);
        const iframeRect = currentIFrame.getBoundingClientRect();
        const css = getComputedStyle2(currentIFrame);
        const left = iframeRect.left + (currentIFrame.clientLeft + parseFloat(css.paddingLeft)) * iframeScale.x;
        const top = iframeRect.top + (currentIFrame.clientTop + parseFloat(css.paddingTop)) * iframeScale.y;
        x *= iframeScale.x;
        y *= iframeScale.y;
        width *= iframeScale.x;
        height *= iframeScale.y;
        x += left;
        y += top;
        currentWin = getWindow(currentIFrame);
        currentIFrame = currentWin.frameElement;
      }
    }
    return rectToClientRect({
      width,
      height,
      x,
      y
    });
  }
  var topLayerSelectors = [":popover-open", ":modal"];
  function isTopLayer(element) {
    return topLayerSelectors.some((selector) => {
      try {
        return element.matches(selector);
      } catch (e) {
        return false;
      }
    });
  }
  function convertOffsetParentRelativeRectToViewportRelativeRect(_ref) {
    let {
      elements,
      rect,
      offsetParent,
      strategy
    } = _ref;
    const isFixed = strategy === "fixed";
    const documentElement = getDocumentElement(offsetParent);
    const topLayer = elements ? isTopLayer(elements.floating) : false;
    if (offsetParent === documentElement || topLayer && isFixed) {
      return rect;
    }
    let scroll = {
      scrollLeft: 0,
      scrollTop: 0
    };
    let scale = createCoords(1);
    const offsets = createCoords(0);
    const isOffsetParentAnElement = isHTMLElement(offsetParent);
    if (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) {
      if (getNodeName(offsetParent) !== "body" || isOverflowElement(documentElement)) {
        scroll = getNodeScroll(offsetParent);
      }
      if (isHTMLElement(offsetParent)) {
        const offsetRect = getBoundingClientRect(offsetParent);
        scale = getScale(offsetParent);
        offsets.x = offsetRect.x + offsetParent.clientLeft;
        offsets.y = offsetRect.y + offsetParent.clientTop;
      }
    }
    return {
      width: rect.width * scale.x,
      height: rect.height * scale.y,
      x: rect.x * scale.x - scroll.scrollLeft * scale.x + offsets.x,
      y: rect.y * scale.y - scroll.scrollTop * scale.y + offsets.y
    };
  }
  function getClientRects(element) {
    return Array.from(element.getClientRects());
  }
  function getWindowScrollBarX(element) {
    return getBoundingClientRect(getDocumentElement(element)).left + getNodeScroll(element).scrollLeft;
  }
  function getDocumentRect(element) {
    const html = getDocumentElement(element);
    const scroll = getNodeScroll(element);
    const body = element.ownerDocument.body;
    const width = max(html.scrollWidth, html.clientWidth, body.scrollWidth, body.clientWidth);
    const height = max(html.scrollHeight, html.clientHeight, body.scrollHeight, body.clientHeight);
    let x = -scroll.scrollLeft + getWindowScrollBarX(element);
    const y = -scroll.scrollTop;
    if (getComputedStyle2(body).direction === "rtl") {
      x += max(html.clientWidth, body.clientWidth) - width;
    }
    return {
      width,
      height,
      x,
      y
    };
  }
  function getViewportRect(element, strategy) {
    const win = getWindow(element);
    const html = getDocumentElement(element);
    const visualViewport = win.visualViewport;
    let width = html.clientWidth;
    let height = html.clientHeight;
    let x = 0;
    let y = 0;
    if (visualViewport) {
      width = visualViewport.width;
      height = visualViewport.height;
      const visualViewportBased = isWebKit();
      if (!visualViewportBased || visualViewportBased && strategy === "fixed") {
        x = visualViewport.offsetLeft;
        y = visualViewport.offsetTop;
      }
    }
    return {
      width,
      height,
      x,
      y
    };
  }
  function getInnerBoundingClientRect(element, strategy) {
    const clientRect = getBoundingClientRect(element, true, strategy === "fixed");
    const top = clientRect.top + element.clientTop;
    const left = clientRect.left + element.clientLeft;
    const scale = isHTMLElement(element) ? getScale(element) : createCoords(1);
    const width = element.clientWidth * scale.x;
    const height = element.clientHeight * scale.y;
    const x = left * scale.x;
    const y = top * scale.y;
    return {
      width,
      height,
      x,
      y
    };
  }
  function getClientRectFromClippingAncestor(element, clippingAncestor, strategy) {
    let rect;
    if (clippingAncestor === "viewport") {
      rect = getViewportRect(element, strategy);
    } else if (clippingAncestor === "document") {
      rect = getDocumentRect(getDocumentElement(element));
    } else if (isElement(clippingAncestor)) {
      rect = getInnerBoundingClientRect(clippingAncestor, strategy);
    } else {
      const visualOffsets = getVisualOffsets(element);
      rect = {
        ...clippingAncestor,
        x: clippingAncestor.x - visualOffsets.x,
        y: clippingAncestor.y - visualOffsets.y
      };
    }
    return rectToClientRect(rect);
  }
  function hasFixedPositionAncestor(element, stopNode) {
    const parentNode = getParentNode(element);
    if (parentNode === stopNode || !isElement(parentNode) || isLastTraversableNode(parentNode)) {
      return false;
    }
    return getComputedStyle2(parentNode).position === "fixed" || hasFixedPositionAncestor(parentNode, stopNode);
  }
  function getClippingElementAncestors(element, cache) {
    const cachedResult = cache.get(element);
    if (cachedResult) {
      return cachedResult;
    }
    let result = getOverflowAncestors(element, [], false).filter((el) => isElement(el) && getNodeName(el) !== "body");
    let currentContainingBlockComputedStyle = null;
    const elementIsFixed = getComputedStyle2(element).position === "fixed";
    let currentNode = elementIsFixed ? getParentNode(element) : element;
    while (isElement(currentNode) && !isLastTraversableNode(currentNode)) {
      const computedStyle = getComputedStyle2(currentNode);
      const currentNodeIsContaining = isContainingBlock(currentNode);
      if (!currentNodeIsContaining && computedStyle.position === "fixed") {
        currentContainingBlockComputedStyle = null;
      }
      const shouldDropCurrentNode = elementIsFixed ? !currentNodeIsContaining && !currentContainingBlockComputedStyle : !currentNodeIsContaining && computedStyle.position === "static" && !!currentContainingBlockComputedStyle && ["absolute", "fixed"].includes(currentContainingBlockComputedStyle.position) || isOverflowElement(currentNode) && !currentNodeIsContaining && hasFixedPositionAncestor(element, currentNode);
      if (shouldDropCurrentNode) {
        result = result.filter((ancestor) => ancestor !== currentNode);
      } else {
        currentContainingBlockComputedStyle = computedStyle;
      }
      currentNode = getParentNode(currentNode);
    }
    cache.set(element, result);
    return result;
  }
  function getClippingRect(_ref) {
    let {
      element,
      boundary,
      rootBoundary,
      strategy
    } = _ref;
    const elementClippingAncestors = boundary === "clippingAncestors" ? isTopLayer(element) ? [] : getClippingElementAncestors(element, this._c) : [].concat(boundary);
    const clippingAncestors = [...elementClippingAncestors, rootBoundary];
    const firstClippingAncestor = clippingAncestors[0];
    const clippingRect = clippingAncestors.reduce((accRect, clippingAncestor) => {
      const rect = getClientRectFromClippingAncestor(element, clippingAncestor, strategy);
      accRect.top = max(rect.top, accRect.top);
      accRect.right = min(rect.right, accRect.right);
      accRect.bottom = min(rect.bottom, accRect.bottom);
      accRect.left = max(rect.left, accRect.left);
      return accRect;
    }, getClientRectFromClippingAncestor(element, firstClippingAncestor, strategy));
    return {
      width: clippingRect.right - clippingRect.left,
      height: clippingRect.bottom - clippingRect.top,
      x: clippingRect.left,
      y: clippingRect.top
    };
  }
  function getDimensions(element) {
    const {
      width,
      height
    } = getCssDimensions(element);
    return {
      width,
      height
    };
  }
  function getRectRelativeToOffsetParent(element, offsetParent, strategy) {
    const isOffsetParentAnElement = isHTMLElement(offsetParent);
    const documentElement = getDocumentElement(offsetParent);
    const isFixed = strategy === "fixed";
    const rect = getBoundingClientRect(element, true, isFixed, offsetParent);
    let scroll = {
      scrollLeft: 0,
      scrollTop: 0
    };
    const offsets = createCoords(0);
    if (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) {
      if (getNodeName(offsetParent) !== "body" || isOverflowElement(documentElement)) {
        scroll = getNodeScroll(offsetParent);
      }
      if (isOffsetParentAnElement) {
        const offsetRect = getBoundingClientRect(offsetParent, true, isFixed, offsetParent);
        offsets.x = offsetRect.x + offsetParent.clientLeft;
        offsets.y = offsetRect.y + offsetParent.clientTop;
      } else if (documentElement) {
        offsets.x = getWindowScrollBarX(documentElement);
      }
    }
    const x = rect.left + scroll.scrollLeft - offsets.x;
    const y = rect.top + scroll.scrollTop - offsets.y;
    return {
      x,
      y,
      width: rect.width,
      height: rect.height
    };
  }
  function isStaticPositioned(element) {
    return getComputedStyle2(element).position === "static";
  }
  function getTrueOffsetParent(element, polyfill) {
    if (!isHTMLElement(element) || getComputedStyle2(element).position === "fixed") {
      return null;
    }
    if (polyfill) {
      return polyfill(element);
    }
    return element.offsetParent;
  }
  function getOffsetParent(element, polyfill) {
    const win = getWindow(element);
    if (isTopLayer(element)) {
      return win;
    }
    if (!isHTMLElement(element)) {
      let svgOffsetParent = getParentNode(element);
      while (svgOffsetParent && !isLastTraversableNode(svgOffsetParent)) {
        if (isElement(svgOffsetParent) && !isStaticPositioned(svgOffsetParent)) {
          return svgOffsetParent;
        }
        svgOffsetParent = getParentNode(svgOffsetParent);
      }
      return win;
    }
    let offsetParent = getTrueOffsetParent(element, polyfill);
    while (offsetParent && isTableElement(offsetParent) && isStaticPositioned(offsetParent)) {
      offsetParent = getTrueOffsetParent(offsetParent, polyfill);
    }
    if (offsetParent && isLastTraversableNode(offsetParent) && isStaticPositioned(offsetParent) && !isContainingBlock(offsetParent)) {
      return win;
    }
    return offsetParent || getContainingBlock(element) || win;
  }
  var getElementRects = async function(data2) {
    const getOffsetParentFn = this.getOffsetParent || getOffsetParent;
    const getDimensionsFn = this.getDimensions;
    const floatingDimensions = await getDimensionsFn(data2.floating);
    return {
      reference: getRectRelativeToOffsetParent(data2.reference, await getOffsetParentFn(data2.floating), data2.strategy),
      floating: {
        x: 0,
        y: 0,
        width: floatingDimensions.width,
        height: floatingDimensions.height
      }
    };
  };
  function isRTL(element) {
    return getComputedStyle2(element).direction === "rtl";
  }
  var platform = {
    convertOffsetParentRelativeRectToViewportRelativeRect,
    getDocumentElement,
    getClippingRect,
    getOffsetParent,
    getElementRects,
    getClientRects,
    getDimensions,
    getScale,
    isElement,
    isRTL
  };
  function observeMove(element, onMove) {
    let io = null;
    let timeoutId;
    const root = getDocumentElement(element);
    function cleanup() {
      var _io;
      clearTimeout(timeoutId);
      (_io = io) == null || _io.disconnect();
      io = null;
    }
    function refresh(skip, threshold) {
      if (skip === void 0) {
        skip = false;
      }
      if (threshold === void 0) {
        threshold = 1;
      }
      cleanup();
      const {
        left,
        top,
        width,
        height
      } = element.getBoundingClientRect();
      if (!skip) {
        onMove();
      }
      if (!width || !height) {
        return;
      }
      const insetTop = floor(top);
      const insetRight = floor(root.clientWidth - (left + width));
      const insetBottom = floor(root.clientHeight - (top + height));
      const insetLeft = floor(left);
      const rootMargin = -insetTop + "px " + -insetRight + "px " + -insetBottom + "px " + -insetLeft + "px";
      const options = {
        rootMargin,
        threshold: max(0, min(1, threshold)) || 1
      };
      let isFirstUpdate = true;
      function handleObserve(entries) {
        const ratio = entries[0].intersectionRatio;
        if (ratio !== threshold) {
          if (!isFirstUpdate) {
            return refresh();
          }
          if (!ratio) {
            timeoutId = setTimeout(() => {
              refresh(false, 1e-7);
            }, 1e3);
          } else {
            refresh(false, ratio);
          }
        }
        isFirstUpdate = false;
      }
      try {
        io = new IntersectionObserver(handleObserve, {
          ...options,
          // Handle <iframe>s
          root: root.ownerDocument
        });
      } catch (e) {
        io = new IntersectionObserver(handleObserve, options);
      }
      io.observe(element);
    }
    refresh(true);
    return cleanup;
  }
  function autoUpdate(reference, floating, update, options) {
    if (options === void 0) {
      options = {};
    }
    const {
      ancestorScroll = true,
      ancestorResize = true,
      elementResize = typeof ResizeObserver === "function",
      layoutShift = typeof IntersectionObserver === "function",
      animationFrame = false
    } = options;
    const referenceEl = unwrapElement(reference);
    const ancestors = ancestorScroll || ancestorResize ? [...referenceEl ? getOverflowAncestors(referenceEl) : [], ...getOverflowAncestors(floating)] : [];
    ancestors.forEach((ancestor) => {
      ancestorScroll && ancestor.addEventListener("scroll", update, {
        passive: true
      });
      ancestorResize && ancestor.addEventListener("resize", update);
    });
    const cleanupIo = referenceEl && layoutShift ? observeMove(referenceEl, update) : null;
    let reobserveFrame = -1;
    let resizeObserver = null;
    if (elementResize) {
      resizeObserver = new ResizeObserver((_ref) => {
        let [firstEntry] = _ref;
        if (firstEntry && firstEntry.target === referenceEl && resizeObserver) {
          resizeObserver.unobserve(floating);
          cancelAnimationFrame(reobserveFrame);
          reobserveFrame = requestAnimationFrame(() => {
            var _resizeObserver;
            (_resizeObserver = resizeObserver) == null || _resizeObserver.observe(floating);
          });
        }
        update();
      });
      if (referenceEl && !animationFrame) {
        resizeObserver.observe(referenceEl);
      }
      resizeObserver.observe(floating);
    }
    let frameId;
    let prevRefRect = animationFrame ? getBoundingClientRect(reference) : null;
    if (animationFrame) {
      frameLoop();
    }
    function frameLoop() {
      const nextRefRect = getBoundingClientRect(reference);
      if (prevRefRect && (nextRefRect.x !== prevRefRect.x || nextRefRect.y !== prevRefRect.y || nextRefRect.width !== prevRefRect.width || nextRefRect.height !== prevRefRect.height)) {
        update();
      }
      prevRefRect = nextRefRect;
      frameId = requestAnimationFrame(frameLoop);
    }
    update();
    return () => {
      var _resizeObserver2;
      ancestors.forEach((ancestor) => {
        ancestorScroll && ancestor.removeEventListener("scroll", update);
        ancestorResize && ancestor.removeEventListener("resize", update);
      });
      cleanupIo == null || cleanupIo();
      (_resizeObserver2 = resizeObserver) == null || _resizeObserver2.disconnect();
      resizeObserver = null;
      if (animationFrame) {
        cancelAnimationFrame(frameId);
      }
    };
  }
  var offset2 = offset;
  var autoPlacement2 = autoPlacement;
  var shift2 = shift;
  var flip2 = flip;
  var size2 = size;
  var hide2 = hide;
  var arrow2 = arrow;
  var inline2 = inline;
  var computePosition2 = (reference, floating, options) => {
    const cache = /* @__PURE__ */ new Map();
    const mergedOptions = {
      platform,
      ...options
    };
    const platformWithCache = {
      ...mergedOptions.platform,
      _c: cache
    };
    return computePosition(reference, floating, {
      ...mergedOptions,
      platform: platformWithCache
    });
  };

  // node_modules/.pnpm/@corvu+utils@0.2.0_solid-js@1.8.17/node_modules/@corvu/utils/dist/create/floating.js
  var createFloating = (props) => {
    const defaultedProps = mergeProps(
      {
        enabled: true,
        placement: "bottom",
        strategy: "absolute",
        options: null
      },
      props
    );
    const [floatingState, setFloatingState] = createSignal({
      placement: access(defaultedProps.placement),
      x: 0,
      y: 0,
      width: null,
      height: null,
      maxWidth: null,
      maxHeight: null,
      arrowX: null,
      arrowY: null
    });
    createEffect(() => {
      if (!access(defaultedProps.enabled))
        return;
      const reference = access(defaultedProps.reference);
      const floating = access(defaultedProps.floating);
      if (!reference || !floating)
        return;
      const middleware = [];
      const options = access(defaultedProps.options);
      if (options?.offset !== void 0) {
        middleware.push(offset2(options.offset));
      }
      if (options?.shift !== void 0 && options.shift !== false) {
        const shiftOptions = options.shift === true ? void 0 : options.shift;
        middleware.push(shift2(shiftOptions));
      }
      const arrowElement = access(defaultedProps.arrow);
      if (arrowElement) {
        middleware.push(
          arrow2({
            element: arrowElement,
            padding: options?.arrow
          })
        );
      }
      const flipEnabled = options?.flip !== void 0 && options.flip !== false;
      const flipOptions = typeof options?.flip === "boolean" ? void 0 : options?.flip;
      if (flipEnabled && flipOptions?.fallbackStrategy !== "initialPlacement") {
        middleware.push(flip2(flipOptions));
      }
      if (options?.size) {
        middleware.push(
          size2({
            apply: ({ availableWidth, availableHeight, ...state }) => {
              const newFloatingState = {};
              if (options.size.matchSize === true) {
                if (state.placement.startsWith("top") || state.placement.startsWith("bottom")) {
                  newFloatingState.width = state.rects.reference.width;
                } else {
                  newFloatingState.height = state.rects.reference.height;
                }
              }
              if (options.size.fitViewPort === true) {
                if (state.placement.startsWith("top") || state.placement.startsWith("bottom")) {
                  newFloatingState.maxHeight = availableHeight;
                } else {
                  newFloatingState.maxWidth = availableWidth;
                }
              }
              if (!floatingStatesMatch(floatingState(), newFloatingState)) {
                setFloatingState((state2) => ({ ...state2, ...newFloatingState }));
              }
            },
            ...options.size
          })
        );
      }
      if (flipEnabled && flipOptions?.fallbackStrategy === "bestFit") {
        middleware.push(flip2(flipOptions));
      }
      if (!flipEnabled && options?.autoPlacement !== void 0 && options.autoPlacement !== false) {
        const autoPlacementOptions = options.autoPlacement === true ? void 0 : options.autoPlacement;
        middleware.push(autoPlacement2(autoPlacementOptions));
      }
      if (options?.hide !== void 0 && options.hide !== false) {
        const hideOptions = options.hide === true ? void 0 : options.hide;
        middleware.push(hide2(hideOptions));
      }
      if (options?.inline !== void 0 && options.inline !== false) {
        const inlineOptions = options.inline === true ? void 0 : options.inline;
        middleware.push(inline2(inlineOptions));
      }
      const cleanup = autoUpdate(reference, floating, () => {
        computePosition2(reference, floating, {
          placement: access(defaultedProps.placement),
          strategy: access(defaultedProps.strategy),
          middleware
        }).then(({ placement, x, y, middlewareData }) => {
          const newFloatingState = {
            placement,
            x,
            y,
            arrowX: middlewareData.arrow?.x ?? null,
            arrowY: middlewareData.arrow?.y ?? null
          };
          if (!floatingStatesMatch(floatingState(), newFloatingState)) {
            setFloatingState((state) => ({ ...state, ...newFloatingState }));
          }
        });
      });
      onCleanup(cleanup);
    });
    return floatingState;
  };
  var floatingStatesMatch = (a, b) => {
    return (b.placement === void 0 || a.placement === b.placement) && (b.x === void 0 || a.x === b.x) && (b.y === void 0 || a.y === b.y) && (b.width === void 0 || a.width === b.width) && (b.height === void 0 || a.height === b.height) && (b.maxWidth === void 0 || a.maxWidth === b.maxWidth) && (b.maxHeight === void 0 || a.maxHeight === b.maxHeight) && (b.arrowX === void 0 || a.arrowX === b.arrowX) && (b.arrowY === void 0 || a.arrowY === b.arrowY);
  };
  var floating_default = createFloating;

  // node_modules/.pnpm/@corvu+utils@0.2.0_solid-js@1.8.17/node_modules/@corvu/utils/dist/create/once.js
  var createOnce = (fn) => {
    let result;
    let called = false;
    return () => {
      if (called) {
        return result;
      } else {
        called = true;
        return result = createMemo(fn);
      }
    };
  };
  var once_default = createOnce;

  // node_modules/.pnpm/solid-presence@0.1.6_solid-js@1.8.17/node_modules/solid-presence/dist/index.js
  var createPresence = (props) => {
    const refStyles = createMemo(() => {
      const element = access(props.element);
      if (!element)
        return;
      return getComputedStyle(element);
    });
    const getAnimationName = () => {
      return refStyles()?.animationName ?? "none";
    };
    const [presentState, setPresentState] = createSignal(access(props.show) ? "present" : "hidden");
    let animationName = "none";
    createEffect((prevShow) => {
      const show = access(props.show);
      untrack(() => {
        if (prevShow === show)
          return show;
        const prevAnimationName = animationName;
        const currentAnimationName = getAnimationName();
        if (show) {
          setPresentState("present");
        } else if (currentAnimationName === "none" || refStyles()?.display === "none") {
          setPresentState("hidden");
        } else {
          const isAnimating = prevAnimationName !== currentAnimationName;
          if (prevShow === true && isAnimating) {
            setPresentState("hiding");
          } else {
            setPresentState("hidden");
          }
        }
      });
      return show;
    });
    createEffect(() => {
      const element = access(props.element);
      if (!element)
        return;
      const handleAnimationStart = (event) => {
        if (event.target === element) {
          animationName = getAnimationName();
        }
      };
      const handleAnimationEnd = (event) => {
        const currentAnimationName = getAnimationName();
        const isCurrentAnimation = currentAnimationName.includes(
          event.animationName
        );
        if (event.target === element && isCurrentAnimation && presentState() === "hiding") {
          setPresentState("hidden");
        }
      };
      element.addEventListener("animationstart", handleAnimationStart);
      element.addEventListener("animationcancel", handleAnimationEnd);
      element.addEventListener("animationend", handleAnimationEnd);
      onCleanup(() => {
        element.removeEventListener("animationstart", handleAnimationStart);
        element.removeEventListener("animationcancel", handleAnimationEnd);
        element.removeEventListener("animationend", handleAnimationEnd);
      });
    });
    return {
      present: () => presentState() === "present" || presentState() === "hiding",
      state: presentState
    };
  };
  var presence_default = createPresence;
  var src_default = presence_default;

  // node_modules/.pnpm/@corvu+utils@0.2.0_solid-js@1.8.17/node_modules/@corvu/utils/dist/create/tooltip.js
  var tooltipGroups = /* @__PURE__ */ new Map();
  var registerTooltip = (group, id, close) => {
    if (!tooltipGroups.has(group)) {
      tooltipGroups.set(group, {
        skipDelay: false,
        skipDelayTimeout: null,
        tooltips: []
      });
    }
    tooltipGroups.get(group).tooltips.push({ id, close });
  };
  var unregisterTooltip = (group, id) => {
    const tooltipGroup = tooltipGroups.get(group);
    if (!tooltipGroup)
      return;
    const index = tooltipGroup.tooltips.findIndex((tooltip) => tooltip.id === id);
    if (index !== -1) {
      tooltipGroup.tooltips.splice(index, 1);
    }
  };
  var closeTooltipGroup = (group, id) => {
    const tooltipGroup = tooltipGroups.get(group);
    if (!tooltipGroup)
      return;
    tooltipGroup.tooltips.forEach((tooltip) => {
      if (tooltip.id !== id) {
        tooltip.close();
      }
    });
  };
  var createTooltip = (props) => {
    let tooltipState = null;
    let clickedTrigger = false;
    let timeout = null;
    let insideSafeArea = false;
    let localSkipDelay = false;
    let localSkipDelayTimeout = null;
    const getSkipDelay = () => {
      const group = access(props.group);
      if (group === null)
        return localSkipDelay;
      return tooltipGroups.get(group).skipDelay;
    };
    const setSkipDelay = (value) => {
      const group = access(props.group);
      if (group === null)
        return localSkipDelay = value;
      tooltipGroups.get(group).skipDelay = value;
    };
    const setSkipDelayTimeout = (value) => {
      const group = access(props.group);
      if (group === null)
        return localSkipDelayTimeout = value;
      tooltipGroups.get(group).skipDelayTimeout = value;
    };
    const getSkipDelayTimeout = () => {
      const group = access(props.group);
      if (group === null)
        return localSkipDelayTimeout;
      return tooltipGroups.get(group).skipDelayTimeout;
    };
    createEffect(() => {
      const group = access(props.group);
      const id = access(props.id);
      if (group === null)
        return;
      registerTooltip(group, id, () => {
        tooltipState = null;
        props.close();
      });
      onCleanup(() => {
        unregisterTooltip(group, id);
      });
    });
    createEffect(() => {
      if (!props.open())
        return;
      untrack(() => {
        const group = access(props.group);
        if (group === null)
          return;
        closeTooltipGroup(group, access(props.id));
      });
    });
    createEffect(() => {
      if (!access(props.openOnHover))
        return;
      const trigger = access(props.trigger);
      if (!trigger)
        return;
      const onPointerEnter = (event) => afterPaint(() => openTooltip("hover", event));
      const onPointerDown = (event) => {
        clickedTrigger = true;
        closeTooltip("click", event);
      };
      const onPointerLeave = (event) => {
        if (tooltipState === "hover")
          return;
        closeTooltip("leave", event);
      };
      trigger.addEventListener("pointerenter", onPointerEnter);
      trigger.addEventListener("pointerdown", onPointerDown);
      trigger.addEventListener("pointerleave", onPointerLeave);
      onCleanup(() => {
        trigger.removeEventListener("pointerenter", onPointerEnter);
        trigger.removeEventListener("pointerdown", onPointerDown);
        trigger.removeEventListener("pointerleave", onPointerLeave);
      });
    });
    createEffect(() => {
      if (!access(props.openOnFocus))
        return;
      const trigger = access(props.trigger);
      if (!trigger)
        return;
      const onFocus = (event) => openTooltip("focus", event);
      const onBlur = (event) => closeTooltip("blur", event);
      trigger.addEventListener("focus", onFocus);
      trigger.addEventListener("blur", onBlur);
      onCleanup(() => {
        trigger.removeEventListener("focus", onFocus);
        trigger.removeEventListener("blur", onBlur);
      });
    });
    createEffect(() => {
      if (!access(props.hoverableContent))
        return;
      const content = access(props.content);
      if (!content)
        return;
      const onPointerDown = (event) => {
        if (event.pointerType === "touch")
          return;
        if (tooltipState !== "focus")
          return;
        tooltipState = "hover";
      };
      content.addEventListener("pointerdown", onPointerDown);
      onCleanup(() => {
        content.removeEventListener("pointerdown", onPointerDown);
      });
    });
    const openTooltip = (reason, event) => {
      resetTimeout();
      switch (reason) {
        case "focus":
          if (clickedTrigger)
            return;
          tooltipState = "focus";
          props.onFocus?.(event);
          if (access(props.closeOnScroll)) {
            document.addEventListener("scroll", onScroll, { capture: true });
          }
          document.addEventListener("pointermove", onSafeAreaMove);
          break;
        case "hover":
          const pointerEvent = event;
          if (pointerEvent.pointerType === "touch")
            return;
          if (tooltipState === "focus" || tooltipState === "hover")
            return;
          const openDelay = access(props.openDelay);
          if (openDelay <= 0 || getSkipDelay()) {
            tooltipState = "hover";
            props.onHover?.(pointerEvent);
            insideSafeArea = true;
            if (access(props.closeOnScroll)) {
              document.addEventListener("scroll", onScroll, { capture: true });
            }
            document.addEventListener("pointermove", onSafeAreaMove);
          } else {
            timeout = setTimeout(() => {
              timeout = null;
              tooltipState = "hover";
              props.onHover?.(pointerEvent);
              insideSafeArea = true;
              if (access(props.closeOnScroll)) {
                document.addEventListener("scroll", onScroll, { capture: true });
              }
              document.addEventListener("pointermove", onSafeAreaMove);
            }, openDelay);
          }
          break;
      }
    };
    const closeTooltip = (reason, event) => {
      resetTimeout();
      switch (reason) {
        case "blur":
          clickedTrigger = false;
          if (insideSafeArea) {
            tooltipState = "hover";
            return;
          }
          tooltipState = null;
          props.onBlur?.(event);
          break;
        case "leave":
          if (tooltipState !== "hover")
            return;
          const closeDelay = access(props.closeDelay);
          if (closeDelay <= 0) {
            initSkipDelay();
            tooltipState = null;
            props.onLeave?.(event);
          } else {
            timeout = setTimeout(() => {
              timeout = null;
              if (insideSafeArea)
                return;
              initSkipDelay();
              tooltipState = null;
              props.onLeave?.(event);
            }, closeDelay);
          }
          break;
        case "click":
          if (!access(props.closeOnPointerDown))
            return;
          tooltipState = null;
          props.onPointerDown?.(event);
          break;
        case "scroll":
          tooltipState = null;
          props.onScroll?.(event);
          break;
      }
    };
    const onSafeAreaMove = (event) => {
      const points = [];
      const trigger = access(props.trigger);
      if (!trigger)
        return;
      points.push(...getPointsFromRect(trigger.getBoundingClientRect()));
      if (access(props.hoverableContent)) {
        const content = access(props.content);
        if (content) {
          points.push(...getPointsFromRect(content.getBoundingClientRect()));
        }
      }
      const safeAreaPolygon = calculateSafeAreaPolygon(points);
      if (tooltipState === null) {
        document.removeEventListener("pointermove", onSafeAreaMove);
        return;
      }
      if (!pointInPolygon({ x: event.clientX, y: event.clientY }, safeAreaPolygon)) {
        if (insideSafeArea && tooltipState === "hover") {
          insideSafeArea = false;
          closeTooltip("leave", event);
        } else {
          insideSafeArea = false;
        }
      } else {
        insideSafeArea = true;
      }
    };
    const onScroll = (event) => {
      const trigger = access(props.trigger);
      if (tooltipState === null || !trigger) {
        document.removeEventListener("scroll", onScroll);
        return;
      }
      if (!event.target.contains(trigger))
        return;
      closeTooltip("scroll", event);
    };
    const resetTimeout = () => {
      if (timeout !== null) {
        clearTimeout(timeout);
        timeout = null;
      }
    };
    const initSkipDelay = () => {
      const skipDelayDuration = access(props.skipDelayDuration);
      if (skipDelayDuration > 0) {
        const skipDelayTimeout = getSkipDelayTimeout();
        if (skipDelayTimeout !== null) {
          clearTimeout(skipDelayTimeout);
          setSkipDelayTimeout(null);
        }
        setSkipDelay(true);
        setSkipDelayTimeout(
          setTimeout(() => {
            setSkipDelayTimeout(null);
            setSkipDelay(false);
          }, skipDelayDuration)
        );
      }
    };
  };
  var getPointsFromRect = (rect) => {
    return [
      { x: rect.left, y: rect.top },
      { x: rect.left, y: rect.bottom },
      { x: rect.right, y: rect.top },
      { x: rect.right, y: rect.bottom }
    ];
  };
  var pointInPolygon = (point, polygon) => {
    let inside = false;
    for (let p1 = 0, p2 = polygon.length - 1; p1 < polygon.length; p2 = p1++) {
      const x1 = polygon[p1].x, y1 = polygon[p1].y, x2 = polygon[p2].x, y2 = polygon[p2].y;
      if (point.y < y1 !== point.y < y2 && point.x < x1 + (point.y - y1) / (y2 - y1) * (x2 - x1)) {
        inside = !inside;
      }
    }
    return inside;
  };
  var calculateSafeAreaPolygon = (points) => {
    points.sort((a, b) => {
      if (a.x < b.x)
        return -1;
      else if (a.x > b.x)
        return 1;
      else if (a.y < b.y)
        return -1;
      else if (a.y > b.y)
        return 1;
      else
        return 0;
    });
    if (points.length <= 1)
      return points;
    const upperHull = [];
    for (const p of points) {
      while (upperHull.length >= 2) {
        const q = upperHull[upperHull.length - 1];
        const r = upperHull[upperHull.length - 2];
        if ((q.x - r.x) * (p.y - r.y) >= (q.y - r.y) * (p.x - r.x)) {
          upperHull.pop();
        } else
          break;
      }
      upperHull.push(p);
    }
    upperHull.pop();
    const lowerHull = [];
    for (let pointIndex = points.length - 1; pointIndex >= 0; pointIndex--) {
      const p = points[pointIndex];
      while (lowerHull.length >= 2) {
        const q = lowerHull[lowerHull.length - 1];
        const r = lowerHull[lowerHull.length - 2];
        if ((q.x - r.x) * (p.y - r.y) >= (q.y - r.y) * (p.x - r.x)) {
          lowerHull.pop();
        } else
          break;
      }
      lowerHull.push(p);
    }
    lowerHull.pop();
    if (upperHull.length == 1 && lowerHull.length == 1 && upperHull[0].x == lowerHull[0].x && upperHull[0].y == lowerHull[0].y) {
      return upperHull;
    } else {
      return upperHull.concat(lowerHull);
    }
  };
  var tooltip_default = createTooltip;

  // node_modules/.pnpm/@corvu+tooltip@0.1.0_solid-js@1.8.17/node_modules/@corvu/tooltip/dist/index.js
  var TooltipContext = createContext();
  var createTooltipContext = (contextId) => {
    if (contextId === void 0)
      return TooltipContext;
    const context = createKeyedContext(
      `tooltip-${contextId}`
    );
    return context;
  };
  var useTooltipContext = (contextId) => {
    if (contextId === void 0) {
      const context2 = useContext(TooltipContext);
      if (!context2) {
        throw new Error(
          "[corvu]: Tooltip context not found. Make sure to wrap Tooltip components in <Tooltip.Root>"
        );
      }
      return context2;
    }
    const context = useKeyedContext(`tooltip-${contextId}`);
    if (!context) {
      throw new Error(
        `[corvu]: Tooltip context with id "${contextId}" not found. Make sure to wrap Tooltip components in <Tooltip.Root contextId="${contextId}">`
      );
    }
    return context;
  };
  var InternalTooltipContext = createContext();
  var createInternalTooltipContext = (contextId) => {
    if (contextId === void 0)
      return InternalTooltipContext;
    const context = createKeyedContext(
      `tooltip-internal-${contextId}`
    );
    return context;
  };
  var useInternalTooltipContext = (contextId) => {
    if (contextId === void 0) {
      const context2 = useContext(InternalTooltipContext);
      if (!context2) {
        throw new Error(
          "[corvu]: Tooltip context not found. Make sure to wrap Tooltip components in <Tooltip.Root>"
        );
      }
      return context2;
    }
    const context = useKeyedContext(
      `tooltip-internal-${contextId}`
    );
    if (!context) {
      throw new Error(
        `[corvu]: Tooltip context with id "${contextId}" not found. Make sure to wrap Tooltip components in <Tooltip.Root contextId="${contextId}">`
      );
    }
    return context;
  };
  var DEFAULT_TOOLTIP_ANCHOR_ELEMENT = "div";
  var TooltipAnchor = (props) => {
    const [localProps, otherProps] = splitProps(props, ["contextId", "ref"]);
    const context = createMemo(() => useInternalTooltipContext(localProps.contextId));
    return createComponent(Dynamic_default, mergeProps({
      as: DEFAULT_TOOLTIP_ANCHOR_ELEMENT,
      ref(r$) {
        var _ref$ = mergeRefs(context().setAnchorRef, localProps.ref);
        typeof _ref$ === "function" && _ref$(r$);
      },
      "data-corvu-tooltip-anchor": ""
    }, otherProps));
  };
  var Anchor_default = TooltipAnchor;
  var DEFAULT_TOOLTIP_ARROW_ELEMENT = "div";
  var TooltipArrow = (props) => {
    const [localProps, otherProps] = splitProps(props, ["contextId", "ref"]);
    const context = createMemo(() => useInternalTooltipContext(localProps.contextId));
    return createComponent(FloatingArrow_default, mergeProps({
      as: DEFAULT_TOOLTIP_ARROW_ELEMENT,
      get floatingState() {
        return context().floatingState();
      },
      ref(r$) {
        var _ref$ = mergeRefs(context().setArrowRef, localProps.ref);
        typeof _ref$ === "function" && _ref$(r$);
      },
      "data-corvu-tooltip-arrow": ""
    }, otherProps));
  };
  var Arrow_default = TooltipArrow;
  var DEFAULT_TOOLTIP_CONTENT_ELEMENT = "div";
  var TooltipContent = (props) => {
    const [localProps, otherProps] = splitProps(props, ["forceMount", "contextId", "ref", "style"]);
    const context = createMemo(() => useInternalTooltipContext(localProps.contextId));
    const show = () => some(context().open, () => localProps.forceMount, context().contentPresent);
    return createComponent(Dismissible_default, {
      get element() {
        return context().contentRef;
      },
      get enabled() {
        return context().open() || context().contentPresent();
      },
      onDismiss: () => context().setOpen(false),
      get dismissOnEscapeKeyDown() {
        return context().closeOnEscapeKeyDown;
      },
      dismissOnOutsidePointer: false,
      noOutsidePointerEvents: false,
      get onEscapeKeyDown() {
        return context().onEscapeKeyDown;
      },
      children: (props2) => createComponent(Show, {
        get when() {
          return show();
        },
        get children() {
          return createComponent(Dynamic_default, mergeProps({
            as: DEFAULT_TOOLTIP_CONTENT_ELEMENT,
            ref(r$) {
              var _ref$ = mergeRefs(context().setContentRef, localProps.ref);
              typeof _ref$ === "function" && _ref$(r$);
            },
            get style() {
              return {
                ...getFloatingStyle({
                  strategy: () => context().strategy(),
                  floatingState: () => context().floatingState()
                })(),
                "pointer-events": props2.isLastLayer ? "auto" : void 0,
                ...localProps.style
              };
            },
            get id() {
              return context().tooltipId();
            },
            role: "tooltip",
            get ["data-closed"]() {
              return dataIf(!context().open());
            },
            get ["data-open"]() {
              return dataIf(context().open());
            },
            get ["data-placement"]() {
              return context().floatingState().placement;
            },
            "data-corvu-tooltip-content": ""
          }, otherProps));
        }
      })
    });
  };
  var Content_default = TooltipContent;
  var TooltipPortal = (props) => {
    const [localProps, otherProps] = splitProps(props, ["forceMount", "contextId"]);
    const context = createMemo(() => useInternalTooltipContext(localProps.contextId));
    const show = () => some(context().open, () => localProps.forceMount, context().contentPresent);
    return createComponent(Show, {
      get when() {
        return show();
      },
      get children() {
        return createComponent(Portal, otherProps);
      }
    });
  };
  var Portal_default = TooltipPortal;
  var TooltipRoot = (props) => {
    const defaultedProps = mergeProps({
      initialOpen: false,
      placement: "bottom",
      strategy: "absolute",
      floatingOptions: {
        flip: true,
        shift: true
      },
      openDelay: 500,
      closeDelay: 0,
      skipDelayDuration: 0,
      hoverableContent: true,
      group: null,
      openOnFocus: true,
      openOnHover: true,
      closeOnEscapeKeyDown: true,
      closeOnPointerDown: true,
      closeOnScroll: true,
      tooltipId: createUniqueId()
    }, props);
    const [open, setOpen] = controllableSignal_default({
      value: () => defaultedProps.open,
      initialValue: defaultedProps.initialOpen,
      onChange: defaultedProps.onOpenChange
    });
    const [anchorRef, setAnchorRef] = createSignal(null);
    const [triggerRef, setTriggerRef] = createSignal(null);
    const [contentRef, setContentRef] = createSignal(null);
    const [arrowRef, setArrowRef] = createSignal(null);
    const {
      present: contentPresent
    } = src_default({
      show: open,
      element: contentRef
    });
    const floatingState = floating_default({
      enabled: contentPresent,
      floating: contentRef,
      reference: () => anchorRef() ?? triggerRef() ?? null,
      arrow: arrowRef,
      placement: () => defaultedProps.placement,
      strategy: () => defaultedProps.strategy,
      options: () => defaultedProps.floatingOptions
    });
    tooltip_default({
      id: () => defaultedProps.tooltipId,
      group: () => defaultedProps.group,
      open,
      close: () => setOpen(false),
      trigger: triggerRef,
      content: contentRef,
      openOnFocus: () => defaultedProps.openOnFocus,
      openOnHover: () => defaultedProps.openOnHover,
      closeOnPointerDown: () => defaultedProps.closeOnPointerDown,
      closeOnScroll: () => defaultedProps.closeOnScroll,
      hoverableContent: () => defaultedProps.hoverableContent,
      openDelay: () => defaultedProps.openDelay,
      closeDelay: () => defaultedProps.closeDelay,
      skipDelayDuration: () => defaultedProps.skipDelayDuration,
      onHover: (event) => {
        if (callEventHandler(defaultedProps.onHover, event))
          return;
        setOpen(true);
      },
      onLeave: (event) => {
        if (callEventHandler(defaultedProps.onLeave, event))
          return;
        setOpen(false);
      },
      onFocus: (event) => {
        if (callEventHandler(defaultedProps.onFocus, event))
          return;
        setOpen(true);
      },
      onBlur: (event) => {
        if (callEventHandler(defaultedProps.onBlur, event))
          return;
        setOpen(false);
      },
      onPointerDown: (event) => {
        if (callEventHandler(defaultedProps.onPointerDown, event))
          return;
        setOpen(false);
      },
      onScroll: (event) => {
        if (callEventHandler(defaultedProps.onScroll, event))
          return;
        setOpen(false);
      }
    });
    const childrenProps = {
      get open() {
        return open();
      },
      setOpen,
      get placement() {
        return defaultedProps.placement;
      },
      get strategy() {
        return defaultedProps.strategy;
      },
      get floatingOptions() {
        return defaultedProps.floatingOptions;
      },
      get floatingState() {
        return floatingState();
      },
      get openDelay() {
        return defaultedProps.openDelay;
      },
      get closeDelay() {
        return defaultedProps.closeDelay;
      },
      get skipDelayDuration() {
        return defaultedProps.skipDelayDuration;
      },
      get hoverableContent() {
        return defaultedProps.hoverableContent;
      },
      get group() {
        return defaultedProps.group;
      },
      get openOnFocus() {
        return defaultedProps.openOnFocus;
      },
      get openOnHover() {
        return defaultedProps.openOnHover;
      },
      get closeOnEscapeKeyDown() {
        return defaultedProps.closeOnEscapeKeyDown;
      },
      get closeOnPointerDown() {
        return defaultedProps.closeOnPointerDown;
      },
      get contentPresent() {
        return contentPresent();
      },
      get contentRef() {
        return contentRef();
      },
      get tooltipId() {
        return defaultedProps.tooltipId;
      }
    };
    const memoizedChildren = once_default(() => defaultedProps.children);
    const resolveChildren2 = () => {
      const children2 = memoizedChildren()();
      if (isFunction(children2)) {
        return children2(childrenProps);
      }
      return children2;
    };
    const memoizedTooltipRoot = createMemo(() => {
      const TooltipContext2 = createTooltipContext(defaultedProps.contextId);
      const InternalTooltipContext2 = createInternalTooltipContext(defaultedProps.contextId);
      return untrack(() => createComponent(TooltipContext2.Provider, {
        value: {
          open,
          setOpen,
          placement: () => defaultedProps.placement,
          strategy: () => defaultedProps.strategy,
          floatingOptions: () => defaultedProps.floatingOptions,
          floatingState,
          openDelay: () => defaultedProps.openDelay,
          closeDelay: () => defaultedProps.closeDelay,
          skipDelayDuration: () => defaultedProps.skipDelayDuration,
          hoverableContent: () => defaultedProps.hoverableContent,
          group: () => defaultedProps.group,
          openOnFocus: () => defaultedProps.openOnFocus,
          openOnHover: () => defaultedProps.openOnHover,
          closeOnEscapeKeyDown: () => defaultedProps.closeOnEscapeKeyDown,
          closeOnPointerDown: () => defaultedProps.closeOnPointerDown,
          contentPresent,
          contentRef,
          tooltipId: () => defaultedProps.tooltipId
        },
        get children() {
          return createComponent(InternalTooltipContext2.Provider, {
            get value() {
              return {
                open,
                setOpen,
                placement: () => defaultedProps.placement,
                strategy: () => defaultedProps.strategy,
                floatingOptions: () => defaultedProps.floatingOptions,
                floatingState,
                openDelay: () => defaultedProps.openDelay,
                closeDelay: () => defaultedProps.closeDelay,
                skipDelayDuration: () => defaultedProps.skipDelayDuration,
                hoverableContent: () => defaultedProps.hoverableContent,
                group: () => defaultedProps.group,
                openOnFocus: () => defaultedProps.openOnFocus,
                openOnHover: () => defaultedProps.openOnHover,
                closeOnEscapeKeyDown: () => defaultedProps.closeOnEscapeKeyDown,
                closeOnPointerDown: () => defaultedProps.closeOnPointerDown,
                contentPresent,
                contentRef,
                tooltipId: () => defaultedProps.tooltipId,
                onFocus: defaultedProps.onFocus,
                onBlur: defaultedProps.onBlur,
                onPointerDown: defaultedProps.onPointerDown,
                onEscapeKeyDown: defaultedProps.onEscapeKeyDown,
                setAnchorRef,
                setTriggerRef,
                setContentRef,
                setArrowRef
              };
            },
            get children() {
              return untrack(() => resolveChildren2());
            }
          });
        }
      }));
    });
    return memoizedTooltipRoot;
  };
  var Root_default = TooltipRoot;
  var DEFAULT_TOOLTIP_TRIGGER_ELEMENT = "button";
  var TooltipTrigger = (props) => {
    const [localProps, otherProps] = splitProps(props, ["contextId", "ref"]);
    const context = createMemo(() => useInternalTooltipContext(localProps.contextId));
    return createComponent(DynamicButton_default, mergeProps({
      as: DEFAULT_TOOLTIP_TRIGGER_ELEMENT,
      ref(r$) {
        var _ref$ = mergeRefs(context().setTriggerRef, localProps.ref);
        typeof _ref$ === "function" && _ref$(r$);
      },
      get ["aria-describedby"]() {
        return createMemo(() => !!context().open())() ? context().tooltipId() : void 0;
      },
      get ["aria-expanded"]() {
        return context().open() ? "true" : "false";
      },
      get ["data-closed"]() {
        return dataIf(!context().open());
      },
      get ["data-open"]() {
        return dataIf(context().open());
      },
      get ["data-placement"]() {
        return createMemo(() => !!context().open())() ? context().floatingState().placement : void 0;
      },
      "data-corvu-tooltip-trigger": ""
    }, otherProps));
  };
  var Trigger_default = TooltipTrigger;
  var Tooltip = Object.assign(Root_default, {
    Anchor: Anchor_default,
    Trigger: Trigger_default,
    Portal: Portal_default,
    Content: Content_default,
    Arrow: Arrow_default,
    useContext: useTooltipContext
  });
  var src_default2 = Tooltip;

  // node_modules/.pnpm/component-register@0.8.3/node_modules/component-register/dist/component-register.js
  function cloneProps(props) {
    const propKeys = Object.keys(props);
    return propKeys.reduce((memo, k) => {
      const prop = props[k];
      memo[k] = Object.assign({}, prop);
      if (isObject(prop.value) && !isFunction2(prop.value) && !Array.isArray(prop.value)) memo[k].value = Object.assign({}, prop.value);
      if (Array.isArray(prop.value)) memo[k].value = prop.value.slice(0);
      return memo;
    }, {});
  }
  function normalizePropDefs(props) {
    if (!props) return {};
    const propKeys = Object.keys(props);
    return propKeys.reduce((memo, k) => {
      const v = props[k];
      memo[k] = !(isObject(v) && "value" in v) ? {
        value: v
      } : v;
      memo[k].attribute || (memo[k].attribute = toAttribute(k));
      memo[k].parse = "parse" in memo[k] ? memo[k].parse : typeof memo[k].value !== "string";
      return memo;
    }, {});
  }
  function propValues(props) {
    const propKeys = Object.keys(props);
    return propKeys.reduce((memo, k) => {
      memo[k] = props[k].value;
      return memo;
    }, {});
  }
  function initializeProps(element, propDefinition) {
    const props = cloneProps(propDefinition), propKeys = Object.keys(propDefinition);
    propKeys.forEach((key) => {
      const prop = props[key], attr = element.getAttribute(prop.attribute), value = element[key];
      if (attr) prop.value = prop.parse ? parseAttributeValue(attr) : attr;
      if (value != null) prop.value = Array.isArray(value) ? value.slice(0) : value;
      prop.reflect && reflect(element, prop.attribute, prop.value);
      Object.defineProperty(element, key, {
        get() {
          return prop.value;
        },
        set(val) {
          const oldValue = prop.value;
          prop.value = val;
          prop.reflect && reflect(this, prop.attribute, prop.value);
          for (let i = 0, l = this.__propertyChangedCallbacks.length; i < l; i++) {
            this.__propertyChangedCallbacks[i](key, val, oldValue);
          }
        },
        enumerable: true,
        configurable: true
      });
    });
    return props;
  }
  function parseAttributeValue(value) {
    if (!value) return;
    try {
      return JSON.parse(value);
    } catch (err) {
      return value;
    }
  }
  function reflect(node, attribute, value) {
    if (value == null || value === false) return node.removeAttribute(attribute);
    let reflect2 = JSON.stringify(value);
    node.__updating[attribute] = true;
    if (reflect2 === "true") reflect2 = "";
    node.setAttribute(attribute, reflect2);
    Promise.resolve().then(() => delete node.__updating[attribute]);
  }
  function toAttribute(propName) {
    return propName.replace(/\.?([A-Z]+)/g, (x, y) => "-" + y.toLowerCase()).replace("_", "-").replace(/^-/, "");
  }
  function isObject(obj) {
    return obj != null && (typeof obj === "object" || typeof obj === "function");
  }
  function isFunction2(val) {
    return Object.prototype.toString.call(val) === "[object Function]";
  }
  function isConstructor(f) {
    return typeof f === "function" && f.toString().indexOf("class") === 0;
  }
  var currentElement;
  function createElementType(BaseElement, propDefinition) {
    const propKeys = Object.keys(propDefinition);
    return class CustomElement extends BaseElement {
      static get observedAttributes() {
        return propKeys.map((k) => propDefinition[k].attribute);
      }
      constructor() {
        super();
        this.__initialized = false;
        this.__released = false;
        this.__releaseCallbacks = [];
        this.__propertyChangedCallbacks = [];
        this.__updating = {};
        this.props = {};
      }
      connectedCallback() {
        if (this.__initialized) return;
        this.__releaseCallbacks = [];
        this.__propertyChangedCallbacks = [];
        this.__updating = {};
        this.props = initializeProps(this, propDefinition);
        const props = propValues(this.props), ComponentType = this.Component, outerElement = currentElement;
        try {
          currentElement = this;
          this.__initialized = true;
          if (isConstructor(ComponentType)) new ComponentType(props, {
            element: this
          });
          else ComponentType(props, {
            element: this
          });
        } finally {
          currentElement = outerElement;
        }
      }
      async disconnectedCallback() {
        await Promise.resolve();
        if (this.isConnected) return;
        this.__propertyChangedCallbacks.length = 0;
        let callback = null;
        while (callback = this.__releaseCallbacks.pop()) callback(this);
        delete this.__initialized;
        this.__released = true;
      }
      attributeChangedCallback(name, oldVal, newVal) {
        if (!this.__initialized) return;
        if (this.__updating[name]) return;
        name = this.lookupProp(name);
        if (name in propDefinition) {
          if (newVal == null && !this[name]) return;
          this[name] = propDefinition[name].parse ? parseAttributeValue(newVal) : newVal;
        }
      }
      lookupProp(attrName) {
        if (!propDefinition) return;
        return propKeys.find((k) => attrName === k || attrName === propDefinition[k].attribute);
      }
      get renderRoot() {
        return this.shadowRoot || this.attachShadow({
          mode: "open"
        });
      }
      addReleaseCallback(fn) {
        this.__releaseCallbacks.push(fn);
      }
      addPropertyChangedCallback(fn) {
        this.__propertyChangedCallbacks.push(fn);
      }
    };
  }
  var EC = Symbol("element-context");
  function register(tag, props = {}, options = {}) {
    const {
      BaseElement = HTMLElement,
      extension
    } = options;
    return (ComponentType) => {
      if (!tag) throw new Error("tag is required to register a Component");
      let ElementType = customElements.get(tag);
      if (ElementType) {
        ElementType.prototype.Component = ComponentType;
        return ElementType;
      }
      ElementType = createElementType(BaseElement, normalizePropDefs(props));
      ElementType.prototype.Component = ComponentType;
      ElementType.prototype.registeredTag = tag;
      customElements.define(tag, ElementType, extension);
      return ElementType;
    };
  }

  // node_modules/.pnpm/solid-element@1.8.0_solid-js@1.8.17/node_modules/solid-element/dist/index.js
  function createProps(raw) {
    const keys = Object.keys(raw);
    const props = {};
    for (let i = 0; i < keys.length; i++) {
      const [get, set] = createSignal(raw[keys[i]]);
      Object.defineProperty(props, keys[i], {
        get,
        set(v) {
          set(() => v);
        }
      });
    }
    return props;
  }
  function lookupContext(el) {
    if (el.assignedSlot && el.assignedSlot._$owner) return el.assignedSlot._$owner;
    let next = el.parentNode;
    while (next && !next._$owner && !(next.assignedSlot && next.assignedSlot._$owner))
      next = next.parentNode;
    return next && next.assignedSlot ? next.assignedSlot._$owner : el._$owner;
  }
  function withSolid(ComponentType) {
    return (rawProps, options) => {
      const { element } = options;
      return createRoot((dispose2) => {
        const props = createProps(rawProps);
        element.addPropertyChangedCallback((key, val) => props[key] = val);
        element.addReleaseCallback(() => {
          element.renderRoot.textContent = "";
          dispose2();
        });
        const comp = ComponentType(props, options);
        return insert(element.renderRoot, comp);
      }, lookupContext(element));
    };
  }
  function customElement(tag, props, ComponentType) {
    if (arguments.length === 2) {
      ComponentType = props;
      props = {};
    }
    return register(tag, props)(withSolid(ComponentType));
  }

  // app.tsx
  var _tmpl$2 = /* @__PURE__ */ template(`<div><div class="flex justify-between rounded-md p-4 font-bold"><span></span><span> / </span></div><ul class="flex flex-col gap-4 px-2 pt-4">`);
  var _tmpl$22 = /* @__PURE__ */ template(`<span>Solved by `);
  var _tmpl$3 = /* @__PURE__ */ template(`<table>`);
  var _tmpl$4 = /* @__PURE__ */ template(`<span>Authored by `);
  var _tmpl$5 = /* @__PURE__ */ template(`<span>Create new ticket`);
  var _tmpl$6 = /* @__PURE__ */ template(`<svg xmlns=http://www.w3.org/2000/svg width=24 height=24 viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round class="lucide lucide-ticket -rotate-45"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path><path d="M13 5v2"></path><path d="M13 17v2"></path><path d="M13 11v2">`);
  var _tmpl$7 = /* @__PURE__ */ template(`<span>View full challenge`);
  var _tmpl$8 = /* @__PURE__ */ template(`<svg xmlns=http://www.w3.org/2000/svg width=24 height=24 viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round class="lucide lucide-layout-grid"><rect width=7 height=7 x=3 y=3 rx=1></rect><rect width=7 height=7 x=14 y=3 rx=1></rect><rect width=7 height=7 x=14 y=14 rx=1></rect><rect width=7 height=7 x=3 y=14 rx=1>`);
  var _tmpl$9 = /* @__PURE__ */ template(`<li class="border-l-4 bg-card p-4 ring-offset-4 ring-offset-background"><div class="mb-2 flex justify-between h-8"><div class="font-bold flex items-center gap-2"><div><span> /</span><span> </span></div></div><div class="flex items-center gap-4"></div></div><div>`);
  var _tmpl$10 = /* @__PURE__ */ template(`<span class=text-green-500>up`);
  var _tmpl$11 = /* @__PURE__ */ template(`<span class=text-red-500>down`);
  var _tmpl$12 = /* @__PURE__ */ template(`<tr><td class="pr-2 text-right"></td><td class=pr-2> solve</td><td> point`);
  customElement("rhombus-tooltip", (props, {
    element
  }) => {
    const anchor = document.querySelector("dialog");
    let children2 = element.renderRoot.host.children;
    let content = void 0;
    let trigger = void 0;
    for (let i = 0; i < children2.length; i++) {
      const slot = children2[i].slot;
      if (slot === "content") {
        content = children2[i];
      } else {
        trigger = children2[i];
      }
    }
    return createComponent(src_default2, {
      placement: "top",
      floatingOptions: {
        offset: 13,
        flip: true,
        shift: true
      },
      strategy: "fixed",
      get children() {
        return [createComponent(src_default2.Portal, {
          mount: anchor,
          get children() {
            return createComponent(src_default2.Content, {
              "class": "tooltip",
              get children() {
                return [content, createComponent(src_default2.Arrow, {
                  "class": "text-secondary"
                })];
              }
            });
          }
        }), createComponent(src_default2.Trigger, {
          as: "div",
          children: trigger
        })];
      }
    });
  });
  var [data, {
    refetch
  }] = createResource(async () => await (await fetch("/challenges", {
    headers: {
      accept: "application/json"
    }
  })).json());
  var handler = () => refetch();
  var ChallengesComponent = () => {
    document.body.removeEventListener("manualRefresh", handler);
    document.body.addEventListener("manualRefresh", handler);
    window.removeEventListener("focus", handler);
    window.addEventListener("focus", handler);
    createEffect(() => {
      data();
      htmx.process(document.body);
    });
    return createComponent(Show, {
      get when() {
        return data();
      },
      get children() {
        return createComponent(For, {
          get each() {
            return data().categories;
          },
          children: (category) => {
            const challenges = data().challenges.filter((challenge) => challenge.category_id === category.id);
            return (() => {
              var _el$ = _tmpl$2(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.nextSibling, _el$5 = _el$4.firstChild, _el$7 = _el$2.nextSibling;
              insert(_el$3, () => category.name);
              insert(_el$4, () => challenges.filter((challenge) => data().team.solves[challenge.id] !== void 0).length, _el$5);
              insert(_el$4, () => challenges.length, null);
              insert(_el$7, createComponent(For, {
                each: challenges,
                children: (challenge) => {
                  const author = data().authors[challenge.author_id];
                  const solve = data().team.solves[challenge.id];
                  return (() => {
                    var _el$8 = _tmpl$9(), _el$9 = _el$8.firstChild, _el$10 = _el$9.firstChild, _el$11 = _el$10.firstChild, _el$12 = _el$11.firstChild, _el$13 = _el$12.firstChild, _el$14 = _el$12.nextSibling, _el$15 = _el$14.firstChild, _el$16 = _el$10.nextSibling, _el$27 = _el$9.nextSibling;
                    insert(_el$12, () => category.name, _el$13);
                    insert(_el$14, () => challenge.name, null);
                    insert(_el$10, createComponent(src_default2, {
                      placement: "top",
                      floatingOptions: {
                        offset: 13,
                        flip: true,
                        shift: true
                      },
                      openOnFocus: false,
                      get children() {
                        return [createComponent(src_default2.Portal, {
                          get children() {
                            return createComponent(src_default2.Content, {
                              "class": "tooltip",
                              get children() {
                                return [createMemo(() => createMemo(() => !!challenge.healthy)() ? ["Challenge is", " ", _tmpl$10()] : ["Challenge is", " ", _tmpl$11()]), createComponent(src_default2.Arrow, {
                                  "class": "text-secondary"
                                })];
                              }
                            });
                          }
                        }), createComponent(src_default2.Trigger, {
                          as: "div",
                          get ["class"]() {
                            return `size-3 rounded-full cursor-pointer ${challenge.healthy ? "bg-green-500" : "bg-red-500"}`;
                          }
                        })];
                      }
                    }), null);
                    insert(_el$16, createComponent(Show, {
                      when: solve,
                      get children() {
                        return createComponent(src_default2, {
                          placement: "top",
                          floatingOptions: {
                            offset: 13,
                            flip: true,
                            shift: true
                          },
                          get children() {
                            return [createComponent(src_default2.Portal, {
                              get children() {
                                return createComponent(src_default2.Content, {
                                  "class": "tooltip",
                                  get children() {
                                    return [(() => {
                                      var _el$17 = _tmpl$22(), _el$18 = _el$17.firstChild;
                                      insert(_el$17, () => data().team.users[solve.user_id].name, null);
                                      return _el$17;
                                    })(), createComponent(src_default2.Arrow, {
                                      "class": "text-secondary"
                                    })];
                                  }
                                });
                              }
                            }), createComponent(src_default2.Trigger, {
                              as: "img",
                              "class": "aspect-square rounded-full h-8",
                              get alt() {
                                return `Solved by ${data().team.users[solve.user_id].name}`;
                              },
                              get src() {
                                return data().team.users[solve.user_id].avatar_url;
                              }
                            })];
                          }
                        });
                      }
                    }), null);
                    insert(_el$16, createComponent(src_default2, {
                      placement: "top",
                      floatingOptions: {
                        offset: 13,
                        flip: true,
                        shift: true
                      },
                      get children() {
                        return [createComponent(src_default2.Portal, {
                          get children() {
                            return createComponent(src_default2.Content, {
                              "class": "tooltip",
                              get children() {
                                return [(() => {
                                  var _el$20 = _tmpl$3();
                                  insert(_el$20, () => challenge.division_points.map((division_points) => (() => {
                                    var _el$30 = _tmpl$12(), _el$31 = _el$30.firstChild, _el$32 = _el$31.nextSibling, _el$33 = _el$32.firstChild, _el$34 = _el$32.nextSibling, _el$35 = _el$34.firstChild;
                                    insert(_el$31, () => data().divisions[division_points.division_id].name);
                                    insert(_el$32, () => division_points.solves, _el$33);
                                    insert(_el$32, () => division_points.solves !== 1 ? "s" : "", null);
                                    insert(_el$34, () => division_points.points, _el$35);
                                    insert(_el$34, () => division_points.points !== 1 ? "s" : "", null);
                                    return _el$30;
                                  })()));
                                  return _el$20;
                                })(), createComponent(src_default2.Arrow, {
                                  "class": "text-secondary"
                                })];
                              }
                            });
                          }
                        }), createComponent(src_default2.Trigger, {
                          as: "span",
                          "class": "cursor-pointer",
                          get children() {
                            return [createMemo(() => challenge.division_points[0].solves), " solve", createMemo(() => challenge.division_points[0].solves !== 1 ? "s" : ""), " ", "/ ", createMemo(() => challenge.division_points[0].points), " point", createMemo(() => challenge.division_points[0].points !== 1 ? "s" : "")];
                          }
                        })];
                      }
                    }), null);
                    insert(_el$16, createComponent(Show, {
                      when: author,
                      get children() {
                        return createComponent(src_default2, {
                          placement: "top",
                          floatingOptions: {
                            offset: 13,
                            flip: true,
                            shift: true
                          },
                          get children() {
                            return [createComponent(src_default2.Portal, {
                              get children() {
                                return createComponent(src_default2.Content, {
                                  "class": "tooltip",
                                  get children() {
                                    return [(() => {
                                      var _el$21 = _tmpl$4(), _el$22 = _el$21.firstChild;
                                      insert(_el$21, () => author.name, null);
                                      return _el$21;
                                    })(), createComponent(src_default2.Arrow, {
                                      "class": "text-secondary"
                                    })];
                                  }
                                });
                              }
                            }), createComponent(src_default2.Trigger, {
                              as: "img",
                              "class": "aspect-square rounded-full h-8",
                              get alt() {
                                return `Authored by ${author.name}`;
                              },
                              get src() {
                                return author.avatar_url;
                              }
                            })];
                          }
                        });
                      }
                    }), null);
                    insert(_el$16, createComponent(src_default2, {
                      placement: "top",
                      floatingOptions: {
                        offset: 13,
                        flip: true,
                        shift: true
                      },
                      openOnFocus: false,
                      get children() {
                        return [createComponent(src_default2.Portal, {
                          get children() {
                            return createComponent(src_default2.Content, {
                              "class": "tooltip",
                              get children() {
                                return [_tmpl$5(), createComponent(src_default2.Arrow, {
                                  "class": "text-secondary"
                                })];
                              }
                            });
                          }
                        }), createComponent(src_default2.Trigger, {
                          as: "button",
                          "hx-trigger": "click",
                          get ["hx-get"]() {
                            return `/challenges/${challenge.id}/ticket`;
                          },
                          "hx-target": "body",
                          "hx-swap": "beforeend",
                          get children() {
                            return _tmpl$6();
                          }
                        })];
                      }
                    }), null);
                    insert(_el$16, createComponent(src_default2, {
                      placement: "top",
                      floatingOptions: {
                        offset: 13,
                        flip: true,
                        shift: true
                      },
                      openOnFocus: false,
                      get children() {
                        return [createComponent(src_default2.Portal, {
                          get children() {
                            return createComponent(src_default2.Content, {
                              "class": "tooltip",
                              get children() {
                                return [_tmpl$7(), createComponent(src_default2.Arrow, {
                                  "class": "text-secondary"
                                })];
                              }
                            });
                          }
                        }), createComponent(src_default2.Trigger, {
                          as: "button",
                          "hx-trigger": "click",
                          get ["hx-get"]() {
                            return `/challenges/${challenge.id}`;
                          },
                          "hx-target": "body",
                          "hx-swap": "beforeend",
                          get children() {
                            return _tmpl$8();
                          }
                        })];
                      }
                    }), null);
                    insert(_el$27, () => challenge.description);
                    createRenderEffect((_p$) => {
                      var _v$ = !!(location.hash.substring(1) === challenge.name), _v$2 = `border-color: ${category.color}; --tw-ring-color: ${category.color}`, _v$3 = `color: ${category.color}`;
                      _v$ !== _p$.e && _el$8.classList.toggle("ring", _p$.e = _v$);
                      _p$.t = style(_el$8, _v$2, _p$.t);
                      _p$.a = style(_el$12, _v$3, _p$.a);
                      return _p$;
                    }, {
                      e: void 0,
                      t: void 0,
                      a: void 0
                    });
                    return _el$8;
                  })();
                }
              }));
              createRenderEffect((_$p) => style(_el$2, `background-color: ${category.color}`, _$p));
              return _el$;
            })();
          }
        });
      }
    });
  };
  function renderChallenges(element) {
    render(() => createComponent(ChallengesComponent, {}), element);
  }
  return __toCommonJS(app_exports);
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3NvbGlkLWpzQDEuOC4xNy9ub2RlX21vZHVsZXMvc29saWQtanMvZGlzdC9zb2xpZC5qcyIsICIuLi9ub2RlX21vZHVsZXMvLnBucG0vc29saWQtanNAMS44LjE3L25vZGVfbW9kdWxlcy9zb2xpZC1qcy93ZWIvZGlzdC93ZWIuanMiLCAiLi4vbm9kZV9tb2R1bGVzLy5wbnBtL0Bjb3J2dSt1dGlsc0AwLjIuMF9zb2xpZC1qc0AxLjguMTcvbm9kZV9tb2R1bGVzL0Bjb3J2dS91dGlscy9kaXN0L2NodW5rL09aQ0k0TkROLmpzIiwgIi4uL25vZGVfbW9kdWxlcy8ucG5wbS9AY29ydnUrdXRpbHNAMC4yLjBfc29saWQtanNAMS44LjE3L25vZGVfbW9kdWxlcy9AY29ydnUvdXRpbHMvZGlzdC9jaHVuay9BN1NGRk9BRy5qcyIsICIuLi9ub2RlX21vZHVsZXMvLnBucG0vQGNvcnZ1K3V0aWxzQDAuMi4wX3NvbGlkLWpzQDEuOC4xNy9ub2RlX21vZHVsZXMvQGNvcnZ1L3V0aWxzL2Rpc3QvY2h1bmsvMldPS09IWlMuanMiLCAiLi4vbm9kZV9tb2R1bGVzLy5wbnBtL0Bjb3J2dSt1dGlsc0AwLjIuMF9zb2xpZC1qc0AxLjguMTcvbm9kZV9tb2R1bGVzL0Bjb3J2dS91dGlscy9kaXN0L2NodW5rLzdURUlRVEpaLmpzIiwgIi4uL25vZGVfbW9kdWxlcy8ucG5wbS9AY29ydnUrdXRpbHNAMC4yLjBfc29saWQtanNAMS44LjE3L25vZGVfbW9kdWxlcy9AY29ydnUvdXRpbHMvZGlzdC9jcmVhdGUva2V5ZWRDb250ZXh0LmpzIiwgIi4uL25vZGVfbW9kdWxlcy8ucG5wbS9AY29ydnUrdXRpbHNAMC4yLjBfc29saWQtanNAMS44LjE3L25vZGVfbW9kdWxlcy9AY29ydnUvdXRpbHMvZGlzdC9jaHVuay8yTkJRUFZJRy5qcyIsICIuLi9ub2RlX21vZHVsZXMvLnBucG0vQGNvcnZ1K3V0aWxzQDAuMi4wX3NvbGlkLWpzQDEuOC4xNy9ub2RlX21vZHVsZXMvQGNvcnZ1L3V0aWxzL2Rpc3QvY29tcG9uZW50cy9GbG9hdGluZ0Fycm93LmpzIiwgIi4uL25vZGVfbW9kdWxlcy8ucG5wbS9AY29ydnUrdXRpbHNAMC4yLjBfc29saWQtanNAMS44LjE3L25vZGVfbW9kdWxlcy9AY29ydnUvdXRpbHMvZGlzdC9jaHVuay82UFlVS1NXUS5qcyIsICIuLi9ub2RlX21vZHVsZXMvLnBucG0vQGNvcnZ1K3V0aWxzQDAuMi4wX3NvbGlkLWpzQDEuOC4xNy9ub2RlX21vZHVsZXMvQGNvcnZ1L3V0aWxzL2Rpc3QvY2h1bmsvUklSNkpRWUYuanMiLCAiLi4vbm9kZV9tb2R1bGVzLy5wbnBtL0Bjb3J2dSt1dGlsc0AwLjIuMF9zb2xpZC1qc0AxLjguMTcvbm9kZV9tb2R1bGVzL0Bjb3J2dS91dGlscy9kaXN0L2NodW5rL1pHQkNDT0tXLmpzIiwgIi4uL25vZGVfbW9kdWxlcy8ucG5wbS9AY29ydnUrdXRpbHNAMC4yLjBfc29saWQtanNAMS44LjE3L25vZGVfbW9kdWxlcy9AY29ydnUvdXRpbHMvZGlzdC9jaHVuay9LNkVQTFdVMy5qcyIsICIuLi9ub2RlX21vZHVsZXMvLnBucG0vQGNvcnZ1K3V0aWxzQDAuMi4wX3NvbGlkLWpzQDEuOC4xNy9ub2RlX21vZHVsZXMvQGNvcnZ1L3V0aWxzL2Rpc3QvY2h1bmsvNUczWkRTVTMuanMiLCAiLi4vbm9kZV9tb2R1bGVzLy5wbnBtL0Bjb3J2dSt1dGlsc0AwLjIuMF9zb2xpZC1qc0AxLjguMTcvbm9kZV9tb2R1bGVzL0Bjb3J2dS91dGlscy9kaXN0L2NvbXBvbmVudHMvRGlzbWlzc2libGUuanMiLCAiLi4vbm9kZV9tb2R1bGVzLy5wbnBtL0Bjb3J2dSt1dGlsc0AwLjIuMF9zb2xpZC1qc0AxLjguMTcvbm9kZV9tb2R1bGVzL0Bjb3J2dS91dGlscy9kaXN0L2NodW5rL1VYVEhPQ0NVLmpzIiwgIi4uL25vZGVfbW9kdWxlcy8ucG5wbS9AY29ydnUrdXRpbHNAMC4yLjBfc29saWQtanNAMS44LjE3L25vZGVfbW9kdWxlcy9AY29ydnUvdXRpbHMvZGlzdC9jcmVhdGUvY29udHJvbGxhYmxlU2lnbmFsLmpzIiwgIi4uL25vZGVfbW9kdWxlcy8ucG5wbS9AZmxvYXRpbmctdWkrdXRpbHNAMC4yLjIvbm9kZV9tb2R1bGVzL0BmbG9hdGluZy11aS91dGlscy9kaXN0L2Zsb2F0aW5nLXVpLnV0aWxzLm1qcyIsICIuLi9ub2RlX21vZHVsZXMvLnBucG0vQGZsb2F0aW5nLXVpK2NvcmVAMS42LjEvbm9kZV9tb2R1bGVzL0BmbG9hdGluZy11aS9jb3JlL2Rpc3QvZmxvYXRpbmctdWkuY29yZS5tanMiLCAiLi4vbm9kZV9tb2R1bGVzLy5wbnBtL0BmbG9hdGluZy11aSt1dGlsc0AwLjIuMi9ub2RlX21vZHVsZXMvQGZsb2F0aW5nLXVpL3V0aWxzL2Rpc3QvZmxvYXRpbmctdWkudXRpbHMuZG9tLm1qcyIsICIuLi9ub2RlX21vZHVsZXMvLnBucG0vQGZsb2F0aW5nLXVpK2RvbUAxLjYuNS9ub2RlX21vZHVsZXMvQGZsb2F0aW5nLXVpL2RvbS9kaXN0L2Zsb2F0aW5nLXVpLmRvbS5tanMiLCAiLi4vbm9kZV9tb2R1bGVzLy5wbnBtL0Bjb3J2dSt1dGlsc0AwLjIuMF9zb2xpZC1qc0AxLjguMTcvbm9kZV9tb2R1bGVzL0Bjb3J2dS91dGlscy9kaXN0L2NyZWF0ZS9mbG9hdGluZy5qcyIsICIuLi9ub2RlX21vZHVsZXMvLnBucG0vQGNvcnZ1K3V0aWxzQDAuMi4wX3NvbGlkLWpzQDEuOC4xNy9ub2RlX21vZHVsZXMvQGNvcnZ1L3V0aWxzL2Rpc3QvY3JlYXRlL29uY2UuanMiLCAiLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3NvbGlkLXByZXNlbmNlQDAuMS42X3NvbGlkLWpzQDEuOC4xNy9ub2RlX21vZHVsZXMvc29saWQtcHJlc2VuY2UvZGlzdC9pbmRleC5qcyIsICIuLi9ub2RlX21vZHVsZXMvLnBucG0vQGNvcnZ1K3V0aWxzQDAuMi4wX3NvbGlkLWpzQDEuOC4xNy9ub2RlX21vZHVsZXMvQGNvcnZ1L3V0aWxzL2Rpc3QvY3JlYXRlL3Rvb2x0aXAuanMiLCAiLi4vbm9kZV9tb2R1bGVzLy5wbnBtL0Bjb3J2dSt0b29sdGlwQDAuMS4wX3NvbGlkLWpzQDEuOC4xNy9ub2RlX21vZHVsZXMvQGNvcnZ1L3Rvb2x0aXAvZGlzdC9pbmRleC5qcyIsICIuLi9ub2RlX21vZHVsZXMvLnBucG0vY29tcG9uZW50LXJlZ2lzdGVyQDAuOC4zL25vZGVfbW9kdWxlcy9jb21wb25lbnQtcmVnaXN0ZXIvZGlzdC9jb21wb25lbnQtcmVnaXN0ZXIuanMiLCAiLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3NvbGlkLWVsZW1lbnRAMS44LjBfc29saWQtanNAMS44LjE3L25vZGVfbW9kdWxlcy9zb2xpZC1lbGVtZW50L2Rpc3QvaW5kZXguanMiLCAiLi4vYXBwLnRzeCJdLAogICJzb3VyY2VzQ29udGVudCI6IFsibGV0IHRhc2tJZENvdW50ZXIgPSAxLFxuICBpc0NhbGxiYWNrU2NoZWR1bGVkID0gZmFsc2UsXG4gIGlzUGVyZm9ybWluZ1dvcmsgPSBmYWxzZSxcbiAgdGFza1F1ZXVlID0gW10sXG4gIGN1cnJlbnRUYXNrID0gbnVsbCxcbiAgc2hvdWxkWWllbGRUb0hvc3QgPSBudWxsLFxuICB5aWVsZEludGVydmFsID0gNSxcbiAgZGVhZGxpbmUgPSAwLFxuICBtYXhZaWVsZEludGVydmFsID0gMzAwLFxuICBzY2hlZHVsZUNhbGxiYWNrID0gbnVsbCxcbiAgc2NoZWR1bGVkQ2FsbGJhY2sgPSBudWxsO1xuY29uc3QgbWF4U2lnbmVkMzFCaXRJbnQgPSAxMDczNzQxODIzO1xuZnVuY3Rpb24gc2V0dXBTY2hlZHVsZXIoKSB7XG4gIGNvbnN0IGNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKSxcbiAgICBwb3J0ID0gY2hhbm5lbC5wb3J0MjtcbiAgc2NoZWR1bGVDYWxsYmFjayA9ICgpID0+IHBvcnQucG9zdE1lc3NhZ2UobnVsbCk7XG4gIGNoYW5uZWwucG9ydDEub25tZXNzYWdlID0gKCkgPT4ge1xuICAgIGlmIChzY2hlZHVsZWRDYWxsYmFjayAhPT0gbnVsbCkge1xuICAgICAgY29uc3QgY3VycmVudFRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICAgIGRlYWRsaW5lID0gY3VycmVudFRpbWUgKyB5aWVsZEludGVydmFsO1xuICAgICAgY29uc3QgaGFzVGltZVJlbWFpbmluZyA9IHRydWU7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBoYXNNb3JlV29yayA9IHNjaGVkdWxlZENhbGxiYWNrKGhhc1RpbWVSZW1haW5pbmcsIGN1cnJlbnRUaW1lKTtcbiAgICAgICAgaWYgKCFoYXNNb3JlV29yaykge1xuICAgICAgICAgIHNjaGVkdWxlZENhbGxiYWNrID0gbnVsbDtcbiAgICAgICAgfSBlbHNlIHBvcnQucG9zdE1lc3NhZ2UobnVsbCk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBwb3J0LnBvc3RNZXNzYWdlKG51bGwpO1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH1cbiAgICB9XG4gIH07XG4gIGlmIChuYXZpZ2F0b3IgJiYgbmF2aWdhdG9yLnNjaGVkdWxpbmcgJiYgbmF2aWdhdG9yLnNjaGVkdWxpbmcuaXNJbnB1dFBlbmRpbmcpIHtcbiAgICBjb25zdCBzY2hlZHVsaW5nID0gbmF2aWdhdG9yLnNjaGVkdWxpbmc7XG4gICAgc2hvdWxkWWllbGRUb0hvc3QgPSAoKSA9PiB7XG4gICAgICBjb25zdCBjdXJyZW50VGltZSA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgICAgaWYgKGN1cnJlbnRUaW1lID49IGRlYWRsaW5lKSB7XG4gICAgICAgIGlmIChzY2hlZHVsaW5nLmlzSW5wdXRQZW5kaW5nKCkpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY3VycmVudFRpbWUgPj0gbWF4WWllbGRJbnRlcnZhbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHNob3VsZFlpZWxkVG9Ib3N0ID0gKCkgPT4gcGVyZm9ybWFuY2Uubm93KCkgPj0gZGVhZGxpbmU7XG4gIH1cbn1cbmZ1bmN0aW9uIGVucXVldWUodGFza1F1ZXVlLCB0YXNrKSB7XG4gIGZ1bmN0aW9uIGZpbmRJbmRleCgpIHtcbiAgICBsZXQgbSA9IDA7XG4gICAgbGV0IG4gPSB0YXNrUXVldWUubGVuZ3RoIC0gMTtcbiAgICB3aGlsZSAobSA8PSBuKSB7XG4gICAgICBjb25zdCBrID0gKG4gKyBtKSA+PiAxO1xuICAgICAgY29uc3QgY21wID0gdGFzay5leHBpcmF0aW9uVGltZSAtIHRhc2tRdWV1ZVtrXS5leHBpcmF0aW9uVGltZTtcbiAgICAgIGlmIChjbXAgPiAwKSBtID0gayArIDE7XG4gICAgICBlbHNlIGlmIChjbXAgPCAwKSBuID0gayAtIDE7XG4gICAgICBlbHNlIHJldHVybiBrO1xuICAgIH1cbiAgICByZXR1cm4gbTtcbiAgfVxuICB0YXNrUXVldWUuc3BsaWNlKGZpbmRJbmRleCgpLCAwLCB0YXNrKTtcbn1cbmZ1bmN0aW9uIHJlcXVlc3RDYWxsYmFjayhmbiwgb3B0aW9ucykge1xuICBpZiAoIXNjaGVkdWxlQ2FsbGJhY2spIHNldHVwU2NoZWR1bGVyKCk7XG4gIGxldCBzdGFydFRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKSxcbiAgICB0aW1lb3V0ID0gbWF4U2lnbmVkMzFCaXRJbnQ7XG4gIGlmIChvcHRpb25zICYmIG9wdGlvbnMudGltZW91dCkgdGltZW91dCA9IG9wdGlvbnMudGltZW91dDtcbiAgY29uc3QgbmV3VGFzayA9IHtcbiAgICBpZDogdGFza0lkQ291bnRlcisrLFxuICAgIGZuLFxuICAgIHN0YXJ0VGltZSxcbiAgICBleHBpcmF0aW9uVGltZTogc3RhcnRUaW1lICsgdGltZW91dFxuICB9O1xuICBlbnF1ZXVlKHRhc2tRdWV1ZSwgbmV3VGFzayk7XG4gIGlmICghaXNDYWxsYmFja1NjaGVkdWxlZCAmJiAhaXNQZXJmb3JtaW5nV29yaykge1xuICAgIGlzQ2FsbGJhY2tTY2hlZHVsZWQgPSB0cnVlO1xuICAgIHNjaGVkdWxlZENhbGxiYWNrID0gZmx1c2hXb3JrO1xuICAgIHNjaGVkdWxlQ2FsbGJhY2soKTtcbiAgfVxuICByZXR1cm4gbmV3VGFzaztcbn1cbmZ1bmN0aW9uIGNhbmNlbENhbGxiYWNrKHRhc2spIHtcbiAgdGFzay5mbiA9IG51bGw7XG59XG5mdW5jdGlvbiBmbHVzaFdvcmsoaGFzVGltZVJlbWFpbmluZywgaW5pdGlhbFRpbWUpIHtcbiAgaXNDYWxsYmFja1NjaGVkdWxlZCA9IGZhbHNlO1xuICBpc1BlcmZvcm1pbmdXb3JrID0gdHJ1ZTtcbiAgdHJ5IHtcbiAgICByZXR1cm4gd29ya0xvb3AoaGFzVGltZVJlbWFpbmluZywgaW5pdGlhbFRpbWUpO1xuICB9IGZpbmFsbHkge1xuICAgIGN1cnJlbnRUYXNrID0gbnVsbDtcbiAgICBpc1BlcmZvcm1pbmdXb3JrID0gZmFsc2U7XG4gIH1cbn1cbmZ1bmN0aW9uIHdvcmtMb29wKGhhc1RpbWVSZW1haW5pbmcsIGluaXRpYWxUaW1lKSB7XG4gIGxldCBjdXJyZW50VGltZSA9IGluaXRpYWxUaW1lO1xuICBjdXJyZW50VGFzayA9IHRhc2tRdWV1ZVswXSB8fCBudWxsO1xuICB3aGlsZSAoY3VycmVudFRhc2sgIT09IG51bGwpIHtcbiAgICBpZiAoY3VycmVudFRhc2suZXhwaXJhdGlvblRpbWUgPiBjdXJyZW50VGltZSAmJiAoIWhhc1RpbWVSZW1haW5pbmcgfHwgc2hvdWxkWWllbGRUb0hvc3QoKSkpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBjb25zdCBjYWxsYmFjayA9IGN1cnJlbnRUYXNrLmZuO1xuICAgIGlmIChjYWxsYmFjayAhPT0gbnVsbCkge1xuICAgICAgY3VycmVudFRhc2suZm4gPSBudWxsO1xuICAgICAgY29uc3QgZGlkVXNlckNhbGxiYWNrVGltZW91dCA9IGN1cnJlbnRUYXNrLmV4cGlyYXRpb25UaW1lIDw9IGN1cnJlbnRUaW1lO1xuICAgICAgY2FsbGJhY2soZGlkVXNlckNhbGxiYWNrVGltZW91dCk7XG4gICAgICBjdXJyZW50VGltZSA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgICAgaWYgKGN1cnJlbnRUYXNrID09PSB0YXNrUXVldWVbMF0pIHtcbiAgICAgICAgdGFza1F1ZXVlLnNoaWZ0KCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHRhc2tRdWV1ZS5zaGlmdCgpO1xuICAgIGN1cnJlbnRUYXNrID0gdGFza1F1ZXVlWzBdIHx8IG51bGw7XG4gIH1cbiAgcmV0dXJuIGN1cnJlbnRUYXNrICE9PSBudWxsO1xufVxuXG5jb25zdCBzaGFyZWRDb25maWcgPSB7XG4gIGNvbnRleHQ6IHVuZGVmaW5lZCxcbiAgcmVnaXN0cnk6IHVuZGVmaW5lZFxufTtcbmZ1bmN0aW9uIHNldEh5ZHJhdGVDb250ZXh0KGNvbnRleHQpIHtcbiAgc2hhcmVkQ29uZmlnLmNvbnRleHQgPSBjb250ZXh0O1xufVxuZnVuY3Rpb24gbmV4dEh5ZHJhdGVDb250ZXh0KCkge1xuICByZXR1cm4ge1xuICAgIC4uLnNoYXJlZENvbmZpZy5jb250ZXh0LFxuICAgIGlkOiBgJHtzaGFyZWRDb25maWcuY29udGV4dC5pZH0ke3NoYXJlZENvbmZpZy5jb250ZXh0LmNvdW50Kyt9LWAsXG4gICAgY291bnQ6IDBcbiAgfTtcbn1cblxuY29uc3QgZXF1YWxGbiA9IChhLCBiKSA9PiBhID09PSBiO1xuY29uc3QgJFBST1hZID0gU3ltYm9sKFwic29saWQtcHJveHlcIik7XG5jb25zdCAkVFJBQ0sgPSBTeW1ib2woXCJzb2xpZC10cmFja1wiKTtcbmNvbnN0ICRERVZDT01QID0gU3ltYm9sKFwic29saWQtZGV2LWNvbXBvbmVudFwiKTtcbmNvbnN0IHNpZ25hbE9wdGlvbnMgPSB7XG4gIGVxdWFsczogZXF1YWxGblxufTtcbmxldCBFUlJPUiA9IG51bGw7XG5sZXQgcnVuRWZmZWN0cyA9IHJ1blF1ZXVlO1xuY29uc3QgU1RBTEUgPSAxO1xuY29uc3QgUEVORElORyA9IDI7XG5jb25zdCBVTk9XTkVEID0ge1xuICBvd25lZDogbnVsbCxcbiAgY2xlYW51cHM6IG51bGwsXG4gIGNvbnRleHQ6IG51bGwsXG4gIG93bmVyOiBudWxsXG59O1xuY29uc3QgTk9fSU5JVCA9IHt9O1xudmFyIE93bmVyID0gbnVsbDtcbmxldCBUcmFuc2l0aW9uID0gbnVsbDtcbmxldCBTY2hlZHVsZXIgPSBudWxsO1xubGV0IEV4dGVybmFsU291cmNlQ29uZmlnID0gbnVsbDtcbmxldCBMaXN0ZW5lciA9IG51bGw7XG5sZXQgVXBkYXRlcyA9IG51bGw7XG5sZXQgRWZmZWN0cyA9IG51bGw7XG5sZXQgRXhlY0NvdW50ID0gMDtcbmZ1bmN0aW9uIGNyZWF0ZVJvb3QoZm4sIGRldGFjaGVkT3duZXIpIHtcbiAgY29uc3QgbGlzdGVuZXIgPSBMaXN0ZW5lcixcbiAgICBvd25lciA9IE93bmVyLFxuICAgIHVub3duZWQgPSBmbi5sZW5ndGggPT09IDAsXG4gICAgY3VycmVudCA9IGRldGFjaGVkT3duZXIgPT09IHVuZGVmaW5lZCA/IG93bmVyIDogZGV0YWNoZWRPd25lcixcbiAgICByb290ID0gdW5vd25lZFxuICAgICAgPyBVTk9XTkVEXG4gICAgICA6IHtcbiAgICAgICAgICBvd25lZDogbnVsbCxcbiAgICAgICAgICBjbGVhbnVwczogbnVsbCxcbiAgICAgICAgICBjb250ZXh0OiBjdXJyZW50ID8gY3VycmVudC5jb250ZXh0IDogbnVsbCxcbiAgICAgICAgICBvd25lcjogY3VycmVudFxuICAgICAgICB9LFxuICAgIHVwZGF0ZUZuID0gdW5vd25lZCA/IGZuIDogKCkgPT4gZm4oKCkgPT4gdW50cmFjaygoKSA9PiBjbGVhbk5vZGUocm9vdCkpKTtcbiAgT3duZXIgPSByb290O1xuICBMaXN0ZW5lciA9IG51bGw7XG4gIHRyeSB7XG4gICAgcmV0dXJuIHJ1blVwZGF0ZXModXBkYXRlRm4sIHRydWUpO1xuICB9IGZpbmFsbHkge1xuICAgIExpc3RlbmVyID0gbGlzdGVuZXI7XG4gICAgT3duZXIgPSBvd25lcjtcbiAgfVxufVxuZnVuY3Rpb24gY3JlYXRlU2lnbmFsKHZhbHVlLCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zID8gT2JqZWN0LmFzc2lnbih7fSwgc2lnbmFsT3B0aW9ucywgb3B0aW9ucykgOiBzaWduYWxPcHRpb25zO1xuICBjb25zdCBzID0ge1xuICAgIHZhbHVlLFxuICAgIG9ic2VydmVyczogbnVsbCxcbiAgICBvYnNlcnZlclNsb3RzOiBudWxsLFxuICAgIGNvbXBhcmF0b3I6IG9wdGlvbnMuZXF1YWxzIHx8IHVuZGVmaW5lZFxuICB9O1xuICBjb25zdCBzZXR0ZXIgPSB2YWx1ZSA9PiB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBpZiAoVHJhbnNpdGlvbiAmJiBUcmFuc2l0aW9uLnJ1bm5pbmcgJiYgVHJhbnNpdGlvbi5zb3VyY2VzLmhhcyhzKSkgdmFsdWUgPSB2YWx1ZShzLnRWYWx1ZSk7XG4gICAgICBlbHNlIHZhbHVlID0gdmFsdWUocy52YWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiB3cml0ZVNpZ25hbChzLCB2YWx1ZSk7XG4gIH07XG4gIHJldHVybiBbcmVhZFNpZ25hbC5iaW5kKHMpLCBzZXR0ZXJdO1xufVxuZnVuY3Rpb24gY3JlYXRlQ29tcHV0ZWQoZm4sIHZhbHVlLCBvcHRpb25zKSB7XG4gIGNvbnN0IGMgPSBjcmVhdGVDb21wdXRhdGlvbihmbiwgdmFsdWUsIHRydWUsIFNUQUxFKTtcbiAgaWYgKFNjaGVkdWxlciAmJiBUcmFuc2l0aW9uICYmIFRyYW5zaXRpb24ucnVubmluZykgVXBkYXRlcy5wdXNoKGMpO1xuICBlbHNlIHVwZGF0ZUNvbXB1dGF0aW9uKGMpO1xufVxuZnVuY3Rpb24gY3JlYXRlUmVuZGVyRWZmZWN0KGZuLCB2YWx1ZSwgb3B0aW9ucykge1xuICBjb25zdCBjID0gY3JlYXRlQ29tcHV0YXRpb24oZm4sIHZhbHVlLCBmYWxzZSwgU1RBTEUpO1xuICBpZiAoU2NoZWR1bGVyICYmIFRyYW5zaXRpb24gJiYgVHJhbnNpdGlvbi5ydW5uaW5nKSBVcGRhdGVzLnB1c2goYyk7XG4gIGVsc2UgdXBkYXRlQ29tcHV0YXRpb24oYyk7XG59XG5mdW5jdGlvbiBjcmVhdGVFZmZlY3QoZm4sIHZhbHVlLCBvcHRpb25zKSB7XG4gIHJ1bkVmZmVjdHMgPSBydW5Vc2VyRWZmZWN0cztcbiAgY29uc3QgYyA9IGNyZWF0ZUNvbXB1dGF0aW9uKGZuLCB2YWx1ZSwgZmFsc2UsIFNUQUxFKSxcbiAgICBzID0gU3VzcGVuc2VDb250ZXh0ICYmIHVzZUNvbnRleHQoU3VzcGVuc2VDb250ZXh0KTtcbiAgaWYgKHMpIGMuc3VzcGVuc2UgPSBzO1xuICBpZiAoIW9wdGlvbnMgfHwgIW9wdGlvbnMucmVuZGVyKSBjLnVzZXIgPSB0cnVlO1xuICBFZmZlY3RzID8gRWZmZWN0cy5wdXNoKGMpIDogdXBkYXRlQ29tcHV0YXRpb24oYyk7XG59XG5mdW5jdGlvbiBjcmVhdGVSZWFjdGlvbihvbkludmFsaWRhdGUsIG9wdGlvbnMpIHtcbiAgbGV0IGZuO1xuICBjb25zdCBjID0gY3JlYXRlQ29tcHV0YXRpb24oXG4gICAgICAoKSA9PiB7XG4gICAgICAgIGZuID8gZm4oKSA6IHVudHJhY2sob25JbnZhbGlkYXRlKTtcbiAgICAgICAgZm4gPSB1bmRlZmluZWQ7XG4gICAgICB9LFxuICAgICAgdW5kZWZpbmVkLFxuICAgICAgZmFsc2UsXG4gICAgICAwXG4gICAgKSxcbiAgICBzID0gU3VzcGVuc2VDb250ZXh0ICYmIHVzZUNvbnRleHQoU3VzcGVuc2VDb250ZXh0KTtcbiAgaWYgKHMpIGMuc3VzcGVuc2UgPSBzO1xuICBjLnVzZXIgPSB0cnVlO1xuICByZXR1cm4gdHJhY2tpbmcgPT4ge1xuICAgIGZuID0gdHJhY2tpbmc7XG4gICAgdXBkYXRlQ29tcHV0YXRpb24oYyk7XG4gIH07XG59XG5mdW5jdGlvbiBjcmVhdGVNZW1vKGZuLCB2YWx1ZSwgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyA/IE9iamVjdC5hc3NpZ24oe30sIHNpZ25hbE9wdGlvbnMsIG9wdGlvbnMpIDogc2lnbmFsT3B0aW9ucztcbiAgY29uc3QgYyA9IGNyZWF0ZUNvbXB1dGF0aW9uKGZuLCB2YWx1ZSwgdHJ1ZSwgMCk7XG4gIGMub2JzZXJ2ZXJzID0gbnVsbDtcbiAgYy5vYnNlcnZlclNsb3RzID0gbnVsbDtcbiAgYy5jb21wYXJhdG9yID0gb3B0aW9ucy5lcXVhbHMgfHwgdW5kZWZpbmVkO1xuICBpZiAoU2NoZWR1bGVyICYmIFRyYW5zaXRpb24gJiYgVHJhbnNpdGlvbi5ydW5uaW5nKSB7XG4gICAgYy50U3RhdGUgPSBTVEFMRTtcbiAgICBVcGRhdGVzLnB1c2goYyk7XG4gIH0gZWxzZSB1cGRhdGVDb21wdXRhdGlvbihjKTtcbiAgcmV0dXJuIHJlYWRTaWduYWwuYmluZChjKTtcbn1cbmZ1bmN0aW9uIGlzUHJvbWlzZSh2KSB7XG4gIHJldHVybiB2ICYmIHR5cGVvZiB2ID09PSBcIm9iamVjdFwiICYmIFwidGhlblwiIGluIHY7XG59XG5mdW5jdGlvbiBjcmVhdGVSZXNvdXJjZShwU291cmNlLCBwRmV0Y2hlciwgcE9wdGlvbnMpIHtcbiAgbGV0IHNvdXJjZTtcbiAgbGV0IGZldGNoZXI7XG4gIGxldCBvcHRpb25zO1xuICBpZiAoKGFyZ3VtZW50cy5sZW5ndGggPT09IDIgJiYgdHlwZW9mIHBGZXRjaGVyID09PSBcIm9iamVjdFwiKSB8fCBhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgc291cmNlID0gdHJ1ZTtcbiAgICBmZXRjaGVyID0gcFNvdXJjZTtcbiAgICBvcHRpb25zID0gcEZldGNoZXIgfHwge307XG4gIH0gZWxzZSB7XG4gICAgc291cmNlID0gcFNvdXJjZTtcbiAgICBmZXRjaGVyID0gcEZldGNoZXI7XG4gICAgb3B0aW9ucyA9IHBPcHRpb25zIHx8IHt9O1xuICB9XG4gIGxldCBwciA9IG51bGwsXG4gICAgaW5pdFAgPSBOT19JTklULFxuICAgIGlkID0gbnVsbCxcbiAgICBsb2FkZWRVbmRlclRyYW5zaXRpb24gPSBmYWxzZSxcbiAgICBzY2hlZHVsZWQgPSBmYWxzZSxcbiAgICByZXNvbHZlZCA9IFwiaW5pdGlhbFZhbHVlXCIgaW4gb3B0aW9ucyxcbiAgICBkeW5hbWljID0gdHlwZW9mIHNvdXJjZSA9PT0gXCJmdW5jdGlvblwiICYmIGNyZWF0ZU1lbW8oc291cmNlKTtcbiAgY29uc3QgY29udGV4dHMgPSBuZXcgU2V0KCksXG4gICAgW3ZhbHVlLCBzZXRWYWx1ZV0gPSAob3B0aW9ucy5zdG9yYWdlIHx8IGNyZWF0ZVNpZ25hbCkob3B0aW9ucy5pbml0aWFsVmFsdWUpLFxuICAgIFtlcnJvciwgc2V0RXJyb3JdID0gY3JlYXRlU2lnbmFsKHVuZGVmaW5lZCksXG4gICAgW3RyYWNrLCB0cmlnZ2VyXSA9IGNyZWF0ZVNpZ25hbCh1bmRlZmluZWQsIHtcbiAgICAgIGVxdWFsczogZmFsc2VcbiAgICB9KSxcbiAgICBbc3RhdGUsIHNldFN0YXRlXSA9IGNyZWF0ZVNpZ25hbChyZXNvbHZlZCA/IFwicmVhZHlcIiA6IFwidW5yZXNvbHZlZFwiKTtcbiAgaWYgKHNoYXJlZENvbmZpZy5jb250ZXh0KSB7XG4gICAgaWQgPSBgJHtzaGFyZWRDb25maWcuY29udGV4dC5pZH0ke3NoYXJlZENvbmZpZy5jb250ZXh0LmNvdW50Kyt9YDtcbiAgICBsZXQgdjtcbiAgICBpZiAob3B0aW9ucy5zc3JMb2FkRnJvbSA9PT0gXCJpbml0aWFsXCIpIGluaXRQID0gb3B0aW9ucy5pbml0aWFsVmFsdWU7XG4gICAgZWxzZSBpZiAoc2hhcmVkQ29uZmlnLmxvYWQgJiYgKHYgPSBzaGFyZWRDb25maWcubG9hZChpZCkpKSBpbml0UCA9IHY7XG4gIH1cbiAgZnVuY3Rpb24gbG9hZEVuZChwLCB2LCBlcnJvciwga2V5KSB7XG4gICAgaWYgKHByID09PSBwKSB7XG4gICAgICBwciA9IG51bGw7XG4gICAgICBrZXkgIT09IHVuZGVmaW5lZCAmJiAocmVzb2x2ZWQgPSB0cnVlKTtcbiAgICAgIGlmICgocCA9PT0gaW5pdFAgfHwgdiA9PT0gaW5pdFApICYmIG9wdGlvbnMub25IeWRyYXRlZClcbiAgICAgICAgcXVldWVNaWNyb3Rhc2soKCkgPT5cbiAgICAgICAgICBvcHRpb25zLm9uSHlkcmF0ZWQoa2V5LCB7XG4gICAgICAgICAgICB2YWx1ZTogdlxuICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgICBpbml0UCA9IE5PX0lOSVQ7XG4gICAgICBpZiAoVHJhbnNpdGlvbiAmJiBwICYmIGxvYWRlZFVuZGVyVHJhbnNpdGlvbikge1xuICAgICAgICBUcmFuc2l0aW9uLnByb21pc2VzLmRlbGV0ZShwKTtcbiAgICAgICAgbG9hZGVkVW5kZXJUcmFuc2l0aW9uID0gZmFsc2U7XG4gICAgICAgIHJ1blVwZGF0ZXMoKCkgPT4ge1xuICAgICAgICAgIFRyYW5zaXRpb24ucnVubmluZyA9IHRydWU7XG4gICAgICAgICAgY29tcGxldGVMb2FkKHYsIGVycm9yKTtcbiAgICAgICAgfSwgZmFsc2UpO1xuICAgICAgfSBlbHNlIGNvbXBsZXRlTG9hZCh2LCBlcnJvcik7XG4gICAgfVxuICAgIHJldHVybiB2O1xuICB9XG4gIGZ1bmN0aW9uIGNvbXBsZXRlTG9hZCh2LCBlcnIpIHtcbiAgICBydW5VcGRhdGVzKCgpID0+IHtcbiAgICAgIGlmIChlcnIgPT09IHVuZGVmaW5lZCkgc2V0VmFsdWUoKCkgPT4gdik7XG4gICAgICBzZXRTdGF0ZShlcnIgIT09IHVuZGVmaW5lZCA/IFwiZXJyb3JlZFwiIDogcmVzb2x2ZWQgPyBcInJlYWR5XCIgOiBcInVucmVzb2x2ZWRcIik7XG4gICAgICBzZXRFcnJvcihlcnIpO1xuICAgICAgZm9yIChjb25zdCBjIG9mIGNvbnRleHRzLmtleXMoKSkgYy5kZWNyZW1lbnQoKTtcbiAgICAgIGNvbnRleHRzLmNsZWFyKCk7XG4gICAgfSwgZmFsc2UpO1xuICB9XG4gIGZ1bmN0aW9uIHJlYWQoKSB7XG4gICAgY29uc3QgYyA9IFN1c3BlbnNlQ29udGV4dCAmJiB1c2VDb250ZXh0KFN1c3BlbnNlQ29udGV4dCksXG4gICAgICB2ID0gdmFsdWUoKSxcbiAgICAgIGVyciA9IGVycm9yKCk7XG4gICAgaWYgKGVyciAhPT0gdW5kZWZpbmVkICYmICFwcikgdGhyb3cgZXJyO1xuICAgIGlmIChMaXN0ZW5lciAmJiAhTGlzdGVuZXIudXNlciAmJiBjKSB7XG4gICAgICBjcmVhdGVDb21wdXRlZCgoKSA9PiB7XG4gICAgICAgIHRyYWNrKCk7XG4gICAgICAgIGlmIChwcikge1xuICAgICAgICAgIGlmIChjLnJlc29sdmVkICYmIFRyYW5zaXRpb24gJiYgbG9hZGVkVW5kZXJUcmFuc2l0aW9uKSBUcmFuc2l0aW9uLnByb21pc2VzLmFkZChwcik7XG4gICAgICAgICAgZWxzZSBpZiAoIWNvbnRleHRzLmhhcyhjKSkge1xuICAgICAgICAgICAgYy5pbmNyZW1lbnQoKTtcbiAgICAgICAgICAgIGNvbnRleHRzLmFkZChjKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gdjtcbiAgfVxuICBmdW5jdGlvbiBsb2FkKHJlZmV0Y2hpbmcgPSB0cnVlKSB7XG4gICAgaWYgKHJlZmV0Y2hpbmcgIT09IGZhbHNlICYmIHNjaGVkdWxlZCkgcmV0dXJuO1xuICAgIHNjaGVkdWxlZCA9IGZhbHNlO1xuICAgIGNvbnN0IGxvb2t1cCA9IGR5bmFtaWMgPyBkeW5hbWljKCkgOiBzb3VyY2U7XG4gICAgbG9hZGVkVW5kZXJUcmFuc2l0aW9uID0gVHJhbnNpdGlvbiAmJiBUcmFuc2l0aW9uLnJ1bm5pbmc7XG4gICAgaWYgKGxvb2t1cCA9PSBudWxsIHx8IGxvb2t1cCA9PT0gZmFsc2UpIHtcbiAgICAgIGxvYWRFbmQocHIsIHVudHJhY2sodmFsdWUpKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKFRyYW5zaXRpb24gJiYgcHIpIFRyYW5zaXRpb24ucHJvbWlzZXMuZGVsZXRlKHByKTtcbiAgICBjb25zdCBwID1cbiAgICAgIGluaXRQICE9PSBOT19JTklUXG4gICAgICAgID8gaW5pdFBcbiAgICAgICAgOiB1bnRyYWNrKCgpID0+XG4gICAgICAgICAgICBmZXRjaGVyKGxvb2t1cCwge1xuICAgICAgICAgICAgICB2YWx1ZTogdmFsdWUoKSxcbiAgICAgICAgICAgICAgcmVmZXRjaGluZ1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICApO1xuICAgIGlmICghaXNQcm9taXNlKHApKSB7XG4gICAgICBsb2FkRW5kKHByLCBwLCB1bmRlZmluZWQsIGxvb2t1cCk7XG4gICAgICByZXR1cm4gcDtcbiAgICB9XG4gICAgcHIgPSBwO1xuICAgIGlmIChcInZhbHVlXCIgaW4gcCkge1xuICAgICAgaWYgKHAuc3RhdHVzID09PSBcInN1Y2Nlc3NcIikgbG9hZEVuZChwciwgcC52YWx1ZSwgdW5kZWZpbmVkLCBsb29rdXApO1xuICAgICAgZWxzZSBsb2FkRW5kKHByLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgbG9va3VwKTtcbiAgICAgIHJldHVybiBwO1xuICAgIH1cbiAgICBzY2hlZHVsZWQgPSB0cnVlO1xuICAgIHF1ZXVlTWljcm90YXNrKCgpID0+IChzY2hlZHVsZWQgPSBmYWxzZSkpO1xuICAgIHJ1blVwZGF0ZXMoKCkgPT4ge1xuICAgICAgc2V0U3RhdGUocmVzb2x2ZWQgPyBcInJlZnJlc2hpbmdcIiA6IFwicGVuZGluZ1wiKTtcbiAgICAgIHRyaWdnZXIoKTtcbiAgICB9LCBmYWxzZSk7XG4gICAgcmV0dXJuIHAudGhlbihcbiAgICAgIHYgPT4gbG9hZEVuZChwLCB2LCB1bmRlZmluZWQsIGxvb2t1cCksXG4gICAgICBlID0+IGxvYWRFbmQocCwgdW5kZWZpbmVkLCBjYXN0RXJyb3IoZSksIGxvb2t1cClcbiAgICApO1xuICB9XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHJlYWQsIHtcbiAgICBzdGF0ZToge1xuICAgICAgZ2V0OiAoKSA9PiBzdGF0ZSgpXG4gICAgfSxcbiAgICBlcnJvcjoge1xuICAgICAgZ2V0OiAoKSA9PiBlcnJvcigpXG4gICAgfSxcbiAgICBsb2FkaW5nOiB7XG4gICAgICBnZXQoKSB7XG4gICAgICAgIGNvbnN0IHMgPSBzdGF0ZSgpO1xuICAgICAgICByZXR1cm4gcyA9PT0gXCJwZW5kaW5nXCIgfHwgcyA9PT0gXCJyZWZyZXNoaW5nXCI7XG4gICAgICB9XG4gICAgfSxcbiAgICBsYXRlc3Q6IHtcbiAgICAgIGdldCgpIHtcbiAgICAgICAgaWYgKCFyZXNvbHZlZCkgcmV0dXJuIHJlYWQoKTtcbiAgICAgICAgY29uc3QgZXJyID0gZXJyb3IoKTtcbiAgICAgICAgaWYgKGVyciAmJiAhcHIpIHRocm93IGVycjtcbiAgICAgICAgcmV0dXJuIHZhbHVlKCk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbiAgaWYgKGR5bmFtaWMpIGNyZWF0ZUNvbXB1dGVkKCgpID0+IGxvYWQoZmFsc2UpKTtcbiAgZWxzZSBsb2FkKGZhbHNlKTtcbiAgcmV0dXJuIFtcbiAgICByZWFkLFxuICAgIHtcbiAgICAgIHJlZmV0Y2g6IGxvYWQsXG4gICAgICBtdXRhdGU6IHNldFZhbHVlXG4gICAgfVxuICBdO1xufVxuZnVuY3Rpb24gY3JlYXRlRGVmZXJyZWQoc291cmNlLCBvcHRpb25zKSB7XG4gIGxldCB0LFxuICAgIHRpbWVvdXQgPSBvcHRpb25zID8gb3B0aW9ucy50aW1lb3V0TXMgOiB1bmRlZmluZWQ7XG4gIGNvbnN0IG5vZGUgPSBjcmVhdGVDb21wdXRhdGlvbihcbiAgICAoKSA9PiB7XG4gICAgICBpZiAoIXQgfHwgIXQuZm4pXG4gICAgICAgIHQgPSByZXF1ZXN0Q2FsbGJhY2soXG4gICAgICAgICAgKCkgPT4gc2V0RGVmZXJyZWQoKCkgPT4gbm9kZS52YWx1ZSksXG4gICAgICAgICAgdGltZW91dCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IHtcbiAgICAgICAgICAgICAgICB0aW1lb3V0XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIDogdW5kZWZpbmVkXG4gICAgICAgICk7XG4gICAgICByZXR1cm4gc291cmNlKCk7XG4gICAgfSxcbiAgICB1bmRlZmluZWQsXG4gICAgdHJ1ZVxuICApO1xuICBjb25zdCBbZGVmZXJyZWQsIHNldERlZmVycmVkXSA9IGNyZWF0ZVNpZ25hbChcbiAgICBUcmFuc2l0aW9uICYmIFRyYW5zaXRpb24ucnVubmluZyAmJiBUcmFuc2l0aW9uLnNvdXJjZXMuaGFzKG5vZGUpID8gbm9kZS50VmFsdWUgOiBub2RlLnZhbHVlLFxuICAgIG9wdGlvbnNcbiAgKTtcbiAgdXBkYXRlQ29tcHV0YXRpb24obm9kZSk7XG4gIHNldERlZmVycmVkKCgpID0+XG4gICAgVHJhbnNpdGlvbiAmJiBUcmFuc2l0aW9uLnJ1bm5pbmcgJiYgVHJhbnNpdGlvbi5zb3VyY2VzLmhhcyhub2RlKSA/IG5vZGUudFZhbHVlIDogbm9kZS52YWx1ZVxuICApO1xuICByZXR1cm4gZGVmZXJyZWQ7XG59XG5mdW5jdGlvbiBjcmVhdGVTZWxlY3Rvcihzb3VyY2UsIGZuID0gZXF1YWxGbiwgb3B0aW9ucykge1xuICBjb25zdCBzdWJzID0gbmV3IE1hcCgpO1xuICBjb25zdCBub2RlID0gY3JlYXRlQ29tcHV0YXRpb24oXG4gICAgcCA9PiB7XG4gICAgICBjb25zdCB2ID0gc291cmNlKCk7XG4gICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbF0gb2Ygc3Vicy5lbnRyaWVzKCkpXG4gICAgICAgIGlmIChmbihrZXksIHYpICE9PSBmbihrZXksIHApKSB7XG4gICAgICAgICAgZm9yIChjb25zdCBjIG9mIHZhbC52YWx1ZXMoKSkge1xuICAgICAgICAgICAgYy5zdGF0ZSA9IFNUQUxFO1xuICAgICAgICAgICAgaWYgKGMucHVyZSkgVXBkYXRlcy5wdXNoKGMpO1xuICAgICAgICAgICAgZWxzZSBFZmZlY3RzLnB1c2goYyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICByZXR1cm4gdjtcbiAgICB9LFxuICAgIHVuZGVmaW5lZCxcbiAgICB0cnVlLFxuICAgIFNUQUxFXG4gICk7XG4gIHVwZGF0ZUNvbXB1dGF0aW9uKG5vZGUpO1xuICByZXR1cm4ga2V5ID0+IHtcbiAgICBjb25zdCBsaXN0ZW5lciA9IExpc3RlbmVyO1xuICAgIGlmIChsaXN0ZW5lcikge1xuICAgICAgbGV0IGw7XG4gICAgICBpZiAoKGwgPSBzdWJzLmdldChrZXkpKSkgbC5hZGQobGlzdGVuZXIpO1xuICAgICAgZWxzZSBzdWJzLnNldChrZXksIChsID0gbmV3IFNldChbbGlzdGVuZXJdKSkpO1xuICAgICAgb25DbGVhbnVwKCgpID0+IHtcbiAgICAgICAgbC5kZWxldGUobGlzdGVuZXIpO1xuICAgICAgICAhbC5zaXplICYmIHN1YnMuZGVsZXRlKGtleSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGZuKFxuICAgICAga2V5LFxuICAgICAgVHJhbnNpdGlvbiAmJiBUcmFuc2l0aW9uLnJ1bm5pbmcgJiYgVHJhbnNpdGlvbi5zb3VyY2VzLmhhcyhub2RlKSA/IG5vZGUudFZhbHVlIDogbm9kZS52YWx1ZVxuICAgICk7XG4gIH07XG59XG5mdW5jdGlvbiBiYXRjaChmbikge1xuICByZXR1cm4gcnVuVXBkYXRlcyhmbiwgZmFsc2UpO1xufVxuZnVuY3Rpb24gdW50cmFjayhmbikge1xuICBpZiAoIUV4dGVybmFsU291cmNlQ29uZmlnICYmIExpc3RlbmVyID09PSBudWxsKSByZXR1cm4gZm4oKTtcbiAgY29uc3QgbGlzdGVuZXIgPSBMaXN0ZW5lcjtcbiAgTGlzdGVuZXIgPSBudWxsO1xuICB0cnkge1xuICAgIGlmIChFeHRlcm5hbFNvdXJjZUNvbmZpZykgcmV0dXJuIEV4dGVybmFsU291cmNlQ29uZmlnLnVudHJhY2soZm4pO1xuICAgIHJldHVybiBmbigpO1xuICB9IGZpbmFsbHkge1xuICAgIExpc3RlbmVyID0gbGlzdGVuZXI7XG4gIH1cbn1cbmZ1bmN0aW9uIG9uKGRlcHMsIGZuLCBvcHRpb25zKSB7XG4gIGNvbnN0IGlzQXJyYXkgPSBBcnJheS5pc0FycmF5KGRlcHMpO1xuICBsZXQgcHJldklucHV0O1xuICBsZXQgZGVmZXIgPSBvcHRpb25zICYmIG9wdGlvbnMuZGVmZXI7XG4gIHJldHVybiBwcmV2VmFsdWUgPT4ge1xuICAgIGxldCBpbnB1dDtcbiAgICBpZiAoaXNBcnJheSkge1xuICAgICAgaW5wdXQgPSBBcnJheShkZXBzLmxlbmd0aCk7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRlcHMubGVuZ3RoOyBpKyspIGlucHV0W2ldID0gZGVwc1tpXSgpO1xuICAgIH0gZWxzZSBpbnB1dCA9IGRlcHMoKTtcbiAgICBpZiAoZGVmZXIpIHtcbiAgICAgIGRlZmVyID0gZmFsc2U7XG4gICAgICByZXR1cm4gcHJldlZhbHVlO1xuICAgIH1cbiAgICBjb25zdCByZXN1bHQgPSB1bnRyYWNrKCgpID0+IGZuKGlucHV0LCBwcmV2SW5wdXQsIHByZXZWYWx1ZSkpO1xuICAgIHByZXZJbnB1dCA9IGlucHV0O1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG59XG5mdW5jdGlvbiBvbk1vdW50KGZuKSB7XG4gIGNyZWF0ZUVmZmVjdCgoKSA9PiB1bnRyYWNrKGZuKSk7XG59XG5mdW5jdGlvbiBvbkNsZWFudXAoZm4pIHtcbiAgaWYgKE93bmVyID09PSBudWxsKTtcbiAgZWxzZSBpZiAoT3duZXIuY2xlYW51cHMgPT09IG51bGwpIE93bmVyLmNsZWFudXBzID0gW2ZuXTtcbiAgZWxzZSBPd25lci5jbGVhbnVwcy5wdXNoKGZuKTtcbiAgcmV0dXJuIGZuO1xufVxuZnVuY3Rpb24gY2F0Y2hFcnJvcihmbiwgaGFuZGxlcikge1xuICBFUlJPUiB8fCAoRVJST1IgPSBTeW1ib2woXCJlcnJvclwiKSk7XG4gIE93bmVyID0gY3JlYXRlQ29tcHV0YXRpb24odW5kZWZpbmVkLCB1bmRlZmluZWQsIHRydWUpO1xuICBPd25lci5jb250ZXh0ID0ge1xuICAgIC4uLk93bmVyLmNvbnRleHQsXG4gICAgW0VSUk9SXTogW2hhbmRsZXJdXG4gIH07XG4gIGlmIChUcmFuc2l0aW9uICYmIFRyYW5zaXRpb24ucnVubmluZykgVHJhbnNpdGlvbi5zb3VyY2VzLmFkZChPd25lcik7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGZuKCk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGhhbmRsZUVycm9yKGVycik7XG4gIH0gZmluYWxseSB7XG4gICAgT3duZXIgPSBPd25lci5vd25lcjtcbiAgfVxufVxuZnVuY3Rpb24gZ2V0TGlzdGVuZXIoKSB7XG4gIHJldHVybiBMaXN0ZW5lcjtcbn1cbmZ1bmN0aW9uIGdldE93bmVyKCkge1xuICByZXR1cm4gT3duZXI7XG59XG5mdW5jdGlvbiBydW5XaXRoT3duZXIobywgZm4pIHtcbiAgY29uc3QgcHJldiA9IE93bmVyO1xuICBjb25zdCBwcmV2TGlzdGVuZXIgPSBMaXN0ZW5lcjtcbiAgT3duZXIgPSBvO1xuICBMaXN0ZW5lciA9IG51bGw7XG4gIHRyeSB7XG4gICAgcmV0dXJuIHJ1blVwZGF0ZXMoZm4sIHRydWUpO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBoYW5kbGVFcnJvcihlcnIpO1xuICB9IGZpbmFsbHkge1xuICAgIE93bmVyID0gcHJldjtcbiAgICBMaXN0ZW5lciA9IHByZXZMaXN0ZW5lcjtcbiAgfVxufVxuZnVuY3Rpb24gZW5hYmxlU2NoZWR1bGluZyhzY2hlZHVsZXIgPSByZXF1ZXN0Q2FsbGJhY2spIHtcbiAgU2NoZWR1bGVyID0gc2NoZWR1bGVyO1xufVxuZnVuY3Rpb24gc3RhcnRUcmFuc2l0aW9uKGZuKSB7XG4gIGlmIChUcmFuc2l0aW9uICYmIFRyYW5zaXRpb24ucnVubmluZykge1xuICAgIGZuKCk7XG4gICAgcmV0dXJuIFRyYW5zaXRpb24uZG9uZTtcbiAgfVxuICBjb25zdCBsID0gTGlzdGVuZXI7XG4gIGNvbnN0IG8gPSBPd25lcjtcbiAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oKCkgPT4ge1xuICAgIExpc3RlbmVyID0gbDtcbiAgICBPd25lciA9IG87XG4gICAgbGV0IHQ7XG4gICAgaWYgKFNjaGVkdWxlciB8fCBTdXNwZW5zZUNvbnRleHQpIHtcbiAgICAgIHQgPVxuICAgICAgICBUcmFuc2l0aW9uIHx8XG4gICAgICAgIChUcmFuc2l0aW9uID0ge1xuICAgICAgICAgIHNvdXJjZXM6IG5ldyBTZXQoKSxcbiAgICAgICAgICBlZmZlY3RzOiBbXSxcbiAgICAgICAgICBwcm9taXNlczogbmV3IFNldCgpLFxuICAgICAgICAgIGRpc3Bvc2VkOiBuZXcgU2V0KCksXG4gICAgICAgICAgcXVldWU6IG5ldyBTZXQoKSxcbiAgICAgICAgICBydW5uaW5nOiB0cnVlXG4gICAgICAgIH0pO1xuICAgICAgdC5kb25lIHx8ICh0LmRvbmUgPSBuZXcgUHJvbWlzZShyZXMgPT4gKHQucmVzb2x2ZSA9IHJlcykpKTtcbiAgICAgIHQucnVubmluZyA9IHRydWU7XG4gICAgfVxuICAgIHJ1blVwZGF0ZXMoZm4sIGZhbHNlKTtcbiAgICBMaXN0ZW5lciA9IE93bmVyID0gbnVsbDtcbiAgICByZXR1cm4gdCA/IHQuZG9uZSA6IHVuZGVmaW5lZDtcbiAgfSk7XG59XG5jb25zdCBbdHJhbnNQZW5kaW5nLCBzZXRUcmFuc1BlbmRpbmddID0gLypAX19QVVJFX18qLyBjcmVhdGVTaWduYWwoZmFsc2UpO1xuZnVuY3Rpb24gdXNlVHJhbnNpdGlvbigpIHtcbiAgcmV0dXJuIFt0cmFuc1BlbmRpbmcsIHN0YXJ0VHJhbnNpdGlvbl07XG59XG5mdW5jdGlvbiByZXN1bWVFZmZlY3RzKGUpIHtcbiAgRWZmZWN0cy5wdXNoLmFwcGx5KEVmZmVjdHMsIGUpO1xuICBlLmxlbmd0aCA9IDA7XG59XG5mdW5jdGlvbiBjcmVhdGVDb250ZXh0KGRlZmF1bHRWYWx1ZSwgb3B0aW9ucykge1xuICBjb25zdCBpZCA9IFN5bWJvbChcImNvbnRleHRcIik7XG4gIHJldHVybiB7XG4gICAgaWQsXG4gICAgUHJvdmlkZXI6IGNyZWF0ZVByb3ZpZGVyKGlkKSxcbiAgICBkZWZhdWx0VmFsdWVcbiAgfTtcbn1cbmZ1bmN0aW9uIHVzZUNvbnRleHQoY29udGV4dCkge1xuICByZXR1cm4gT3duZXIgJiYgT3duZXIuY29udGV4dCAmJiBPd25lci5jb250ZXh0W2NvbnRleHQuaWRdICE9PSB1bmRlZmluZWRcbiAgICA/IE93bmVyLmNvbnRleHRbY29udGV4dC5pZF1cbiAgICA6IGNvbnRleHQuZGVmYXVsdFZhbHVlO1xufVxuZnVuY3Rpb24gY2hpbGRyZW4oZm4pIHtcbiAgY29uc3QgY2hpbGRyZW4gPSBjcmVhdGVNZW1vKGZuKTtcbiAgY29uc3QgbWVtbyA9IGNyZWF0ZU1lbW8oKCkgPT4gcmVzb2x2ZUNoaWxkcmVuKGNoaWxkcmVuKCkpKTtcbiAgbWVtby50b0FycmF5ID0gKCkgPT4ge1xuICAgIGNvbnN0IGMgPSBtZW1vKCk7XG4gICAgcmV0dXJuIEFycmF5LmlzQXJyYXkoYykgPyBjIDogYyAhPSBudWxsID8gW2NdIDogW107XG4gIH07XG4gIHJldHVybiBtZW1vO1xufVxubGV0IFN1c3BlbnNlQ29udGV4dDtcbmZ1bmN0aW9uIGdldFN1c3BlbnNlQ29udGV4dCgpIHtcbiAgcmV0dXJuIFN1c3BlbnNlQ29udGV4dCB8fCAoU3VzcGVuc2VDb250ZXh0ID0gY3JlYXRlQ29udGV4dCgpKTtcbn1cbmZ1bmN0aW9uIGVuYWJsZUV4dGVybmFsU291cmNlKGZhY3RvcnksIHVudHJhY2sgPSBmbiA9PiBmbigpKSB7XG4gIGlmIChFeHRlcm5hbFNvdXJjZUNvbmZpZykge1xuICAgIGNvbnN0IHsgZmFjdG9yeTogb2xkRmFjdG9yeSwgdW50cmFjazogb2xkVW50cmFjayB9ID0gRXh0ZXJuYWxTb3VyY2VDb25maWc7XG4gICAgRXh0ZXJuYWxTb3VyY2VDb25maWcgPSB7XG4gICAgICBmYWN0b3J5OiAoZm4sIHRyaWdnZXIpID0+IHtcbiAgICAgICAgY29uc3Qgb2xkU291cmNlID0gb2xkRmFjdG9yeShmbiwgdHJpZ2dlcik7XG4gICAgICAgIGNvbnN0IHNvdXJjZSA9IGZhY3RvcnkoeCA9PiBvbGRTb3VyY2UudHJhY2soeCksIHRyaWdnZXIpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHRyYWNrOiB4ID0+IHNvdXJjZS50cmFjayh4KSxcbiAgICAgICAgICBkaXNwb3NlKCkge1xuICAgICAgICAgICAgc291cmNlLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgIG9sZFNvdXJjZS5kaXNwb3NlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfSxcbiAgICAgIHVudHJhY2s6IGZuID0+IG9sZFVudHJhY2soKCkgPT4gdW50cmFjayhmbikpXG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICBFeHRlcm5hbFNvdXJjZUNvbmZpZyA9IHtcbiAgICAgIGZhY3RvcnksXG4gICAgICB1bnRyYWNrXG4gICAgfTtcbiAgfVxufVxuZnVuY3Rpb24gcmVhZFNpZ25hbCgpIHtcbiAgY29uc3QgcnVubmluZ1RyYW5zaXRpb24gPSBUcmFuc2l0aW9uICYmIFRyYW5zaXRpb24ucnVubmluZztcbiAgaWYgKHRoaXMuc291cmNlcyAmJiAocnVubmluZ1RyYW5zaXRpb24gPyB0aGlzLnRTdGF0ZSA6IHRoaXMuc3RhdGUpKSB7XG4gICAgaWYgKChydW5uaW5nVHJhbnNpdGlvbiA/IHRoaXMudFN0YXRlIDogdGhpcy5zdGF0ZSkgPT09IFNUQUxFKSB1cGRhdGVDb21wdXRhdGlvbih0aGlzKTtcbiAgICBlbHNlIHtcbiAgICAgIGNvbnN0IHVwZGF0ZXMgPSBVcGRhdGVzO1xuICAgICAgVXBkYXRlcyA9IG51bGw7XG4gICAgICBydW5VcGRhdGVzKCgpID0+IGxvb2tVcHN0cmVhbSh0aGlzKSwgZmFsc2UpO1xuICAgICAgVXBkYXRlcyA9IHVwZGF0ZXM7XG4gICAgfVxuICB9XG4gIGlmIChMaXN0ZW5lcikge1xuICAgIGNvbnN0IHNTbG90ID0gdGhpcy5vYnNlcnZlcnMgPyB0aGlzLm9ic2VydmVycy5sZW5ndGggOiAwO1xuICAgIGlmICghTGlzdGVuZXIuc291cmNlcykge1xuICAgICAgTGlzdGVuZXIuc291cmNlcyA9IFt0aGlzXTtcbiAgICAgIExpc3RlbmVyLnNvdXJjZVNsb3RzID0gW3NTbG90XTtcbiAgICB9IGVsc2Uge1xuICAgICAgTGlzdGVuZXIuc291cmNlcy5wdXNoKHRoaXMpO1xuICAgICAgTGlzdGVuZXIuc291cmNlU2xvdHMucHVzaChzU2xvdCk7XG4gICAgfVxuICAgIGlmICghdGhpcy5vYnNlcnZlcnMpIHtcbiAgICAgIHRoaXMub2JzZXJ2ZXJzID0gW0xpc3RlbmVyXTtcbiAgICAgIHRoaXMub2JzZXJ2ZXJTbG90cyA9IFtMaXN0ZW5lci5zb3VyY2VzLmxlbmd0aCAtIDFdO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm9ic2VydmVycy5wdXNoKExpc3RlbmVyKTtcbiAgICAgIHRoaXMub2JzZXJ2ZXJTbG90cy5wdXNoKExpc3RlbmVyLnNvdXJjZXMubGVuZ3RoIC0gMSk7XG4gICAgfVxuICB9XG4gIGlmIChydW5uaW5nVHJhbnNpdGlvbiAmJiBUcmFuc2l0aW9uLnNvdXJjZXMuaGFzKHRoaXMpKSByZXR1cm4gdGhpcy50VmFsdWU7XG4gIHJldHVybiB0aGlzLnZhbHVlO1xufVxuZnVuY3Rpb24gd3JpdGVTaWduYWwobm9kZSwgdmFsdWUsIGlzQ29tcCkge1xuICBsZXQgY3VycmVudCA9XG4gICAgVHJhbnNpdGlvbiAmJiBUcmFuc2l0aW9uLnJ1bm5pbmcgJiYgVHJhbnNpdGlvbi5zb3VyY2VzLmhhcyhub2RlKSA/IG5vZGUudFZhbHVlIDogbm9kZS52YWx1ZTtcbiAgaWYgKCFub2RlLmNvbXBhcmF0b3IgfHwgIW5vZGUuY29tcGFyYXRvcihjdXJyZW50LCB2YWx1ZSkpIHtcbiAgICBpZiAoVHJhbnNpdGlvbikge1xuICAgICAgY29uc3QgVHJhbnNpdGlvblJ1bm5pbmcgPSBUcmFuc2l0aW9uLnJ1bm5pbmc7XG4gICAgICBpZiAoVHJhbnNpdGlvblJ1bm5pbmcgfHwgKCFpc0NvbXAgJiYgVHJhbnNpdGlvbi5zb3VyY2VzLmhhcyhub2RlKSkpIHtcbiAgICAgICAgVHJhbnNpdGlvbi5zb3VyY2VzLmFkZChub2RlKTtcbiAgICAgICAgbm9kZS50VmFsdWUgPSB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIGlmICghVHJhbnNpdGlvblJ1bm5pbmcpIG5vZGUudmFsdWUgPSB2YWx1ZTtcbiAgICB9IGVsc2Ugbm9kZS52YWx1ZSA9IHZhbHVlO1xuICAgIGlmIChub2RlLm9ic2VydmVycyAmJiBub2RlLm9ic2VydmVycy5sZW5ndGgpIHtcbiAgICAgIHJ1blVwZGF0ZXMoKCkgPT4ge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGUub2JzZXJ2ZXJzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgY29uc3QgbyA9IG5vZGUub2JzZXJ2ZXJzW2ldO1xuICAgICAgICAgIGNvbnN0IFRyYW5zaXRpb25SdW5uaW5nID0gVHJhbnNpdGlvbiAmJiBUcmFuc2l0aW9uLnJ1bm5pbmc7XG4gICAgICAgICAgaWYgKFRyYW5zaXRpb25SdW5uaW5nICYmIFRyYW5zaXRpb24uZGlzcG9zZWQuaGFzKG8pKSBjb250aW51ZTtcbiAgICAgICAgICBpZiAoVHJhbnNpdGlvblJ1bm5pbmcgPyAhby50U3RhdGUgOiAhby5zdGF0ZSkge1xuICAgICAgICAgICAgaWYgKG8ucHVyZSkgVXBkYXRlcy5wdXNoKG8pO1xuICAgICAgICAgICAgZWxzZSBFZmZlY3RzLnB1c2gobyk7XG4gICAgICAgICAgICBpZiAoby5vYnNlcnZlcnMpIG1hcmtEb3duc3RyZWFtKG8pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIVRyYW5zaXRpb25SdW5uaW5nKSBvLnN0YXRlID0gU1RBTEU7XG4gICAgICAgICAgZWxzZSBvLnRTdGF0ZSA9IFNUQUxFO1xuICAgICAgICB9XG4gICAgICAgIGlmIChVcGRhdGVzLmxlbmd0aCA+IDEwZTUpIHtcbiAgICAgICAgICBVcGRhdGVzID0gW107XG4gICAgICAgICAgaWYgKGZhbHNlKTtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgICAgICAgfVxuICAgICAgfSwgZmFsc2UpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5mdW5jdGlvbiB1cGRhdGVDb21wdXRhdGlvbihub2RlKSB7XG4gIGlmICghbm9kZS5mbikgcmV0dXJuO1xuICBjbGVhbk5vZGUobm9kZSk7XG4gIGNvbnN0IHRpbWUgPSBFeGVjQ291bnQ7XG4gIHJ1bkNvbXB1dGF0aW9uKFxuICAgIG5vZGUsXG4gICAgVHJhbnNpdGlvbiAmJiBUcmFuc2l0aW9uLnJ1bm5pbmcgJiYgVHJhbnNpdGlvbi5zb3VyY2VzLmhhcyhub2RlKSA/IG5vZGUudFZhbHVlIDogbm9kZS52YWx1ZSxcbiAgICB0aW1lXG4gICk7XG4gIGlmIChUcmFuc2l0aW9uICYmICFUcmFuc2l0aW9uLnJ1bm5pbmcgJiYgVHJhbnNpdGlvbi5zb3VyY2VzLmhhcyhub2RlKSkge1xuICAgIHF1ZXVlTWljcm90YXNrKCgpID0+IHtcbiAgICAgIHJ1blVwZGF0ZXMoKCkgPT4ge1xuICAgICAgICBUcmFuc2l0aW9uICYmIChUcmFuc2l0aW9uLnJ1bm5pbmcgPSB0cnVlKTtcbiAgICAgICAgTGlzdGVuZXIgPSBPd25lciA9IG5vZGU7XG4gICAgICAgIHJ1bkNvbXB1dGF0aW9uKG5vZGUsIG5vZGUudFZhbHVlLCB0aW1lKTtcbiAgICAgICAgTGlzdGVuZXIgPSBPd25lciA9IG51bGw7XG4gICAgICB9LCBmYWxzZSk7XG4gICAgfSk7XG4gIH1cbn1cbmZ1bmN0aW9uIHJ1bkNvbXB1dGF0aW9uKG5vZGUsIHZhbHVlLCB0aW1lKSB7XG4gIGxldCBuZXh0VmFsdWU7XG4gIGNvbnN0IG93bmVyID0gT3duZXIsXG4gICAgbGlzdGVuZXIgPSBMaXN0ZW5lcjtcbiAgTGlzdGVuZXIgPSBPd25lciA9IG5vZGU7XG4gIHRyeSB7XG4gICAgbmV4dFZhbHVlID0gbm9kZS5mbih2YWx1ZSk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGlmIChub2RlLnB1cmUpIHtcbiAgICAgIGlmIChUcmFuc2l0aW9uICYmIFRyYW5zaXRpb24ucnVubmluZykge1xuICAgICAgICBub2RlLnRTdGF0ZSA9IFNUQUxFO1xuICAgICAgICBub2RlLnRPd25lZCAmJiBub2RlLnRPd25lZC5mb3JFYWNoKGNsZWFuTm9kZSk7XG4gICAgICAgIG5vZGUudE93bmVkID0gdW5kZWZpbmVkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbm9kZS5zdGF0ZSA9IFNUQUxFO1xuICAgICAgICBub2RlLm93bmVkICYmIG5vZGUub3duZWQuZm9yRWFjaChjbGVhbk5vZGUpO1xuICAgICAgICBub2RlLm93bmVkID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gICAgbm9kZS51cGRhdGVkQXQgPSB0aW1lICsgMTtcbiAgICByZXR1cm4gaGFuZGxlRXJyb3IoZXJyKTtcbiAgfSBmaW5hbGx5IHtcbiAgICBMaXN0ZW5lciA9IGxpc3RlbmVyO1xuICAgIE93bmVyID0gb3duZXI7XG4gIH1cbiAgaWYgKCFub2RlLnVwZGF0ZWRBdCB8fCBub2RlLnVwZGF0ZWRBdCA8PSB0aW1lKSB7XG4gICAgaWYgKG5vZGUudXBkYXRlZEF0ICE9IG51bGwgJiYgXCJvYnNlcnZlcnNcIiBpbiBub2RlKSB7XG4gICAgICB3cml0ZVNpZ25hbChub2RlLCBuZXh0VmFsdWUsIHRydWUpO1xuICAgIH0gZWxzZSBpZiAoVHJhbnNpdGlvbiAmJiBUcmFuc2l0aW9uLnJ1bm5pbmcgJiYgbm9kZS5wdXJlKSB7XG4gICAgICBUcmFuc2l0aW9uLnNvdXJjZXMuYWRkKG5vZGUpO1xuICAgICAgbm9kZS50VmFsdWUgPSBuZXh0VmFsdWU7XG4gICAgfSBlbHNlIG5vZGUudmFsdWUgPSBuZXh0VmFsdWU7XG4gICAgbm9kZS51cGRhdGVkQXQgPSB0aW1lO1xuICB9XG59XG5mdW5jdGlvbiBjcmVhdGVDb21wdXRhdGlvbihmbiwgaW5pdCwgcHVyZSwgc3RhdGUgPSBTVEFMRSwgb3B0aW9ucykge1xuICBjb25zdCBjID0ge1xuICAgIGZuLFxuICAgIHN0YXRlOiBzdGF0ZSxcbiAgICB1cGRhdGVkQXQ6IG51bGwsXG4gICAgb3duZWQ6IG51bGwsXG4gICAgc291cmNlczogbnVsbCxcbiAgICBzb3VyY2VTbG90czogbnVsbCxcbiAgICBjbGVhbnVwczogbnVsbCxcbiAgICB2YWx1ZTogaW5pdCxcbiAgICBvd25lcjogT3duZXIsXG4gICAgY29udGV4dDogT3duZXIgPyBPd25lci5jb250ZXh0IDogbnVsbCxcbiAgICBwdXJlXG4gIH07XG4gIGlmIChUcmFuc2l0aW9uICYmIFRyYW5zaXRpb24ucnVubmluZykge1xuICAgIGMuc3RhdGUgPSAwO1xuICAgIGMudFN0YXRlID0gc3RhdGU7XG4gIH1cbiAgaWYgKE93bmVyID09PSBudWxsKTtcbiAgZWxzZSBpZiAoT3duZXIgIT09IFVOT1dORUQpIHtcbiAgICBpZiAoVHJhbnNpdGlvbiAmJiBUcmFuc2l0aW9uLnJ1bm5pbmcgJiYgT3duZXIucHVyZSkge1xuICAgICAgaWYgKCFPd25lci50T3duZWQpIE93bmVyLnRPd25lZCA9IFtjXTtcbiAgICAgIGVsc2UgT3duZXIudE93bmVkLnB1c2goYyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICghT3duZXIub3duZWQpIE93bmVyLm93bmVkID0gW2NdO1xuICAgICAgZWxzZSBPd25lci5vd25lZC5wdXNoKGMpO1xuICAgIH1cbiAgfVxuICBpZiAoRXh0ZXJuYWxTb3VyY2VDb25maWcgJiYgYy5mbikge1xuICAgIGNvbnN0IFt0cmFjaywgdHJpZ2dlcl0gPSBjcmVhdGVTaWduYWwodW5kZWZpbmVkLCB7XG4gICAgICBlcXVhbHM6IGZhbHNlXG4gICAgfSk7XG4gICAgY29uc3Qgb3JkaW5hcnkgPSBFeHRlcm5hbFNvdXJjZUNvbmZpZy5mYWN0b3J5KGMuZm4sIHRyaWdnZXIpO1xuICAgIG9uQ2xlYW51cCgoKSA9PiBvcmRpbmFyeS5kaXNwb3NlKCkpO1xuICAgIGNvbnN0IHRyaWdnZXJJblRyYW5zaXRpb24gPSAoKSA9PiBzdGFydFRyYW5zaXRpb24odHJpZ2dlcikudGhlbigoKSA9PiBpblRyYW5zaXRpb24uZGlzcG9zZSgpKTtcbiAgICBjb25zdCBpblRyYW5zaXRpb24gPSBFeHRlcm5hbFNvdXJjZUNvbmZpZy5mYWN0b3J5KGMuZm4sIHRyaWdnZXJJblRyYW5zaXRpb24pO1xuICAgIGMuZm4gPSB4ID0+IHtcbiAgICAgIHRyYWNrKCk7XG4gICAgICByZXR1cm4gVHJhbnNpdGlvbiAmJiBUcmFuc2l0aW9uLnJ1bm5pbmcgPyBpblRyYW5zaXRpb24udHJhY2soeCkgOiBvcmRpbmFyeS50cmFjayh4KTtcbiAgICB9O1xuICB9XG4gIHJldHVybiBjO1xufVxuZnVuY3Rpb24gcnVuVG9wKG5vZGUpIHtcbiAgY29uc3QgcnVubmluZ1RyYW5zaXRpb24gPSBUcmFuc2l0aW9uICYmIFRyYW5zaXRpb24ucnVubmluZztcbiAgaWYgKChydW5uaW5nVHJhbnNpdGlvbiA/IG5vZGUudFN0YXRlIDogbm9kZS5zdGF0ZSkgPT09IDApIHJldHVybjtcbiAgaWYgKChydW5uaW5nVHJhbnNpdGlvbiA/IG5vZGUudFN0YXRlIDogbm9kZS5zdGF0ZSkgPT09IFBFTkRJTkcpIHJldHVybiBsb29rVXBzdHJlYW0obm9kZSk7XG4gIGlmIChub2RlLnN1c3BlbnNlICYmIHVudHJhY2sobm9kZS5zdXNwZW5zZS5pbkZhbGxiYWNrKSkgcmV0dXJuIG5vZGUuc3VzcGVuc2UuZWZmZWN0cy5wdXNoKG5vZGUpO1xuICBjb25zdCBhbmNlc3RvcnMgPSBbbm9kZV07XG4gIHdoaWxlICgobm9kZSA9IG5vZGUub3duZXIpICYmICghbm9kZS51cGRhdGVkQXQgfHwgbm9kZS51cGRhdGVkQXQgPCBFeGVjQ291bnQpKSB7XG4gICAgaWYgKHJ1bm5pbmdUcmFuc2l0aW9uICYmIFRyYW5zaXRpb24uZGlzcG9zZWQuaGFzKG5vZGUpKSByZXR1cm47XG4gICAgaWYgKHJ1bm5pbmdUcmFuc2l0aW9uID8gbm9kZS50U3RhdGUgOiBub2RlLnN0YXRlKSBhbmNlc3RvcnMucHVzaChub2RlKTtcbiAgfVxuICBmb3IgKGxldCBpID0gYW5jZXN0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgbm9kZSA9IGFuY2VzdG9yc1tpXTtcbiAgICBpZiAocnVubmluZ1RyYW5zaXRpb24pIHtcbiAgICAgIGxldCB0b3AgPSBub2RlLFxuICAgICAgICBwcmV2ID0gYW5jZXN0b3JzW2kgKyAxXTtcbiAgICAgIHdoaWxlICgodG9wID0gdG9wLm93bmVyKSAmJiB0b3AgIT09IHByZXYpIHtcbiAgICAgICAgaWYgKFRyYW5zaXRpb24uZGlzcG9zZWQuaGFzKHRvcCkpIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKChydW5uaW5nVHJhbnNpdGlvbiA/IG5vZGUudFN0YXRlIDogbm9kZS5zdGF0ZSkgPT09IFNUQUxFKSB7XG4gICAgICB1cGRhdGVDb21wdXRhdGlvbihub2RlKTtcbiAgICB9IGVsc2UgaWYgKChydW5uaW5nVHJhbnNpdGlvbiA/IG5vZGUudFN0YXRlIDogbm9kZS5zdGF0ZSkgPT09IFBFTkRJTkcpIHtcbiAgICAgIGNvbnN0IHVwZGF0ZXMgPSBVcGRhdGVzO1xuICAgICAgVXBkYXRlcyA9IG51bGw7XG4gICAgICBydW5VcGRhdGVzKCgpID0+IGxvb2tVcHN0cmVhbShub2RlLCBhbmNlc3RvcnNbMF0pLCBmYWxzZSk7XG4gICAgICBVcGRhdGVzID0gdXBkYXRlcztcbiAgICB9XG4gIH1cbn1cbmZ1bmN0aW9uIHJ1blVwZGF0ZXMoZm4sIGluaXQpIHtcbiAgaWYgKFVwZGF0ZXMpIHJldHVybiBmbigpO1xuICBsZXQgd2FpdCA9IGZhbHNlO1xuICBpZiAoIWluaXQpIFVwZGF0ZXMgPSBbXTtcbiAgaWYgKEVmZmVjdHMpIHdhaXQgPSB0cnVlO1xuICBlbHNlIEVmZmVjdHMgPSBbXTtcbiAgRXhlY0NvdW50Kys7XG4gIHRyeSB7XG4gICAgY29uc3QgcmVzID0gZm4oKTtcbiAgICBjb21wbGV0ZVVwZGF0ZXMod2FpdCk7XG4gICAgcmV0dXJuIHJlcztcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgaWYgKCF3YWl0KSBFZmZlY3RzID0gbnVsbDtcbiAgICBVcGRhdGVzID0gbnVsbDtcbiAgICBoYW5kbGVFcnJvcihlcnIpO1xuICB9XG59XG5mdW5jdGlvbiBjb21wbGV0ZVVwZGF0ZXMod2FpdCkge1xuICBpZiAoVXBkYXRlcykge1xuICAgIGlmIChTY2hlZHVsZXIgJiYgVHJhbnNpdGlvbiAmJiBUcmFuc2l0aW9uLnJ1bm5pbmcpIHNjaGVkdWxlUXVldWUoVXBkYXRlcyk7XG4gICAgZWxzZSBydW5RdWV1ZShVcGRhdGVzKTtcbiAgICBVcGRhdGVzID0gbnVsbDtcbiAgfVxuICBpZiAod2FpdCkgcmV0dXJuO1xuICBsZXQgcmVzO1xuICBpZiAoVHJhbnNpdGlvbikge1xuICAgIGlmICghVHJhbnNpdGlvbi5wcm9taXNlcy5zaXplICYmICFUcmFuc2l0aW9uLnF1ZXVlLnNpemUpIHtcbiAgICAgIGNvbnN0IHNvdXJjZXMgPSBUcmFuc2l0aW9uLnNvdXJjZXM7XG4gICAgICBjb25zdCBkaXNwb3NlZCA9IFRyYW5zaXRpb24uZGlzcG9zZWQ7XG4gICAgICBFZmZlY3RzLnB1c2guYXBwbHkoRWZmZWN0cywgVHJhbnNpdGlvbi5lZmZlY3RzKTtcbiAgICAgIHJlcyA9IFRyYW5zaXRpb24ucmVzb2x2ZTtcbiAgICAgIGZvciAoY29uc3QgZSBvZiBFZmZlY3RzKSB7XG4gICAgICAgIFwidFN0YXRlXCIgaW4gZSAmJiAoZS5zdGF0ZSA9IGUudFN0YXRlKTtcbiAgICAgICAgZGVsZXRlIGUudFN0YXRlO1xuICAgICAgfVxuICAgICAgVHJhbnNpdGlvbiA9IG51bGw7XG4gICAgICBydW5VcGRhdGVzKCgpID0+IHtcbiAgICAgICAgZm9yIChjb25zdCBkIG9mIGRpc3Bvc2VkKSBjbGVhbk5vZGUoZCk7XG4gICAgICAgIGZvciAoY29uc3QgdiBvZiBzb3VyY2VzKSB7XG4gICAgICAgICAgdi52YWx1ZSA9IHYudFZhbHVlO1xuICAgICAgICAgIGlmICh2Lm93bmVkKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gdi5vd25lZC5sZW5ndGg7IGkgPCBsZW47IGkrKykgY2xlYW5Ob2RlKHYub3duZWRbaV0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodi50T3duZWQpIHYub3duZWQgPSB2LnRPd25lZDtcbiAgICAgICAgICBkZWxldGUgdi50VmFsdWU7XG4gICAgICAgICAgZGVsZXRlIHYudE93bmVkO1xuICAgICAgICAgIHYudFN0YXRlID0gMDtcbiAgICAgICAgfVxuICAgICAgICBzZXRUcmFuc1BlbmRpbmcoZmFsc2UpO1xuICAgICAgfSwgZmFsc2UpO1xuICAgIH0gZWxzZSBpZiAoVHJhbnNpdGlvbi5ydW5uaW5nKSB7XG4gICAgICBUcmFuc2l0aW9uLnJ1bm5pbmcgPSBmYWxzZTtcbiAgICAgIFRyYW5zaXRpb24uZWZmZWN0cy5wdXNoLmFwcGx5KFRyYW5zaXRpb24uZWZmZWN0cywgRWZmZWN0cyk7XG4gICAgICBFZmZlY3RzID0gbnVsbDtcbiAgICAgIHNldFRyYW5zUGVuZGluZyh0cnVlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cbiAgY29uc3QgZSA9IEVmZmVjdHM7XG4gIEVmZmVjdHMgPSBudWxsO1xuICBpZiAoZS5sZW5ndGgpIHJ1blVwZGF0ZXMoKCkgPT4gcnVuRWZmZWN0cyhlKSwgZmFsc2UpO1xuICBpZiAocmVzKSByZXMoKTtcbn1cbmZ1bmN0aW9uIHJ1blF1ZXVlKHF1ZXVlKSB7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgcXVldWUubGVuZ3RoOyBpKyspIHJ1blRvcChxdWV1ZVtpXSk7XG59XG5mdW5jdGlvbiBzY2hlZHVsZVF1ZXVlKHF1ZXVlKSB7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgcXVldWUubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBpdGVtID0gcXVldWVbaV07XG4gICAgY29uc3QgdGFza3MgPSBUcmFuc2l0aW9uLnF1ZXVlO1xuICAgIGlmICghdGFza3MuaGFzKGl0ZW0pKSB7XG4gICAgICB0YXNrcy5hZGQoaXRlbSk7XG4gICAgICBTY2hlZHVsZXIoKCkgPT4ge1xuICAgICAgICB0YXNrcy5kZWxldGUoaXRlbSk7XG4gICAgICAgIHJ1blVwZGF0ZXMoKCkgPT4ge1xuICAgICAgICAgIFRyYW5zaXRpb24ucnVubmluZyA9IHRydWU7XG4gICAgICAgICAgcnVuVG9wKGl0ZW0pO1xuICAgICAgICB9LCBmYWxzZSk7XG4gICAgICAgIFRyYW5zaXRpb24gJiYgKFRyYW5zaXRpb24ucnVubmluZyA9IGZhbHNlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuZnVuY3Rpb24gcnVuVXNlckVmZmVjdHMocXVldWUpIHtcbiAgbGV0IGksXG4gICAgdXNlckxlbmd0aCA9IDA7XG4gIGZvciAoaSA9IDA7IGkgPCBxdWV1ZS5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGUgPSBxdWV1ZVtpXTtcbiAgICBpZiAoIWUudXNlcikgcnVuVG9wKGUpO1xuICAgIGVsc2UgcXVldWVbdXNlckxlbmd0aCsrXSA9IGU7XG4gIH1cbiAgaWYgKHNoYXJlZENvbmZpZy5jb250ZXh0KSB7XG4gICAgaWYgKHNoYXJlZENvbmZpZy5jb3VudCkge1xuICAgICAgc2hhcmVkQ29uZmlnLmVmZmVjdHMgfHwgKHNoYXJlZENvbmZpZy5lZmZlY3RzID0gW10pO1xuICAgICAgc2hhcmVkQ29uZmlnLmVmZmVjdHMucHVzaCguLi5xdWV1ZS5zbGljZSgwLCB1c2VyTGVuZ3RoKSk7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmIChzaGFyZWRDb25maWcuZWZmZWN0cykge1xuICAgICAgcXVldWUgPSBbLi4uc2hhcmVkQ29uZmlnLmVmZmVjdHMsIC4uLnF1ZXVlXTtcbiAgICAgIHVzZXJMZW5ndGggKz0gc2hhcmVkQ29uZmlnLmVmZmVjdHMubGVuZ3RoO1xuICAgICAgZGVsZXRlIHNoYXJlZENvbmZpZy5lZmZlY3RzO1xuICAgIH1cbiAgICBzZXRIeWRyYXRlQ29udGV4dCgpO1xuICB9XG4gIGZvciAoaSA9IDA7IGkgPCB1c2VyTGVuZ3RoOyBpKyspIHJ1blRvcChxdWV1ZVtpXSk7XG59XG5mdW5jdGlvbiBsb29rVXBzdHJlYW0obm9kZSwgaWdub3JlKSB7XG4gIGNvbnN0IHJ1bm5pbmdUcmFuc2l0aW9uID0gVHJhbnNpdGlvbiAmJiBUcmFuc2l0aW9uLnJ1bm5pbmc7XG4gIGlmIChydW5uaW5nVHJhbnNpdGlvbikgbm9kZS50U3RhdGUgPSAwO1xuICBlbHNlIG5vZGUuc3RhdGUgPSAwO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGUuc291cmNlcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIGNvbnN0IHNvdXJjZSA9IG5vZGUuc291cmNlc1tpXTtcbiAgICBpZiAoc291cmNlLnNvdXJjZXMpIHtcbiAgICAgIGNvbnN0IHN0YXRlID0gcnVubmluZ1RyYW5zaXRpb24gPyBzb3VyY2UudFN0YXRlIDogc291cmNlLnN0YXRlO1xuICAgICAgaWYgKHN0YXRlID09PSBTVEFMRSkge1xuICAgICAgICBpZiAoc291cmNlICE9PSBpZ25vcmUgJiYgKCFzb3VyY2UudXBkYXRlZEF0IHx8IHNvdXJjZS51cGRhdGVkQXQgPCBFeGVjQ291bnQpKVxuICAgICAgICAgIHJ1blRvcChzb3VyY2UpO1xuICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gUEVORElORykgbG9va1Vwc3RyZWFtKHNvdXJjZSwgaWdub3JlKTtcbiAgICB9XG4gIH1cbn1cbmZ1bmN0aW9uIG1hcmtEb3duc3RyZWFtKG5vZGUpIHtcbiAgY29uc3QgcnVubmluZ1RyYW5zaXRpb24gPSBUcmFuc2l0aW9uICYmIFRyYW5zaXRpb24ucnVubmluZztcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2RlLm9ic2VydmVycy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIGNvbnN0IG8gPSBub2RlLm9ic2VydmVyc1tpXTtcbiAgICBpZiAocnVubmluZ1RyYW5zaXRpb24gPyAhby50U3RhdGUgOiAhby5zdGF0ZSkge1xuICAgICAgaWYgKHJ1bm5pbmdUcmFuc2l0aW9uKSBvLnRTdGF0ZSA9IFBFTkRJTkc7XG4gICAgICBlbHNlIG8uc3RhdGUgPSBQRU5ESU5HO1xuICAgICAgaWYgKG8ucHVyZSkgVXBkYXRlcy5wdXNoKG8pO1xuICAgICAgZWxzZSBFZmZlY3RzLnB1c2gobyk7XG4gICAgICBvLm9ic2VydmVycyAmJiBtYXJrRG93bnN0cmVhbShvKTtcbiAgICB9XG4gIH1cbn1cbmZ1bmN0aW9uIGNsZWFuTm9kZShub2RlKSB7XG4gIGxldCBpO1xuICBpZiAobm9kZS5zb3VyY2VzKSB7XG4gICAgd2hpbGUgKG5vZGUuc291cmNlcy5sZW5ndGgpIHtcbiAgICAgIGNvbnN0IHNvdXJjZSA9IG5vZGUuc291cmNlcy5wb3AoKSxcbiAgICAgICAgaW5kZXggPSBub2RlLnNvdXJjZVNsb3RzLnBvcCgpLFxuICAgICAgICBvYnMgPSBzb3VyY2Uub2JzZXJ2ZXJzO1xuICAgICAgaWYgKG9icyAmJiBvYnMubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IG4gPSBvYnMucG9wKCksXG4gICAgICAgICAgcyA9IHNvdXJjZS5vYnNlcnZlclNsb3RzLnBvcCgpO1xuICAgICAgICBpZiAoaW5kZXggPCBvYnMubGVuZ3RoKSB7XG4gICAgICAgICAgbi5zb3VyY2VTbG90c1tzXSA9IGluZGV4O1xuICAgICAgICAgIG9ic1tpbmRleF0gPSBuO1xuICAgICAgICAgIHNvdXJjZS5vYnNlcnZlclNsb3RzW2luZGV4XSA9IHM7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgaWYgKFRyYW5zaXRpb24gJiYgVHJhbnNpdGlvbi5ydW5uaW5nICYmIG5vZGUucHVyZSkge1xuICAgIGlmIChub2RlLnRPd25lZCkge1xuICAgICAgZm9yIChpID0gbm9kZS50T3duZWQubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGNsZWFuTm9kZShub2RlLnRPd25lZFtpXSk7XG4gICAgICBkZWxldGUgbm9kZS50T3duZWQ7XG4gICAgfVxuICAgIHJlc2V0KG5vZGUsIHRydWUpO1xuICB9IGVsc2UgaWYgKG5vZGUub3duZWQpIHtcbiAgICBmb3IgKGkgPSBub2RlLm93bmVkLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBjbGVhbk5vZGUobm9kZS5vd25lZFtpXSk7XG4gICAgbm9kZS5vd25lZCA9IG51bGw7XG4gIH1cbiAgaWYgKG5vZGUuY2xlYW51cHMpIHtcbiAgICBmb3IgKGkgPSBub2RlLmNsZWFudXBzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBub2RlLmNsZWFudXBzW2ldKCk7XG4gICAgbm9kZS5jbGVhbnVwcyA9IG51bGw7XG4gIH1cbiAgaWYgKFRyYW5zaXRpb24gJiYgVHJhbnNpdGlvbi5ydW5uaW5nKSBub2RlLnRTdGF0ZSA9IDA7XG4gIGVsc2Ugbm9kZS5zdGF0ZSA9IDA7XG59XG5mdW5jdGlvbiByZXNldChub2RlLCB0b3ApIHtcbiAgaWYgKCF0b3ApIHtcbiAgICBub2RlLnRTdGF0ZSA9IDA7XG4gICAgVHJhbnNpdGlvbi5kaXNwb3NlZC5hZGQobm9kZSk7XG4gIH1cbiAgaWYgKG5vZGUub3duZWQpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGUub3duZWQubGVuZ3RoOyBpKyspIHJlc2V0KG5vZGUub3duZWRbaV0pO1xuICB9XG59XG5mdW5jdGlvbiBjYXN0RXJyb3IoZXJyKSB7XG4gIGlmIChlcnIgaW5zdGFuY2VvZiBFcnJvcikgcmV0dXJuIGVycjtcbiAgcmV0dXJuIG5ldyBFcnJvcih0eXBlb2YgZXJyID09PSBcInN0cmluZ1wiID8gZXJyIDogXCJVbmtub3duIGVycm9yXCIsIHtcbiAgICBjYXVzZTogZXJyXG4gIH0pO1xufVxuZnVuY3Rpb24gcnVuRXJyb3JzKGVyciwgZm5zLCBvd25lcikge1xuICB0cnkge1xuICAgIGZvciAoY29uc3QgZiBvZiBmbnMpIGYoZXJyKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGhhbmRsZUVycm9yKGUsIChvd25lciAmJiBvd25lci5vd25lcikgfHwgbnVsbCk7XG4gIH1cbn1cbmZ1bmN0aW9uIGhhbmRsZUVycm9yKGVyciwgb3duZXIgPSBPd25lcikge1xuICBjb25zdCBmbnMgPSBFUlJPUiAmJiBvd25lciAmJiBvd25lci5jb250ZXh0ICYmIG93bmVyLmNvbnRleHRbRVJST1JdO1xuICBjb25zdCBlcnJvciA9IGNhc3RFcnJvcihlcnIpO1xuICBpZiAoIWZucykgdGhyb3cgZXJyb3I7XG4gIGlmIChFZmZlY3RzKVxuICAgIEVmZmVjdHMucHVzaCh7XG4gICAgICBmbigpIHtcbiAgICAgICAgcnVuRXJyb3JzKGVycm9yLCBmbnMsIG93bmVyKTtcbiAgICAgIH0sXG4gICAgICBzdGF0ZTogU1RBTEVcbiAgICB9KTtcbiAgZWxzZSBydW5FcnJvcnMoZXJyb3IsIGZucywgb3duZXIpO1xufVxuZnVuY3Rpb24gcmVzb2x2ZUNoaWxkcmVuKGNoaWxkcmVuKSB7XG4gIGlmICh0eXBlb2YgY2hpbGRyZW4gPT09IFwiZnVuY3Rpb25cIiAmJiAhY2hpbGRyZW4ubGVuZ3RoKSByZXR1cm4gcmVzb2x2ZUNoaWxkcmVuKGNoaWxkcmVuKCkpO1xuICBpZiAoQXJyYXkuaXNBcnJheShjaGlsZHJlbikpIHtcbiAgICBjb25zdCByZXN1bHRzID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgcmVzdWx0ID0gcmVzb2x2ZUNoaWxkcmVuKGNoaWxkcmVuW2ldKTtcbiAgICAgIEFycmF5LmlzQXJyYXkocmVzdWx0KSA/IHJlc3VsdHMucHVzaC5hcHBseShyZXN1bHRzLCByZXN1bHQpIDogcmVzdWx0cy5wdXNoKHJlc3VsdCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG4gIHJldHVybiBjaGlsZHJlbjtcbn1cbmZ1bmN0aW9uIGNyZWF0ZVByb3ZpZGVyKGlkLCBvcHRpb25zKSB7XG4gIHJldHVybiBmdW5jdGlvbiBwcm92aWRlcihwcm9wcykge1xuICAgIGxldCByZXM7XG4gICAgY3JlYXRlUmVuZGVyRWZmZWN0KFxuICAgICAgKCkgPT5cbiAgICAgICAgKHJlcyA9IHVudHJhY2soKCkgPT4ge1xuICAgICAgICAgIE93bmVyLmNvbnRleHQgPSB7XG4gICAgICAgICAgICAuLi5Pd25lci5jb250ZXh0LFxuICAgICAgICAgICAgW2lkXTogcHJvcHMudmFsdWVcbiAgICAgICAgICB9O1xuICAgICAgICAgIHJldHVybiBjaGlsZHJlbigoKSA9PiBwcm9wcy5jaGlsZHJlbik7XG4gICAgICAgIH0pKSxcbiAgICAgIHVuZGVmaW5lZFxuICAgICk7XG4gICAgcmV0dXJuIHJlcztcbiAgfTtcbn1cbmZ1bmN0aW9uIG9uRXJyb3IoZm4pIHtcbiAgRVJST1IgfHwgKEVSUk9SID0gU3ltYm9sKFwiZXJyb3JcIikpO1xuICBpZiAoT3duZXIgPT09IG51bGwpO1xuICBlbHNlIGlmIChPd25lci5jb250ZXh0ID09PSBudWxsIHx8ICFPd25lci5jb250ZXh0W0VSUk9SXSkge1xuICAgIE93bmVyLmNvbnRleHQgPSB7XG4gICAgICAuLi5Pd25lci5jb250ZXh0LFxuICAgICAgW0VSUk9SXTogW2ZuXVxuICAgIH07XG4gICAgbXV0YXRlQ29udGV4dChPd25lciwgRVJST1IsIFtmbl0pO1xuICB9IGVsc2UgT3duZXIuY29udGV4dFtFUlJPUl0ucHVzaChmbik7XG59XG5mdW5jdGlvbiBtdXRhdGVDb250ZXh0KG8sIGtleSwgdmFsdWUpIHtcbiAgaWYgKG8ub3duZWQpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG8ub3duZWQubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChvLm93bmVkW2ldLmNvbnRleHQgPT09IG8uY29udGV4dCkgbXV0YXRlQ29udGV4dChvLm93bmVkW2ldLCBrZXksIHZhbHVlKTtcbiAgICAgIGlmICghby5vd25lZFtpXS5jb250ZXh0KSB7XG4gICAgICAgIG8ub3duZWRbaV0uY29udGV4dCA9IG8uY29udGV4dDtcbiAgICAgICAgbXV0YXRlQ29udGV4dChvLm93bmVkW2ldLCBrZXksIHZhbHVlKTtcbiAgICAgIH0gZWxzZSBpZiAoIW8ub3duZWRbaV0uY29udGV4dFtrZXldKSB7XG4gICAgICAgIG8ub3duZWRbaV0uY29udGV4dFtrZXldID0gdmFsdWU7XG4gICAgICAgIG11dGF0ZUNvbnRleHQoby5vd25lZFtpXSwga2V5LCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIG9ic2VydmFibGUoaW5wdXQpIHtcbiAgcmV0dXJuIHtcbiAgICBzdWJzY3JpYmUob2JzZXJ2ZXIpIHtcbiAgICAgIGlmICghKG9ic2VydmVyIGluc3RhbmNlb2YgT2JqZWN0KSB8fCBvYnNlcnZlciA9PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJFeHBlY3RlZCB0aGUgb2JzZXJ2ZXIgdG8gYmUgYW4gb2JqZWN0LlwiKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGhhbmRsZXIgPVxuICAgICAgICB0eXBlb2Ygb2JzZXJ2ZXIgPT09IFwiZnVuY3Rpb25cIiA/IG9ic2VydmVyIDogb2JzZXJ2ZXIubmV4dCAmJiBvYnNlcnZlci5uZXh0LmJpbmQob2JzZXJ2ZXIpO1xuICAgICAgaWYgKCFoYW5kbGVyKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdW5zdWJzY3JpYmUoKSB7fVxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgY29uc3QgZGlzcG9zZSA9IGNyZWF0ZVJvb3QoZGlzcG9zZXIgPT4ge1xuICAgICAgICBjcmVhdGVFZmZlY3QoKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHYgPSBpbnB1dCgpO1xuICAgICAgICAgIHVudHJhY2soKCkgPT4gaGFuZGxlcih2KSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZGlzcG9zZXI7XG4gICAgICB9KTtcbiAgICAgIGlmIChnZXRPd25lcigpKSBvbkNsZWFudXAoZGlzcG9zZSk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB1bnN1YnNjcmliZSgpIHtcbiAgICAgICAgICBkaXNwb3NlKCk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfSxcbiAgICBbU3ltYm9sLm9ic2VydmFibGUgfHwgXCJAQG9ic2VydmFibGVcIl0oKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG59XG5mdW5jdGlvbiBmcm9tKHByb2R1Y2VyKSB7XG4gIGNvbnN0IFtzLCBzZXRdID0gY3JlYXRlU2lnbmFsKHVuZGVmaW5lZCwge1xuICAgIGVxdWFsczogZmFsc2VcbiAgfSk7XG4gIGlmIChcInN1YnNjcmliZVwiIGluIHByb2R1Y2VyKSB7XG4gICAgY29uc3QgdW5zdWIgPSBwcm9kdWNlci5zdWJzY3JpYmUodiA9PiBzZXQoKCkgPT4gdikpO1xuICAgIG9uQ2xlYW51cCgoKSA9PiAoXCJ1bnN1YnNjcmliZVwiIGluIHVuc3ViID8gdW5zdWIudW5zdWJzY3JpYmUoKSA6IHVuc3ViKCkpKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBjbGVhbiA9IHByb2R1Y2VyKHNldCk7XG4gICAgb25DbGVhbnVwKGNsZWFuKTtcbiAgfVxuICByZXR1cm4gcztcbn1cblxuY29uc3QgRkFMTEJBQ0sgPSBTeW1ib2woXCJmYWxsYmFja1wiKTtcbmZ1bmN0aW9uIGRpc3Bvc2UoZCkge1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGQubGVuZ3RoOyBpKyspIGRbaV0oKTtcbn1cbmZ1bmN0aW9uIG1hcEFycmF5KGxpc3QsIG1hcEZuLCBvcHRpb25zID0ge30pIHtcbiAgbGV0IGl0ZW1zID0gW10sXG4gICAgbWFwcGVkID0gW10sXG4gICAgZGlzcG9zZXJzID0gW10sXG4gICAgbGVuID0gMCxcbiAgICBpbmRleGVzID0gbWFwRm4ubGVuZ3RoID4gMSA/IFtdIDogbnVsbDtcbiAgb25DbGVhbnVwKCgpID0+IGRpc3Bvc2UoZGlzcG9zZXJzKSk7XG4gIHJldHVybiAoKSA9PiB7XG4gICAgbGV0IG5ld0l0ZW1zID0gbGlzdCgpIHx8IFtdLFxuICAgICAgaSxcbiAgICAgIGo7XG4gICAgbmV3SXRlbXNbJFRSQUNLXTtcbiAgICByZXR1cm4gdW50cmFjaygoKSA9PiB7XG4gICAgICBsZXQgbmV3TGVuID0gbmV3SXRlbXMubGVuZ3RoLFxuICAgICAgICBuZXdJbmRpY2VzLFxuICAgICAgICBuZXdJbmRpY2VzTmV4dCxcbiAgICAgICAgdGVtcCxcbiAgICAgICAgdGVtcGRpc3Bvc2VycyxcbiAgICAgICAgdGVtcEluZGV4ZXMsXG4gICAgICAgIHN0YXJ0LFxuICAgICAgICBlbmQsXG4gICAgICAgIG5ld0VuZCxcbiAgICAgICAgaXRlbTtcbiAgICAgIGlmIChuZXdMZW4gPT09IDApIHtcbiAgICAgICAgaWYgKGxlbiAhPT0gMCkge1xuICAgICAgICAgIGRpc3Bvc2UoZGlzcG9zZXJzKTtcbiAgICAgICAgICBkaXNwb3NlcnMgPSBbXTtcbiAgICAgICAgICBpdGVtcyA9IFtdO1xuICAgICAgICAgIG1hcHBlZCA9IFtdO1xuICAgICAgICAgIGxlbiA9IDA7XG4gICAgICAgICAgaW5kZXhlcyAmJiAoaW5kZXhlcyA9IFtdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAob3B0aW9ucy5mYWxsYmFjaykge1xuICAgICAgICAgIGl0ZW1zID0gW0ZBTExCQUNLXTtcbiAgICAgICAgICBtYXBwZWRbMF0gPSBjcmVhdGVSb290KGRpc3Bvc2VyID0+IHtcbiAgICAgICAgICAgIGRpc3Bvc2Vyc1swXSA9IGRpc3Bvc2VyO1xuICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMuZmFsbGJhY2soKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBsZW4gPSAxO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGxlbiA9PT0gMCkge1xuICAgICAgICBtYXBwZWQgPSBuZXcgQXJyYXkobmV3TGVuKTtcbiAgICAgICAgZm9yIChqID0gMDsgaiA8IG5ld0xlbjsgaisrKSB7XG4gICAgICAgICAgaXRlbXNbal0gPSBuZXdJdGVtc1tqXTtcbiAgICAgICAgICBtYXBwZWRbal0gPSBjcmVhdGVSb290KG1hcHBlcik7XG4gICAgICAgIH1cbiAgICAgICAgbGVuID0gbmV3TGVuO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGVtcCA9IG5ldyBBcnJheShuZXdMZW4pO1xuICAgICAgICB0ZW1wZGlzcG9zZXJzID0gbmV3IEFycmF5KG5ld0xlbik7XG4gICAgICAgIGluZGV4ZXMgJiYgKHRlbXBJbmRleGVzID0gbmV3IEFycmF5KG5ld0xlbikpO1xuICAgICAgICBmb3IgKFxuICAgICAgICAgIHN0YXJ0ID0gMCwgZW5kID0gTWF0aC5taW4obGVuLCBuZXdMZW4pO1xuICAgICAgICAgIHN0YXJ0IDwgZW5kICYmIGl0ZW1zW3N0YXJ0XSA9PT0gbmV3SXRlbXNbc3RhcnRdO1xuICAgICAgICAgIHN0YXJ0KytcbiAgICAgICAgKTtcbiAgICAgICAgZm9yIChcbiAgICAgICAgICBlbmQgPSBsZW4gLSAxLCBuZXdFbmQgPSBuZXdMZW4gLSAxO1xuICAgICAgICAgIGVuZCA+PSBzdGFydCAmJiBuZXdFbmQgPj0gc3RhcnQgJiYgaXRlbXNbZW5kXSA9PT0gbmV3SXRlbXNbbmV3RW5kXTtcbiAgICAgICAgICBlbmQtLSwgbmV3RW5kLS1cbiAgICAgICAgKSB7XG4gICAgICAgICAgdGVtcFtuZXdFbmRdID0gbWFwcGVkW2VuZF07XG4gICAgICAgICAgdGVtcGRpc3Bvc2Vyc1tuZXdFbmRdID0gZGlzcG9zZXJzW2VuZF07XG4gICAgICAgICAgaW5kZXhlcyAmJiAodGVtcEluZGV4ZXNbbmV3RW5kXSA9IGluZGV4ZXNbZW5kXSk7XG4gICAgICAgIH1cbiAgICAgICAgbmV3SW5kaWNlcyA9IG5ldyBNYXAoKTtcbiAgICAgICAgbmV3SW5kaWNlc05leHQgPSBuZXcgQXJyYXkobmV3RW5kICsgMSk7XG4gICAgICAgIGZvciAoaiA9IG5ld0VuZDsgaiA+PSBzdGFydDsgai0tKSB7XG4gICAgICAgICAgaXRlbSA9IG5ld0l0ZW1zW2pdO1xuICAgICAgICAgIGkgPSBuZXdJbmRpY2VzLmdldChpdGVtKTtcbiAgICAgICAgICBuZXdJbmRpY2VzTmV4dFtqXSA9IGkgPT09IHVuZGVmaW5lZCA/IC0xIDogaTtcbiAgICAgICAgICBuZXdJbmRpY2VzLnNldChpdGVtLCBqKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSBzdGFydDsgaSA8PSBlbmQ7IGkrKykge1xuICAgICAgICAgIGl0ZW0gPSBpdGVtc1tpXTtcbiAgICAgICAgICBqID0gbmV3SW5kaWNlcy5nZXQoaXRlbSk7XG4gICAgICAgICAgaWYgKGogIT09IHVuZGVmaW5lZCAmJiBqICE9PSAtMSkge1xuICAgICAgICAgICAgdGVtcFtqXSA9IG1hcHBlZFtpXTtcbiAgICAgICAgICAgIHRlbXBkaXNwb3NlcnNbal0gPSBkaXNwb3NlcnNbaV07XG4gICAgICAgICAgICBpbmRleGVzICYmICh0ZW1wSW5kZXhlc1tqXSA9IGluZGV4ZXNbaV0pO1xuICAgICAgICAgICAgaiA9IG5ld0luZGljZXNOZXh0W2pdO1xuICAgICAgICAgICAgbmV3SW5kaWNlcy5zZXQoaXRlbSwgaik7XG4gICAgICAgICAgfSBlbHNlIGRpc3Bvc2Vyc1tpXSgpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaiA9IHN0YXJ0OyBqIDwgbmV3TGVuOyBqKyspIHtcbiAgICAgICAgICBpZiAoaiBpbiB0ZW1wKSB7XG4gICAgICAgICAgICBtYXBwZWRbal0gPSB0ZW1wW2pdO1xuICAgICAgICAgICAgZGlzcG9zZXJzW2pdID0gdGVtcGRpc3Bvc2Vyc1tqXTtcbiAgICAgICAgICAgIGlmIChpbmRleGVzKSB7XG4gICAgICAgICAgICAgIGluZGV4ZXNbal0gPSB0ZW1wSW5kZXhlc1tqXTtcbiAgICAgICAgICAgICAgaW5kZXhlc1tqXShqKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgbWFwcGVkW2pdID0gY3JlYXRlUm9vdChtYXBwZXIpO1xuICAgICAgICB9XG4gICAgICAgIG1hcHBlZCA9IG1hcHBlZC5zbGljZSgwLCAobGVuID0gbmV3TGVuKSk7XG4gICAgICAgIGl0ZW1zID0gbmV3SXRlbXMuc2xpY2UoMCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbWFwcGVkO1xuICAgIH0pO1xuICAgIGZ1bmN0aW9uIG1hcHBlcihkaXNwb3Nlcikge1xuICAgICAgZGlzcG9zZXJzW2pdID0gZGlzcG9zZXI7XG4gICAgICBpZiAoaW5kZXhlcykge1xuICAgICAgICBjb25zdCBbcywgc2V0XSA9IGNyZWF0ZVNpZ25hbChqKTtcbiAgICAgICAgaW5kZXhlc1tqXSA9IHNldDtcbiAgICAgICAgcmV0dXJuIG1hcEZuKG5ld0l0ZW1zW2pdLCBzKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBtYXBGbihuZXdJdGVtc1tqXSk7XG4gICAgfVxuICB9O1xufVxuZnVuY3Rpb24gaW5kZXhBcnJheShsaXN0LCBtYXBGbiwgb3B0aW9ucyA9IHt9KSB7XG4gIGxldCBpdGVtcyA9IFtdLFxuICAgIG1hcHBlZCA9IFtdLFxuICAgIGRpc3Bvc2VycyA9IFtdLFxuICAgIHNpZ25hbHMgPSBbXSxcbiAgICBsZW4gPSAwLFxuICAgIGk7XG4gIG9uQ2xlYW51cCgoKSA9PiBkaXNwb3NlKGRpc3Bvc2VycykpO1xuICByZXR1cm4gKCkgPT4ge1xuICAgIGNvbnN0IG5ld0l0ZW1zID0gbGlzdCgpIHx8IFtdO1xuICAgIG5ld0l0ZW1zWyRUUkFDS107XG4gICAgcmV0dXJuIHVudHJhY2soKCkgPT4ge1xuICAgICAgaWYgKG5ld0l0ZW1zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBpZiAobGVuICE9PSAwKSB7XG4gICAgICAgICAgZGlzcG9zZShkaXNwb3NlcnMpO1xuICAgICAgICAgIGRpc3Bvc2VycyA9IFtdO1xuICAgICAgICAgIGl0ZW1zID0gW107XG4gICAgICAgICAgbWFwcGVkID0gW107XG4gICAgICAgICAgbGVuID0gMDtcbiAgICAgICAgICBzaWduYWxzID0gW107XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9wdGlvbnMuZmFsbGJhY2spIHtcbiAgICAgICAgICBpdGVtcyA9IFtGQUxMQkFDS107XG4gICAgICAgICAgbWFwcGVkWzBdID0gY3JlYXRlUm9vdChkaXNwb3NlciA9PiB7XG4gICAgICAgICAgICBkaXNwb3NlcnNbMF0gPSBkaXNwb3NlcjtcbiAgICAgICAgICAgIHJldHVybiBvcHRpb25zLmZhbGxiYWNrKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgbGVuID0gMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWFwcGVkO1xuICAgICAgfVxuICAgICAgaWYgKGl0ZW1zWzBdID09PSBGQUxMQkFDSykge1xuICAgICAgICBkaXNwb3NlcnNbMF0oKTtcbiAgICAgICAgZGlzcG9zZXJzID0gW107XG4gICAgICAgIGl0ZW1zID0gW107XG4gICAgICAgIG1hcHBlZCA9IFtdO1xuICAgICAgICBsZW4gPSAwO1xuICAgICAgfVxuICAgICAgZm9yIChpID0gMDsgaSA8IG5ld0l0ZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChpIDwgaXRlbXMubGVuZ3RoICYmIGl0ZW1zW2ldICE9PSBuZXdJdGVtc1tpXSkge1xuICAgICAgICAgIHNpZ25hbHNbaV0oKCkgPT4gbmV3SXRlbXNbaV0pO1xuICAgICAgICB9IGVsc2UgaWYgKGkgPj0gaXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICAgbWFwcGVkW2ldID0gY3JlYXRlUm9vdChtYXBwZXIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKDsgaSA8IGl0ZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGRpc3Bvc2Vyc1tpXSgpO1xuICAgICAgfVxuICAgICAgbGVuID0gc2lnbmFscy5sZW5ndGggPSBkaXNwb3NlcnMubGVuZ3RoID0gbmV3SXRlbXMubGVuZ3RoO1xuICAgICAgaXRlbXMgPSBuZXdJdGVtcy5zbGljZSgwKTtcbiAgICAgIHJldHVybiAobWFwcGVkID0gbWFwcGVkLnNsaWNlKDAsIGxlbikpO1xuICAgIH0pO1xuICAgIGZ1bmN0aW9uIG1hcHBlcihkaXNwb3Nlcikge1xuICAgICAgZGlzcG9zZXJzW2ldID0gZGlzcG9zZXI7XG4gICAgICBjb25zdCBbcywgc2V0XSA9IGNyZWF0ZVNpZ25hbChuZXdJdGVtc1tpXSk7XG4gICAgICBzaWduYWxzW2ldID0gc2V0O1xuICAgICAgcmV0dXJuIG1hcEZuKHMsIGkpO1xuICAgIH1cbiAgfTtcbn1cblxubGV0IGh5ZHJhdGlvbkVuYWJsZWQgPSBmYWxzZTtcbmZ1bmN0aW9uIGVuYWJsZUh5ZHJhdGlvbigpIHtcbiAgaHlkcmF0aW9uRW5hYmxlZCA9IHRydWU7XG59XG5mdW5jdGlvbiBjcmVhdGVDb21wb25lbnQoQ29tcCwgcHJvcHMpIHtcbiAgaWYgKGh5ZHJhdGlvbkVuYWJsZWQpIHtcbiAgICBpZiAoc2hhcmVkQ29uZmlnLmNvbnRleHQpIHtcbiAgICAgIGNvbnN0IGMgPSBzaGFyZWRDb25maWcuY29udGV4dDtcbiAgICAgIHNldEh5ZHJhdGVDb250ZXh0KG5leHRIeWRyYXRlQ29udGV4dCgpKTtcbiAgICAgIGNvbnN0IHIgPSB1bnRyYWNrKCgpID0+IENvbXAocHJvcHMgfHwge30pKTtcbiAgICAgIHNldEh5ZHJhdGVDb250ZXh0KGMpO1xuICAgICAgcmV0dXJuIHI7XG4gICAgfVxuICB9XG4gIHJldHVybiB1bnRyYWNrKCgpID0+IENvbXAocHJvcHMgfHwge30pKTtcbn1cbmZ1bmN0aW9uIHRydWVGbigpIHtcbiAgcmV0dXJuIHRydWU7XG59XG5jb25zdCBwcm9wVHJhcHMgPSB7XG4gIGdldChfLCBwcm9wZXJ0eSwgcmVjZWl2ZXIpIHtcbiAgICBpZiAocHJvcGVydHkgPT09ICRQUk9YWSkgcmV0dXJuIHJlY2VpdmVyO1xuICAgIHJldHVybiBfLmdldChwcm9wZXJ0eSk7XG4gIH0sXG4gIGhhcyhfLCBwcm9wZXJ0eSkge1xuICAgIGlmIChwcm9wZXJ0eSA9PT0gJFBST1hZKSByZXR1cm4gdHJ1ZTtcbiAgICByZXR1cm4gXy5oYXMocHJvcGVydHkpO1xuICB9LFxuICBzZXQ6IHRydWVGbixcbiAgZGVsZXRlUHJvcGVydHk6IHRydWVGbixcbiAgZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKF8sIHByb3BlcnR5KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICBnZXQoKSB7XG4gICAgICAgIHJldHVybiBfLmdldChwcm9wZXJ0eSk7XG4gICAgICB9LFxuICAgICAgc2V0OiB0cnVlRm4sXG4gICAgICBkZWxldGVQcm9wZXJ0eTogdHJ1ZUZuXG4gICAgfTtcbiAgfSxcbiAgb3duS2V5cyhfKSB7XG4gICAgcmV0dXJuIF8ua2V5cygpO1xuICB9XG59O1xuZnVuY3Rpb24gcmVzb2x2ZVNvdXJjZShzKSB7XG4gIHJldHVybiAhKHMgPSB0eXBlb2YgcyA9PT0gXCJmdW5jdGlvblwiID8gcygpIDogcykgPyB7fSA6IHM7XG59XG5mdW5jdGlvbiByZXNvbHZlU291cmNlcygpIHtcbiAgZm9yIChsZXQgaSA9IDAsIGxlbmd0aCA9IHRoaXMubGVuZ3RoOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICBjb25zdCB2ID0gdGhpc1tpXSgpO1xuICAgIGlmICh2ICE9PSB1bmRlZmluZWQpIHJldHVybiB2O1xuICB9XG59XG5mdW5jdGlvbiBtZXJnZVByb3BzKC4uLnNvdXJjZXMpIHtcbiAgbGV0IHByb3h5ID0gZmFsc2U7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc291cmNlcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHMgPSBzb3VyY2VzW2ldO1xuICAgIHByb3h5ID0gcHJveHkgfHwgKCEhcyAmJiAkUFJPWFkgaW4gcyk7XG4gICAgc291cmNlc1tpXSA9IHR5cGVvZiBzID09PSBcImZ1bmN0aW9uXCIgPyAoKHByb3h5ID0gdHJ1ZSksIGNyZWF0ZU1lbW8ocykpIDogcztcbiAgfVxuICBpZiAocHJveHkpIHtcbiAgICByZXR1cm4gbmV3IFByb3h5KFxuICAgICAge1xuICAgICAgICBnZXQocHJvcGVydHkpIHtcbiAgICAgICAgICBmb3IgKGxldCBpID0gc291cmNlcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgY29uc3QgdiA9IHJlc29sdmVTb3VyY2Uoc291cmNlc1tpXSlbcHJvcGVydHldO1xuICAgICAgICAgICAgaWYgKHYgIT09IHVuZGVmaW5lZCkgcmV0dXJuIHY7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBoYXMocHJvcGVydHkpIHtcbiAgICAgICAgICBmb3IgKGxldCBpID0gc291cmNlcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgaWYgKHByb3BlcnR5IGluIHJlc29sdmVTb3VyY2Uoc291cmNlc1tpXSkpIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0sXG4gICAgICAgIGtleXMoKSB7XG4gICAgICAgICAgY29uc3Qga2V5cyA9IFtdO1xuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc291cmNlcy5sZW5ndGg7IGkrKylcbiAgICAgICAgICAgIGtleXMucHVzaCguLi5PYmplY3Qua2V5cyhyZXNvbHZlU291cmNlKHNvdXJjZXNbaV0pKSk7XG4gICAgICAgICAgcmV0dXJuIFsuLi5uZXcgU2V0KGtleXMpXTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIHByb3BUcmFwc1xuICAgICk7XG4gIH1cbiAgY29uc3Qgc291cmNlc01hcCA9IHt9O1xuICBjb25zdCBkZWZpbmVkID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgZm9yIChsZXQgaSA9IHNvdXJjZXMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBjb25zdCBzb3VyY2UgPSBzb3VyY2VzW2ldO1xuICAgIGlmICghc291cmNlKSBjb250aW51ZTtcbiAgICBjb25zdCBzb3VyY2VLZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoc291cmNlKTtcbiAgICBmb3IgKGxldCBpID0gc291cmNlS2V5cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgY29uc3Qga2V5ID0gc291cmNlS2V5c1tpXTtcbiAgICAgIGlmIChrZXkgPT09IFwiX19wcm90b19fXCIgfHwga2V5ID09PSBcImNvbnN0cnVjdG9yXCIpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc291cmNlLCBrZXkpO1xuICAgICAgaWYgKCFkZWZpbmVkW2tleV0pIHtcbiAgICAgICAgZGVmaW5lZFtrZXldID0gZGVzYy5nZXRcbiAgICAgICAgICA/IHtcbiAgICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICBnZXQ6IHJlc29sdmVTb3VyY2VzLmJpbmQoKHNvdXJjZXNNYXBba2V5XSA9IFtkZXNjLmdldC5iaW5kKHNvdXJjZSldKSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICA6IGRlc2MudmFsdWUgIT09IHVuZGVmaW5lZFxuICAgICAgICAgID8gZGVzY1xuICAgICAgICAgIDogdW5kZWZpbmVkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3Qgc291cmNlcyA9IHNvdXJjZXNNYXBba2V5XTtcbiAgICAgICAgaWYgKHNvdXJjZXMpIHtcbiAgICAgICAgICBpZiAoZGVzYy5nZXQpIHNvdXJjZXMucHVzaChkZXNjLmdldC5iaW5kKHNvdXJjZSkpO1xuICAgICAgICAgIGVsc2UgaWYgKGRlc2MudmFsdWUgIT09IHVuZGVmaW5lZCkgc291cmNlcy5wdXNoKCgpID0+IGRlc2MudmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGNvbnN0IHRhcmdldCA9IHt9O1xuICBjb25zdCBkZWZpbmVkS2V5cyA9IE9iamVjdC5rZXlzKGRlZmluZWQpO1xuICBmb3IgKGxldCBpID0gZGVmaW5lZEtleXMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBjb25zdCBrZXkgPSBkZWZpbmVkS2V5c1tpXSxcbiAgICAgIGRlc2MgPSBkZWZpbmVkW2tleV07XG4gICAgaWYgKGRlc2MgJiYgZGVzYy5nZXQpIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgZGVzYyk7XG4gICAgZWxzZSB0YXJnZXRba2V5XSA9IGRlc2MgPyBkZXNjLnZhbHVlIDogdW5kZWZpbmVkO1xuICB9XG4gIHJldHVybiB0YXJnZXQ7XG59XG5mdW5jdGlvbiBzcGxpdFByb3BzKHByb3BzLCAuLi5rZXlzKSB7XG4gIGlmICgkUFJPWFkgaW4gcHJvcHMpIHtcbiAgICBjb25zdCBibG9ja2VkID0gbmV3IFNldChrZXlzLmxlbmd0aCA+IDEgPyBrZXlzLmZsYXQoKSA6IGtleXNbMF0pO1xuICAgIGNvbnN0IHJlcyA9IGtleXMubWFwKGsgPT4ge1xuICAgICAgcmV0dXJuIG5ldyBQcm94eShcbiAgICAgICAge1xuICAgICAgICAgIGdldChwcm9wZXJ0eSkge1xuICAgICAgICAgICAgcmV0dXJuIGsuaW5jbHVkZXMocHJvcGVydHkpID8gcHJvcHNbcHJvcGVydHldIDogdW5kZWZpbmVkO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgaGFzKHByb3BlcnR5KSB7XG4gICAgICAgICAgICByZXR1cm4gay5pbmNsdWRlcyhwcm9wZXJ0eSkgJiYgcHJvcGVydHkgaW4gcHJvcHM7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBrZXlzKCkge1xuICAgICAgICAgICAgcmV0dXJuIGsuZmlsdGVyKHByb3BlcnR5ID0+IHByb3BlcnR5IGluIHByb3BzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHByb3BUcmFwc1xuICAgICAgKTtcbiAgICB9KTtcbiAgICByZXMucHVzaChcbiAgICAgIG5ldyBQcm94eShcbiAgICAgICAge1xuICAgICAgICAgIGdldChwcm9wZXJ0eSkge1xuICAgICAgICAgICAgcmV0dXJuIGJsb2NrZWQuaGFzKHByb3BlcnR5KSA/IHVuZGVmaW5lZCA6IHByb3BzW3Byb3BlcnR5XTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGhhcyhwcm9wZXJ0eSkge1xuICAgICAgICAgICAgcmV0dXJuIGJsb2NrZWQuaGFzKHByb3BlcnR5KSA/IGZhbHNlIDogcHJvcGVydHkgaW4gcHJvcHM7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBrZXlzKCkge1xuICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHByb3BzKS5maWx0ZXIoayA9PiAhYmxvY2tlZC5oYXMoaykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgcHJvcFRyYXBzXG4gICAgICApXG4gICAgKTtcbiAgICByZXR1cm4gcmVzO1xuICB9XG4gIGNvbnN0IG90aGVyT2JqZWN0ID0ge307XG4gIGNvbnN0IG9iamVjdHMgPSBrZXlzLm1hcCgoKSA9PiAoe30pKTtcbiAgZm9yIChjb25zdCBwcm9wTmFtZSBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhwcm9wcykpIHtcbiAgICBjb25zdCBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihwcm9wcywgcHJvcE5hbWUpO1xuICAgIGNvbnN0IGlzRGVmYXVsdERlc2MgPVxuICAgICAgIWRlc2MuZ2V0ICYmICFkZXNjLnNldCAmJiBkZXNjLmVudW1lcmFibGUgJiYgZGVzYy53cml0YWJsZSAmJiBkZXNjLmNvbmZpZ3VyYWJsZTtcbiAgICBsZXQgYmxvY2tlZCA9IGZhbHNlO1xuICAgIGxldCBvYmplY3RJbmRleCA9IDA7XG4gICAgZm9yIChjb25zdCBrIG9mIGtleXMpIHtcbiAgICAgIGlmIChrLmluY2x1ZGVzKHByb3BOYW1lKSkge1xuICAgICAgICBibG9ja2VkID0gdHJ1ZTtcbiAgICAgICAgaXNEZWZhdWx0RGVzY1xuICAgICAgICAgID8gKG9iamVjdHNbb2JqZWN0SW5kZXhdW3Byb3BOYW1lXSA9IGRlc2MudmFsdWUpXG4gICAgICAgICAgOiBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0c1tvYmplY3RJbmRleF0sIHByb3BOYW1lLCBkZXNjKTtcbiAgICAgIH1cbiAgICAgICsrb2JqZWN0SW5kZXg7XG4gICAgfVxuICAgIGlmICghYmxvY2tlZCkge1xuICAgICAgaXNEZWZhdWx0RGVzY1xuICAgICAgICA/IChvdGhlck9iamVjdFtwcm9wTmFtZV0gPSBkZXNjLnZhbHVlKVxuICAgICAgICA6IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvdGhlck9iamVjdCwgcHJvcE5hbWUsIGRlc2MpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gWy4uLm9iamVjdHMsIG90aGVyT2JqZWN0XTtcbn1cbmZ1bmN0aW9uIGxhenkoZm4pIHtcbiAgbGV0IGNvbXA7XG4gIGxldCBwO1xuICBjb25zdCB3cmFwID0gcHJvcHMgPT4ge1xuICAgIGNvbnN0IGN0eCA9IHNoYXJlZENvbmZpZy5jb250ZXh0O1xuICAgIGlmIChjdHgpIHtcbiAgICAgIGNvbnN0IFtzLCBzZXRdID0gY3JlYXRlU2lnbmFsKCk7XG4gICAgICBzaGFyZWRDb25maWcuY291bnQgfHwgKHNoYXJlZENvbmZpZy5jb3VudCA9IDApO1xuICAgICAgc2hhcmVkQ29uZmlnLmNvdW50Kys7XG4gICAgICAocCB8fCAocCA9IGZuKCkpKS50aGVuKG1vZCA9PiB7XG4gICAgICAgIHNldEh5ZHJhdGVDb250ZXh0KGN0eCk7XG4gICAgICAgIHNoYXJlZENvbmZpZy5jb3VudC0tO1xuICAgICAgICBzZXQoKCkgPT4gbW9kLmRlZmF1bHQpO1xuICAgICAgICBzZXRIeWRyYXRlQ29udGV4dCgpO1xuICAgICAgfSk7XG4gICAgICBjb21wID0gcztcbiAgICB9IGVsc2UgaWYgKCFjb21wKSB7XG4gICAgICBjb25zdCBbc10gPSBjcmVhdGVSZXNvdXJjZSgoKSA9PiAocCB8fCAocCA9IGZuKCkpKS50aGVuKG1vZCA9PiBtb2QuZGVmYXVsdCkpO1xuICAgICAgY29tcCA9IHM7XG4gICAgfVxuICAgIGxldCBDb21wO1xuICAgIHJldHVybiBjcmVhdGVNZW1vKFxuICAgICAgKCkgPT5cbiAgICAgICAgKENvbXAgPSBjb21wKCkpICYmXG4gICAgICAgIHVudHJhY2soKCkgPT4ge1xuICAgICAgICAgIGlmIChmYWxzZSk7XG4gICAgICAgICAgaWYgKCFjdHgpIHJldHVybiBDb21wKHByb3BzKTtcbiAgICAgICAgICBjb25zdCBjID0gc2hhcmVkQ29uZmlnLmNvbnRleHQ7XG4gICAgICAgICAgc2V0SHlkcmF0ZUNvbnRleHQoY3R4KTtcbiAgICAgICAgICBjb25zdCByID0gQ29tcChwcm9wcyk7XG4gICAgICAgICAgc2V0SHlkcmF0ZUNvbnRleHQoYyk7XG4gICAgICAgICAgcmV0dXJuIHI7XG4gICAgICAgIH0pXG4gICAgKTtcbiAgfTtcbiAgd3JhcC5wcmVsb2FkID0gKCkgPT4gcCB8fCAoKHAgPSBmbigpKS50aGVuKG1vZCA9PiAoY29tcCA9ICgpID0+IG1vZC5kZWZhdWx0KSksIHApO1xuICByZXR1cm4gd3JhcDtcbn1cbmxldCBjb3VudGVyID0gMDtcbmZ1bmN0aW9uIGNyZWF0ZVVuaXF1ZUlkKCkge1xuICBjb25zdCBjdHggPSBzaGFyZWRDb25maWcuY29udGV4dDtcbiAgcmV0dXJuIGN0eCA/IGAke2N0eC5pZH0ke2N0eC5jb3VudCsrfWAgOiBgY2wtJHtjb3VudGVyKyt9YDtcbn1cblxuY29uc3QgbmFycm93ZWRFcnJvciA9IG5hbWUgPT4gYFN0YWxlIHJlYWQgZnJvbSA8JHtuYW1lfT4uYDtcbmZ1bmN0aW9uIEZvcihwcm9wcykge1xuICBjb25zdCBmYWxsYmFjayA9IFwiZmFsbGJhY2tcIiBpbiBwcm9wcyAmJiB7XG4gICAgZmFsbGJhY2s6ICgpID0+IHByb3BzLmZhbGxiYWNrXG4gIH07XG4gIHJldHVybiBjcmVhdGVNZW1vKG1hcEFycmF5KCgpID0+IHByb3BzLmVhY2gsIHByb3BzLmNoaWxkcmVuLCBmYWxsYmFjayB8fCB1bmRlZmluZWQpKTtcbn1cbmZ1bmN0aW9uIEluZGV4KHByb3BzKSB7XG4gIGNvbnN0IGZhbGxiYWNrID0gXCJmYWxsYmFja1wiIGluIHByb3BzICYmIHtcbiAgICBmYWxsYmFjazogKCkgPT4gcHJvcHMuZmFsbGJhY2tcbiAgfTtcbiAgcmV0dXJuIGNyZWF0ZU1lbW8oaW5kZXhBcnJheSgoKSA9PiBwcm9wcy5lYWNoLCBwcm9wcy5jaGlsZHJlbiwgZmFsbGJhY2sgfHwgdW5kZWZpbmVkKSk7XG59XG5mdW5jdGlvbiBTaG93KHByb3BzKSB7XG4gIGNvbnN0IGtleWVkID0gcHJvcHMua2V5ZWQ7XG4gIGNvbnN0IGNvbmRpdGlvbiA9IGNyZWF0ZU1lbW8oKCkgPT4gcHJvcHMud2hlbiwgdW5kZWZpbmVkLCB7XG4gICAgZXF1YWxzOiAoYSwgYikgPT4gKGtleWVkID8gYSA9PT0gYiA6ICFhID09PSAhYilcbiAgfSk7XG4gIHJldHVybiBjcmVhdGVNZW1vKFxuICAgICgpID0+IHtcbiAgICAgIGNvbnN0IGMgPSBjb25kaXRpb24oKTtcbiAgICAgIGlmIChjKSB7XG4gICAgICAgIGNvbnN0IGNoaWxkID0gcHJvcHMuY2hpbGRyZW47XG4gICAgICAgIGNvbnN0IGZuID0gdHlwZW9mIGNoaWxkID09PSBcImZ1bmN0aW9uXCIgJiYgY2hpbGQubGVuZ3RoID4gMDtcbiAgICAgICAgcmV0dXJuIGZuXG4gICAgICAgICAgPyB1bnRyYWNrKCgpID0+XG4gICAgICAgICAgICAgIGNoaWxkKFxuICAgICAgICAgICAgICAgIGtleWVkXG4gICAgICAgICAgICAgICAgICA/IGNcbiAgICAgICAgICAgICAgICAgIDogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgIGlmICghdW50cmFjayhjb25kaXRpb24pKSB0aHJvdyBuYXJyb3dlZEVycm9yKFwiU2hvd1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcHJvcHMud2hlbjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICApXG4gICAgICAgICAgICApXG4gICAgICAgICAgOiBjaGlsZDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwcm9wcy5mYWxsYmFjaztcbiAgICB9LFxuICAgIHVuZGVmaW5lZCxcbiAgICB1bmRlZmluZWRcbiAgKTtcbn1cbmZ1bmN0aW9uIFN3aXRjaChwcm9wcykge1xuICBsZXQga2V5ZWQgPSBmYWxzZTtcbiAgY29uc3QgZXF1YWxzID0gKGEsIGIpID0+IChrZXllZCA/IGFbMV0gPT09IGJbMV0gOiAhYVsxXSA9PT0gIWJbMV0pICYmIGFbMl0gPT09IGJbMl07XG4gIGNvbnN0IGNvbmRpdGlvbnMgPSBjaGlsZHJlbigoKSA9PiBwcm9wcy5jaGlsZHJlbiksXG4gICAgZXZhbENvbmRpdGlvbnMgPSBjcmVhdGVNZW1vKFxuICAgICAgKCkgPT4ge1xuICAgICAgICBsZXQgY29uZHMgPSBjb25kaXRpb25zKCk7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShjb25kcykpIGNvbmRzID0gW2NvbmRzXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb25kcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGNvbnN0IGMgPSBjb25kc1tpXS53aGVuO1xuICAgICAgICAgIGlmIChjKSB7XG4gICAgICAgICAgICBrZXllZCA9ICEhY29uZHNbaV0ua2V5ZWQ7XG4gICAgICAgICAgICByZXR1cm4gW2ksIGMsIGNvbmRzW2ldXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFstMV07XG4gICAgICB9LFxuICAgICAgdW5kZWZpbmVkLFxuICAgICAge1xuICAgICAgICBlcXVhbHNcbiAgICAgIH1cbiAgICApO1xuICByZXR1cm4gY3JlYXRlTWVtbyhcbiAgICAoKSA9PiB7XG4gICAgICBjb25zdCBbaW5kZXgsIHdoZW4sIGNvbmRdID0gZXZhbENvbmRpdGlvbnMoKTtcbiAgICAgIGlmIChpbmRleCA8IDApIHJldHVybiBwcm9wcy5mYWxsYmFjaztcbiAgICAgIGNvbnN0IGMgPSBjb25kLmNoaWxkcmVuO1xuICAgICAgY29uc3QgZm4gPSB0eXBlb2YgYyA9PT0gXCJmdW5jdGlvblwiICYmIGMubGVuZ3RoID4gMDtcbiAgICAgIHJldHVybiBmblxuICAgICAgICA/IHVudHJhY2soKCkgPT5cbiAgICAgICAgICAgIGMoXG4gICAgICAgICAgICAgIGtleWVkXG4gICAgICAgICAgICAgICAgPyB3aGVuXG4gICAgICAgICAgICAgICAgOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh1bnRyYWNrKGV2YWxDb25kaXRpb25zKVswXSAhPT0gaW5kZXgpIHRocm93IG5hcnJvd2VkRXJyb3IoXCJNYXRjaFwiKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvbmQud2hlbjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIClcbiAgICAgICAgICApXG4gICAgICAgIDogYztcbiAgICB9LFxuICAgIHVuZGVmaW5lZCxcbiAgICB1bmRlZmluZWRcbiAgKTtcbn1cbmZ1bmN0aW9uIE1hdGNoKHByb3BzKSB7XG4gIHJldHVybiBwcm9wcztcbn1cbmxldCBFcnJvcnM7XG5mdW5jdGlvbiByZXNldEVycm9yQm91bmRhcmllcygpIHtcbiAgRXJyb3JzICYmIFsuLi5FcnJvcnNdLmZvckVhY2goZm4gPT4gZm4oKSk7XG59XG5mdW5jdGlvbiBFcnJvckJvdW5kYXJ5KHByb3BzKSB7XG4gIGxldCBlcnI7XG4gIGlmIChzaGFyZWRDb25maWcuY29udGV4dCAmJiBzaGFyZWRDb25maWcubG9hZClcbiAgICBlcnIgPSBzaGFyZWRDb25maWcubG9hZChzaGFyZWRDb25maWcuY29udGV4dC5pZCArIHNoYXJlZENvbmZpZy5jb250ZXh0LmNvdW50KTtcbiAgY29uc3QgW2Vycm9yZWQsIHNldEVycm9yZWRdID0gY3JlYXRlU2lnbmFsKGVyciwgdW5kZWZpbmVkKTtcbiAgRXJyb3JzIHx8IChFcnJvcnMgPSBuZXcgU2V0KCkpO1xuICBFcnJvcnMuYWRkKHNldEVycm9yZWQpO1xuICBvbkNsZWFudXAoKCkgPT4gRXJyb3JzLmRlbGV0ZShzZXRFcnJvcmVkKSk7XG4gIHJldHVybiBjcmVhdGVNZW1vKFxuICAgICgpID0+IHtcbiAgICAgIGxldCBlO1xuICAgICAgaWYgKChlID0gZXJyb3JlZCgpKSkge1xuICAgICAgICBjb25zdCBmID0gcHJvcHMuZmFsbGJhY2s7XG4gICAgICAgIHJldHVybiB0eXBlb2YgZiA9PT0gXCJmdW5jdGlvblwiICYmIGYubGVuZ3RoID8gdW50cmFjaygoKSA9PiBmKGUsICgpID0+IHNldEVycm9yZWQoKSkpIDogZjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjYXRjaEVycm9yKCgpID0+IHByb3BzLmNoaWxkcmVuLCBzZXRFcnJvcmVkKTtcbiAgICB9LFxuICAgIHVuZGVmaW5lZCxcbiAgICB1bmRlZmluZWRcbiAgKTtcbn1cblxuY29uc3Qgc3VzcGVuc2VMaXN0RXF1YWxzID0gKGEsIGIpID0+XG4gIGEuc2hvd0NvbnRlbnQgPT09IGIuc2hvd0NvbnRlbnQgJiYgYS5zaG93RmFsbGJhY2sgPT09IGIuc2hvd0ZhbGxiYWNrO1xuY29uc3QgU3VzcGVuc2VMaXN0Q29udGV4dCA9IGNyZWF0ZUNvbnRleHQoKTtcbmZ1bmN0aW9uIFN1c3BlbnNlTGlzdChwcm9wcykge1xuICBsZXQgW3dyYXBwZXIsIHNldFdyYXBwZXJdID0gY3JlYXRlU2lnbmFsKCgpID0+ICh7XG4gICAgICBpbkZhbGxiYWNrOiBmYWxzZVxuICAgIH0pKSxcbiAgICBzaG93O1xuICBjb25zdCBsaXN0Q29udGV4dCA9IHVzZUNvbnRleHQoU3VzcGVuc2VMaXN0Q29udGV4dCk7XG4gIGNvbnN0IFtyZWdpc3RyeSwgc2V0UmVnaXN0cnldID0gY3JlYXRlU2lnbmFsKFtdKTtcbiAgaWYgKGxpc3RDb250ZXh0KSB7XG4gICAgc2hvdyA9IGxpc3RDb250ZXh0LnJlZ2lzdGVyKGNyZWF0ZU1lbW8oKCkgPT4gd3JhcHBlcigpKCkuaW5GYWxsYmFjaykpO1xuICB9XG4gIGNvbnN0IHJlc29sdmVkID0gY3JlYXRlTWVtbyhcbiAgICBwcmV2ID0+IHtcbiAgICAgIGNvbnN0IHJldmVhbCA9IHByb3BzLnJldmVhbE9yZGVyLFxuICAgICAgICB0YWlsID0gcHJvcHMudGFpbCxcbiAgICAgICAgeyBzaG93Q29udGVudCA9IHRydWUsIHNob3dGYWxsYmFjayA9IHRydWUgfSA9IHNob3cgPyBzaG93KCkgOiB7fSxcbiAgICAgICAgcmVnID0gcmVnaXN0cnkoKSxcbiAgICAgICAgcmV2ZXJzZSA9IHJldmVhbCA9PT0gXCJiYWNrd2FyZHNcIjtcbiAgICAgIGlmIChyZXZlYWwgPT09IFwidG9nZXRoZXJcIikge1xuICAgICAgICBjb25zdCBhbGwgPSByZWcuZXZlcnkoaW5GYWxsYmFjayA9PiAhaW5GYWxsYmFjaygpKTtcbiAgICAgICAgY29uc3QgcmVzID0gcmVnLm1hcCgoKSA9PiAoe1xuICAgICAgICAgIHNob3dDb250ZW50OiBhbGwgJiYgc2hvd0NvbnRlbnQsXG4gICAgICAgICAgc2hvd0ZhbGxiYWNrXG4gICAgICAgIH0pKTtcbiAgICAgICAgcmVzLmluRmFsbGJhY2sgPSAhYWxsO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgfVxuICAgICAgbGV0IHN0b3AgPSBmYWxzZTtcbiAgICAgIGxldCBpbkZhbGxiYWNrID0gcHJldi5pbkZhbGxiYWNrO1xuICAgICAgY29uc3QgcmVzID0gW107XG4gICAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gcmVnLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGNvbnN0IG4gPSByZXZlcnNlID8gbGVuIC0gaSAtIDEgOiBpLFxuICAgICAgICAgIHMgPSByZWdbbl0oKTtcbiAgICAgICAgaWYgKCFzdG9wICYmICFzKSB7XG4gICAgICAgICAgcmVzW25dID0ge1xuICAgICAgICAgICAgc2hvd0NvbnRlbnQsXG4gICAgICAgICAgICBzaG93RmFsbGJhY2tcbiAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IG5leHQgPSAhc3RvcDtcbiAgICAgICAgICBpZiAobmV4dCkgaW5GYWxsYmFjayA9IHRydWU7XG4gICAgICAgICAgcmVzW25dID0ge1xuICAgICAgICAgICAgc2hvd0NvbnRlbnQ6IG5leHQsXG4gICAgICAgICAgICBzaG93RmFsbGJhY2s6ICF0YWlsIHx8IChuZXh0ICYmIHRhaWwgPT09IFwiY29sbGFwc2VkXCIpID8gc2hvd0ZhbGxiYWNrIDogZmFsc2VcbiAgICAgICAgICB9O1xuICAgICAgICAgIHN0b3AgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoIXN0b3ApIGluRmFsbGJhY2sgPSBmYWxzZTtcbiAgICAgIHJlcy5pbkZhbGxiYWNrID0gaW5GYWxsYmFjaztcbiAgICAgIHJldHVybiByZXM7XG4gICAgfSxcbiAgICB7XG4gICAgICBpbkZhbGxiYWNrOiBmYWxzZVxuICAgIH1cbiAgKTtcbiAgc2V0V3JhcHBlcigoKSA9PiByZXNvbHZlZCk7XG4gIHJldHVybiBjcmVhdGVDb21wb25lbnQoU3VzcGVuc2VMaXN0Q29udGV4dC5Qcm92aWRlciwge1xuICAgIHZhbHVlOiB7XG4gICAgICByZWdpc3RlcjogaW5GYWxsYmFjayA9PiB7XG4gICAgICAgIGxldCBpbmRleDtcbiAgICAgICAgc2V0UmVnaXN0cnkocmVnaXN0cnkgPT4ge1xuICAgICAgICAgIGluZGV4ID0gcmVnaXN0cnkubGVuZ3RoO1xuICAgICAgICAgIHJldHVybiBbLi4ucmVnaXN0cnksIGluRmFsbGJhY2tdO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZU1lbW8oKCkgPT4gcmVzb2x2ZWQoKVtpbmRleF0sIHVuZGVmaW5lZCwge1xuICAgICAgICAgIGVxdWFsczogc3VzcGVuc2VMaXN0RXF1YWxzXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0sXG4gICAgZ2V0IGNoaWxkcmVuKCkge1xuICAgICAgcmV0dXJuIHByb3BzLmNoaWxkcmVuO1xuICAgIH1cbiAgfSk7XG59XG5mdW5jdGlvbiBTdXNwZW5zZShwcm9wcykge1xuICBsZXQgY291bnRlciA9IDAsXG4gICAgc2hvdyxcbiAgICBjdHgsXG4gICAgcCxcbiAgICBmbGlja2VyLFxuICAgIGVycm9yO1xuICBjb25zdCBbaW5GYWxsYmFjaywgc2V0RmFsbGJhY2tdID0gY3JlYXRlU2lnbmFsKGZhbHNlKSxcbiAgICBTdXNwZW5zZUNvbnRleHQgPSBnZXRTdXNwZW5zZUNvbnRleHQoKSxcbiAgICBzdG9yZSA9IHtcbiAgICAgIGluY3JlbWVudDogKCkgPT4ge1xuICAgICAgICBpZiAoKytjb3VudGVyID09PSAxKSBzZXRGYWxsYmFjayh0cnVlKTtcbiAgICAgIH0sXG4gICAgICBkZWNyZW1lbnQ6ICgpID0+IHtcbiAgICAgICAgaWYgKC0tY291bnRlciA9PT0gMCkgc2V0RmFsbGJhY2soZmFsc2UpO1xuICAgICAgfSxcbiAgICAgIGluRmFsbGJhY2ssXG4gICAgICBlZmZlY3RzOiBbXSxcbiAgICAgIHJlc29sdmVkOiBmYWxzZVxuICAgIH0sXG4gICAgb3duZXIgPSBnZXRPd25lcigpO1xuICBpZiAoc2hhcmVkQ29uZmlnLmNvbnRleHQgJiYgc2hhcmVkQ29uZmlnLmxvYWQpIHtcbiAgICBjb25zdCBrZXkgPSBzaGFyZWRDb25maWcuY29udGV4dC5pZCArIHNoYXJlZENvbmZpZy5jb250ZXh0LmNvdW50O1xuICAgIGxldCByZWYgPSBzaGFyZWRDb25maWcubG9hZChrZXkpO1xuICAgIGlmIChyZWYpIHtcbiAgICAgIGlmICh0eXBlb2YgcmVmICE9PSBcIm9iamVjdFwiIHx8IHJlZi5zdGF0dXMgIT09IFwic3VjY2Vzc1wiKSBwID0gcmVmO1xuICAgICAgZWxzZSBzaGFyZWRDb25maWcuZ2F0aGVyKGtleSk7XG4gICAgfVxuICAgIGlmIChwICYmIHAgIT09IFwiJCRmXCIpIHtcbiAgICAgIGNvbnN0IFtzLCBzZXRdID0gY3JlYXRlU2lnbmFsKHVuZGVmaW5lZCwge1xuICAgICAgICBlcXVhbHM6IGZhbHNlXG4gICAgICB9KTtcbiAgICAgIGZsaWNrZXIgPSBzO1xuICAgICAgcC50aGVuKFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgaWYgKHNoYXJlZENvbmZpZy5kb25lKSByZXR1cm4gc2V0KCk7XG4gICAgICAgICAgc2hhcmVkQ29uZmlnLmdhdGhlcihrZXkpO1xuICAgICAgICAgIHNldEh5ZHJhdGVDb250ZXh0KGN0eCk7XG4gICAgICAgICAgc2V0KCk7XG4gICAgICAgICAgc2V0SHlkcmF0ZUNvbnRleHQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZXJyID0+IHtcbiAgICAgICAgICBlcnJvciA9IGVycjtcbiAgICAgICAgICBzZXQoKTtcbiAgICAgICAgfVxuICAgICAgKTtcbiAgICB9XG4gIH1cbiAgY29uc3QgbGlzdENvbnRleHQgPSB1c2VDb250ZXh0KFN1c3BlbnNlTGlzdENvbnRleHQpO1xuICBpZiAobGlzdENvbnRleHQpIHNob3cgPSBsaXN0Q29udGV4dC5yZWdpc3RlcihzdG9yZS5pbkZhbGxiYWNrKTtcbiAgbGV0IGRpc3Bvc2U7XG4gIG9uQ2xlYW51cCgoKSA9PiBkaXNwb3NlICYmIGRpc3Bvc2UoKSk7XG4gIHJldHVybiBjcmVhdGVDb21wb25lbnQoU3VzcGVuc2VDb250ZXh0LlByb3ZpZGVyLCB7XG4gICAgdmFsdWU6IHN0b3JlLFxuICAgIGdldCBjaGlsZHJlbigpIHtcbiAgICAgIHJldHVybiBjcmVhdGVNZW1vKCgpID0+IHtcbiAgICAgICAgaWYgKGVycm9yKSB0aHJvdyBlcnJvcjtcbiAgICAgICAgY3R4ID0gc2hhcmVkQ29uZmlnLmNvbnRleHQ7XG4gICAgICAgIGlmIChmbGlja2VyKSB7XG4gICAgICAgICAgZmxpY2tlcigpO1xuICAgICAgICAgIHJldHVybiAoZmxpY2tlciA9IHVuZGVmaW5lZCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGN0eCAmJiBwID09PSBcIiQkZlwiKSBzZXRIeWRyYXRlQ29udGV4dCgpO1xuICAgICAgICBjb25zdCByZW5kZXJlZCA9IGNyZWF0ZU1lbW8oKCkgPT4gcHJvcHMuY2hpbGRyZW4pO1xuICAgICAgICByZXR1cm4gY3JlYXRlTWVtbyhwcmV2ID0+IHtcbiAgICAgICAgICBjb25zdCBpbkZhbGxiYWNrID0gc3RvcmUuaW5GYWxsYmFjaygpLFxuICAgICAgICAgICAgeyBzaG93Q29udGVudCA9IHRydWUsIHNob3dGYWxsYmFjayA9IHRydWUgfSA9IHNob3cgPyBzaG93KCkgOiB7fTtcbiAgICAgICAgICBpZiAoKCFpbkZhbGxiYWNrIHx8IChwICYmIHAgIT09IFwiJCRmXCIpKSAmJiBzaG93Q29udGVudCkge1xuICAgICAgICAgICAgc3RvcmUucmVzb2x2ZWQgPSB0cnVlO1xuICAgICAgICAgICAgZGlzcG9zZSAmJiBkaXNwb3NlKCk7XG4gICAgICAgICAgICBkaXNwb3NlID0gY3R4ID0gcCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHJlc3VtZUVmZmVjdHMoc3RvcmUuZWZmZWN0cyk7XG4gICAgICAgICAgICByZXR1cm4gcmVuZGVyZWQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFzaG93RmFsbGJhY2spIHJldHVybjtcbiAgICAgICAgICBpZiAoZGlzcG9zZSkgcmV0dXJuIHByZXY7XG4gICAgICAgICAgcmV0dXJuIGNyZWF0ZVJvb3QoZGlzcG9zZXIgPT4ge1xuICAgICAgICAgICAgZGlzcG9zZSA9IGRpc3Bvc2VyO1xuICAgICAgICAgICAgaWYgKGN0eCkge1xuICAgICAgICAgICAgICBzZXRIeWRyYXRlQ29udGV4dCh7XG4gICAgICAgICAgICAgICAgaWQ6IGN0eC5pZCArIFwiZlwiLFxuICAgICAgICAgICAgICAgIGNvdW50OiAwXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICBjdHggPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcHJvcHMuZmFsbGJhY2s7XG4gICAgICAgICAgfSwgb3duZXIpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG59XG5cbmNvbnN0IERFViA9IHVuZGVmaW5lZDtcblxuZXhwb3J0IHtcbiAgJERFVkNPTVAsXG4gICRQUk9YWSxcbiAgJFRSQUNLLFxuICBERVYsXG4gIEVycm9yQm91bmRhcnksXG4gIEZvcixcbiAgSW5kZXgsXG4gIE1hdGNoLFxuICBTaG93LFxuICBTdXNwZW5zZSxcbiAgU3VzcGVuc2VMaXN0LFxuICBTd2l0Y2gsXG4gIGJhdGNoLFxuICBjYW5jZWxDYWxsYmFjayxcbiAgY2F0Y2hFcnJvcixcbiAgY2hpbGRyZW4sXG4gIGNyZWF0ZUNvbXBvbmVudCxcbiAgY3JlYXRlQ29tcHV0ZWQsXG4gIGNyZWF0ZUNvbnRleHQsXG4gIGNyZWF0ZURlZmVycmVkLFxuICBjcmVhdGVFZmZlY3QsXG4gIGNyZWF0ZU1lbW8sXG4gIGNyZWF0ZVJlYWN0aW9uLFxuICBjcmVhdGVSZW5kZXJFZmZlY3QsXG4gIGNyZWF0ZVJlc291cmNlLFxuICBjcmVhdGVSb290LFxuICBjcmVhdGVTZWxlY3RvcixcbiAgY3JlYXRlU2lnbmFsLFxuICBjcmVhdGVVbmlxdWVJZCxcbiAgZW5hYmxlRXh0ZXJuYWxTb3VyY2UsXG4gIGVuYWJsZUh5ZHJhdGlvbixcbiAgZW5hYmxlU2NoZWR1bGluZyxcbiAgZXF1YWxGbixcbiAgZnJvbSxcbiAgZ2V0TGlzdGVuZXIsXG4gIGdldE93bmVyLFxuICBpbmRleEFycmF5LFxuICBsYXp5LFxuICBtYXBBcnJheSxcbiAgbWVyZ2VQcm9wcyxcbiAgb2JzZXJ2YWJsZSxcbiAgb24sXG4gIG9uQ2xlYW51cCxcbiAgb25FcnJvcixcbiAgb25Nb3VudCxcbiAgcmVxdWVzdENhbGxiYWNrLFxuICByZXNldEVycm9yQm91bmRhcmllcyxcbiAgcnVuV2l0aE93bmVyLFxuICBzaGFyZWRDb25maWcsXG4gIHNwbGl0UHJvcHMsXG4gIHN0YXJ0VHJhbnNpdGlvbixcbiAgdW50cmFjayxcbiAgdXNlQ29udGV4dCxcbiAgdXNlVHJhbnNpdGlvblxufTtcbiIsICJpbXBvcnQge1xuICBjcmVhdGVSb290LFxuICBzaGFyZWRDb25maWcsXG4gIGNyZWF0ZVJlbmRlckVmZmVjdCxcbiAgdW50cmFjayxcbiAgZW5hYmxlSHlkcmF0aW9uLFxuICBnZXRPd25lcixcbiAgY3JlYXRlRWZmZWN0LFxuICBydW5XaXRoT3duZXIsXG4gIGNyZWF0ZU1lbW8sXG4gIGNyZWF0ZVNpZ25hbCxcbiAgb25DbGVhbnVwLFxuICBzcGxpdFByb3BzXG59IGZyb20gXCJzb2xpZC1qc1wiO1xuZXhwb3J0IHtcbiAgRXJyb3JCb3VuZGFyeSxcbiAgRm9yLFxuICBJbmRleCxcbiAgTWF0Y2gsXG4gIFNob3csXG4gIFN1c3BlbnNlLFxuICBTdXNwZW5zZUxpc3QsXG4gIFN3aXRjaCxcbiAgY3JlYXRlQ29tcG9uZW50LFxuICBjcmVhdGVSZW5kZXJFZmZlY3QgYXMgZWZmZWN0LFxuICBnZXRPd25lcixcbiAgY3JlYXRlTWVtbyBhcyBtZW1vLFxuICBtZXJnZVByb3BzLFxuICB1bnRyYWNrXG59IGZyb20gXCJzb2xpZC1qc1wiO1xuXG5jb25zdCBib29sZWFucyA9IFtcbiAgXCJhbGxvd2Z1bGxzY3JlZW5cIixcbiAgXCJhc3luY1wiLFxuICBcImF1dG9mb2N1c1wiLFxuICBcImF1dG9wbGF5XCIsXG4gIFwiY2hlY2tlZFwiLFxuICBcImNvbnRyb2xzXCIsXG4gIFwiZGVmYXVsdFwiLFxuICBcImRpc2FibGVkXCIsXG4gIFwiZm9ybW5vdmFsaWRhdGVcIixcbiAgXCJoaWRkZW5cIixcbiAgXCJpbmRldGVybWluYXRlXCIsXG4gIFwiaW5lcnRcIixcbiAgXCJpc21hcFwiLFxuICBcImxvb3BcIixcbiAgXCJtdWx0aXBsZVwiLFxuICBcIm11dGVkXCIsXG4gIFwibm9tb2R1bGVcIixcbiAgXCJub3ZhbGlkYXRlXCIsXG4gIFwib3BlblwiLFxuICBcInBsYXlzaW5saW5lXCIsXG4gIFwicmVhZG9ubHlcIixcbiAgXCJyZXF1aXJlZFwiLFxuICBcInJldmVyc2VkXCIsXG4gIFwic2VhbWxlc3NcIixcbiAgXCJzZWxlY3RlZFwiXG5dO1xuY29uc3QgUHJvcGVydGllcyA9IC8qI19fUFVSRV9fKi8gbmV3IFNldChbXG4gIFwiY2xhc3NOYW1lXCIsXG4gIFwidmFsdWVcIixcbiAgXCJyZWFkT25seVwiLFxuICBcImZvcm1Ob1ZhbGlkYXRlXCIsXG4gIFwiaXNNYXBcIixcbiAgXCJub01vZHVsZVwiLFxuICBcInBsYXlzSW5saW5lXCIsXG4gIC4uLmJvb2xlYW5zXG5dKTtcbmNvbnN0IENoaWxkUHJvcGVydGllcyA9IC8qI19fUFVSRV9fKi8gbmV3IFNldChbXG4gIFwiaW5uZXJIVE1MXCIsXG4gIFwidGV4dENvbnRlbnRcIixcbiAgXCJpbm5lclRleHRcIixcbiAgXCJjaGlsZHJlblwiXG5dKTtcbmNvbnN0IEFsaWFzZXMgPSAvKiNfX1BVUkVfXyovIE9iamVjdC5hc3NpZ24oT2JqZWN0LmNyZWF0ZShudWxsKSwge1xuICBjbGFzc05hbWU6IFwiY2xhc3NcIixcbiAgaHRtbEZvcjogXCJmb3JcIlxufSk7XG5jb25zdCBQcm9wQWxpYXNlcyA9IC8qI19fUFVSRV9fKi8gT2JqZWN0LmFzc2lnbihPYmplY3QuY3JlYXRlKG51bGwpLCB7XG4gIGNsYXNzOiBcImNsYXNzTmFtZVwiLFxuICBmb3Jtbm92YWxpZGF0ZToge1xuICAgICQ6IFwiZm9ybU5vVmFsaWRhdGVcIixcbiAgICBCVVRUT046IDEsXG4gICAgSU5QVVQ6IDFcbiAgfSxcbiAgaXNtYXA6IHtcbiAgICAkOiBcImlzTWFwXCIsXG4gICAgSU1HOiAxXG4gIH0sXG4gIG5vbW9kdWxlOiB7XG4gICAgJDogXCJub01vZHVsZVwiLFxuICAgIFNDUklQVDogMVxuICB9LFxuICBwbGF5c2lubGluZToge1xuICAgICQ6IFwicGxheXNJbmxpbmVcIixcbiAgICBWSURFTzogMVxuICB9LFxuICByZWFkb25seToge1xuICAgICQ6IFwicmVhZE9ubHlcIixcbiAgICBJTlBVVDogMSxcbiAgICBURVhUQVJFQTogMVxuICB9XG59KTtcbmZ1bmN0aW9uIGdldFByb3BBbGlhcyhwcm9wLCB0YWdOYW1lKSB7XG4gIGNvbnN0IGEgPSBQcm9wQWxpYXNlc1twcm9wXTtcbiAgcmV0dXJuIHR5cGVvZiBhID09PSBcIm9iamVjdFwiID8gKGFbdGFnTmFtZV0gPyBhW1wiJFwiXSA6IHVuZGVmaW5lZCkgOiBhO1xufVxuY29uc3QgRGVsZWdhdGVkRXZlbnRzID0gLyojX19QVVJFX18qLyBuZXcgU2V0KFtcbiAgXCJiZWZvcmVpbnB1dFwiLFxuICBcImNsaWNrXCIsXG4gIFwiZGJsY2xpY2tcIixcbiAgXCJjb250ZXh0bWVudVwiLFxuICBcImZvY3VzaW5cIixcbiAgXCJmb2N1c291dFwiLFxuICBcImlucHV0XCIsXG4gIFwia2V5ZG93blwiLFxuICBcImtleXVwXCIsXG4gIFwibW91c2Vkb3duXCIsXG4gIFwibW91c2Vtb3ZlXCIsXG4gIFwibW91c2VvdXRcIixcbiAgXCJtb3VzZW92ZXJcIixcbiAgXCJtb3VzZXVwXCIsXG4gIFwicG9pbnRlcmRvd25cIixcbiAgXCJwb2ludGVybW92ZVwiLFxuICBcInBvaW50ZXJvdXRcIixcbiAgXCJwb2ludGVyb3ZlclwiLFxuICBcInBvaW50ZXJ1cFwiLFxuICBcInRvdWNoZW5kXCIsXG4gIFwidG91Y2htb3ZlXCIsXG4gIFwidG91Y2hzdGFydFwiXG5dKTtcbmNvbnN0IFNWR0VsZW1lbnRzID0gLyojX19QVVJFX18qLyBuZXcgU2V0KFtcbiAgXCJhbHRHbHlwaFwiLFxuICBcImFsdEdseXBoRGVmXCIsXG4gIFwiYWx0R2x5cGhJdGVtXCIsXG4gIFwiYW5pbWF0ZVwiLFxuICBcImFuaW1hdGVDb2xvclwiLFxuICBcImFuaW1hdGVNb3Rpb25cIixcbiAgXCJhbmltYXRlVHJhbnNmb3JtXCIsXG4gIFwiY2lyY2xlXCIsXG4gIFwiY2xpcFBhdGhcIixcbiAgXCJjb2xvci1wcm9maWxlXCIsXG4gIFwiY3Vyc29yXCIsXG4gIFwiZGVmc1wiLFxuICBcImRlc2NcIixcbiAgXCJlbGxpcHNlXCIsXG4gIFwiZmVCbGVuZFwiLFxuICBcImZlQ29sb3JNYXRyaXhcIixcbiAgXCJmZUNvbXBvbmVudFRyYW5zZmVyXCIsXG4gIFwiZmVDb21wb3NpdGVcIixcbiAgXCJmZUNvbnZvbHZlTWF0cml4XCIsXG4gIFwiZmVEaWZmdXNlTGlnaHRpbmdcIixcbiAgXCJmZURpc3BsYWNlbWVudE1hcFwiLFxuICBcImZlRGlzdGFudExpZ2h0XCIsXG4gIFwiZmVEcm9wU2hhZG93XCIsXG4gIFwiZmVGbG9vZFwiLFxuICBcImZlRnVuY0FcIixcbiAgXCJmZUZ1bmNCXCIsXG4gIFwiZmVGdW5jR1wiLFxuICBcImZlRnVuY1JcIixcbiAgXCJmZUdhdXNzaWFuQmx1clwiLFxuICBcImZlSW1hZ2VcIixcbiAgXCJmZU1lcmdlXCIsXG4gIFwiZmVNZXJnZU5vZGVcIixcbiAgXCJmZU1vcnBob2xvZ3lcIixcbiAgXCJmZU9mZnNldFwiLFxuICBcImZlUG9pbnRMaWdodFwiLFxuICBcImZlU3BlY3VsYXJMaWdodGluZ1wiLFxuICBcImZlU3BvdExpZ2h0XCIsXG4gIFwiZmVUaWxlXCIsXG4gIFwiZmVUdXJidWxlbmNlXCIsXG4gIFwiZmlsdGVyXCIsXG4gIFwiZm9udFwiLFxuICBcImZvbnQtZmFjZVwiLFxuICBcImZvbnQtZmFjZS1mb3JtYXRcIixcbiAgXCJmb250LWZhY2UtbmFtZVwiLFxuICBcImZvbnQtZmFjZS1zcmNcIixcbiAgXCJmb250LWZhY2UtdXJpXCIsXG4gIFwiZm9yZWlnbk9iamVjdFwiLFxuICBcImdcIixcbiAgXCJnbHlwaFwiLFxuICBcImdseXBoUmVmXCIsXG4gIFwiaGtlcm5cIixcbiAgXCJpbWFnZVwiLFxuICBcImxpbmVcIixcbiAgXCJsaW5lYXJHcmFkaWVudFwiLFxuICBcIm1hcmtlclwiLFxuICBcIm1hc2tcIixcbiAgXCJtZXRhZGF0YVwiLFxuICBcIm1pc3NpbmctZ2x5cGhcIixcbiAgXCJtcGF0aFwiLFxuICBcInBhdGhcIixcbiAgXCJwYXR0ZXJuXCIsXG4gIFwicG9seWdvblwiLFxuICBcInBvbHlsaW5lXCIsXG4gIFwicmFkaWFsR3JhZGllbnRcIixcbiAgXCJyZWN0XCIsXG4gIFwic2V0XCIsXG4gIFwic3RvcFwiLFxuICBcInN2Z1wiLFxuICBcInN3aXRjaFwiLFxuICBcInN5bWJvbFwiLFxuICBcInRleHRcIixcbiAgXCJ0ZXh0UGF0aFwiLFxuICBcInRyZWZcIixcbiAgXCJ0c3BhblwiLFxuICBcInVzZVwiLFxuICBcInZpZXdcIixcbiAgXCJ2a2VyblwiXG5dKTtcbmNvbnN0IFNWR05hbWVzcGFjZSA9IHtcbiAgeGxpbms6IFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiLFxuICB4bWw6IFwiaHR0cDovL3d3dy53My5vcmcvWE1MLzE5OTgvbmFtZXNwYWNlXCJcbn07XG5jb25zdCBET01FbGVtZW50cyA9IC8qI19fUFVSRV9fKi8gbmV3IFNldChbXG4gIFwiaHRtbFwiLFxuICBcImJhc2VcIixcbiAgXCJoZWFkXCIsXG4gIFwibGlua1wiLFxuICBcIm1ldGFcIixcbiAgXCJzdHlsZVwiLFxuICBcInRpdGxlXCIsXG4gIFwiYm9keVwiLFxuICBcImFkZHJlc3NcIixcbiAgXCJhcnRpY2xlXCIsXG4gIFwiYXNpZGVcIixcbiAgXCJmb290ZXJcIixcbiAgXCJoZWFkZXJcIixcbiAgXCJtYWluXCIsXG4gIFwibmF2XCIsXG4gIFwic2VjdGlvblwiLFxuICBcImJvZHlcIixcbiAgXCJibG9ja3F1b3RlXCIsXG4gIFwiZGRcIixcbiAgXCJkaXZcIixcbiAgXCJkbFwiLFxuICBcImR0XCIsXG4gIFwiZmlnY2FwdGlvblwiLFxuICBcImZpZ3VyZVwiLFxuICBcImhyXCIsXG4gIFwibGlcIixcbiAgXCJvbFwiLFxuICBcInBcIixcbiAgXCJwcmVcIixcbiAgXCJ1bFwiLFxuICBcImFcIixcbiAgXCJhYmJyXCIsXG4gIFwiYlwiLFxuICBcImJkaVwiLFxuICBcImJkb1wiLFxuICBcImJyXCIsXG4gIFwiY2l0ZVwiLFxuICBcImNvZGVcIixcbiAgXCJkYXRhXCIsXG4gIFwiZGZuXCIsXG4gIFwiZW1cIixcbiAgXCJpXCIsXG4gIFwia2JkXCIsXG4gIFwibWFya1wiLFxuICBcInFcIixcbiAgXCJycFwiLFxuICBcInJ0XCIsXG4gIFwicnVieVwiLFxuICBcInNcIixcbiAgXCJzYW1wXCIsXG4gIFwic21hbGxcIixcbiAgXCJzcGFuXCIsXG4gIFwic3Ryb25nXCIsXG4gIFwic3ViXCIsXG4gIFwic3VwXCIsXG4gIFwidGltZVwiLFxuICBcInVcIixcbiAgXCJ2YXJcIixcbiAgXCJ3YnJcIixcbiAgXCJhcmVhXCIsXG4gIFwiYXVkaW9cIixcbiAgXCJpbWdcIixcbiAgXCJtYXBcIixcbiAgXCJ0cmFja1wiLFxuICBcInZpZGVvXCIsXG4gIFwiZW1iZWRcIixcbiAgXCJpZnJhbWVcIixcbiAgXCJvYmplY3RcIixcbiAgXCJwYXJhbVwiLFxuICBcInBpY3R1cmVcIixcbiAgXCJwb3J0YWxcIixcbiAgXCJzb3VyY2VcIixcbiAgXCJzdmdcIixcbiAgXCJtYXRoXCIsXG4gIFwiY2FudmFzXCIsXG4gIFwibm9zY3JpcHRcIixcbiAgXCJzY3JpcHRcIixcbiAgXCJkZWxcIixcbiAgXCJpbnNcIixcbiAgXCJjYXB0aW9uXCIsXG4gIFwiY29sXCIsXG4gIFwiY29sZ3JvdXBcIixcbiAgXCJ0YWJsZVwiLFxuICBcInRib2R5XCIsXG4gIFwidGRcIixcbiAgXCJ0Zm9vdFwiLFxuICBcInRoXCIsXG4gIFwidGhlYWRcIixcbiAgXCJ0clwiLFxuICBcImJ1dHRvblwiLFxuICBcImRhdGFsaXN0XCIsXG4gIFwiZmllbGRzZXRcIixcbiAgXCJmb3JtXCIsXG4gIFwiaW5wdXRcIixcbiAgXCJsYWJlbFwiLFxuICBcImxlZ2VuZFwiLFxuICBcIm1ldGVyXCIsXG4gIFwib3B0Z3JvdXBcIixcbiAgXCJvcHRpb25cIixcbiAgXCJvdXRwdXRcIixcbiAgXCJwcm9ncmVzc1wiLFxuICBcInNlbGVjdFwiLFxuICBcInRleHRhcmVhXCIsXG4gIFwiZGV0YWlsc1wiLFxuICBcImRpYWxvZ1wiLFxuICBcIm1lbnVcIixcbiAgXCJzdW1tYXJ5XCIsXG4gIFwiZGV0YWlsc1wiLFxuICBcInNsb3RcIixcbiAgXCJ0ZW1wbGF0ZVwiLFxuICBcImFjcm9ueW1cIixcbiAgXCJhcHBsZXRcIixcbiAgXCJiYXNlZm9udFwiLFxuICBcImJnc291bmRcIixcbiAgXCJiaWdcIixcbiAgXCJibGlua1wiLFxuICBcImNlbnRlclwiLFxuICBcImNvbnRlbnRcIixcbiAgXCJkaXJcIixcbiAgXCJmb250XCIsXG4gIFwiZnJhbWVcIixcbiAgXCJmcmFtZXNldFwiLFxuICBcImhncm91cFwiLFxuICBcImltYWdlXCIsXG4gIFwia2V5Z2VuXCIsXG4gIFwibWFycXVlZVwiLFxuICBcIm1lbnVpdGVtXCIsXG4gIFwibm9iclwiLFxuICBcIm5vZW1iZWRcIixcbiAgXCJub2ZyYW1lc1wiLFxuICBcInBsYWludGV4dFwiLFxuICBcInJiXCIsXG4gIFwicnRjXCIsXG4gIFwic2hhZG93XCIsXG4gIFwic3BhY2VyXCIsXG4gIFwic3RyaWtlXCIsXG4gIFwidHRcIixcbiAgXCJ4bXBcIixcbiAgXCJhXCIsXG4gIFwiYWJiclwiLFxuICBcImFjcm9ueW1cIixcbiAgXCJhZGRyZXNzXCIsXG4gIFwiYXBwbGV0XCIsXG4gIFwiYXJlYVwiLFxuICBcImFydGljbGVcIixcbiAgXCJhc2lkZVwiLFxuICBcImF1ZGlvXCIsXG4gIFwiYlwiLFxuICBcImJhc2VcIixcbiAgXCJiYXNlZm9udFwiLFxuICBcImJkaVwiLFxuICBcImJkb1wiLFxuICBcImJnc291bmRcIixcbiAgXCJiaWdcIixcbiAgXCJibGlua1wiLFxuICBcImJsb2NrcXVvdGVcIixcbiAgXCJib2R5XCIsXG4gIFwiYnJcIixcbiAgXCJidXR0b25cIixcbiAgXCJjYW52YXNcIixcbiAgXCJjYXB0aW9uXCIsXG4gIFwiY2VudGVyXCIsXG4gIFwiY2l0ZVwiLFxuICBcImNvZGVcIixcbiAgXCJjb2xcIixcbiAgXCJjb2xncm91cFwiLFxuICBcImNvbnRlbnRcIixcbiAgXCJkYXRhXCIsXG4gIFwiZGF0YWxpc3RcIixcbiAgXCJkZFwiLFxuICBcImRlbFwiLFxuICBcImRldGFpbHNcIixcbiAgXCJkZm5cIixcbiAgXCJkaWFsb2dcIixcbiAgXCJkaXJcIixcbiAgXCJkaXZcIixcbiAgXCJkbFwiLFxuICBcImR0XCIsXG4gIFwiZW1cIixcbiAgXCJlbWJlZFwiLFxuICBcImZpZWxkc2V0XCIsXG4gIFwiZmlnY2FwdGlvblwiLFxuICBcImZpZ3VyZVwiLFxuICBcImZvbnRcIixcbiAgXCJmb290ZXJcIixcbiAgXCJmb3JtXCIsXG4gIFwiZnJhbWVcIixcbiAgXCJmcmFtZXNldFwiLFxuICBcImhlYWRcIixcbiAgXCJoZWFkZXJcIixcbiAgXCJoZ3JvdXBcIixcbiAgXCJoclwiLFxuICBcImh0bWxcIixcbiAgXCJpXCIsXG4gIFwiaWZyYW1lXCIsXG4gIFwiaW1hZ2VcIixcbiAgXCJpbWdcIixcbiAgXCJpbnB1dFwiLFxuICBcImluc1wiLFxuICBcImtiZFwiLFxuICBcImtleWdlblwiLFxuICBcImxhYmVsXCIsXG4gIFwibGVnZW5kXCIsXG4gIFwibGlcIixcbiAgXCJsaW5rXCIsXG4gIFwibWFpblwiLFxuICBcIm1hcFwiLFxuICBcIm1hcmtcIixcbiAgXCJtYXJxdWVlXCIsXG4gIFwibWVudVwiLFxuICBcIm1lbnVpdGVtXCIsXG4gIFwibWV0YVwiLFxuICBcIm1ldGVyXCIsXG4gIFwibmF2XCIsXG4gIFwibm9iclwiLFxuICBcIm5vZW1iZWRcIixcbiAgXCJub2ZyYW1lc1wiLFxuICBcIm5vc2NyaXB0XCIsXG4gIFwib2JqZWN0XCIsXG4gIFwib2xcIixcbiAgXCJvcHRncm91cFwiLFxuICBcIm9wdGlvblwiLFxuICBcIm91dHB1dFwiLFxuICBcInBcIixcbiAgXCJwYXJhbVwiLFxuICBcInBpY3R1cmVcIixcbiAgXCJwbGFpbnRleHRcIixcbiAgXCJwb3J0YWxcIixcbiAgXCJwcmVcIixcbiAgXCJwcm9ncmVzc1wiLFxuICBcInFcIixcbiAgXCJyYlwiLFxuICBcInJwXCIsXG4gIFwicnRcIixcbiAgXCJydGNcIixcbiAgXCJydWJ5XCIsXG4gIFwic1wiLFxuICBcInNhbXBcIixcbiAgXCJzY3JpcHRcIixcbiAgXCJzZWN0aW9uXCIsXG4gIFwic2VsZWN0XCIsXG4gIFwic2hhZG93XCIsXG4gIFwic2xvdFwiLFxuICBcInNtYWxsXCIsXG4gIFwic291cmNlXCIsXG4gIFwic3BhY2VyXCIsXG4gIFwic3BhblwiLFxuICBcInN0cmlrZVwiLFxuICBcInN0cm9uZ1wiLFxuICBcInN0eWxlXCIsXG4gIFwic3ViXCIsXG4gIFwic3VtbWFyeVwiLFxuICBcInN1cFwiLFxuICBcInRhYmxlXCIsXG4gIFwidGJvZHlcIixcbiAgXCJ0ZFwiLFxuICBcInRlbXBsYXRlXCIsXG4gIFwidGV4dGFyZWFcIixcbiAgXCJ0Zm9vdFwiLFxuICBcInRoXCIsXG4gIFwidGhlYWRcIixcbiAgXCJ0aW1lXCIsXG4gIFwidGl0bGVcIixcbiAgXCJ0clwiLFxuICBcInRyYWNrXCIsXG4gIFwidHRcIixcbiAgXCJ1XCIsXG4gIFwidWxcIixcbiAgXCJ2YXJcIixcbiAgXCJ2aWRlb1wiLFxuICBcIndiclwiLFxuICBcInhtcFwiLFxuICBcImlucHV0XCIsXG4gIFwiaDFcIixcbiAgXCJoMlwiLFxuICBcImgzXCIsXG4gIFwiaDRcIixcbiAgXCJoNVwiLFxuICBcImg2XCJcbl0pO1xuXG5mdW5jdGlvbiByZWNvbmNpbGVBcnJheXMocGFyZW50Tm9kZSwgYSwgYikge1xuICBsZXQgYkxlbmd0aCA9IGIubGVuZ3RoLFxuICAgIGFFbmQgPSBhLmxlbmd0aCxcbiAgICBiRW5kID0gYkxlbmd0aCxcbiAgICBhU3RhcnQgPSAwLFxuICAgIGJTdGFydCA9IDAsXG4gICAgYWZ0ZXIgPSBhW2FFbmQgLSAxXS5uZXh0U2libGluZyxcbiAgICBtYXAgPSBudWxsO1xuICB3aGlsZSAoYVN0YXJ0IDwgYUVuZCB8fCBiU3RhcnQgPCBiRW5kKSB7XG4gICAgaWYgKGFbYVN0YXJ0XSA9PT0gYltiU3RhcnRdKSB7XG4gICAgICBhU3RhcnQrKztcbiAgICAgIGJTdGFydCsrO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIHdoaWxlIChhW2FFbmQgLSAxXSA9PT0gYltiRW5kIC0gMV0pIHtcbiAgICAgIGFFbmQtLTtcbiAgICAgIGJFbmQtLTtcbiAgICB9XG4gICAgaWYgKGFFbmQgPT09IGFTdGFydCkge1xuICAgICAgY29uc3Qgbm9kZSA9IGJFbmQgPCBiTGVuZ3RoID8gKGJTdGFydCA/IGJbYlN0YXJ0IC0gMV0ubmV4dFNpYmxpbmcgOiBiW2JFbmQgLSBiU3RhcnRdKSA6IGFmdGVyO1xuICAgICAgd2hpbGUgKGJTdGFydCA8IGJFbmQpIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGJbYlN0YXJ0KytdLCBub2RlKTtcbiAgICB9IGVsc2UgaWYgKGJFbmQgPT09IGJTdGFydCkge1xuICAgICAgd2hpbGUgKGFTdGFydCA8IGFFbmQpIHtcbiAgICAgICAgaWYgKCFtYXAgfHwgIW1hcC5oYXMoYVthU3RhcnRdKSkgYVthU3RhcnRdLnJlbW92ZSgpO1xuICAgICAgICBhU3RhcnQrKztcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGFbYVN0YXJ0XSA9PT0gYltiRW5kIC0gMV0gJiYgYltiU3RhcnRdID09PSBhW2FFbmQgLSAxXSkge1xuICAgICAgY29uc3Qgbm9kZSA9IGFbLS1hRW5kXS5uZXh0U2libGluZztcbiAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGJbYlN0YXJ0KytdLCBhW2FTdGFydCsrXS5uZXh0U2libGluZyk7XG4gICAgICBwYXJlbnROb2RlLmluc2VydEJlZm9yZShiWy0tYkVuZF0sIG5vZGUpO1xuICAgICAgYVthRW5kXSA9IGJbYkVuZF07XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICghbWFwKSB7XG4gICAgICAgIG1hcCA9IG5ldyBNYXAoKTtcbiAgICAgICAgbGV0IGkgPSBiU3RhcnQ7XG4gICAgICAgIHdoaWxlIChpIDwgYkVuZCkgbWFwLnNldChiW2ldLCBpKyspO1xuICAgICAgfVxuICAgICAgY29uc3QgaW5kZXggPSBtYXAuZ2V0KGFbYVN0YXJ0XSk7XG4gICAgICBpZiAoaW5kZXggIT0gbnVsbCkge1xuICAgICAgICBpZiAoYlN0YXJ0IDwgaW5kZXggJiYgaW5kZXggPCBiRW5kKSB7XG4gICAgICAgICAgbGV0IGkgPSBhU3RhcnQsXG4gICAgICAgICAgICBzZXF1ZW5jZSA9IDEsXG4gICAgICAgICAgICB0O1xuICAgICAgICAgIHdoaWxlICgrK2kgPCBhRW5kICYmIGkgPCBiRW5kKSB7XG4gICAgICAgICAgICBpZiAoKHQgPSBtYXAuZ2V0KGFbaV0pKSA9PSBudWxsIHx8IHQgIT09IGluZGV4ICsgc2VxdWVuY2UpIGJyZWFrO1xuICAgICAgICAgICAgc2VxdWVuY2UrKztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHNlcXVlbmNlID4gaW5kZXggLSBiU3RhcnQpIHtcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBhW2FTdGFydF07XG4gICAgICAgICAgICB3aGlsZSAoYlN0YXJ0IDwgaW5kZXgpIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGJbYlN0YXJ0KytdLCBub2RlKTtcbiAgICAgICAgICB9IGVsc2UgcGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQoYltiU3RhcnQrK10sIGFbYVN0YXJ0KytdKTtcbiAgICAgICAgfSBlbHNlIGFTdGFydCsrO1xuICAgICAgfSBlbHNlIGFbYVN0YXJ0KytdLnJlbW92ZSgpO1xuICAgIH1cbiAgfVxufVxuXG5jb25zdCAkJEVWRU5UUyA9IFwiXyREWF9ERUxFR0FURVwiO1xuZnVuY3Rpb24gcmVuZGVyKGNvZGUsIGVsZW1lbnQsIGluaXQsIG9wdGlvbnMgPSB7fSkge1xuICBsZXQgZGlzcG9zZXI7XG4gIGNyZWF0ZVJvb3QoZGlzcG9zZSA9PiB7XG4gICAgZGlzcG9zZXIgPSBkaXNwb3NlO1xuICAgIGVsZW1lbnQgPT09IGRvY3VtZW50XG4gICAgICA/IGNvZGUoKVxuICAgICAgOiBpbnNlcnQoZWxlbWVudCwgY29kZSgpLCBlbGVtZW50LmZpcnN0Q2hpbGQgPyBudWxsIDogdW5kZWZpbmVkLCBpbml0KTtcbiAgfSwgb3B0aW9ucy5vd25lcik7XG4gIHJldHVybiAoKSA9PiB7XG4gICAgZGlzcG9zZXIoKTtcbiAgICBlbGVtZW50LnRleHRDb250ZW50ID0gXCJcIjtcbiAgfTtcbn1cbmZ1bmN0aW9uIHRlbXBsYXRlKGh0bWwsIGlzQ0UsIGlzU1ZHKSB7XG4gIGxldCBub2RlO1xuICBjb25zdCBjcmVhdGUgPSAoKSA9PiB7XG4gICAgY29uc3QgdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJ0ZW1wbGF0ZVwiKTtcbiAgICB0LmlubmVySFRNTCA9IGh0bWw7XG4gICAgcmV0dXJuIGlzU1ZHID8gdC5jb250ZW50LmZpcnN0Q2hpbGQuZmlyc3RDaGlsZCA6IHQuY29udGVudC5maXJzdENoaWxkO1xuICB9O1xuICBjb25zdCBmbiA9IGlzQ0VcbiAgICA/ICgpID0+IHVudHJhY2soKCkgPT4gZG9jdW1lbnQuaW1wb3J0Tm9kZShub2RlIHx8IChub2RlID0gY3JlYXRlKCkpLCB0cnVlKSlcbiAgICA6ICgpID0+IChub2RlIHx8IChub2RlID0gY3JlYXRlKCkpKS5jbG9uZU5vZGUodHJ1ZSk7XG4gIGZuLmNsb25lTm9kZSA9IGZuO1xuICByZXR1cm4gZm47XG59XG5mdW5jdGlvbiBkZWxlZ2F0ZUV2ZW50cyhldmVudE5hbWVzLCBkb2N1bWVudCA9IHdpbmRvdy5kb2N1bWVudCkge1xuICBjb25zdCBlID0gZG9jdW1lbnRbJCRFVkVOVFNdIHx8IChkb2N1bWVudFskJEVWRU5UU10gPSBuZXcgU2V0KCkpO1xuICBmb3IgKGxldCBpID0gMCwgbCA9IGV2ZW50TmFtZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgY29uc3QgbmFtZSA9IGV2ZW50TmFtZXNbaV07XG4gICAgaWYgKCFlLmhhcyhuYW1lKSkge1xuICAgICAgZS5hZGQobmFtZSk7XG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKG5hbWUsIGV2ZW50SGFuZGxlcik7XG4gICAgfVxuICB9XG59XG5mdW5jdGlvbiBjbGVhckRlbGVnYXRlZEV2ZW50cyhkb2N1bWVudCA9IHdpbmRvdy5kb2N1bWVudCkge1xuICBpZiAoZG9jdW1lbnRbJCRFVkVOVFNdKSB7XG4gICAgZm9yIChsZXQgbmFtZSBvZiBkb2N1bWVudFskJEVWRU5UU10ua2V5cygpKSBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKG5hbWUsIGV2ZW50SGFuZGxlcik7XG4gICAgZGVsZXRlIGRvY3VtZW50WyQkRVZFTlRTXTtcbiAgfVxufVxuZnVuY3Rpb24gc2V0UHJvcGVydHkobm9kZSwgbmFtZSwgdmFsdWUpIHtcbiAgaWYgKCEhc2hhcmVkQ29uZmlnLmNvbnRleHQgJiYgbm9kZS5pc0Nvbm5lY3RlZCkgcmV0dXJuO1xuICBub2RlW25hbWVdID0gdmFsdWU7XG59XG5mdW5jdGlvbiBzZXRBdHRyaWJ1dGUobm9kZSwgbmFtZSwgdmFsdWUpIHtcbiAgaWYgKCEhc2hhcmVkQ29uZmlnLmNvbnRleHQgJiYgbm9kZS5pc0Nvbm5lY3RlZCkgcmV0dXJuO1xuICBpZiAodmFsdWUgPT0gbnVsbCkgbm9kZS5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG4gIGVsc2Ugbm9kZS5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpO1xufVxuZnVuY3Rpb24gc2V0QXR0cmlidXRlTlMobm9kZSwgbmFtZXNwYWNlLCBuYW1lLCB2YWx1ZSkge1xuICBpZiAoISFzaGFyZWRDb25maWcuY29udGV4dCAmJiBub2RlLmlzQ29ubmVjdGVkKSByZXR1cm47XG4gIGlmICh2YWx1ZSA9PSBudWxsKSBub2RlLnJlbW92ZUF0dHJpYnV0ZU5TKG5hbWVzcGFjZSwgbmFtZSk7XG4gIGVsc2Ugbm9kZS5zZXRBdHRyaWJ1dGVOUyhuYW1lc3BhY2UsIG5hbWUsIHZhbHVlKTtcbn1cbmZ1bmN0aW9uIGNsYXNzTmFtZShub2RlLCB2YWx1ZSkge1xuICBpZiAoISFzaGFyZWRDb25maWcuY29udGV4dCAmJiBub2RlLmlzQ29ubmVjdGVkKSByZXR1cm47XG4gIGlmICh2YWx1ZSA9PSBudWxsKSBub2RlLnJlbW92ZUF0dHJpYnV0ZShcImNsYXNzXCIpO1xuICBlbHNlIG5vZGUuY2xhc3NOYW1lID0gdmFsdWU7XG59XG5mdW5jdGlvbiBhZGRFdmVudExpc3RlbmVyKG5vZGUsIG5hbWUsIGhhbmRsZXIsIGRlbGVnYXRlKSB7XG4gIGlmIChkZWxlZ2F0ZSkge1xuICAgIGlmIChBcnJheS5pc0FycmF5KGhhbmRsZXIpKSB7XG4gICAgICBub2RlW2AkJCR7bmFtZX1gXSA9IGhhbmRsZXJbMF07XG4gICAgICBub2RlW2AkJCR7bmFtZX1EYXRhYF0gPSBoYW5kbGVyWzFdO1xuICAgIH0gZWxzZSBub2RlW2AkJCR7bmFtZX1gXSA9IGhhbmRsZXI7XG4gIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShoYW5kbGVyKSkge1xuICAgIGNvbnN0IGhhbmRsZXJGbiA9IGhhbmRsZXJbMF07XG4gICAgbm9kZS5hZGRFdmVudExpc3RlbmVyKG5hbWUsIChoYW5kbGVyWzBdID0gZSA9PiBoYW5kbGVyRm4uY2FsbChub2RlLCBoYW5kbGVyWzFdLCBlKSkpO1xuICB9IGVsc2Ugbm9kZS5hZGRFdmVudExpc3RlbmVyKG5hbWUsIGhhbmRsZXIpO1xufVxuZnVuY3Rpb24gY2xhc3NMaXN0KG5vZGUsIHZhbHVlLCBwcmV2ID0ge30pIHtcbiAgY29uc3QgY2xhc3NLZXlzID0gT2JqZWN0LmtleXModmFsdWUgfHwge30pLFxuICAgIHByZXZLZXlzID0gT2JqZWN0LmtleXMocHJldik7XG4gIGxldCBpLCBsZW47XG4gIGZvciAoaSA9IDAsIGxlbiA9IHByZXZLZXlzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgY29uc3Qga2V5ID0gcHJldktleXNbaV07XG4gICAgaWYgKCFrZXkgfHwga2V5ID09PSBcInVuZGVmaW5lZFwiIHx8IHZhbHVlW2tleV0pIGNvbnRpbnVlO1xuICAgIHRvZ2dsZUNsYXNzS2V5KG5vZGUsIGtleSwgZmFsc2UpO1xuICAgIGRlbGV0ZSBwcmV2W2tleV07XG4gIH1cbiAgZm9yIChpID0gMCwgbGVuID0gY2xhc3NLZXlzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgY29uc3Qga2V5ID0gY2xhc3NLZXlzW2ldLFxuICAgICAgY2xhc3NWYWx1ZSA9ICEhdmFsdWVba2V5XTtcbiAgICBpZiAoIWtleSB8fCBrZXkgPT09IFwidW5kZWZpbmVkXCIgfHwgcHJldltrZXldID09PSBjbGFzc1ZhbHVlIHx8ICFjbGFzc1ZhbHVlKSBjb250aW51ZTtcbiAgICB0b2dnbGVDbGFzc0tleShub2RlLCBrZXksIHRydWUpO1xuICAgIHByZXZba2V5XSA9IGNsYXNzVmFsdWU7XG4gIH1cbiAgcmV0dXJuIHByZXY7XG59XG5mdW5jdGlvbiBzdHlsZShub2RlLCB2YWx1ZSwgcHJldikge1xuICBpZiAoIXZhbHVlKSByZXR1cm4gcHJldiA/IHNldEF0dHJpYnV0ZShub2RlLCBcInN0eWxlXCIpIDogdmFsdWU7XG4gIGNvbnN0IG5vZGVTdHlsZSA9IG5vZGUuc3R5bGU7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpIHJldHVybiAobm9kZVN0eWxlLmNzc1RleHQgPSB2YWx1ZSk7XG4gIHR5cGVvZiBwcmV2ID09PSBcInN0cmluZ1wiICYmIChub2RlU3R5bGUuY3NzVGV4dCA9IHByZXYgPSB1bmRlZmluZWQpO1xuICBwcmV2IHx8IChwcmV2ID0ge30pO1xuICB2YWx1ZSB8fCAodmFsdWUgPSB7fSk7XG4gIGxldCB2LCBzO1xuICBmb3IgKHMgaW4gcHJldikge1xuICAgIHZhbHVlW3NdID09IG51bGwgJiYgbm9kZVN0eWxlLnJlbW92ZVByb3BlcnR5KHMpO1xuICAgIGRlbGV0ZSBwcmV2W3NdO1xuICB9XG4gIGZvciAocyBpbiB2YWx1ZSkge1xuICAgIHYgPSB2YWx1ZVtzXTtcbiAgICBpZiAodiAhPT0gcHJldltzXSkge1xuICAgICAgbm9kZVN0eWxlLnNldFByb3BlcnR5KHMsIHYpO1xuICAgICAgcHJldltzXSA9IHY7XG4gICAgfVxuICB9XG4gIHJldHVybiBwcmV2O1xufVxuZnVuY3Rpb24gc3ByZWFkKG5vZGUsIHByb3BzID0ge30sIGlzU1ZHLCBza2lwQ2hpbGRyZW4pIHtcbiAgY29uc3QgcHJldlByb3BzID0ge307XG4gIGlmICghc2tpcENoaWxkcmVuKSB7XG4gICAgY3JlYXRlUmVuZGVyRWZmZWN0KFxuICAgICAgKCkgPT4gKHByZXZQcm9wcy5jaGlsZHJlbiA9IGluc2VydEV4cHJlc3Npb24obm9kZSwgcHJvcHMuY2hpbGRyZW4sIHByZXZQcm9wcy5jaGlsZHJlbikpXG4gICAgKTtcbiAgfVxuICBjcmVhdGVSZW5kZXJFZmZlY3QoKCkgPT5cbiAgICB0eXBlb2YgcHJvcHMucmVmID09PSBcImZ1bmN0aW9uXCIgPyB1c2UocHJvcHMucmVmLCBub2RlKSA6IChwcm9wcy5yZWYgPSBub2RlKVxuICApO1xuICBjcmVhdGVSZW5kZXJFZmZlY3QoKCkgPT4gYXNzaWduKG5vZGUsIHByb3BzLCBpc1NWRywgdHJ1ZSwgcHJldlByb3BzLCB0cnVlKSk7XG4gIHJldHVybiBwcmV2UHJvcHM7XG59XG5mdW5jdGlvbiBkeW5hbWljUHJvcGVydHkocHJvcHMsIGtleSkge1xuICBjb25zdCBzcmMgPSBwcm9wc1trZXldO1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkocHJvcHMsIGtleSwge1xuICAgIGdldCgpIHtcbiAgICAgIHJldHVybiBzcmMoKTtcbiAgICB9LFxuICAgIGVudW1lcmFibGU6IHRydWVcbiAgfSk7XG4gIHJldHVybiBwcm9wcztcbn1cbmZ1bmN0aW9uIHVzZShmbiwgZWxlbWVudCwgYXJnKSB7XG4gIHJldHVybiB1bnRyYWNrKCgpID0+IGZuKGVsZW1lbnQsIGFyZykpO1xufVxuZnVuY3Rpb24gaW5zZXJ0KHBhcmVudCwgYWNjZXNzb3IsIG1hcmtlciwgaW5pdGlhbCkge1xuICBpZiAobWFya2VyICE9PSB1bmRlZmluZWQgJiYgIWluaXRpYWwpIGluaXRpYWwgPSBbXTtcbiAgaWYgKHR5cGVvZiBhY2Nlc3NvciAhPT0gXCJmdW5jdGlvblwiKSByZXR1cm4gaW5zZXJ0RXhwcmVzc2lvbihwYXJlbnQsIGFjY2Vzc29yLCBpbml0aWFsLCBtYXJrZXIpO1xuICBjcmVhdGVSZW5kZXJFZmZlY3QoY3VycmVudCA9PiBpbnNlcnRFeHByZXNzaW9uKHBhcmVudCwgYWNjZXNzb3IoKSwgY3VycmVudCwgbWFya2VyKSwgaW5pdGlhbCk7XG59XG5mdW5jdGlvbiBhc3NpZ24obm9kZSwgcHJvcHMsIGlzU1ZHLCBza2lwQ2hpbGRyZW4sIHByZXZQcm9wcyA9IHt9LCBza2lwUmVmID0gZmFsc2UpIHtcbiAgcHJvcHMgfHwgKHByb3BzID0ge30pO1xuICBmb3IgKGNvbnN0IHByb3AgaW4gcHJldlByb3BzKSB7XG4gICAgaWYgKCEocHJvcCBpbiBwcm9wcykpIHtcbiAgICAgIGlmIChwcm9wID09PSBcImNoaWxkcmVuXCIpIGNvbnRpbnVlO1xuICAgICAgcHJldlByb3BzW3Byb3BdID0gYXNzaWduUHJvcChub2RlLCBwcm9wLCBudWxsLCBwcmV2UHJvcHNbcHJvcF0sIGlzU1ZHLCBza2lwUmVmKTtcbiAgICB9XG4gIH1cbiAgZm9yIChjb25zdCBwcm9wIGluIHByb3BzKSB7XG4gICAgaWYgKHByb3AgPT09IFwiY2hpbGRyZW5cIikge1xuICAgICAgaWYgKCFza2lwQ2hpbGRyZW4pIGluc2VydEV4cHJlc3Npb24obm9kZSwgcHJvcHMuY2hpbGRyZW4pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IHZhbHVlID0gcHJvcHNbcHJvcF07XG4gICAgcHJldlByb3BzW3Byb3BdID0gYXNzaWduUHJvcChub2RlLCBwcm9wLCB2YWx1ZSwgcHJldlByb3BzW3Byb3BdLCBpc1NWRywgc2tpcFJlZik7XG4gIH1cbn1cbmZ1bmN0aW9uIGh5ZHJhdGUkMShjb2RlLCBlbGVtZW50LCBvcHRpb25zID0ge30pIHtcbiAgc2hhcmVkQ29uZmlnLmNvbXBsZXRlZCA9IGdsb2JhbFRoaXMuXyRIWS5jb21wbGV0ZWQ7XG4gIHNoYXJlZENvbmZpZy5ldmVudHMgPSBnbG9iYWxUaGlzLl8kSFkuZXZlbnRzO1xuICBzaGFyZWRDb25maWcubG9hZCA9IGlkID0+IGdsb2JhbFRoaXMuXyRIWS5yW2lkXTtcbiAgc2hhcmVkQ29uZmlnLmhhcyA9IGlkID0+IGlkIGluIGdsb2JhbFRoaXMuXyRIWS5yO1xuICBzaGFyZWRDb25maWcuZ2F0aGVyID0gcm9vdCA9PiBnYXRoZXJIeWRyYXRhYmxlKGVsZW1lbnQsIHJvb3QpO1xuICBzaGFyZWRDb25maWcucmVnaXN0cnkgPSBuZXcgTWFwKCk7XG4gIHNoYXJlZENvbmZpZy5jb250ZXh0ID0ge1xuICAgIGlkOiBvcHRpb25zLnJlbmRlcklkIHx8IFwiXCIsXG4gICAgY291bnQ6IDBcbiAgfTtcbiAgZ2F0aGVySHlkcmF0YWJsZShlbGVtZW50LCBvcHRpb25zLnJlbmRlcklkKTtcbiAgY29uc3QgZGlzcG9zZSA9IHJlbmRlcihjb2RlLCBlbGVtZW50LCBbLi4uZWxlbWVudC5jaGlsZE5vZGVzXSwgb3B0aW9ucyk7XG4gIHNoYXJlZENvbmZpZy5jb250ZXh0ID0gbnVsbDtcbiAgcmV0dXJuIGRpc3Bvc2U7XG59XG5mdW5jdGlvbiBnZXROZXh0RWxlbWVudCh0ZW1wbGF0ZSkge1xuICBsZXQgbm9kZSwga2V5O1xuICBpZiAoIXNoYXJlZENvbmZpZy5jb250ZXh0IHx8ICEobm9kZSA9IHNoYXJlZENvbmZpZy5yZWdpc3RyeS5nZXQoKGtleSA9IGdldEh5ZHJhdGlvbktleSgpKSkpKSB7XG4gICAgcmV0dXJuIHRlbXBsYXRlKCk7XG4gIH1cbiAgaWYgKHNoYXJlZENvbmZpZy5jb21wbGV0ZWQpIHNoYXJlZENvbmZpZy5jb21wbGV0ZWQuYWRkKG5vZGUpO1xuICBzaGFyZWRDb25maWcucmVnaXN0cnkuZGVsZXRlKGtleSk7XG4gIHJldHVybiBub2RlO1xufVxuZnVuY3Rpb24gZ2V0TmV4dE1hdGNoKGVsLCBub2RlTmFtZSkge1xuICB3aGlsZSAoZWwgJiYgZWwubG9jYWxOYW1lICE9PSBub2RlTmFtZSkgZWwgPSBlbC5uZXh0U2libGluZztcbiAgcmV0dXJuIGVsO1xufVxuZnVuY3Rpb24gZ2V0TmV4dE1hcmtlcihzdGFydCkge1xuICBsZXQgZW5kID0gc3RhcnQsXG4gICAgY291bnQgPSAwLFxuICAgIGN1cnJlbnQgPSBbXTtcbiAgaWYgKHNoYXJlZENvbmZpZy5jb250ZXh0KSB7XG4gICAgd2hpbGUgKGVuZCkge1xuICAgICAgaWYgKGVuZC5ub2RlVHlwZSA9PT0gOCkge1xuICAgICAgICBjb25zdCB2ID0gZW5kLm5vZGVWYWx1ZTtcbiAgICAgICAgaWYgKHYgPT09IFwiJFwiKSBjb3VudCsrO1xuICAgICAgICBlbHNlIGlmICh2ID09PSBcIi9cIikge1xuICAgICAgICAgIGlmIChjb3VudCA9PT0gMCkgcmV0dXJuIFtlbmQsIGN1cnJlbnRdO1xuICAgICAgICAgIGNvdW50LS07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGN1cnJlbnQucHVzaChlbmQpO1xuICAgICAgZW5kID0gZW5kLm5leHRTaWJsaW5nO1xuICAgIH1cbiAgfVxuICByZXR1cm4gW2VuZCwgY3VycmVudF07XG59XG5mdW5jdGlvbiBydW5IeWRyYXRpb25FdmVudHMoKSB7XG4gIGlmIChzaGFyZWRDb25maWcuZXZlbnRzICYmICFzaGFyZWRDb25maWcuZXZlbnRzLnF1ZXVlZCkge1xuICAgIHF1ZXVlTWljcm90YXNrKCgpID0+IHtcbiAgICAgIGNvbnN0IHsgY29tcGxldGVkLCBldmVudHMgfSA9IHNoYXJlZENvbmZpZztcbiAgICAgIGV2ZW50cy5xdWV1ZWQgPSBmYWxzZTtcbiAgICAgIHdoaWxlIChldmVudHMubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IFtlbCwgZV0gPSBldmVudHNbMF07XG4gICAgICAgIGlmICghY29tcGxldGVkLmhhcyhlbCkpIHJldHVybjtcbiAgICAgICAgZXZlbnRIYW5kbGVyKGUpO1xuICAgICAgICBldmVudHMuc2hpZnQoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBzaGFyZWRDb25maWcuZXZlbnRzLnF1ZXVlZCA9IHRydWU7XG4gIH1cbn1cbmZ1bmN0aW9uIHRvUHJvcGVydHlOYW1lKG5hbWUpIHtcbiAgcmV0dXJuIG5hbWUudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC8tKFthLXpdKS9nLCAoXywgdykgPT4gdy50b1VwcGVyQ2FzZSgpKTtcbn1cbmZ1bmN0aW9uIHRvZ2dsZUNsYXNzS2V5KG5vZGUsIGtleSwgdmFsdWUpIHtcbiAgY29uc3QgY2xhc3NOYW1lcyA9IGtleS50cmltKCkuc3BsaXQoL1xccysvKTtcbiAgZm9yIChsZXQgaSA9IDAsIG5hbWVMZW4gPSBjbGFzc05hbWVzLmxlbmd0aDsgaSA8IG5hbWVMZW47IGkrKylcbiAgICBub2RlLmNsYXNzTGlzdC50b2dnbGUoY2xhc3NOYW1lc1tpXSwgdmFsdWUpO1xufVxuZnVuY3Rpb24gYXNzaWduUHJvcChub2RlLCBwcm9wLCB2YWx1ZSwgcHJldiwgaXNTVkcsIHNraXBSZWYpIHtcbiAgbGV0IGlzQ0UsIGlzUHJvcCwgaXNDaGlsZFByb3AsIHByb3BBbGlhcywgZm9yY2VQcm9wO1xuICBpZiAocHJvcCA9PT0gXCJzdHlsZVwiKSByZXR1cm4gc3R5bGUobm9kZSwgdmFsdWUsIHByZXYpO1xuICBpZiAocHJvcCA9PT0gXCJjbGFzc0xpc3RcIikgcmV0dXJuIGNsYXNzTGlzdChub2RlLCB2YWx1ZSwgcHJldik7XG4gIGlmICh2YWx1ZSA9PT0gcHJldikgcmV0dXJuIHByZXY7XG4gIGlmIChwcm9wID09PSBcInJlZlwiKSB7XG4gICAgaWYgKCFza2lwUmVmKSB2YWx1ZShub2RlKTtcbiAgfSBlbHNlIGlmIChwcm9wLnNsaWNlKDAsIDMpID09PSBcIm9uOlwiKSB7XG4gICAgY29uc3QgZSA9IHByb3Auc2xpY2UoMyk7XG4gICAgcHJldiAmJiBub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIoZSwgcHJldik7XG4gICAgdmFsdWUgJiYgbm9kZS5hZGRFdmVudExpc3RlbmVyKGUsIHZhbHVlKTtcbiAgfSBlbHNlIGlmIChwcm9wLnNsaWNlKDAsIDEwKSA9PT0gXCJvbmNhcHR1cmU6XCIpIHtcbiAgICBjb25zdCBlID0gcHJvcC5zbGljZSgxMCk7XG4gICAgcHJldiAmJiBub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIoZSwgcHJldiwgdHJ1ZSk7XG4gICAgdmFsdWUgJiYgbm9kZS5hZGRFdmVudExpc3RlbmVyKGUsIHZhbHVlLCB0cnVlKTtcbiAgfSBlbHNlIGlmIChwcm9wLnNsaWNlKDAsIDIpID09PSBcIm9uXCIpIHtcbiAgICBjb25zdCBuYW1lID0gcHJvcC5zbGljZSgyKS50b0xvd2VyQ2FzZSgpO1xuICAgIGNvbnN0IGRlbGVnYXRlID0gRGVsZWdhdGVkRXZlbnRzLmhhcyhuYW1lKTtcbiAgICBpZiAoIWRlbGVnYXRlICYmIHByZXYpIHtcbiAgICAgIGNvbnN0IGggPSBBcnJheS5pc0FycmF5KHByZXYpID8gcHJldlswXSA6IHByZXY7XG4gICAgICBub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIobmFtZSwgaCk7XG4gICAgfVxuICAgIGlmIChkZWxlZ2F0ZSB8fCB2YWx1ZSkge1xuICAgICAgYWRkRXZlbnRMaXN0ZW5lcihub2RlLCBuYW1lLCB2YWx1ZSwgZGVsZWdhdGUpO1xuICAgICAgZGVsZWdhdGUgJiYgZGVsZWdhdGVFdmVudHMoW25hbWVdKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAocHJvcC5zbGljZSgwLCA1KSA9PT0gXCJhdHRyOlwiKSB7XG4gICAgc2V0QXR0cmlidXRlKG5vZGUsIHByb3Auc2xpY2UoNSksIHZhbHVlKTtcbiAgfSBlbHNlIGlmIChcbiAgICAoZm9yY2VQcm9wID0gcHJvcC5zbGljZSgwLCA1KSA9PT0gXCJwcm9wOlwiKSB8fFxuICAgIChpc0NoaWxkUHJvcCA9IENoaWxkUHJvcGVydGllcy5oYXMocHJvcCkpIHx8XG4gICAgKCFpc1NWRyAmJlxuICAgICAgKChwcm9wQWxpYXMgPSBnZXRQcm9wQWxpYXMocHJvcCwgbm9kZS50YWdOYW1lKSkgfHwgKGlzUHJvcCA9IFByb3BlcnRpZXMuaGFzKHByb3ApKSkpIHx8XG4gICAgKGlzQ0UgPSBub2RlLm5vZGVOYW1lLmluY2x1ZGVzKFwiLVwiKSlcbiAgKSB7XG4gICAgaWYgKGZvcmNlUHJvcCkge1xuICAgICAgcHJvcCA9IHByb3Auc2xpY2UoNSk7XG4gICAgICBpc1Byb3AgPSB0cnVlO1xuICAgIH0gZWxzZSBpZiAoISFzaGFyZWRDb25maWcuY29udGV4dCAmJiBub2RlLmlzQ29ubmVjdGVkKSByZXR1cm4gdmFsdWU7XG4gICAgaWYgKHByb3AgPT09IFwiY2xhc3NcIiB8fCBwcm9wID09PSBcImNsYXNzTmFtZVwiKSBjbGFzc05hbWUobm9kZSwgdmFsdWUpO1xuICAgIGVsc2UgaWYgKGlzQ0UgJiYgIWlzUHJvcCAmJiAhaXNDaGlsZFByb3ApIG5vZGVbdG9Qcm9wZXJ0eU5hbWUocHJvcCldID0gdmFsdWU7XG4gICAgZWxzZSBub2RlW3Byb3BBbGlhcyB8fCBwcm9wXSA9IHZhbHVlO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IG5zID0gaXNTVkcgJiYgcHJvcC5pbmRleE9mKFwiOlwiKSA+IC0xICYmIFNWR05hbWVzcGFjZVtwcm9wLnNwbGl0KFwiOlwiKVswXV07XG4gICAgaWYgKG5zKSBzZXRBdHRyaWJ1dGVOUyhub2RlLCBucywgcHJvcCwgdmFsdWUpO1xuICAgIGVsc2Ugc2V0QXR0cmlidXRlKG5vZGUsIEFsaWFzZXNbcHJvcF0gfHwgcHJvcCwgdmFsdWUpO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cbmZ1bmN0aW9uIGV2ZW50SGFuZGxlcihlKSB7XG4gIGNvbnN0IGtleSA9IGAkJCR7ZS50eXBlfWA7XG4gIGxldCBub2RlID0gKGUuY29tcG9zZWRQYXRoICYmIGUuY29tcG9zZWRQYXRoKClbMF0pIHx8IGUudGFyZ2V0O1xuICBpZiAoZS50YXJnZXQgIT09IG5vZGUpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZSwgXCJ0YXJnZXRcIiwge1xuICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgdmFsdWU6IG5vZGVcbiAgICB9KTtcbiAgfVxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZSwgXCJjdXJyZW50VGFyZ2V0XCIsIHtcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgZ2V0KCkge1xuICAgICAgcmV0dXJuIG5vZGUgfHwgZG9jdW1lbnQ7XG4gICAgfVxuICB9KTtcbiAgaWYgKHNoYXJlZENvbmZpZy5yZWdpc3RyeSAmJiAhc2hhcmVkQ29uZmlnLmRvbmUpIHNoYXJlZENvbmZpZy5kb25lID0gXyRIWS5kb25lID0gdHJ1ZTtcbiAgd2hpbGUgKG5vZGUpIHtcbiAgICBjb25zdCBoYW5kbGVyID0gbm9kZVtrZXldO1xuICAgIGlmIChoYW5kbGVyICYmICFub2RlLmRpc2FibGVkKSB7XG4gICAgICBjb25zdCBkYXRhID0gbm9kZVtgJHtrZXl9RGF0YWBdO1xuICAgICAgZGF0YSAhPT0gdW5kZWZpbmVkID8gaGFuZGxlci5jYWxsKG5vZGUsIGRhdGEsIGUpIDogaGFuZGxlci5jYWxsKG5vZGUsIGUpO1xuICAgICAgaWYgKGUuY2FuY2VsQnViYmxlKSByZXR1cm47XG4gICAgfVxuICAgIG5vZGUgPSBub2RlLl8kaG9zdCB8fCBub2RlLnBhcmVudE5vZGUgfHwgbm9kZS5ob3N0O1xuICB9XG59XG5mdW5jdGlvbiBpbnNlcnRFeHByZXNzaW9uKHBhcmVudCwgdmFsdWUsIGN1cnJlbnQsIG1hcmtlciwgdW53cmFwQXJyYXkpIHtcbiAgY29uc3QgaHlkcmF0aW5nID0gISFzaGFyZWRDb25maWcuY29udGV4dCAmJiBwYXJlbnQuaXNDb25uZWN0ZWQ7XG4gIGlmIChoeWRyYXRpbmcpIHtcbiAgICAhY3VycmVudCAmJiAoY3VycmVudCA9IFsuLi5wYXJlbnQuY2hpbGROb2Rlc10pO1xuICAgIGxldCBjbGVhbmVkID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjdXJyZW50Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBub2RlID0gY3VycmVudFtpXTtcbiAgICAgIGlmIChub2RlLm5vZGVUeXBlID09PSA4ICYmIG5vZGUuZGF0YS5zbGljZSgwLCAyKSA9PT0gXCIhJFwiKSBub2RlLnJlbW92ZSgpO1xuICAgICAgZWxzZSBjbGVhbmVkLnB1c2gobm9kZSk7XG4gICAgfVxuICAgIGN1cnJlbnQgPSBjbGVhbmVkO1xuICB9XG4gIHdoaWxlICh0eXBlb2YgY3VycmVudCA9PT0gXCJmdW5jdGlvblwiKSBjdXJyZW50ID0gY3VycmVudCgpO1xuICBpZiAodmFsdWUgPT09IGN1cnJlbnQpIHJldHVybiBjdXJyZW50O1xuICBjb25zdCB0ID0gdHlwZW9mIHZhbHVlLFxuICAgIG11bHRpID0gbWFya2VyICE9PSB1bmRlZmluZWQ7XG4gIHBhcmVudCA9IChtdWx0aSAmJiBjdXJyZW50WzBdICYmIGN1cnJlbnRbMF0ucGFyZW50Tm9kZSkgfHwgcGFyZW50O1xuICBpZiAodCA9PT0gXCJzdHJpbmdcIiB8fCB0ID09PSBcIm51bWJlclwiKSB7XG4gICAgaWYgKGh5ZHJhdGluZykgcmV0dXJuIGN1cnJlbnQ7XG4gICAgaWYgKHQgPT09IFwibnVtYmVyXCIpIHZhbHVlID0gdmFsdWUudG9TdHJpbmcoKTtcbiAgICBpZiAobXVsdGkpIHtcbiAgICAgIGxldCBub2RlID0gY3VycmVudFswXTtcbiAgICAgIGlmIChub2RlICYmIG5vZGUubm9kZVR5cGUgPT09IDMpIHtcbiAgICAgICAgbm9kZS5kYXRhICE9PSB2YWx1ZSAmJiAobm9kZS5kYXRhID0gdmFsdWUpO1xuICAgICAgfSBlbHNlIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh2YWx1ZSk7XG4gICAgICBjdXJyZW50ID0gY2xlYW5DaGlsZHJlbihwYXJlbnQsIGN1cnJlbnQsIG1hcmtlciwgbm9kZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChjdXJyZW50ICE9PSBcIlwiICYmIHR5cGVvZiBjdXJyZW50ID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIGN1cnJlbnQgPSBwYXJlbnQuZmlyc3RDaGlsZC5kYXRhID0gdmFsdWU7XG4gICAgICB9IGVsc2UgY3VycmVudCA9IHBhcmVudC50ZXh0Q29udGVudCA9IHZhbHVlO1xuICAgIH1cbiAgfSBlbHNlIGlmICh2YWx1ZSA9PSBudWxsIHx8IHQgPT09IFwiYm9vbGVhblwiKSB7XG4gICAgaWYgKGh5ZHJhdGluZykgcmV0dXJuIGN1cnJlbnQ7XG4gICAgY3VycmVudCA9IGNsZWFuQ2hpbGRyZW4ocGFyZW50LCBjdXJyZW50LCBtYXJrZXIpO1xuICB9IGVsc2UgaWYgKHQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIGNyZWF0ZVJlbmRlckVmZmVjdCgoKSA9PiB7XG4gICAgICBsZXQgdiA9IHZhbHVlKCk7XG4gICAgICB3aGlsZSAodHlwZW9mIHYgPT09IFwiZnVuY3Rpb25cIikgdiA9IHYoKTtcbiAgICAgIGN1cnJlbnQgPSBpbnNlcnRFeHByZXNzaW9uKHBhcmVudCwgdiwgY3VycmVudCwgbWFya2VyKTtcbiAgICB9KTtcbiAgICByZXR1cm4gKCkgPT4gY3VycmVudDtcbiAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIGNvbnN0IGFycmF5ID0gW107XG4gICAgY29uc3QgY3VycmVudEFycmF5ID0gY3VycmVudCAmJiBBcnJheS5pc0FycmF5KGN1cnJlbnQpO1xuICAgIGlmIChub3JtYWxpemVJbmNvbWluZ0FycmF5KGFycmF5LCB2YWx1ZSwgY3VycmVudCwgdW53cmFwQXJyYXkpKSB7XG4gICAgICBjcmVhdGVSZW5kZXJFZmZlY3QoKCkgPT4gKGN1cnJlbnQgPSBpbnNlcnRFeHByZXNzaW9uKHBhcmVudCwgYXJyYXksIGN1cnJlbnQsIG1hcmtlciwgdHJ1ZSkpKTtcbiAgICAgIHJldHVybiAoKSA9PiBjdXJyZW50O1xuICAgIH1cbiAgICBpZiAoaHlkcmF0aW5nKSB7XG4gICAgICBpZiAoIWFycmF5Lmxlbmd0aCkgcmV0dXJuIGN1cnJlbnQ7XG4gICAgICBpZiAobWFya2VyID09PSB1bmRlZmluZWQpIHJldHVybiBbLi4ucGFyZW50LmNoaWxkTm9kZXNdO1xuICAgICAgbGV0IG5vZGUgPSBhcnJheVswXTtcbiAgICAgIGxldCBub2RlcyA9IFtub2RlXTtcbiAgICAgIHdoaWxlICgobm9kZSA9IG5vZGUubmV4dFNpYmxpbmcpICE9PSBtYXJrZXIpIG5vZGVzLnB1c2gobm9kZSk7XG4gICAgICByZXR1cm4gKGN1cnJlbnQgPSBub2Rlcyk7XG4gICAgfVxuICAgIGlmIChhcnJheS5sZW5ndGggPT09IDApIHtcbiAgICAgIGN1cnJlbnQgPSBjbGVhbkNoaWxkcmVuKHBhcmVudCwgY3VycmVudCwgbWFya2VyKTtcbiAgICAgIGlmIChtdWx0aSkgcmV0dXJuIGN1cnJlbnQ7XG4gICAgfSBlbHNlIGlmIChjdXJyZW50QXJyYXkpIHtcbiAgICAgIGlmIChjdXJyZW50Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBhcHBlbmROb2RlcyhwYXJlbnQsIGFycmF5LCBtYXJrZXIpO1xuICAgICAgfSBlbHNlIHJlY29uY2lsZUFycmF5cyhwYXJlbnQsIGN1cnJlbnQsIGFycmF5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY3VycmVudCAmJiBjbGVhbkNoaWxkcmVuKHBhcmVudCk7XG4gICAgICBhcHBlbmROb2RlcyhwYXJlbnQsIGFycmF5KTtcbiAgICB9XG4gICAgY3VycmVudCA9IGFycmF5O1xuICB9IGVsc2UgaWYgKHZhbHVlLm5vZGVUeXBlKSB7XG4gICAgaWYgKGh5ZHJhdGluZyAmJiB2YWx1ZS5wYXJlbnROb2RlKSByZXR1cm4gKGN1cnJlbnQgPSBtdWx0aSA/IFt2YWx1ZV0gOiB2YWx1ZSk7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoY3VycmVudCkpIHtcbiAgICAgIGlmIChtdWx0aSkgcmV0dXJuIChjdXJyZW50ID0gY2xlYW5DaGlsZHJlbihwYXJlbnQsIGN1cnJlbnQsIG1hcmtlciwgdmFsdWUpKTtcbiAgICAgIGNsZWFuQ2hpbGRyZW4ocGFyZW50LCBjdXJyZW50LCBudWxsLCB2YWx1ZSk7XG4gICAgfSBlbHNlIGlmIChjdXJyZW50ID09IG51bGwgfHwgY3VycmVudCA9PT0gXCJcIiB8fCAhcGFyZW50LmZpcnN0Q2hpbGQpIHtcbiAgICAgIHBhcmVudC5hcHBlbmRDaGlsZCh2YWx1ZSk7XG4gICAgfSBlbHNlIHBhcmVudC5yZXBsYWNlQ2hpbGQodmFsdWUsIHBhcmVudC5maXJzdENoaWxkKTtcbiAgICBjdXJyZW50ID0gdmFsdWU7XG4gIH0gZWxzZTtcbiAgcmV0dXJuIGN1cnJlbnQ7XG59XG5mdW5jdGlvbiBub3JtYWxpemVJbmNvbWluZ0FycmF5KG5vcm1hbGl6ZWQsIGFycmF5LCBjdXJyZW50LCB1bndyYXApIHtcbiAgbGV0IGR5bmFtaWMgPSBmYWxzZTtcbiAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IGFycmF5Lmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgbGV0IGl0ZW0gPSBhcnJheVtpXSxcbiAgICAgIHByZXYgPSBjdXJyZW50ICYmIGN1cnJlbnRbbm9ybWFsaXplZC5sZW5ndGhdLFxuICAgICAgdDtcbiAgICBpZiAoaXRlbSA9PSBudWxsIHx8IGl0ZW0gPT09IHRydWUgfHwgaXRlbSA9PT0gZmFsc2UpO1xuICAgIGVsc2UgaWYgKCh0ID0gdHlwZW9mIGl0ZW0pID09PSBcIm9iamVjdFwiICYmIGl0ZW0ubm9kZVR5cGUpIHtcbiAgICAgIG5vcm1hbGl6ZWQucHVzaChpdGVtKTtcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoaXRlbSkpIHtcbiAgICAgIGR5bmFtaWMgPSBub3JtYWxpemVJbmNvbWluZ0FycmF5KG5vcm1hbGl6ZWQsIGl0ZW0sIHByZXYpIHx8IGR5bmFtaWM7XG4gICAgfSBlbHNlIGlmICh0ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIGlmICh1bndyYXApIHtcbiAgICAgICAgd2hpbGUgKHR5cGVvZiBpdGVtID09PSBcImZ1bmN0aW9uXCIpIGl0ZW0gPSBpdGVtKCk7XG4gICAgICAgIGR5bmFtaWMgPVxuICAgICAgICAgIG5vcm1hbGl6ZUluY29taW5nQXJyYXkoXG4gICAgICAgICAgICBub3JtYWxpemVkLFxuICAgICAgICAgICAgQXJyYXkuaXNBcnJheShpdGVtKSA/IGl0ZW0gOiBbaXRlbV0sXG4gICAgICAgICAgICBBcnJheS5pc0FycmF5KHByZXYpID8gcHJldiA6IFtwcmV2XVxuICAgICAgICAgICkgfHwgZHluYW1pYztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5vcm1hbGl6ZWQucHVzaChpdGVtKTtcbiAgICAgICAgZHluYW1pYyA9IHRydWU7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gU3RyaW5nKGl0ZW0pO1xuICAgICAgaWYgKHByZXYgJiYgcHJldi5ub2RlVHlwZSA9PT0gMyAmJiBwcmV2LmRhdGEgPT09IHZhbHVlKSBub3JtYWxpemVkLnB1c2gocHJldik7XG4gICAgICBlbHNlIG5vcm1hbGl6ZWQucHVzaChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh2YWx1ZSkpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZHluYW1pYztcbn1cbmZ1bmN0aW9uIGFwcGVuZE5vZGVzKHBhcmVudCwgYXJyYXksIG1hcmtlciA9IG51bGwpIHtcbiAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IGFycmF5Lmxlbmd0aDsgaSA8IGxlbjsgaSsrKSBwYXJlbnQuaW5zZXJ0QmVmb3JlKGFycmF5W2ldLCBtYXJrZXIpO1xufVxuZnVuY3Rpb24gY2xlYW5DaGlsZHJlbihwYXJlbnQsIGN1cnJlbnQsIG1hcmtlciwgcmVwbGFjZW1lbnQpIHtcbiAgaWYgKG1hcmtlciA9PT0gdW5kZWZpbmVkKSByZXR1cm4gKHBhcmVudC50ZXh0Q29udGVudCA9IFwiXCIpO1xuICBjb25zdCBub2RlID0gcmVwbGFjZW1lbnQgfHwgZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoXCJcIik7XG4gIGlmIChjdXJyZW50Lmxlbmd0aCkge1xuICAgIGxldCBpbnNlcnRlZCA9IGZhbHNlO1xuICAgIGZvciAobGV0IGkgPSBjdXJyZW50Lmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICBjb25zdCBlbCA9IGN1cnJlbnRbaV07XG4gICAgICBpZiAobm9kZSAhPT0gZWwpIHtcbiAgICAgICAgY29uc3QgaXNQYXJlbnQgPSBlbC5wYXJlbnROb2RlID09PSBwYXJlbnQ7XG4gICAgICAgIGlmICghaW5zZXJ0ZWQgJiYgIWkpXG4gICAgICAgICAgaXNQYXJlbnQgPyBwYXJlbnQucmVwbGFjZUNoaWxkKG5vZGUsIGVsKSA6IHBhcmVudC5pbnNlcnRCZWZvcmUobm9kZSwgbWFya2VyKTtcbiAgICAgICAgZWxzZSBpc1BhcmVudCAmJiBlbC5yZW1vdmUoKTtcbiAgICAgIH0gZWxzZSBpbnNlcnRlZCA9IHRydWU7XG4gICAgfVxuICB9IGVsc2UgcGFyZW50Lmluc2VydEJlZm9yZShub2RlLCBtYXJrZXIpO1xuICByZXR1cm4gW25vZGVdO1xufVxuZnVuY3Rpb24gZ2F0aGVySHlkcmF0YWJsZShlbGVtZW50LCByb290KSB7XG4gIGNvbnN0IHRlbXBsYXRlcyA9IGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbChgKltkYXRhLWhrXWApO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHRlbXBsYXRlcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IG5vZGUgPSB0ZW1wbGF0ZXNbaV07XG4gICAgY29uc3Qga2V5ID0gbm9kZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWhrXCIpO1xuICAgIGlmICgoIXJvb3QgfHwga2V5LnN0YXJ0c1dpdGgocm9vdCkpICYmICFzaGFyZWRDb25maWcucmVnaXN0cnkuaGFzKGtleSkpXG4gICAgICBzaGFyZWRDb25maWcucmVnaXN0cnkuc2V0KGtleSwgbm9kZSk7XG4gIH1cbn1cbmZ1bmN0aW9uIGdldEh5ZHJhdGlvbktleSgpIHtcbiAgY29uc3QgaHlkcmF0ZSA9IHNoYXJlZENvbmZpZy5jb250ZXh0O1xuICByZXR1cm4gYCR7aHlkcmF0ZS5pZH0ke2h5ZHJhdGUuY291bnQrK31gO1xufVxuZnVuY3Rpb24gTm9IeWRyYXRpb24ocHJvcHMpIHtcbiAgcmV0dXJuIHNoYXJlZENvbmZpZy5jb250ZXh0ID8gdW5kZWZpbmVkIDogcHJvcHMuY2hpbGRyZW47XG59XG5mdW5jdGlvbiBIeWRyYXRpb24ocHJvcHMpIHtcbiAgcmV0dXJuIHByb3BzLmNoaWxkcmVuO1xufVxuY29uc3Qgdm9pZEZuID0gKCkgPT4gdW5kZWZpbmVkO1xuY29uc3QgUmVxdWVzdENvbnRleHQgPSBTeW1ib2woKTtcbmZ1bmN0aW9uIGlubmVySFRNTChwYXJlbnQsIGNvbnRlbnQpIHtcbiAgIXNoYXJlZENvbmZpZy5jb250ZXh0ICYmIChwYXJlbnQuaW5uZXJIVE1MID0gY29udGVudCk7XG59XG5cbmZ1bmN0aW9uIHRocm93SW5Ccm93c2VyKGZ1bmMpIHtcbiAgY29uc3QgZXJyID0gbmV3IEVycm9yKGAke2Z1bmMubmFtZX0gaXMgbm90IHN1cHBvcnRlZCBpbiB0aGUgYnJvd3NlciwgcmV0dXJuaW5nIHVuZGVmaW5lZGApO1xuICBjb25zb2xlLmVycm9yKGVycik7XG59XG5mdW5jdGlvbiByZW5kZXJUb1N0cmluZyhmbiwgb3B0aW9ucykge1xuICB0aHJvd0luQnJvd3NlcihyZW5kZXJUb1N0cmluZyk7XG59XG5mdW5jdGlvbiByZW5kZXJUb1N0cmluZ0FzeW5jKGZuLCBvcHRpb25zKSB7XG4gIHRocm93SW5Ccm93c2VyKHJlbmRlclRvU3RyaW5nQXN5bmMpO1xufVxuZnVuY3Rpb24gcmVuZGVyVG9TdHJlYW0oZm4sIG9wdGlvbnMpIHtcbiAgdGhyb3dJbkJyb3dzZXIocmVuZGVyVG9TdHJlYW0pO1xufVxuZnVuY3Rpb24gc3NyKHRlbXBsYXRlLCAuLi5ub2Rlcykge31cbmZ1bmN0aW9uIHNzckVsZW1lbnQobmFtZSwgcHJvcHMsIGNoaWxkcmVuLCBuZWVkc0lkKSB7fVxuZnVuY3Rpb24gc3NyQ2xhc3NMaXN0KHZhbHVlKSB7fVxuZnVuY3Rpb24gc3NyU3R5bGUodmFsdWUpIHt9XG5mdW5jdGlvbiBzc3JBdHRyaWJ1dGUoa2V5LCB2YWx1ZSkge31cbmZ1bmN0aW9uIHNzckh5ZHJhdGlvbktleSgpIHt9XG5mdW5jdGlvbiByZXNvbHZlU1NSTm9kZShub2RlKSB7fVxuZnVuY3Rpb24gZXNjYXBlKGh0bWwpIHt9XG5mdW5jdGlvbiBzc3JTcHJlYWQocHJvcHMsIGlzU1ZHLCBza2lwQ2hpbGRyZW4pIHt9XG5cbmNvbnN0IGlzU2VydmVyID0gZmFsc2U7XG5jb25zdCBpc0RldiA9IGZhbHNlO1xuY29uc3QgU1ZHX05BTUVTUEFDRSA9IFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIjtcbmZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnQodGFnTmFtZSwgaXNTVkcgPSBmYWxzZSkge1xuICByZXR1cm4gaXNTVkcgPyBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoU1ZHX05BTUVTUEFDRSwgdGFnTmFtZSkgOiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZ05hbWUpO1xufVxuY29uc3QgaHlkcmF0ZSA9ICguLi5hcmdzKSA9PiB7XG4gIGVuYWJsZUh5ZHJhdGlvbigpO1xuICByZXR1cm4gaHlkcmF0ZSQxKC4uLmFyZ3MpO1xufTtcbmZ1bmN0aW9uIFBvcnRhbChwcm9wcykge1xuICBjb25zdCB7IHVzZVNoYWRvdyB9ID0gcHJvcHMsXG4gICAgbWFya2VyID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoXCJcIiksXG4gICAgbW91bnQgPSAoKSA9PiBwcm9wcy5tb3VudCB8fCBkb2N1bWVudC5ib2R5LFxuICAgIG93bmVyID0gZ2V0T3duZXIoKTtcbiAgbGV0IGNvbnRlbnQ7XG4gIGxldCBoeWRyYXRpbmcgPSAhIXNoYXJlZENvbmZpZy5jb250ZXh0O1xuICBjcmVhdGVFZmZlY3QoXG4gICAgKCkgPT4ge1xuICAgICAgaWYgKGh5ZHJhdGluZykgZ2V0T3duZXIoKS51c2VyID0gaHlkcmF0aW5nID0gZmFsc2U7XG4gICAgICBjb250ZW50IHx8IChjb250ZW50ID0gcnVuV2l0aE93bmVyKG93bmVyLCAoKSA9PiBjcmVhdGVNZW1vKCgpID0+IHByb3BzLmNoaWxkcmVuKSkpO1xuICAgICAgY29uc3QgZWwgPSBtb3VudCgpO1xuICAgICAgaWYgKGVsIGluc3RhbmNlb2YgSFRNTEhlYWRFbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IFtjbGVhbiwgc2V0Q2xlYW5dID0gY3JlYXRlU2lnbmFsKGZhbHNlKTtcbiAgICAgICAgY29uc3QgY2xlYW51cCA9ICgpID0+IHNldENsZWFuKHRydWUpO1xuICAgICAgICBjcmVhdGVSb290KGRpc3Bvc2UgPT4gaW5zZXJ0KGVsLCAoKSA9PiAoIWNsZWFuKCkgPyBjb250ZW50KCkgOiBkaXNwb3NlKCkpLCBudWxsKSk7XG4gICAgICAgIG9uQ2xlYW51cChjbGVhbnVwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGNvbnRhaW5lciA9IGNyZWF0ZUVsZW1lbnQocHJvcHMuaXNTVkcgPyBcImdcIiA6IFwiZGl2XCIsIHByb3BzLmlzU1ZHKSxcbiAgICAgICAgICByZW5kZXJSb290ID1cbiAgICAgICAgICAgIHVzZVNoYWRvdyAmJiBjb250YWluZXIuYXR0YWNoU2hhZG93XG4gICAgICAgICAgICAgID8gY29udGFpbmVyLmF0dGFjaFNoYWRvdyh7XG4gICAgICAgICAgICAgICAgICBtb2RlOiBcIm9wZW5cIlxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIDogY29udGFpbmVyO1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoY29udGFpbmVyLCBcIl8kaG9zdFwiLCB7XG4gICAgICAgICAgZ2V0KCkge1xuICAgICAgICAgICAgcmV0dXJuIG1hcmtlci5wYXJlbnROb2RlO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICAgIH0pO1xuICAgICAgICBpbnNlcnQocmVuZGVyUm9vdCwgY29udGVudCk7XG4gICAgICAgIGVsLmFwcGVuZENoaWxkKGNvbnRhaW5lcik7XG4gICAgICAgIHByb3BzLnJlZiAmJiBwcm9wcy5yZWYoY29udGFpbmVyKTtcbiAgICAgICAgb25DbGVhbnVwKCgpID0+IGVsLnJlbW92ZUNoaWxkKGNvbnRhaW5lcikpO1xuICAgICAgfVxuICAgIH0sXG4gICAgdW5kZWZpbmVkLFxuICAgIHtcbiAgICAgIHJlbmRlcjogIWh5ZHJhdGluZ1xuICAgIH1cbiAgKTtcbiAgcmV0dXJuIG1hcmtlcjtcbn1cbmZ1bmN0aW9uIER5bmFtaWMocHJvcHMpIHtcbiAgY29uc3QgW3AsIG90aGVyc10gPSBzcGxpdFByb3BzKHByb3BzLCBbXCJjb21wb25lbnRcIl0pO1xuICBjb25zdCBjYWNoZWQgPSBjcmVhdGVNZW1vKCgpID0+IHAuY29tcG9uZW50KTtcbiAgcmV0dXJuIGNyZWF0ZU1lbW8oKCkgPT4ge1xuICAgIGNvbnN0IGNvbXBvbmVudCA9IGNhY2hlZCgpO1xuICAgIHN3aXRjaCAodHlwZW9mIGNvbXBvbmVudCkge1xuICAgICAgY2FzZSBcImZ1bmN0aW9uXCI6XG4gICAgICAgIHJldHVybiB1bnRyYWNrKCgpID0+IGNvbXBvbmVudChvdGhlcnMpKTtcbiAgICAgIGNhc2UgXCJzdHJpbmdcIjpcbiAgICAgICAgY29uc3QgaXNTdmcgPSBTVkdFbGVtZW50cy5oYXMoY29tcG9uZW50KTtcbiAgICAgICAgY29uc3QgZWwgPSBzaGFyZWRDb25maWcuY29udGV4dCA/IGdldE5leHRFbGVtZW50KCkgOiBjcmVhdGVFbGVtZW50KGNvbXBvbmVudCwgaXNTdmcpO1xuICAgICAgICBzcHJlYWQoZWwsIG90aGVycywgaXNTdmcpO1xuICAgICAgICByZXR1cm4gZWw7XG4gICAgfVxuICB9KTtcbn1cblxuZXhwb3J0IHtcbiAgQWxpYXNlcyxcbiAgdm9pZEZuIGFzIEFzc2V0cyxcbiAgQ2hpbGRQcm9wZXJ0aWVzLFxuICBET01FbGVtZW50cyxcbiAgRGVsZWdhdGVkRXZlbnRzLFxuICBEeW5hbWljLFxuICBIeWRyYXRpb24sXG4gIHZvaWRGbiBhcyBIeWRyYXRpb25TY3JpcHQsXG4gIE5vSHlkcmF0aW9uLFxuICBQb3J0YWwsXG4gIFByb3BlcnRpZXMsXG4gIFJlcXVlc3RDb250ZXh0LFxuICBTVkdFbGVtZW50cyxcbiAgU1ZHTmFtZXNwYWNlLFxuICBhZGRFdmVudExpc3RlbmVyLFxuICBhc3NpZ24sXG4gIGNsYXNzTGlzdCxcbiAgY2xhc3NOYW1lLFxuICBjbGVhckRlbGVnYXRlZEV2ZW50cyxcbiAgZGVsZWdhdGVFdmVudHMsXG4gIGR5bmFtaWNQcm9wZXJ0eSxcbiAgZXNjYXBlLFxuICB2b2lkRm4gYXMgZ2VuZXJhdGVIeWRyYXRpb25TY3JpcHQsXG4gIHZvaWRGbiBhcyBnZXRBc3NldHMsXG4gIGdldEh5ZHJhdGlvbktleSxcbiAgZ2V0TmV4dEVsZW1lbnQsXG4gIGdldE5leHRNYXJrZXIsXG4gIGdldE5leHRNYXRjaCxcbiAgZ2V0UHJvcEFsaWFzLFxuICB2b2lkRm4gYXMgZ2V0UmVxdWVzdEV2ZW50LFxuICBoeWRyYXRlLFxuICBpbm5lckhUTUwsXG4gIGluc2VydCxcbiAgaXNEZXYsXG4gIGlzU2VydmVyLFxuICByZW5kZXIsXG4gIHJlbmRlclRvU3RyZWFtLFxuICByZW5kZXJUb1N0cmluZyxcbiAgcmVuZGVyVG9TdHJpbmdBc3luYyxcbiAgcmVzb2x2ZVNTUk5vZGUsXG4gIHJ1bkh5ZHJhdGlvbkV2ZW50cyxcbiAgc2V0QXR0cmlidXRlLFxuICBzZXRBdHRyaWJ1dGVOUyxcbiAgc2V0UHJvcGVydHksXG4gIHNwcmVhZCxcbiAgc3NyLFxuICBzc3JBdHRyaWJ1dGUsXG4gIHNzckNsYXNzTGlzdCxcbiAgc3NyRWxlbWVudCxcbiAgc3NySHlkcmF0aW9uS2V5LFxuICBzc3JTcHJlYWQsXG4gIHNzclN0eWxlLFxuICBzdHlsZSxcbiAgdGVtcGxhdGUsXG4gIHVzZSxcbiAgdm9pZEZuIGFzIHVzZUFzc2V0c1xufTtcbiIsICIvLyBzcmMvcmVhY3Rpdml0eS9saWIudHNcbnZhciBhY2Nlc3MgPSAodikgPT4gdHlwZW9mIHYgPT09IFwiZnVuY3Rpb25cIiA/IHYoKSA6IHY7XG52YXIgY2hhaW4gPSAoY2FsbGJhY2tzKSA9PiB7XG4gIHJldHVybiAoLi4uYXJncykgPT4ge1xuICAgIGZvciAoY29uc3QgY2FsbGJhY2sgb2YgY2FsbGJhY2tzKVxuICAgICAgY2FsbGJhY2sgJiYgY2FsbGJhY2soLi4uYXJncyk7XG4gIH07XG59O1xudmFyIG1lcmdlUmVmcyA9ICguLi5yZWZzKSA9PiB7XG4gIHJldHVybiBjaGFpbihyZWZzKTtcbn07XG52YXIgc29tZSA9ICguLi5zaWduYWxzKSA9PiB7XG4gIHJldHVybiBzaWduYWxzLnNvbWUoKHNpZ25hbCkgPT4gISFzaWduYWwoKSk7XG59O1xuXG5leHBvcnQgeyBhY2Nlc3MsIGNoYWluLCBtZXJnZVJlZnMsIHNvbWUgfTtcbiIsICJpbXBvcnQgeyBhY2Nlc3MgfSBmcm9tICcuL09aQ0k0TkROLmpzJztcbmltcG9ydCB7IGNyZWF0ZU1lbW8gfSBmcm9tICdzb2xpZC1qcyc7XG5cbnZhciBjcmVhdGVUYWdOYW1lID0gKHByb3BzKSA9PiB7XG4gIGNvbnN0IHRhZ05hbWUgPSBjcmVhdGVNZW1vKFxuICAgICgpID0+IGFjY2Vzcyhwcm9wcy5lbGVtZW50KT8udGFnTmFtZS50b0xvd2VyQ2FzZSgpID8/IHByb3BzLmZhbGxiYWNrXG4gICk7XG4gIHJldHVybiB0YWdOYW1lO1xufTtcbnZhciB0YWdOYW1lX2RlZmF1bHQgPSBjcmVhdGVUYWdOYW1lO1xuXG5leHBvcnQgeyB0YWdOYW1lX2RlZmF1bHQgfTtcbiIsICIvLyBzcmMvYXNzZXJ0aW9ucy50c1xudmFyIGlzRnVuY3Rpb24gPSAodmFsdWUpID0+IHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiO1xufTtcbnZhciBidXR0b25JbnB1dFR5cGVzID0gW1wiYnV0dG9uXCIsIFwiY29sb3JcIiwgXCJmaWxlXCIsIFwiaW1hZ2VcIiwgXCJyZXNldFwiLCBcInN1Ym1pdFwiXTtcbnZhciBpc0J1dHRvbiA9ICh0YWdOYW1lLCB0eXBlKSA9PiB7XG4gIGlmICh0YWdOYW1lID09PSBcImJ1dHRvblwiKVxuICAgIHJldHVybiB0cnVlO1xuICBpZiAodGFnTmFtZSA9PT0gXCJpbnB1dFwiICYmIHR5cGUgIT09IHZvaWQgMCkge1xuICAgIHJldHVybiBidXR0b25JbnB1dFR5cGVzLmluZGV4T2YodHlwZSkgIT09IC0xO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn07XG52YXIgZGF0YUlmID0gKGNvbmRpdGlvbikgPT4gY29uZGl0aW9uID8gXCJcIiA6IHZvaWQgMDtcblxuZXhwb3J0IHsgZGF0YUlmLCBpc0J1dHRvbiwgaXNGdW5jdGlvbiB9O1xuIiwgImltcG9ydCB7IHRhZ05hbWVfZGVmYXVsdCB9IGZyb20gJy4vQTdTRkZPQUcuanMnO1xuaW1wb3J0IHsgaXNCdXR0b24gfSBmcm9tICcuLzJXT0tPSFpTLmpzJztcbmltcG9ydCB7IG1lcmdlUmVmcyB9IGZyb20gJy4vT1pDSTRORE4uanMnO1xuaW1wb3J0IHsgY3JlYXRlQ29tcG9uZW50LCBEeW5hbWljIGFzIER5bmFtaWMkMSwgbWVyZ2VQcm9wcyB9IGZyb20gJ3NvbGlkLWpzL3dlYic7XG5pbXBvcnQgeyBzcGxpdFByb3BzLCBjcmVhdGVNZW1vLCB1bnRyYWNrLCBjcmVhdGVTaWduYWwgfSBmcm9tICdzb2xpZC1qcyc7XG5cbnZhciBERUZBVUxUX0RZTkFNSUNfRUxFTUVOVCA9IFwiZGl2XCI7XG52YXIgRHluYW1pYyA9IChwcm9wcykgPT4ge1xuICBjb25zdCBbbG9jYWxQcm9wcywgb3RoZXJQcm9wc10gPSBzcGxpdFByb3BzKHByb3BzLCBbXCJhc1wiXSk7XG4gIGNvbnN0IGNhY2hlZCA9IGNyZWF0ZU1lbW8oKCkgPT4gbG9jYWxQcm9wcy5hcyA/PyBERUZBVUxUX0RZTkFNSUNfRUxFTUVOVCk7XG4gIGNvbnN0IG1lbW9pemVkRHluYW1pYyA9IGNyZWF0ZU1lbW8oKCkgPT4ge1xuICAgIGNvbnN0IGNvbXBvbmVudCA9IGNhY2hlZCgpO1xuICAgIHN3aXRjaCAodHlwZW9mIGNvbXBvbmVudCkge1xuICAgICAgY2FzZSBcImZ1bmN0aW9uXCI6XG4gICAgICAgIHJldHVybiB1bnRyYWNrKCgpID0+IGNvbXBvbmVudChvdGhlclByb3BzKSk7XG4gICAgICBjYXNlIFwic3RyaW5nXCI6XG4gICAgICAgIHJldHVybiBjcmVhdGVDb21wb25lbnQoRHluYW1pYyQxLCBtZXJnZVByb3BzKHtcbiAgICAgICAgICBjb21wb25lbnRcbiAgICAgICAgfSwgb3RoZXJQcm9wcykpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBtZW1vaXplZER5bmFtaWM7XG59O1xudmFyIER5bmFtaWNfZGVmYXVsdCA9IER5bmFtaWM7XG5cbi8vIHNyYy9keW5hbWljL0R5bmFtaWNCdXR0b24udHN4XG52YXIgREVGQVVMVF9EWU5BTUlDX0JVVFRPTl9FTEVNRU5UID0gXCJidXR0b25cIjtcbnZhciBEeW5hbWljQnV0dG9uID0gKHByb3BzKSA9PiB7XG4gIGNvbnN0IFtyZWYsIHNldFJlZl0gPSBjcmVhdGVTaWduYWwobnVsbCk7XG4gIGNvbnN0IFtsb2NhbFByb3BzLCBvdGhlclByb3BzXSA9IHNwbGl0UHJvcHMocHJvcHMsIFtcInJlZlwiLCBcInR5cGVcIl0pO1xuICBjb25zdCB0YWdOYW1lID0gdGFnTmFtZV9kZWZhdWx0KHtcbiAgICBlbGVtZW50OiByZWYsXG4gICAgZmFsbGJhY2s6IERFRkFVTFRfRFlOQU1JQ19CVVRUT05fRUxFTUVOVFxuICB9KTtcbiAgY29uc3QgbWVtb2l6ZWRJc0J1dHRvbiA9IGNyZWF0ZU1lbW8oKCkgPT4ge1xuICAgIHJldHVybiBpc0J1dHRvbih0YWdOYW1lKCksIGxvY2FsUHJvcHMudHlwZSk7XG4gIH0pO1xuICByZXR1cm4gY3JlYXRlQ29tcG9uZW50KER5bmFtaWNfZGVmYXVsdCwgbWVyZ2VQcm9wcyh7XG4gICAgcmVmKHIkKSB7XG4gICAgICB2YXIgX3JlZiQgPSBtZXJnZVJlZnMoc2V0UmVmLCBsb2NhbFByb3BzLnJlZik7XG4gICAgICB0eXBlb2YgX3JlZiQgPT09IFwiZnVuY3Rpb25cIiAmJiBfcmVmJChyJCk7XG4gICAgfSxcbiAgICBnZXQgdHlwZSgpIHtcbiAgICAgIHJldHVybiBtZW1vaXplZElzQnV0dG9uKCkgPyBcImJ1dHRvblwiIDogdm9pZCAwO1xuICAgIH0sXG4gICAgZ2V0IHJvbGUoKSB7XG4gICAgICByZXR1cm4gIW1lbW9pemVkSXNCdXR0b24oKSA/IFwiYnV0dG9uXCIgOiB2b2lkIDA7XG4gICAgfVxuICB9LCBvdGhlclByb3BzKSk7XG59O1xudmFyIER5bmFtaWNCdXR0b25fZGVmYXVsdCA9IER5bmFtaWNCdXR0b247XG5cbmV4cG9ydCB7IER5bmFtaWNCdXR0b25fZGVmYXVsdCwgRHluYW1pY19kZWZhdWx0IH07XG4iLCAiaW1wb3J0IHsgY3JlYXRlQ29udGV4dCwgdXNlQ29udGV4dCB9IGZyb20gJ3NvbGlkLWpzJztcblxuLy8gc3JjL2NyZWF0ZS9rZXllZENvbnRleHQudHNcbnZhciBrZXllZENvbnRleHRzID0gLyogQF9fUFVSRV9fICovIG5ldyBNYXAoKTtcbnZhciBjcmVhdGVLZXllZENvbnRleHQgPSAoa2V5LCBkZWZhdWx0VmFsdWUpID0+IHtcbiAgaWYgKGtleWVkQ29udGV4dHMuaGFzKGtleSkpIHtcbiAgICByZXR1cm4ga2V5ZWRDb250ZXh0cy5nZXQoa2V5KTtcbiAgfVxuICBjb25zdCBrZXllZENvbnRleHQgPSBjcmVhdGVDb250ZXh0KGRlZmF1bHRWYWx1ZSk7XG4gIGtleWVkQ29udGV4dHMuc2V0KGtleSwga2V5ZWRDb250ZXh0KTtcbiAgcmV0dXJuIGtleWVkQ29udGV4dDtcbn07XG52YXIgZ2V0S2V5ZWRDb250ZXh0ID0gKGtleSkgPT4ge1xuICBjb25zdCBrZXllZENvbnRleHQgPSBrZXllZENvbnRleHRzLmdldChrZXkpO1xuICByZXR1cm4ga2V5ZWRDb250ZXh0O1xufTtcbnZhciB1c2VLZXllZENvbnRleHQgPSAoa2V5KSA9PiB7XG4gIGNvbnN0IGtleWVkQ29udGV4dCA9IGtleWVkQ29udGV4dHMuZ2V0KGtleSk7XG4gIGlmICgha2V5ZWRDb250ZXh0KVxuICAgIHJldHVybiB2b2lkIDA7XG4gIHJldHVybiB1c2VDb250ZXh0KGtleWVkQ29udGV4dCk7XG59O1xuXG5leHBvcnQgeyBjcmVhdGVLZXllZENvbnRleHQsIGdldEtleWVkQ29udGV4dCwgdXNlS2V5ZWRDb250ZXh0IH07XG4iLCAiaW1wb3J0IHsgYWNjZXNzIH0gZnJvbSAnLi9PWkNJNE5ETi5qcyc7XG5pbXBvcnQgeyBjcmVhdGVNZW1vIH0gZnJvbSAnc29saWQtanMnO1xuXG52YXIgZ2V0RmxvYXRpbmdTdHlsZSA9IChwcm9wcykgPT4ge1xuICBjb25zdCBtZW1vaXplZEZsb2F0aW5nU3R5bGUgPSBjcmVhdGVNZW1vKCgpID0+IHtcbiAgICBjb25zdCBzdHJhdGVneSA9IGFjY2Vzcyhwcm9wcy5zdHJhdGVneSk7XG4gICAgY29uc3QgZmxvYXRpbmdTdGF0ZSA9IGFjY2Vzcyhwcm9wcy5mbG9hdGluZ1N0YXRlKTtcbiAgICBjb25zdCBzaWRlID0gZmxvYXRpbmdTdGF0ZS5wbGFjZW1lbnQuc3BsaXQoXCItXCIpWzBdO1xuICAgIGNvbnN0IGFsaWdubWVudCA9IGZsb2F0aW5nU3RhdGUucGxhY2VtZW50LnNwbGl0KFwiLVwiKVsxXTtcbiAgICBsZXQgdHJhbnNmb3JtT3JpZ2luO1xuICAgIHN3aXRjaCAoZmxvYXRpbmdTdGF0ZS5wbGFjZW1lbnQpIHtcbiAgICAgIGNhc2UgXCJ0b3BcIjpcbiAgICAgIGNhc2UgXCJib3R0b21cIjpcbiAgICAgICAgdHJhbnNmb3JtT3JpZ2luID0gYCR7YWxpZ25tZW50ID8gYWxpZ25tZW50IDogXCJjZW50ZXJcIn0gJHtQb3NpdGlvblRvRGlyZWN0aW9uW3NpZGVdfWA7XG4gICAgICBjYXNlIFwibGVmdFwiOlxuICAgICAgY2FzZSBcInJpZ2h0XCI6XG4gICAgICAgIHRyYW5zZm9ybU9yaWdpbiA9IGAke1Bvc2l0aW9uVG9EaXJlY3Rpb25bc2lkZV19ICR7YWxpZ25tZW50ID8gYWxpZ25tZW50IDogXCJjZW50ZXJcIn1gO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgcG9zaXRpb246IHN0cmF0ZWd5LFxuICAgICAgdG9wOiBgJHtmbG9hdGluZ1N0YXRlLnl9cHhgLFxuICAgICAgbGVmdDogYCR7ZmxvYXRpbmdTdGF0ZS54fXB4YCxcbiAgICAgIHdpZHRoOiBmbG9hdGluZ1N0YXRlLndpZHRoICE9PSBudWxsID8gYCR7ZmxvYXRpbmdTdGF0ZS53aWR0aH1weGAgOiB2b2lkIDAsXG4gICAgICBoZWlnaHQ6IGZsb2F0aW5nU3RhdGUuaGVpZ2h0ICE9PSBudWxsID8gYCR7ZmxvYXRpbmdTdGF0ZS5oZWlnaHR9cHhgIDogdm9pZCAwLFxuICAgICAgXCJtYXgtd2lkdGhcIjogZmxvYXRpbmdTdGF0ZS5tYXhXaWR0aCAhPT0gbnVsbCA/IGAke2Zsb2F0aW5nU3RhdGUubWF4V2lkdGh9cHhgIDogdm9pZCAwLFxuICAgICAgXCJtYXgtaGVpZ2h0XCI6IGZsb2F0aW5nU3RhdGUubWF4SGVpZ2h0ICE9PSBudWxsID8gYCR7ZmxvYXRpbmdTdGF0ZS5tYXhIZWlnaHR9cHhgIDogdm9pZCAwLFxuICAgICAgXCItLWNvcnZ1LWZsb2F0aW5nLXRyYW5zZm9ybS1vcmlnaW5cIjogdHJhbnNmb3JtT3JpZ2luXG4gICAgfTtcbiAgfSk7XG4gIHJldHVybiBtZW1vaXplZEZsb2F0aW5nU3R5bGU7XG59O1xudmFyIFBvc2l0aW9uVG9EaXJlY3Rpb24gPSB7XG4gIHRvcDogXCJib3R0b21cIixcbiAgYm90dG9tOiBcInRvcFwiLFxuICBsZWZ0OiBcInJpZ2h0XCIsXG4gIHJpZ2h0OiBcImxlZnRcIlxufTtcblxuZXhwb3J0IHsgUG9zaXRpb25Ub0RpcmVjdGlvbiwgZ2V0RmxvYXRpbmdTdHlsZSB9O1xuIiwgImltcG9ydCB7IER5bmFtaWNfZGVmYXVsdCB9IGZyb20gJy4uL2NodW5rLzdURUlRVEpaLmpzJztcbmltcG9ydCB7IFBvc2l0aW9uVG9EaXJlY3Rpb24gfSBmcm9tICcuLi9jaHVuay8yTkJRUFZJRy5qcyc7XG5pbXBvcnQgeyBjcmVhdGVDb21wb25lbnQsIG1lcmdlUHJvcHMgYXMgbWVyZ2VQcm9wcyQxLCB0ZW1wbGF0ZSB9IGZyb20gJ3NvbGlkLWpzL3dlYic7XG5pbXBvcnQgeyBtZXJnZVByb3BzLCBzcGxpdFByb3BzLCBjcmVhdGVNZW1vLCBjaGlsZHJlbiwgU2hvdyB9IGZyb20gJ3NvbGlkLWpzJztcblxudmFyIF90bXBsJCA9IC8qIEBfX1BVUkVfXyAqLyB0ZW1wbGF0ZShgPHN2ZyB2aWV3Qm94PVwiMCAwIDE0IDhcImZpbGw9bm9uZSB4bWxucz1odHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zz48cGF0aCBkPVwiTTAgMEw2LjI0NzQyIDcuMTM5OTFDNi42NDU4MyA3LjU5NTI0IDcuMzU0MTYgNy41OTUyNCA3Ljc1MjU4IDcuMTM5OTFMMTQgMEgwWlwiZmlsbD1jdXJyZW50Q29sb3I+YCk7XG52YXIgREVGQVVMVF9GTE9BVElOR19BUlJPV19FTEVNRU5UID0gXCJkaXZcIjtcbnZhciBUcmFuc2Zvcm0gPSB7XG4gIHRvcDogXCJyb3RhdGUoMTgwZGVnKVwiLFxuICBib3R0b206IFwidHJhbnNsYXRlM2QoMCwgMTAwJSwgMClcIixcbiAgbGVmdDogXCJ0cmFuc2xhdGUzZCgwLCA1MCUsIDApIHJvdGF0ZSg5MGRlZykgdHJhbnNsYXRlM2QoLTUwJSwgMCwgMClcIixcbiAgcmlnaHQ6IFwidHJhbnNsYXRlM2QoMCwgNTAlLCAwKSByb3RhdGUoLTkwZGVnKSB0cmFuc2xhdGUzZCg1MCUsIDAsIDApXCJcbn07XG52YXIgVHJhbnNmb3JtT3JpZ2luID0ge1xuICB0b3A6IFwiY2VudGVyIDBweFwiLFxuICBib3R0b206IHZvaWQgMCxcbiAgbGVmdDogXCIwcHggMHB4XCIsXG4gIHJpZ2h0OiBcIjEwMCUgMHB4XCJcbn07XG52YXIgRmxvYXRpbmdBcnJvdyA9IChwcm9wcykgPT4ge1xuICBjb25zdCBkZWZhdWx0ZWRQcm9wcyA9IG1lcmdlUHJvcHMoe1xuICAgIHNpemU6IDE2XG4gIH0sIHByb3BzKTtcbiAgY29uc3QgW2xvY2FsUHJvcHMsIG90aGVyUHJvcHNdID0gc3BsaXRQcm9wcyhkZWZhdWx0ZWRQcm9wcywgW1wiYXNcIiwgXCJmbG9hdGluZ1N0YXRlXCIsIFwic2l6ZVwiLCBcInN0eWxlXCIsIFwiY2hpbGRyZW5cIl0pO1xuICBjb25zdCBhcnJvd0RpcmVjdGlvbiA9IGNyZWF0ZU1lbW8oKCkgPT4gUG9zaXRpb25Ub0RpcmVjdGlvbltsb2NhbFByb3BzLmZsb2F0aW5nU3RhdGUucGxhY2VtZW50LnNwbGl0KFwiLVwiKVswXV0pO1xuICBjb25zdCBhcnJvd1RvcCA9IGNyZWF0ZU1lbW8oKCkgPT4ge1xuICAgIGNvbnN0IHkgPSBsb2NhbFByb3BzLmZsb2F0aW5nU3RhdGUuYXJyb3dZO1xuICAgIGlmICh5ID09PSBudWxsKVxuICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICByZXR1cm4gYCR7eX1weGA7XG4gIH0pO1xuICBjb25zdCBhcnJvd0xlZnQgPSBjcmVhdGVNZW1vKCgpID0+IHtcbiAgICBjb25zdCB4ID0gbG9jYWxQcm9wcy5mbG9hdGluZ1N0YXRlLmFycm93WDtcbiAgICBpZiAoeCA9PT0gbnVsbClcbiAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgcmV0dXJuIGAke3h9cHhgO1xuICB9KTtcbiAgY29uc3QgcmVzb2x2ZUNoaWxkcmVuID0gY2hpbGRyZW4oKCkgPT4gbG9jYWxQcm9wcy5jaGlsZHJlbik7XG4gIGNvbnN0IGRlZmF1bHRBcnJvdyA9ICgpID0+IHJlc29sdmVDaGlsZHJlbi50b0FycmF5KCkubGVuZ3RoID09PSAwO1xuICByZXR1cm4gY3JlYXRlQ29tcG9uZW50KER5bmFtaWNfZGVmYXVsdCwgbWVyZ2VQcm9wcyQxKHtcbiAgICBnZXQgYXMoKSB7XG4gICAgICByZXR1cm4gbG9jYWxQcm9wcy5hcyA/PyBERUZBVUxUX0ZMT0FUSU5HX0FSUk9XX0VMRU1FTlQ7XG4gICAgfSxcbiAgICBnZXQgc3R5bGUoKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLFxuICAgICAgICBsZWZ0OiBhcnJvd0xlZnQoKSxcbiAgICAgICAgdG9wOiBhcnJvd1RvcCgpLFxuICAgICAgICBbYXJyb3dEaXJlY3Rpb24oKV06IFwiMHB4XCIsXG4gICAgICAgIHRyYW5zZm9ybTogVHJhbnNmb3JtW2Fycm93RGlyZWN0aW9uKCldLFxuICAgICAgICBcInRyYW5zZm9ybS1vcmlnaW5cIjogVHJhbnNmb3JtT3JpZ2luW2Fycm93RGlyZWN0aW9uKCldLFxuICAgICAgICBoZWlnaHQ6IGRlZmF1bHRBcnJvdygpID8gYCR7bG9jYWxQcm9wcy5zaXplfXB4YCA6IHZvaWQgMCxcbiAgICAgICAgd2lkdGg6IGRlZmF1bHRBcnJvdygpID8gYCR7bG9jYWxQcm9wcy5zaXplfXB4YCA6IHZvaWQgMCxcbiAgICAgICAgXCJwb2ludGVyLWV2ZW50c1wiOiBcIm5vbmVcIixcbiAgICAgICAgLi4ubG9jYWxQcm9wcy5zdHlsZVxuICAgICAgfTtcbiAgICB9XG4gIH0sIG90aGVyUHJvcHMsIHtcbiAgICBnZXQgY2hpbGRyZW4oKSB7XG4gICAgICByZXR1cm4gY3JlYXRlQ29tcG9uZW50KFNob3csIHtcbiAgICAgICAgZ2V0IHdoZW4oKSB7XG4gICAgICAgICAgcmV0dXJuIGRlZmF1bHRBcnJvdygpO1xuICAgICAgICB9LFxuICAgICAgICBnZXQgZmFsbGJhY2soKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc29sdmVDaGlsZHJlbigpO1xuICAgICAgICB9LFxuICAgICAgICBnZXQgY2hpbGRyZW4oKSB7XG4gICAgICAgICAgcmV0dXJuIF90bXBsJCgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH0pKTtcbn07XG52YXIgRmxvYXRpbmdBcnJvd19kZWZhdWx0ID0gRmxvYXRpbmdBcnJvdztcblxuZXhwb3J0IHsgREVGQVVMVF9GTE9BVElOR19BUlJPV19FTEVNRU5ULCBGbG9hdGluZ0Fycm93X2RlZmF1bHQgYXMgZGVmYXVsdCB9O1xuIiwgImltcG9ydCB7IGFjY2VzcyB9IGZyb20gJy4vT1pDSTRORE4uanMnO1xuaW1wb3J0IHsgY3JlYXRlRWZmZWN0LCBvbkNsZWFudXAgfSBmcm9tICdzb2xpZC1qcyc7XG5cbnZhciBhY3RpdmVTdHlsZXMgPSAvKiBAX19QVVJFX18gKi8gbmV3IE1hcCgpO1xudmFyIGNyZWF0ZVN0eWxlID0gKHByb3BzKSA9PiB7XG4gIGNyZWF0ZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3Qgc3R5bGUgPSBhY2Nlc3MocHJvcHMuc3R5bGUpID8/IHt9O1xuICAgIGNvbnN0IHByb3BlcnRpZXMgPSBhY2Nlc3MocHJvcHMucHJvcGVydGllcykgPz8gW107XG4gICAgY29uc3Qgb3JpZ2luYWxTdHlsZXMgPSB7fTtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBzdHlsZSkge1xuICAgICAgb3JpZ2luYWxTdHlsZXNba2V5XSA9IHByb3BzLmVsZW1lbnQuc3R5bGVba2V5XTtcbiAgICB9XG4gICAgY29uc3QgYWN0aXZlU3R5bGUgPSBhY3RpdmVTdHlsZXMuZ2V0KHByb3BzLmtleSk7XG4gICAgaWYgKGFjdGl2ZVN0eWxlKSB7XG4gICAgICBhY3RpdmVTdHlsZS5hY3RpdmVDb3VudCsrO1xuICAgIH0gZWxzZSB7XG4gICAgICBhY3RpdmVTdHlsZXMuc2V0KHByb3BzLmtleSwge1xuICAgICAgICBhY3RpdmVDb3VudDogMSxcbiAgICAgICAgb3JpZ2luYWxTdHlsZXMsXG4gICAgICAgIHByb3BlcnRpZXM6IHByb3BlcnRpZXMubWFwKChwcm9wZXJ0eSkgPT4gcHJvcGVydHkua2V5KVxuICAgICAgfSk7XG4gICAgfVxuICAgIE9iamVjdC5hc3NpZ24ocHJvcHMuZWxlbWVudC5zdHlsZSwgcHJvcHMuc3R5bGUpO1xuICAgIGZvciAoY29uc3QgcHJvcGVydHkgb2YgcHJvcGVydGllcykge1xuICAgICAgcHJvcHMuZWxlbWVudC5zdHlsZS5zZXRQcm9wZXJ0eShwcm9wZXJ0eS5rZXksIHByb3BlcnR5LnZhbHVlKTtcbiAgICB9XG4gICAgb25DbGVhbnVwKCgpID0+IHtcbiAgICAgIGNvbnN0IGFjdGl2ZVN0eWxlMiA9IGFjdGl2ZVN0eWxlcy5nZXQocHJvcHMua2V5KTtcbiAgICAgIGlmICghYWN0aXZlU3R5bGUyKVxuICAgICAgICByZXR1cm47XG4gICAgICBpZiAoYWN0aXZlU3R5bGUyLmFjdGl2ZUNvdW50ICE9PSAxKSB7XG4gICAgICAgIGFjdGl2ZVN0eWxlMi5hY3RpdmVDb3VudC0tO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBhY3RpdmVTdHlsZXMuZGVsZXRlKHByb3BzLmtleSk7XG4gICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhhY3RpdmVTdHlsZTIub3JpZ2luYWxTdHlsZXMpKSB7XG4gICAgICAgIHByb3BzLmVsZW1lbnQuc3R5bGVba2V5XSA9IHZhbHVlO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBwcm9wZXJ0eSBvZiBhY3RpdmVTdHlsZTIucHJvcGVydGllcykge1xuICAgICAgICBwcm9wcy5lbGVtZW50LnN0eWxlLnJlbW92ZVByb3BlcnR5KHByb3BlcnR5KTtcbiAgICAgIH1cbiAgICAgIGlmIChwcm9wcy5lbGVtZW50LnN0eWxlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBwcm9wcy5lbGVtZW50LnJlbW92ZUF0dHJpYnV0ZShcInN0eWxlXCIpO1xuICAgICAgfVxuICAgICAgcHJvcHMuY2xlYW51cD8uKCk7XG4gICAgfSk7XG4gIH0pO1xufTtcbnZhciBzdHlsZV9kZWZhdWx0ID0gY3JlYXRlU3R5bGU7XG5cbmV4cG9ydCB7IHN0eWxlX2RlZmF1bHQgfTtcbiIsICJpbXBvcnQgeyBzdHlsZV9kZWZhdWx0IH0gZnJvbSAnLi82UFlVS1NXUS5qcyc7XG5pbXBvcnQgeyBhY2Nlc3MgfSBmcm9tICcuL09aQ0k0TkROLmpzJztcbmltcG9ydCB7IG1lcmdlUHJvcHMsIGNyZWF0ZUVmZmVjdCB9IGZyb20gJ3NvbGlkLWpzJztcblxudmFyIGNyZWF0ZU5vUG9pbnRlckV2ZW50cyA9IChwcm9wcykgPT4ge1xuICBjb25zdCBkZWZhdWx0ZWRQcm9wcyA9IG1lcmdlUHJvcHMoXG4gICAge1xuICAgICAgZW5hYmxlZDogdHJ1ZVxuICAgIH0sXG4gICAgcHJvcHNcbiAgKTtcbiAgY3JlYXRlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCB7IGJvZHkgfSA9IGRvY3VtZW50O1xuICAgIGlmICghYWNjZXNzKGRlZmF1bHRlZFByb3BzLmVuYWJsZWQpKVxuICAgICAgcmV0dXJuO1xuICAgIHN0eWxlX2RlZmF1bHQoe1xuICAgICAga2V5OiBcIm5vLXBvaW50ZXItZXZlbnRzXCIsXG4gICAgICBlbGVtZW50OiBib2R5LFxuICAgICAgc3R5bGU6IHtcbiAgICAgICAgcG9pbnRlckV2ZW50czogXCJub25lXCJcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59O1xudmFyIG5vUG9pbnRlckV2ZW50c19kZWZhdWx0ID0gY3JlYXRlTm9Qb2ludGVyRXZlbnRzO1xuXG5leHBvcnQgeyBub1BvaW50ZXJFdmVudHNfZGVmYXVsdCB9O1xuIiwgImltcG9ydCB7IGFjY2VzcyB9IGZyb20gJy4vT1pDSTRORE4uanMnO1xuaW1wb3J0IHsgbWVyZ2VQcm9wcywgY3JlYXRlRWZmZWN0LCBvbkNsZWFudXAgfSBmcm9tICdzb2xpZC1qcyc7XG5cbnZhciBjcmVhdGVPdXRzaWRlUG9pbnRlciA9IChwcm9wcykgPT4ge1xuICBjb25zdCBkZWZhdWx0ZWRQcm9wcyA9IG1lcmdlUHJvcHMoXG4gICAge1xuICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgIHN0cmF0ZWd5OiBcInBvaW50ZXJ1cFwiXG4gICAgfSxcbiAgICBwcm9wc1xuICApO1xuICBjcmVhdGVFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghYWNjZXNzKGRlZmF1bHRlZFByb3BzLmVuYWJsZWQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHN0cmF0ZWd5ID0gYWNjZXNzKGRlZmF1bHRlZFByb3BzLnN0cmF0ZWd5KTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKHN0cmF0ZWd5LCBoYW5kbGVQb2ludGVyKTtcbiAgICBvbkNsZWFudXAoKCkgPT4ge1xuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihzdHJhdGVneSwgaGFuZGxlUG9pbnRlcik7XG4gICAgfSk7XG4gIH0pO1xuICBjb25zdCBoYW5kbGVQb2ludGVyID0gKGV2ZW50KSA9PiB7XG4gICAgY29uc3QgZWxlbWVudCA9IGFjY2VzcyhkZWZhdWx0ZWRQcm9wcy5lbGVtZW50KTtcbiAgICBjb25zdCBpZ25vcmUgPSBhY2Nlc3MoZGVmYXVsdGVkUHJvcHMuaWdub3JlKTtcbiAgICBpZiAoZWxlbWVudCAmJiAhZWxlbWVudC5jb250YWlucyhldmVudC50YXJnZXQpICYmICEoaWdub3JlICYmIGlnbm9yZS5jb250YWlucyhldmVudC50YXJnZXQpKSkge1xuICAgICAgZGVmYXVsdGVkUHJvcHMub25Qb2ludGVyKGV2ZW50KTtcbiAgICB9XG4gIH07XG59O1xudmFyIG91dHNpZGVQb2ludGVyX2RlZmF1bHQgPSBjcmVhdGVPdXRzaWRlUG9pbnRlcjtcblxuZXhwb3J0IHsgb3V0c2lkZVBvaW50ZXJfZGVmYXVsdCB9O1xuIiwgImltcG9ydCB7IGFjY2VzcyB9IGZyb20gJy4vT1pDSTRORE4uanMnO1xuaW1wb3J0IHsgbWVyZ2VQcm9wcywgY3JlYXRlRWZmZWN0LCBvbkNsZWFudXAgfSBmcm9tICdzb2xpZC1qcyc7XG5cbnZhciBjcmVhdGVFc2NhcGVLZXlEb3duID0gKHByb3BzKSA9PiB7XG4gIGNvbnN0IGRlZmF1bHRlZFByb3BzID0gbWVyZ2VQcm9wcyhcbiAgICB7XG4gICAgICBlbmFibGVkOiB0cnVlXG4gICAgfSxcbiAgICBwcm9wc1xuICApO1xuICBjcmVhdGVFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghYWNjZXNzKGRlZmF1bHRlZFByb3BzLmVuYWJsZWQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGhhbmRsZUtleURvd24pO1xuICAgIG9uQ2xlYW51cCgoKSA9PiB7XG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBoYW5kbGVLZXlEb3duKTtcbiAgICB9KTtcbiAgfSk7XG4gIGNvbnN0IGhhbmRsZUtleURvd24gPSAoZXZlbnQpID0+IHtcbiAgICBpZiAoZXZlbnQua2V5ID09PSBcIkVzY2FwZVwiKSB7XG4gICAgICBkZWZhdWx0ZWRQcm9wcy5vbkVzY2FwZUtleURvd24oZXZlbnQpO1xuICAgIH1cbiAgfTtcbn07XG52YXIgZXNjYXBlS2V5RG93bl9kZWZhdWx0ID0gY3JlYXRlRXNjYXBlS2V5RG93bjtcblxuZXhwb3J0IHsgZXNjYXBlS2V5RG93bl9kZWZhdWx0IH07XG4iLCAiaW1wb3J0IHsgbm9Qb2ludGVyRXZlbnRzX2RlZmF1bHQgfSBmcm9tICcuL1JJUjZKUVlGLmpzJztcbmltcG9ydCB7IG91dHNpZGVQb2ludGVyX2RlZmF1bHQgfSBmcm9tICcuL1pHQkNDT0tXLmpzJztcbmltcG9ydCB7IGVzY2FwZUtleURvd25fZGVmYXVsdCB9IGZyb20gJy4vSzZFUExXVTMuanMnO1xuaW1wb3J0IHsgbWVyZ2VQcm9wcyB9IGZyb20gJ3NvbGlkLWpzJztcblxudmFyIGNyZWF0ZURpc21pc3NpYmxlID0gKHByb3BzKSA9PiB7XG4gIGNvbnN0IGRlZmF1bHRlZFByb3BzID0gbWVyZ2VQcm9wcyhcbiAgICB7XG4gICAgICBkaXNtaXNzT25Fc2NhcGVLZXlEb3duOiB0cnVlLFxuICAgICAgZGlzbWlzc09uT3V0c2lkZVBvaW50ZXI6IHRydWUsXG4gICAgICBjbG9zZU9uT3V0c2lkZVBvaW50ZXJTdHJhdGVneTogXCJwb2ludGVydXBcIixcbiAgICAgIG5vT3V0c2lkZVBvaW50ZXJFdmVudHM6IHRydWVcbiAgICB9LFxuICAgIHByb3BzXG4gICk7XG4gIGVzY2FwZUtleURvd25fZGVmYXVsdCh7XG4gICAgZW5hYmxlZDogZGVmYXVsdGVkUHJvcHMuZGlzbWlzc09uRXNjYXBlS2V5RG93bixcbiAgICBvbkVzY2FwZUtleURvd246IChldmVudCkgPT4ge1xuICAgICAgZGVmYXVsdGVkUHJvcHMub25Fc2NhcGVLZXlEb3duPy4oZXZlbnQpO1xuICAgICAgaWYgKCFldmVudC5kZWZhdWx0UHJldmVudGVkKSB7XG4gICAgICAgIGRlZmF1bHRlZFByb3BzLm9uRGlzbWlzcyhcImVzY2FwZUtleVwiKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuICBvdXRzaWRlUG9pbnRlcl9kZWZhdWx0KHtcbiAgICBlbmFibGVkOiBkZWZhdWx0ZWRQcm9wcy5kaXNtaXNzT25PdXRzaWRlUG9pbnRlcixcbiAgICBzdHJhdGVneTogZGVmYXVsdGVkUHJvcHMuY2xvc2VPbk91dHNpZGVQb2ludGVyU3RyYXRlZ3ksXG4gICAgaWdub3JlOiBkZWZhdWx0ZWRQcm9wcy5kaXNtaXNzT25PdXRzaWRlUG9pbnRlcklnbm9yZSxcbiAgICBvblBvaW50ZXI6IChldmVudCkgPT4ge1xuICAgICAgZGVmYXVsdGVkUHJvcHMub25PdXRzaWRlUG9pbnRlcj8uKGV2ZW50KTtcbiAgICAgIGlmICghZXZlbnQuZGVmYXVsdFByZXZlbnRlZCkge1xuICAgICAgICBjb25zdCBjdHJsTGVmdENsaWNrID0gZXZlbnQuYnV0dG9uID09PSAwICYmIGV2ZW50LmN0cmxLZXkgPT09IHRydWU7XG4gICAgICAgIGNvbnN0IGlzUmlnaHRDbGljayA9IGV2ZW50LmJ1dHRvbiA9PT0gMiB8fCBjdHJsTGVmdENsaWNrO1xuICAgICAgICBpZiAoaXNSaWdodENsaWNrKVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgZGVmYXVsdGVkUHJvcHMub25EaXNtaXNzKFwicG9pbnRlck91dHNpZGVcIik7XG4gICAgICB9XG4gICAgfSxcbiAgICBlbGVtZW50OiBkZWZhdWx0ZWRQcm9wcy5lbGVtZW50XG4gIH0pO1xuICBub1BvaW50ZXJFdmVudHNfZGVmYXVsdCh7XG4gICAgZW5hYmxlZDogZGVmYXVsdGVkUHJvcHMubm9PdXRzaWRlUG9pbnRlckV2ZW50c1xuICB9KTtcbn07XG52YXIgZGlzbWlzc2libGVfZGVmYXVsdCA9IGNyZWF0ZURpc21pc3NpYmxlO1xuXG5leHBvcnQgeyBkaXNtaXNzaWJsZV9kZWZhdWx0IH07XG4iLCAiaW1wb3J0IHsgaXNGdW5jdGlvbiB9IGZyb20gJy4uL2NodW5rLzJXT0tPSFpTLmpzJztcbmltcG9ydCB7IGRpc21pc3NpYmxlX2RlZmF1bHQgfSBmcm9tICcuLi9jaHVuay81RzNaRFNVMy5qcyc7XG5pbXBvcnQgeyBhY2Nlc3MgfSBmcm9tICcuLi9jaHVuay9PWkNJNE5ETi5qcyc7XG5pbXBvcnQgeyBjcmVhdGVDb21wb25lbnQgfSBmcm9tICdzb2xpZC1qcy93ZWInO1xuaW1wb3J0IHsgY3JlYXRlQ29udGV4dCwgY3JlYXRlTWVtbywgdXNlQ29udGV4dCwgY3JlYXRlVW5pcXVlSWQsIGNyZWF0ZVNpZ25hbCwgbWVyZ2VQcm9wcywgc3BsaXRQcm9wcywgb25DbGVhbnVwLCBjcmVhdGVFZmZlY3QsIHVudHJhY2sgfSBmcm9tICdzb2xpZC1qcyc7XG5cbnZhciBEaXNtaXNzaWJsZUNvbnRleHQgPSBjcmVhdGVDb250ZXh0KCk7XG52YXIgRGlzbWlzc2libGUgPSAocHJvcHMpID0+IHtcbiAgY29uc3QgbWVtb2l6ZWREaXNtaXNzaWJsZSA9IGNyZWF0ZU1lbW8oKCkgPT4ge1xuICAgIGNvbnN0IHVwcGVyQ29udGV4dCA9IHVzZUNvbnRleHQoRGlzbWlzc2libGVDb250ZXh0KTtcbiAgICBpZiAodXBwZXJDb250ZXh0KSB7XG4gICAgICByZXR1cm4gY3JlYXRlQ29tcG9uZW50KERpc21pc3NpYmxlTGF5ZXIsIHByb3BzKTtcbiAgICB9XG4gICAgY29uc3QgbGF5ZXJJZCA9IGNyZWF0ZVVuaXF1ZUlkKCk7XG4gICAgY29uc3QgW2xheWVycywgc2V0TGF5ZXJzXSA9IGNyZWF0ZVNpZ25hbChbbGF5ZXJJZF0pO1xuICAgIGNvbnN0IG9uTGF5ZXJTaG93ID0gKGxheWVySWQyKSA9PiB7XG4gICAgICBzZXRMYXllcnMoKGxheWVyczIpID0+IFsuLi5sYXllcnMyLCBsYXllcklkMl0pO1xuICAgIH07XG4gICAgY29uc3Qgb25MYXllckRpc21pc3MgPSAobGF5ZXJJZDIpID0+IHtcbiAgICAgIHNldExheWVycygobGF5ZXJzMikgPT4gbGF5ZXJzMi5maWx0ZXIoKGxheWVyKSA9PiBsYXllciAhPT0gbGF5ZXJJZDIpKTtcbiAgICB9O1xuICAgIHJldHVybiBjcmVhdGVDb21wb25lbnQoRGlzbWlzc2libGVDb250ZXh0LlByb3ZpZGVyLCB7XG4gICAgICB2YWx1ZToge1xuICAgICAgICBsYXllcnMsXG4gICAgICAgIG9uTGF5ZXJTaG93LFxuICAgICAgICBvbkxheWVyRGlzbWlzc1xuICAgICAgfSxcbiAgICAgIGdldCBjaGlsZHJlbigpIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUNvbXBvbmVudChEaXNtaXNzaWJsZUxheWVyLCBwcm9wcyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xuICByZXR1cm4gbWVtb2l6ZWREaXNtaXNzaWJsZTtcbn07XG52YXIgRGlzbWlzc2libGVMYXllciA9IChwcm9wcykgPT4ge1xuICBjb25zdCBkZWZhdWx0ZWRQcm9wcyA9IG1lcmdlUHJvcHMoe1xuICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgZGlzbWlzc09uRXNjYXBlS2V5RG93bjogdHJ1ZSxcbiAgICBkaXNtaXNzT25PdXRzaWRlUG9pbnRlcjogdHJ1ZSxcbiAgICBkaXNtaXNzT25PdXRzaWRlUG9pbnRlclN0cmF0ZWd5OiBcInBvaW50ZXJ1cFwiLFxuICAgIG5vT3V0c2lkZVBvaW50ZXJFdmVudHM6IHRydWVcbiAgfSwgcHJvcHMpO1xuICBjb25zdCBbbG9jYWxQcm9wcywgb3RoZXJQcm9wc10gPSBzcGxpdFByb3BzKGRlZmF1bHRlZFByb3BzLCBbXCJlbmFibGVkXCIsIFwiY2hpbGRyZW5cIiwgXCJkaXNtaXNzT25Fc2NhcGVLZXlEb3duXCIsIFwiZGlzbWlzc09uT3V0c2lkZVBvaW50ZXJcIiwgXCJkaXNtaXNzT25PdXRzaWRlUG9pbnRlclN0cmF0ZWd5XCIsIFwiZGlzbWlzc09uT3V0c2lkZVBvaW50ZXJJZ25vcmVcIiwgXCJub091dHNpZGVQb2ludGVyRXZlbnRzXCIsIFwib25EaXNtaXNzXCJdKTtcbiAgY29uc3QgY29udGV4dCA9IHVzZUNvbnRleHQoRGlzbWlzc2libGVDb250ZXh0KTtcbiAgY29uc3QgbGF5ZXJJZCA9IGNyZWF0ZVVuaXF1ZUlkKCk7XG4gIG9uQ2xlYW51cCgoKSA9PiB7XG4gICAgY29udGV4dC5vbkxheWVyRGlzbWlzcyhsYXllcklkKTtcbiAgfSk7XG4gIGNyZWF0ZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKGxvY2FsUHJvcHMuZW5hYmxlZCkge1xuICAgICAgY29udGV4dC5vbkxheWVyU2hvdyhsYXllcklkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29udGV4dC5vbkxheWVyRGlzbWlzcyhsYXllcklkKTtcbiAgICB9XG4gIH0pO1xuICBjb25zdCBpc0xhc3RMYXllciA9ICgpID0+IHtcbiAgICByZXR1cm4gY29udGV4dC5sYXllcnMoKVtjb250ZXh0LmxheWVycygpLmxlbmd0aCAtIDFdID09PSBsYXllcklkO1xuICB9O1xuICBkaXNtaXNzaWJsZV9kZWZhdWx0KHtcbiAgICBkaXNtaXNzT25Fc2NhcGVLZXlEb3duOiAoKSA9PiBhY2Nlc3MobG9jYWxQcm9wcy5kaXNtaXNzT25Fc2NhcGVLZXlEb3duKSAmJiBpc0xhc3RMYXllcigpICYmIGxvY2FsUHJvcHMuZW5hYmxlZCxcbiAgICBkaXNtaXNzT25PdXRzaWRlUG9pbnRlcjogKCkgPT4gYWNjZXNzKGxvY2FsUHJvcHMuZGlzbWlzc09uT3V0c2lkZVBvaW50ZXIpICYmIGlzTGFzdExheWVyKCkgJiYgbG9jYWxQcm9wcy5lbmFibGVkLFxuICAgIGRpc21pc3NPbk91dHNpZGVQb2ludGVyU3RyYXRlZ3k6IGxvY2FsUHJvcHMuZGlzbWlzc09uT3V0c2lkZVBvaW50ZXJTdHJhdGVneSxcbiAgICBkaXNtaXNzT25PdXRzaWRlUG9pbnRlcklnbm9yZTogbG9jYWxQcm9wcy5kaXNtaXNzT25PdXRzaWRlUG9pbnRlcklnbm9yZSxcbiAgICBub091dHNpZGVQb2ludGVyRXZlbnRzOiAoKSA9PiBhY2Nlc3MobG9jYWxQcm9wcy5ub091dHNpZGVQb2ludGVyRXZlbnRzKSAmJiBsb2NhbFByb3BzLmVuYWJsZWQsXG4gICAgb25EaXNtaXNzOiAocmVhc29uKSA9PiB7XG4gICAgICBsb2NhbFByb3BzLm9uRGlzbWlzcyhyZWFzb24pO1xuICAgIH0sXG4gICAgLi4ub3RoZXJQcm9wc1xuICB9KTtcbiAgY29uc3QgbWVtb2l6ZWRDaGlsZHJlbiA9IGNyZWF0ZU1lbW8oKCkgPT4gbG9jYWxQcm9wcy5jaGlsZHJlbik7XG4gIGNvbnN0IHJlc29sdmVDaGlsZHJlbiA9ICgpID0+IHtcbiAgICBjb25zdCBjaGlsZHJlbiA9IG1lbW9pemVkQ2hpbGRyZW4oKTtcbiAgICBpZiAoaXNGdW5jdGlvbihjaGlsZHJlbikpIHtcbiAgICAgIHJldHVybiBjaGlsZHJlbih7XG4gICAgICAgIGdldCBpc0xhc3RMYXllcigpIHtcbiAgICAgICAgICByZXR1cm4gaXNMYXN0TGF5ZXIoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBjaGlsZHJlbjtcbiAgfTtcbiAgcmV0dXJuIHVudHJhY2soKCkgPT4gcmVzb2x2ZUNoaWxkcmVuKCkpO1xufTtcbnZhciBEaXNtaXNzaWJsZV9kZWZhdWx0ID0gRGlzbWlzc2libGU7XG5cbmV4cG9ydCB7IERpc21pc3NpYmxlX2RlZmF1bHQgYXMgZGVmYXVsdCB9O1xuIiwgImltcG9ydCB7IGlzRnVuY3Rpb24gfSBmcm9tICcuLzJXT0tPSFpTLmpzJztcblxuLy8gc3JjL2RvbS9saWIudHNcbnZhciBhZnRlclBhaW50ID0gKGZuKSA9PiByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZuKSk7XG52YXIgY2FsbEV2ZW50SGFuZGxlciA9IChldmVudEhhbmRsZXIsIGV2ZW50KSA9PiB7XG4gIGlmIChldmVudEhhbmRsZXIpIHtcbiAgICBpZiAoaXNGdW5jdGlvbihldmVudEhhbmRsZXIpKSB7XG4gICAgICBldmVudEhhbmRsZXIoZXZlbnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBldmVudEhhbmRsZXJbMF0oZXZlbnRIYW5kbGVyWzFdLCBldmVudCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBldmVudC5kZWZhdWx0UHJldmVudGVkO1xufTtcbnZhciBzb3J0QnlEb2N1bWVudFBvc2l0aW9uID0gKGEsIGIpID0+IHtcbiAgY29uc3QgcmVsYXRpdmVQb3NpdGlvbiA9IGEuY29tcGFyZURvY3VtZW50UG9zaXRpb24oYik7XG4gIGlmIChyZWxhdGl2ZVBvc2l0aW9uICYgTm9kZS5ET0NVTUVOVF9QT1NJVElPTl9QUkVDRURJTkcgfHwgcmVsYXRpdmVQb3NpdGlvbiAmIE5vZGUuRE9DVU1FTlRfUE9TSVRJT05fQ09OVEFJTlMpIHtcbiAgICByZXR1cm4gMTtcbiAgfVxuICBpZiAocmVsYXRpdmVQb3NpdGlvbiAmIE5vZGUuRE9DVU1FTlRfUE9TSVRJT05fRk9MTE9XSU5HIHx8IHJlbGF0aXZlUG9zaXRpb24gJiBOb2RlLkRPQ1VNRU5UX1BPU0lUSU9OX0NPTlRBSU5FRF9CWSkge1xuICAgIHJldHVybiAtMTtcbiAgfVxuICByZXR1cm4gMDtcbn07XG5cbmV4cG9ydCB7IGFmdGVyUGFpbnQsIGNhbGxFdmVudEhhbmRsZXIsIHNvcnRCeURvY3VtZW50UG9zaXRpb24gfTtcbiIsICJpbXBvcnQgeyBpc0Z1bmN0aW9uIH0gZnJvbSAnLi4vY2h1bmsvMldPS09IWlMuanMnO1xuaW1wb3J0IHsgY3JlYXRlU2lnbmFsLCB1bnRyYWNrIH0gZnJvbSAnc29saWQtanMnO1xuXG5mdW5jdGlvbiBjcmVhdGVDb250cm9sbGFibGVTaWduYWwocHJvcHMpIHtcbiAgY29uc3QgW3VuY29udHJvbGxlZFNpZ25hbCwgc2V0VW5jb250cm9sbGVkU2lnbmFsXSA9IGNyZWF0ZVNpZ25hbChcbiAgICBwcm9wcy5pbml0aWFsVmFsdWVcbiAgKTtcbiAgY29uc3QgaXNDb250cm9sbGVkID0gKCkgPT4gcHJvcHMudmFsdWU/LigpICE9PSB2b2lkIDA7XG4gIGNvbnN0IHZhbHVlID0gKCkgPT4gaXNDb250cm9sbGVkKCkgPyBwcm9wcy52YWx1ZT8uKCkgOiB1bmNvbnRyb2xsZWRTaWduYWwoKTtcbiAgY29uc3Qgc2V0VmFsdWUgPSAobmV4dCkgPT4ge1xuICAgIHJldHVybiB1bnRyYWNrKCgpID0+IHtcbiAgICAgIGxldCBuZXh0VmFsdWU7XG4gICAgICBpZiAoaXNGdW5jdGlvbihuZXh0KSkge1xuICAgICAgICBuZXh0VmFsdWUgPSBuZXh0KHZhbHVlKCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmV4dFZhbHVlID0gbmV4dDtcbiAgICAgIH1cbiAgICAgIGlmICghT2JqZWN0LmlzKG5leHRWYWx1ZSwgdmFsdWUoKSkpIHtcbiAgICAgICAgaWYgKCFpc0NvbnRyb2xsZWQoKSkge1xuICAgICAgICAgIHNldFVuY29udHJvbGxlZFNpZ25hbChuZXh0VmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHByb3BzLm9uQ2hhbmdlPy4obmV4dFZhbHVlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXh0VmFsdWU7XG4gICAgfSk7XG4gIH07XG4gIHJldHVybiBbdmFsdWUsIHNldFZhbHVlXTtcbn1cbnZhciBjb250cm9sbGFibGVTaWduYWxfZGVmYXVsdCA9IGNyZWF0ZUNvbnRyb2xsYWJsZVNpZ25hbDtcblxuZXhwb3J0IHsgY29udHJvbGxhYmxlU2lnbmFsX2RlZmF1bHQgYXMgZGVmYXVsdCB9O1xuIiwgIi8qKlxuICogQ3VzdG9tIHBvc2l0aW9uaW5nIHJlZmVyZW5jZSBlbGVtZW50LlxuICogQHNlZSBodHRwczovL2Zsb2F0aW5nLXVpLmNvbS9kb2NzL3ZpcnR1YWwtZWxlbWVudHNcbiAqL1xuXG5jb25zdCBzaWRlcyA9IFsndG9wJywgJ3JpZ2h0JywgJ2JvdHRvbScsICdsZWZ0J107XG5jb25zdCBhbGlnbm1lbnRzID0gWydzdGFydCcsICdlbmQnXTtcbmNvbnN0IHBsYWNlbWVudHMgPSAvKiNfX1BVUkVfXyovc2lkZXMucmVkdWNlKChhY2MsIHNpZGUpID0+IGFjYy5jb25jYXQoc2lkZSwgc2lkZSArIFwiLVwiICsgYWxpZ25tZW50c1swXSwgc2lkZSArIFwiLVwiICsgYWxpZ25tZW50c1sxXSksIFtdKTtcbmNvbnN0IG1pbiA9IE1hdGgubWluO1xuY29uc3QgbWF4ID0gTWF0aC5tYXg7XG5jb25zdCByb3VuZCA9IE1hdGgucm91bmQ7XG5jb25zdCBmbG9vciA9IE1hdGguZmxvb3I7XG5jb25zdCBjcmVhdGVDb29yZHMgPSB2ID0+ICh7XG4gIHg6IHYsXG4gIHk6IHZcbn0pO1xuY29uc3Qgb3Bwb3NpdGVTaWRlTWFwID0ge1xuICBsZWZ0OiAncmlnaHQnLFxuICByaWdodDogJ2xlZnQnLFxuICBib3R0b206ICd0b3AnLFxuICB0b3A6ICdib3R0b20nXG59O1xuY29uc3Qgb3Bwb3NpdGVBbGlnbm1lbnRNYXAgPSB7XG4gIHN0YXJ0OiAnZW5kJyxcbiAgZW5kOiAnc3RhcnQnXG59O1xuZnVuY3Rpb24gY2xhbXAoc3RhcnQsIHZhbHVlLCBlbmQpIHtcbiAgcmV0dXJuIG1heChzdGFydCwgbWluKHZhbHVlLCBlbmQpKTtcbn1cbmZ1bmN0aW9uIGV2YWx1YXRlKHZhbHVlLCBwYXJhbSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nID8gdmFsdWUocGFyYW0pIDogdmFsdWU7XG59XG5mdW5jdGlvbiBnZXRTaWRlKHBsYWNlbWVudCkge1xuICByZXR1cm4gcGxhY2VtZW50LnNwbGl0KCctJylbMF07XG59XG5mdW5jdGlvbiBnZXRBbGlnbm1lbnQocGxhY2VtZW50KSB7XG4gIHJldHVybiBwbGFjZW1lbnQuc3BsaXQoJy0nKVsxXTtcbn1cbmZ1bmN0aW9uIGdldE9wcG9zaXRlQXhpcyhheGlzKSB7XG4gIHJldHVybiBheGlzID09PSAneCcgPyAneScgOiAneCc7XG59XG5mdW5jdGlvbiBnZXRBeGlzTGVuZ3RoKGF4aXMpIHtcbiAgcmV0dXJuIGF4aXMgPT09ICd5JyA/ICdoZWlnaHQnIDogJ3dpZHRoJztcbn1cbmZ1bmN0aW9uIGdldFNpZGVBeGlzKHBsYWNlbWVudCkge1xuICByZXR1cm4gWyd0b3AnLCAnYm90dG9tJ10uaW5jbHVkZXMoZ2V0U2lkZShwbGFjZW1lbnQpKSA/ICd5JyA6ICd4Jztcbn1cbmZ1bmN0aW9uIGdldEFsaWdubWVudEF4aXMocGxhY2VtZW50KSB7XG4gIHJldHVybiBnZXRPcHBvc2l0ZUF4aXMoZ2V0U2lkZUF4aXMocGxhY2VtZW50KSk7XG59XG5mdW5jdGlvbiBnZXRBbGlnbm1lbnRTaWRlcyhwbGFjZW1lbnQsIHJlY3RzLCBydGwpIHtcbiAgaWYgKHJ0bCA9PT0gdm9pZCAwKSB7XG4gICAgcnRsID0gZmFsc2U7XG4gIH1cbiAgY29uc3QgYWxpZ25tZW50ID0gZ2V0QWxpZ25tZW50KHBsYWNlbWVudCk7XG4gIGNvbnN0IGFsaWdubWVudEF4aXMgPSBnZXRBbGlnbm1lbnRBeGlzKHBsYWNlbWVudCk7XG4gIGNvbnN0IGxlbmd0aCA9IGdldEF4aXNMZW5ndGgoYWxpZ25tZW50QXhpcyk7XG4gIGxldCBtYWluQWxpZ25tZW50U2lkZSA9IGFsaWdubWVudEF4aXMgPT09ICd4JyA/IGFsaWdubWVudCA9PT0gKHJ0bCA/ICdlbmQnIDogJ3N0YXJ0JykgPyAncmlnaHQnIDogJ2xlZnQnIDogYWxpZ25tZW50ID09PSAnc3RhcnQnID8gJ2JvdHRvbScgOiAndG9wJztcbiAgaWYgKHJlY3RzLnJlZmVyZW5jZVtsZW5ndGhdID4gcmVjdHMuZmxvYXRpbmdbbGVuZ3RoXSkge1xuICAgIG1haW5BbGlnbm1lbnRTaWRlID0gZ2V0T3Bwb3NpdGVQbGFjZW1lbnQobWFpbkFsaWdubWVudFNpZGUpO1xuICB9XG4gIHJldHVybiBbbWFpbkFsaWdubWVudFNpZGUsIGdldE9wcG9zaXRlUGxhY2VtZW50KG1haW5BbGlnbm1lbnRTaWRlKV07XG59XG5mdW5jdGlvbiBnZXRFeHBhbmRlZFBsYWNlbWVudHMocGxhY2VtZW50KSB7XG4gIGNvbnN0IG9wcG9zaXRlUGxhY2VtZW50ID0gZ2V0T3Bwb3NpdGVQbGFjZW1lbnQocGxhY2VtZW50KTtcbiAgcmV0dXJuIFtnZXRPcHBvc2l0ZUFsaWdubWVudFBsYWNlbWVudChwbGFjZW1lbnQpLCBvcHBvc2l0ZVBsYWNlbWVudCwgZ2V0T3Bwb3NpdGVBbGlnbm1lbnRQbGFjZW1lbnQob3Bwb3NpdGVQbGFjZW1lbnQpXTtcbn1cbmZ1bmN0aW9uIGdldE9wcG9zaXRlQWxpZ25tZW50UGxhY2VtZW50KHBsYWNlbWVudCkge1xuICByZXR1cm4gcGxhY2VtZW50LnJlcGxhY2UoL3N0YXJ0fGVuZC9nLCBhbGlnbm1lbnQgPT4gb3Bwb3NpdGVBbGlnbm1lbnRNYXBbYWxpZ25tZW50XSk7XG59XG5mdW5jdGlvbiBnZXRTaWRlTGlzdChzaWRlLCBpc1N0YXJ0LCBydGwpIHtcbiAgY29uc3QgbHIgPSBbJ2xlZnQnLCAncmlnaHQnXTtcbiAgY29uc3QgcmwgPSBbJ3JpZ2h0JywgJ2xlZnQnXTtcbiAgY29uc3QgdGIgPSBbJ3RvcCcsICdib3R0b20nXTtcbiAgY29uc3QgYnQgPSBbJ2JvdHRvbScsICd0b3AnXTtcbiAgc3dpdGNoIChzaWRlKSB7XG4gICAgY2FzZSAndG9wJzpcbiAgICBjYXNlICdib3R0b20nOlxuICAgICAgaWYgKHJ0bCkgcmV0dXJuIGlzU3RhcnQgPyBybCA6IGxyO1xuICAgICAgcmV0dXJuIGlzU3RhcnQgPyBsciA6IHJsO1xuICAgIGNhc2UgJ2xlZnQnOlxuICAgIGNhc2UgJ3JpZ2h0JzpcbiAgICAgIHJldHVybiBpc1N0YXJ0ID8gdGIgOiBidDtcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIFtdO1xuICB9XG59XG5mdW5jdGlvbiBnZXRPcHBvc2l0ZUF4aXNQbGFjZW1lbnRzKHBsYWNlbWVudCwgZmxpcEFsaWdubWVudCwgZGlyZWN0aW9uLCBydGwpIHtcbiAgY29uc3QgYWxpZ25tZW50ID0gZ2V0QWxpZ25tZW50KHBsYWNlbWVudCk7XG4gIGxldCBsaXN0ID0gZ2V0U2lkZUxpc3QoZ2V0U2lkZShwbGFjZW1lbnQpLCBkaXJlY3Rpb24gPT09ICdzdGFydCcsIHJ0bCk7XG4gIGlmIChhbGlnbm1lbnQpIHtcbiAgICBsaXN0ID0gbGlzdC5tYXAoc2lkZSA9PiBzaWRlICsgXCItXCIgKyBhbGlnbm1lbnQpO1xuICAgIGlmIChmbGlwQWxpZ25tZW50KSB7XG4gICAgICBsaXN0ID0gbGlzdC5jb25jYXQobGlzdC5tYXAoZ2V0T3Bwb3NpdGVBbGlnbm1lbnRQbGFjZW1lbnQpKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGxpc3Q7XG59XG5mdW5jdGlvbiBnZXRPcHBvc2l0ZVBsYWNlbWVudChwbGFjZW1lbnQpIHtcbiAgcmV0dXJuIHBsYWNlbWVudC5yZXBsYWNlKC9sZWZ0fHJpZ2h0fGJvdHRvbXx0b3AvZywgc2lkZSA9PiBvcHBvc2l0ZVNpZGVNYXBbc2lkZV0pO1xufVxuZnVuY3Rpb24gZXhwYW5kUGFkZGluZ09iamVjdChwYWRkaW5nKSB7XG4gIHJldHVybiB7XG4gICAgdG9wOiAwLFxuICAgIHJpZ2h0OiAwLFxuICAgIGJvdHRvbTogMCxcbiAgICBsZWZ0OiAwLFxuICAgIC4uLnBhZGRpbmdcbiAgfTtcbn1cbmZ1bmN0aW9uIGdldFBhZGRpbmdPYmplY3QocGFkZGluZykge1xuICByZXR1cm4gdHlwZW9mIHBhZGRpbmcgIT09ICdudW1iZXInID8gZXhwYW5kUGFkZGluZ09iamVjdChwYWRkaW5nKSA6IHtcbiAgICB0b3A6IHBhZGRpbmcsXG4gICAgcmlnaHQ6IHBhZGRpbmcsXG4gICAgYm90dG9tOiBwYWRkaW5nLFxuICAgIGxlZnQ6IHBhZGRpbmdcbiAgfTtcbn1cbmZ1bmN0aW9uIHJlY3RUb0NsaWVudFJlY3QocmVjdCkge1xuICBjb25zdCB7XG4gICAgeCxcbiAgICB5LFxuICAgIHdpZHRoLFxuICAgIGhlaWdodFxuICB9ID0gcmVjdDtcbiAgcmV0dXJuIHtcbiAgICB3aWR0aCxcbiAgICBoZWlnaHQsXG4gICAgdG9wOiB5LFxuICAgIGxlZnQ6IHgsXG4gICAgcmlnaHQ6IHggKyB3aWR0aCxcbiAgICBib3R0b206IHkgKyBoZWlnaHQsXG4gICAgeCxcbiAgICB5XG4gIH07XG59XG5cbmV4cG9ydCB7IGFsaWdubWVudHMsIGNsYW1wLCBjcmVhdGVDb29yZHMsIGV2YWx1YXRlLCBleHBhbmRQYWRkaW5nT2JqZWN0LCBmbG9vciwgZ2V0QWxpZ25tZW50LCBnZXRBbGlnbm1lbnRBeGlzLCBnZXRBbGlnbm1lbnRTaWRlcywgZ2V0QXhpc0xlbmd0aCwgZ2V0RXhwYW5kZWRQbGFjZW1lbnRzLCBnZXRPcHBvc2l0ZUFsaWdubWVudFBsYWNlbWVudCwgZ2V0T3Bwb3NpdGVBeGlzLCBnZXRPcHBvc2l0ZUF4aXNQbGFjZW1lbnRzLCBnZXRPcHBvc2l0ZVBsYWNlbWVudCwgZ2V0UGFkZGluZ09iamVjdCwgZ2V0U2lkZSwgZ2V0U2lkZUF4aXMsIG1heCwgbWluLCBwbGFjZW1lbnRzLCByZWN0VG9DbGllbnRSZWN0LCByb3VuZCwgc2lkZXMgfTtcbiIsICJpbXBvcnQgeyBnZXRTaWRlQXhpcywgZ2V0QWxpZ25tZW50QXhpcywgZ2V0QXhpc0xlbmd0aCwgZ2V0U2lkZSwgZ2V0QWxpZ25tZW50LCBldmFsdWF0ZSwgZ2V0UGFkZGluZ09iamVjdCwgcmVjdFRvQ2xpZW50UmVjdCwgbWluLCBjbGFtcCwgcGxhY2VtZW50cywgZ2V0QWxpZ25tZW50U2lkZXMsIGdldE9wcG9zaXRlQWxpZ25tZW50UGxhY2VtZW50LCBnZXRPcHBvc2l0ZVBsYWNlbWVudCwgZ2V0RXhwYW5kZWRQbGFjZW1lbnRzLCBnZXRPcHBvc2l0ZUF4aXNQbGFjZW1lbnRzLCBzaWRlcywgbWF4LCBnZXRPcHBvc2l0ZUF4aXMgfSBmcm9tICdAZmxvYXRpbmctdWkvdXRpbHMnO1xuZXhwb3J0IHsgcmVjdFRvQ2xpZW50UmVjdCB9IGZyb20gJ0BmbG9hdGluZy11aS91dGlscyc7XG5cbmZ1bmN0aW9uIGNvbXB1dGVDb29yZHNGcm9tUGxhY2VtZW50KF9yZWYsIHBsYWNlbWVudCwgcnRsKSB7XG4gIGxldCB7XG4gICAgcmVmZXJlbmNlLFxuICAgIGZsb2F0aW5nXG4gIH0gPSBfcmVmO1xuICBjb25zdCBzaWRlQXhpcyA9IGdldFNpZGVBeGlzKHBsYWNlbWVudCk7XG4gIGNvbnN0IGFsaWdubWVudEF4aXMgPSBnZXRBbGlnbm1lbnRBeGlzKHBsYWNlbWVudCk7XG4gIGNvbnN0IGFsaWduTGVuZ3RoID0gZ2V0QXhpc0xlbmd0aChhbGlnbm1lbnRBeGlzKTtcbiAgY29uc3Qgc2lkZSA9IGdldFNpZGUocGxhY2VtZW50KTtcbiAgY29uc3QgaXNWZXJ0aWNhbCA9IHNpZGVBeGlzID09PSAneSc7XG4gIGNvbnN0IGNvbW1vblggPSByZWZlcmVuY2UueCArIHJlZmVyZW5jZS53aWR0aCAvIDIgLSBmbG9hdGluZy53aWR0aCAvIDI7XG4gIGNvbnN0IGNvbW1vblkgPSByZWZlcmVuY2UueSArIHJlZmVyZW5jZS5oZWlnaHQgLyAyIC0gZmxvYXRpbmcuaGVpZ2h0IC8gMjtcbiAgY29uc3QgY29tbW9uQWxpZ24gPSByZWZlcmVuY2VbYWxpZ25MZW5ndGhdIC8gMiAtIGZsb2F0aW5nW2FsaWduTGVuZ3RoXSAvIDI7XG4gIGxldCBjb29yZHM7XG4gIHN3aXRjaCAoc2lkZSkge1xuICAgIGNhc2UgJ3RvcCc6XG4gICAgICBjb29yZHMgPSB7XG4gICAgICAgIHg6IGNvbW1vblgsXG4gICAgICAgIHk6IHJlZmVyZW5jZS55IC0gZmxvYXRpbmcuaGVpZ2h0XG4gICAgICB9O1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnYm90dG9tJzpcbiAgICAgIGNvb3JkcyA9IHtcbiAgICAgICAgeDogY29tbW9uWCxcbiAgICAgICAgeTogcmVmZXJlbmNlLnkgKyByZWZlcmVuY2UuaGVpZ2h0XG4gICAgICB9O1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAncmlnaHQnOlxuICAgICAgY29vcmRzID0ge1xuICAgICAgICB4OiByZWZlcmVuY2UueCArIHJlZmVyZW5jZS53aWR0aCxcbiAgICAgICAgeTogY29tbW9uWVxuICAgICAgfTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2xlZnQnOlxuICAgICAgY29vcmRzID0ge1xuICAgICAgICB4OiByZWZlcmVuY2UueCAtIGZsb2F0aW5nLndpZHRoLFxuICAgICAgICB5OiBjb21tb25ZXG4gICAgICB9O1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIGNvb3JkcyA9IHtcbiAgICAgICAgeDogcmVmZXJlbmNlLngsXG4gICAgICAgIHk6IHJlZmVyZW5jZS55XG4gICAgICB9O1xuICB9XG4gIHN3aXRjaCAoZ2V0QWxpZ25tZW50KHBsYWNlbWVudCkpIHtcbiAgICBjYXNlICdzdGFydCc6XG4gICAgICBjb29yZHNbYWxpZ25tZW50QXhpc10gLT0gY29tbW9uQWxpZ24gKiAocnRsICYmIGlzVmVydGljYWwgPyAtMSA6IDEpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnZW5kJzpcbiAgICAgIGNvb3Jkc1thbGlnbm1lbnRBeGlzXSArPSBjb21tb25BbGlnbiAqIChydGwgJiYgaXNWZXJ0aWNhbCA/IC0xIDogMSk7XG4gICAgICBicmVhaztcbiAgfVxuICByZXR1cm4gY29vcmRzO1xufVxuXG4vKipcbiAqIENvbXB1dGVzIHRoZSBgeGAgYW5kIGB5YCBjb29yZGluYXRlcyB0aGF0IHdpbGwgcGxhY2UgdGhlIGZsb2F0aW5nIGVsZW1lbnRcbiAqIG5leHQgdG8gYSBnaXZlbiByZWZlcmVuY2UgZWxlbWVudC5cbiAqXG4gKiBUaGlzIGV4cG9ydCBkb2VzIG5vdCBoYXZlIGFueSBgcGxhdGZvcm1gIGludGVyZmFjZSBsb2dpYy4gWW91IHdpbGwgbmVlZCB0b1xuICogd3JpdGUgb25lIGZvciB0aGUgcGxhdGZvcm0geW91IGFyZSB1c2luZyBGbG9hdGluZyBVSSB3aXRoLlxuICovXG5jb25zdCBjb21wdXRlUG9zaXRpb24gPSBhc3luYyAocmVmZXJlbmNlLCBmbG9hdGluZywgY29uZmlnKSA9PiB7XG4gIGNvbnN0IHtcbiAgICBwbGFjZW1lbnQgPSAnYm90dG9tJyxcbiAgICBzdHJhdGVneSA9ICdhYnNvbHV0ZScsXG4gICAgbWlkZGxld2FyZSA9IFtdLFxuICAgIHBsYXRmb3JtXG4gIH0gPSBjb25maWc7XG4gIGNvbnN0IHZhbGlkTWlkZGxld2FyZSA9IG1pZGRsZXdhcmUuZmlsdGVyKEJvb2xlYW4pO1xuICBjb25zdCBydGwgPSBhd2FpdCAocGxhdGZvcm0uaXNSVEwgPT0gbnVsbCA/IHZvaWQgMCA6IHBsYXRmb3JtLmlzUlRMKGZsb2F0aW5nKSk7XG4gIGxldCByZWN0cyA9IGF3YWl0IHBsYXRmb3JtLmdldEVsZW1lbnRSZWN0cyh7XG4gICAgcmVmZXJlbmNlLFxuICAgIGZsb2F0aW5nLFxuICAgIHN0cmF0ZWd5XG4gIH0pO1xuICBsZXQge1xuICAgIHgsXG4gICAgeVxuICB9ID0gY29tcHV0ZUNvb3Jkc0Zyb21QbGFjZW1lbnQocmVjdHMsIHBsYWNlbWVudCwgcnRsKTtcbiAgbGV0IHN0YXRlZnVsUGxhY2VtZW50ID0gcGxhY2VtZW50O1xuICBsZXQgbWlkZGxld2FyZURhdGEgPSB7fTtcbiAgbGV0IHJlc2V0Q291bnQgPSAwO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHZhbGlkTWlkZGxld2FyZS5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHtcbiAgICAgIG5hbWUsXG4gICAgICBmblxuICAgIH0gPSB2YWxpZE1pZGRsZXdhcmVbaV07XG4gICAgY29uc3Qge1xuICAgICAgeDogbmV4dFgsXG4gICAgICB5OiBuZXh0WSxcbiAgICAgIGRhdGEsXG4gICAgICByZXNldFxuICAgIH0gPSBhd2FpdCBmbih7XG4gICAgICB4LFxuICAgICAgeSxcbiAgICAgIGluaXRpYWxQbGFjZW1lbnQ6IHBsYWNlbWVudCxcbiAgICAgIHBsYWNlbWVudDogc3RhdGVmdWxQbGFjZW1lbnQsXG4gICAgICBzdHJhdGVneSxcbiAgICAgIG1pZGRsZXdhcmVEYXRhLFxuICAgICAgcmVjdHMsXG4gICAgICBwbGF0Zm9ybSxcbiAgICAgIGVsZW1lbnRzOiB7XG4gICAgICAgIHJlZmVyZW5jZSxcbiAgICAgICAgZmxvYXRpbmdcbiAgICAgIH1cbiAgICB9KTtcbiAgICB4ID0gbmV4dFggIT0gbnVsbCA/IG5leHRYIDogeDtcbiAgICB5ID0gbmV4dFkgIT0gbnVsbCA/IG5leHRZIDogeTtcbiAgICBtaWRkbGV3YXJlRGF0YSA9IHtcbiAgICAgIC4uLm1pZGRsZXdhcmVEYXRhLFxuICAgICAgW25hbWVdOiB7XG4gICAgICAgIC4uLm1pZGRsZXdhcmVEYXRhW25hbWVdLFxuICAgICAgICAuLi5kYXRhXG4gICAgICB9XG4gICAgfTtcbiAgICBpZiAocmVzZXQgJiYgcmVzZXRDb3VudCA8PSA1MCkge1xuICAgICAgcmVzZXRDb3VudCsrO1xuICAgICAgaWYgKHR5cGVvZiByZXNldCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgaWYgKHJlc2V0LnBsYWNlbWVudCkge1xuICAgICAgICAgIHN0YXRlZnVsUGxhY2VtZW50ID0gcmVzZXQucGxhY2VtZW50O1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXNldC5yZWN0cykge1xuICAgICAgICAgIHJlY3RzID0gcmVzZXQucmVjdHMgPT09IHRydWUgPyBhd2FpdCBwbGF0Zm9ybS5nZXRFbGVtZW50UmVjdHMoe1xuICAgICAgICAgICAgcmVmZXJlbmNlLFxuICAgICAgICAgICAgZmxvYXRpbmcsXG4gICAgICAgICAgICBzdHJhdGVneVxuICAgICAgICAgIH0pIDogcmVzZXQucmVjdHM7XG4gICAgICAgIH1cbiAgICAgICAgKHtcbiAgICAgICAgICB4LFxuICAgICAgICAgIHlcbiAgICAgICAgfSA9IGNvbXB1dGVDb29yZHNGcm9tUGxhY2VtZW50KHJlY3RzLCBzdGF0ZWZ1bFBsYWNlbWVudCwgcnRsKSk7XG4gICAgICB9XG4gICAgICBpID0gLTE7XG4gICAgfVxuICB9XG4gIHJldHVybiB7XG4gICAgeCxcbiAgICB5LFxuICAgIHBsYWNlbWVudDogc3RhdGVmdWxQbGFjZW1lbnQsXG4gICAgc3RyYXRlZ3ksXG4gICAgbWlkZGxld2FyZURhdGFcbiAgfTtcbn07XG5cbi8qKlxuICogUmVzb2x2ZXMgd2l0aCBhbiBvYmplY3Qgb2Ygb3ZlcmZsb3cgc2lkZSBvZmZzZXRzIHRoYXQgZGV0ZXJtaW5lIGhvdyBtdWNoIHRoZVxuICogZWxlbWVudCBpcyBvdmVyZmxvd2luZyBhIGdpdmVuIGNsaXBwaW5nIGJvdW5kYXJ5IG9uIGVhY2ggc2lkZS5cbiAqIC0gcG9zaXRpdmUgPSBvdmVyZmxvd2luZyB0aGUgYm91bmRhcnkgYnkgdGhhdCBudW1iZXIgb2YgcGl4ZWxzXG4gKiAtIG5lZ2F0aXZlID0gaG93IG1hbnkgcGl4ZWxzIGxlZnQgYmVmb3JlIGl0IHdpbGwgb3ZlcmZsb3dcbiAqIC0gMCA9IGxpZXMgZmx1c2ggd2l0aCB0aGUgYm91bmRhcnlcbiAqIEBzZWUgaHR0cHM6Ly9mbG9hdGluZy11aS5jb20vZG9jcy9kZXRlY3RPdmVyZmxvd1xuICovXG5hc3luYyBmdW5jdGlvbiBkZXRlY3RPdmVyZmxvdyhzdGF0ZSwgb3B0aW9ucykge1xuICB2YXIgX2F3YWl0JHBsYXRmb3JtJGlzRWxlO1xuICBpZiAob3B0aW9ucyA9PT0gdm9pZCAwKSB7XG4gICAgb3B0aW9ucyA9IHt9O1xuICB9XG4gIGNvbnN0IHtcbiAgICB4LFxuICAgIHksXG4gICAgcGxhdGZvcm0sXG4gICAgcmVjdHMsXG4gICAgZWxlbWVudHMsXG4gICAgc3RyYXRlZ3lcbiAgfSA9IHN0YXRlO1xuICBjb25zdCB7XG4gICAgYm91bmRhcnkgPSAnY2xpcHBpbmdBbmNlc3RvcnMnLFxuICAgIHJvb3RCb3VuZGFyeSA9ICd2aWV3cG9ydCcsXG4gICAgZWxlbWVudENvbnRleHQgPSAnZmxvYXRpbmcnLFxuICAgIGFsdEJvdW5kYXJ5ID0gZmFsc2UsXG4gICAgcGFkZGluZyA9IDBcbiAgfSA9IGV2YWx1YXRlKG9wdGlvbnMsIHN0YXRlKTtcbiAgY29uc3QgcGFkZGluZ09iamVjdCA9IGdldFBhZGRpbmdPYmplY3QocGFkZGluZyk7XG4gIGNvbnN0IGFsdENvbnRleHQgPSBlbGVtZW50Q29udGV4dCA9PT0gJ2Zsb2F0aW5nJyA/ICdyZWZlcmVuY2UnIDogJ2Zsb2F0aW5nJztcbiAgY29uc3QgZWxlbWVudCA9IGVsZW1lbnRzW2FsdEJvdW5kYXJ5ID8gYWx0Q29udGV4dCA6IGVsZW1lbnRDb250ZXh0XTtcbiAgY29uc3QgY2xpcHBpbmdDbGllbnRSZWN0ID0gcmVjdFRvQ2xpZW50UmVjdChhd2FpdCBwbGF0Zm9ybS5nZXRDbGlwcGluZ1JlY3Qoe1xuICAgIGVsZW1lbnQ6ICgoX2F3YWl0JHBsYXRmb3JtJGlzRWxlID0gYXdhaXQgKHBsYXRmb3JtLmlzRWxlbWVudCA9PSBudWxsID8gdm9pZCAwIDogcGxhdGZvcm0uaXNFbGVtZW50KGVsZW1lbnQpKSkgIT0gbnVsbCA/IF9hd2FpdCRwbGF0Zm9ybSRpc0VsZSA6IHRydWUpID8gZWxlbWVudCA6IGVsZW1lbnQuY29udGV4dEVsZW1lbnQgfHwgKGF3YWl0IChwbGF0Zm9ybS5nZXREb2N1bWVudEVsZW1lbnQgPT0gbnVsbCA/IHZvaWQgMCA6IHBsYXRmb3JtLmdldERvY3VtZW50RWxlbWVudChlbGVtZW50cy5mbG9hdGluZykpKSxcbiAgICBib3VuZGFyeSxcbiAgICByb290Qm91bmRhcnksXG4gICAgc3RyYXRlZ3lcbiAgfSkpO1xuICBjb25zdCByZWN0ID0gZWxlbWVudENvbnRleHQgPT09ICdmbG9hdGluZycgPyB7XG4gICAgeCxcbiAgICB5LFxuICAgIHdpZHRoOiByZWN0cy5mbG9hdGluZy53aWR0aCxcbiAgICBoZWlnaHQ6IHJlY3RzLmZsb2F0aW5nLmhlaWdodFxuICB9IDogcmVjdHMucmVmZXJlbmNlO1xuICBjb25zdCBvZmZzZXRQYXJlbnQgPSBhd2FpdCAocGxhdGZvcm0uZ2V0T2Zmc2V0UGFyZW50ID09IG51bGwgPyB2b2lkIDAgOiBwbGF0Zm9ybS5nZXRPZmZzZXRQYXJlbnQoZWxlbWVudHMuZmxvYXRpbmcpKTtcbiAgY29uc3Qgb2Zmc2V0U2NhbGUgPSAoYXdhaXQgKHBsYXRmb3JtLmlzRWxlbWVudCA9PSBudWxsID8gdm9pZCAwIDogcGxhdGZvcm0uaXNFbGVtZW50KG9mZnNldFBhcmVudCkpKSA/IChhd2FpdCAocGxhdGZvcm0uZ2V0U2NhbGUgPT0gbnVsbCA/IHZvaWQgMCA6IHBsYXRmb3JtLmdldFNjYWxlKG9mZnNldFBhcmVudCkpKSB8fCB7XG4gICAgeDogMSxcbiAgICB5OiAxXG4gIH0gOiB7XG4gICAgeDogMSxcbiAgICB5OiAxXG4gIH07XG4gIGNvbnN0IGVsZW1lbnRDbGllbnRSZWN0ID0gcmVjdFRvQ2xpZW50UmVjdChwbGF0Zm9ybS5jb252ZXJ0T2Zmc2V0UGFyZW50UmVsYXRpdmVSZWN0VG9WaWV3cG9ydFJlbGF0aXZlUmVjdCA/IGF3YWl0IHBsYXRmb3JtLmNvbnZlcnRPZmZzZXRQYXJlbnRSZWxhdGl2ZVJlY3RUb1ZpZXdwb3J0UmVsYXRpdmVSZWN0KHtcbiAgICBlbGVtZW50cyxcbiAgICByZWN0LFxuICAgIG9mZnNldFBhcmVudCxcbiAgICBzdHJhdGVneVxuICB9KSA6IHJlY3QpO1xuICByZXR1cm4ge1xuICAgIHRvcDogKGNsaXBwaW5nQ2xpZW50UmVjdC50b3AgLSBlbGVtZW50Q2xpZW50UmVjdC50b3AgKyBwYWRkaW5nT2JqZWN0LnRvcCkgLyBvZmZzZXRTY2FsZS55LFxuICAgIGJvdHRvbTogKGVsZW1lbnRDbGllbnRSZWN0LmJvdHRvbSAtIGNsaXBwaW5nQ2xpZW50UmVjdC5ib3R0b20gKyBwYWRkaW5nT2JqZWN0LmJvdHRvbSkgLyBvZmZzZXRTY2FsZS55LFxuICAgIGxlZnQ6IChjbGlwcGluZ0NsaWVudFJlY3QubGVmdCAtIGVsZW1lbnRDbGllbnRSZWN0LmxlZnQgKyBwYWRkaW5nT2JqZWN0LmxlZnQpIC8gb2Zmc2V0U2NhbGUueCxcbiAgICByaWdodDogKGVsZW1lbnRDbGllbnRSZWN0LnJpZ2h0IC0gY2xpcHBpbmdDbGllbnRSZWN0LnJpZ2h0ICsgcGFkZGluZ09iamVjdC5yaWdodCkgLyBvZmZzZXRTY2FsZS54XG4gIH07XG59XG5cbi8qKlxuICogUHJvdmlkZXMgZGF0YSB0byBwb3NpdGlvbiBhbiBpbm5lciBlbGVtZW50IG9mIHRoZSBmbG9hdGluZyBlbGVtZW50IHNvIHRoYXQgaXRcbiAqIGFwcGVhcnMgY2VudGVyZWQgdG8gdGhlIHJlZmVyZW5jZSBlbGVtZW50LlxuICogQHNlZSBodHRwczovL2Zsb2F0aW5nLXVpLmNvbS9kb2NzL2Fycm93XG4gKi9cbmNvbnN0IGFycm93ID0gb3B0aW9ucyA9PiAoe1xuICBuYW1lOiAnYXJyb3cnLFxuICBvcHRpb25zLFxuICBhc3luYyBmbihzdGF0ZSkge1xuICAgIGNvbnN0IHtcbiAgICAgIHgsXG4gICAgICB5LFxuICAgICAgcGxhY2VtZW50LFxuICAgICAgcmVjdHMsXG4gICAgICBwbGF0Zm9ybSxcbiAgICAgIGVsZW1lbnRzLFxuICAgICAgbWlkZGxld2FyZURhdGFcbiAgICB9ID0gc3RhdGU7XG4gICAgLy8gU2luY2UgYGVsZW1lbnRgIGlzIHJlcXVpcmVkLCB3ZSBkb24ndCBQYXJ0aWFsPD4gdGhlIHR5cGUuXG4gICAgY29uc3Qge1xuICAgICAgZWxlbWVudCxcbiAgICAgIHBhZGRpbmcgPSAwXG4gICAgfSA9IGV2YWx1YXRlKG9wdGlvbnMsIHN0YXRlKSB8fCB7fTtcbiAgICBpZiAoZWxlbWVudCA9PSBudWxsKSB7XG4gICAgICByZXR1cm4ge307XG4gICAgfVxuICAgIGNvbnN0IHBhZGRpbmdPYmplY3QgPSBnZXRQYWRkaW5nT2JqZWN0KHBhZGRpbmcpO1xuICAgIGNvbnN0IGNvb3JkcyA9IHtcbiAgICAgIHgsXG4gICAgICB5XG4gICAgfTtcbiAgICBjb25zdCBheGlzID0gZ2V0QWxpZ25tZW50QXhpcyhwbGFjZW1lbnQpO1xuICAgIGNvbnN0IGxlbmd0aCA9IGdldEF4aXNMZW5ndGgoYXhpcyk7XG4gICAgY29uc3QgYXJyb3dEaW1lbnNpb25zID0gYXdhaXQgcGxhdGZvcm0uZ2V0RGltZW5zaW9ucyhlbGVtZW50KTtcbiAgICBjb25zdCBpc1lBeGlzID0gYXhpcyA9PT0gJ3knO1xuICAgIGNvbnN0IG1pblByb3AgPSBpc1lBeGlzID8gJ3RvcCcgOiAnbGVmdCc7XG4gICAgY29uc3QgbWF4UHJvcCA9IGlzWUF4aXMgPyAnYm90dG9tJyA6ICdyaWdodCc7XG4gICAgY29uc3QgY2xpZW50UHJvcCA9IGlzWUF4aXMgPyAnY2xpZW50SGVpZ2h0JyA6ICdjbGllbnRXaWR0aCc7XG4gICAgY29uc3QgZW5kRGlmZiA9IHJlY3RzLnJlZmVyZW5jZVtsZW5ndGhdICsgcmVjdHMucmVmZXJlbmNlW2F4aXNdIC0gY29vcmRzW2F4aXNdIC0gcmVjdHMuZmxvYXRpbmdbbGVuZ3RoXTtcbiAgICBjb25zdCBzdGFydERpZmYgPSBjb29yZHNbYXhpc10gLSByZWN0cy5yZWZlcmVuY2VbYXhpc107XG4gICAgY29uc3QgYXJyb3dPZmZzZXRQYXJlbnQgPSBhd2FpdCAocGxhdGZvcm0uZ2V0T2Zmc2V0UGFyZW50ID09IG51bGwgPyB2b2lkIDAgOiBwbGF0Zm9ybS5nZXRPZmZzZXRQYXJlbnQoZWxlbWVudCkpO1xuICAgIGxldCBjbGllbnRTaXplID0gYXJyb3dPZmZzZXRQYXJlbnQgPyBhcnJvd09mZnNldFBhcmVudFtjbGllbnRQcm9wXSA6IDA7XG5cbiAgICAvLyBET00gcGxhdGZvcm0gY2FuIHJldHVybiBgd2luZG93YCBhcyB0aGUgYG9mZnNldFBhcmVudGAuXG4gICAgaWYgKCFjbGllbnRTaXplIHx8ICEoYXdhaXQgKHBsYXRmb3JtLmlzRWxlbWVudCA9PSBudWxsID8gdm9pZCAwIDogcGxhdGZvcm0uaXNFbGVtZW50KGFycm93T2Zmc2V0UGFyZW50KSkpKSB7XG4gICAgICBjbGllbnRTaXplID0gZWxlbWVudHMuZmxvYXRpbmdbY2xpZW50UHJvcF0gfHwgcmVjdHMuZmxvYXRpbmdbbGVuZ3RoXTtcbiAgICB9XG4gICAgY29uc3QgY2VudGVyVG9SZWZlcmVuY2UgPSBlbmREaWZmIC8gMiAtIHN0YXJ0RGlmZiAvIDI7XG5cbiAgICAvLyBJZiB0aGUgcGFkZGluZyBpcyBsYXJnZSBlbm91Z2ggdGhhdCBpdCBjYXVzZXMgdGhlIGFycm93IHRvIG5vIGxvbmdlciBiZVxuICAgIC8vIGNlbnRlcmVkLCBtb2RpZnkgdGhlIHBhZGRpbmcgc28gdGhhdCBpdCBpcyBjZW50ZXJlZC5cbiAgICBjb25zdCBsYXJnZXN0UG9zc2libGVQYWRkaW5nID0gY2xpZW50U2l6ZSAvIDIgLSBhcnJvd0RpbWVuc2lvbnNbbGVuZ3RoXSAvIDIgLSAxO1xuICAgIGNvbnN0IG1pblBhZGRpbmcgPSBtaW4ocGFkZGluZ09iamVjdFttaW5Qcm9wXSwgbGFyZ2VzdFBvc3NpYmxlUGFkZGluZyk7XG4gICAgY29uc3QgbWF4UGFkZGluZyA9IG1pbihwYWRkaW5nT2JqZWN0W21heFByb3BdLCBsYXJnZXN0UG9zc2libGVQYWRkaW5nKTtcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGUgYXJyb3cgZG9lc24ndCBvdmVyZmxvdyB0aGUgZmxvYXRpbmcgZWxlbWVudCBpZiB0aGUgY2VudGVyXG4gICAgLy8gcG9pbnQgaXMgb3V0c2lkZSB0aGUgZmxvYXRpbmcgZWxlbWVudCdzIGJvdW5kcy5cbiAgICBjb25zdCBtaW4kMSA9IG1pblBhZGRpbmc7XG4gICAgY29uc3QgbWF4ID0gY2xpZW50U2l6ZSAtIGFycm93RGltZW5zaW9uc1tsZW5ndGhdIC0gbWF4UGFkZGluZztcbiAgICBjb25zdCBjZW50ZXIgPSBjbGllbnRTaXplIC8gMiAtIGFycm93RGltZW5zaW9uc1tsZW5ndGhdIC8gMiArIGNlbnRlclRvUmVmZXJlbmNlO1xuICAgIGNvbnN0IG9mZnNldCA9IGNsYW1wKG1pbiQxLCBjZW50ZXIsIG1heCk7XG5cbiAgICAvLyBJZiB0aGUgcmVmZXJlbmNlIGlzIHNtYWxsIGVub3VnaCB0aGF0IHRoZSBhcnJvdydzIHBhZGRpbmcgY2F1c2VzIGl0IHRvXG4gICAgLy8gdG8gcG9pbnQgdG8gbm90aGluZyBmb3IgYW4gYWxpZ25lZCBwbGFjZW1lbnQsIGFkanVzdCB0aGUgb2Zmc2V0IG9mIHRoZVxuICAgIC8vIGZsb2F0aW5nIGVsZW1lbnQgaXRzZWxmLiBUbyBlbnN1cmUgYHNoaWZ0KClgIGNvbnRpbnVlcyB0byB0YWtlIGFjdGlvbixcbiAgICAvLyBhIHNpbmdsZSByZXNldCBpcyBwZXJmb3JtZWQgd2hlbiB0aGlzIGlzIHRydWUuXG4gICAgY29uc3Qgc2hvdWxkQWRkT2Zmc2V0ID0gIW1pZGRsZXdhcmVEYXRhLmFycm93ICYmIGdldEFsaWdubWVudChwbGFjZW1lbnQpICE9IG51bGwgJiYgY2VudGVyICE9PSBvZmZzZXQgJiYgcmVjdHMucmVmZXJlbmNlW2xlbmd0aF0gLyAyIC0gKGNlbnRlciA8IG1pbiQxID8gbWluUGFkZGluZyA6IG1heFBhZGRpbmcpIC0gYXJyb3dEaW1lbnNpb25zW2xlbmd0aF0gLyAyIDwgMDtcbiAgICBjb25zdCBhbGlnbm1lbnRPZmZzZXQgPSBzaG91bGRBZGRPZmZzZXQgPyBjZW50ZXIgPCBtaW4kMSA/IGNlbnRlciAtIG1pbiQxIDogY2VudGVyIC0gbWF4IDogMDtcbiAgICByZXR1cm4ge1xuICAgICAgW2F4aXNdOiBjb29yZHNbYXhpc10gKyBhbGlnbm1lbnRPZmZzZXQsXG4gICAgICBkYXRhOiB7XG4gICAgICAgIFtheGlzXTogb2Zmc2V0LFxuICAgICAgICBjZW50ZXJPZmZzZXQ6IGNlbnRlciAtIG9mZnNldCAtIGFsaWdubWVudE9mZnNldCxcbiAgICAgICAgLi4uKHNob3VsZEFkZE9mZnNldCAmJiB7XG4gICAgICAgICAgYWxpZ25tZW50T2Zmc2V0XG4gICAgICAgIH0pXG4gICAgICB9LFxuICAgICAgcmVzZXQ6IHNob3VsZEFkZE9mZnNldFxuICAgIH07XG4gIH1cbn0pO1xuXG5mdW5jdGlvbiBnZXRQbGFjZW1lbnRMaXN0KGFsaWdubWVudCwgYXV0b0FsaWdubWVudCwgYWxsb3dlZFBsYWNlbWVudHMpIHtcbiAgY29uc3QgYWxsb3dlZFBsYWNlbWVudHNTb3J0ZWRCeUFsaWdubWVudCA9IGFsaWdubWVudCA/IFsuLi5hbGxvd2VkUGxhY2VtZW50cy5maWx0ZXIocGxhY2VtZW50ID0+IGdldEFsaWdubWVudChwbGFjZW1lbnQpID09PSBhbGlnbm1lbnQpLCAuLi5hbGxvd2VkUGxhY2VtZW50cy5maWx0ZXIocGxhY2VtZW50ID0+IGdldEFsaWdubWVudChwbGFjZW1lbnQpICE9PSBhbGlnbm1lbnQpXSA6IGFsbG93ZWRQbGFjZW1lbnRzLmZpbHRlcihwbGFjZW1lbnQgPT4gZ2V0U2lkZShwbGFjZW1lbnQpID09PSBwbGFjZW1lbnQpO1xuICByZXR1cm4gYWxsb3dlZFBsYWNlbWVudHNTb3J0ZWRCeUFsaWdubWVudC5maWx0ZXIocGxhY2VtZW50ID0+IHtcbiAgICBpZiAoYWxpZ25tZW50KSB7XG4gICAgICByZXR1cm4gZ2V0QWxpZ25tZW50KHBsYWNlbWVudCkgPT09IGFsaWdubWVudCB8fCAoYXV0b0FsaWdubWVudCA/IGdldE9wcG9zaXRlQWxpZ25tZW50UGxhY2VtZW50KHBsYWNlbWVudCkgIT09IHBsYWNlbWVudCA6IGZhbHNlKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0pO1xufVxuLyoqXG4gKiBPcHRpbWl6ZXMgdGhlIHZpc2liaWxpdHkgb2YgdGhlIGZsb2F0aW5nIGVsZW1lbnQgYnkgY2hvb3NpbmcgdGhlIHBsYWNlbWVudFxuICogdGhhdCBoYXMgdGhlIG1vc3Qgc3BhY2UgYXZhaWxhYmxlIGF1dG9tYXRpY2FsbHksIHdpdGhvdXQgbmVlZGluZyB0byBzcGVjaWZ5IGFcbiAqIHByZWZlcnJlZCBwbGFjZW1lbnQuIEFsdGVybmF0aXZlIHRvIGBmbGlwYC5cbiAqIEBzZWUgaHR0cHM6Ly9mbG9hdGluZy11aS5jb20vZG9jcy9hdXRvUGxhY2VtZW50XG4gKi9cbmNvbnN0IGF1dG9QbGFjZW1lbnQgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICBpZiAob3B0aW9ucyA9PT0gdm9pZCAwKSB7XG4gICAgb3B0aW9ucyA9IHt9O1xuICB9XG4gIHJldHVybiB7XG4gICAgbmFtZTogJ2F1dG9QbGFjZW1lbnQnLFxuICAgIG9wdGlvbnMsXG4gICAgYXN5bmMgZm4oc3RhdGUpIHtcbiAgICAgIHZhciBfbWlkZGxld2FyZURhdGEkYXV0b1AsIF9taWRkbGV3YXJlRGF0YSRhdXRvUDIsIF9wbGFjZW1lbnRzVGhhdEZpdE9uRTtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgcmVjdHMsXG4gICAgICAgIG1pZGRsZXdhcmVEYXRhLFxuICAgICAgICBwbGFjZW1lbnQsXG4gICAgICAgIHBsYXRmb3JtLFxuICAgICAgICBlbGVtZW50c1xuICAgICAgfSA9IHN0YXRlO1xuICAgICAgY29uc3Qge1xuICAgICAgICBjcm9zc0F4aXMgPSBmYWxzZSxcbiAgICAgICAgYWxpZ25tZW50LFxuICAgICAgICBhbGxvd2VkUGxhY2VtZW50cyA9IHBsYWNlbWVudHMsXG4gICAgICAgIGF1dG9BbGlnbm1lbnQgPSB0cnVlLFxuICAgICAgICAuLi5kZXRlY3RPdmVyZmxvd09wdGlvbnNcbiAgICAgIH0gPSBldmFsdWF0ZShvcHRpb25zLCBzdGF0ZSk7XG4gICAgICBjb25zdCBwbGFjZW1lbnRzJDEgPSBhbGlnbm1lbnQgIT09IHVuZGVmaW5lZCB8fCBhbGxvd2VkUGxhY2VtZW50cyA9PT0gcGxhY2VtZW50cyA/IGdldFBsYWNlbWVudExpc3QoYWxpZ25tZW50IHx8IG51bGwsIGF1dG9BbGlnbm1lbnQsIGFsbG93ZWRQbGFjZW1lbnRzKSA6IGFsbG93ZWRQbGFjZW1lbnRzO1xuICAgICAgY29uc3Qgb3ZlcmZsb3cgPSBhd2FpdCBkZXRlY3RPdmVyZmxvdyhzdGF0ZSwgZGV0ZWN0T3ZlcmZsb3dPcHRpb25zKTtcbiAgICAgIGNvbnN0IGN1cnJlbnRJbmRleCA9ICgoX21pZGRsZXdhcmVEYXRhJGF1dG9QID0gbWlkZGxld2FyZURhdGEuYXV0b1BsYWNlbWVudCkgPT0gbnVsbCA/IHZvaWQgMCA6IF9taWRkbGV3YXJlRGF0YSRhdXRvUC5pbmRleCkgfHwgMDtcbiAgICAgIGNvbnN0IGN1cnJlbnRQbGFjZW1lbnQgPSBwbGFjZW1lbnRzJDFbY3VycmVudEluZGV4XTtcbiAgICAgIGlmIChjdXJyZW50UGxhY2VtZW50ID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgfVxuICAgICAgY29uc3QgYWxpZ25tZW50U2lkZXMgPSBnZXRBbGlnbm1lbnRTaWRlcyhjdXJyZW50UGxhY2VtZW50LCByZWN0cywgYXdhaXQgKHBsYXRmb3JtLmlzUlRMID09IG51bGwgPyB2b2lkIDAgOiBwbGF0Zm9ybS5pc1JUTChlbGVtZW50cy5mbG9hdGluZykpKTtcblxuICAgICAgLy8gTWFrZSBgY29tcHV0ZUNvb3Jkc2Agc3RhcnQgZnJvbSB0aGUgcmlnaHQgcGxhY2UuXG4gICAgICBpZiAocGxhY2VtZW50ICE9PSBjdXJyZW50UGxhY2VtZW50KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgcmVzZXQ6IHtcbiAgICAgICAgICAgIHBsYWNlbWVudDogcGxhY2VtZW50cyQxWzBdXG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgY29uc3QgY3VycmVudE92ZXJmbG93cyA9IFtvdmVyZmxvd1tnZXRTaWRlKGN1cnJlbnRQbGFjZW1lbnQpXSwgb3ZlcmZsb3dbYWxpZ25tZW50U2lkZXNbMF1dLCBvdmVyZmxvd1thbGlnbm1lbnRTaWRlc1sxXV1dO1xuICAgICAgY29uc3QgYWxsT3ZlcmZsb3dzID0gWy4uLigoKF9taWRkbGV3YXJlRGF0YSRhdXRvUDIgPSBtaWRkbGV3YXJlRGF0YS5hdXRvUGxhY2VtZW50KSA9PSBudWxsID8gdm9pZCAwIDogX21pZGRsZXdhcmVEYXRhJGF1dG9QMi5vdmVyZmxvd3MpIHx8IFtdKSwge1xuICAgICAgICBwbGFjZW1lbnQ6IGN1cnJlbnRQbGFjZW1lbnQsXG4gICAgICAgIG92ZXJmbG93czogY3VycmVudE92ZXJmbG93c1xuICAgICAgfV07XG4gICAgICBjb25zdCBuZXh0UGxhY2VtZW50ID0gcGxhY2VtZW50cyQxW2N1cnJlbnRJbmRleCArIDFdO1xuXG4gICAgICAvLyBUaGVyZSBhcmUgbW9yZSBwbGFjZW1lbnRzIHRvIGNoZWNrLlxuICAgICAgaWYgKG5leHRQbGFjZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBpbmRleDogY3VycmVudEluZGV4ICsgMSxcbiAgICAgICAgICAgIG92ZXJmbG93czogYWxsT3ZlcmZsb3dzXG4gICAgICAgICAgfSxcbiAgICAgICAgICByZXNldDoge1xuICAgICAgICAgICAgcGxhY2VtZW50OiBuZXh0UGxhY2VtZW50XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgY29uc3QgcGxhY2VtZW50c1NvcnRlZEJ5TW9zdFNwYWNlID0gYWxsT3ZlcmZsb3dzLm1hcChkID0+IHtcbiAgICAgICAgY29uc3QgYWxpZ25tZW50ID0gZ2V0QWxpZ25tZW50KGQucGxhY2VtZW50KTtcbiAgICAgICAgcmV0dXJuIFtkLnBsYWNlbWVudCwgYWxpZ25tZW50ICYmIGNyb3NzQXhpcyA/XG4gICAgICAgIC8vIENoZWNrIGFsb25nIHRoZSBtYWluQXhpcyBhbmQgbWFpbiBjcm9zc0F4aXMgc2lkZS5cbiAgICAgICAgZC5vdmVyZmxvd3Muc2xpY2UoMCwgMikucmVkdWNlKChhY2MsIHYpID0+IGFjYyArIHYsIDApIDpcbiAgICAgICAgLy8gQ2hlY2sgb25seSB0aGUgbWFpbkF4aXMuXG4gICAgICAgIGQub3ZlcmZsb3dzWzBdLCBkLm92ZXJmbG93c107XG4gICAgICB9KS5zb3J0KChhLCBiKSA9PiBhWzFdIC0gYlsxXSk7XG4gICAgICBjb25zdCBwbGFjZW1lbnRzVGhhdEZpdE9uRWFjaFNpZGUgPSBwbGFjZW1lbnRzU29ydGVkQnlNb3N0U3BhY2UuZmlsdGVyKGQgPT4gZFsyXS5zbGljZSgwLFxuICAgICAgLy8gQWxpZ25lZCBwbGFjZW1lbnRzIHNob3VsZCBub3QgY2hlY2sgdGhlaXIgb3Bwb3NpdGUgY3Jvc3NBeGlzXG4gICAgICAvLyBzaWRlLlxuICAgICAgZ2V0QWxpZ25tZW50KGRbMF0pID8gMiA6IDMpLmV2ZXJ5KHYgPT4gdiA8PSAwKSk7XG4gICAgICBjb25zdCByZXNldFBsYWNlbWVudCA9ICgoX3BsYWNlbWVudHNUaGF0Rml0T25FID0gcGxhY2VtZW50c1RoYXRGaXRPbkVhY2hTaWRlWzBdKSA9PSBudWxsID8gdm9pZCAwIDogX3BsYWNlbWVudHNUaGF0Rml0T25FWzBdKSB8fCBwbGFjZW1lbnRzU29ydGVkQnlNb3N0U3BhY2VbMF1bMF07XG4gICAgICBpZiAocmVzZXRQbGFjZW1lbnQgIT09IHBsYWNlbWVudCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIGluZGV4OiBjdXJyZW50SW5kZXggKyAxLFxuICAgICAgICAgICAgb3ZlcmZsb3dzOiBhbGxPdmVyZmxvd3NcbiAgICAgICAgICB9LFxuICAgICAgICAgIHJlc2V0OiB7XG4gICAgICAgICAgICBwbGFjZW1lbnQ6IHJlc2V0UGxhY2VtZW50XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cbiAgfTtcbn07XG5cbi8qKlxuICogT3B0aW1pemVzIHRoZSB2aXNpYmlsaXR5IG9mIHRoZSBmbG9hdGluZyBlbGVtZW50IGJ5IGZsaXBwaW5nIHRoZSBgcGxhY2VtZW50YFxuICogaW4gb3JkZXIgdG8ga2VlcCBpdCBpbiB2aWV3IHdoZW4gdGhlIHByZWZlcnJlZCBwbGFjZW1lbnQocykgd2lsbCBvdmVyZmxvdyB0aGVcbiAqIGNsaXBwaW5nIGJvdW5kYXJ5LiBBbHRlcm5hdGl2ZSB0byBgYXV0b1BsYWNlbWVudGAuXG4gKiBAc2VlIGh0dHBzOi8vZmxvYXRpbmctdWkuY29tL2RvY3MvZmxpcFxuICovXG5jb25zdCBmbGlwID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgaWYgKG9wdGlvbnMgPT09IHZvaWQgMCkge1xuICAgIG9wdGlvbnMgPSB7fTtcbiAgfVxuICByZXR1cm4ge1xuICAgIG5hbWU6ICdmbGlwJyxcbiAgICBvcHRpb25zLFxuICAgIGFzeW5jIGZuKHN0YXRlKSB7XG4gICAgICB2YXIgX21pZGRsZXdhcmVEYXRhJGFycm93LCBfbWlkZGxld2FyZURhdGEkZmxpcDtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgcGxhY2VtZW50LFxuICAgICAgICBtaWRkbGV3YXJlRGF0YSxcbiAgICAgICAgcmVjdHMsXG4gICAgICAgIGluaXRpYWxQbGFjZW1lbnQsXG4gICAgICAgIHBsYXRmb3JtLFxuICAgICAgICBlbGVtZW50c1xuICAgICAgfSA9IHN0YXRlO1xuICAgICAgY29uc3Qge1xuICAgICAgICBtYWluQXhpczogY2hlY2tNYWluQXhpcyA9IHRydWUsXG4gICAgICAgIGNyb3NzQXhpczogY2hlY2tDcm9zc0F4aXMgPSB0cnVlLFxuICAgICAgICBmYWxsYmFja1BsYWNlbWVudHM6IHNwZWNpZmllZEZhbGxiYWNrUGxhY2VtZW50cyxcbiAgICAgICAgZmFsbGJhY2tTdHJhdGVneSA9ICdiZXN0Rml0JyxcbiAgICAgICAgZmFsbGJhY2tBeGlzU2lkZURpcmVjdGlvbiA9ICdub25lJyxcbiAgICAgICAgZmxpcEFsaWdubWVudCA9IHRydWUsXG4gICAgICAgIC4uLmRldGVjdE92ZXJmbG93T3B0aW9uc1xuICAgICAgfSA9IGV2YWx1YXRlKG9wdGlvbnMsIHN0YXRlKTtcblxuICAgICAgLy8gSWYgYSByZXNldCBieSB0aGUgYXJyb3cgd2FzIGNhdXNlZCBkdWUgdG8gYW4gYWxpZ25tZW50IG9mZnNldCBiZWluZ1xuICAgICAgLy8gYWRkZWQsIHdlIHNob3VsZCBza2lwIGFueSBsb2dpYyBub3cgc2luY2UgYGZsaXAoKWAgaGFzIGFscmVhZHkgZG9uZSBpdHNcbiAgICAgIC8vIHdvcmsuXG4gICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vZmxvYXRpbmctdWkvZmxvYXRpbmctdWkvaXNzdWVzLzI1NDkjaXNzdWVjb21tZW50LTE3MTk2MDE2NDNcbiAgICAgIGlmICgoX21pZGRsZXdhcmVEYXRhJGFycm93ID0gbWlkZGxld2FyZURhdGEuYXJyb3cpICE9IG51bGwgJiYgX21pZGRsZXdhcmVEYXRhJGFycm93LmFsaWdubWVudE9mZnNldCkge1xuICAgICAgICByZXR1cm4ge307XG4gICAgICB9XG4gICAgICBjb25zdCBzaWRlID0gZ2V0U2lkZShwbGFjZW1lbnQpO1xuICAgICAgY29uc3QgaXNCYXNlUGxhY2VtZW50ID0gZ2V0U2lkZShpbml0aWFsUGxhY2VtZW50KSA9PT0gaW5pdGlhbFBsYWNlbWVudDtcbiAgICAgIGNvbnN0IHJ0bCA9IGF3YWl0IChwbGF0Zm9ybS5pc1JUTCA9PSBudWxsID8gdm9pZCAwIDogcGxhdGZvcm0uaXNSVEwoZWxlbWVudHMuZmxvYXRpbmcpKTtcbiAgICAgIGNvbnN0IGZhbGxiYWNrUGxhY2VtZW50cyA9IHNwZWNpZmllZEZhbGxiYWNrUGxhY2VtZW50cyB8fCAoaXNCYXNlUGxhY2VtZW50IHx8ICFmbGlwQWxpZ25tZW50ID8gW2dldE9wcG9zaXRlUGxhY2VtZW50KGluaXRpYWxQbGFjZW1lbnQpXSA6IGdldEV4cGFuZGVkUGxhY2VtZW50cyhpbml0aWFsUGxhY2VtZW50KSk7XG4gICAgICBpZiAoIXNwZWNpZmllZEZhbGxiYWNrUGxhY2VtZW50cyAmJiBmYWxsYmFja0F4aXNTaWRlRGlyZWN0aW9uICE9PSAnbm9uZScpIHtcbiAgICAgICAgZmFsbGJhY2tQbGFjZW1lbnRzLnB1c2goLi4uZ2V0T3Bwb3NpdGVBeGlzUGxhY2VtZW50cyhpbml0aWFsUGxhY2VtZW50LCBmbGlwQWxpZ25tZW50LCBmYWxsYmFja0F4aXNTaWRlRGlyZWN0aW9uLCBydGwpKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBsYWNlbWVudHMgPSBbaW5pdGlhbFBsYWNlbWVudCwgLi4uZmFsbGJhY2tQbGFjZW1lbnRzXTtcbiAgICAgIGNvbnN0IG92ZXJmbG93ID0gYXdhaXQgZGV0ZWN0T3ZlcmZsb3coc3RhdGUsIGRldGVjdE92ZXJmbG93T3B0aW9ucyk7XG4gICAgICBjb25zdCBvdmVyZmxvd3MgPSBbXTtcbiAgICAgIGxldCBvdmVyZmxvd3NEYXRhID0gKChfbWlkZGxld2FyZURhdGEkZmxpcCA9IG1pZGRsZXdhcmVEYXRhLmZsaXApID09IG51bGwgPyB2b2lkIDAgOiBfbWlkZGxld2FyZURhdGEkZmxpcC5vdmVyZmxvd3MpIHx8IFtdO1xuICAgICAgaWYgKGNoZWNrTWFpbkF4aXMpIHtcbiAgICAgICAgb3ZlcmZsb3dzLnB1c2gob3ZlcmZsb3dbc2lkZV0pO1xuICAgICAgfVxuICAgICAgaWYgKGNoZWNrQ3Jvc3NBeGlzKSB7XG4gICAgICAgIGNvbnN0IHNpZGVzID0gZ2V0QWxpZ25tZW50U2lkZXMocGxhY2VtZW50LCByZWN0cywgcnRsKTtcbiAgICAgICAgb3ZlcmZsb3dzLnB1c2gob3ZlcmZsb3dbc2lkZXNbMF1dLCBvdmVyZmxvd1tzaWRlc1sxXV0pO1xuICAgICAgfVxuICAgICAgb3ZlcmZsb3dzRGF0YSA9IFsuLi5vdmVyZmxvd3NEYXRhLCB7XG4gICAgICAgIHBsYWNlbWVudCxcbiAgICAgICAgb3ZlcmZsb3dzXG4gICAgICB9XTtcblxuICAgICAgLy8gT25lIG9yIG1vcmUgc2lkZXMgaXMgb3ZlcmZsb3dpbmcuXG4gICAgICBpZiAoIW92ZXJmbG93cy5ldmVyeShzaWRlID0+IHNpZGUgPD0gMCkpIHtcbiAgICAgICAgdmFyIF9taWRkbGV3YXJlRGF0YSRmbGlwMiwgX292ZXJmbG93c0RhdGEkZmlsdGVyO1xuICAgICAgICBjb25zdCBuZXh0SW5kZXggPSAoKChfbWlkZGxld2FyZURhdGEkZmxpcDIgPSBtaWRkbGV3YXJlRGF0YS5mbGlwKSA9PSBudWxsID8gdm9pZCAwIDogX21pZGRsZXdhcmVEYXRhJGZsaXAyLmluZGV4KSB8fCAwKSArIDE7XG4gICAgICAgIGNvbnN0IG5leHRQbGFjZW1lbnQgPSBwbGFjZW1lbnRzW25leHRJbmRleF07XG4gICAgICAgIGlmIChuZXh0UGxhY2VtZW50KSB7XG4gICAgICAgICAgLy8gVHJ5IG5leHQgcGxhY2VtZW50IGFuZCByZS1ydW4gdGhlIGxpZmVjeWNsZS5cbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICBpbmRleDogbmV4dEluZGV4LFxuICAgICAgICAgICAgICBvdmVyZmxvd3M6IG92ZXJmbG93c0RhdGFcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZXNldDoge1xuICAgICAgICAgICAgICBwbGFjZW1lbnQ6IG5leHRQbGFjZW1lbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmlyc3QsIGZpbmQgdGhlIGNhbmRpZGF0ZXMgdGhhdCBmaXQgb24gdGhlIG1haW5BeGlzIHNpZGUgb2Ygb3ZlcmZsb3csXG4gICAgICAgIC8vIHRoZW4gZmluZCB0aGUgcGxhY2VtZW50IHRoYXQgZml0cyB0aGUgYmVzdCBvbiB0aGUgbWFpbiBjcm9zc0F4aXMgc2lkZS5cbiAgICAgICAgbGV0IHJlc2V0UGxhY2VtZW50ID0gKF9vdmVyZmxvd3NEYXRhJGZpbHRlciA9IG92ZXJmbG93c0RhdGEuZmlsdGVyKGQgPT4gZC5vdmVyZmxvd3NbMF0gPD0gMCkuc29ydCgoYSwgYikgPT4gYS5vdmVyZmxvd3NbMV0gLSBiLm92ZXJmbG93c1sxXSlbMF0pID09IG51bGwgPyB2b2lkIDAgOiBfb3ZlcmZsb3dzRGF0YSRmaWx0ZXIucGxhY2VtZW50O1xuXG4gICAgICAgIC8vIE90aGVyd2lzZSBmYWxsYmFjay5cbiAgICAgICAgaWYgKCFyZXNldFBsYWNlbWVudCkge1xuICAgICAgICAgIHN3aXRjaCAoZmFsbGJhY2tTdHJhdGVneSkge1xuICAgICAgICAgICAgY2FzZSAnYmVzdEZpdCc6XG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2YXIgX292ZXJmbG93c0RhdGEkbWFwJHNvO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBsYWNlbWVudCA9IChfb3ZlcmZsb3dzRGF0YSRtYXAkc28gPSBvdmVyZmxvd3NEYXRhLm1hcChkID0+IFtkLnBsYWNlbWVudCwgZC5vdmVyZmxvd3MuZmlsdGVyKG92ZXJmbG93ID0+IG92ZXJmbG93ID4gMCkucmVkdWNlKChhY2MsIG92ZXJmbG93KSA9PiBhY2MgKyBvdmVyZmxvdywgMCldKS5zb3J0KChhLCBiKSA9PiBhWzFdIC0gYlsxXSlbMF0pID09IG51bGwgPyB2b2lkIDAgOiBfb3ZlcmZsb3dzRGF0YSRtYXAkc29bMF07XG4gICAgICAgICAgICAgICAgaWYgKHBsYWNlbWVudCkge1xuICAgICAgICAgICAgICAgICAgcmVzZXRQbGFjZW1lbnQgPSBwbGFjZW1lbnQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICdpbml0aWFsUGxhY2VtZW50JzpcbiAgICAgICAgICAgICAgcmVzZXRQbGFjZW1lbnQgPSBpbml0aWFsUGxhY2VtZW50O1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBsYWNlbWVudCAhPT0gcmVzZXRQbGFjZW1lbnQpIHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzZXQ6IHtcbiAgICAgICAgICAgICAgcGxhY2VtZW50OiByZXNldFBsYWNlbWVudFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG4gIH07XG59O1xuXG5mdW5jdGlvbiBnZXRTaWRlT2Zmc2V0cyhvdmVyZmxvdywgcmVjdCkge1xuICByZXR1cm4ge1xuICAgIHRvcDogb3ZlcmZsb3cudG9wIC0gcmVjdC5oZWlnaHQsXG4gICAgcmlnaHQ6IG92ZXJmbG93LnJpZ2h0IC0gcmVjdC53aWR0aCxcbiAgICBib3R0b206IG92ZXJmbG93LmJvdHRvbSAtIHJlY3QuaGVpZ2h0LFxuICAgIGxlZnQ6IG92ZXJmbG93LmxlZnQgLSByZWN0LndpZHRoXG4gIH07XG59XG5mdW5jdGlvbiBpc0FueVNpZGVGdWxseUNsaXBwZWQob3ZlcmZsb3cpIHtcbiAgcmV0dXJuIHNpZGVzLnNvbWUoc2lkZSA9PiBvdmVyZmxvd1tzaWRlXSA+PSAwKTtcbn1cbi8qKlxuICogUHJvdmlkZXMgZGF0YSB0byBoaWRlIHRoZSBmbG9hdGluZyBlbGVtZW50IGluIGFwcGxpY2FibGUgc2l0dWF0aW9ucywgc3VjaCBhc1xuICogd2hlbiBpdCBpcyBub3QgaW4gdGhlIHNhbWUgY2xpcHBpbmcgY29udGV4dCBhcyB0aGUgcmVmZXJlbmNlIGVsZW1lbnQuXG4gKiBAc2VlIGh0dHBzOi8vZmxvYXRpbmctdWkuY29tL2RvY3MvaGlkZVxuICovXG5jb25zdCBoaWRlID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgaWYgKG9wdGlvbnMgPT09IHZvaWQgMCkge1xuICAgIG9wdGlvbnMgPSB7fTtcbiAgfVxuICByZXR1cm4ge1xuICAgIG5hbWU6ICdoaWRlJyxcbiAgICBvcHRpb25zLFxuICAgIGFzeW5jIGZuKHN0YXRlKSB7XG4gICAgICBjb25zdCB7XG4gICAgICAgIHJlY3RzXG4gICAgICB9ID0gc3RhdGU7XG4gICAgICBjb25zdCB7XG4gICAgICAgIHN0cmF0ZWd5ID0gJ3JlZmVyZW5jZUhpZGRlbicsXG4gICAgICAgIC4uLmRldGVjdE92ZXJmbG93T3B0aW9uc1xuICAgICAgfSA9IGV2YWx1YXRlKG9wdGlvbnMsIHN0YXRlKTtcbiAgICAgIHN3aXRjaCAoc3RyYXRlZ3kpIHtcbiAgICAgICAgY2FzZSAncmVmZXJlbmNlSGlkZGVuJzpcbiAgICAgICAgICB7XG4gICAgICAgICAgICBjb25zdCBvdmVyZmxvdyA9IGF3YWl0IGRldGVjdE92ZXJmbG93KHN0YXRlLCB7XG4gICAgICAgICAgICAgIC4uLmRldGVjdE92ZXJmbG93T3B0aW9ucyxcbiAgICAgICAgICAgICAgZWxlbWVudENvbnRleHQ6ICdyZWZlcmVuY2UnXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldHMgPSBnZXRTaWRlT2Zmc2V0cyhvdmVyZmxvdywgcmVjdHMucmVmZXJlbmNlKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICByZWZlcmVuY2VIaWRkZW5PZmZzZXRzOiBvZmZzZXRzLFxuICAgICAgICAgICAgICAgIHJlZmVyZW5jZUhpZGRlbjogaXNBbnlTaWRlRnVsbHlDbGlwcGVkKG9mZnNldHMpXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICBjYXNlICdlc2NhcGVkJzpcbiAgICAgICAgICB7XG4gICAgICAgICAgICBjb25zdCBvdmVyZmxvdyA9IGF3YWl0IGRldGVjdE92ZXJmbG93KHN0YXRlLCB7XG4gICAgICAgICAgICAgIC4uLmRldGVjdE92ZXJmbG93T3B0aW9ucyxcbiAgICAgICAgICAgICAgYWx0Qm91bmRhcnk6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0cyA9IGdldFNpZGVPZmZzZXRzKG92ZXJmbG93LCByZWN0cy5mbG9hdGluZyk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgZXNjYXBlZE9mZnNldHM6IG9mZnNldHMsXG4gICAgICAgICAgICAgICAgZXNjYXBlZDogaXNBbnlTaWRlRnVsbHlDbGlwcGVkKG9mZnNldHMpXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9O1xufTtcblxuZnVuY3Rpb24gZ2V0Qm91bmRpbmdSZWN0KHJlY3RzKSB7XG4gIGNvbnN0IG1pblggPSBtaW4oLi4ucmVjdHMubWFwKHJlY3QgPT4gcmVjdC5sZWZ0KSk7XG4gIGNvbnN0IG1pblkgPSBtaW4oLi4ucmVjdHMubWFwKHJlY3QgPT4gcmVjdC50b3ApKTtcbiAgY29uc3QgbWF4WCA9IG1heCguLi5yZWN0cy5tYXAocmVjdCA9PiByZWN0LnJpZ2h0KSk7XG4gIGNvbnN0IG1heFkgPSBtYXgoLi4ucmVjdHMubWFwKHJlY3QgPT4gcmVjdC5ib3R0b20pKTtcbiAgcmV0dXJuIHtcbiAgICB4OiBtaW5YLFxuICAgIHk6IG1pblksXG4gICAgd2lkdGg6IG1heFggLSBtaW5YLFxuICAgIGhlaWdodDogbWF4WSAtIG1pbllcbiAgfTtcbn1cbmZ1bmN0aW9uIGdldFJlY3RzQnlMaW5lKHJlY3RzKSB7XG4gIGNvbnN0IHNvcnRlZFJlY3RzID0gcmVjdHMuc2xpY2UoKS5zb3J0KChhLCBiKSA9PiBhLnkgLSBiLnkpO1xuICBjb25zdCBncm91cHMgPSBbXTtcbiAgbGV0IHByZXZSZWN0ID0gbnVsbDtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBzb3J0ZWRSZWN0cy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHJlY3QgPSBzb3J0ZWRSZWN0c1tpXTtcbiAgICBpZiAoIXByZXZSZWN0IHx8IHJlY3QueSAtIHByZXZSZWN0LnkgPiBwcmV2UmVjdC5oZWlnaHQgLyAyKSB7XG4gICAgICBncm91cHMucHVzaChbcmVjdF0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBncm91cHNbZ3JvdXBzLmxlbmd0aCAtIDFdLnB1c2gocmVjdCk7XG4gICAgfVxuICAgIHByZXZSZWN0ID0gcmVjdDtcbiAgfVxuICByZXR1cm4gZ3JvdXBzLm1hcChyZWN0ID0+IHJlY3RUb0NsaWVudFJlY3QoZ2V0Qm91bmRpbmdSZWN0KHJlY3QpKSk7XG59XG4vKipcbiAqIFByb3ZpZGVzIGltcHJvdmVkIHBvc2l0aW9uaW5nIGZvciBpbmxpbmUgcmVmZXJlbmNlIGVsZW1lbnRzIHRoYXQgY2FuIHNwYW5cbiAqIG92ZXIgbXVsdGlwbGUgbGluZXMsIHN1Y2ggYXMgaHlwZXJsaW5rcyBvciByYW5nZSBzZWxlY3Rpb25zLlxuICogQHNlZSBodHRwczovL2Zsb2F0aW5nLXVpLmNvbS9kb2NzL2lubGluZVxuICovXG5jb25zdCBpbmxpbmUgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICBpZiAob3B0aW9ucyA9PT0gdm9pZCAwKSB7XG4gICAgb3B0aW9ucyA9IHt9O1xuICB9XG4gIHJldHVybiB7XG4gICAgbmFtZTogJ2lubGluZScsXG4gICAgb3B0aW9ucyxcbiAgICBhc3luYyBmbihzdGF0ZSkge1xuICAgICAgY29uc3Qge1xuICAgICAgICBwbGFjZW1lbnQsXG4gICAgICAgIGVsZW1lbnRzLFxuICAgICAgICByZWN0cyxcbiAgICAgICAgcGxhdGZvcm0sXG4gICAgICAgIHN0cmF0ZWd5XG4gICAgICB9ID0gc3RhdGU7XG4gICAgICAvLyBBIE1vdXNlRXZlbnQncyBjbGllbnR7WCxZfSBjb29yZHMgY2FuIGJlIHVwIHRvIDIgcGl4ZWxzIG9mZiBhXG4gICAgICAvLyBDbGllbnRSZWN0J3MgYm91bmRzLCBkZXNwaXRlIHRoZSBldmVudCBsaXN0ZW5lciBiZWluZyB0cmlnZ2VyZWQuIEFcbiAgICAgIC8vIHBhZGRpbmcgb2YgMiBzZWVtcyB0byBoYW5kbGUgdGhpcyBpc3N1ZS5cbiAgICAgIGNvbnN0IHtcbiAgICAgICAgcGFkZGluZyA9IDIsXG4gICAgICAgIHgsXG4gICAgICAgIHlcbiAgICAgIH0gPSBldmFsdWF0ZShvcHRpb25zLCBzdGF0ZSk7XG4gICAgICBjb25zdCBuYXRpdmVDbGllbnRSZWN0cyA9IEFycmF5LmZyb20oKGF3YWl0IChwbGF0Zm9ybS5nZXRDbGllbnRSZWN0cyA9PSBudWxsID8gdm9pZCAwIDogcGxhdGZvcm0uZ2V0Q2xpZW50UmVjdHMoZWxlbWVudHMucmVmZXJlbmNlKSkpIHx8IFtdKTtcbiAgICAgIGNvbnN0IGNsaWVudFJlY3RzID0gZ2V0UmVjdHNCeUxpbmUobmF0aXZlQ2xpZW50UmVjdHMpO1xuICAgICAgY29uc3QgZmFsbGJhY2sgPSByZWN0VG9DbGllbnRSZWN0KGdldEJvdW5kaW5nUmVjdChuYXRpdmVDbGllbnRSZWN0cykpO1xuICAgICAgY29uc3QgcGFkZGluZ09iamVjdCA9IGdldFBhZGRpbmdPYmplY3QocGFkZGluZyk7XG4gICAgICBmdW5jdGlvbiBnZXRCb3VuZGluZ0NsaWVudFJlY3QoKSB7XG4gICAgICAgIC8vIFRoZXJlIGFyZSB0d28gcmVjdHMgYW5kIHRoZXkgYXJlIGRpc2pvaW5lZC5cbiAgICAgICAgaWYgKGNsaWVudFJlY3RzLmxlbmd0aCA9PT0gMiAmJiBjbGllbnRSZWN0c1swXS5sZWZ0ID4gY2xpZW50UmVjdHNbMV0ucmlnaHQgJiYgeCAhPSBudWxsICYmIHkgIT0gbnVsbCkge1xuICAgICAgICAgIC8vIEZpbmQgdGhlIGZpcnN0IHJlY3QgaW4gd2hpY2ggdGhlIHBvaW50IGlzIGZ1bGx5IGluc2lkZS5cbiAgICAgICAgICByZXR1cm4gY2xpZW50UmVjdHMuZmluZChyZWN0ID0+IHggPiByZWN0LmxlZnQgLSBwYWRkaW5nT2JqZWN0LmxlZnQgJiYgeCA8IHJlY3QucmlnaHQgKyBwYWRkaW5nT2JqZWN0LnJpZ2h0ICYmIHkgPiByZWN0LnRvcCAtIHBhZGRpbmdPYmplY3QudG9wICYmIHkgPCByZWN0LmJvdHRvbSArIHBhZGRpbmdPYmplY3QuYm90dG9tKSB8fCBmYWxsYmFjaztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRoZXJlIGFyZSAyIG9yIG1vcmUgY29ubmVjdGVkIHJlY3RzLlxuICAgICAgICBpZiAoY2xpZW50UmVjdHMubGVuZ3RoID49IDIpIHtcbiAgICAgICAgICBpZiAoZ2V0U2lkZUF4aXMocGxhY2VtZW50KSA9PT0gJ3knKSB7XG4gICAgICAgICAgICBjb25zdCBmaXJzdFJlY3QgPSBjbGllbnRSZWN0c1swXTtcbiAgICAgICAgICAgIGNvbnN0IGxhc3RSZWN0ID0gY2xpZW50UmVjdHNbY2xpZW50UmVjdHMubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICBjb25zdCBpc1RvcCA9IGdldFNpZGUocGxhY2VtZW50KSA9PT0gJ3RvcCc7XG4gICAgICAgICAgICBjb25zdCB0b3AgPSBmaXJzdFJlY3QudG9wO1xuICAgICAgICAgICAgY29uc3QgYm90dG9tID0gbGFzdFJlY3QuYm90dG9tO1xuICAgICAgICAgICAgY29uc3QgbGVmdCA9IGlzVG9wID8gZmlyc3RSZWN0LmxlZnQgOiBsYXN0UmVjdC5sZWZ0O1xuICAgICAgICAgICAgY29uc3QgcmlnaHQgPSBpc1RvcCA/IGZpcnN0UmVjdC5yaWdodCA6IGxhc3RSZWN0LnJpZ2h0O1xuICAgICAgICAgICAgY29uc3Qgd2lkdGggPSByaWdodCAtIGxlZnQ7XG4gICAgICAgICAgICBjb25zdCBoZWlnaHQgPSBib3R0b20gLSB0b3A7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICB0b3AsXG4gICAgICAgICAgICAgIGJvdHRvbSxcbiAgICAgICAgICAgICAgbGVmdCxcbiAgICAgICAgICAgICAgcmlnaHQsXG4gICAgICAgICAgICAgIHdpZHRoLFxuICAgICAgICAgICAgICBoZWlnaHQsXG4gICAgICAgICAgICAgIHg6IGxlZnQsXG4gICAgICAgICAgICAgIHk6IHRvcFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgaXNMZWZ0U2lkZSA9IGdldFNpZGUocGxhY2VtZW50KSA9PT0gJ2xlZnQnO1xuICAgICAgICAgIGNvbnN0IG1heFJpZ2h0ID0gbWF4KC4uLmNsaWVudFJlY3RzLm1hcChyZWN0ID0+IHJlY3QucmlnaHQpKTtcbiAgICAgICAgICBjb25zdCBtaW5MZWZ0ID0gbWluKC4uLmNsaWVudFJlY3RzLm1hcChyZWN0ID0+IHJlY3QubGVmdCkpO1xuICAgICAgICAgIGNvbnN0IG1lYXN1cmVSZWN0cyA9IGNsaWVudFJlY3RzLmZpbHRlcihyZWN0ID0+IGlzTGVmdFNpZGUgPyByZWN0LmxlZnQgPT09IG1pbkxlZnQgOiByZWN0LnJpZ2h0ID09PSBtYXhSaWdodCk7XG4gICAgICAgICAgY29uc3QgdG9wID0gbWVhc3VyZVJlY3RzWzBdLnRvcDtcbiAgICAgICAgICBjb25zdCBib3R0b20gPSBtZWFzdXJlUmVjdHNbbWVhc3VyZVJlY3RzLmxlbmd0aCAtIDFdLmJvdHRvbTtcbiAgICAgICAgICBjb25zdCBsZWZ0ID0gbWluTGVmdDtcbiAgICAgICAgICBjb25zdCByaWdodCA9IG1heFJpZ2h0O1xuICAgICAgICAgIGNvbnN0IHdpZHRoID0gcmlnaHQgLSBsZWZ0O1xuICAgICAgICAgIGNvbnN0IGhlaWdodCA9IGJvdHRvbSAtIHRvcDtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdG9wLFxuICAgICAgICAgICAgYm90dG9tLFxuICAgICAgICAgICAgbGVmdCxcbiAgICAgICAgICAgIHJpZ2h0LFxuICAgICAgICAgICAgd2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQsXG4gICAgICAgICAgICB4OiBsZWZ0LFxuICAgICAgICAgICAgeTogdG9wXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsbGJhY2s7XG4gICAgICB9XG4gICAgICBjb25zdCByZXNldFJlY3RzID0gYXdhaXQgcGxhdGZvcm0uZ2V0RWxlbWVudFJlY3RzKHtcbiAgICAgICAgcmVmZXJlbmNlOiB7XG4gICAgICAgICAgZ2V0Qm91bmRpbmdDbGllbnRSZWN0XG4gICAgICAgIH0sXG4gICAgICAgIGZsb2F0aW5nOiBlbGVtZW50cy5mbG9hdGluZyxcbiAgICAgICAgc3RyYXRlZ3lcbiAgICAgIH0pO1xuICAgICAgaWYgKHJlY3RzLnJlZmVyZW5jZS54ICE9PSByZXNldFJlY3RzLnJlZmVyZW5jZS54IHx8IHJlY3RzLnJlZmVyZW5jZS55ICE9PSByZXNldFJlY3RzLnJlZmVyZW5jZS55IHx8IHJlY3RzLnJlZmVyZW5jZS53aWR0aCAhPT0gcmVzZXRSZWN0cy5yZWZlcmVuY2Uud2lkdGggfHwgcmVjdHMucmVmZXJlbmNlLmhlaWdodCAhPT0gcmVzZXRSZWN0cy5yZWZlcmVuY2UuaGVpZ2h0KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgcmVzZXQ6IHtcbiAgICAgICAgICAgIHJlY3RzOiByZXNldFJlY3RzXG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cbiAgfTtcbn07XG5cbi8vIEZvciB0eXBlIGJhY2t3YXJkcy1jb21wYXRpYmlsaXR5LCB0aGUgYE9mZnNldE9wdGlvbnNgIHR5cGUgd2FzIGFsc29cbi8vIERlcml2YWJsZS5cblxuYXN5bmMgZnVuY3Rpb24gY29udmVydFZhbHVlVG9Db29yZHMoc3RhdGUsIG9wdGlvbnMpIHtcbiAgY29uc3Qge1xuICAgIHBsYWNlbWVudCxcbiAgICBwbGF0Zm9ybSxcbiAgICBlbGVtZW50c1xuICB9ID0gc3RhdGU7XG4gIGNvbnN0IHJ0bCA9IGF3YWl0IChwbGF0Zm9ybS5pc1JUTCA9PSBudWxsID8gdm9pZCAwIDogcGxhdGZvcm0uaXNSVEwoZWxlbWVudHMuZmxvYXRpbmcpKTtcbiAgY29uc3Qgc2lkZSA9IGdldFNpZGUocGxhY2VtZW50KTtcbiAgY29uc3QgYWxpZ25tZW50ID0gZ2V0QWxpZ25tZW50KHBsYWNlbWVudCk7XG4gIGNvbnN0IGlzVmVydGljYWwgPSBnZXRTaWRlQXhpcyhwbGFjZW1lbnQpID09PSAneSc7XG4gIGNvbnN0IG1haW5BeGlzTXVsdGkgPSBbJ2xlZnQnLCAndG9wJ10uaW5jbHVkZXMoc2lkZSkgPyAtMSA6IDE7XG4gIGNvbnN0IGNyb3NzQXhpc011bHRpID0gcnRsICYmIGlzVmVydGljYWwgPyAtMSA6IDE7XG4gIGNvbnN0IHJhd1ZhbHVlID0gZXZhbHVhdGUob3B0aW9ucywgc3RhdGUpO1xuXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBwcmVmZXItY29uc3RcbiAgbGV0IHtcbiAgICBtYWluQXhpcyxcbiAgICBjcm9zc0F4aXMsXG4gICAgYWxpZ25tZW50QXhpc1xuICB9ID0gdHlwZW9mIHJhd1ZhbHVlID09PSAnbnVtYmVyJyA/IHtcbiAgICBtYWluQXhpczogcmF3VmFsdWUsXG4gICAgY3Jvc3NBeGlzOiAwLFxuICAgIGFsaWdubWVudEF4aXM6IG51bGxcbiAgfSA6IHtcbiAgICBtYWluQXhpczogMCxcbiAgICBjcm9zc0F4aXM6IDAsXG4gICAgYWxpZ25tZW50QXhpczogbnVsbCxcbiAgICAuLi5yYXdWYWx1ZVxuICB9O1xuICBpZiAoYWxpZ25tZW50ICYmIHR5cGVvZiBhbGlnbm1lbnRBeGlzID09PSAnbnVtYmVyJykge1xuICAgIGNyb3NzQXhpcyA9IGFsaWdubWVudCA9PT0gJ2VuZCcgPyBhbGlnbm1lbnRBeGlzICogLTEgOiBhbGlnbm1lbnRBeGlzO1xuICB9XG4gIHJldHVybiBpc1ZlcnRpY2FsID8ge1xuICAgIHg6IGNyb3NzQXhpcyAqIGNyb3NzQXhpc011bHRpLFxuICAgIHk6IG1haW5BeGlzICogbWFpbkF4aXNNdWx0aVxuICB9IDoge1xuICAgIHg6IG1haW5BeGlzICogbWFpbkF4aXNNdWx0aSxcbiAgICB5OiBjcm9zc0F4aXMgKiBjcm9zc0F4aXNNdWx0aVxuICB9O1xufVxuXG4vKipcbiAqIE1vZGlmaWVzIHRoZSBwbGFjZW1lbnQgYnkgdHJhbnNsYXRpbmcgdGhlIGZsb2F0aW5nIGVsZW1lbnQgYWxvbmcgdGhlXG4gKiBzcGVjaWZpZWQgYXhlcy5cbiAqIEEgbnVtYmVyIChzaG9ydGhhbmQgZm9yIGBtYWluQXhpc2Agb3IgZGlzdGFuY2UpLCBvciBhbiBheGVzIGNvbmZpZ3VyYXRpb25cbiAqIG9iamVjdCBtYXkgYmUgcGFzc2VkLlxuICogQHNlZSBodHRwczovL2Zsb2F0aW5nLXVpLmNvbS9kb2NzL29mZnNldFxuICovXG5jb25zdCBvZmZzZXQgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICBpZiAob3B0aW9ucyA9PT0gdm9pZCAwKSB7XG4gICAgb3B0aW9ucyA9IDA7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBuYW1lOiAnb2Zmc2V0JyxcbiAgICBvcHRpb25zLFxuICAgIGFzeW5jIGZuKHN0YXRlKSB7XG4gICAgICB2YXIgX21pZGRsZXdhcmVEYXRhJG9mZnNlLCBfbWlkZGxld2FyZURhdGEkYXJyb3c7XG4gICAgICBjb25zdCB7XG4gICAgICAgIHgsXG4gICAgICAgIHksXG4gICAgICAgIHBsYWNlbWVudCxcbiAgICAgICAgbWlkZGxld2FyZURhdGFcbiAgICAgIH0gPSBzdGF0ZTtcbiAgICAgIGNvbnN0IGRpZmZDb29yZHMgPSBhd2FpdCBjb252ZXJ0VmFsdWVUb0Nvb3JkcyhzdGF0ZSwgb3B0aW9ucyk7XG5cbiAgICAgIC8vIElmIHRoZSBwbGFjZW1lbnQgaXMgdGhlIHNhbWUgYW5kIHRoZSBhcnJvdyBjYXVzZWQgYW4gYWxpZ25tZW50IG9mZnNldFxuICAgICAgLy8gdGhlbiB3ZSBkb24ndCBuZWVkIHRvIGNoYW5nZSB0aGUgcG9zaXRpb25pbmcgY29vcmRpbmF0ZXMuXG4gICAgICBpZiAocGxhY2VtZW50ID09PSAoKF9taWRkbGV3YXJlRGF0YSRvZmZzZSA9IG1pZGRsZXdhcmVEYXRhLm9mZnNldCkgPT0gbnVsbCA/IHZvaWQgMCA6IF9taWRkbGV3YXJlRGF0YSRvZmZzZS5wbGFjZW1lbnQpICYmIChfbWlkZGxld2FyZURhdGEkYXJyb3cgPSBtaWRkbGV3YXJlRGF0YS5hcnJvdykgIT0gbnVsbCAmJiBfbWlkZGxld2FyZURhdGEkYXJyb3cuYWxpZ25tZW50T2Zmc2V0KSB7XG4gICAgICAgIHJldHVybiB7fTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHg6IHggKyBkaWZmQ29vcmRzLngsXG4gICAgICAgIHk6IHkgKyBkaWZmQ29vcmRzLnksXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAuLi5kaWZmQ29vcmRzLFxuICAgICAgICAgIHBsYWNlbWVudFxuICAgICAgICB9XG4gICAgICB9O1xuICAgIH1cbiAgfTtcbn07XG5cbi8qKlxuICogT3B0aW1pemVzIHRoZSB2aXNpYmlsaXR5IG9mIHRoZSBmbG9hdGluZyBlbGVtZW50IGJ5IHNoaWZ0aW5nIGl0IGluIG9yZGVyIHRvXG4gKiBrZWVwIGl0IGluIHZpZXcgd2hlbiBpdCB3aWxsIG92ZXJmbG93IHRoZSBjbGlwcGluZyBib3VuZGFyeS5cbiAqIEBzZWUgaHR0cHM6Ly9mbG9hdGluZy11aS5jb20vZG9jcy9zaGlmdFxuICovXG5jb25zdCBzaGlmdCA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIGlmIChvcHRpb25zID09PSB2b2lkIDApIHtcbiAgICBvcHRpb25zID0ge307XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBuYW1lOiAnc2hpZnQnLFxuICAgIG9wdGlvbnMsXG4gICAgYXN5bmMgZm4oc3RhdGUpIHtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgeCxcbiAgICAgICAgeSxcbiAgICAgICAgcGxhY2VtZW50XG4gICAgICB9ID0gc3RhdGU7XG4gICAgICBjb25zdCB7XG4gICAgICAgIG1haW5BeGlzOiBjaGVja01haW5BeGlzID0gdHJ1ZSxcbiAgICAgICAgY3Jvc3NBeGlzOiBjaGVja0Nyb3NzQXhpcyA9IGZhbHNlLFxuICAgICAgICBsaW1pdGVyID0ge1xuICAgICAgICAgIGZuOiBfcmVmID0+IHtcbiAgICAgICAgICAgIGxldCB7XG4gICAgICAgICAgICAgIHgsXG4gICAgICAgICAgICAgIHlcbiAgICAgICAgICAgIH0gPSBfcmVmO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgeCxcbiAgICAgICAgICAgICAgeVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIC4uLmRldGVjdE92ZXJmbG93T3B0aW9uc1xuICAgICAgfSA9IGV2YWx1YXRlKG9wdGlvbnMsIHN0YXRlKTtcbiAgICAgIGNvbnN0IGNvb3JkcyA9IHtcbiAgICAgICAgeCxcbiAgICAgICAgeVxuICAgICAgfTtcbiAgICAgIGNvbnN0IG92ZXJmbG93ID0gYXdhaXQgZGV0ZWN0T3ZlcmZsb3coc3RhdGUsIGRldGVjdE92ZXJmbG93T3B0aW9ucyk7XG4gICAgICBjb25zdCBjcm9zc0F4aXMgPSBnZXRTaWRlQXhpcyhnZXRTaWRlKHBsYWNlbWVudCkpO1xuICAgICAgY29uc3QgbWFpbkF4aXMgPSBnZXRPcHBvc2l0ZUF4aXMoY3Jvc3NBeGlzKTtcbiAgICAgIGxldCBtYWluQXhpc0Nvb3JkID0gY29vcmRzW21haW5BeGlzXTtcbiAgICAgIGxldCBjcm9zc0F4aXNDb29yZCA9IGNvb3Jkc1tjcm9zc0F4aXNdO1xuICAgICAgaWYgKGNoZWNrTWFpbkF4aXMpIHtcbiAgICAgICAgY29uc3QgbWluU2lkZSA9IG1haW5BeGlzID09PSAneScgPyAndG9wJyA6ICdsZWZ0JztcbiAgICAgICAgY29uc3QgbWF4U2lkZSA9IG1haW5BeGlzID09PSAneScgPyAnYm90dG9tJyA6ICdyaWdodCc7XG4gICAgICAgIGNvbnN0IG1pbiA9IG1haW5BeGlzQ29vcmQgKyBvdmVyZmxvd1ttaW5TaWRlXTtcbiAgICAgICAgY29uc3QgbWF4ID0gbWFpbkF4aXNDb29yZCAtIG92ZXJmbG93W21heFNpZGVdO1xuICAgICAgICBtYWluQXhpc0Nvb3JkID0gY2xhbXAobWluLCBtYWluQXhpc0Nvb3JkLCBtYXgpO1xuICAgICAgfVxuICAgICAgaWYgKGNoZWNrQ3Jvc3NBeGlzKSB7XG4gICAgICAgIGNvbnN0IG1pblNpZGUgPSBjcm9zc0F4aXMgPT09ICd5JyA/ICd0b3AnIDogJ2xlZnQnO1xuICAgICAgICBjb25zdCBtYXhTaWRlID0gY3Jvc3NBeGlzID09PSAneScgPyAnYm90dG9tJyA6ICdyaWdodCc7XG4gICAgICAgIGNvbnN0IG1pbiA9IGNyb3NzQXhpc0Nvb3JkICsgb3ZlcmZsb3dbbWluU2lkZV07XG4gICAgICAgIGNvbnN0IG1heCA9IGNyb3NzQXhpc0Nvb3JkIC0gb3ZlcmZsb3dbbWF4U2lkZV07XG4gICAgICAgIGNyb3NzQXhpc0Nvb3JkID0gY2xhbXAobWluLCBjcm9zc0F4aXNDb29yZCwgbWF4KTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGxpbWl0ZWRDb29yZHMgPSBsaW1pdGVyLmZuKHtcbiAgICAgICAgLi4uc3RhdGUsXG4gICAgICAgIFttYWluQXhpc106IG1haW5BeGlzQ29vcmQsXG4gICAgICAgIFtjcm9zc0F4aXNdOiBjcm9zc0F4aXNDb29yZFxuICAgICAgfSk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICAuLi5saW1pdGVkQ29vcmRzLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgeDogbGltaXRlZENvb3Jkcy54IC0geCxcbiAgICAgICAgICB5OiBsaW1pdGVkQ29vcmRzLnkgLSB5XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuICB9O1xufTtcbi8qKlxuICogQnVpbHQtaW4gYGxpbWl0ZXJgIHRoYXQgd2lsbCBzdG9wIGBzaGlmdCgpYCBhdCBhIGNlcnRhaW4gcG9pbnQuXG4gKi9cbmNvbnN0IGxpbWl0U2hpZnQgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICBpZiAob3B0aW9ucyA9PT0gdm9pZCAwKSB7XG4gICAgb3B0aW9ucyA9IHt9O1xuICB9XG4gIHJldHVybiB7XG4gICAgb3B0aW9ucyxcbiAgICBmbihzdGF0ZSkge1xuICAgICAgY29uc3Qge1xuICAgICAgICB4LFxuICAgICAgICB5LFxuICAgICAgICBwbGFjZW1lbnQsXG4gICAgICAgIHJlY3RzLFxuICAgICAgICBtaWRkbGV3YXJlRGF0YVxuICAgICAgfSA9IHN0YXRlO1xuICAgICAgY29uc3Qge1xuICAgICAgICBvZmZzZXQgPSAwLFxuICAgICAgICBtYWluQXhpczogY2hlY2tNYWluQXhpcyA9IHRydWUsXG4gICAgICAgIGNyb3NzQXhpczogY2hlY2tDcm9zc0F4aXMgPSB0cnVlXG4gICAgICB9ID0gZXZhbHVhdGUob3B0aW9ucywgc3RhdGUpO1xuICAgICAgY29uc3QgY29vcmRzID0ge1xuICAgICAgICB4LFxuICAgICAgICB5XG4gICAgICB9O1xuICAgICAgY29uc3QgY3Jvc3NBeGlzID0gZ2V0U2lkZUF4aXMocGxhY2VtZW50KTtcbiAgICAgIGNvbnN0IG1haW5BeGlzID0gZ2V0T3Bwb3NpdGVBeGlzKGNyb3NzQXhpcyk7XG4gICAgICBsZXQgbWFpbkF4aXNDb29yZCA9IGNvb3Jkc1ttYWluQXhpc107XG4gICAgICBsZXQgY3Jvc3NBeGlzQ29vcmQgPSBjb29yZHNbY3Jvc3NBeGlzXTtcbiAgICAgIGNvbnN0IHJhd09mZnNldCA9IGV2YWx1YXRlKG9mZnNldCwgc3RhdGUpO1xuICAgICAgY29uc3QgY29tcHV0ZWRPZmZzZXQgPSB0eXBlb2YgcmF3T2Zmc2V0ID09PSAnbnVtYmVyJyA/IHtcbiAgICAgICAgbWFpbkF4aXM6IHJhd09mZnNldCxcbiAgICAgICAgY3Jvc3NBeGlzOiAwXG4gICAgICB9IDoge1xuICAgICAgICBtYWluQXhpczogMCxcbiAgICAgICAgY3Jvc3NBeGlzOiAwLFxuICAgICAgICAuLi5yYXdPZmZzZXRcbiAgICAgIH07XG4gICAgICBpZiAoY2hlY2tNYWluQXhpcykge1xuICAgICAgICBjb25zdCBsZW4gPSBtYWluQXhpcyA9PT0gJ3knID8gJ2hlaWdodCcgOiAnd2lkdGgnO1xuICAgICAgICBjb25zdCBsaW1pdE1pbiA9IHJlY3RzLnJlZmVyZW5jZVttYWluQXhpc10gLSByZWN0cy5mbG9hdGluZ1tsZW5dICsgY29tcHV0ZWRPZmZzZXQubWFpbkF4aXM7XG4gICAgICAgIGNvbnN0IGxpbWl0TWF4ID0gcmVjdHMucmVmZXJlbmNlW21haW5BeGlzXSArIHJlY3RzLnJlZmVyZW5jZVtsZW5dIC0gY29tcHV0ZWRPZmZzZXQubWFpbkF4aXM7XG4gICAgICAgIGlmIChtYWluQXhpc0Nvb3JkIDwgbGltaXRNaW4pIHtcbiAgICAgICAgICBtYWluQXhpc0Nvb3JkID0gbGltaXRNaW47XG4gICAgICAgIH0gZWxzZSBpZiAobWFpbkF4aXNDb29yZCA+IGxpbWl0TWF4KSB7XG4gICAgICAgICAgbWFpbkF4aXNDb29yZCA9IGxpbWl0TWF4O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoY2hlY2tDcm9zc0F4aXMpIHtcbiAgICAgICAgdmFyIF9taWRkbGV3YXJlRGF0YSRvZmZzZSwgX21pZGRsZXdhcmVEYXRhJG9mZnNlMjtcbiAgICAgICAgY29uc3QgbGVuID0gbWFpbkF4aXMgPT09ICd5JyA/ICd3aWR0aCcgOiAnaGVpZ2h0JztcbiAgICAgICAgY29uc3QgaXNPcmlnaW5TaWRlID0gWyd0b3AnLCAnbGVmdCddLmluY2x1ZGVzKGdldFNpZGUocGxhY2VtZW50KSk7XG4gICAgICAgIGNvbnN0IGxpbWl0TWluID0gcmVjdHMucmVmZXJlbmNlW2Nyb3NzQXhpc10gLSByZWN0cy5mbG9hdGluZ1tsZW5dICsgKGlzT3JpZ2luU2lkZSA/ICgoX21pZGRsZXdhcmVEYXRhJG9mZnNlID0gbWlkZGxld2FyZURhdGEub2Zmc2V0KSA9PSBudWxsID8gdm9pZCAwIDogX21pZGRsZXdhcmVEYXRhJG9mZnNlW2Nyb3NzQXhpc10pIHx8IDAgOiAwKSArIChpc09yaWdpblNpZGUgPyAwIDogY29tcHV0ZWRPZmZzZXQuY3Jvc3NBeGlzKTtcbiAgICAgICAgY29uc3QgbGltaXRNYXggPSByZWN0cy5yZWZlcmVuY2VbY3Jvc3NBeGlzXSArIHJlY3RzLnJlZmVyZW5jZVtsZW5dICsgKGlzT3JpZ2luU2lkZSA/IDAgOiAoKF9taWRkbGV3YXJlRGF0YSRvZmZzZTIgPSBtaWRkbGV3YXJlRGF0YS5vZmZzZXQpID09IG51bGwgPyB2b2lkIDAgOiBfbWlkZGxld2FyZURhdGEkb2Zmc2UyW2Nyb3NzQXhpc10pIHx8IDApIC0gKGlzT3JpZ2luU2lkZSA/IGNvbXB1dGVkT2Zmc2V0LmNyb3NzQXhpcyA6IDApO1xuICAgICAgICBpZiAoY3Jvc3NBeGlzQ29vcmQgPCBsaW1pdE1pbikge1xuICAgICAgICAgIGNyb3NzQXhpc0Nvb3JkID0gbGltaXRNaW47XG4gICAgICAgIH0gZWxzZSBpZiAoY3Jvc3NBeGlzQ29vcmQgPiBsaW1pdE1heCkge1xuICAgICAgICAgIGNyb3NzQXhpc0Nvb3JkID0gbGltaXRNYXg7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB7XG4gICAgICAgIFttYWluQXhpc106IG1haW5BeGlzQ29vcmQsXG4gICAgICAgIFtjcm9zc0F4aXNdOiBjcm9zc0F4aXNDb29yZFxuICAgICAgfTtcbiAgICB9XG4gIH07XG59O1xuXG4vKipcbiAqIFByb3ZpZGVzIGRhdGEgdGhhdCBhbGxvd3MgeW91IHRvIGNoYW5nZSB0aGUgc2l6ZSBvZiB0aGUgZmxvYXRpbmcgZWxlbWVudCBcdTIwMTRcbiAqIGZvciBpbnN0YW5jZSwgcHJldmVudCBpdCBmcm9tIG92ZXJmbG93aW5nIHRoZSBjbGlwcGluZyBib3VuZGFyeSBvciBtYXRjaCB0aGVcbiAqIHdpZHRoIG9mIHRoZSByZWZlcmVuY2UgZWxlbWVudC5cbiAqIEBzZWUgaHR0cHM6Ly9mbG9hdGluZy11aS5jb20vZG9jcy9zaXplXG4gKi9cbmNvbnN0IHNpemUgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICBpZiAob3B0aW9ucyA9PT0gdm9pZCAwKSB7XG4gICAgb3B0aW9ucyA9IHt9O1xuICB9XG4gIHJldHVybiB7XG4gICAgbmFtZTogJ3NpemUnLFxuICAgIG9wdGlvbnMsXG4gICAgYXN5bmMgZm4oc3RhdGUpIHtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgcGxhY2VtZW50LFxuICAgICAgICByZWN0cyxcbiAgICAgICAgcGxhdGZvcm0sXG4gICAgICAgIGVsZW1lbnRzXG4gICAgICB9ID0gc3RhdGU7XG4gICAgICBjb25zdCB7XG4gICAgICAgIGFwcGx5ID0gKCkgPT4ge30sXG4gICAgICAgIC4uLmRldGVjdE92ZXJmbG93T3B0aW9uc1xuICAgICAgfSA9IGV2YWx1YXRlKG9wdGlvbnMsIHN0YXRlKTtcbiAgICAgIGNvbnN0IG92ZXJmbG93ID0gYXdhaXQgZGV0ZWN0T3ZlcmZsb3coc3RhdGUsIGRldGVjdE92ZXJmbG93T3B0aW9ucyk7XG4gICAgICBjb25zdCBzaWRlID0gZ2V0U2lkZShwbGFjZW1lbnQpO1xuICAgICAgY29uc3QgYWxpZ25tZW50ID0gZ2V0QWxpZ25tZW50KHBsYWNlbWVudCk7XG4gICAgICBjb25zdCBpc1lBeGlzID0gZ2V0U2lkZUF4aXMocGxhY2VtZW50KSA9PT0gJ3knO1xuICAgICAgY29uc3Qge1xuICAgICAgICB3aWR0aCxcbiAgICAgICAgaGVpZ2h0XG4gICAgICB9ID0gcmVjdHMuZmxvYXRpbmc7XG4gICAgICBsZXQgaGVpZ2h0U2lkZTtcbiAgICAgIGxldCB3aWR0aFNpZGU7XG4gICAgICBpZiAoc2lkZSA9PT0gJ3RvcCcgfHwgc2lkZSA9PT0gJ2JvdHRvbScpIHtcbiAgICAgICAgaGVpZ2h0U2lkZSA9IHNpZGU7XG4gICAgICAgIHdpZHRoU2lkZSA9IGFsaWdubWVudCA9PT0gKChhd2FpdCAocGxhdGZvcm0uaXNSVEwgPT0gbnVsbCA/IHZvaWQgMCA6IHBsYXRmb3JtLmlzUlRMKGVsZW1lbnRzLmZsb2F0aW5nKSkpID8gJ3N0YXJ0JyA6ICdlbmQnKSA/ICdsZWZ0JyA6ICdyaWdodCc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB3aWR0aFNpZGUgPSBzaWRlO1xuICAgICAgICBoZWlnaHRTaWRlID0gYWxpZ25tZW50ID09PSAnZW5kJyA/ICd0b3AnIDogJ2JvdHRvbSc7XG4gICAgICB9XG4gICAgICBjb25zdCBvdmVyZmxvd0F2YWlsYWJsZUhlaWdodCA9IGhlaWdodCAtIG92ZXJmbG93W2hlaWdodFNpZGVdO1xuICAgICAgY29uc3Qgb3ZlcmZsb3dBdmFpbGFibGVXaWR0aCA9IHdpZHRoIC0gb3ZlcmZsb3dbd2lkdGhTaWRlXTtcbiAgICAgIGNvbnN0IG5vU2hpZnQgPSAhc3RhdGUubWlkZGxld2FyZURhdGEuc2hpZnQ7XG4gICAgICBsZXQgYXZhaWxhYmxlSGVpZ2h0ID0gb3ZlcmZsb3dBdmFpbGFibGVIZWlnaHQ7XG4gICAgICBsZXQgYXZhaWxhYmxlV2lkdGggPSBvdmVyZmxvd0F2YWlsYWJsZVdpZHRoO1xuICAgICAgaWYgKGlzWUF4aXMpIHtcbiAgICAgICAgY29uc3QgbWF4aW11bUNsaXBwaW5nV2lkdGggPSB3aWR0aCAtIG92ZXJmbG93LmxlZnQgLSBvdmVyZmxvdy5yaWdodDtcbiAgICAgICAgYXZhaWxhYmxlV2lkdGggPSBhbGlnbm1lbnQgfHwgbm9TaGlmdCA/IG1pbihvdmVyZmxvd0F2YWlsYWJsZVdpZHRoLCBtYXhpbXVtQ2xpcHBpbmdXaWR0aCkgOiBtYXhpbXVtQ2xpcHBpbmdXaWR0aDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IG1heGltdW1DbGlwcGluZ0hlaWdodCA9IGhlaWdodCAtIG92ZXJmbG93LnRvcCAtIG92ZXJmbG93LmJvdHRvbTtcbiAgICAgICAgYXZhaWxhYmxlSGVpZ2h0ID0gYWxpZ25tZW50IHx8IG5vU2hpZnQgPyBtaW4ob3ZlcmZsb3dBdmFpbGFibGVIZWlnaHQsIG1heGltdW1DbGlwcGluZ0hlaWdodCkgOiBtYXhpbXVtQ2xpcHBpbmdIZWlnaHQ7XG4gICAgICB9XG4gICAgICBpZiAobm9TaGlmdCAmJiAhYWxpZ25tZW50KSB7XG4gICAgICAgIGNvbnN0IHhNaW4gPSBtYXgob3ZlcmZsb3cubGVmdCwgMCk7XG4gICAgICAgIGNvbnN0IHhNYXggPSBtYXgob3ZlcmZsb3cucmlnaHQsIDApO1xuICAgICAgICBjb25zdCB5TWluID0gbWF4KG92ZXJmbG93LnRvcCwgMCk7XG4gICAgICAgIGNvbnN0IHlNYXggPSBtYXgob3ZlcmZsb3cuYm90dG9tLCAwKTtcbiAgICAgICAgaWYgKGlzWUF4aXMpIHtcbiAgICAgICAgICBhdmFpbGFibGVXaWR0aCA9IHdpZHRoIC0gMiAqICh4TWluICE9PSAwIHx8IHhNYXggIT09IDAgPyB4TWluICsgeE1heCA6IG1heChvdmVyZmxvdy5sZWZ0LCBvdmVyZmxvdy5yaWdodCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF2YWlsYWJsZUhlaWdodCA9IGhlaWdodCAtIDIgKiAoeU1pbiAhPT0gMCB8fCB5TWF4ICE9PSAwID8geU1pbiArIHlNYXggOiBtYXgob3ZlcmZsb3cudG9wLCBvdmVyZmxvdy5ib3R0b20pKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYXdhaXQgYXBwbHkoe1xuICAgICAgICAuLi5zdGF0ZSxcbiAgICAgICAgYXZhaWxhYmxlV2lkdGgsXG4gICAgICAgIGF2YWlsYWJsZUhlaWdodFxuICAgICAgfSk7XG4gICAgICBjb25zdCBuZXh0RGltZW5zaW9ucyA9IGF3YWl0IHBsYXRmb3JtLmdldERpbWVuc2lvbnMoZWxlbWVudHMuZmxvYXRpbmcpO1xuICAgICAgaWYgKHdpZHRoICE9PSBuZXh0RGltZW5zaW9ucy53aWR0aCB8fCBoZWlnaHQgIT09IG5leHREaW1lbnNpb25zLmhlaWdodCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHJlc2V0OiB7XG4gICAgICAgICAgICByZWN0czogdHJ1ZVxuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG4gIH07XG59O1xuXG5leHBvcnQgeyBhcnJvdywgYXV0b1BsYWNlbWVudCwgY29tcHV0ZVBvc2l0aW9uLCBkZXRlY3RPdmVyZmxvdywgZmxpcCwgaGlkZSwgaW5saW5lLCBsaW1pdFNoaWZ0LCBvZmZzZXQsIHNoaWZ0LCBzaXplIH07XG4iLCAiZnVuY3Rpb24gZ2V0Tm9kZU5hbWUobm9kZSkge1xuICBpZiAoaXNOb2RlKG5vZGUpKSB7XG4gICAgcmV0dXJuIChub2RlLm5vZGVOYW1lIHx8ICcnKS50b0xvd2VyQ2FzZSgpO1xuICB9XG4gIC8vIE1vY2tlZCBub2RlcyBpbiB0ZXN0aW5nIGVudmlyb25tZW50cyBtYXkgbm90IGJlIGluc3RhbmNlcyBvZiBOb2RlLiBCeVxuICAvLyByZXR1cm5pbmcgYCNkb2N1bWVudGAgYW4gaW5maW5pdGUgbG9vcCB3b24ndCBvY2N1ci5cbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2Zsb2F0aW5nLXVpL2Zsb2F0aW5nLXVpL2lzc3Vlcy8yMzE3XG4gIHJldHVybiAnI2RvY3VtZW50Jztcbn1cbmZ1bmN0aW9uIGdldFdpbmRvdyhub2RlKSB7XG4gIHZhciBfbm9kZSRvd25lckRvY3VtZW50O1xuICByZXR1cm4gKG5vZGUgPT0gbnVsbCB8fCAoX25vZGUkb3duZXJEb2N1bWVudCA9IG5vZGUub3duZXJEb2N1bWVudCkgPT0gbnVsbCA/IHZvaWQgMCA6IF9ub2RlJG93bmVyRG9jdW1lbnQuZGVmYXVsdFZpZXcpIHx8IHdpbmRvdztcbn1cbmZ1bmN0aW9uIGdldERvY3VtZW50RWxlbWVudChub2RlKSB7XG4gIHZhciBfcmVmO1xuICByZXR1cm4gKF9yZWYgPSAoaXNOb2RlKG5vZGUpID8gbm9kZS5vd25lckRvY3VtZW50IDogbm9kZS5kb2N1bWVudCkgfHwgd2luZG93LmRvY3VtZW50KSA9PSBudWxsID8gdm9pZCAwIDogX3JlZi5kb2N1bWVudEVsZW1lbnQ7XG59XG5mdW5jdGlvbiBpc05vZGUodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgTm9kZSB8fCB2YWx1ZSBpbnN0YW5jZW9mIGdldFdpbmRvdyh2YWx1ZSkuTm9kZTtcbn1cbmZ1bmN0aW9uIGlzRWxlbWVudCh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBFbGVtZW50IHx8IHZhbHVlIGluc3RhbmNlb2YgZ2V0V2luZG93KHZhbHVlKS5FbGVtZW50O1xufVxuZnVuY3Rpb24gaXNIVE1MRWxlbWVudCh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCB8fCB2YWx1ZSBpbnN0YW5jZW9mIGdldFdpbmRvdyh2YWx1ZSkuSFRNTEVsZW1lbnQ7XG59XG5mdW5jdGlvbiBpc1NoYWRvd1Jvb3QodmFsdWUpIHtcbiAgLy8gQnJvd3NlcnMgd2l0aG91dCBgU2hhZG93Um9vdGAgc3VwcG9ydC5cbiAgaWYgKHR5cGVvZiBTaGFkb3dSb290ID09PSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBTaGFkb3dSb290IHx8IHZhbHVlIGluc3RhbmNlb2YgZ2V0V2luZG93KHZhbHVlKS5TaGFkb3dSb290O1xufVxuZnVuY3Rpb24gaXNPdmVyZmxvd0VsZW1lbnQoZWxlbWVudCkge1xuICBjb25zdCB7XG4gICAgb3ZlcmZsb3csXG4gICAgb3ZlcmZsb3dYLFxuICAgIG92ZXJmbG93WSxcbiAgICBkaXNwbGF5XG4gIH0gPSBnZXRDb21wdXRlZFN0eWxlKGVsZW1lbnQpO1xuICByZXR1cm4gL2F1dG98c2Nyb2xsfG92ZXJsYXl8aGlkZGVufGNsaXAvLnRlc3Qob3ZlcmZsb3cgKyBvdmVyZmxvd1kgKyBvdmVyZmxvd1gpICYmICFbJ2lubGluZScsICdjb250ZW50cyddLmluY2x1ZGVzKGRpc3BsYXkpO1xufVxuZnVuY3Rpb24gaXNUYWJsZUVsZW1lbnQoZWxlbWVudCkge1xuICByZXR1cm4gWyd0YWJsZScsICd0ZCcsICd0aCddLmluY2x1ZGVzKGdldE5vZGVOYW1lKGVsZW1lbnQpKTtcbn1cbmZ1bmN0aW9uIGlzQ29udGFpbmluZ0Jsb2NrKGVsZW1lbnQpIHtcbiAgY29uc3Qgd2Via2l0ID0gaXNXZWJLaXQoKTtcbiAgY29uc3QgY3NzID0gZ2V0Q29tcHV0ZWRTdHlsZShlbGVtZW50KTtcblxuICAvLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9DU1MvQ29udGFpbmluZ19ibG9jayNpZGVudGlmeWluZ190aGVfY29udGFpbmluZ19ibG9ja1xuICByZXR1cm4gY3NzLnRyYW5zZm9ybSAhPT0gJ25vbmUnIHx8IGNzcy5wZXJzcGVjdGl2ZSAhPT0gJ25vbmUnIHx8IChjc3MuY29udGFpbmVyVHlwZSA/IGNzcy5jb250YWluZXJUeXBlICE9PSAnbm9ybWFsJyA6IGZhbHNlKSB8fCAhd2Via2l0ICYmIChjc3MuYmFja2Ryb3BGaWx0ZXIgPyBjc3MuYmFja2Ryb3BGaWx0ZXIgIT09ICdub25lJyA6IGZhbHNlKSB8fCAhd2Via2l0ICYmIChjc3MuZmlsdGVyID8gY3NzLmZpbHRlciAhPT0gJ25vbmUnIDogZmFsc2UpIHx8IFsndHJhbnNmb3JtJywgJ3BlcnNwZWN0aXZlJywgJ2ZpbHRlciddLnNvbWUodmFsdWUgPT4gKGNzcy53aWxsQ2hhbmdlIHx8ICcnKS5pbmNsdWRlcyh2YWx1ZSkpIHx8IFsncGFpbnQnLCAnbGF5b3V0JywgJ3N0cmljdCcsICdjb250ZW50J10uc29tZSh2YWx1ZSA9PiAoY3NzLmNvbnRhaW4gfHwgJycpLmluY2x1ZGVzKHZhbHVlKSk7XG59XG5mdW5jdGlvbiBnZXRDb250YWluaW5nQmxvY2soZWxlbWVudCkge1xuICBsZXQgY3VycmVudE5vZGUgPSBnZXRQYXJlbnROb2RlKGVsZW1lbnQpO1xuICB3aGlsZSAoaXNIVE1MRWxlbWVudChjdXJyZW50Tm9kZSkgJiYgIWlzTGFzdFRyYXZlcnNhYmxlTm9kZShjdXJyZW50Tm9kZSkpIHtcbiAgICBpZiAoaXNDb250YWluaW5nQmxvY2soY3VycmVudE5vZGUpKSB7XG4gICAgICByZXR1cm4gY3VycmVudE5vZGU7XG4gICAgfVxuICAgIGN1cnJlbnROb2RlID0gZ2V0UGFyZW50Tm9kZShjdXJyZW50Tm9kZSk7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5mdW5jdGlvbiBpc1dlYktpdCgpIHtcbiAgaWYgKHR5cGVvZiBDU1MgPT09ICd1bmRlZmluZWQnIHx8ICFDU1Muc3VwcG9ydHMpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIENTUy5zdXBwb3J0cygnLXdlYmtpdC1iYWNrZHJvcC1maWx0ZXInLCAnbm9uZScpO1xufVxuZnVuY3Rpb24gaXNMYXN0VHJhdmVyc2FibGVOb2RlKG5vZGUpIHtcbiAgcmV0dXJuIFsnaHRtbCcsICdib2R5JywgJyNkb2N1bWVudCddLmluY2x1ZGVzKGdldE5vZGVOYW1lKG5vZGUpKTtcbn1cbmZ1bmN0aW9uIGdldENvbXB1dGVkU3R5bGUoZWxlbWVudCkge1xuICByZXR1cm4gZ2V0V2luZG93KGVsZW1lbnQpLmdldENvbXB1dGVkU3R5bGUoZWxlbWVudCk7XG59XG5mdW5jdGlvbiBnZXROb2RlU2Nyb2xsKGVsZW1lbnQpIHtcbiAgaWYgKGlzRWxlbWVudChlbGVtZW50KSkge1xuICAgIHJldHVybiB7XG4gICAgICBzY3JvbGxMZWZ0OiBlbGVtZW50LnNjcm9sbExlZnQsXG4gICAgICBzY3JvbGxUb3A6IGVsZW1lbnQuc2Nyb2xsVG9wXG4gICAgfTtcbiAgfVxuICByZXR1cm4ge1xuICAgIHNjcm9sbExlZnQ6IGVsZW1lbnQucGFnZVhPZmZzZXQsXG4gICAgc2Nyb2xsVG9wOiBlbGVtZW50LnBhZ2VZT2Zmc2V0XG4gIH07XG59XG5mdW5jdGlvbiBnZXRQYXJlbnROb2RlKG5vZGUpIHtcbiAgaWYgKGdldE5vZGVOYW1lKG5vZGUpID09PSAnaHRtbCcpIHtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuICBjb25zdCByZXN1bHQgPVxuICAvLyBTdGVwIGludG8gdGhlIHNoYWRvdyBET00gb2YgdGhlIHBhcmVudCBvZiBhIHNsb3R0ZWQgbm9kZS5cbiAgbm9kZS5hc3NpZ25lZFNsb3QgfHxcbiAgLy8gRE9NIEVsZW1lbnQgZGV0ZWN0ZWQuXG4gIG5vZGUucGFyZW50Tm9kZSB8fFxuICAvLyBTaGFkb3dSb290IGRldGVjdGVkLlxuICBpc1NoYWRvd1Jvb3Qobm9kZSkgJiYgbm9kZS5ob3N0IHx8XG4gIC8vIEZhbGxiYWNrLlxuICBnZXREb2N1bWVudEVsZW1lbnQobm9kZSk7XG4gIHJldHVybiBpc1NoYWRvd1Jvb3QocmVzdWx0KSA/IHJlc3VsdC5ob3N0IDogcmVzdWx0O1xufVxuZnVuY3Rpb24gZ2V0TmVhcmVzdE92ZXJmbG93QW5jZXN0b3Iobm9kZSkge1xuICBjb25zdCBwYXJlbnROb2RlID0gZ2V0UGFyZW50Tm9kZShub2RlKTtcbiAgaWYgKGlzTGFzdFRyYXZlcnNhYmxlTm9kZShwYXJlbnROb2RlKSkge1xuICAgIHJldHVybiBub2RlLm93bmVyRG9jdW1lbnQgPyBub2RlLm93bmVyRG9jdW1lbnQuYm9keSA6IG5vZGUuYm9keTtcbiAgfVxuICBpZiAoaXNIVE1MRWxlbWVudChwYXJlbnROb2RlKSAmJiBpc092ZXJmbG93RWxlbWVudChwYXJlbnROb2RlKSkge1xuICAgIHJldHVybiBwYXJlbnROb2RlO1xuICB9XG4gIHJldHVybiBnZXROZWFyZXN0T3ZlcmZsb3dBbmNlc3RvcihwYXJlbnROb2RlKTtcbn1cbmZ1bmN0aW9uIGdldE92ZXJmbG93QW5jZXN0b3JzKG5vZGUsIGxpc3QsIHRyYXZlcnNlSWZyYW1lcykge1xuICB2YXIgX25vZGUkb3duZXJEb2N1bWVudDI7XG4gIGlmIChsaXN0ID09PSB2b2lkIDApIHtcbiAgICBsaXN0ID0gW107XG4gIH1cbiAgaWYgKHRyYXZlcnNlSWZyYW1lcyA9PT0gdm9pZCAwKSB7XG4gICAgdHJhdmVyc2VJZnJhbWVzID0gdHJ1ZTtcbiAgfVxuICBjb25zdCBzY3JvbGxhYmxlQW5jZXN0b3IgPSBnZXROZWFyZXN0T3ZlcmZsb3dBbmNlc3Rvcihub2RlKTtcbiAgY29uc3QgaXNCb2R5ID0gc2Nyb2xsYWJsZUFuY2VzdG9yID09PSAoKF9ub2RlJG93bmVyRG9jdW1lbnQyID0gbm9kZS5vd25lckRvY3VtZW50KSA9PSBudWxsID8gdm9pZCAwIDogX25vZGUkb3duZXJEb2N1bWVudDIuYm9keSk7XG4gIGNvbnN0IHdpbiA9IGdldFdpbmRvdyhzY3JvbGxhYmxlQW5jZXN0b3IpO1xuICBpZiAoaXNCb2R5KSB7XG4gICAgcmV0dXJuIGxpc3QuY29uY2F0KHdpbiwgd2luLnZpc3VhbFZpZXdwb3J0IHx8IFtdLCBpc092ZXJmbG93RWxlbWVudChzY3JvbGxhYmxlQW5jZXN0b3IpID8gc2Nyb2xsYWJsZUFuY2VzdG9yIDogW10sIHdpbi5mcmFtZUVsZW1lbnQgJiYgdHJhdmVyc2VJZnJhbWVzID8gZ2V0T3ZlcmZsb3dBbmNlc3RvcnMod2luLmZyYW1lRWxlbWVudCkgOiBbXSk7XG4gIH1cbiAgcmV0dXJuIGxpc3QuY29uY2F0KHNjcm9sbGFibGVBbmNlc3RvciwgZ2V0T3ZlcmZsb3dBbmNlc3RvcnMoc2Nyb2xsYWJsZUFuY2VzdG9yLCBbXSwgdHJhdmVyc2VJZnJhbWVzKSk7XG59XG5cbmV4cG9ydCB7IGdldENvbXB1dGVkU3R5bGUsIGdldENvbnRhaW5pbmdCbG9jaywgZ2V0RG9jdW1lbnRFbGVtZW50LCBnZXROZWFyZXN0T3ZlcmZsb3dBbmNlc3RvciwgZ2V0Tm9kZU5hbWUsIGdldE5vZGVTY3JvbGwsIGdldE92ZXJmbG93QW5jZXN0b3JzLCBnZXRQYXJlbnROb2RlLCBnZXRXaW5kb3csIGlzQ29udGFpbmluZ0Jsb2NrLCBpc0VsZW1lbnQsIGlzSFRNTEVsZW1lbnQsIGlzTGFzdFRyYXZlcnNhYmxlTm9kZSwgaXNOb2RlLCBpc092ZXJmbG93RWxlbWVudCwgaXNTaGFkb3dSb290LCBpc1RhYmxlRWxlbWVudCwgaXNXZWJLaXQgfTtcbiIsICJpbXBvcnQgeyByZWN0VG9DbGllbnRSZWN0LCBkZXRlY3RPdmVyZmxvdyBhcyBkZXRlY3RPdmVyZmxvdyQxLCBvZmZzZXQgYXMgb2Zmc2V0JDEsIGF1dG9QbGFjZW1lbnQgYXMgYXV0b1BsYWNlbWVudCQxLCBzaGlmdCBhcyBzaGlmdCQxLCBmbGlwIGFzIGZsaXAkMSwgc2l6ZSBhcyBzaXplJDEsIGhpZGUgYXMgaGlkZSQxLCBhcnJvdyBhcyBhcnJvdyQxLCBpbmxpbmUgYXMgaW5saW5lJDEsIGxpbWl0U2hpZnQgYXMgbGltaXRTaGlmdCQxLCBjb21wdXRlUG9zaXRpb24gYXMgY29tcHV0ZVBvc2l0aW9uJDEgfSBmcm9tICdAZmxvYXRpbmctdWkvY29yZSc7XG5pbXBvcnQgeyByb3VuZCwgY3JlYXRlQ29vcmRzLCBtYXgsIG1pbiwgZmxvb3IgfSBmcm9tICdAZmxvYXRpbmctdWkvdXRpbHMnO1xuaW1wb3J0IHsgZ2V0Q29tcHV0ZWRTdHlsZSwgaXNIVE1MRWxlbWVudCwgaXNFbGVtZW50LCBnZXRXaW5kb3csIGlzV2ViS2l0LCBnZXREb2N1bWVudEVsZW1lbnQsIGdldE5vZGVOYW1lLCBpc092ZXJmbG93RWxlbWVudCwgZ2V0Tm9kZVNjcm9sbCwgZ2V0T3ZlcmZsb3dBbmNlc3RvcnMsIGdldFBhcmVudE5vZGUsIGlzTGFzdFRyYXZlcnNhYmxlTm9kZSwgaXNDb250YWluaW5nQmxvY2ssIGlzVGFibGVFbGVtZW50LCBnZXRDb250YWluaW5nQmxvY2sgfSBmcm9tICdAZmxvYXRpbmctdWkvdXRpbHMvZG9tJztcbmV4cG9ydCB7IGdldE92ZXJmbG93QW5jZXN0b3JzIH0gZnJvbSAnQGZsb2F0aW5nLXVpL3V0aWxzL2RvbSc7XG5cbmZ1bmN0aW9uIGdldENzc0RpbWVuc2lvbnMoZWxlbWVudCkge1xuICBjb25zdCBjc3MgPSBnZXRDb21wdXRlZFN0eWxlKGVsZW1lbnQpO1xuICAvLyBJbiB0ZXN0aW5nIGVudmlyb25tZW50cywgdGhlIGB3aWR0aGAgYW5kIGBoZWlnaHRgIHByb3BlcnRpZXMgYXJlIGVtcHR5XG4gIC8vIHN0cmluZ3MgZm9yIFNWRyBlbGVtZW50cywgcmV0dXJuaW5nIE5hTi4gRmFsbGJhY2sgdG8gYDBgIGluIHRoaXMgY2FzZS5cbiAgbGV0IHdpZHRoID0gcGFyc2VGbG9hdChjc3Mud2lkdGgpIHx8IDA7XG4gIGxldCBoZWlnaHQgPSBwYXJzZUZsb2F0KGNzcy5oZWlnaHQpIHx8IDA7XG4gIGNvbnN0IGhhc09mZnNldCA9IGlzSFRNTEVsZW1lbnQoZWxlbWVudCk7XG4gIGNvbnN0IG9mZnNldFdpZHRoID0gaGFzT2Zmc2V0ID8gZWxlbWVudC5vZmZzZXRXaWR0aCA6IHdpZHRoO1xuICBjb25zdCBvZmZzZXRIZWlnaHQgPSBoYXNPZmZzZXQgPyBlbGVtZW50Lm9mZnNldEhlaWdodCA6IGhlaWdodDtcbiAgY29uc3Qgc2hvdWxkRmFsbGJhY2sgPSByb3VuZCh3aWR0aCkgIT09IG9mZnNldFdpZHRoIHx8IHJvdW5kKGhlaWdodCkgIT09IG9mZnNldEhlaWdodDtcbiAgaWYgKHNob3VsZEZhbGxiYWNrKSB7XG4gICAgd2lkdGggPSBvZmZzZXRXaWR0aDtcbiAgICBoZWlnaHQgPSBvZmZzZXRIZWlnaHQ7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICB3aWR0aCxcbiAgICBoZWlnaHQsXG4gICAgJDogc2hvdWxkRmFsbGJhY2tcbiAgfTtcbn1cblxuZnVuY3Rpb24gdW53cmFwRWxlbWVudChlbGVtZW50KSB7XG4gIHJldHVybiAhaXNFbGVtZW50KGVsZW1lbnQpID8gZWxlbWVudC5jb250ZXh0RWxlbWVudCA6IGVsZW1lbnQ7XG59XG5cbmZ1bmN0aW9uIGdldFNjYWxlKGVsZW1lbnQpIHtcbiAgY29uc3QgZG9tRWxlbWVudCA9IHVud3JhcEVsZW1lbnQoZWxlbWVudCk7XG4gIGlmICghaXNIVE1MRWxlbWVudChkb21FbGVtZW50KSkge1xuICAgIHJldHVybiBjcmVhdGVDb29yZHMoMSk7XG4gIH1cbiAgY29uc3QgcmVjdCA9IGRvbUVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gIGNvbnN0IHtcbiAgICB3aWR0aCxcbiAgICBoZWlnaHQsXG4gICAgJFxuICB9ID0gZ2V0Q3NzRGltZW5zaW9ucyhkb21FbGVtZW50KTtcbiAgbGV0IHggPSAoJCA/IHJvdW5kKHJlY3Qud2lkdGgpIDogcmVjdC53aWR0aCkgLyB3aWR0aDtcbiAgbGV0IHkgPSAoJCA/IHJvdW5kKHJlY3QuaGVpZ2h0KSA6IHJlY3QuaGVpZ2h0KSAvIGhlaWdodDtcblxuICAvLyAwLCBOYU4sIG9yIEluZmluaXR5IHNob3VsZCBhbHdheXMgZmFsbGJhY2sgdG8gMS5cblxuICBpZiAoIXggfHwgIU51bWJlci5pc0Zpbml0ZSh4KSkge1xuICAgIHggPSAxO1xuICB9XG4gIGlmICgheSB8fCAhTnVtYmVyLmlzRmluaXRlKHkpKSB7XG4gICAgeSA9IDE7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICB4LFxuICAgIHlcbiAgfTtcbn1cblxuY29uc3Qgbm9PZmZzZXRzID0gLyojX19QVVJFX18qL2NyZWF0ZUNvb3JkcygwKTtcbmZ1bmN0aW9uIGdldFZpc3VhbE9mZnNldHMoZWxlbWVudCkge1xuICBjb25zdCB3aW4gPSBnZXRXaW5kb3coZWxlbWVudCk7XG4gIGlmICghaXNXZWJLaXQoKSB8fCAhd2luLnZpc3VhbFZpZXdwb3J0KSB7XG4gICAgcmV0dXJuIG5vT2Zmc2V0cztcbiAgfVxuICByZXR1cm4ge1xuICAgIHg6IHdpbi52aXN1YWxWaWV3cG9ydC5vZmZzZXRMZWZ0LFxuICAgIHk6IHdpbi52aXN1YWxWaWV3cG9ydC5vZmZzZXRUb3BcbiAgfTtcbn1cbmZ1bmN0aW9uIHNob3VsZEFkZFZpc3VhbE9mZnNldHMoZWxlbWVudCwgaXNGaXhlZCwgZmxvYXRpbmdPZmZzZXRQYXJlbnQpIHtcbiAgaWYgKGlzRml4ZWQgPT09IHZvaWQgMCkge1xuICAgIGlzRml4ZWQgPSBmYWxzZTtcbiAgfVxuICBpZiAoIWZsb2F0aW5nT2Zmc2V0UGFyZW50IHx8IGlzRml4ZWQgJiYgZmxvYXRpbmdPZmZzZXRQYXJlbnQgIT09IGdldFdpbmRvdyhlbGVtZW50KSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gaXNGaXhlZDtcbn1cblxuZnVuY3Rpb24gZ2V0Qm91bmRpbmdDbGllbnRSZWN0KGVsZW1lbnQsIGluY2x1ZGVTY2FsZSwgaXNGaXhlZFN0cmF0ZWd5LCBvZmZzZXRQYXJlbnQpIHtcbiAgaWYgKGluY2x1ZGVTY2FsZSA9PT0gdm9pZCAwKSB7XG4gICAgaW5jbHVkZVNjYWxlID0gZmFsc2U7XG4gIH1cbiAgaWYgKGlzRml4ZWRTdHJhdGVneSA9PT0gdm9pZCAwKSB7XG4gICAgaXNGaXhlZFN0cmF0ZWd5ID0gZmFsc2U7XG4gIH1cbiAgY29uc3QgY2xpZW50UmVjdCA9IGVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gIGNvbnN0IGRvbUVsZW1lbnQgPSB1bndyYXBFbGVtZW50KGVsZW1lbnQpO1xuICBsZXQgc2NhbGUgPSBjcmVhdGVDb29yZHMoMSk7XG4gIGlmIChpbmNsdWRlU2NhbGUpIHtcbiAgICBpZiAob2Zmc2V0UGFyZW50KSB7XG4gICAgICBpZiAoaXNFbGVtZW50KG9mZnNldFBhcmVudCkpIHtcbiAgICAgICAgc2NhbGUgPSBnZXRTY2FsZShvZmZzZXRQYXJlbnQpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzY2FsZSA9IGdldFNjYWxlKGVsZW1lbnQpO1xuICAgIH1cbiAgfVxuICBjb25zdCB2aXN1YWxPZmZzZXRzID0gc2hvdWxkQWRkVmlzdWFsT2Zmc2V0cyhkb21FbGVtZW50LCBpc0ZpeGVkU3RyYXRlZ3ksIG9mZnNldFBhcmVudCkgPyBnZXRWaXN1YWxPZmZzZXRzKGRvbUVsZW1lbnQpIDogY3JlYXRlQ29vcmRzKDApO1xuICBsZXQgeCA9IChjbGllbnRSZWN0LmxlZnQgKyB2aXN1YWxPZmZzZXRzLngpIC8gc2NhbGUueDtcbiAgbGV0IHkgPSAoY2xpZW50UmVjdC50b3AgKyB2aXN1YWxPZmZzZXRzLnkpIC8gc2NhbGUueTtcbiAgbGV0IHdpZHRoID0gY2xpZW50UmVjdC53aWR0aCAvIHNjYWxlLng7XG4gIGxldCBoZWlnaHQgPSBjbGllbnRSZWN0LmhlaWdodCAvIHNjYWxlLnk7XG4gIGlmIChkb21FbGVtZW50KSB7XG4gICAgY29uc3Qgd2luID0gZ2V0V2luZG93KGRvbUVsZW1lbnQpO1xuICAgIGNvbnN0IG9mZnNldFdpbiA9IG9mZnNldFBhcmVudCAmJiBpc0VsZW1lbnQob2Zmc2V0UGFyZW50KSA/IGdldFdpbmRvdyhvZmZzZXRQYXJlbnQpIDogb2Zmc2V0UGFyZW50O1xuICAgIGxldCBjdXJyZW50V2luID0gd2luO1xuICAgIGxldCBjdXJyZW50SUZyYW1lID0gY3VycmVudFdpbi5mcmFtZUVsZW1lbnQ7XG4gICAgd2hpbGUgKGN1cnJlbnRJRnJhbWUgJiYgb2Zmc2V0UGFyZW50ICYmIG9mZnNldFdpbiAhPT0gY3VycmVudFdpbikge1xuICAgICAgY29uc3QgaWZyYW1lU2NhbGUgPSBnZXRTY2FsZShjdXJyZW50SUZyYW1lKTtcbiAgICAgIGNvbnN0IGlmcmFtZVJlY3QgPSBjdXJyZW50SUZyYW1lLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgY29uc3QgY3NzID0gZ2V0Q29tcHV0ZWRTdHlsZShjdXJyZW50SUZyYW1lKTtcbiAgICAgIGNvbnN0IGxlZnQgPSBpZnJhbWVSZWN0LmxlZnQgKyAoY3VycmVudElGcmFtZS5jbGllbnRMZWZ0ICsgcGFyc2VGbG9hdChjc3MucGFkZGluZ0xlZnQpKSAqIGlmcmFtZVNjYWxlLng7XG4gICAgICBjb25zdCB0b3AgPSBpZnJhbWVSZWN0LnRvcCArIChjdXJyZW50SUZyYW1lLmNsaWVudFRvcCArIHBhcnNlRmxvYXQoY3NzLnBhZGRpbmdUb3ApKSAqIGlmcmFtZVNjYWxlLnk7XG4gICAgICB4ICo9IGlmcmFtZVNjYWxlLng7XG4gICAgICB5ICo9IGlmcmFtZVNjYWxlLnk7XG4gICAgICB3aWR0aCAqPSBpZnJhbWVTY2FsZS54O1xuICAgICAgaGVpZ2h0ICo9IGlmcmFtZVNjYWxlLnk7XG4gICAgICB4ICs9IGxlZnQ7XG4gICAgICB5ICs9IHRvcDtcbiAgICAgIGN1cnJlbnRXaW4gPSBnZXRXaW5kb3coY3VycmVudElGcmFtZSk7XG4gICAgICBjdXJyZW50SUZyYW1lID0gY3VycmVudFdpbi5mcmFtZUVsZW1lbnQ7XG4gICAgfVxuICB9XG4gIHJldHVybiByZWN0VG9DbGllbnRSZWN0KHtcbiAgICB3aWR0aCxcbiAgICBoZWlnaHQsXG4gICAgeCxcbiAgICB5XG4gIH0pO1xufVxuXG5jb25zdCB0b3BMYXllclNlbGVjdG9ycyA9IFsnOnBvcG92ZXItb3BlbicsICc6bW9kYWwnXTtcbmZ1bmN0aW9uIGlzVG9wTGF5ZXIoZWxlbWVudCkge1xuICByZXR1cm4gdG9wTGF5ZXJTZWxlY3RvcnMuc29tZShzZWxlY3RvciA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBlbGVtZW50Lm1hdGNoZXMoc2VsZWN0b3IpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBjb252ZXJ0T2Zmc2V0UGFyZW50UmVsYXRpdmVSZWN0VG9WaWV3cG9ydFJlbGF0aXZlUmVjdChfcmVmKSB7XG4gIGxldCB7XG4gICAgZWxlbWVudHMsXG4gICAgcmVjdCxcbiAgICBvZmZzZXRQYXJlbnQsXG4gICAgc3RyYXRlZ3lcbiAgfSA9IF9yZWY7XG4gIGNvbnN0IGlzRml4ZWQgPSBzdHJhdGVneSA9PT0gJ2ZpeGVkJztcbiAgY29uc3QgZG9jdW1lbnRFbGVtZW50ID0gZ2V0RG9jdW1lbnRFbGVtZW50KG9mZnNldFBhcmVudCk7XG4gIGNvbnN0IHRvcExheWVyID0gZWxlbWVudHMgPyBpc1RvcExheWVyKGVsZW1lbnRzLmZsb2F0aW5nKSA6IGZhbHNlO1xuICBpZiAob2Zmc2V0UGFyZW50ID09PSBkb2N1bWVudEVsZW1lbnQgfHwgdG9wTGF5ZXIgJiYgaXNGaXhlZCkge1xuICAgIHJldHVybiByZWN0O1xuICB9XG4gIGxldCBzY3JvbGwgPSB7XG4gICAgc2Nyb2xsTGVmdDogMCxcbiAgICBzY3JvbGxUb3A6IDBcbiAgfTtcbiAgbGV0IHNjYWxlID0gY3JlYXRlQ29vcmRzKDEpO1xuICBjb25zdCBvZmZzZXRzID0gY3JlYXRlQ29vcmRzKDApO1xuICBjb25zdCBpc09mZnNldFBhcmVudEFuRWxlbWVudCA9IGlzSFRNTEVsZW1lbnQob2Zmc2V0UGFyZW50KTtcbiAgaWYgKGlzT2Zmc2V0UGFyZW50QW5FbGVtZW50IHx8ICFpc09mZnNldFBhcmVudEFuRWxlbWVudCAmJiAhaXNGaXhlZCkge1xuICAgIGlmIChnZXROb2RlTmFtZShvZmZzZXRQYXJlbnQpICE9PSAnYm9keScgfHwgaXNPdmVyZmxvd0VsZW1lbnQoZG9jdW1lbnRFbGVtZW50KSkge1xuICAgICAgc2Nyb2xsID0gZ2V0Tm9kZVNjcm9sbChvZmZzZXRQYXJlbnQpO1xuICAgIH1cbiAgICBpZiAoaXNIVE1MRWxlbWVudChvZmZzZXRQYXJlbnQpKSB7XG4gICAgICBjb25zdCBvZmZzZXRSZWN0ID0gZ2V0Qm91bmRpbmdDbGllbnRSZWN0KG9mZnNldFBhcmVudCk7XG4gICAgICBzY2FsZSA9IGdldFNjYWxlKG9mZnNldFBhcmVudCk7XG4gICAgICBvZmZzZXRzLnggPSBvZmZzZXRSZWN0LnggKyBvZmZzZXRQYXJlbnQuY2xpZW50TGVmdDtcbiAgICAgIG9mZnNldHMueSA9IG9mZnNldFJlY3QueSArIG9mZnNldFBhcmVudC5jbGllbnRUb3A7XG4gICAgfVxuICB9XG4gIHJldHVybiB7XG4gICAgd2lkdGg6IHJlY3Qud2lkdGggKiBzY2FsZS54LFxuICAgIGhlaWdodDogcmVjdC5oZWlnaHQgKiBzY2FsZS55LFxuICAgIHg6IHJlY3QueCAqIHNjYWxlLnggLSBzY3JvbGwuc2Nyb2xsTGVmdCAqIHNjYWxlLnggKyBvZmZzZXRzLngsXG4gICAgeTogcmVjdC55ICogc2NhbGUueSAtIHNjcm9sbC5zY3JvbGxUb3AgKiBzY2FsZS55ICsgb2Zmc2V0cy55XG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldENsaWVudFJlY3RzKGVsZW1lbnQpIHtcbiAgcmV0dXJuIEFycmF5LmZyb20oZWxlbWVudC5nZXRDbGllbnRSZWN0cygpKTtcbn1cblxuZnVuY3Rpb24gZ2V0V2luZG93U2Nyb2xsQmFyWChlbGVtZW50KSB7XG4gIC8vIElmIDxodG1sPiBoYXMgYSBDU1Mgd2lkdGggZ3JlYXRlciB0aGFuIHRoZSB2aWV3cG9ydCwgdGhlbiB0aGlzIHdpbGwgYmVcbiAgLy8gaW5jb3JyZWN0IGZvciBSVEwuXG4gIHJldHVybiBnZXRCb3VuZGluZ0NsaWVudFJlY3QoZ2V0RG9jdW1lbnRFbGVtZW50KGVsZW1lbnQpKS5sZWZ0ICsgZ2V0Tm9kZVNjcm9sbChlbGVtZW50KS5zY3JvbGxMZWZ0O1xufVxuXG4vLyBHZXRzIHRoZSBlbnRpcmUgc2l6ZSBvZiB0aGUgc2Nyb2xsYWJsZSBkb2N1bWVudCBhcmVhLCBldmVuIGV4dGVuZGluZyBvdXRzaWRlXG4vLyBvZiB0aGUgYDxodG1sPmAgYW5kIGA8Ym9keT5gIHJlY3QgYm91bmRzIGlmIGhvcml6b250YWxseSBzY3JvbGxhYmxlLlxuZnVuY3Rpb24gZ2V0RG9jdW1lbnRSZWN0KGVsZW1lbnQpIHtcbiAgY29uc3QgaHRtbCA9IGdldERvY3VtZW50RWxlbWVudChlbGVtZW50KTtcbiAgY29uc3Qgc2Nyb2xsID0gZ2V0Tm9kZVNjcm9sbChlbGVtZW50KTtcbiAgY29uc3QgYm9keSA9IGVsZW1lbnQub3duZXJEb2N1bWVudC5ib2R5O1xuICBjb25zdCB3aWR0aCA9IG1heChodG1sLnNjcm9sbFdpZHRoLCBodG1sLmNsaWVudFdpZHRoLCBib2R5LnNjcm9sbFdpZHRoLCBib2R5LmNsaWVudFdpZHRoKTtcbiAgY29uc3QgaGVpZ2h0ID0gbWF4KGh0bWwuc2Nyb2xsSGVpZ2h0LCBodG1sLmNsaWVudEhlaWdodCwgYm9keS5zY3JvbGxIZWlnaHQsIGJvZHkuY2xpZW50SGVpZ2h0KTtcbiAgbGV0IHggPSAtc2Nyb2xsLnNjcm9sbExlZnQgKyBnZXRXaW5kb3dTY3JvbGxCYXJYKGVsZW1lbnQpO1xuICBjb25zdCB5ID0gLXNjcm9sbC5zY3JvbGxUb3A7XG4gIGlmIChnZXRDb21wdXRlZFN0eWxlKGJvZHkpLmRpcmVjdGlvbiA9PT0gJ3J0bCcpIHtcbiAgICB4ICs9IG1heChodG1sLmNsaWVudFdpZHRoLCBib2R5LmNsaWVudFdpZHRoKSAtIHdpZHRoO1xuICB9XG4gIHJldHVybiB7XG4gICAgd2lkdGgsXG4gICAgaGVpZ2h0LFxuICAgIHgsXG4gICAgeVxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRWaWV3cG9ydFJlY3QoZWxlbWVudCwgc3RyYXRlZ3kpIHtcbiAgY29uc3Qgd2luID0gZ2V0V2luZG93KGVsZW1lbnQpO1xuICBjb25zdCBodG1sID0gZ2V0RG9jdW1lbnRFbGVtZW50KGVsZW1lbnQpO1xuICBjb25zdCB2aXN1YWxWaWV3cG9ydCA9IHdpbi52aXN1YWxWaWV3cG9ydDtcbiAgbGV0IHdpZHRoID0gaHRtbC5jbGllbnRXaWR0aDtcbiAgbGV0IGhlaWdodCA9IGh0bWwuY2xpZW50SGVpZ2h0O1xuICBsZXQgeCA9IDA7XG4gIGxldCB5ID0gMDtcbiAgaWYgKHZpc3VhbFZpZXdwb3J0KSB7XG4gICAgd2lkdGggPSB2aXN1YWxWaWV3cG9ydC53aWR0aDtcbiAgICBoZWlnaHQgPSB2aXN1YWxWaWV3cG9ydC5oZWlnaHQ7XG4gICAgY29uc3QgdmlzdWFsVmlld3BvcnRCYXNlZCA9IGlzV2ViS2l0KCk7XG4gICAgaWYgKCF2aXN1YWxWaWV3cG9ydEJhc2VkIHx8IHZpc3VhbFZpZXdwb3J0QmFzZWQgJiYgc3RyYXRlZ3kgPT09ICdmaXhlZCcpIHtcbiAgICAgIHggPSB2aXN1YWxWaWV3cG9ydC5vZmZzZXRMZWZ0O1xuICAgICAgeSA9IHZpc3VhbFZpZXdwb3J0Lm9mZnNldFRvcDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHtcbiAgICB3aWR0aCxcbiAgICBoZWlnaHQsXG4gICAgeCxcbiAgICB5XG4gIH07XG59XG5cbi8vIFJldHVybnMgdGhlIGlubmVyIGNsaWVudCByZWN0LCBzdWJ0cmFjdGluZyBzY3JvbGxiYXJzIGlmIHByZXNlbnQuXG5mdW5jdGlvbiBnZXRJbm5lckJvdW5kaW5nQ2xpZW50UmVjdChlbGVtZW50LCBzdHJhdGVneSkge1xuICBjb25zdCBjbGllbnRSZWN0ID0gZ2V0Qm91bmRpbmdDbGllbnRSZWN0KGVsZW1lbnQsIHRydWUsIHN0cmF0ZWd5ID09PSAnZml4ZWQnKTtcbiAgY29uc3QgdG9wID0gY2xpZW50UmVjdC50b3AgKyBlbGVtZW50LmNsaWVudFRvcDtcbiAgY29uc3QgbGVmdCA9IGNsaWVudFJlY3QubGVmdCArIGVsZW1lbnQuY2xpZW50TGVmdDtcbiAgY29uc3Qgc2NhbGUgPSBpc0hUTUxFbGVtZW50KGVsZW1lbnQpID8gZ2V0U2NhbGUoZWxlbWVudCkgOiBjcmVhdGVDb29yZHMoMSk7XG4gIGNvbnN0IHdpZHRoID0gZWxlbWVudC5jbGllbnRXaWR0aCAqIHNjYWxlLng7XG4gIGNvbnN0IGhlaWdodCA9IGVsZW1lbnQuY2xpZW50SGVpZ2h0ICogc2NhbGUueTtcbiAgY29uc3QgeCA9IGxlZnQgKiBzY2FsZS54O1xuICBjb25zdCB5ID0gdG9wICogc2NhbGUueTtcbiAgcmV0dXJuIHtcbiAgICB3aWR0aCxcbiAgICBoZWlnaHQsXG4gICAgeCxcbiAgICB5XG4gIH07XG59XG5mdW5jdGlvbiBnZXRDbGllbnRSZWN0RnJvbUNsaXBwaW5nQW5jZXN0b3IoZWxlbWVudCwgY2xpcHBpbmdBbmNlc3Rvciwgc3RyYXRlZ3kpIHtcbiAgbGV0IHJlY3Q7XG4gIGlmIChjbGlwcGluZ0FuY2VzdG9yID09PSAndmlld3BvcnQnKSB7XG4gICAgcmVjdCA9IGdldFZpZXdwb3J0UmVjdChlbGVtZW50LCBzdHJhdGVneSk7XG4gIH0gZWxzZSBpZiAoY2xpcHBpbmdBbmNlc3RvciA9PT0gJ2RvY3VtZW50Jykge1xuICAgIHJlY3QgPSBnZXREb2N1bWVudFJlY3QoZ2V0RG9jdW1lbnRFbGVtZW50KGVsZW1lbnQpKTtcbiAgfSBlbHNlIGlmIChpc0VsZW1lbnQoY2xpcHBpbmdBbmNlc3RvcikpIHtcbiAgICByZWN0ID0gZ2V0SW5uZXJCb3VuZGluZ0NsaWVudFJlY3QoY2xpcHBpbmdBbmNlc3Rvciwgc3RyYXRlZ3kpO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IHZpc3VhbE9mZnNldHMgPSBnZXRWaXN1YWxPZmZzZXRzKGVsZW1lbnQpO1xuICAgIHJlY3QgPSB7XG4gICAgICAuLi5jbGlwcGluZ0FuY2VzdG9yLFxuICAgICAgeDogY2xpcHBpbmdBbmNlc3Rvci54IC0gdmlzdWFsT2Zmc2V0cy54LFxuICAgICAgeTogY2xpcHBpbmdBbmNlc3Rvci55IC0gdmlzdWFsT2Zmc2V0cy55XG4gICAgfTtcbiAgfVxuICByZXR1cm4gcmVjdFRvQ2xpZW50UmVjdChyZWN0KTtcbn1cbmZ1bmN0aW9uIGhhc0ZpeGVkUG9zaXRpb25BbmNlc3RvcihlbGVtZW50LCBzdG9wTm9kZSkge1xuICBjb25zdCBwYXJlbnROb2RlID0gZ2V0UGFyZW50Tm9kZShlbGVtZW50KTtcbiAgaWYgKHBhcmVudE5vZGUgPT09IHN0b3BOb2RlIHx8ICFpc0VsZW1lbnQocGFyZW50Tm9kZSkgfHwgaXNMYXN0VHJhdmVyc2FibGVOb2RlKHBhcmVudE5vZGUpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiBnZXRDb21wdXRlZFN0eWxlKHBhcmVudE5vZGUpLnBvc2l0aW9uID09PSAnZml4ZWQnIHx8IGhhc0ZpeGVkUG9zaXRpb25BbmNlc3RvcihwYXJlbnROb2RlLCBzdG9wTm9kZSk7XG59XG5cbi8vIEEgXCJjbGlwcGluZyBhbmNlc3RvclwiIGlzIGFuIGBvdmVyZmxvd2AgZWxlbWVudCB3aXRoIHRoZSBjaGFyYWN0ZXJpc3RpYyBvZlxuLy8gY2xpcHBpbmcgKG9yIGhpZGluZykgY2hpbGQgZWxlbWVudHMuIFRoaXMgcmV0dXJucyBhbGwgY2xpcHBpbmcgYW5jZXN0b3JzXG4vLyBvZiB0aGUgZ2l2ZW4gZWxlbWVudCB1cCB0aGUgdHJlZS5cbmZ1bmN0aW9uIGdldENsaXBwaW5nRWxlbWVudEFuY2VzdG9ycyhlbGVtZW50LCBjYWNoZSkge1xuICBjb25zdCBjYWNoZWRSZXN1bHQgPSBjYWNoZS5nZXQoZWxlbWVudCk7XG4gIGlmIChjYWNoZWRSZXN1bHQpIHtcbiAgICByZXR1cm4gY2FjaGVkUmVzdWx0O1xuICB9XG4gIGxldCByZXN1bHQgPSBnZXRPdmVyZmxvd0FuY2VzdG9ycyhlbGVtZW50LCBbXSwgZmFsc2UpLmZpbHRlcihlbCA9PiBpc0VsZW1lbnQoZWwpICYmIGdldE5vZGVOYW1lKGVsKSAhPT0gJ2JvZHknKTtcbiAgbGV0IGN1cnJlbnRDb250YWluaW5nQmxvY2tDb21wdXRlZFN0eWxlID0gbnVsbDtcbiAgY29uc3QgZWxlbWVudElzRml4ZWQgPSBnZXRDb21wdXRlZFN0eWxlKGVsZW1lbnQpLnBvc2l0aW9uID09PSAnZml4ZWQnO1xuICBsZXQgY3VycmVudE5vZGUgPSBlbGVtZW50SXNGaXhlZCA/IGdldFBhcmVudE5vZGUoZWxlbWVudCkgOiBlbGVtZW50O1xuXG4gIC8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0NTUy9Db250YWluaW5nX2Jsb2NrI2lkZW50aWZ5aW5nX3RoZV9jb250YWluaW5nX2Jsb2NrXG4gIHdoaWxlIChpc0VsZW1lbnQoY3VycmVudE5vZGUpICYmICFpc0xhc3RUcmF2ZXJzYWJsZU5vZGUoY3VycmVudE5vZGUpKSB7XG4gICAgY29uc3QgY29tcHV0ZWRTdHlsZSA9IGdldENvbXB1dGVkU3R5bGUoY3VycmVudE5vZGUpO1xuICAgIGNvbnN0IGN1cnJlbnROb2RlSXNDb250YWluaW5nID0gaXNDb250YWluaW5nQmxvY2soY3VycmVudE5vZGUpO1xuICAgIGlmICghY3VycmVudE5vZGVJc0NvbnRhaW5pbmcgJiYgY29tcHV0ZWRTdHlsZS5wb3NpdGlvbiA9PT0gJ2ZpeGVkJykge1xuICAgICAgY3VycmVudENvbnRhaW5pbmdCbG9ja0NvbXB1dGVkU3R5bGUgPSBudWxsO1xuICAgIH1cbiAgICBjb25zdCBzaG91bGREcm9wQ3VycmVudE5vZGUgPSBlbGVtZW50SXNGaXhlZCA/ICFjdXJyZW50Tm9kZUlzQ29udGFpbmluZyAmJiAhY3VycmVudENvbnRhaW5pbmdCbG9ja0NvbXB1dGVkU3R5bGUgOiAhY3VycmVudE5vZGVJc0NvbnRhaW5pbmcgJiYgY29tcHV0ZWRTdHlsZS5wb3NpdGlvbiA9PT0gJ3N0YXRpYycgJiYgISFjdXJyZW50Q29udGFpbmluZ0Jsb2NrQ29tcHV0ZWRTdHlsZSAmJiBbJ2Fic29sdXRlJywgJ2ZpeGVkJ10uaW5jbHVkZXMoY3VycmVudENvbnRhaW5pbmdCbG9ja0NvbXB1dGVkU3R5bGUucG9zaXRpb24pIHx8IGlzT3ZlcmZsb3dFbGVtZW50KGN1cnJlbnROb2RlKSAmJiAhY3VycmVudE5vZGVJc0NvbnRhaW5pbmcgJiYgaGFzRml4ZWRQb3NpdGlvbkFuY2VzdG9yKGVsZW1lbnQsIGN1cnJlbnROb2RlKTtcbiAgICBpZiAoc2hvdWxkRHJvcEN1cnJlbnROb2RlKSB7XG4gICAgICAvLyBEcm9wIG5vbi1jb250YWluaW5nIGJsb2Nrcy5cbiAgICAgIHJlc3VsdCA9IHJlc3VsdC5maWx0ZXIoYW5jZXN0b3IgPT4gYW5jZXN0b3IgIT09IGN1cnJlbnROb2RlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gUmVjb3JkIGxhc3QgY29udGFpbmluZyBibG9jayBmb3IgbmV4dCBpdGVyYXRpb24uXG4gICAgICBjdXJyZW50Q29udGFpbmluZ0Jsb2NrQ29tcHV0ZWRTdHlsZSA9IGNvbXB1dGVkU3R5bGU7XG4gICAgfVxuICAgIGN1cnJlbnROb2RlID0gZ2V0UGFyZW50Tm9kZShjdXJyZW50Tm9kZSk7XG4gIH1cbiAgY2FjaGUuc2V0KGVsZW1lbnQsIHJlc3VsdCk7XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8vIEdldHMgdGhlIG1heGltdW0gYXJlYSB0aGF0IHRoZSBlbGVtZW50IGlzIHZpc2libGUgaW4gZHVlIHRvIGFueSBudW1iZXIgb2Zcbi8vIGNsaXBwaW5nIGFuY2VzdG9ycy5cbmZ1bmN0aW9uIGdldENsaXBwaW5nUmVjdChfcmVmKSB7XG4gIGxldCB7XG4gICAgZWxlbWVudCxcbiAgICBib3VuZGFyeSxcbiAgICByb290Qm91bmRhcnksXG4gICAgc3RyYXRlZ3lcbiAgfSA9IF9yZWY7XG4gIGNvbnN0IGVsZW1lbnRDbGlwcGluZ0FuY2VzdG9ycyA9IGJvdW5kYXJ5ID09PSAnY2xpcHBpbmdBbmNlc3RvcnMnID8gaXNUb3BMYXllcihlbGVtZW50KSA/IFtdIDogZ2V0Q2xpcHBpbmdFbGVtZW50QW5jZXN0b3JzKGVsZW1lbnQsIHRoaXMuX2MpIDogW10uY29uY2F0KGJvdW5kYXJ5KTtcbiAgY29uc3QgY2xpcHBpbmdBbmNlc3RvcnMgPSBbLi4uZWxlbWVudENsaXBwaW5nQW5jZXN0b3JzLCByb290Qm91bmRhcnldO1xuICBjb25zdCBmaXJzdENsaXBwaW5nQW5jZXN0b3IgPSBjbGlwcGluZ0FuY2VzdG9yc1swXTtcbiAgY29uc3QgY2xpcHBpbmdSZWN0ID0gY2xpcHBpbmdBbmNlc3RvcnMucmVkdWNlKChhY2NSZWN0LCBjbGlwcGluZ0FuY2VzdG9yKSA9PiB7XG4gICAgY29uc3QgcmVjdCA9IGdldENsaWVudFJlY3RGcm9tQ2xpcHBpbmdBbmNlc3RvcihlbGVtZW50LCBjbGlwcGluZ0FuY2VzdG9yLCBzdHJhdGVneSk7XG4gICAgYWNjUmVjdC50b3AgPSBtYXgocmVjdC50b3AsIGFjY1JlY3QudG9wKTtcbiAgICBhY2NSZWN0LnJpZ2h0ID0gbWluKHJlY3QucmlnaHQsIGFjY1JlY3QucmlnaHQpO1xuICAgIGFjY1JlY3QuYm90dG9tID0gbWluKHJlY3QuYm90dG9tLCBhY2NSZWN0LmJvdHRvbSk7XG4gICAgYWNjUmVjdC5sZWZ0ID0gbWF4KHJlY3QubGVmdCwgYWNjUmVjdC5sZWZ0KTtcbiAgICByZXR1cm4gYWNjUmVjdDtcbiAgfSwgZ2V0Q2xpZW50UmVjdEZyb21DbGlwcGluZ0FuY2VzdG9yKGVsZW1lbnQsIGZpcnN0Q2xpcHBpbmdBbmNlc3Rvciwgc3RyYXRlZ3kpKTtcbiAgcmV0dXJuIHtcbiAgICB3aWR0aDogY2xpcHBpbmdSZWN0LnJpZ2h0IC0gY2xpcHBpbmdSZWN0LmxlZnQsXG4gICAgaGVpZ2h0OiBjbGlwcGluZ1JlY3QuYm90dG9tIC0gY2xpcHBpbmdSZWN0LnRvcCxcbiAgICB4OiBjbGlwcGluZ1JlY3QubGVmdCxcbiAgICB5OiBjbGlwcGluZ1JlY3QudG9wXG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldERpbWVuc2lvbnMoZWxlbWVudCkge1xuICBjb25zdCB7XG4gICAgd2lkdGgsXG4gICAgaGVpZ2h0XG4gIH0gPSBnZXRDc3NEaW1lbnNpb25zKGVsZW1lbnQpO1xuICByZXR1cm4ge1xuICAgIHdpZHRoLFxuICAgIGhlaWdodFxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRSZWN0UmVsYXRpdmVUb09mZnNldFBhcmVudChlbGVtZW50LCBvZmZzZXRQYXJlbnQsIHN0cmF0ZWd5KSB7XG4gIGNvbnN0IGlzT2Zmc2V0UGFyZW50QW5FbGVtZW50ID0gaXNIVE1MRWxlbWVudChvZmZzZXRQYXJlbnQpO1xuICBjb25zdCBkb2N1bWVudEVsZW1lbnQgPSBnZXREb2N1bWVudEVsZW1lbnQob2Zmc2V0UGFyZW50KTtcbiAgY29uc3QgaXNGaXhlZCA9IHN0cmF0ZWd5ID09PSAnZml4ZWQnO1xuICBjb25zdCByZWN0ID0gZ2V0Qm91bmRpbmdDbGllbnRSZWN0KGVsZW1lbnQsIHRydWUsIGlzRml4ZWQsIG9mZnNldFBhcmVudCk7XG4gIGxldCBzY3JvbGwgPSB7XG4gICAgc2Nyb2xsTGVmdDogMCxcbiAgICBzY3JvbGxUb3A6IDBcbiAgfTtcbiAgY29uc3Qgb2Zmc2V0cyA9IGNyZWF0ZUNvb3JkcygwKTtcbiAgaWYgKGlzT2Zmc2V0UGFyZW50QW5FbGVtZW50IHx8ICFpc09mZnNldFBhcmVudEFuRWxlbWVudCAmJiAhaXNGaXhlZCkge1xuICAgIGlmIChnZXROb2RlTmFtZShvZmZzZXRQYXJlbnQpICE9PSAnYm9keScgfHwgaXNPdmVyZmxvd0VsZW1lbnQoZG9jdW1lbnRFbGVtZW50KSkge1xuICAgICAgc2Nyb2xsID0gZ2V0Tm9kZVNjcm9sbChvZmZzZXRQYXJlbnQpO1xuICAgIH1cbiAgICBpZiAoaXNPZmZzZXRQYXJlbnRBbkVsZW1lbnQpIHtcbiAgICAgIGNvbnN0IG9mZnNldFJlY3QgPSBnZXRCb3VuZGluZ0NsaWVudFJlY3Qob2Zmc2V0UGFyZW50LCB0cnVlLCBpc0ZpeGVkLCBvZmZzZXRQYXJlbnQpO1xuICAgICAgb2Zmc2V0cy54ID0gb2Zmc2V0UmVjdC54ICsgb2Zmc2V0UGFyZW50LmNsaWVudExlZnQ7XG4gICAgICBvZmZzZXRzLnkgPSBvZmZzZXRSZWN0LnkgKyBvZmZzZXRQYXJlbnQuY2xpZW50VG9wO1xuICAgIH0gZWxzZSBpZiAoZG9jdW1lbnRFbGVtZW50KSB7XG4gICAgICBvZmZzZXRzLnggPSBnZXRXaW5kb3dTY3JvbGxCYXJYKGRvY3VtZW50RWxlbWVudCk7XG4gICAgfVxuICB9XG4gIGNvbnN0IHggPSByZWN0LmxlZnQgKyBzY3JvbGwuc2Nyb2xsTGVmdCAtIG9mZnNldHMueDtcbiAgY29uc3QgeSA9IHJlY3QudG9wICsgc2Nyb2xsLnNjcm9sbFRvcCAtIG9mZnNldHMueTtcbiAgcmV0dXJuIHtcbiAgICB4LFxuICAgIHksXG4gICAgd2lkdGg6IHJlY3Qud2lkdGgsXG4gICAgaGVpZ2h0OiByZWN0LmhlaWdodFxuICB9O1xufVxuXG5mdW5jdGlvbiBpc1N0YXRpY1Bvc2l0aW9uZWQoZWxlbWVudCkge1xuICByZXR1cm4gZ2V0Q29tcHV0ZWRTdHlsZShlbGVtZW50KS5wb3NpdGlvbiA9PT0gJ3N0YXRpYyc7XG59XG5cbmZ1bmN0aW9uIGdldFRydWVPZmZzZXRQYXJlbnQoZWxlbWVudCwgcG9seWZpbGwpIHtcbiAgaWYgKCFpc0hUTUxFbGVtZW50KGVsZW1lbnQpIHx8IGdldENvbXB1dGVkU3R5bGUoZWxlbWVudCkucG9zaXRpb24gPT09ICdmaXhlZCcpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBpZiAocG9seWZpbGwpIHtcbiAgICByZXR1cm4gcG9seWZpbGwoZWxlbWVudCk7XG4gIH1cbiAgcmV0dXJuIGVsZW1lbnQub2Zmc2V0UGFyZW50O1xufVxuXG4vLyBHZXRzIHRoZSBjbG9zZXN0IGFuY2VzdG9yIHBvc2l0aW9uZWQgZWxlbWVudC4gSGFuZGxlcyBzb21lIGVkZ2UgY2FzZXMsXG4vLyBzdWNoIGFzIHRhYmxlIGFuY2VzdG9ycyBhbmQgY3Jvc3MgYnJvd3NlciBidWdzLlxuZnVuY3Rpb24gZ2V0T2Zmc2V0UGFyZW50KGVsZW1lbnQsIHBvbHlmaWxsKSB7XG4gIGNvbnN0IHdpbiA9IGdldFdpbmRvdyhlbGVtZW50KTtcbiAgaWYgKGlzVG9wTGF5ZXIoZWxlbWVudCkpIHtcbiAgICByZXR1cm4gd2luO1xuICB9XG4gIGlmICghaXNIVE1MRWxlbWVudChlbGVtZW50KSkge1xuICAgIGxldCBzdmdPZmZzZXRQYXJlbnQgPSBnZXRQYXJlbnROb2RlKGVsZW1lbnQpO1xuICAgIHdoaWxlIChzdmdPZmZzZXRQYXJlbnQgJiYgIWlzTGFzdFRyYXZlcnNhYmxlTm9kZShzdmdPZmZzZXRQYXJlbnQpKSB7XG4gICAgICBpZiAoaXNFbGVtZW50KHN2Z09mZnNldFBhcmVudCkgJiYgIWlzU3RhdGljUG9zaXRpb25lZChzdmdPZmZzZXRQYXJlbnQpKSB7XG4gICAgICAgIHJldHVybiBzdmdPZmZzZXRQYXJlbnQ7XG4gICAgICB9XG4gICAgICBzdmdPZmZzZXRQYXJlbnQgPSBnZXRQYXJlbnROb2RlKHN2Z09mZnNldFBhcmVudCk7XG4gICAgfVxuICAgIHJldHVybiB3aW47XG4gIH1cbiAgbGV0IG9mZnNldFBhcmVudCA9IGdldFRydWVPZmZzZXRQYXJlbnQoZWxlbWVudCwgcG9seWZpbGwpO1xuICB3aGlsZSAob2Zmc2V0UGFyZW50ICYmIGlzVGFibGVFbGVtZW50KG9mZnNldFBhcmVudCkgJiYgaXNTdGF0aWNQb3NpdGlvbmVkKG9mZnNldFBhcmVudCkpIHtcbiAgICBvZmZzZXRQYXJlbnQgPSBnZXRUcnVlT2Zmc2V0UGFyZW50KG9mZnNldFBhcmVudCwgcG9seWZpbGwpO1xuICB9XG4gIGlmIChvZmZzZXRQYXJlbnQgJiYgaXNMYXN0VHJhdmVyc2FibGVOb2RlKG9mZnNldFBhcmVudCkgJiYgaXNTdGF0aWNQb3NpdGlvbmVkKG9mZnNldFBhcmVudCkgJiYgIWlzQ29udGFpbmluZ0Jsb2NrKG9mZnNldFBhcmVudCkpIHtcbiAgICByZXR1cm4gd2luO1xuICB9XG4gIHJldHVybiBvZmZzZXRQYXJlbnQgfHwgZ2V0Q29udGFpbmluZ0Jsb2NrKGVsZW1lbnQpIHx8IHdpbjtcbn1cblxuY29uc3QgZ2V0RWxlbWVudFJlY3RzID0gYXN5bmMgZnVuY3Rpb24gKGRhdGEpIHtcbiAgY29uc3QgZ2V0T2Zmc2V0UGFyZW50Rm4gPSB0aGlzLmdldE9mZnNldFBhcmVudCB8fCBnZXRPZmZzZXRQYXJlbnQ7XG4gIGNvbnN0IGdldERpbWVuc2lvbnNGbiA9IHRoaXMuZ2V0RGltZW5zaW9ucztcbiAgY29uc3QgZmxvYXRpbmdEaW1lbnNpb25zID0gYXdhaXQgZ2V0RGltZW5zaW9uc0ZuKGRhdGEuZmxvYXRpbmcpO1xuICByZXR1cm4ge1xuICAgIHJlZmVyZW5jZTogZ2V0UmVjdFJlbGF0aXZlVG9PZmZzZXRQYXJlbnQoZGF0YS5yZWZlcmVuY2UsIGF3YWl0IGdldE9mZnNldFBhcmVudEZuKGRhdGEuZmxvYXRpbmcpLCBkYXRhLnN0cmF0ZWd5KSxcbiAgICBmbG9hdGluZzoge1xuICAgICAgeDogMCxcbiAgICAgIHk6IDAsXG4gICAgICB3aWR0aDogZmxvYXRpbmdEaW1lbnNpb25zLndpZHRoLFxuICAgICAgaGVpZ2h0OiBmbG9hdGluZ0RpbWVuc2lvbnMuaGVpZ2h0XG4gICAgfVxuICB9O1xufTtcblxuZnVuY3Rpb24gaXNSVEwoZWxlbWVudCkge1xuICByZXR1cm4gZ2V0Q29tcHV0ZWRTdHlsZShlbGVtZW50KS5kaXJlY3Rpb24gPT09ICdydGwnO1xufVxuXG5jb25zdCBwbGF0Zm9ybSA9IHtcbiAgY29udmVydE9mZnNldFBhcmVudFJlbGF0aXZlUmVjdFRvVmlld3BvcnRSZWxhdGl2ZVJlY3QsXG4gIGdldERvY3VtZW50RWxlbWVudCxcbiAgZ2V0Q2xpcHBpbmdSZWN0LFxuICBnZXRPZmZzZXRQYXJlbnQsXG4gIGdldEVsZW1lbnRSZWN0cyxcbiAgZ2V0Q2xpZW50UmVjdHMsXG4gIGdldERpbWVuc2lvbnMsXG4gIGdldFNjYWxlLFxuICBpc0VsZW1lbnQsXG4gIGlzUlRMXG59O1xuXG4vLyBodHRwczovL3NhbXRob3IuYXUvMjAyMS9vYnNlcnZpbmctZG9tL1xuZnVuY3Rpb24gb2JzZXJ2ZU1vdmUoZWxlbWVudCwgb25Nb3ZlKSB7XG4gIGxldCBpbyA9IG51bGw7XG4gIGxldCB0aW1lb3V0SWQ7XG4gIGNvbnN0IHJvb3QgPSBnZXREb2N1bWVudEVsZW1lbnQoZWxlbWVudCk7XG4gIGZ1bmN0aW9uIGNsZWFudXAoKSB7XG4gICAgdmFyIF9pbztcbiAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcbiAgICAoX2lvID0gaW8pID09IG51bGwgfHwgX2lvLmRpc2Nvbm5lY3QoKTtcbiAgICBpbyA9IG51bGw7XG4gIH1cbiAgZnVuY3Rpb24gcmVmcmVzaChza2lwLCB0aHJlc2hvbGQpIHtcbiAgICBpZiAoc2tpcCA9PT0gdm9pZCAwKSB7XG4gICAgICBza2lwID0gZmFsc2U7XG4gICAgfVxuICAgIGlmICh0aHJlc2hvbGQgPT09IHZvaWQgMCkge1xuICAgICAgdGhyZXNob2xkID0gMTtcbiAgICB9XG4gICAgY2xlYW51cCgpO1xuICAgIGNvbnN0IHtcbiAgICAgIGxlZnQsXG4gICAgICB0b3AsXG4gICAgICB3aWR0aCxcbiAgICAgIGhlaWdodFxuICAgIH0gPSBlbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGlmICghc2tpcCkge1xuICAgICAgb25Nb3ZlKCk7XG4gICAgfVxuICAgIGlmICghd2lkdGggfHwgIWhlaWdodCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBpbnNldFRvcCA9IGZsb29yKHRvcCk7XG4gICAgY29uc3QgaW5zZXRSaWdodCA9IGZsb29yKHJvb3QuY2xpZW50V2lkdGggLSAobGVmdCArIHdpZHRoKSk7XG4gICAgY29uc3QgaW5zZXRCb3R0b20gPSBmbG9vcihyb290LmNsaWVudEhlaWdodCAtICh0b3AgKyBoZWlnaHQpKTtcbiAgICBjb25zdCBpbnNldExlZnQgPSBmbG9vcihsZWZ0KTtcbiAgICBjb25zdCByb290TWFyZ2luID0gLWluc2V0VG9wICsgXCJweCBcIiArIC1pbnNldFJpZ2h0ICsgXCJweCBcIiArIC1pbnNldEJvdHRvbSArIFwicHggXCIgKyAtaW5zZXRMZWZ0ICsgXCJweFwiO1xuICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICByb290TWFyZ2luLFxuICAgICAgdGhyZXNob2xkOiBtYXgoMCwgbWluKDEsIHRocmVzaG9sZCkpIHx8IDFcbiAgICB9O1xuICAgIGxldCBpc0ZpcnN0VXBkYXRlID0gdHJ1ZTtcbiAgICBmdW5jdGlvbiBoYW5kbGVPYnNlcnZlKGVudHJpZXMpIHtcbiAgICAgIGNvbnN0IHJhdGlvID0gZW50cmllc1swXS5pbnRlcnNlY3Rpb25SYXRpbztcbiAgICAgIGlmIChyYXRpbyAhPT0gdGhyZXNob2xkKSB7XG4gICAgICAgIGlmICghaXNGaXJzdFVwZGF0ZSkge1xuICAgICAgICAgIHJldHVybiByZWZyZXNoKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFyYXRpbykge1xuICAgICAgICAgIC8vIElmIHRoZSByZWZlcmVuY2UgaXMgY2xpcHBlZCwgdGhlIHJhdGlvIGlzIDAuIFRocm90dGxlIHRoZSByZWZyZXNoXG4gICAgICAgICAgLy8gdG8gcHJldmVudCBhbiBpbmZpbml0ZSBsb29wIG9mIHVwZGF0ZXMuXG4gICAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICByZWZyZXNoKGZhbHNlLCAxZS03KTtcbiAgICAgICAgICB9LCAxMDAwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZWZyZXNoKGZhbHNlLCByYXRpbyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlzRmlyc3RVcGRhdGUgPSBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBPbGRlciBicm93c2VycyBkb24ndCBzdXBwb3J0IGEgYGRvY3VtZW50YCBhcyB0aGUgcm9vdCBhbmQgd2lsbCB0aHJvdyBhblxuICAgIC8vIGVycm9yLlxuICAgIHRyeSB7XG4gICAgICBpbyA9IG5ldyBJbnRlcnNlY3Rpb25PYnNlcnZlcihoYW5kbGVPYnNlcnZlLCB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIC8vIEhhbmRsZSA8aWZyYW1lPnNcbiAgICAgICAgcm9vdDogcm9vdC5vd25lckRvY3VtZW50XG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpbyA9IG5ldyBJbnRlcnNlY3Rpb25PYnNlcnZlcihoYW5kbGVPYnNlcnZlLCBvcHRpb25zKTtcbiAgICB9XG4gICAgaW8ub2JzZXJ2ZShlbGVtZW50KTtcbiAgfVxuICByZWZyZXNoKHRydWUpO1xuICByZXR1cm4gY2xlYW51cDtcbn1cblxuLyoqXG4gKiBBdXRvbWF0aWNhbGx5IHVwZGF0ZXMgdGhlIHBvc2l0aW9uIG9mIHRoZSBmbG9hdGluZyBlbGVtZW50IHdoZW4gbmVjZXNzYXJ5LlxuICogU2hvdWxkIG9ubHkgYmUgY2FsbGVkIHdoZW4gdGhlIGZsb2F0aW5nIGVsZW1lbnQgaXMgbW91bnRlZCBvbiB0aGUgRE9NIG9yXG4gKiB2aXNpYmxlIG9uIHRoZSBzY3JlZW4uXG4gKiBAcmV0dXJucyBjbGVhbnVwIGZ1bmN0aW9uIHRoYXQgc2hvdWxkIGJlIGludm9rZWQgd2hlbiB0aGUgZmxvYXRpbmcgZWxlbWVudCBpc1xuICogcmVtb3ZlZCBmcm9tIHRoZSBET00gb3IgaGlkZGVuIGZyb20gdGhlIHNjcmVlbi5cbiAqIEBzZWUgaHR0cHM6Ly9mbG9hdGluZy11aS5jb20vZG9jcy9hdXRvVXBkYXRlXG4gKi9cbmZ1bmN0aW9uIGF1dG9VcGRhdGUocmVmZXJlbmNlLCBmbG9hdGluZywgdXBkYXRlLCBvcHRpb25zKSB7XG4gIGlmIChvcHRpb25zID09PSB2b2lkIDApIHtcbiAgICBvcHRpb25zID0ge307XG4gIH1cbiAgY29uc3Qge1xuICAgIGFuY2VzdG9yU2Nyb2xsID0gdHJ1ZSxcbiAgICBhbmNlc3RvclJlc2l6ZSA9IHRydWUsXG4gICAgZWxlbWVudFJlc2l6ZSA9IHR5cGVvZiBSZXNpemVPYnNlcnZlciA9PT0gJ2Z1bmN0aW9uJyxcbiAgICBsYXlvdXRTaGlmdCA9IHR5cGVvZiBJbnRlcnNlY3Rpb25PYnNlcnZlciA9PT0gJ2Z1bmN0aW9uJyxcbiAgICBhbmltYXRpb25GcmFtZSA9IGZhbHNlXG4gIH0gPSBvcHRpb25zO1xuICBjb25zdCByZWZlcmVuY2VFbCA9IHVud3JhcEVsZW1lbnQocmVmZXJlbmNlKTtcbiAgY29uc3QgYW5jZXN0b3JzID0gYW5jZXN0b3JTY3JvbGwgfHwgYW5jZXN0b3JSZXNpemUgPyBbLi4uKHJlZmVyZW5jZUVsID8gZ2V0T3ZlcmZsb3dBbmNlc3RvcnMocmVmZXJlbmNlRWwpIDogW10pLCAuLi5nZXRPdmVyZmxvd0FuY2VzdG9ycyhmbG9hdGluZyldIDogW107XG4gIGFuY2VzdG9ycy5mb3JFYWNoKGFuY2VzdG9yID0+IHtcbiAgICBhbmNlc3RvclNjcm9sbCAmJiBhbmNlc3Rvci5hZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCB1cGRhdGUsIHtcbiAgICAgIHBhc3NpdmU6IHRydWVcbiAgICB9KTtcbiAgICBhbmNlc3RvclJlc2l6ZSAmJiBhbmNlc3Rvci5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCB1cGRhdGUpO1xuICB9KTtcbiAgY29uc3QgY2xlYW51cElvID0gcmVmZXJlbmNlRWwgJiYgbGF5b3V0U2hpZnQgPyBvYnNlcnZlTW92ZShyZWZlcmVuY2VFbCwgdXBkYXRlKSA6IG51bGw7XG4gIGxldCByZW9ic2VydmVGcmFtZSA9IC0xO1xuICBsZXQgcmVzaXplT2JzZXJ2ZXIgPSBudWxsO1xuICBpZiAoZWxlbWVudFJlc2l6ZSkge1xuICAgIHJlc2l6ZU9ic2VydmVyID0gbmV3IFJlc2l6ZU9ic2VydmVyKF9yZWYgPT4ge1xuICAgICAgbGV0IFtmaXJzdEVudHJ5XSA9IF9yZWY7XG4gICAgICBpZiAoZmlyc3RFbnRyeSAmJiBmaXJzdEVudHJ5LnRhcmdldCA9PT0gcmVmZXJlbmNlRWwgJiYgcmVzaXplT2JzZXJ2ZXIpIHtcbiAgICAgICAgLy8gUHJldmVudCB1cGRhdGUgbG9vcHMgd2hlbiB1c2luZyB0aGUgYHNpemVgIG1pZGRsZXdhcmUuXG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9mbG9hdGluZy11aS9mbG9hdGluZy11aS9pc3N1ZXMvMTc0MFxuICAgICAgICByZXNpemVPYnNlcnZlci51bm9ic2VydmUoZmxvYXRpbmcpO1xuICAgICAgICBjYW5jZWxBbmltYXRpb25GcmFtZShyZW9ic2VydmVGcmFtZSk7XG4gICAgICAgIHJlb2JzZXJ2ZUZyYW1lID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgICAgICB2YXIgX3Jlc2l6ZU9ic2VydmVyO1xuICAgICAgICAgIChfcmVzaXplT2JzZXJ2ZXIgPSByZXNpemVPYnNlcnZlcikgPT0gbnVsbCB8fCBfcmVzaXplT2JzZXJ2ZXIub2JzZXJ2ZShmbG9hdGluZyk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgdXBkYXRlKCk7XG4gICAgfSk7XG4gICAgaWYgKHJlZmVyZW5jZUVsICYmICFhbmltYXRpb25GcmFtZSkge1xuICAgICAgcmVzaXplT2JzZXJ2ZXIub2JzZXJ2ZShyZWZlcmVuY2VFbCk7XG4gICAgfVxuICAgIHJlc2l6ZU9ic2VydmVyLm9ic2VydmUoZmxvYXRpbmcpO1xuICB9XG4gIGxldCBmcmFtZUlkO1xuICBsZXQgcHJldlJlZlJlY3QgPSBhbmltYXRpb25GcmFtZSA/IGdldEJvdW5kaW5nQ2xpZW50UmVjdChyZWZlcmVuY2UpIDogbnVsbDtcbiAgaWYgKGFuaW1hdGlvbkZyYW1lKSB7XG4gICAgZnJhbWVMb29wKCk7XG4gIH1cbiAgZnVuY3Rpb24gZnJhbWVMb29wKCkge1xuICAgIGNvbnN0IG5leHRSZWZSZWN0ID0gZ2V0Qm91bmRpbmdDbGllbnRSZWN0KHJlZmVyZW5jZSk7XG4gICAgaWYgKHByZXZSZWZSZWN0ICYmIChuZXh0UmVmUmVjdC54ICE9PSBwcmV2UmVmUmVjdC54IHx8IG5leHRSZWZSZWN0LnkgIT09IHByZXZSZWZSZWN0LnkgfHwgbmV4dFJlZlJlY3Qud2lkdGggIT09IHByZXZSZWZSZWN0LndpZHRoIHx8IG5leHRSZWZSZWN0LmhlaWdodCAhPT0gcHJldlJlZlJlY3QuaGVpZ2h0KSkge1xuICAgICAgdXBkYXRlKCk7XG4gICAgfVxuICAgIHByZXZSZWZSZWN0ID0gbmV4dFJlZlJlY3Q7XG4gICAgZnJhbWVJZCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZShmcmFtZUxvb3ApO1xuICB9XG4gIHVwZGF0ZSgpO1xuICByZXR1cm4gKCkgPT4ge1xuICAgIHZhciBfcmVzaXplT2JzZXJ2ZXIyO1xuICAgIGFuY2VzdG9ycy5mb3JFYWNoKGFuY2VzdG9yID0+IHtcbiAgICAgIGFuY2VzdG9yU2Nyb2xsICYmIGFuY2VzdG9yLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIHVwZGF0ZSk7XG4gICAgICBhbmNlc3RvclJlc2l6ZSAmJiBhbmNlc3Rvci5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCB1cGRhdGUpO1xuICAgIH0pO1xuICAgIGNsZWFudXBJbyA9PSBudWxsIHx8IGNsZWFudXBJbygpO1xuICAgIChfcmVzaXplT2JzZXJ2ZXIyID0gcmVzaXplT2JzZXJ2ZXIpID09IG51bGwgfHwgX3Jlc2l6ZU9ic2VydmVyMi5kaXNjb25uZWN0KCk7XG4gICAgcmVzaXplT2JzZXJ2ZXIgPSBudWxsO1xuICAgIGlmIChhbmltYXRpb25GcmFtZSkge1xuICAgICAgY2FuY2VsQW5pbWF0aW9uRnJhbWUoZnJhbWVJZCk7XG4gICAgfVxuICB9O1xufVxuXG4vKipcbiAqIFJlc29sdmVzIHdpdGggYW4gb2JqZWN0IG9mIG92ZXJmbG93IHNpZGUgb2Zmc2V0cyB0aGF0IGRldGVybWluZSBob3cgbXVjaCB0aGVcbiAqIGVsZW1lbnQgaXMgb3ZlcmZsb3dpbmcgYSBnaXZlbiBjbGlwcGluZyBib3VuZGFyeSBvbiBlYWNoIHNpZGUuXG4gKiAtIHBvc2l0aXZlID0gb3ZlcmZsb3dpbmcgdGhlIGJvdW5kYXJ5IGJ5IHRoYXQgbnVtYmVyIG9mIHBpeGVsc1xuICogLSBuZWdhdGl2ZSA9IGhvdyBtYW55IHBpeGVscyBsZWZ0IGJlZm9yZSBpdCB3aWxsIG92ZXJmbG93XG4gKiAtIDAgPSBsaWVzIGZsdXNoIHdpdGggdGhlIGJvdW5kYXJ5XG4gKiBAc2VlIGh0dHBzOi8vZmxvYXRpbmctdWkuY29tL2RvY3MvZGV0ZWN0T3ZlcmZsb3dcbiAqL1xuY29uc3QgZGV0ZWN0T3ZlcmZsb3cgPSBkZXRlY3RPdmVyZmxvdyQxO1xuXG4vKipcbiAqIE1vZGlmaWVzIHRoZSBwbGFjZW1lbnQgYnkgdHJhbnNsYXRpbmcgdGhlIGZsb2F0aW5nIGVsZW1lbnQgYWxvbmcgdGhlXG4gKiBzcGVjaWZpZWQgYXhlcy5cbiAqIEEgbnVtYmVyIChzaG9ydGhhbmQgZm9yIGBtYWluQXhpc2Agb3IgZGlzdGFuY2UpLCBvciBhbiBheGVzIGNvbmZpZ3VyYXRpb25cbiAqIG9iamVjdCBtYXkgYmUgcGFzc2VkLlxuICogQHNlZSBodHRwczovL2Zsb2F0aW5nLXVpLmNvbS9kb2NzL29mZnNldFxuICovXG5jb25zdCBvZmZzZXQgPSBvZmZzZXQkMTtcblxuLyoqXG4gKiBPcHRpbWl6ZXMgdGhlIHZpc2liaWxpdHkgb2YgdGhlIGZsb2F0aW5nIGVsZW1lbnQgYnkgY2hvb3NpbmcgdGhlIHBsYWNlbWVudFxuICogdGhhdCBoYXMgdGhlIG1vc3Qgc3BhY2UgYXZhaWxhYmxlIGF1dG9tYXRpY2FsbHksIHdpdGhvdXQgbmVlZGluZyB0byBzcGVjaWZ5IGFcbiAqIHByZWZlcnJlZCBwbGFjZW1lbnQuIEFsdGVybmF0aXZlIHRvIGBmbGlwYC5cbiAqIEBzZWUgaHR0cHM6Ly9mbG9hdGluZy11aS5jb20vZG9jcy9hdXRvUGxhY2VtZW50XG4gKi9cbmNvbnN0IGF1dG9QbGFjZW1lbnQgPSBhdXRvUGxhY2VtZW50JDE7XG5cbi8qKlxuICogT3B0aW1pemVzIHRoZSB2aXNpYmlsaXR5IG9mIHRoZSBmbG9hdGluZyBlbGVtZW50IGJ5IHNoaWZ0aW5nIGl0IGluIG9yZGVyIHRvXG4gKiBrZWVwIGl0IGluIHZpZXcgd2hlbiBpdCB3aWxsIG92ZXJmbG93IHRoZSBjbGlwcGluZyBib3VuZGFyeS5cbiAqIEBzZWUgaHR0cHM6Ly9mbG9hdGluZy11aS5jb20vZG9jcy9zaGlmdFxuICovXG5jb25zdCBzaGlmdCA9IHNoaWZ0JDE7XG5cbi8qKlxuICogT3B0aW1pemVzIHRoZSB2aXNpYmlsaXR5IG9mIHRoZSBmbG9hdGluZyBlbGVtZW50IGJ5IGZsaXBwaW5nIHRoZSBgcGxhY2VtZW50YFxuICogaW4gb3JkZXIgdG8ga2VlcCBpdCBpbiB2aWV3IHdoZW4gdGhlIHByZWZlcnJlZCBwbGFjZW1lbnQocykgd2lsbCBvdmVyZmxvdyB0aGVcbiAqIGNsaXBwaW5nIGJvdW5kYXJ5LiBBbHRlcm5hdGl2ZSB0byBgYXV0b1BsYWNlbWVudGAuXG4gKiBAc2VlIGh0dHBzOi8vZmxvYXRpbmctdWkuY29tL2RvY3MvZmxpcFxuICovXG5jb25zdCBmbGlwID0gZmxpcCQxO1xuXG4vKipcbiAqIFByb3ZpZGVzIGRhdGEgdGhhdCBhbGxvd3MgeW91IHRvIGNoYW5nZSB0aGUgc2l6ZSBvZiB0aGUgZmxvYXRpbmcgZWxlbWVudCBcdTIwMTRcbiAqIGZvciBpbnN0YW5jZSwgcHJldmVudCBpdCBmcm9tIG92ZXJmbG93aW5nIHRoZSBjbGlwcGluZyBib3VuZGFyeSBvciBtYXRjaCB0aGVcbiAqIHdpZHRoIG9mIHRoZSByZWZlcmVuY2UgZWxlbWVudC5cbiAqIEBzZWUgaHR0cHM6Ly9mbG9hdGluZy11aS5jb20vZG9jcy9zaXplXG4gKi9cbmNvbnN0IHNpemUgPSBzaXplJDE7XG5cbi8qKlxuICogUHJvdmlkZXMgZGF0YSB0byBoaWRlIHRoZSBmbG9hdGluZyBlbGVtZW50IGluIGFwcGxpY2FibGUgc2l0dWF0aW9ucywgc3VjaCBhc1xuICogd2hlbiBpdCBpcyBub3QgaW4gdGhlIHNhbWUgY2xpcHBpbmcgY29udGV4dCBhcyB0aGUgcmVmZXJlbmNlIGVsZW1lbnQuXG4gKiBAc2VlIGh0dHBzOi8vZmxvYXRpbmctdWkuY29tL2RvY3MvaGlkZVxuICovXG5jb25zdCBoaWRlID0gaGlkZSQxO1xuXG4vKipcbiAqIFByb3ZpZGVzIGRhdGEgdG8gcG9zaXRpb24gYW4gaW5uZXIgZWxlbWVudCBvZiB0aGUgZmxvYXRpbmcgZWxlbWVudCBzbyB0aGF0IGl0XG4gKiBhcHBlYXJzIGNlbnRlcmVkIHRvIHRoZSByZWZlcmVuY2UgZWxlbWVudC5cbiAqIEBzZWUgaHR0cHM6Ly9mbG9hdGluZy11aS5jb20vZG9jcy9hcnJvd1xuICovXG5jb25zdCBhcnJvdyA9IGFycm93JDE7XG5cbi8qKlxuICogUHJvdmlkZXMgaW1wcm92ZWQgcG9zaXRpb25pbmcgZm9yIGlubGluZSByZWZlcmVuY2UgZWxlbWVudHMgdGhhdCBjYW4gc3BhblxuICogb3ZlciBtdWx0aXBsZSBsaW5lcywgc3VjaCBhcyBoeXBlcmxpbmtzIG9yIHJhbmdlIHNlbGVjdGlvbnMuXG4gKiBAc2VlIGh0dHBzOi8vZmxvYXRpbmctdWkuY29tL2RvY3MvaW5saW5lXG4gKi9cbmNvbnN0IGlubGluZSA9IGlubGluZSQxO1xuXG4vKipcbiAqIEJ1aWx0LWluIGBsaW1pdGVyYCB0aGF0IHdpbGwgc3RvcCBgc2hpZnQoKWAgYXQgYSBjZXJ0YWluIHBvaW50LlxuICovXG5jb25zdCBsaW1pdFNoaWZ0ID0gbGltaXRTaGlmdCQxO1xuXG4vKipcbiAqIENvbXB1dGVzIHRoZSBgeGAgYW5kIGB5YCBjb29yZGluYXRlcyB0aGF0IHdpbGwgcGxhY2UgdGhlIGZsb2F0aW5nIGVsZW1lbnRcbiAqIG5leHQgdG8gYSBnaXZlbiByZWZlcmVuY2UgZWxlbWVudC5cbiAqL1xuY29uc3QgY29tcHV0ZVBvc2l0aW9uID0gKHJlZmVyZW5jZSwgZmxvYXRpbmcsIG9wdGlvbnMpID0+IHtcbiAgLy8gVGhpcyBjYWNoZXMgdGhlIGV4cGVuc2l2ZSBgZ2V0Q2xpcHBpbmdFbGVtZW50QW5jZXN0b3JzYCBmdW5jdGlvbiBzbyB0aGF0XG4gIC8vIG11bHRpcGxlIGxpZmVjeWNsZSByZXNldHMgcmUtdXNlIHRoZSBzYW1lIHJlc3VsdC4gSXQgb25seSBsaXZlcyBmb3IgYVxuICAvLyBzaW5nbGUgY2FsbC4gSWYgb3RoZXIgZnVuY3Rpb25zIGJlY29tZSBleHBlbnNpdmUsIHdlIGNhbiBhZGQgdGhlbSBhcyB3ZWxsLlxuICBjb25zdCBjYWNoZSA9IG5ldyBNYXAoKTtcbiAgY29uc3QgbWVyZ2VkT3B0aW9ucyA9IHtcbiAgICBwbGF0Zm9ybSxcbiAgICAuLi5vcHRpb25zXG4gIH07XG4gIGNvbnN0IHBsYXRmb3JtV2l0aENhY2hlID0ge1xuICAgIC4uLm1lcmdlZE9wdGlvbnMucGxhdGZvcm0sXG4gICAgX2M6IGNhY2hlXG4gIH07XG4gIHJldHVybiBjb21wdXRlUG9zaXRpb24kMShyZWZlcmVuY2UsIGZsb2F0aW5nLCB7XG4gICAgLi4ubWVyZ2VkT3B0aW9ucyxcbiAgICBwbGF0Zm9ybTogcGxhdGZvcm1XaXRoQ2FjaGVcbiAgfSk7XG59O1xuXG5leHBvcnQgeyBhcnJvdywgYXV0b1BsYWNlbWVudCwgYXV0b1VwZGF0ZSwgY29tcHV0ZVBvc2l0aW9uLCBkZXRlY3RPdmVyZmxvdywgZmxpcCwgaGlkZSwgaW5saW5lLCBsaW1pdFNoaWZ0LCBvZmZzZXQsIHBsYXRmb3JtLCBzaGlmdCwgc2l6ZSB9O1xuIiwgImltcG9ydCB7IGFjY2VzcyB9IGZyb20gJy4uL2NodW5rL09aQ0k0TkROLmpzJztcbmltcG9ydCB7IG9mZnNldCwgc2hpZnQsIGFycm93LCBmbGlwLCBzaXplLCBhdXRvUGxhY2VtZW50LCBoaWRlLCBpbmxpbmUsIGF1dG9VcGRhdGUsIGNvbXB1dGVQb3NpdGlvbiB9IGZyb20gJ0BmbG9hdGluZy11aS9kb20nO1xuaW1wb3J0IHsgbWVyZ2VQcm9wcywgY3JlYXRlU2lnbmFsLCBjcmVhdGVFZmZlY3QsIG9uQ2xlYW51cCB9IGZyb20gJ3NvbGlkLWpzJztcblxudmFyIGNyZWF0ZUZsb2F0aW5nID0gKHByb3BzKSA9PiB7XG4gIGNvbnN0IGRlZmF1bHRlZFByb3BzID0gbWVyZ2VQcm9wcyhcbiAgICB7XG4gICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgcGxhY2VtZW50OiBcImJvdHRvbVwiLFxuICAgICAgc3RyYXRlZ3k6IFwiYWJzb2x1dGVcIixcbiAgICAgIG9wdGlvbnM6IG51bGxcbiAgICB9LFxuICAgIHByb3BzXG4gICk7XG4gIGNvbnN0IFtmbG9hdGluZ1N0YXRlLCBzZXRGbG9hdGluZ1N0YXRlXSA9IGNyZWF0ZVNpZ25hbCh7XG4gICAgcGxhY2VtZW50OiBhY2Nlc3MoZGVmYXVsdGVkUHJvcHMucGxhY2VtZW50KSxcbiAgICB4OiAwLFxuICAgIHk6IDAsXG4gICAgd2lkdGg6IG51bGwsXG4gICAgaGVpZ2h0OiBudWxsLFxuICAgIG1heFdpZHRoOiBudWxsLFxuICAgIG1heEhlaWdodDogbnVsbCxcbiAgICBhcnJvd1g6IG51bGwsXG4gICAgYXJyb3dZOiBudWxsXG4gIH0pO1xuICBjcmVhdGVFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghYWNjZXNzKGRlZmF1bHRlZFByb3BzLmVuYWJsZWQpKVxuICAgICAgcmV0dXJuO1xuICAgIGNvbnN0IHJlZmVyZW5jZSA9IGFjY2VzcyhkZWZhdWx0ZWRQcm9wcy5yZWZlcmVuY2UpO1xuICAgIGNvbnN0IGZsb2F0aW5nID0gYWNjZXNzKGRlZmF1bHRlZFByb3BzLmZsb2F0aW5nKTtcbiAgICBpZiAoIXJlZmVyZW5jZSB8fCAhZmxvYXRpbmcpXG4gICAgICByZXR1cm47XG4gICAgY29uc3QgbWlkZGxld2FyZSA9IFtdO1xuICAgIGNvbnN0IG9wdGlvbnMgPSBhY2Nlc3MoZGVmYXVsdGVkUHJvcHMub3B0aW9ucyk7XG4gICAgaWYgKG9wdGlvbnM/Lm9mZnNldCAhPT0gdm9pZCAwKSB7XG4gICAgICBtaWRkbGV3YXJlLnB1c2gob2Zmc2V0KG9wdGlvbnMub2Zmc2V0KSk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zPy5zaGlmdCAhPT0gdm9pZCAwICYmIG9wdGlvbnMuc2hpZnQgIT09IGZhbHNlKSB7XG4gICAgICBjb25zdCBzaGlmdE9wdGlvbnMgPSBvcHRpb25zLnNoaWZ0ID09PSB0cnVlID8gdm9pZCAwIDogb3B0aW9ucy5zaGlmdDtcbiAgICAgIG1pZGRsZXdhcmUucHVzaChzaGlmdChzaGlmdE9wdGlvbnMpKTtcbiAgICB9XG4gICAgY29uc3QgYXJyb3dFbGVtZW50ID0gYWNjZXNzKGRlZmF1bHRlZFByb3BzLmFycm93KTtcbiAgICBpZiAoYXJyb3dFbGVtZW50KSB7XG4gICAgICBtaWRkbGV3YXJlLnB1c2goXG4gICAgICAgIGFycm93KHtcbiAgICAgICAgICBlbGVtZW50OiBhcnJvd0VsZW1lbnQsXG4gICAgICAgICAgcGFkZGluZzogb3B0aW9ucz8uYXJyb3dcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfVxuICAgIGNvbnN0IGZsaXBFbmFibGVkID0gb3B0aW9ucz8uZmxpcCAhPT0gdm9pZCAwICYmIG9wdGlvbnMuZmxpcCAhPT0gZmFsc2U7XG4gICAgY29uc3QgZmxpcE9wdGlvbnMgPSB0eXBlb2Ygb3B0aW9ucz8uZmxpcCA9PT0gXCJib29sZWFuXCIgPyB2b2lkIDAgOiBvcHRpb25zPy5mbGlwO1xuICAgIGlmIChmbGlwRW5hYmxlZCAmJiBmbGlwT3B0aW9ucz8uZmFsbGJhY2tTdHJhdGVneSAhPT0gXCJpbml0aWFsUGxhY2VtZW50XCIpIHtcbiAgICAgIG1pZGRsZXdhcmUucHVzaChmbGlwKGZsaXBPcHRpb25zKSk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zPy5zaXplKSB7XG4gICAgICBtaWRkbGV3YXJlLnB1c2goXG4gICAgICAgIHNpemUoe1xuICAgICAgICAgIGFwcGx5OiAoeyBhdmFpbGFibGVXaWR0aCwgYXZhaWxhYmxlSGVpZ2h0LCAuLi5zdGF0ZSB9KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuZXdGbG9hdGluZ1N0YXRlID0ge307XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5zaXplLm1hdGNoU2l6ZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICBpZiAoc3RhdGUucGxhY2VtZW50LnN0YXJ0c1dpdGgoXCJ0b3BcIikgfHwgc3RhdGUucGxhY2VtZW50LnN0YXJ0c1dpdGgoXCJib3R0b21cIikpIHtcbiAgICAgICAgICAgICAgICBuZXdGbG9hdGluZ1N0YXRlLndpZHRoID0gc3RhdGUucmVjdHMucmVmZXJlbmNlLndpZHRoO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5ld0Zsb2F0aW5nU3RhdGUuaGVpZ2h0ID0gc3RhdGUucmVjdHMucmVmZXJlbmNlLmhlaWdodDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9wdGlvbnMuc2l6ZS5maXRWaWV3UG9ydCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICBpZiAoc3RhdGUucGxhY2VtZW50LnN0YXJ0c1dpdGgoXCJ0b3BcIikgfHwgc3RhdGUucGxhY2VtZW50LnN0YXJ0c1dpdGgoXCJib3R0b21cIikpIHtcbiAgICAgICAgICAgICAgICBuZXdGbG9hdGluZ1N0YXRlLm1heEhlaWdodCA9IGF2YWlsYWJsZUhlaWdodDtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBuZXdGbG9hdGluZ1N0YXRlLm1heFdpZHRoID0gYXZhaWxhYmxlV2lkdGg7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghZmxvYXRpbmdTdGF0ZXNNYXRjaChmbG9hdGluZ1N0YXRlKCksIG5ld0Zsb2F0aW5nU3RhdGUpKSB7XG4gICAgICAgICAgICAgIHNldEZsb2F0aW5nU3RhdGUoKHN0YXRlMikgPT4gKHsgLi4uc3RhdGUyLCAuLi5uZXdGbG9hdGluZ1N0YXRlIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIC4uLm9wdGlvbnMuc2l6ZVxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9XG4gICAgaWYgKGZsaXBFbmFibGVkICYmIGZsaXBPcHRpb25zPy5mYWxsYmFja1N0cmF0ZWd5ID09PSBcImJlc3RGaXRcIikge1xuICAgICAgbWlkZGxld2FyZS5wdXNoKGZsaXAoZmxpcE9wdGlvbnMpKTtcbiAgICB9XG4gICAgaWYgKCFmbGlwRW5hYmxlZCAmJiBvcHRpb25zPy5hdXRvUGxhY2VtZW50ICE9PSB2b2lkIDAgJiYgb3B0aW9ucy5hdXRvUGxhY2VtZW50ICE9PSBmYWxzZSkge1xuICAgICAgY29uc3QgYXV0b1BsYWNlbWVudE9wdGlvbnMgPSBvcHRpb25zLmF1dG9QbGFjZW1lbnQgPT09IHRydWUgPyB2b2lkIDAgOiBvcHRpb25zLmF1dG9QbGFjZW1lbnQ7XG4gICAgICBtaWRkbGV3YXJlLnB1c2goYXV0b1BsYWNlbWVudChhdXRvUGxhY2VtZW50T3B0aW9ucykpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucz8uaGlkZSAhPT0gdm9pZCAwICYmIG9wdGlvbnMuaGlkZSAhPT0gZmFsc2UpIHtcbiAgICAgIGNvbnN0IGhpZGVPcHRpb25zID0gb3B0aW9ucy5oaWRlID09PSB0cnVlID8gdm9pZCAwIDogb3B0aW9ucy5oaWRlO1xuICAgICAgbWlkZGxld2FyZS5wdXNoKGhpZGUoaGlkZU9wdGlvbnMpKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnM/LmlubGluZSAhPT0gdm9pZCAwICYmIG9wdGlvbnMuaW5saW5lICE9PSBmYWxzZSkge1xuICAgICAgY29uc3QgaW5saW5lT3B0aW9ucyA9IG9wdGlvbnMuaW5saW5lID09PSB0cnVlID8gdm9pZCAwIDogb3B0aW9ucy5pbmxpbmU7XG4gICAgICBtaWRkbGV3YXJlLnB1c2goaW5saW5lKGlubGluZU9wdGlvbnMpKTtcbiAgICB9XG4gICAgY29uc3QgY2xlYW51cCA9IGF1dG9VcGRhdGUocmVmZXJlbmNlLCBmbG9hdGluZywgKCkgPT4ge1xuICAgICAgY29tcHV0ZVBvc2l0aW9uKHJlZmVyZW5jZSwgZmxvYXRpbmcsIHtcbiAgICAgICAgcGxhY2VtZW50OiBhY2Nlc3MoZGVmYXVsdGVkUHJvcHMucGxhY2VtZW50KSxcbiAgICAgICAgc3RyYXRlZ3k6IGFjY2VzcyhkZWZhdWx0ZWRQcm9wcy5zdHJhdGVneSksXG4gICAgICAgIG1pZGRsZXdhcmVcbiAgICAgIH0pLnRoZW4oKHsgcGxhY2VtZW50LCB4LCB5LCBtaWRkbGV3YXJlRGF0YSB9KSA9PiB7XG4gICAgICAgIGNvbnN0IG5ld0Zsb2F0aW5nU3RhdGUgPSB7XG4gICAgICAgICAgcGxhY2VtZW50LFxuICAgICAgICAgIHgsXG4gICAgICAgICAgeSxcbiAgICAgICAgICBhcnJvd1g6IG1pZGRsZXdhcmVEYXRhLmFycm93Py54ID8/IG51bGwsXG4gICAgICAgICAgYXJyb3dZOiBtaWRkbGV3YXJlRGF0YS5hcnJvdz8ueSA/PyBudWxsXG4gICAgICAgIH07XG4gICAgICAgIGlmICghZmxvYXRpbmdTdGF0ZXNNYXRjaChmbG9hdGluZ1N0YXRlKCksIG5ld0Zsb2F0aW5nU3RhdGUpKSB7XG4gICAgICAgICAgc2V0RmxvYXRpbmdTdGF0ZSgoc3RhdGUpID0+ICh7IC4uLnN0YXRlLCAuLi5uZXdGbG9hdGluZ1N0YXRlIH0pKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgb25DbGVhbnVwKGNsZWFudXApO1xuICB9KTtcbiAgcmV0dXJuIGZsb2F0aW5nU3RhdGU7XG59O1xudmFyIGZsb2F0aW5nU3RhdGVzTWF0Y2ggPSAoYSwgYikgPT4ge1xuICByZXR1cm4gKGIucGxhY2VtZW50ID09PSB2b2lkIDAgfHwgYS5wbGFjZW1lbnQgPT09IGIucGxhY2VtZW50KSAmJiAoYi54ID09PSB2b2lkIDAgfHwgYS54ID09PSBiLngpICYmIChiLnkgPT09IHZvaWQgMCB8fCBhLnkgPT09IGIueSkgJiYgKGIud2lkdGggPT09IHZvaWQgMCB8fCBhLndpZHRoID09PSBiLndpZHRoKSAmJiAoYi5oZWlnaHQgPT09IHZvaWQgMCB8fCBhLmhlaWdodCA9PT0gYi5oZWlnaHQpICYmIChiLm1heFdpZHRoID09PSB2b2lkIDAgfHwgYS5tYXhXaWR0aCA9PT0gYi5tYXhXaWR0aCkgJiYgKGIubWF4SGVpZ2h0ID09PSB2b2lkIDAgfHwgYS5tYXhIZWlnaHQgPT09IGIubWF4SGVpZ2h0KSAmJiAoYi5hcnJvd1ggPT09IHZvaWQgMCB8fCBhLmFycm93WCA9PT0gYi5hcnJvd1gpICYmIChiLmFycm93WSA9PT0gdm9pZCAwIHx8IGEuYXJyb3dZID09PSBiLmFycm93WSk7XG59O1xudmFyIGZsb2F0aW5nX2RlZmF1bHQgPSBjcmVhdGVGbG9hdGluZztcblxuZXhwb3J0IHsgZmxvYXRpbmdfZGVmYXVsdCBhcyBkZWZhdWx0IH07XG4iLCAiaW1wb3J0IHsgY3JlYXRlTWVtbyB9IGZyb20gJ3NvbGlkLWpzJztcblxuLy8gc3JjL2NyZWF0ZS9vbmNlLnRzXG52YXIgY3JlYXRlT25jZSA9IChmbikgPT4ge1xuICBsZXQgcmVzdWx0O1xuICBsZXQgY2FsbGVkID0gZmFsc2U7XG4gIHJldHVybiAoKSA9PiB7XG4gICAgaWYgKGNhbGxlZCkge1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FsbGVkID0gdHJ1ZTtcbiAgICAgIHJldHVybiByZXN1bHQgPSBjcmVhdGVNZW1vKGZuKTtcbiAgICB9XG4gIH07XG59O1xudmFyIG9uY2VfZGVmYXVsdCA9IGNyZWF0ZU9uY2U7XG5cbmV4cG9ydCB7IG9uY2VfZGVmYXVsdCBhcyBkZWZhdWx0IH07XG4iLCAiaW1wb3J0IHsgYWNjZXNzIH0gZnJvbSAnQGNvcnZ1L3V0aWxzL3JlYWN0aXZpdHknO1xuaW1wb3J0IHsgY3JlYXRlTWVtbywgY3JlYXRlU2lnbmFsLCBjcmVhdGVFZmZlY3QsIHVudHJhY2ssIG9uQ2xlYW51cCB9IGZyb20gJ3NvbGlkLWpzJztcblxuLy8gc3JjL3ByZXNlbmNlLnRzXG52YXIgY3JlYXRlUHJlc2VuY2UgPSAocHJvcHMpID0+IHtcbiAgY29uc3QgcmVmU3R5bGVzID0gY3JlYXRlTWVtbygoKSA9PiB7XG4gICAgY29uc3QgZWxlbWVudCA9IGFjY2Vzcyhwcm9wcy5lbGVtZW50KTtcbiAgICBpZiAoIWVsZW1lbnQpXG4gICAgICByZXR1cm47XG4gICAgcmV0dXJuIGdldENvbXB1dGVkU3R5bGUoZWxlbWVudCk7XG4gIH0pO1xuICBjb25zdCBnZXRBbmltYXRpb25OYW1lID0gKCkgPT4ge1xuICAgIHJldHVybiByZWZTdHlsZXMoKT8uYW5pbWF0aW9uTmFtZSA/PyBcIm5vbmVcIjtcbiAgfTtcbiAgY29uc3QgW3ByZXNlbnRTdGF0ZSwgc2V0UHJlc2VudFN0YXRlXSA9IGNyZWF0ZVNpZ25hbChhY2Nlc3MocHJvcHMuc2hvdykgPyBcInByZXNlbnRcIiA6IFwiaGlkZGVuXCIpO1xuICBsZXQgYW5pbWF0aW9uTmFtZSA9IFwibm9uZVwiO1xuICBjcmVhdGVFZmZlY3QoKHByZXZTaG93KSA9PiB7XG4gICAgY29uc3Qgc2hvdyA9IGFjY2Vzcyhwcm9wcy5zaG93KTtcbiAgICB1bnRyYWNrKCgpID0+IHtcbiAgICAgIGlmIChwcmV2U2hvdyA9PT0gc2hvdylcbiAgICAgICAgcmV0dXJuIHNob3c7XG4gICAgICBjb25zdCBwcmV2QW5pbWF0aW9uTmFtZSA9IGFuaW1hdGlvbk5hbWU7XG4gICAgICBjb25zdCBjdXJyZW50QW5pbWF0aW9uTmFtZSA9IGdldEFuaW1hdGlvbk5hbWUoKTtcbiAgICAgIGlmIChzaG93KSB7XG4gICAgICAgIHNldFByZXNlbnRTdGF0ZShcInByZXNlbnRcIik7XG4gICAgICB9IGVsc2UgaWYgKGN1cnJlbnRBbmltYXRpb25OYW1lID09PSBcIm5vbmVcIiB8fCByZWZTdHlsZXMoKT8uZGlzcGxheSA9PT0gXCJub25lXCIpIHtcbiAgICAgICAgc2V0UHJlc2VudFN0YXRlKFwiaGlkZGVuXCIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgaXNBbmltYXRpbmcgPSBwcmV2QW5pbWF0aW9uTmFtZSAhPT0gY3VycmVudEFuaW1hdGlvbk5hbWU7XG4gICAgICAgIGlmIChwcmV2U2hvdyA9PT0gdHJ1ZSAmJiBpc0FuaW1hdGluZykge1xuICAgICAgICAgIHNldFByZXNlbnRTdGF0ZShcImhpZGluZ1wiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzZXRQcmVzZW50U3RhdGUoXCJoaWRkZW5cIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gc2hvdztcbiAgfSk7XG4gIGNyZWF0ZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3QgZWxlbWVudCA9IGFjY2Vzcyhwcm9wcy5lbGVtZW50KTtcbiAgICBpZiAoIWVsZW1lbnQpXG4gICAgICByZXR1cm47XG4gICAgY29uc3QgaGFuZGxlQW5pbWF0aW9uU3RhcnQgPSAoZXZlbnQpID0+IHtcbiAgICAgIGlmIChldmVudC50YXJnZXQgPT09IGVsZW1lbnQpIHtcbiAgICAgICAgYW5pbWF0aW9uTmFtZSA9IGdldEFuaW1hdGlvbk5hbWUoKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGNvbnN0IGhhbmRsZUFuaW1hdGlvbkVuZCA9IChldmVudCkgPT4ge1xuICAgICAgY29uc3QgY3VycmVudEFuaW1hdGlvbk5hbWUgPSBnZXRBbmltYXRpb25OYW1lKCk7XG4gICAgICBjb25zdCBpc0N1cnJlbnRBbmltYXRpb24gPSBjdXJyZW50QW5pbWF0aW9uTmFtZS5pbmNsdWRlcyhcbiAgICAgICAgZXZlbnQuYW5pbWF0aW9uTmFtZVxuICAgICAgKTtcbiAgICAgIGlmIChldmVudC50YXJnZXQgPT09IGVsZW1lbnQgJiYgaXNDdXJyZW50QW5pbWF0aW9uICYmIHByZXNlbnRTdGF0ZSgpID09PSBcImhpZGluZ1wiKSB7XG4gICAgICAgIHNldFByZXNlbnRTdGF0ZShcImhpZGRlblwiKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImFuaW1hdGlvbnN0YXJ0XCIsIGhhbmRsZUFuaW1hdGlvblN0YXJ0KTtcbiAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJhbmltYXRpb25jYW5jZWxcIiwgaGFuZGxlQW5pbWF0aW9uRW5kKTtcbiAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJhbmltYXRpb25lbmRcIiwgaGFuZGxlQW5pbWF0aW9uRW5kKTtcbiAgICBvbkNsZWFudXAoKCkgPT4ge1xuICAgICAgZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwiYW5pbWF0aW9uc3RhcnRcIiwgaGFuZGxlQW5pbWF0aW9uU3RhcnQpO1xuICAgICAgZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwiYW5pbWF0aW9uY2FuY2VsXCIsIGhhbmRsZUFuaW1hdGlvbkVuZCk7XG4gICAgICBlbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJhbmltYXRpb25lbmRcIiwgaGFuZGxlQW5pbWF0aW9uRW5kKTtcbiAgICB9KTtcbiAgfSk7XG4gIHJldHVybiB7XG4gICAgcHJlc2VudDogKCkgPT4gcHJlc2VudFN0YXRlKCkgPT09IFwicHJlc2VudFwiIHx8IHByZXNlbnRTdGF0ZSgpID09PSBcImhpZGluZ1wiLFxuICAgIHN0YXRlOiBwcmVzZW50U3RhdGVcbiAgfTtcbn07XG52YXIgcHJlc2VuY2VfZGVmYXVsdCA9IGNyZWF0ZVByZXNlbmNlO1xuXG4vLyBzcmMvaW5kZXgudHNcbnZhciBzcmNfZGVmYXVsdCA9IHByZXNlbmNlX2RlZmF1bHQ7XG5cbmV4cG9ydCB7IHNyY19kZWZhdWx0IGFzIGRlZmF1bHQgfTtcbiIsICJpbXBvcnQgeyBhZnRlclBhaW50IH0gZnJvbSAnLi4vY2h1bmsvVVhUSE9DQ1UuanMnO1xuaW1wb3J0IHsgYWNjZXNzIH0gZnJvbSAnLi4vY2h1bmsvT1pDSTRORE4uanMnO1xuaW1wb3J0IHsgY3JlYXRlRWZmZWN0LCBvbkNsZWFudXAsIHVudHJhY2sgfSBmcm9tICdzb2xpZC1qcyc7XG5cbnZhciB0b29sdGlwR3JvdXBzID0gLyogQF9fUFVSRV9fICovIG5ldyBNYXAoKTtcbnZhciByZWdpc3RlclRvb2x0aXAgPSAoZ3JvdXAsIGlkLCBjbG9zZSkgPT4ge1xuICBpZiAoIXRvb2x0aXBHcm91cHMuaGFzKGdyb3VwKSkge1xuICAgIHRvb2x0aXBHcm91cHMuc2V0KGdyb3VwLCB7XG4gICAgICBza2lwRGVsYXk6IGZhbHNlLFxuICAgICAgc2tpcERlbGF5VGltZW91dDogbnVsbCxcbiAgICAgIHRvb2x0aXBzOiBbXVxuICAgIH0pO1xuICB9XG4gIHRvb2x0aXBHcm91cHMuZ2V0KGdyb3VwKS50b29sdGlwcy5wdXNoKHsgaWQsIGNsb3NlIH0pO1xufTtcbnZhciB1bnJlZ2lzdGVyVG9vbHRpcCA9IChncm91cCwgaWQpID0+IHtcbiAgY29uc3QgdG9vbHRpcEdyb3VwID0gdG9vbHRpcEdyb3Vwcy5nZXQoZ3JvdXApO1xuICBpZiAoIXRvb2x0aXBHcm91cClcbiAgICByZXR1cm47XG4gIGNvbnN0IGluZGV4ID0gdG9vbHRpcEdyb3VwLnRvb2x0aXBzLmZpbmRJbmRleCgodG9vbHRpcCkgPT4gdG9vbHRpcC5pZCA9PT0gaWQpO1xuICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgdG9vbHRpcEdyb3VwLnRvb2x0aXBzLnNwbGljZShpbmRleCwgMSk7XG4gIH1cbn07XG52YXIgY2xvc2VUb29sdGlwR3JvdXAgPSAoZ3JvdXAsIGlkKSA9PiB7XG4gIGNvbnN0IHRvb2x0aXBHcm91cCA9IHRvb2x0aXBHcm91cHMuZ2V0KGdyb3VwKTtcbiAgaWYgKCF0b29sdGlwR3JvdXApXG4gICAgcmV0dXJuO1xuICB0b29sdGlwR3JvdXAudG9vbHRpcHMuZm9yRWFjaCgodG9vbHRpcCkgPT4ge1xuICAgIGlmICh0b29sdGlwLmlkICE9PSBpZCkge1xuICAgICAgdG9vbHRpcC5jbG9zZSgpO1xuICAgIH1cbiAgfSk7XG59O1xudmFyIGNyZWF0ZVRvb2x0aXAgPSAocHJvcHMpID0+IHtcbiAgbGV0IHRvb2x0aXBTdGF0ZSA9IG51bGw7XG4gIGxldCBjbGlja2VkVHJpZ2dlciA9IGZhbHNlO1xuICBsZXQgdGltZW91dCA9IG51bGw7XG4gIGxldCBpbnNpZGVTYWZlQXJlYSA9IGZhbHNlO1xuICBsZXQgbG9jYWxTa2lwRGVsYXkgPSBmYWxzZTtcbiAgbGV0IGxvY2FsU2tpcERlbGF5VGltZW91dCA9IG51bGw7XG4gIGNvbnN0IGdldFNraXBEZWxheSA9ICgpID0+IHtcbiAgICBjb25zdCBncm91cCA9IGFjY2Vzcyhwcm9wcy5ncm91cCk7XG4gICAgaWYgKGdyb3VwID09PSBudWxsKVxuICAgICAgcmV0dXJuIGxvY2FsU2tpcERlbGF5O1xuICAgIHJldHVybiB0b29sdGlwR3JvdXBzLmdldChncm91cCkuc2tpcERlbGF5O1xuICB9O1xuICBjb25zdCBzZXRTa2lwRGVsYXkgPSAodmFsdWUpID0+IHtcbiAgICBjb25zdCBncm91cCA9IGFjY2Vzcyhwcm9wcy5ncm91cCk7XG4gICAgaWYgKGdyb3VwID09PSBudWxsKVxuICAgICAgcmV0dXJuIGxvY2FsU2tpcERlbGF5ID0gdmFsdWU7XG4gICAgdG9vbHRpcEdyb3Vwcy5nZXQoZ3JvdXApLnNraXBEZWxheSA9IHZhbHVlO1xuICB9O1xuICBjb25zdCBzZXRTa2lwRGVsYXlUaW1lb3V0ID0gKHZhbHVlKSA9PiB7XG4gICAgY29uc3QgZ3JvdXAgPSBhY2Nlc3MocHJvcHMuZ3JvdXApO1xuICAgIGlmIChncm91cCA9PT0gbnVsbClcbiAgICAgIHJldHVybiBsb2NhbFNraXBEZWxheVRpbWVvdXQgPSB2YWx1ZTtcbiAgICB0b29sdGlwR3JvdXBzLmdldChncm91cCkuc2tpcERlbGF5VGltZW91dCA9IHZhbHVlO1xuICB9O1xuICBjb25zdCBnZXRTa2lwRGVsYXlUaW1lb3V0ID0gKCkgPT4ge1xuICAgIGNvbnN0IGdyb3VwID0gYWNjZXNzKHByb3BzLmdyb3VwKTtcbiAgICBpZiAoZ3JvdXAgPT09IG51bGwpXG4gICAgICByZXR1cm4gbG9jYWxTa2lwRGVsYXlUaW1lb3V0O1xuICAgIHJldHVybiB0b29sdGlwR3JvdXBzLmdldChncm91cCkuc2tpcERlbGF5VGltZW91dDtcbiAgfTtcbiAgY3JlYXRlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBncm91cCA9IGFjY2Vzcyhwcm9wcy5ncm91cCk7XG4gICAgY29uc3QgaWQgPSBhY2Nlc3MocHJvcHMuaWQpO1xuICAgIGlmIChncm91cCA9PT0gbnVsbClcbiAgICAgIHJldHVybjtcbiAgICByZWdpc3RlclRvb2x0aXAoZ3JvdXAsIGlkLCAoKSA9PiB7XG4gICAgICB0b29sdGlwU3RhdGUgPSBudWxsO1xuICAgICAgcHJvcHMuY2xvc2UoKTtcbiAgICB9KTtcbiAgICBvbkNsZWFudXAoKCkgPT4ge1xuICAgICAgdW5yZWdpc3RlclRvb2x0aXAoZ3JvdXAsIGlkKTtcbiAgICB9KTtcbiAgfSk7XG4gIGNyZWF0ZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKCFwcm9wcy5vcGVuKCkpXG4gICAgICByZXR1cm47XG4gICAgdW50cmFjaygoKSA9PiB7XG4gICAgICBjb25zdCBncm91cCA9IGFjY2Vzcyhwcm9wcy5ncm91cCk7XG4gICAgICBpZiAoZ3JvdXAgPT09IG51bGwpXG4gICAgICAgIHJldHVybjtcbiAgICAgIGNsb3NlVG9vbHRpcEdyb3VwKGdyb3VwLCBhY2Nlc3MocHJvcHMuaWQpKTtcbiAgICB9KTtcbiAgfSk7XG4gIGNyZWF0ZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKCFhY2Nlc3MocHJvcHMub3Blbk9uSG92ZXIpKVxuICAgICAgcmV0dXJuO1xuICAgIGNvbnN0IHRyaWdnZXIgPSBhY2Nlc3MocHJvcHMudHJpZ2dlcik7XG4gICAgaWYgKCF0cmlnZ2VyKVxuICAgICAgcmV0dXJuO1xuICAgIGNvbnN0IG9uUG9pbnRlckVudGVyID0gKGV2ZW50KSA9PiBhZnRlclBhaW50KCgpID0+IG9wZW5Ub29sdGlwKFwiaG92ZXJcIiwgZXZlbnQpKTtcbiAgICBjb25zdCBvblBvaW50ZXJEb3duID0gKGV2ZW50KSA9PiB7XG4gICAgICBjbGlja2VkVHJpZ2dlciA9IHRydWU7XG4gICAgICBjbG9zZVRvb2x0aXAoXCJjbGlja1wiLCBldmVudCk7XG4gICAgfTtcbiAgICBjb25zdCBvblBvaW50ZXJMZWF2ZSA9IChldmVudCkgPT4ge1xuICAgICAgaWYgKHRvb2x0aXBTdGF0ZSA9PT0gXCJob3ZlclwiKVxuICAgICAgICByZXR1cm47XG4gICAgICBjbG9zZVRvb2x0aXAoXCJsZWF2ZVwiLCBldmVudCk7XG4gICAgfTtcbiAgICB0cmlnZ2VyLmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVyZW50ZXJcIiwgb25Qb2ludGVyRW50ZXIpO1xuICAgIHRyaWdnZXIuYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJkb3duXCIsIG9uUG9pbnRlckRvd24pO1xuICAgIHRyaWdnZXIuYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJsZWF2ZVwiLCBvblBvaW50ZXJMZWF2ZSk7XG4gICAgb25DbGVhbnVwKCgpID0+IHtcbiAgICAgIHRyaWdnZXIucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJlbnRlclwiLCBvblBvaW50ZXJFbnRlcik7XG4gICAgICB0cmlnZ2VyLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJwb2ludGVyZG93blwiLCBvblBvaW50ZXJEb3duKTtcbiAgICAgIHRyaWdnZXIucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJsZWF2ZVwiLCBvblBvaW50ZXJMZWF2ZSk7XG4gICAgfSk7XG4gIH0pO1xuICBjcmVhdGVFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghYWNjZXNzKHByb3BzLm9wZW5PbkZvY3VzKSlcbiAgICAgIHJldHVybjtcbiAgICBjb25zdCB0cmlnZ2VyID0gYWNjZXNzKHByb3BzLnRyaWdnZXIpO1xuICAgIGlmICghdHJpZ2dlcilcbiAgICAgIHJldHVybjtcbiAgICBjb25zdCBvbkZvY3VzID0gKGV2ZW50KSA9PiBvcGVuVG9vbHRpcChcImZvY3VzXCIsIGV2ZW50KTtcbiAgICBjb25zdCBvbkJsdXIgPSAoZXZlbnQpID0+IGNsb3NlVG9vbHRpcChcImJsdXJcIiwgZXZlbnQpO1xuICAgIHRyaWdnZXIuYWRkRXZlbnRMaXN0ZW5lcihcImZvY3VzXCIsIG9uRm9jdXMpO1xuICAgIHRyaWdnZXIuYWRkRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgb25CbHVyKTtcbiAgICBvbkNsZWFudXAoKCkgPT4ge1xuICAgICAgdHJpZ2dlci5yZW1vdmVFdmVudExpc3RlbmVyKFwiZm9jdXNcIiwgb25Gb2N1cyk7XG4gICAgICB0cmlnZ2VyLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJibHVyXCIsIG9uQmx1cik7XG4gICAgfSk7XG4gIH0pO1xuICBjcmVhdGVFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghYWNjZXNzKHByb3BzLmhvdmVyYWJsZUNvbnRlbnQpKVxuICAgICAgcmV0dXJuO1xuICAgIGNvbnN0IGNvbnRlbnQgPSBhY2Nlc3MocHJvcHMuY29udGVudCk7XG4gICAgaWYgKCFjb250ZW50KVxuICAgICAgcmV0dXJuO1xuICAgIGNvbnN0IG9uUG9pbnRlckRvd24gPSAoZXZlbnQpID0+IHtcbiAgICAgIGlmIChldmVudC5wb2ludGVyVHlwZSA9PT0gXCJ0b3VjaFwiKVxuICAgICAgICByZXR1cm47XG4gICAgICBpZiAodG9vbHRpcFN0YXRlICE9PSBcImZvY3VzXCIpXG4gICAgICAgIHJldHVybjtcbiAgICAgIHRvb2x0aXBTdGF0ZSA9IFwiaG92ZXJcIjtcbiAgICB9O1xuICAgIGNvbnRlbnQuYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJkb3duXCIsIG9uUG9pbnRlckRvd24pO1xuICAgIG9uQ2xlYW51cCgoKSA9PiB7XG4gICAgICBjb250ZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJwb2ludGVyZG93blwiLCBvblBvaW50ZXJEb3duKTtcbiAgICB9KTtcbiAgfSk7XG4gIGNvbnN0IG9wZW5Ub29sdGlwID0gKHJlYXNvbiwgZXZlbnQpID0+IHtcbiAgICByZXNldFRpbWVvdXQoKTtcbiAgICBzd2l0Y2ggKHJlYXNvbikge1xuICAgICAgY2FzZSBcImZvY3VzXCI6XG4gICAgICAgIGlmIChjbGlja2VkVHJpZ2dlcilcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIHRvb2x0aXBTdGF0ZSA9IFwiZm9jdXNcIjtcbiAgICAgICAgcHJvcHMub25Gb2N1cz8uKGV2ZW50KTtcbiAgICAgICAgaWYgKGFjY2Vzcyhwcm9wcy5jbG9zZU9uU2Nyb2xsKSkge1xuICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJzY3JvbGxcIiwgb25TY3JvbGwsIHsgY2FwdHVyZTogdHJ1ZSB9KTtcbiAgICAgICAgfVxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcm1vdmVcIiwgb25TYWZlQXJlYU1vdmUpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJob3ZlclwiOlxuICAgICAgICBjb25zdCBwb2ludGVyRXZlbnQgPSBldmVudDtcbiAgICAgICAgaWYgKHBvaW50ZXJFdmVudC5wb2ludGVyVHlwZSA9PT0gXCJ0b3VjaFwiKVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgaWYgKHRvb2x0aXBTdGF0ZSA9PT0gXCJmb2N1c1wiIHx8IHRvb2x0aXBTdGF0ZSA9PT0gXCJob3ZlclwiKVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgY29uc3Qgb3BlbkRlbGF5ID0gYWNjZXNzKHByb3BzLm9wZW5EZWxheSk7XG4gICAgICAgIGlmIChvcGVuRGVsYXkgPD0gMCB8fCBnZXRTa2lwRGVsYXkoKSkge1xuICAgICAgICAgIHRvb2x0aXBTdGF0ZSA9IFwiaG92ZXJcIjtcbiAgICAgICAgICBwcm9wcy5vbkhvdmVyPy4ocG9pbnRlckV2ZW50KTtcbiAgICAgICAgICBpbnNpZGVTYWZlQXJlYSA9IHRydWU7XG4gICAgICAgICAgaWYgKGFjY2Vzcyhwcm9wcy5jbG9zZU9uU2Nyb2xsKSkge1xuICAgICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcInNjcm9sbFwiLCBvblNjcm9sbCwgeyBjYXB0dXJlOiB0cnVlIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcm1vdmVcIiwgb25TYWZlQXJlYU1vdmUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgICAgICAgdG9vbHRpcFN0YXRlID0gXCJob3ZlclwiO1xuICAgICAgICAgICAgcHJvcHMub25Ib3Zlcj8uKHBvaW50ZXJFdmVudCk7XG4gICAgICAgICAgICBpbnNpZGVTYWZlQXJlYSA9IHRydWU7XG4gICAgICAgICAgICBpZiAoYWNjZXNzKHByb3BzLmNsb3NlT25TY3JvbGwpKSB7XG4gICAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJzY3JvbGxcIiwgb25TY3JvbGwsIHsgY2FwdHVyZTogdHJ1ZSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVybW92ZVwiLCBvblNhZmVBcmVhTW92ZSk7XG4gICAgICAgICAgfSwgb3BlbkRlbGF5KTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICB9XG4gIH07XG4gIGNvbnN0IGNsb3NlVG9vbHRpcCA9IChyZWFzb24sIGV2ZW50KSA9PiB7XG4gICAgcmVzZXRUaW1lb3V0KCk7XG4gICAgc3dpdGNoIChyZWFzb24pIHtcbiAgICAgIGNhc2UgXCJibHVyXCI6XG4gICAgICAgIGNsaWNrZWRUcmlnZ2VyID0gZmFsc2U7XG4gICAgICAgIGlmIChpbnNpZGVTYWZlQXJlYSkge1xuICAgICAgICAgIHRvb2x0aXBTdGF0ZSA9IFwiaG92ZXJcIjtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdG9vbHRpcFN0YXRlID0gbnVsbDtcbiAgICAgICAgcHJvcHMub25CbHVyPy4oZXZlbnQpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJsZWF2ZVwiOlxuICAgICAgICBpZiAodG9vbHRpcFN0YXRlICE9PSBcImhvdmVyXCIpXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICBjb25zdCBjbG9zZURlbGF5ID0gYWNjZXNzKHByb3BzLmNsb3NlRGVsYXkpO1xuICAgICAgICBpZiAoY2xvc2VEZWxheSA8PSAwKSB7XG4gICAgICAgICAgaW5pdFNraXBEZWxheSgpO1xuICAgICAgICAgIHRvb2x0aXBTdGF0ZSA9IG51bGw7XG4gICAgICAgICAgcHJvcHMub25MZWF2ZT8uKGV2ZW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChpbnNpZGVTYWZlQXJlYSlcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgaW5pdFNraXBEZWxheSgpO1xuICAgICAgICAgICAgdG9vbHRpcFN0YXRlID0gbnVsbDtcbiAgICAgICAgICAgIHByb3BzLm9uTGVhdmU/LihldmVudCk7XG4gICAgICAgICAgfSwgY2xvc2VEZWxheSk7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwiY2xpY2tcIjpcbiAgICAgICAgaWYgKCFhY2Nlc3MocHJvcHMuY2xvc2VPblBvaW50ZXJEb3duKSlcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIHRvb2x0aXBTdGF0ZSA9IG51bGw7XG4gICAgICAgIHByb3BzLm9uUG9pbnRlckRvd24/LihldmVudCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcInNjcm9sbFwiOlxuICAgICAgICB0b29sdGlwU3RhdGUgPSBudWxsO1xuICAgICAgICBwcm9wcy5vblNjcm9sbD8uKGV2ZW50KTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9O1xuICBjb25zdCBvblNhZmVBcmVhTW92ZSA9IChldmVudCkgPT4ge1xuICAgIGNvbnN0IHBvaW50cyA9IFtdO1xuICAgIGNvbnN0IHRyaWdnZXIgPSBhY2Nlc3MocHJvcHMudHJpZ2dlcik7XG4gICAgaWYgKCF0cmlnZ2VyKVxuICAgICAgcmV0dXJuO1xuICAgIHBvaW50cy5wdXNoKC4uLmdldFBvaW50c0Zyb21SZWN0KHRyaWdnZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkpKTtcbiAgICBpZiAoYWNjZXNzKHByb3BzLmhvdmVyYWJsZUNvbnRlbnQpKSB7XG4gICAgICBjb25zdCBjb250ZW50ID0gYWNjZXNzKHByb3BzLmNvbnRlbnQpO1xuICAgICAgaWYgKGNvbnRlbnQpIHtcbiAgICAgICAgcG9pbnRzLnB1c2goLi4uZ2V0UG9pbnRzRnJvbVJlY3QoY29udGVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSkpO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBzYWZlQXJlYVBvbHlnb24gPSBjYWxjdWxhdGVTYWZlQXJlYVBvbHlnb24ocG9pbnRzKTtcbiAgICBpZiAodG9vbHRpcFN0YXRlID09PSBudWxsKSB7XG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwicG9pbnRlcm1vdmVcIiwgb25TYWZlQXJlYU1vdmUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoIXBvaW50SW5Qb2x5Z29uKHsgeDogZXZlbnQuY2xpZW50WCwgeTogZXZlbnQuY2xpZW50WSB9LCBzYWZlQXJlYVBvbHlnb24pKSB7XG4gICAgICBpZiAoaW5zaWRlU2FmZUFyZWEgJiYgdG9vbHRpcFN0YXRlID09PSBcImhvdmVyXCIpIHtcbiAgICAgICAgaW5zaWRlU2FmZUFyZWEgPSBmYWxzZTtcbiAgICAgICAgY2xvc2VUb29sdGlwKFwibGVhdmVcIiwgZXZlbnQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaW5zaWRlU2FmZUFyZWEgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaW5zaWRlU2FmZUFyZWEgPSB0cnVlO1xuICAgIH1cbiAgfTtcbiAgY29uc3Qgb25TY3JvbGwgPSAoZXZlbnQpID0+IHtcbiAgICBjb25zdCB0cmlnZ2VyID0gYWNjZXNzKHByb3BzLnRyaWdnZXIpO1xuICAgIGlmICh0b29sdGlwU3RhdGUgPT09IG51bGwgfHwgIXRyaWdnZXIpIHtcbiAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJzY3JvbGxcIiwgb25TY3JvbGwpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoIWV2ZW50LnRhcmdldC5jb250YWlucyh0cmlnZ2VyKSlcbiAgICAgIHJldHVybjtcbiAgICBjbG9zZVRvb2x0aXAoXCJzY3JvbGxcIiwgZXZlbnQpO1xuICB9O1xuICBjb25zdCByZXNldFRpbWVvdXQgPSAoKSA9PiB7XG4gICAgaWYgKHRpbWVvdXQgIT09IG51bGwpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgIH1cbiAgfTtcbiAgY29uc3QgaW5pdFNraXBEZWxheSA9ICgpID0+IHtcbiAgICBjb25zdCBza2lwRGVsYXlEdXJhdGlvbiA9IGFjY2Vzcyhwcm9wcy5za2lwRGVsYXlEdXJhdGlvbik7XG4gICAgaWYgKHNraXBEZWxheUR1cmF0aW9uID4gMCkge1xuICAgICAgY29uc3Qgc2tpcERlbGF5VGltZW91dCA9IGdldFNraXBEZWxheVRpbWVvdXQoKTtcbiAgICAgIGlmIChza2lwRGVsYXlUaW1lb3V0ICE9PSBudWxsKSB7XG4gICAgICAgIGNsZWFyVGltZW91dChza2lwRGVsYXlUaW1lb3V0KTtcbiAgICAgICAgc2V0U2tpcERlbGF5VGltZW91dChudWxsKTtcbiAgICAgIH1cbiAgICAgIHNldFNraXBEZWxheSh0cnVlKTtcbiAgICAgIHNldFNraXBEZWxheVRpbWVvdXQoXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHNldFNraXBEZWxheVRpbWVvdXQobnVsbCk7XG4gICAgICAgICAgc2V0U2tpcERlbGF5KGZhbHNlKTtcbiAgICAgICAgfSwgc2tpcERlbGF5RHVyYXRpb24pXG4gICAgICApO1xuICAgIH1cbiAgfTtcbn07XG52YXIgZ2V0UG9pbnRzRnJvbVJlY3QgPSAocmVjdCkgPT4ge1xuICByZXR1cm4gW1xuICAgIHsgeDogcmVjdC5sZWZ0LCB5OiByZWN0LnRvcCB9LFxuICAgIHsgeDogcmVjdC5sZWZ0LCB5OiByZWN0LmJvdHRvbSB9LFxuICAgIHsgeDogcmVjdC5yaWdodCwgeTogcmVjdC50b3AgfSxcbiAgICB7IHg6IHJlY3QucmlnaHQsIHk6IHJlY3QuYm90dG9tIH1cbiAgXTtcbn07XG52YXIgcG9pbnRJblBvbHlnb24gPSAocG9pbnQsIHBvbHlnb24pID0+IHtcbiAgbGV0IGluc2lkZSA9IGZhbHNlO1xuICBmb3IgKGxldCBwMSA9IDAsIHAyID0gcG9seWdvbi5sZW5ndGggLSAxOyBwMSA8IHBvbHlnb24ubGVuZ3RoOyBwMiA9IHAxKyspIHtcbiAgICBjb25zdCB4MSA9IHBvbHlnb25bcDFdLngsIHkxID0gcG9seWdvbltwMV0ueSwgeDIgPSBwb2x5Z29uW3AyXS54LCB5MiA9IHBvbHlnb25bcDJdLnk7XG4gICAgaWYgKHBvaW50LnkgPCB5MSAhPT0gcG9pbnQueSA8IHkyICYmIHBvaW50LnggPCB4MSArIChwb2ludC55IC0geTEpIC8gKHkyIC0geTEpICogKHgyIC0geDEpKSB7XG4gICAgICBpbnNpZGUgPSAhaW5zaWRlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gaW5zaWRlO1xufTtcbnZhciBjYWxjdWxhdGVTYWZlQXJlYVBvbHlnb24gPSAocG9pbnRzKSA9PiB7XG4gIHBvaW50cy5zb3J0KChhLCBiKSA9PiB7XG4gICAgaWYgKGEueCA8IGIueClcbiAgICAgIHJldHVybiAtMTtcbiAgICBlbHNlIGlmIChhLnggPiBiLngpXG4gICAgICByZXR1cm4gMTtcbiAgICBlbHNlIGlmIChhLnkgPCBiLnkpXG4gICAgICByZXR1cm4gLTE7XG4gICAgZWxzZSBpZiAoYS55ID4gYi55KVxuICAgICAgcmV0dXJuIDE7XG4gICAgZWxzZVxuICAgICAgcmV0dXJuIDA7XG4gIH0pO1xuICBpZiAocG9pbnRzLmxlbmd0aCA8PSAxKVxuICAgIHJldHVybiBwb2ludHM7XG4gIGNvbnN0IHVwcGVySHVsbCA9IFtdO1xuICBmb3IgKGNvbnN0IHAgb2YgcG9pbnRzKSB7XG4gICAgd2hpbGUgKHVwcGVySHVsbC5sZW5ndGggPj0gMikge1xuICAgICAgY29uc3QgcSA9IHVwcGVySHVsbFt1cHBlckh1bGwubGVuZ3RoIC0gMV07XG4gICAgICBjb25zdCByID0gdXBwZXJIdWxsW3VwcGVySHVsbC5sZW5ndGggLSAyXTtcbiAgICAgIGlmICgocS54IC0gci54KSAqIChwLnkgLSByLnkpID49IChxLnkgLSByLnkpICogKHAueCAtIHIueCkpIHtcbiAgICAgICAgdXBwZXJIdWxsLnBvcCgpO1xuICAgICAgfSBlbHNlXG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICB1cHBlckh1bGwucHVzaChwKTtcbiAgfVxuICB1cHBlckh1bGwucG9wKCk7XG4gIGNvbnN0IGxvd2VySHVsbCA9IFtdO1xuICBmb3IgKGxldCBwb2ludEluZGV4ID0gcG9pbnRzLmxlbmd0aCAtIDE7IHBvaW50SW5kZXggPj0gMDsgcG9pbnRJbmRleC0tKSB7XG4gICAgY29uc3QgcCA9IHBvaW50c1twb2ludEluZGV4XTtcbiAgICB3aGlsZSAobG93ZXJIdWxsLmxlbmd0aCA+PSAyKSB7XG4gICAgICBjb25zdCBxID0gbG93ZXJIdWxsW2xvd2VySHVsbC5sZW5ndGggLSAxXTtcbiAgICAgIGNvbnN0IHIgPSBsb3dlckh1bGxbbG93ZXJIdWxsLmxlbmd0aCAtIDJdO1xuICAgICAgaWYgKChxLnggLSByLngpICogKHAueSAtIHIueSkgPj0gKHEueSAtIHIueSkgKiAocC54IC0gci54KSkge1xuICAgICAgICBsb3dlckh1bGwucG9wKCk7XG4gICAgICB9IGVsc2VcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGxvd2VySHVsbC5wdXNoKHApO1xuICB9XG4gIGxvd2VySHVsbC5wb3AoKTtcbiAgaWYgKHVwcGVySHVsbC5sZW5ndGggPT0gMSAmJiBsb3dlckh1bGwubGVuZ3RoID09IDEgJiYgdXBwZXJIdWxsWzBdLnggPT0gbG93ZXJIdWxsWzBdLnggJiYgdXBwZXJIdWxsWzBdLnkgPT0gbG93ZXJIdWxsWzBdLnkpIHtcbiAgICByZXR1cm4gdXBwZXJIdWxsO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB1cHBlckh1bGwuY29uY2F0KGxvd2VySHVsbCk7XG4gIH1cbn07XG52YXIgdG9vbHRpcF9kZWZhdWx0ID0gY3JlYXRlVG9vbHRpcDtcblxuZXhwb3J0IHsgdG9vbHRpcF9kZWZhdWx0IGFzIGRlZmF1bHQgfTtcbiIsICJpbXBvcnQgeyBjcmVhdGVDb21wb25lbnQsIG1lcmdlUHJvcHMsIFBvcnRhbCwgbWVtbyB9IGZyb20gJ3NvbGlkLWpzL3dlYic7XG5pbXBvcnQgeyBjcmVhdGVDb250ZXh0LCB1c2VDb250ZXh0LCBzcGxpdFByb3BzLCBjcmVhdGVNZW1vLCBTaG93LCBtZXJnZVByb3BzIGFzIG1lcmdlUHJvcHMkMSwgY3JlYXRlVW5pcXVlSWQsIGNyZWF0ZVNpZ25hbCwgdW50cmFjayB9IGZyb20gJ3NvbGlkLWpzJztcbmltcG9ydCB7IER5bmFtaWMsIER5bmFtaWNCdXR0b24gfSBmcm9tICdAY29ydnUvdXRpbHMvZHluYW1pYyc7XG5pbXBvcnQgeyBtZXJnZVJlZnMsIHNvbWUgfSBmcm9tICdAY29ydnUvdXRpbHMvcmVhY3Rpdml0eSc7XG5pbXBvcnQgeyB1c2VLZXllZENvbnRleHQsIGNyZWF0ZUtleWVkQ29udGV4dCB9IGZyb20gJ0Bjb3J2dS91dGlscy9jcmVhdGUva2V5ZWRDb250ZXh0JztcbmltcG9ydCBGbG9hdGluZ0Fycm93IGZyb20gJ0Bjb3J2dS91dGlscy9jb21wb25lbnRzL0Zsb2F0aW5nQXJyb3cnO1xuaW1wb3J0IHsgZGF0YUlmLCBpc0Z1bmN0aW9uIH0gZnJvbSAnQGNvcnZ1L3V0aWxzJztcbmltcG9ydCBEaXNtaXNzaWJsZSBmcm9tICdAY29ydnUvdXRpbHMvY29tcG9uZW50cy9EaXNtaXNzaWJsZSc7XG5pbXBvcnQgeyBnZXRGbG9hdGluZ1N0eWxlIH0gZnJvbSAnQGNvcnZ1L3V0aWxzL2Zsb2F0aW5nJztcbmltcG9ydCB7IGNhbGxFdmVudEhhbmRsZXIgfSBmcm9tICdAY29ydnUvdXRpbHMvZG9tJztcbmltcG9ydCBjcmVhdGVDb250cm9sbGFibGVTaWduYWwgZnJvbSAnQGNvcnZ1L3V0aWxzL2NyZWF0ZS9jb250cm9sbGFibGVTaWduYWwnO1xuaW1wb3J0IGNyZWF0ZUZsb2F0aW5nIGZyb20gJ0Bjb3J2dS91dGlscy9jcmVhdGUvZmxvYXRpbmcnO1xuaW1wb3J0IGNyZWF0ZU9uY2UgZnJvbSAnQGNvcnZ1L3V0aWxzL2NyZWF0ZS9vbmNlJztcbmltcG9ydCBjcmVhdGVQcmVzZW5jZSBmcm9tICdzb2xpZC1wcmVzZW5jZSc7XG5pbXBvcnQgY3JlYXRlVG9vbHRpcCBmcm9tICdAY29ydnUvdXRpbHMvY3JlYXRlL3Rvb2x0aXAnO1xuXG4vLyBzcmMvQW5jaG9yLnRzeFxudmFyIFRvb2x0aXBDb250ZXh0ID0gY3JlYXRlQ29udGV4dCgpO1xudmFyIGNyZWF0ZVRvb2x0aXBDb250ZXh0ID0gKGNvbnRleHRJZCkgPT4ge1xuICBpZiAoY29udGV4dElkID09PSB2b2lkIDApXG4gICAgcmV0dXJuIFRvb2x0aXBDb250ZXh0O1xuICBjb25zdCBjb250ZXh0ID0gY3JlYXRlS2V5ZWRDb250ZXh0KFxuICAgIGB0b29sdGlwLSR7Y29udGV4dElkfWBcbiAgKTtcbiAgcmV0dXJuIGNvbnRleHQ7XG59O1xudmFyIHVzZVRvb2x0aXBDb250ZXh0ID0gKGNvbnRleHRJZCkgPT4ge1xuICBpZiAoY29udGV4dElkID09PSB2b2lkIDApIHtcbiAgICBjb25zdCBjb250ZXh0MiA9IHVzZUNvbnRleHQoVG9vbHRpcENvbnRleHQpO1xuICAgIGlmICghY29udGV4dDIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgXCJbY29ydnVdOiBUb29sdGlwIGNvbnRleHQgbm90IGZvdW5kLiBNYWtlIHN1cmUgdG8gd3JhcCBUb29sdGlwIGNvbXBvbmVudHMgaW4gPFRvb2x0aXAuUm9vdD5cIlxuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbnRleHQyO1xuICB9XG4gIGNvbnN0IGNvbnRleHQgPSB1c2VLZXllZENvbnRleHQoYHRvb2x0aXAtJHtjb250ZXh0SWR9YCk7XG4gIGlmICghY29udGV4dCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBbY29ydnVdOiBUb29sdGlwIGNvbnRleHQgd2l0aCBpZCBcIiR7Y29udGV4dElkfVwiIG5vdCBmb3VuZC4gTWFrZSBzdXJlIHRvIHdyYXAgVG9vbHRpcCBjb21wb25lbnRzIGluIDxUb29sdGlwLlJvb3QgY29udGV4dElkPVwiJHtjb250ZXh0SWR9XCI+YFxuICAgICk7XG4gIH1cbiAgcmV0dXJuIGNvbnRleHQ7XG59O1xudmFyIEludGVybmFsVG9vbHRpcENvbnRleHQgPSBjcmVhdGVDb250ZXh0KCk7XG52YXIgY3JlYXRlSW50ZXJuYWxUb29sdGlwQ29udGV4dCA9IChjb250ZXh0SWQpID0+IHtcbiAgaWYgKGNvbnRleHRJZCA9PT0gdm9pZCAwKVxuICAgIHJldHVybiBJbnRlcm5hbFRvb2x0aXBDb250ZXh0O1xuICBjb25zdCBjb250ZXh0ID0gY3JlYXRlS2V5ZWRDb250ZXh0KFxuICAgIGB0b29sdGlwLWludGVybmFsLSR7Y29udGV4dElkfWBcbiAgKTtcbiAgcmV0dXJuIGNvbnRleHQ7XG59O1xudmFyIHVzZUludGVybmFsVG9vbHRpcENvbnRleHQgPSAoY29udGV4dElkKSA9PiB7XG4gIGlmIChjb250ZXh0SWQgPT09IHZvaWQgMCkge1xuICAgIGNvbnN0IGNvbnRleHQyID0gdXNlQ29udGV4dChJbnRlcm5hbFRvb2x0aXBDb250ZXh0KTtcbiAgICBpZiAoIWNvbnRleHQyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIFwiW2NvcnZ1XTogVG9vbHRpcCBjb250ZXh0IG5vdCBmb3VuZC4gTWFrZSBzdXJlIHRvIHdyYXAgVG9vbHRpcCBjb21wb25lbnRzIGluIDxUb29sdGlwLlJvb3Q+XCJcbiAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiBjb250ZXh0MjtcbiAgfVxuICBjb25zdCBjb250ZXh0ID0gdXNlS2V5ZWRDb250ZXh0KFxuICAgIGB0b29sdGlwLWludGVybmFsLSR7Y29udGV4dElkfWBcbiAgKTtcbiAgaWYgKCFjb250ZXh0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYFtjb3J2dV06IFRvb2x0aXAgY29udGV4dCB3aXRoIGlkIFwiJHtjb250ZXh0SWR9XCIgbm90IGZvdW5kLiBNYWtlIHN1cmUgdG8gd3JhcCBUb29sdGlwIGNvbXBvbmVudHMgaW4gPFRvb2x0aXAuUm9vdCBjb250ZXh0SWQ9XCIke2NvbnRleHRJZH1cIj5gXG4gICAgKTtcbiAgfVxuICByZXR1cm4gY29udGV4dDtcbn07XG5cbi8vIHNyYy9BbmNob3IudHN4XG52YXIgREVGQVVMVF9UT09MVElQX0FOQ0hPUl9FTEVNRU5UID0gXCJkaXZcIjtcbnZhciBUb29sdGlwQW5jaG9yID0gKHByb3BzKSA9PiB7XG4gIGNvbnN0IFtsb2NhbFByb3BzLCBvdGhlclByb3BzXSA9IHNwbGl0UHJvcHMocHJvcHMsIFtcImNvbnRleHRJZFwiLCBcInJlZlwiXSk7XG4gIGNvbnN0IGNvbnRleHQgPSBjcmVhdGVNZW1vKCgpID0+IHVzZUludGVybmFsVG9vbHRpcENvbnRleHQobG9jYWxQcm9wcy5jb250ZXh0SWQpKTtcbiAgcmV0dXJuIGNyZWF0ZUNvbXBvbmVudChEeW5hbWljLCBtZXJnZVByb3BzKHtcbiAgICBhczogREVGQVVMVF9UT09MVElQX0FOQ0hPUl9FTEVNRU5ULFxuICAgIHJlZihyJCkge1xuICAgICAgdmFyIF9yZWYkID0gbWVyZ2VSZWZzKGNvbnRleHQoKS5zZXRBbmNob3JSZWYsIGxvY2FsUHJvcHMucmVmKTtcbiAgICAgIHR5cGVvZiBfcmVmJCA9PT0gXCJmdW5jdGlvblwiICYmIF9yZWYkKHIkKTtcbiAgICB9LFxuICAgIFwiZGF0YS1jb3J2dS10b29sdGlwLWFuY2hvclwiOiBcIlwiXG4gIH0sIG90aGVyUHJvcHMpKTtcbn07XG52YXIgQW5jaG9yX2RlZmF1bHQgPSBUb29sdGlwQW5jaG9yO1xudmFyIERFRkFVTFRfVE9PTFRJUF9BUlJPV19FTEVNRU5UID0gXCJkaXZcIjtcbnZhciBUb29sdGlwQXJyb3cgPSAocHJvcHMpID0+IHtcbiAgY29uc3QgW2xvY2FsUHJvcHMsIG90aGVyUHJvcHNdID0gc3BsaXRQcm9wcyhwcm9wcywgW1wiY29udGV4dElkXCIsIFwicmVmXCJdKTtcbiAgY29uc3QgY29udGV4dCA9IGNyZWF0ZU1lbW8oKCkgPT4gdXNlSW50ZXJuYWxUb29sdGlwQ29udGV4dChsb2NhbFByb3BzLmNvbnRleHRJZCkpO1xuICByZXR1cm4gY3JlYXRlQ29tcG9uZW50KEZsb2F0aW5nQXJyb3csIG1lcmdlUHJvcHMoe1xuICAgIGFzOiBERUZBVUxUX1RPT0xUSVBfQVJST1dfRUxFTUVOVCxcbiAgICBnZXQgZmxvYXRpbmdTdGF0ZSgpIHtcbiAgICAgIHJldHVybiBjb250ZXh0KCkuZmxvYXRpbmdTdGF0ZSgpO1xuICAgIH0sXG4gICAgcmVmKHIkKSB7XG4gICAgICB2YXIgX3JlZiQgPSBtZXJnZVJlZnMoY29udGV4dCgpLnNldEFycm93UmVmLCBsb2NhbFByb3BzLnJlZik7XG4gICAgICB0eXBlb2YgX3JlZiQgPT09IFwiZnVuY3Rpb25cIiAmJiBfcmVmJChyJCk7XG4gICAgfSxcbiAgICBcImRhdGEtY29ydnUtdG9vbHRpcC1hcnJvd1wiOiBcIlwiXG4gIH0sIG90aGVyUHJvcHMpKTtcbn07XG52YXIgQXJyb3dfZGVmYXVsdCA9IFRvb2x0aXBBcnJvdztcbnZhciBERUZBVUxUX1RPT0xUSVBfQ09OVEVOVF9FTEVNRU5UID0gXCJkaXZcIjtcbnZhciBUb29sdGlwQ29udGVudCA9IChwcm9wcykgPT4ge1xuICBjb25zdCBbbG9jYWxQcm9wcywgb3RoZXJQcm9wc10gPSBzcGxpdFByb3BzKHByb3BzLCBbXCJmb3JjZU1vdW50XCIsIFwiY29udGV4dElkXCIsIFwicmVmXCIsIFwic3R5bGVcIl0pO1xuICBjb25zdCBjb250ZXh0ID0gY3JlYXRlTWVtbygoKSA9PiB1c2VJbnRlcm5hbFRvb2x0aXBDb250ZXh0KGxvY2FsUHJvcHMuY29udGV4dElkKSk7XG4gIGNvbnN0IHNob3cgPSAoKSA9PiBzb21lKGNvbnRleHQoKS5vcGVuLCAoKSA9PiBsb2NhbFByb3BzLmZvcmNlTW91bnQsIGNvbnRleHQoKS5jb250ZW50UHJlc2VudCk7XG4gIHJldHVybiBjcmVhdGVDb21wb25lbnQoRGlzbWlzc2libGUsIHtcbiAgICBnZXQgZWxlbWVudCgpIHtcbiAgICAgIHJldHVybiBjb250ZXh0KCkuY29udGVudFJlZjtcbiAgICB9LFxuICAgIGdldCBlbmFibGVkKCkge1xuICAgICAgcmV0dXJuIGNvbnRleHQoKS5vcGVuKCkgfHwgY29udGV4dCgpLmNvbnRlbnRQcmVzZW50KCk7XG4gICAgfSxcbiAgICBvbkRpc21pc3M6ICgpID0+IGNvbnRleHQoKS5zZXRPcGVuKGZhbHNlKSxcbiAgICBnZXQgZGlzbWlzc09uRXNjYXBlS2V5RG93bigpIHtcbiAgICAgIHJldHVybiBjb250ZXh0KCkuY2xvc2VPbkVzY2FwZUtleURvd247XG4gICAgfSxcbiAgICBkaXNtaXNzT25PdXRzaWRlUG9pbnRlcjogZmFsc2UsXG4gICAgbm9PdXRzaWRlUG9pbnRlckV2ZW50czogZmFsc2UsXG4gICAgZ2V0IG9uRXNjYXBlS2V5RG93bigpIHtcbiAgICAgIHJldHVybiBjb250ZXh0KCkub25Fc2NhcGVLZXlEb3duO1xuICAgIH0sXG4gICAgY2hpbGRyZW46IChwcm9wczIpID0+IGNyZWF0ZUNvbXBvbmVudChTaG93LCB7XG4gICAgICBnZXQgd2hlbigpIHtcbiAgICAgICAgcmV0dXJuIHNob3coKTtcbiAgICAgIH0sXG4gICAgICBnZXQgY2hpbGRyZW4oKSB7XG4gICAgICAgIHJldHVybiBjcmVhdGVDb21wb25lbnQoRHluYW1pYywgbWVyZ2VQcm9wcyh7XG4gICAgICAgICAgYXM6IERFRkFVTFRfVE9PTFRJUF9DT05URU5UX0VMRU1FTlQsXG4gICAgICAgICAgcmVmKHIkKSB7XG4gICAgICAgICAgICB2YXIgX3JlZiQgPSBtZXJnZVJlZnMoY29udGV4dCgpLnNldENvbnRlbnRSZWYsIGxvY2FsUHJvcHMucmVmKTtcbiAgICAgICAgICAgIHR5cGVvZiBfcmVmJCA9PT0gXCJmdW5jdGlvblwiICYmIF9yZWYkKHIkKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGdldCBzdHlsZSgpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIC4uLmdldEZsb2F0aW5nU3R5bGUoe1xuICAgICAgICAgICAgICAgIHN0cmF0ZWd5OiAoKSA9PiBjb250ZXh0KCkuc3RyYXRlZ3koKSxcbiAgICAgICAgICAgICAgICBmbG9hdGluZ1N0YXRlOiAoKSA9PiBjb250ZXh0KCkuZmxvYXRpbmdTdGF0ZSgpXG4gICAgICAgICAgICAgIH0pKCksXG4gICAgICAgICAgICAgIFwicG9pbnRlci1ldmVudHNcIjogcHJvcHMyLmlzTGFzdExheWVyID8gXCJhdXRvXCIgOiB2b2lkIDAsXG4gICAgICAgICAgICAgIC4uLmxvY2FsUHJvcHMuc3R5bGVcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfSxcbiAgICAgICAgICBnZXQgaWQoKSB7XG4gICAgICAgICAgICByZXR1cm4gY29udGV4dCgpLnRvb2x0aXBJZCgpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgcm9sZTogXCJ0b29sdGlwXCIsXG4gICAgICAgICAgZ2V0IFtcImRhdGEtY2xvc2VkXCJdKCkge1xuICAgICAgICAgICAgcmV0dXJuIGRhdGFJZighY29udGV4dCgpLm9wZW4oKSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBnZXQgW1wiZGF0YS1vcGVuXCJdKCkge1xuICAgICAgICAgICAgcmV0dXJuIGRhdGFJZihjb250ZXh0KCkub3BlbigpKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGdldCBbXCJkYXRhLXBsYWNlbWVudFwiXSgpIHtcbiAgICAgICAgICAgIHJldHVybiBjb250ZXh0KCkuZmxvYXRpbmdTdGF0ZSgpLnBsYWNlbWVudDtcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZGF0YS1jb3J2dS10b29sdGlwLWNvbnRlbnRcIjogXCJcIlxuICAgICAgICB9LCBvdGhlclByb3BzKSk7XG4gICAgICB9XG4gICAgfSlcbiAgfSk7XG59O1xudmFyIENvbnRlbnRfZGVmYXVsdCA9IFRvb2x0aXBDb250ZW50O1xudmFyIFRvb2x0aXBQb3J0YWwgPSAocHJvcHMpID0+IHtcbiAgY29uc3QgW2xvY2FsUHJvcHMsIG90aGVyUHJvcHNdID0gc3BsaXRQcm9wcyhwcm9wcywgW1wiZm9yY2VNb3VudFwiLCBcImNvbnRleHRJZFwiXSk7XG4gIGNvbnN0IGNvbnRleHQgPSBjcmVhdGVNZW1vKCgpID0+IHVzZUludGVybmFsVG9vbHRpcENvbnRleHQobG9jYWxQcm9wcy5jb250ZXh0SWQpKTtcbiAgY29uc3Qgc2hvdyA9ICgpID0+IHNvbWUoY29udGV4dCgpLm9wZW4sICgpID0+IGxvY2FsUHJvcHMuZm9yY2VNb3VudCwgY29udGV4dCgpLmNvbnRlbnRQcmVzZW50KTtcbiAgcmV0dXJuIGNyZWF0ZUNvbXBvbmVudChTaG93LCB7XG4gICAgZ2V0IHdoZW4oKSB7XG4gICAgICByZXR1cm4gc2hvdygpO1xuICAgIH0sXG4gICAgZ2V0IGNoaWxkcmVuKCkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUNvbXBvbmVudChQb3J0YWwsIG90aGVyUHJvcHMpO1xuICAgIH1cbiAgfSk7XG59O1xudmFyIFBvcnRhbF9kZWZhdWx0ID0gVG9vbHRpcFBvcnRhbDtcbnZhciBUb29sdGlwUm9vdCA9IChwcm9wcykgPT4ge1xuICBjb25zdCBkZWZhdWx0ZWRQcm9wcyA9IG1lcmdlUHJvcHMkMSh7XG4gICAgaW5pdGlhbE9wZW46IGZhbHNlLFxuICAgIHBsYWNlbWVudDogXCJib3R0b21cIixcbiAgICBzdHJhdGVneTogXCJhYnNvbHV0ZVwiLFxuICAgIGZsb2F0aW5nT3B0aW9uczoge1xuICAgICAgZmxpcDogdHJ1ZSxcbiAgICAgIHNoaWZ0OiB0cnVlXG4gICAgfSxcbiAgICBvcGVuRGVsYXk6IDUwMCxcbiAgICBjbG9zZURlbGF5OiAwLFxuICAgIHNraXBEZWxheUR1cmF0aW9uOiAwLFxuICAgIGhvdmVyYWJsZUNvbnRlbnQ6IHRydWUsXG4gICAgZ3JvdXA6IG51bGwsXG4gICAgb3Blbk9uRm9jdXM6IHRydWUsXG4gICAgb3Blbk9uSG92ZXI6IHRydWUsXG4gICAgY2xvc2VPbkVzY2FwZUtleURvd246IHRydWUsXG4gICAgY2xvc2VPblBvaW50ZXJEb3duOiB0cnVlLFxuICAgIGNsb3NlT25TY3JvbGw6IHRydWUsXG4gICAgdG9vbHRpcElkOiBjcmVhdGVVbmlxdWVJZCgpXG4gIH0sIHByb3BzKTtcbiAgY29uc3QgW29wZW4sIHNldE9wZW5dID0gY3JlYXRlQ29udHJvbGxhYmxlU2lnbmFsKHtcbiAgICB2YWx1ZTogKCkgPT4gZGVmYXVsdGVkUHJvcHMub3BlbixcbiAgICBpbml0aWFsVmFsdWU6IGRlZmF1bHRlZFByb3BzLmluaXRpYWxPcGVuLFxuICAgIG9uQ2hhbmdlOiBkZWZhdWx0ZWRQcm9wcy5vbk9wZW5DaGFuZ2VcbiAgfSk7XG4gIGNvbnN0IFthbmNob3JSZWYsIHNldEFuY2hvclJlZl0gPSBjcmVhdGVTaWduYWwobnVsbCk7XG4gIGNvbnN0IFt0cmlnZ2VyUmVmLCBzZXRUcmlnZ2VyUmVmXSA9IGNyZWF0ZVNpZ25hbChudWxsKTtcbiAgY29uc3QgW2NvbnRlbnRSZWYsIHNldENvbnRlbnRSZWZdID0gY3JlYXRlU2lnbmFsKG51bGwpO1xuICBjb25zdCBbYXJyb3dSZWYsIHNldEFycm93UmVmXSA9IGNyZWF0ZVNpZ25hbChudWxsKTtcbiAgY29uc3Qge1xuICAgIHByZXNlbnQ6IGNvbnRlbnRQcmVzZW50XG4gIH0gPSBjcmVhdGVQcmVzZW5jZSh7XG4gICAgc2hvdzogb3BlbixcbiAgICBlbGVtZW50OiBjb250ZW50UmVmXG4gIH0pO1xuICBjb25zdCBmbG9hdGluZ1N0YXRlID0gY3JlYXRlRmxvYXRpbmcoe1xuICAgIGVuYWJsZWQ6IGNvbnRlbnRQcmVzZW50LFxuICAgIGZsb2F0aW5nOiBjb250ZW50UmVmLFxuICAgIHJlZmVyZW5jZTogKCkgPT4gYW5jaG9yUmVmKCkgPz8gdHJpZ2dlclJlZigpID8/IG51bGwsXG4gICAgYXJyb3c6IGFycm93UmVmLFxuICAgIHBsYWNlbWVudDogKCkgPT4gZGVmYXVsdGVkUHJvcHMucGxhY2VtZW50LFxuICAgIHN0cmF0ZWd5OiAoKSA9PiBkZWZhdWx0ZWRQcm9wcy5zdHJhdGVneSxcbiAgICBvcHRpb25zOiAoKSA9PiBkZWZhdWx0ZWRQcm9wcy5mbG9hdGluZ09wdGlvbnNcbiAgfSk7XG4gIGNyZWF0ZVRvb2x0aXAoe1xuICAgIGlkOiAoKSA9PiBkZWZhdWx0ZWRQcm9wcy50b29sdGlwSWQsXG4gICAgZ3JvdXA6ICgpID0+IGRlZmF1bHRlZFByb3BzLmdyb3VwLFxuICAgIG9wZW4sXG4gICAgY2xvc2U6ICgpID0+IHNldE9wZW4oZmFsc2UpLFxuICAgIHRyaWdnZXI6IHRyaWdnZXJSZWYsXG4gICAgY29udGVudDogY29udGVudFJlZixcbiAgICBvcGVuT25Gb2N1czogKCkgPT4gZGVmYXVsdGVkUHJvcHMub3Blbk9uRm9jdXMsXG4gICAgb3Blbk9uSG92ZXI6ICgpID0+IGRlZmF1bHRlZFByb3BzLm9wZW5PbkhvdmVyLFxuICAgIGNsb3NlT25Qb2ludGVyRG93bjogKCkgPT4gZGVmYXVsdGVkUHJvcHMuY2xvc2VPblBvaW50ZXJEb3duLFxuICAgIGNsb3NlT25TY3JvbGw6ICgpID0+IGRlZmF1bHRlZFByb3BzLmNsb3NlT25TY3JvbGwsXG4gICAgaG92ZXJhYmxlQ29udGVudDogKCkgPT4gZGVmYXVsdGVkUHJvcHMuaG92ZXJhYmxlQ29udGVudCxcbiAgICBvcGVuRGVsYXk6ICgpID0+IGRlZmF1bHRlZFByb3BzLm9wZW5EZWxheSxcbiAgICBjbG9zZURlbGF5OiAoKSA9PiBkZWZhdWx0ZWRQcm9wcy5jbG9zZURlbGF5LFxuICAgIHNraXBEZWxheUR1cmF0aW9uOiAoKSA9PiBkZWZhdWx0ZWRQcm9wcy5za2lwRGVsYXlEdXJhdGlvbixcbiAgICBvbkhvdmVyOiAoZXZlbnQpID0+IHtcbiAgICAgIGlmIChjYWxsRXZlbnRIYW5kbGVyKGRlZmF1bHRlZFByb3BzLm9uSG92ZXIsIGV2ZW50KSlcbiAgICAgICAgcmV0dXJuO1xuICAgICAgc2V0T3Blbih0cnVlKTtcbiAgICB9LFxuICAgIG9uTGVhdmU6IChldmVudCkgPT4ge1xuICAgICAgaWYgKGNhbGxFdmVudEhhbmRsZXIoZGVmYXVsdGVkUHJvcHMub25MZWF2ZSwgZXZlbnQpKVxuICAgICAgICByZXR1cm47XG4gICAgICBzZXRPcGVuKGZhbHNlKTtcbiAgICB9LFxuICAgIG9uRm9jdXM6IChldmVudCkgPT4ge1xuICAgICAgaWYgKGNhbGxFdmVudEhhbmRsZXIoZGVmYXVsdGVkUHJvcHMub25Gb2N1cywgZXZlbnQpKVxuICAgICAgICByZXR1cm47XG4gICAgICBzZXRPcGVuKHRydWUpO1xuICAgIH0sXG4gICAgb25CbHVyOiAoZXZlbnQpID0+IHtcbiAgICAgIGlmIChjYWxsRXZlbnRIYW5kbGVyKGRlZmF1bHRlZFByb3BzLm9uQmx1ciwgZXZlbnQpKVxuICAgICAgICByZXR1cm47XG4gICAgICBzZXRPcGVuKGZhbHNlKTtcbiAgICB9LFxuICAgIG9uUG9pbnRlckRvd246IChldmVudCkgPT4ge1xuICAgICAgaWYgKGNhbGxFdmVudEhhbmRsZXIoZGVmYXVsdGVkUHJvcHMub25Qb2ludGVyRG93biwgZXZlbnQpKVxuICAgICAgICByZXR1cm47XG4gICAgICBzZXRPcGVuKGZhbHNlKTtcbiAgICB9LFxuICAgIG9uU2Nyb2xsOiAoZXZlbnQpID0+IHtcbiAgICAgIGlmIChjYWxsRXZlbnRIYW5kbGVyKGRlZmF1bHRlZFByb3BzLm9uU2Nyb2xsLCBldmVudCkpXG4gICAgICAgIHJldHVybjtcbiAgICAgIHNldE9wZW4oZmFsc2UpO1xuICAgIH1cbiAgfSk7XG4gIGNvbnN0IGNoaWxkcmVuUHJvcHMgPSB7XG4gICAgZ2V0IG9wZW4oKSB7XG4gICAgICByZXR1cm4gb3BlbigpO1xuICAgIH0sXG4gICAgc2V0T3BlbixcbiAgICBnZXQgcGxhY2VtZW50KCkge1xuICAgICAgcmV0dXJuIGRlZmF1bHRlZFByb3BzLnBsYWNlbWVudDtcbiAgICB9LFxuICAgIGdldCBzdHJhdGVneSgpIHtcbiAgICAgIHJldHVybiBkZWZhdWx0ZWRQcm9wcy5zdHJhdGVneTtcbiAgICB9LFxuICAgIGdldCBmbG9hdGluZ09wdGlvbnMoKSB7XG4gICAgICByZXR1cm4gZGVmYXVsdGVkUHJvcHMuZmxvYXRpbmdPcHRpb25zO1xuICAgIH0sXG4gICAgZ2V0IGZsb2F0aW5nU3RhdGUoKSB7XG4gICAgICByZXR1cm4gZmxvYXRpbmdTdGF0ZSgpO1xuICAgIH0sXG4gICAgZ2V0IG9wZW5EZWxheSgpIHtcbiAgICAgIHJldHVybiBkZWZhdWx0ZWRQcm9wcy5vcGVuRGVsYXk7XG4gICAgfSxcbiAgICBnZXQgY2xvc2VEZWxheSgpIHtcbiAgICAgIHJldHVybiBkZWZhdWx0ZWRQcm9wcy5jbG9zZURlbGF5O1xuICAgIH0sXG4gICAgZ2V0IHNraXBEZWxheUR1cmF0aW9uKCkge1xuICAgICAgcmV0dXJuIGRlZmF1bHRlZFByb3BzLnNraXBEZWxheUR1cmF0aW9uO1xuICAgIH0sXG4gICAgZ2V0IGhvdmVyYWJsZUNvbnRlbnQoKSB7XG4gICAgICByZXR1cm4gZGVmYXVsdGVkUHJvcHMuaG92ZXJhYmxlQ29udGVudDtcbiAgICB9LFxuICAgIGdldCBncm91cCgpIHtcbiAgICAgIHJldHVybiBkZWZhdWx0ZWRQcm9wcy5ncm91cDtcbiAgICB9LFxuICAgIGdldCBvcGVuT25Gb2N1cygpIHtcbiAgICAgIHJldHVybiBkZWZhdWx0ZWRQcm9wcy5vcGVuT25Gb2N1cztcbiAgICB9LFxuICAgIGdldCBvcGVuT25Ib3ZlcigpIHtcbiAgICAgIHJldHVybiBkZWZhdWx0ZWRQcm9wcy5vcGVuT25Ib3ZlcjtcbiAgICB9LFxuICAgIGdldCBjbG9zZU9uRXNjYXBlS2V5RG93bigpIHtcbiAgICAgIHJldHVybiBkZWZhdWx0ZWRQcm9wcy5jbG9zZU9uRXNjYXBlS2V5RG93bjtcbiAgICB9LFxuICAgIGdldCBjbG9zZU9uUG9pbnRlckRvd24oKSB7XG4gICAgICByZXR1cm4gZGVmYXVsdGVkUHJvcHMuY2xvc2VPblBvaW50ZXJEb3duO1xuICAgIH0sXG4gICAgZ2V0IGNvbnRlbnRQcmVzZW50KCkge1xuICAgICAgcmV0dXJuIGNvbnRlbnRQcmVzZW50KCk7XG4gICAgfSxcbiAgICBnZXQgY29udGVudFJlZigpIHtcbiAgICAgIHJldHVybiBjb250ZW50UmVmKCk7XG4gICAgfSxcbiAgICBnZXQgdG9vbHRpcElkKCkge1xuICAgICAgcmV0dXJuIGRlZmF1bHRlZFByb3BzLnRvb2x0aXBJZDtcbiAgICB9XG4gIH07XG4gIGNvbnN0IG1lbW9pemVkQ2hpbGRyZW4gPSBjcmVhdGVPbmNlKCgpID0+IGRlZmF1bHRlZFByb3BzLmNoaWxkcmVuKTtcbiAgY29uc3QgcmVzb2x2ZUNoaWxkcmVuID0gKCkgPT4ge1xuICAgIGNvbnN0IGNoaWxkcmVuID0gbWVtb2l6ZWRDaGlsZHJlbigpKCk7XG4gICAgaWYgKGlzRnVuY3Rpb24oY2hpbGRyZW4pKSB7XG4gICAgICByZXR1cm4gY2hpbGRyZW4oY2hpbGRyZW5Qcm9wcyk7XG4gICAgfVxuICAgIHJldHVybiBjaGlsZHJlbjtcbiAgfTtcbiAgY29uc3QgbWVtb2l6ZWRUb29sdGlwUm9vdCA9IGNyZWF0ZU1lbW8oKCkgPT4ge1xuICAgIGNvbnN0IFRvb2x0aXBDb250ZXh0MiA9IGNyZWF0ZVRvb2x0aXBDb250ZXh0KGRlZmF1bHRlZFByb3BzLmNvbnRleHRJZCk7XG4gICAgY29uc3QgSW50ZXJuYWxUb29sdGlwQ29udGV4dDIgPSBjcmVhdGVJbnRlcm5hbFRvb2x0aXBDb250ZXh0KGRlZmF1bHRlZFByb3BzLmNvbnRleHRJZCk7XG4gICAgcmV0dXJuIHVudHJhY2soKCkgPT4gY3JlYXRlQ29tcG9uZW50KFRvb2x0aXBDb250ZXh0Mi5Qcm92aWRlciwge1xuICAgICAgdmFsdWU6IHtcbiAgICAgICAgb3BlbixcbiAgICAgICAgc2V0T3BlbixcbiAgICAgICAgcGxhY2VtZW50OiAoKSA9PiBkZWZhdWx0ZWRQcm9wcy5wbGFjZW1lbnQsXG4gICAgICAgIHN0cmF0ZWd5OiAoKSA9PiBkZWZhdWx0ZWRQcm9wcy5zdHJhdGVneSxcbiAgICAgICAgZmxvYXRpbmdPcHRpb25zOiAoKSA9PiBkZWZhdWx0ZWRQcm9wcy5mbG9hdGluZ09wdGlvbnMsXG4gICAgICAgIGZsb2F0aW5nU3RhdGUsXG4gICAgICAgIG9wZW5EZWxheTogKCkgPT4gZGVmYXVsdGVkUHJvcHMub3BlbkRlbGF5LFxuICAgICAgICBjbG9zZURlbGF5OiAoKSA9PiBkZWZhdWx0ZWRQcm9wcy5jbG9zZURlbGF5LFxuICAgICAgICBza2lwRGVsYXlEdXJhdGlvbjogKCkgPT4gZGVmYXVsdGVkUHJvcHMuc2tpcERlbGF5RHVyYXRpb24sXG4gICAgICAgIGhvdmVyYWJsZUNvbnRlbnQ6ICgpID0+IGRlZmF1bHRlZFByb3BzLmhvdmVyYWJsZUNvbnRlbnQsXG4gICAgICAgIGdyb3VwOiAoKSA9PiBkZWZhdWx0ZWRQcm9wcy5ncm91cCxcbiAgICAgICAgb3Blbk9uRm9jdXM6ICgpID0+IGRlZmF1bHRlZFByb3BzLm9wZW5PbkZvY3VzLFxuICAgICAgICBvcGVuT25Ib3ZlcjogKCkgPT4gZGVmYXVsdGVkUHJvcHMub3Blbk9uSG92ZXIsXG4gICAgICAgIGNsb3NlT25Fc2NhcGVLZXlEb3duOiAoKSA9PiBkZWZhdWx0ZWRQcm9wcy5jbG9zZU9uRXNjYXBlS2V5RG93bixcbiAgICAgICAgY2xvc2VPblBvaW50ZXJEb3duOiAoKSA9PiBkZWZhdWx0ZWRQcm9wcy5jbG9zZU9uUG9pbnRlckRvd24sXG4gICAgICAgIGNvbnRlbnRQcmVzZW50LFxuICAgICAgICBjb250ZW50UmVmLFxuICAgICAgICB0b29sdGlwSWQ6ICgpID0+IGRlZmF1bHRlZFByb3BzLnRvb2x0aXBJZFxuICAgICAgfSxcbiAgICAgIGdldCBjaGlsZHJlbigpIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUNvbXBvbmVudChJbnRlcm5hbFRvb2x0aXBDb250ZXh0Mi5Qcm92aWRlciwge1xuICAgICAgICAgIGdldCB2YWx1ZSgpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIG9wZW4sXG4gICAgICAgICAgICAgIHNldE9wZW4sXG4gICAgICAgICAgICAgIHBsYWNlbWVudDogKCkgPT4gZGVmYXVsdGVkUHJvcHMucGxhY2VtZW50LFxuICAgICAgICAgICAgICBzdHJhdGVneTogKCkgPT4gZGVmYXVsdGVkUHJvcHMuc3RyYXRlZ3ksXG4gICAgICAgICAgICAgIGZsb2F0aW5nT3B0aW9uczogKCkgPT4gZGVmYXVsdGVkUHJvcHMuZmxvYXRpbmdPcHRpb25zLFxuICAgICAgICAgICAgICBmbG9hdGluZ1N0YXRlLFxuICAgICAgICAgICAgICBvcGVuRGVsYXk6ICgpID0+IGRlZmF1bHRlZFByb3BzLm9wZW5EZWxheSxcbiAgICAgICAgICAgICAgY2xvc2VEZWxheTogKCkgPT4gZGVmYXVsdGVkUHJvcHMuY2xvc2VEZWxheSxcbiAgICAgICAgICAgICAgc2tpcERlbGF5RHVyYXRpb246ICgpID0+IGRlZmF1bHRlZFByb3BzLnNraXBEZWxheUR1cmF0aW9uLFxuICAgICAgICAgICAgICBob3ZlcmFibGVDb250ZW50OiAoKSA9PiBkZWZhdWx0ZWRQcm9wcy5ob3ZlcmFibGVDb250ZW50LFxuICAgICAgICAgICAgICBncm91cDogKCkgPT4gZGVmYXVsdGVkUHJvcHMuZ3JvdXAsXG4gICAgICAgICAgICAgIG9wZW5PbkZvY3VzOiAoKSA9PiBkZWZhdWx0ZWRQcm9wcy5vcGVuT25Gb2N1cyxcbiAgICAgICAgICAgICAgb3Blbk9uSG92ZXI6ICgpID0+IGRlZmF1bHRlZFByb3BzLm9wZW5PbkhvdmVyLFxuICAgICAgICAgICAgICBjbG9zZU9uRXNjYXBlS2V5RG93bjogKCkgPT4gZGVmYXVsdGVkUHJvcHMuY2xvc2VPbkVzY2FwZUtleURvd24sXG4gICAgICAgICAgICAgIGNsb3NlT25Qb2ludGVyRG93bjogKCkgPT4gZGVmYXVsdGVkUHJvcHMuY2xvc2VPblBvaW50ZXJEb3duLFxuICAgICAgICAgICAgICBjb250ZW50UHJlc2VudCxcbiAgICAgICAgICAgICAgY29udGVudFJlZixcbiAgICAgICAgICAgICAgdG9vbHRpcElkOiAoKSA9PiBkZWZhdWx0ZWRQcm9wcy50b29sdGlwSWQsXG4gICAgICAgICAgICAgIG9uRm9jdXM6IGRlZmF1bHRlZFByb3BzLm9uRm9jdXMsXG4gICAgICAgICAgICAgIG9uQmx1cjogZGVmYXVsdGVkUHJvcHMub25CbHVyLFxuICAgICAgICAgICAgICBvblBvaW50ZXJEb3duOiBkZWZhdWx0ZWRQcm9wcy5vblBvaW50ZXJEb3duLFxuICAgICAgICAgICAgICBvbkVzY2FwZUtleURvd246IGRlZmF1bHRlZFByb3BzLm9uRXNjYXBlS2V5RG93bixcbiAgICAgICAgICAgICAgc2V0QW5jaG9yUmVmLFxuICAgICAgICAgICAgICBzZXRUcmlnZ2VyUmVmLFxuICAgICAgICAgICAgICBzZXRDb250ZW50UmVmLFxuICAgICAgICAgICAgICBzZXRBcnJvd1JlZlxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGdldCBjaGlsZHJlbigpIHtcbiAgICAgICAgICAgIHJldHVybiB1bnRyYWNrKCgpID0+IHJlc29sdmVDaGlsZHJlbigpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pKTtcbiAgfSk7XG4gIHJldHVybiBtZW1vaXplZFRvb2x0aXBSb290O1xufTtcbnZhciBSb290X2RlZmF1bHQgPSBUb29sdGlwUm9vdDtcbnZhciBERUZBVUxUX1RPT0xUSVBfVFJJR0dFUl9FTEVNRU5UID0gXCJidXR0b25cIjtcbnZhciBUb29sdGlwVHJpZ2dlciA9IChwcm9wcykgPT4ge1xuICBjb25zdCBbbG9jYWxQcm9wcywgb3RoZXJQcm9wc10gPSBzcGxpdFByb3BzKHByb3BzLCBbXCJjb250ZXh0SWRcIiwgXCJyZWZcIl0pO1xuICBjb25zdCBjb250ZXh0ID0gY3JlYXRlTWVtbygoKSA9PiB1c2VJbnRlcm5hbFRvb2x0aXBDb250ZXh0KGxvY2FsUHJvcHMuY29udGV4dElkKSk7XG4gIHJldHVybiBjcmVhdGVDb21wb25lbnQoRHluYW1pY0J1dHRvbiwgbWVyZ2VQcm9wcyh7XG4gICAgYXM6IERFRkFVTFRfVE9PTFRJUF9UUklHR0VSX0VMRU1FTlQsXG4gICAgcmVmKHIkKSB7XG4gICAgICB2YXIgX3JlZiQgPSBtZXJnZVJlZnMoY29udGV4dCgpLnNldFRyaWdnZXJSZWYsIGxvY2FsUHJvcHMucmVmKTtcbiAgICAgIHR5cGVvZiBfcmVmJCA9PT0gXCJmdW5jdGlvblwiICYmIF9yZWYkKHIkKTtcbiAgICB9LFxuICAgIGdldCBbXCJhcmlhLWRlc2NyaWJlZGJ5XCJdKCkge1xuICAgICAgcmV0dXJuIG1lbW8oKCkgPT4gISFjb250ZXh0KCkub3BlbigpKSgpID8gY29udGV4dCgpLnRvb2x0aXBJZCgpIDogdm9pZCAwO1xuICAgIH0sXG4gICAgZ2V0IFtcImFyaWEtZXhwYW5kZWRcIl0oKSB7XG4gICAgICByZXR1cm4gY29udGV4dCgpLm9wZW4oKSA/IFwidHJ1ZVwiIDogXCJmYWxzZVwiO1xuICAgIH0sXG4gICAgZ2V0IFtcImRhdGEtY2xvc2VkXCJdKCkge1xuICAgICAgcmV0dXJuIGRhdGFJZighY29udGV4dCgpLm9wZW4oKSk7XG4gICAgfSxcbiAgICBnZXQgW1wiZGF0YS1vcGVuXCJdKCkge1xuICAgICAgcmV0dXJuIGRhdGFJZihjb250ZXh0KCkub3BlbigpKTtcbiAgICB9LFxuICAgIGdldCBbXCJkYXRhLXBsYWNlbWVudFwiXSgpIHtcbiAgICAgIHJldHVybiBtZW1vKCgpID0+ICEhY29udGV4dCgpLm9wZW4oKSkoKSA/IGNvbnRleHQoKS5mbG9hdGluZ1N0YXRlKCkucGxhY2VtZW50IDogdm9pZCAwO1xuICAgIH0sXG4gICAgXCJkYXRhLWNvcnZ1LXRvb2x0aXAtdHJpZ2dlclwiOiBcIlwiXG4gIH0sIG90aGVyUHJvcHMpKTtcbn07XG52YXIgVHJpZ2dlcl9kZWZhdWx0ID0gVG9vbHRpcFRyaWdnZXI7XG5cbi8vIHNyYy9pbmRleC50c1xudmFyIFRvb2x0aXAgPSBPYmplY3QuYXNzaWduKFJvb3RfZGVmYXVsdCwge1xuICBBbmNob3I6IEFuY2hvcl9kZWZhdWx0LFxuICBUcmlnZ2VyOiBUcmlnZ2VyX2RlZmF1bHQsXG4gIFBvcnRhbDogUG9ydGFsX2RlZmF1bHQsXG4gIENvbnRlbnQ6IENvbnRlbnRfZGVmYXVsdCxcbiAgQXJyb3c6IEFycm93X2RlZmF1bHQsXG4gIHVzZUNvbnRleHQ6IHVzZVRvb2x0aXBDb250ZXh0XG59KTtcbnZhciBzcmNfZGVmYXVsdCA9IFRvb2x0aXA7XG5cbmV4cG9ydCB7IEFuY2hvcl9kZWZhdWx0IGFzIEFuY2hvciwgQXJyb3dfZGVmYXVsdCBhcyBBcnJvdywgQ29udGVudF9kZWZhdWx0IGFzIENvbnRlbnQsIFBvcnRhbF9kZWZhdWx0IGFzIFBvcnRhbCwgUm9vdF9kZWZhdWx0IGFzIFJvb3QsIFRyaWdnZXJfZGVmYXVsdCBhcyBUcmlnZ2VyLCBzcmNfZGVmYXVsdCBhcyBkZWZhdWx0LCB1c2VUb29sdGlwQ29udGV4dCBhcyB1c2VDb250ZXh0IH07XG4iLCAiZnVuY3Rpb24gY2xvbmVQcm9wcyhwcm9wcykge1xuICBjb25zdCBwcm9wS2V5cyA9IE9iamVjdC5rZXlzKHByb3BzKTtcbiAgcmV0dXJuIHByb3BLZXlzLnJlZHVjZSgobWVtbywgaykgPT4ge1xuICAgIGNvbnN0IHByb3AgPSBwcm9wc1trXTtcbiAgICBtZW1vW2tdID0gT2JqZWN0LmFzc2lnbih7fSwgcHJvcCk7XG4gICAgaWYgKGlzT2JqZWN0KHByb3AudmFsdWUpICYmICFpc0Z1bmN0aW9uKHByb3AudmFsdWUpICYmICFBcnJheS5pc0FycmF5KHByb3AudmFsdWUpKSBtZW1vW2tdLnZhbHVlID0gT2JqZWN0LmFzc2lnbih7fSwgcHJvcC52YWx1ZSk7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkocHJvcC52YWx1ZSkpIG1lbW9ba10udmFsdWUgPSBwcm9wLnZhbHVlLnNsaWNlKDApO1xuICAgIHJldHVybiBtZW1vO1xuICB9LCB7fSk7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVByb3BEZWZzKHByb3BzKSB7XG4gIGlmICghcHJvcHMpIHJldHVybiB7fTtcbiAgY29uc3QgcHJvcEtleXMgPSBPYmplY3Qua2V5cyhwcm9wcyk7XG4gIHJldHVybiBwcm9wS2V5cy5yZWR1Y2UoKG1lbW8sIGspID0+IHtcbiAgICBjb25zdCB2ID0gcHJvcHNba107XG4gICAgbWVtb1trXSA9ICEoaXNPYmplY3QodikgJiYgXCJ2YWx1ZVwiIGluIHYpID8ge1xuICAgICAgdmFsdWU6IHZcbiAgICB9IDogdjtcbiAgICBtZW1vW2tdLmF0dHJpYnV0ZSB8fCAobWVtb1trXS5hdHRyaWJ1dGUgPSB0b0F0dHJpYnV0ZShrKSk7XG4gICAgbWVtb1trXS5wYXJzZSA9IFwicGFyc2VcIiBpbiBtZW1vW2tdID8gbWVtb1trXS5wYXJzZSA6IHR5cGVvZiBtZW1vW2tdLnZhbHVlICE9PSBcInN0cmluZ1wiO1xuICAgIHJldHVybiBtZW1vO1xuICB9LCB7fSk7XG59XG5mdW5jdGlvbiBwcm9wVmFsdWVzKHByb3BzKSB7XG4gIGNvbnN0IHByb3BLZXlzID0gT2JqZWN0LmtleXMocHJvcHMpO1xuICByZXR1cm4gcHJvcEtleXMucmVkdWNlKChtZW1vLCBrKSA9PiB7XG4gICAgbWVtb1trXSA9IHByb3BzW2tdLnZhbHVlO1xuICAgIHJldHVybiBtZW1vO1xuICB9LCB7fSk7XG59XG5mdW5jdGlvbiBpbml0aWFsaXplUHJvcHMoZWxlbWVudCwgcHJvcERlZmluaXRpb24pIHtcbiAgY29uc3QgcHJvcHMgPSBjbG9uZVByb3BzKHByb3BEZWZpbml0aW9uKSxcbiAgICAgICAgcHJvcEtleXMgPSBPYmplY3Qua2V5cyhwcm9wRGVmaW5pdGlvbik7XG4gIHByb3BLZXlzLmZvckVhY2goa2V5ID0+IHtcbiAgICBjb25zdCBwcm9wID0gcHJvcHNba2V5XSxcbiAgICAgICAgICBhdHRyID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUocHJvcC5hdHRyaWJ1dGUpLFxuICAgICAgICAgIHZhbHVlID0gZWxlbWVudFtrZXldO1xuICAgIGlmIChhdHRyKSBwcm9wLnZhbHVlID0gcHJvcC5wYXJzZSA/IHBhcnNlQXR0cmlidXRlVmFsdWUoYXR0cikgOiBhdHRyO1xuICAgIGlmICh2YWx1ZSAhPSBudWxsKSBwcm9wLnZhbHVlID0gQXJyYXkuaXNBcnJheSh2YWx1ZSkgPyB2YWx1ZS5zbGljZSgwKSA6IHZhbHVlO1xuICAgIHByb3AucmVmbGVjdCAmJiByZWZsZWN0KGVsZW1lbnQsIHByb3AuYXR0cmlidXRlLCBwcm9wLnZhbHVlKTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZWxlbWVudCwga2V5LCB7XG4gICAgICBnZXQoKSB7XG4gICAgICAgIHJldHVybiBwcm9wLnZhbHVlO1xuICAgICAgfSxcblxuICAgICAgc2V0KHZhbCkge1xuICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IHByb3AudmFsdWU7XG4gICAgICAgIHByb3AudmFsdWUgPSB2YWw7XG4gICAgICAgIHByb3AucmVmbGVjdCAmJiByZWZsZWN0KHRoaXMsIHByb3AuYXR0cmlidXRlLCBwcm9wLnZhbHVlKTtcblxuICAgICAgICBmb3IgKGxldCBpID0gMCwgbCA9IHRoaXMuX19wcm9wZXJ0eUNoYW5nZWRDYWxsYmFja3MubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgdGhpcy5fX3Byb3BlcnR5Q2hhbmdlZENhbGxiYWNrc1tpXShrZXksIHZhbCwgb2xkVmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9LFxuXG4gICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfSk7XG4gIH0pO1xuICByZXR1cm4gcHJvcHM7XG59XG5mdW5jdGlvbiBwYXJzZUF0dHJpYnV0ZVZhbHVlKHZhbHVlKSB7XG4gIGlmICghdmFsdWUpIHJldHVybjtcblxuICB0cnkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKHZhbHVlKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG59XG5mdW5jdGlvbiByZWZsZWN0KG5vZGUsIGF0dHJpYnV0ZSwgdmFsdWUpIHtcbiAgaWYgKHZhbHVlID09IG51bGwgfHwgdmFsdWUgPT09IGZhbHNlKSByZXR1cm4gbm9kZS5yZW1vdmVBdHRyaWJ1dGUoYXR0cmlidXRlKTtcbiAgbGV0IHJlZmxlY3QgPSBKU09OLnN0cmluZ2lmeSh2YWx1ZSk7XG4gIG5vZGUuX191cGRhdGluZ1thdHRyaWJ1dGVdID0gdHJ1ZTtcbiAgaWYgKHJlZmxlY3QgPT09IFwidHJ1ZVwiKSByZWZsZWN0ID0gXCJcIjtcbiAgbm9kZS5zZXRBdHRyaWJ1dGUoYXR0cmlidXRlLCByZWZsZWN0KTtcbiAgUHJvbWlzZS5yZXNvbHZlKCkudGhlbigoKSA9PiBkZWxldGUgbm9kZS5fX3VwZGF0aW5nW2F0dHJpYnV0ZV0pO1xufVxuZnVuY3Rpb24gdG9BdHRyaWJ1dGUocHJvcE5hbWUpIHtcbiAgcmV0dXJuIHByb3BOYW1lLnJlcGxhY2UoL1xcLj8oW0EtWl0rKS9nLCAoeCwgeSkgPT4gXCItXCIgKyB5LnRvTG93ZXJDYXNlKCkpLnJlcGxhY2UoXCJfXCIsIFwiLVwiKS5yZXBsYWNlKC9eLS8sIFwiXCIpO1xufVxuZnVuY3Rpb24gdG9Qcm9wZXJ0eShhdHRyKSB7XG4gIHJldHVybiBhdHRyLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvKC0pKFthLXpdKS9nLCB0ZXN0ID0+IHRlc3QudG9VcHBlckNhc2UoKS5yZXBsYWNlKFwiLVwiLCBcIlwiKSk7XG59XG5mdW5jdGlvbiBpc09iamVjdChvYmopIHtcbiAgcmV0dXJuIG9iaiAhPSBudWxsICYmICh0eXBlb2Ygb2JqID09PSBcIm9iamVjdFwiIHx8IHR5cGVvZiBvYmogPT09IFwiZnVuY3Rpb25cIik7XG59XG5mdW5jdGlvbiBpc0Z1bmN0aW9uKHZhbCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbCkgPT09IFwiW29iamVjdCBGdW5jdGlvbl1cIjtcbn1cbmZ1bmN0aW9uIGlzQ29uc3RydWN0b3IoZikge1xuICByZXR1cm4gdHlwZW9mIGYgPT09IFwiZnVuY3Rpb25cIiAmJiBmLnRvU3RyaW5nKCkuaW5kZXhPZihcImNsYXNzXCIpID09PSAwO1xufVxuZnVuY3Rpb24gcmVsb2FkRWxlbWVudChub2RlKSB7XG4gIGxldCBjYWxsYmFjayA9IG51bGw7XG5cbiAgd2hpbGUgKGNhbGxiYWNrID0gbm9kZS5fX3JlbGVhc2VDYWxsYmFja3MucG9wKCkpIGNhbGxiYWNrKG5vZGUpO1xuXG4gIGRlbGV0ZSBub2RlLl9faW5pdGlhbGl6ZWQ7XG4gIG5vZGUucmVuZGVyUm9vdC50ZXh0Q29udGVudCA9IFwiXCI7XG4gIG5vZGUuY29ubmVjdGVkQ2FsbGJhY2soKTtcbn1cblxubGV0IGN1cnJlbnRFbGVtZW50O1xuZnVuY3Rpb24gZ2V0Q3VycmVudEVsZW1lbnQoKSB7XG4gIHJldHVybiBjdXJyZW50RWxlbWVudDtcbn1cbmZ1bmN0aW9uIG5vU2hhZG93RE9NKCkge1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoY3VycmVudEVsZW1lbnQsIFwicmVuZGVyUm9vdFwiLCB7XG4gICAgdmFsdWU6IGN1cnJlbnRFbGVtZW50XG4gIH0pO1xufVxuZnVuY3Rpb24gY3JlYXRlRWxlbWVudFR5cGUoQmFzZUVsZW1lbnQsIHByb3BEZWZpbml0aW9uKSB7XG4gIGNvbnN0IHByb3BLZXlzID0gT2JqZWN0LmtleXMocHJvcERlZmluaXRpb24pO1xuICByZXR1cm4gY2xhc3MgQ3VzdG9tRWxlbWVudCBleHRlbmRzIEJhc2VFbGVtZW50IHtcbiAgICBzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcygpIHtcbiAgICAgIHJldHVybiBwcm9wS2V5cy5tYXAoayA9PiBwcm9wRGVmaW5pdGlvbltrXS5hdHRyaWJ1dGUpO1xuICAgIH1cblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgc3VwZXIoKTtcbiAgICAgIHRoaXMuX19pbml0aWFsaXplZCA9IGZhbHNlO1xuICAgICAgdGhpcy5fX3JlbGVhc2VkID0gZmFsc2U7XG4gICAgICB0aGlzLl9fcmVsZWFzZUNhbGxiYWNrcyA9IFtdO1xuICAgICAgdGhpcy5fX3Byb3BlcnR5Q2hhbmdlZENhbGxiYWNrcyA9IFtdO1xuICAgICAgdGhpcy5fX3VwZGF0aW5nID0ge307XG4gICAgICB0aGlzLnByb3BzID0ge307XG4gICAgfVxuXG4gICAgY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICBpZiAodGhpcy5fX2luaXRpYWxpemVkKSByZXR1cm47XG4gICAgICB0aGlzLl9fcmVsZWFzZUNhbGxiYWNrcyA9IFtdO1xuICAgICAgdGhpcy5fX3Byb3BlcnR5Q2hhbmdlZENhbGxiYWNrcyA9IFtdO1xuICAgICAgdGhpcy5fX3VwZGF0aW5nID0ge307XG4gICAgICB0aGlzLnByb3BzID0gaW5pdGlhbGl6ZVByb3BzKHRoaXMsIHByb3BEZWZpbml0aW9uKTtcbiAgICAgIGNvbnN0IHByb3BzID0gcHJvcFZhbHVlcyh0aGlzLnByb3BzKSxcbiAgICAgICAgICAgIENvbXBvbmVudFR5cGUgPSB0aGlzLkNvbXBvbmVudCxcbiAgICAgICAgICAgIG91dGVyRWxlbWVudCA9IGN1cnJlbnRFbGVtZW50O1xuXG4gICAgICB0cnkge1xuICAgICAgICBjdXJyZW50RWxlbWVudCA9IHRoaXM7XG4gICAgICAgIHRoaXMuX19pbml0aWFsaXplZCA9IHRydWU7XG4gICAgICAgIGlmIChpc0NvbnN0cnVjdG9yKENvbXBvbmVudFR5cGUpKSBuZXcgQ29tcG9uZW50VHlwZShwcm9wcywge1xuICAgICAgICAgIGVsZW1lbnQ6IHRoaXNcbiAgICAgICAgfSk7ZWxzZSBDb21wb25lbnRUeXBlKHByb3BzLCB7XG4gICAgICAgICAgZWxlbWVudDogdGhpc1xuICAgICAgICB9KTtcbiAgICAgIH0gZmluYWxseSB7XG4gICAgICAgIGN1cnJlbnRFbGVtZW50ID0gb3V0ZXJFbGVtZW50O1xuICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIGRpc2Nvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgICAgLy8gcHJldmVudCBwcmVtYXR1cmUgcmVsZWFzaW5nIHdoZW4gZWxlbWVudCBpcyBvbmx5IHRlbXBvcmFyZWx5IHJlbW92ZWQgZnJvbSBET01cbiAgICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgaWYgKHRoaXMuaXNDb25uZWN0ZWQpIHJldHVybjtcbiAgICAgIHRoaXMuX19wcm9wZXJ0eUNoYW5nZWRDYWxsYmFja3MubGVuZ3RoID0gMDtcbiAgICAgIGxldCBjYWxsYmFjayA9IG51bGw7XG5cbiAgICAgIHdoaWxlIChjYWxsYmFjayA9IHRoaXMuX19yZWxlYXNlQ2FsbGJhY2tzLnBvcCgpKSBjYWxsYmFjayh0aGlzKTtcblxuICAgICAgZGVsZXRlIHRoaXMuX19pbml0aWFsaXplZDtcbiAgICAgIHRoaXMuX19yZWxlYXNlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrKG5hbWUsIG9sZFZhbCwgbmV3VmFsKSB7XG4gICAgICBpZiAoIXRoaXMuX19pbml0aWFsaXplZCkgcmV0dXJuO1xuICAgICAgaWYgKHRoaXMuX191cGRhdGluZ1tuYW1lXSkgcmV0dXJuO1xuICAgICAgbmFtZSA9IHRoaXMubG9va3VwUHJvcChuYW1lKTtcblxuICAgICAgaWYgKG5hbWUgaW4gcHJvcERlZmluaXRpb24pIHtcbiAgICAgICAgaWYgKG5ld1ZhbCA9PSBudWxsICYmICF0aGlzW25hbWVdKSByZXR1cm47XG4gICAgICAgIHRoaXNbbmFtZV0gPSBwcm9wRGVmaW5pdGlvbltuYW1lXS5wYXJzZSA/IHBhcnNlQXR0cmlidXRlVmFsdWUobmV3VmFsKSA6IG5ld1ZhbDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsb29rdXBQcm9wKGF0dHJOYW1lKSB7XG4gICAgICBpZiAoIXByb3BEZWZpbml0aW9uKSByZXR1cm47XG4gICAgICByZXR1cm4gcHJvcEtleXMuZmluZChrID0+IGF0dHJOYW1lID09PSBrIHx8IGF0dHJOYW1lID09PSBwcm9wRGVmaW5pdGlvbltrXS5hdHRyaWJ1dGUpO1xuICAgIH1cblxuICAgIGdldCByZW5kZXJSb290KCkge1xuICAgICAgcmV0dXJuIHRoaXMuc2hhZG93Um9vdCB8fCB0aGlzLmF0dGFjaFNoYWRvdyh7XG4gICAgICAgIG1vZGU6IFwib3BlblwiXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBhZGRSZWxlYXNlQ2FsbGJhY2soZm4pIHtcbiAgICAgIHRoaXMuX19yZWxlYXNlQ2FsbGJhY2tzLnB1c2goZm4pO1xuICAgIH1cblxuICAgIGFkZFByb3BlcnR5Q2hhbmdlZENhbGxiYWNrKGZuKSB7XG4gICAgICB0aGlzLl9fcHJvcGVydHlDaGFuZ2VkQ2FsbGJhY2tzLnB1c2goZm4pO1xuICAgIH1cblxuICB9O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVNaXhpbihtaXhpbkZuKSB7XG4gIHJldHVybiBDb21wb25lbnRUeXBlID0+IChwcm9wcywgb3B0aW9ucykgPT4ge1xuICAgIG9wdGlvbnMgPSBtaXhpbkZuKG9wdGlvbnMpO1xuICAgIGlmIChpc0NvbnN0cnVjdG9yKENvbXBvbmVudFR5cGUpKSByZXR1cm4gbmV3IENvbXBvbmVudFR5cGUocHJvcHMsIG9wdGlvbnMpO1xuICAgIHJldHVybiBDb21wb25lbnRUeXBlKHByb3BzLCBvcHRpb25zKTtcbiAgfTtcbn1cbmZ1bmN0aW9uIGNvbXBvc2UoLi4uZm5zKSB7XG4gIGlmIChmbnMubGVuZ3RoID09PSAwKSByZXR1cm4gaSA9PiBpO1xuICBpZiAoZm5zLmxlbmd0aCA9PT0gMSkgcmV0dXJuIGZuc1swXTtcbiAgcmV0dXJuIGZucy5yZWR1Y2UoKGEsIGIpID0+ICguLi5hcmdzKSA9PiBhKGIoLi4uYXJncykpKTtcbn1cblxuY29uc3QgRUMgPSBTeW1ib2woJ2VsZW1lbnQtY29udGV4dCcpO1xuXG5mdW5jdGlvbiBsb29rdXBDb250ZXh0KGVsZW1lbnQsIGNvbnRleHQpIHtcbiAgcmV0dXJuIGVsZW1lbnRbRUNdICYmIGVsZW1lbnRbRUNdW2NvbnRleHQuaWRdIHx8IChlbGVtZW50Lmhvc3QgfHwgZWxlbWVudC5wYXJlbnROb2RlKSAmJiBsb29rdXBDb250ZXh0KGVsZW1lbnQuaG9zdCB8fCBlbGVtZW50LnBhcmVudE5vZGUsIGNvbnRleHQpO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVDb250ZXh0KGluaXRGbikge1xuICByZXR1cm4ge1xuICAgIGlkOiBTeW1ib2woJ2NvbnRleHQnKSxcbiAgICBpbml0Rm5cbiAgfTtcbn0gLy8gRGlyZWN0XG5cbmZ1bmN0aW9uIHByb3ZpZGUoY29udGV4dCwgdmFsdWUsIGVsZW1lbnQgPSBnZXRDdXJyZW50RWxlbWVudCgpKSB7XG4gIGVsZW1lbnRbRUNdIHx8IChlbGVtZW50W0VDXSA9IHt9KTtcbiAgcmV0dXJuIGVsZW1lbnRbRUNdW2NvbnRleHQuaWRdID0gY29udGV4dC5pbml0Rm4gPyBjb250ZXh0LmluaXRGbih2YWx1ZSkgOiB2YWx1ZTtcbn1cbmZ1bmN0aW9uIGNvbnN1bWUoY29udGV4dCwgZWxlbWVudCA9IGdldEN1cnJlbnRFbGVtZW50KCkpIHtcbiAgcmV0dXJuIGxvb2t1cENvbnRleHQoZWxlbWVudCwgY29udGV4dCk7XG59IC8vIEhPQ3NcblxuZnVuY3Rpb24gd2l0aFByb3ZpZGVyKGNvbnRleHQsIHZhbHVlKSB7XG4gIHJldHVybiBjcmVhdGVNaXhpbihvcHRpb25zID0+IHtcbiAgICBjb25zdCB7XG4gICAgICBlbGVtZW50XG4gICAgfSA9IG9wdGlvbnM7XG4gICAgcHJvdmlkZShjb250ZXh0LCB2YWx1ZSwgZWxlbWVudCk7XG4gICAgcmV0dXJuIG9wdGlvbnM7XG4gIH0pO1xufVxuZnVuY3Rpb24gd2l0aENvbnN1bWVyKGNvbnRleHQsIGtleSkge1xuICByZXR1cm4gY3JlYXRlTWl4aW4ob3B0aW9ucyA9PiB7XG4gICAgY29uc3Qge1xuICAgICAgZWxlbWVudFxuICAgIH0gPSBvcHRpb25zO1xuICAgIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zLCB7XG4gICAgICBba2V5XTogbG9va3VwQ29udGV4dChlbGVtZW50LCBjb250ZXh0KVxuICAgIH0pO1xuICAgIHJldHVybiBvcHRpb25zO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gd2Fsayhyb290LCBjYWxsKSB7XG4gIGNhbGwocm9vdCk7XG4gIGlmIChyb290LnNoYWRvd1Jvb3QpIHdhbGsocm9vdC5zaGFkb3dSb290LCBjYWxsKTtcbiAgbGV0IGNoaWxkID0gcm9vdC5maXJzdENoaWxkO1xuXG4gIHdoaWxlIChjaGlsZCkge1xuICAgIGNoaWxkLm5vZGVUeXBlID09PSAxICYmIHdhbGsoY2hpbGQsIGNhbGwpO1xuICAgIGNoaWxkID0gY2hpbGQubmV4dFNpYmxpbmc7XG4gIH1cbn1cblxuZnVuY3Rpb24gaG90KG1vZHVsZSwgdGFnTmFtZSkge1xuICBpZiAobW9kdWxlLmhvdCkge1xuICAgIGZ1bmN0aW9uIHVwZGF0ZShwb3NzaWJsZUVycm9yKSB7XG4gICAgICBpZiAocG9zc2libGVFcnJvciAmJiBwb3NzaWJsZUVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihwb3NzaWJsZUVycm9yKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB3YWxrKGRvY3VtZW50LmJvZHksIG5vZGUgPT4gbm9kZS5sb2NhbE5hbWUgPT09IHRhZ05hbWUgJiYgc2V0VGltZW91dCgoKSA9PiByZWxvYWRFbGVtZW50KG5vZGUpLCAwKSk7XG4gICAgfSAvLyBoYW5kbGUgYm90aCBQYXJjZWwgYW5kIFdlYnBhY2sgc3R5bGVcblxuXG4gICAgbW9kdWxlLmhvdC5hY2NlcHQodXBkYXRlKTtcblxuICAgIGlmIChtb2R1bGUuaG90LnN0YXR1cyAmJiBtb2R1bGUuaG90LnN0YXR1cygpID09PSAnYXBwbHknKSB7XG4gICAgICB1cGRhdGUoKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVnaXN0ZXIodGFnLCBwcm9wcyA9IHt9LCBvcHRpb25zID0ge30pIHtcbiAgY29uc3Qge1xuICAgIEJhc2VFbGVtZW50ID0gSFRNTEVsZW1lbnQsXG4gICAgZXh0ZW5zaW9uXG4gIH0gPSBvcHRpb25zO1xuICByZXR1cm4gQ29tcG9uZW50VHlwZSA9PiB7XG4gICAgaWYgKCF0YWcpIHRocm93IG5ldyBFcnJvcihcInRhZyBpcyByZXF1aXJlZCB0byByZWdpc3RlciBhIENvbXBvbmVudFwiKTtcbiAgICBsZXQgRWxlbWVudFR5cGUgPSBjdXN0b21FbGVtZW50cy5nZXQodGFnKTtcblxuICAgIGlmIChFbGVtZW50VHlwZSkge1xuICAgICAgLy8gQ29uc2lkZXIgZGlzYWJsaW5nIHRoaXMgaW4gYSBwcm9kdWN0aW9uIG1vZGVcbiAgICAgIEVsZW1lbnRUeXBlLnByb3RvdHlwZS5Db21wb25lbnQgPSBDb21wb25lbnRUeXBlO1xuICAgICAgcmV0dXJuIEVsZW1lbnRUeXBlO1xuICAgIH1cblxuICAgIEVsZW1lbnRUeXBlID0gY3JlYXRlRWxlbWVudFR5cGUoQmFzZUVsZW1lbnQsIG5vcm1hbGl6ZVByb3BEZWZzKHByb3BzKSk7XG4gICAgRWxlbWVudFR5cGUucHJvdG90eXBlLkNvbXBvbmVudCA9IENvbXBvbmVudFR5cGU7XG4gICAgRWxlbWVudFR5cGUucHJvdG90eXBlLnJlZ2lzdGVyZWRUYWcgPSB0YWc7XG4gICAgY3VzdG9tRWxlbWVudHMuZGVmaW5lKHRhZywgRWxlbWVudFR5cGUsIGV4dGVuc2lvbik7XG4gICAgcmV0dXJuIEVsZW1lbnRUeXBlO1xuICB9O1xufVxuXG5leHBvcnQgeyBjb21wb3NlLCBjb25zdW1lLCBjcmVhdGVDb250ZXh0LCBjcmVhdGVNaXhpbiwgZ2V0Q3VycmVudEVsZW1lbnQsIGhvdCwgaXNDb25zdHJ1Y3RvciwgaXNGdW5jdGlvbiwgaXNPYmplY3QsIG5vU2hhZG93RE9NLCBwcm92aWRlLCByZWdpc3RlciwgcmVsb2FkRWxlbWVudCwgdG9BdHRyaWJ1dGUsIHRvUHJvcGVydHksIHdpdGhDb25zdW1lciwgd2l0aFByb3ZpZGVyIH07XG4iLCAiaW1wb3J0IHsgcmVnaXN0ZXIgfSBmcm9tIFwiY29tcG9uZW50LXJlZ2lzdGVyXCI7XG5leHBvcnQgeyBob3QsIGdldEN1cnJlbnRFbGVtZW50LCBub1NoYWRvd0RPTSB9IGZyb20gXCJjb21wb25lbnQtcmVnaXN0ZXJcIjtcbmltcG9ydCB7IGNyZWF0ZVJvb3QsIGNyZWF0ZVNpZ25hbCB9IGZyb20gXCJzb2xpZC1qc1wiO1xuaW1wb3J0IHsgaW5zZXJ0IH0gZnJvbSBcInNvbGlkLWpzL3dlYlwiO1xuZnVuY3Rpb24gY3JlYXRlUHJvcHMocmF3KSB7XG4gIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhyYXcpO1xuICBjb25zdCBwcm9wcyA9IHt9O1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBbZ2V0LCBzZXRdID0gY3JlYXRlU2lnbmFsKHJhd1trZXlzW2ldXSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3BzLCBrZXlzW2ldLCB7XG4gICAgICBnZXQsXG4gICAgICBzZXQodikge1xuICAgICAgICBzZXQoKCkgPT4gdik7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIHByb3BzO1xufVxuZnVuY3Rpb24gbG9va3VwQ29udGV4dChlbCkge1xuICBpZiAoZWwuYXNzaWduZWRTbG90ICYmIGVsLmFzc2lnbmVkU2xvdC5fJG93bmVyKSByZXR1cm4gZWwuYXNzaWduZWRTbG90Ll8kb3duZXI7XG4gIGxldCBuZXh0ID0gZWwucGFyZW50Tm9kZTtcbiAgd2hpbGUgKG5leHQgJiYgIW5leHQuXyRvd25lciAmJiAhKG5leHQuYXNzaWduZWRTbG90ICYmIG5leHQuYXNzaWduZWRTbG90Ll8kb3duZXIpKVxuICAgIG5leHQgPSBuZXh0LnBhcmVudE5vZGU7XG4gIHJldHVybiBuZXh0ICYmIG5leHQuYXNzaWduZWRTbG90ID8gbmV4dC5hc3NpZ25lZFNsb3QuXyRvd25lciA6IGVsLl8kb3duZXI7XG59XG5mdW5jdGlvbiB3aXRoU29saWQoQ29tcG9uZW50VHlwZSkge1xuICByZXR1cm4gKHJhd1Byb3BzLCBvcHRpb25zKSA9PiB7XG4gICAgY29uc3QgeyBlbGVtZW50IH0gPSBvcHRpb25zO1xuICAgIHJldHVybiBjcmVhdGVSb290KGRpc3Bvc2UgPT4ge1xuICAgICAgY29uc3QgcHJvcHMgPSBjcmVhdGVQcm9wcyhyYXdQcm9wcyk7XG4gICAgICBlbGVtZW50LmFkZFByb3BlcnR5Q2hhbmdlZENhbGxiYWNrKChrZXksIHZhbCkgPT4gKHByb3BzW2tleV0gPSB2YWwpKTtcbiAgICAgIGVsZW1lbnQuYWRkUmVsZWFzZUNhbGxiYWNrKCgpID0+IHtcbiAgICAgICAgZWxlbWVudC5yZW5kZXJSb290LnRleHRDb250ZW50ID0gXCJcIjtcbiAgICAgICAgZGlzcG9zZSgpO1xuICAgICAgfSk7XG4gICAgICBjb25zdCBjb21wID0gQ29tcG9uZW50VHlwZShwcm9wcywgb3B0aW9ucyk7XG4gICAgICByZXR1cm4gaW5zZXJ0KGVsZW1lbnQucmVuZGVyUm9vdCwgY29tcCk7XG4gICAgfSwgbG9va3VwQ29udGV4dChlbGVtZW50KSk7XG4gIH07XG59XG5mdW5jdGlvbiBjdXN0b21FbGVtZW50KHRhZywgcHJvcHMsIENvbXBvbmVudFR5cGUpIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICBDb21wb25lbnRUeXBlID0gcHJvcHM7XG4gICAgcHJvcHMgPSB7fTtcbiAgfVxuICByZXR1cm4gcmVnaXN0ZXIodGFnLCBwcm9wcykod2l0aFNvbGlkKENvbXBvbmVudFR5cGUpKTtcbn1cbmV4cG9ydCB7IHdpdGhTb2xpZCwgY3VzdG9tRWxlbWVudCB9O1xuIiwgImltcG9ydCB7IHJlbmRlciB9IGZyb20gXCJzb2xpZC1qcy93ZWJcIjtcbmltcG9ydCBUb29sdGlwIGZyb20gXCJAY29ydnUvdG9vbHRpcFwiO1xuaW1wb3J0IHtcbiAgRm9yLFxuICBTaG93LFxuICBjcmVhdGVFZmZlY3QsXG4gIGNyZWF0ZVJlc291cmNlLFxuICBvbkNsZWFudXAsXG4gIG9uTW91bnQsXG59IGZyb20gXCJzb2xpZC1qc1wiO1xuaW1wb3J0IHsgY3VzdG9tRWxlbWVudCB9IGZyb20gXCJzb2xpZC1lbGVtZW50XCI7XG5cbmN1c3RvbUVsZW1lbnQoXCJyaG9tYnVzLXRvb2x0aXBcIiwgKHByb3BzLCB7IGVsZW1lbnQgfSkgPT4ge1xuICBjb25zdCBhbmNob3IgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiZGlhbG9nXCIpO1xuXG4gIC8vIEB0cy1pZ25vcmVcbiAgbGV0IGNoaWxkcmVuOiBIVE1MQ29sbGVjdGlvbiA9IGVsZW1lbnQucmVuZGVyUm9vdC5ob3N0LmNoaWxkcmVuO1xuICBsZXQgY29udGVudDogRWxlbWVudCA9IHVuZGVmaW5lZDtcbiAgbGV0IHRyaWdnZXI6IEVsZW1lbnQgPSB1bmRlZmluZWQ7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBzbG90ID0gY2hpbGRyZW5baV0uc2xvdDtcbiAgICBpZiAoc2xvdCA9PT0gXCJjb250ZW50XCIpIHtcbiAgICAgIGNvbnRlbnQgPSBjaGlsZHJlbltpXTtcbiAgICB9IGVsc2Uge1xuICAgICAgdHJpZ2dlciA9IGNoaWxkcmVuW2ldO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiAoXG4gICAgPFRvb2x0aXBcbiAgICAgIHBsYWNlbWVudD1cInRvcFwiXG4gICAgICBmbG9hdGluZ09wdGlvbnM9e3tcbiAgICAgICAgb2Zmc2V0OiAxMyxcbiAgICAgICAgZmxpcDogdHJ1ZSxcbiAgICAgICAgc2hpZnQ6IHRydWUsXG4gICAgICB9fVxuICAgICAgc3RyYXRlZ3k9XCJmaXhlZFwiXG4gICAgPlxuICAgICAgPFRvb2x0aXAuUG9ydGFsIG1vdW50PXthbmNob3J9PlxuICAgICAgICA8VG9vbHRpcC5Db250ZW50IGNsYXNzPVwidG9vbHRpcFwiPlxuICAgICAgICAgIHtjb250ZW50fVxuICAgICAgICAgIDxUb29sdGlwLkFycm93IGNsYXNzPVwidGV4dC1zZWNvbmRhcnlcIiAvPlxuICAgICAgICA8L1Rvb2x0aXAuQ29udGVudD5cbiAgICAgIDwvVG9vbHRpcC5Qb3J0YWw+XG4gICAgICA8VG9vbHRpcC5UcmlnZ2VyIGFzPVwiZGl2XCI+e3RyaWdnZXJ9PC9Ub29sdGlwLlRyaWdnZXI+XG4gICAgPC9Ub29sdGlwPlxuICApO1xufSk7XG5cbmNvbnN0IFtkYXRhLCB7IHJlZmV0Y2ggfV0gPSBjcmVhdGVSZXNvdXJjZShcbiAgYXN5bmMgKCkgPT5cbiAgICAoYXdhaXQgKFxuICAgICAgYXdhaXQgZmV0Y2goXCIvY2hhbGxlbmdlc1wiLCB7XG4gICAgICAgIGhlYWRlcnM6IHsgYWNjZXB0OiBcImFwcGxpY2F0aW9uL2pzb25cIiB9LFxuICAgICAgfSlcbiAgICApLmpzb24oKSkgYXMgQ2hhbGxlbmdlc0RhdGEsXG4pO1xuY29uc3QgaGFuZGxlciA9ICgpID0+IHJlZmV0Y2goKTtcblxuY29uc3QgQ2hhbGxlbmdlc0NvbXBvbmVudCA9ICgpID0+IHtcbiAgZG9jdW1lbnQuYm9keS5yZW1vdmVFdmVudExpc3RlbmVyKFwibWFudWFsUmVmcmVzaFwiLCBoYW5kbGVyKTtcbiAgZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKFwibWFudWFsUmVmcmVzaFwiLCBoYW5kbGVyKTtcbiAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJmb2N1c1wiLCBoYW5kbGVyKTtcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJmb2N1c1wiLCBoYW5kbGVyKTtcblxuICBjcmVhdGVFZmZlY3QoKCkgPT4ge1xuICAgIGRhdGEoKTtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgaHRteC5wcm9jZXNzKGRvY3VtZW50LmJvZHkpO1xuICB9KTtcblxuICByZXR1cm4gKFxuICAgIDxTaG93IHdoZW49e2RhdGEoKX0+XG4gICAgICA8Rm9yIGVhY2g9e2RhdGEoKS5jYXRlZ29yaWVzfT5cbiAgICAgICAgeyhjYXRlZ29yeSkgPT4ge1xuICAgICAgICAgIGNvbnN0IGNoYWxsZW5nZXMgPSBkYXRhKCkuY2hhbGxlbmdlcy5maWx0ZXIoXG4gICAgICAgICAgICAoY2hhbGxlbmdlKSA9PiBjaGFsbGVuZ2UuY2F0ZWdvcnlfaWQgPT09IGNhdGVnb3J5LmlkLFxuICAgICAgICAgICk7XG5cbiAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgPGRpdlxuICAgICAgICAgICAgICAgIGNsYXNzPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gcm91bmRlZC1tZCBwLTQgZm9udC1ib2xkXCJcbiAgICAgICAgICAgICAgICBzdHlsZT17YGJhY2tncm91bmQtY29sb3I6ICR7Y2F0ZWdvcnkuY29sb3J9YH1cbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIDxzcGFuPntjYXRlZ29yeS5uYW1lfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8c3Bhbj5cbiAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgY2hhbGxlbmdlcy5maWx0ZXIoXG4gICAgICAgICAgICAgICAgICAgICAgKGNoYWxsZW5nZSkgPT5cbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEoKS50ZWFtLnNvbHZlc1tjaGFsbGVuZ2UuaWRdICE9PSB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICkubGVuZ3RoXG4gICAgICAgICAgICAgICAgICB9e1wiIFwifVxuICAgICAgICAgICAgICAgICAgLyB7Y2hhbGxlbmdlcy5sZW5ndGh9XG4gICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPHVsIGNsYXNzPVwiZmxleCBmbGV4LWNvbCBnYXAtNCBweC0yIHB0LTRcIj5cbiAgICAgICAgICAgICAgICA8Rm9yIGVhY2g9e2NoYWxsZW5nZXN9PlxuICAgICAgICAgICAgICAgICAgeyhjaGFsbGVuZ2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYXV0aG9yID0gZGF0YSgpLmF1dGhvcnNbY2hhbGxlbmdlLmF1dGhvcl9pZF07XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNvbHZlID0gZGF0YSgpLnRlYW0uc29sdmVzW2NoYWxsZW5nZS5pZF07XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgICAgICA8bGlcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTGlzdD17e1xuICAgICAgICAgICAgICAgICAgICAgICAgICByaW5nOiBsb2NhdGlvbi5oYXNoLnN1YnN0cmluZygxKSA9PT0gY2hhbGxlbmdlLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJib3JkZXItbC00IGJnLWNhcmQgcC00IHJpbmctb2Zmc2V0LTQgcmluZy1vZmZzZXQtYmFja2dyb3VuZFwiXG4gICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT17YGJvcmRlci1jb2xvcjogJHtjYXRlZ29yeS5jb2xvcn07IC0tdHctcmluZy1jb2xvcjogJHtjYXRlZ29yeS5jb2xvcn1gfVxuICAgICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJtYi0yIGZsZXgganVzdGlmeS1iZXR3ZWVuIGgtOFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZm9udC1ib2xkIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIHN0eWxlPXtgY29sb3I6ICR7Y2F0ZWdvcnkuY29sb3J9YH0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtjYXRlZ29yeS5uYW1lfSAvXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Bhbj4ge2NoYWxsZW5nZS5uYW1lfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VG9vbHRpcFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2VtZW50PVwidG9wXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZsb2F0aW5nT3B0aW9ucz17e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXQ6IDEzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmbGlwOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaGlmdDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuT25Gb2N1cz17ZmFsc2V9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPFRvb2x0aXAuUG9ydGFsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VG9vbHRpcC5Db250ZW50IGNsYXNzPVwidG9vbHRpcFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtjaGFsbGVuZ2UuaGVhbHRoeSA/IChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIENoYWxsZW5nZSBpc3tcIiBcIn1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJ0ZXh0LWdyZWVuLTUwMFwiPnVwPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKSA6IChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIENoYWxsZW5nZSBpc3tcIiBcIn1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJ0ZXh0LXJlZC01MDBcIj5kb3duPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VG9vbHRpcC5BcnJvdyBjbGFzcz1cInRleHQtc2Vjb25kYXJ5XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9Ub29sdGlwLkNvbnRlbnQ+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L1Rvb2x0aXAuUG9ydGFsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPFRvb2x0aXAuVHJpZ2dlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcz1cImRpdlwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPXtgc2l6ZS0zIHJvdW5kZWQtZnVsbCBjdXJzb3ItcG9pbnRlciAke2NoYWxsZW5nZS5oZWFsdGh5ID8gXCJiZy1ncmVlbi01MDBcIiA6IFwiYmctcmVkLTUwMFwifWB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvVG9vbHRpcD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtNFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxTaG93IHdoZW49e3NvbHZlfT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUb29sdGlwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlbWVudD1cInRvcFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZsb2F0aW5nT3B0aW9ucz17e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldDogMTMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmxpcDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaGlmdDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPFRvb2x0aXAuUG9ydGFsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUb29sdGlwLkNvbnRlbnQgY2xhc3M9XCJ0b29sdGlwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgU29sdmVkIGJ5e1wiIFwifVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7ZGF0YSgpLnRlYW0udXNlcnNbc29sdmUudXNlcl9pZF0ubmFtZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUb29sdGlwLkFycm93IGNsYXNzPVwidGV4dC1zZWNvbmRhcnlcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvVG9vbHRpcC5Db250ZW50PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L1Rvb2x0aXAuUG9ydGFsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VG9vbHRpcC5UcmlnZ2VyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXM9XCJpbWdcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwiYXNwZWN0LXNxdWFyZSByb3VuZGVkLWZ1bGwgaC04XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbHQ9e2BTb2x2ZWQgYnkgJHtkYXRhKCkudGVhbS51c2Vyc1tzb2x2ZS51c2VyX2lkXS5uYW1lfWB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3JjPXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEoKS50ZWFtLnVzZXJzW3NvbHZlLnVzZXJfaWRdLmF2YXRhcl91cmxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L1Rvb2x0aXA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9TaG93PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUb29sdGlwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGFjZW1lbnQ9XCJ0b3BcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmxvYXRpbmdPcHRpb25zPXt7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldDogMTMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZsaXA6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNoaWZ0OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VG9vbHRpcC5Qb3J0YWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUb29sdGlwLkNvbnRlbnQgY2xhc3M9XCJ0b29sdGlwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRhYmxlPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge2NoYWxsZW5nZS5kaXZpc2lvbl9wb2ludHMubWFwKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZGl2aXNpb25fcG9pbnRzKSA9PiAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRyPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwicHItMiB0ZXh0LXJpZ2h0XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhKCkuZGl2aXNpb25zW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGl2aXNpb25fcG9pbnRzLmRpdmlzaW9uX2lkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXS5uYW1lXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9XCJwci0yXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtkaXZpc2lvbl9wb2ludHMuc29sdmVzfSBzb2x2ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7ZGl2aXNpb25fcG9pbnRzLnNvbHZlcyAhPT0gMVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gXCJzXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IFwiXCJ9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRkPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7ZGl2aXNpb25fcG9pbnRzLnBvaW50c30gcG9pbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge2RpdmlzaW9uX3BvaW50cy5wb2ludHMgIT09IDFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IFwic1wiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBcIlwifVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3RhYmxlPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUb29sdGlwLkFycm93IGNsYXNzPVwidGV4dC1zZWNvbmRhcnlcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L1Rvb2x0aXAuQ29udGVudD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvVG9vbHRpcC5Qb3J0YWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VG9vbHRpcC5UcmlnZ2VyIGFzPVwic3BhblwiIGNsYXNzPVwiY3Vyc29yLXBvaW50ZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge2NoYWxsZW5nZS5kaXZpc2lvbl9wb2ludHNbMF0uc29sdmVzfSBzb2x2ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7Y2hhbGxlbmdlLmRpdmlzaW9uX3BvaW50c1swXS5zb2x2ZXMgIT09IDFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IFwic1wiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBcIlwifXtcIiBcIn1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyB7Y2hhbGxlbmdlLmRpdmlzaW9uX3BvaW50c1swXS5wb2ludHN9IHBvaW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtjaGFsbGVuZ2UuZGl2aXNpb25fcG9pbnRzWzBdLnBvaW50cyAhPT0gMVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gXCJzXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IFwiXCJ9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L1Rvb2x0aXAuVHJpZ2dlcj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L1Rvb2x0aXA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPFNob3cgd2hlbj17YXV0aG9yfT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUb29sdGlwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlbWVudD1cInRvcFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZsb2F0aW5nT3B0aW9ucz17e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldDogMTMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmxpcDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaGlmdDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPFRvb2x0aXAuUG9ydGFsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUb29sdGlwLkNvbnRlbnQgY2xhc3M9XCJ0b29sdGlwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Bhbj5BdXRob3JlZCBieSB7YXV0aG9yLm5hbWV9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPFRvb2x0aXAuQXJyb3cgY2xhc3M9XCJ0ZXh0LXNlY29uZGFyeVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9Ub29sdGlwLkNvbnRlbnQ+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvVG9vbHRpcC5Qb3J0YWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUb29sdGlwLlRyaWdnZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcz1cImltZ1wiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJhc3BlY3Qtc3F1YXJlIHJvdW5kZWQtZnVsbCBoLThcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsdD17YEF1dGhvcmVkIGJ5ICR7YXV0aG9yLm5hbWV9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcmM9e2F1dGhvci5hdmF0YXJfdXJsfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9Ub29sdGlwPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvU2hvdz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VG9vbHRpcFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2VtZW50PVwidG9wXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZsb2F0aW5nT3B0aW9ucz17e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXQ6IDEzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmbGlwOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaGlmdDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuT25Gb2N1cz17ZmFsc2V9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPFRvb2x0aXAuUG9ydGFsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VG9vbHRpcC5Db250ZW50IGNsYXNzPVwidG9vbHRpcFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuPkNyZWF0ZSBuZXcgdGlja2V0PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUb29sdGlwLkFycm93IGNsYXNzPVwidGV4dC1zZWNvbmRhcnlcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L1Rvb2x0aXAuQ29udGVudD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvVG9vbHRpcC5Qb3J0YWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VG9vbHRpcC5UcmlnZ2VyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaHgtdHJpZ2dlcj1cImNsaWNrXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaHgtZ2V0PXtgL2NoYWxsZW5nZXMvJHtjaGFsbGVuZ2UuaWR9L3RpY2tldGB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh4LXRhcmdldD1cImJvZHlcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoeC1zd2FwPVwiYmVmb3JlZW5kXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHN2Z1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoPVwiMjRcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodD1cIjI0XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3Qm94PVwiMCAwIDI0IDI0XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxsPVwibm9uZVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3Ryb2tlPVwiY3VycmVudENvbG9yXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHJva2Utd2lkdGg9XCIyXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHJva2UtbGluZWNhcD1cInJvdW5kXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJsdWNpZGUgbHVjaWRlLXRpY2tldCAtcm90YXRlLTQ1XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9XCJNMiA5YTMgMyAwIDAgMSAwIDZ2MmEyIDIgMCAwIDAgMiAyaDE2YTIgMiAwIDAgMCAyLTJ2LTJhMyAzIDAgMCAxIDAtNlY3YTIgMiAwIDAgMC0yLTJINGEyIDIgMCAwIDAtMiAyWlwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHBhdGggZD1cIk0xMyA1djJcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9XCJNMTMgMTd2MlwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHBhdGggZD1cIk0xMyAxMXYyXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9zdmc+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L1Rvb2x0aXAuVHJpZ2dlcj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L1Rvb2x0aXA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPFRvb2x0aXBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlbWVudD1cInRvcFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmbG9hdGluZ09wdGlvbnM9e3tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0OiAxMyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmxpcDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2hpZnQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3Blbk9uRm9jdXM9e2ZhbHNlfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUb29sdGlwLlBvcnRhbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPFRvb2x0aXAuQ29udGVudCBjbGFzcz1cInRvb2x0aXBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Bhbj5WaWV3IGZ1bGwgY2hhbGxlbmdlPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUb29sdGlwLkFycm93IGNsYXNzPVwidGV4dC1zZWNvbmRhcnlcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L1Rvb2x0aXAuQ29udGVudD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvVG9vbHRpcC5Qb3J0YWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VG9vbHRpcC5UcmlnZ2VyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaHgtdHJpZ2dlcj1cImNsaWNrXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaHgtZ2V0PXtgL2NoYWxsZW5nZXMvJHtjaGFsbGVuZ2UuaWR9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaHgtdGFyZ2V0PVwiYm9keVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh4LXN3YXA9XCJiZWZvcmVlbmRcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3ZnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg9XCIyNFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0PVwiMjRcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXdCb3g9XCIwIDAgMjQgMjRcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGw9XCJub25lXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHJva2U9XCJjdXJyZW50Q29sb3JcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0cm9rZS13aWR0aD1cIjJcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cImx1Y2lkZSBsdWNpZGUtbGF5b3V0LWdyaWRcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHJlY3RcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoPVwiN1wiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ9XCI3XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg9XCIzXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk9XCIzXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJ4PVwiMVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cmVjdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg9XCI3XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodD1cIjdcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeD1cIjE0XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk9XCIzXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJ4PVwiMVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cmVjdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg9XCI3XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodD1cIjdcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeD1cIjE0XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk9XCIxNFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByeD1cIjFcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHJlY3RcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoPVwiN1wiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ9XCI3XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg9XCIzXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk9XCIxNFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByeD1cIjFcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvc3ZnPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9Ub29sdGlwLlRyaWdnZXI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9Ub29sdGlwPlxuICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdj57Y2hhbGxlbmdlLmRlc2NyaXB0aW9ufTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgIDwvbGk+XG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgIDwvRm9yPlxuICAgICAgICAgICAgICA8L3VsPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgKTtcbiAgICAgICAgfX1cbiAgICAgIDwvRm9yPlxuICAgIDwvU2hvdz5cbiAgKTtcbn07XG5cbnR5cGUgQ2hhbGxlbmdlc0RhdGEgPSB7XG4gIGNoYWxsZW5nZXM6IHtcbiAgICBpZDogbnVtYmVyO1xuICAgIG5hbWU6IHN0cmluZztcbiAgICBkZXNjcmlwdGlvbjogc3RyaW5nO1xuICAgIGhlYWx0aHk6IGJvb2xlYW47XG4gICAgY2F0ZWdvcnlfaWQ6IG51bWJlcjtcbiAgICBhdXRob3JfaWQ6IG51bWJlcjtcbiAgICBkaXZpc2lvbl9wb2ludHM6IHtcbiAgICAgIGRpdmlzaW9uX2lkOiBudW1iZXI7XG4gICAgICBwb2ludHM6IG51bWJlcjtcbiAgICAgIHNvbHZlczogbnVtYmVyO1xuICAgIH1bXTtcbiAgfVtdO1xuICBjYXRlZ29yaWVzOiB7XG4gICAgaWQ6IG51bWJlcjtcbiAgICBuYW1lOiBzdHJpbmc7XG4gICAgY29sb3I6IHN0cmluZztcbiAgfVtdO1xuICBhdXRob3JzOiBSZWNvcmQ8XG4gICAgbnVtYmVyLFxuICAgIHtcbiAgICAgIG5hbWU6IHN0cmluZztcbiAgICAgIGF2YXRhcl91cmw6IHN0cmluZztcbiAgICB9XG4gID47XG4gIGRpdmlzaW9uczogUmVjb3JkPFxuICAgIG51bWJlcixcbiAgICB7XG4gICAgICBuYW1lOiBzdHJpbmc7XG4gICAgfVxuICA+O1xuICB0ZWFtOiB7XG4gICAgdXNlcnM6IFJlY29yZDxcbiAgICAgIG51bWJlcixcbiAgICAgIHtcbiAgICAgICAgbmFtZTogc3RyaW5nO1xuICAgICAgICBhdmF0YXJfdXJsOiBzdHJpbmc7XG4gICAgICB9XG4gICAgPjtcbiAgICBzb2x2ZXM6IFJlY29yZDxcbiAgICAgIG51bWJlcixcbiAgICAgIHtcbiAgICAgICAgc29sdmVkX2F0OiBEYXRlO1xuICAgICAgICB1c2VyX2lkOiBudW1iZXI7XG4gICAgICB9XG4gICAgPjtcbiAgfTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJDaGFsbGVuZ2VzKGVsZW1lbnQ6IEhUTUxFbGVtZW50KSB7XG4gIHJlbmRlcigoKSA9PiA8Q2hhbGxlbmdlc0NvbXBvbmVudCAvPiwgZWxlbWVudCk7XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXNIQSxNQUFNLGVBQWU7QUFBQSxJQUNuQixTQUFTO0FBQUEsSUFDVCxVQUFVO0FBQUEsRUFDWjtBQUNBLFdBQVMsa0JBQWtCLFNBQVM7QUFDbEMsaUJBQWEsVUFBVTtBQUFBLEVBQ3pCO0FBQ0EsV0FBUyxxQkFBcUI7QUFDNUIsV0FBTztBQUFBLE1BQ0wsR0FBRyxhQUFhO0FBQUEsTUFDaEIsSUFBSSxHQUFHLGFBQWEsUUFBUSxFQUFFLEdBQUcsYUFBYSxRQUFRLE9BQU87QUFBQSxNQUM3RCxPQUFPO0FBQUEsSUFDVDtBQUFBLEVBQ0Y7QUFFQSxNQUFNLFVBQVUsQ0FBQyxHQUFHLE1BQU0sTUFBTTtBQUNoQyxNQUFNLFNBQVMsT0FBTyxhQUFhO0FBQ25DLE1BQU0sU0FBUyxPQUFPLGFBQWE7QUFDbkMsTUFBTSxXQUFXLE9BQU8scUJBQXFCO0FBQzdDLE1BQU0sZ0JBQWdCO0FBQUEsSUFD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LE9BQU8sSUFBSSxFQUFFLEdBQUcsSUFBSSxTQUFhO0FBQUEsRUFDckU7QUFDQSxNQUFNLGtCQUFnQyxvQkFBSSxJQUFJO0FBQUEsSUFDNUM7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxFQUNGLENBQUM7QUFDRCxNQUFNLGNBQTRCLG9CQUFJLElBQUk7QUFBQSxJQUN4QztBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJ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LEdBQUF0SDtzQkFBQXlILEdBQUF6SDtzQkFBQTJILEdBQUEzSDtvQkFBQSxDQUFBO0FBQUEsMkJBQUErRDtrQkFBQSxHQUFBO2dCQTBQbkQ7Y0FBQyxDQUFBLENBQUE7QUFBQThDLGlDQUFBZSxTQUFBRixNQUFBMUUsT0F4UksscUJBQW9CUixTQUFTNEUsS0FBTSxJQUFDUSxHQUFBLENBQUE7QUFBQSxxQkFBQTlFO1lBQUEsR0FBQTtVQTZScEQ7UUFBQyxDQUFBO01BQUE7SUFBQSxDQUFBO0VBSVQ7QUFvRE8sV0FBUytFLGlCQUFpQnJJLFNBQXNCO0FBQ3JEc0ksV0FBTyxNQUFBekgsZ0JBQU9zQixxQkFBbUIsQ0FBQSxDQUFBLEdBQUtuQyxPQUFPO0VBQy9DOyIsCiAgIm5hbWVzIjogWyJ2YWx1ZSIsICJlcnJvciIsICJjaGlsZHJlbiIsICJlIiwgImNoaWxkcmVuIiwgImkiLCAic291cmNlcyIsICJkaXNwb3NlIiwgImRvY3VtZW50IiwgImhhbmRsZXIiLCAidGVtcGxhdGUiLCAiaGFuZGxlciIsICJkYXRhIiwgImRpc3Bvc2UiLCAiRHluYW1pYyIsICJyZXNvbHZlQ2hpbGRyZW4iLCAic3R5bGUiLCAicmVzb2x2ZUNoaWxkcmVuIiwgImNoaWxkcmVuIiwgImV2ZW50SGFuZGxlciIsICJwbGF0Zm9ybSIsICJkYXRhIiwgInJlc2V0IiwgIm1heCIsICJvZmZzZXQiLCAiYWxpZ25tZW50IiwgInBsYWNlbWVudHMiLCAic2lkZXMiLCAic2lkZSIsICJwbGFjZW1lbnQiLCAib3ZlcmZsb3ciLCAiZ2V0Qm91bmRpbmdDbGllbnRSZWN0IiwgInRvcCIsICJib3R0b20iLCAibGVmdCIsICJyaWdodCIsICJ3aWR0aCIsICJoZWlnaHQiLCAieCIsICJ5IiwgIm1pbiIsICJwbGF0Zm9ybSIsICJnZXRDb21wdXRlZFN0eWxlIiwgImdldENvbXB1dGVkU3R5bGUiLCAiZGF0YSIsICJvZmZzZXQiLCAiYXV0b1BsYWNlbWVudCIsICJzaGlmdCIsICJmbGlwIiwgInNpemUiLCAiaGlkZSIsICJhcnJvdyIsICJpbmxpbmUiLCAiY29tcHV0ZVBvc2l0aW9uIiwgIm9mZnNldCIsICJzaGlmdCIsICJhcnJvdyIsICJmbGlwIiwgInNpemUiLCAiYXV0b1BsYWNlbWVudCIsICJoaWRlIiwgImlubGluZSIsICJjb21wdXRlUG9zaXRpb24iLCAicmVzb2x2ZUNoaWxkcmVuIiwgImNoaWxkcmVuIiwgInNyY19kZWZhdWx0IiwgImlzRnVuY3Rpb24iLCAicmVmbGVjdCIsICJpc0Z1bmN0aW9uIiwgImRpc3Bvc2UiLCAiY3VzdG9tRWxlbWVudCIsICJwcm9wcyIsICJlbGVtZW50IiwgImFuY2hvciIsICJkb2N1bWVudCIsICJxdWVyeVNlbGVjdG9yIiwgImNoaWxkcmVuIiwgInJlbmRlclJvb3QiLCAiaG9zdCIsICJjb250ZW50IiwgInVuZGVmaW5lZCIsICJ0cmlnZ2VyIiwgImkiLCAibGVuZ3RoIiwgInNsb3QiLCAiXyRjcmVhdGVDb21wb25lbnQiLCAiVG9vbHRpcCIsICJwbGFjZW1lbnQiLCAiZmxvYXRpbmdPcHRpb25zIiwgIm9mZnNldCIsICJmbGlwIiwgInNoaWZ0IiwgInN0cmF0ZWd5IiwgIlBvcnRhbCIsICJtb3VudCIsICJDb250ZW50IiwgIkFycm93IiwgIlRyaWdnZXIiLCAiYXMiLCAiZGF0YSIsICJyZWZldGNoIiwgImNyZWF0ZVJlc291cmNlIiwgImZldGNoIiwgImhlYWRlcnMiLCAiYWNjZXB0IiwgImpzb24iLCAiaGFuZGxlciIsICJDaGFsbGVuZ2VzQ29tcG9uZW50IiwgImJvZHkiLCAicmVtb3ZlRXZlbnRMaXN0ZW5lciIsICJhZGRFdmVudExpc3RlbmVyIiwgIndpbmRvdyIsICJjcmVhdGVFZmZlY3QiLCAiaHRteCIsICJwcm9jZXNzIiwgIlNob3ciLCAid2hlbiIsICJGb3IiLCAiZWFjaCIsICJjYXRlZ29yaWVzIiwgImNhdGVnb3J5IiwgImNoYWxsZW5nZXMiLCAiZmlsdGVyIiwgImNoYWxsZW5nZSIsICJjYXRlZ29yeV9pZCIsICJpZCIsICJfZWwkIiwgIl90bXBsJCIsICJfZWwkMiIsICJmaXJzdENoaWxkIiwgIl9lbCQzIiwgIl9lbCQ0IiwgIm5leHRTaWJsaW5nIiwgIl9lbCQ1IiwgIl9lbCQ3IiwgIl8kaW5zZXJ0IiwgIm5hbWUiLCAidGVhbSIsICJzb2x2ZXMiLCAiYXV0aG9yIiwgImF1dGhvcnMiLCAiYXV0aG9yX2lkIiwgInNvbHZlIiwgIl9lbCQ4IiwgIl90bXBsJDkiLCAiX2VsJDkiLCAiX2VsJDEwIiwgIl9lbCQxMSIsICJfZWwkMTIiLCAiX2VsJDEzIiwgIl9lbCQxNCIsICJfZWwkMTUiLCAiX2VsJDE2IiwgIl9lbCQyNyIsICJvcGVuT25Gb2N1cyIsICJfJG1lbW8iLCAiaGVhbHRoeSIsICJfdG1wbCQxMCIsICJfdG1wbCQxMSIsICJfZWwkMTciLCAiX3RtcGwkMiIsICJfZWwkMTgiLCAidXNlcnMiLCAidXNlcl9pZCIsICJhbHQiLCAic3JjIiwgImF2YXRhcl91cmwiLCAiX2VsJDIwIiwgIl90bXBsJDMiLCAiZGl2aXNpb25fcG9pbnRzIiwgIm1hcCIsICJfZWwkMzAiLCAiX3RtcGwkMTIiLCAiX2VsJDMxIiwgIl9lbCQzMiIsICJfZWwkMzMiLCAiX2VsJDM0IiwgIl9lbCQzNSIsICJkaXZpc2lvbnMiLCAiZGl2aXNpb25faWQiLCAicG9pbnRzIiwgIl9lbCQyMSIsICJfdG1wbCQ0IiwgIl9lbCQyMiIsICJfdG1wbCQ1IiwgIl90bXBsJDYiLCAiX3RtcGwkNyIsICJfdG1wbCQ4IiwgImRlc2NyaXB0aW9uIiwgIl8kZWZmZWN0IiwgIl9wJCIsICJfdiQiLCAibG9jYXRpb24iLCAiaGFzaCIsICJzdWJzdHJpbmciLCAiX3YkMiIsICJjb2xvciIsICJfdiQzIiwgImUiLCAiY2xhc3NMaXN0IiwgInRvZ2dsZSIsICJ0IiwgIl8kc3R5bGUiLCAiYSIsICJfJHAiLCAicmVuZGVyQ2hhbGxlbmdlcyIsICJyZW5kZXIiXQp9Cg==
