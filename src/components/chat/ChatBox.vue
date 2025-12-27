<template>
	<div class="chat-box" @click="closeRefBox()" @mousemove="readedMessage()">
		<el-container>
			<el-header height="50px">
				<span>{{ title }}</span>
				<span title="群聊信息" v-show="isGroup" class="btn-side el-icon-more" @click="showSide = !showSide"></span>
			</el-header>
			<el-main style="padding: 0;">
				<el-container>
					<el-container class="content-box">
						<el-main class="im-chat-main" id="chatScrollBox" @scroll="onScroll">
							<div class="im-chat-box">
								<div v-for="(msgInfo, idx) in showMessages" :key="showMinIdx + idx">
									<chat-message-item @call="onCall(msgInfo.type)" :mine="msgInfo.sendId == mine.id"
										:headImage="headImage(msgInfo)" :showName="showName(msgInfo)" :msgInfo="msgInfo"
										:groupMembers="groupMembers" @resend="onResendMessage" @delete="deleteMessage"
										@recall="recallMessage">
									</chat-message-item>
								</div>
							</div>
						</el-main>
						<div v-if="!isInBottom" class="scroll-to-bottom" @click="scrollToBottom">
							{{ newMessageSize > 0 ? newMessageSize + '条新消息' : '回到底部' }}
						</div>
						<el-footer height="220px" class="im-chat-footer">
							<div class="chat-tool-bar">
								<div title="表情" class="icon iconfont icon-emoji" ref="emotion"
									@click.stop="showEmotionBox()">
								</div>
								<div title="发送图片">
									<file-upload uploadType="image" :maxSize="5 * 1024 * 1024"
										:fileTypes="['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif']"
										@before="onImageBefore" @success="onImageSuccess" @fail="onImageFail">
										<i class="el-icon-picture-outline"></i>
									</file-upload>
								</div>
								<div title="发送文件">
									<file-upload ref="fileUpload" uploadType="file" :maxSize="100 * 1024 * 1024"
										@before="onFileBefore" @success="onFileSuccess" @fail="onFileFail">
										<i class="el-icon-wallet"></i>
									</file-upload>
								</div>
								<div title="回执消息" v-show="isGroup && memberSize <= 500"
									class="icon iconfont icon-receipt" :class="isReceipt ? 'chat-tool-active' : ''"
									@click="onSwitchReceipt">
								</div>
								<div title="发送语音" class="el-icon-microphone" @click="showRecordBox()">
								</div>
								<div title="语音通话" v-show="isPrivate" class="el-icon-phone-outline"
									@click="showPrivateVideo('voice')">
								</div>
								<div title="语音通话" v-show="isGroup" class="el-icon-phone-outline"
									@click="onGroupVideo()">
								</div>
								<div title="视频通话" v-show="isPrivate" class="el-icon-video-camera"
									@click="showPrivateVideo('video')">
								</div>
								<div title="聊天记录" class="el-icon-chat-dot-round" @click="showHistoryBox()"></div>
							</div>
							<div class="send-content-area">
								<ChatInput :ownerId="group.ownerId" ref="chatInputEditor" :group-members="groupMembers"
									@submit="sendMessage" />
								<div class="send-btn-area">
									<el-button type="primary" icon="el-icon-s-promotion"
										@click="notifySend()">发送</el-button>
								</div>
							</div>
						</el-footer>
					</el-container>
					<el-aside class="side-box" width="320px" v-if="showSide">
						<chat-group-side :group="group" :groupMembers="groupMembers" @reload="loadGroup(group.id)">
						</chat-group-side>
					</el-aside>
				</el-container>
			</el-main>
			<emotion ref="emoBox" @emotion="onEmotion"></Emotion>
			<chat-record :visible="showRecord" @close="closeRecordBox" @send="onSendRecord"></chat-record>
			<group-member-selector ref="rtcSel" :group="group" @complete="onInviteOk"></group-member-selector>
			<rtc-group-join ref="rtcJoin" :groupId="group.id"></rtc-group-join>
			<chat-history :visible="showHistory" :chat="chat" :friend="friend" :group="group"
				:groupMembers="groupMembers" @close="closeHistoryBox"></chat-history>
		</el-container>
	</div>
</template>

<script>
import ChatGroupSide from "./ChatGroupSide.vue";
import ChatMessageItem from "./ChatMessageItem.vue";
import FileUpload from "../common/FileUpload.vue";
import Emotion from "../common/Emotion.vue";
import ChatRecord from "./ChatRecord.vue";
import ChatHistory from "./ChatHistory.vue";
import ChatAtBox from "./ChatAtBox.vue"
import GroupMemberSelector from "../group/GroupMemberSelector.vue"
import RtcGroupJoin from "../rtc/RtcGroupJoin.vue"
import ChatInput from "./ChatInput";


