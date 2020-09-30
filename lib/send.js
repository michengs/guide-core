'use strict';

global.spt = 31; // text notice
global.spg = 42; // green message
global.spb = 43; // blue message
global.spr = 44; // red message
global.spi = 66; // blue info message
global.spn = 49; // left side notice

class Send {

	constructor(mod, params) {
		this.mod = mod;
		this.params = params;
		this.chatName = params.chat_name;
	}

	// Basic message
	message(message) {
		// If streamer mode is enabled send message to the proxy-channel
		if (this.mod.settings.stream)
			return this.mod.command.message(this.mod.settings.cc + message);

		let sending_event = { message };

		if (this.chatName)
			Object.assign(sending_event, { name: this.chatName });

		if (this.mod.settings.lNotice)
			// Send message as a Team leader notification
			//   21 = team leader, 25 = raid leader, 1 = party, 2 = guild
			this.mod.toClient("S_CHAT", 3, Object.assign(sending_event, { channel: 21 }));
		else
			// Send message as a green colored Dungeon Event
			this.dungeonEvent(message, this.mod.settings.cc, spg);

		// Send message to party chat if gNotice is enabled
		if (this.mod.settings.gNotice)
			this.mod.toClient("S_CHAT", 3, Object.assign(sending_event, { channel: 1 }));
	}

	// Notification message
	notification(message) {
		// If streamer mode is enabled send message to the proxy-channel
		if (this.mod.settings.stream)
			return this.mod.command.message(clb + "[Notice] " + this.mod.settings.cc + message);

		let sending_event = { message };

		if (this.chatName)
			Object.assign(sending_event, { name: this.chatName });

		// Send message as a Raid leader notification
		this.mod.toClient("S_CHAT", 3, Object.assign(sending_event, { channel: 25 }));

		// Send message to party chat if gNotice is enabled
		if (this.mod.settings.gNotice)
			this.mod.toClient("S_CHAT", 3, Object.assign(sending_event, { channel: 1 }));
	}

	// Alert message
	alert(message, cc, spc) {
		// If streamer mode is enabled send message to the proxy-channel
		if (this.mod.settings.stream)
			return this.mod.command.message(cc + "[Alert] " + this.mod.settings.cc + message);

		let sending_event = { message };

		if (this.chatName)
			Object.assign(sending_event, { name: this.chatName });

		if (this.mod.settings.lNotice) {
			// Send message as a Raid leader notification
			this.mod.toClient("S_CHAT", 3, Object.assign(sending_event, { channel: 25 }));
		} else
			// Send message as a color-specified Dungeon Event
			this.dungeonEvent(message, this.mod.settings.cc, spc);

		// Send message to party if gNotice or gAlert is enabled
		if (this.mod.settings.gNotice) {
			this.mod.toClient("S_CHAT", 3, Object.assign(sending_event, { channel: 1 }));
		}
	}

	// Dungeon Event message
	dungeonEvent(message, spcc, type) {
		// If streamer mode is enabled send message to the proxy-channel
		if (this.mod.settings.stream)
			return this.mod.command.message(spcc + message);

		// Send a color-specified Dungeon Event message
		this.mod.toClient("S_DUNGEON_EVENT_MESSAGE", 2, {
			type: type,
			chat: 0,
			channel: 27,
			message: spcc + message
		});
	}

	// Write generic debug message used when creating guides
	debug(enabled, ...args) {
		if (!enabled) return;

		if (this.mod.settings.debug.chat)
			this.mod.command.message(args.toString());

		console.log("[Guide]", ...args);
	}
}

module.exports = Send;