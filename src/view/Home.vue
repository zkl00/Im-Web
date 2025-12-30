<template>
	<div class="home-page" @click="closeUserInfo">
		<div class="app-container" :class="{ fullscreen: configStore.fullScreen }">
			<div class="navi-bar">
				<div class="navi-bar-box">
					<div class="top">
						<div class="user-head-image">
							<head-image :name="userStore.userInfo.nickName" :size="38"
								:url="userStore.userInfo.headImageThumb" @click.native="showSettingDialog = true">
							</head-image>
						</div>
						<div class="menu">
							<router-link class="link" v-bind:to="'/home/chat'">
								<div class="menu-item">
									<span class="icon iconfont icon-chat"></span>
									<div v-show="unreadCount > 0" class="unread-text">{{ unreadCount }}</div>
									<span class="menu-label">消息</span>
								</div>
							</router-link>
							<router-link class="link" v-bind:to="'/home/friend'">
								<div class="menu-item">
									<span class="icon iconfont icon-friend"></span>
									<span class="menu-label">好友</span>
								</div>
							</router-link>
							<router-link class="link" v-bind:to="'/home/friend-apply'">
								<div class="menu-item">
									<span class="icon el-icon-bell" style="font-size: 22px"></span>
									<div v-show="friendStore.applyCount > 0" class="unread-text">{{ friendStore.applyCount }}</div>
									<span class="menu-label">申请</span>
								</div>
							</router-link>
							<router-link class="link" v-bind:to="'/home/blacklist'">
								<div class="menu-item">
									<span class="icon el-icon-warning-outline" style="font-size: 22px"></span>
									<span class="menu-label">黑名单</span>
								</div>
							</router-link>
							<router-link class="link" v-bind:to="'/home/group'">
								<div class="menu-item">
									<span class="icon iconfont icon-group" style="font-size: 28px"></span>
									<span class="menu-label">群组</span>
								</div>
							</router-link>
						</div>
					</div>

					<div class="botoom">
						<div class="bottom-item" @click="onSwtichFullScreen" title="全屏">
							<i class="el-icon-full-screen"></i>
						</div>
						<div class="bottom-item" @click="showSetting" title="设置">
							<span class="icon iconfont icon-setting" style="font-size: 20px"></span>
						</div>
						<div class="bottom-item" @click="onExit()" title="退出">
							<span class="icon iconfont icon-exit"></span>
						</div>
					</div>
				</div>
			</div>
			<div class="content-box">
				<router-view></router-view>
			</div>
			<setting :visible="showSettingDialog" @close="closeSetting()"></setting>
			<user-info ref="userInfo"></user-info>
			<full-image ref="fullImage"></full-image>
			<rtc-private-video ref="rtcPrivateVideo"></rtc-private-video>
			<rtc-group-video ref="rtcGroupVideo"></rtc-group-video>
		</div>
	</div>
</template>

<script>
import HeadImage from '../components/common/HeadImage.vue';
import Setting from '../components/setting/Setting.vue';
import UserInfo from '../components/common/UserInfo.vue';
import FullImage from '../components/common/FullImage.vue';
import RtcPrivateVideo from '../components/rtc/RtcPrivateVideo.vue';
import RtcPrivateAcceptor from '../components/rtc/RtcPrivateAcceptor.vue';
import RtcGroupVideo from '../components/rtc/RtcGroupVideo.vue';

