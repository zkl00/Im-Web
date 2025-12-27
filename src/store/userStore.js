import { defineStore } from 'pinia';
import http from '../api/httpRequest.js'
import { RTC_STATE } from "../api/enums.js"

export default defineStore('userStore', {
	state: () => {
		return {
			userInfo: {},
			rtcInfo: {
				friend: {},  // 好友信息
				mode: "video", // 模式 video:视频 voice:语音
				state: RTC_STATE.FREE // FREE:空闲  WAIT_CALL:呼叫方等待 WAIT_ACCEPT: 被呼叫方等待接听  CHATING:聊天中
			}
		}
	},
	actions: {
		setUserInfo(userInfo) {
			this.userInfo = userInfo
		},
		setRtcInfo(rtcInfo) {
			this.rtcInfo = rtcInfo;
		},
		setRtcState(rtcState) {
			this.rtcInfo.state = rtcState;
		},
		clear() {
			this.userInfo = {};
			this.rtcInfo = {
				friend: {},
				mode: "video",
				state: RTC_STATE.FREE
			};
		},
		loadUser() {
			return new Promise((resolve, reject) => {
				const userID = sessionStorage.getItem("userID");
				if (!userID) {
					reject(new Error("userID not found"));
					return;
				}
				http({
					url: '/user/get_users_info',
					method: 'POST',
					data: {
						userIDs: [userID]
					}
				}).then((data) => {
					console.log(data);
					const user = data.usersInfo?.[0] || data[0];
					if (user) {
						// V8 API 字段映射
						const userInfo = {
							id: user.userID,
							userName: user.userID,
							nickName: user.nickname,
							headImage: user.faceURL,
							headImageThumb: user.faceURL,
							signature: user.ex || '',
							sex: 0
						};
						this.setUserInfo(userInfo);
						resolve();
					} else {
						reject(new Error("User info not found"));
					}
				}).catch((res) => {
					reject(res);
				});
			})
		}
	}
});
