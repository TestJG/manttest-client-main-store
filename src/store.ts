import { Observable } from "rxjs/Observable";
import "rxjs/add/observable/of";
import "rxjs/add/observable/empty";
import "rxjs/add/observable/merge";
import "rxjs/add/operator/distinctUntilChanged";
import "rxjs/add/operator/filter";
import "rxjs/add/operator/map";
import "rxjs/add/operator/switchMap";
import "rxjs/add/operator/startWith";
import "rxjs/add/operator/observeOn";
import "rxjs/add/operator/subscribeOn";
import "rxjs/add/operator/debounceTime";
import "rxjs/add/operator/timeout";
import * as deepEqual from "deep-equal";
import {
  reassign, reassignif,
  actionCreator, TypedActionDescription, EmptyActionDescription,
  reducerFromActions, Reducer, StateUpdate,
  createStore, Store, StoreMiddleware,
  withEffects, defineStore, ICreateStoreOptions, logUpdates,
  tunnelActions, extendWithActions, extendWith, Action,
} from "rxstore";

import { AppStore, createAppStore, AppState } from "manttest-client-app-store";
import { AppTitleActions } from "manttest-client-app-title-store";
import { LoginStore, createLoginStore, LoginService, LoginEvents } from "manttest-client-login-store";

/* MODELS */

export interface MainState {
    viewMode: MainViewMode;

    loginStore: LoginStore | null;
    appStore: AppStore | null;
}

export enum MainViewMode {
    Login = 0,
    App = 1,
}

/* ACTIONS */

export interface MainEvents {}

const newEvent = actionCreator<MainState>("MantTest.Main/");

export const MainActions = {
    setViewMode: newEvent.of<MainViewMode>("SET_VIEW_MODE", (s, p) =>
        reassignif(s.viewMode !== p, s, {viewMode: p})),

    createLogin: newEvent.of<LoginStore>("CREATE_LOGIN", (s, p) =>
        reassignif(!s.loginStore, s, {loginStore: p})),

    createApp: newEvent.of<AppStore>("CREATE_APP", (s, p) =>
        reassignif(!s.appStore, s, {appStore: p})),

    destroyLogin: newEvent("DESTROY_LOGIN", s => reassignif(s.loginStore ? true : false, s, {loginStore: null})),

    destroyApp: newEvent("DESTROY_APP", s => reassignif(s.appStore ? true : false, s, {appStore: null})),
};

/* STORE */

const MainReducer = reducerFromActions<MainState>(MainActions);

export type MainStore = Store<MainState> & MainEvents;

export const defaultMainState = (loginService: LoginService): MainState => ({
    viewMode: 0,
    loginStore: createLoginStore(loginService)(),
    appStore: null,
});

export const loginCompletedEffects = (store: MainStore) => store.state$
    .switchMap(s => s.loginStore ? s.loginStore.action$ : Observable.empty<Action>())
    .filter(a => a.type === LoginEvents.loginCompleted.type)
    .switchMap(a => {
        const appStore = createAppStore()();
        return Observable.of(
            MainActions.createApp(appStore),
            MainActions.setViewMode(MainViewMode.App),
            MainActions.destroyLogin(),
        );
    });

export const logOutEffects = (loginService: LoginService) => (store: MainStore) => store.state$
    .switchMap(s => s.appStore ? s.appStore.action$ : Observable.empty<Action>())
    .filter(a => a.type === AppTitleActions.logOut.type)
    .switchMap(a => {
        const loginStore = createLoginStore(loginService)();
        return Observable.of(
            MainActions.createLogin(loginStore),
            MainActions.setViewMode(MainViewMode.Login),
            // MainActions.destroyApp(),
        );
    });

export const createMainStore = (Services: any[]) => defineStore<MainState, MainStore>(
    MainReducer,
    defaultMainState(Services[4]),
    extendWithActions(MainActions),
    withEffects(
        loginCompletedEffects,
        logOutEffects(Services[4])),
);
