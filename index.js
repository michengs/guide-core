"use strict";

const defaultParams = {
	"colors": { "gui": {}, "general": {} },
	"command": ["guide"],
	"chat_name": "Guide",
};

/**
 * Submodules.
 * @typedef {Object} deps
 * @property {*} mod
 * @property {*} params
 * @property {import('./lib/dispatch')} dispatch
 * @property {import('./lib/lang')} lang
 * @property {import('./lib/speech')} speech
 * @property {import('./lib/core/proto')} proto
 * @property {import('./lib/core/events')} events
 * @property {import('./lib/core/functions')} functions
 * @property {import('./lib/core/handlers')} handlers
 * @property {import('./lib/core/hooks')} hooks
 * @property {import('./lib/core/guide')} guide
 * @property {import('./lib/core/gui')} gui
 * @property {import('./lib/core/commands')} commands
 */

const submodules = [
	["dispatch", require("./lib/dispatch")],
	["lang", require("./lib/lang")],
	["speech", require("./lib/speech")],
	["proto", require("./lib/core/proto")],
	["events", require("./lib/core/events")],
	["functions", require("./lib/core/functions")],
	["handlers", require("./lib/core/handlers")],
	["hooks", require("./lib/core/hooks")],
	["guide", require("./lib/core/guide")],
	["gui", require("./lib/core/gui")],
	["commands", require("./lib/core/commands")],
];

class TeraGuideCore {
	constructor(mod, params = {}) {
		/** 
		 * @type {deps}
		 */
		let deps = { "mod": mod, "params": { ...defaultParams, ...params } };

		submodules.forEach(submodule => {
			deps[submodule[0]] = new submodule[1](deps);
		});

		Object.keys(deps).forEach(key => {
			if (key !== "mod" && typeof deps[key].init === "function") {
				deps[key].init();
			}
		});

		this.destructor = () => {
			Object.keys(deps).forEach(key => {
				if (key !== "mod" && typeof deps[key].destructor === "function") {
					deps[key].destructor();
				}
			});
		};
	}
}

class Loader {
	load(mod, ...args) {
		return new TeraGuideCore(mod, ...args);
	}
}

module.exports.NetworkMod = function Require(mod) {
	if(mod.info.name !== "tera-guide-core")
		throw new Error(`Tried to require tera-guide-core module: ${mod.info.name}`);

	return new Loader();
};

module.exports.RequireInterface = (globalMod, clientMod, networkMod) => networkMod;