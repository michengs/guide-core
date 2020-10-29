"use strict";

const EventEmitter = require("events").EventEmitter;
const path = require("path");

const Hooks = require("./hooks");

// Zone type codes
global.SP = 1;
global.ES = 2;

/**
 * @typedef {import("../../index").deps} deps
 */

class Guide extends EventEmitter {
	/**
	 * Creates an instance of Guide.
	 * @param {deps} deps
	 * @param {string} id
	 * @memberof Guide
	 */
	constructor(deps, id) {
		super();

		this.__deps = deps;

		// Loaded guide id
		this.__id = id;

		// Type of zone skill id range
		this.__type = false;

		// Object of guide context
		this.__context = {};

		// Guide temporary data
		this.__data = {
			"abnormals": new Map(), // list of registred abnormalities
			"ent": null, // last entity of triggered event by func handler
			"mobsHp": {} // list of last values of mobs HP
		};

		// Create an instance of Hooks
		this.__hooks = new Hooks(deps, this);

		// Set max listeners number
		this.setMaxListeners(30);
	}

	/**
	 * Load guide.
	 * @memberof Guide
	 */
	load() {
		let Path_guide = undefined;	
		switch (this.__deps.lang.language) {			
				case "tw" : // 
                Path_guide = path.resolve(this.__deps.mod.info.path, "guides_TW", this.__id);					
				break;				
				case "kr" : // 
                Path_guide = path.resolve(this.__deps.mod.info.path, "guides_KR", this.__id);		
				break;				
				case "jp" : // 
                Path_guide = path.resolve(this.__deps.mod.info.path, "guides_JP", this.__id);		
				break;					
				case "de" : // 
                Path_guide = path.resolve(this.__deps.mod.info.path, "guides_DE", this.__id);		
				break;					
				case "fr" : // 
                Path_guide = path.resolve(this.__deps.mod.info.path, "guides_FR", this.__id);		
				break;	
				case "ru" : // 
                Path_guide = path.resolve(this.__deps.mod.info.path, "guides_RU", this.__id);		
				break;				
			    default:
                Path_guide = path.resolve(this.__deps.mod.info.path, "guides", this.__id);
				break;
			}
	    const resolvedPath = Path_guide
		const object = require(resolvedPath);

		// Delete data from require cache
		delete require.cache[require.resolve(resolvedPath)];

		if (typeof object === "function") {
			// Define function to create an guide object
			const guideObject = guide => ({
				get "id"() {
					return guide.__id;
				},
				get "type"() {
					return guide.__type;
				},
				set "type"(value) {
					guide.__type = value;
				},
				get "settings"() {
					return guide.__deps.zone.settings;
				}
			});

			// Call the object as a function
			this.__context = object(this.__deps.dispatch, this.__deps.handlers.types, guideObject(this), this.__deps.lang.props);
		} else {
			// COMPAT: Try to call the function load()
			this.__context = object;
			this.__context.load(this.__deps.dispatch);

			try {
				if (require("../compat/data/spZones")["ids"].includes(parseInt(this.__id)))
					this.type = SP;
				else if (require("../compat/data/esZones")["ids"].includes(parseInt(this.__id)))
					this.type = ES;
			} catch (e) {
				this.type = false;
			}
		}
	}

	/**
	 * Unload loaded guide.
	 * @param {boolean} [debugMode=false] Force enable debug messages.
	 * @memberof Guide
	 */
	unload(debugMode = false) {
		// Clear out the hooks
		this.__deps.dispatch._remove_all_hooks();
		this.__hooks.unload(debugMode);

		// Clear out the timers
		this.__deps.handlers.types.stop_timers();

		// Force despawn for all spawned objects
		this.__deps.handlers.types.despawn_all();

		// Force remove of all markers
		this.__deps.handlers.types.marker_remove_all();

		// Clear out handlers data
		this.__deps.handlers.clearData();

		// Remove all guide events
		this.removeAllListeners();

		// Send debug message
		this.__deps.handlers.send.debug(debugMode, `Guide "${this.__id}" has been unloaded.`);
	}