export default {
	name: "chatPrivate",
	components: {
		ChatInput,
		ChatMessageItem,
		FileUpload,
		ChatGroupSide,
		Emotion,
		ChatRecord,
		ChatHistory,
		ChatAtBox,
		GroupMemberSelector,
		RtcGroupJoin
	},
	props: {
		chat: {
			type: Object
		}
	},
	data() {
		return {
			userInfo: {},
			group: {},
			groupMembers: [],
			sendImageUrl: "",
			sendImageFile: "",
			placeholder: "",
			isReceipt: true,
			showRecord: false, // 是否显示语音录制弹窗
			showSide: false, // 是否显示群聊信息栏
			showHistory: false, // 是否显示历史聊天记录
			lockMessage: false, // 是否锁定发送，
			showMinIdx: 0, // 下标低于showMinIdx的消息不显示，否则页面会很卡置
			reqQueue: [], // 等待发送的请求队列
			isSending: false, // 是否正在发消息
			isInBottom: false, // 滚动条是否在底部
			newMessageSize: 0, // 滚动条不在底部时新的消息数量
			maxTmpId: 0 // 最后生成的临时ID
		}
	},
	methods: {
		moveChatToTop() {
			let chatIdx = this.chatStore.findChatIdx(this.chat);
			this.chatStore.moveTop(chatIdx);
		},
		closeRefBox() {
			this.$refs.emoBox.close();
			// this.$refs.atBox.close();
		},
		onCall(type) {
			if (type == this.$enums.MESSAGE_TYPE.ACT_RT_VOICE) {
				this.showPrivateVideo('voice');
			} else if (type == this.$enums.MESSAGE_TYPE.ACT_RT_VIDEO) {
				this.showPrivateVideo('video');
			}
		},
		onSwitchReceipt() {
			this.isReceipt = !this.isReceipt;
			this.refreshPlaceHolder();
		},
		onImageSuccess(data, file) {
			let msgInfo = JSON.parse(JSON.stringify(file.msgInfo));

			// 获取之前保存的宽高信息
			let width, height;
			try {
				if (file.msgInfo.content) {
					const oldContent = JSON.parse(file.msgInfo.content);
					width = oldContent.width;
					height = oldContent.height;
				}
			} catch (e) {
				// 忽略解析错误
			}

			// 统一转换为本地格式 { originUrl, thumbUrl, width, height }
			// 兼容 FileUpload 返回的 { url } 和旧接口返回的 { originUrl, thumbUrl }
			const url = data.url || data.originUrl;
			const imageData = {
				originUrl: data.originUrl || url,
				thumbUrl: data.thumbUrl || url,
				width: width,
				height: height
			};
			msgInfo.content = JSON.stringify(imageData);
			msgInfo.receipt = this.isReceipt;
			this.sendMessageRequest(msgInfo).then((m) => {
				msgInfo.id = m.id;
				msgInfo.status = m.status;
				msgInfo.seq = m.seq;
				this.isReceipt = false;
				this.chatStore.updateMessage(msgInfo, file.chat);
			}).catch(() => {
				msgInfo.status = this.$enums.MESSAGE_STATUS.FAILED;
				this.chatStore.updateMessage(msgInfo, file.chat);
			})
		},
		onImageFail(e, file) {
			let msgInfo = JSON.parse(JSON.stringify(file.msgInfo));
			msgInfo.status = this.$enums.MESSAGE_STATUS.FAILED;
			this.chatStore.updateMessage(msgInfo, file.chat);
		},
		onImageBefore(file) {
			// 被封禁提示
			if (this.isBanned) {
				this.showBannedTip();
				return;
			}
			let url = URL.createObjectURL(file);
			let data = {
				originUrl: url,
				thumbUrl: url
			}
			let msgInfo = {
				tmpId: this.generateId(),
				fileId: file.uid,
				sendId: this.mine.id,
				content: JSON.stringify(data),
				sendTime: new Date().getTime(),
				selfSend: true,
				type: this.$enums.MESSAGE_TYPE.IMAGE,
				readedCount: 0,
				status: this.$enums.MESSAGE_STATUS.SENDING
			}
			// 填充对方id
			this.fillTargetId(msgInfo, this.chat.targetId);
			// 插入消息
			this.chatStore.insertMessage(msgInfo, this.chat);
			// 会话置顶
			this.moveChatToTop();
			// 借助file对象保存
			file.msgInfo = msgInfo;
			file.chat = this.chat;
			// 更新图片尺寸
			let chat = this.chat;
			this.getImageSize(file).then(size => {
				data.width = size.width;
				data.height = size.height;
				msgInfo.content = JSON.stringify(data)
				this.chatStore.updateMessage(msgInfo, chat);
				this.scrollToBottom();
			})
		},
		onFileSuccess(uploadResult, file) {
			// 统一转换为本地格式 { url, name, size }
			// 兼容 FileUpload 返回的 { url, name, size, type } 和字符串 URL
			const fileUrl = typeof uploadResult === 'string' ? uploadResult : uploadResult.url;
			let data = {
				name: file.name,
				size: file.size,
				url: fileUrl
			}
			let msgInfo = JSON.parse(JSON.stringify(file.msgInfo));
			msgInfo.content = JSON.stringify(data);
			msgInfo.receipt = this.isReceipt
			this.sendMessageRequest(msgInfo).then((m) => {
				msgInfo.id = m.id;
				msgInfo.status = m.status;
				msgInfo.seq = m.seq;
				this.isReceipt = false;
				this.refreshPlaceHolder();
				this.chatStore.updateMessage(msgInfo, file.chat);
			}).catch(() => {
				msgInfo.status = this.$enums.MESSAGE_STATUS.FAILED;
				this.chatStore.updateMessage(msgInfo, file.chat);
			})
		},
		onFileFail(e, file) {
			let msgInfo = JSON.parse(JSON.stringify(file.msgInfo));
			msgInfo.status = this.$enums.MESSAGE_STATUS.FAILED;
			this.chatStore.updateMessage(msgInfo, file.chat);
		},
		onFileBefore(file) {
			// 被封禁提示
			if (this.isBanned) {
				this.showBannedTip();
				return;
			}
			let url = URL.createObjectURL(file);
			let data = {
				name: file.name,
				size: file.size,
				url: url
			}
			let msgInfo = {
				tmpId: this.generateId(),
				sendId: this.mine.id,
				content: JSON.stringify(data),
				sendTime: new Date().getTime(),
				selfSend: true,
				type: this.$enums.MESSAGE_TYPE.FILE,
				readedCount: 0,
				status: this.$enums.MESSAGE_STATUS.SENDING
			}
			// 填充对方id
			this.fillTargetId(msgInfo, this.chat.targetId);
			// 插入消息
			this.chatStore.insertMessage(msgInfo, this.chat);
			// 会话置顶
			this.moveChatToTop();
			// 借助file对象透传
			file.msgInfo = msgInfo;
			file.chat = this.chat;
		},
		onCloseSide() {
			this.showSide = false;
		},
		onScrollToTop() {
			// 多展示10条信息
			this.showMinIdx = this.showMinIdx > 10 ? this.showMinIdx - 10 : 0;
		},
		onScroll(e) {
			let scrollElement = e.target
			let scrollTop = scrollElement.scrollTop
			if (scrollTop < 30) { // 在顶部,不滚动的情况
				// 多展示20条信息
				this.showMinIdx = this.showMinIdx > 20 ? this.showMinIdx - 20 : 0;
				this.isInBottom = false;
			}
			// 滚到底部
			if (scrollTop + scrollElement.clientHeight >= scrollElement.scrollHeight - 30) {
				this.isInBottom = true;
				this.newMessageSize = 0;
			}
		},
		showEmotionBox() {
			let width = this.$refs.emotion.offsetWidth;
			let left = this.$elm.fixLeft(this.$refs.emotion);
			let top = this.$elm.fixTop(this.$refs.emotion);
			this.$refs.emoBox.open({
				x: left + width / 2,
				y: top
			})
		},
		onEmotion(emoText) {
			this.$refs.chatInputEditor.insertEmoji(emoText);
		},
		showRecordBox() {
			this.showRecord = true;
		},
		closeRecordBox() {
			this.showRecord = false;
		},
		showPrivateVideo(mode) {
			// 检查是否被封禁
			if (this.isBanned) {
				this.showBannedTip();
				return;
			}

			let rtcInfo = {
				mode: mode,
				isHost: true,
				friend: this.friend,
			}
			// 通过home.vue打开单人视频窗口
			this.$eventBus.$emit("openPrivateVideo", rtcInfo);
		},
		onGroupVideo() {
			// 检查是否被封禁
			if (this.isBanned) {
				this.showBannedTip();
				return;
			}
			// 邀请成员发起通话
			let ids = [this.mine.id];
			let maxChannel = this.configStore.webrtc.maxChannel;
			this.$refs.rtcSel.open(maxChannel, ids, ids, []);
		},
		onInviteOk(members) {
			if (members.length < 2) {
				return;
			}
			let userInfos = [];
			members.forEach(m => {
				userInfos.push({
					id: m.userId,
					nickName: m.showNickName,
					headImage: m.headImage,
					isCamera: false,
					isMicroPhone: true
				})
			})
			let rtcInfo = {
				isHost: true,
				groupId: this.group.id,
				inviterId: this.mine.id,
				userInfos: userInfos
			}
			// 通过home.vue打开多人视频窗口
			this.$eventBus.$emit("openGroupVideo", rtcInfo);
		},
		showHistoryBox() {
			this.showHistory = true;
		},
		closeHistoryBox() {
			this.showHistory = false;
		},
		onSendRecord(data) {
			// 检查是否被封禁
			if (this.isBanned) {
				this.showBannedTip();
				return;
			}
			let msgInfo = {
				tmpId: this.generateId(),
				content: JSON.stringify(data),
				type: this.$enums.MESSAGE_TYPE.AUDIO,
				receipt: this.isReceipt
			}
			// 填充对方id
			this.fillTargetId(msgInfo, this.chat.targetId);
			// 防止发送期间用户切换会话导致串扰
			const chat = this.chat;
			// 临时消息回显	
			let tmpMessage = this.buildTmpMessage(msgInfo);
			this.chatStore.insertMessage(tmpMessage, chat);
			this.moveChatToTop();
			this.sendMessageRequest(msgInfo).then(m => {
				// 更新消息
				tmpMessage.id = m.id;
				tmpMessage.clientMsgID = m.clientMsgID;
				tmpMessage.status = m.status;
				tmpMessage.seq = m.seq;
				this.chatStore.updateMessage(tmpMessage, chat);
				// 会话置顶
				this.moveChatToTop();
				// 保持输入框焦点
				this.$refs.chatInputEditor.focus();
				// 滚动到底部
				this.scrollToBottom();
				// 关闭录音窗口
				this.showRecord = false;
				this.isReceipt = false;
				this.refreshPlaceHolder();
			}).catch(() => {
				tmpMessage.status = this.$enums.MESSAGE_STATUS.FAILED;
				this.chatStore.updateMessage(tmpMessage, this.chat);
			})
		},
		fillTargetId(msgInfo, targetId) {
			if (this.chat.type == "GROUP") {
				msgInfo.groupId = targetId;
			} else {
				msgInfo.recvId = targetId;
			}
		},
		notifySend() {
			this.$refs.chatInputEditor.submit();
		},
		async sendMessage(fullList) {
			this.resetEditor();
			this.readedMessage();
			// 检查是否被封禁
			if (this.isBanned) {
				this.showBannedTip();
				return;
			}
			let sendText = this.isReceipt ? "【回执消息】" : "";
			fullList.forEach(async msg => {
				switch (msg.type) {
					case "text":
						await this.sendTextMessage(sendText + msg.content, msg.atUserIds);
						break;
					case "image":
						await this.sendImageMessage(msg.content.file);
						break;
					case "file":
						await this.sendFileMessage(msg.content.file);
						break;
				}
			})
		},
		sendImageMessage(file) {
			return new Promise((resolve, reject) => {
				this.onImageBefore(file);
				let formData = new FormData()
				formData.append('file', file)
				this.$http.post("/image/upload", formData, {
					headers: {
						'Content-Type': 'multipart/form-data'
					}
				}).then((data) => {
					this.onImageSuccess(data, file);
					resolve();
				}).catch((res) => {
					this.onImageFail(res, file);
					reject();
				})
				this.$nextTick(() => this.$refs.chatInputEditor.focus());
				this.scrollToBottom();
			});
		},
		sendTextMessage(sendText, atUserIds) {
			return new Promise((resolve, reject) => {
				if (!sendText.trim()) {
					reject();
				}
				let msgInfo = {
					tmpId: this.generateId(),
					content: sendText,
					type: this.$enums.MESSAGE_TYPE.TEXT
				}
				// 填充对方id
				this.fillTargetId(msgInfo, this.chat.targetId);
				// 被@人员列表
				if (this.chat.type == "GROUP") {
					msgInfo.atUserIds = atUserIds;
					msgInfo.receipt = this.isReceipt;
				}
				this.lockMessage = true;
				// 防止发送期间用户切换会话导致串扰
				const chat = this.chat;
				// 回显消息
				let tmpMessage = this.buildTmpMessage(msgInfo);
				this.chatStore.insertMessage(tmpMessage, chat);
				this.moveChatToTop();
				// 发送
				this.sendMessageRequest(msgInfo).then((m) => {
					// 更新消息
					tmpMessage.id = m.id;
					tmpMessage.clientMsgID = m.clientMsgID;
					tmpMessage.status = m.status;
					tmpMessage.content = m.content;
					tmpMessage.seq = m.seq;
					this.chatStore.updateMessage(tmpMessage, chat);
				}).catch(() => {
					// 更新消息
					tmpMessage.status = this.$enums.MESSAGE_STATUS.FAILED;
					this.chatStore.updateMessage(tmpMessage, chat);
				}).finally(() => {
					this.isReceipt = false;
					resolve();
				});
			});
		},
		sendFileMessage(file) {
			return new Promise((resolve, reject) => {
				let check = this.$refs.fileUpload.beforeUpload(file);
				if (check) {
					this.$refs.fileUpload.onFileUpload({ file });
				}
			})
		},
		onResendMessage(msgInfo) {
			if (msgInfo.type != this.$enums.MESSAGE_TYPE.TEXT) {
				this.$message.error("该消息不支持自动重新发送，建议手动重新发送")
				return;
			}
			// 防止发送期间用户切换会话导致串扰
			const chat = this.chat;
			// 删除旧消息
			this.chatStore.deleteMessage(msgInfo, chat);
			// 重新推送
			msgInfo.tmpId = this.generateId();
			let tmpMessage = this.buildTmpMessage(msgInfo);
			this.chatStore.insertMessage(tmpMessage, chat);
			this.moveChatToTop();
			// 发送
			this.sendMessageRequest(msgInfo).then(m => {
				// 更新消息
				tmpMessage.id = m.id;
				tmpMessage.clientMsgID = m.clientMsgID;
				tmpMessage.status = m.status;
				tmpMessage.content = m.content;
				tmpMessage.seq = m.seq;
				this.chatStore.updateMessage(tmpMessage, chat);
			}).catch(() => {
				// 更新消息
				tmpMessage.status = this.$enums.MESSAGE_STATUS.FAILED;
				this.chatStore.updateMessage(tmpMessage, chat);
			}).finally(() => {
				this.scrollToBottom();
			});
		},
		deleteMessage(msgInfo) {
			this.$confirm('确认删除消息?', '删除消息', {
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'warning'
			}).then(() => {
				// 如果有 seq，调用 V10 API 删除
				if (msgInfo.seq) {
					const conversationID = this.chat.conversationID || this.buildConversationID();
					const seq = Number(msgInfo.seq);
					console.log('[删除消息] conversationID:', conversationID, 'seq:', seq);
					this.$http({
						url: '/msg/delete_msgs',
						method: 'POST',
						data: {
							conversationID: conversationID,
							seqs: [seq],
							userID: String(this.mine.id)
						}
					}).then(() => {
						this.$message.success("消息已删除");
						this.chatStore.deleteMessage(msgInfo, this.chat);
					}).catch((err) => {
						console.error('[删除消息] 删除失败:', err);
						// 即使服务端删除失败，也在本地删除
						this.chatStore.deleteMessage(msgInfo, this.chat);
					});
				} else {
					// 没有 seq 的消息（如本地临时消息），直接本地删除
					this.chatStore.deleteMessage(msgInfo, this.chat);
				}
			});
		},
		recallMessage(msgInfo) {
			console.log(msgInfo, "msgInfomsgInfo");

			// 检查 seq 是否存在
			if (!msgInfo.seq) {
				this.$message.warning("消息还在同步中，请稍后再试");
				return;
			}
			this.$confirm('确认撤回消息?', '撤回消息', {
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'warning'
			}).then(() => {
				// V10 API: /msg/revoke_msg
				const conversationID = this.chat.conversationID || this.buildConversationID();
				const seq = Number(msgInfo.seq);
				console.log('[撤回消息] conversationID:', conversationID, 'seq:', seq, 'seq类型:', typeof seq, '原始seq:', msgInfo.seq);
				this.$http({
					url: '/msg/revoke_msg',
					method: 'POST',
					data: {
						conversationID: conversationID,
						seq: seq,
						userID: String(this.mine.id)
					}
				}).then(() => {
					this.$message.success("消息已撤回");
					// 直接在本地更新消息状态
					msgInfo.status = this.$enums.MESSAGE_STATUS.RECALL;
					msgInfo.content = "你撤回了一条消息";
					msgInfo.type = this.$enums.MESSAGE_TYPE.TIP_TEXT;
					// 更新会话列表显示
					this.chat.lastContent = msgInfo.content;
					this.chat.stored = false;
					this.chatStore.saveToStorage();
				}).catch((err) => {
					console.error('[撤回消息] 撤回失败:', err);
					this.$message.error("撤回失败: " + (err.message || err));
				});
			});
		},
		readedMessage() {
			if (this.chat.unreadCount === 0) return;

			const conversationID = this.chat.conversationID || this.buildConversationID();
			const userID = String(this.mine.id);

			if (this.isGroup) {
				// 群聊: 使用 /msg/mark_conversation_as_read
				const maxSeq = this.getMaxSeq();
				if (maxSeq > 0) {
					this.$http({
						url: '/msg/mark_conversation_as_read',
						method: 'POST',
						data: {
							conversationID: conversationID,
							userID: userID,
							hasReadSeq: maxSeq
						}
					}).then(() => {
						console.log('[已读消息] 群聊会话已读成功:', conversationID, 'hasReadSeq:', maxSeq);
					}).catch((err) => {
						console.error('[已读消息] 群聊会话已读失败:', err);
					});
				}
			} else {
				// 私聊: 使用 /msg/mark_msgs_as_read + seqs
				const unreadSeqs = this.getUnreadMessageSeqs();
				console.log('[readedMessage] 私聊, conversationID:', conversationID, 'seqs:', unreadSeqs);

				if (unreadSeqs.length > 0) {
					this.$http({
						url: '/msg/mark_msgs_as_read',
						method: 'POST',
						data: {
							conversationID: conversationID,
							userID: userID,
							seqs: unreadSeqs
						}
					}).then(() => {
						console.log('[已读消息] 私聊消息已读成功:', conversationID, 'seqs:', unreadSeqs);
					}).catch((err) => {
						console.error('[已读消息] 私聊消息已读失败:', err);
					});
				}
			}
			this.chatStore.resetUnreadCount(this.chat);
		},
		// 获取未读消息的序列号列表
		getUnreadMessageSeqs() {
			const seqs = [];
			if (this.chat && this.chat.messages) {
				// 调试: 打印最后几条消息的完整结构
				const lastMsgs = this.chat.messages.slice(-3);
				lastMsgs.forEach((m, i) => {
					console.log(`[getUnreadMessageSeqs] 消息${i}: selfSend=${m.selfSend}, seq=${m.seq}, status=${m.status}, id=${m.id}`);
				});

				this.chat.messages.forEach(msg => {
					// 只处理对方发送的、未读的、有seq的消息
					if (!msg.selfSend && msg.seq && msg.status !== this.$enums.MESSAGE_STATUS.READED) {
						seqs.push(msg.seq);
					}
				});
			}
			return seqs;
		},
		// 获取会话中最大的消息序列号
		getMaxSeq() {
			let maxSeq = 0;
			if (this.chat && this.chat.messages) {
				this.chat.messages.forEach(msg => {
					if (msg.seq && msg.seq > maxSeq) {
						maxSeq = msg.seq;
					}
				});
			}
			return maxSeq;
		},
		buildConversationID() {
			// 构建会话ID: 私聊 si_当前用户ID_对方用户ID, 群聊 sg_群ID
			if (this.isGroup) {
				return `sg_${this.chat.targetId}`;
			} else {
				// 私聊会话ID格式: si_当前用户ID_对方用户ID
				return `si_${this.mine.id}_${this.chat.targetId}`;
			}
		},
		loadReaded(fId) {
			// V9 API 中没有获取已读位置的接口，暂时注释
			// this.$http({
			// 	url: `/message/private/maxReadedId?friendId=${fId}`,
			// 	method: 'get'
			// }).then((id) => {
			// 	this.chatStore.readedMessage({
			// 		friendId: fId,
			// 		maxId: id
			// 	});
			// });
		},
		loadGroup(groupId) {
			// V10 API: POST /group/get_groups_info
			this.$http({
				url: '/group/get_groups_info',
				method: 'POST',
				data: {
					groupIDs: [String(groupId)]
				}
			}).then((data) => {
				const groupInfo = data.groupInfos?.[0];
				if (groupInfo) {
					const group = {
						id: groupInfo.groupID,
						name: groupInfo.groupName,
						showGroupName: groupInfo.groupName,
						headImage: groupInfo.faceURL,
						headImageThumb: groupInfo.faceURL,
						ownerId: groupInfo.ownerUserID,
						notice: groupInfo.notification,
						memberCount: groupInfo.memberCount,
						status: groupInfo.status
					};
					this.group = group;
					this.chatStore.updateChatFromGroup(group);
					this.groupStore.updateGroup(group);
				}
			});

			// V10 API: POST /group/get_group_member_list
			this.$http({
				url: '/group/get_group_member_list',
				method: 'POST',
				data: {
					groupID: String(groupId),
					pagination: {
						pageNumber: 1,
						showNumber: 500
					}
				}
			}).then((data) => {
				this.groupMembers = (data.members || []).map(m => ({
					userId: m.userID,
					nickName: m.nickname,
					showNickName: m.nickname,
					headImage: m.faceURL,
					roleLevel: m.roleLevel,
					joinTime: m.joinTime
				}));
			});
		},
		updateFriendInfo() {
			if (this.isFriend) {
				// store的数据不能直接修改，深拷贝一份store的数据
				let friend = JSON.parse(JSON.stringify(this.friend));
				friend.headImage = this.userInfo.headImageThumb;
				friend.nickName = this.userInfo.nickName;
				friend.showNickName = friend.remarkNickName ? friend.remarkNickName : friend.nickName;
				this.chatStore.updateChatFromFriend(friend);
				this.friendStore.updateFriend(friend);
			} else {
				this.chatStore.updateChatFromUser(this.userInfo);
			}
		},
		loadFriend(friendId) {
			// 获取好友信息
			this.$http({
				url: '/user/get_users_info',
				method: 'POST',
				data: {
					userIDs: [friendId]
				}
			}).then((data) => {
				const user = data.usersInfo?.[0];
				if (user) {
					this.userInfo = {
						id: user.userID,
						userName: user.userID,
						nickName: user.nickname,
						headImage: user.faceURL,
						headImageThumb: user.faceURL,
						signature: user.ex || '',
						sex: 0
					};
					this.updateFriendInfo();
				}
			})
		},
		showName(msgInfo) {
			if (!msgInfo) {
				return ""
			}
			if (this.isGroup) {
				let member = this.groupMembers.find((m) => m.userId == msgInfo.sendId);
				return member ? member.showNickName : (msgInfo.sendNickName || "");
			} else {
				return msgInfo.selfSend ? (this.mine.nickName || "") : (this.chat.showName || msgInfo.sendNickName || "")
			}
		},
		headImage(msgInfo) {
			if (!msgInfo) {
				return ""
			}
			if (this.isGroup) {
				let member = this.groupMembers.find((m) => m.userId == msgInfo.sendId);
				return member ? member.headImage : (msgInfo.sendHeadImage || "");
			} else {
				return msgInfo.sendId == this.mine.id ? (this.mine.headImageThumb || "") : (this.chat.headImage || msgInfo.sendHeadImage || "")
			}
		},
		resetEditor() {
			this.$nextTick(() => {
				this.$refs.chatInputEditor.clear();
				this.$refs.chatInputEditor.focus();
			});
		},
		scrollToBottom() {
			this.$nextTick(() => {
				let div = document.getElementById("chatScrollBox");
				div.scrollTop = div.scrollHeight;
			});
		},
		refreshPlaceHolder() {
			if (this.isReceipt) {
				this.placeholder = "【回执消息】"
			} else if (this.$refs.editBox && this.$refs.editBox.innerHTML) {
				this.placeholder = ""
			} else {
				this.placeholder = "聊点什么吧~";
			}
		},
		sendMessageRequest(msgInfo) {
			return new Promise((resolve, reject) => {
				// 请求入队列，防止请求"后发先至"，导致消息错序
				this.reqQueue.push({ msgInfo, resolve, reject });
				this.processReqQueue();
			})
		},
		async processReqQueue() {
			if (this.reqQueue.length && !this.isSending) {
				this.isSending = true;
				const reqData = this.reqQueue.shift();
				const msgInfo = reqData.msgInfo;

				// 打印发送消息内容
				console.log('[发送消息] 原始消息:', msgInfo);

				try {
					// 确定会话类型：私聊=1, 群聊=3(超级群)
					const sessionType = this.chat.type === 'GROUP' ? 3 : 1;
					// 确定接收者ID：群聊用groupId，私聊用recvId
					const recvID = String(this.chat.type === 'GROUP' ? msgInfo.groupId : msgInfo.recvId);

					let result;

					// 根据消息类型调用不同的 WebSocket 发送函数
					switch (msgInfo.type) {
						case this.$enums.MESSAGE_TYPE.TEXT:
							console.log('[发送消息] 发送文本消息:', recvID, msgInfo.content, sessionType);
							result = await this.$wsApi.sendTextMessage(recvID, msgInfo.content, sessionType);
							break;

						case this.$enums.MESSAGE_TYPE.IMAGE: {
							console.log('[发送消息] 发送图片消息:', recvID, msgInfo.content, sessionType);
							const imageInfo = typeof msgInfo.content === 'string' ? JSON.parse(msgInfo.content) : msgInfo.content;
							result = await this.$wsApi.sendImageMessage(recvID, {
								sourcePicture: { url: imageInfo.originUrl },
								bigPicture: { url: imageInfo.originUrl },
								snapshotPicture: { url: imageInfo.thumbUrl || imageInfo.originUrl }
							}, sessionType);
							break;
						}

						case this.$enums.MESSAGE_TYPE.FILE: {
							console.log('[发送消息] 发送文件消息:', recvID, msgInfo.content, sessionType);
							const fileInfo = typeof msgInfo.content === 'string' ? JSON.parse(msgInfo.content) : msgInfo.content;
							result = await this.$wsApi.sendFileMessage(recvID, {
								url: fileInfo.url,
								name: fileInfo.name,
								size: fileInfo.size
							}, sessionType);
							break;
						}

						case this.$enums.MESSAGE_TYPE.AUDIO: {
							console.log('[发送消息] 发送语音消息:', recvID, msgInfo.content, sessionType);
							const audioInfo = typeof msgInfo.content === 'string' ? JSON.parse(msgInfo.content) : msgInfo.content;
							result = await this.$wsApi.sendAudioMessage(recvID, {
								url: audioInfo.url,
								duration: audioInfo.duration,
								size: audioInfo.size
							}, sessionType);
							break;
						}

						case this.$enums.MESSAGE_TYPE.VIDEO: {
							console.log('[发送消息] 发送视频消息:', recvID, msgInfo.content, sessionType);
							const videoInfo = typeof msgInfo.content === 'string' ? JSON.parse(msgInfo.content) : msgInfo.content;
							result = await this.$wsApi.sendVideoMessage(recvID, videoInfo, sessionType);
							break;
						}

						default:
							console.warn('[发送消息] 不支持的消息类型:', msgInfo.type);
							throw new Error('不支持的消息类型');
					}

					console.log('[发送消息] 发送成功:', result);
					reqData.resolve({
						id: result.serverMsgID || result.clientMsgID || msgInfo.tmpId,
						clientMsgID: result.clientMsgID,
						status: this.$enums.MESSAGE_STATUS.SENDED,
						content: msgInfo.content,
						seq: result.seq
					});
				} catch (error) {
					console.error('[发送消息] 发送失败:', error);
					reqData.reject(error);
				} finally {
					this.isSending = false;
					this.processReqQueue();
				}
			}
		},
		// 将旧消息格式转换为 V8 API 格式（参考 C端WS文档V1.md 7.2节）
		convertToV8Format(msgInfo) {
			// 消息类型映射: 旧类型 -> V8 contentType
			const contentTypeMap = {
				0: 101,   // TEXT -> 文本消息
				1: 102,   // IMAGE -> 图片消息
				2: 105,   // FILE -> 文件消息
				3: 103,   // AUDIO -> 语音消息
				4: 104    // VIDEO -> 视频消息
			};

			const now = Date.now();

			// 构建 V8 格式的消息
			const v8Msg = {
				sendID: String(this.mine.id),
				clientMsgID: `${this.mine.id}_${now}`,  // 必填：客户端消息唯一ID
				senderPlatformID: 5,  // Web 平台
				contentType: contentTypeMap[msgInfo.type] || 101,
				createTime: now  // 必填：创建时间戳（毫秒）
			};

			// 根据聊天类型设置 sessionType 和 接收者
			if (this.chat.type === "GROUP") {
				v8Msg.sessionType = 2;  // 群聊
				v8Msg.groupID = String(msgInfo.groupId);
				v8Msg.recvID = '';  // 群聊时 recvID 为空
			} else {
				v8Msg.sessionType = 1;  // 私聊
				v8Msg.recvID = String(msgInfo.recvId);
				v8Msg.groupID = '';  // 私聊时 groupID 为空
			}

			// 处理消息内容（参考文档 7.3节）
			if (msgInfo.type === this.$enums.MESSAGE_TYPE.TEXT) {
				// 文本消息：content 格式为 {"text": "消息文本内容"}
				v8Msg.content = { text: msgInfo.content };
			} else {
				// 其他消息类型（图片、文件等）：content 已经是 JSON 字符串，需要解析
				try {
					v8Msg.content = typeof msgInfo.content === 'string'
						? JSON.parse(msgInfo.content)
						: msgInfo.content;
				} catch (e) {
					v8Msg.content = { text: msgInfo.content };
				}
			}

			// 群聊 @ 功能
			if (msgInfo.atUserIds && msgInfo.atUserIds.length > 0) {
				v8Msg.atUserIDList = msgInfo.atUserIds;
			}

			return v8Msg;
		},
		showBannedTip() {
			let msgInfo = {
				tmpId: this.generateId(),
				sendId: this.mine.id,
				sendTime: new Date().getTime(),
				type: this.$enums.MESSAGE_TYPE.TIP_TEXT
			}
			if (this.chat.type == "PRIVATE") {
				msgInfo.recvId = this.mine.id
				msgInfo.content = "该用户已被管理员封禁,原因:" + this.userInfo.reason
			} else {
				msgInfo.groupId = this.group.id;
				msgInfo.content = "本群聊已被管理员封禁,原因:" + this.group.reason
			}
			this.chatStore.insertMessage(msgInfo, this.chat);
		},
		buildTmpMessage(msgInfo) {
			let message = JSON.parse(JSON.stringify(msgInfo));
			message.sendId = this.mine.id;
			message.sendTime = new Date().getTime();
			message.status = this.$enums.MESSAGE_STATUS.SENDING;
			message.selfSend = true;
			message.seq = null;  // 初始化 seq 字段，确保 Vue 响应式追踪
			if (this.isGroup) {
				message.readedCount = 0;
			}
			return message;
		},
		getImageSize(file) {
			return new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = function (event) {
					const img = new Image();
					img.onload = function () {
						resolve({ width: img.width, height: img.height });
					};
					img.onerror = function () {
						reject(new Error('无法加载图片'));
					};
					img.src = event.target.result;
				};
				reader.onerror = function () {
					reject(new Error('无法读取文件'));
				};
				reader.readAsDataURL(file);
			});
		},
		generateId() {
			// 生成临时id 
			const id = String(new Date().getTime()) + String(Math.floor(Math.random() * 1000));
			// 必须保证id是递增
			if (this.maxTmpId > id) {
				return this.generateId();
			}
			this.maxTmpId = id;
			return id;
		}
	},
	computed: {
		mine() {
			return this.userStore.userInfo;
		},
		isFriend() {
			return this.friendStore.isFriend(this.userInfo.id);
		},
		friend() {
			return this.friendStore.findFriend(this.userInfo.id)
		},
		title() {
			let title = this.chat.showName;
			if (this.chat.type == "GROUP") {
				let size = this.groupMembers.filter(m => !m.quit).length;
				title += `(${size})`;
			}
			return title;
		},
		unreadCount() {
			return this.chat.unreadCount;
		},
		showMessages() {
			return this.chat.messages.slice(this.showMinIdx)
		},
		messageSize() {
			if (!this.chat || !this.chat.messages) {
				return 0;
			}
			return this.chat.messages.length;
		},
		isBanned() {
			return (this.chat.type == "PRIVATE" && this.userInfo.isBanned) ||
				(this.chat.type == "GROUP" && this.group.isBanned)
		},
		memberSize() {
			return this.groupMembers.filter(m => !m.quit).length;
		},
		isGroup() {
			return this.chat.type == 'GROUP';
		},
		isPrivate() {
			return this.chat.type == 'PRIVATE';
		},
		loading() {
			return this.chatStore.loading;
		}
	},
	watch: {
		chat: {
			handler(newChat, oldChat) {
				if (newChat.targetId > 0 && (!oldChat || newChat.type != oldChat.type ||
					newChat.targetId != oldChat.targetId)) {
					this.userInfo = {}
					this.group = {};
					this.groupMembers = [];
					if (this.chat.type == "GROUP") {
						this.loadGroup(this.chat.targetId);
					} else {
						this.loadFriend(this.chat.targetId);
						// 加载已读状态
						this.loadReaded(this.chat.targetId)
					}
					// 滚到底部
					this.scrollToBottom();
					this.showSide = false;
					// 消息已读
					this.readedMessage()
					// 初始状态只显示30条消息
					let size = this.chat.messages.length;
					this.showMinIdx = size > 30 ? size - 30 : 0;
					// 重置输入框
					this.resetEditor();
					// 复位回执消息
					this.isReceipt = false;
					// 清空消息临时id
					this.maxTmpId = 0;
					// 更新placeholder
					this.refreshPlaceHolder();
				}
			},
			immediate: true
		},
		messageSize: {
			handler(newSize, oldSize) {
				if (newSize > oldSize) {
					// 收到普通消息,则滚动至底部
					let lastMessage = this.chat.messages[newSize - 1];
					if (lastMessage && this.$msgType.isNormal(lastMessage.type)) {
						if (this.isInBottom || lastMessage.selfSend) {
							this.scrollToBottom();
						} else {
							this.newMessageSize++;
						}
					}
				}
			}
		},
		loading: {
			handler(newLoading, oldLoading) {
				// 断线重连后，需要更新一下已读状态
				if (!newLoading && this.isPrivate) {
					this.loadReaded(this.chat.targetId)
				}
			}
		}
	},
	mounted() {
		let div = document.getElementById("chatScrollBox");
		div.addEventListener('scroll', this.onScroll)
	}
}
</script>

