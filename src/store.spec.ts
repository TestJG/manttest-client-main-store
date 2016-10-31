"use strict";

import "jest";
require("babel-core/register");
require("babel-polyfill");
import { Observable } from "rxjs/Observable";
import { queue } from "rxjs/scheduler/queue";
import "rxjs/add/observable/concat";
import "rxjs/add/observable/empty";
import "rxjs/add/observable/of";
import "rxjs/add/operator/catch";
import "rxjs/add/operator/concat";
import "rxjs/add/operator/delay";
import "rxjs/add/operator/do";
import "rxjs/add/operator/first";
import "rxjs/add/operator/filter";
import "rxjs/add/operator/last";
import "rxjs/add/operator/map";
import "rxjs/add/operator/observeOn";
import "rxjs/add/operator/subscribeOn";
import "rxjs/add/operator/switchMap";
import "rxjs/add/operator/takeLast";
import "rxjs/add/operator/timeout";
import "rxjs/add/operator/toPromise";

import * as deepEqual from "deep-equal";

import {
    reassign, Store, Action, StoreActions, logUpdates, startEffects,
    tunnelActions, ActionTunnel,
} from "rxstore";
import { testActions, expectedActions } from "rxstore-jest";
import {
    testUpdateEffects, testActionEffects, testStateEffects,
    expectAction, expectItem, testLastStateEffects,
} from "rxstore-jest";

import { defaultMainState, MainViewMode, MainActions, MainState, createMainStore, MainStore } from "./store";
import { createAppStore, AppActions } from "manttest-client-app-store";
import { LoginEvents } from "manttest-client-login-store";
import { AppTitleActions } from "manttest-client-app-title-store";

/* DATA */

const serviceEmptyMock = jest.fn(() => null);
const init = defaultMainState(serviceEmptyMock);
const initVMApp = reassign(init, { viewMode: MainViewMode.App });
const initNoLogin = reassign(init, { loginStore: null });
const initWithApp = reassign(init, { appStore: createAppStore()() });
const withData: MainState = {
    appStore: createAppStore()(),
    loginStore: null,
    viewMode: MainViewMode.App,
};

/* TESTS */

describe("defaultMainState", () => {
    describe("Sanity checks", () => {
        it("Should be a function", () => {
            expect(typeof defaultMainState).toBe("function");
        });
    });

    describe("Given no options", () => {
        it("The default state should have default values", () => {
            const state = defaultMainState(serviceEmptyMock);
            expect(state.appStore).toBeNull();
            expect(state.loginStore).not.toBeNull();
            expect(state.viewMode).toEqual(MainViewMode.Login);
        });
    });
});

testActions(MainActions, "MainActions",
    expectedActions<MainState>("MantTest.Main/",
        actions => {
            actions.typed("setViewMode", "SET_VIEW_MODE")
                .withSample(init, MainViewMode.Login, init)
                .withSample(init, MainViewMode.App, initVMApp);

            actions.typed("createLogin", "CREATE_LOGIN")
                .withSample(init, null, init);

            actions.typed("createApp", "CREATE_APP")
                .withSample(init, null, init);

            actions.empty("destroyLogin", "DESTROY_LOGIN")
                .withSample(init, initNoLogin)
                .withSample(initNoLogin, initNoLogin);

            actions.empty("destroyApp", "DESTROY_APP")
                .withSample(init, init)
                .withSample(initWithApp, init);
        }));

describe("createMainStore", () => {
    describe("Sanity checks", () => {
        it("should be a function", () => expect(typeof createAppStore).toBe("function"));
    });

    describe("Initial State testing", () => {
        testLastStateEffects<MainState, MainStore>("Given a defaultMainState", createMainStore([]))
            ("When the store receives no actions", "The state should be as expected", [],
            state => {
                expect(typeof state.appStore).toBe("object");
                expect(typeof state.loginStore).toBe("object");
                expect(state.appStore).toBeNull();
                expect(state.loginStore).not.toBeNull();
            });

        testLastStateEffects<MainState, MainStore>("Given an initial state",
            () => createMainStore([])({ init: withData }))
            ("When the store receives no actions", "The state should be as expected", [],
            state => {
                expect(state.appStore).toEqual(withData.appStore);
                expect(state.loginStore).toEqual(withData.loginStore);
                expect(state.viewMode).toEqual(withData.viewMode);
            });
    });

    describe("LoginCompleted effects", () => {
        describe("Given a main store when its login store dispatches a Login Completed action", () => {
            it("it should dispatch a createApp, setViewMode(AppView) and a destroyLogin", () => {
                const store = createMainStore([])();
                const promise = store.action$
                    .timeout(40, undefined, queue)
                    .catch(e => Observable.empty<Action>())
                    .takeLast(3)
                    .toArray().toPromise() as PromiseLike<Action[]>;
                store.state$
                    .first()
                    .subscribe(s => s.loginStore.dispatch(LoginEvents.loginCompleted()));
                return promise.then(a => {
                    expect(a.length).toEqual(3);
                    expect(a[0].type).toEqual(MainActions.createApp.type);
                    expect(a[1]).toEqual(MainActions.setViewMode(MainViewMode.App));
                    expect(a[2]).toEqual(MainActions.destroyLogin());
                });
            });
        });
    });

    describe("LogOut Effects", () => {
        describe("Given a main store when its app store dispatches a Log Out action", () => {
            it("it should dispatch a createLogin and setViewMode(LoginView)", () => {
                const store = createMainStore([])({ init: withData });
                const promise = store.action$
                    .timeout(40, undefined, queue)
                    .catch(e => Observable.empty<Action>())
                    .takeLast(2)
                    .toArray().toPromise() as PromiseLike<Action[]>;
                store.state$
                    .first()
                    .subscribe(s => s.appStore.dispatch(AppTitleActions.logOut()));
                return promise.then(a => {
                    expect(a.length).toEqual(2);
                    expect(a[0].type).toEqual(MainActions.createLogin.type);
                    expect(a[1]).toEqual(MainActions.setViewMode(MainViewMode.Login));
                });
            });
        });
    });
});