export default {
	components: {
		HeadImage,
		Setting,
		UserInfo,
		FullImage,
		RtcPrivateVideo,
		RtcPrivateAcceptor,
		RtcGroupVideo
	},
	data() {
		return {
			showSettingDialog: false,
			lastPlayAudioTime: new Date().getTime() - 1000,
			reconnecting: false,
			privateMessagesBuffer: [],
			groupMessagesBuffer: []
		}
	},
	methods: {
		init() {
			this.$eventBus.$on('openPrivateVideo', (rctInfo) => {
				// 进入单人视频通话
				this.$refs.rtcPrivateVideo.open(rctInfo);
			});
			this.$eventBus.$on('openGroupVideo', (rctInfo) => {
				// 进入多人视频通话
				this.$refs.rtcGroupVideo.open(rctInfo);
			});
			this.$eventBus.$on('openUserInfo', (user, pos) => {
				// 打开用户卡片
				this.$refs.userInfo.open(user, pos);
			});
			this.$eventBus.$on('openFullImage', url => {
				// 图片全屏
				this.$refs.fullImage.open(url);
			});
			this.configStore.setAppInit(false)
			this.loadStore().then(() => {
				// ws初始化
				this.$wsApi.connect(process.env.VUE_APP_WS_URL, sessionStorage.getItem("token"), sessionStorage.getItem("userID"));
				this.$wsApi.onConnect(() => {
					if (this.reconnecting) {
						this.onReconnectWs();
					} else {
						// 加载离线消息
						this.pullOfflineMessage();
						this.configStore.setAppInit(true);
					}
				});
				// V2: 注册 RTC 信令回调
				this.$wsApi.onRtcMessage((data) => {
					this.handleRtcMessageV2(data);
				});
				this.$wsApi.onMessage((cmd, msgInfo) => {
					if (cmd == 2) {
						// 关闭ws
						this.$wsApi.close(3000)
						// 异地登录，强制下线
						this.$alert("您已在其他地方登录，将被强制下线", "强制下线通知", {
							confirmButtonText: '确定',
							callback: action => {
								location.href = "/";
							}
						});
					} else if (cmd == 3) {
						if (!this.configStore.appInit || this.chatStore.loading) {
							// 如果正在拉取离线消息，先放进缓存区，等待消息拉取完成再处理，防止消息乱序
							this.privateMessagesBuffer.push(msgInfo);
						} else {
							// 插入私聊消息
							this.handlePrivateMessage(msgInfo);
						}
					} else if (cmd == 4) {
						if (!this.configStore.appInit || this.chatStore.loading) {
							// 如果正在拉取离线消息，先放进缓存区，等待消息拉取完成再处理，防止消息乱序
							this.groupMessagesBuffer.push(msgInfo);
						} else {
							// 插入群聊消息
							this.handleGroupMessage(msgInfo);
						}
					} else if (cmd == 5) {
						// 处理系统消息
						this.handleSystemMessage(msgInfo);
					}
				});
				this.$wsApi.onClose((e) => {
					if (e.code != 3000) {
						// 断线重连
						if (!this.reconnecting) {
							this.reconnectWs();
							this.configStore.setAppInit(false)
						}
					}
				});
			}).catch((e) => {
				console.log("初始化失败", e);
			})
		},
		reconnectWs() {
			// 记录标志
			this.reconnecting = true;
			// 重新加载一次个人信息，目的是为了保证网络已经正常且token有效
			this.userStore.loadUser().then(() => {
				// 断线重连
				this.$message.error("连接断开，正在尝试重新连接...");
				this.$wsApi.reconnect(process.env.VUE_APP_WS_URL, sessionStorage.getItem("token"), sessionStorage.getItem("userID"));
			}).catch(() => {
				// 10s后重试
				setTimeout(() => this.reconnectWs(), 10000)
			})
		},
		onReconnectWs() {
			// 重连成功
			this.reconnecting = false;
			// 重新加载群和好友
			const promises = [];
			promises.push(this.friendStore.loadFriend());
			// promises.push(this.groupStore.loadGroup()); // 暂时不用
			Promise.all(promises).then(() => {
				// 加载离线消息
				this.pullOfflineMessage();
				this.configStore.setAppInit(true)
				this.$message.success("重新连接成功");
			}).catch((e) => {
				console.error('[onReconnectWs] 初始化失败:', e);
				this.$message.error("初始化失败");
				this.onExit();
			})
		},
		loadStore() {
			return this.userStore.loadUser().then(() => {
				const promises = [];
				promises.push(this.friendStore.loadFriend());
				// V9 API: 使用会话列表接口获取聊天和群信息
				promises.push(this.chatStore.loadConversationList());
				// 加载好友申请数量
				this.friendStore.loadApplyCount();
				return Promise.all(promises);
			})
		},
		unloadStore() {
			this.friendStore.clear();
			this.groupStore.clear();
			this.chatStore.clear();
			this.userStore.clear();
		},
		// V10 API: 刷新会话列表（离线消息已在 loadConversationList 中处理）
		pullOfflineMessage() {
			this.chatStore.setLoading(true);
			// 处理缓冲区收到的实时消息
			this.privateMessagesBuffer.forEach(m => this.handlePrivateMessage(m));
			this.groupMessagesBuffer.forEach(m => this.handleGroupMessage(m));
			// 清空缓冲区
			this.privateMessagesBuffer = [];
			this.groupMessagesBuffer = [];
			// 关闭加载离线标记
			this.chatStore.setLoading(false);
			// 刷新会话
			this.chatStore.refreshChats();
		},
		handlePrivateMessage(msg) {
			// 标记这条消息是不是自己发的
			msg.selfSend = msg.sendId == this.userStore.userInfo.id;
			// 好友id
			let friendId = msg.selfSend ? msg.recvId : msg.sendId;
			// 会话信息
			let chatInfo = {
				type: 'PRIVATE',
				targetId: friendId
			}
			// 消息已读处理，清空已读数量
			if (msg.type == this.$enums.MESSAGE_TYPE.READED) {
				this.chatStore.resetUnreadCount(chatInfo)
				return;
			}
			// 消息回执处理,改消息状态为已读
			if (msg.type == this.$enums.MESSAGE_TYPE.RECEIPT) {
				this.chatStore.readedMessage({
					friendId: msg.sendId
				})
				return;
			}
			// 消息撤回
			if (msg.type == this.$enums.MESSAGE_TYPE.RECALL) {
				this.chatStore.recallMessage(msg, chatInfo)
				return;
			}
			// 新增好友
			if (msg.type == this.$enums.MESSAGE_TYPE.FRIEND_NEW) {
				this.friendStore.addFriend(JSON.parse(msg.content));
				return;
			}
			// 删除好友
			if (msg.type == this.$enums.MESSAGE_TYPE.FRIEND_DEL) {
				this.friendStore.removeFriend(friendId);
				return;
			}
			// 对好友设置免打扰
			if (msg.type == this.$enums.MESSAGE_TYPE.FRIEND_DND) {
				this.friendStore.setDnd(friendId, JSON.parse(msg.content));
				this.chatStore.setDnd(chatInfo, JSON.parse(msg.content));
				return;
			}
			// 单人webrtc 信令
			if (this.$msgType.isRtcPrivate(msg.type)) {
				this.$refs.rtcPrivateVideo.onRTCMessage(msg)
				return;
			}
			// 插入消息
			if (this.$msgType.isNormal(msg.type) || this.$msgType.isTip(msg.type) || this.$msgType.isAction(msg.type)) {
				let friend = this.loadFriendInfo(friendId);
				this.insertPrivateMessage(friend, msg);
			}
		},
		insertPrivateMessage(friend, msg) {
			let chatInfo = {
				type: 'PRIVATE',
				targetId: friend.id,
				showName: friend.nickName,
				headImage: friend.headImage,
				isDnd: friend.isDnd
			};
			// 打开会话
			this.chatStore.openChat(chatInfo);
			// 插入消息
			this.chatStore.insertMessage(msg, chatInfo);
			// 播放提示音
			if (!friend.isDnd && !this.chatStore.loading && !msg.selfSend && this.$msgType.isNormal(msg.type) &&
				msg.status != this.$enums.MESSAGE_STATUS.READED) {
				this.playAudioTip();
			}
		},
		handleGroupMessage(msg) {
			// 标记这条消息是不是自己发的
			msg.selfSend = msg.sendId == this.userStore.userInfo.id;
			let chatInfo = {
				type: 'GROUP',
				targetId: msg.groupId
			}
			// 消息已读处理
			if (msg.type == this.$enums.MESSAGE_TYPE.READED) {
				// 我已读对方的消息，清空已读数量
				this.chatStore.resetUnreadCount(chatInfo)
				return;
			}
			// 消息回执处理
			if (msg.type == this.$enums.MESSAGE_TYPE.RECEIPT) {
				// 更新消息已读人数
				let msgInfo = {
					id: msg.id,
					groupId: msg.groupId,
					readedCount: msg.readedCount,
					receiptOk: msg.receiptOk
				};
				this.chatStore.updateMessage(msgInfo, chatInfo)
				return;
			}
			// 消息撤回
			if (msg.type == this.$enums.MESSAGE_TYPE.RECALL) {
				this.chatStore.recallMessage(msg, chatInfo)
				return;
			}
			// 新增群
			if (msg.type == this.$enums.MESSAGE_TYPE.GROUP_NEW) {
				this.groupStore.addGroup(JSON.parse(msg.content));
				return;
			}
			// 删除群
			if (msg.type == this.$enums.MESSAGE_TYPE.GROUP_DEL) {
				this.groupStore.removeGroup(msg.groupId);
				return;
			}
			// 对群设置免打扰
			if (msg.type == this.$enums.MESSAGE_TYPE.GROUP_DND) {
				this.groupStore.setDnd(msg.groupId, JSON.parse(msg.content));
				this.chatStore.setDnd(chatInfo, JSON.parse(msg.content));
				return;
			}
			// 群视频信令
			if (this.$msgType.isRtcGroup(msg.type)) {
				this.$nextTick(() => {
					this.$refs.rtcGroupVideo.onRTCMessage(msg);
				})
				return;
			}
			// 插入群聊消息
			if (this.$msgType.isNormal(msg.type) || this.$msgType.isTip(msg.type) || this.$msgType.isAction(msg.type)) {
				let group = this.loadGroupInfo(msg.groupId);
				this.insertGroupMessage(group, msg);
			}
		},
		insertGroupMessage(group, msg) {
			let chatInfo = {
				type: 'GROUP',
				targetId: group.id,
				showName: group.showGroupName,
				headImage: group.headImageThumb,
				isDnd: group.isDnd
			};
			// 打开会话
			this.chatStore.openChat(chatInfo);
			// 插入消息
			this.chatStore.insertMessage(msg, chatInfo);
			// 播放提示音
			if (!group.isDnd && !this.chatStore.loading &&
				!msg.selfSend && this.$msgType.isNormal(msg.type) &&
				msg.status != this.$enums.MESSAGE_STATUS.READED) {
				this.playAudioTip();
			}
		},
		// V2: 处理 RTC 信令
		handleRtcMessageV2(data) {
			console.log('[Home] 收到 RTC 信令:', data);
			// 转发给 RtcPrivateVideo 组件处理
			this.$refs.rtcPrivateVideo.onRTCMessageV2(data);
		},
		handleSystemMessage(msg) {
			// 用户被封禁
			if (msg.type == this.$enums.MESSAGE_TYPE.USER_BANNED) {
				this.$wsApi.close(3000);
				this.$alert("您的账号已被管理员封禁,原因:" + msg.content, "账号被封禁", {
					confirmButtonText: '确定',
					callback: () => {
						this.onExit();
					}
				});
				return;
			}
			// 新增好友通知 (contentType: 1201/1203)
			if (msg.type == this.$enums.MESSAGE_TYPE.FRIEND_NEW) {
				// 刷新好友列表
				this.friendStore.loadFriend().then(() => {
					// 解析通知内容，创建会话并插入提示消息
					try {
						const content = typeof msg.rawContent === 'object' ? msg.rawContent : JSON.parse(msg.content);
						const detail = typeof content.detail === 'string' ? JSON.parse(content.detail) : content.detail;
						// 获取好友ID（对方的ID）
						const fromUserId = detail?.fromToUserID?.fromUserID;
						const toUserId = detail?.fromToUserID?.toUserID;
						const myId = this.userStore.userInfo.id;
						const friendId = fromUserId === myId ? toUserId : fromUserId;

						if (friendId) {
							const friend = this.friendStore.findFriend(friendId);
							const friendName = friend?.nickName || friendId;
							// 创建会话
							let chatInfo = {
								type: 'PRIVATE',
								targetId: friendId,
								showName: friendName,
								headImage: friend?.headImage || ''
							};
							this.chatStore.openChat(chatInfo);
							// 插入提示消息
							let tipMsg = {
								id: `tip_${Date.now()}`,
								type: this.$enums.MESSAGE_TYPE.TIP_TEXT,
								content: `你已添加 ${friendName} 为好友，现在可以开始聊天了`,
								sendTime: msg.sendTime || Date.now(),
								selfSend: false
							};
							this.chatStore.insertMessage(tipMsg, chatInfo);
						}
					} catch (e) {
						console.error('[handleSystemMessage] 解析好友通知失败:', e);
					}
				});
				// 通知好友申请页面刷新
				this.$eventBus.$emit('refreshFriendApply');
				// 刷新申请角标
				this.friendStore.loadApplyCount();
				return;
			}
			// 好友申请被拒绝通知 (contentType: 1202)
			if (msg.type == this.$enums.MESSAGE_TYPE.FRIEND_REJECTED) {
				// 刷新好友列表
				this.friendStore.loadFriend();
				// 通知好友申请页面刷新
				this.$eventBus.$emit('refreshFriendApply');
				// 刷新申请角标
				this.friendStore.loadApplyCount();
				return;
			}
			// 删除好友通知 (contentType: 1204)
			if (msg.type == this.$enums.MESSAGE_TYPE.FRIEND_DEL) {
				// 解析通知内容获取好友ID
				try {
					const content = typeof msg.rawContent === 'object' ? msg.rawContent : JSON.parse(msg.content);
					const detail = typeof content.detail === 'string' ? JSON.parse(content.detail) : content.detail;
					const friendId = detail?.fromToUserID?.fromUserID || detail?.fromUserID;
					if (friendId && friendId !== this.userStore.userInfo.id) {
						this.friendStore.removeFriend(friendId);
						this.chatStore.removePrivateChat(friendId);
					}
				} catch (e) {
					// 解析失败，刷新好友列表
					this.friendStore.loadFriend();
				}
				return;
			}
		},
		closeUserInfo() {
			this.$refs.userInfo.close();
		},
		onSwtichFullScreen() {
			this.configStore.setFullScreen(!this.configStore.fullScreen);
		},
		onExit() {
			this.unloadStore();
			this.configStore.setAppInit(false);
			this.$wsApi.close(3000);
			sessionStorage.removeItem("token");
			location.href = "/";
		},
		playAudioTip() {
			// 防止过于密集播放
			if (new Date().getTime() - this.lastPlayAudioTime > 1000) {
				this.lastPlayAudioTime = new Date().getTime();
				let audio = new Audio();
				let url = require(`@/assets/audio/tip.mp3`);
				audio.src = url;
				audio.play();
			}

		},
		showSetting() {
			this.showSettingDialog = true;
		},
		closeSetting() {
			this.showSettingDialog = false;
		},
		loadFriendInfo(id) {
			let friend = this.friendStore.findFriend(id);
			if (!friend) {
				friend = {
					id: id,
					showNickName: "未知用户",
					headImage: ""
				}
			}
			return friend;
		},
		loadGroupInfo(id) {
			let group = this.groupStore.findGroup(id);
			if (!group) {
				group = {
					id: id,
					showGroupName: "未知群聊",
					headImageThumb: ""
				}
			}
			return group;
		}
	},
	computed: {
		unreadCount() {
			let unreadCount = 0;
			let chats = this.chatStore.chats;
			chats.forEach(chat => {
				if (!chat.delete && !chat.isDnd) {
					unreadCount += chat.unreadCount
				}
			});
			return unreadCount;
		}
	},
	watch: {
		unreadCount: {
			handler(newCount, oldCount) {
				let tip = newCount > 0 ? `${newCount}条未读` : "";
				this.$elm.setTitleTip(tip);
			},
			immediate: true
		}
	},
	mounted() {
		this.init();
	},
	unmounted() {
		this.$wsApi.close();
	}
}
</script>

