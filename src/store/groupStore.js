import { defineStore } from 'pinia';
import http from '../api/httpRequest.js'

export default defineStore('groupStore', {
	state: () => {
		return {
			groups: []
		}
	},
	actions: {
		setGroups(groups) {
			this.groups = groups;
		},
		addGroup(group) {
			if (this.groups.some(g => g.id == group.id)) {
				this.updateGroup(group)
			} else {
				this.groups.unshift(group);
			}
		},
		removeGroup(id) {
			this.groups.filter(g => g.id == id).forEach(g => g.quit = true);
		},
		updateGroup(group) {
			this.groups.forEach((g, idx) => {
				if (g.id == group.id) {
					// 拷贝属性
					Object.assign(this.groups[idx], group);
				}
			})
		},
		updateTopMessage(id, topMessage) {
			let group = this.findGroup(id);
			if (group) {
				group.topMessage = topMessage;
			}
		},
		setDnd(id, isDnd) {
			let group = this.findGroup(id);
			group.isDnd = isDnd;
		},		
		clear() {
			this.groups = [];
		},
		// V9 API 没有获取已加入群列表的接口，群信息从会话列表中获取
		loadGroup() {
			return Promise.resolve();
		}
	},
	getters: {
		findGroup: (state) => (id) => {
			return state.groups.find(g => g.id == id);
		},
		isGroup: (state) => (id) => {
			return state.groups.filter(g => !g.quit).some(g => g.id == id);
		},
	}
});