	/**
	 * Add event listners for guide.
	 * @memberof Guide
	 */
	addEvents() {
		// Add error event listener
		this.on("error", e => this.__deps.mod.error(e));

		Object.keys(this.__context).forEach(key => {
			const events = this.__context[key];
			if (key === "error")
				return this.emit("error", `Cannot use word "${key}" as a key.`);

			if (typeof events === "string" && events !== key)
				// Add listener for alias entry
				this.on(key, ent => this.emit(events, ent));
			else {
				if (!Array.isArray(events))
					return this.emit("error", `Key "${key}" has invalid type.`);

				if (events.length > this.getMaxListeners())
					return this.emit("error", `Limit of records for key "${key}" exceeded.`);

				// Add listeners to event entries
				Object.keys(events).forEach(entry =>
					this.on(key, ent => this.__deps.handlers.trigger(events[entry], ent, key))
				);
			}
		});
	}

	/**
	 * Load affected hooks.
	 * @param {boolean} [debugMode=false] Force enable debug messages.
	 * @memberof Guide
	 */
	addHooks(debugMode = false) {
		const keys = [];

		Object.keys(this.__context).forEach(keyString => {
			const key = keyString.split("-")[0];

			if (!keys.includes(key) && key !== "load")
				keys.push(key);
		});

		this.__hooks.load(keys, debugMode);
	}

	/**
	 * Event handler.
	 * @param {string[]} key Array of key parts for event emit.
	 * @param {Object} ent Entity object from event.
	 * @param {Object} debug Debug information params.
	 * @memberof Guide
	 */
	handleEvent(key, ent, debug) {
		const keyString = key.join("-");

		// Send debug messages if enabled
		if (this.__deps.mod.settings.debug.all || this.__deps.mod.settings.debug[key[0]]) {
			const defined = this.listenerCount(keyString) > 0 ? ` [${this.getEventMessage(keyString) || "defined"}]` : "";

			this.__deps.handlers.send.debug(true, `${cw}${debug.name}: ${debug.color}${keyString}${cw}${defined}`);
		}

		// Emit event
		this.emit(keyString, ent);
	}

	/**
	 * Get event message string for specified event key.
	 * @param {string} key Event key.
	 * @return {string} Message string.
	 * @memberof Guide
	 */
	getEventMessage(key) {
		const message = [];

		if (!Array.isArray(this.__context[key])) {
			if (this.__context[key] === key) return;

			return this.getEventMessage(this.__context[key]);
		}

		this.__context[key].forEach(event => {
			if (event.type === "alias") {
				if (event.id === key) return;

				const aliasMessage = this.getEventMessage(event.id);

				if (aliasMessage.length === 0) return;

				return message.push(aliasMessage);
			}

			if (event.type === "text")
				message.push(this.__deps.lang.getEventText(event));
		});

		return message.join(", ");
	}

	/**
	 * Get guide id.
	 * @readonly
	 * @memberof Guide
	 */
	get id() {
		return this.__id;
	}

	/**
	 * Get guide type.
	 * @readonly
	 * @memberof Guide
	 */
	get type() {
		return this.__type;
	}

	/**
	 * Set guide type.
	 * @readonly
	 * @memberof Guide
	 */
	set type(value) {
		this.__type = value;
	}

	/**
	 * Get guide context.
	 * @readonly
	 * @memberof Guide
	 */
	get context() {
		return this.__context;
	}

	/**
	 * Get zone settings.
	 * @readonly
	 * @memberof Guide
	 */
	get settings() {
		return this.__deps.zone.settings;
	}

	/**
	 * Get instance of hooks.
	 * @readonly
	 * @memberof Guide
	 */
	get hooks() {
		return this.__hooks;
	}

	/**
	 * Get guide temporary data.
	 * @readonly
	 * @memberof Guide
	 */
	get data() {
		return this.__data;
	}

	/**
	 * Set guide temporary data.
	 * @memberof Guide
	 */
	set data(value) {
		this.__data = value;
	}
}

module.exports = Guide;

// Export compat
module.exports.lib = require("../compat/lib");
module.exports.spawn = require("../spawn");