<style scoped lang="scss">
.home-page {
	height: 100vh;
	width: 100vw;
	display: flex;
	justify-content: center;
	align-items: center;
	border-radius: 4px;
	overflow: hidden;
	background: var(--im-color-primary-light-9);

	.app-container {
		width: 62vw;
		height: 80vh;
		display: flex;
		min-height: 600px;
		min-width: 970px;
		position: absolute;
		border-radius: 4px;
		overflow: hidden;
		box-shadow: var(--im-box-shadow-dark);
		transition: 0.2s;

		&.fullscreen {
			transition: 0.2s;
			width: 100vw;
			height: 100vh;
		}
	}

	.navi-bar {
		--icon-font-size: 22px;
		--width: 60px;
		width: var(--width);
		background: var(--im-color-primary-light-1);
		padding-top: 20px;

		.navi-bar-box {
			height: 100%;
			display: flex;
			flex-direction: column;
			justify-content: space-between;

			.botoom {
				margin-bottom: 30px;
			}
		}

		.user-head-image {
			display: flex;
			justify-content: center;
		}

		.menu {
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-content: center;
			flex-wrap: wrap;
			margin-top: 20px;

			.link {
				text-decoration: none;
			}

			.router-link-active .menu-item {
				color: white;
				background: var(--im-color-primary-light-2);
			}

			.link:not(.router-link-active) .menu-item:hover {
				color: white;
				background: rgba(255, 255, 255, 0.1);
			}

			.menu-item {
				position: relative;
				color: #eee;
				width: var(--width);
				height: 56px;
				display: flex;
				flex-direction: column;
				justify-content: center;
				align-items: center;
				margin-top: 20px;
				border-radius: 10px;

				.icon {
					font-size: var(--icon-font-size)
				}

				.menu-label {
					font-size: 10px;
					margin-top: 4px;
				}

				.unread-text {
					position: absolute;
					background-color: var(--im-color-danger);
					right: 6px;
					top: 4px;
					color: white;
					border-radius: 30px;
					padding: 0 5px;
					font-size: var(--im-font-size-smaller);
					text-align: center;
					white-space: nowrap;
					border: 1px solid #f1e5e5;
				}
			}
		}

		.bottom-item {
			display: flex;
			justify-content: center;
			align-items: center;
			height: 50px;
			width: 100%;
			cursor: pointer;
			color: var(--im-color-primary-light-4);
			font-size: var(--icon-font-size);

			.icon {
				font-size: var(--icon-font-size)
			}

			&:hover {
				font-weight: 600;
				color: var(--im-color-primary-light-7);
			}
		}
	}

	.content-box {
		flex: 1;
		padding: 0;
		background-color: #fff;
		text-align: center;
	}
}
</style>