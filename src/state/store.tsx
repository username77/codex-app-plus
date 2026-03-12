import { createContext, useCallback, useContext, useMemo, useRef, useSyncExternalStore } from "react";
import type { PropsWithChildren } from "react";
import type { AppAction, AppState } from "../domain/types";
import { appReducer, createInitialState } from "./appReducer";

type StoreListener = () => void;

export interface AppStoreApi {
  getState: () => AppState;
  dispatch: (action: AppAction) => void;
  subscribe: (listener: StoreListener) => () => void;
}

interface StoreValue {
  readonly state: AppState;
  dispatch: (action: AppAction) => void;
}

const AppStoreContext = createContext<AppStoreApi | null>(null);

function createAppStore(initialState: AppState): AppStoreApi {
  let state = initialState;
  const listeners = new Set<StoreListener>();

  return {
    getState: () => state,
    dispatch: (action) => {
      const nextState = appReducer(state, action);
      if (Object.is(nextState, state)) {
        return;
      }
      state = nextState;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function AppStoreProvider({ children }: PropsWithChildren): JSX.Element {
  const storeRef = useRef<AppStoreApi | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createAppStore(createInitialState());
  }
  return <AppStoreContext.Provider value={storeRef.current}>{children}</AppStoreContext.Provider>;
}

export function useAppStoreApi(): AppStoreApi {
  const context = useContext(AppStoreContext);
  if (context === null) {
    throw new Error("useAppStoreApi 必须在 AppStoreProvider 内部使用");
  }
  return context;
}

export function useAppDispatch(): AppStoreApi["dispatch"] {
  return useAppStoreApi().dispatch;
}

export function useAppSelector<Selection>(
  selector: (state: AppState) => Selection,
  isEqual: (left: Selection, right: Selection) => boolean = Object.is,
): Selection {
  const store = useAppStoreApi();
  const cachedStateRef = useRef<AppState | null>(null);
  const cachedSelectionRef = useRef<Selection | null>(null);
  const hasSelectionRef = useRef(false);
  const selectorRef = useRef(selector);
  const isEqualRef = useRef(isEqual);

  const getSnapshot = useCallback(() => {
    const nextState = store.getState();
    const selectorChanged = selectorRef.current !== selector || isEqualRef.current !== isEqual;
    selectorRef.current = selector;
    isEqualRef.current = isEqual;

    if (selectorChanged === false && cachedStateRef.current === nextState && hasSelectionRef.current) {
      return cachedSelectionRef.current as Selection;
    }

    const nextSelection = selector(nextState);
    if (hasSelectionRef.current && isEqual(cachedSelectionRef.current as Selection, nextSelection)) {
      cachedStateRef.current = nextState;
      return cachedSelectionRef.current as Selection;
    }

    cachedStateRef.current = nextState;
    cachedSelectionRef.current = nextSelection;
    hasSelectionRef.current = true;
    return nextSelection;
  }, [isEqual, selector, store]);

  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

export function useAppStore(): StoreValue {
  const state = useAppSelector((currentState) => currentState);
  const dispatch = useAppDispatch();
  return useMemo(() => ({ state, dispatch }), [dispatch, state]);
}