<style lang="scss" scoped>
.chat-box {
	position: relative;
	width: 100%;
	background: #fff;

	.el-header {
		display: flex;
		justify-content: space-between;
		padding: 0 12px;
		line-height: 50px;
		font-size: var(--im-font-size-larger);
		border-bottom: var(--im-border);


		.btn-side {
			position: absolute;
			right: 20px;
			line-height: 50px;
			font-size: 20px;
			cursor: pointer;
			color: var(--im-text-color-light);
		}
	}

	.content-box {
		position: relative;

		.im-chat-main {
			padding: 0;
			background-color: #f4f5f6;

			.im-chat-box {
				>ul {
					padding: 0 20px;

					li {
						list-style-type: none;
					}
				}
			}
		}

		.scroll-to-bottom {
			text-align: right;
			position: absolute;
			right: 20px;
			bottom: 230px;
			color: var(--im-color-primary);
			font-size: var(--im-font-size);
			font-weight: 600;
			background: #eee;
			padding: 5px 15px;
			border-radius: 15px;
			cursor: pointer;
			z-index: 99;
			box-shadow: var(--im-box-shadow-light);
		}

		.im-chat-footer {
			display: flex;
			flex-direction: column;
			padding: 0;

			.chat-tool-bar {
				display: flex;
				position: relative;
				width: 100%;
				height: 36px;
				text-align: left;
				box-sizing: border-box;
				border-top: var(--im-border);
				padding: 4px 2px 2px 8px;

				>div {
					font-size: 22px;
					cursor: pointer;
					line-height: 30px;
					width: 30px;
					height: 30px;
					text-align: center;
					border-radius: 2px;
					margin-right: 8px;
					color: #999;
					transition: 0.3s;

					&.chat-tool-active {
						font-weight: 600;
						color: var(--im-color-primary);
						background-color: #ddd;
					}
				}

				>div:hover {
					color: #333;
				}
			}

			.send-content-area {
				position: relative;
				display: flex;
				flex-direction: column;
				height: 100%;
				background-color: white !important;

				.send-btn-area {
					padding: 10px;
					position: absolute;
					bottom: 4px;
					right: 6px;
				}
			}
		}
	}

	.side-box {
		border-left: var(--im-border);
	}

}
</style>